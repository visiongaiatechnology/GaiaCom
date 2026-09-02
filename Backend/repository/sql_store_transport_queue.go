// STATUS: DIAMANT VGT SUPREME
package repository

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"errors"
	"time"

	"gaiacom/backend/transportqueue"
)

var _ transportqueue.Store = (*SQLStore)(nil)

func (s *SQLStore) Enqueue(ctx context.Context, envelope transportqueue.Envelope) (bool, error) {
	if !transportqueue.VerifyPayload(envelope.Payload, envelope.PayloadHash) {
		return false, transportqueue.ErrIntegrity
	}
	result, err := s.execWithBusyRetry(ctx,
		`INSERT OR IGNORE INTO transport_outbox
		 (envelope_id, recipient, payload, payload_hash, signature, allowed_transports, priority, status, attempts,
		  next_attempt_at, lease_owner, lease_until, last_error_code, created_at, updated_at, expires_at, delivered_at, delivered_via)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, '', '', '', ?, ?, ?, '', '')`,
		envelope.ID, envelope.Recipient, envelope.Payload, envelope.PayloadHash[:], envelope.Signature,
		int(envelope.AllowedTransports), int(envelope.Priority), formatTime(envelope.CreatedAt),
		formatTime(envelope.CreatedAt), formatTime(envelope.CreatedAt), formatTime(envelope.ExpiresAt),
	)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	if affected == 1 {
		return true, nil
	}
	return false, s.verifyExistingEnvelope(ctx, envelope)
}

func (s *SQLStore) verifyExistingEnvelope(ctx context.Context, envelope transportqueue.Envelope) error {
	var recipient string
	var payloadHash, signature []byte
	var allowed int
	err := s.db.QueryRowContext(ctx,
		`SELECT recipient, payload_hash, signature, allowed_transports FROM transport_outbox WHERE envelope_id = ?`,
		envelope.ID,
	).Scan(&recipient, &payloadHash, &signature, &allowed)
	if err != nil {
		return err
	}
	hashMatches := len(payloadHash) == sha256.Size && subtle.ConstantTimeCompare(payloadHash, envelope.PayloadHash[:]) == 1
	signatureMatches := len(signature) == len(envelope.Signature) && subtle.ConstantTimeCompare(signature, envelope.Signature) == 1
	if recipient != envelope.Recipient || !hashMatches || !signatureMatches || allowed != int(envelope.AllowedTransports) {
		return transportqueue.ErrConflict
	}
	return nil
}

func (s *SQLStore) Claim(ctx context.Context, now time.Time, leaseDuration time.Duration) (*transportqueue.Lease, error) {
	if now.IsZero() || leaseDuration <= 0 || leaseDuration > 10*time.Minute {
		return nil, transportqueue.ErrInvalidInput
	}
	now = now.UTC()
	owner, err := transportqueue.NewLeaseOwner()
	if err != nil {
		return nil, err
	}
	_, _ = s.execWithBusyRetry(ctx,
		`UPDATE transport_outbox SET status = 'dead_letter', lease_owner = '', lease_until = '', updated_at = ?,
		 last_error_code = CASE WHEN expires_at <= ? THEN 'expired' ELSE 'attempt_limit' END
		 WHERE status IN ('pending', 'leased') AND (expires_at <= ? OR attempts >= ?)`,
		formatTime(now), formatTime(now), formatTime(now), transportqueue.MaxAttempts,
	)
	leaseUntil := now.Add(leaseDuration)
	row := s.db.QueryRowContext(ctx,
		`UPDATE transport_outbox
		 SET status = 'leased', attempts = attempts + 1, lease_owner = ?, lease_until = ?, updated_at = ?
		 WHERE envelope_id = (
		  SELECT envelope_id FROM transport_outbox
		  WHERE expires_at > ? AND attempts < ? AND
		   ((status = 'pending' AND next_attempt_at <= ?) OR (status = 'leased' AND lease_until <= ?))
		  ORDER BY priority DESC, next_attempt_at ASC, created_at ASC LIMIT 1
		 )
		 RETURNING envelope_id, recipient, payload, payload_hash, signature, allowed_transports, priority,
		 attempts, created_at, expires_at, lease_owner, lease_until`,
		owner, formatTime(leaseUntil), formatTime(now), formatTime(now), transportqueue.MaxAttempts,
		formatTime(now), formatTime(now),
	)
	lease, err := scanTransportLease(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !transportqueue.VerifyPayload(lease.Payload, lease.PayloadHash) {
		_, _ = s.execWithBusyRetry(ctx,
			`UPDATE transport_outbox SET status = 'dead_letter', lease_owner = '', lease_until = '',
			 last_error_code = 'integrity_failure', updated_at = ? WHERE envelope_id = ? AND lease_owner = ?`,
			formatTime(now), lease.ID, lease.Owner,
		)
		return nil, transportqueue.ErrIntegrity
	}
	return lease, nil
}

func scanTransportLease(row *sql.Row) (*transportqueue.Lease, error) {
	var lease transportqueue.Lease
	var payloadHash []byte
	var allowed, priority int
	var createdAt, expiresAt, leaseUntil string
	err := row.Scan(&lease.ID, &lease.Recipient, &lease.Payload, &payloadHash, &lease.Signature, &allowed,
		&priority, &lease.Attempts, &createdAt, &expiresAt, &lease.Owner, &leaseUntil)
	if err != nil {
		return nil, err
	}
	if len(payloadHash) != sha256.Size || allowed < 1 || allowed > int(transportqueue.TransportAll) || priority < 0 || priority > 100 {
		return nil, transportqueue.ErrIntegrity
	}
	copy(lease.PayloadHash[:], payloadHash)
	lease.AllowedTransports = transportqueue.Transport(allowed)
	lease.Priority = uint8(priority)
	lease.CreatedAt = parseTime(createdAt)
	lease.ExpiresAt = parseTime(expiresAt)
	lease.Until = parseTime(leaseUntil)
	if lease.CreatedAt.IsZero() || lease.ExpiresAt.IsZero() || lease.Until.IsZero() {
		return nil, transportqueue.ErrIntegrity
	}
	return &lease, nil
}

func (s *SQLStore) Complete(ctx context.Context, lease transportqueue.Lease, via transportqueue.Transport, now time.Time) error {
	if lease.ID == "" || lease.Owner == "" || !via.ValidSingle() || now.IsZero() {
		return transportqueue.ErrInvalidInput
	}
	result, err := s.execWithBusyRetry(ctx,
		`UPDATE transport_outbox SET status = 'delivered', delivered_at = ?, delivered_via = ?, updated_at = ?,
		 lease_owner = '', lease_until = '', last_error_code = ''
		 WHERE envelope_id = ? AND status = 'leased' AND lease_owner = ? AND lease_until > ?
		 AND (allowed_transports & ?) != 0`,
		formatTime(now.UTC()), via.Name(), formatTime(now.UTC()), lease.ID, lease.Owner, formatTime(now.UTC()), int(via),
	)
	return requireSingleLeaseMutation(result, err)
}

func (s *SQLStore) Defer(ctx context.Context, lease transportqueue.Lease, errorCode string, nextAttempt time.Time, deadLetter bool, now time.Time) error {
	if lease.ID == "" || lease.Owner == "" || !transportqueue.ValidErrorCode(errorCode) || now.IsZero() {
		return transportqueue.ErrInvalidInput
	}
	status := "pending"
	if deadLetter || lease.Attempts >= transportqueue.MaxAttempts {
		status = "dead_letter"
	} else if !nextAttempt.After(now) || nextAttempt.After(lease.ExpiresAt) {
		return transportqueue.ErrInvalidInput
	}
	result, err := s.execWithBusyRetry(ctx,
		`UPDATE transport_outbox SET status = ?, next_attempt_at = ?, last_error_code = ?, updated_at = ?,
		 lease_owner = '', lease_until = '' WHERE envelope_id = ? AND status = 'leased' AND lease_owner = ?`,
		status, formatTime(nextAttempt.UTC()), errorCode, formatTime(now.UTC()), lease.ID, lease.Owner,
	)
	return requireSingleLeaseMutation(result, err)
}

func requireSingleLeaseMutation(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return transportqueue.ErrLeaseLost
	}
	return nil
}

func (s *SQLStore) ClaimInbound(ctx context.Context, envelopeID string, payloadHash [sha256.Size]byte, via transportqueue.Transport, now, expiresAt time.Time) (transportqueue.InboundClaim, error) {
	if _, err := transportqueue.NewEnvelope(envelopeID, "inbound", []byte{1}, []byte{1}, via, 0, now, expiresAt); err != nil || !via.ValidSingle() {
		return 0, transportqueue.ErrInvalidInput
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, `DELETE FROM transport_inbox_dedup WHERE envelope_id = ? AND expires_at <= ?`, envelopeID, formatTime(now.UTC())); err != nil {
		return 0, err
	}
	result, err := tx.ExecContext(ctx,
		`INSERT OR IGNORE INTO transport_inbox_dedup (envelope_id, payload_hash, received_via, first_seen_at, expires_at)
		 VALUES (?, ?, ?, ?, ?)`, envelopeID, payloadHash[:], via.Name(), formatTime(now.UTC()), formatTime(expiresAt.UTC()))
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	if affected == 1 {
		if err = tx.Commit(); err != nil {
			return 0, err
		}
		return transportqueue.InboundAccepted, nil
	}
	var existing []byte
	if err = tx.QueryRowContext(ctx, `SELECT payload_hash FROM transport_inbox_dedup WHERE envelope_id = ?`, envelopeID).Scan(&existing); err != nil {
		return 0, err
	}
	if len(existing) != sha256.Size || subtle.ConstantTimeCompare(existing, payloadHash[:]) != 1 {
		return 0, transportqueue.ErrConflict
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return transportqueue.InboundDuplicate, nil
}
