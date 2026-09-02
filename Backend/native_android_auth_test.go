// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaiacom/backend/auth"
)

const nativeAndroidTestPassword = "correct-horse-battery-staple"

func TestAndroidNativeHeaderEnablesLoginAndRefreshWithoutCORSOrigin(t *testing.T) {
	handler := newNativeAndroidTestHandler(t)
	loginResponse := performAndroidLogin(t, handler)
	loginPayload := decodeNativeObject(t, loginResponse)
	accessToken := requireNativeString(t, loginPayload, "access_token")
	refreshToken := requireNativeString(t, loginPayload, "refresh_token")
	if loginResponse.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("originless native request unexpectedly received CORS headers")
	}

	statusRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/status", nil)
	statusRequest.Header.Set("Authorization", "Bearer "+accessToken)
	statusResponse := httptest.NewRecorder()
	handler.ServeHTTP(statusResponse, statusRequest)
	if statusResponse.Code != http.StatusOK {
		t.Fatalf("Android bearer token rejected: %d %s", statusResponse.Code, statusResponse.Body.String())
	}

	refreshResponse := httptest.NewRecorder()
	handler.ServeHTTP(refreshResponse, androidRefreshRequest(refreshToken))
	if refreshResponse.Code != http.StatusOK {
		t.Fatalf("Android refresh rejected: %d %s", refreshResponse.Code, refreshResponse.Body.String())
	}
	rotated := decodeNativeObject(t, refreshResponse)
	if requireNativeString(t, rotated, "refresh_token") == refreshToken {
		t.Fatal("Android refresh token was not rotated")
	}
	requireNativeString(t, rotated, "access_token")
}

func TestBrowserContextAndHeaderVariantsNeverReceiveNativeLoginTokens(t *testing.T) {
	handler := newNativeAndroidTestHandler(t)
	testCases := []struct {
		name      string
		configure func(*http.Request)
	}{
		{name: "missing-client-header", configure: func(*http.Request) {}},
		{
			name: "wrong-client-id",
			configure: func(request *http.Request) {
				request.Header.Set(auth.AndroidNativeClientHeader, "android-native-v2")
			},
		},
		{
			name: "client-id-case-variant",
			configure: func(request *http.Request) {
				request.Header.Set(auth.AndroidNativeClientHeader, "ANDROID-NATIVE-V1")
			},
		},
		{
			name: "ambiguous-client-id",
			configure: func(request *http.Request) {
				request.Header.Add(auth.AndroidNativeClientHeader, auth.AndroidNativeClientID)
				request.Header.Add(auth.AndroidNativeClientHeader, "attacker")
			},
		},
		{
			name: "browser-origin",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Origin", "https://beta.gaiacom.de")
			},
		},
		{
			name: "retired-appassets-origin",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Origin", "https://appassets.androidplatform.net")
			},
		},
		{
			name: "null-origin",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Origin", "null")
			},
		},
		{
			name: "browser-fetch-site",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Sec-Fetch-Site", "same-origin")
			},
		},
		{
			name: "browser-fetch-mode",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Sec-Fetch-Mode", "cors")
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := nativeAndroidLoginRequest()
			testCase.configure(request)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Fatalf("login failed: %d %s", response.Code, response.Body.String())
			}
			assertNoNativeTokenJSON(t, decodeNativeObject(t, response))
		})
	}
}

func TestInvalidAndroidContextCannotSubmitOrConsumeBodyRefreshToken(t *testing.T) {
	handler := newNativeAndroidTestHandler(t)
	refreshToken := requireNativeString(t, decodeNativeObject(t, performAndroidLogin(t, handler)), "refresh_token")

	testCases := []struct {
		name      string
		configure func(*http.Request)
	}{
		{name: "missing-client-header", configure: func(*http.Request) {}},
		{
			name: "browser-origin",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Origin", "https://beta.gaiacom.de")
			},
		},
		{
			name: "retired-appassets-origin",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Origin", "https://appassets.androidplatform.net")
			},
		},
		{
			name: "browser-fetch-metadata",
			configure: func(request *http.Request) {
				setAndroidNativeHeader(request)
				request.Header.Set("Sec-Fetch-Dest", "empty")
			},
		},
		{
			name: "wrong-client-id",
			configure: func(request *http.Request) {
				request.Header.Set(auth.AndroidNativeClientHeader, "android-native-v1-attacker")
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := rawRefreshRequest(refreshToken)
			testCase.configure(request)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf("invalid native refresh accepted: %d %s", response.Code, response.Body.String())
			}
			assertNoNativeTokenJSON(t, decodeNativeObject(t, response))
		})
	}

	trustedResponse := httptest.NewRecorder()
	handler.ServeHTTP(trustedResponse, androidRefreshRequest(refreshToken))
	if trustedResponse.Code != http.StatusOK {
		t.Fatalf("invalid requests consumed the refresh token: %d %s", trustedResponse.Code, trustedResponse.Body.String())
	}
	assertNativeTokenJSON(t, decodeNativeObject(t, trustedResponse))
}

func TestBrowserCookieRefreshNeverReturnsTokensInJSON(t *testing.T) {
	handler := newNativeAndroidTestHandler(t)
	loginRequest := nativeAndroidLoginRequest()
	loginRequest.Header.Set("Origin", "https://beta.gaiacom.de")
	loginRequest.Header.Set(auth.AndroidNativeClientHeader, auth.AndroidNativeClientID)
	loginRequest.Header.Set("Sec-Fetch-Site", "same-origin")
	loginResponse := httptest.NewRecorder()
	handler.ServeHTTP(loginResponse, loginRequest)
	if loginResponse.Code != http.StatusOK {
		t.Fatalf("browser login failed: %d %s", loginResponse.Code, loginResponse.Body.String())
	}
	assertNoNativeTokenJSON(t, decodeNativeObject(t, loginResponse))
	refreshCookie := requireResponseCookie(t, loginResponse, "refresh_token")

	refreshRequest := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBufferString(`{}`))
	refreshRequest.Header.Set("Origin", "https://beta.gaiacom.de")
	refreshRequest.Header.Set(auth.AndroidNativeClientHeader, auth.AndroidNativeClientID)
	refreshRequest.Header.Set("Sec-Fetch-Mode", "cors")
	refreshRequest.AddCookie(refreshCookie)
	refreshResponse := httptest.NewRecorder()
	handler.ServeHTTP(refreshResponse, refreshRequest)
	if refreshResponse.Code != http.StatusOK {
		t.Fatalf("browser cookie refresh failed: %d %s", refreshResponse.Code, refreshResponse.Body.String())
	}
	assertNoNativeTokenJSON(t, decodeNativeObject(t, refreshResponse))
}

func TestProductionCORSRejectsRetiredAndroidOriginAndClientHeaderSpoofing(t *testing.T) {
	handler := newNativeAndroidTestHandler(t)

	allowed := corsPreflight(handler, auth.TauriAppOrigin, http.MethodPost, "content-type")
	if allowed.Code != http.StatusNoContent {
		t.Fatalf("Tauri preflight rejected: %d", allowed.Code)
	}
	if allowed.Header().Get("Access-Control-Allow-Origin") != auth.TauriAppOrigin {
		t.Fatal("Tauri preflight missing exact allow-origin")
	}

	rejected := []struct {
		name    string
		origin  string
		method  string
		headers string
	}{
		{name: "retired-appassets", origin: "https://appassets.androidplatform.net", method: http.MethodPost, headers: "content-type"},
		{name: "foreign-origin", origin: "https://evil.example", method: http.MethodPost, headers: "content-type"},
		{name: "production-localhost", origin: "http://localhost:3000", method: http.MethodPost, headers: "content-type"},
		{name: "native-header-via-tauri-cors", origin: auth.TauriAppOrigin, method: http.MethodPost, headers: "content-type, x-gaia-client"},
		{name: "unsupported-method", origin: auth.TauriAppOrigin, method: http.MethodPatch, headers: "content-type"},
	}
	for _, testCase := range rejected {
		t.Run(testCase.name, func(t *testing.T) {
			response := corsPreflight(handler, testCase.origin, testCase.method, testCase.headers)
			if response.Code != http.StatusForbidden {
				t.Fatalf("invalid preflight accepted: %d", response.Code)
			}
			if response.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("invalid preflight received allow-origin")
			}
		})
	}
}

func newNativeAndroidTestHandler(t *testing.T) http.Handler {
	t.Helper()
	store, cleanup := setupTestStore(t)
	t.Cleanup(cleanup)
	handler := setupTestHandler(t, store)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(
		`{"username":"android-native-user","password":"`+nativeAndroidTestPassword+`","public_key":"android-native-public-key"}`,
	))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("register native Android test user: %d %s", response.Code, response.Body.String())
	}
	return handler
}

func nativeAndroidLoginRequest() *http.Request {
	return httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(
		`{"username":"android-native-user","password":"`+nativeAndroidTestPassword+`"}`,
	))
}

func performAndroidLogin(t *testing.T, handler http.Handler) *httptest.ResponseRecorder {
	t.Helper()
	request := nativeAndroidLoginRequest()
	setAndroidNativeHeader(request)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("Android native login failed: %d %s", response.Code, response.Body.String())
	}
	return response
}

func setAndroidNativeHeader(request *http.Request) {
	request.Header.Set(auth.AndroidNativeClientHeader, auth.AndroidNativeClientID)
}

func rawRefreshRequest(token string) *http.Request {
	return httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBufferString(
		`{"refreshToken":"`+token+`"}`,
	))
}

func androidRefreshRequest(token string) *http.Request {
	request := rawRefreshRequest(token)
	setAndroidNativeHeader(request)
	return request
}

func corsPreflight(handler http.Handler, origin, method, headers string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", origin)
	request.Header.Set("Access-Control-Request-Method", method)
	if headers != "" {
		request.Header.Set("Access-Control-Request-Headers", headers)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func decodeNativeObject(t *testing.T, response *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode JSON response: %v", err)
	}
	return payload
}

func requireNativeString(t *testing.T, payload map[string]any, field string) string {
	t.Helper()
	value, ok := payload[field].(string)
	if !ok || value == "" {
		t.Fatalf("missing non-empty %s", field)
	}
	return value
}

func assertNativeTokenJSON(t *testing.T, payload map[string]any) {
	t.Helper()
	requireNativeString(t, payload, "access_token")
	requireNativeString(t, payload, "refresh_token")
}

func assertNoNativeTokenJSON(t *testing.T, payload map[string]any) {
	t.Helper()
	for _, field := range []string{"access_token", "refresh_token", "token_type", "refresh_expires_in"} {
		if _, exists := payload[field]; exists {
			t.Fatalf("response leaked native token field %q", field)
		}
	}
}

func requireResponseCookie(t *testing.T, response *httptest.ResponseRecorder, name string) *http.Cookie {
	t.Helper()
	for _, cookie := range response.Result().Cookies() {
		if cookie.Name == name && cookie.Value != "" {
			return cookie
		}
	}
	t.Fatalf("missing response cookie %q", name)
	return nil
}
