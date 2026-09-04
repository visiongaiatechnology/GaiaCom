// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestHashPasswordAndVerifySuccess(t *testing.T) {
	password := "correct-horse-battery-staple-secure-password-2026"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if !strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=4$") {
		t.Fatalf("unexpected hash format: %s", hash)
	}

	match, needsRehash, err := VerifyPassword(password, hash)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}
	if !match {
		t.Fatal("VerifyPassword failed to match correct password")
	}
	if needsRehash {
		t.Fatal("VerifyPassword unexpectedly requested rehash on fresh default Argon2id hash")
	}

	// Wrong password must fail without error
	matchWrong, _, err := VerifyPassword("incorrect-password-attempt-fails", hash)
	if err != nil {
		t.Fatalf("VerifyPassword errored on wrong password: %v", err)
	}
	if matchWrong {
		t.Fatal("VerifyPassword matched an incorrect password")
	}
}

func TestHashPasswordBoundaryValidation(t *testing.T) {
	// Too short (< 12)
	if _, err := HashPassword("too-short"); err != ErrInvalidPasswordLength {
		t.Fatalf("expected ErrInvalidPasswordLength for short password, got: %v", err)
	}

	// Too long (> 512)
	tooLong := strings.Repeat("a", 513)
	if _, err := HashPassword(tooLong); err != ErrInvalidPasswordLength {
		t.Fatalf("expected ErrInvalidPasswordLength for long password, got: %v", err)
	}

	// Exact minimum boundary (12 chars)
	minPass := strings.Repeat("a", 12)
	if _, err := HashPassword(minPass); err != nil {
		t.Fatalf("failed to hash 12-char password: %v", err)
	}
}

func TestLegacyBcryptVerificationAndAutoRehash(t *testing.T) {
	legacyPassword := "legacy-bcrypt-account-password"
	legacyHashBytes, err := bcrypt.GenerateFromPassword([]byte(legacyPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate bcrypt hash failed: %v", err)
	}
	legacyHash := string(legacyHashBytes)

	// Verify legacy password
	match, needsRehash, err := VerifyPassword(legacyPassword, legacyHash)
	if err != nil {
		t.Fatalf("VerifyPassword failed on legacy bcrypt: %v", err)
	}
	if !match {
		t.Fatal("VerifyPassword failed to match correct password for legacy Bcrypt hash")
	}
	if !needsRehash {
		t.Fatal("VerifyPassword must indicate needsRehash=true for legacy Bcrypt hash")
	}

	// Legacy password mismatch
	wrongMatch, _, err := VerifyPassword("wrong-legacy-password", legacyHash)
	if err != nil {
		t.Fatalf("VerifyPassword errored on legacy mismatch: %v", err)
	}
	if wrongMatch {
		t.Fatal("VerifyPassword matched incorrect password on legacy Bcrypt hash")
	}
}

func TestCorruptedAndInvalidHashFormats(t *testing.T) {
	password := "correct-horse-battery-staple"

	invalidHashes := []string{
		"",
		"plain_password_not_hashed",
		"no_password_stub_hash",
		"$argon2id$",
		"$argon2id$v=19$m=65536,t=3,p=4$",
		"$argon2i$v=19$m=65536,t=3,p=4$AAAA$BBBB", // Wrong algorithm
		"$argon2id$v=18$m=65536,t=3,p=4$AAAA$BBBB", // Wrong version
		"$argon2id$v=19$m=invalid,t=3,p=4$AAAA$BBBB", // Malformed params
		"$argon2id$v=19$m=65536,t=3,p=4$invalid_base64!!!$BBBB", // Corrupted salt base64
	}

	for _, invalid := range invalidHashes {
		match, _, err := VerifyPassword(password, invalid)
		if match {
			t.Fatalf("invalid hash was matched: %q", invalid)
		}
		if err == nil && invalid != "no_password_stub_hash" && !strings.HasPrefix(invalid, "$argon2i$") {
			t.Fatalf("expected error on invalid hash %q, got nil", invalid)
		}
	}
}

func TestDummyPasswordHashTimingDefense(t *testing.T) {
	// The dummy password hash must parse correctly and fail matching against any password
	match, needsRehash, err := VerifyPassword("any-attempted-password-against-dummy", dummyPasswordHash)
	if err != nil {
		t.Fatalf("dummyPasswordHash parsing failed: %v", err)
	}
	if match {
		t.Fatal("dummyPasswordHash unexpectedly matched a password")
	}
	if needsRehash {
		t.Fatal("dummyPasswordHash must not request rehash")
	}
}

func TestNeedsRehashOnCustomParams(t *testing.T) {
	password := "correct-horse-battery-staple"
	customParams := Argon2Params{
		Memory:      32 * 1024, // Lower memory
		Iterations:  1,
		Parallelism: 2,
		KeyLen:      32,
		SaltLen:     16,
	}

	customHash, err := HashPasswordWithParams(password, customParams)
	if err != nil {
		t.Fatalf("HashPasswordWithParams failed: %v", err)
	}

	match, needsRehash, err := VerifyPassword(password, customHash)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}
	if !match {
		t.Fatal("VerifyPassword failed to match custom params hash")
	}
	if !needsRehash {
		t.Fatal("VerifyPassword must indicate needsRehash=true for non-default params")
	}
}
