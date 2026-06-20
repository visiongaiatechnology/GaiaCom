package smtpbridge

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func newSMTPBridgeTestService(t *testing.T) (*Service, *repository.SQLStore, models.User, models.Identity) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	t.Setenv("GAIACOM_SMTP_INGEST_TOKEN", "ingest-secret")

	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	t.Cleanup(func() {
		_ = db.Close()
	})

	store := repository.NewSQLStore(db)
	user := models.User{
		ID:           uuid.New(),
		Username:     "smtp-user",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(&user); err != nil {
		t.Fatalf("create user: %v", err)
	}

	identity := models.Identity{
		ID:           uuid.New(),
		UserID:       user.ID,
		GaiaID:       "@smtp-user:gaiacom.local",
		DisplayName:  "SMTP User",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"abc"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&identity); err != nil {
		t.Fatalf("create identity: %v", err)
	}

	return NewService(store, store), store, user, identity
}

func TestValidateLegacyEnvelopeBlocksScriptLikeAttachments(t *testing.T) {
	cases := []Attachment{
		{Name: "payload.js", MimeType: "text/plain", Size: 12},
		{Name: "diagram.txt", MimeType: "application/javascript", Size: 12},
		{Name: "proof.svg", MimeType: "image/svg+xml", Size: 12},
		{Name: `nested\proof.txt`, MimeType: "text/plain", Size: 12},
	}

	for _, tc := range cases {
		err := validateLegacyEnvelope("external@example.net", "Subject", "Body", []Attachment{tc})
		if !errors.Is(err, errSMTPRejected) {
			t.Fatalf("attachment %q was not rejected: %v", tc.Name, err)
		}
	}
}

func TestIngestLegacyMailRequiresBridgeToken(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestService(t)

	err := service.IngestLegacyMail(
		context.Background(),
		"wrong-secret",
		identity.GaiaID,
		"source@example.net",
		"External notice",
		"Plain text body",
		nil,
	)
	if !errors.Is(err, errSMTPRejected) {
		t.Fatalf("expected token rejection, got %v", err)
	}
}

func TestIngestLegacyMailPersistsUntrustedSMTPEnvelope(t *testing.T) {
	service, store, _, identity := newSMTPBridgeTestService(t)
	ctx := context.Background()

	err := service.IngestLegacyMail(
		ctx,
		"ingest-secret",
		identity.GaiaID,
		"source@example.net",
		"External notice",
		"Plain text body",
		[]Attachment{{Name: "note.txt", MimeType: "text/plain", Size: 42}},
	)
	if err != nil {
		t.Fatalf("ingest legacy mail: %v", err)
	}

	inbox, err := store.FindInboxEntriesByIdentity(ctx, identity.ID)
	if err != nil {
		t.Fatalf("find inbox: %v", err)
	}
	if len(inbox) != 1 {
		t.Fatalf("inbox count got %d, want 1", len(inbox))
	}
	if !inbox[0].Untrusted {
		t.Fatalf("smtp legacy inbox entry must be untrusted")
	}

	envelopes, err := store.FindMessageEnvelopesByIDs(ctx, []uuid.UUID{inbox[0].MessageID})
	if err != nil {
		t.Fatalf("find envelope: %v", err)
	}
	if len(envelopes) != 1 {
		t.Fatalf("envelope count got %d, want 1", len(envelopes))
	}
	if envelopes[0].Type != "smtp.legacy" {
		t.Fatalf("envelope type got %q, want smtp.legacy", envelopes[0].Type)
	}
	if envelopes[0].Sender != "source@example.net" || envelopes[0].Recipient != identity.GaiaID {
		t.Fatalf("unexpected smtp routing fields: %s -> %s", envelopes[0].Sender, envelopes[0].Recipient)
	}

	var payload struct {
		Type      string `json:"type"`
		Direction string `json:"direction"`
		Security  struct {
			Untrusted         bool `json:"untrusted"`
			EndToEndEncrypted bool `json:"endToEndEncrypted"`
		} `json:"security"`
	}
	if err := json.Unmarshal(envelopes[0].Payload, &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Type != "smtp.legacy" || payload.Direction != "inbound" {
		t.Fatalf("unexpected payload metadata: %+v", payload)
	}
	if !payload.Security.Untrusted || payload.Security.EndToEndEncrypted {
		t.Fatalf("unexpected payload security flags: %+v", payload.Security)
	}
}

func TestSendLegacyMailRejectsForeignIdentityBeforeSMTPDial(t *testing.T) {
	service, store, user, _ := newSMTPBridgeTestService(t)
	otherUser := models.User{
		ID:           uuid.New(),
		Username:     "smtp-other",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(&otherUser); err != nil {
		t.Fatalf("create other user: %v", err)
	}
	foreignIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       otherUser.ID,
		GaiaID:       "@smtp-other:gaiacom.local",
		DisplayName:  "Foreign",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"def"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&foreignIdentity); err != nil {
		t.Fatalf("create foreign identity: %v", err)
	}

	err := service.SendLegacyMail(
		context.Background(),
		user.ID,
		foreignIdentity.ID,
		"external@example.net",
		"Subject",
		"Body",
		nil,
	)
	if !errors.Is(err, errSMTPRejected) {
		t.Fatalf("expected foreign identity rejection before SMTP dial, got %v", err)
	}
}
