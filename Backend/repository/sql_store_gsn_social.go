package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"gaiacom/backend/models"
)

// CreateGsnNotification persists one real social event notification.
// The unique (recipient, actor, type, post, comment) key makes repeated events
// idempotent: the boolean reports whether a new row was actually written.
func (s *SQLStore) CreateGsnNotification(ctx context.Context, notification *models.GsnNotification) (bool, error) {
	if notification == nil || notification.RecipientGaiaID == "" || notification.ActorGaiaID == "" {
		return false, fmt.Errorf("invalid gsn notification payload")
	}
	result, err := s.execWithBusyRetry(ctx,
		`INSERT OR IGNORE INTO gsn_notifications
			(id, recipient_gaia_id, actor_gaia_id, type, post_id, comment_id, preview, created_at, read_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')`,
		notification.ID,
		notification.RecipientGaiaID,
		notification.ActorGaiaID,
		notification.Type,
		notification.PostID,
		notification.CommentID,
		notification.Preview,
		notification.CreatedAt,
	)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

// ListGsnNotifications returns the newest real notifications for one local identity,
// hydrated with the actor's current display name and avatar.
func (s *SQLStore) ListGsnNotifications(ctx context.Context, recipientGaiaID string, limit int) ([]models.GsnNotification, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT n.id, n.actor_gaia_id,
		        COALESCE(NULLIF(p.display_name, ''), i.display_name, ''),
		        COALESCE(p.avatar, ''),
		        n.type, n.post_id, n.comment_id, n.preview, n.created_at, n.read_at
		 FROM gsn_notifications n
		 LEFT JOIN identities i ON i.gaia_id = n.actor_gaia_id
		 LEFT JOIN gsn_profiles p ON p.identity_id = i.id
		 WHERE n.recipient_gaia_id = ?
		 ORDER BY n.created_at DESC, n.id DESC
		 LIMIT ?`, recipientGaiaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := make([]models.GsnNotification, 0, limit)
	for rows.Next() {
		var notification models.GsnNotification
		var readAt string
		if err := rows.Scan(
			&notification.ID,
			&notification.ActorGaiaID,
			&notification.ActorDisplayName,
			&notification.ActorAvatar,
			&notification.Type,
			&notification.PostID,
			&notification.CommentID,
			&notification.Preview,
			&notification.CreatedAt,
			&readAt,
		); err != nil {
			return nil, err
		}
		notification.RecipientGaiaID = recipientGaiaID
		notification.Read = readAt != ""
		notifications = append(notifications, notification)
	}
	return notifications, rows.Err()
}

// UnreadGsnNotificationCount counts real unread notifications for one identity.
func (s *SQLStore) UnreadGsnNotificationCount(ctx context.Context, recipientGaiaID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_notifications WHERE recipient_gaia_id = ? AND read_at = ''`,
		recipientGaiaID).Scan(&count)
	return count, err
}

// MarkGsnNotificationsRead marks every unread notification of one identity read.
func (s *SQLStore) MarkGsnNotificationsRead(ctx context.Context, recipientGaiaID string) (int, error) {
	readAt := time.Now().UTC().Format(time.RFC3339)
	result, err := s.execWithBusyRetry(ctx,
		`UPDATE gsn_notifications SET read_at = ? WHERE recipient_gaia_id = ? AND read_at = ''`,
		readAt, recipientGaiaID)
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(affected), nil
}

// ListGsnPostBodiesSince projects real post bodies used for trend aggregation.
func (s *SQLStore) ListGsnPostBodiesSince(ctx context.Context, since string, limit int) ([]models.GsnPostBody, error) {
	if limit <= 0 || limit > 10000 {
		limit = 5000
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT body, timestamp FROM gsn_posts WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?`,
		since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bodies := make([]models.GsnPostBody, 0, limit)
	for rows.Next() {
		var body models.GsnPostBody
		if err := rows.Scan(&body.Body, &body.Timestamp); err != nil {
			return nil, err
		}
		bodies = append(bodies, body)
	}
	return bodies, rows.Err()
}

// ListGsnSuggestionCandidates ranks real local identities the requester does not
// follow yet. Ranking is derived from real signals only: reverse follow, recent
// post activity, follower count. No synthetic entries are produced.
func (s *SQLStore) ListGsnSuggestionCandidates(ctx context.Context, requesterGaiaID string, since string, limit int) ([]models.GsnSuggestion, error) {
	if limit <= 0 || limit > 50 {
		limit = 5
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT i.gaia_id,
		        COALESCE(NULLIF(p.display_name, ''), i.display_name, '') AS display_name,
		        COALESCE(p.avatar, '') AS avatar,
		        (SELECT COUNT(1) FROM gsn_follows f WHERE f.following_gaia_id = i.gaia_id) AS followers,
		        EXISTS(SELECT 1 FROM gsn_follows r WHERE r.follower_gaia_id = i.gaia_id AND r.following_gaia_id = ?) AS follows_me,
		        (SELECT COUNT(1) FROM gsn_posts gp WHERE gp.gaia_id = i.gaia_id AND gp.timestamp >= ?) AS recent_posts
		 FROM identities i
		 LEFT JOIN gsn_profiles p ON p.identity_id = i.id
		 WHERE i.gaia_id <> ?
		   AND NOT EXISTS(SELECT 1 FROM gsn_follows f2 WHERE f2.follower_gaia_id = ? AND f2.following_gaia_id = i.gaia_id)
		 ORDER BY follows_me DESC, recent_posts DESC, followers DESC, i.gaia_id ASC
		 LIMIT ?`,
		requesterGaiaID, since, requesterGaiaID, requesterGaiaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	suggestions := make([]models.GsnSuggestion, 0, limit)
	for rows.Next() {
		var suggestion models.GsnSuggestion
		var followsMe int
		if err := rows.Scan(
			&suggestion.GaiaID,
			&suggestion.DisplayName,
			&suggestion.Avatar,
			&suggestion.FollowersCount,
			&followsMe,
			&suggestion.RecentPosts,
		); err != nil {
			return nil, err
		}
		suggestion.FollowsMe = followsMe == 1
		suggestions = append(suggestions, suggestion)
	}
	return suggestions, rows.Err()
}

// ListGsnFollowerIDs returns the real GaiaIDs following one identity.
func (s *SQLStore) ListGsnFollowerIDs(ctx context.Context, gaiaID string, limit int) ([]string, error) {
	return s.listGsnFollowIDs(ctx,
		`SELECT follower_gaia_id FROM gsn_follows WHERE following_gaia_id = ? ORDER BY created_at DESC LIMIT ?`,
		gaiaID, limit)
}

// ListGsnFollowingIDs returns the real GaiaIDs one identity follows.
func (s *SQLStore) ListGsnFollowingIDs(ctx context.Context, gaiaID string, limit int) ([]string, error) {
	return s.listGsnFollowIDs(ctx,
		`SELECT following_gaia_id FROM gsn_follows WHERE follower_gaia_id = ? ORDER BY created_at DESC LIMIT ?`,
		gaiaID, limit)
}

func (s *SQLStore) listGsnFollowIDs(ctx context.Context, query string, gaiaID string, limit int) ([]string, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx, query, gaiaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0, limit)
	for rows.Next() {
		var id sql.NullString
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		if id.Valid && id.String != "" {
			ids = append(ids, id.String)
		}
	}
	return ids, rows.Err()
}
