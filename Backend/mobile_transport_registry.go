// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/sha256"
	"errors"
	"time"

	"gaiacom/backend/transportqueue"
)

func (r *MobileNodeRegistry) EnqueueTransport(ctx context.Context, handle MobileNodeHandle, envelope transportqueue.Envelope) (bool, error) {
	node, err := r.transportNode(handle)
	if err != nil {
		return false, err
	}
	return node.EnqueueTransport(ctx, envelope)
}

func (r *MobileNodeRegistry) ClaimTransport(ctx context.Context, handle MobileNodeHandle, now time.Time) (*transportqueue.Lease, error) {
	node, err := r.transportNode(handle)
	if err != nil {
		return nil, err
	}
	return node.ClaimTransport(ctx, now)
}

func (r *MobileNodeRegistry) CompleteTransport(ctx context.Context, handle MobileNodeHandle, lease transportqueue.Lease, via transportqueue.Transport, now time.Time) error {
	node, err := r.transportNode(handle)
	if err != nil {
		return err
	}
	return node.CompleteTransport(ctx, lease, via, now)
}

func (r *MobileNodeRegistry) DeferTransport(ctx context.Context, handle MobileNodeHandle, lease transportqueue.Lease, errorCode string, now time.Time, deadLetter bool) error {
	node, err := r.transportNode(handle)
	if err != nil {
		return err
	}
	return node.DeferTransport(ctx, lease, errorCode, now, deadLetter)
}

func (r *MobileNodeRegistry) ClaimInboundTransport(
	ctx context.Context,
	handle MobileNodeHandle,
	envelopeID string,
	payloadHash [sha256.Size]byte,
	via transportqueue.Transport,
	now time.Time,
	expiresAt time.Time,
) (transportqueue.InboundClaim, error) {
	node, err := r.transportNode(handle)
	if err != nil {
		return 0, err
	}
	return node.ClaimInboundTransport(ctx, envelopeID, payloadHash, via, now, expiresAt)
}

func (r *MobileNodeRegistry) transportNode(handle MobileNodeHandle) (*EmbeddedNode, error) {
	if r == nil || handle == 0 {
		return nil, errors.New("mobile node handle is invalid")
	}
	r.mu.RLock()
	node := r.nodes[handle]
	closed := r.closed
	r.mu.RUnlock()
	if closed {
		return nil, errors.New("mobile node registry is closed")
	}
	if node == nil {
		return nil, errors.New("mobile node handle was not found")
	}
	return node, nil
}
