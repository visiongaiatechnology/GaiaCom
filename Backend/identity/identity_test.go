package identity

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
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

	// 8. GetPublicIdentity - Not found
	req = httptest.NewRequest(http.MethodGet, "/api/v1/public/identities/@bob:gaia.local", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 for not found identity, got %d", rec.Code)
	}
}
