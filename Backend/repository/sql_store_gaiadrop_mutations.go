// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"gaiacom/backend/core/uuid"
)

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

// --- GOVERNANCE STORE ---
