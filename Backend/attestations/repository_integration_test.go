package attestations

import (
	"context"
	"crypto/ed25519"
	"errors"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

// TestSQLStoreAttestationRoundTrip verifies the v5 migration and the real SQLite
// store implementation (attestations, revocation, stats, directory, access log).
func TestSQLStoreAttestationRoundTrip(t *testing.T) {
	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect in-memory database: %v", err)
	}
	defer db.Close()
	store := repository.NewSQLStore(db)
	ctx := context.Background()

	createIdentity := func(username, gaiaID string) {
		user := &models.User{ID: uuid.New(), Username: username, PasswordHash: "hash", PublicKey: "pk"}
		if err := store.CreateUser(user); err != nil {
			t.Fatalf("create user %s: %v", username, err)
		}
		identity := &models.Identity{
			ID:           uuid.New(),
			UserID:       user.ID,
			GaiaID:       gaiaID,
			DisplayName:  username,
			Keys:         models.JSONB(`{}`),
			PublicRecord: models.JSONB(`{}`),
			IsActive:     true,
		}
		if err := store.CreateIdentity(identity); err != nil {
			t.Fatalf("create identity %s: %v", gaiaID, err)
		}
	}
	createIdentity("operator", "@operator:gaiacom.local")
	createIdentity("alice", "@alice:gaiacom.local")

	_, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	service, err := NewService(store, fakeRoles{"@operator:gaiacom.local": true}, "gaiacom.local", privateKey)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}
	service.now = func() time.Time { return time.Date(2026, 11, 11, 12, 0, 0, 0, time.UTC) }

	created, err := service.CreateAttestation(ctx, "@operator:gaiacom.local", CreateAttestationInput{
		Subject:       "@alice:gaiacom.local",
		Type:          "human",
		Authority:     "node",
		EvidenceRef:   "test-evidence",
		ExpiresInDays: 30,
	})
	if err != nil {
		t.Fatalf("CreateAttestation: %v", err)
	}
	if created.SubjectIdentityID == "" {
		t.Fatal("expected subject identity id from the real identity store")
	}
	if _, err := service.CreateAttestation(ctx, "@operator:gaiacom.local", CreateAttestationInput{
		Subject:       "@alice:gaiacom.local",
		Type:          "human",
		Authority:     "node",
		EvidenceRef:   "test-evidence",
		ExpiresInDays: 30,
	}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("expected ErrDuplicate from the real unique constraint/precheck, got %v", err)
	}

	views, err := service.ListSubjectAttestations(ctx, "@alice:gaiacom.local")
	if err != nil || len(views) != 1 || views[0].Status != "valid" {
		t.Fatalf("expected one valid attestation, got views=%+v err=%v", views, err)
	}
	if err := service.RevokeAttestation(ctx, "@operator:gaiacom.local", created.ID, "test revocation"); err != nil {
		t.Fatalf("RevokeAttestation: %v", err)
	}
	views, err = service.ListSubjectAttestations(ctx, "@alice:gaiacom.local")
	if err != nil || len(views) != 1 || views[0].Status != "revoked" {
		t.Fatalf("expected revoked status, got views=%+v err=%v", views, err)
	}

	stats, err := service.OperatorStats(ctx, "@operator:gaiacom.local")
	if err != nil {
		t.Fatalf("OperatorStats: %v", err)
	}
	if stats.Accounts < 2 || stats.Identities < 2 {
		t.Fatalf("expected real account/identity counts, got %+v", stats)
	}

	entries, next, total, err := service.Directory(ctx, "@operator:gaiacom.local",
		"investigation for integration test", "", 10, "")
	if err != nil {
		t.Fatalf("Directory: %v", err)
	}
	if len(entries) < 2 || total < 2 || next != "" {
		t.Fatalf("unexpected directory result: entries=%d total=%d next=%q", len(entries), total, next)
	}
	events, err := service.AccessLog(ctx)
	if err != nil || len(events) != 1 {
		t.Fatalf("expected one access-log row, got events=%+v err=%v", events, err)
	}
	if events[0].OperatorGaiaID != "@operator:gaiacom.local" || events[0].ResultCount != len(entries) {
		t.Fatalf("unexpected access-log row: %+v", events[0])
	}
}
