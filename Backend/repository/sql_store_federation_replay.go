package repository

import (
	"context"
	"database/sql"
	"time"
)

func (s *SQLStore) ClaimFederationPDU(ctx context.Context, origin string, pduID string, leaseUntil time.Time) (bool, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().UTC()
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM federation_replay_guard WHERE status = 'completed' AND processed_at < ?`,
		now.Add(-2*time.Hour),
	); err != nil {
		return false, err
	}

	result, err := tx.ExecContext(ctx,
		`INSERT OR IGNORE INTO federation_replay_guard
		 (origin, pdu_id, status, lease_until, created_at, updated_at)
		 VALUES (?, ?, 'processing', ?, ?, ?)`,
		origin, pduID, leaseUntil.UTC(), now, now,
	)
	if err != nil {
		return false, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	if rows == 0 {
		result, err = tx.ExecContext(ctx,
			`UPDATE federation_replay_guard
			 SET lease_until = ?, updated_at = ?
			 WHERE origin = ? AND pdu_id = ? AND status = 'processing' AND lease_until < ?`,
			leaseUntil.UTC(), now, origin, pduID, now,
		)
		if err != nil {
			return false, err
		}
		rows, err = result.RowsAffected()
		if err != nil {
			return false, err
		}
	}
	if err := tx.Commit(); err != nil {
		return false, err
	}
	return rows == 1, nil
}

func (s *SQLStore) CompleteFederationPDU(ctx context.Context, origin string, pduID string, processedAt time.Time) error {
	result, err := s.db.ExecContext(ctx,
		`UPDATE federation_replay_guard
		 SET status = 'completed', lease_until = NULL, processed_at = ?, updated_at = ?
		 WHERE origin = ? AND pdu_id = ? AND status = 'processing'`,
		processedAt.UTC(), processedAt.UTC(), origin, pduID,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) ReleaseFederationPDU(ctx context.Context, origin string, pduID string) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM federation_replay_guard WHERE origin = ? AND pdu_id = ? AND status = 'processing'`,
		origin, pduID,
	)
	return err
}
