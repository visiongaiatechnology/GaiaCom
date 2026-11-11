package messaging

import (
	"context"
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

// SEC-FIX-C / FIND-009 regression tests (written, not executed: the owner
// directive forbids building/running Go tests in this environment).

func createMetadataTestIdentity(t *testing.T, store *repository.SQLStore, name string) (*models.User, *models.Identity) {
	t.Helper()
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

// A forged client-supplied recipient_gaia must never reach the stored envelope
// or the GaiaProof row; the server-derived recipient stays authoritative.
func TestSendIgnoresForgedRecipientGaia(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()
	svc := NewMessagingService(store, store)
	ctx := context.Background()

	aliceUser, aliceIdent := createMetadataTestIdentity(t, store, "meta-alice")
	bobUser, bobIdent := createMetadataTestIdentity(t, store, "meta-bob")
	_, victimIdent := createMetadataTestIdentity(t, store, "meta-victim")

	// The victim is NOT in recipientIDs, but the client claims it in the envelope.
	forgedPayload := []byte(`{"text":"hello","recipient_gaia":"` + victimIdent.GaiaID + `"}`)
	messageID, err := svc.SaveAndDistributeMessage(ctx, aliceUser.ID, aliceIdent.ID, forgedPayload, []uuid.UUID{bobIdent.ID})
	if err != nil {
		t.Fatalf("send with forged recipient_gaia must be accepted for the real recipient: %v", err)
	}

	inbox, err := svc.GetInboxForUser(ctx, bobUser.ID, bobIdent.ID)
	if err != nil {
		t.Fatalf("recipient inbox: %v", err)
	}
	if len(inbox) != 1 {
		t.Fatalf("expected 1 stored message, got %d", len(inbox))
	}
	if inbox[0].ID != messageID {
		t.Fatalf("stored message id mismatch")
	}
	if inbox[0].Recipient != bobIdent.GaiaID {
		t.Fatalf("stored recipient must be server-derived %q, got %q", bobIdent.GaiaID, inbox[0].Recipient)
	}
	if inbox[0].Recipient == victimIdent.GaiaID {
		t.Fatal("forged recipient_gaia overrode the stored recipient")
	}

	proof, err := svc.GetMessageProofForUser(ctx, bobUser.ID, messageID)
	if err != nil {
		t.Fatalf("message proof: %v", err)
	}
	if proof.Recipient != bobIdent.GaiaID {
		t.Fatalf("proof recipient must be server-derived %q, got %q", bobIdent.GaiaID, proof.Recipient)
	}
}

// A read-receipt source that does not belong to the sender identity must fail
// closed and must not create any stored message.
func TestSendRejectsForeignReadReceiptSource(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()
	svc := NewMessagingService(store, store)
	ctx := context.Background()

	aliceUser, aliceIdent := createMetadataTestIdentity(t, store, "meta-alice-2")
	_, bobIdent := createMetadataTestIdentity(t, store, "meta-bob-2")
	carolUser, carolIdent := createMetadataTestIdentity(t, store, "meta-carol")

	// Carol's message is delivered to Bob only; Alice is not a party to it.
	foreignMessageID, err := svc.SaveAndDistributeMessage(ctx, carolUser.ID, carolIdent.ID, []byte(`{"text":"carol"}`), []uuid.UUID{bobIdent.ID})
	if err != nil {
		t.Fatalf("seed foreign message: %v", err)
	}

	forgedPayload := []byte(`{"read_receipt_source_id":"` + foreignMessageID.String() + `"}`)
	if _, err := svc.SaveAndDistributeMessage(ctx, aliceUser.ID, aliceIdent.ID, forgedPayload, []uuid.UUID{bobIdent.ID}); err == nil {
		t.Fatal("foreign read receipt source was accepted")
	}
}

// A malformed read-receipt source must be rejected explicitly.
func TestSendRejectsMalformedReadReceiptSource(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()
	svc := NewMessagingService(store, store)
	ctx := context.Background()

	aliceUser, aliceIdent := createMetadataTestIdentity(t, store, "meta-alice-3")
	_, bobIdent := createMetadataTestIdentity(t, store, "meta-bob-3")

	malformed := []byte(`{"read_receipt_source_id":"not-a-uuid"}`)
	if _, err := svc.SaveAndDistributeMessage(ctx, aliceUser.ID, aliceIdent.ID, malformed, []uuid.UUID{bobIdent.ID}); err == nil {
		t.Fatal("malformed read receipt source was accepted")
	}
}

// The legitimate direct-chat edit self-copy binds its receipt to a message the
// sender authored; that path must keep working and persist the source id.
func TestSendAcceptsOwnReadReceiptSource(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()
	svc := NewMessagingService(store, store)
	ctx := context.Background()

	aliceUser, aliceIdent := createMetadataTestIdentity(t, store, "meta-alice-4")
	_, bobIdent := createMetadataTestIdentity(t, store, "meta-bob-4")

	originalID, err := svc.SaveAndDistributeMessage(ctx, aliceUser.ID, aliceIdent.ID, []byte(`{"text":"original"}`), []uuid.UUID{bobIdent.ID})
	if err != nil {
		t.Fatalf("seed original message: %v", err)
	}

	selfCopyPayload := []byte(`{"read_receipt_source_id":"` + originalID.String() + `"}`)
	selfCopyID, err := svc.SaveAndDistributeMessage(ctx, aliceUser.ID, aliceIdent.ID, selfCopyPayload, []uuid.UUID{aliceIdent.ID})
	if err != nil {
		t.Fatalf("own read receipt source must be accepted: %v", err)
	}

	inbox, err := svc.GetInboxForUser(ctx, aliceUser.ID, aliceIdent.ID)
	if err != nil {
		t.Fatalf("sender inbox: %v", err)
	}
	var selfCopy *models.MessageEnvelope
	for _, envelope := range inbox {
		if envelope.ID == selfCopyID {
			selfCopy = envelope
			break
		}
	}
	if selfCopy == nil {
		t.Fatalf("self copy %s not found in sender inbox", selfCopyID)
	}
	if selfCopy.ReadReceiptSourceID != originalID {
		t.Fatalf("read receipt source must be the authored message %q, got %q", originalID, selfCopy.ReadReceiptSourceID)
	}
}
