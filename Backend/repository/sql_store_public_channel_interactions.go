// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

func (s *SQLStore) FindPublicChannelPostReactionStatesForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postIDs []uuid.UUID) (map[uuid.UUID]models.PublicChannelPostReactionState, error) {
	result := make(map[uuid.UUID]models.PublicChannelPostReactionState, len(postIDs))
	if len(postIDs) == 0 {
		return result, nil
	}
	args := make([]interface{}, 0, len(postIDs))
	for _, postID := range postIDs {
		args = append(args, postID)
		result[postID] = models.PublicChannelPostReactionState{
			Reactions:   map[string]int{},
			ReactedByMe: map[string]bool{},
		}
	}
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT post_id, emoji, COUNT(1)
		 FROM public_channel_post_reactions
		 WHERE post_id IN (`+placeholders(len(postIDs))+`)
		 GROUP BY post_id, emoji`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var postID uuid.UUID
		var emoji string
		var count int
		if err := rows.Scan(&postID, &emoji, &count); err != nil {
			_ = rows.Close()
			return nil, err
		}
		state := result[postID]
		if state.Reactions == nil {
			state.Reactions = map[string]int{}
		}
		if state.ReactedByMe == nil {
			state.ReactedByMe = map[string]bool{}
		}
		state.Reactions[emoji] = count
		result[postID] = state
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if identityID == uuid.Nil {
		return result, nil
	}
	if ok, err := s.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, sql.ErrNoRows
	}
	userArgs := make([]interface{}, 0, len(postIDs)+1)
	for _, postID := range postIDs {
		userArgs = append(userArgs, postID)
	}
	userArgs = append(userArgs, identityID)
	userRows, err := s.db.QueryContext(
		ctx,
		`SELECT post_id, emoji
		 FROM public_channel_post_reactions
		 WHERE post_id IN (`+placeholders(len(postIDs))+`) AND identity_id = ?`,
		userArgs...,
	)
	if err != nil {
		return nil, err
	}
	defer userRows.Close()
	for userRows.Next() {
		var postID uuid.UUID
		var emoji string
		if err := userRows.Scan(&postID, &emoji); err != nil {
			return nil, err
		}
		state := result[postID]
		if state.ReactedByMe == nil {
			state.ReactedByMe = map[string]bool{}
		}
		state.ReactedByMe[emoji] = true
		result[postID] = state
	}
	return result, userRows.Err()
}

func (s *SQLStore) TogglePublicChannelPostReactionForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, emoji string) (*models.PublicChannelPostReactionState, error) {
	if ok, err := s.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, sql.ErrNoRows
	}
	if err := s.ensurePublicChannelPostInteractable(ctx, postID); err != nil {
		return nil, err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)

	var reactionID int64
	err = tx.QueryRowContext(
		ctx,
		`SELECT id FROM public_channel_post_reactions WHERE post_id = ? AND identity_id = ? AND emoji = ? LIMIT 1`,
		postID,
		identityID,
		emoji,
	).Scan(&reactionID)
	if err == nil {
		_, err = tx.ExecContext(ctx, `DELETE FROM public_channel_post_reactions WHERE id = ?`, reactionID)
	} else if err == sql.ErrNoRows {
		_, err = tx.ExecContext(
			ctx,
			`INSERT INTO public_channel_post_reactions (post_id, identity_id, emoji, created_at) VALUES (?, ?, ?, ?)`,
			postID,
			identityID,
			emoji,
			formatTime(utcNow()),
		)
	}
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	states, err := s.FindPublicChannelPostReactionStatesForUser(ctx, userID, identityID, []uuid.UUID{postID})
	if err != nil {
		return nil, err
	}
	state := states[postID]
	return &state, nil
}

func (s *SQLStore) CreatePublicChannelPostCommentForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, body string) (*models.PublicChannelPostComment, error) {
	if ok, err := s.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, sql.ErrNoRows
	}
	if err := s.ensurePublicChannelPostInteractable(ctx, postID); err != nil {
		return nil, err
	}
	if err := s.ensurePublicChannelPostCommentsEnabled(ctx, postID); err != nil {
		return nil, err
	}
	comment := &models.PublicChannelPostComment{
		ID:               uuid.New(),
		PostID:           postID,
		AuthorIdentityID: identityID,
		Body:             strings.TrimSpace(body),
		CreatedAt:        utcNow(),
		Status:           "approved",
	}
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO public_channel_post_comments (id, post_id, author_identity_id, body, created_at, status) VALUES (?, ?, ?, ?, ?, 'approved')`,
		comment.ID,
		comment.PostID,
		comment.AuthorIdentityID,
		comment.Body,
		formatTime(comment.CreatedAt),
	)
	if err != nil {
		return nil, err
	}
	return s.findPublicChannelPostCommentByID(ctx, comment.ID)
}

func (s *SQLStore) UpdatePublicChannelPostPinForAdmin(ctx context.Context, userID uuid.UUID, postID uuid.UUID, pinned bool) (*models.PublicChannelPost, error) {
	pinnedAt := ""
	if pinned {
		pinnedAt = formatTime(utcNow())
	}
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE public_channel_posts
		 SET pinned_at = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1
			FROM public_channels pc
			JOIN public_channel_admins pca ON pca.channel_id = pc.id
			JOIN identities i ON i.id = pca.identity_id
			WHERE pc.id = public_channel_posts.channel_id AND i.user_id = ?
		 )`,
		pinnedAt,
		postID,
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
	post, err := scanPublicChannelPost(s.db.QueryRowContext(
		ctx,
		`SELECT id, channel_id, author_identity_id, body, formatting, attachments, created_at, pinned_at, scheduled_for
		 FROM public_channel_posts
		 WHERE id = ?
		 LIMIT 1`,
		postID,
	))
	if err != nil {
		return nil, err
	}
	return post, nil
}

func (s *SQLStore) FindPublicChannelPostComments(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID][]models.PublicChannelPostComment, error) {
	result := make(map[uuid.UUID][]models.PublicChannelPostComment, len(postIDs))
	if len(postIDs) == 0 {
		return result, nil
	}
	args := make([]interface{}, 0, len(postIDs))
	for _, postID := range postIDs {
		args = append(args, postID)
		result[postID] = []models.PublicChannelPostComment{}
	}
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT c.id, c.post_id, c.author_identity_id, i.display_name, i.gaia_id, c.body, c.created_at, c.status
		 FROM public_channel_post_comments c
		 JOIN identities i ON i.id = c.author_identity_id
		 WHERE c.deleted_at = '' AND c.status = 'approved' AND c.post_id IN (`+placeholders(len(postIDs))+`)
		 ORDER BY c.created_at ASC`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		comment, err := scanPublicChannelPostCommentRows(rows)
		if err != nil {
			return nil, err
		}
		result[comment.PostID] = append(result[comment.PostID], comment)
	}
	return result, rows.Err()
}

func (s *SQLStore) findPublicChannelPostCommentByID(ctx context.Context, commentID uuid.UUID) (*models.PublicChannelPostComment, error) {
	return scanPublicChannelPostComment(s.db.QueryRowContext(
		ctx,
		`SELECT c.id, c.post_id, c.author_identity_id, i.display_name, i.gaia_id, c.body, c.created_at, c.status
		 FROM public_channel_post_comments c
		 JOIN identities i ON i.id = c.author_identity_id
		 WHERE c.id = ? AND c.deleted_at = ''
		 LIMIT 1`,
		commentID,
	))
}

func (s *SQLStore) ensurePublicChannelPostInteractable(ctx context.Context, postID uuid.UUID) error {
	var count int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COUNT(1)
		 FROM public_channel_posts p
		 JOIN public_channels pc ON pc.id = p.channel_id
		 WHERE p.id = ? AND pc.is_suspended = 0`,
		postID,
	).Scan(&count)
	if err != nil {
		return err
	}
	if count != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) ensurePublicChannelPostCommentsEnabled(ctx context.Context, postID uuid.UUID) error {
	var enabled int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT pc.comments_enabled
		 FROM public_channel_posts p
		 JOIN public_channels pc ON pc.id = p.channel_id
		 WHERE p.id = ?
		 LIMIT 1`,
		postID,
	).Scan(&enabled)
	if err != nil {
		return err
	}
	if enabled == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) DeletePublicChannelCommentForAdmin(ctx context.Context, userID, commentID uuid.UUID) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE public_channel_post_comments
		 SET deleted_at = ?, status = 'deleted'
		 WHERE id = ? AND EXISTS (
			SELECT 1 FROM public_channel_posts p
			JOIN public_channels pc ON pc.id = p.channel_id
			JOIN public_channel_admins pca ON pca.channel_id = pc.id
			JOIN identities i ON i.id = pca.identity_id
			WHERE p.id = public_channel_post_comments.post_id AND i.user_id = ?
		 )`,
		formatTime(utcNow()),
		commentID,
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

func (s *SQLStore) ModeratePublicChannelComment(ctx context.Context, userID, commentID uuid.UUID, status string) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE public_channel_post_comments
		 SET status = ?
		 WHERE id = ? AND EXISTS (
			SELECT 1 FROM public_channel_posts p
			JOIN public_channels pc ON pc.id = p.channel_id
			JOIN public_channel_admins pca ON pca.channel_id = pc.id
			JOIN identities i ON i.id = pca.identity_id
			WHERE p.id = public_channel_post_comments.post_id AND i.user_id = ?
		 )`,
		status,
		commentID,
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
