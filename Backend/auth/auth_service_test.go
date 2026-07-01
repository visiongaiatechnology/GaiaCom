// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package auth

import (
	"strings"
	"testing"
	"time"
)

func TestSignAndVerifyToken(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	now := time.Now().UTC()

	token, err := signToken(jwtClaims{
		Subject:   "00000000-0000-0000-0000-000000000001",
		Issuer:    tokenIssuer,
		Audience:  []string{tokenAudience},
		IssuedAt:  now.Unix(),
		NotBefore: now.Unix(),
		ExpiresAt: now.Add(time.Hour).Unix(),
	}, secret)
	if err != nil {
		t.Fatalf("signToken failed: %v", err)
	}

	claims, err := verifySignedToken(token, secret)
	if err != nil {
		t.Fatalf("verifySignedToken failed: %v", err)
	}
	if claims.Subject != "00000000-0000-0000-0000-000000000001" {
		t.Fatalf("unexpected subject: %s", claims.Subject)
	}
}

func TestVerifyRejectsTamperedToken(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	now := time.Now().UTC()

	token, err := signToken(jwtClaims{
		Subject:   "00000000-0000-0000-0000-000000000001",
		Issuer:    tokenIssuer,
		Audience:  []string{tokenAudience},
		IssuedAt:  now.Unix(),
		NotBefore: now.Unix(),
		ExpiresAt: now.Add(time.Hour).Unix(),
	}, secret)
	if err != nil {
		t.Fatalf("signToken failed: %v", err)
	}

	tampered := strings.Replace(token, "0", "1", 1)
	if _, err := verifySignedToken(tampered, secret); err == nil {
		t.Fatal("verifySignedToken accepted a tampered token")
	}
}
