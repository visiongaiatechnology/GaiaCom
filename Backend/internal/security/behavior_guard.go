// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"errors"
	"net/http"
	"time"
)

func (s *SecuritySystem) CheckRegistrationLimit(ctx context.Context, r *http.Request) error {
	ip := clientIP(r)
	// Max 5 registrations per IP in 1 hour
	if s.isIPRateLimited("reg:"+ip, 5, 1*time.Hour) {
		s.RecordSecurityEvent(ctx, nil, nil, "policy_violation", "high", "behavior_guard",
			"Massenregistrierung blockiert: Zu viele Registrierungsanfragen von IP-Adresse.", "rate_limit", r)
		return errors.New("registration rate limit exceeded. Please try again later.")
	}
	return nil
}

func (s *SecuritySystem) CheckGaiaDropFlood(ctx context.Context, r *http.Request) error {
	ip := clientIP(r)
	// Max 20 drops per IP in 5 minutes
	if s.isIPRateLimited("drop:"+ip, 20, 5*time.Minute) {
		s.RecordSecurityEvent(ctx, nil, nil, "rate_limit", "medium", "behavior_guard",
			"GaiaDrop Flooding blockiert: Zu viele Drops eingereicht.", "rate_limit", r)
		return errors.New("GaiaDrop rate limit exceeded. Please wait before sending more.")
	}
	return nil
}
