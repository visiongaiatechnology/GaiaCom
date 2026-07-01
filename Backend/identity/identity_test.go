// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package identity

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"database/sql"
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
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"

	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

func setupTestIdentityDBAndStore(t *testing.T) (*sql.DB, *repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	store := repository.NewSQLStore(db)

	cleanup := func() {
		db.Close()
	}
	return db, store, cleanup
}

func TestIdentityService(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)

	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	if err := store.CreateUser(user1); err != nil {
		t.Fatalf("failed to create user1: %v", err)
	}

	// 1. CreateIdentity - Success
	input := CreateIdentityInput{
		GaiaID:       "@alice:gaiacom.local",
		DisplayName:  "Alice",
		PublicRecord: map[string]interface{}{"key": "value"},
	}

	identity, err := svc.CreateIdentity(user1.ID, input)
	if err != nil {
		t.Fatalf("CreateIdentity failed: %v", err)
	}
	if identity.GaiaID != input.GaiaID {
		t.Errorf("expected GaiaID %q, got %q", input.GaiaID, identity.GaiaID)
	}

	// 2. CreateIdentity - Input validations
	// Nil user ID
	_, err = svc.CreateIdentity(uuid.Nil, input)
	if err == nil {
		t.Error("expected error for nil user ID, got nil")
	}

	// Invalid gaiaId format
	badInput := input
	badInput.GaiaID = "alice"
	_, err = svc.CreateIdentity(user1.ID, badInput)
	if err == nil {
		t.Error("expected error for bad gaiaId format, got nil")
	}

	// Empty public record
	badInput2 := input
	badInput2.PublicRecord = nil
	_, err = svc.CreateIdentity(user1.ID, badInput2)
	if err == nil {
		t.Error("expected error for empty public record, got nil")
	}

	// Taken gaiaId
	_, err = svc.CreateIdentity(user1.ID, input)
	if err == nil {
		t.Error("expected error for taken gaiaId, got nil")
	}

	// 3. GetIdentityByGaiaID
	found, err := svc.GetIdentityByGaiaID(input.GaiaID)
	if err != nil {
		t.Fatalf("GetIdentityByGaiaID failed: %v", err)
	}
	if found.ID != identity.ID {
		t.Errorf("expected identity ID %v, got %v", identity.ID, found.ID)
	}

	// Not found gaiaID
	_, err = svc.GetIdentityByGaiaID("@nonexistent:gaia.local")
	if err == nil {
		t.Error("expected error for nonexistent identity, got nil")
	}

	// 4. GetIdentitiesForUser
	identities, err := svc.GetIdentitiesForUser(user1.ID)
	if err != nil {
		t.Fatalf("GetIdentitiesForUser failed: %v", err)
	}
	if len(identities) != 1 || identities[0].ID != identity.ID {
		t.Errorf("expected 1 identity for user1, got %d", len(identities))
	}

	// 5. IdentityBelongsToUser
	belongs, err := svc.IdentityBelongsToUser(identity.ID, user1.ID)
	if err != nil {
		t.Fatalf("IdentityBelongsToUser failed: %v", err)
	}
	if !belongs {
		t.Error("expected identity to belong to user1")
	}

	belongs, err = svc.IdentityBelongsToUser(identity.ID, uuid.New())
	if err != nil {
		t.Fatalf("IdentityBelongsToUser failed: %v", err)
	}
	if belongs {
		t.Error("expected identity to NOT belong to random user")
	}
}

func TestSaveHumanProofPersistsInTrustPassport(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)
	user := &models.User{ID: uuid.New(), Username: "alice", PasswordHash: "hash", PublicKey: "pk"}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	publicKeyHex := hex.EncodeToString(publicKey)
	identity, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
		GaiaID:      "@alice:gaiacom.local",
		DisplayName: "Alice",
		PublicRecord: map[string]interface{}{
			"public_keys": map[string]string{"identity": publicKeyHex},
		},
	})
	if err != nil {
		t.Fatalf("CreateIdentity failed: %v", err)
	}

	proof := HumanProofEnvelope{
		Version:         humanProofVersion,
		GaiaID:          identity.GaiaID,
		DisplayName:     identity.DisplayName,
		ChallengeHash:   strings.Repeat("a", 64),
		Digest:          strings.Repeat("b", 64),
		Iterations:      1024,
		DurationMs:      5 * 60 * 1000,
		CompletedAt:     time.Now().UTC().UnixMilli(),
		Algorithm:       humanProofAlgorithm,
		SignerPublicKey: publicKeyHex,
	}
	payload, err := canonicalHumanProofPayload(proof)
	if err != nil {
		t.Fatalf("canonical payload failed: %v", err)
	}
	proof.Signature = hex.EncodeToString(ed25519.Sign(privateKey, []byte(payload)))

	updated, err := svc.SaveHumanProof(context.Background(), user.ID, identity.ID, proof)
	if err != nil {
		t.Fatalf("SaveHumanProof failed: %v", err)
	}
	passport := svc.BuildTrustPassport(updated)
	if passport["isHumanVerified"] != true {
		t.Fatalf("expected server-side human verification in trust passport: %#v", passport)
	}
	if passport["humanProof"] == nil {
		t.Fatalf("expected humanProof in trust passport: %#v", passport)
	}
}

func TestSaveHumanProofPersistsHybridMLDSA87Suite(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)
	user := &models.User{ID: uuid.New(), Username: "alice", PasswordHash: "hash", PublicKey: "pk"}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	publicKeyHex := hex.EncodeToString(publicKey)
	mldsa87PublicKey, mldsa87PrivateKey, err := mldsa87.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate mldsa87 key: %v", err)
	}
	mldsa87PublicKeyHex := hex.EncodeToString(mldsa87PublicKey.Bytes())
	identity, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
		GaiaID:      "@alice-hybrid:gaiacom.local",
		DisplayName: "Alice Hybrid",
		PublicRecord: map[string]interface{}{
			"public_keys": map[string]string{
				"identity": publicKeyHex,
				"mldsa87":  mldsa87PublicKeyHex,
			},
		},
	})
	if err != nil {
		t.Fatalf("CreateIdentity failed: %v", err)
	}

	proof := HumanProofEnvelope{
		Version:          humanProofVersion,
		GaiaID:           identity.GaiaID,
		DisplayName:      identity.DisplayName,
		ChallengeHash:    strings.Repeat("a", 64),
		Digest:           strings.Repeat("b", 64),
		Iterations:       2048,
		DurationMs:       5 * 60 * 1000,
		CompletedAt:      time.Now().UTC().UnixMilli(),
		Algorithm:        humanProofAlgorithm,
		SignerPublicKey:  publicKeyHex,
		SignatureSuite:   humanProofSuiteHybrid,
		MLDSA87PublicKey: mldsa87PublicKeyHex,
	}
	payload, err := canonicalHumanProofPayload(proof)
	if err != nil {
		t.Fatalf("canonical payload failed: %v", err)
	}
	proof.Signature = hex.EncodeToString(ed25519.Sign(privateKey, []byte(payload)))
	mldsa87Signature := make([]byte, mldsa87.SignatureSize)
	if err := mldsa87.SignTo(mldsa87PrivateKey, []byte(payload), nil, false, mldsa87Signature); err != nil {
		t.Fatalf("mldsa87 signing failed: %v", err)
	}
	proof.MLDSA87Signature = hex.EncodeToString(mldsa87Signature)

	updated, err := svc.SaveHumanProof(context.Background(), user.ID, identity.ID, proof)
	if err != nil {
		t.Fatalf("SaveHumanProof failed: %v", err)
	}
	passport := svc.BuildTrustPassport(updated)
	humanProof, ok := passport["humanProof"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected humanProof map in trust passport: %#v", passport)
	}
	if humanProof["signatureSuite"] != humanProofSuiteHybrid {
		t.Fatalf("expected hybrid signature suite, got %#v", humanProof["signatureSuite"])
	}
}

func TestSaveHumanProofRejectsHybridMLDSA87Mismatch(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)
	user := &models.User{ID: uuid.New(), Username: "alice", PasswordHash: "hash", PublicKey: "pk"}
	_ = store.CreateUser(user)
	publicKey, privateKey, _ := ed25519.GenerateKey(nil)
	publicKeyHex := hex.EncodeToString(publicKey)
	recordMLDSA87PublicKey, _, err := mldsa87.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate mldsa87 public record key: %v", err)
	}
	proofMLDSA87PublicKey, proofMLDSA87PrivateKey, err := mldsa87.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate proof mldsa87 key: %v", err)
	}
	identity, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
		GaiaID:      "@alice-hybrid-reject:gaiacom.local",
		DisplayName: "Alice Hybrid Reject",
		PublicRecord: map[string]interface{}{
			"public_keys": map[string]string{
				"identity": publicKeyHex,
				"mldsa87":  hex.EncodeToString(recordMLDSA87PublicKey.Bytes()),
			},
		},
	})
	if err != nil {
		t.Fatalf("CreateIdentity failed: %v", err)
	}

	proof := HumanProofEnvelope{
		Version:          humanProofVersion,
		GaiaID:           identity.GaiaID,
		DisplayName:      identity.DisplayName,
		ChallengeHash:    strings.Repeat("c", 64),
		Digest:           strings.Repeat("d", 64),
		Iterations:       2048,
		DurationMs:       5 * 60 * 1000,
		CompletedAt:      time.Now().UTC().UnixMilli(),
		Algorithm:        humanProofAlgorithm,
		SignerPublicKey:  publicKeyHex,
		SignatureSuite:   humanProofSuiteHybrid,
		MLDSA87PublicKey: hex.EncodeToString(proofMLDSA87PublicKey.Bytes()),
	}
	payload, _ := canonicalHumanProofPayload(proof)
	proof.Signature = hex.EncodeToString(ed25519.Sign(privateKey, []byte(payload)))
	mldsa87Signature := make([]byte, mldsa87.SignatureSize)
	if err := mldsa87.SignTo(proofMLDSA87PrivateKey, []byte(payload), nil, false, mldsa87Signature); err != nil {
		t.Fatalf("mldsa87 signing failed: %v", err)
	}
	proof.MLDSA87Signature = hex.EncodeToString(mldsa87Signature)

	if _, err := svc.SaveHumanProof(context.Background(), user.ID, identity.ID, proof); err == nil {
		t.Fatal("expected mismatched mldsa87 human proof to be rejected")
	}
}

func TestSaveHumanProofRejectsWrongSigner(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)
	user := &models.User{ID: uuid.New(), Username: "alice", PasswordHash: "hash", PublicKey: "pk"}
	_ = store.CreateUser(user)
	publicKey, _, _ := ed25519.GenerateKey(nil)
	attackerPublicKey, attackerPrivateKey, _ := ed25519.GenerateKey(nil)
	identity, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
		GaiaID:      "@alice:gaiacom.local",
		DisplayName: "Alice",
		PublicRecord: map[string]interface{}{
			"public_keys": map[string]string{"identity": hex.EncodeToString(publicKey)},
		},
	})
	if err != nil {
		t.Fatalf("CreateIdentity failed: %v", err)
	}

	proof := HumanProofEnvelope{
		Version:         humanProofVersion,
		GaiaID:          identity.GaiaID,
		DisplayName:     identity.DisplayName,
		ChallengeHash:   strings.Repeat("c", 64),
		Digest:          strings.Repeat("d", 64),
		Iterations:      1024,
		DurationMs:      5 * 60 * 1000,
		CompletedAt:     time.Now().UTC().UnixMilli(),
		Algorithm:       humanProofAlgorithm,
		SignerPublicKey: hex.EncodeToString(attackerPublicKey),
	}
	payload, _ := canonicalHumanProofPayload(proof)
	proof.Signature = hex.EncodeToString(ed25519.Sign(attackerPrivateKey, []byte(payload)))

	if _, err := svc.SaveHumanProof(context.Background(), user.ID, identity.ID, proof); err == nil {
		t.Fatal("expected wrong signer human proof to be rejected")
	}
}

func TestIdentityHandler(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store)
	handler := NewIdentityHandler(svc)

	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	_ = store.CreateUser(user1)

	// 1. CreateIdentity - Success
	input := CreateIdentityInput{
		GaiaID:       "@alice:gaiacom.local",
		DisplayName:  "Alice",
		PublicRecord: map[string]interface{}{"key": "val"},
	}
	bodyBytes, _ := json.Marshal(input)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/identities", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec := httptest.NewRecorder()

	handler.CreateIdentity(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status Created (201), got %d: %s", rec.Code, rec.Body.String())
	}

	var created models.Identity
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.GaiaID != input.GaiaID {
		t.Errorf("expected returned gaiaID %q, got %q", input.GaiaID, created.GaiaID)
	}

	// 2. CreateIdentity - Unauthorized
	req = httptest.NewRequest(http.MethodPost, "/api/v1/identities", bytes.NewReader(bodyBytes))
	rec = httptest.NewRecorder()
	handler.CreateIdentity(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthorized CreateIdentity, got %d", rec.Code)
	}

	// 3. CreateIdentity - Invalid JSON body
	req = httptest.NewRequest(http.MethodPost, "/api/v1/identities", bytes.NewReader([]byte("badjson")))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.CreateIdentity(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for bad JSON body, got %d", rec.Code)
	}

	// 4. CreateIdentity - Service failure (taken gaiaID)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/identities", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.CreateIdentity(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for duplicate gaiaId, got %d", rec.Code)
	}

	// 5. GetMyIdentities - Success
	req = httptest.NewRequest(http.MethodGet, "/api/v1/identities/my", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()

	handler.GetMyIdentities(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var myIdents []models.Identity
	_ = json.Unmarshal(rec.Body.Bytes(), &myIdents)
	if len(myIdents) != 1 || myIdents[0].GaiaID != input.GaiaID {
		t.Errorf("expected 1 identity with gaiaId %q, got %d", input.GaiaID, len(myIdents))
	}

	// 6. GetMyIdentities - Unauthorized
	req = httptest.NewRequest(http.MethodGet, "/api/v1/identities/my", nil)
	rec = httptest.NewRecorder()
	handler.GetMyIdentities(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthorized GetMyIdentities, got %d", rec.Code)
	}

	// 7. GetPublicIdentity - Success using httpx.Router
	router := httpx.NewRouter()
	router.GET("/api/v1/public/identities/:gaiaID", handler.GetPublicIdentity)

	req = httptest.NewRequest(http.MethodGet, "/api/v1/public/identities/@alice:gaiacom.local", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var pubResp struct {
		GaiaID       string       `json:"gaiaId"`
		PublicRecord models.JSONB `json:"publicRecord"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &pubResp)
	if pubResp.GaiaID != input.GaiaID {
		t.Errorf("expected public record gaiaId %q, got %q", input.GaiaID, pubResp.GaiaID)
	}

	// 8. GetPublicIdentity - Not found returns neutral response to avoid GaiaID enumeration
	req = httptest.NewRequest(http.MethodGet, "/api/v1/public/identities/@bob:gaia.local", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 neutral response for not found identity, got %d", rec.Code)
	}
	var neutralResp struct {
		GaiaID       string          `json:"gaiaId"`
		PublicRecord json.RawMessage `json:"publicRecord"`
		Found        bool            `json:"found"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &neutralResp)
	if neutralResp.Found || string(neutralResp.PublicRecord) != "null" {
		t.Errorf("expected neutral unresolved identity response, got body %s", rec.Body.String())
	}
}
