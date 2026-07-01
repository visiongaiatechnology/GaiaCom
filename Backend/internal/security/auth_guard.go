// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"errors"
	"net/http"
	"sync"
	"time"
)

var (
	loginFailuresMu sync.Mutex
	loginFailures   = make(map[string][]time.Time) // Key: username or IP
)

func (s *SecuritySystem) CheckAuth(r *http.Request, username string, success bool, err error) error {
	ip := clientIP(r)
	key := username + ":" + ip

	if !success {
		loginFailuresMu.Lock()
		now := time.Now()
		failures := loginFailures[key]
		
		// Clean old failures (older than 5 mins)
		var activeFailures []time.Time
		for _, t := range failures {
			if now.Sub(t) < 5*time.Minute {
				activeFailures = append(activeFailures, t)
			}
		}
		
		activeFailures = append(activeFailures, now)
		loginFailures[key] = activeFailures
		count := len(activeFailures)
		loginFailuresMu.Unlock()

		if count >= 5 {
			s.RecordSecurityEvent(r.Context(), nil, nil, "auth_attack", "high", "auth_guard",
				"Mehrere fehlgeschlagene Loginversuche blockiert (Brute-Force Verdacht).", "temporary_block", r)
			return errors.New("Too many failed login attempts. Temporarily blocked.")
		}

		s.RecordSecurityEvent(r.Context(), nil, nil, "failed_login", "low", "auth_guard",
			"Fehlgeschlagener Loginversuch für Benutzer: "+username, "allow", r)
		return nil
	}

	// Clean failures on successful login
	loginFailuresMu.Lock()
	delete(loginFailures, key)
	loginFailuresMu.Unlock()

	return nil
}

func (s *SecuritySystem) IsAuthBlocked(r *http.Request, username string) bool {
	ip := clientIP(r)
	key := username + ":" + ip
	loginFailuresMu.Lock()
	defer loginFailuresMu.Unlock()

	failures := loginFailures[key]
	now := time.Now()
	var activeFailures []time.Time
	for _, t := range failures {
		if now.Sub(t) < 5*time.Minute {
			activeFailures = append(activeFailures, t)
		}
	}
	loginFailures[key] = activeFailures
	return len(activeFailures) >= 5
}

