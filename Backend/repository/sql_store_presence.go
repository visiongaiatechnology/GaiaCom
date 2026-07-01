// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

const presenceOnlineWindow = 90 * time.Second

func (s *SQLStore) UpsertIdentityPresence(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, status string) (*models.IdentityPresence, error) {
	cleanStatus := normalizePresenceStatus(status)
	now := utcNow()
	var gaiaID string
	if err := s.db.QueryRowContext(
		ctx,
		`SELECT gaia_id FROM identities WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1`,
		identityID,
		userID,
	).Scan(&gaiaID); err != nil {
		return nil, err
	}
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO identity_presence (identity_id, user_id, gaia_id, status, last_seen_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(identity_id) DO UPDATE SET
		 user_id = excluded.user_id,
		 gaia_id = excluded.gaia_id,
		 status = excluded.status,
		 last_seen_at = excluded.last_seen_at,
		 updated_at = excluded.updated_at`,
		identityID,
		userID,
		gaiaID,
		cleanStatus,
		formatTime(now),
		formatTime(now),
	)
	if err != nil {
		return nil, err
	}
	return s.scanPresenceByIdentity(ctx, identityID)
}

func (s *SQLStore) FindIdentityPresenceByGaiaIDs(ctx context.Context, gaiaIDs []string) (map[string]models.IdentityPresence, error) {
	result := make(map[string]models.IdentityPresence, len(gaiaIDs))
	cleanIDs := make([]string, 0, len(gaiaIDs))
	seen := make(map[string]struct{}, len(gaiaIDs))
	for _, gaiaID := range gaiaIDs {
		clean := strings.ToLower(strings.TrimSpace(gaiaID))
		if clean == "" {
			continue
		}
		if _, ok := seen[clean]; ok {
			continue
		}
		seen[clean] = struct{}{}
		cleanIDs = append(cleanIDs, clean)
		result[clean] = models.IdentityPresence{GaiaID: gaiaID, Status: "offline"}
	}
	if len(cleanIDs) == 0 {
		return result, nil
	}
	args := make([]interface{}, len(cleanIDs))
	for index, gaiaID := range cleanIDs {
		args[index] = gaiaID
	}
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT identity_id, user_id, gaia_id, status, last_seen_at, updated_at
		 FROM identity_presence
		 WHERE LOWER(gaia_id) IN (`+placeholders(len(cleanIDs))+`)`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		presence, err := scanIdentityPresenceRows(rows)
		if err != nil {
			return nil, err
		}
		result[strings.ToLower(presence.GaiaID)] = applyPresenceOnlineWindow(presence)
	}
	return result, rows.Err()
}

func (s *SQLStore) scanPresenceByIdentity(ctx context.Context, identityID uuid.UUID) (*models.IdentityPresence, error) {
	presence, err := scanIdentityPresence(s.db.QueryRowContext(
		ctx,
		`SELECT identity_id, user_id, gaia_id, status, last_seen_at, updated_at
		 FROM identity_presence
		 WHERE identity_id = ?
		 LIMIT 1`,
		identityID,
	))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}
	applied := applyPresenceOnlineWindow(*presence)
	return &applied, nil
}

func normalizePresenceStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "away":
		return "away"
	case "busy":
		return "busy"
	default:
		return "online"
	}
}

func applyPresenceOnlineWindow(presence models.IdentityPresence) models.IdentityPresence {
	if presence.LastSeenAt.IsZero() || time.Since(presence.LastSeenAt) > presenceOnlineWindow {
		presence.IsOnline = false
		presence.Status = "offline"
		return presence
	}
	presence.IsOnline = presence.Status == "online" || presence.Status == "away" || presence.Status == "busy"
	return presence
}
