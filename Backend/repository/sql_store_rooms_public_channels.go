// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

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
		`INSERT INTO rooms (id, name, is_private, created_by, description, avatar, secret_hash, read_only, slow_mode_seconds, top_secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		room.ID,
		room.Name,
		boolInt(room.IsPrivate),
		room.CreatedBy,
		room.Description,
		room.Avatar,
		room.SecretHash,
		boolInt(room.ReadOnly),
		room.SlowModeSeconds,
		boolInt(room.TopSecret),
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
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, read_only, slow_mode_seconds, top_secret, created_at, updated_at
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
			WHERE rm.room_id = rooms.id AND i.user_id = ? AND rm.role IN ('admin', 'owner')
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
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, read_only, slow_mode_seconds, top_secret, created_at, updated_at FROM rooms WHERE id = ? LIMIT 1`,
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
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, read_only, slow_mode_seconds, top_secret, created_at, updated_at FROM rooms WHERE secret_hash = ? LIMIT 1`,
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
			WHERE admin_rm.room_id = room_members.room_id AND admin_i.user_id = ? AND admin_rm.role IN ('admin', 'owner')
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
		 WHERE rm.room_id = ? AND i.user_id = ? AND rm.role IN ('admin', 'owner')`,
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

func (s *SQLStore) CreatePublicChannel(ctx context.Context, channel *models.PublicChannel, adminIdentityID uuid.UUID) error {
	now := utcNow()
	channel.ID = uuid.New()
	channel.CreatedBy = adminIdentityID
	channel.CreatedAt = now
	channel.UpdatedAt = now

	// Enforce channel name uniqueness
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM public_channels WHERE LOWER(name) = LOWER(?)`, channel.Name).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("a channel with this name already exists")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if channel.Category == "" {
		channel.Category = "General"
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT INTO public_channels (id, name, description, avatar, created_by, category, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		channel.ID,
		channel.Name,
		channel.Description,
		string(channel.Avatar),
		channel.CreatedBy,
		channel.Category,
		formatTime(channel.CreatedAt),
		formatTime(channel.UpdatedAt),
	)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT INTO public_channel_admins (channel_id, identity_id, role, created_at)
		 VALUES (?, ?, 'admin', ?)`,
		channel.ID,
		adminIdentityID,
		formatTime(now),
	)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO public_channel_subscribers (channel_id, identity_id, created_at)
		 VALUES (?, ?, ?)`,
		channel.ID,
		adminIdentityID,
		formatTime(now),
	)
	if err != nil {
		return err
	}

	err = tx.Commit()
	return err
}

func (s *SQLStore) UpdatePublicChannelForAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, name string, description string, category string, avatar models.JSONB) (*models.PublicChannel, error) {
	// Enforce channel name uniqueness on update
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM public_channels WHERE LOWER(name) = LOWER(?) AND id != ?`, name, channelID).Scan(&count)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("a channel with this name already exists")
	}

	if category == "" {
		category = "General"
	}

	result, err := s.db.ExecContext(
		ctx,
		`UPDATE public_channels
		 SET name = ?, description = ?, category = ?, avatar = ?, updated_at = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1
			FROM public_channel_admins pca
			JOIN identities i ON i.id = pca.identity_id
			WHERE pca.channel_id = public_channels.id AND i.user_id = ?
		 )`,
		name,
		description,
		category,
		string(avatar),
		formatTime(utcNow()),
		channelID,
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
	return s.FindPublicChannelByIDForUser(ctx, userID, channelID)
}

func (s *SQLStore) FindPublicChannelsForUser(ctx context.Context, userID uuid.UUID) ([]models.PublicChannel, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT pc.id, pc.name, pc.description, pc.avatar, pc.created_by, pc.created_at, pc.updated_at,
			(SELECT COUNT(1) FROM public_channel_subscribers pcs WHERE pcs.channel_id = pc.id) AS subscriber_count,
			EXISTS(SELECT 1 FROM public_channel_subscribers pcs JOIN identities i ON i.id = pcs.identity_id WHERE pcs.channel_id = pc.id AND i.user_id = ?) AS is_subscribed,
			EXISTS(SELECT 1 FROM public_channel_admins pca JOIN identities i ON i.id = pca.identity_id WHERE pca.channel_id = pc.id AND i.user_id = ?) AS is_admin,
			pc.is_suspended, pc.suspension_reason, pc.is_verified, pc.comments_enabled,
			pc.category,
			EXISTS(SELECT 1 FROM public_channel_blocks pcb JOIN identities i ON i.id = pcb.identity_id WHERE pcb.channel_id = pc.id AND i.user_id = ?) AS is_blocked
		 FROM public_channels pc
		 WHERE ((pc.is_suspended = 0 AND (SELECT COUNT(1) FROM abuse_cases ac WHERE ac.reported_identity_hash = pc.id AND ac.status != 'rejected') < 5)
		    OR EXISTS(SELECT 1 FROM public_channel_subscribers pcs JOIN identities i ON i.id = pcs.identity_id WHERE pcs.channel_id = pc.id AND i.user_id = ?)
		    OR EXISTS(SELECT 1 FROM public_channel_admins pca JOIN identities i ON i.id = pca.identity_id WHERE pca.channel_id = pc.id AND i.user_id = ?))
		   AND NOT EXISTS(SELECT 1 FROM public_channel_blocks pcb JOIN identities i ON i.id = pcb.identity_id WHERE pcb.channel_id = pc.id AND i.user_id = ?)
		 ORDER BY pc.created_at DESC`,
		userID,
		userID,
		userID,
		userID,
		userID,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	channels := make([]models.PublicChannel, 0)
	for rows.Next() {
		channel, err := scanPublicChannelRows(rows)
		if err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, rows.Err()
}

func (s *SQLStore) FindPublicChannelByIDForUser(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) (*models.PublicChannel, error) {
	return scanPublicChannel(s.db.QueryRowContext(
		ctx,
		`SELECT pc.id, pc.name, pc.description, pc.avatar, pc.created_by, pc.created_at, pc.updated_at,
			(SELECT COUNT(1) FROM public_channel_subscribers pcs WHERE pcs.channel_id = pc.id) AS subscriber_count,
			EXISTS(SELECT 1 FROM public_channel_subscribers pcs JOIN identities i ON i.id = pcs.identity_id WHERE pcs.channel_id = pc.id AND i.user_id = ?) AS is_subscribed,
			EXISTS(SELECT 1 FROM public_channel_admins pca JOIN identities i ON i.id = pca.identity_id WHERE pca.channel_id = pc.id AND i.user_id = ?) AS is_admin,
			pc.is_suspended, pc.suspension_reason, pc.is_verified, pc.comments_enabled,
			pc.category,
			EXISTS(SELECT 1 FROM public_channel_blocks pcb JOIN identities i ON i.id = pcb.identity_id WHERE pcb.channel_id = pc.id AND i.user_id = ?) AS is_blocked
		 FROM public_channels pc
		 WHERE pc.id = ?
		 LIMIT 1`,
		userID,
		userID,
		userID,
		channelID,
	))
}

func (s *SQLStore) UserIsPublicChannelAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) (bool, error) {
	var count int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(1)
		 FROM public_channel_admins pca
		 JOIN identities i ON i.id = pca.identity_id
		 WHERE pca.channel_id = ? AND i.user_id = ?`,
		channelID,
		userID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *SQLStore) UpdatePublicChannelCommentsForAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, enabled bool) (*models.PublicChannel, error) {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE public_channels
		 SET comments_enabled = ?, updated_at = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1
			FROM public_channel_admins pca
			JOIN identities i ON i.id = pca.identity_id
			WHERE pca.channel_id = public_channels.id AND i.user_id = ?
		 )`,
		boolToInt(enabled),
		formatTime(utcNow()),
		channelID,
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
	return s.FindPublicChannelByIDForUser(ctx, userID, channelID)
}

func (s *SQLStore) SubscribePublicChannel(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error {
	if ok, err := s.IdentityBelongsToUser(identityID, userID); err != nil {
		return err
	} else if !ok {
		return sql.ErrNoRows
	}
	_, err := s.db.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO public_channel_subscribers (channel_id, identity_id, created_at)
		 VALUES (?, ?, ?)`,
		channelID,
		identityID,
		formatTime(utcNow()),
	)
	return err
}

func (s *SQLStore) UnsubscribePublicChannel(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error {
	if ok, err := s.IdentityBelongsToUser(identityID, userID); err != nil {
		return err
	} else if !ok {
		return sql.ErrNoRows
	}
	_, err := s.db.ExecContext(
		ctx,
		`DELETE FROM public_channel_subscribers WHERE channel_id = ? AND identity_id = ?`,
		channelID,
		identityID,
	)
	return err
}

func (s *SQLStore) CreatePublicChannelPostForAdmin(ctx context.Context, userID uuid.UUID, post *models.PublicChannelPost) error {
	isAdmin, err := s.UserIsPublicChannelAdmin(ctx, userID, post.ChannelID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return sql.ErrNoRows
	}
	if ok, err := s.IdentityBelongsToUser(post.AuthorIdentityID, userID); err != nil {
		return err
	} else if !ok {
		return sql.ErrNoRows
	}

	post.ID = uuid.New()
	post.CreatedAt = utcNow()
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO public_channel_posts (id, channel_id, author_identity_id, body, formatting, attachments, created_at, scheduled_for)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		post.ID,
		post.ChannelID,
		post.AuthorIdentityID,
		post.Body,
		string(post.Formatting),
		string(post.Attachments),
		formatTime(post.CreatedAt),
		post.ScheduledFor,
	)
	return err
}

func (s *SQLStore) FindPublicChannelPostsForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID, limit int) ([]models.PublicChannelPost, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT p.id, p.channel_id, p.author_identity_id, p.body, p.formatting, p.attachments, p.created_at, p.pinned_at, p.scheduled_for
		 FROM public_channel_posts p
		 JOIN public_channels pc ON pc.id = p.channel_id
		 WHERE p.channel_id = ?
		   AND (p.scheduled_for = '' OR p.scheduled_for <= ? OR EXISTS(
		       SELECT 1 FROM public_channel_admins pca JOIN identities i ON i.id = pca.identity_id WHERE pca.channel_id = p.channel_id AND i.user_id = ?
		   ))
		 ORDER BY CASE WHEN p.pinned_at != '' THEN 0 ELSE 1 END, p.pinned_at DESC, p.created_at DESC
		 LIMIT ?`,
		channelID,
		formatTime(utcNow()),
		userID,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.PublicChannelPost, 0)
	postIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		post, err := scanPublicChannelPostRows(rows)
		if err != nil {
			return nil, err
		}
		postIDs = append(postIDs, post.ID)
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(postIDs) == 0 {
		return posts, nil
	}
	states, err := s.FindPublicChannelPostReactionStatesForUser(ctx, userID, identityID, postIDs)
	if err != nil {
		return nil, err
	}
	comments, err := s.FindPublicChannelPostComments(ctx, postIDs)
	if err != nil {
		return nil, err
	}
	for index := range posts {
		if state, ok := states[posts[index].ID]; ok {
			posts[index].ReactionState = &state
		}
		posts[index].Comments = comments[posts[index].ID]
	}
	return posts, nil
}

func (s *SQLStore) DeletePublicChannel(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) error {
	isAdmin, err := s.UserIsPublicChannelAdmin(ctx, userID, channelID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return sql.ErrNoRows
	}

	_, err = s.db.ExecContext(ctx, `DELETE FROM public_channels WHERE id = ?`, channelID)
	return err
}

func (s *SQLStore) UpdateRoomSettingsForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string, isPrivate bool, readOnly bool, slowModeSeconds int, topSecret bool) (*models.Room, error) {
	now := utcNow()
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE rooms
		 SET name = ?, description = ?, avatar = ?, is_private = ?, read_only = ?, slow_mode_seconds = ?, top_secret = ?, updated_at = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1
			FROM room_members rm
			JOIN identities i ON i.id = rm.identity_id
			WHERE rm.room_id = rooms.id AND i.user_id = ? AND rm.role IN ('admin', 'owner')
		 )`,
		name,
		description,
		avatar,
		boolInt(isPrivate),
		boolInt(readOnly),
		slowModeSeconds,
		boolInt(topSecret),
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

func (s *SQLStore) ToggleRoomMessagePin(ctx context.Context, roomID, channelID, messageID uuid.UUID, pinnedBy uuid.UUID) (bool, error) {
	var exists int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM room_pinned_messages WHERE room_id = ? AND channel_id = ? AND message_id = ?`,
		roomID,
		channelID,
		messageID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}

	if exists > 0 {
		_, err = s.db.ExecContext(ctx,
			`DELETE FROM room_pinned_messages WHERE room_id = ? AND channel_id = ? AND message_id = ?`,
			roomID,
			channelID,
			messageID,
		)
		return false, err
	}

	_, err = s.db.ExecContext(ctx,
		`INSERT INTO room_pinned_messages (room_id, channel_id, message_id, pinned_by, pinned_at) VALUES (?, ?, ?, ?, ?)`,
		roomID,
		channelID,
		messageID,
		pinnedBy,
		formatTime(utcNow()),
	)
	return true, err
}

func (s *SQLStore) GetRoomPinnedMessages(ctx context.Context, roomID, channelID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT message_id FROM room_pinned_messages WHERE room_id = ? AND channel_id = ? ORDER BY pinned_at DESC`,
		roomID,
		channelID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		msgIDs = append(msgIDs, id)
	}
	return msgIDs, rows.Err()
}

func (s *SQLStore) CreateRoomInviteLink(ctx context.Context, invite *models.RoomInviteLink) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO room_invite_links (id, room_id, created_by, expires_at, max_uses, uses, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		invite.ID,
		invite.RoomID,
		invite.CreatedBy,
		formatTime(invite.ExpiresAt),
		invite.MaxUses,
		invite.Uses,
		formatTime(invite.CreatedAt),
	)
	return err
}

func (s *SQLStore) FindRoomInviteLink(ctx context.Context, token string) (*models.RoomInviteLink, error) {
	var invite models.RoomInviteLink
	var expiresAt, createdAt string
	err := s.db.QueryRowContext(ctx,
		`SELECT id, room_id, created_by, expires_at, max_uses, uses, created_at FROM room_invite_links WHERE id = ?`,
		token,
	).Scan(&invite.ID, &invite.RoomID, &invite.CreatedBy, &expiresAt, &invite.MaxUses, &invite.Uses, &createdAt)
	if err != nil {
		return nil, err
	}
	invite.ExpiresAt = parseTime(expiresAt)
	invite.CreatedAt = parseTime(createdAt)
	return &invite, nil
}

func (s *SQLStore) UseRoomInviteLink(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE room_invite_links SET uses = uses + 1 WHERE id = ?`,
		token,
	)
	return err
}

func (s *SQLStore) CreateRoomJoinRequest(ctx context.Context, req *models.RoomJoinRequest) error {
	now := utcNow()
	req.CreatedAt = now
	req.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO room_join_requests (id, room_id, identity_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		req.ID,
		req.RoomID,
		req.IdentityID,
		req.Status,
		formatTime(req.CreatedAt),
		formatTime(req.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindRoomJoinRequests(ctx context.Context, roomID uuid.UUID) ([]models.RoomJoinRequest, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT jr.id, jr.room_id, jr.identity_id, jr.status, jr.created_at, jr.updated_at,
			i.id, i.user_id, i.gaia_id, i.display_name, i.created_at, i.updated_at
		 FROM room_join_requests jr
		 JOIN identities i ON i.id = jr.identity_id
		 WHERE jr.room_id = ? AND jr.status = 'pending'
		 ORDER BY jr.created_at DESC`,
		roomID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reqs []models.RoomJoinRequest
	for rows.Next() {
		var req models.RoomJoinRequest
		var createdAt, updatedAt string
		var ident models.Identity
		var idCreatedAt, idUpdatedAt string
		err := rows.Scan(
			&req.ID, &req.RoomID, &req.IdentityID, &req.Status, &createdAt, &updatedAt,
			&ident.ID, &ident.UserID, &ident.GaiaID, &ident.DisplayName, &idCreatedAt, &idUpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		req.CreatedAt = parseTime(createdAt)
		req.UpdatedAt = parseTime(updatedAt)
		ident.CreatedAt = parseTime(idCreatedAt)
		ident.UpdatedAt = parseTime(idUpdatedAt)
		req.Identity = &ident
		reqs = append(reqs, req)
	}
	return reqs, rows.Err()
}

func (s *SQLStore) ModerateRoomJoinRequest(ctx context.Context, reqID uuid.UUID, status string) (*models.RoomJoinRequest, error) {
	now := utcNow()
	_, err := s.db.ExecContext(ctx,
		`UPDATE room_join_requests SET status = ?, updated_at = ? WHERE id = ?`,
		status,
		formatTime(now),
		reqID,
	)
	if err != nil {
		return nil, err
	}

	var req models.RoomJoinRequest
	var createdAt, updatedAt string
	err = s.db.QueryRowContext(ctx,
		`SELECT id, room_id, identity_id, status, created_at, updated_at FROM room_join_requests WHERE id = ?`,
		reqID,
	).Scan(&req.ID, &req.RoomID, &req.IdentityID, &req.Status, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	req.CreatedAt = parseTime(createdAt)
	req.UpdatedAt = parseTime(updatedAt)
	return &req, nil
}

func (s *SQLStore) CreateRoomModerationLog(ctx context.Context, log *models.RoomModerationLog) error {
	log.CreatedAt = utcNow()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO room_moderation_logs (room_id, actor_identity_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		log.RoomID,
		log.ActorIdentityID,
		log.Action,
		log.TargetID,
		log.Details,
		formatTime(log.CreatedAt),
	)
	return err
}

func (s *SQLStore) GetRoomModerationLogs(ctx context.Context, roomID uuid.UUID) ([]models.RoomModerationLog, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, room_id, actor_identity_id, action, target_id, details, created_at FROM room_moderation_logs WHERE room_id = ? ORDER BY created_at DESC`,
		roomID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.RoomModerationLog
	for rows.Next() {
		var l models.RoomModerationLog
		var createdAt string
		if err := rows.Scan(&l.ID, &l.RoomID, &l.ActorIdentityID, &l.Action, &l.TargetID, &l.Details, &createdAt); err != nil {
			return nil, err
		}
		l.CreatedAt = parseTime(createdAt)
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

func (s *SQLStore) SearchPublicRooms(ctx context.Context, query string) ([]models.Room, error) {
	likeQuery := "%" + query + "%"
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, is_private, created_by, description, avatar, secret_hash, read_only, slow_mode_seconds, top_secret, created_at, updated_at
		 FROM rooms
		 WHERE is_private = 0 AND (name LIKE ? OR description LIKE ?)
		 ORDER BY created_at DESC`,
		likeQuery,
		likeQuery,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []models.Room
	for rows.Next() {
		room, err := scanRoomRows(rows)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	return rooms, rows.Err()
}

func (s *SQLStore) GetLastMessageTimestamp(ctx context.Context, identityID uuid.UUID, channelID string) (time.Time, error) {
	var gaiaID string
	err := s.db.QueryRowContext(ctx, `SELECT gaia_id FROM identities WHERE id = ? LIMIT 1`, identityID).Scan(&gaiaID)
	if err != nil {
		return time.Time{}, err
	}

	var createdAtStr string
	err = s.db.QueryRowContext(ctx,
		`SELECT created_at FROM message_envelopes WHERE sender = ? AND channel_id = ? ORDER BY created_at DESC LIMIT 1`,
		gaiaID,
		channelID,
	).Scan(&createdAtStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return time.Time{}, nil
		}
		return time.Time{}, err
	}

	return parseTime(createdAtStr), nil
}

func (s *SQLStore) BlockPublicChannel(ctx context.Context, identityID, channelID uuid.UUID) error {
	_, err := s.db.ExecContext(
		ctx,
		`INSERT OR IGNORE INTO public_channel_blocks (identity_id, channel_id, created_at)
		 VALUES (?, ?, ?)`,
		identityID,
		channelID,
		formatTime(utcNow()),
	)
	return err
}

func (s *SQLStore) UnblockPublicChannel(ctx context.Context, identityID, channelID uuid.UUID) error {
	_, err := s.db.ExecContext(
		ctx,
		`DELETE FROM public_channel_blocks WHERE identity_id = ? AND channel_id = ?`,
		identityID,
		channelID,
	)
	return err
}

func (s *SQLStore) FindBlockedPublicChannels(ctx context.Context, identityID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT channel_id FROM public_channel_blocks WHERE identity_id = ?`,
		identityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channelIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		channelIDs = append(channelIDs, id)
	}
	return channelIDs, rows.Err()
}

func (s *SQLStore) SearchDiscoverablePublicChannels(ctx context.Context, userID, identityID uuid.UUID, query string, category string) ([]models.PublicChannel, error) {
	likeQuery := "%" + query + "%"
	
	sqlQuery := `SELECT pc.id, pc.name, pc.description, pc.avatar, pc.created_by, pc.created_at, pc.updated_at,
			(SELECT COUNT(1) FROM public_channel_subscribers pcs WHERE pcs.channel_id = pc.id) AS subscriber_count,
			EXISTS(SELECT 1 FROM public_channel_subscribers pcs JOIN identities i ON i.id = pcs.identity_id WHERE pcs.channel_id = pc.id AND i.user_id = ?) AS is_subscribed,
			EXISTS(SELECT 1 FROM public_channel_admins pca JOIN identities i ON i.id = pca.identity_id WHERE pca.channel_id = pc.id AND i.user_id = ?) AS is_admin,
			pc.is_suspended, pc.suspension_reason, pc.is_verified, pc.comments_enabled,
			pc.category,
			EXISTS(SELECT 1 FROM public_channel_blocks pcb JOIN identities i ON i.id = pcb.identity_id WHERE pcb.channel_id = pc.id AND i.user_id = ?) AS is_blocked
		 FROM public_channels pc
		 WHERE pc.is_suspended = 0
		   AND (SELECT COUNT(1) FROM abuse_cases ac WHERE ac.reported_identity_hash = pc.id AND ac.status != 'rejected') < 5
		   AND NOT EXISTS(SELECT 1 FROM public_channel_subscribers pcs JOIN identities i ON i.id = pcs.identity_id WHERE pcs.channel_id = pc.id AND i.user_id = ?)
		   AND NOT EXISTS(SELECT 1 FROM public_channel_blocks pcb JOIN identities i ON i.id = pcb.identity_id WHERE pcb.channel_id = pc.id AND i.user_id = ?)`

	var args []interface{}
	args = append(args, userID, userID, userID, userID, userID)

	if query != "" {
		sqlQuery += ` AND (pc.name LIKE ? OR pc.description LIKE ?)`
		args = append(args, likeQuery, likeQuery)
	}

	if category != "" && category != "All" && category != "General" && category != "General / Allgemein" {
		sqlQuery += ` AND LOWER(pc.category) = LOWER(?)`
		args = append(args, category)
	}

	sqlQuery += ` ORDER BY subscriber_count DESC, pc.created_at DESC`

	rows, err := s.db.QueryContext(ctx, sqlQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.PublicChannel
	for rows.Next() {
		channel, err := scanPublicChannelRows(rows)
		if err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, rows.Err()
}
