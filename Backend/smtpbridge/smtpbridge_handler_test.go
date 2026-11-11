package smtpbridge

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func ingestRequestBody(t *testing.T, target string, externalFrom string) []byte {
	t.Helper()
	body, err := json.Marshal(ingestLegacyInput{
		TargetGaiaID: target,
		ExternalFrom: externalFrom,
		Subject:      "External notice",
		Body:         "Plain text body",
	})
	if err != nil {
		t.Fatalf("encode ingest request: %v", err)
	}
	return body
}

func performIngest(handler *Handler, body []byte, token string, remoteAddr string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/public/smtp/ingest", bytes.NewReader(body))
	request.RemoteAddr = remoteAddr
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("X-Gaia-SMTP-Token", token)
	}
	recorder := httptest.NewRecorder()
	handler.Ingest(recorder, request)
	return recorder
}

func TestIngestHandlerFailsClosedWithoutConfiguredToken(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestServiceWithToken(t, "")
	handler := NewHandler(service)

	recorder := performIngest(handler, ingestRequestBody(t, identity.GaiaID, "source@example.net"), "anything", "203.0.113.7:1200")
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("unconfigured bridge returned %d, want 401", recorder.Code)
	}
}

func TestIngestHandlerRejectsWrongToken(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestService(t)
	handler := NewHandler(service)

	recorder := performIngest(handler, ingestRequestBody(t, identity.GaiaID, "source@example.net"), "wrong-secret", "203.0.113.7:1200")
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("wrong token returned %d, want 401", recorder.Code)
	}
}

func TestIngestHandlerRejectsInvalidJSON(t *testing.T) {
	service, _, _, _ := newSMTPBridgeTestService(t)
	handler := NewHandler(service)

	request := httptest.NewRequest(http.MethodPost, "/api/v1/public/smtp/ingest", strings.NewReader("{not-json"))
	request.RemoteAddr = "203.0.113.7:1200"
	recorder := httptest.NewRecorder()
	handler.Ingest(recorder, request)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("invalid JSON returned %d, want 400", recorder.Code)
	}
}

func TestIngestHandlerRejectsOversizedBody(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestService(t)
	handler := NewHandler(service)

	payload, err := json.Marshal(ingestLegacyInput{
		TargetGaiaID: identity.GaiaID,
		ExternalFrom: "source@example.net",
		Subject:      "External notice",
		Body:         strings.Repeat("x", maxSMTPIngestBodyBytes),
	})
	if err != nil {
		t.Fatalf("encode oversized request: %v", err)
	}
	recorder := performIngest(handler, payload, "ingest-secret", "203.0.113.7:1200")
	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversized ingest body returned %d, want 413", recorder.Code)
	}
}

func TestIngestHandlerRateLimitsPerSourceIP(t *testing.T) {
	service, _, _, identity := newSMTPBridgeTestService(t)
	handler := NewHandler(service)
	body := ingestRequestBody(t, identity.GaiaID, "source@example.net")

	for i := 0; i < smtpIngestIPMax; i++ {
		recorder := performIngest(handler, body, "ingest-secret", "198.51.100.9:2345")
		if recorder.Code != http.StatusAccepted {
			t.Fatalf("ingest %d returned %d, want 202 (%s)", i+1, recorder.Code, recorder.Body.String())
		}
	}
	recorder := performIngest(handler, body, "ingest-secret", "198.51.100.9:2345")
	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("ingest above the IP budget returned %d, want 429", recorder.Code)
	}
}
