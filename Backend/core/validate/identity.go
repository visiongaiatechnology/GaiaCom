// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package validate

import "errors"

var (
	ErrGaiaIDEmpty                  = errors.New("gaia id is empty")
	ErrGaiaIDMissingPrefix          = errors.New("gaia id must start with @")
	ErrGaiaIDMissingDomainSeparator = errors.New("gaia id missing domain separator")
	ErrGaiaIDInvalidLocalLength     = errors.New("gaia id local part length invalid")
	ErrGaiaIDInvalidDomainLength    = errors.New("gaia id domain length invalid")
	ErrGaiaIDInvalidLocalCharacter  = errors.New("gaia id local part contains invalid character")
	ErrGaiaIDInvalidDomainCharacter = errors.New("gaia id domain contains invalid character")
)

func GaiaID(value string) error {
	if value == "" {
		return ErrGaiaIDEmpty
	}
	if value[0] != '@' {
		return ErrGaiaIDMissingPrefix
	}

	separator := -1
	for i := len(value) - 1; i >= 0; i-- {
		if value[i] == ':' {
			separator = i
			break
		}
	}
	if separator == -1 {
		return ErrGaiaIDMissingDomainSeparator
	}

	local := value[1:separator]
	domain := value[separator+1:]
	if len(local) < 3 || len(local) > 64 {
		return ErrGaiaIDInvalidLocalLength
	}
	if len(domain) < 3 || len(domain) > 253 {
		return ErrGaiaIDInvalidDomainLength
	}
	for i := 0; i < len(local); i++ {
		if !isLocalByte(local[i]) {
			return ErrGaiaIDInvalidLocalCharacter
		}
	}
	if !Domain(domain) {
		return ErrGaiaIDInvalidDomainCharacter
	}

	return nil
}

func Domain(value string) bool {
	if len(value) < 3 || len(value) > 253 {
		return false
	}
	if value[0] == '.' || value[len(value)-1] == '.' {
		return false
	}
	for i := 0; i < len(value); i++ {
		if !isDomainByte(value[i]) {
			return false
		}
	}
	return true
}

func FixedHex(value string, expectedBytes int) bool {
	if expectedBytes < 0 || len(value) != expectedBytes*2 {
		return false
	}
	for i := 0; i < len(value); i++ {
		if !isHexByte(value[i]) {
			return false
		}
	}
	return true
}

func isLocalByte(value byte) bool {
	return isAlphaNumeric(value) || value == '.' || value == '_' || value == '-'
}

func isDomainByte(value byte) bool {
	return isAlphaNumeric(value) || value == '.' || value == '-'
}

func isHexByte(value byte) bool {
	return (value >= '0' && value <= '9') ||
		(value >= 'a' && value <= 'f') ||
		(value >= 'A' && value <= 'F')
}

func isAlphaNumeric(value byte) bool {
	return (value >= '0' && value <= '9') ||
		(value >= 'a' && value <= 'z') ||
		(value >= 'A' && value <= 'Z')
}
