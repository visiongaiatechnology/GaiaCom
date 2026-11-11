package repository

import (
	"context"
	"testing"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

// SEC-FIX-C / FIND-009: store-level party checks used to bind read-receipt
// sources. Written, not executed (no build/test runs are permitted here).
func TestMessageMetadataBindingQueries(t *testing.T) {
	t.Setenv("DB_PATH", "")
	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer db.Close()
	store := NewSQLStore(db)
	ctx := context.Background()

	create := func(name string) (*models.User, *models.Identity) {
		user := &models.User{ID: uuid.New(), Username: name, PasswordHash: "hash", PublicKey: "pk"}
		if err := store.CreateUser(user); err != nil {
			t.Fatalf("create user %s: %v", name, err)
		}
		identity := &models.Identity{
			ID:           uuid.New(),
			UserID:       user.ID,
			GaiaID:       "@" + name + ":gaiacom.local",
			DisplayName:  name,
			PublicRecord: models.JSONB(`{}`),
			IsActive:     true,
		}
		if err := store.CreateIdentity(identity); err != nil {
			t.Fatalf("create identity %s: %v", name, err)
		}
		return user, identity
	}

	_, aliceIdent := create("bind-alice")
	_, bobIdent := create("bind-bob")

	envelope := &models.MessageEnvelope{
		ID:               uuid.New(),
		Type:             "gaia.encrypted.v1",
		Sender:           aliceIdent.GaiaID,
		Recipient:        bobIdent.GaiaID,
		Payload:          models.JSONB(`{"text":"hello"}`),
		SenderIdentityID: aliceIdent.ID,
	}
	if err := store.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{bobIdent.ID}); err != nil {
		t.Fatalf("save envelope: %v", err)
	}

	deliveredToBob, err := store.MessageDeliveredToIdentity(ctx, envelope.ID, bobIdent.ID)
	if err != nil {
		t.Fatalf("delivered lookup (recipient): %v", err)
	}
	if !deliveredToBob {
		t.Fatal("recipient must be reported as delivered")
	}
	deliveredToAlice, err := store.MessageDeliveredToIdentity(ctx, envelope.ID, aliceIdent.ID)
	if err != nil {
		t.Fatalf("delivered lookup (sender): %v", err)
	}
	if deliveredToAlice {
		t.Fatal("sender has no inbox row for its own sent message")
	}

	authoredByAlice, err := store.MessageAuthoredByIdentity(ctx, envelope.ID, aliceIdent.ID)
	if err != nil {
		t.Fatalf("authored lookup (sender): %v", err)
	}
	if !authoredByAlice {
		t.Fatal("sender must be reported as author")
	}
	authoredByBob, err := store.MessageAuthoredByIdentity(ctx, envelope.ID, bobIdent.ID)
	if err != nil {
		t.Fatalf("authored lookup (recipient): %v", err)
	}
	if authoredByBob {
		t.Fatal("recipient must not be reported as author")
	}

	unknown := uuid.New()
	deliveredUnknown, err := store.MessageDeliveredToIdentity(ctx, unknown, bobIdent.ID)
	if err != nil {
		t.Fatalf("delivered lookup (unknown): %v", err)
	}
	authoredUnknown, err := store.MessageAuthoredByIdentity(ctx, unknown, aliceIdent.ID)
	if err != nil {
		t.Fatalf("authored lookup (unknown): %v", err)
	}
	if deliveredUnknown || authoredUnknown {
		t.Fatal("unknown message must not be attributed to any identity")
	}
}
