// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"strings"
	"time"
)

func (s *SQLStore) ReadNetworkHealthMetrics(ctx context.Context, since time.Time) (*models.NetworkHealthMetrics, error) {
	sinceValue := formatTime(since)
	metrics := &models.NetworkHealthMetrics{}
	queries := []struct {
		target *int64
		query  string
		args   []interface{}
	}{
		{
			target: &metrics.Accounts,
			query:  `SELECT COUNT(1) FROM users WHERE allow_anonymous_stats = 1`,
		},
		{
			target: &metrics.Identities,
			query: `SELECT COUNT(1)
				FROM identities i
				JOIN users u ON u.id = i.user_id
				WHERE u.allow_anonymous_stats = 1 AND i.is_active = 1`,
		},
		{
			target: &metrics.Nodes,
			query:  `SELECT COUNT(1) + 1 FROM federation_servers WHERE is_blocked = 0`,
		},
		{
			target: &metrics.Rooms,
			query: `SELECT COUNT(1)
				FROM rooms r
				JOIN identities i ON i.id = r.created_by
				JOIN users u ON u.id = i.user_id
				WHERE u.allow_anonymous_stats = 1`,
		},
		{
			target: &metrics.Messages24h,
			query: `SELECT COUNT(1)
				FROM message_envelopes me
				JOIN identities i ON i.gaia_id = me.sender
				JOIN users u ON u.id = i.user_id
				WHERE u.allow_anonymous_stats = 1 AND me.created_at >= ?`,
			args: []interface{}{sinceValue},
		},
		{
			target: &metrics.GaiaDrops24h,
			query: `SELECT COUNT(1)
				FROM gaia_drop_submissions gd
				JOIN identities i ON i.id = gd.target_identity_id
				JOIN users u ON u.id = i.user_id
				WHERE u.allow_anonymous_stats = 1 AND gd.created_at >= ?`,
			args: []interface{}{sinceValue},
		},
		{
			target: &metrics.FederationEvents24h,
			query:  `SELECT COUNT(1) FROM federation_queues WHERE created_at >= ?`,
			args:   []interface{}{sinceValue},
		},
		{
			target: &metrics.SecurityEvents24h,
			query:  `SELECT COUNT(1) FROM security_events WHERE created_at >= ?`,
			args:   []interface{}{sinceValue},
		},
		{
			target: &metrics.BlockedRequests24h,
			query:  `SELECT COUNT(1) FROM security_events WHERE action != 'allow' AND created_at >= ?`,
			args:   []interface{}{sinceValue},
		},
		{
			target: &metrics.SMTPShieldEvents24h,
			query:  `SELECT COUNT(1) FROM security_events WHERE category LIKE 'smtp_%' AND created_at >= ?`,
			args:   []interface{}{sinceValue},
		},
		{
			target: &metrics.FederationRejects24h,
			query:  `SELECT COUNT(1) FROM security_events WHERE category LIKE 'federation_%' AND action = 'reject' AND created_at >= ?`,
			args:   []interface{}{sinceValue},
		},
	}
	for _, item := range queries {
		if err := s.db.QueryRowContext(ctx, item.query, item.args...).Scan(item.target); err != nil {
			return nil, err
		}
	}
	return metrics, nil
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
	ClientMessageID string
}

func extractMessageProofInput(payload models.JSONB) messageProofInput {
	var envelope struct {
		CiphertextHash    string `json:"ciphertext_hash"`
		SenderSignature   string `json:"signature"`
		PayloadCiphertext string `json:"payload_ciphertext"`
		ClientMessageID   string `json:"client_message_id"`
	}
	input := messageProofInput{
		CiphertextHash:  "",
		SenderSignature: "",
		ClientMessageID: "",
	}
	if err := json.Unmarshal(payload, &envelope); err == nil {
		input.CiphertextHash = strings.TrimSpace(envelope.CiphertextHash)
		input.SenderSignature = strings.TrimSpace(envelope.SenderSignature)
		input.ClientMessageID = strings.TrimSpace(envelope.ClientMessageID)
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
	var allowAnonymousStats int
	var createdAt string
	var updatedAt string
	if err := row.Scan(&user.ID, &user.Username, &user.PasswordHash, &user.PublicKey, &allowAnonymousStats, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	user.AllowAnonymousStats = allowAnonymousStats != 0
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
	var readReceiptSourceID string
	var replacedByMessageID string
	var editedAt string
	if err := rows.Scan(&envelope.ID, &envelope.Type, &envelope.Sender, &envelope.Recipient, &envelope.Payload, &envelope.Signature, &envelope.ChannelID, &readReceiptSourceID, &envelope.ClientMessageID, &replacedByMessageID, &editedAt, &createdAt); err != nil {
		return models.MessageEnvelope{}, err
	}
	if parsed, err := uuid.Parse(readReceiptSourceID); err == nil {
		envelope.ReadReceiptSourceID = parsed
	}
	if parsed, err := uuid.Parse(replacedByMessageID); err == nil {
		envelope.ReplacedByMessageID = parsed
	}
	envelope.EditedAt = parseTime(editedAt)
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

func scanIdentityPresence(row scanner) (*models.IdentityPresence, error) {
	presence, err := scanIdentityPresenceFrom(row)
	if err != nil {
		return nil, err
	}
	return &presence, nil
}

func scanIdentityPresenceRows(rows *sql.Rows) (models.IdentityPresence, error) {
	return scanIdentityPresenceFrom(rows)
}

func scanIdentityPresenceFrom(row scanner) (models.IdentityPresence, error) {
	var presence models.IdentityPresence
	var lastSeenAt, updatedAt string
	if err := row.Scan(
		&presence.IdentityID,
		&presence.UserID,
		&presence.GaiaID,
		&presence.Status,
		&lastSeenAt,
		&updatedAt,
	); err != nil {
		return models.IdentityPresence{}, err
	}
	presence.LastSeenAt = parseTime(lastSeenAt)
	presence.UpdatedAt = parseTime(updatedAt)
	return presence, nil
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

func scanNodeRegistryEntry(row scanner) (*models.NodeRegistryEntry, error) {
	var entry models.NodeRegistryEntry
	var firstSeenAt string
	var lastSeenAt string
	var updatedAt string
	if err := row.Scan(
		&entry.ID,
		&entry.Domain,
		&entry.ServerName,
		&entry.PublicKey,
		&entry.CoreHash,
		&entry.NodeVersion,
		&entry.OperatorGaiaID,
		&entry.Status,
		&entry.LastError,
		&entry.PingCount,
		&firstSeenAt,
		&lastSeenAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	entry.PublicKeyBase64 = base64.StdEncoding.EncodeToString(entry.PublicKey)
	entry.FirstSeenAt = parseTime(firstSeenAt)
	entry.LastSeenAt = parseTime(lastSeenAt)
	entry.UpdatedAt = parseTime(updatedAt)
	return &entry, nil
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
	var readOnly int
	var topSecret int
	var createdAt string
	var updatedAt string
	if err := row.Scan(&room.ID, &room.Name, &isPrivate, &room.CreatedBy, &room.Description, &room.Avatar, &room.SecretHash, &readOnly, &room.SlowModeSeconds, &topSecret, &createdAt, &updatedAt); err != nil {
		return models.Room{}, err
	}
	room.IsPrivate = isPrivate != 0
	room.ReadOnly = readOnly != 0
	room.TopSecret = topSecret != 0
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

func scanPublicChannel(row scanner) (*models.PublicChannel, error) {
	channel, err := scanPublicChannelFrom(row)
	if err != nil {
		return nil, err
	}
	return &channel, nil
}

func scanPublicChannelRows(rows *sql.Rows) (models.PublicChannel, error) {
	return scanPublicChannelFrom(rows)
}

func scanPublicChannelFrom(row scanner) (models.PublicChannel, error) {
	var channel models.PublicChannel
	var avatar sql.NullString
	var createdAt, updatedAt string
	var isSubscribed, isAdmin int
	var isSuspended int
	var suspensionReason sql.NullString
	var isVerified int
	var commentsEnabled int
	var isBlocked int
	if err := row.Scan(
		&channel.ID,
		&channel.Name,
		&channel.Description,
		&avatar,
		&channel.CreatedBy,
		&createdAt,
		&updatedAt,
		&channel.SubscriberCount,
		&isSubscribed,
		&isAdmin,
		&isSuspended,
		&suspensionReason,
		&isVerified,
		&commentsEnabled,
		&channel.Category,
		&isBlocked,
	); err != nil {
		return models.PublicChannel{}, err
	}
	if avatar.Valid && strings.TrimSpace(avatar.String) != "" {
		channel.Avatar = models.JSONB(avatar.String)
	}
	channel.CreatedAt = parseTime(createdAt)
	channel.UpdatedAt = parseTime(updatedAt)
	channel.IsSubscribed = isSubscribed != 0
	channel.IsAdmin = isAdmin != 0
	channel.IsSuspended = isSuspended != 0
	if suspensionReason.Valid {
		channel.SuspensionReason = suspensionReason.String
	}
	channel.IsVerified = isVerified != 0
	channel.CommentsEnabled = commentsEnabled != 0
	channel.IsBlocked = isBlocked != 0
	return channel, nil
}

func scanPublicChannelPostRows(rows *sql.Rows) (models.PublicChannelPost, error) {
	return scanPublicChannelPostFrom(rows)
}

func scanPublicChannelPost(row scanner) (*models.PublicChannelPost, error) {
	post, err := scanPublicChannelPostFrom(row)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func scanPublicChannelPostFrom(row scanner) (models.PublicChannelPost, error) {
	var post models.PublicChannelPost
	var formatting, attachments sql.NullString
	var createdAt, pinnedAt string
	if err := row.Scan(
		&post.ID,
		&post.ChannelID,
		&post.AuthorIdentityID,
		&post.Body,
		&formatting,
		&attachments,
		&createdAt,
		&pinnedAt,
		&post.ScheduledFor,
	); err != nil {
		return models.PublicChannelPost{}, err
	}
	if formatting.Valid && strings.TrimSpace(formatting.String) != "" {
		post.Formatting = models.JSONB(formatting.String)
	}
	if attachments.Valid && strings.TrimSpace(attachments.String) != "" {
		post.Attachments = models.JSONB(attachments.String)
	}
	post.CreatedAt = parseTime(createdAt)
	if strings.TrimSpace(pinnedAt) != "" {
		post.IsPinned = true
		post.PinnedAt = parseTime(pinnedAt)
	}
	return post, nil
}

func scanPublicChannelPostComment(row scanner) (*models.PublicChannelPostComment, error) {
	comment, err := scanPublicChannelPostCommentFrom(row)
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func scanPublicChannelPostCommentRows(rows *sql.Rows) (models.PublicChannelPostComment, error) {
	return scanPublicChannelPostCommentFrom(rows)
}

func scanPublicChannelPostCommentFrom(row scanner) (models.PublicChannelPostComment, error) {
	var comment models.PublicChannelPostComment
	var createdAt string
	if err := row.Scan(
		&comment.ID,
		&comment.PostID,
		&comment.AuthorIdentityID,
		&comment.AuthorDisplayName,
		&comment.AuthorGaiaID,
		&comment.Body,
		&createdAt,
		&comment.Status,
	); err != nil {
		return models.PublicChannelPostComment{}, err
	}
	comment.CreatedAt = parseTime(createdAt)
	return comment, nil
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

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
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

func uuidStringOrEmpty(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}
