// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
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

func clientIP(r *http.Request) string {
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
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		if parsed := net.ParseIP(host); parsed != nil {
			return parsed.String()
		}
		return host
	}
	return ""
}
