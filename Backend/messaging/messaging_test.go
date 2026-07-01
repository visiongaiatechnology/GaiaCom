// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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
	sentMessageID, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage failed: %v", err)
	}
	if sentMessageID == uuid.Nil {
		t.Fatal("SaveAndDistributeMessage returned empty message id")
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
	selfCopyPayload := []byte(`{"read_receipt_source_id":"` + messageID.String() + `"}`)
	selfCopyID, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, selfCopyPayload, []uuid.UUID{ident1.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage failed for read-receipt self copy: %v", err)
	}
	aliceMailbox, err := store.FindMailboxMessages(ctx, user1.ID, ident1.ID, repository.MailboxQuery{Folder: "all", Limit: 10})
	if err != nil {
		t.Fatalf("FindMailboxMessages before read receipt failed: %v", err)
	}
	var selfCopyBeforeRead *models.MessageEnvelope
	for _, envelope := range aliceMailbox {
		if envelope.ID == selfCopyID {
			selfCopyBeforeRead = envelope
			break
		}
	}
	if selfCopyBeforeRead == nil || selfCopyBeforeRead.IsRead {
		t.Fatalf("self copy should not be read before recipient read receipt: %+v", selfCopyBeforeRead)
	}
	if err := svc.MarkInboxMessagesReadForUser(ctx, user2.ID, ident2.ID, []uuid.UUID{messageID}); err != nil {
		t.Fatalf("recipient read receipt failed: %v", err)
	}
	aliceMailbox, err = store.FindMailboxMessages(ctx, user1.ID, ident1.ID, repository.MailboxQuery{Folder: "all", Limit: 10})
	if err != nil {
		t.Fatalf("FindMailboxMessages after read receipt failed: %v", err)
	}
	var selfCopyAfterRead *models.MessageEnvelope
	for _, envelope := range aliceMailbox {
		if envelope.ID == selfCopyID {
			selfCopyAfterRead = envelope
			break
		}
	}
	if selfCopyAfterRead == nil || !selfCopyAfterRead.IsRead {
		t.Fatalf("self copy should become read after recipient read receipt: %+v", selfCopyAfterRead)
	}
	reactionState, err := svc.ToggleMessageReactionForUser(ctx, user2.ID, ident2.ID, messageID, "\U0001F44D")
	if err != nil {
		t.Fatalf("recipient should be allowed to react: %v", err)
	}
	if reactionState.Reactions["\U0001F44D"] != 1 || !reactionState.ReactedByMe["\U0001F44D"] {
		t.Fatalf("reaction state mismatch after toggle on: %+v", reactionState)
	}
	messages, err = svc.GetInboxForUser(ctx, user2.ID, ident2.ID)
	if err != nil {
		t.Fatalf("GetInboxForUser with reaction failed: %v", err)
	}
	if messages[0].Reactions["\U0001F44D"] != 1 || !messages[0].ReactedByMe["\U0001F44D"] {
		t.Fatalf("inbox did not include persisted reaction state: %+v", messages[0])
	}
	reactionState, err = svc.ToggleMessageReactionForUser(ctx, user2.ID, ident2.ID, messageID, "\U0001F44D")
	if err != nil {
		t.Fatalf("recipient should be allowed to remove reaction: %v", err)
	}
	if reactionState.Reactions["\U0001F44D"] != 0 || reactionState.ReactedByMe["\U0001F44D"] {
		t.Fatalf("reaction state mismatch after toggle off: %+v", reactionState)
	}
	if _, err := svc.ToggleMessageReactionForUser(ctx, user1.ID, ident2.ID, messageID, "\U0001F44D"); err == nil {
		t.Fatal("expected foreign identity reaction to be rejected")
	}
	peerEditCopyID, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, []byte(`{"client_message_id":"chat-edit-1","payload_ciphertext":"peer-v1","signature":"sig-v1"}`), []uuid.UUID{ident2.ID})
	if err != nil {
		t.Fatalf("failed to create peer edit seed: %v", err)
	}
	selfEditCopyID, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, []byte(`{"client_message_id":"chat-edit-1","payload_ciphertext":"self-v1","signature":"sig-v1","read_receipt_source_id":"`+peerEditCopyID.String()+`","recipient_gaia":"@bob:gaiacom.local"}`), []uuid.UUID{ident1.ID})
	if err != nil {
		t.Fatalf("failed to create self edit seed: %v", err)
	}
	if _, err := svc.EditDirectMessageForUser(ctx, user1.ID, ident1.ID, selfEditCopyID, []byte(`{"client_message_id":"chat-edit-1","payload_ciphertext":"peer-v2","signature":"sig-v2"}`), []byte(`{"client_message_id":"chat-edit-1","payload_ciphertext":"self-v2","signature":"sig-v2"}`)); err != nil {
		t.Fatalf("expected direct chat edit to succeed: %v", err)
	}
	aliceMailboxAfterEdit, err := store.FindMailboxMessages(ctx, user1.ID, ident1.ID, repository.MailboxQuery{Folder: "all", Limit: 50})
	if err != nil {
		t.Fatalf("FindMailboxMessages after edit failed: %v", err)
	}
	bobMailboxAfterEdit, err := store.FindMailboxMessages(ctx, user2.ID, ident2.ID, repository.MailboxQuery{Folder: "all", Limit: 50})
	if err != nil {
		t.Fatalf("FindMailboxMessages for recipient after edit failed: %v", err)
	}
	var aliceEditMessage *models.MessageEnvelope
	for _, envelope := range aliceMailboxAfterEdit {
		if envelope.ClientMessageID == "chat-edit-1" && envelope.ReadReceiptSourceID != uuid.Nil {
			aliceEditMessage = envelope
			break
		}
	}
	if aliceEditMessage == nil || string(aliceEditMessage.Payload) != `{"client_message_id":"chat-edit-1","payload_ciphertext":"self-v2","signature":"sig-v2"}` || aliceEditMessage.EditedAt.IsZero() {
		t.Fatalf("sender should see only edited self copy, got %+v", aliceEditMessage)
	}
	var bobEditMessage *models.MessageEnvelope
	for _, envelope := range bobMailboxAfterEdit {
		if envelope.ClientMessageID == "chat-edit-1" {
			bobEditMessage = envelope
			break
		}
	}
	if bobEditMessage == nil || string(bobEditMessage.Payload) != `{"client_message_id":"chat-edit-1","payload_ciphertext":"peer-v2","signature":"sig-v2"}` || bobEditMessage.EditedAt.IsZero() {
		t.Fatalf("recipient should see only edited peer copy, got %+v", bobEditMessage)
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
	for _, inboxMessage := range messages {
		if inboxMessage.ID == messageID {
			t.Fatalf("expected Bob's original inbox entry to be deleted, got %+v", inboxMessage)
		}
	}

	// 2. Sender identity not authorized (user2 trying to send as Alice/ident1)
	_, err = svc.SaveAndDistributeMessage(ctx, user2.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error when sending message with unauthorized sender identity, got nil")
	}

	// 3. Invalid user/sender ID
	_, err = svc.SaveAndDistributeMessage(ctx, uuid.Nil, ident1.ID, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for nil user ID, got nil")
	}
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, uuid.Nil, envelopeData, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for nil sender identity ID, got nil")
	}

	// 4. Invalid envelope size
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, []byte{}, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for empty envelope, got nil")
	}
	oversized := make([]byte, 1024*1024+1)
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, oversized, []uuid.UUID{ident2.ID})
	if err == nil {
		t.Error("expected error for oversized envelope, got nil")
	}

	// 5. Invalid recipient sets
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{})
	if err == nil {
		t.Error("expected error for empty recipient set, got nil")
	}
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{uuid.Nil})
	if err == nil {
		t.Error("expected error for nil recipient ID, got nil")
	}

	// 6. Deduplication check
	_, err = svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, envelopeData, []uuid.UUID{ident2.ID, ident2.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage with duplicates failed: %v", err)
	}

	// 7. GetInboxForUser unauthorized identity
	_, err = svc.GetInboxForUser(ctx, user1.ID, ident2.ID) // Alice trying to get Bob's inbox
	if err == nil {
		t.Error("expected error when retrieving inbox for unauthorized identity, got nil")
	}
}

func TestMessagingServiceTopSecretRoomRequiresSignatureSuite(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	svc := NewMessagingService(store, store)
	ctx := context.Background()

	user1 := &models.User{ID: uuid.New(), Username: "alice-ts", PasswordHash: "hash1", PublicKey: "pk1"}
	user2 := &models.User{ID: uuid.New(), Username: "bob-ts", PasswordHash: "hash2", PublicKey: "pk2"}
	if err := store.CreateUser(user1); err != nil {
		t.Fatalf("create user1: %v", err)
	}
	if err := store.CreateUser(user2); err != nil {
		t.Fatalf("create user2: %v", err)
	}

	ident1 := &models.Identity{ID: uuid.New(), UserID: user1.ID, GaiaID: "@alice-ts:gaiacom.local", DisplayName: "Alice TS", PublicRecord: models.JSONB(`{"public_keys":{"mldsa87":"alice-pq"}}`), IsActive: true}
	ident2 := &models.Identity{ID: uuid.New(), UserID: user2.ID, GaiaID: "@bob-ts:gaiacom.local", DisplayName: "Bob TS", PublicRecord: models.JSONB(`{"public_keys":{"mldsa87":"bob-pq"}}`), IsActive: true}
	if err := store.CreateIdentity(ident1); err != nil {
		t.Fatalf("create ident1: %v", err)
	}
	if err := store.CreateIdentity(ident2); err != nil {
		t.Fatalf("create ident2: %v", err)
	}

	roomID := uuid.New()
	channelID := uuid.New()
	room := &models.Room{
		ID:        roomID,
		Name:      "Top Secret",
		IsPrivate: true,
		CreatedBy: ident1.ID,
		TopSecret: true,
	}
	members := []models.RoomMember{
		{RoomID: roomID, IdentityID: ident1.ID, Role: "owner"},
		{RoomID: roomID, IdentityID: ident2.ID, Role: "member"},
	}
	if err := store.CreateRoomWithMembers(ctx, room, members); err != nil {
		t.Fatalf("create top secret room: %v", err)
	}

	normalSuite := []byte(`{"client_message_id":"` + uuid.New().String() + `","room_id":"` + roomID.String() + `","channel_id":"` + channelID.String() + `","algorithm_suite":"GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM","signature":"ed"}`)
	if _, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, normalSuite, []uuid.UUID{ident2.ID}); err == nil {
		t.Fatalf("top secret room accepted normal algorithm suite")
	}

	missingMLDSA := []byte(`{"client_message_id":"` + uuid.New().String() + `","room_id":"` + roomID.String() + `","channel_id":"` + channelID.String() + `","algorithm_suite":"GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87","signature":"ed","signature_bundle":{"ed25519":"ed"}}`)
	if _, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, missingMLDSA, []uuid.UUID{ident2.ID}); err == nil {
		t.Fatalf("top secret room accepted missing ML-DSA-87 bundle")
	}

	validBundle := []byte(`{"client_message_id":"` + uuid.New().String() + `","room_id":"` + roomID.String() + `","channel_id":"` + channelID.String() + `","algorithm_suite":"GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87","signature":"ed","signature_bundle":{"ed25519":"ed","ml_dsa_87":"pq-sig","ml_dsa_87_public":"pq-pub"}}`)
	if _, err := svc.SaveAndDistributeMessage(ctx, user1.ID, ident1.ID, validBundle, []uuid.UUID{ident2.ID}); err != nil {
		t.Fatalf("top secret room rejected complete signature bundle: %v", err)
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

	bobInbox, err := svc.GetInboxForUser(context.Background(), user2.ID, ident2.ID)
	if err != nil {
		t.Fatalf("failed to load recipient inbox for reaction test: %v", err)
	}
	if len(bobInbox) != 1 {
		t.Fatalf("expected one recipient inbox message for reaction test, got %d", len(bobInbox))
	}
	reactionPayload := map[string]interface{}{
		"identityId": ident2.ID.String(),
		"messageId":  bobInbox[0].ID.String(),
		"emoji":      "\U0001F44D",
	}
	bodyBytes, _ = json.Marshal(reactionPayload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/messaging/reaction", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user2.ID))
	rec = httptest.NewRecorder()
	handler.ToggleReaction(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected reaction status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}
	var reactionResp models.MessageReactionState
	_ = json.Unmarshal(rec.Body.Bytes(), &reactionResp)
	if reactionResp.Reactions["\U0001F44D"] != 1 || !reactionResp.ReactedByMe["\U0001F44D"] {
		t.Fatalf("handler reaction state mismatch: %+v", reactionResp)
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
