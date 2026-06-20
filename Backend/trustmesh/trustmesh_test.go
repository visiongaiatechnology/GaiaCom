package trustmesh

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/messaging"
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

func TestTrustMeshServiceSubmitReport(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	epochMasterKey := make([]byte, 32)
	epochMasterKey[0] = 0xAB // some fixed value
	svc := NewService(store, epochMasterKey)
	ctx := context.Background()

	// 1. Setup Alice (Recipient) and Bob (Sender)
	aliceUser := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "pwd",
	}
	_ = store.CreateUser(aliceUser)

	bobUser := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "pwd",
	}
	_ = store.CreateUser(bobUser)

	alicePubKeyHex := "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
	bobPubKeyHex := "aaabbbcccdddeeefff000102030405060708090a0b0c0d0e0f10111213141516"

	aliceIdent := &models.Identity{
		ID:           uuid.New(),
		UserID:       aliceUser.ID,
		GaiaID:       "@alice:gaiacom.net",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"` + alicePubKeyHex + `"}}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(aliceIdent)

	bobIdent := &models.Identity{
		ID:           uuid.New(),
		UserID:       bobUser.ID,
		GaiaID:       "@bob:gaiacom.net",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"` + bobPubKeyHex + `"}}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(bobIdent)

	// Generate a message from Bob to Alice
	msgID := uuid.New()
	envelope := &models.MessageEnvelope{
		ID:        msgID,
		Type:      "gaia.encrypted.v1",
		Sender:    bobIdent.ID.String(),
		Recipient: aliceIdent.ID.String(),
		Payload:   models.JSONB(`{}`),
		CreatedAt: time.Now().UTC(),
	}
	_ = store.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{aliceIdent.ID})

	// Ciphertext hash for the proof
	ciphertextHashHex := "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
	ciphertextHash, _ := hex.DecodeString(ciphertextHashHex)

	alicePubKey, _ := hex.DecodeString(alicePubKeyHex)
	bobPubKey, _ := hex.DecodeString(bobPubKeyHex)

	// Calculate correct proof
	proof := CalculateReportProof(msgID, bobPubKey, alicePubKey, ciphertextHash)
	proofHex := hex.EncodeToString(proof)

	// 2. Submit report successfully
	err := svc.SubmitReport(
		ctx,
		aliceUser.ID,
		msgID,
		bobPubKeyHex,
		alicePubKeyHex,
		ciphertextHashHex,
		"signature_dummy",
	)
	if err != nil {
		t.Fatalf("SubmitReport failed: %v", err)
	}

	// Verify report is in the database
	savedReport, err := store.GetReportByProof(proofHex)
	if err != nil {
		t.Fatalf("Failed to fetch report by proof: %v", err)
	}
	if savedReport.MessageID != msgID.String() {
		t.Errorf("Expected messageID %s, got %s", msgID.String(), savedReport.MessageID)
	}

	// Verify Bob's abuse score was updated
	score, err := store.GetAbuseScore(bobPubKeyHex)
	if err != nil {
		t.Fatalf("Failed to fetch abuse score: %v", err)
	}
	if score.Score != 1 {
		t.Errorf("Expected Bob's score to be 1, got %d", score.Score)
	}

	// 3. Double report prevention: Submitting exact same proof should fail
	err = svc.SubmitReport(
		ctx,
		aliceUser.ID,
		msgID,
		bobPubKeyHex,
		alicePubKeyHex,
		ciphertextHashHex,
		"signature_dummy",
	)
	if err == nil || !strings.Contains(err.Error(), "already been reported") {
		t.Errorf("Expected already reported error, got %v", err)
	}

	// 4. Epoch double report prevention: Submitting a new message report from same recipient to same sender should fail
	msgID2 := uuid.New()
	envelope2 := &models.MessageEnvelope{
		ID:        msgID2,
		Type:      "gaia.encrypted.v1",
		Sender:    bobIdent.ID.String(),
		Recipient: aliceIdent.ID.String(),
		Payload:   models.JSONB(`{}`),
		CreatedAt: time.Now().UTC(),
	}
	_ = store.SaveMessageEnvelopeWithInbox(ctx, envelope2, []uuid.UUID{aliceIdent.ID})

	err = svc.SubmitReport(
		ctx,
		aliceUser.ID,
		msgID2,
		bobPubKeyHex,
		alicePubKeyHex,
		ciphertextHashHex,
		"signature_dummy",
	)
	if err == nil || !strings.Contains(err.Error(), "already reported this sender in the current epoch") {
		t.Errorf("Expected epoch duplicate report error, got %v", err)
	}
}

func TestEscalationRules(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	svc := NewService(store, nil)
	score := &models.AbuseScore{
		SenderPublicKey: "test_key",
		Score:           0,
		EscalationLevel: 0,
		FrictionLimit:   1.0,
	}

	// Score = 3: Soft Flag
	score.Score = 3
	svc.applyEscalationRules(score)
	if score.EscalationLevel != 1 {
		t.Errorf("Expected escalation level 1, got %d", score.EscalationLevel)
	}

	// Score = 5: Delivery Friction
	score.Score = 5
	svc.applyEscalationRules(score)
	if score.EscalationLevel != 2 {
		t.Errorf("Expected escalation level 2, got %d", score.EscalationLevel)
	}
	if score.FrictionLimit != 0.1 {
		t.Errorf("Expected friction limit 0.1, got %f", score.FrictionLimit)
	}

	// Score = 10: Quarantine
	score.Score = 10
	svc.applyEscalationRules(score)
	if score.EscalationLevel != 3 {
		t.Errorf("Expected escalation level 3, got %d", score.EscalationLevel)
	}
	if score.QuarantinedUntil.IsZero() {
		t.Error("Expected QuarantineUntil time to be set")
	}

	// Score = 20: Timeout
	score.Score = 20
	svc.applyEscalationRules(score)
	if score.EscalationLevel != 4 {
		t.Errorf("Expected escalation level 4, got %d", score.EscalationLevel)
	}
	if score.TimeoutUntil.IsZero() {
		t.Error("Expected TimeoutUntil time to be set")
	}
}

func TestQuarantineAndTimeoutPenalties(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	msgSvc := messaging.NewMessagingService(store, store)
	ctx := context.Background()

	// Setup users
	aliceUser := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "pwd",
	}
	_ = store.CreateUser(aliceUser)
	bobUser := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "pwd",
	}
	_ = store.CreateUser(bobUser)

	alicePubKeyHex := "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
	bobPubKeyHex := "aaabbbcccdddeeefff000102030405060708090a0b0c0d0e0f10111213141516"

	aliceIdent := &models.Identity{
		ID:           uuid.New(),
		UserID:       aliceUser.ID,
		GaiaID:       "@alice:gaiacom.net",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"` + alicePubKeyHex + `"}}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(aliceIdent)

	bobIdent := &models.Identity{
		ID:           uuid.New(),
		UserID:       bobUser.ID,
		GaiaID:       "@bob:gaiacom.net",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"` + bobPubKeyHex + `"}}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(bobIdent)

	// 1. Quarantine Penalty: Set Bob to be quarantined
	bobScore := &models.AbuseScore{
		SenderPublicKey:  bobPubKeyHex,
		Score:            12,
		EscalationLevel:  3,
		FrictionLimit:    0.1,
		QuarantinedUntil: time.Now().UTC().Add(1 * time.Hour),
	}
	_ = store.SaveAbuseScore(bobScore)

	// Bob sends message to Alice
	err := msgSvc.SaveAndDistributeMessage(ctx, bobUser.ID, bobIdent.ID, []byte(`{"body":"spam"}`), []uuid.UUID{aliceIdent.ID})
	if err != nil {
		t.Fatalf("SaveAndDistributeMessage failed for quarantined sender: %v", err)
	}

	// Verify message in Alice's inbox has Untrusted = true
	inbox, err := msgSvc.GetInboxForUser(ctx, aliceUser.ID, aliceIdent.ID)
	if err != nil {
		t.Fatalf("GetInboxForUser failed: %v", err)
	}
	if len(inbox) != 1 {
		t.Fatalf("Expected 1 message, got %d", len(inbox))
	}
	if !inbox[0].Untrusted {
		t.Error("Expected inbox message to be marked untrusted (quarantined)")
	}

	// 2. Timeout Penalty: Set Bob to be timed out
	bobScore.TimeoutUntil = time.Now().UTC().Add(1 * time.Hour)
	_ = store.SaveAbuseScore(bobScore)

	// Bob attempts to send message to Alice again, should be rejected
	err = msgSvc.SaveAndDistributeMessage(ctx, bobUser.ID, bobIdent.ID, []byte(`{"body":"more spam"}`), []uuid.UUID{aliceIdent.ID})
	if err == nil || !strings.Contains(err.Error(), "sender is timed out") {
		t.Errorf("Expected sender timed out error, got %v", err)
	}
}

func TestSubmitReportHTTP(t *testing.T) {
	store, cleanup := setupTestDBAndStore(t)
	defer cleanup()

	svc := NewService(store, nil)
	handler := NewHandler(svc)

	// Mock server setup for HTTP endpoints
	router := httptest.NewRecorder()
	// Simply call the handler's endpoint directly. Note that we need to mock context auth.
	// We'll write an integration-style test using a real test request context.
	user := &models.User{
		ID:           uuid.New(),
		Username:     "usr",
		PasswordHash: "pwd",
	}
	_ = store.CreateUser(user)

	pubKeyHex := "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
	ident := &models.Identity{
		ID:           uuid.New(),
		UserID:       user.ID,
		GaiaID:       "@usr:gaiacom.net",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"` + pubKeyHex + `"}}`),
		IsActive:     true,
	}
	_ = store.CreateIdentity(ident)

	input := SubmitReportInput{
		MessageID:          uuid.New().String(),
		SenderPublicKey:    "sender_key",
		RecipientPublicKey: pubKeyHex,
		CiphertextHash:     "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		Signature:          "sig",
	}
	body, _ := json.Marshal(input)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/reports/submit", strings.NewReader(string(body)))
	// Inject user ID to context
	req = req.WithContext(auth.WithUserID(req.Context(), user.ID))

	handler.SubmitReport(router, req)

	// It should fail because there is no message in the inbox for this message ID (validation step 2)
	if router.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request, got %d: %s", router.Code, router.Body.String())
	}
	if !strings.Contains(router.Body.String(), "message inbox entry not found") {
		t.Errorf("Expected message not found error, got %s", router.Body.String())
	}
}
