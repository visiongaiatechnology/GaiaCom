// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"gaiacom/backend/models"
)

func (s *SQLStore) CreateReport(report *models.Report) error {
	report.CreatedAt = utcNow()
	_, err := s.execWithBusyRetry(
		context.Background(),
		`INSERT INTO reports (message_id, sender_public_key, recipient_public_key, ciphertext_hash, report_proof, epoch_hash, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		report.MessageID,
		report.SenderPublicKey,
		report.RecipientPublicKey,
		report.CiphertextHash,
		report.ReportProof,
		report.EpochHash,
		formatTime(report.CreatedAt),
	)
	return err
}

func (s *SQLStore) GetReportByProof(proof string) (*models.Report, error) {
	var report models.Report
	var createdAt string
	err := s.db.QueryRow(
		`SELECT id, message_id, sender_public_key, recipient_public_key, ciphertext_hash, report_proof, epoch_hash, created_at
		 FROM reports WHERE report_proof = ? LIMIT 1`,
		proof,
	).Scan(
		&report.ID,
		&report.MessageID,
		&report.SenderPublicKey,
		&report.RecipientPublicKey,
		&report.CiphertextHash,
		&report.ReportProof,
		&report.EpochHash,
		&createdAt,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("report not found")
	}
	if err != nil {
		return nil, err
	}
	report.CreatedAt = parseTime(createdAt)
	return &report, nil
}

func (s *SQLStore) GetReportsCountForEpochHash(epochHash string) (int, error) {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM reports WHERE epoch_hash = ?`, epochHash).Scan(&count)
	return count, err
}

func (s *SQLStore) GetAbuseScore(senderPubKey string) (*models.AbuseScore, error) {
	var score models.AbuseScore
	var quarantinedUntil string
	var timeoutUntil string
	var updatedAt string
	err := s.db.QueryRow(
		`SELECT sender_public_key, score, escalation_level, friction_limit, quarantined_until, timeout_until, updated_at
		 FROM abuse_scores WHERE sender_public_key = ? LIMIT 1`,
		senderPubKey,
	).Scan(
		&score.SenderPublicKey,
		&score.Score,
		&score.EscalationLevel,
		&score.FrictionLimit,
		&quarantinedUntil,
		&timeoutUntil,
		&updatedAt,
	)
	if err == sql.ErrNoRows {
		return &models.AbuseScore{
			SenderPublicKey: senderPubKey,
			Score:           0,
			EscalationLevel: 0,
			FrictionLimit:   1.0,
			UpdatedAt:       utcNow(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	score.QuarantinedUntil = parseTime(quarantinedUntil)
	score.TimeoutUntil = parseTime(timeoutUntil)
	score.UpdatedAt = parseTime(updatedAt)
	return &score, nil
}

func (s *SQLStore) SaveAbuseScore(score *models.AbuseScore) error {
	score.UpdatedAt = utcNow()
	_, err := s.execWithBusyRetry(
		context.Background(),
		`INSERT INTO abuse_scores (sender_public_key, score, escalation_level, friction_limit, quarantined_until, timeout_until, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(sender_public_key) DO UPDATE SET
		 score = excluded.score,
		 escalation_level = excluded.escalation_level,
		 friction_limit = excluded.friction_limit,
		 quarantined_until = excluded.quarantined_until,
		 timeout_until = excluded.timeout_until,
		 updated_at = excluded.updated_at`,
		score.SenderPublicKey,
		score.Score,
		score.EscalationLevel,
		score.FrictionLimit,
		formatTime(score.QuarantinedUntil),
		formatTime(score.TimeoutUntil),
		formatTime(score.UpdatedAt),
	)
	return err
}

func (s *SQLStore) HasReportedInEpoch(senderPubKey, recipientPubKey, epochHash string) (bool, error) {
	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM reports
		 WHERE sender_public_key = ? AND recipient_public_key = ? AND epoch_hash = ?`,
		senderPubKey,
		recipientPubKey,
		epochHash,
	).Scan(&count)
	return count > 0, err
}
