// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"time"
)

func (s *SQLStore) GetLatestPolicy(ctx context.Context) (*models.GovernancePolicy, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, version, effective_from, categories, thresholds, signed_by, signature_bundle, created_at FROM governance_policies ORDER BY effective_from DESC LIMIT 1`)
	var p models.GovernancePolicy
	var idStr, effFrom, crAt string
	var cats, thrs, sBy, sBun []byte
	err := row.Scan(&idStr, &p.Version, &effFrom, &cats, &thrs, &sBy, &sBun, &crAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.ID, _ = uuid.Parse(idStr)
	p.EffectiveFrom = parseTime(effFrom)
	p.CreatedAt = parseTime(crAt)
	p.Categories = models.JSONB(cats)
	p.Thresholds = models.JSONB(thrs)
	p.SignedBy = models.JSONB(sBy)
	p.SignatureBundle = models.JSONB(sBun)
	return &p, nil
}

func (s *SQLStore) CreatePolicy(ctx context.Context, p *models.GovernancePolicy) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO governance_policies (id, version, effective_from, categories, thresholds, signed_by, signature_bundle, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID.String(), p.Version, formatTime(p.EffectiveFrom), string(p.Categories), string(p.Thresholds), string(p.SignedBy), string(p.SignatureBundle), formatTime(p.CreatedAt),
	)
	return err
}

func (s *SQLStore) GetPolicies(ctx context.Context) ([]models.GovernancePolicy, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, version, effective_from, categories, thresholds, signed_by, signature_bundle, created_at FROM governance_policies ORDER BY effective_from DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.GovernancePolicy
	for rows.Next() {
		var p models.GovernancePolicy
		var idStr, effFrom, crAt string
		var cats, thrs, sBy, sBun []byte
		if err := rows.Scan(&idStr, &p.Version, &effFrom, &cats, &thrs, &sBy, &sBun, &crAt); err != nil {
			return nil, err
		}
		p.ID, _ = uuid.Parse(idStr)
		p.EffectiveFrom = parseTime(effFrom)
		p.CreatedAt = parseTime(crAt)
		p.Categories = models.JSONB(cats)
		p.Thresholds = models.JSONB(thrs)
		p.SignedBy = models.JSONB(sBy)
		p.SignatureBundle = models.JSONB(sBun)
		list = append(list, p)
	}
	return list, nil
}

func (s *SQLStore) GetRoleCredential(ctx context.Context, id string) (*models.RoleCredential, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, role, subject_identity, subject_public_key, scope, valid_from, valid_until, permissions, cannot, issuer, policy_hash, signature, created_at FROM role_credentials WHERE id = ?`, id)
	var c models.RoleCredential
	var vFrom, vUnt, crAt string
	var perms, cannot []byte
	err := row.Scan(&c.ID, &c.Role, &c.SubjectIdentity, &c.SubjectPublicKey, &c.Scope, &vFrom, &vUnt, &perms, &cannot, &c.Issuer, &c.PolicyHash, &c.Signature, &crAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	c.ValidFrom = parseTime(vFrom)
	c.ValidUntil = parseTime(vUnt)
	c.CreatedAt = parseTime(crAt)
	c.Permissions = models.JSONB(perms)
	c.Cannot = models.JSONB(cannot)
	return &c, nil
}

func (s *SQLStore) GetCredentialsBySubject(ctx context.Context, subjectIdentity string) ([]models.RoleCredential, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, role, subject_identity, subject_public_key, scope, valid_from, valid_until, permissions, cannot, issuer, policy_hash, signature, created_at FROM role_credentials WHERE LOWER(subject_identity) = LOWER(?)`, subjectIdentity)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.RoleCredential
	for rows.Next() {
		var c models.RoleCredential
		var vFrom, vUnt, crAt string
		var perms, cannot []byte
		if err := rows.Scan(&c.ID, &c.Role, &c.SubjectIdentity, &c.SubjectPublicKey, &c.Scope, &vFrom, &vUnt, &perms, &cannot, &c.Issuer, &c.PolicyHash, &c.Signature, &crAt); err != nil {
			return nil, err
		}
		c.ValidFrom = parseTime(vFrom)
		c.ValidUntil = parseTime(vUnt)
		c.CreatedAt = parseTime(crAt)
		c.Permissions = models.JSONB(perms)
		c.Cannot = models.JSONB(cannot)
		list = append(list, c)
	}
	return list, nil
}

func (s *SQLStore) CreateRoleCredential(ctx context.Context, c *models.RoleCredential) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO role_credentials (id, role, subject_identity, subject_public_key, scope, valid_from, valid_until, permissions, cannot, issuer, policy_hash, signature, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.Role, c.SubjectIdentity, c.SubjectPublicKey, c.Scope, formatTime(c.ValidFrom), formatTime(c.ValidUntil), string(c.Permissions), string(c.Cannot), c.Issuer, c.PolicyHash, c.Signature, formatTime(c.CreatedAt),
	)
	return err
}

func (s *SQLStore) GetCredentials(ctx context.Context) ([]models.RoleCredential, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, role, subject_identity, subject_public_key, scope, valid_from, valid_until, permissions, cannot, issuer, policy_hash, signature, created_at FROM role_credentials ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.RoleCredential
	for rows.Next() {
		var c models.RoleCredential
		var vFrom, vUnt, crAt string
		var perms, cannot []byte
		if err := rows.Scan(&c.ID, &c.Role, &c.SubjectIdentity, &c.SubjectPublicKey, &c.Scope, &vFrom, &vUnt, &perms, &cannot, &c.Issuer, &c.PolicyHash, &c.Signature, &crAt); err != nil {
			return nil, err
		}
		c.ValidFrom = parseTime(vFrom)
		c.ValidUntil = parseTime(vUnt)
		c.CreatedAt = parseTime(crAt)
		c.Permissions = models.JSONB(perms)
		c.Cannot = models.JSONB(cannot)
		list = append(list, c)
	}
	return list, nil
}

func (s *SQLStore) GetCredentialRevocation(ctx context.Context, credID string) (*models.RoleCredentialRevocation, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, credential_id, revoked_at, reason_code, policy_hash, signed_by, signature_bundle FROM role_credential_revocations WHERE credential_id = ?`, credID)
	var r models.RoleCredentialRevocation
	var revAt string
	var sBy, sBun []byte
	err := row.Scan(&r.ID, &r.CredentialID, &revAt, &r.ReasonCode, &r.PolicyHash, &sBy, &sBun)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	r.RevokedAt = parseTime(revAt)
	r.SignedBy = models.JSONB(sBy)
	r.SignatureBundle = models.JSONB(sBun)
	return &r, nil
}

func (s *SQLStore) CreateCredentialRevocation(ctx context.Context, r *models.RoleCredentialRevocation) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO role_credential_revocations (id, credential_id, revoked_at, reason_code, policy_hash, signed_by, signature_bundle)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		r.ID, r.CredentialID, formatTime(r.RevokedAt), r.ReasonCode, r.PolicyHash, string(r.SignedBy), string(r.SignatureBundle),
	)
	return err
}

func (s *SQLStore) GetRevocations(ctx context.Context) ([]models.RoleCredentialRevocation, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, credential_id, revoked_at, reason_code, policy_hash, signed_by, signature_bundle FROM role_credential_revocations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.RoleCredentialRevocation
	for rows.Next() {
		var r models.RoleCredentialRevocation
		var revAt string
		var sBy, sBun []byte
		if err := rows.Scan(&r.ID, &r.CredentialID, &revAt, &r.ReasonCode, &r.PolicyHash, &sBy, &sBun); err != nil {
			return nil, err
		}
		r.RevokedAt = parseTime(revAt)
		r.SignedBy = models.JSONB(sBy)
		r.SignatureBundle = models.JSONB(sBun)
		list = append(list, r)
	}
	return list, nil
}

func (s *SQLStore) GetAbuseCase(ctx context.Context, id string) (*models.AbuseCase, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, case_type, category, severity, reporter_identity_hash, reported_identity_hash, reported_node, message_id, message_hash, gaia_proof, disclosure, status, decision, created_at FROM abuse_cases WHERE id = ?`, id)
	var c models.AbuseCase
	var msgID, dec, crAt sql.NullString
	var proof, discl []byte
	err := row.Scan(&c.ID, &c.CaseType, &c.Category, &c.Severity, &c.ReporterIdentityHash, &c.ReportedIdentityHash, &c.ReportedNode, &msgID, &c.MessageHash, &proof, &discl, &c.Status, &dec, &crAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if msgID.Valid {
		c.MessageID = &msgID.String
	}
	if dec.Valid {
		c.Decision = &dec.String
	}
	c.CreatedAt = parseTime(crAt.String)
	c.GaiaProof = models.JSONB(proof)
	c.Disclosure = models.JSONB(discl)
	return &c, nil
}

func (s *SQLStore) GetAbuseCaseByReporter(ctx context.Context, reporterIdentityHash string) ([]models.AbuseCase, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, case_type, category, severity, reporter_identity_hash, reported_identity_hash, reported_node, message_id, message_hash, gaia_proof, disclosure, status, decision, created_at FROM abuse_cases WHERE reporter_identity_hash = ? ORDER BY created_at DESC`, reporterIdentityHash)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.AbuseCase
	for rows.Next() {
		var c models.AbuseCase
		var msgID, dec, crAt sql.NullString
		var proof, discl []byte
		if err := rows.Scan(&c.ID, &c.CaseType, &c.Category, &c.Severity, &c.ReporterIdentityHash, &c.ReportedIdentityHash, &c.ReportedNode, &msgID, &c.MessageHash, &proof, &discl, &c.Status, &dec, &crAt); err != nil {
			return nil, err
		}
		if msgID.Valid {
			c.MessageID = &msgID.String
		}
		if dec.Valid {
			c.Decision = &dec.String
		}
		c.CreatedAt = parseTime(crAt.String)
		c.GaiaProof = models.JSONB(proof)
		c.Disclosure = models.JSONB(discl)
		list = append(list, c)
	}
	return list, nil
}

func (s *SQLStore) GetAbuseCases(ctx context.Context) ([]models.AbuseCase, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, case_type, category, severity, reporter_identity_hash, reported_identity_hash, reported_node, message_id, message_hash, gaia_proof, disclosure, status, decision, created_at FROM abuse_cases ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.AbuseCase
	for rows.Next() {
		var c models.AbuseCase
		var msgID, dec, crAt sql.NullString
		var proof, discl []byte
		if err := rows.Scan(&c.ID, &c.CaseType, &c.Category, &c.Severity, &c.ReporterIdentityHash, &c.ReportedIdentityHash, &c.ReportedNode, &msgID, &c.MessageHash, &proof, &discl, &c.Status, &dec, &crAt); err != nil {
			return nil, err
		}
		if msgID.Valid {
			c.MessageID = &msgID.String
		}
		if dec.Valid {
			c.Decision = &dec.String
		}
		c.CreatedAt = parseTime(crAt.String)
		c.GaiaProof = models.JSONB(proof)
		c.Disclosure = models.JSONB(discl)
		list = append(list, c)
	}
	return list, nil
}

func (s *SQLStore) CreateAbuseCase(ctx context.Context, c *models.AbuseCase) error {
	var msgID, dec interface{}
	if c.MessageID != nil {
		msgID = *c.MessageID
	}
	if c.Decision != nil {
		dec = *c.Decision
	}
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO abuse_cases (id, case_type, category, severity, reporter_identity_hash, reported_identity_hash, reported_node, message_id, message_hash, gaia_proof, disclosure, status, decision, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.CaseType, c.Category, c.Severity, c.ReporterIdentityHash, c.ReportedIdentityHash, c.ReportedNode, msgID, c.MessageHash, string(c.GaiaProof), string(c.Disclosure), c.Status, dec, formatTime(c.CreatedAt),
	)
	return err
}

func (s *SQLStore) UpdateAbuseCaseStatus(ctx context.Context, id string, status string, decision *string) error {
	var dec interface{}
	if decision != nil {
		dec = *decision
	}
	_, err := s.execWithBusyRetry(ctx, `UPDATE abuse_cases SET status = ?, decision = ? WHERE id = ?`, status, dec, id)
	return err
}

func (s *SQLStore) GetAbuseCasesCountForChannel(ctx context.Context, channelID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM abuse_cases WHERE reported_identity_hash = ? AND status != 'rejected'`, channelID).Scan(&count)
	return count, err
}

func (s *SQLStore) GetAbuseCaseEvents(ctx context.Context, caseID string) ([]models.AbuseCaseEvent, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, case_id, event_type, actor_identity, details, timestamp FROM abuse_case_events WHERE case_id = ? ORDER BY timestamp ASC`, caseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.AbuseCaseEvent
	for rows.Next() {
		var e models.AbuseCaseEvent
		var ts string
		if err := rows.Scan(&e.ID, &e.CaseID, &e.EventType, &e.ActorIdentity, &e.Details, &ts); err != nil {
			return nil, err
		}
		e.Timestamp = parseTime(ts)
		list = append(list, e)
	}
	return list, nil
}

func (s *SQLStore) CreateAbuseCaseEvent(ctx context.Context, e *models.AbuseCaseEvent) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO abuse_case_events (case_id, event_type, actor_identity, details, timestamp)
		 VALUES (?, ?, ?, ?, ?)`,
		e.CaseID, e.EventType, e.ActorIdentity, e.Details, formatTime(e.Timestamp),
	)
	return err
}

func (s *SQLStore) GetAbuseReviews(ctx context.Context, caseID string) ([]models.AbuseReview, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, case_id, reviewer_identity, credential_id, reviewed_at, category_vote, severity_vote, recommendation, reason_code, visible_reason, private_note_hash, signature FROM abuse_reviews WHERE case_id = ?`, caseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.AbuseReview
	for rows.Next() {
		var r models.AbuseReview
		var revAt string
		if err := rows.Scan(&r.ID, &r.CaseID, &r.ReviewerIdentity, &r.CredentialID, &revAt, &r.CategoryVote, &r.SeverityVote, &r.Recommendation, &r.ReasonCode, &r.VisibleReason, &r.PrivateNoteHash, &r.Signature); err != nil {
			return nil, err
		}
		r.ReviewedAt = parseTime(revAt)
		list = append(list, r)
	}
	return list, nil
}

func (s *SQLStore) CreateAbuseReview(ctx context.Context, r *models.AbuseReview) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO abuse_reviews (id, case_id, reviewer_identity, credential_id, reviewed_at, category_vote, severity_vote, recommendation, reason_code, visible_reason, private_note_hash, signature)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		r.ID, r.CaseID, r.ReviewerIdentity, r.CredentialID, formatTime(r.ReviewedAt), r.CategoryVote, r.SeverityVote, r.Recommendation, r.ReasonCode, r.VisibleReason, r.PrivateNoteHash, r.Signature,
	)
	return err
}

func (s *SQLStore) GetAbuseActions(ctx context.Context, targetType string, targetID string) ([]models.AbuseAction, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, case_id, target_type, target_id, action_type, severity, applied_at, expires_at, reason, signature FROM abuse_actions WHERE target_type = ? AND target_id = ?`, targetType, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.AbuseAction
	for rows.Next() {
		var a models.AbuseAction
		var appAt, expAt string
		if err := rows.Scan(&a.ID, &a.CaseID, &a.TargetType, &a.TargetID, &a.ActionType, &a.Severity, &appAt, &expAt, &a.Reason, &a.Signature); err != nil {
			return nil, err
		}
		a.AppliedAt = parseTime(appAt)
		a.ExpiresAt = parseTime(expAt)
		list = append(list, a)
	}
	return list, nil
}

func (s *SQLStore) CreateAbuseAction(ctx context.Context, a *models.AbuseAction) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO abuse_actions (id, case_id, target_type, target_id, action_type, severity, applied_at, expires_at, reason, signature)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.CaseID, a.TargetType, a.TargetID, a.ActionType, a.Severity, formatTime(a.AppliedAt), formatTime(a.ExpiresAt), a.Reason, a.Signature,
	)
	return err
}

func (s *SQLStore) DeleteAbuseAction(ctx context.Context, id string) error {
	_, err := s.execWithBusyRetry(ctx, `DELETE FROM abuse_actions WHERE id = ?`, id)
	return err
}

func (s *SQLStore) GetAbuseAppeal(ctx context.Context, caseID string) (*models.AbuseAppeal, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, case_id, submitted_by, submitted_at, reason, statement, status, decision_reason, decided_at, decided_by, signature FROM abuse_appeals WHERE case_id = ?`, caseID)
	var a models.AbuseAppeal
	var subAt string
	err := row.Scan(&a.ID, &a.CaseID, &a.SubmittedBy, &subAt, &a.Reason, &a.Statement, &a.Status, &a.DecisionReason, &a.DecidedAt, &a.DecidedBy, &a.Signature)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	a.SubmittedAt = parseTime(subAt)
	return &a, nil
}

func (s *SQLStore) CreateAbuseAppeal(ctx context.Context, a *models.AbuseAppeal) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO abuse_appeals (id, case_id, submitted_by, submitted_at, reason, statement, status, decision_reason, decided_at, decided_by, signature)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.CaseID, a.SubmittedBy, formatTime(a.SubmittedAt), a.Reason, a.Statement, a.Status, a.DecisionReason, a.DecidedAt, a.DecidedBy, a.Signature,
	)
	return err
}

func (s *SQLStore) UpdateAbuseAppealStatus(ctx context.Context, caseID string, status string, decisionReason string, decidedBy string) error {
	_, err := s.execWithBusyRetry(ctx, `UPDATE abuse_appeals SET status = ?, decision_reason = ?, decided_by = ?, decided_at = ? WHERE case_id = ?`, status, decisionReason, decidedBy, formatTime(utcNow()), caseID)
	return err
}

func (s *SQLStore) GetFederationAbuseSignals(ctx context.Context) ([]models.FederationAbuseSignal, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, reported_identity_hash, source_node, case_hash, category, severity, action_taken, timestamp, signature FROM federation_abuse_signals ORDER BY timestamp DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.FederationAbuseSignal
	for rows.Next() {
		var sig models.FederationAbuseSignal
		var ts string
		if err := rows.Scan(&sig.ID, &sig.ReportedIdentityHash, &sig.SourceNode, &sig.CaseHash, &sig.Category, &sig.Severity, &sig.ActionTaken, &ts, &sig.Signature); err != nil {
			return nil, err
		}
		sig.Timestamp = parseTime(ts)
		list = append(list, sig)
	}
	return list, nil
}

func (s *SQLStore) CreateFederationAbuseSignal(ctx context.Context, sig *models.FederationAbuseSignal) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO federation_abuse_signals (reported_identity_hash, source_node, case_hash, category, severity, action_taken, timestamp, signature)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sig.ReportedIdentityHash, sig.SourceNode, sig.CaseHash, sig.Category, sig.Severity, sig.ActionTaken, formatTime(sig.Timestamp), sig.Signature,
	)
	return err
}

func (s *SQLStore) GetTransparencySnapshots(ctx context.Context) ([]models.TransparencySnapshot, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, node, period, snapshot_data, timestamp, signature FROM transparency_snapshots ORDER BY timestamp DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.TransparencySnapshot
	for rows.Next() {
		var sn models.TransparencySnapshot
		var sd []byte
		var ts string
		if err := rows.Scan(&sn.ID, &sn.Node, &sn.Period, &sd, &ts, &sn.Signature); err != nil {
			return nil, err
		}
		sn.SnapshotData = models.JSONB(sd)
		sn.Timestamp = parseTime(ts)
		list = append(list, sn)
	}
	return list, nil
}

func (s *SQLStore) CreateTransparencySnapshot(ctx context.Context, sn *models.TransparencySnapshot) error {
	_, err := s.execWithBusyRetry(ctx,
		`INSERT INTO transparency_snapshots (node, period, snapshot_data, timestamp, signature)
		 VALUES (?, ?, ?, ?, ?)`,
		sn.Node, sn.Period, string(sn.SnapshotData), formatTime(sn.Timestamp), sn.Signature,
	)
	return err
}

func (s *SQLStore) SuspendPublicChannel(ctx context.Context, channelID uuid.UUID, suspended bool, reason string) error {
	isSusp := 0
	if suspended {
		isSusp = 1
	}
	_, err := s.execWithBusyRetry(ctx, `UPDATE public_channels SET is_suspended = ?, suspension_reason = ? WHERE id = ?`, isSusp, reason, channelID)
	return err
}

func (s *SQLStore) VerifyPublicChannel(ctx context.Context, channelID uuid.UUID, verified bool) error {
	isVerified := 0
	if verified {
		isVerified = 1
	}
	_, err := s.execWithBusyRetry(ctx, `UPDATE public_channels SET is_verified = ? WHERE id = ?`, isVerified, channelID)
	return err
}

func (s *SQLStore) GetMessageCountSince(ctx context.Context, senderGaiaID string, since time.Time) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM message_envelopes WHERE LOWER(sender) = LOWER(?) AND created_at >= ?`, senderGaiaID, formatTime(since)).Scan(&count)
	return count, err
}

func (s *SQLStore) GetOpenAbuseCasesCount(ctx context.Context, gaiaID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM abuse_cases WHERE LOWER(reported_identity_hash) = LOWER(?) AND status != 'closed'`, gaiaID).Scan(&count)
	return count, err
}
