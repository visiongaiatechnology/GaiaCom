// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/sha256"
	"errors"
	"time"

	"gaiacom/backend/transportqueue"
)

func (n *EmbeddedNode) EnqueueTransport(ctx context.Context, envelope transportqueue.Envelope) (bool, error) {
	store, release, err := n.beginTransportOperation(ctx)
	if err != nil {
		return false, err
	}
	defer release()
	return store.Enqueue(ctx, envelope)
}

func (n *EmbeddedNode) ClaimTransport(ctx context.Context, now time.Time) (*transportqueue.Lease, error) {
	store, release, err := n.beginTransportOperation(ctx)
	if err != nil {
		return nil, err
	}
	defer release()
	return store.Claim(ctx, now, transportqueue.DefaultLease)
}

func (n *EmbeddedNode) CompleteTransport(ctx context.Context, lease transportqueue.Lease, via transportqueue.Transport, now time.Time) error {
	store, release, err := n.beginTransportOperation(ctx)
	if err != nil {
		return err
	}
	defer release()
	return store.Complete(ctx, lease, via, now)
}

func (n *EmbeddedNode) DeferTransport(ctx context.Context, lease transportqueue.Lease, errorCode string, now time.Time, deadLetter bool) error {
	store, release, err := n.beginTransportOperation(ctx)
	if err != nil {
		return err
	}
	defer release()
	nextAttempt := now.UTC().Add(transportqueue.RetryDelay(lease.Attempts))
	return store.Defer(ctx, lease, errorCode, nextAttempt, deadLetter, now)
}

func (n *EmbeddedNode) ClaimInboundTransport(
	ctx context.Context,
	envelopeID string,
	payloadHash [sha256.Size]byte,
	via transportqueue.Transport,
	now time.Time,
	expiresAt time.Time,
) (transportqueue.InboundClaim, error) {
	store, release, err := n.beginTransportOperation(ctx)
	if err != nil {
		return 0, err
	}
	defer release()
	return store.ClaimInbound(ctx, envelopeID, payloadHash, via, now, expiresAt)
}

func (n *EmbeddedNode) beginTransportOperation(ctx context.Context) (transportqueue.Store, func(), error) {
	if n == nil {
		return nil, nil, errors.New("embedded node is nil")
	}
	if ctx == nil {
		return nil, nil, errors.New("transport context is required")
	}
	select {
	case <-ctx.Done():
		return nil, nil, ctx.Err()
	default:
	}
	n.mu.RLock()
	if n.closed || n.queue == nil {
		n.mu.RUnlock()
		return nil, nil, errors.New("embedded node is closed")
	}
	n.wait.Add(1)
	store := n.queue
	n.mu.RUnlock()
	return store, n.wait.Done, nil
}
