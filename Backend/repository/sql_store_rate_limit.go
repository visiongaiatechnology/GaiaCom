package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

func (s *SQLStore) IncrementSecurityRateLimit(ctx context.Context, key string, window time.Duration) (int, error) {
	if ctx == nil || key == "" || window <= 0 {
		return 0, errors.New("invalid security rate-limit request")
	}
	now := utcNow()
	expiresAt := now.Add(window)
	var count int
	err := withSQLiteBusyRetry(ctx, func() error {
		return s.db.QueryRowContext(
			ctx,
			`INSERT INTO security_rate_limits (scope_key, hit_count, window_start, expires_at, updated_at)
			 VALUES (?, 1, ?, ?, ?)
			 ON CONFLICT(scope_key) DO UPDATE SET
			   hit_count = CASE WHEN security_rate_limits.expires_at <= excluded.updated_at THEN 1 ELSE security_rate_limits.hit_count + 1 END,
			   window_start = CASE WHEN security_rate_limits.expires_at <= excluded.updated_at THEN excluded.window_start ELSE security_rate_limits.window_start END,
			   expires_at = CASE WHEN security_rate_limits.expires_at <= excluded.updated_at THEN excluded.expires_at ELSE security_rate_limits.expires_at END,
			   updated_at = excluded.updated_at
			 RETURNING hit_count`,
			key,
			formatTime(now),
			formatTime(expiresAt),
			formatTime(now),
		).Scan(&count)
	})
	if err != nil {
		return 0, err
	}
	_, _ = s.db.ExecContext(ctx, `DELETE FROM security_rate_limits WHERE expires_at <= ? AND scope_key <> ?`, formatTime(now), key)
	return count, nil
}

func (s *SQLStore) GetSecurityRateLimitCount(ctx context.Context, key string) (int, error) {
	if ctx == nil || key == "" {
		return 0, errors.New("invalid security rate-limit request")
	}
	var count int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT hit_count FROM security_rate_limits WHERE scope_key = ? AND expires_at > ?`,
		key,
		formatTime(utcNow()),
	).Scan(&count)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return count, err
}

func (s *SQLStore) ResetSecurityRateLimit(ctx context.Context, key string) error {
	if ctx == nil || key == "" {
		return errors.New("invalid security rate-limit request")
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM security_rate_limits WHERE scope_key = ?`, key)
	return err
}
