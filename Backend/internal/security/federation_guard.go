// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
)

func (s *SecuritySystem) CheckFederationPDU(ctx context.Context, pduID string, signature string, r *http.Request) error {
	if pduID == "" {
		s.RecordSecurityEvent(ctx, nil, nil, "federation_invalid_signature", "medium", "federation_guard",
			"Föderations-PDU ohne gültige PDU-ID blockiert.", "reject", r)
		return errors.New("missing PDU ID")
	}

	// Signatures must be present
	if signature == "" {
		s.RecordSecurityEvent(ctx, nil, nil, "federation_invalid_signature", "high", "federation_guard",
			"Föderations-Anfrage ohne Server-Signatur blockiert.", "reject", r)
		return errors.New("missing server signature")
	}

	return nil
}

// IsSSRFBlocked checks if target hostname resolves to local or private IP addresses.
func (s *SecuritySystem) IsSSRFBlocked(ctx context.Context, hostname string, r *http.Request) bool {
	// Clean hostname of port if present
	host := hostname
	if strings.Contains(hostname, ":") {
		h, _, err := net.SplitHostPort(hostname)
		if err == nil {
			host = h
		}
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return true // Block if DNS fails or cannot resolve
	}

	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsLinkLocalUnicast() || ip.To4() == nil {
			s.RecordSecurityEvent(ctx, nil, nil, "federation_ssrf_block", "high", "federation_guard",
				"SSRF-Schutz blockierte Verbindungsaufbau zu lokaler/privater IP: "+ip.String(), "reject", r)
			return true
		}
	}
	return false
}
