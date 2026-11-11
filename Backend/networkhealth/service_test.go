package networkhealth

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"strings"
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

func newFakeStore() fakeHealthStore {
	return fakeHealthStore{metrics: models.NetworkHealthMetrics{
		Accounts:            128,
		Identities:          217,
		Nodes:               5,
		Rooms:               63,
		Messages24h:         12482,
		GaiaDrops24h:        94,
		FederationEvents24h: 3201,
	}}
}

// verifySignedNodeStatus re-marshals the returned signed struct and checks the
// Ed25519 signature, so the additive uptimeScope field is covered by the
// signature contract.
func verifySignedNodeStatus(t *testing.T, dashboard *DashboardResponse, publicKey ed25519.PublicKey) {
	t.Helper()

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

func TestDashboardReportsUnavailableWithoutStatusProvider(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	service := NewService(newFakeStore(), "beta.gaiacom.de", privateKey, time.Now().UTC().Add(-time.Hour))

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
	// No status provider is wired: the endpoint must not claim a status it
	// cannot evidence, and it must not fabricate an availability percentage.
	if dashboard.NetworkStatus != statusUnavailable {
		t.Fatalf("network status without provider = %q, want %q", dashboard.NetworkStatus, statusUnavailable)
	}
	if dashboard.UptimePercent != uptimePercentUnavailable {
		t.Fatalf("uptime percent = %q, want %q", dashboard.UptimePercent, uptimePercentUnavailable)
	}
	if dashboard.UptimeScope != uptimeScopeProcess {
		t.Fatalf("uptime scope = %q, want %q", dashboard.UptimeScope, uptimeScopeProcess)
	}
	if dashboard.SignedNodeStatus.NetworkStatus != statusUnavailable {
		t.Fatalf("signed network status = %q, want %q", dashboard.SignedNodeStatus.NetworkStatus, statusUnavailable)
	}
	if dashboard.SignedNodeStatus.UptimePercent != uptimePercentUnavailable {
		t.Fatalf("signed uptime percent = %q, want %q", dashboard.SignedNodeStatus.UptimePercent, uptimePercentUnavailable)
	}
	if dashboard.SignedNodeStatus.UptimeScope != uptimeScopeProcess {
		t.Fatalf("signed uptime scope = %q, want %q", dashboard.SignedNodeStatus.UptimeScope, uptimeScopeProcess)
	}
	if dashboard.SignedNodeStatus.PublicKey != hex.EncodeToString(publicKey) {
		t.Fatalf("public key mismatch")
	}

	// The crypto block is a declared protocol profile, not a measurement.
	transparency := dashboard.CryptoTransparency
	if transparency.ProfileSource != profileSource {
		t.Fatalf("profile source = %q, want %q", transparency.ProfileSource, profileSource)
	}
	if transparency.NoGodmode != declaredNoGodmode {
		t.Fatalf("no-godmode label = %q, want %q", transparency.NoGodmode, declaredNoGodmode)
	}
	for label, value := range map[string]string{
		"hybridKem":  transparency.HybridKEM,
		"encryption": transparency.Encryption,
		"signatures": transparency.Signatures,
	} {
		if strings.TrimSpace(value) == "" {
			t.Fatalf("declared %s profile value is empty", label)
		}
	}
	if !strings.Contains(transparency.HybridKEM, "HQC-256") {
		t.Fatalf("hybrid KEM should declare HQC-256: %q", transparency.HybridKEM)
	}
	if !strings.Contains(transparency.Encryption, "Twofish-256-EAX") {
		t.Fatalf("encryption should declare Twofish-256-EAX: %q", transparency.Encryption)
	}
	if !strings.Contains(transparency.Signatures, "ML-DSA-87") {
		t.Fatalf("signatures should declare ML-DSA-87: %q", transparency.Signatures)
	}

	verifySignedNodeStatus(t, dashboard, publicKey)
}

func TestDashboardDerivesStatusFromMonitorSnapshot(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	fixedStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	cases := []struct {
		name   string
		status RuntimeSnapshot
		want   string
	}{
		{
			name:   "operational only when process and database are ready",
			status: RuntimeSnapshot{Ready: true, DatabaseReady: true, UptimeSeconds: 321},
			want:   statusOK,
		},
		{
			name:   "degraded when process is not ready",
			status: RuntimeSnapshot{Ready: false, DatabaseReady: true, UptimeSeconds: 321},
			want:   statusDegraded,
		},
		{
			name:   "degraded when database probe fails",
			status: RuntimeSnapshot{Ready: true, DatabaseReady: false, UptimeSeconds: 321},
			want:   statusDegraded,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			provider := func(context.Context) RuntimeSnapshot { return tc.status }
			service := NewService(newFakeStore(), "beta.gaiacom.de", privateKey, fixedStart, WithStatusProvider(provider))

			dashboard, err := service.Dashboard(context.Background())
			if err != nil {
				t.Fatalf("dashboard: %v", err)
			}
			if dashboard.NetworkStatus != tc.want {
				t.Fatalf("network status = %q, want %q", dashboard.NetworkStatus, tc.want)
			}
			if dashboard.SignedNodeStatus.NetworkStatus != tc.want {
				t.Fatalf("signed network status = %q, want %q", dashboard.SignedNodeStatus.NetworkStatus, tc.want)
			}
			if dashboard.SignedNodeStatus.UptimeSeconds != tc.status.UptimeSeconds {
				t.Fatalf("signed uptime seconds = %d, want %d", dashboard.SignedNodeStatus.UptimeSeconds, tc.status.UptimeSeconds)
			}
			if dashboard.UptimePercent != uptimePercentUnavailable {
				t.Fatalf("uptime percent = %q, want %q", dashboard.UptimePercent, uptimePercentUnavailable)
			}
			verifySignedNodeStatus(t, dashboard, publicKey)
		})
	}
}
