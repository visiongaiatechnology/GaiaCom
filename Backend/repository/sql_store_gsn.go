// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"gaiacom/backend/models"
)

func (s *SQLStore) CreateGsnPost(ctx context.Context, post *models.GsnPost) error {
	isOp := 0
	if post.IsVerifiedOperator {
		isOp = 1
	}
	isGov := 0
	if post.IsVerifiedGovernance {
		isGov = 1
	}
	isPass := 0
	if post.IsVerifiedPassport {
		isPass = 1
	}

	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO gsn_posts (id, gaia_id, display_name, avatar, node_id, timestamp, body, image_attachment, signature, repost_of_post_id, is_verified_operator, is_verified_governance, is_verified_passport)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		post.ID, post.GaiaID, post.DisplayName, post.Avatar, post.NodeID, post.Timestamp, post.Body, post.ImageAttachment, post.Signature, post.RepostOfPostID, isOp, isGov, isPass)
	return err
}

func (s *SQLStore) GetGsnPost(ctx context.Context, postID string) (*models.GsnPost, error) {
	var post models.GsnPost
	var isOp, isGov, isPass int
	err := s.db.QueryRowContext(ctx,
		`SELECT id, gaia_id, display_name, avatar, node_id, timestamp, body, image_attachment, signature, repost_of_post_id, is_verified_operator, is_verified_governance, is_verified_passport
		 FROM gsn_posts WHERE id = ?`, postID).Scan(
		&post.ID, &post.GaiaID, &post.DisplayName, &post.Avatar, &post.NodeID, &post.Timestamp, &post.Body, &post.ImageAttachment, &post.Signature, &post.RepostOfPostID, &isOp, &isGov, &isPass)
	if err != nil {
		return nil, err
	}
	post.IsVerifiedOperator = isOp == 1
	post.IsVerifiedGovernance = isGov == 1
	post.IsVerifiedPassport = isPass == 1
	return &post, nil
}

func (s *SQLStore) DeleteGsnPost(ctx context.Context, postID string) error {
	_, err := s.execWithBusyRetry(ctx, "DELETE FROM gsn_posts WHERE id = ?", postID)
	return err
}

func (s *SQLStore) ListGsnPostsByNode(ctx context.Context, nodeID string) ([]models.GsnPost, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, gaia_id, display_name, avatar, node_id, timestamp, body, image_attachment, signature, repost_of_post_id, is_verified_operator, is_verified_governance, is_verified_passport
		 FROM gsn_posts WHERE node_id = ? ORDER BY timestamp DESC`, nodeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var posts []models.GsnPost
	for rows.Next() {
		var post models.GsnPost
		var isOp, isGov, isPass int
		err := rows.Scan(&post.ID, &post.GaiaID, &post.DisplayName, &post.Avatar, &post.NodeID, &post.Timestamp, &post.Body, &post.ImageAttachment, &post.Signature, &post.RepostOfPostID, &isOp, &isGov, &isPass)
		if err != nil {
			return nil, err
		}
		post.IsVerifiedOperator = isOp == 1
		post.IsVerifiedGovernance = isGov == 1
		post.IsVerifiedPassport = isPass == 1
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s *SQLStore) ListGsnPostsByFollowed(ctx context.Context, followerGaiaID string) ([]models.GsnPost, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT p.id, p.gaia_id, p.display_name, p.avatar, p.node_id, p.timestamp, p.body, p.image_attachment, p.signature, p.repost_of_post_id, p.is_verified_operator, p.is_verified_governance, p.is_verified_passport
		 FROM gsn_posts p
		 INNER JOIN gsn_follows f ON p.gaia_id = f.following_gaia_id
		 WHERE f.follower_gaia_id = ?
		 ORDER BY p.timestamp DESC`, followerGaiaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var posts []models.GsnPost
	for rows.Next() {
		var post models.GsnPost
		var isOp, isGov, isPass int
		err := rows.Scan(&post.ID, &post.GaiaID, &post.DisplayName, &post.Avatar, &post.NodeID, &post.Timestamp, &post.Body, &post.ImageAttachment, &post.Signature, &post.RepostOfPostID, &isOp, &isGov, &isPass)
		if err != nil {
			return nil, err
		}
		post.IsVerifiedOperator = isOp == 1
		post.IsVerifiedGovernance = isGov == 1
		post.IsVerifiedPassport = isPass == 1
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s *SQLStore) CreateGsnComment(ctx context.Context, comment *models.GsnComment) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO gsn_post_comments (id, post_id, gaia_id, display_name, avatar, timestamp, body, signature)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		comment.ID, comment.PostID, comment.GaiaID, comment.DisplayName, comment.Avatar, comment.Timestamp, comment.Body, comment.Signature)
	return err
}

func (s *SQLStore) ListGsnComments(ctx context.Context, postID string) ([]models.GsnComment, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, post_id, gaia_id, display_name, avatar, timestamp, body, signature
		 FROM gsn_post_comments WHERE post_id = ? ORDER BY timestamp ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var comments []models.GsnComment
	for rows.Next() {
		var comment models.GsnComment
		err := rows.Scan(&comment.ID, &comment.PostID, &comment.GaiaID, &comment.DisplayName, &comment.Avatar, &comment.Timestamp, &comment.Body, &comment.Signature)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (s *SQLStore) GetGsnComment(ctx context.Context, commentID string) (*models.GsnComment, error) {
	var comment models.GsnComment
	err := s.db.QueryRowContext(ctx,
		`SELECT id, post_id, gaia_id, display_name, avatar, timestamp, body, signature
		 FROM gsn_post_comments WHERE id = ?`, commentID).Scan(
		&comment.ID, &comment.PostID, &comment.GaiaID, &comment.DisplayName, &comment.Avatar, &comment.Timestamp, &comment.Body, &comment.Signature)
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

func (s *SQLStore) DeleteGsnComment(ctx context.Context, commentID string) error {
	_, err := s.execWithBusyRetry(ctx, "DELETE FROM gsn_post_comments WHERE id = ?", commentID)
	return err
}

func (s *SQLStore) ToggleGsnReaction(ctx context.Context, postID string, gaiaID string, emoji string) (string, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM gsn_post_reactions WHERE post_id = ? AND gaia_id = ? AND emoji = ?)`,
		postID, gaiaID, emoji).Scan(&exists)
	if err != nil {
		return "", err
	}

	var action string
	if exists {
		_, err = s.execWithBusyRetry(ctx,
			`DELETE FROM gsn_post_reactions WHERE post_id = ? AND gaia_id = ? AND emoji = ?`,
			postID, gaiaID, emoji)
		action = "remove"
	} else {
		_, err = s.execWithBusyRetry(ctx,
			`INSERT INTO gsn_post_reactions (post_id, gaia_id, emoji) VALUES (?, ?, ?)`,
			postID, gaiaID, emoji)
		action = "add"
	}
	return action, err
}

func (s *SQLStore) SaveGsnReaction(ctx context.Context, postID string, gaiaID string, emoji string, action string) error {
	if action == "remove" {
		_, err := s.execWithBusyRetry(ctx,
			`DELETE FROM gsn_post_reactions WHERE post_id = ? AND gaia_id = ? AND emoji = ?`,
			postID, gaiaID, emoji)
		return err
	}
	_, err := s.execWithBusyRetry(ctx,
		`INSERT OR IGNORE INTO gsn_post_reactions (post_id, gaia_id, emoji) VALUES (?, ?, ?)`,
		postID, gaiaID, emoji)
	return err
}

func (s *SQLStore) GetGsnReactions(ctx context.Context, postID string, gaiaID string) (map[string]int, map[string]bool, error) {
	counts := make(map[string]int)
	reactedByMe := make(map[string]bool)

	rows, err := s.db.QueryContext(ctx,
		`SELECT emoji, COUNT(1) FROM gsn_post_reactions WHERE post_id = ? GROUP BY emoji`, postID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var emoji string
		var count int
		if err := rows.Scan(&emoji, &count); err != nil {
			return nil, nil, err
		}
		counts[emoji] = count
	}

	if gaiaID != "" {
		myRows, err := s.db.QueryContext(ctx,
			`SELECT emoji FROM gsn_post_reactions WHERE post_id = ? AND gaia_id = ?`, postID, gaiaID)
		if err != nil {
			return nil, nil, err
		}
		defer myRows.Close()
		for myRows.Next() {
			var emoji string
			if err := myRows.Scan(&emoji); err != nil {
				return nil, nil, err
			}
			reactedByMe[emoji] = true
		}
	}

	return counts, reactedByMe, nil
}

func (s *SQLStore) FollowGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT OR IGNORE INTO gsn_follows (follower_gaia_id, following_gaia_id, created_at) VALUES (?, ?, ?)`,
		followerGaiaID, followingGaiaID, time.Now().UTC().Format(time.RFC3339))
	return err
}

func (s *SQLStore) UnfollowGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) error {
	_, err := s.execWithBusyRetry(ctx,
		`DELETE FROM gsn_follows WHERE follower_gaia_id = ? AND following_gaia_id = ?`,
		followerGaiaID, followingGaiaID)
	return err
}

func (s *SQLStore) IsFollowingGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM gsn_follows WHERE follower_gaia_id = ? AND following_gaia_id = ?)`,
		followerGaiaID, followingGaiaID).Scan(&exists)
	return exists, err
}

func (s *SQLStore) GetGsnProfile(ctx context.Context, gaiaID string) (*models.GsnProfile, error) {
	var profile models.GsnProfile
	profile.GaiaID = gaiaID

	var identityDisplayName string
	var publicRecord sql.NullString
	var isOp, isGov, isPass int
	err := s.db.QueryRowContext(ctx,
		`SELECT p.identity_id, p.display_name, p.description, p.avatar, p.website, p.is_verified_operator, p.is_verified_governance, p.is_verified_passport, p.trust_passport_summary, p.updated_at, i.display_name, i.public_record
		 FROM gsn_profiles p
		 INNER JOIN identities i ON p.identity_id = i.id
		 WHERE i.gaia_id = ?`, gaiaID).Scan(
		&profile.IdentityID, &profile.DisplayName, &profile.Description, &profile.Avatar, &profile.Website, &isOp, &isGov, &isPass, &profile.TrustPassportSummary, &profile.UpdatedAt, &identityDisplayName, &publicRecord)

	if err != nil {
		if err == sql.ErrNoRows {
			// Profile record not found, load defaults from identities
			err = s.db.QueryRowContext(ctx,
				`SELECT id, display_name, public_record, updated_at FROM identities WHERE gaia_id = ?`, gaiaID).Scan(
				&profile.IdentityID, &identityDisplayName, &publicRecord, &profile.UpdatedAt)
			if err != nil {
				return nil, err
			}
			profile.DisplayName = identityDisplayName
			profile.Description = ""
			profile.Avatar = ""
			profile.Website = ""
			profile.IsVerifiedOperator = false
			profile.IsVerifiedGovernance = false
			profile.IsVerifiedPassport = false
			profile.TrustPassportSummary = ""
		} else {
			return nil, err
		}
	} else {
		profile.IsVerifiedOperator = isOp == 1
		profile.IsVerifiedGovernance = isGov == 1
		profile.IsVerifiedPassport = isPass == 1
	}
	if err := applyIdentityPublicProfile(&profile, identityDisplayName, publicRecord); err != nil {
		return nil, err
	}

	// Load dynamic follower/following counts
	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_follows WHERE following_gaia_id = ?`, gaiaID).Scan(&profile.FollowersCount)
	if err != nil {
		return nil, err
	}

	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_follows WHERE follower_gaia_id = ?`, gaiaID).Scan(&profile.FollowingCount)
	if err != nil {
		return nil, err
	}

	return &profile, nil
}

func (s *SQLStore) UpdateGsnProfile(ctx context.Context, profile *models.GsnProfile) error {
	isOp := 0
	if profile.IsVerifiedOperator {
		isOp = 1
	}
	isGov := 0
	if profile.IsVerifiedGovernance {
		isGov = 1
	}
	isPass := 0
	if profile.IsVerifiedPassport {
		isPass = 1
	}

	nowStr := time.Now().UTC().Format(time.RFC3339)

	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO gsn_profiles (identity_id, display_name, description, avatar, website, is_verified_operator, is_verified_governance, is_verified_passport, trust_passport_summary, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(identity_id) DO UPDATE SET
			display_name = excluded.display_name,
			description = excluded.description,
			avatar = excluded.avatar,
			website = excluded.website,
			is_verified_operator = excluded.is_verified_operator,
			is_verified_governance = excluded.is_verified_governance,
			is_verified_passport = excluded.is_verified_passport,
			trust_passport_summary = excluded.trust_passport_summary,
			updated_at = excluded.updated_at`,
		profile.IdentityID, profile.DisplayName, profile.Description, profile.Avatar, profile.Website, isOp, isGov, isPass, profile.TrustPassportSummary, nowStr)
	return err
}

func applyIdentityPublicProfile(profile *models.GsnProfile, identityDisplayName string, publicRecord sql.NullString) error {
	if identityDisplayName != "" {
		profile.DisplayName = identityDisplayName
	}
	if !publicRecord.Valid || publicRecord.String == "" {
		return nil
	}

	var decoded struct {
		Profile models.IdentityPublicProfile `json:"profile"`
	}
	if err := json.Unmarshal([]byte(publicRecord.String), &decoded); err != nil {
		return err
	}
	if decoded.Profile.RealName != "" {
		profile.RealName = decoded.Profile.RealName
	}
	if decoded.Profile.DisplayName != "" {
		profile.DisplayName = decoded.Profile.DisplayName
	}
	if decoded.Profile.Bio != "" {
		profile.Description = decoded.Profile.Bio
	}
	if decoded.Profile.Avatar != "" {
		profile.Avatar = decoded.Profile.Avatar
	}
	if decoded.Profile.Website != "" {
		profile.Website = decoded.Profile.Website
	}
	return nil
}

func (s *SQLStore) CountGsnPostsCommentsInDuration(ctx context.Context, gaiaID string, duration time.Duration) (int, error) {
	since := time.Now().UTC().Add(-duration).Format(time.RFC3339)
	var postCount int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_posts WHERE gaia_id = ? AND timestamp >= ?`, gaiaID, since).Scan(&postCount)
	if err != nil {
		return 0, err
	}

	var commentCount int
	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_post_comments WHERE gaia_id = ? AND timestamp >= ?`, gaiaID, since).Scan(&commentCount)
	if err != nil {
		return 0, err
	}

	return postCount + commentCount, nil
}

func (s *SQLStore) CountGsnFollowsInDuration(ctx context.Context, followerGaiaID string, duration time.Duration) (int, error) {
	since := time.Now().UTC().Add(-duration).Format(time.RFC3339)
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM gsn_follows WHERE follower_gaia_id = ? AND created_at >= ?`, followerGaiaID, since).Scan(&count)
	return count, err
}
