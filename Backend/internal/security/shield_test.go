// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func TestMain(m *testing.M) {
	_ = os.Setenv("GAIACOM_DEV_MODE", "true")
	_ = os.Setenv("GAIACOM_SHIELD_SECRET", "test-only-gaiacom-shield-secret-32-bytes-minimum")
	os.Exit(m.Run())
}

type MockStore struct {
	repository.Store
	savedEvents     []*models.SecurityEvent
	privateContexts []*models.SecurityEventPrivateContext
	auditChains     []*models.SecurityAuditChain
	auditChain      *models.SecurityAuditChain
	identities      map[uuid.UUID]*models.Identity
	userIdentities  map[uuid.UUID][]models.Identity
	credentials     map[string][]models.RoleCredential
	envelopes       map[uuid.UUID]*models.MessageEnvelope
	belongsTo       map[string]bool
	isAdmin         map[string]bool
}

func NewMockStore() *MockStore {
	return &MockStore{
		identities:     make(map[uuid.UUID]*models.Identity),
		userIdentities: make(map[uuid.UUID][]models.Identity),
		credentials:    make(map[string][]models.RoleCredential),
		envelopes:      make(map[uuid.UUID]*models.MessageEnvelope),
		belongsTo:      make(map[string]bool),
		isAdmin:        make(map[string]bool),
	}
}

func (m *MockStore) SaveSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateContext *models.SecurityEventPrivateContext, audit *models.SecurityAuditChain) error {
	m.savedEvents = append(m.savedEvents, event)
	if privateContext != nil {
		m.privateContexts = append(m.privateContexts, privateContext)
	}
	if audit != nil {
		m.auditChains = append(m.auditChains, audit)
	}
	return nil
}

func (m *MockStore) GetLatestSecurityAuditChain(ctx context.Context) (*models.SecurityAuditChain, error) {
	return m.auditChain, nil
}

func (m *MockStore) FindIdentityByID(id uuid.UUID) (*models.Identity, error) {
	if ident, ok := m.identities[id]; ok {
		return ident, nil
	}
	return nil, errors.New("not found")
}

func (m *MockStore) FindIdentitiesByUserID(userID uuid.UUID) ([]models.Identity, error) {
	if identities, ok := m.userIdentities[userID]; ok {
		return identities, nil
	}
	return nil, nil
}

func (m *MockStore) GetCredentialsBySubject(ctx context.Context, subjectIdentity string) ([]models.RoleCredential, error) {
	return m.credentials[strings.ToLower(strings.TrimSpace(subjectIdentity))], nil
}

func (m *MockStore) GetCredentialRevocation(ctx context.Context, credID string) (*models.RoleCredentialRevocation, error) {
	return nil, nil
}

func (m *MockStore) FindMessageEnvelopesByIDs(ctx context.Context, ids []uuid.UUID) ([]*models.MessageEnvelope, error) {
	var res []*models.MessageEnvelope
	for _, id := range ids {
		if env, ok := m.envelopes[id]; ok {
			res = append(res, env)
		}
	}
	return res, nil
}

func (m *MockStore) IdentityBelongsToUser(identityID uuid.UUID, userID uuid.UUID) (bool, error) {
	key := identityID.String() + "-" + userID.String()
	return m.belongsTo[key], nil
}

func (m *MockStore) UserIsRoomAdmin(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) (bool, error) {
	key := userID.String() + "-" + roomID.String()
	return m.isAdmin[key], nil
}

func TestEdgeShieldMiddleware_Traversal(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store
	middleware := sys.EdgeShieldMiddleware()

	nextHandler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}

	// 1. Valid request
	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	rr := httptest.NewRecorder()
	middleware(nextHandler)(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %v", rr.Code)
	}

	// 2. Traversal attempt
	req = httptest.NewRequest("GET", "/api/v1/../../../etc/passwd", nil)
	rr = httptest.NewRecorder()
	middleware(nextHandler)(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected status BadRequest for path traversal, got %v", rr.Code)
	}
	if len(store.savedEvents) == 0 {
		t.Error("Expected a security event to be recorded for traversal")
	}
	if store.savedEvents[0].Category != "malformed_request" {
		t.Errorf("Expected category malformed_request, got %s", store.savedEvents[0].Category)
	}
}

func TestEdgeShieldMiddleware_RateLimiting(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store

	ip := "192.168.1.50"
	// Check in-memory rate limit manually to test limits
	limited := sys.isIPRateLimited(ip, 3, 10*time.Second)
	if limited {
		t.Error("First hit should not be rate limited")
	}
	limited = sys.isIPRateLimited(ip, 3, 10*time.Second)
	limited = sys.isIPRateLimited(ip, 3, 10*time.Second)
	limited = sys.isIPRateLimited(ip, 3, 10*time.Second)
	if !limited {
		t.Error("Fourth hit in 10s should be rate limited")
	}
}

func TestSSRFBlocking(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store

	ctx := context.Background()
	req := httptest.NewRequest("GET", "/", nil)

	// Localhost should be blocked
	blocked := sys.IsSSRFBlocked(ctx, "localhost", req)
	if !blocked {
		t.Error("Expected localhost to be blocked by SSRF checks")
	}

	blocked = sys.IsSSRFBlocked(ctx, "127.0.0.1", req)
	if !blocked {
		t.Error("Expected 127.0.0.1 to be blocked by SSRF checks")
	}
}

func TestMessageEnvelopeValidation(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store
	ctx := context.Background()
	sender := uuid.New()
	req := httptest.NewRequest("POST", "/send", nil)

	// Test 1: Invalid json
	err := sys.CheckMessageEnvelope(ctx, sender, []byte("{invalid-json"), req)
	if err == nil || !strings.Contains(err.Error(), "invalid JSON") {
		t.Errorf("Expected JSON error, got %v", err)
	}

	// Test 2: Missing signature
	env := plainEnvelope{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Payload:   "encrypted_data",
		Signature: "",
	}
	envBytes, _ := json.Marshal(env)
	err = sys.CheckMessageEnvelope(ctx, sender, envBytes, req)
	if err == nil || !strings.Contains(err.Error(), "signature required") {
		t.Errorf("Expected signature missing error, got %v", err)
	}

	// Test 3: Replay attack detection
	msgID := uuid.New()
	store.envelopes[msgID] = &models.MessageEnvelope{ID: msgID}
	envReplay := plainEnvelope{
		ID:        msgID.String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Payload:   "encrypted_data",
		Signature: "validsignature",
	}
	replayBytes, _ := json.Marshal(envReplay)
	err = sys.CheckMessageEnvelope(ctx, sender, replayBytes, req)
	if err == nil || !strings.Contains(err.Error(), "replay attack detected") {
		t.Errorf("Expected replay attack error, got %v", err)
	}

	// Test 4: Clock skew
	envSkew := plainEnvelope{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Add(30 * time.Minute).Format(time.RFC3339Nano),
		Payload:   "encrypted_data",
		Signature: "validsignature",
	}
	skewBytes, _ := json.Marshal(envSkew)
	err = sys.CheckMessageEnvelope(ctx, sender, skewBytes, req)
	if err == nil || !strings.Contains(err.Error(), "clock skew limit exceeded") {
		t.Errorf("Expected clock skew error, got %v", err)
	}
}

func TestCheckAPIAction(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store
	req := httptest.NewRequest("GET", "/api", nil)

	userID := uuid.New()
	identityID := uuid.New()

	// Test 1: Forgery
	store.belongsTo[identityID.String()+"-"+userID.String()] = false
	err := sys.CheckAPIAction(req, "use_identity", userID, identityID)
	if err == nil || !strings.Contains(err.Error(), "forbidden: sender identity not authorized") {
		t.Errorf("Expected BOLA error, got %v", err)
	}

	// Test 2: Allowed
	store.belongsTo[identityID.String()+"-"+userID.String()] = true
	err = sys.CheckAPIAction(req, "use_identity", userID, identityID)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestSecurityHandlerHasRoleAllowsBootstrapAndCredentialNodeOperator(t *testing.T) {
	store := NewMockStore()
	sys := NewSecuritySystem(store)
	sys.Store = store
	handler := NewSecurityHandler(sys)

	userID := uuid.New()
	bootstrapIdentity := models.Identity{
		ID:     uuid.New(),
		UserID: userID,
		GaiaID: "operator@gaiacom.local",
	}
	store.userIdentities[userID] = []models.Identity{bootstrapIdentity}

	previousBootstrap := BootstrapGaiaID
	BootstrapGaiaID = "operator@gaiacom.local"
	defer func() { BootstrapGaiaID = previousBootstrap }()

	if !handler.hasRole(context.Background(), userID, "node_operator") {
		t.Fatal("bootstrap GaiaID must unlock node operator security center access")
	}

	credentialUserID := uuid.New()
	credentialIdentity := models.Identity{
		ID:     uuid.New(),
		UserID: credentialUserID,
		GaiaID: "credentialed@gaiacom.local",
	}
	store.userIdentities[credentialUserID] = []models.Identity{credentialIdentity}
	store.credentials["credentialed@gaiacom.local"] = []models.RoleCredential{
		{
			ID:              "node-op-test",
			Role:            "node_operator",
			SubjectIdentity: "credentialed@gaiacom.local",
			ValidFrom:       time.Now().Add(-time.Minute),
			ValidUntil:      time.Now().Add(time.Hour),
		},
	}
	BootstrapGaiaID = ""

	if !handler.hasRole(context.Background(), credentialUserID, "node_operator") {
		t.Fatal("active node_operator credential must unlock security center node access")
	}
}

func TestAttachmentGuardRejectsBundledNativeAttachmentAttacks(t *testing.T) {
	store := NewMockStore()
	sys := &SecuritySystem{
		Store:       store,
		HMACKey:     []byte("test-key"),
		NodeID:      "test-node",
		rateLimits:  make(map[string][]time.Time),
		quarantines: make(map[string]time.Time),
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/storage/init", nil)

	if err := sys.CheckAttachmentUpload(
		context.Background(),
		"native-mail-envelope.bin",
		maxNativeAttachmentEnvelopeBytes,
		"application/octet-stream",
		req,
	); err != nil {
		t.Fatalf("expected native 10 GiB encrypted envelope ceiling to pass: %v", err)
	}

	attacks := []struct {
		name        string
		filename    string
		size        int64
		contentType string
	}{
		{
			name:        "oversize-envelope",
			filename:    "oversize.bin",
			size:        maxNativeAttachmentEnvelopeBytes + 1,
			contentType: "application/octet-stream",
		},
		{
			name:        "script-extension-with-safe-mime",
			filename:    "invoice.js",
			size:        1024,
			contentType: "application/octet-stream",
		},
		{
			name:        "html-mime-polyglot",
			filename:    "invoice.bin",
			size:        1024,
			contentType: "text/html; charset=utf-8",
		},
		{
			name:        "svg-mime-polyglot",
			filename:    "avatar.bin",
			size:        1024,
			contentType: "image/svg+xml",
		},
	}

	for _, attack := range attacks {
		t.Run(attack.name, func(t *testing.T) {
			if err := sys.CheckAttachmentUpload(context.Background(), attack.filename, attack.size, attack.contentType, req); err == nil {
				t.Fatalf("expected bundled attachment attack to be rejected: %+v", attack)
			}
		})
	}
}
