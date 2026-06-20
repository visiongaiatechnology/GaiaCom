package federation

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sync"

	"encoding/hex"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
	"gaiacom/backend/utils"
)

type Service struct {
	store         repository.FederationStore
	httpClient    *http.Client
	serverName    string
	privateKey    ed25519.PrivateKey
	processedPDUs map[string]time.Time
	pduMutex      sync.RWMutex
}

type serverDiscoveryDocument struct {
	ServerName string                 `json:"server_name"`
	PublicKey  string                 `json:"ed25519_public_key"`
	Protocols  []string               `json:"protocols,omitempty"`
	Endpoints  map[string]string      `json:"endpoints,omitempty"`
	Software   map[string]string      `json:"software,omitempty"`
	Policy     map[string]interface{} `json:"policy,omitempty"`
}

func NewService(store repository.FederationStore, serverName string, serverPrivKey ed25519.PrivateKey) *Service {
	return &Service{
		store:         store,
		httpClient:    utils.NewSecureHTTPClient(),
		serverName:    serverName,
		privateKey:    serverPrivKey,
		processedPDUs: make(map[string]time.Time),
	}
}

func (s *Service) QueueOutgoingPDU(pdu models.PDU, destinationServer string) error {
	if destinationServer == s.serverName {
		return nil
	}

	pduBytes, err := json.Marshal(pdu)
	if err != nil {
		return err
	}

	return s.store.AddFederationQueueItem(&models.FederationQueue{
		PDUID:      pdu.PDUID,
		PDUPayload: models.JSONB(pduBytes),
		TargetURL:  destinationServer,
		Status:     models.QueueStatusPending,
		NextRetry:  time.Now().UTC(),
	})
}

func (s *Service) ProcessFederationQueue(ctx context.Context) {
	item, err := s.store.ClaimNextFederationQueueItem(ctx)
	if err != nil {
		log.Printf("federation queue fetch failed: %v", err)
		return
	}
	if item == nil {
		return
	}

	if err := s.sendTransaction(ctx, item); err != nil {
		log.Printf("federation send error: %v", err)
		_ = s.rescheduleForRetry(ctx, item)
		return
	}
	_ = s.store.DeleteFederationQueueItem(ctx, item.ID)
}

func (s *Service) VerifyReceivedRequest(r *http.Request, body []byte) error {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return errors.New("missing authorization header")
	}

	sig, keyID, timestamp, err := parseS2SHeader(authHeader)
	if err != nil {
		return fmt.Errorf("malformed header: %w", err)
	}
	if !isTimestampValid(timestamp) {
		return errors.New("request expired or time skew too large")
	}

	originPubKey, err := s.getOrFetchPublicKey(keyID)
	if err != nil {
		return fmt.Errorf("failed to get public key for %s: %w", keyID, err)
	}

	bodyHash := sha256.Sum256(body)
	messageToVerify := fmt.Sprintf("%d.%x", timestamp, bodyHash)
	if !ed25519.Verify(originPubKey, []byte(messageToVerify), sig) {
		log.Printf("security: invalid federation signature from %s", keyID)
		return errors.New("invalid signature")
	}

	return nil
}

func (s *Service) sendTransaction(ctx context.Context, item *models.FederationQueue) error {
	var pdu models.PDU
	if err := json.Unmarshal([]byte(item.PDUPayload), &pdu); err != nil {
		return fmt.Errorf("invalid queued PDU payload: %w", err)
	}

	// Apply Delivery Friction if sender has high abuse
	if score, err := s.GetAbuseScoreForGaiaID(pdu.Sender); err == nil && score != nil {
		if score.FrictionLimit < 1.0 && score.FrictionLimit > 0 {
			delay := time.Duration((1.0/score.FrictionLimit - 1.0) * float64(time.Second))
			if delay > 0 {
				log.Printf("Applying delivery friction delay of %v for sender %s", delay, pdu.Sender)
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(delay):
				}
			}
		}
	}

	err := s.sendToTarget(ctx, pdu, item.TargetURL)
	if err == nil {
		return nil
	}

	log.Printf("Primary target node %s failed: %v. Checking alternative routing nodes...", item.TargetURL, err)

	identStore, ok := s.store.(repository.IdentityStore)
	if ok {
		destIdent, errIdent := identStore.FindIdentityByGaiaID(pdu.Destination)
		if errIdent == nil && len(destIdent.PublicRecord) > 0 {
			var pubRecord struct {
				Routing struct {
					Alternatives []string `json:"alternatives"`
				} `json:"routing"`
			}
			if errJson := json.Unmarshal([]byte(destIdent.PublicRecord), &pubRecord); errJson == nil {
				for _, altNode := range pubRecord.Routing.Alternatives {
					altNode = strings.TrimSpace(altNode)
					if altNode == "" || altNode == item.TargetURL {
						continue
					}

					if server, errServ := s.store.FindFederationServer(altNode); errServ == nil && server.IsBlocked {
						log.Printf("Alternative node %s is blocked, skipping", altNode)
						continue
					}

					log.Printf("Attempting fallback routing to alternative node %s for recipient %s", altNode, pdu.Destination)
					errAlt := s.sendToTarget(ctx, pdu, altNode)
					if errAlt == nil {
						log.Printf("Successful fallback delivery via alternative node %s", altNode)
						return nil
					}
					log.Printf("Fallback to alternative node %s failed: %v", altNode, errAlt)
				}
			}
		}
	}

	return fmt.Errorf("all delivery endpoints failed, primary error: %w", err)
}

func (s *Service) sendToTarget(ctx context.Context, pdu models.PDU, targetDomain string) error {
	if utils.IsPrivateOrLoopbackIP(targetDomain) && !strings.Contains(targetDomain, "localhost") {
		return errors.New("delivery aborted: target domain is private or loopback (SSRF protection)")
	}

	payload := FederationPayload{
		Origin:         s.serverName,
		OriginServerTS: time.Now().Unix(),
		PDUs:           []models.PDU{pdu},
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	scheme := "https"
	if strings.Contains(targetDomain, "localhost") || strings.Contains(targetDomain, "127.0.0.1") || strings.Contains(targetDomain, "192.168.") {
		scheme = "http"
	}

	targetURL := fmt.Sprintf("%s://%s/.well-known/gaiacom/s2s/v1/forward", scheme, targetDomain)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if err := s.signRequest(req, bodyBytes); err != nil {
		return err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("remote server error %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (s *Service) signRequest(req *http.Request, body []byte) error {
	timestamp := time.Now().Unix()
	bodyHash := sha256.Sum256(body)
	messageToSign := fmt.Sprintf("%d.%x", timestamp, bodyHash)
	signature := ed25519.Sign(s.privateKey, []byte(messageToSign))

	req.Header.Set("Authorization", fmt.Sprintf(
		`X-Gaia-S2S-V1 Signature="%s",KeyId="%s",Timestamp="%d"`,
		base64.StdEncoding.EncodeToString(signature),
		s.serverName,
		timestamp,
	))
	return nil
}

func (s *Service) getOrFetchPublicKey(domain string) (ed25519.PublicKey, error) {
	server, err := s.store.FindFederationServer(domain)
	if err == nil {
		if server.IsBlocked {
			return nil, errors.New("server is blocked")
		}
		go func() {
			_ = s.store.UpdateFederationServerLastSeen(server)
		}()
		return server.PublicKey, nil
	}

	pubKey, err := s.fetchRemoteServerKey(domain)
	if err != nil {
		return nil, err
	}

	newServer := models.FederationServer{
		Domain:      domain,
		PublicKey:   pubKey,
		FirstSeenAt: time.Now().UTC(),
		LastSeenAt:  time.Now().UTC(),
	}
	if err := s.store.CreateFederationServer(&newServer); err != nil {
		return nil, err
	}

	return pubKey, nil
}

func (s *Service) fetchRemoteServerKey(domain string) (ed25519.PublicKey, error) {
	if !validate.Domain(domain) {
		return nil, errors.New("invalid federation domain")
	}

	if utils.IsPrivateOrLoopbackIP(domain) && !strings.Contains(domain, "localhost") {
		return nil, errors.New("server key fetch aborted: target domain is private or loopback (SSRF protection)")
	}

	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("https://%s/.well-known/gaiacom/server", domain), nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("server discovery failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("server discovery rejected with status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 16*1024))
	if err != nil {
		return nil, err
	}

	var document serverDiscoveryDocument
	if err := json.Unmarshal(body, &document); err != nil {
		return nil, err
	}
	if document.ServerName != domain {
		return nil, errors.New("server discovery name mismatch")
	}
	if len(document.Protocols) > 0 && !containsProtocol(document.Protocols, "gaiacom.s2s.v1") {
		return nil, errors.New("server discovery protocol mismatch")
	}

	keyBytes, err := base64.StdEncoding.DecodeString(document.PublicKey)
	if err != nil {
		return nil, errors.New("invalid discovery public key")
	}
	if len(keyBytes) != ed25519.PublicKeySize {
		return nil, errors.New("invalid discovery public key size")
	}

	return ed25519.PublicKey(keyBytes), nil
}

func containsProtocol(protocols []string, expected string) bool {
	for _, protocol := range protocols {
		if strings.EqualFold(strings.TrimSpace(protocol), expected) {
			return true
		}
	}
	return false
}

func (s *Service) rescheduleForRetry(ctx context.Context, item *models.FederationQueue) error {
	if item.Attempts >= 10 {
		log.Printf("max federation retries reached for PDU %s to %s", item.PDUID, item.TargetURL)
		item.Status = models.QueueStatusFailed
		return s.store.SaveFederationQueueItem(ctx, item)
	}

	backoff := time.Second * time.Duration(10*item.Attempts*item.Attempts)
	item.NextRetry = time.Now().UTC().Add(backoff)
	item.Status = models.QueueStatusPending

	log.Printf("rescheduling PDU %s for %s in %v", item.PDUID, item.TargetURL, backoff)
	return s.store.SaveFederationQueueItem(ctx, item)
}

func parseS2SHeader(header string) (signature []byte, keyID string, timestamp int64, err error) {
	const prefix = "X-Gaia-S2S-V1 "
	if !strings.HasPrefix(header, prefix) {
		return nil, "", 0, errors.New("invalid protocol prefix")
	}

	fields, err := parseQuotedHeaderFields(strings.TrimPrefix(header, prefix))
	if err != nil {
		return nil, "", 0, err
	}

	signature, err = base64.StdEncoding.DecodeString(fields["Signature"])
	if err != nil {
		return nil, "", 0, errors.New("invalid base64 signature")
	}

	keyID = fields["KeyId"]
	if !validate.Domain(keyID) {
		return nil, "", 0, errors.New("invalid key id")
	}

	timestamp, err = strconv.ParseInt(fields["Timestamp"], 10, 64)
	if err != nil {
		return nil, "", 0, errors.New("invalid timestamp")
	}

	return signature, keyID, timestamp, nil
}

func parseQuotedHeaderFields(input string) (map[string]string, error) {
	result := make(map[string]string, 3)
	parts := strings.Split(input, ",")
	for _, part := range parts {
		key, value, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok || key == "" || len(value) < 2 || value[0] != '"' || value[len(value)-1] != '"' {
			return nil, errors.New("header format mismatch")
		}
		result[key] = value[1 : len(value)-1]
	}
	if result["Signature"] == "" || result["KeyId"] == "" || result["Timestamp"] == "" {
		return nil, errors.New("header field missing")
	}
	return result, nil
}

func isTimestampValid(ts int64) bool {
	now := time.Now().Unix()
	return ts > now-300 && ts < now+300
}

func (s *Service) GetServerName() string {
	return s.serverName
}

func (s *Service) GetPublicKey() ed25519.PublicKey {
	return s.privateKey.Public().(ed25519.PublicKey)
}

func (s *Service) StartWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for {
				itemCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
				item, err := s.store.ClaimNextFederationQueueItem(itemCtx)
				cancel()
				if err != nil {
					log.Printf("federation queue fetch failed: %v", err)
					break
				}
				if item == nil {
					break
				}

				itemCtx, cancel = context.WithTimeout(ctx, 40*time.Second)
				if err := s.sendTransaction(itemCtx, item); err != nil {
					log.Printf("federation send error: %v", err)
					_ = s.rescheduleForRetry(itemCtx, item)
					cancel()
					break
				}
				_ = s.store.DeleteFederationQueueItem(itemCtx, item.ID)
				cancel()
			}
		}
	}
}

func (s *Service) GetAbuseScoreForGaiaID(gaiaID string) (*models.AbuseScore, error) {
	identStore, ok := s.store.(repository.IdentityStore)
	if !ok {
		return nil, errors.New("store does not implement IdentityStore")
	}
	ident, err := identStore.FindIdentityByGaiaID(gaiaID)
	if err != nil {
		return nil, err
	}

	var pubRecord struct {
		PublicKeys struct {
			Identity string `json:"identity"`
		} `json:"public_keys"`
	}
	if err := json.Unmarshal(ident.PublicRecord, &pubRecord); err != nil {
		return nil, err
	}
	if pubRecord.PublicKeys.Identity == "" {
		return nil, errors.New("identity public key is empty")
	}

	trustStore, ok := s.store.(repository.TrustMeshStore)
	if !ok {
		return nil, errors.New("store does not implement TrustMeshStore")
	}
	return trustStore.GetAbuseScore(pubRecord.PublicKeys.Identity)
}

func (s *Service) GetAllFederationServers() ([]models.FederationServer, error) {
	return s.store.FindAllFederationServers()
}

func (s *Service) SaveIncomingPDU(ctx context.Context, pdu models.PDU) error {
	// 1. Fork consensus and validation checks (protocol hardening)
	if err := validate.GaiaID(pdu.Sender); err != nil {
		return fmt.Errorf("consensus error: invalid sender GaiaID: %w", err)
	}
	if err := validate.GaiaID(pdu.Destination); err != nil {
		return fmt.Errorf("consensus error: invalid destination GaiaID: %w", err)
	}
	if pdu.Type != "gaia.encrypted.v1" && pdu.Type != "smtp.legacy" {
		return fmt.Errorf("consensus error: invalid PDU type: %s", pdu.Type)
	}
	if _, err := uuid.Parse(pdu.PDUID); err != nil {
		return fmt.Errorf("consensus error: invalid PDU ID format (must be UUID): %w", err)
	}
	nowTS := time.Now().UTC().Unix()
	if pdu.CreatedAt < nowTS-3600 || pdu.CreatedAt > nowTS+3600 {
		return fmt.Errorf("consensus error: PDU timestamp skew too large")
	}

	s.pduMutex.Lock()
	if _, processed := s.processedPDUs[pdu.PDUID]; processed {
		s.pduMutex.Unlock()
		log.Printf("security warning: duplicate/replayed S2S PDU %s rejected", pdu.PDUID)
		return errors.New("PDU already processed (replay check failed)")
	}

	// Replay Cache Size Limit to prevent Memory-DoS
	if len(s.processedPDUs) >= 50000 {
		// Try cleaning expired entries first
		for id, t := range s.processedPDUs {
			if time.Since(t) > 1*time.Hour {
				delete(s.processedPDUs, id)
			}
		}
		// If still too large, evict a batch of 5000 entries (arbitrary eviction of old/random keys)
		if len(s.processedPDUs) >= 50000 {
			evicted := 0
			for id := range s.processedPDUs {
				delete(s.processedPDUs, id)
				evicted++
				if evicted >= 5000 {
					break
				}
			}
			log.Printf("Replay cache size limit reached. Evicted %d entries.", evicted)
		}
	}

	s.processedPDUs[pdu.PDUID] = time.Now()
	s.pduMutex.Unlock()

	identStore, ok := s.store.(repository.IdentityStore)
	if !ok {
		return errors.New("store does not implement IdentityStore")
	}
	msgStore, ok := s.store.(repository.MessageStore)
	if !ok {
		return errors.New("store does not implement MessageStore")
	}

	recipientIdent, err := identStore.FindIdentityByGaiaID(pdu.Destination)
	if err != nil {
		return fmt.Errorf("recipient identity %s not found locally: %w", pdu.Destination, err)
	}

	envelopeUUID := uuid.New()
	envelope := &models.MessageEnvelope{
		ID:        envelopeUUID,
		Type:      pdu.Type,
		Sender:    pdu.Sender,
		Recipient: pdu.Destination,
		Payload:   models.JSONB([]byte(pdu.Payload)),
		Signature: pdu.Signature,
		CreatedAt: time.Unix(pdu.CreatedAt, 0).UTC(),
	}

	err = msgStore.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{recipientIdent.ID})
	if err != nil {
		return fmt.Errorf("failed to save message envelope for remote delivery: %w", err)
	}

	log.Printf("Persisted federated incoming message from %s to %s (PDU %s)", pdu.Sender, pdu.Destination, pdu.PDUID)
	return nil
}

func AnonymizedClientID(username, email, deviceInfo, salt string) string {
	hashInput := fmt.Sprintf("%s:%s:%s:%s", username, email, deviceInfo, salt)
	sum := sha256.Sum256([]byte(hashInput))
	return hex.EncodeToString(sum[:])
}
