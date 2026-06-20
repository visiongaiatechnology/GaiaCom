package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

const sqlTimeFormat = time.RFC3339Nano

type SQLStore struct {
	db *sql.DB
}

func NewSQLStore(db *sql.DB) *SQLStore {
	return &SQLStore{db: db}
}

func (s *SQLStore) CountUsersByUsername(username string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM users WHERE username = ?`, username).Scan(&count)
	return count, err
}

func (s *SQLStore) CreateUser(user *models.User) error {
	now := utcNow()
	user.CreatedAt = now
	user.UpdatedAt = now
	_, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO users (id, username, password_hash, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		user.ID, user.Username, user.PasswordHash, user.PublicKey, formatTime(user.CreatedAt), formatTime(user.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindUserByUsername(username string) (*models.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, username, password_hash, public_key, created_at, updated_at FROM users WHERE username = ? LIMIT 1`,
		username,
	)
	return scanUser(row)
}

func (s *SQLStore) FindUserByID(id uuid.UUID) (*models.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, username, password_hash, public_key, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
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

func (s *SQLStore) CountIdentitiesByGaiaID(gaiaID string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM identities WHERE gaia_id = ?`, gaiaID).Scan(&count)
	return count, err
}

func (s *SQLStore) CreateIdentity(identity *models.Identity) error {
	now := utcNow()
	identity.CreatedAt = now
	identity.UpdatedAt = now
	_, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO identities (id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		identity.ID,
		identity.UserID,
		identity.GaiaID,
		identity.DisplayName,
		[]byte(identity.Keys),
		[]byte(identity.PublicRecord),
		boolInt(identity.IsActive),
		formatTime(identity.CreatedAt),
		formatTime(identity.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindIdentityByGaiaID(gaiaID string) (*models.Identity, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE gaia_id = ? LIMIT 1`,
		gaiaID,
	)
	return scanIdentity(row)
}

func (s *SQLStore) FindIdentityByID(id uuid.UUID) (*models.Identity, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE id = ? LIMIT 1`,
		id,
	)
	return scanIdentity(row)
}

func (s *SQLStore) FindIdentitiesByUserID(userID uuid.UUID) ([]models.Identity, error) {
	rows, err := s.db.QueryContext(
		context.Background(),
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE user_id = ? ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	identities := make([]models.Identity, 0)
	for rows.Next() {
		identity, err := scanIdentityRows(rows)
		if err != nil {
			return nil, err
		}
		identities = append(identities, identity)
	}
	return identities, rows.Err()
}

func (s *SQLStore) IdentityBelongsToUser(identityID uuid.UUID, userID uuid.UUID) (bool, error) {
	var count int64
	err := s.db.QueryRowContext(
		context.Background(),
		`SELECT COUNT(*) FROM identities WHERE id = ? AND user_id = ? AND is_active = 1`,
		identityID,
		userID,
	).Scan(&count)
	return count == 1, err
}

func (s *SQLStore) SaveMessageEnvelopeWithInbox(ctx context.Context, envelope *models.MessageEnvelope, recipientIDs []uuid.UUID) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollbackUnlessCommitted(tx, &err)

	envelope.CreatedAt = utcNow()
	proofInput := extractMessageProofInput(envelope.Payload)
	envelopeHash := sha256.Sum256([]byte(envelope.Payload))
	var senderIdentityArg interface{}
	if envelope.SenderIdentityID != uuid.Nil {
		senderIdentityArg = envelope.SenderIdentityID
	}
	if _, err = tx.ExecContext(
		ctx,
		`INSERT INTO message_envelopes (id, type, sender, recipient, payload, signature, channel_id, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		envelope.ID,
		envelope.Type,
		envelope.Sender,
		envelope.Recipient,
		[]byte(envelope.Payload),
		proofInput.SenderSignature,
		envelope.ChannelID,
		formatTime(envelope.CreatedAt),
	); err != nil {
		return err
	}

	if _, err = tx.ExecContext(
		ctx,
		`INSERT INTO message_proofs (message_id, sender_identity_id, sender, recipient, ciphertext_hash, sender_signature, envelope_hash, server_received_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		envelope.ID,
		senderIdentityArg,
		envelope.Sender,
		envelope.Recipient,
		proofInput.CiphertextHash,
		proofInput.SenderSignature,
		hex.EncodeToString(envelopeHash[:]),
		formatTime(envelope.CreatedAt),
		formatTime(envelope.CreatedAt),
	); err != nil {
		return err
	}

	// Check if sender is quarantined or the transport is explicitly unsafe.
	untrusted := 0
	if envelope.Type == "smtp.legacy" {
		untrusted = 1
	}
	var publicRecord []byte
	err = tx.QueryRowContext(ctx, `SELECT public_record FROM identities WHERE gaia_id = ? LIMIT 1`, envelope.Sender).Scan(&publicRecord)
	if err == nil {
		var pubRecord struct {
			PublicKeys struct {
				Identity string `json:"identity"`
			} `json:"public_keys"`
		}
		if err := json.Unmarshal(publicRecord, &pubRecord); err == nil && pubRecord.PublicKeys.Identity != "" {
			var quarantinedUntilStr string
			err := tx.QueryRowContext(ctx, `SELECT quarantined_until FROM abuse_scores WHERE sender_public_key = ? LIMIT 1`, pubRecord.PublicKeys.Identity).Scan(&quarantinedUntilStr)
			if err == nil && quarantinedUntilStr != "" {
				quarantinedUntil := parseTime(quarantinedUntilStr)
				if quarantinedUntil.After(utcNow()) {
					untrusted = 1
				}
			}
		}
	}

	for _, recipientID := range recipientIDs {
		if _, err = tx.ExecContext(
			ctx,
			`INSERT INTO inboxes (identity_id, message_id, is_read, delivered, untrusted) VALUES (?, ?, 0, 1, ?)`,
			recipientID,
			envelope.ID,
			untrusted,
		); err != nil {
			return err
		}
		recipientGaia := ""
		_ = tx.QueryRowContext(ctx, `SELECT gaia_id FROM identities WHERE id = ? LIMIT 1`, recipientID).Scan(&recipientGaia)
		deliveredAt := utcNow()
		receiptInput := envelope.ID.String() + ":" + recipientID.String() + ":" + proofInput.CiphertextHash + ":" + formatTime(deliveredAt)
		receiptHash := sha256.Sum256([]byte(receiptInput))
		tamperInput := hex.EncodeToString(envelopeHash[:]) + ":" + hex.EncodeToString(receiptHash[:])
		tamperHash := sha256.Sum256([]byte(tamperInput))
		if _, err = tx.ExecContext(
			ctx,
			`INSERT INTO delivery_receipts (message_id, identity_id, recipient, delivered, delivered_at, receipt_hash, tamper_evidence, created_at)
			 VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
			envelope.ID,
			recipientID,
			recipientGaia,
			formatTime(deliveredAt),
			hex.EncodeToString(receiptHash[:]),
			hex.EncodeToString(tamperHash[:]),
			formatTime(deliveredAt),
		); err != nil {
			return err
		}
	}

	err = tx.Commit()
	return err
}

func (s *SQLStore) FindInboxEntriesByIdentity(ctx context.Context, identityID uuid.UUID) ([]models.Inbox, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, identity_id, message_id, is_read, delivered, untrusted FROM inboxes WHERE identity_id = ? ORDER BY id DESC`,
		identityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]models.Inbox, 0)
	for rows.Next() {
		var entry models.Inbox
		var isRead int
		var delivered int
		var untrusted int
		if err := rows.Scan(&entry.ID, &entry.IdentityID, &entry.MessageID, &isRead, &delivered, &untrusted); err != nil {
			return nil, err
		}
		entry.IsRead = isRead != 0
		entry.Delivered = delivered != 0
		entry.Untrusted = untrusted != 0
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (s *SQLStore) FindMessageEnvelopesByIDs(ctx context.Context, ids []uuid.UUID) ([]*models.MessageEnvelope, error) {
	if len(ids) == 0 {
		return []*models.MessageEnvelope{}, nil
	}

	query, args := inClause(
		`SELECT id, type, sender, recipient, payload, signature, channel_id, created_at FROM message_envelopes WHERE id IN (`,
		`) ORDER BY created_at DESC`,
		ids,
	)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	envelopes := make([]*models.MessageEnvelope, 0, len(ids))
	for rows.Next() {
		envelope, err := scanMessageEnvelopeRows(rows)
		if err != nil {
			return nil, err
		}
		envelopes = append(envelopes, &envelope)
	}
	return envelopes, rows.Err()
}

func (s *SQLStore) MarkInboxMessagesReadForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) error {
	if len(messageIDs) == 0 {
		return nil
	}
	query, args := inClause(
		`UPDATE inboxes
		 SET is_read = 1
		 WHERE identity_id = ? AND message_id IN (`,
		`) AND EXISTS (
			SELECT 1 FROM identities i
			WHERE i.id = inboxes.identity_id AND i.user_id = ?
		 )`,
		messageIDs,
	)
	args = append([]interface{}{identityID}, args...)
	args = append(args, userID)
	_, err := s.db.ExecContext(ctx, query, args...)
	return err
}

func (s *SQLStore) FindMessageProofForUser(ctx context.Context, userID uuid.UUID, messageID uuid.UUID) (*models.MessageProof, error) {
	proof, err := scanMessageProof(s.db.QueryRowContext(
		ctx,
		`SELECT mp.id, mp.message_id, mp.sender_identity_id, mp.sender, mp.recipient, mp.ciphertext_hash,
			mp.sender_signature, mp.envelope_hash, mp.server_received_at, mp.created_at
		 FROM message_proofs mp
		 WHERE mp.message_id = ? AND (
			EXISTS (
				SELECT 1 FROM identities si
				WHERE si.id = mp.sender_identity_id AND si.user_id = ?
			) OR EXISTS (
				SELECT 1
				FROM inboxes ib
				JOIN identities ri ON ri.id = ib.identity_id
				WHERE ib.message_id = mp.message_id AND ri.user_id = ?
			)
		 )
		 LIMIT 1`,
		messageID,
		userID,
		userID,
	))
	if err != nil {
		if err == sql.ErrNoRows {
			// Try fallback from message_envelopes
			var envID string
			var sender string
			var recipient string
			var payload []byte
			var signature string
			var createdAt string

			errEnv := s.db.QueryRowContext(
				ctx,
				`SELECT id, sender, recipient, payload, signature, created_at
				 FROM message_envelopes
				 WHERE id = ? AND (
					EXISTS (
						SELECT 1 FROM identities si
						WHERE si.gaia_id = message_envelopes.sender AND si.user_id = ?
					) OR EXISTS (
						SELECT 1
						FROM inboxes ib
						JOIN identities ri ON ri.id = ib.identity_id
						WHERE ib.message_id = message_envelopes.id AND ri.user_id = ?
					)
				 ) LIMIT 1`,
				messageID,
				userID,
				userID,
			).Scan(&envID, &sender, &recipient, &payload, &signature, &createdAt)

			if errEnv == nil {
				var ciphertextHash string
				var pubRecord struct {
					PayloadCiphertext string `json:"payload_ciphertext"`
					Signature         string `json:"signature"`
				}
				if errJson := json.Unmarshal(payload, &pubRecord); errJson == nil && pubRecord.PayloadCiphertext != "" {
					h := sha256.Sum256([]byte(pubRecord.PayloadCiphertext))
					ciphertextHash = hex.EncodeToString(h[:])
					if signature == "" {
						signature = pubRecord.Signature
					}
				}

				hEnv := sha256.Sum256(payload)
				envelopeHash := hex.EncodeToString(hEnv[:])

				parsedMsgID, _ := uuid.Parse(envID)

				var senderIdentityID uuid.UUID
				_ = s.db.QueryRowContext(ctx, `SELECT id FROM identities WHERE gaia_id = ? LIMIT 1`, sender).Scan(&senderIdentityID)

				proof = &models.MessageProof{
					ID:               0,
					MessageID:        parsedMsgID,
					SenderIdentity:   senderIdentityID,
					Sender:           sender,
					Recipient:        recipient,
					CiphertextHash:   ciphertextHash,
					SenderSignature:  signature,
					EnvelopeHash:     envelopeHash,
					ServerReceivedAt: parseTime(createdAt),
					CreatedAt:        parseTime(createdAt),
				}
				receipts, _ := s.findDeliveryReceiptsForMessage(ctx, userID, messageID)
				proof.Receipts = receipts
				return proof, nil
			}
		}
		return nil, err
	}

	receipts, err := s.findDeliveryReceiptsForMessage(ctx, userID, messageID)
	if err != nil {
		return nil, err
	}
	proof.Receipts = receipts
	return proof, nil
}

func (s *SQLStore) DeleteInboxMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, forEveryone bool) error {
	if forEveryone {
		result, err := s.db.ExecContext(
			ctx,
			`DELETE FROM message_envelopes
			 WHERE id = ? AND EXISTS (
				SELECT 1 FROM identities i
				WHERE i.id = ? AND i.user_id = ? AND (message_envelopes.sender = i.gaia_id OR message_envelopes.recipient = i.gaia_id)
			 )`,
			messageID,
			identityID,
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

	result, err := s.db.ExecContext(
		ctx,
		`DELETE FROM inboxes
		 WHERE identity_id = ? AND message_id = ? AND EXISTS (
			SELECT 1 FROM identities i WHERE i.id = inboxes.identity_id AND i.user_id = ?
		 )`,
		identityID,
		messageID,
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

func (s *SQLStore) ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool) (int64, error) {
	if forEveryone {
		args := []interface{}{identityID, userID}
		filter := ""
		if channelID != "" {
			filter = ` AND message_envelopes.channel_id = ?`
			args = append(args, channelID)
		} else {
			filter = ` AND ((message_envelopes.sender = i.gaia_id AND message_envelopes.recipient = ?) OR (message_envelopes.sender = ? AND message_envelopes.recipient = i.gaia_id))`
			args = append(args, peerGaiaID, peerGaiaID)
		}

		result, err := s.db.ExecContext(
			ctx,
			`DELETE FROM message_envelopes
			 WHERE EXISTS (
				SELECT 1 FROM identities i
				WHERE i.id = ? AND i.user_id = ?`+filter+`
			 )`,
			args...,
		)
		if err != nil {
			return 0, err
		}
		return result.RowsAffected()
	}

	args := []interface{}{identityID, userID}
	filter := ""
	if channelID != "" {
		filter = ` AND me.channel_id = ?`
		args = append(args, channelID)
	} else {
		filter = ` AND (me.sender = ? OR me.recipient = ?)`
		args = append(args, peerGaiaID, peerGaiaID)
	}
	result, err := s.db.ExecContext(
		ctx,
		`DELETE FROM inboxes
		 WHERE identity_id = ? AND EXISTS (
			SELECT 1 FROM identities i WHERE i.id = inboxes.identity_id AND i.user_id = ?
		 ) AND EXISTS (
			SELECT 1 FROM message_envelopes me WHERE me.id = inboxes.message_id`+filter+`
		 )`,
		args...,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func (s *SQLStore) CreateFileMetadata(metadata *models.FileMetadata) error {
	now := utcNow()
	metadata.CreatedAt = now
	metadata.UpdatedAt = now
	_, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO file_metadata (file_id, user_id, file_name, file_size, file_hash, mime_type, encryption_iv, path, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		metadata.FileID,
		metadata.UserID,
		metadata.FileName,
		metadata.FileSize,
		metadata.FileHash,
		metadata.MimeType,
		metadata.EncryptionIV,
		metadata.Path,
		metadata.Status,
		formatTime(metadata.CreatedAt),
		formatTime(metadata.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindPendingFileForUser(fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT file_id, user_id, file_name, file_size, file_hash, mime_type, encryption_iv, path, status, created_at, updated_at
		 FROM file_metadata WHERE file_id = ? AND user_id = ? AND status = 'pending' LIMIT 1`,
		fileID,
		userID,
	)
	return scanFileMetadata(row)
}

func (s *SQLStore) CreateFileChunk(chunk *models.FileChunk) error {
	result, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO file_chunks (file_id, chunk_index, chunk_hash, chunk_size, minio_id) VALUES (?, ?, ?, ?, ?)`,
		chunk.FileID,
		chunk.Index,
		chunk.ChunkHash,
		chunk.ChunkSize,
		chunk.MinioID,
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		chunk.ID = uint(id)
	}
	return nil
}

func (s *SQLStore) FinalizePendingUpload(fileID uuid.UUID, userID uuid.UUID) (bool, error) {
	result, err := s.db.ExecContext(
		context.Background(),
		`UPDATE file_metadata SET status = 'complete', updated_at = ? WHERE file_id = ? AND user_id = ? AND status = 'pending'`,
		formatTime(utcNow()),
		fileID,
		userID,
	)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	return affected > 0, err
}

func (s *SQLStore) CreateGaiaDropSubmission(ctx context.Context, drop *models.GaiaDropSubmission) error {
	drop.CreatedAt = utcNow()
	if drop.Status == "" {
		drop.Status = "new"
	}
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO gaia_drop_submissions (id, target_identity_id, target_gaia_id, sender_label, payload, payload_hash, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		drop.ID,
		drop.TargetIdentityID,
		drop.TargetGaiaID,
		drop.SenderLabel,
		[]byte(drop.Payload),
		drop.PayloadHash,
		drop.Status,
		formatTime(drop.CreatedAt),
	)
	return err
}

func (s *SQLStore) FindGaiaDropSubmissionsForIdentity(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.GaiaDropSubmission, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT gd.id, gd.target_identity_id, gd.target_gaia_id, gd.sender_label, gd.payload, gd.payload_hash, gd.status, gd.created_at
		 FROM gaia_drop_submissions gd
		 JOIN identities i ON i.id = gd.target_identity_id
		 WHERE gd.target_identity_id = ? AND i.user_id = ?
		 ORDER BY gd.created_at DESC`,
		identityID,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	submissions := make([]models.GaiaDropSubmission, 0)
	for rows.Next() {
		submission, err := scanGaiaDropSubmissionRows(rows)
		if err != nil {
			return nil, err
		}
		submissions = append(submissions, submission)
	}
	return submissions, rows.Err()
}

func (s *SQLStore) AddFederationQueueItem(item *models.FederationQueue) error {
	now := utcNow()
	item.CreatedAt = now
	item.UpdatedAt = now
	if item.Status == "" {
		item.Status = models.QueueStatusPending
	}
	result, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO federation_queues (pdu_id, pdu_payload, target_url, status, attempts, last_error, next_retry, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		item.PDUID,
		[]byte(item.PDUPayload),
		item.TargetURL,
		string(item.Status),
		item.Attempts,
		item.LastError,
		formatTime(item.NextRetry),
		formatTime(item.CreatedAt),
		formatTime(item.UpdatedAt),
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		item.ID = uint(id)
	}
	return nil
}

func (s *SQLStore) ClaimNextFederationQueueItem(ctx context.Context) (*models.FederationQueue, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)

	item, err := scanFederationQueue(tx.QueryRowContext(
		ctx,
		`SELECT id, pdu_id, pdu_payload, target_url, status, attempts, last_error, next_retry, created_at, updated_at
		 FROM federation_queues
		 WHERE status = ? AND next_retry <= ?
		 ORDER BY next_retry ASC
		 LIMIT 1`,
		string(models.QueueStatusPending),
		formatTime(utcNow()),
	))
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.Commit()
		return nil, err
	}
	if err != nil {
		return nil, err
	}

	item.Status = models.QueueStatusSending
	item.Attempts++
	item.UpdatedAt = utcNow()
	result, err := tx.ExecContext(
		ctx,
		`UPDATE federation_queues SET status = ?, attempts = ?, updated_at = ? WHERE id = ? AND status = ?`,
		string(item.Status),
		item.Attempts,
		formatTime(item.UpdatedAt),
		item.ID,
		string(models.QueueStatusPending),
	)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		err = tx.Commit()
		return nil, err
	}

	err = tx.Commit()
	return item, err
}

func (s *SQLStore) DeleteFederationQueueItem(ctx context.Context, itemID uint) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM federation_queues WHERE id = ?`, itemID)
	return err
}

func (s *SQLStore) SaveFederationQueueItem(ctx context.Context, item *models.FederationQueue) error {
	item.UpdatedAt = utcNow()
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE federation_queues
		 SET pdu_id = ?, pdu_payload = ?, target_url = ?, status = ?, attempts = ?, last_error = ?, next_retry = ?, updated_at = ?
		 WHERE id = ?`,
		item.PDUID,
		[]byte(item.PDUPayload),
		item.TargetURL,
		string(item.Status),
		item.Attempts,
		item.LastError,
		formatTime(item.NextRetry),
		formatTime(item.UpdatedAt),
		item.ID,
	)
	return err
}

func (s *SQLStore) FindFederationServer(domain string) (*models.FederationServer, error) {
	return scanFederationServer(s.db.QueryRowContext(
		context.Background(),
		`SELECT id, domain, public_key, first_seen_at, last_seen_at, is_blocked FROM federation_servers WHERE domain = ? LIMIT 1`,
		domain,
	))
}

func (s *SQLStore) FindAllFederationServers() ([]models.FederationServer, error) {
	rows, err := s.db.QueryContext(
		context.Background(),
		`SELECT id, domain, public_key, first_seen_at, last_seen_at, is_blocked FROM federation_servers ORDER BY domain ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []models.FederationServer
	for rows.Next() {
		server, err := scanFederationServer(rows)
		if err != nil {
			return nil, err
		}
		servers = append(servers, *server)
	}
	return servers, rows.Err()
}

func (s *SQLStore) CreateFederationServer(server *models.FederationServer) error {
	result, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO federation_servers (domain, public_key, first_seen_at, last_seen_at, is_blocked) VALUES (?, ?, ?, ?, ?)`,
		server.Domain,
		server.PublicKey,
		formatTime(server.FirstSeenAt),
		formatTime(server.LastSeenAt),
		boolInt(server.IsBlocked),
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		server.ID = uint(id)
	}
	return nil
}

func (s *SQLStore) UpdateFederationServerLastSeen(server *models.FederationServer) error {
	server.LastSeenAt = utcNow()
	_, err := s.db.ExecContext(
		context.Background(),
		`UPDATE federation_servers SET last_seen_at = ? WHERE id = ?`,
		formatTime(server.LastSeenAt),
		server.ID,
	)
	return err
}

func (s *SQLStore) CreateRoomWithMembers(ctx context.Context, room *models.Room, members []models.RoomMember) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollbackUnlessCommitted(tx, &err)

	now := utcNow()
	room.CreatedAt = now
	room.UpdatedAt = now
	if _, err = tx.ExecContext(
		ctx,
		`INSERT INTO rooms (id, name, is_private, created_by, description, avatar, secret_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		room.ID,
		room.Name,
		boolInt(room.IsPrivate),
		room.CreatedBy,
		room.Description,
		room.Avatar,
		room.SecretHash,
		formatTime(room.CreatedAt),
		formatTime(room.UpdatedAt),
	); err != nil {
		return err
	}

	for index := range members {
		members[index].JoinedAt = now
		result, insertErr := tx.ExecContext(
			ctx,
			`INSERT INTO room_members (room_id, identity_id, role, joined_at) VALUES (?, ?, ?, ?)`,
			members[index].RoomID,
			members[index].IdentityID,
			members[index].Role,
			formatTime(members[index].JoinedAt),
		)
		if insertErr != nil {
			return insertErr
		}
		id, idErr := result.LastInsertId()
		if idErr == nil {
			members[index].ID = uint(id)
		}
	}
	room.Members = members

	err = tx.Commit()
	return err
}

func (s *SQLStore) FindRooms(ctx context.Context, userID uuid.UUID) ([]models.Room, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, created_at, updated_at
		 FROM rooms r
		 WHERE r.is_private = 0 OR EXISTS (
			SELECT 1
			FROM room_members rm
			JOIN identities i ON i.id = rm.identity_id
			WHERE rm.room_id = r.id AND i.user_id = ?
		 )
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := make([]models.Room, 0)
	roomIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		room, err := scanRoomRows(rows)
		if err != nil {
			return nil, err
		}
		roomIDs = append(roomIDs, room.ID)
		rooms = append(rooms, room)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(roomIDs) == 0 {
		return rooms, nil
	}

	memberRoomIDs, err := s.findRoomsJoinedByUser(ctx, roomIDs, userID)
	if err != nil {
		return nil, err
	}
	if len(memberRoomIDs) == 0 {
		for index := range rooms {
			rooms[index].SecretHash = ""
		}
		return rooms, nil
	}

	joinedRoomSet := make(map[uuid.UUID]struct{}, len(memberRoomIDs))
	for _, roomID := range memberRoomIDs {
		joinedRoomSet[roomID] = struct{}{}
	}

	membersByRoom, err := s.findRoomMembers(ctx, memberRoomIDs, true)
	if err != nil {
		return nil, err
	}
	for index := range rooms {
		if _, joined := joinedRoomSet[rooms[index].ID]; joined {
			rooms[index].Members = membersByRoom[rooms[index].ID]
		} else {
			rooms[index].SecretHash = ""
		}
	}
	return rooms, nil
}

func (s *SQLStore) findRoomsJoinedByUser(ctx context.Context, roomIDs []uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
	if len(roomIDs) == 0 {
		return []uuid.UUID{}, nil
	}

	args := make([]interface{}, 0, len(roomIDs)+1)
	for _, roomID := range roomIDs {
		args = append(args, roomID)
	}
	args = append(args, userID)

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT DISTINCT rm.room_id
		 FROM room_members rm
		 JOIN identities i ON i.id = rm.identity_id
		 WHERE rm.room_id IN (`+placeholders(len(roomIDs))+`) AND i.user_id = ?`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	joined := make([]uuid.UUID, 0)
	for rows.Next() {
		var roomID uuid.UUID
		if err := rows.Scan(&roomID); err != nil {
			return nil, err
		}
		joined = append(joined, roomID)
	}
	return joined, rows.Err()
}

func (s *SQLStore) UpdateRoomMetadataForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string) (*models.Room, error) {
	now := utcNow()
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE rooms
		 SET name = ?, description = ?, avatar = ?, updated_at = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1
			FROM room_members rm
			JOIN identities i ON i.id = rm.identity_id
			WHERE rm.room_id = rooms.id AND i.user_id = ? AND rm.role = 'admin'
		 )`,
		name,
		description,
		avatar,
		formatTime(now),
		roomID,
		userID,
	)
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
	return s.FindRoomByID(ctx, roomID)
}

func (s *SQLStore) FindRoomByID(ctx context.Context, roomID uuid.UUID) (*models.Room, error) {
	room, err := scanRoom(s.db.QueryRowContext(
		ctx,
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, created_at, updated_at FROM rooms WHERE id = ? LIMIT 1`,
		roomID,
	))
	if err != nil {
		return nil, err
	}

	membersByRoom, err := s.findRoomMembers(ctx, []uuid.UUID{roomID}, true)
	if err != nil {
		return nil, err
	}
	room.Members = membersByRoom[roomID]
	return room, nil
}

func (s *SQLStore) FindRoomBySecretHash(ctx context.Context, hash string) (*models.Room, error) {
	room, err := scanRoom(s.db.QueryRowContext(
		ctx,
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, created_at, updated_at FROM rooms WHERE secret_hash = ? LIMIT 1`,
		hash,
	))
	if err != nil {
		return nil, err
	}

	membersByRoom, err := s.findRoomMembers(ctx, []uuid.UUID{room.ID}, true)
	if err != nil {
		return nil, err
	}
	room.Members = membersByRoom[room.ID]
	return room, nil
}

func (s *SQLStore) CreateChannel(ctx context.Context, channel *models.Channel) error {
	channel.CreatedAt = utcNow()
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO channels (id, room_id, name, created_at) VALUES (?, ?, ?, ?)`,
		channel.ID,
		channel.RoomID,
		channel.Name,
		formatTime(channel.CreatedAt),
	)
	return err
}

func (s *SQLStore) FindChannelsByRoom(ctx context.Context, roomID uuid.UUID) ([]models.Channel, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, room_id, name, created_at FROM channels WHERE room_id = ? ORDER BY created_at ASC`,
		roomID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.Channel
	for rows.Next() {
		var ch models.Channel
		var createdAt string
		if err := rows.Scan(&ch.ID, &ch.RoomID, &ch.Name, &createdAt); err != nil {
			return nil, err
		}
		ch.CreatedAt = parseTime(createdAt)
		channels = append(channels, ch)
	}
	return channels, rows.Err()
}

func (s *SQLStore) AddRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID, role string) error {
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO room_members (room_id, identity_id, role, joined_at) VALUES (?, ?, ?, ?)`,
		roomID,
		identityID,
		role,
		formatTime(utcNow()),
	)
	return err
}

func (s *SQLStore) RemoveRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID) error {
	_, err := s.db.ExecContext(
		ctx,
		`DELETE FROM room_members WHERE room_id = ? AND identity_id = ?`,
		roomID,
		identityID,
	)
	return err
}

func (s *SQLStore) UpdateRoomMemberRoleForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, identityID uuid.UUID, role string) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE room_members
		 SET role = ?
		 WHERE room_id = ? AND identity_id = ? AND EXISTS (
			SELECT 1
			FROM room_members admin_rm
			JOIN identities admin_i ON admin_i.id = admin_rm.identity_id
			WHERE admin_rm.room_id = room_members.room_id AND admin_i.user_id = ? AND admin_rm.role = 'admin'
		 )`,
		role,
		roomID,
		identityID,
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

func (s *SQLStore) UserIsRoomAdmin(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) (bool, error) {
	var count int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(1)
		 FROM room_members rm
		 JOIN identities i ON i.id = rm.identity_id
		 WHERE rm.room_id = ? AND i.user_id = ? AND rm.role = 'admin'`,
		roomID,
		userID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *SQLStore) DeleteRoom(ctx context.Context, roomID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM rooms WHERE id = ?`, roomID)
	return err
}

func (s *SQLStore) findRoomMembers(ctx context.Context, roomIDs []uuid.UUID, withIdentity bool) (map[uuid.UUID][]models.RoomMember, error) {
	args := make([]interface{}, len(roomIDs))
	for index, id := range roomIDs {
		args[index] = id
	}
	query := `SELECT id, room_id, identity_id, role, joined_at
		FROM room_members
		WHERE room_id IN (` + placeholders(len(roomIDs)) + `)
		ORDER BY joined_at ASC`
	if withIdentity {
		query = `SELECT rm.id, rm.room_id, rm.identity_id, rm.role, rm.joined_at,
			i.id, i.user_id, i.gaia_id, i.display_name, i.keys, i.public_record, i.is_active, i.created_at, i.updated_at
			FROM room_members rm
			LEFT JOIN identities i ON i.id = rm.identity_id
			WHERE rm.room_id IN (` + placeholders(len(roomIDs)) + `) ORDER BY rm.joined_at ASC`
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := make(map[uuid.UUID][]models.RoomMember, len(roomIDs))
	for rows.Next() {
		member, err := scanRoomMemberRows(rows, withIdentity)
		if err != nil {
			return nil, err
		}
		members[member.RoomID] = append(members[member.RoomID], member)
	}
	return members, rows.Err()
}

func (s *SQLStore) findDeliveryReceiptsForMessage(ctx context.Context, userID uuid.UUID, messageID uuid.UUID) ([]models.DeliveryReceipt, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT dr.id, dr.message_id, dr.identity_id, dr.recipient, dr.delivered, dr.delivered_at,
			dr.receipt_hash, dr.tamper_evidence, dr.created_at
		 FROM delivery_receipts dr
		 WHERE dr.message_id = ? AND (
			EXISTS (
				SELECT 1
				FROM identities ri
				WHERE ri.id = dr.identity_id AND ri.user_id = ?
			) OR EXISTS (
				SELECT 1
				FROM message_proofs mp
				JOIN identities si ON si.id = mp.sender_identity_id
				WHERE mp.message_id = dr.message_id AND si.user_id = ?
			)
		 )
		 ORDER BY dr.created_at ASC`,
		messageID,
		userID,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	receipts := make([]models.DeliveryReceipt, 0)
	for rows.Next() {
		receipt, err := scanDeliveryReceiptRows(rows)
		if err != nil {
			return nil, err
		}
		receipts = append(receipts, receipt)
	}
	return receipts, rows.Err()
}

type messageProofInput struct {
	CiphertextHash  string
	SenderSignature string
}

func extractMessageProofInput(payload models.JSONB) messageProofInput {
	var envelope struct {
		CiphertextHash    string `json:"ciphertext_hash"`
		SenderSignature   string `json:"signature"`
		PayloadCiphertext string `json:"payload_ciphertext"`
	}
	input := messageProofInput{
		CiphertextHash:  "",
		SenderSignature: "",
	}
	if err := json.Unmarshal(payload, &envelope); err == nil {
		input.CiphertextHash = strings.TrimSpace(envelope.CiphertextHash)
		input.SenderSignature = strings.TrimSpace(envelope.SenderSignature)
		if input.CiphertextHash == "" && envelope.PayloadCiphertext != "" {
			hash := sha256.Sum256([]byte(envelope.PayloadCiphertext))
			input.CiphertextHash = hex.EncodeToString(hash[:])
		}
	}
	if input.CiphertextHash == "" {
		hash := sha256.Sum256([]byte(payload))
		input.CiphertextHash = hex.EncodeToString(hash[:])
	}
	return input
}

func scanUser(row scanner) (*models.User, error) {
	var user models.User
	var createdAt string
	var updatedAt string
	if err := row.Scan(&user.ID, &user.Username, &user.PasswordHash, &user.PublicKey, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	user.CreatedAt = parseTime(createdAt)
	user.UpdatedAt = parseTime(updatedAt)
	return &user, nil
}

func scanDeviceSession(row scanner) (*models.DeviceSession, error) {
	var session models.DeviceSession
	var createdAt string
	var lastSeenAt string
	var revokedAt string
	if err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.DeviceLabel,
		&session.DeviceType,
		&session.OS,
		&session.Browser,
		&session.IPAddress,
		&session.UserAgent,
		&createdAt,
		&lastSeenAt,
		&revokedAt,
	); err != nil {
		return nil, err
	}
	session.CreatedAt = parseTime(createdAt)
	session.LastSeenAt = parseTime(lastSeenAt)
	if strings.TrimSpace(revokedAt) != "" {
		session.RevokedAt = parseTime(revokedAt)
	}
	return &session, nil
}

func scanIdentity(row scanner) (*models.Identity, error) {
	identity, err := scanIdentityFrom(row)
	if err != nil {
		return nil, err
	}
	return &identity, nil
}

func scanIdentityRows(rows *sql.Rows) (models.Identity, error) {
	return scanIdentityFrom(rows)
}

func scanIdentityFrom(row scanner) (models.Identity, error) {
	var identity models.Identity
	var isActive int
	var createdAt string
	var updatedAt string
	if err := row.Scan(
		&identity.ID,
		&identity.UserID,
		&identity.GaiaID,
		&identity.DisplayName,
		&identity.Keys,
		&identity.PublicRecord,
		&isActive,
		&createdAt,
		&updatedAt,
	); err != nil {
		return models.Identity{}, err
	}
	identity.IsActive = isActive != 0
	identity.CreatedAt = parseTime(createdAt)
	identity.UpdatedAt = parseTime(updatedAt)
	return identity, nil
}

func scanMessageEnvelopeRows(rows *sql.Rows) (models.MessageEnvelope, error) {
	var envelope models.MessageEnvelope
	var createdAt string
	if err := rows.Scan(&envelope.ID, &envelope.Type, &envelope.Sender, &envelope.Recipient, &envelope.Payload, &envelope.Signature, &envelope.ChannelID, &createdAt); err != nil {
		return models.MessageEnvelope{}, err
	}
	envelope.CreatedAt = parseTime(createdAt)
	return envelope, nil
}

func scanMessageProof(row scanner) (*models.MessageProof, error) {
	var proof models.MessageProof
	var senderIdentity sql.NullString
	var serverReceivedAt string
	var createdAt string
	if err := row.Scan(
		&proof.ID,
		&proof.MessageID,
		&senderIdentity,
		&proof.Sender,
		&proof.Recipient,
		&proof.CiphertextHash,
		&proof.SenderSignature,
		&proof.EnvelopeHash,
		&serverReceivedAt,
		&createdAt,
	); err != nil {
		return nil, err
	}
	if senderIdentity.Valid {
		if parsed, err := uuid.Parse(senderIdentity.String); err == nil {
			proof.SenderIdentity = parsed
		}
	}
	proof.ServerReceivedAt = parseTime(serverReceivedAt)
	proof.CreatedAt = parseTime(createdAt)
	return &proof, nil
}

func scanDeliveryReceiptRows(rows *sql.Rows) (models.DeliveryReceipt, error) {
	var receipt models.DeliveryReceipt
	var delivered int
	var deliveredAt string
	var createdAt string
	if err := rows.Scan(
		&receipt.ID,
		&receipt.MessageID,
		&receipt.IdentityID,
		&receipt.Recipient,
		&delivered,
		&deliveredAt,
		&receipt.ReceiptHash,
		&receipt.TamperEvidence,
		&createdAt,
	); err != nil {
		return models.DeliveryReceipt{}, err
	}
	receipt.Delivered = delivered != 0
	receipt.DeliveredAt = parseTime(deliveredAt)
	receipt.CreatedAt = parseTime(createdAt)
	return receipt, nil
}

func scanFileMetadata(row scanner) (*models.FileMetadata, error) {
	var metadata models.FileMetadata
	var createdAt string
	var updatedAt string
	if err := row.Scan(
		&metadata.FileID,
		&metadata.UserID,
		&metadata.FileName,
		&metadata.FileSize,
		&metadata.FileHash,
		&metadata.MimeType,
		&metadata.EncryptionIV,
		&metadata.Path,
		&metadata.Status,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	metadata.CreatedAt = parseTime(createdAt)
	metadata.UpdatedAt = parseTime(updatedAt)
	return &metadata, nil
}

func scanGaiaDropSubmissionRows(rows *sql.Rows) (models.GaiaDropSubmission, error) {
	var submission models.GaiaDropSubmission
	var createdAt string
	if err := rows.Scan(
		&submission.ID,
		&submission.TargetIdentityID,
		&submission.TargetGaiaID,
		&submission.SenderLabel,
		&submission.Payload,
		&submission.PayloadHash,
		&submission.Status,
		&createdAt,
	); err != nil {
		return models.GaiaDropSubmission{}, err
	}
	submission.CreatedAt = parseTime(createdAt)
	return submission, nil
}

func scanFederationQueue(row scanner) (*models.FederationQueue, error) {
	var item models.FederationQueue
	var status string
	var nextRetry string
	var createdAt string
	var updatedAt string
	if err := row.Scan(
		&item.ID,
		&item.PDUID,
		&item.PDUPayload,
		&item.TargetURL,
		&status,
		&item.Attempts,
		&item.LastError,
		&nextRetry,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	item.Status = models.QueueStatus(status)
	item.NextRetry = parseTime(nextRetry)
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	return &item, nil
}

func scanFederationServer(row scanner) (*models.FederationServer, error) {
	var server models.FederationServer
	var firstSeenAt string
	var lastSeenAt string
	var isBlocked int
	if err := row.Scan(&server.ID, &server.Domain, &server.PublicKey, &firstSeenAt, &lastSeenAt, &isBlocked); err != nil {
		return nil, err
	}
	server.FirstSeenAt = parseTime(firstSeenAt)
	server.LastSeenAt = parseTime(lastSeenAt)
	server.IsBlocked = isBlocked != 0
	return &server, nil
}

func scanRoom(row scanner) (*models.Room, error) {
	room, err := scanRoomFrom(row)
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func scanRoomRows(rows *sql.Rows) (models.Room, error) {
	return scanRoomFrom(rows)
}

func scanRoomFrom(row scanner) (models.Room, error) {
	var room models.Room
	var isPrivate int
	var createdAt string
	var updatedAt string
	if err := row.Scan(&room.ID, &room.Name, &isPrivate, &room.CreatedBy, &room.Description, &room.Avatar, &room.SecretHash, &createdAt, &updatedAt); err != nil {
		return models.Room{}, err
	}
	room.IsPrivate = isPrivate != 0
	room.CreatedAt = parseTime(createdAt)
	room.UpdatedAt = parseTime(updatedAt)
	return room, nil
}

func scanRoomMemberRows(rows *sql.Rows, withIdentity bool) (models.RoomMember, error) {
	var member models.RoomMember
	var joinedAt string
	if !withIdentity {
		if err := rows.Scan(&member.ID, &member.RoomID, &member.IdentityID, &member.Role, &joinedAt); err != nil {
			return models.RoomMember{}, err
		}
		member.JoinedAt = parseTime(joinedAt)
		return member, nil
	}

	var identity models.Identity
	var identityID uuid.UUID
	var userID uuid.UUID
	var gaiaID sql.NullString
	var displayName sql.NullString
	var keys models.JSONB
	var publicRecord models.JSONB
	var isActive sql.NullInt64
	var identityCreatedAt sql.NullString
	var identityUpdatedAt sql.NullString
	if err := rows.Scan(
		&member.ID,
		&member.RoomID,
		&member.IdentityID,
		&member.Role,
		&joinedAt,
		&identityID,
		&userID,
		&gaiaID,
		&displayName,
		&keys,
		&publicRecord,
		&isActive,
		&identityCreatedAt,
		&identityUpdatedAt,
	); err != nil {
		return models.RoomMember{}, err
	}
	member.JoinedAt = parseTime(joinedAt)
	if identityID != uuid.Nil {
		identity.ID = identityID
		identity.UserID = userID
		identity.GaiaID = gaiaID.String
		identity.DisplayName = displayName.String
		identity.Keys = keys
		identity.PublicRecord = publicRecord
		identity.IsActive = isActive.Int64 != 0
		identity.CreatedAt = parseTime(identityCreatedAt.String)
		identity.UpdatedAt = parseTime(identityUpdatedAt.String)
		member.Identity = identity
	}
	return member, nil
}

type scanner interface {
	Scan(dest ...interface{}) error
}

func inClause(prefix string, suffix string, ids []uuid.UUID) (string, []interface{}) {
	args := make([]interface{}, len(ids))
	for index, id := range ids {
		args[index] = id
	}
	return prefix + placeholders(len(ids)) + suffix, args
}

func placeholders(count int) string {
	if count <= 0 {
		return ""
	}
	return strings.TrimRight(strings.Repeat("?,", count), ",")
}

func rollbackUnlessCommitted(tx *sql.Tx, err *error) {
	if *err != nil {
		_ = tx.Rollback()
	}
}

func utcNow() time.Time {
	return time.Now().UTC()
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(sqlTimeFormat)
}

func parseTime(value string) time.Time {
	if value == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(sqlTimeFormat, value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func (s *SQLStore) CreateReport(report *models.Report) error {
	report.CreatedAt = utcNow()
	_, err := s.db.Exec(
		`INSERT INTO reports (message_id, sender_public_key, recipient_public_key, ciphertext_hash, report_proof, epoch_hash, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		report.MessageID,
		report.SenderPublicKey,
		report.RecipientPublicKey,
		report.CiphertextHash,
		report.ReportProof,
		report.EpochHash,
		formatTime(report.CreatedAt),
	)
	return err
}

func (s *SQLStore) GetReportByProof(proof string) (*models.Report, error) {
	var report models.Report
	var createdAt string
	err := s.db.QueryRow(
		`SELECT id, message_id, sender_public_key, recipient_public_key, ciphertext_hash, report_proof, epoch_hash, created_at
		 FROM reports WHERE report_proof = ? LIMIT 1`,
		proof,
	).Scan(
		&report.ID,
		&report.MessageID,
		&report.SenderPublicKey,
		&report.RecipientPublicKey,
		&report.CiphertextHash,
		&report.ReportProof,
		&report.EpochHash,
		&createdAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("report not found")
	}
	if err != nil {
		return nil, err
	}
	report.CreatedAt = parseTime(createdAt)
	return &report, nil
}

func (s *SQLStore) GetReportsCountForEpochHash(epochHash string) (int, error) {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM reports WHERE epoch_hash = ?`, epochHash).Scan(&count)
	return count, err
}

func (s *SQLStore) GetAbuseScore(senderPubKey string) (*models.AbuseScore, error) {
	var score models.AbuseScore
	var quarantinedUntil string
	var timeoutUntil string
	var updatedAt string
	err := s.db.QueryRow(
		`SELECT sender_public_key, score, escalation_level, friction_limit, quarantined_until, timeout_until, updated_at
		 FROM abuse_scores WHERE sender_public_key = ? LIMIT 1`,
		senderPubKey,
	).Scan(
		&score.SenderPublicKey,
		&score.Score,
		&score.EscalationLevel,
		&score.FrictionLimit,
		&quarantinedUntil,
		&timeoutUntil,
		&updatedAt,
	)
	if err == sql.ErrNoRows {
		return &models.AbuseScore{
			SenderPublicKey: senderPubKey,
			Score:           0,
			EscalationLevel: 0,
			FrictionLimit:   1.0,
			UpdatedAt:       utcNow(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	score.QuarantinedUntil = parseTime(quarantinedUntil)
	score.TimeoutUntil = parseTime(timeoutUntil)
	score.UpdatedAt = parseTime(updatedAt)
	return &score, nil
}

func (s *SQLStore) SaveAbuseScore(score *models.AbuseScore) error {
	score.UpdatedAt = utcNow()
	_, err := s.db.Exec(
		`INSERT INTO abuse_scores (sender_public_key, score, escalation_level, friction_limit, quarantined_until, timeout_until, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(sender_public_key) DO UPDATE SET
		 score = excluded.score,
		 escalation_level = excluded.escalation_level,
		 friction_limit = excluded.friction_limit,
		 quarantined_until = excluded.quarantined_until,
		 timeout_until = excluded.timeout_until,
		 updated_at = excluded.updated_at`,
		score.SenderPublicKey,
		score.Score,
		score.EscalationLevel,
		score.FrictionLimit,
		formatTime(score.QuarantinedUntil),
		formatTime(score.TimeoutUntil),
		formatTime(score.UpdatedAt),
	)
	return err
}

func (s *SQLStore) HasReportedInEpoch(senderPubKey, recipientPubKey, epochHash string) (bool, error) {
	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM reports
		 WHERE sender_public_key = ? AND recipient_public_key = ? AND epoch_hash = ?`,
		senderPubKey,
		recipientPubKey,
		epochHash,
	).Scan(&count)
	return count > 0, err
}

func (s *SQLStore) MarkGaiaDropRead(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE gaia_drop_submissions
		SET status = 'read'
		WHERE id = ? AND target_identity_id IN (
			SELECT id FROM identities WHERE user_id = ?
		)
	`, dropID, userID)
	return err
}

func (s *SQLStore) DeleteGaiaDrop(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM gaia_drop_submissions
		WHERE id = ? AND target_identity_id IN (
			SELECT id FROM identities WHERE user_id = ?
		)
	`, dropID, userID)
	return err
}
