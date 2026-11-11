package attestations

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"testing"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

type fakeStore struct {
	attestations map[string]models.IdentityAttestation
	identities   map[string]models.Identity
	userIdent    map[uuid.UUID][]models.Identity
	accessLog    []models.NodeIdentityAccessLog
	directory    []models.OperatorDirectoryEntry
	stats        models.OperatorStats
}

func newFakeStore() *fakeStore {
	return &fakeStore{
		attestations: make(map[string]models.IdentityAttestation),
		identities:   make(map[string]models.Identity),
		userIdent:    make(map[uuid.UUID][]models.Identity),
	}
}

func (f *fakeStore) CreateAttestation(_ context.Context, attestation *models.IdentityAttestation) error {
	key := keyOf(attestation.SubjectGaiaID, attestation.Type, attestation.IssuerGaiaID)
	for _, existing := range f.attestations {
		if existing.RevokedAt == "" && keyOf(existing.SubjectGaiaID, existing.Type, existing.IssuerGaiaID) == key {
			return ErrDuplicate
		}
	}
	f.attestations[attestation.ID] = *attestation
	return nil
}

func (f *fakeStore) GetAttestationByID(_ context.Context, id string) (*models.IdentityAttestation, error) {
	attestation, ok := f.attestations[id]
	if !ok {
		return nil, ErrNotFound
	}
	return &attestation, nil
}

func (f *fakeStore) CountActiveAttestationKey(_ context.Context, subject, attestationType, issuer string) (int64, error) {
	key := keyOf(subject, attestationType, issuer)
	var count int64
	for _, existing := range f.attestations {
		if existing.RevokedAt == "" && keyOf(existing.SubjectGaiaID, existing.Type, existing.IssuerGaiaID) == key {
			count++
		}
	}
	return count, nil
}

func (f *fakeStore) RevokeAttestation(_ context.Context, id, revokedAt, reason string) (bool, error) {
	attestation, ok := f.attestations[id]
	if !ok || attestation.RevokedAt != "" {
		return false, nil
	}
	attestation.RevokedAt = revokedAt
	attestation.RevokedReason = reason
	f.attestations[id] = attestation
	return true, nil
}

func (f *fakeStore) ListAttestationsBySubject(_ context.Context, subject string, limit int) ([]models.IdentityAttestation, error) {
	result := make([]models.IdentityAttestation, 0)
	for _, attestation := range f.attestations {
		if attestation.SubjectGaiaID == subject {
			result = append(result, attestation)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].IssuedAt > result[j].IssuedAt })
	if len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (f *fakeStore) ListAttestationsForOperator(_ context.Context, activeOnly bool, limit, offset int) ([]models.IdentityAttestation, error) {
	result := make([]models.IdentityAttestation, 0)
	now := time.Now().UTC()
	for _, attestation := range f.attestations {
		if activeOnly {
			expires, _ := time.Parse(time.RFC3339, attestation.ExpiresAt)
			if attestation.RevokedAt != "" || !now.Before(expires) {
				continue
			}
		}
		result = append(result, attestation)
	}
	if offset < len(result) {
		result = result[offset:]
	} else {
		result = nil
	}
	if len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (f *fakeStore) CountActiveAttestations(_ context.Context, _ string) (int64, error) {
	var count int64
	for _, attestation := range f.attestations {
		if attestation.RevokedAt == "" {
			count++
		}
	}
	return count, nil
}

func (f *fakeStore) OperatorStats(_ context.Context, _, _ string) (*models.OperatorStats, error) {
	stats := f.stats
	return &stats, nil
}

func (f *fakeStore) ListOperatorDirectory(_ context.Context, _ string, limit, offset int) ([]models.OperatorDirectoryEntry, int64, error) {
	total := int64(len(f.directory))
	if offset >= len(f.directory) {
		return nil, total, nil
	}
	end := offset + limit
	if end > len(f.directory) {
		end = len(f.directory)
	}
	return f.directory[offset:end], total, nil
}

func (f *fakeStore) RecordIdentityDirectoryAccess(_ context.Context, access *models.NodeIdentityAccessLog) error {
	f.accessLog = append(f.accessLog, *access)
	return nil
}

func (f *fakeStore) ListIdentityAccessLog(_ context.Context, limit int) ([]models.NodeIdentityAccessLog, error) {
	result := append([]models.NodeIdentityAccessLog(nil), f.accessLog...)
	sort.Slice(result, func(i, j int) bool { return result[i].CreatedAt > result[j].CreatedAt })
	if len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (f *fakeStore) FindIdentityByGaiaID(gaiaID string) (*models.Identity, error) {
	identity, ok := f.identities[gaiaID]
	if !ok {
		return nil, errors.New("identity not found")
	}
	return &identity, nil
}

func (f *fakeStore) FindIdentitiesByUserID(userID uuid.UUID) ([]models.Identity, error) {
	return f.userIdent[userID], nil
}

func keyOf(subject, attestationType, issuer string) string {
	return subject + "\x00" + attestationType + "\x00" + issuer
}

type fakeRoles map[string]bool

func (r fakeRoles) HasRole(_ context.Context, gaiaID, role string) (bool, error) {
	return r[gaiaID] && role == "node_operator", nil
}

type testEnv struct {
	store   *fakeStore
	service *Service
	actor   string
	subject string
	userID  uuid.UUID
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	_, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate ed25519 key: %v", err)
	}
	store := newFakeStore()
	actor := "@operator:gaiacom.local"
	subject := "@alice:gaiacom.local"
	userID := uuid.New()
	store.identities[subject] = models.Identity{ID: uuid.New(), GaiaID: subject, DisplayName: "Alice", IsActive: true}
	store.userIdent[userID] = []models.Identity{{ID: uuid.New(), GaiaID: actor, DisplayName: "Operator"}}
	service, err := NewService(store, fakeRoles{actor: true}, "gaiacom.local", privateKey)
	if err != nil {
		t.Fatalf("new attestation service: %v", err)
	}
	service.now = func() time.Time { return time.Date(2026, 11, 11, 12, 0, 0, 0, time.UTC) }
	return &testEnv{store: store, service: service, actor: actor, subject: subject, userID: userID}
}

func validInput(subject string) CreateAttestationInput {
	return CreateAttestationInput{
		Subject:       subject,
		Type:          "human",
		Authority:     "node",
		EvidenceRef:   "evidence-ref-1",
		ExpiresInDays: 30,
	}
}

func TestCreateAttestationSignsCanonicalPayload(t *testing.T) {
	env := newTestEnv(t)
	attestation, err := env.service.CreateAttestation(context.Background(), env.actor, validInput(env.subject))
	if err != nil {
		t.Fatalf("CreateAttestation: %v", err)
	}
	if attestation.Algorithm != algorithmEd25519 {
		t.Fatalf("unexpected algorithm %q", attestation.Algorithm)
	}
	publicKeyBytes, err := hex.DecodeString(attestation.SigningPublicKeyHex)
	if err != nil || len(publicKeyBytes) != ed25519.PublicKeySize {
		t.Fatalf("invalid signing public key hex: %v", err)
	}
	signature, err := hex.DecodeString(attestation.SignatureHex)
	if err != nil || len(signature) != ed25519.SignatureSize {
		t.Fatalf("invalid signature hex: %v", err)
	}
	if !ed25519.Verify(ed25519.PublicKey(publicKeyBytes), []byte(attestation.Canonical), signature) {
		t.Fatal("attestation signature does not verify against the returned public key")
	}
	var payload canonicalPayload
	if err := json.Unmarshal([]byte(attestation.Canonical), &payload); err != nil {
		t.Fatalf("canonical payload is not valid JSON: %v", err)
	}
	if payload.Version != canonicalVersion || payload.Subject != env.subject || payload.Issuer != env.actor ||
		payload.Type != "human" || payload.Authority != "node" || payload.EvidenceRef != "evidence-ref-1" {
		t.Fatalf("unexpected canonical payload: %+v", payload)
	}
	if attestation.SubjectIdentityID == "" {
		t.Fatal("expected the local subject identity ID to be recorded")
	}
}

func TestAttestationStatusExpiredAndRevoked(t *testing.T) {
	env := newTestEnv(t)
	expired := models.IdentityAttestation{
		ID: "expired-1", SubjectGaiaID: env.subject, Type: "organization", IssuerGaiaID: env.actor,
		Authority: "node", EvidenceRef: "evidence-expired",
		IssuedAt: "2026-10-01T00:00:00Z", ExpiresAt: "2026-10-02T00:00:00Z",
		SignatureHex: "00", SigningPublicKeyHex: "00", Algorithm: algorithmEd25519,
	}
	env.store.attestations[expired.ID] = expired

	views, err := env.service.ListSubjectAttestations(context.Background(), env.subject)
	if err != nil {
		t.Fatalf("ListSubjectAttestations: %v", err)
	}
	if len(views) != 1 || views[0].Status != "expired" {
		t.Fatalf("expected one expired attestation, got %+v", views)
	}

	attestation, err := env.service.CreateAttestation(context.Background(), env.actor, validInput(env.subject))
	if err != nil {
		t.Fatalf("CreateAttestation: %v", err)
	}
	if err := env.service.RevokeAttestation(context.Background(), env.actor, attestation.ID, "policy violation"); err != nil {
		t.Fatalf("RevokeAttestation: %v", err)
	}
	views, err = env.service.ListSubjectAttestations(context.Background(), env.subject)
	if err != nil {
		t.Fatalf("ListSubjectAttestations after revoke: %v", err)
	}
	var revokedSeen bool
	for _, view := range views {
		if view.ID == attestation.ID && view.Status == "revoked" {
			revokedSeen = true
		}
	}
	if !revokedSeen {
		t.Fatalf("expected revoked status, got %+v", views)
	}
	if err := env.service.RevokeAttestation(context.Background(), env.actor, attestation.ID, "again"); !errors.Is(err, ErrAlreadyRevoked) {
		t.Fatalf("expected ErrAlreadyRevoked, got %v", err)
	}
}

func TestCreateAttestationRejectsNonOperatorAndDuplicates(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.service.CreateAttestation(context.Background(), "@mallory:evil.example", validInput(env.subject)); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for non-operator, got %v", err)
	}
	if _, err := env.service.CreateAttestation(context.Background(), env.actor, validInput(env.subject)); err != nil {
		t.Fatalf("first create failed: %v", err)
	}
	if _, err := env.service.CreateAttestation(context.Background(), env.actor, validInput(env.subject)); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("expected ErrDuplicate for active duplicate, got %v", err)
	}
}

func TestCreateAttestationValidation(t *testing.T) {
	env := newTestEnv(t)
	cases := map[string]CreateAttestationInput{
		"unknown subject":     {Subject: "@missing:gaiacom.local", Type: "human", Authority: "node", EvidenceRef: "abcd", ExpiresInDays: 1},
		"invalid type":        {Subject: env.subject, Type: "wizard", Authority: "node", EvidenceRef: "abcd", ExpiresInDays: 1},
		"authority mismatch":  {Subject: env.subject, Type: "human", Authority: "governance", EvidenceRef: "abcd", ExpiresInDays: 1},
		"evidence too short":  {Subject: env.subject, Type: "human", Authority: "node", EvidenceRef: "abc", ExpiresInDays: 1},
		"expiry out of range": {Subject: env.subject, Type: "human", Authority: "node", EvidenceRef: "abcd", ExpiresInDays: 0},
		"expiry too long":     {Subject: env.subject, Type: "human", Authority: "node", EvidenceRef: "abcd", ExpiresInDays: 3651},
	}
	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := env.service.CreateAttestation(context.Background(), env.actor, input)
			if err == nil {
				t.Fatalf("expected validation error, got nil")
			}
			if errors.Is(err, ErrForbidden) || errors.Is(err, ErrDuplicate) {
				t.Fatalf("expected validation/not-found error, got %v", err)
			}
		})
	}
	if _, err := env.service.CreateAttestation(context.Background(), env.actor,
		CreateAttestationInput{Subject: env.subject, Type: "human", Authority: "node", EvidenceRef: "abcd", ExpiresInDays: 1}); err != nil {
		t.Fatalf("valid minimal create failed: %v", err)
	}
}

func TestDirectoryWritesAccessLogAndValidatesReason(t *testing.T) {
	env := newTestEnv(t)
	env.store.directory = []models.OperatorDirectoryEntry{
		{GaiaID: "@alice:gaiacom.local", DisplayName: "Alice", CreatedAt: "2026-01-01T00:00:00Z", Status: "active"},
	}
	entries, next, total, err := env.service.Directory(context.Background(), env.actor,
		"abuse investigation request-42", "", 20, "")
	if err != nil {
		t.Fatalf("Directory: %v", err)
	}
	if len(entries) != 1 || total != 1 || next != "" {
		t.Fatalf("unexpected directory result: entries=%d total=%d next=%q", len(entries), total, next)
	}
	if len(env.store.accessLog) != 1 || env.store.accessLog[0].OperatorGaiaID != env.actor || env.store.accessLog[0].ResultCount != 1 {
		t.Fatalf("expected one access-log row, got %+v", env.store.accessLog)
	}
	if _, _, _, err := env.service.Directory(context.Background(), env.actor, "too short", "", 20, ""); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for short reason, got %v", err)
	}
	if _, err := env.service.AccessLog(context.Background()); err != nil {
		t.Fatalf("AccessLog: %v", err)
	}
}

func TestOperatorActorResolvesOnlyOperators(t *testing.T) {
	env := newTestEnv(t)
	actor, ok := env.service.OperatorActor(context.Background(), env.userID)
	if !ok || actor != env.actor {
		t.Fatalf("expected operator actor %q, got %q ok=%v", env.actor, actor, ok)
	}
	otherUser := uuid.New()
	env.store.userIdent[otherUser] = []models.Identity{{ID: uuid.New(), GaiaID: "@bob:gaiacom.local"}}
	if _, ok := env.service.OperatorActor(context.Background(), otherUser); ok {
		t.Fatal("non-operator identity must not be accepted as operator actor")
	}
}
