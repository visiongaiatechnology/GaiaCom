// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

// Algorithm parameters and identifiers compliant with RFC 9106 and OWASP Guidelines.
const (
	Argon2Algorithm = "argon2id"
	Argon2Version   = argon2.Version // 0x13 = 19

	DefaultMemory      uint32 = 64 * 1024 // 64 MiB (65536 KiB)
	DefaultIterations  uint32 = 3         // 3 time iterations
	DefaultParallelism uint8  = 4         // 4 threads
	DefaultKeyLen      uint32 = 32        // 32 bytes output (256-bit key)
	DefaultSaltLen     int    = 16        // 16 bytes cryptographic salt (128-bit)
)

var (
	ErrInvalidPasswordLength = errors.New("password length boundary violation")
	ErrInvalidHashFormat     = errors.New("argon2id hash format invalid")
	ErrIncompatibleVersion   = errors.New("incompatible argon2 version")
	ErrAlgorithmMismatch     = errors.New("password algorithm mismatch")
)

// Argon2Params encapsulates configuration for Argon2id key derivation.
type Argon2Params struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	KeyLen      uint32
	SaltLen     int
}

// DefaultParams represents the sovereign production configuration.
var DefaultParams = Argon2Params{
	Memory:      DefaultMemory,
	Iterations:  DefaultIterations,
	Parallelism: DefaultParallelism,
	KeyLen:      DefaultKeyLen,
	SaltLen:     DefaultSaltLen,
}

// dummyPasswordHash is an RFC 9106 compliant PHC Argon2id hash used to equalize execution
// timing when authenticating non-existent identities, preventing timing-based username enumeration.
// Base64 tokens are 16 zero bytes (salt: 22 chars) and 32 zero bytes (key: 43 chars).
const dummyPasswordHash = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

// HashPassword derives a cryptographic hash using Argon2id with default parameters
// and formats it as a standard PHC encoded string.
func HashPassword(password string) (string, error) {
	return HashPasswordWithParams(password, DefaultParams)
}

// HashPasswordWithParams derives a cryptographic hash using custom Argon2id parameters.
func HashPasswordWithParams(password string, params Argon2Params) (string, error) {
	if len(password) < 12 || len(password) > 512 {
		return "", ErrInvalidPasswordLength
	}

	salt := make([]byte, params.SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate cryptographic salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, params.Iterations, params.Memory, params.Parallelism, params.KeyLen)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$%s$v=%d$m=%d,t=%d,p=%d$%s$%s",
		Argon2Algorithm, Argon2Version, params.Memory, params.Iterations, params.Parallelism, b64Salt, b64Hash)

	return encoded, nil
}

// VerifyPassword verifies a plaintext password against an encoded hash.
// Supports native Argon2id (PHC string) and legacy Bcrypt ($2a$, $2b$, $2y$).
// Returns:
//   - match: true if password matches the hash
//   - needsRehash: true if the hash was verified with legacy Bcrypt or non-standard Argon2id parameters
//   - err: nil on successful validation (even on password mismatch)
func VerifyPassword(password, encodedHash string) (match bool, needsRehash bool, err error) {
	if strings.HasPrefix(encodedHash, "$argon2id$") {
		return verifyArgon2id(password, encodedHash)
	}

	if strings.HasPrefix(encodedHash, "$2a$") || strings.HasPrefix(encodedHash, "$2b$") || strings.HasPrefix(encodedHash, "$2y$") {
		return verifyBcrypt(password, encodedHash)
	}

	// Unknown or unhashed stub format: execute constant-time dummy verification to defeat timing attacks
	_, _, _ = verifyArgon2id(password, dummyPasswordHash)
	return false, false, ErrInvalidHashFormat
}

func verifyArgon2id(password, encodedHash string) (bool, bool, error) {
	parts := strings.Split(encodedHash, "$")
	// Expected parts format: ["", "argon2id", "v=19", "m=65536,t=3,p=4", "<salt>", "<hash>"]
	if len(parts) != 6 {
		return false, false, ErrInvalidHashFormat
	}

	if parts[1] != Argon2Algorithm {
		return false, false, ErrAlgorithmMismatch
	}

	if !strings.HasPrefix(parts[2], "v=") {
		return false, false, ErrInvalidHashFormat
	}
	version, err := strconv.ParseUint(strings.TrimPrefix(parts[2], "v="), 10, 32)
	if err != nil {
		return false, false, ErrInvalidHashFormat
	}
	if uint32(version) != Argon2Version {
		return false, false, ErrIncompatibleVersion
	}

	params, err := parseParams(parts[3])
	if err != nil {
		return false, false, err
	}

	salt, err := decodeBase64(parts[4])
	if err != nil || len(salt) == 0 {
		return false, false, ErrInvalidHashFormat
	}

	expectedHash, err := decodeBase64(parts[5])
	if err != nil || len(expectedHash) == 0 {
		return false, false, ErrInvalidHashFormat
	}

	params.KeyLen = uint32(len(expectedHash))
	params.SaltLen = len(salt)

	derivedKey := argon2.IDKey([]byte(password), salt, params.Iterations, params.Memory, params.Parallelism, params.KeyLen)

	if subtle.ConstantTimeCompare(expectedHash, derivedKey) != 1 {
		return false, false, nil
	}

	needsRehash := params.Memory != DefaultParams.Memory ||
		params.Iterations != DefaultParams.Iterations ||
		params.Parallelism != DefaultParams.Parallelism ||
		params.KeyLen != DefaultParams.KeyLen

	return true, needsRehash, nil
}

func parseParams(paramStr string) (Argon2Params, error) {
	var params Argon2Params
	tokens := strings.Split(paramStr, ",")
	for _, token := range tokens {
		kv := strings.SplitN(token, "=", 2)
		if len(kv) != 2 {
			return params, ErrInvalidHashFormat
		}
		val, err := strconv.ParseUint(kv[1], 10, 32)
		if err != nil {
			return params, ErrInvalidHashFormat
		}
		switch kv[0] {
		case "m":
			params.Memory = uint32(val)
		case "t":
			params.Iterations = uint32(val)
		case "p":
			if val > 255 {
				return params, ErrInvalidHashFormat
			}
			params.Parallelism = uint8(val)
		default:
			return params, ErrInvalidHashFormat
		}
	}
	if params.Memory == 0 || params.Iterations == 0 || params.Parallelism == 0 {
		return params, ErrInvalidHashFormat
	}
	return params, nil
}

func decodeBase64(s string) ([]byte, error) {
	decoded, err := base64.RawStdEncoding.DecodeString(s)
	if err == nil {
		return decoded, nil
	}
	return base64.StdEncoding.DecodeString(s)
}

func verifyBcrypt(password, encodedHash string) (bool, bool, error) {
	err := bcrypt.CompareHashAndPassword([]byte(encodedHash), []byte(password))
	if err == nil {
		// Valid legacy password, signal that it must be upgraded to Argon2id
		return true, true, nil
	}
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return false, false, nil
	}
	return false, false, err
}

// NeedsRehash reports whether an encoded hash requires migration to current Argon2id default parameters.
func NeedsRehash(encodedHash string) bool {
	if !strings.HasPrefix(encodedHash, "$argon2id$") {
		return true
	}
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return true
	}
	params, err := parseParams(parts[3])
	if err != nil {
		return true
	}
	return params.Memory != DefaultParams.Memory ||
		params.Iterations != DefaultParams.Iterations ||
		params.Parallelism != DefaultParams.Parallelism
}
