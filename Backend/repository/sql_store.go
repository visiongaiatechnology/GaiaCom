// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"
)

const sqlTimeFormat = time.RFC3339Nano

type SQLStore struct {
	db *sql.DB
}

func NewSQLStore(db *sql.DB) *SQLStore {
	return &SQLStore{db: db}
}

func (s *SQLStore) execWithBusyRetry(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	var result sql.Result
	err := withSQLiteBusyRetry(ctx, func() error {
		var execErr error
		result, execErr = s.db.ExecContext(ctx, query, args...)
		return execErr
	})
	return result, err
}

func withSQLiteBusyRetry(ctx context.Context, operation func() error) error {
	const attempts = 10
	backoff := 25 * time.Millisecond
	var err error
	for attempt := 0; attempt < attempts; attempt++ {
		err = operation()
		if !isSQLiteBusyError(err) {
			return err
		}
		if attempt == attempts-1 {
			return err
		}
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
		if backoff < time.Second {
			backoff *= 2
		}
	}
	return err
}

func isSQLiteBusyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "sqlite_busy") ||
		strings.Contains(msg, "sqlite_locked") ||
		strings.Contains(msg, "database is locked") ||
		strings.Contains(msg, "database table is locked")
}
