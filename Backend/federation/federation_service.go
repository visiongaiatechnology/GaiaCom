package federation

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
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

const federationTopSecretAlgorithmSuite = "GaiaCom/v1.0/sovereign-top-secret/X25519+ML-KEM-1024+HQC-256/Serpent-256-CTR-HMAC-SHA3-512+Twofish-256-EAX+XChaCha20-Poly1305+AES-256-GCM-SIV/Ed25519+ML-DSA-87"

type Service struct {
	store          repository.FederationStore
	httpClient     *http.Client
	serverName     string
	privateKey     ed25519.PrivateKey
	processedPDUs  map[string]time.Time
	processingPDUs map[string]struct{}
	pduMutex       sync.RWMutex
}

var ErrPDUAlreadyProcessed = errors.New("federation PDU already processed")

type AuthenticatedPeer struct {
	Domain    string
	PublicKey ed25519.PublicKey
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
		store:          store,
		httpClient:     utils.NewSecureHTTPClient(),
		serverName:     serverName,
		privateKey:     serverPrivKey,
		processedPDUs:  make(map[string]time.Time),
		processingPDUs: make(map[string]struct{}),
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
	_ = s.store.DeleteFederationQueueItem(ctx, item)
}

func (s *Service) VerifyReceivedRequest(r *http.Request, body []byte) (*AuthenticatedPeer, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	sig, keyID, timestamp, err := parseS2SHeader(authHeader)
	if err != nil {
		return nil, fmt.Errorf("malformed header: %w", err)
	}
	if !isTimestampValid(timestamp) {
		return nil, errors.New("request expired or time skew too large")
	}

	originPubKey, err := s.getOrFetchPublicKey(keyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key for %s: %w", keyID, err)
	}

	bodyHash := sha256.Sum256(body)
	messageToVerify := canonicalRequestSigningText(r.Method, r.URL.EscapedPath(), keyID, timestamp, bodyHash)
	if !ed25519.Verify(originPubKey, []byte(messageToVerify), sig) {
		log.Printf("security: invalid federation signature from %s", keyID)
		return nil, errors.New("invalid signature")
	}

	return &AuthenticatedPeer{Domain: strings.ToLower(keyID), PublicKey: originPubKey}, nil
}

func (s *Service) ValidateAuthenticatedPayload(payload FederationPayload, peer *AuthenticatedPeer) error {
	if peer == nil || !validate.Domain(peer.Domain) || len(peer.PublicKey) != ed25519.PublicKeySize {
		return errors.New("authenticated federation peer unavailable")
	}
	if !strings.EqualFold(strings.TrimSpace(payload.Origin), peer.Domain) {
		return errors.New("federation origin does not match authenticated peer")
	}
	if !isTimestampValid(payload.OriginServerTS) {
		return errors.New("federation origin timestamp expired or skewed")
	}
	if len(payload.PDUs) == 0 || len(payload.PDUs) > maxFederationPDUsPerTransaction {
		return errors.New("invalid federation PDU batch size")
	}

	seen := make(map[string]struct{}, len(payload.PDUs))
	for _, pdu := range payload.PDUs {
		if err := validateIncomingPDUShape(pdu); err != nil {
			return err
		}
		if _, duplicate := seen[pdu.PDUID]; duplicate {
			return errors.New("duplicate federation PDU in transaction")
		}
		seen[pdu.PDUID] = struct{}{}

		senderDomain, err := gaiaIDDomain(pdu.Sender)
		if err != nil || !strings.EqualFold(senderDomain, peer.Domain) {
			return errors.New("federation sender domain does not match authenticated peer")
		}
		destinationDomain, err := gaiaIDDomain(pdu.Destination)
		if err != nil || !strings.EqualFold(destinationDomain, s.serverName) {
			return errors.New("federation destination is not local")
		}
		if err := verifyPDUSignature(pdu, peer.PublicKey); err != nil {
			return err
		}
	}
	return nil
}

func gaiaIDDomain(value string) (string, error) {
	if err := validate.GaiaID(value); err != nil {
		return "", err
	}
	separator := strings.LastIndexByte(value, ':')
	if separator < 0 || separator == len(value)-1 {
		return "", errors.New("invalid GaiaID domain")
	}
	return strings.ToLower(value[separator+1:]), nil
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
	targetDomain = strings.ToLower(strings.TrimSpace(targetDomain))
	if !validate.Domain(targetDomain) {
		return errors.New("delivery aborted: invalid target domain")
	}
	if utils.IsPrivateOrLoopbackIP(targetDomain) && !isExactDevelopmentHost(targetDomain) {
		return errors.New("delivery aborted: target domain is private or loopback (SSRF protection)")
	}
	if err := s.signPDU(&pdu); err != nil {
		return fmt.Errorf("sign federation PDU: %w", err)
	}
	if pdu.AlgorithmSuite == federationTopSecretAlgorithmSuite {
		if err := s.ensureRemoteTopSecretCapability(ctx, targetDomain); err != nil {
			return err
		}
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

	scheme := federationScheme(targetDomain)

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

func (s *Service) ensureRemoteTopSecretCapability(ctx context.Context, targetDomain string) error {
	scheme := federationScheme(strings.ToLower(strings.TrimSpace(targetDomain)))

	targetURL := fmt.Sprintf("%s://%s/.well-known/gaiacom/nodeinfo", scheme, targetDomain)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return err
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("top secret capability check failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("top secret capability check rejected with status %d", resp.StatusCode)
	}

	var doc struct {
		Capabilities struct {
			TopSecret       bool     `json:"top_secret"`
			SignatureSuites []string `json:"signature_suites"`
		} `json:"capabilities"`
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return err
	}
	if err := json.Unmarshal(body, &doc); err != nil {
		return fmt.Errorf("top secret capability document invalid: %w", err)
	}
	if !doc.Capabilities.TopSecret || !containsProtocol(doc.Capabilities.SignatureSuites, federationTopSecretAlgorithmSuite) {
		return errors.New("remote federation node lacks top secret ML-DSA-87 capability")
	}
	return nil
}

func (s *Service) signRequest(req *http.Request, body []byte) error {
	timestamp := time.Now().Unix()
	bodyHash := sha256.Sum256(body)
	messageToSign := canonicalRequestSigningText(req.Method, req.URL.EscapedPath(), s.serverName, timestamp, bodyHash)
	signature := ed25519.Sign(s.privateKey, []byte(messageToSign))

	req.Header.Set("Authorization", fmt.Sprintf(
		`X-Gaia-S2S-V1 Signature="%s",KeyId="%s",Timestamp="%d"`,
		base64.StdEncoding.EncodeToString(signature),
		s.serverName,
		timestamp,
	))
	return nil
}

func canonicalRequestSigningText(method, path, keyID string, timestamp int64, bodyHash [sha256.Size]byte) string {
	return strings.Join([]string{
		"gaiacom-s2s-request-v1",
		strings.ToUpper(method),
		path,
		strings.ToLower(keyID),
		strconv.FormatInt(timestamp, 10),
		hex.EncodeToString(bodyHash[:]),
	}, "\n")
}

type canonicalPDU struct {
	PDUID          string `json:"id"`
	Type           string `json:"type"`
	Sender         string `json:"sender"`
	Destination    string `json:"destination"`
	Payload        string `json:"payload"`
	AlgorithmSuite string `json:"algorithm_suite,omitempty"`
	CreatedAt      int64  `json:"created_at"`
}

func canonicalPDUBytes(pdu models.PDU) ([]byte, error) {
	return json.Marshal(canonicalPDU{
		PDUID: pdu.PDUID, Type: pdu.Type, Sender: pdu.Sender,
		Destination: pdu.Destination, Payload: pdu.Payload,
		AlgorithmSuite: pdu.AlgorithmSuite, CreatedAt: pdu.CreatedAt,
	})
}

func (s *Service) signPDU(pdu *models.PDU) error {
	if pdu == nil || len(s.privateKey) != ed25519.PrivateKeySize {
		return errors.New("federation signing key unavailable")
	}
	canonical, err := canonicalPDUBytes(*pdu)
	if err != nil {
		return err
	}
	digest := sha256.Sum256(canonical)
	pdu.PDUHash = hex.EncodeToString(digest[:])
	pdu.Signature = base64.StdEncoding.EncodeToString(ed25519.Sign(s.privateKey, canonical))
	return nil
}

func verifyPDUSignature(pdu models.PDU, publicKey ed25519.PublicKey) error {
	if len(publicKey) != ed25519.PublicKeySize {
		return errors.New("invalid federation public key")
	}
	canonical, err := canonicalPDUBytes(pdu)
	if err != nil {
		return err
	}
	digest := sha256.Sum256(canonical)
	presentedHash, err := hex.DecodeString(pdu.PDUHash)
	if err != nil || len(presentedHash) != sha256.Size || !hmac.Equal(presentedHash, digest[:]) {
		return errors.New("federation PDU hash mismatch")
	}
	signature, err := base64.StdEncoding.DecodeString(pdu.Signature)
	if err != nil || len(signature) != ed25519.SignatureSize {
		return errors.New("invalid federation PDU signature encoding")
	}
	if !ed25519.Verify(publicKey, canonical, signature) {
		return errors.New("invalid federation PDU signature")
	}
	return nil
}

func federationScheme(targetDomain string) string {
	if routesDevModeEnabled() && isExactDevelopmentHost(targetDomain) {
		return "http"
	}
	return "https"
}

func routesDevModeEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE")))
	return value == "1" || value == "true" || value == "yes"
}

func isExactDevelopmentHost(targetDomain string) bool {
	host := strings.ToLower(strings.TrimSpace(targetDomain))
	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		host = strings.Trim(parsedHost, "[]")
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && (ip.IsLoopback() || ip.IsPrivate())
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
	if len(signature) != ed25519.SignatureSize {
		return nil, "", 0, errors.New("invalid signature size")
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
	if len(parts) != 3 {
		return nil, errors.New("header field count mismatch")
	}
	for _, part := range parts {
		key, value, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok || key == "" || len(value) < 2 || value[0] != '"' || value[len(value)-1] != '"' {
			return nil, errors.New("header format mismatch")
		}
		if key != "Signature" && key != "KeyId" && key != "Timestamp" {
			return nil, errors.New("unknown header field")
		}
		if _, duplicate := result[key]; duplicate {
			return nil, errors.New("duplicate header field")
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
					continue
				}
				_ = s.store.DeleteFederationQueueItem(itemCtx, item)
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

func (s *Service) ValidateIncomingPDUBusiness(ctx context.Context, pdu models.PDU) error {
	if !strings.HasPrefix(pdu.Type, "gsn.") {
		return nil
	}
	gsnStore, ok := s.store.(repository.GsnStore)
	if !ok {
		return errors.New("store does not implement GsnStore")
	}

	sameActor := func(actor string) error {
		if actor == "" || !strings.EqualFold(actor, pdu.Sender) {
			return errors.New("federation GSN actor does not match authenticated PDU sender")
		}
		return nil
	}

	switch pdu.Type {
	case "gsn.post.v1":
		var post models.GsnPost
		if err := json.Unmarshal([]byte(pdu.Payload), &post); err != nil || post.ID == "" {
			return errors.New("invalid federated GSN post payload")
		}
		return sameActor(post.GaiaID)
	case "gsn.comment.v1":
		var comment models.GsnComment
		if err := json.Unmarshal([]byte(pdu.Payload), &comment); err != nil || comment.ID == "" || comment.PostID == "" {
			return errors.New("invalid federated GSN comment payload")
		}
		return sameActor(comment.GaiaID)
	case "gsn.reaction.v1":
		var reaction struct {
			PostID string `json:"postId"`
			GaiaID string `json:"gaiaId"`
			Emoji  string `json:"emoji"`
			Action string `json:"action"`
		}
		if err := json.Unmarshal([]byte(pdu.Payload), &reaction); err != nil || reaction.PostID == "" || reaction.Emoji == "" {
			return errors.New("invalid federated GSN reaction payload")
		}
		return sameActor(reaction.GaiaID)
	case "gsn.profile.v1":
		var profile models.GsnProfile
		if err := json.Unmarshal([]byte(pdu.Payload), &profile); err != nil {
			return errors.New("invalid federated GSN profile payload")
		}
		return sameActor(profile.GaiaID)
	case "gsn.follow.v1", "gsn.unfollow.v1":
		var follow struct {
			FollowerGaiaID  string `json:"followerGaiaId"`
			FollowingGaiaID string `json:"followingGaiaId"`
		}
		if err := json.Unmarshal([]byte(pdu.Payload), &follow); err != nil || follow.FollowingGaiaID == "" {
			return errors.New("invalid federated GSN relationship payload")
		}
		return sameActor(follow.FollowerGaiaID)
	case "gsn.post_delete.v1":
		var deletion struct {
			PostID string `json:"postId"`
		}
		if err := json.Unmarshal([]byte(pdu.Payload), &deletion); err != nil || deletion.PostID == "" {
			return errors.New("invalid federated GSN post deletion payload")
		}
		post, err := gsnStore.GetGsnPost(ctx, deletion.PostID)
		if err != nil || post == nil || !strings.EqualFold(post.GaiaID, pdu.Sender) {
			return errors.New("federated GSN post deletion not authorized")
		}
		return nil
	case "gsn.comment_delete.v1":
		var deletion struct {
			CommentID string `json:"commentId"`
			PostID    string `json:"postId"`
		}
		if err := json.Unmarshal([]byte(pdu.Payload), &deletion); err != nil || deletion.CommentID == "" || deletion.PostID == "" {
			return errors.New("invalid federated GSN comment deletion payload")
		}
		comment, err := gsnStore.GetGsnComment(ctx, deletion.CommentID)
		if err != nil || comment == nil || comment.PostID != deletion.PostID {
			return errors.New("federated GSN comment deletion target mismatch")
		}
		if strings.EqualFold(comment.GaiaID, pdu.Sender) {
			return nil
		}
		post, err := gsnStore.GetGsnPost(ctx, deletion.PostID)
		if err != nil || post == nil || !strings.EqualFold(post.GaiaID, pdu.Sender) {
			return errors.New("federated GSN comment deletion not authorized")
		}
		return nil
	default:
		return errors.New("unsupported federated GSN PDU type")
	}
}

func (s *Service) SaveIncomingPDU(ctx context.Context, pdu models.PDU) error {
	if err := validateIncomingPDUShape(pdu); err != nil {
		return err
	}
	origin, err := gaiaIDDomain(pdu.Sender)
	if err != nil {
		return err
	}
	if err := s.beginPDUProcessing(ctx, origin, pdu.PDUID); err != nil {
		return err
	}
	if err := s.persistIncomingPDU(ctx, pdu); err != nil {
		if releaseErr := s.finishPDUProcessing(ctx, origin, pdu.PDUID, false); releaseErr != nil {
			log.Printf("federation replay claim release failed for %s: %v", pdu.PDUID, releaseErr)
		}
		return err
	}
	if err := s.finishPDUProcessing(ctx, origin, pdu.PDUID, true); err != nil {
		return fmt.Errorf("complete federation replay claim: %w", err)
	}
	return nil
}

func validateIncomingPDUShape(pdu models.PDU) error {
	if err := validate.GaiaID(pdu.Sender); err != nil {
		return fmt.Errorf("consensus error: invalid sender GaiaID: %w", err)
	}
	if err := validate.GaiaID(pdu.Destination); err != nil {
		return fmt.Errorf("consensus error: invalid destination GaiaID: %w", err)
	}
	if pdu.Type != "gaia.encrypted.v1" && pdu.Type != "smtp.legacy" &&
		pdu.Type != "gsn.post.v1" && pdu.Type != "gsn.comment.v1" &&
		pdu.Type != "gsn.reaction.v1" &&
		pdu.Type != "gsn.post_delete.v1" && pdu.Type != "gsn.comment_delete.v1" &&
		pdu.Type != "gsn.profile.v1" && pdu.Type != "gsn.follow.v1" && pdu.Type != "gsn.unfollow.v1" {
		return fmt.Errorf("consensus error: invalid PDU type: %s", pdu.Type)
	}
	if _, err := uuid.Parse(pdu.PDUID); err != nil {
		return fmt.Errorf("consensus error: invalid PDU ID format (must be UUID): %w", err)
	}
	nowTS := time.Now().UTC().Unix()
	if pdu.CreatedAt < nowTS-3600 || pdu.CreatedAt > nowTS+3600 {
		return fmt.Errorf("consensus error: PDU timestamp skew too large")
	}
	if pdu.Type == "gaia.encrypted.v1" {
		if err := validateFederatedEncryptedSuite(pdu); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) beginPDUProcessing(ctx context.Context, origin string, pduID string) error {
	s.pduMutex.Lock()

	now := time.Now()
	for id, processedAt := range s.processedPDUs {
		if now.Sub(processedAt) > time.Hour {
			delete(s.processedPDUs, id)
		}
	}
	if _, processed := s.processedPDUs[pduID]; processed {
		s.pduMutex.Unlock()
		log.Printf("security warning: duplicate/replayed S2S PDU %s rejected", pduID)
		return ErrPDUAlreadyProcessed
	}
	if _, processing := s.processingPDUs[pduID]; processing {
		s.pduMutex.Unlock()
		return ErrPDUAlreadyProcessed
	}
	if len(s.processedPDUs) >= 50000 {
		s.pduMutex.Unlock()
		return errors.New("federation replay cache capacity reached")
	}
	s.processingPDUs[pduID] = struct{}{}
	s.pduMutex.Unlock()

	if replayStore, ok := s.store.(repository.FederationReplayStore); ok {
		claimed, err := replayStore.ClaimFederationPDU(ctx, origin, pduID, time.Now().UTC().Add(5*time.Minute))
		if err != nil || !claimed {
			s.pduMutex.Lock()
			delete(s.processingPDUs, pduID)
			s.pduMutex.Unlock()
			if err != nil {
				return fmt.Errorf("claim persistent federation replay guard: %w", err)
			}
			return ErrPDUAlreadyProcessed
		}
	}
	return nil
}

func (s *Service) finishPDUProcessing(ctx context.Context, origin string, pduID string, persisted bool) error {
	s.pduMutex.Lock()
	delete(s.processingPDUs, pduID)
	if persisted {
		s.processedPDUs[pduID] = time.Now()
	}
	s.pduMutex.Unlock()

	if replayStore, ok := s.store.(repository.FederationReplayStore); ok {
		if persisted {
			return replayStore.CompleteFederationPDU(ctx, origin, pduID, time.Now().UTC())
		}
		return replayStore.ReleaseFederationPDU(ctx, origin, pduID)
	}
	return nil
}

func (s *Service) persistIncomingPDU(ctx context.Context, pdu models.PDU) error {
	if strings.HasPrefix(pdu.Type, "gsn.") {
		gsnStore, ok := s.store.(repository.GsnStore)
		if !ok {
			return errors.New("store does not implement GsnStore")
		}

		switch pdu.Type {
		case "gsn.post.v1":
			var post models.GsnPost
			if err := json.Unmarshal([]byte(pdu.Payload), &post); err != nil {
				return fmt.Errorf("failed to unmarshal GSN post: %w", err)
			}
			post.IsVerifiedOperator = false
			post.IsVerifiedGovernance = false
			post.IsVerifiedPassport = false
			if err := gsnStore.CreateGsnPost(ctx, &post); err != nil {
				if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
					return fmt.Errorf("failed to save federated GSN post: %w", err)
				}
			}
		case "gsn.comment.v1":
			var comment models.GsnComment
			if err := json.Unmarshal([]byte(pdu.Payload), &comment); err != nil {
				return fmt.Errorf("failed to unmarshal GSN comment: %w", err)
			}
			if err := gsnStore.CreateGsnComment(ctx, &comment); err != nil {
				if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
					return fmt.Errorf("failed to save federated GSN comment: %w", err)
				}
			}
		case "gsn.reaction.v1":
			var reaction struct {
				PostID string `json:"postId"`
				GaiaID string `json:"gaiaId"`
				Emoji  string `json:"emoji"`
				Action string `json:"action"`
			}
			if err := json.Unmarshal([]byte(pdu.Payload), &reaction); err != nil {
				return fmt.Errorf("failed to unmarshal GSN reaction: %w", err)
			}
			if err := gsnStore.SaveGsnReaction(ctx, reaction.PostID, reaction.GaiaID, reaction.Emoji, reaction.Action); err != nil {
				return fmt.Errorf("failed to save federated GSN reaction: %w", err)
			}
		case "gsn.post_delete.v1":
			var deletePayload struct {
				PostID string `json:"postId"`
			}
			if err := json.Unmarshal([]byte(pdu.Payload), &deletePayload); err != nil {
				return fmt.Errorf("failed to unmarshal GSN post delete PDU: %w", err)
			}
			if err := gsnStore.DeleteGsnPost(ctx, deletePayload.PostID); err != nil {
				return fmt.Errorf("failed to delete federated GSN post: %w", err)
			}
		case "gsn.comment_delete.v1":
			var deletePayload struct {
				CommentID string `json:"commentId"`
			}
			if err := json.Unmarshal([]byte(pdu.Payload), &deletePayload); err != nil {
				return fmt.Errorf("failed to unmarshal GSN comment delete PDU: %w", err)
			}
			if err := gsnStore.DeleteGsnComment(ctx, deletePayload.CommentID); err != nil {
				return fmt.Errorf("failed to delete federated GSN comment: %w", err)
			}
		case "gsn.profile.v1":
			var profile models.GsnProfile
			if err := json.Unmarshal([]byte(pdu.Payload), &profile); err != nil {
				return fmt.Errorf("failed to unmarshal GSN profile: %w", err)
			}
			profile.IsVerifiedOperator = false
			profile.IsVerifiedGovernance = false
			profile.IsVerifiedPassport = false
			if err := gsnStore.UpdateGsnProfile(ctx, &profile); err != nil {
				return fmt.Errorf("failed to update federated GSN profile: %w", err)
			}
		case "gsn.follow.v1":
			var follow struct {
				FollowerGaiaID  string `json:"followerGaiaId"`
				FollowingGaiaID string `json:"followingGaiaId"`
			}
			if err := json.Unmarshal([]byte(pdu.Payload), &follow); err != nil {
				return fmt.Errorf("failed to unmarshal GSN follow: %w", err)
			}
			if err := gsnStore.FollowGsnUser(ctx, follow.FollowerGaiaID, follow.FollowingGaiaID); err != nil {
				return fmt.Errorf("failed to save federated GSN follow: %w", err)
			}
		case "gsn.unfollow.v1":
			var unfollow struct {
				FollowerGaiaID  string `json:"followerGaiaId"`
				FollowingGaiaID string `json:"followingGaiaId"`
			}
			if err := json.Unmarshal([]byte(pdu.Payload), &unfollow); err != nil {
				return fmt.Errorf("failed to unmarshal GSN unfollow: %w", err)
			}
			if err := gsnStore.UnfollowGsnUser(ctx, unfollow.FollowerGaiaID, unfollow.FollowingGaiaID); err != nil {
				return fmt.Errorf("failed to save federated GSN unfollow: %w", err)
			}
		}

		log.Printf("Processed federated GSN PDU %s of type %s", pdu.PDUID, pdu.Type)
		return nil
	}

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

func validateFederatedEncryptedSuite(pdu models.PDU) error {
	var envelope struct {
		AlgorithmSuite  string `json:"algorithm_suite"`
		SignatureBundle struct {
			MLDSA87       string `json:"ml_dsa_87"`
			MLDSA87Public string `json:"ml_dsa_87_public"`
		} `json:"signature_bundle"`
	}
	if err := json.Unmarshal([]byte(pdu.Payload), &envelope); err != nil {
		return fmt.Errorf("consensus error: invalid encrypted PDU payload: %w", err)
	}
	pduSuite := strings.TrimSpace(pdu.AlgorithmSuite)
	payloadSuite := strings.TrimSpace(envelope.AlgorithmSuite)
	if payloadSuite == federationTopSecretAlgorithmSuite || pduSuite == federationTopSecretAlgorithmSuite {
		if pduSuite != federationTopSecretAlgorithmSuite || payloadSuite != federationTopSecretAlgorithmSuite {
			return errors.New("consensus error: top secret federation downgrade rejected")
		}
		if strings.TrimSpace(envelope.SignatureBundle.MLDSA87) == "" || strings.TrimSpace(envelope.SignatureBundle.MLDSA87Public) == "" {
			return errors.New("consensus error: top secret federation requires ML-DSA-87 signature bundle")
		}
	}
	return nil
}

func AnonymizedClientID(username, email, deviceInfo, salt string) string {
	hashInput := fmt.Sprintf("%s:%s:%s:%s", username, email, deviceInfo, salt)
	sum := sha256.Sum256([]byte(hashInput))
	return hex.EncodeToString(sum[:])
}
