// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEmbeddedNodeExecutesWithoutNetworkListener(t *testing.T) {
	node := newTestEmbeddedNode(t)
	response, err := node.Execute(context.Background(), EmbeddedRequest{
		Method: http.MethodGet,
		Path:   "/livez",
	})
	if err != nil {
		t.Fatalf("execute liveness request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("unexpected liveness status: %d body=%s", response.StatusCode, response.Body)
	}
	var payload map[string]string
	if err := json.Unmarshal(response.Body, &payload); err != nil {
		t.Fatalf("decode liveness response: %v", err)
	}
	if payload["status"] != "alive" {
		t.Fatalf("unexpected liveness payload: %v", payload)
	}
}

func TestEmbeddedNodeRejectsBridgeBoundaryAttacks(t *testing.T) {
	node := newTestEmbeddedNode(t)
	tests := []EmbeddedRequest{
		{Method: http.MethodPatch, Path: "/livez"},
		{Method: http.MethodGet, Path: "/api/v1/../metrics"},
		{Method: http.MethodGet, Path: "https://attacker.invalid/livez"},
		{Method: http.MethodGet, Path: "/livez", Headers: map[string]string{"X-Forwarded-Host": "attacker.invalid"}},
		{Method: http.MethodGet, Path: "/livez", Headers: map[string]string{"Authorization": "ok\r\nInjected: yes"}},
	}
	for _, request := range tests {
		if _, err := node.Execute(context.Background(), request); err == nil {
			t.Fatalf("expected bridge request to be rejected: %+v", request)
		}
	}
}

func TestEmbeddedNodeCloseIsIdempotentAndFailClosed(t *testing.T) {
	node := newTestEmbeddedNode(t)
	if err := node.Close(); err != nil {
		t.Fatalf("close embedded node: %v", err)
	}
	if err := node.Close(); err != nil {
		t.Fatalf("close embedded node twice: %v", err)
	}
	if _, err := node.Execute(context.Background(), EmbeddedRequest{Method: http.MethodGet, Path: "/livez"}); err == nil {
		t.Fatal("closed embedded node accepted a request")
	}
}

func newTestEmbeddedNode(t *testing.T) *EmbeddedNode {
	t.Helper()
	_, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate embedded node key: %v", err)
	}
	testRoot, err := os.MkdirTemp(".", ".embedded-node-test-")
	if err != nil {
		t.Fatalf("create embedded test root: %v", err)
	}
	testRoot, err = filepath.Abs(testRoot)
	if err != nil {
		t.Fatalf("resolve embedded test root: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(testRoot) })
	node, err := NewEmbeddedNode(context.Background(), EmbeddedNodeConfig{
		DatabasePath:         filepath.Join(testRoot, "gaiacom-mobile.db"),
		StorageRoot:          filepath.Join(testRoot, "objects"),
		ServerName:           "device.test.gaiacom.local",
		ServerPrivateKey:     privateKey,
		TrustMeshEpochSecret: []byte(strings.Repeat("t", 32)),
		JWTSecret:            []byte(strings.Repeat("j", 32)),
		ShieldSecret:         []byte(strings.Repeat("s", 32)),
		MetricsToken:         strings.Repeat("m", 32),
	})
	if err != nil {
		t.Fatalf("create embedded node: %v", err)
	}
	t.Cleanup(func() {
		if err := node.Close(); err != nil {
			t.Errorf("close embedded node: %v", err)
		}
	})
	return node
}
