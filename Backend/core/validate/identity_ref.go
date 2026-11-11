package validate

import (
	"errors"
	"strings"
)

// ErrGaiaIDNotFullyQualified is returned when an identity reference does not
// carry an explicit domain. Only fully-qualified GaiaIDs may ever be used for
// authorization decisions; a bare local part must never match anything.
var ErrGaiaIDNotFullyQualified = errors.New("gaia id must be fully qualified (local part and domain)")

// NormalizeGaiaID canonicalizes a fully-qualified GaiaID for exact identity
// comparisons. It trims surrounding whitespace, lowercases, accepts both
// "local@domain" and "@local:domain" spellings and returns the canonical
// "@local:domain" form. ok is false for empty, domain-less or malformed values.
func NormalizeGaiaID(value string) (string, bool) {
	v := strings.ToLower(strings.TrimSpace(value))
	if v == "" {
		return "", false
	}
	if strings.HasPrefix(v, "@") {
		v = v[1:]
	}
	separator := -1
	for i := len(v) - 1; i >= 0; i-- {
		if v[i] == ':' || v[i] == '@' {
			separator = i
			break
		}
	}
	if separator <= 0 || separator >= len(v)-1 {
		return "", false
	}
	local := v[:separator]
	domain := v[separator+1:]
	if strings.ContainsAny(local, " \t\r\n") || strings.ContainsAny(domain, " \t\r\n") {
		return "", false
	}
	canonical := "@" + local + ":" + domain
	if err := GaiaID(canonical); err != nil {
		return "", false
	}
	return canonical, true
}

// GaiaIDMatches reports whether a and b are the same fully-qualified GaiaID:
// both the local part AND the domain must match. It never compares bare local
// parts and returns false when either side is not fully qualified.
func GaiaIDMatches(a, b string) bool {
	normalizedA, okA := NormalizeGaiaID(a)
	normalizedB, okB := NormalizeGaiaID(b)
	return okA && okB && normalizedA == normalizedB
}

// GaiaIDInList reports whether gaiaID exactly matches one candidate. Candidates
// that are not fully qualified are ignored (fail closed): a domain-less entry in
// a configuration file can therefore never grant a role.
func GaiaIDInList(gaiaID string, candidates []string) bool {
	for _, candidate := range candidates {
		if GaiaIDMatches(gaiaID, candidate) {
			return true
		}
	}
	return false
}

// GaiaIDDomain returns the lowercased domain part of a fully-qualified GaiaID.
func GaiaIDDomain(value string) (string, bool) {
	normalized, ok := NormalizeGaiaID(value)
	if !ok {
		return "", false
	}
	separator := strings.LastIndexByte(normalized, ':')
	if separator < 0 || separator >= len(normalized)-1 {
		return "", false
	}
	return normalized[separator+1:], true
}
