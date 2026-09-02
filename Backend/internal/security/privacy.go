package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"os"
	"strings"
)

func (s *SecuritySystem) HashIP(ip string) string {
	if ip == "" {
		return ""
	}
	h := hmac.New(sha256.New, s.HMACKey)
	h.Write([]byte(ip))
	return "hmac_sha256:" + hex.EncodeToString(h.Sum(nil))
}

func (s *SecuritySystem) HashUserAgent(ua string) string {
	if ua == "" {
		return ""
	}
	h := hmac.New(sha256.New, s.HMACKey)
	h.Write([]byte(ua))
	return "hmac_sha256:" + hex.EncodeToString(h.Sum(nil))
}

func (s *SecuritySystem) CoarseGeo(ip string) string {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return "Unknown"
	}

	// Simple coarse categorization
	if parsedIP.IsLoopback() || parsedIP.IsPrivate() {
		return "Local / Private Network"
	}

	// Mock geolocation prefix or basic mock mappings
	// (In a real system, we'd query an offline GeoIP database, but since we are zero-knowledge and don't track users, we keep it coarse and generic)
	parts := strings.Split(ip, ".")
	if len(parts) > 0 {
		switch parts[0] {
		case "82", "85", "87", "91", "109", "178":
			return "DE" // Germany/Europe coarse range
		case "73", "98", "104", "107":
			return "US" // North America coarse range
		default:
			return "EU" // Fallback to a safe region indicator
		}
	}
	return "Global"
}

// ClientIP returns the direct peer address unless the request came through an
// explicitly configured reverse proxy. Forwarded headers are untrusted on a
// direct connection and must not affect rate limits or security events.
func ClientIP(r *http.Request) string {
	remoteIP := remotePeerIP(r.RemoteAddr)
	if remoteIP == "" || !isTrustedProxy(remoteIP) {
		return remoteIP
	}

	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			value = strings.TrimSpace(strings.Split(value, ",")[0])
		}
		if parsed := net.ParseIP(value); parsed != nil {
			return parsed.String()
		}
	}
	return remoteIP
}

func clientIP(r *http.Request) string {
	return ClientIP(r)
}

func remotePeerIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(remoteAddr))
	if err != nil {
		host = strings.TrimSpace(remoteAddr)
	}
	if parsed := net.ParseIP(host); parsed != nil {
		return parsed.String()
	}
	return ""
}

func isTrustedProxy(remoteIP string) bool {
	parsedRemote := net.ParseIP(remoteIP)
	if parsedRemote == nil {
		return false
	}
	for _, rawCIDR := range strings.Split(os.Getenv("GAIACOM_TRUSTED_PROXY_CIDRS"), ",") {
		cidr := strings.TrimSpace(rawCIDR)
		if cidr == "" {
			continue
		}
		_, network, err := net.ParseCIDR(cidr)
		if err == nil && network.Contains(parsedRemote) {
			return true
		}
	}
	return false
}
