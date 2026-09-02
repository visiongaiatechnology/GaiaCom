package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

func TestGaiasEyesGrantIsSingleUse(t *testing.T) {
	t.Setenv("DB_PATH", "")

	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()
	now := time.Now().UTC()
	grant := &models.GaiasEyesGrant{
		ID:            "eyes_test",
		TokenHash:     "sha256:test-token",
		OwnerIdentity: "@alice:gaiacom.local",
		CaseID:        "case_test",
		Scope:         "case",
		PackageHash:   "sha256:package",
		PackageData:   models.JSONB(`{"type":"GaiaProofDisclosure","version":"v1"}`),
		Signature:     "sig",
		Status:        "active",
		ExpiresAt:     now.Add(time.Hour),
		CreatedAt:     now,
	}

	if err := store.CreateGaiasEyesGrant(ctx, grant); err != nil {
		t.Fatalf("create grant: %v", err)
	}
	loaded, err := store.GetGaiasEyesGrantByTokenHash(ctx, grant.TokenHash)
	if err != nil {
		t.Fatalf("load grant: %v", err)
	}
	if loaded == nil || loaded.PackageHash != grant.PackageHash || string(loaded.PackageData) == "" {
		t.Fatalf("loaded grant mismatch: %+v", loaded)
	}
	if err := store.MarkGaiasEyesGrantUsed(ctx, grant.ID, now.Add(time.Minute)); err != nil {
		t.Fatalf("first consume failed: %v", err)
	}
	if err := store.MarkGaiasEyesGrantUsed(ctx, grant.ID, now.Add(2*time.Minute)); err != sql.ErrNoRows {
		t.Fatalf("second consume err = %v, want sql.ErrNoRows", err)
	}
}
