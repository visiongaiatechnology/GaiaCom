// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/sha256"
	"testing"
	"time"

	"gaiacom/backend/transportqueue"
)

func TestMobileTransportQueueRoundTripAndReplayDefense(t *testing.T) {
	node, err := OpenNode(newTestBootstrap(t))
	if err != nil {
		t.Fatalf("open mobile node: %v", err)
	}
	t.Cleanup(func() { _ = node.Close() })
	now := time.Date(2026, 7, 17, 14, 0, 0, 0, time.UTC)
	id := "018f4d1e-7614-7a3a-8e37-61f0f75a0101"
	payload := []byte("authenticated-encrypted-mobile-envelope")
	inserted, err := node.QueueEnvelope(
		id, "@peer:gaiacom.local", payload, []byte("detached-signature"),
		int(transportqueue.TransportAll), 90, now.UnixMilli(), now.Add(time.Hour).UnixMilli(),
	)
	if err != nil || !inserted {
		t.Fatalf("queue mobile envelope: inserted=%v err=%v", inserted, err)
	}
	lease, err := node.ClaimEnvelope(now.UnixMilli())
	if err != nil || lease == nil || lease.EnvelopeID() != id || lease.Attempts() != 1 {
		t.Fatalf("claim mobile envelope: lease=%+v err=%v", lease, err)
	}
	claimedPayload := lease.Payload()
	claimedPayload[0] ^= 0xff
	if string(claimedPayload) == string(lease.Payload()) {
		t.Fatal("mobile transport payload exposed mutable native memory")
	}
	if err = node.CompleteEnvelope(lease, int(transportqueue.TransportLocalNetwork), now.Add(time.Second).UnixMilli()); err != nil {
		t.Fatalf("complete local-network delivery: %v", err)
	}
	if lease.Payload() != nil {
		t.Fatal("completed envelope retained payload material")
	}

	hash := sha256.Sum256(payload)
	claim, err := node.ClaimInboundEnvelope(id, hash[:], int(transportqueue.TransportBluetooth), now.UnixMilli(), now.Add(time.Hour).UnixMilli())
	if err != nil || claim != int(transportqueue.InboundAccepted) {
		t.Fatalf("accept inbound envelope: claim=%d err=%v", claim, err)
	}
	claim, err = node.ClaimInboundEnvelope(id, hash[:], int(transportqueue.TransportInternet), now.Add(time.Second).UnixMilli(), now.Add(time.Hour).UnixMilli())
	if err != nil || claim != int(transportqueue.InboundDuplicate) {
		t.Fatalf("recognize cross-transport replay: claim=%d err=%v", claim, err)
	}
}

func TestMobileTransportDeferralUsesOpaqueValidatedReason(t *testing.T) {
	node, err := OpenNode(newTestBootstrap(t))
	if err != nil {
		t.Fatalf("open mobile node: %v", err)
	}
	t.Cleanup(func() { _ = node.Close() })
	now := time.Date(2026, 7, 17, 15, 0, 0, 0, time.UTC)
	inserted, err := node.QueueEnvelope(
		"018f4d1e-7614-7a3a-8e37-61f0f75a0102", "@peer:gaiacom.local", []byte("ciphertext"),
		[]byte("signature"), int(transportqueue.TransportBluetooth), 50, now.UnixMilli(), now.Add(time.Hour).UnixMilli(),
	)
	if err != nil || !inserted {
		t.Fatalf("queue deferred envelope: inserted=%v err=%v", inserted, err)
	}
	lease, err := node.ClaimEnvelope(now.UnixMilli())
	if err != nil || lease == nil {
		t.Fatalf("claim deferred envelope: lease=%+v err=%v", lease, err)
	}
	if err = node.DeferEnvelope(lease, "raw failure: peer 10.0.0.1", false, now.UnixMilli()); err == nil {
		t.Fatal("unbounded diagnostic reason crossed native queue boundary")
	}
	if err = node.DeferEnvelope(lease, "peer_unreachable", false, now.UnixMilli()); err != nil {
		t.Fatalf("defer with opaque reason: %v", err)
	}
	if lease.Payload() != nil {
		t.Fatal("deferred envelope retained payload material")
	}
}
