// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"regexp"
	"strings"
)

var securityRedactionPatterns = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{
		pattern:     regexp.MustCompile(`eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}`),
		replacement: "[redacted:jwt]",
	},
	{
		pattern:     regexp.MustCompile(`(?is)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----`),
		replacement: "[redacted:private-key]",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\b(auth_token|jwt|mnemonic|private[_-]?key|recovery[_-]?phrase|seed|secret)\b\s*[:=]\s*[^,\s}\]]+`),
		replacement: "$1=[redacted]",
	},
}

func sanitizeSecurityText(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	for _, rule := range securityRedactionPatterns {
		trimmed = rule.pattern.ReplaceAllString(trimmed, rule.replacement)
	}
	if len(trimmed) > 512 {
		return trimmed[:512] + "[truncated]"
	}
	return trimmed
}
