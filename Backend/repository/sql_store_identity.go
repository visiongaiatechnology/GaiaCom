package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

func (s *SQLStore) CountIdentitiesByGaiaID(gaiaID string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM identities WHERE LOWER(gaia_id) = LOWER(?)`, gaiaID).Scan(&count)
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
		 FROM identities WHERE LOWER(gaia_id) = LOWER(?) LIMIT 1`,
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

func (s *SQLStore) CompareAndSwapIdentityPublicRecord(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, expected models.JSONB, replacement models.JSONB) (*models.Identity, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := utcNow()
	result, err := tx.ExecContext(
		ctx,
		`UPDATE identities SET public_record = ?, updated_at = ?
		 WHERE id = ? AND user_id = ? AND is_active = 1 AND public_record = ?`,
		[]byte(replacement),
		formatTime(now),
		identityID,
		userID,
		[]byte(expected),
	)
	if err != nil {
		return nil, err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if updated != 1 {
		return nil, sql.ErrNoRows
	}

	row := tx.QueryRowContext(
		ctx,
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE id = ? AND user_id = ? LIMIT 1`,
		identityID,
		userID,
	)
	identity, err := scanIdentity(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return identity, nil
}

func (s *SQLStore) UpdateIdentityPublicProfile(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, profile models.IdentityPublicProfile) (*models.Identity, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentRecord sql.NullString
	err = tx.QueryRowContext(
		ctx,
		`SELECT public_record FROM identities WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1`,
		identityID,
		userID,
	).Scan(&currentRecord)
	if err != nil {
		return nil, err
	}

	record := make(map[string]interface{})
	if currentRecord.Valid && currentRecord.String != "" {
		if err := json.Unmarshal([]byte(currentRecord.String), &record); err != nil {
			return nil, err
		}
	}
	record["profile"] = profile

	nextRecord, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	now := utcNow()
	_, err = tx.ExecContext(
		ctx,
		`UPDATE identities SET display_name = ?, public_record = ?, updated_at = ? WHERE id = ? AND user_id = ? AND is_active = 1`,
		profile.DisplayName,
		string(nextRecord),
		formatTime(now),
		identityID,
		userID,
	)
	if err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(
		ctx,
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE id = ? AND user_id = ? LIMIT 1`,
		identityID,
		userID,
	)
	identity, err := scanIdentity(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return identity, nil
}

func (s *SQLStore) UpdateIdentityHumanProof(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, proof map[string]interface{}) (*models.Identity, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentRecord sql.NullString
	err = tx.QueryRowContext(
		ctx,
		`SELECT public_record FROM identities WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1`,
		identityID,
		userID,
	).Scan(&currentRecord)
	if err != nil {
		return nil, err
	}

	record := make(map[string]interface{})
	if currentRecord.Valid && currentRecord.String != "" {
		if err := json.Unmarshal([]byte(currentRecord.String), &record); err != nil {
			return nil, err
		}
	}
	record["human_proof"] = proof

	nextRecord, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	now := utcNow()
	_, err = tx.ExecContext(
		ctx,
		`UPDATE identities SET public_record = ?, updated_at = ? WHERE id = ? AND user_id = ? AND is_active = 1`,
		string(nextRecord),
		formatTime(now),
		identityID,
		userID,
	)
	if err != nil {
		return nil, err
	}

	row := tx.QueryRowContext(
		ctx,
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities WHERE id = ? AND user_id = ? LIMIT 1`,
		identityID,
		userID,
	)
	identity, err := scanIdentity(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return identity, nil
}

func (s *SQLStore) FindAllIdentities(ctx context.Context) ([]models.Identity, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at
		 FROM identities`,
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
