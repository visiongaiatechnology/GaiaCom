package gaiadrop

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/internal/security"
	"gaiacom/backend/models"
)

// Budgets mirrored from internal/security/behavior_guard.go (per-target 10/hour, per-IP 20/5min).
// P-07 / FIND-007 regression tests: the public submit path must be budgeted
// (per IP, per target, global) and fail closed with 429. Written but NOT run in
// this environment (no-build directive) → runtime NOT_TESTED.

const (
	testTargetBudgetPerWindow = 10
	testIPBudgetPerWindow     = 20
)

func newGaiaDropSecuritySystem(t *testing.T, rig gaiaDropTestRig) *security.SecuritySystem {
	t.Helper()
	system, err := security.NewSecuritySystemWithConfig(rig.store, security.SystemConfig{
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	})
	if err != nil {
		t.Fatalf("construct security system: %v", err)
	}
	return system
}

func submitDropRequest(t *testing.T, handler *Handler, remoteAddr, targetGaiaID string) int {
	t.Helper()
	body, err := json.Marshal(map[string]interface{}{
		"targetGaiaId": targetGaiaID,
		"senderLabel":  "external",
		"payload": map[string]interface{}{
			"ciphertext": "sealed-payload",
			"nonce":      "nonce",
		},
	})
	if err != nil {
		t.Fatalf("marshal submit body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/gaiadrop/submit", bytes.NewReader(body))
	req.RemoteAddr = remoteAddr
	recorder := httptest.NewRecorder()
	handler.Submit(recorder, req)
	return recorder.Code
}

func TestSubmitEnforcesPerTargetBudget(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	handler := NewHandler(rig.service, newGaiaDropSecuritySystem(t, rig))

	for i := 0; i < testTargetBudgetPerWindow; i++ {
		if code := submitDropRequest(t, handler, "198.51.100.7:4242", rig.targetIdentity.GaiaID); code != http.StatusCreated {
			t.Fatalf("drop %d within target budget rejected with %d", i+1, code)
		}
	}
	if code := submitDropRequest(t, handler, "198.51.100.7:4242", rig.targetIdentity.GaiaID); code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after target budget, got %d", code)
	}
}

func TestSubmitEnforcesPerIPBudget(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	handler := NewHandler(rig.service, newGaiaDropSecuritySystem(t, rig))

	const remoteAddr = "203.0.113.9:5151"
	targets := make([]models.Identity, 0, testIPBudgetPerWindow+1)
	for i := 0; i < testIPBudgetPerWindow+1; i++ {
		target := models.Identity{
			ID:           uuid.New(),
			UserID:       rig.ownerUser.ID,
			GaiaID:       fmt.Sprintf("@ip-budget-%d:gaiacom.local", i),
			DisplayName:  fmt.Sprintf("IP Budget %d", i),
			PublicRecord: models.JSONB(`{"curve":"test"}`),
			IsActive:     true,
		}
		if err := rig.store.CreateIdentity(&target); err != nil {
			t.Fatalf("create target identity %d: %v", i, err)
		}
		targets = append(targets, target)
	}

	for i := 0; i < testIPBudgetPerWindow; i++ {
		if code := submitDropRequest(t, handler, remoteAddr, targets[i].GaiaID); code != http.StatusCreated {
			t.Fatalf("drop %d within IP budget rejected with %d", i+1, code)
		}
	}
	if code := submitDropRequest(t, handler, remoteAddr, targets[testIPBudgetPerWindow].GaiaID); code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after IP budget, got %d", code)
	}
}

func TestSubmitWithoutSecuritySystemStillWorks(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	handler := NewHandler(rig.service)
	if code := submitDropRequest(t, handler, "192.0.2.50:1111", rig.targetIdentity.GaiaID); code != http.StatusCreated {
		t.Fatalf("handler without security system must keep working, got %d", code)
	}
}
