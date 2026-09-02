package security

import (
	"errors"
	"net/http"
	"strings"
	"time"
)

func (s *SecuritySystem) CheckAuth(r *http.Request, username string, success bool, err error) error {
	ip := clientIP(r)
	key := strings.ToLower(strings.TrimSpace(username)) + ":" + ip

	if !success {
		count, rateErr := s.incrementCriticalRateLimit(r.Context(), "authentication", key, 5*time.Minute)
		if rateErr != nil || count >= 5 {
			s.RecordSecurityEvent(r.Context(), nil, nil, "auth_attack", "high", "auth_guard",
				"Mehrere fehlgeschlagene Loginversuche blockiert (Brute-Force Verdacht).", "temporary_block", r)
			return errors.New("Too many failed login attempts. Temporarily blocked.")
		}

		s.RecordSecurityEvent(r.Context(), nil, nil, "failed_login", "low", "auth_guard",
			"Fehlgeschlagener Loginversuch für Benutzer: "+username, "allow", r)
		return nil
	}

	return s.resetCriticalRateLimit(r.Context(), "authentication", key)
}

func (s *SecuritySystem) IsAuthBlocked(r *http.Request, username string) bool {
	ip := clientIP(r)
	key := strings.ToLower(strings.TrimSpace(username)) + ":" + ip
	count, err := s.criticalRateLimitCount(r.Context(), "authentication", key)
	return err != nil || count >= 5
}
