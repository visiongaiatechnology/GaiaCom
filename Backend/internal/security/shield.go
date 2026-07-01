// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/httpx"
	"gaiacom/backend/repository"
)

type SecuritySystem struct {
	Store         repository.Store
	HMACKey       []byte
	NodeID        string
	rateLimiterMu sync.Mutex
	rateLimits    map[string][]time.Time
	quarantinesMu sync.Mutex
	quarantines   map[string]time.Time
}

var instance *SecuritySystem
var once sync.Once

func NewSecuritySystem(store repository.Store) *SecuritySystem {
	once.Do(func() {
		keyStr := os.Getenv("GAIACOM_SHIELD_SECRET")
		if keyStr == "" {
			if !devMode() {
				log.Fatal("GAIACOM_SHIELD_SECRET must be set")
			}
			keyStr = "gaiashield_dev_only_signing_key_change_me"
		}
		nodeName := os.Getenv("GAIACOM_SERVER_NAME")
		if nodeName == "" {
			nodeName = "localhost"
		}
		instance = &SecuritySystem{
			Store:       store,
			HMACKey:     []byte(keyStr),
			NodeID:      nodeName,
			rateLimits:  make(map[string][]time.Time),
			quarantines: make(map[string]time.Time),
		}
	})
	return instance
}

func devMode() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE")))
	return value == "1" || value == "true" || value == "yes"
}

func GetInstance() *SecuritySystem {
	return instance
}

// EdgeShieldMiddleware (Layer 1) checks HTTP method, paths, size limits, basic traversals.
func (s *SecuritySystem) EdgeShieldMiddleware() httpx.Middleware {
	return func(next httpx.HandlerFunc) httpx.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next(w, r)
				return
			}

			// 1. Path Normalization / Traversal
			normalizedPath := strings.ToLower(r.URL.Path)
			if strings.Contains(normalizedPath, "..") || strings.Contains(normalizedPath, "//") {
				s.RecordSecurityEvent(r.Context(), nil, nil, "malformed_request", "medium", "edge_shield",
					"Verdächtiger Pfadaufruf (Path Traversal Versuch) blockiert.", "temporary_block", r)
				httpx.WriteError(w, http.StatusBadRequest, "Forbidden: Path traversal anomaly")
				return
			}

			// 2. Request body size check (max 10MB overall)
			r.Body = http.MaxBytesReader(w, r.Body, 35*1024*1024)

			// 3. Rate limiting (Layer 1)
			ip := clientIP(r)
			if s.isIPRateLimited(ip, 600, 1*time.Minute) { // max 600 requests/minute
				s.RecordSecurityEvent(r.Context(), nil, nil, "rate_limit", "medium", "edge_shield",
					"Anfragerate von IP-Adresse überschritten.", "rate_limit", r)
				httpx.WriteError(w, http.StatusTooManyRequests, "Too many requests. Rate limit active.")
				return
			}

			// 4. Basic content type enforcement for POST/PUT
			if r.Method == http.MethodPost || r.Method == http.MethodPut {
				contentType := r.Header.Get("Content-Type")
				if contentType != "" && !strings.Contains(contentType, "application/json") && !strings.Contains(contentType, "multipart/form-data") {
					s.RecordSecurityEvent(r.Context(), nil, nil, "malformed_request", "low", "edge_shield",
						"Ungültiger Content-Type im Request blockiert.", "reject", r)
					httpx.WriteError(w, http.StatusUnsupportedMediaType, "Unsupported Media Type")
					return
				}
			}

			next(w, r)
		}
	}
}

func (s *SecuritySystem) isIPRateLimited(ip string, limit int, duration time.Duration) bool {
	s.rateLimiterMu.Lock()
	defer s.rateLimiterMu.Unlock()

	now := time.Now()
	timestamps := s.rateLimits[ip]

	// filter old timestamps
	var valid []time.Time
	for _, t := range timestamps {
		if now.Sub(t) < duration {
			valid = append(valid, t)
		}
	}

	if len(valid) >= limit {
		s.rateLimits[ip] = valid
		return true
	}

	valid = append(valid, now)
	s.rateLimits[ip] = valid
	return false
}
