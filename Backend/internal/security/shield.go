// STATUS: DIAMANT VGT SUPREME
package security

import (
	"container/list"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
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
	rateLimits    map[string]*rateLimitEntry
	rateLimitLRU  *list.List
	quarantinesMu sync.Mutex
	quarantines   map[string]time.Time
	criticalMu    sync.Mutex
	critical      map[string]criticalRateLimitEntry
}

type SystemConfig struct {
	HMACKey []byte
	NodeID  string
}

const maxRateLimitEntries = 50000

type rateLimitEntry struct {
	key        string
	tokens     float64
	lastRefill time.Time
	expiresAt  time.Time
	element    *list.Element
}

type criticalRateLimitEntry struct {
	count     int
	expiresAt time.Time
}

func NewSecuritySystem(store repository.Store) (*SecuritySystem, error) {
	keyStr := os.Getenv("GAIACOM_SHIELD_SECRET")
	if keyStr == "" {
		if !devMode() {
			return nil, errors.New("GAIACOM_SHIELD_SECRET must be set")
		}
		keyStr = "gaiashield_dev_only_signing_key_change_me"
	}
	if !devMode() && len(keyStr) < 32 {
		return nil, errors.New("GAIACOM_SHIELD_SECRET must contain at least 32 bytes")
	}
	nodeName := os.Getenv("GAIACOM_SERVER_NAME")
	if nodeName == "" {
		nodeName = "localhost"
	}
	return NewSecuritySystemWithConfig(store, SystemConfig{
		HMACKey: []byte(keyStr),
		NodeID:  nodeName,
	})
}

func NewSecuritySystemWithConfig(store repository.Store, config SystemConfig) (*SecuritySystem, error) {
	if store == nil {
		return nil, errors.New("security store is required")
	}
	if len(config.HMACKey) < 32 {
		return nil, errors.New("GaiaShield signing key must contain at least 32 bytes")
	}
	nodeID := strings.ToLower(strings.TrimSpace(config.NodeID))
	if nodeID == "" {
		return nil, errors.New("GaiaShield node identity is required")
	}
	return &SecuritySystem{
		Store:        store,
		HMACKey:      append([]byte(nil), config.HMACKey...),
		NodeID:       nodeID,
		rateLimits:   make(map[string]*rateLimitEntry),
		rateLimitLRU: list.New(),
		quarantines:  make(map[string]time.Time),
		critical:     make(map[string]criticalRateLimitEntry),
	}, nil
}

func devMode() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE")))
	return value == "1" || value == "true" || value == "yes"
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

			// 2. Route-scoped request limits prevent small JSON endpoints from
			// inheriting upload-sized memory/CPU exposure.
			r.Body = http.MaxBytesReader(w, r.Body, requestBodyLimit(r.URL.Path))

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

func requestBodyLimit(path string) int64 {
	switch {
	case strings.HasPrefix(path, "/api/v1/auth/"):
		return 32 * 1024
	case strings.HasPrefix(path, "/api/v1/devices/pairings"):
		return 128 * 1024
	case path == "/api/v1/storage/chunk":
		return 2 * 1024 * 1024
	case strings.Contains(path, "/disclosures") || strings.Contains(path, "/gaias-eyes/"):
		return 2 * 1024 * 1024
	case strings.HasPrefix(path, "/api/v1/messaging/") || strings.HasPrefix(path, "/api/v1/public-channels/"):
		return 1024 * 1024
	default:
		return 256 * 1024
	}
}

func (s *SecuritySystem) isIPRateLimited(ip string, limit int, duration time.Duration) bool {
	if ip == "" || limit <= 0 || duration <= 0 {
		return true
	}
	s.rateLimiterMu.Lock()
	defer s.rateLimiterMu.Unlock()

	now := time.Now()
	if s.rateLimits == nil {
		s.rateLimits = make(map[string]*rateLimitEntry)
	}
	if s.rateLimitLRU == nil {
		s.rateLimitLRU = list.New()
	}
	for {
		oldestElement := s.rateLimitLRU.Back()
		if oldestElement == nil {
			break
		}
		oldest := oldestElement.Value.(*rateLimitEntry)
		if now.Before(oldest.expiresAt) {
			break
		}
		delete(s.rateLimits, oldest.key)
		s.rateLimitLRU.Remove(oldestElement)
	}

	if entry, exists := s.rateLimits[ip]; exists {
		refillRate := float64(limit) / duration.Seconds()
		entry.tokens += now.Sub(entry.lastRefill).Seconds() * refillRate
		if entry.tokens > float64(limit) {
			entry.tokens = float64(limit)
		}
		entry.lastRefill = now
		entry.expiresAt = now.Add(duration)
		s.rateLimitLRU.MoveToFront(entry.element)
		if entry.tokens < 1 {
			return true
		}
		entry.tokens--
		return false
	}

	if len(s.rateLimits) >= maxRateLimitEntries {
		oldestElement := s.rateLimitLRU.Back()
		if oldestElement != nil {
			oldest := oldestElement.Value.(*rateLimitEntry)
			delete(s.rateLimits, oldest.key)
			s.rateLimitLRU.Remove(oldestElement)
		}
	}
	entry := &rateLimitEntry{
		key: ip, tokens: float64(limit - 1), lastRefill: now, expiresAt: now.Add(duration),
	}
	entry.element = s.rateLimitLRU.PushFront(entry)
	s.rateLimits[ip] = entry
	return false
}

func (s *SecuritySystem) incrementCriticalRateLimit(ctx context.Context, scope string, material string, window time.Duration) (int, error) {
	key := s.opaqueRateLimitKey(scope, material)
	if store, ok := s.Store.(repository.DistributedRateLimitStore); ok {
		return store.IncrementSecurityRateLimit(ctx, key, window)
	}

	s.criticalMu.Lock()
	defer s.criticalMu.Unlock()
	now := time.Now()
	if s.critical == nil {
		s.critical = make(map[string]criticalRateLimitEntry)
	}
	entry := s.critical[key]
	if entry.expiresAt.IsZero() || !now.Before(entry.expiresAt) {
		entry = criticalRateLimitEntry{expiresAt: now.Add(window)}
	}
	entry.count++
	s.critical[key] = entry
	if len(s.critical) > maxRateLimitEntries {
		for candidate, candidateEntry := range s.critical {
			if candidate != key && !now.Before(candidateEntry.expiresAt) {
				delete(s.critical, candidate)
			}
		}
		if len(s.critical) > maxRateLimitEntries {
			for candidate := range s.critical {
				if candidate != key {
					delete(s.critical, candidate)
					break
				}
			}
		}
	}
	return entry.count, nil
}

func (s *SecuritySystem) criticalRateLimitCount(ctx context.Context, scope string, material string) (int, error) {
	key := s.opaqueRateLimitKey(scope, material)
	if store, ok := s.Store.(repository.DistributedRateLimitStore); ok {
		return store.GetSecurityRateLimitCount(ctx, key)
	}
	s.criticalMu.Lock()
	defer s.criticalMu.Unlock()
	entry, exists := s.critical[key]
	if !exists || !time.Now().Before(entry.expiresAt) {
		delete(s.critical, key)
		return 0, nil
	}
	return entry.count, nil
}

func (s *SecuritySystem) resetCriticalRateLimit(ctx context.Context, scope string, material string) error {
	key := s.opaqueRateLimitKey(scope, material)
	if store, ok := s.Store.(repository.DistributedRateLimitStore); ok {
		return store.ResetSecurityRateLimit(ctx, key)
	}
	s.criticalMu.Lock()
	delete(s.critical, key)
	s.criticalMu.Unlock()
	return nil
}

func (s *SecuritySystem) opaqueRateLimitKey(scope string, material string) string {
	mac := hmac.New(sha256.New, s.HMACKey)
	_, _ = mac.Write([]byte(scope))
	_, _ = mac.Write([]byte{0})
	_, _ = mac.Write([]byte(material))
	return scope + ":" + hex.EncodeToString(mac.Sum(nil))
}
