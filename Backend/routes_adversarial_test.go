// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package main

import (
	"context"
	"crypto/ed25519"
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
	"gaiacom/backend/federation"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func setupTestStore(t *testing.T) (*repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	t.Setenv("GAIACOM_JWT_SECRET", "another_very_secret_key_for_jwt_signing_change_me_to_a_long_random_string")
	t.Setenv("GAIACOM_SHIELD_SECRET", "test_gaiashield_secret_for_adversarial_routes")
	_, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate test server key: %v", err)
	}
	t.Setenv("GAIACOM_SERVER_PRIVATE_KEY", hex.EncodeToString(privateKey))
	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	store := repository.NewSQLStore(db)

	cleanup := func() {
		db.Close()
	}
	return store, cleanup
}

func TestAdversarialCSPHeaders(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()

	// 1. Production Mode Check (GAIACOM_DEV_MODE is not "true")
	t.Setenv("GAIACOM_DEV_MODE", "")
	handlerProd := SetupRoutes(store)

	reqProd := httptest.NewRequest(http.MethodGet, "/.well-known/gaiacom/server", nil)
	recProd := httptest.NewRecorder()
	handlerProd.ServeHTTP(recProd, reqProd)

	cspProd := recProd.Header().Get("Content-Security-Policy")
	if strings.Contains(cspProd, "localhost") || strings.Contains(cspProd, "127.0.0.1") {
		t.Errorf("Production CSP header contains localhost or 127.0.0.1: %s", cspProd)
	}
	if strings.Contains(cspProd, "style-src 'self' 'unsafe-inline'") {
		t.Errorf("Production CSP keeps broad inline style allowance: %s", cspProd)
	}
	if !strings.Contains(cspProd, "style-src-attr 'unsafe-inline'") {
		t.Errorf("Production CSP missing scoped React style attribute allowance: %s", cspProd)
	}

	// 2. Dev Mode Check (GAIACOM_DEV_MODE is "true")
	t.Setenv("GAIACOM_DEV_MODE", "true")
	handlerDev := SetupRoutes(store)

	reqDev := httptest.NewRequest(http.MethodGet, "/.well-known/gaiacom/server", nil)
	recDev := httptest.NewRecorder()
	handlerDev.ServeHTTP(recDev, reqDev)

	cspDev := recDev.Header().Get("Content-Security-Policy")
	if !strings.Contains(cspDev, "localhost") {
		t.Errorf("Development CSP header missing localhost: %s", cspDev)
	}
}

func TestAdversarialCSPReportEndpoint(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()

	handler := SetupRoutes(store)

	// A. Check POST only
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/public/csp-report", nil)
	reqGet.RemoteAddr = "1.1.1.1:1234"
	recGet := httptest.NewRecorder()
	handler.ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusMethodNotAllowed && recGet.Code != http.StatusNotFound {
		t.Errorf("expected GET to CSP report endpoint to be blocked, got status %d", recGet.Code)
	}

	// B. Check Content-Type validation
	reqText := httptest.NewRequest(http.MethodPost, "/api/v1/public/csp-report", strings.NewReader(`{"test":1}`))
	reqText.Header.Set("Content-Type", "text/plain")
	reqText.RemoteAddr = "1.1.1.2:1234"
	recText := httptest.NewRecorder()
	handler.ServeHTTP(recText, reqText)
	if recText.Code != http.StatusUnsupportedMediaType {
		t.Errorf("expected 415 UnsupportedMediaType for text/plain, got %d", recText.Code)
	}

	// C. Check size limit: 16KB (16384 bytes) limit
	largeBody := strings.Repeat("A", 16385)
	reqLarge := httptest.NewRequest(http.MethodPost, "/api/v1/public/csp-report", strings.NewReader(largeBody))
	reqLarge.Header.Set("Content-Type", "application/json")
	reqLarge.RemoteAddr = "1.1.1.3:1234"
	recLarge := httptest.NewRecorder()
	handler.ServeHTTP(recLarge, reqLarge)
	if recLarge.Code != http.StatusBadRequest {
		t.Errorf("expected 400 BadRequest for body > 16KB, got %d", recLarge.Code)
	}

	// D. Check JSON validation
	reqBadJSON := httptest.NewRequest(http.MethodPost, "/api/v1/public/csp-report", strings.NewReader(`{"csp-report": {`))
	reqBadJSON.Header.Set("Content-Type", "application/json")
	reqBadJSON.RemoteAddr = "1.1.1.4:1234"
	recBadJSON := httptest.NewRecorder()
	handler.ServeHTTP(recBadJSON, reqBadJSON)
	if recBadJSON.Code != http.StatusBadRequest {
		t.Errorf("expected 400 BadRequest for invalid JSON body, got %d", recBadJSON.Code)
	}

	// E. Check IP rate limiter (maximum 1 request per 5 seconds per IP)
	reqRate1 := httptest.NewRequest(http.MethodPost, "/api/v1/public/csp-report", strings.NewReader(`{"test":1}`))
	reqRate1.Header.Set("Content-Type", "application/json")
	reqRate1.RemoteAddr = "1.2.3.4:1234"
	recRate1 := httptest.NewRecorder()
	handler.ServeHTTP(recRate1, reqRate1)
	if recRate1.Code != http.StatusNoContent {
		t.Errorf("expected 204 NoContent for first request, got %d", recRate1.Code)
	}

	reqRate2 := httptest.NewRequest(http.MethodPost, "/api/v1/public/csp-report", strings.NewReader(`{"test":1}`))
	reqRate2.Header.Set("Content-Type", "application/json")
	reqRate2.RemoteAddr = "1.2.3.4:4321" // same IP
	recRate2 := httptest.NewRecorder()
	handler.ServeHTTP(recRate2, reqRate2)
	if recRate2.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 TooManyRequests for rate limit hit, got %d", recRate2.Code)
	}
}

func TestAdversarialReplayAndSkew(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()

	// Register local recipient @bob:ourserver.net in database
	userID := uuid.New()
	err := store.CreateUser(&models.User{
		ID:           userID,
		Username:     "bob",
		PasswordHash: "pwd",
	})
	if err != nil {
		t.Fatalf("failed to create bob user: %v", err)
	}
	err = store.CreateIdentity(&models.Identity{
		ID:           uuid.New(),
		UserID:       userID,
		GaiaID:       "@bob:ourserver.net",
		IsActive:     true,
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"bob_pub_key"}}`),
	})
	if err != nil {
		t.Fatalf("failed to create bob identity: %v", err)
	}

	_, priv, _ := ed25519.GenerateKey(nil)
	svc := federation.NewService(store, "ourserver.net", priv)

	pdu := models.PDU{
		PDUID:       "11111111-2222-3333-4444-555555555555",
		Type:        "gaia.encrypted.v1",
		Sender:      "@alice:remoteserver.org",
		Destination: "@bob:ourserver.net",
		Payload:     "{}",
		CreatedAt:   time.Now().UTC().Unix(),
	}

	// 1. Initial save succeeds
	err = svc.SaveIncomingPDU(context.Background(), pdu)
	if err != nil {
		t.Fatalf("first PDU save failed: %v", err)
	}

	// 2. Duplicate PDU ID save fails (Replay Protection)
	err = svc.SaveIncomingPDU(context.Background(), pdu)
	if err == nil || (!strings.Contains(err.Error(), "replay") && !strings.Contains(err.Error(), "already processed")) {
		t.Errorf("expected duplicate PDU ID save to fail due to replay check, got %v", err)
	}

	// 3. Timestamp skew rejection (CreatedAt is older than 1 hour)
	pduOld := pdu
	pduOld.PDUID = "22222222-3333-4444-5555-666666666666"
	pduOld.CreatedAt = time.Now().UTC().Add(-2 * time.Hour).Unix()
	err = svc.SaveIncomingPDU(context.Background(), pduOld)
	if err == nil || !strings.Contains(err.Error(), "skew too large") {
		t.Errorf("expected PDU older than 1 hour to be rejected due to timestamp skew, got %v", err)
	}

	// 4. Timestamp skew rejection (CreatedAt is newer than 1 hour in future)
	pduNew := pdu
	pduNew.PDUID = "33333333-4444-5555-6666-777777777777"
	pduNew.CreatedAt = time.Now().UTC().Add(2 * time.Hour).Unix()
	err = svc.SaveIncomingPDU(context.Background(), pduNew)
	if err == nil || !strings.Contains(err.Error(), "skew too large") {
		t.Errorf("expected PDU in future to be rejected due to timestamp skew, got %v", err)
	}
}

func TestAdversarialRoomBOLAAndIdentityLimit(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()

	handler := SetupRoutes(store)
	authService := auth.NewAuthService(store)

	// Register and login User 1
	user1, err := authService.RegisterUser("userone", "strongpassword123", "key1")
	if err != nil {
		t.Fatalf("failed to register user 1: %v", err)
	}
	token1, _, err := authService.LoginUser("userone", "strongpassword123")
	if err != nil {
		t.Fatalf("failed to login user 1: %v", err)
	}

	// Register and login User 2
	user2, err := authService.RegisterUser("usertwo", "strongpassword123", "key2")
	if err != nil {
		t.Fatalf("failed to register user 2: %v", err)
	}
	token2, _, err := authService.LoginUser("usertwo", "strongpassword123")
	if err != nil {
		t.Fatalf("failed to login user 2: %v", err)
	}

	// Create Identity 1 for User 1
	ident1 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user1.ID,
		GaiaID:       "@user1:gaiacom.de",
		DisplayName:  "User One",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"pubkey1"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(ident1); err != nil {
		t.Fatalf("failed to create identity 1: %v", err)
	}

	// Create Identity 2 for User 2
	ident2 := &models.Identity{
		ID:           uuid.New(),
		UserID:       user2.ID,
		GaiaID:       "@user2:gaiacom.de",
		DisplayName:  "User Two",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"pubkey2"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(ident2); err != nil {
		t.Fatalf("failed to create identity 2: %v", err)
	}

	// -------------------------------------------------------------------------
	// 1. Test Identity Limit (max 2)
	// -------------------------------------------------------------------------
	// User 1 currently has 1 identity. Try creating a 2nd.
	reqCreateIdent2 := httptest.NewRequest(http.MethodPost, "/api/v1/identity/create", strings.NewReader(`{
		"gaiaId": "@user1b:gaiacom.de",
		"displayName": "User One B",
		"publicRecord": {"public_keys": {"identity": "pubkey1b"}}
	}`))
	reqCreateIdent2.Header.Set("Content-Type", "application/json")
	reqCreateIdent2.Header.Set("Authorization", "Bearer "+token1)
	recCreateIdent2 := httptest.NewRecorder()
	handler.ServeHTTP(recCreateIdent2, reqCreateIdent2)
	if recCreateIdent2.Code != http.StatusCreated {
		t.Errorf("expected 201 Created for 2nd identity, got %d (body: %s)", recCreateIdent2.Code, recCreateIdent2.Body.String())
	}

	// Try creating a 3rd identity. Should fail with 400 Bad Request.
	reqCreateIdent3 := httptest.NewRequest(http.MethodPost, "/api/v1/identity/create", strings.NewReader(`{
		"gaiaId": "@user1c:gaiacom.de",
		"displayName": "User One C",
		"publicRecord": {"public_keys": {"identity": "pubkey1c"}}
	}`))
	reqCreateIdent3.Header.Set("Content-Type", "application/json")
	reqCreateIdent3.Header.Set("Authorization", "Bearer "+token1)
	recCreateIdent3 := httptest.NewRecorder()
	handler.ServeHTTP(recCreateIdent3, reqCreateIdent3)
	if recCreateIdent3.Code != http.StatusBadRequest || !strings.Contains(recCreateIdent3.Body.String(), "Identity creation rejected") {
		t.Errorf("expected 400 Bad Request for 3rd identity, got %d (body: %s)", recCreateIdent3.Code, recCreateIdent3.Body.String())
	}
	if strings.Contains(recCreateIdent3.Body.String(), "limit reached") {
		t.Errorf("identity limit detail leaked to client: %s", recCreateIdent3.Body.String())
	}

	// -------------------------------------------------------------------------
	// 2. BOLA: CreateRoom with forged creator identity -> 403
	// -------------------------------------------------------------------------
	// User 1 tries to create a room claiming ident2 (User 2's identity) as creator.
	reqCreateForged := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/create", strings.NewReader(`{
		"name": "Forged Room",
		"description": "Desc",
		"avatar": "🤖",
		"memberIds": ["`+ident2.ID.String()+`"]
	}`))
	reqCreateForged.Header.Set("Content-Type", "application/json")
	reqCreateForged.Header.Set("Authorization", "Bearer "+token1)
	recCreateForged := httptest.NewRecorder()
	handler.ServeHTTP(recCreateForged, reqCreateForged)
	if recCreateForged.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for forged CreateRoom creator ID, got %d (body: %s)", recCreateForged.Code, recCreateForged.Body.String())
	}

	// Create valid room 1 where ident1 (User 1) is creator, and ident2 is also a member.
	reqCreateValid := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/create", strings.NewReader(`{
		"name": "Valid Room 1",
		"description": "Desc",
		"avatar": "🤖",
		"memberIds": ["`+ident1.ID.String()+`", "`+ident2.ID.String()+`"]
	}`))
	reqCreateValid.Header.Set("Content-Type", "application/json")
	reqCreateValid.Header.Set("Authorization", "Bearer "+token1)
	recCreateValid := httptest.NewRecorder()
	handler.ServeHTTP(recCreateValid, reqCreateValid)
	if recCreateValid.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for valid CreateRoom, got %d (body: %s)", recCreateValid.Code, recCreateValid.Body.String())
	}

	var room1 models.Room
	if err := json.Unmarshal(recCreateValid.Body.Bytes(), &room1); err != nil {
		t.Fatalf("failed to decode created room: %v", err)
	}

	// -------------------------------------------------------------------------
	// 2b. Role escalation: User 2 is a normal member and tries to promote self -> 403
	// -------------------------------------------------------------------------
	reqPromoteSelf := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/members/role", strings.NewReader(`{
		"roomId": "`+room1.ID.String()+`",
		"targetId": "`+ident2.ID.String()+`",
		"role": "admin"
	}`))
	reqPromoteSelf.Header.Set("Content-Type", "application/json")
	reqPromoteSelf.Header.Set("Authorization", "Bearer "+token2)
	recPromoteSelf := httptest.NewRecorder()
	handler.ServeHTTP(recPromoteSelf, reqPromoteSelf)
	if recPromoteSelf.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for member self-promotion, got %d (body: %s)", recPromoteSelf.Code, recPromoteSelf.Body.String())
	}

	// Create room 2 where only ident1 is a member (User 2 is not a member).
	reqCreateRoom2 := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/create", strings.NewReader(`{
		"name": "Valid Room 2",
		"description": "Desc",
		"avatar": "🤖",
		"memberIds": ["`+ident1.ID.String()+`"]
	}`))
	reqCreateRoom2.Header.Set("Content-Type", "application/json")
	reqCreateRoom2.Header.Set("Authorization", "Bearer "+token1)
	recCreateRoom2 := httptest.NewRecorder()
	handler.ServeHTTP(recCreateRoom2, reqCreateRoom2)
	if recCreateRoom2.Code != http.StatusOK {
		t.Fatalf("failed to create Room 2: %d", recCreateRoom2.Code)
	}
	var room2 models.Room
	if err := json.Unmarshal(recCreateRoom2.Body.Bytes(), &room2); err != nil {
		t.Fatalf("failed to decode room 2: %v", err)
	}

	// -------------------------------------------------------------------------
	// 3. BOLA: JoinRoomByHash with forged identityId -> 403
	// -------------------------------------------------------------------------
	// User 2 tries to join a room using User 1's identity ID.
	reqJoinForged := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/join", strings.NewReader(`{
		"identityId": "`+ident1.ID.String()+`",
		"hash": "`+room2.SecretHash+`"
	}`))
	reqJoinForged.Header.Set("Content-Type", "application/json")
	reqJoinForged.Header.Set("Authorization", "Bearer "+token2)
	recJoinForged := httptest.NewRecorder()
	handler.ServeHTTP(recJoinForged, reqJoinForged)
	if recJoinForged.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for forged JoinRoom identity ID, got %d (body: %s)", recJoinForged.Code, recJoinForged.Body.String())
	}

	// -------------------------------------------------------------------------
	// 4. BOLA: LeaveRoom with forged identityId -> 403
	// -------------------------------------------------------------------------
	// User 2 tries to make User 1's identity leave room 1.
	reqLeaveForged := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/leave", strings.NewReader(`{
		"roomId": "`+room1.ID.String()+`",
		"identityId": "`+ident1.ID.String()+`"
	}`))
	reqLeaveForged.Header.Set("Content-Type", "application/json")
	reqLeaveForged.Header.Set("Authorization", "Bearer "+token2)
	recLeaveForged := httptest.NewRecorder()
	handler.ServeHTTP(recLeaveForged, reqLeaveForged)
	if recLeaveForged.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for forged LeaveRoom identity ID, got %d (body: %s)", recLeaveForged.Code, recLeaveForged.Body.String())
	}

	// -------------------------------------------------------------------------
	// 5. BFLA / BOLA: GetChannels for private room without membership -> 403
	// -------------------------------------------------------------------------
	// User 2 (not a member of room 2) tries to query channels for room 2.
	reqGetChannelsForged := httptest.NewRequest(http.MethodGet, "/api/v1/rooms/channels?roomId="+room2.ID.String(), nil)
	reqGetChannelsForged.Header.Set("Authorization", "Bearer "+token2)
	recGetChannelsForged := httptest.NewRecorder()
	handler.ServeHTTP(recGetChannelsForged, reqGetChannelsForged)
	if recGetChannelsForged.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for querying private room channels without membership, got %d (body: %s)", recGetChannelsForged.Code, recGetChannelsForged.Body.String())
	}

	// -------------------------------------------------------------------------
	// 6. GetChannels for public room without membership -> 200 OK
	// -------------------------------------------------------------------------
	// Create public room 3 where only ident1 is member.
	reqCreateRoom3 := httptest.NewRequest(http.MethodPost, "/api/v1/rooms/create", strings.NewReader(`{
		"name": "Public Room 3",
		"description": "Desc",
		"avatar": "🤖",
		"memberIds": ["`+ident1.ID.String()+`"],
		"isPublic": true
	}`))
	reqCreateRoom3.Header.Set("Content-Type", "application/json")
	reqCreateRoom3.Header.Set("Authorization", "Bearer "+token1)
	recCreateRoom3 := httptest.NewRecorder()
	handler.ServeHTTP(recCreateRoom3, reqCreateRoom3)
	if recCreateRoom3.Code != http.StatusOK {
		t.Fatalf("failed to create Room 3: %d", recCreateRoom3.Code)
	}
	var room3 models.Room
	if err := json.Unmarshal(recCreateRoom3.Body.Bytes(), &room3); err != nil {
		t.Fatalf("failed to decode room 3: %v", err)
	}

	// User 2 (not a member) queries channels of public room 3. Should succeed.
	reqGetChannelsPublic := httptest.NewRequest(http.MethodGet, "/api/v1/rooms/channels?roomId="+room3.ID.String(), nil)
	reqGetChannelsPublic.Header.Set("Authorization", "Bearer "+token2)
	recGetChannelsPublic := httptest.NewRecorder()
	handler.ServeHTTP(recGetChannelsPublic, reqGetChannelsPublic)
	if recGetChannelsPublic.Code != http.StatusOK {
		t.Errorf("expected 200 OK for querying public room channels without membership, got %d (body: %s)", recGetChannelsPublic.Code, recGetChannelsPublic.Body.String())
	}
}
