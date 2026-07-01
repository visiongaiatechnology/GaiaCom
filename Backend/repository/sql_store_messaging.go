// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"strings"
)

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
		`INSERT INTO message_envelopes (id, type, sender, recipient, payload, signature, channel_id, read_receipt_source_id, client_message_id, replaced_by_message_id, edited_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		envelope.ID,
		envelope.Type,
		envelope.Sender,
		envelope.Recipient,
		[]byte(envelope.Payload),
		proofInput.SenderSignature,
		envelope.ChannelID,
		uuidStringOrEmpty(envelope.ReadReceiptSourceID),
		proofInput.ClientMessageID,
		uuidStringOrEmpty(envelope.ReplacedByMessageID),
		formatTime(envelope.EditedAt),
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

	if envelope.SenderIdentityID != uuid.Nil {
		var senderUserID uuid.UUID
		if err = tx.QueryRowContext(ctx, `SELECT user_id FROM identities WHERE id = ? LIMIT 1`, envelope.SenderIdentityID).Scan(&senderUserID); err == nil {
			_, err = tx.ExecContext(
				ctx,
				`INSERT OR IGNORE INTO mailbox_states
				 (user_id, identity_id, message_id, folder, is_read, is_starred, is_important, is_spam, is_archived, labels, snoozed_until, updated_at)
				 VALUES (?, ?, ?, 'sent', 1, 0, 0, 0, 0, '[]', '', ?)`,
				senderUserID,
				envelope.SenderIdentityID,
				envelope.ID,
				formatTime(envelope.CreatedAt),
			)
			if err != nil {
				return err
			}
		} else if err != sql.ErrNoRows {
			return err
		}
	}

	// Check if sender is quarantined or the transport is explicitly unsafe.
	untrusted := 0
	if envelope.Type == "smtp.legacy" {
		untrusted = 1
	}
	var publicRecord []byte
	err = tx.QueryRowContext(ctx, `SELECT public_record FROM identities WHERE LOWER(gaia_id) = LOWER(?) LIMIT 1`, envelope.Sender).Scan(&publicRecord)
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
		`SELECT id, type, sender, recipient, payload, signature, channel_id, read_receipt_source_id, client_message_id, replaced_by_message_id, edited_at, created_at FROM message_envelopes WHERE replaced_by_message_id = '' AND id IN (`,
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

func (s *SQLStore) FindMessageReactionsForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) (map[uuid.UUID]models.MessageReactionState, error) {
	states := make(map[uuid.UUID]models.MessageReactionState, len(messageIDs))
	if len(messageIDs) == 0 {
		return states, nil
	}

	query, args := inClause(
		`SELECT message_id, emoji, COUNT(1)
		 FROM message_reactions
		 WHERE message_id IN (`,
		`) GROUP BY message_id, emoji`,
		messageIDs,
	)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var messageID uuid.UUID
		var emoji string
		var count int
		if err := rows.Scan(&messageID, &emoji, &count); err != nil {
			_ = rows.Close()
			return nil, err
		}
		state := states[messageID]
		if state.Reactions == nil {
			state.Reactions = make(map[string]int)
		}
		state.Reactions[emoji] = count
		states[messageID] = state
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	selfQuery, selfArgs := inClause(
		`SELECT message_id, emoji
		 FROM message_reactions
		 WHERE identity_id = ? AND message_id IN (`,
		`)`,
		messageIDs,
	)
	selfArgs = append([]interface{}{identityID}, selfArgs...)
	selfRows, err := s.db.QueryContext(ctx, selfQuery, selfArgs...)
	if err != nil {
		return nil, err
	}
	defer selfRows.Close()
	for selfRows.Next() {
		var messageID uuid.UUID
		var emoji string
		if err := selfRows.Scan(&messageID, &emoji); err != nil {
			return nil, err
		}
		state := states[messageID]
		if state.ReactedByMe == nil {
			state.ReactedByMe = make(map[string]bool)
		}
		state.ReactedByMe[emoji] = true
		states[messageID] = state
	}
	return states, selfRows.Err()
}

func (s *SQLStore) ToggleMessageReactionForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, emoji string) (*models.MessageReactionState, error) {
	var authorized int
	if err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(1)
		 FROM identities i
		 WHERE i.id = ? AND i.user_id = ? AND i.is_active = 1 AND EXISTS (
			SELECT 1
			FROM message_envelopes me
			WHERE me.id = ? AND (
				EXISTS (
					SELECT 1
					FROM inboxes ib
					WHERE ib.identity_id = i.id AND ib.message_id = me.id
				) OR me.sender = i.gaia_id
			)
		 )`,
		identityID,
		userID,
		messageID,
	).Scan(&authorized); err != nil {
		return nil, err
	}
	if authorized != 1 {
		return nil, sql.ErrNoRows
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)

	var reactionID int64
	err = tx.QueryRowContext(
		ctx,
		`SELECT id FROM message_reactions WHERE message_id = ? AND identity_id = ? AND emoji = ? LIMIT 1`,
		messageID,
		identityID,
		emoji,
	).Scan(&reactionID)
	if err == nil {
		_, err = tx.ExecContext(ctx, `DELETE FROM message_reactions WHERE id = ?`, reactionID)
		if err != nil {
			return nil, err
		}
	} else if err == sql.ErrNoRows {
		_, err = tx.ExecContext(
			ctx,
			`INSERT INTO message_reactions (message_id, identity_id, emoji, created_at) VALUES (?, ?, ?, ?)`,
			messageID,
			identityID,
			emoji,
			formatTime(utcNow()),
		)
		if err != nil {
			return nil, err
		}
	} else {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	states, err := s.FindMessageReactionsForUser(ctx, userID, identityID, []uuid.UUID{messageID})
	if err != nil {
		return nil, err
	}
	state := states[messageID]
	if state.Reactions == nil {
		state.Reactions = map[string]int{}
	}
	if state.ReactedByMe == nil {
		state.ReactedByMe = map[string]bool{}
	}
	return &state, nil
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
	if err != nil {
		return err
	}
	if err := s.upsertMessageReadReceipts(ctx, userID, identityID, messageIDs); err != nil {
		return err
	}
	return nil
}

func (s *SQLStore) EditDirectMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, originalMessageID uuid.UUID, peerEnvelopeData []byte, selfEnvelopeData []byte) (uuid.UUID, error) {
	var senderGaiaID string
	var peerGaiaID string
	var clientMessageID string

	err := s.db.QueryRowContext(
		ctx,
		`SELECT me.sender, me.recipient, me.client_message_id
		 FROM message_envelopes me
		 JOIN inboxes ib ON ib.message_id = me.id
		 JOIN identities i ON i.id = ib.identity_id
		 WHERE me.id = ?
		   AND me.replaced_by_message_id = ''
		   AND me.channel_id = ''
		   AND i.id = ?
		   AND i.user_id = ?
		   AND me.sender = i.gaia_id COLLATE NOCASE
		 LIMIT 1`,
		originalMessageID,
		identityID,
		userID,
	).Scan(&senderGaiaID, &peerGaiaID, &clientMessageID)
	if err != nil {
		return uuid.Nil, err
	}
	if strings.TrimSpace(clientMessageID) == "" {
		return uuid.Nil, sql.ErrNoRows
	}

	peerProof := extractMessageProofInput(models.JSONB(peerEnvelopeData))
	selfProof := extractMessageProofInput(models.JSONB(selfEnvelopeData))
	if peerProof.ClientMessageID != clientMessageID || selfProof.ClientMessageID != clientMessageID {
		return uuid.Nil, sql.ErrNoRows
	}

	var peerIdentityID uuid.UUID
	if err := s.db.QueryRowContext(
		ctx,
		`SELECT id FROM identities WHERE LOWER(gaia_id) = LOWER(?) AND is_active = 1 LIMIT 1`,
		peerGaiaID,
	).Scan(&peerIdentityID); err != nil {
		return uuid.Nil, err
	}

	now := utcNow()
	peerEnvelope := &models.MessageEnvelope{
		ID:               uuid.New(),
		Type:             "gaia.encrypted.v1",
		Sender:           senderGaiaID,
		Recipient:        peerGaiaID,
		Payload:          models.JSONB(peerEnvelopeData),
		SenderIdentityID: identityID,
		ClientMessageID:  clientMessageID,
		EditedAt:         now,
		CreatedAt:        now,
	}
	if err := s.SaveMessageEnvelopeWithInbox(ctx, peerEnvelope, []uuid.UUID{peerIdentityID}); err != nil {
		return uuid.Nil, err
	}

	selfEnvelope := &models.MessageEnvelope{
		ID:                  uuid.New(),
		Type:                "gaia.encrypted.v1",
		Sender:              senderGaiaID,
		Recipient:           peerGaiaID,
		Payload:             models.JSONB(selfEnvelopeData),
		SenderIdentityID:    identityID,
		ReadReceiptSourceID: peerEnvelope.ID,
		ClientMessageID:     clientMessageID,
		EditedAt:            now,
		CreatedAt:           now,
	}
	if err := s.SaveMessageEnvelopeWithInbox(ctx, selfEnvelope, []uuid.UUID{identityID}); err != nil {
		return uuid.Nil, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return uuid.Nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)

	if _, err = tx.ExecContext(
		ctx,
		`UPDATE message_envelopes
		 SET replaced_by_message_id = ?, edited_at = ?
		 WHERE LOWER(sender) = LOWER(?)
		   AND LOWER(recipient) = LOWER(?)
		   AND channel_id = ''
		   AND client_message_id = ?
		   AND id NOT IN (?, ?)`,
		selfEnvelope.ID,
		formatTime(now),
		senderGaiaID,
		peerGaiaID,
		clientMessageID,
		peerEnvelope.ID,
		selfEnvelope.ID,
	); err != nil {
		return uuid.Nil, err
	}

	if _, err = tx.ExecContext(
		ctx,
		`INSERT INTO mailbox_states
		 (user_id, identity_id, message_id, folder, is_read, is_starred, is_important, is_spam, is_archived, labels, snoozed_until, updated_at)
		 SELECT user_id, identity_id, ?, folder, is_read, is_starred, is_important, is_spam, is_archived, labels, snoozed_until, ?
		 FROM mailbox_states
		 WHERE user_id = ? AND identity_id = ? AND message_id = ?
		 ON CONFLICT(user_id, identity_id, message_id) DO UPDATE SET
		 folder = excluded.folder,
		 is_read = excluded.is_read,
		 is_starred = excluded.is_starred,
		 is_important = excluded.is_important,
		 is_spam = excluded.is_spam,
		 is_archived = excluded.is_archived,
		 labels = excluded.labels,
		 snoozed_until = excluded.snoozed_until,
		 updated_at = excluded.updated_at`,
		selfEnvelope.ID,
		formatTime(now),
		userID,
		identityID,
		originalMessageID,
	); err != nil {
		return uuid.Nil, err
	}

	if err = tx.Commit(); err != nil {
		return uuid.Nil, err
	}

	return selfEnvelope.ID, nil
}

func (s *SQLStore) upsertMessageReadReceipts(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) error {
	if len(messageIDs) == 0 {
		return nil
	}
	now := utcNow()
	query, args := inClause(
		`SELECT me.id, i.gaia_id
		 FROM message_envelopes me
		 JOIN inboxes ib ON ib.message_id = me.id AND ib.identity_id = ?
		 JOIN identities i ON i.id = ib.identity_id AND i.user_id = ?
		 WHERE me.id IN (`,
		`) AND me.sender != i.gaia_id COLLATE NOCASE`,
		messageIDs,
	)
	args = append([]interface{}{identityID, userID}, args...)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	type receiptInput struct {
		messageID uuid.UUID
		reader    string
	}
	inputs := make([]receiptInput, 0, len(messageIDs))
	for rows.Next() {
		var input receiptInput
		if err := rows.Scan(&input.messageID, &input.reader); err != nil {
			return err
		}
		inputs = append(inputs, input)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, input := range inputs {
		_, err = s.db.ExecContext(
			ctx,
			`INSERT INTO message_read_receipts (message_id, identity_id, reader, read_at, created_at)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(message_id, identity_id) DO UPDATE SET read_at = excluded.read_at`,
			input.messageID,
			identityID,
			input.reader,
			formatTime(now),
			formatTime(now),
		)
		if err != nil {
			return err
		}
	}
	return nil
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
				_ = s.db.QueryRowContext(ctx, `SELECT id FROM identities WHERE LOWER(gaia_id) = LOWER(?) LIMIT 1`, sender).Scan(&senderIdentityID)

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
		var clientMsgID string
		var sender string
		var recipient string
		var channelID string
		err := s.db.QueryRowContext(ctx,
			`SELECT client_message_id, sender, recipient, channel_id FROM message_envelopes
			 WHERE id = ? AND EXISTS (
				SELECT 1 FROM identities i
				WHERE i.id = ? AND i.user_id = ? AND (LOWER(message_envelopes.sender) = LOWER(i.gaia_id) OR LOWER(message_envelopes.recipient) = LOWER(i.gaia_id))
			 )`,
			messageID,
			identityID,
			userID,
		).Scan(&clientMsgID, &sender, &recipient, &channelID)
		if err != nil {
			return err
		}

		clientMsgID = strings.TrimSpace(clientMsgID)
		if clientMsgID != "" {
			_, err = s.db.ExecContext(ctx,
				`DELETE FROM message_envelopes
				 WHERE client_message_id = ?
				   AND ((LOWER(sender) = LOWER(?) AND LOWER(recipient) = LOWER(?)) OR (LOWER(sender) = LOWER(?) AND LOWER(recipient) = LOWER(?)))
				   AND channel_id = ?`,
				clientMsgID,
				sender,
				recipient,
				recipient,
				sender,
				channelID,
			)
			if err != nil {
				return err
			}
		} else {
			result, err := s.db.ExecContext(
				ctx,
				`DELETE FROM message_envelopes
				 WHERE id = ?`,
				messageID,
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

func (s *SQLStore) ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool, messageIDs []uuid.UUID) (int64, error) {
	var deletedCount int64

	if forEveryone {
		if len(messageIDs) > 0 {
			query, args := inClause(
				`DELETE FROM message_envelopes WHERE id IN (`,
				`) AND EXISTS (
					SELECT 1 FROM identities i WHERE i.id = ? AND i.user_id = ? AND message_envelopes.sender = i.gaia_id
				)`,
				messageIDs,
			)
			fullArgs := append(args, identityID, userID)
			result, err := s.db.ExecContext(ctx, query, fullArgs...)
			if err == nil {
				if affected, err := result.RowsAffected(); err == nil {
					deletedCount += affected
				}
			}
		}

		args := []interface{}{identityID, userID}
		filter := ""
		if channelID != "" {
			filter = ` AND message_envelopes.channel_id = ?`
			args = append(args, channelID)
		} else {
			filter = ` AND ((message_envelopes.sender = i.gaia_id COLLATE NOCASE AND message_envelopes.recipient = ? COLLATE NOCASE) OR (message_envelopes.sender = ? COLLATE NOCASE AND message_envelopes.recipient = i.gaia_id COLLATE NOCASE))`
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
			return deletedCount, err
		}
		affected, _ := result.RowsAffected()
		return deletedCount + affected, nil
	}

	if len(messageIDs) > 0 {
		query, args := inClause(
			`DELETE FROM inboxes WHERE identity_id = ? AND message_id IN (`,
			`)`,
			messageIDs,
		)
		fullArgs := make([]interface{}, 0, 1+len(args))
		fullArgs = append(fullArgs, identityID)
		fullArgs = append(fullArgs, args...)
		result, err := s.db.ExecContext(ctx, query, fullArgs...)
		if err == nil {
			if affected, err := result.RowsAffected(); err == nil {
				deletedCount += affected
			}
		}
	}

	args := []interface{}{identityID, userID}
	filter := ""
	if channelID != "" {
		filter = ` AND me.channel_id = ?`
		args = append(args, channelID)
	} else {
		filter = ` AND (me.sender = ? COLLATE NOCASE OR me.recipient = ? COLLATE NOCASE)`
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
		return deletedCount, err
	}
	affected, _ := result.RowsAffected()
	return deletedCount + affected, nil
}
