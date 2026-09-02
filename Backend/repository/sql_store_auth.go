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

func (s *SQLStore) UpdateUserPasswordAndRevokeSessions(ctx context.Context, userID uuid.UUID, passwordHash string, keepSessionID uuid.UUID) (err error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollbackUnlessCommitted(tx, &err)
	result, err := tx.ExecContext(ctx, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, passwordHash, formatTime(utcNow()), userID)
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
	now := formatTime(utcNow())
	if keepSessionID == uuid.Nil {
		_, err = tx.ExecContext(ctx, `UPDATE device_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at = ''`, now, userID)
	} else {
		_, err = tx.ExecContext(ctx, `UPDATE device_sessions SET revoked_at = ? WHERE user_id = ? AND id <> ? AND revoked_at = ''`, now, userID, keepSessionID)
	}
	if err != nil {
		return err
	}
	return tx.Commit()
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

func (s *SQLStore) GetNotificationPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	preferences := &models.NotificationPreferences{
		UserID: userID, Enabled: true, ShowPreview: false,
		QuietHoursEnabled: false, QuietHoursStart: "22:00", QuietHoursEnd: "07:00",
	}
	var enabled, showPreview, quietHoursEnabled int
	var updatedAt string
	err := s.db.QueryRowContext(ctx, `SELECT enabled, show_preview, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at FROM user_notification_preferences WHERE user_id = ?`, userID).
		Scan(&enabled, &showPreview, &quietHoursEnabled, &preferences.QuietHoursStart, &preferences.QuietHoursEnd, &updatedAt)
	if err == sql.ErrNoRows {
		return preferences, nil
	}
	if err != nil {
		return nil, err
	}
	preferences.Enabled = enabled != 0
	preferences.ShowPreview = showPreview != 0
	preferences.QuietHoursEnabled = quietHoursEnabled != 0
	preferences.UpdatedAt = parseTime(updatedAt)
	return preferences, nil
}

func (s *SQLStore) SaveNotificationPreferences(ctx context.Context, preferences *models.NotificationPreferences) error {
	if preferences == nil || preferences.UserID == uuid.Nil {
		return sql.ErrNoRows
	}
	preferences.UpdatedAt = utcNow()
	_, err := s.execWithBusyRetry(ctx, `INSERT INTO user_notification_preferences (user_id, enabled, show_preview, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, show_preview = excluded.show_preview, quiet_hours_enabled = excluded.quiet_hours_enabled, quiet_hours_start = excluded.quiet_hours_start, quiet_hours_end = excluded.quiet_hours_end, updated_at = excluded.updated_at`,
		preferences.UserID, boolToInt(preferences.Enabled), boolToInt(preferences.ShowPreview), boolToInt(preferences.QuietHoursEnabled), preferences.QuietHoursStart, preferences.QuietHoursEnd, formatTime(preferences.UpdatedAt))
	return err
}

func (s *SQLStore) CreateDevicePairing(ctx context.Context, pairing *models.DevicePairing) error {
	if pairing == nil || pairing.ID == uuid.Nil || pairing.UserID == uuid.Nil || pairing.IdentityID == uuid.Nil {
		return sql.ErrNoRows
	}
	pairing.CreatedAt = utcNow()
	_, err := s.execWithBusyRetry(ctx, `INSERT INTO device_pairings (id, user_id, identity_id, secret_hash, device_label, device_box_public, device_kem_public, device_sign_public, status, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, pairing.ID, pairing.UserID, pairing.IdentityID, pairing.SecretHash, pairing.DeviceLabel, pairing.DeviceBoxPublic, pairing.DeviceKemPublic, pairing.DeviceSignPublic, pairing.Status, formatTime(pairing.ExpiresAt), formatTime(pairing.CreatedAt))
	return err
}

func (s *SQLStore) FindDevicePairing(ctx context.Context, pairingID uuid.UUID) (*models.DevicePairing, error) {
	pairing := &models.DevicePairing{ID: pairingID}
	var expiresAt, approvedAt, consumedAt, createdAt string
	err := s.db.QueryRowContext(ctx, `SELECT user_id, identity_id, secret_hash, device_label, device_box_public, device_kem_public, device_sign_public, status, encrypted_payload, approval_signature, expires_at, approved_at, consumed_at, created_at FROM device_pairings WHERE id = ?`, pairingID).
		Scan(&pairing.UserID, &pairing.IdentityID, &pairing.SecretHash, &pairing.DeviceLabel, &pairing.DeviceBoxPublic, &pairing.DeviceKemPublic, &pairing.DeviceSignPublic, &pairing.Status, &pairing.EncryptedPayload, &pairing.ApprovalSignature, &expiresAt, &approvedAt, &consumedAt, &createdAt)
	if err != nil {
		return nil, err
	}
	pairing.ExpiresAt, pairing.ApprovedAt, pairing.ConsumedAt, pairing.CreatedAt = parseTime(expiresAt), parseTime(approvedAt), parseTime(consumedAt), parseTime(createdAt)
	return pairing, nil
}

func (s *SQLStore) ApproveDevicePairing(ctx context.Context, pairingID uuid.UUID, encryptedPayload, signature string, approvedAt time.Time) error {
	result, err := s.execWithBusyRetry(ctx, `UPDATE device_pairings SET status = 'approved', encrypted_payload = ?, approval_signature = ?, approved_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?`, encryptedPayload, signature, formatTime(approvedAt), pairingID, formatTime(utcNow()))
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

func (s *SQLStore) ConsumeDevicePairing(ctx context.Context, pairingID, sessionID uuid.UUID, consumedAt time.Time) (_ *models.DeviceKey, err error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)
	var userID, identityID uuid.UUID
	var label, boxPublic, kemPublic, signPublic string
	err = tx.QueryRowContext(ctx, `SELECT user_id, identity_id, device_label, device_box_public, device_kem_public, device_sign_public FROM device_pairings WHERE id = ? AND status = 'approved' AND expires_at > ?`, pairingID, formatTime(consumedAt)).Scan(&userID, &identityID, &label, &boxPublic, &kemPublic, &signPublic)
	if err != nil {
		return nil, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE device_pairings SET status = 'consumed', consumed_at = ? WHERE id = ? AND status = 'approved'`, formatTime(consumedAt), pairingID)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		return nil, sql.ErrNoRows
	}
	key := &models.DeviceKey{ID: uuid.New(), UserID: userID, IdentityID: identityID, DeviceLabel: label, BoxPublic: boxPublic, KemPublic: kemPublic, SignPublic: signPublic, Status: "active", CreatedAt: consumedAt}
	_, err = tx.ExecContext(ctx, `INSERT INTO device_keys (id, user_id, identity_id, device_label, box_public, kem_public, sign_public, status, created_at, revoked_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, '')
		ON CONFLICT(identity_id, box_public, kem_public) DO UPDATE SET sign_public = excluded.sign_public, status = 'active', revoked_at = ''`, uuid.New(), userID, identityID, label, boxPublic, kemPublic, signPublic, formatTime(consumedAt))
	if err != nil {
		return nil, err
	}
	var createdAt, revokedAt string
	err = tx.QueryRowContext(ctx, `SELECT id, user_id, identity_id, device_label, box_public, kem_public, sign_public, status, created_at, revoked_at FROM device_keys WHERE identity_id = ? AND box_public = ? AND kem_public = ?`, identityID, boxPublic, kemPublic).
		Scan(&key.ID, &key.UserID, &key.IdentityID, &key.DeviceLabel, &key.BoxPublic, &key.KemPublic, &key.SignPublic, &key.Status, &createdAt, &revokedAt)
	if err != nil {
		return nil, err
	}
	key.CreatedAt, key.RevokedAt = parseTime(createdAt), parseTime(revokedAt)
	if sessionID != uuid.Nil {
		result, err = tx.ExecContext(ctx, `UPDATE device_sessions SET device_key_id = ? WHERE id = ? AND user_id = ? AND revoked_at = ''`, key.ID, sessionID, userID)
		if err != nil {
			return nil, err
		}
		affected, err = result.RowsAffected()
		if err != nil {
			return nil, err
		}
		if affected != 1 {
			return nil, sql.ErrNoRows
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return key, nil
}

func (s *SQLStore) FindDeviceKeysForUser(ctx context.Context, userID uuid.UUID) ([]models.DeviceKey, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, identity_id, device_label, box_public, kem_public, sign_public, status, created_at, revoked_at FROM device_keys WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := make([]models.DeviceKey, 0)
	for rows.Next() {
		var key models.DeviceKey
		var createdAt, revokedAt string
		if err := rows.Scan(&key.ID, &key.UserID, &key.IdentityID, &key.DeviceLabel, &key.BoxPublic, &key.KemPublic, &key.SignPublic, &key.Status, &createdAt, &revokedAt); err != nil {
			return nil, err
		}
		key.CreatedAt, key.RevokedAt = parseTime(createdAt), parseTime(revokedAt)
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (s *SQLStore) FindActiveDeviceKeysForIdentity(ctx context.Context, identityID uuid.UUID) ([]models.DeviceKey, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, identity_id, device_label, box_public, kem_public, sign_public, status, created_at, revoked_at FROM device_keys WHERE identity_id = ? AND status = 'active' AND revoked_at = '' ORDER BY created_at ASC`, identityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := make([]models.DeviceKey, 0)
	for rows.Next() {
		var key models.DeviceKey
		var createdAt, revokedAt string
		if err := rows.Scan(&key.ID, &key.UserID, &key.IdentityID, &key.DeviceLabel, &key.BoxPublic, &key.KemPublic, &key.SignPublic, &key.Status, &createdAt, &revokedAt); err != nil {
			return nil, err
		}
		key.CreatedAt, key.RevokedAt = parseTime(createdAt), parseTime(revokedAt)
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (s *SQLStore) FindActiveDeviceKey(ctx context.Context, identityID, keyID uuid.UUID) (*models.DeviceKey, error) {
	key := &models.DeviceKey{ID: keyID, IdentityID: identityID}
	var createdAt, revokedAt string
	err := s.db.QueryRowContext(ctx, `SELECT user_id, device_label, box_public, kem_public, sign_public, status, created_at, revoked_at FROM device_keys WHERE id = ? AND identity_id = ? AND status = 'active' AND revoked_at = '' LIMIT 1`, keyID, identityID).
		Scan(&key.UserID, &key.DeviceLabel, &key.BoxPublic, &key.KemPublic, &key.SignPublic, &key.Status, &createdAt, &revokedAt)
	if err != nil {
		return nil, err
	}
	key.CreatedAt, key.RevokedAt = parseTime(createdAt), parseTime(revokedAt)
	return key, nil
}

func (s *SQLStore) RevokeDeviceKey(ctx context.Context, userID, keyID uuid.UUID, revokedAt time.Time) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()
	result, err := tx.ExecContext(ctx, `UPDATE device_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND user_id = ? AND status = 'active'`, formatTime(revokedAt), keyID, userID)
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
	if _, err = tx.ExecContext(ctx, `UPDATE device_sessions SET revoked_at = ?, refresh_token_hash = '', refresh_family_id = '', refresh_expires_at = '' WHERE user_id = ? AND device_key_id = ? AND revoked_at = ''`, formatTime(revokedAt), userID, keyID); err != nil {
		return err
	}
	if err = tx.Commit(); err != nil {
		return err
	}
	committed = true
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

func (s *SQLStore) SetDeviceSessionRefresh(ctx context.Context, sessionID uuid.UUID, tokenHash string, familyID uuid.UUID, expiresAt time.Time) error {
	result, err := s.execWithBusyRetry(ctx, `UPDATE device_sessions SET refresh_token_hash = ?, refresh_family_id = ?, refresh_expires_at = ? WHERE id = ? AND revoked_at = ''`, tokenHash, familyID, formatTime(expiresAt), sessionID)
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

func (s *SQLStore) FindDeviceSessionForRefresh(ctx context.Context, sessionID uuid.UUID) (*models.DeviceSession, error) {
	session := &models.DeviceSession{ID: sessionID}
	var createdAt, lastSeenAt, revokedAt, refreshExpiresAt, familyID string
	err := s.db.QueryRowContext(ctx, `SELECT user_id, device_label, device_type, os, browser, ip_address, user_agent, created_at, last_seen_at, revoked_at, refresh_token_hash, refresh_family_id, refresh_expires_at FROM device_sessions WHERE id = ? LIMIT 1`, sessionID).
		Scan(&session.UserID, &session.DeviceLabel, &session.DeviceType, &session.OS, &session.Browser, &session.IPAddress, &session.UserAgent, &createdAt, &lastSeenAt, &revokedAt, &session.RefreshTokenHash, &familyID, &refreshExpiresAt)
	if err != nil {
		return nil, err
	}
	session.CreatedAt, session.LastSeenAt, session.RevokedAt, session.RefreshExpiresAt = parseTime(createdAt), parseTime(lastSeenAt), parseTime(revokedAt), parseTime(refreshExpiresAt)
	if familyID != "" {
		session.RefreshFamilyID, _ = uuid.Parse(familyID)
	}
	return session, nil
}

func (s *SQLStore) RotateDeviceSessionRefresh(ctx context.Context, sessionID uuid.UUID, expectedHash, nextHash string, nextExpiresAt time.Time) (bool, error) {
	result, err := s.execWithBusyRetry(ctx, `UPDATE device_sessions SET refresh_token_hash = ?, refresh_expires_at = ?, last_seen_at = ? WHERE id = ? AND revoked_at = '' AND refresh_token_hash = ? AND refresh_expires_at > ?`, nextHash, formatTime(nextExpiresAt), formatTime(utcNow()), sessionID, expectedHash, formatTime(utcNow()))
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
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

func (s *SQLStore) RevokeAllDeviceSessionsExcept(ctx context.Context, userID uuid.UUID, keepSessionID uuid.UUID) error {
	if userID == uuid.Nil {
		return sql.ErrNoRows
	}
	now := formatTime(utcNow())
	if keepSessionID == uuid.Nil {
		_, err := s.execWithBusyRetry(ctx, `UPDATE device_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at = ''`, now, userID)
		return err
	}
	_, err := s.execWithBusyRetry(ctx, `UPDATE device_sessions SET revoked_at = ? WHERE user_id = ? AND id <> ? AND revoked_at = ''`, now, userID, keepSessionID)
	return err
}
