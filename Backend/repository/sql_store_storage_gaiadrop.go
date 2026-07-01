// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

func (s *SQLStore) CreateFileMetadata(metadata *models.FileMetadata) error {
	now := utcNow()
	metadata.CreatedAt = now
	metadata.UpdatedAt = now
	_, err := s.execWithBusyRetry(
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
	result, err := s.execWithBusyRetry(
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
	result, err := s.execWithBusyRetry(
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
	_, err := s.execWithBusyRetry(
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

func (s *SQLStore) FindFileMetadata(fileID uuid.UUID) (*models.FileMetadata, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT file_id, user_id, file_name, file_size, file_hash, mime_type, encryption_iv, path, status, created_at, updated_at
		 FROM file_metadata WHERE file_id = ? LIMIT 1`,
		fileID,
	)
	return scanFileMetadata(row)
}

func (s *SQLStore) FindAccessibleFileMetadata(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT fm.file_id, fm.user_id, fm.file_name, fm.file_size, fm.file_hash, fm.mime_type, fm.encryption_iv, fm.path, fm.status, fm.created_at, fm.updated_at
		 FROM file_metadata fm
		 WHERE fm.file_id = ?
		   AND (
		     fm.user_id = ?
		     OR fm.public_access = 1
		     OR EXISTS (
		       SELECT 1
		       FROM file_access_grants fag
		       WHERE fag.file_id = fm.file_id
		         AND fag.user_id = ?
		         AND (fag.expires_at = '' OR fag.expires_at > ?)
		     )
		   )
		 LIMIT 1`,
		fileID,
		userID,
		userID,
		time.Now().UTC().Format(time.RFC3339),
	)
	return scanFileMetadata(row)
}

func (s *SQLStore) FindFileChunks(fileID uuid.UUID) ([]models.FileChunk, error) {
	rows, err := s.db.QueryContext(
		context.Background(),
		`SELECT id, file_id, chunk_index, chunk_hash, chunk_size, minio_id
		 FROM file_chunks WHERE file_id = ? ORDER BY chunk_index ASC`,
		fileID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chunks []models.FileChunk
	for rows.Next() {
		var chunk models.FileChunk
		var fileIDStr string
		err := rows.Scan(&chunk.ID, &fileIDStr, &chunk.Index, &chunk.ChunkHash, &chunk.ChunkSize, &chunk.MinioID)
		if err != nil {
			return nil, err
		}
		pID, err := uuid.Parse(fileIDStr)
		if err == nil {
			chunk.FileID = pID
		}
		chunks = append(chunks, chunk)
	}
	return chunks, rows.Err()
}

func (s *SQLStore) GrantFileAccessToIdentities(ctx context.Context, fileID uuid.UUID, ownerUserID uuid.UUID, identityIDs []uuid.UUID, expiresAt time.Time) error {
	if len(identityIDs) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var owner string
	if err := tx.QueryRowContext(ctx, `SELECT user_id FROM file_metadata WHERE file_id = ? LIMIT 1`, fileID).Scan(&owner); err != nil {
		return err
	}
	if owner != ownerUserID.String() {
		return sql.ErrNoRows
	}

	now := time.Now().UTC().Format(time.RFC3339)
	expiresAtValue := ""
	if !expiresAt.IsZero() {
		expiresAtValue = expiresAt.UTC().Format(time.RFC3339)
	}
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO file_access_grants (file_id, user_id, identity_id, granted_by, created_at, expires_at)
		SELECT ?, user_id, id, ?, ?, ?
		FROM identities
		WHERE id = ?
		ON CONFLICT(file_id, user_id, identity_id) DO UPDATE SET
			expires_at = CASE
				WHEN file_access_grants.expires_at = '' THEN ''
				ELSE excluded.expires_at
			END
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, identityID := range identityIDs {
		if identityID == uuid.Nil {
			continue
		}
		if _, err := stmt.ExecContext(ctx, fileID, ownerUserID, now, expiresAtValue, identityID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *SQLStore) MarkFilePublic(ctx context.Context, fileID uuid.UUID, ownerUserID uuid.UUID) error {
	result, err := s.execWithBusyRetry(
		ctx,
		`UPDATE file_metadata SET public_access = 1, updated_at = ? WHERE file_id = ? AND user_id = ?`,
		time.Now().UTC().Format(time.RFC3339),
		fileID,
		ownerUserID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) SumStoredFileBytesForUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	var total sql.NullInt64
	err := s.db.QueryRowContext(
		ctx,
		`SELECT COALESCE(SUM(file_size), 0)
		 FROM file_metadata
		 WHERE user_id = ?
		   AND status IN ('pending', 'complete', 'completed')`,
		userID,
	).Scan(&total)
	if err != nil {
		return 0, err
	}
	if !total.Valid {
		return 0, nil
	}
	return total.Int64, nil
}

func (s *SQLStore) DeleteExpiredFileAccessGrants(ctx context.Context, cutoffTime string) (int64, error) {
	result, err := s.execWithBusyRetry(
		ctx,
		`DELETE FROM file_access_grants WHERE expires_at != '' AND expires_at <= ?`,
		cutoffTime,
	)
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return affected, nil
}

func (s *SQLStore) FindExpiredFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT file_id, path FROM file_metadata WHERE created_at < ? AND status IN ('complete', 'completed')`,
		cutoffTime,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.FileMetadata
	for rows.Next() {
		var f models.FileMetadata
		var fileIDStr string
		if err := rows.Scan(&fileIDStr, &f.Path); err != nil {
			return nil, err
		}
		f.FileID, _ = uuid.Parse(fileIDStr)
		files = append(files, f)
	}
	return files, rows.Err()
}

func (s *SQLStore) FindStalePendingFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT file_id, path FROM file_metadata WHERE updated_at < ? AND status = 'pending'`,
		cutoffTime,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.FileMetadata
	for rows.Next() {
		var f models.FileMetadata
		var fileIDStr string
		if err := rows.Scan(&fileIDStr, &f.Path); err != nil {
			return nil, err
		}
		f.FileID, _ = uuid.Parse(fileIDStr)
		files = append(files, f)
	}
	return files, rows.Err()
}

func (s *SQLStore) DeleteFileMetadata(ctx context.Context, fileID uuid.UUID) error {
	_, err := s.execWithBusyRetry(ctx, `DELETE FROM file_metadata WHERE file_id = ?`, fileID)
	return err
}
