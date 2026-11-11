package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"gaiacom/backend/models"
)

// ErrAttestationDuplicate reports a violation of the partial unique index
// (one ACTIVE attestation per subject/type/issuer). Callers map it to HTTP 409.
var ErrAttestationDuplicate = errors.New("active attestation already exists for subject/type/issuer")

// Attestation queries are kept as complete SQL literals (no runtime query
// concatenation) so static analysis can verify that every value is bound and
// table/column identifiers are fixed.
const (
	queryAttestationByID = `SELECT id, subject_identity_id, subject_gaia_id, type, issuer_gaia_id,
		authority, evidence_ref, issued_at, expires_at, revoked_at, revoked_reason,
		canonical, signature_hex, signing_public_key_hex, algorithm, created_at
		FROM identity_attestations WHERE id = ? LIMIT 1`

	queryAttestationsBySubject = `SELECT id, subject_identity_id, subject_gaia_id, type, issuer_gaia_id,
		authority, evidence_ref, issued_at, expires_at, revoked_at, revoked_reason,
		canonical, signature_hex, signing_public_key_hex, algorithm, created_at
		FROM identity_attestations
		WHERE LOWER(subject_gaia_id) = LOWER(?)
		ORDER BY issued_at DESC, id DESC LIMIT ?`

	queryAttestationsForOperatorAll = `SELECT id, subject_identity_id, subject_gaia_id, type, issuer_gaia_id,
		authority, evidence_ref, issued_at, expires_at, revoked_at, revoked_reason,
		canonical, signature_hex, signing_public_key_hex, algorithm, created_at
		FROM identity_attestations
		ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?`

	queryAttestationsForOperatorActive = `SELECT id, subject_identity_id, subject_gaia_id, type, issuer_gaia_id,
		authority, evidence_ref, issued_at, expires_at, revoked_at, revoked_reason,
		canonical, signature_hex, signing_public_key_hex, algorithm, created_at
		FROM identity_attestations
		WHERE revoked_at = '' AND (expires_at = '' OR expires_at > ?)
		ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?`
)

func (s *SQLStore) CreateAttestation(ctx context.Context, attestation *models.IdentityAttestation) error {
	if attestation == nil || attestation.ID == "" || attestation.SubjectGaiaID == "" || attestation.IssuerGaiaID == "" {
		return fmt.Errorf("invalid attestation payload")
	}
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO identity_attestations (id, subject_identity_id, subject_gaia_id, type, issuer_gaia_id,
			authority, evidence_ref, issued_at, expires_at, revoked_at, revoked_reason,
			canonical, signature_hex, signing_public_key_hex, algorithm, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?)`,
		attestation.ID,
		attestation.SubjectIdentityID,
		attestation.SubjectGaiaID,
		attestation.Type,
		attestation.IssuerGaiaID,
		attestation.Authority,
		attestation.EvidenceRef,
		attestation.IssuedAt,
		attestation.ExpiresAt,
		attestation.Canonical,
		attestation.SignatureHex,
		attestation.SigningPublicKeyHex,
		attestation.Algorithm,
		attestation.CreatedAt,
	)
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "unique constraint failed") {
		return ErrAttestationDuplicate
	}
	return err
}

func scanAttestation(row interface{ Scan(...interface{}) error }) (*models.IdentityAttestation, error) {
	attestation := &models.IdentityAttestation{}
	err := row.Scan(
		&attestation.ID,
		&attestation.SubjectIdentityID,
		&attestation.SubjectGaiaID,
		&attestation.Type,
		&attestation.IssuerGaiaID,
		&attestation.Authority,
		&attestation.EvidenceRef,
		&attestation.IssuedAt,
		&attestation.ExpiresAt,
		&attestation.RevokedAt,
		&attestation.RevokedReason,
		&attestation.Canonical,
		&attestation.SignatureHex,
		&attestation.SigningPublicKeyHex,
		&attestation.Algorithm,
		&attestation.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return attestation, nil
}

func (s *SQLStore) GetAttestationByID(ctx context.Context, id string) (*models.IdentityAttestation, error) {
	row := s.db.QueryRowContext(ctx, queryAttestationByID, id)
	attestation, err := scanAttestation(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	return attestation, err
}

func (s *SQLStore) CountActiveAttestationKey(ctx context.Context, subjectGaiaID, attestationType, issuerGaiaID string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM identity_attestations
		 WHERE LOWER(subject_gaia_id) = LOWER(?) AND type = ? AND LOWER(issuer_gaia_id) = LOWER(?)
		   AND revoked_at = ''`,
		subjectGaiaID, attestationType, issuerGaiaID).Scan(&count)
	return count, err
}

func (s *SQLStore) RevokeAttestation(ctx context.Context, id, revokedAt, revokedReason string) (bool, error) {
	result, err := s.execWithBusyRetry(ctx,
		`UPDATE identity_attestations SET revoked_at = ?, revoked_reason = ? WHERE id = ? AND revoked_at = ''`,
		revokedAt, revokedReason, id)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

func (s *SQLStore) ListAttestationsBySubject(ctx context.Context, subjectGaiaID string, limit int) ([]models.IdentityAttestation, error) {
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx, queryAttestationsBySubject, subjectGaiaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.IdentityAttestation, 0)
	for rows.Next() {
		attestation, scanErr := scanAttestation(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, *attestation)
	}
	return result, rows.Err()
}

func (s *SQLStore) ListAttestationsForOperator(ctx context.Context, activeOnly bool, limit, offset int) ([]models.IdentityAttestation, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	var rows *sql.Rows
	var err error
	if activeOnly {
		rows, err = s.db.QueryContext(ctx, queryAttestationsForOperatorActive, formatTime(utcNow()), limit, offset)
	} else {
		rows, err = s.db.QueryContext(ctx, queryAttestationsForOperatorAll, limit, offset)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.IdentityAttestation, 0)
	for rows.Next() {
		attestation, scanErr := scanAttestation(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, *attestation)
	}
	return result, rows.Err()
}

func (s *SQLStore) CountActiveAttestations(ctx context.Context, now string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM identity_attestations
		 WHERE revoked_at = '' AND (expires_at = '' OR expires_at > ?)`, now).Scan(&count)
	return count, err
}

func (s *SQLStore) OperatorStats(ctx context.Context, now, since24h string) (*models.OperatorStats, error) {
	stats := &models.OperatorStats{}
	queries := []struct {
		target   *int64
		query    string
		useNow   bool
		useSince bool
	}{
		{&stats.Accounts, `SELECT COUNT(1) FROM users`, false, false},
		{&stats.Identities, `SELECT COUNT(1) FROM identities`, false, false},
		{&stats.Rooms, `SELECT COUNT(1) FROM rooms`, false, false},
		{&stats.Messages24h, `SELECT COUNT(1) FROM message_envelopes WHERE created_at >= ?`, false, true},
		{&stats.GaiaDrops24h, `SELECT COUNT(1) FROM gaia_drop_submissions WHERE created_at >= ?`, false, true},
		{&stats.OpenAbuseCases, `SELECT COUNT(1) FROM abuse_cases WHERE status != 'closed'`, false, false},
		{&stats.ActiveAttestations, `SELECT COUNT(1) FROM identity_attestations WHERE revoked_at = '' AND (expires_at = '' OR expires_at > ?)`, true, false},
		{&stats.DirectoryReads24h, `SELECT COUNT(1) FROM node_identity_access_log WHERE created_at >= ?`, false, true},
	}
	for _, query := range queries {
		var err error
		switch {
		case query.useNow:
			err = s.db.QueryRowContext(ctx, query.query, now).Scan(query.target)
		case query.useSince:
			err = s.db.QueryRowContext(ctx, query.query, since24h).Scan(query.target)
		default:
			err = s.db.QueryRowContext(ctx, query.query).Scan(query.target)
		}
		if err != nil {
			return nil, fmt.Errorf("operator stats query failed: %w", err)
		}
	}
	return stats, nil
}

func (s *SQLStore) ListOperatorDirectory(ctx context.Context, query string, limit, offset int) ([]models.OperatorDirectoryEntry, int64, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	pattern := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
	var total int64
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM identities
		 WHERE (? = '' OR LOWER(gaia_id) LIKE ? OR LOWER(display_name) LIKE ?)`,
		query, pattern, pattern).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT gaia_id, display_name, created_at, is_active FROM identities
		 WHERE (? = '' OR LOWER(gaia_id) LIKE ? OR LOWER(display_name) LIKE ?)
		 ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
		query, pattern, pattern, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	entries := make([]models.OperatorDirectoryEntry, 0)
	for rows.Next() {
		var entry models.OperatorDirectoryEntry
		var createdAt string
		var isActive int
		if err := rows.Scan(&entry.GaiaID, &entry.DisplayName, &createdAt, &isActive); err != nil {
			return nil, 0, err
		}
		entry.CreatedAt = createdAt
		if isActive == 1 {
			entry.Status = "active"
		} else {
			entry.Status = "inactive"
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return entries, total, nil
}

func (s *SQLStore) RecordIdentityDirectoryAccess(ctx context.Context, access *models.NodeIdentityAccessLog) error {
	if access == nil || access.ID == "" || access.OperatorGaiaID == "" || access.Reason == "" {
		return fmt.Errorf("invalid identity directory access payload")
	}
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO node_identity_access_log (id, operator_gaia_id, reason, result_count, created_at)
		 VALUES (?, ?, ?, ?, ?)`,
		access.ID, access.OperatorGaiaID, access.Reason, access.ResultCount, access.CreatedAt)
	return err
}

func (s *SQLStore) ListIdentityAccessLog(ctx context.Context, limit int) ([]models.NodeIdentityAccessLog, error) {
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, operator_gaia_id, reason, result_count, created_at
		 FROM node_identity_access_log ORDER BY created_at DESC, id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.NodeIdentityAccessLog, 0)
	for rows.Next() {
		var entry models.NodeIdentityAccessLog
		if err := rows.Scan(&entry.ID, &entry.OperatorGaiaID, &entry.Reason, &entry.ResultCount, &entry.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, entry)
	}
	return result, rows.Err()
}
