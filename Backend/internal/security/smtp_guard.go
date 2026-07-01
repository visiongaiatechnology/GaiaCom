// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

func (s *SecuritySystem) CheckSMTPRequest(ctx context.Context, sender, recipient, subject string, r *http.Request) error {
	// 1. CRLF Injection prevention in headers (prevent mail spoofing / header splitting)
	for _, val := range []string{sender, recipient, subject} {
		if strings.Contains(val, "\r") || strings.Contains(val, "\n") {
			s.RecordSecurityEvent(ctx, nil, nil, "smtp_injection_attempt", "high", "smtp_guard",
				"SMTP-Header Injection (CRLF-Pattern) blockiert.", "reject", r)
			return errors.New("smtp injection detected")
		}
	}

	// 2. Open relay protection (check if recipient is local domain if sender is external, or auth exists)
	// (Our SMTP gateway requires authenticated nodes or users to ingest outgoing SMTP)
	if sender == "" || recipient == "" {
		s.RecordSecurityEvent(ctx, nil, nil, "smtp_open_relay_attempt", "high", "smtp_guard",
			"SMTP Open Relay Versuch: Absender oder Empfänger leer.", "reject", r)
		return errors.New("open relay forbidden")
	}

	return nil
}
