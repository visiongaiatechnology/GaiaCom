package backend

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDesktopLoginReturnsMemoryOnlyBearerToken(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()
	handler := setupTestHandler(t, store)

	registerBody := []byte(`{"username":"desktop-user","password":"correct-horse-battery-staple","public_key":"desktop-public-key"}`)
	registerRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(registerBody))
	registerResponse := httptest.NewRecorder()
	handler.ServeHTTP(registerResponse, registerRequest)
	if registerResponse.Code != http.StatusCreated {
		t.Fatalf("registration failed: %d %s", registerResponse.Code, registerResponse.Body.String())
	}

	loginBody := []byte(`{"username":"desktop-user","password":"correct-horse-battery-staple"}`)
	browserRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	browserRequest.Header.Set("Origin", "https://beta.gaiacom.de")
	browserResponse := httptest.NewRecorder()
	handler.ServeHTTP(browserResponse, browserRequest)
	if browserResponse.Code != http.StatusOK {
		t.Fatalf("browser login failed: %d %s", browserResponse.Code, browserResponse.Body.String())
	}
	var browserPayload map[string]any
	if err := json.Unmarshal(browserResponse.Body.Bytes(), &browserPayload); err != nil {
		t.Fatalf("decode browser response: %v", err)
	}
	if _, exists := browserPayload["access_token"]; exists {
		t.Fatal("browser login response leaked a bearer token")
	}

	desktopRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	desktopRequest.Header.Set("Origin", "tauri://localhost")
	desktopResponse := httptest.NewRecorder()
	handler.ServeHTTP(desktopResponse, desktopRequest)
	if desktopResponse.Code != http.StatusOK {
		t.Fatalf("desktop login failed: %d %s", desktopResponse.Code, desktopResponse.Body.String())
	}
	var desktopPayload map[string]any
	if err := json.Unmarshal(desktopResponse.Body.Bytes(), &desktopPayload); err != nil {
		t.Fatalf("decode desktop response: %v", err)
	}
	token, ok := desktopPayload["access_token"].(string)
	if !ok || token == "" {
		t.Fatal("desktop login did not return an in-memory bearer token")
	}
	if refresh, ok := desktopPayload["refresh_token"].(string); !ok || refresh == "" {
		t.Fatal("desktop login did not return a memory-only refresh token")
	}

	statusRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/status", nil)
	statusRequest.Header.Set("Authorization", "Bearer "+token)
	statusResponse := httptest.NewRecorder()
	handler.ServeHTTP(statusResponse, statusRequest)
	if statusResponse.Code != http.StatusOK {
		t.Fatalf("desktop bearer token was not accepted: %d %s", statusResponse.Code, statusResponse.Body.String())
	}
}

func TestLogoutAndPasswordChangeInvalidateSessions(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()
	handler := setupTestHandler(t, store)
	register := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(`{"username":"session-user","password":"correct-horse-battery-staple","public_key":"pk"}`))
	handler.ServeHTTP(httptest.NewRecorder(), register)
	login := func() string {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"username":"session-user","password":"correct-horse-battery-staple"}`))
		req.Header.Set("Origin", "tauri://localhost")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		var payload map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &payload)
		return payload["access_token"].(string)
	}
	first, second := login(), login()
	change := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewBufferString(`{"currentPassword":"correct-horse-battery-staple","newPassword":"another-correct-horse-battery"}`))
	change.Header.Set("Authorization", "Bearer "+first)
	changeRec := httptest.NewRecorder()
	handler.ServeHTTP(changeRec, change)
	if changeRec.Code != http.StatusOK {
		t.Fatalf("password change failed: %d %s", changeRec.Code, changeRec.Body.String())
	}
	stale := httptest.NewRequest(http.MethodGet, "/api/v1/auth/devices", nil)
	stale.Header.Set("Authorization", "Bearer "+second)
	staleRec := httptest.NewRecorder()
	handler.ServeHTTP(staleRec, stale)
	if staleRec.Code != http.StatusUnauthorized {
		t.Fatalf("old session survived password change: %d", staleRec.Code)
	}
	logout := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBufferString(`{}`))
	logout.Header.Set("Authorization", "Bearer "+first)
	logoutRec := httptest.NewRecorder()
	handler.ServeHTTP(logoutRec, logout)
	if logoutRec.Code != http.StatusOK {
		t.Fatalf("logout failed: %d %s", logoutRec.Code, logoutRec.Body.String())
	}
	after := httptest.NewRequest(http.MethodGet, "/api/v1/auth/devices", nil)
	after.Header.Set("Authorization", "Bearer "+first)
	afterRec := httptest.NewRecorder()
	handler.ServeHTTP(afterRec, after)
	if afterRec.Code != http.StatusUnauthorized {
		t.Fatalf("logged out session remained active: %d", afterRec.Code)
	}
}

func TestDesktopRefreshRotatesAndRejectsReplay(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()
	handler := setupTestHandler(t, store)
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(`{"username":"refresh-user","password":"correct-horse-battery-staple","public_key":"pk"}`)))
	login := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"username":"refresh-user","password":"correct-horse-battery-staple"}`))
	login.Header.Set("Origin", "tauri://localhost")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, login)
	var loggedIn map[string]any
	_ = json.Unmarshal(loginRec.Body.Bytes(), &loggedIn)
	oldRefresh := loggedIn["refresh_token"].(string)
	refresh := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBufferString(`{"refreshToken":"`+oldRefresh+`"}`))
	refresh.Header.Set("Origin", "tauri://localhost")
	refreshRec := httptest.NewRecorder()
	handler.ServeHTTP(refreshRec, refresh)
	if refreshRec.Code != http.StatusOK {
		t.Fatalf("refresh failed: %d %s", refreshRec.Code, refreshRec.Body.String())
	}
	var rotated map[string]any
	_ = json.Unmarshal(refreshRec.Body.Bytes(), &rotated)
	if rotated["refresh_token"] == oldRefresh || rotated["access_token"] == "" {
		t.Fatal("refresh tokens were not rotated")
	}
	replay := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBufferString(`{"refreshToken":"`+oldRefresh+`"}`))
	replay.Header.Set("Origin", "tauri://localhost")
	replayRec := httptest.NewRecorder()
	handler.ServeHTTP(replayRec, replay)
	if replayRec.Code != http.StatusUnauthorized {
		t.Fatalf("refresh replay accepted: %d", replayRec.Code)
	}
}

func TestNotificationPreferencesAreAccountScopedAndPersisted(t *testing.T) {
	store, cleanup := setupTestStore(t)
	defer cleanup()
	handler := setupTestHandler(t, store)

	registerBody := []byte(`{"username":"preferences-user","password":"correct-horse-battery-staple","public_key":"preferences-public-key"}`)
	registerResponse := httptest.NewRecorder()
	handler.ServeHTTP(registerResponse, httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(registerBody)))
	if registerResponse.Code != http.StatusCreated {
		t.Fatalf("registration failed: %d %s", registerResponse.Code, registerResponse.Body.String())
	}

	loginBody := []byte(`{"username":"preferences-user","password":"correct-horse-battery-staple"}`)
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	loginRequest.Header.Set("Origin", "tauri://localhost")
	loginResponse := httptest.NewRecorder()
	handler.ServeHTTP(loginResponse, loginRequest)
	var loginPayload map[string]any
	if err := json.Unmarshal(loginResponse.Body.Bytes(), &loginPayload); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	token, _ := loginPayload["access_token"].(string)
	if token == "" {
		t.Fatal("missing desktop token")
	}

	defaultRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/notification-preferences", nil)
	defaultRequest.Header.Set("Authorization", "Bearer "+token)
	defaultResponse := httptest.NewRecorder()
	handler.ServeHTTP(defaultResponse, defaultRequest)
	if defaultResponse.Code != http.StatusOK {
		t.Fatalf("default preference read failed: %d %s", defaultResponse.Code, defaultResponse.Body.String())
	}
	var defaults map[string]any
	if err := json.Unmarshal(defaultResponse.Body.Bytes(), &defaults); err != nil {
		t.Fatalf("decode default preferences: %v", err)
	}
	if defaults["showPreview"] != false || defaults["quietHoursStart"] != "22:00" {
		t.Fatalf("unexpected secure defaults: %#v", defaults)
	}

	updateBody := []byte(`{"enabled":true,"showPreview":true,"quietHoursEnabled":true,"quietHoursStart":"23:30","quietHoursEnd":"06:45"}`)
	updateRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/notification-preferences", bytes.NewReader(updateBody))
	updateRequest.Header.Set("Authorization", "Bearer "+token)
	updateResponse := httptest.NewRecorder()
	handler.ServeHTTP(updateResponse, updateRequest)
	if updateResponse.Code != http.StatusOK {
		t.Fatalf("preference update failed: %d %s", updateResponse.Code, updateResponse.Body.String())
	}

	verifyRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/notification-preferences", nil)
	verifyRequest.Header.Set("Authorization", "Bearer "+token)
	verifyResponse := httptest.NewRecorder()
	handler.ServeHTTP(verifyResponse, verifyRequest)
	var saved map[string]any
	if err := json.Unmarshal(verifyResponse.Body.Bytes(), &saved); err != nil {
		t.Fatalf("decode persisted preferences: %v", err)
	}
	if saved["showPreview"] != true || saved["quietHoursStart"] != "23:30" || saved["quietHoursEnd"] != "06:45" {
		t.Fatalf("preferences were not persisted: %#v", saved)
	}
}
