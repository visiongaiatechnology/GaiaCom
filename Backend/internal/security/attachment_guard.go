// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

const maxNativeAttachmentEnvelopeBytes int64 = (10 * 1024 * 1024 * 1024) + (2 * 1024 * 1024)

func (s *SecuritySystem) CheckAttachmentUpload(ctx context.Context, filename string, size int64, contentType string, r *http.Request) error {
	// 1. Max size check: native storage accepts 10 GiB payloads plus encryption envelope overhead.
	if size > maxNativeAttachmentEnvelopeBytes {
		s.RecordSecurityEvent(ctx, nil, nil, "attachment_rejected", "medium", "attachment_guard",
			"Anhang blockiert: Datei überschreitet das native GaiaCOM-Speicherlimit.", "reject", r)
		return errors.New("file too large")
	}

	// 2. Executable / dangerous files check
	dangerousExtensions := []string{".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".vbs", ".scr", ".pif", ".cpl"}
	lowerFilename := strings.ToLower(filename)
	for _, ext := range dangerousExtensions {
		if strings.HasSuffix(lowerFilename, ext) {
			s.RecordSecurityEvent(ctx, nil, nil, "attachment_rejected", "high", "attachment_guard",
				"Anhang blockiert: Ausführbare oder gefährliche Datei-Erweiterung ("+ext+").", "reject", r)
			return errors.New("executable and dangerous file types are strictly forbidden")
		}
	}

	// 3. MIME type double check
	lowerCT := strings.ToLower(contentType)
	if strings.Contains(lowerCT, "html") || strings.Contains(lowerCT, "javascript") || strings.Contains(lowerCT, "svg") || strings.Contains(lowerCT, "xml") || strings.Contains(lowerCT, "executable") {
		s.RecordSecurityEvent(ctx, nil, nil, "attachment_rejected", "high", "attachment_guard",
			"Anhang blockiert: Unerlaubter MIME-Type ("+contentType+").", "reject", r)
		return errors.New("unsupported attachment MIME type")
	}

	return nil
}
