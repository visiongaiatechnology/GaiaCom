package smtpbridge

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func newSMTPBridgeTestService(t *testing.T) (*Service, *repository.SQLStore, models.User, models.Identity) {
	t.Helper()
	return newSMTPBridgeTestServiceWithToken(t, "ingest-secret")
}

func newSMTPBridgeTestServiceWithToken(t *testing.T, ingestToken string) (*Service, *repository.SQLStore, models.User, models.Identity) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	t.Setenv("GAIACOM_SMTP_INGEST_TOKEN", ingestToken)

	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
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

func TestSMTPTransportRequiresAuthenticatedTLS(t *testing.T) {
	base := Service{
		host: "smtp.example", port: 587, username: "relay-user", password: "relay-secret",
		from: "GaiaCOM <noreply@example.com>", tlsMode: "starttls", timeout: 30 * time.Second,
	}
	from, to, err := base.validateSMTPTransport("Recipient <user@example.net>")
	if err != nil {
		t.Fatalf("valid authenticated STARTTLS configuration rejected: %v", err)
	}
	if from.Address != "noreply@example.com" || to.Address != "user@example.net" {
		t.Fatalf("unexpected parsed envelope addresses: from=%s to=%s", from.Address, to.Address)
	}

	invalidTLS := base
	invalidTLS.tlsMode = "plain"
	if _, _, err := invalidTLS.validateSMTPTransport("user@example.net"); !errors.Is(err, errSMTPRejected) {
		t.Fatalf("plaintext SMTP mode accepted: %v", err)
	}

	missingCredentials := base
	missingCredentials.password = ""
	if _, _, err := missingCredentials.validateSMTPTransport("user@example.net"); !errors.Is(err, errSMTPNotConfigured) {
		t.Fatalf("unauthenticated SMTP relay accepted: %v", err)
	}

	maliciousHost := base
	maliciousHost.host = "smtp.example\r\nRCPT TO: victim@example.net"
	if _, _, err := maliciousHost.validateSMTPTransport("user@example.net"); !errors.Is(err, errSMTPRejected) {
		t.Fatalf("SMTP host injection accepted: %v", err)
	}
}

// --- SEC-FIX Group F (FIND-006 / P-06): ingest hardening tests ----------------

func TestIngestLegacyMailFailsClosedWhenTokenUnset(t *testing.T) {
	service, store, _, identity := newSMTPBridgeTestServiceWithToken(t, "")

	err := service.IngestLegacyMail(context.Background(), "anything", identity.GaiaID, "source@example.net", "Subject", "Body", nil)
	if !errors.Is(err, errSMTPRejected) || !errors.Is(err, errSMTPUnauthorized) {
		t.Fatalf("unset token must fail closed as unauthorized, got %v", err)
	}
	inbox, err := store.FindInboxEntriesByIdentity(context.Background(), identity.ID)
	if err != nil {
		t.Fatalf("find inbox: %v", err)
	}
	if len(inbox) != 0 {
		t.Fatalf("unconfigured bridge stored %d inbox entries, want 0", len(inbox))
	}
}

func TestIngestLegacyMailRejectsTemplatePlaceholderToken(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestServiceWithToken(t, smtpIngestTokenPlaceholder)

	err := service.IngestLegacyMail(context.Background(), smtpIngestTokenPlaceholder, identity.GaiaID, "source@example.net", "Subject", "Body", nil)
	if !errors.Is(err, errSMTPUnauthorized) {
		t.Fatalf("shipped placeholder token must be treated as unconfigured, got %v", err)
	}
}

func TestIngestLegacyMailAcceptsRotatedTokenList(t *testing.T) {
	service, store, _, identity := newSMTPBridgeTestServiceWithToken(t, "old-secret,new-secret")
	ctx := context.Background()

	if err := service.IngestLegacyMail(ctx, "old-secret", identity.GaiaID, "source@example.net", "Subject", "Body", nil); err != nil {
		t.Fatalf("previous rotation token rejected: %v", err)
	}
	if err := service.IngestLegacyMail(ctx, "new-secret", identity.GaiaID, "source@example.net", "Subject", "Body", nil); err != nil {
		t.Fatalf("current rotation token rejected: %v", err)
	}
	if err := service.IngestLegacyMail(ctx, "other-secret", identity.GaiaID, "source@example.net", "Subject", "Body", nil); !errors.Is(err, errSMTPUnauthorized) {
		t.Fatalf("token outside the rotation list accepted: %v", err)
	}

	inbox, err := store.FindInboxEntriesByIdentity(ctx, identity.ID)
	if err != nil {
		t.Fatalf("find inbox: %v", err)
	}
	if len(inbox) != 2 {
		t.Fatalf("inbox count got %d, want 2", len(inbox))
	}
}

func TestIngestLegacyMailKeepsExternalFromAsUntrustedMetadata(t *testing.T) {
	service, store, _, identity := newSMTPBridgeTestService(t)
	ctx := context.Background()

	err := service.IngestLegacyMail(ctx, "ingest-secret", identity.GaiaID, `"Evil CEO" <Source@Example.NET>`, "Subject", "Body", nil)
	if err != nil {
		t.Fatalf("ingest legacy mail: %v", err)
	}

	inbox, err := store.FindInboxEntriesByIdentity(ctx, identity.ID)
	if err != nil || len(inbox) != 1 {
		t.Fatalf("find inbox: entries=%d err=%v", len(inbox), err)
	}
	envelopes, err := store.FindMessageEnvelopesByIDs(ctx, []uuid.UUID{inbox[0].MessageID})
	if err != nil || len(envelopes) != 1 {
		t.Fatalf("find envelope: count=%d err=%v", len(envelopes), err)
	}
	envelope := envelopes[0]
	if envelope.Untrusted != true {
		t.Fatalf("inbound smtp envelope must carry the server-derived untrusted marker")
	}
	if envelope.Sender != "source@example.net" {
		t.Fatalf("external sender got %q, want bare lowercased address without display name", envelope.Sender)
	}
	if envelope.Recipient != identity.GaiaID {
		t.Fatalf("recipient got %q, want server-derived identity GaiaID %q", envelope.Recipient, identity.GaiaID)
	}
	if envelope.SenderIdentityID != uuid.Nil {
		t.Fatalf("inbound smtp envelope must not be bound to a local sender identity")
	}

	var payload struct {
		ExternalFrom      string `json:"externalFrom"`
		ExternalUntrusted bool   `json:"externalUntrusted"`
		SenderIdentity    string `json:"senderIdentity"`
		Security          struct {
			ExternalSenderUntrusted bool `json:"externalSenderUntrusted"`
			SenderVerified          bool `json:"senderVerified"`
		} `json:"security"`
	}
	if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.ExternalFrom != "source@example.net" || !payload.ExternalUntrusted || payload.SenderIdentity != "" {
		t.Fatalf("external sender metadata not marked untrusted: %+v", payload)
	}
	if !payload.Security.ExternalSenderUntrusted || payload.Security.SenderVerified {
		t.Fatalf("security block must state the external sender is unverified: %+v", payload.Security)
	}
}

func TestIngestLegacyMailRejectsLocalIdentityImpersonation(t *testing.T) {
	service, store, _, identity := newSMTPBridgeTestService(t)

	// The stored identity is "@smtp-user:gaiacom.local"; an external From that
	// projects onto the same local GaiaID must never be accepted.
	err := service.IngestLegacyMail(context.Background(), "ingest-secret", identity.GaiaID, "smtp-user@gaiacom.local", "Subject", "Body", nil)
	if !errors.Is(err, errSMTPRejected) {
		t.Fatalf("local identity impersonation accepted: %v", err)
	}
	inbox, err := store.FindInboxEntriesByIdentity(context.Background(), identity.ID)
	if err != nil {
		t.Fatalf("find inbox: %v", err)
	}
	if len(inbox) != 0 {
		t.Fatalf("impersonation attempt stored %d inbox entries, want 0", len(inbox))
	}
}

func TestIngestLegacyMailRejectsOversizedExternalFrom(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestService(t)

	oversized := strings.Repeat("a", maxSMTPFromBytes) + "@example.net"
	err := service.IngestLegacyMail(context.Background(), "ingest-secret", identity.GaiaID, oversized, "Subject", "Body", nil)
	if !errors.Is(err, errSMTPRejected) {
		t.Fatalf("oversized externalFrom accepted: %v", err)
	}
}

func TestValidateLegacyEnvelopeRejectsOversizedAttachmentTotal(t *testing.T) {
	attachment := Attachment{Name: "payload.bin", MimeType: "application/octet-stream", Size: 20 * 1024 * 1024}
	err := validateLegacyEnvelope("external@example.net", "Subject", "Body", []Attachment{attachment, attachment})
	if !errors.Is(err, errSMTPRejected) {
		t.Fatalf("attachment total above the aggregate ceiling accepted: %v", err)
	}
}
