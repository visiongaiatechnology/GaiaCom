package smtpbridge

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/internal/security"
)

// SMTP bridge ingest budgets (FIND-006 / P-06, in-wave hardening).
//
// The legacy bridge has no per-message signature yet (see the FIND-006 residual
// "bridge protocol v2"), so the only in-wave lever against a leaked static token
// is a bounded, auditable budget. Limits are deliberately generous for a real
// bridge and low enough to bound abuse:
//
//   - per source IP:        30 accepted ingests / 5 minutes
//   - per target GaiaID:    60 accepted ingests / hour
//   - per external sender:   30 accepted ingests / hour
//   - node-wide:          2000 accepted ingests / hour
//
// Counters are fixed windows in memory (reset on process restart). Rejections
// fail closed with HTTP 429 and are recorded through the GaiaShield event path.
const (
	smtpIngestIPWindow     = 5 * time.Minute
	smtpIngestIPMax        = 30
	smtpIngestTargetWindow = time.Hour
	smtpIngestTargetMax    = 60
	smtpIngestSenderWindow = time.Hour
	smtpIngestSenderMax    = 30
	smtpIngestGlobalWindow = time.Hour
	smtpIngestGlobalMax    = 2000

	// maxSMTPIngestLimiterKeys bounds the in-memory counter map. When the map
	// exceeds the cap it is dropped, which can only make the limiter stricter
	// (fail closed), never more permissive.
	maxSMTPIngestLimiterKeys = 20000
)

type smtpIngestRateWindow struct {
	started time.Time
	count   int
}

type smtpIngestLimiter struct {
	mu      sync.Mutex
	now     func() time.Time
	entries map[string]smtpIngestRateWindow
}

func newSMTPIngestLimiter() *smtpIngestLimiter {
	return &smtpIngestLimiter{
		now:     time.Now,
		entries: make(map[string]smtpIngestRateWindow),
	}
}

// smtpIngestLimitKey hashes scope+subject so no raw IP/address is retained in
// memory and key material cannot be enumerated from a heap dump of the map keys.
func smtpIngestLimitKey(scope string, subject string) string {
	sum := sha256.Sum256([]byte(scope + "\x00" + subject))
	return hex.EncodeToString(sum[:])
}

// allow increments the fixed-window counter and reports whether the request is
// still inside the budget. A nil limiter fails closed.
func (l *smtpIngestLimiter) allow(scope string, subject string, limit int, window time.Duration) bool {
	if l == nil {
		return false
	}
	key := smtpIngestLimitKey(scope, subject)
	now := l.now()
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.entries) > maxSMTPIngestLimiterKeys {
		l.entries = make(map[string]smtpIngestRateWindow)
	}
	entry, ok := l.entries[key]
	if !ok || now.Sub(entry.started) >= window {
		entry = smtpIngestRateWindow{started: now}
	}
	entry.count++
	l.entries[key] = entry
	return entry.count <= limit
}

// CheckSMTPIngestLimits is the authoritative ingest budget: per source IP,
// per target identity and per external sender first (so a single noisy subject
// is throttled before it can exhaust the node-wide budget), then the global
// node budget. Every rejection is recorded as a GaiaShield rate_limit event and
// fails closed with errSMTPRateLimited (HTTP 429 at the handler).
func (h *Handler) CheckSMTPIngestLimits(r *http.Request, targetGaiaID string, externalFrom string) error {
	if h == nil || h.limiter == nil {
		return errSMTPRateLimited
	}

	ip := security.ClientIP(r)
	if ip == "" {
		ip = "unknown"
	}
	if !h.limiter.allow("smtp-ingest-ip", ip, smtpIngestIPMax, smtpIngestIPWindow) {
		h.recordIngestRateLimit(r, "source IP")
		return errSMTPRateLimited
	}

	target := strings.ToLower(strings.TrimSpace(targetGaiaID))
	if target != "" && !h.limiter.allow("smtp-ingest-target", target, smtpIngestTargetMax, smtpIngestTargetWindow) {
		h.recordIngestRateLimit(r, "target identity")
		return errSMTPRateLimited
	}

	sender := strings.ToLower(strings.TrimSpace(externalFrom))
	if sender != "" && len(sender) > maxSMTPFromBytes {
		sender = sender[:maxSMTPFromBytes]
	}
	if sender != "" && !h.limiter.allow("smtp-ingest-sender", sender, smtpIngestSenderMax, smtpIngestSenderWindow) {
		h.recordIngestRateLimit(r, "external sender")
		return errSMTPRateLimited
	}

	if !h.limiter.allow("smtp-ingest-global", "any", smtpIngestGlobalMax, smtpIngestGlobalWindow) {
		h.recordIngestRateLimit(r, "node budget")
		return errSMTPRateLimited
	}
	return nil
}

func (h *Handler) recordIngestRateLimit(r *http.Request, detail string) {
	if h == nil || h.Security == nil {
		return
	}
	ctx := r.Context()
	h.Security.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "medium", "smtpbridge",
		"SMTP-Legacy-Ingest Budget überschritten ("+detail+"). Zustellung blockiert.", "rate_limit", r)
}
