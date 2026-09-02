// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAndroidNativeClientRequiresExactHeaderWithoutBrowserMetadata(t *testing.T) {
	testCases := []struct {
		name       string
		configure  func(*http.Request)
		wantNative bool
	}{
		{
			name: "exact-native-contract",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
			},
			wantNative: true,
		},
		{name: "missing-client-header", configure: func(*http.Request) {}},
		{
			name: "wrong-client-id",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, "android-native-v2")
			},
		},
		{
			name: "client-id-case-variant",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, "ANDROID-NATIVE-V1")
			},
		},
		{
			name: "client-id-with-whitespace",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, "android-native-v1 ")
			},
		},
		{
			name: "ambiguous-client-id",
			configure: func(request *http.Request) {
				request.Header.Add(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header.Add(AndroidNativeClientHeader, "attacker")
			},
		},
		{
			name: "https-browser-origin",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header.Set("Origin", "https://beta.gaiacom.de")
			},
		},
		{
			name: "null-browser-origin",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header.Set("Origin", "null")
			},
		},
		{
			name: "present-empty-origin",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header["Origin"] = []string{""}
			},
		},
		{
			name: "fetch-site-metadata",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header.Set("Sec-Fetch-Site", "same-origin")
			},
		},
		{
			name: "fetch-mode-metadata",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header.Set("Sec-Fetch-Mode", "cors")
			},
		},
		{
			name: "present-empty-fetch-metadata",
			configure: func(request *http.Request) {
				request.Header.Set(AndroidNativeClientHeader, AndroidNativeClientID)
				request.Header["Sec-Fetch-Dest"] = []string{""}
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
			testCase.configure(request)
			if actual := isAndroidNativeClientRequest(request); actual != testCase.wantNative {
				t.Fatalf("native classification = %t, want %t", actual, testCase.wantNative)
			}
		})
	}
}

func TestTauriNativeContractsRemainExact(t *testing.T) {
	for _, origin := range []string{TauriAppOrigin, TauriHTTPOrigin} {
		request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		request.Header.Set("Origin", origin)
		request.Header.Set("Sec-Fetch-Mode", "cors")
		if !isNativeClientRequest(request) {
			t.Fatalf("Tauri origin %q was not classified as native", origin)
		}
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", TauriAppOrigin+".attacker.example")
	if isNativeClientRequest(request) {
		t.Fatal("Tauri origin suffix confusion was accepted")
	}
}
