// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package networkhealth

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"

	"gaiacom/backend/models"
)

type fakeHealthStore struct {
	metrics models.NetworkHealthMetrics
}

func (f fakeHealthStore) ReadNetworkHealthMetrics(ctx context.Context, since time.Time) (*models.NetworkHealthMetrics, error) {
	return &f.metrics, nil
}

func TestDashboardSignsAnonymousNodeStatus(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	store := fakeHealthStore{metrics: models.NetworkHealthMetrics{
		Accounts:            128,
		Identities:          217,
		Nodes:               5,
		Rooms:               63,
		Messages24h:         12482,
		GaiaDrops24h:        94,
		FederationEvents24h: 3201,
	}}
	service := NewService(store, "beta.gaiacom.de", privateKey, time.Now().UTC().Add(-time.Hour))

	dashboard, err := service.Dashboard(context.Background())
	if err != nil {
		t.Fatalf("dashboard: %v", err)
	}

	if dashboard.ProtocolVersion != "v0.1" {
		t.Fatalf("protocol version mismatch: %s", dashboard.ProtocolVersion)
	}
	if dashboard.Metrics.Accounts != 128 || dashboard.Metrics.Messages24h != 12482 {
		t.Fatalf("metrics mismatch: %+v", dashboard.Metrics)
	}
	if dashboard.SignedNodeStatus.PublicKey != hex.EncodeToString(publicKey) {
		t.Fatalf("public key mismatch")
	}
	if dashboard.SignedNodeStatus.Signature == "" {
		t.Fatalf("signature missing")
	}

	signature, err := hex.DecodeString(dashboard.SignedNodeStatus.Signature)
	if err != nil {
		t.Fatalf("signature hex: %v", err)
	}
	unsigned := dashboard.SignedNodeStatus
	unsigned.Signature = ""
	payload, err := json.Marshal(unsigned)
	if err != nil {
		t.Fatalf("marshal status: %v", err)
	}
	if !ed25519.Verify(publicKey, payload, signature) {
		t.Fatalf("signature verification failed")
	}
}
