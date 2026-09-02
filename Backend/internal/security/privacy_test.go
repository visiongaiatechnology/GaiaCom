package security

import (
	"net/http/httptest"
	"testing"
)

func TestClientIPRejectsForwardedHeadersFromDirectPeer(t *testing.T) {
	t.Setenv("GAIACOM_TRUSTED_PROXY_CIDRS", "")
	req := httptest.NewRequest("GET", "https://node.example.test", nil)
	req.RemoteAddr = "198.51.100.24:443"
	req.Header.Set("X-Forwarded-For", "203.0.113.88")
	req.Header.Set("X-Real-IP", "203.0.113.89")

	if got := ClientIP(req); got != "198.51.100.24" {
		t.Fatalf("direct peer must not control forwarded headers: got %q", got)
	}
}

func TestClientIPAcceptsForwardedHeaderOnlyFromConfiguredProxy(t *testing.T) {
	t.Setenv("GAIACOM_TRUSTED_PROXY_CIDRS", "198.51.100.0/24")
	req := httptest.NewRequest("GET", "https://node.example.test", nil)
	req.RemoteAddr = "198.51.100.24:443"
	req.Header.Set("X-Forwarded-For", "203.0.113.88, 198.51.100.24")

	if got := ClientIP(req); got != "203.0.113.88" {
		t.Fatalf("trusted proxy header was not accepted: got %q", got)
	}
}

func TestClientIPFallsBackToTrustedProxyPeerForMalformedHeader(t *testing.T) {
	t.Setenv("GAIACOM_TRUSTED_PROXY_CIDRS", "198.51.100.0/24")
	req := httptest.NewRequest("GET", "https://node.example.test", nil)
	req.RemoteAddr = "198.51.100.24:443"
	req.Header.Set("X-Forwarded-For", "not-an-ip")

	if got := ClientIP(req); got != "198.51.100.24" {
		t.Fatalf("malformed forwarded header must fall back to proxy peer: got %q", got)
	}
}

func TestRequestBodyLimitsAreRouteScoped(t *testing.T) {
	if got := requestBodyLimit("/api/v1/auth/login"); got != 32*1024 {
		t.Fatalf("auth limit = %d", got)
	}
	if got := requestBodyLimit("/api/v1/devices/pairings/id/approve"); got != 128*1024 {
		t.Fatalf("pairing limit = %d", got)
	}
	if got := requestBodyLimit("/api/v1/storage/chunk"); got != 2*1024*1024 {
		t.Fatalf("chunk limit = %d", got)
	}
	if got := requestBodyLimit("/api/v1/mailbox/settings"); got > 256*1024 {
		t.Fatalf("default JSON limit too broad: %d", got)
	}
}
