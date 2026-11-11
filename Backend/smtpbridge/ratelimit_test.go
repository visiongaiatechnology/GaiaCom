package smtpbridge

import (
	"errors"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSMTPIngestLimiterFixedWindow(t *testing.T) {
	limiter := newSMTPIngestLimiter()
	now := time.Unix(1700000000, 0)
	limiter.now = func() time.Time { return now }

	for i := 0; i < smtpIngestIPMax; i++ {
		if !limiter.allow("smtp-ingest-ip", "203.0.113.7", smtpIngestIPMax, smtpIngestIPWindow) {
			t.Fatalf("request %d inside the IP budget was rejected", i+1)
		}
	}
	if limiter.allow("smtp-ingest-ip", "203.0.113.7", smtpIngestIPMax, smtpIngestIPWindow) {
		t.Fatalf("request above the IP budget was accepted")
	}

	// A different subject has its own counter.
	if !limiter.allow("smtp-ingest-ip", "203.0.113.8", smtpIngestIPMax, smtpIngestIPWindow) {
		t.Fatalf("separate IP subject shared the exhausted counter")
	}

	// After the window elapses the counter resets.
	now = now.Add(smtpIngestIPWindow)
	if !limiter.allow("smtp-ingest-ip", "203.0.113.7", smtpIngestIPMax, smtpIngestIPWindow) {
		t.Fatalf("counter did not reset after the window")
	}
}

func TestSMTPIngestLimiterNilFailsClosed(t *testing.T) {
	var limiter *smtpIngestLimiter
	if limiter.allow("smtp-ingest-ip", "203.0.113.7", 1, time.Minute) {
		t.Fatalf("nil limiter must fail closed")
	}
}

func TestSMTPIngestLimitScopesAreIndependent(t *testing.T) {
	limiter := newSMTPIngestLimiter()
	now := time.Unix(1700000000, 0)
	limiter.now = func() time.Time { return now }

	for i := 0; i < smtpIngestTargetMax; i++ {
		if !limiter.allow("smtp-ingest-target", "target:node", smtpIngestTargetMax, smtpIngestTargetWindow) {
			t.Fatalf("target request %d inside budget rejected", i+1)
		}
	}
	if limiter.allow("smtp-ingest-target", "target:node", smtpIngestTargetMax, smtpIngestTargetWindow) {
		t.Fatalf("target budget exceeded but request accepted")
	}
	if !limiter.allow("smtp-ingest-sender", "sender@example.net", smtpIngestSenderMax, smtpIngestSenderWindow) {
		t.Fatalf("sender scope was not independent of the exhausted target scope")
	}
	if !limiter.allow("smtp-ingest-global", "any", smtpIngestGlobalMax, smtpIngestGlobalWindow) {
		t.Fatalf("global scope was not independent of the exhausted target scope")
	}
}

func TestCheckSMTPIngestLimitsRejectsAfterIPBudget(t *testing.T) {
	handler := &Handler{limiter: newSMTPIngestLimiter()}
	request := httptest.NewRequest("POST", "/api/v1/public/smtp/ingest", nil)
	request.RemoteAddr = "198.51.100.9:2345"

	for i := 0; i < smtpIngestIPMax; i++ {
		if err := handler.CheckSMTPIngestLimits(request, "target:node", "sender@example.net"); err != nil {
			t.Fatalf("request %d inside budget rejected: %v", i+1, err)
		}
	}
	if err := handler.CheckSMTPIngestLimits(request, "target:node", "sender@example.net"); !errors.Is(err, errSMTPRateLimited) {
		t.Fatalf("request above the IP budget got %v, want errSMTPRateLimited", err)
	}
}

func TestCheckSMTPIngestLimitsNilHandlerFailsClosed(t *testing.T) {
	var handler *Handler
	request := httptest.NewRequest("POST", "/api/v1/public/smtp/ingest", nil)
	request.RemoteAddr = "198.51.100.9:2345"
	if err := handler.CheckSMTPIngestLimits(request, "target:node", "sender@example.net"); !errors.Is(err, errSMTPRateLimited) {
		t.Fatalf("nil handler must fail closed, got %v", err)
	}
}
