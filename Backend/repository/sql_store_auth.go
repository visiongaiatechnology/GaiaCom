// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"time"
)

func (s *SQLStore) CountUsersByUsername(username string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(?)`, username).Scan(&count)
	return count, err
}

func (s *SQLStore) CreateUser(user *models.User) error {
	now := utcNow()
	user.CreatedAt = now
	user.UpdatedAt = now
	_, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO users (id, username, password_hash, public_key, allow_anonymous_stats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Username, user.PasswordHash, user.PublicKey, boolToInt(user.AllowAnonymousStats), formatTime(user.CreatedAt), formatTime(user.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindUserByUsername(username string) (*models.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, username, password_hash, public_key, allow_anonymous_stats, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1`,
		username,
	)
	return scanUser(row)
}

func (s *SQLStore) FindUserByID(id uuid.UUID) (*models.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, username, password_hash, public_key, allow_anonymous_stats, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
		id,
	)
	return scanUser(row)
}

func (s *SQLStore) UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
		passwordHash,
		formatTime(utcNow()),
		userID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) UpdateUserAnonymousStats(ctx context.Context, userID uuid.UUID, allow bool) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE users SET allow_anonymous_stats = ?, updated_at = ? WHERE id = ?`,
		boolToInt(allow),
		formatTime(utcNow()),
		userID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) DeleteUserAccount(ctx context.Context, userID uuid.UUID) (err error) {
	if userID == uuid.Nil {
		return sql.ErrNoRows
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollbackUnlessCommitted(tx, &err)

	identityRows, err := tx.QueryContext(ctx, `SELECT id, gaia_id FROM identities WHERE user_id = ?`, userID)
	if err != nil {
		return err
	}
	var identityIDs []uuid.UUID
	var gaiaIDs []string
	for identityRows.Next() {
		var identityID uuid.UUID
		var gaiaID string
		if scanErr := identityRows.Scan(&identityID, &gaiaID); scanErr != nil {
			_ = identityRows.Close()
			return scanErr
		}
		identityIDs = append(identityIDs, identityID)
		gaiaIDs = append(gaiaIDs, gaiaID)
	}
	if closeErr := identityRows.Close(); closeErr != nil {
		return closeErr
	}
	if err = identityRows.Err(); err != nil {
		return err
	}

	if len(gaiaIDs) > 0 {
		args := make([]interface{}, 0, len(gaiaIDs)*2)
		for _, gaiaID := range gaiaIDs {
			args = append(args, gaiaID)
		}
		for _, gaiaID := range gaiaIDs {
			args = append(args, gaiaID)
		}
		messageQuery := `SELECT id FROM message_envelopes WHERE sender IN (` + placeholders(len(gaiaIDs)) + `) OR recipient IN (` + placeholders(len(gaiaIDs)) + `)`
		messageRows, queryErr := tx.QueryContext(ctx, messageQuery, args...)
		if queryErr != nil {
			return queryErr
		}
		var messageIDs []uuid.UUID
		for messageRows.Next() {
			var messageID uuid.UUID
			if scanErr := messageRows.Scan(&messageID); scanErr != nil {
				_ = messageRows.Close()
				return scanErr
			}
			messageIDs = append(messageIDs, messageID)
		}
		if closeErr := messageRows.Close(); closeErr != nil {
			return closeErr
		}
		if err = messageRows.Err(); err != nil {
			return err
		}
		if len(messageIDs) > 0 {
			reportQuery, reportArgs := inClause(`DELETE FROM reports WHERE message_id IN (`, `)`, messageIDs)
			if _, err = tx.ExecContext(ctx, reportQuery, reportArgs...); err != nil {
				return err
			}
			messageDeleteQuery, messageDeleteArgs := inClause(`DELETE FROM message_envelopes WHERE id IN (`, `)`, messageIDs)
			if _, err = tx.ExecContext(ctx, messageDeleteQuery, messageDeleteArgs...); err != nil {
				return err
			}
		}
	}

	if len(identityIDs) > 0 {
		roomQuery, roomArgs := inClause(`DELETE FROM rooms WHERE created_by IN (`, `)`, identityIDs)
		if _, err = tx.ExecContext(ctx, roomQuery, roomArgs...); err != nil {
			return err
		}
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, userID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return sql.ErrNoRows
	}

	err = tx.Commit()
	return err
}

func (s *SQLStore) CreateDeviceSession(ctx context.Context, session *models.DeviceSession) error {
	now := utcNow()
	if session.ID == uuid.Nil {
		session.ID = uuid.New()
	}
	session.CreatedAt = now
	session.LastSeenAt = now
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO device_sessions (id, user_id, device_label, device_type, os, browser, ip_address, user_agent, created_at, last_seen_at, revoked_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
		session.ID,
		session.UserID,
		session.DeviceLabel,
		session.DeviceType,
		session.OS,
		session.Browser,
		session.IPAddress,
		session.UserAgent,
		formatTime(session.CreatedAt),
		formatTime(session.LastSeenAt),
	)
	return err
}

func (s *SQLStore) FindDeviceSessionsForUser(ctx context.Context, userID uuid.UUID) ([]models.DeviceSession, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, device_label, device_type, os, browser, ip_address, user_agent, created_at, last_seen_at, revoked_at
		 FROM device_sessions
		 WHERE user_id = ?
		 ORDER BY COALESCE(NULLIF(last_seen_at, ''), created_at) DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.DeviceSession
	for rows.Next() {
		session, err := scanDeviceSession(rows)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, *session)
	}
	return sessions, rows.Err()
}

func (s *SQLStore) FindActiveDeviceSession(ctx context.Context, sessionID uuid.UUID) (*models.DeviceSession, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id, user_id, device_label, device_type, os, browser, ip_address, user_agent, created_at, last_seen_at, revoked_at
		 FROM device_sessions
		 WHERE id = ? AND revoked_at = ''
		 LIMIT 1`,
		sessionID,
	)
	return scanDeviceSession(row)
}

func (s *SQLStore) UpdateDeviceSessionLastSeen(ctx context.Context, sessionID uuid.UUID, lastSeenAt time.Time) error {
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE device_sessions SET last_seen_at = ? WHERE id = ? AND revoked_at = ''`,
		formatTime(lastSeenAt),
		sessionID,
	)
	return err
}

func (s *SQLStore) RevokeDeviceSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE device_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at = ''`,
		formatTime(utcNow()),
		sessionID,
		userID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return sql.ErrNoRows
	}
	return nil
}
