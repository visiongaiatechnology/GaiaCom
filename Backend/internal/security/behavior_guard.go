package security

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
)

// GaiaDrop submit budgets (P-07 / FIND-007). GaiaDrop is a low-frequency,
// unauthenticated ingest path, so every budget is far above legitimate use.
const (
	gaiaDropIPWindow           = 5 * time.Minute
	gaiaDropIPMaxPerWindow     = 20
	gaiaDropTargetWindow       = time.Hour
	gaiaDropTargetMaxPerWindow = 10
	gaiaDropGlobalWindow       = time.Hour
	gaiaDropGlobalMaxPerWindow = 5000
)

func (s *SecuritySystem) CheckRegistrationLimit(ctx context.Context, r *http.Request) error {
	if s == nil {
		return errors.New("security system unavailable")
	}
	ip := clientIP(r)
	count, err := s.incrementCriticalRateLimit(ctx, "registration", ip, time.Hour)
	if err != nil || count > 5 {
		s.RecordSecurityEvent(ctx, nil, nil, "policy_violation", "high", "behavior_guard",
			"Massenregistrierung blockiert: Zu viele Registrierungsanfragen von IP-Adresse.", "rate_limit", r)
		return errors.New("registration rate limit exceeded. Please try again later.")
	}
	return nil
}

// CheckGaiaDropFlood is the per-IP GaiaDrop budget (kept for compatibility and
// called from CheckGaiaDropSubmit).
func (s *SecuritySystem) CheckGaiaDropFlood(ctx context.Context, r *http.Request) error {
	if s == nil {
		return errors.New("security system unavailable")
	}
	ip := clientIP(r)
	count, err := s.incrementCriticalRateLimit(ctx, "gaiadrop", ip, gaiaDropIPWindow)
	if err != nil || count > gaiaDropIPMaxPerWindow {
		s.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "medium", "behavior_guard",
			"GaiaDrop Flooding blockiert: Zu viele Drops eingereicht.", "rate_limit", r)
		return errors.New("GaiaDrop rate limit exceeded. Please wait before sending more.")
	}
	return nil
}

// CheckGaiaDropSubmit is the authoritative public GaiaDrop submit budget:
// per-IP (20 / 5 min), per-target (10 / hour) and a global node budget
// (5000 / hour). All counters are opaque HMAC keys; a rejection records a
// security event and fails closed with HTTP 429 at the handler.
func (s *SecuritySystem) CheckGaiaDropSubmit(ctx context.Context, r *http.Request, targetGaiaID string) error {
	if s == nil {
		return errors.New("security system unavailable")
	}
	if err := s.CheckGaiaDropFlood(ctx, r); err != nil {
		return err
	}

	target := normalizeRateLimitSubject(targetGaiaID)
	if target != "" {
		count, err := s.incrementCriticalRateLimit(ctx, "gaiadrop-target", target, gaiaDropTargetWindow)
		if err != nil {
			return errors.New("GaiaDrop throttled: quota backend unavailable.")
		}
		if count > gaiaDropTargetMaxPerWindow {
			s.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "medium", "behavior_guard",
				"GaiaDrop Ziel-Budget überschritten: Zu viele Drops an denselben Empfänger.", "rate_limit", r)
			return errors.New("GaiaDrop target rate limit exceeded. Please wait before sending more.")
		}
	}

	globalCount, err := s.incrementCriticalRateLimit(ctx, "gaiadrop-global", "any", gaiaDropGlobalWindow)
	if err != nil {
		return errors.New("GaiaDrop throttled: quota backend unavailable.")
	}
	if globalCount > gaiaDropGlobalMaxPerWindow {
		s.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "high", "behavior_guard",
			"GaiaDrop Knoten-Budget überschritten: globaler Submissions-Sturm blockiert.", "rate_limit", r)
		return errors.New("GaiaDrop node rate limit exceeded. Please try again later.")
	}
	return nil
}

// normalizeRateLimitSubject lowercases and trims a rate-limit subject so the
// same logical target hits one counter regardless of address casing.
func normalizeRateLimitSubject(value string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	if len(trimmed) > 320 {
		trimmed = trimmed[:320]
	}
	return trimmed
}
