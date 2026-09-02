// STATUS: DIAMANT VGT SUPREME
package repository

import (
	"context"
	"crypto/sha256"
	"errors"
	"testing"
	"time"

	"gaiacom/backend/database"
	"gaiacom/backend/transportqueue"
)

func TestTransportQueueDeliveryLifecycleIsIdempotentAndLeaseSafe(t *testing.T) {
	db, err := database.ConnectEmbeddedDB(":memory:")
	if err != nil {
		t.Fatalf("connect embedded database: %v", err)
	}
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()
	now := time.Date(2026, 7, 17, 12, 0, 0, 0, time.UTC)
	envelope := mustTransportEnvelope(t,
		"018f4d1e-7614-7a3a-8e37-61f0f75a0001", []byte("encrypted-envelope-one"),
		transportqueue.TransportInternet, now,
	)

	inserted, err := store.Enqueue(ctx, envelope)
	if err != nil || !inserted {
		t.Fatalf("enqueue fresh envelope: inserted=%v err=%v", inserted, err)
	}
	inserted, err = store.Enqueue(ctx, envelope)
	if err != nil || inserted {
		t.Fatalf("idempotent enqueue: inserted=%v err=%v", inserted, err)
	}

	conflicting := mustTransportEnvelope(t, envelope.ID, []byte("different-ciphertext"), transportqueue.TransportInternet, now)
	if _, err = store.Enqueue(ctx, conflicting); !errors.Is(err, transportqueue.ErrConflict) {
		t.Fatalf("identity collision was not rejected: %v", err)
	}

	lease, err := store.Claim(ctx, now, transportqueue.DefaultLease)
	if err != nil || lease == nil || lease.ID != envelope.ID || lease.Attempts != 1 {
		t.Fatalf("claim envelope: lease=%+v err=%v", lease, err)
	}
	if err = store.Complete(ctx, *lease, transportqueue.TransportBluetooth, now.Add(time.Second)); !errors.Is(err, transportqueue.ErrLeaseLost) {
		t.Fatalf("forbidden transport completed lease: %v", err)
	}
	if err = store.Complete(ctx, *lease, transportqueue.TransportInternet, now.Add(time.Second)); err != nil {
		t.Fatalf("complete leased envelope: %v", err)
	}
	if err = store.Complete(ctx, *lease, transportqueue.TransportInternet, now.Add(2*time.Second)); !errors.Is(err, transportqueue.ErrLeaseLost) {
		t.Fatalf("stale completion was accepted: %v", err)
	}
	lease, err = store.Claim(ctx, now.Add(3*time.Second), transportqueue.DefaultLease)
	if err != nil || lease != nil {
		t.Fatalf("delivered envelope was reclaimed: lease=%+v err=%v", lease, err)
	}
}

func TestTransportQueueRetryAndCrossTransportInboundDeduplication(t *testing.T) {
	db, err := database.ConnectEmbeddedDB(":memory:")
	if err != nil {
		t.Fatalf("connect embedded database: %v", err)
	}
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()
	now := time.Date(2026, 7, 17, 13, 0, 0, 0, time.UTC)
	envelope := mustTransportEnvelope(t,
		"018f4d1e-7614-7a3a-8e37-61f0f75a0002", []byte("encrypted-envelope-two"),
		transportqueue.TransportLocalNetwork|transportqueue.TransportBluetooth, now,
	)
	if inserted, err := store.Enqueue(ctx, envelope); err != nil || !inserted {
		t.Fatalf("enqueue retry envelope: inserted=%v err=%v", inserted, err)
	}

	first, err := store.Claim(ctx, now, transportqueue.DefaultLease)
	if err != nil || first == nil {
		t.Fatalf("claim first attempt: lease=%+v err=%v", first, err)
	}
	retryAt := now.Add(transportqueue.RetryDelay(first.Attempts))
	if err = store.Defer(ctx, *first, "peer_unreachable", retryAt, false, now); err != nil {
		t.Fatalf("defer first attempt: %v", err)
	}
	if early, err := store.Claim(ctx, retryAt.Add(-time.Nanosecond), transportqueue.DefaultLease); err != nil || early != nil {
		t.Fatalf("retry became available early: lease=%+v err=%v", early, err)
	}
	second, err := store.Claim(ctx, retryAt, transportqueue.DefaultLease)
	if err != nil || second == nil || second.Attempts != 2 || second.Owner == first.Owner {
		t.Fatalf("claim retry: lease=%+v err=%v", second, err)
	}
	if err = store.Defer(ctx, *first, "stale_worker", retryAt.Add(time.Second), false, retryAt); !errors.Is(err, transportqueue.ErrLeaseLost) {
		t.Fatalf("stale worker mutated renewed lease: %v", err)
	}
	if err = store.Complete(ctx, *second, transportqueue.TransportBluetooth, retryAt.Add(time.Second)); err != nil {
		t.Fatalf("complete Bluetooth delivery: %v", err)
	}

	inboundID := "018f4d1e-7614-7a3a-8e37-61f0f75a0003"
	hash := sha256.Sum256([]byte("authenticated-inbound-envelope"))
	expiresAt := now.Add(24 * time.Hour)
	claim, err := store.ClaimInbound(ctx, inboundID, hash, transportqueue.TransportBluetooth, now, expiresAt)
	if err != nil || claim != transportqueue.InboundAccepted {
		t.Fatalf("claim fresh inbound envelope: claim=%v err=%v", claim, err)
	}
	claim, err = store.ClaimInbound(ctx, inboundID, hash, transportqueue.TransportInternet, now.Add(time.Second), expiresAt)
	if err != nil || claim != transportqueue.InboundDuplicate {
		t.Fatalf("cross-transport duplicate not recognized: claim=%v err=%v", claim, err)
	}
	otherHash := sha256.Sum256([]byte("forged-envelope"))
	if _, err = store.ClaimInbound(ctx, inboundID, otherHash, transportqueue.TransportInternet, now.Add(2*time.Second), expiresAt); !errors.Is(err, transportqueue.ErrConflict) {
		t.Fatalf("replay collision was not rejected: %v", err)
	}
}

func mustTransportEnvelope(t *testing.T, id string, payload []byte, transports transportqueue.Transport, now time.Time) transportqueue.Envelope {
	t.Helper()
	envelope, err := transportqueue.NewEnvelope(
		id, "@recipient:gaiacom.local", payload, []byte("detached-signature"), transports, 75, now, now.Add(24*time.Hour),
	)
	if err != nil {
		t.Fatalf("construct transport envelope: %v", err)
	}
	return envelope
}
