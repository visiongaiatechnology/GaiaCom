// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRouterMatchesStaticRoute(t *testing.T) {
	router := NewRouter()
	router.GET("/api/v1/auth/status", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/status", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", recorder.Code)
	}
}

func TestRouterExtractsParam(t *testing.T) {
	router := NewRouter()
	router.GET("/api/v1/public/identity/:gaiaID", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"gaiaID": Param(r, "gaiaID")})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/public/identity/@alice:gaia.local", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", recorder.Code)
	}
	if body := recorder.Body.String(); body != "{\"gaiaID\":\"@alice:gaia.local\"}\n" {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestRouterRejectsWrongMethod(t *testing.T) {
	router := NewRouter()
	router.POST("/api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/login", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("unexpected status: %d", recorder.Code)
	}
}

func TestRouterMiddleware(t *testing.T) {
	router := NewRouter()
	router.Use(SecurityHeadersHTTP())
	router.GET("/x", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/x", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("security headers middleware did not run")
	}
}
