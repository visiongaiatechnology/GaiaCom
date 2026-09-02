package security

import (
	"context"
	"errors"
	"net/http"
	"time"
)

func (s *SecuritySystem) CheckRegistrationLimit(ctx context.Context, r *http.Request) error {
	ip := clientIP(r)
	count, err := s.incrementCriticalRateLimit(ctx, "registration", ip, time.Hour)
	if err != nil || count > 5 {
		s.RecordSecurityEvent(ctx, nil, nil, "policy_violation", "high", "behavior_guard",
			"Massenregistrierung blockiert: Zu viele Registrierungsanfragen von IP-Adresse.", "rate_limit", r)
		return errors.New("registration rate limit exceeded. Please try again later.")
	}
	return nil
}

func (s *SecuritySystem) CheckGaiaDropFlood(ctx context.Context, r *http.Request) error {
	ip := clientIP(r)
	count, err := s.incrementCriticalRateLimit(ctx, "gaiadrop", ip, 5*time.Minute)
	if err != nil || count > 20 {
		s.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "medium", "behavior_guard",
			"GaiaDrop Flooding blockiert: Zu viele Drops eingereicht.", "rate_limit", r)
		return errors.New("GaiaDrop rate limit exceeded. Please wait before sending more.")
	}
	return nil
}
