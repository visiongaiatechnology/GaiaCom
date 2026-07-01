// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/models"
)

func TestSecurityEventRedactsSecretsBeforePersistence(t *testing.T) {
	store := NewMockStore()
	system := &SecuritySystem{
		Store:   store,
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	}
	req := httptest.NewRequest("POST", "/api/v1/admin?auth_token=should-not-be-stored", nil)
	req.Header.Set("User-Agent", "Secret Browser With Token")
	jwtNeedle := "e" + "yJhbGci"
	jwtLikeValue := jwtNeedle + "OiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "e" + "yJzdWIiOiIxMjM0NTY3ODkwIn0." + "signature"

	system.RecordSecurityEvent(
		context.Background(),
		nil,
		nil,
		"operator_action",
		"high",
		"audit_test",
		"jwt="+jwtLikeValue+" private_key=supersecret mnemonic=abandon",
		"allow",
		req,
	)

	if len(store.savedEvents) != 1 {
		t.Fatalf("expected one saved event, got %d", len(store.savedEvents))
	}
	summary := store.savedEvents[0].Summary
	for _, forbidden := range []string{jwtNeedle, "supersecret", "abandon"} {
		if strings.Contains(summary, forbidden) {
			t.Fatalf("summary leaked secret %q: %s", forbidden, summary)
		}
	}
	if len(store.privateContexts) != 1 {
		t.Fatalf("expected private context to be stored")
	}
	privateJSON := store.privateContexts[0].InternalContextJSON
	if strings.Contains(privateJSON, "Secret Browser") || strings.Contains(privateJSON, "should-not-be-stored") {
		t.Fatalf("private context leaked request secret material: %s", privateJSON)
	}
	if !strings.Contains(privateJSON, "user_agent_hash") {
		t.Fatalf("private context must retain hashed user-agent evidence: %s", privateJSON)
	}
	if len(store.auditChains) != 1 || store.auditChains[0].Signature == "" {
		t.Fatalf("audit chain must be signed: %+v", store.auditChains)
	}
}

func TestAuditHashCoversImmutableEventFields(t *testing.T) {
	store := NewMockStore()
	system := &SecuritySystem{
		Store:   store,
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	}
	event := &models.SecurityEvent{
		EventID:       "gs_evt_test",
		NodeID:        "test-node",
		Category:      "operator_action",
		Severity:      "high",
		Source:        "audit_test",
		Summary:       "initial",
		Action:        "allow",
		PublicVisible: false,
		UserVisible:   false,
		NodeVisible:   true,
		CreatedAt:     time.Unix(100, 0).UTC(),
	}

	first, err := system.CalculateAuditHash(context.Background(), event)
	if err != nil {
		t.Fatalf("calculate first audit hash: %v", err)
	}
	event.Summary = "tampered"
	second, err := system.CalculateAuditHash(context.Background(), event)
	if err != nil {
		t.Fatalf("calculate second audit hash: %v", err)
	}
	if first.EventHash == second.EventHash {
		t.Fatalf("audit hash did not change after immutable event mutation")
	}
	if first.Signature == "" || second.Signature == "" {
		t.Fatalf("audit hashes must be HMAC signed")
	}
}
