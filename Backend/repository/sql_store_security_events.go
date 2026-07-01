// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"time"
)

func (s *SQLStore) SaveSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateContext *models.SecurityEventPrivateContext, audit *models.SecurityAuditChain) (err error) {
	return withSQLiteBusyRetry(ctx, func() (err error) {
		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		defer rollbackUnlessCommitted(tx, &err)

		var ownerUser, ownerIdent interface{}
		if event.OwnerUserID != nil {
			ownerUser = event.OwnerUserID.String()
		}
		if event.OwnerIdentityID != nil {
			ownerIdent = event.OwnerIdentityID.String()
		}

		_, err = tx.ExecContext(ctx,
			`INSERT INTO security_events (event_id, owner_user_id, owner_identity_id, node_id, category, severity, source, summary, action, public_visible, user_visible, node_visible, created_at, acknowledged_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			event.EventID, ownerUser, ownerIdent, event.NodeID, event.Category, event.Severity, event.Source, event.Summary, event.Action,
			boolToInt(event.PublicVisible), boolToInt(event.UserVisible), boolToInt(event.NodeVisible), formatTime(event.CreatedAt), formatTimePtr(event.AcknowledgedAt),
		)
		if err != nil {
			return err
		}

		if privateContext != nil {
			_, err = tx.ExecContext(ctx,
				`INSERT INTO security_event_private_context (event_id, ip_hash, user_agent_hash, rule_id, request_id, internal_context_json, created_at, retention_until)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				privateContext.EventID, privateContext.IPHash, privateContext.UserAgentHash, privateContext.RuleID, privateContext.RequestID, privateContext.InternalContextJSON,
				formatTime(privateContext.CreatedAt), formatTime(privateContext.RetentionUntil),
			)
			if err != nil {
				return err
			}
		}

		if audit != nil {
			_, err = tx.ExecContext(ctx,
				`INSERT INTO security_audit_chain (event_id, previous_hash, event_hash, created_at, signature)
				 VALUES (?, ?, ?, ?, ?)`,
				audit.EventID, audit.PreviousHash, audit.EventHash, formatTime(audit.CreatedAt), audit.Signature,
			)
			if err != nil {
				return err
			}
		}

		return tx.Commit()
	})
}

func (s *SQLStore) GetLatestSecurityAuditChain(ctx context.Context) (*models.SecurityAuditChain, error) {
	row := s.db.QueryRowContext(ctx, `SELECT event_id, previous_hash, event_hash, created_at, signature FROM security_audit_chain ORDER BY created_at DESC LIMIT 1`)
	var audit models.SecurityAuditChain
	var ts string
	err := row.Scan(&audit.EventID, &audit.PreviousHash, &audit.EventHash, &ts, &audit.Signature)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	audit.CreatedAt = parseTime(ts)
	return &audit, nil
}

func (s *SQLStore) GetSecurityEventsForUser(ctx context.Context, userID uuid.UUID) ([]models.SecurityEvent, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, event_id, owner_user_id, owner_identity_id, node_id, category, severity, source, summary, action, public_visible, user_visible, node_visible, created_at, acknowledged_at FROM security_events WHERE owner_user_id = ? AND user_visible = 1 ORDER BY created_at DESC`, userID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.SecurityEvent
	for rows.Next() {
		var ev models.SecurityEvent
		var ou, oi sql.NullString
		var ts, ack sql.NullString
		var pub, usr, nd int
		err := rows.Scan(&ev.ID, &ev.EventID, &ou, &oi, &ev.NodeID, &ev.Category, &ev.Severity, &ev.Source, &ev.Summary, &ev.Action, &pub, &usr, &nd, &ts, &ack)
		if err != nil {
			return nil, err
		}
		if ou.Valid {
			uid, _ := uuid.Parse(ou.String)
			ev.OwnerUserID = &uid
		}
		if oi.Valid {
			iid, _ := uuid.Parse(oi.String)
			ev.OwnerIdentityID = &iid
		}
		ev.PublicVisible = pub != 0
		ev.UserVisible = usr != 0
		ev.NodeVisible = nd != 0
		if ts.Valid {
			ev.CreatedAt = parseTime(ts.String)
		}
		if ack.Valid && ack.String != "" {
			t := parseTime(ack.String)
			ev.AcknowledgedAt = &t
		}
		events = append(events, ev)
	}
	return events, nil
}

func (s *SQLStore) AcknowledgeSecurityEvent(ctx context.Context, userID uuid.UUID, eventID string) error {
	_, err := s.execWithBusyRetry(ctx, `UPDATE security_events SET acknowledged_at = ? WHERE event_id = ? AND owner_user_id = ?`, formatTime(utcNow()), eventID, userID.String())
	return err
}

func (s *SQLStore) GetNodeSecurityEvents(ctx context.Context) ([]models.SecurityEvent, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, event_id, owner_user_id, owner_identity_id, node_id, category, severity, source, summary, action, public_visible, user_visible, node_visible, created_at, acknowledged_at FROM security_events WHERE node_visible = 1 ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.SecurityEvent
	for rows.Next() {
		var ev models.SecurityEvent
		var ou, oi sql.NullString
		var ts, ack sql.NullString
		var pub, usr, nd int
		err := rows.Scan(&ev.ID, &ev.EventID, &ou, &oi, &ev.NodeID, &ev.Category, &ev.Severity, &ev.Source, &ev.Summary, &ev.Action, &pub, &usr, &nd, &ts, &ack)
		if err != nil {
			return nil, err
		}
		if ou.Valid {
			uid, _ := uuid.Parse(ou.String)
			ev.OwnerUserID = &uid
		}
		if oi.Valid {
			iid, _ := uuid.Parse(oi.String)
			ev.OwnerIdentityID = &iid
		}
		ev.PublicVisible = pub != 0
		ev.UserVisible = usr != 0
		ev.NodeVisible = nd != 0
		if ts.Valid {
			ev.CreatedAt = parseTime(ts.String)
		}
		if ack.Valid && ack.String != "" {
			t := parseTime(ack.String)
			ev.AcknowledgedAt = &t
		}
		events = append(events, ev)
	}
	return events, nil
}

func (s *SQLStore) GetNodeSecuritySummary(ctx context.Context) (*models.NodeSecuritySummary, error) {
	summary := &models.NodeSecuritySummary{
		TopEventCategories: make(map[string]int64),
	}

	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events`).Scan(&summary.TotalEvents)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events WHERE category = 'auth_attack' OR category = 'failed_login'`).Scan(&summary.AuthAttackCount)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events WHERE action = 'rate_limit'`).Scan(&summary.RateLimitedRequests)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events WHERE category LIKE 'smtp_%'`).Scan(&summary.SMTPShieldEvents)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events WHERE category LIKE 'federation_%'`).Scan(&summary.FederationEvents)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM security_events WHERE category LIKE 'governance_%'`).Scan(&summary.GovernanceEvents)

	rows, err := s.db.QueryContext(ctx, `SELECT category, COUNT(1) as cnt FROM security_events GROUP BY category ORDER BY cnt DESC LIMIT 10`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var cat string
			var cnt int64
			if err := rows.Scan(&cat, &cnt); err == nil {
				summary.TopEventCategories[cat] = cnt
			}
		}
	}

	summary.RuleHealth = "Optimal"
	return summary, nil
}

func formatTimePtr(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return formatTime(*t)
}

func (s *SQLStore) DeleteExpiredSecurityContexts(ctx context.Context, now string) error {
	_, err := s.execWithBusyRetry(ctx, `DELETE FROM security_event_private_context WHERE retention_until < ?`, now)
	return err
}
