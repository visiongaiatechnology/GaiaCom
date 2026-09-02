// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/sha256"
	"errors"
	"sync"
	"time"

	"gaiacom/backend/transportqueue"
)

type QueuedEnvelope struct {
	mu     sync.Mutex
	lease  transportqueue.Lease
	closed bool
}

func (n *Node) QueueEnvelope(
	envelopeID string,
	recipient string,
	payload []byte,
	signature []byte,
	allowedTransports int,
	priority int,
	createdAtUnixMillis int64,
	expiresAtUnixMillis int64,
) (bool, error) {
	if n == nil {
		return false, errors.New("mobile node is required")
	}
	if priority < 0 || priority > 100 || allowedTransports < 1 || allowedTransports > int(transportqueue.TransportAll) {
		return false, errors.New("mobile transport envelope was rejected")
	}
	envelope, err := transportqueue.NewEnvelope(
		envelopeID,
		recipient,
		payload,
		signature,
		transportqueue.Transport(allowedTransports),
		uint8(priority),
		time.UnixMilli(createdAtUnixMillis),
		time.UnixMilli(expiresAtUnixMillis),
	)
	if err != nil {
		return false, errors.New("mobile transport envelope was rejected")
	}
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed || n.registry == nil || n.handle == 0 {
		return false, errors.New("mobile node is closed")
	}
	inserted, err := n.registry.EnqueueTransport(n.context, n.handle, envelope)
	if err != nil {
		return false, errors.New("mobile transport enqueue failed")
	}
	return inserted, nil
}

func (n *Node) ClaimEnvelope(nowUnixMillis int64) (*QueuedEnvelope, error) {
	if n == nil {
		return nil, errors.New("mobile node is required")
	}
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed || n.registry == nil || n.handle == 0 {
		return nil, errors.New("mobile node is closed")
	}
	lease, err := n.registry.ClaimTransport(n.context, n.handle, time.UnixMilli(nowUnixMillis))
	if err != nil {
		return nil, errors.New("mobile transport claim failed")
	}
	if lease == nil {
		return nil, nil
	}
	return &QueuedEnvelope{lease: *lease}, nil
}

func (n *Node) CompleteEnvelope(envelope *QueuedEnvelope, transport int, nowUnixMillis int64) error {
	if n == nil {
		return errors.New("mobile node is required")
	}
	via := transportqueue.Transport(transport)
	if envelope == nil || !via.ValidSingle() {
		return errors.New("mobile transport completion was rejected")
	}
	envelope.mu.Lock()
	defer envelope.mu.Unlock()
	if envelope.closed {
		return errors.New("mobile transport envelope is closed")
	}
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed || n.registry == nil || n.handle == 0 {
		return errors.New("mobile node is closed")
	}
	if err := n.registry.CompleteTransport(n.context, n.handle, envelope.lease, via, time.UnixMilli(nowUnixMillis)); err != nil {
		return errors.New("mobile transport completion failed")
	}
	envelope.closeLocked()
	return nil
}

func (n *Node) DeferEnvelope(envelope *QueuedEnvelope, errorCode string, deadLetter bool, nowUnixMillis int64) error {
	if n == nil {
		return errors.New("mobile node is required")
	}
	if envelope == nil || !transportqueue.ValidErrorCode(errorCode) {
		return errors.New("mobile transport deferral was rejected")
	}
	envelope.mu.Lock()
	defer envelope.mu.Unlock()
	if envelope.closed {
		return errors.New("mobile transport envelope is closed")
	}
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed || n.registry == nil || n.handle == 0 {
		return errors.New("mobile node is closed")
	}
	if err := n.registry.DeferTransport(n.context, n.handle, envelope.lease, errorCode, time.UnixMilli(nowUnixMillis), deadLetter); err != nil {
		return errors.New("mobile transport deferral failed")
	}
	envelope.closeLocked()
	return nil
}

func (n *Node) ClaimInboundEnvelope(
	envelopeID string,
	payloadHash []byte,
	transport int,
	nowUnixMillis int64,
	expiresAtUnixMillis int64,
) (int, error) {
	if n == nil {
		return 0, errors.New("mobile node is required")
	}
	via := transportqueue.Transport(transport)
	if len(payloadHash) != sha256.Size || !via.ValidSingle() {
		return 0, errors.New("mobile inbound envelope was rejected")
	}
	var hash [sha256.Size]byte
	copy(hash[:], payloadHash)
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed || n.registry == nil || n.handle == 0 {
		return 0, errors.New("mobile node is closed")
	}
	claim, err := n.registry.ClaimInboundTransport(
		n.context, n.handle, envelopeID, hash, via,
		time.UnixMilli(nowUnixMillis), time.UnixMilli(expiresAtUnixMillis),
	)
	if err != nil {
		return 0, errors.New("mobile inbound envelope claim failed")
	}
	return int(claim), nil
}

func (e *QueuedEnvelope) EnvelopeID() string {
	if e == nil {
		return ""
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.lease.ID
}

func (e *QueuedEnvelope) Recipient() string {
	if e == nil {
		return ""
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.lease.Recipient
}

func (e *QueuedEnvelope) Payload() []byte {
	if e == nil {
		return nil
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.closed {
		return nil
	}
	return clone(e.lease.Payload)
}

func (e *QueuedEnvelope) AllowedTransports() int {
	if e == nil {
		return 0
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return int(e.lease.AllowedTransports)
}

func (e *QueuedEnvelope) Attempts() int {
	if e == nil {
		return 0
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.lease.Attempts
}

func (e *QueuedEnvelope) Close() {
	if e == nil {
		return
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.closeLocked()
}

func (e *QueuedEnvelope) closeLocked() {
	if e.closed {
		return
	}
	e.closed = true
	wipe(e.lease.Payload)
	wipe(e.lease.Signature)
	e.lease = transportqueue.Lease{}
}
