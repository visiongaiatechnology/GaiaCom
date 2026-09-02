package utils

import (
	"context"
	"net"
	"testing"
)

func TestAdversarialIsPrivateIP(t *testing.T) {
	tests := []struct {
		ip   string
		want bool
	}{
		// Loopback
		{"127.0.0.1", true},
		{"127.0.0.2", true},
		{"::1", true},
		// Private networks (RFC 1918)
		{"10.0.0.1", true},
		{"172.16.0.1", true},
		{"172.31.255.255", true},
		{"192.168.1.1", true},
		// Link Local
		{"169.254.169.254", true},
		{"fe80::1", true},
		// Unspecified
		{"0.0.0.0", true},
		{"::", true},
		// CGNAT (100.64.0.0/10)
		{"100.64.0.1", true},
		{"100.127.255.255", true},
		// Benchmarking (198.18.0.0/15)
		{"198.18.0.1", true},
		{"198.19.255.255", true},
		// Documentation Ranges
		{"192.0.2.1", true},
		{"198.51.100.1", true},
		{"203.0.113.1", true},
		// Multicast / Reserved Class E
		{"224.0.0.1", true},
		{"240.0.0.1", true},
		// IPv4-mapped IPv6
		{"::ffff:127.0.0.1", true},
		{"::ffff:10.0.0.1", true},
		{"::ffff:192.168.1.1", true},
		{"::ffff:0.0.0.0", true},
		// Public IPs (should NOT be classified as private)
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"104.244.42.1", false},
		{"2001:4860:4860::8888", false},
	}

	for _, tt := range tests {
		ip := net.ParseIP(tt.ip)
		if ip == nil {
			t.Fatalf("failed to parse test IP: %s", tt.ip)
		}
		got := IsPrivateIP(ip)
		if got != tt.want {
			t.Errorf("IsPrivateIP(%s) = %v; want %v", tt.ip, got, tt.want)
		}
	}
}

func TestAdversarialSafeDialContextProduction(t *testing.T) {
	// In production (devMode = false), SafeDialContext must block private IPs and block non-80/443 ports
	dialContext := SafeDialContext(false)

	// 1. Check private IP dialing is blocked
	_, err := dialContext(context.Background(), "tcp", "127.0.0.1:80")
	if err == nil {
		t.Error("expected dial to private IP 127.0.0.1 to be blocked in production, but succeeded")
	}

	_, err = dialContext(context.Background(), "tcp", "10.0.0.1:443")
	if err == nil {
		t.Error("expected dial to private IP 10.0.0.1 to be blocked in production, but succeeded")
	}

	_, err = dialContext(context.Background(), "tcp", "::ffff:127.0.0.1:80")
	if err == nil {
		t.Error("expected dial to IPv4-mapped loopback ::ffff:127.0.0.1 to be blocked in production, but succeeded")
	}

	// 2. Check non-standard port dialing is blocked
	// We use a public IP to isolate the port check (e.g. 8.8.8.8)
	_, err = dialContext(context.Background(), "tcp", "8.8.8.8:8080")
	if err == nil {
		t.Error("expected dial to non-standard port 8080 on public IP to be blocked in production, but succeeded")
	}

	_, err = dialContext(context.Background(), "tcp", "8.8.8.8:22")
	if err == nil {
		t.Error("expected dial to port 22 to be blocked in production, but succeeded")
	}
}
