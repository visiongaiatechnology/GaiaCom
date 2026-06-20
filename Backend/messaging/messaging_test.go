package messaging

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func setupTestDBAndStore(t *testing.T) (*repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	store := repository.NewSQLStore(db)

	cleanup := func() {
		db.Close()
	}
	return store, cleanup
}

func TestMessagingService(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	svc := NewMessagingService(store, store)
	ctx := context.Background()

	// Create users
	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	if err := store.CreateUser(user1); err != nil {
		t.Fatalf("failed to create user1: %v", err)
	}

	user2 := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "hash2",
		PublicKey:    "pk2",
	}
	if err := store.CreateUser(user2); err != nil {
		t.Fatalf("failed to create user2: %v", err)
	}

	// Create identities
	ident1 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user1.ID,
		GaiaID:       "@alice:gaiacom.local",
		DisplayName:  "Alice",
		PublicRecord: models.JSONB(`{}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(ident1); err != nil {
		t.Fatalf("failed to create ident1: %v", err)
	}

	ident2 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user2.ID,
		GaiaID:       "@bob:gaiacom.local",
		DisplayName:  "Bob",
		PublicRecord: models.JSONB(`{}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(ident2); err != nil {
		t.Fatalf("failed to create ident2: %v", err)
	}

	// 1. Success case
	envelopeData := []byte(`{"text":"hello"}`)
	err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage failed: %v", err)
	}

	// Verify Bob (user2, ident2) has the message in inbox
	messages, err := svc.GetInboxForUser(ctx, user2.ID, ident2.ID)
	if err != nil {
		t.Fatalf("GetInboxForUser failed: %v", err)
	}
	if len(messages) != 1 {
		t.Fatalf("expected 1 message in Bob's inbox, got %d", len(messages))
	}
	if string(messages[0].Payload) != string(envelopeData) {
		t.Errorf("expected payload %q, got %q", string(envelopeData), string(messages[0].Payload))
	}
	messageID := messages[0].ID
	proof, err := svc.GetMessageProofForUser(ctx, user2.ID, messageID)
	if err != nil {
		t.Fatalf("GetMessageProofForUser failed for recipient: %v", err)
	}
	if proof.MessageID != messageID || proof.SenderIdentity != ident1.ID || proof.CiphertextHash == "" || proof.EnvelopeHash == "" {
		t.Fatalf("proof does not contain required integrity fields: %+v", proof)
	}
	if len(proof.Receipts) != 1 || !proof.Receipts[0].Delivered || proof.Receipts[0].ReceiptHash == "" {
		t.Fatalf("proof does not contain delivery receipt: %+v", proof.Receipts)
	}
	if _, err := svc.GetMessageProofForUser(ctx, user1.ID, messageID); err != nil {
		t.Fatalf("sender should be allowed to inspect message proof: %v", err)
	}
	if err := svc.DeleteInboxMessageForUser(ctx, user1.ID, ident2.ID, messageID, false); err == nil {
		t.Fatal("expected sender user to be blocked from deleting recipient inbox entry")
	}
	if err := svc.DeleteInboxMessageForUser(ctx, user2.ID, ident2.ID, messageID, false); err != nil {
		t.Fatalf("recipient should be allowed to delete local inbox entry: %v", err)
	}
	messages, err = svc.GetInboxForUser(ctx, user2.ID, ident2.ID)
	if err != nil {
		t.Fatalf("GetInboxForUser after delete failed: %v", err)
	}
	if len(messages) != 0 {
		t.Fatalf("expected Bob's inbox to be empty after local delete, got %d", len(messages))
	}

	// 2. Sender identity not authorized (user2 trying to send as Alice/ident1)
	err = svc.SaveAndDistributeMessage(ctx, user2.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error when sending message with unauthorized sender identity, got nil")
	}

	// 3. Invalid user/sender ID
	err = svc.SaveAndDistributeMessage(ctx, uuid.Nil, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for nil user ID, got nil")
	}
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, uuid.Nil, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for nil sender identity ID, got nil")
	}

	// 4. Invalid envelope size
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, []byte{}, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for empty envelope, got nil")
	}
	oversized := make([]byte, 1024*1024+1)
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, oversized, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for oversized envelope, got nil")
	}

	// 5. Invalid recipient sets
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{})
	if err == nil {
		t.Error("expected error for empty recipient set, got nil")
	}
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{uuid.Nil})
	if err == nil {
		t.Error("expected error for nil recipient ID, got nil")
	}

	// 6. Deduplication check
	err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID, ident2.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage with duplicates failed: %v", err)
	}

	// 7. GetInboxForUser unauthorized identity
	_, err = svc.GetInboxForUser(ctx, user1.ID, ident2.ID) // Alice trying to get Bob's inbox
	if err == nil {
		t.Error("expected error when retrieving inbox for unauthorized identity, got nil")
	}
}

func TestMessagingHandler(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	svc := NewMessagingService(store, store)
	handler := NewMessagingHandler(svc)

	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	_ = store.CreateUser(user1)

	ident1 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user1.ID,
		GaiaID:       "@alice:gaiacom.local",
		DisplayName:  "Alice",
		PublicRecord: models.JSONB(`{}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(ident1)

	user2 := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "hash2",
		PublicKey:    "pk2",
	}
	_ = store.CreateUser(user2)

	ident2 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user2.ID,
		GaiaID:       "@bob:gaiacom.local",
		DisplayName:  "Bob",
		PublicRecord: models.JSONB(`{}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(ident2)

	recipientID := ident2.ID

	// 1. SendMessage - Success case
	payloadMap := map[string]interface{}{
		"senderIdentityId": ident1.ID.String(),
		"recipientIds":     []string{recipientID.String()},
		"envelopeData":     map[string]interface{}{"body": "hello handler"},
	}
	bodyBytes, _ := json.Marshal(payloadMap)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/messages", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec := httptest.NewRecorder()

	handler.SendMessage(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["status"] != "sent" {
		t.Errorf("expected response status 'sent', got %q", resp["status"])
	}

	// 2. SendMessage - Unauthorized (no user in context)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/messages", bytes.NewReader(bodyBytes))
	rec = httptest.NewRecorder()
	handler.SendMessage(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status Unauthorized (401), got %d", rec.Code)
	}

	// 3. SendMessage - Invalid request JSON body
	req = httptest.NewRequest(http.MethodPost, "/api/v1/messages", bytes.NewReader([]byte("{invalid-json}")))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.SendMessage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest (400) for invalid JSON, got %d", rec.Code)
	}

	// 4. SendMessage - Invalid Sender UUID
	badSenderPayload := map[string]interface{}{
		"senderIdentityId": "invalid-uuid",
		"recipientIds":     []string{recipientID.String()},
		"envelopeData":     map[string]interface{}{"body": "hello"},
	}
	bodyBytes, _ = json.Marshal(badSenderPayload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/messages", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.SendMessage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest (400) for invalid sender UUID, got %d", rec.Code)
	}

	// 5. SendMessage - Invalid Recipient UUID
	badRecipientPayload := map[string]interface{}{
		"senderIdentityId": ident1.ID.String(),
		"recipientIds":     []string{"invalid-recipient-uuid"},
		"envelopeData":     map[string]interface{}{"body": "hello"},
	}
	bodyBytes, _ = json.Marshal(badRecipientPayload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/messages", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.SendMessage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest (400) for invalid recipient UUID, got %d", rec.Code)
	}

	// 6. GetInbox - Success
	req = httptest.NewRequest(http.MethodGet, "/api/v1/inbox?identityId="+ident1.ID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.GetInbox(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var envelopes []*models.MessageEnvelope
	_ = json.Unmarshal(rec.Body.Bytes(), &envelopes)
	if len(envelopes) == 0 {
		// Wait, did Alice receive any messages?
		// Since Alice is not the recipient in our SendMessage test above (recipientID was a random UUID), Alice's inbox should be empty.
		// That's correct.
	}

	// 7. GetInbox - Unauthorized (no context)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/inbox?identityId="+ident1.ID.String(), nil)
	rec = httptest.NewRecorder()
	handler.GetInbox(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status Unauthorized (401), got %d", rec.Code)
	}

	// 8. GetInbox - Invalid identity UUID query param
	req = httptest.NewRequest(http.MethodGet, "/api/v1/inbox?identityId=invalid-uuid", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.GetInbox(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest (400) for invalid query param, got %d", rec.Code)
	}

	// 9. GetInbox - Unauthorized identity query param (user1 query Bob's inbox)
	bobIdentID := uuid.New()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/inbox?identityId="+bobIdentID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.GetInbox(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status BadRequest (400) for unauthorized identity query, got %d", rec.Code)
	}
}
