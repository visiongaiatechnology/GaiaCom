package federation

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func setupTestFedDBAndStore(t *testing.T) (*repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	store := repository.NewSQLStore(db)

	cleanup := func() {
		db.Close()
	}
	return store, cleanup
}

func TestParseS2SHeader(t *testing.T) {
	signature := make([]byte, ed25519.SignatureSize)
	header := `X-Gaia-S2S-V1 Signature="` +
		base64.StdEncoding.EncodeToString(signature) +
		`",KeyId="server.example",Timestamp="12345"`

	parsedSignature, keyID, timestamp, err := parseS2SHeader(header)
	if err != nil {
		t.Fatalf("parseS2SHeader failed: %v", err)
	}
	if keyID != "server.example" {
		t.Fatalf("unexpected keyID: %s", keyID)
	}
	if timestamp != 12345 {
		t.Fatalf("unexpected timestamp: %d", timestamp)
	}
	if len(parsedSignature) != ed25519.SignatureSize {
		t.Fatalf("unexpected signature size: %d", len(parsedSignature))
	}
}

func TestParseS2SHeaderRejectsBadDomain(t *testing.T) {
	signature := make([]byte, ed25519.SignatureSize)
	header := `X-Gaia-S2S-V1 Signature="` +
		base64.StdEncoding.EncodeToString(signature) +
		`",KeyId=".example",Timestamp="12345"`

	if _, _, _, err := parseS2SHeader(header); err == nil {
		t.Fatal("parseS2SHeader accepted an invalid KeyId")
	}
}

func TestHandleServerDiscovery(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()

	pub, priv, _ := ed25519.GenerateKey(nil)
	svc := NewService(store, "localhost", priv)
	handler := NewHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/.well-known/gaiacom/server", nil)
	rec := httptest.NewRecorder()

	handler.HandleServerDiscovery(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if resp["server_name"] != "localhost" {
		t.Errorf("expected server_name 'localhost', got %q", resp["server_name"])
	}

	expectedPub := base64.StdEncoding.EncodeToString(pub)
	if resp["ed25519_public_key"] != expectedPub {
		t.Errorf("expected public key %q, got %q", expectedPub, resp["ed25519_public_key"])
	}

	// Method Not Allowed
	req = httptest.NewRequest(http.MethodPost, "/.well-known/gaiacom/server", nil)
	rec = httptest.NewRecorder()
	handler.HandleServerDiscovery(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 MethodNotAllowed, got %d", rec.Code)
	}
}

func TestHandleNodeInfo(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()

	_, priv, _ := ed25519.GenerateKey(nil)
	svc := NewService(store, "node.example", priv)
	handler := NewHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/.well-known/gaiacom/nodeinfo", nil)
	rec := httptest.NewRecorder()
	handler.HandleNodeInfo(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		ServerName string            `json:"server_name"`
		Protocols  []string          `json:"protocols"`
		Endpoints  map[string]string `json:"endpoints"`
		Software   map[string]string `json:"software"`
		Policy     struct {
			HTTPSRequired bool    `json:"https_required"`
			MaxBodyBytes  float64 `json:"max_body_bytes"`
			Signature     string  `json:"signature"`
		} `json:"policy"`
		Capabilities struct {
			TopSecret       bool     `json:"top_secret"`
			SignatureSuites []string `json:"signature_suites"`
		} `json:"capabilities"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode nodeinfo response: %v", err)
	}

	if resp.ServerName != "node.example" {
		t.Fatalf("server name got %q, want node.example", resp.ServerName)
	}
	if !containsProtocol(resp.Protocols, "gaiacom.s2s.v1") {
		t.Fatalf("nodeinfo protocols missing gaiacom.s2s.v1: %#v", resp.Protocols)
	}
	if resp.Endpoints["s2s_forward"] != "/.well-known/gaiacom/s2s/v1/forward" {
		t.Fatalf("unexpected s2s endpoint: %#v", resp.Endpoints)
	}
	if resp.Software["name"] != "GaiaCOM" {
		t.Fatalf("unexpected software metadata: %#v", resp.Software)
	}
	if !resp.Policy.HTTPSRequired || resp.Policy.MaxBodyBytes != maxFederationBodyBytes || resp.Policy.Signature == "" {
		t.Fatalf("unexpected policy metadata: %+v", resp.Policy)
	}
	if !resp.Capabilities.TopSecret || !containsProtocol(resp.Capabilities.SignatureSuites, federationTopSecretAlgorithmSuite) {
		t.Fatalf("nodeinfo top secret capabilities missing: %+v", resp.Capabilities)
	}

	req = httptest.NewRequest(http.MethodPost, "/.well-known/gaiacom/nodeinfo", nil)
	rec = httptest.NewRecorder()
	handler.HandleNodeInfo(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 MethodNotAllowed, got %d", rec.Code)
	}
}

func TestValidateFederatedTopSecretSuite(t *testing.T) {
	validPayload := `{"algorithm_suite":"` + federationTopSecretAlgorithmSuite + `","signature_bundle":{"ml_dsa_87":"pq-sig","ml_dsa_87_public":"pq-pub"}}`
	if err := validateFederatedEncryptedSuite(models.PDU{
		Type:           "gaia.encrypted.v1",
		AlgorithmSuite: federationTopSecretAlgorithmSuite,
		Payload:        validPayload,
	}); err != nil {
		t.Fatalf("valid top secret federation payload rejected: %v", err)
	}

	if err := validateFederatedEncryptedSuite(models.PDU{
		Type:    "gaia.encrypted.v1",
		Payload: validPayload,
	}); err == nil {
		t.Fatalf("expected top secret payload without PDU suite to be rejected")
	}

	if err := validateFederatedEncryptedSuite(models.PDU{
		Type:           "gaia.encrypted.v1",
		AlgorithmSuite: federationTopSecretAlgorithmSuite,
		Payload:        `{"algorithm_suite":"` + federationTopSecretAlgorithmSuite + `","signature_bundle":{"ml_dsa_87":"pq-sig"}}`,
	}); err == nil {
		t.Fatalf("expected missing ML-DSA-87 public key to be rejected")
	}
}

func TestEnsureRemoteTopSecretCapability(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	_, priv, _ := ed25519.GenerateKey(nil)
	svc := NewService(nil, "node.example", priv)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/gaiacom/nodeinfo" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"capabilities": map[string]interface{}{
				"top_secret":       true,
				"signature_suites": []string{federationTopSecretAlgorithmSuite},
			},
		})
	}))
	defer ts.Close()
	svc.httpClient = ts.Client()

	targetDomain := strings.TrimPrefix(ts.URL, "http://")
	if err := svc.ensureRemoteTopSecretCapability(context.Background(), targetDomain); err != nil {
		t.Fatalf("expected top secret capable node to be accepted: %v", err)
	}
}

func TestEnsureRemoteTopSecretCapabilityRejectsLegacyNode(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	_, priv, _ := ed25519.GenerateKey(nil)
	svc := NewService(nil, "node.example", priv)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/gaiacom/nodeinfo" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"capabilities": map[string]interface{}{
				"top_secret":       false,
				"signature_suites": []string{},
			},
		})
	}))
	defer ts.Close()
	svc.httpClient = ts.Client()

	targetDomain := strings.TrimPrefix(ts.URL, "http://")
	if err := svc.ensureRemoteTopSecretCapability(context.Background(), targetDomain); err == nil {
		t.Fatalf("expected legacy node without top secret capability to be rejected")
	}
}

func TestHandleS2SForward(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()

	// Setup receiving server (us)
	_, ourPriv, _ := ed25519.GenerateKey(nil)
	ourSvc := NewService(store, "ourserver.net", ourPriv)
	handler := NewHandler(ourSvc)

	// Setup sending remote server
	senderPub, senderPriv, _ := ed25519.GenerateKey(nil)
	senderDomain := "remoteserver.org"

	// Register sender public key in our database to bypass HTTP discovery fetch
	err := store.CreateFederationServer(&models.FederationServer{
		Domain:      senderDomain,
		PublicKey:   senderPub,
		FirstSeenAt: time.Now().UTC(),
		LastSeenAt:  time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("failed to register sender key: %v", err)
	}

	// Valid Payload
	payload := FederationPayload{
		Origin:         senderDomain,
		OriginServerTS: time.Now().Unix(),
		PDUs: []models.PDU{
			{
				PDUID:       "00000000-0000-0000-0000-000000000001",
				Sender:      "@alice:remoteserver.org",
				Destination: "@system:ourserver.net",
				Type:        "gsn.post.v1",
				Payload:     `{"id":"test-post-pdu","gaiaId":"@alice:remoteserver.org","displayName":"Alice","avatar":"","nodeId":"remoteserver.org","timestamp":"2026-06-23T18:00:00Z","body":"hello","signature":"sig","repostOfPostId":""}`,
				CreatedAt:   time.Now().Unix(),
			},
		},
	}
	remoteSvcMock := NewService(nil, senderDomain, senderPriv)
	if err := remoteSvcMock.signPDU(&payload.PDUs[0]); err != nil {
		t.Fatalf("signPDU failed: %v", err)
	}
	payloadBytes, _ := json.Marshal(payload)

	// 1. Success case with valid signature
	req := httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader(payloadBytes))
	req.Header.Set("Content-Type", "application/json")

	// Sign the request as the remote server
	err = remoteSvcMock.signRequest(req, payloadBytes)
	if err != nil {
		t.Fatalf("signRequest failed: %v", err)
	}

	rec := httptest.NewRecorder()
	handler.HandleS2SForward(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	// 2. Reject mismatched method
	req = httptest.NewRequest(http.MethodGet, "/_gaiacom/s2s/v1/forward", nil)
	rec = httptest.NewRecorder()
	handler.HandleS2SForward(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 MethodNotAllowed, got %d", rec.Code)
	}

	// 3. Reject missing auth header
	req = httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader(payloadBytes))
	rec = httptest.NewRecorder()
	handler.HandleS2SForward(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for missing signature, got %d", rec.Code)
	}

	// 4. Reject bad/tampered payload
	req = httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader(payloadBytes))
	_ = remoteSvcMock.signRequest(req, payloadBytes)
	// Tamper payload body but keep original signed header
	badReq := httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader([]byte(`{"tampered":"body"}`)))
	badReq.Header.Set("Authorization", req.Header.Get("Authorization"))
	rec = httptest.NewRecorder()
	handler.HandleS2SForward(rec, badReq)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for tampered payload, got %d", rec.Code)
	}

	// 5. Reject blocked server
	blockedDomain := "blockedserver.com"
	blockedPub, _, _ := ed25519.GenerateKey(nil)
	_ = store.CreateFederationServer(&models.FederationServer{
		Domain:      blockedDomain,
		PublicKey:   blockedPub,
		FirstSeenAt: time.Now().UTC(),
		LastSeenAt:  time.Now().UTC(),
		IsBlocked:   true,
	})

	blockedPayload := FederationPayload{
		Origin:         blockedDomain,
		OriginServerTS: time.Now().Unix(),
		PDUs:           payload.PDUs,
	}
	blockedBytes, _ := json.Marshal(blockedPayload)
	req = httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader(blockedBytes))
	req.Header.Set("Authorization", fmt.Sprintf(
		`X-Gaia-S2S-V1 Signature="%s",KeyId="%s",Timestamp="%d"`,
		base64.StdEncoding.EncodeToString(make([]byte, 64)),
		blockedDomain,
		time.Now().Unix(),
	))
	rec = httptest.NewRecorder()
	handler.HandleS2SForward(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for blocked server, got %d", rec.Code)
	}
}

func TestFederationQueueAndWorker(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()

	receivedPDU := false

	senderPub, senderPriv, _ := ed25519.GenerateKey(nil)

	destDomain := "remotefed.org"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/.well-known/gaiacom/server" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"server_name":        destDomain,
				"ed25519_public_key": base64.StdEncoding.EncodeToString(senderPub),
			})
			return
		}
		if r.URL.Path == "/.well-known/gaiacom/s2s/v1/forward" {
			receivedPDU = true
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"accepted"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer ts.Close()

	// Instantiate our service
	svc := NewService(store, "ourlocal.net", senderPriv)

	// Queue PDU
	pdu := models.PDU{
		PDUID:       "pdu_queued_1",
		Sender:      "@alice:ourlocal.net",
		Destination: destDomain,
		Type:        "gaia.message",
		Payload:     `{"body":"queued hello"}`,
		CreatedAt:   time.Now().Unix(),
	}

	err := svc.QueueOutgoingPDU(pdu, destDomain)
	if err != nil {
		t.Fatalf("QueueOutgoingPDU failed: %v", err)
	}

	// Run ProcessFederationQueue
	// Note: targetURL is built as `https://%s/...`, but our test server is HTTP (ts.URL starts with http://).
	// To make http.Client hit our test server without TLS error (since HTTP target with https scheme fails),
	// we modify the HTTP Client inside the service for tests to redirect https requests to our http mock server.
	svc.httpClient.Transport = &mockTransport{
		TargetURL: ts.URL,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.ProcessFederationQueue(ctx)

	if !receivedPDU {
		t.Error("expected mock server to receive S2S forward request")
	}

	// Verify queue is empty now (item deleted on success)
	item, err := store.ClaimNextFederationQueueItem(context.Background())
	if err != nil {
		t.Fatalf("ClaimNextFederationQueueItem failed: %v", err)
	}
	if item != nil {
		t.Error("expected queue item to be deleted after successful transaction")
	}
}

func TestVerifyReceivedRequestTriggersDiscovery(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()

	senderPub, senderPriv, _ := ed25519.GenerateKey(nil)

	destDomain := "remotesender.org"

	// Mock server for sender domain
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/.well-known/gaiacom/server" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"server_name":        destDomain,
				"ed25519_public_key": base64.StdEncoding.EncodeToString(senderPub),
			})
			return
		}
		w.WriteHeader(500)
	}))
	defer ts.Close()

	// Our service (the receiver)
	_, ourPriv, _ := ed25519.GenerateKey(nil)
	ourSvc := NewService(store, "ourlocal.net", ourPriv)
	ourSvc.httpClient.Transport = &mockTransport{
		TargetURL: ts.URL,
	}

	// Sign a request as the sender (using destDomain as the keyID/sender domain)
	senderSvcMock := NewService(nil, destDomain, senderPriv)
	req := httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader([]byte(`{}`)))
	_ = senderSvcMock.signRequest(req, []byte(`{}`))

	// Verify the request (this should trigger discovery because destDomain's public key is not in DB)
	_, err := ourSvc.VerifyReceivedRequest(req, []byte(`{}`))
	if err != nil {
		t.Fatalf("VerifyReceivedRequest failed: %v", err)
	}

	// Verify that the server public key was saved in the database
	server, err := store.FindFederationServer(destDomain)
	if err != nil {
		t.Fatalf("expected server to be saved in DB: %v", err)
	}
	if !bytes.Equal(server.PublicKey, senderPub) {
		t.Error("saved public key mismatch")
	}
}

func TestValidateAuthenticatedPayloadRejectsCrossDomainForgery(t *testing.T) {
	remotePub, remotePriv, _ := ed25519.GenerateKey(nil)
	_, localPriv, _ := ed25519.GenerateKey(nil)
	local := NewService(nil, "local.example", localPriv)
	remote := NewService(nil, "remote.example", remotePriv)

	pdu := models.PDU{
		PDUID:       "10000000-0000-0000-0000-000000000001",
		Type:        "gsn.post.v1",
		Sender:      "@alice:victim.example",
		Destination: "@system:local.example",
		Payload:     `{"id":"post-1","gaiaId":"@alice:victim.example","body":"forged"}`,
		CreatedAt:   time.Now().Unix(),
	}
	if err := remote.signPDU(&pdu); err != nil {
		t.Fatalf("signPDU: %v", err)
	}
	payload := FederationPayload{Origin: "remote.example", OriginServerTS: time.Now().Unix(), PDUs: []models.PDU{pdu}}
	err := local.ValidateAuthenticatedPayload(payload, &AuthenticatedPeer{Domain: "remote.example", PublicKey: remotePub})
	if err == nil || !strings.Contains(err.Error(), "sender domain") {
		t.Fatalf("cross-domain sender forgery accepted: %v", err)
	}
}

func TestValidateAuthenticatedPayloadRejectsOriginAndDestinationMismatch(t *testing.T) {
	remotePub, remotePriv, _ := ed25519.GenerateKey(nil)
	_, localPriv, _ := ed25519.GenerateKey(nil)
	local := NewService(nil, "local.example", localPriv)
	remote := NewService(nil, "remote.example", remotePriv)

	pdu := models.PDU{
		PDUID:       "10000000-0000-0000-0000-000000000002",
		Type:        "gsn.post.v1",
		Sender:      "@alice:remote.example",
		Destination: "@system:other.example",
		Payload:     `{"id":"post-2","gaiaId":"@alice:remote.example","body":"wrong target"}`,
		CreatedAt:   time.Now().Unix(),
	}
	if err := remote.signPDU(&pdu); err != nil {
		t.Fatalf("signPDU: %v", err)
	}
	peer := &AuthenticatedPeer{Domain: "remote.example", PublicKey: remotePub}
	if err := local.ValidateAuthenticatedPayload(FederationPayload{Origin: "forged.example", OriginServerTS: time.Now().Unix(), PDUs: []models.PDU{pdu}}, peer); err == nil {
		t.Fatal("mismatched transaction origin accepted")
	}
	if err := local.ValidateAuthenticatedPayload(FederationPayload{Origin: "remote.example", OriginServerTS: time.Now().Unix(), PDUs: []models.PDU{pdu}}, peer); err == nil || !strings.Contains(err.Error(), "destination") {
		t.Fatalf("remote destination accepted: %v", err)
	}
}

func TestValidateAuthenticatedPayloadRejectsTamperedPDU(t *testing.T) {
	remotePub, remotePriv, _ := ed25519.GenerateKey(nil)
	_, localPriv, _ := ed25519.GenerateKey(nil)
	local := NewService(nil, "local.example", localPriv)
	remote := NewService(nil, "remote.example", remotePriv)

	pdu := models.PDU{
		PDUID:       "10000000-0000-0000-0000-000000000003",
		Type:        "gsn.post.v1",
		Sender:      "@alice:remote.example",
		Destination: "@system:local.example",
		Payload:     `{"id":"post-3","gaiaId":"@alice:remote.example","body":"original"}`,
		CreatedAt:   time.Now().Unix(),
	}
	if err := remote.signPDU(&pdu); err != nil {
		t.Fatalf("signPDU: %v", err)
	}
	pdu.Payload = `{"id":"post-3","gaiaId":"@alice:remote.example","body":"tampered"}`
	err := local.ValidateAuthenticatedPayload(
		FederationPayload{Origin: "remote.example", OriginServerTS: time.Now().Unix(), PDUs: []models.PDU{pdu}},
		&AuthenticatedPeer{Domain: "remote.example", PublicKey: remotePub},
	)
	if err == nil || !strings.Contains(err.Error(), "hash mismatch") {
		t.Fatalf("tampered PDU accepted: %v", err)
	}
}

func TestTransportSignatureBindsMethodAndPath(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()
	remotePub, remotePriv, _ := ed25519.GenerateKey(nil)
	_, localPriv, _ := ed25519.GenerateKey(nil)
	if err := store.CreateFederationServer(&models.FederationServer{Domain: "remote.example", PublicKey: remotePub}); err != nil {
		t.Fatalf("CreateFederationServer: %v", err)
	}
	remote := NewService(nil, "remote.example", remotePriv)
	local := NewService(store, "local.example", localPriv)
	body := []byte(`{"origin":"remote.example"}`)
	signed := httptest.NewRequest(http.MethodPost, "/_gaiacom/s2s/v1/forward", bytes.NewReader(body))
	if err := remote.signRequest(signed, body); err != nil {
		t.Fatalf("signRequest: %v", err)
	}
	replayed := httptest.NewRequest(http.MethodPost, "/api/v1/public/smtp/ingest", bytes.NewReader(body))
	replayed.Header.Set("Authorization", signed.Header.Get("Authorization"))
	if _, err := local.VerifyReceivedRequest(replayed, body); err == nil {
		t.Fatal("transport signature replayed to another path")
	}
}

func TestFederationSchemeNeverUsesSubstringDowngrade(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	if got := federationScheme("localhost.attacker.example"); got != "https" {
		t.Fatalf("substring hostname downgraded to %s", got)
	}
	if got := federationScheme("localhost"); got != "http" {
		t.Fatalf("exact development localhost scheme = %s, want http", got)
	}
	t.Setenv("GAIACOM_DEV_MODE", "false")
	if got := federationScheme("localhost"); got != "https" {
		t.Fatalf("production localhost scheme = %s, want https", got)
	}
}

func TestValidateIncomingPDUBusinessRejectsActorForgeryAndForeignDeletion(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()
	_, privateKey, _ := ed25519.GenerateKey(nil)
	service := NewService(store, "local.example", privateKey)
	ctx := context.Background()

	post := &models.GsnPost{
		ID: "owned-post", GaiaID: "@alice:remote.example", NodeID: "remote.example",
		Timestamp: time.Now().UTC().Format(time.RFC3339), Body: "original", Signature: "user-signature",
	}
	if err := store.CreateGsnPost(ctx, post); err != nil {
		t.Fatalf("CreateGsnPost: %v", err)
	}

	forgedReaction := models.PDU{
		Type: "gsn.reaction.v1", Sender: "@mallory:remote.example",
		Payload: `{"postId":"owned-post","gaiaId":"@alice:remote.example","emoji":"👍","action":"add"}`,
	}
	if err := service.ValidateIncomingPDUBusiness(ctx, forgedReaction); err == nil {
		t.Fatal("GSN reaction actor forgery accepted")
	}

	foreignDeletion := models.PDU{
		Type: "gsn.post_delete.v1", Sender: "@mallory:remote.example",
		Payload: `{"postId":"owned-post"}`,
	}
	if err := service.ValidateIncomingPDUBusiness(ctx, foreignDeletion); err == nil {
		t.Fatal("foreign GSN post deletion accepted")
	}

	ownerDeletion := foreignDeletion
	ownerDeletion.Sender = "@alice:remote.example"
	if err := service.ValidateIncomingPDUBusiness(ctx, ownerDeletion); err != nil {
		t.Fatalf("owner GSN post deletion rejected: %v", err)
	}
}

func TestPersistentReplayGuardSurvivesServiceRestart(t *testing.T) {
	store, cleanup := setupTestFedDBAndStore(t)
	defer cleanup()
	_, firstKey, _ := ed25519.GenerateKey(nil)
	first := NewService(store, "local.example", firstKey)
	pdu := models.PDU{
		PDUID:       "20000000-0000-0000-0000-000000000001",
		Type:        "gsn.post.v1",
		Sender:      "@alice:remote.example",
		Destination: "@system:local.example",
		Payload:     `{"id":"persistent-replay-post","gaiaId":"@alice:remote.example","nodeId":"remote.example","timestamp":"2026-07-14T20:00:00Z","body":"once","signature":"sig"}`,
		CreatedAt:   time.Now().Unix(),
	}
	if err := first.SaveIncomingPDU(context.Background(), pdu); err != nil {
		t.Fatalf("initial PDU persistence failed: %v", err)
	}

	_, restartedKey, _ := ed25519.GenerateKey(nil)
	restarted := NewService(store, "local.example", restartedKey)
	if err := restarted.SaveIncomingPDU(context.Background(), pdu); !errors.Is(err, ErrPDUAlreadyProcessed) {
		t.Fatalf("replayed PDU accepted after service restart: %v", err)
	}
}

type mockTransport struct {
	TargetURL string
}

func (m *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Re-route to mock server URL preserving path
	target := m.TargetURL + req.URL.Path
	mockReq, err := http.NewRequest(req.Method, target, req.Body)
	if err != nil {
		return nil, err
	}
	mockReq.Header = req.Header
	return http.DefaultTransport.RoundTrip(mockReq)
}
