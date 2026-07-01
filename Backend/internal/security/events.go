// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

func (s *SecuritySystem) RecordSecurityEvent(
	ctx context.Context,
	ownerUserID *uuid.UUID,
	ownerIdentityID *uuid.UUID,
	category string,
	severity string,
	source string,
	summary string,
	action string,
	r *http.Request,
) {
	now := time.Now().UTC()
	eventID := fmt.Sprintf("gs_evt_%s", uuid.New().String())

	// Resolve missing owner User ID from context if possible
	var resolvedUser *uuid.UUID = ownerUserID
	if resolvedUser == nil && r != nil {
		if uID, ok := httpx.UserIDFromContext(r.Context()); ok {
			resolvedUser = &uID
		}
	}

	// Resolve user ID from identity ID if still nil
	if resolvedUser == nil && ownerIdentityID != nil && *ownerIdentityID != uuid.Nil {
		if ident, err := s.Store.FindIdentityByID(*ownerIdentityID); err == nil && ident != nil {
			resolvedUser = &ident.UserID
		}
	}

	// 1. Build Security Event
	event := &models.SecurityEvent{
		EventID:         eventID,
		OwnerUserID:     resolvedUser,
		OwnerIdentityID: ownerIdentityID,
		NodeID:          s.NodeID,
		Category:        sanitizeSecurityText(category),
		Severity:        sanitizeSecurityText(severity),
		Source:          sanitizeSecurityText(source),
		Summary:         sanitizeSecurityText(summary),
		Action:          sanitizeSecurityText(action),
		PublicVisible:   category == "key_change_warning" || category == "policy_violation",
		UserVisible:     resolvedUser != nil,
		NodeVisible:     true,
		CreatedAt:       now,
	}

	// 2. Build Private Context if Request is provided
	var privateCtx *models.SecurityEventPrivateContext
	if r != nil {
		ip := clientIP(r)
		ua := r.UserAgent()

		internalCtx := map[string]interface{}{
			"path":            sanitizeSecurityText(r.URL.Path),
			"method":          sanitizeSecurityText(r.Method),
			"user_agent_hash": s.HashUserAgent(ua),
			"coarse_geo":      s.CoarseGeo(ip),
		}
		ctxBytes, _ := json.Marshal(internalCtx)

		privateCtx = &models.SecurityEventPrivateContext{
			EventID:             eventID,
			IPHash:              s.HashIP(ip),
			UserAgentHash:       s.HashUserAgent(ua),
			RuleID:              fmt.Sprintf("RULE_%s_%s", strings.ToUpper(source), strings.ToUpper(category)),
			RequestID:           fmt.Sprintf("req_%s", uuid.New().String()),
			InternalContextJSON: string(ctxBytes),
			CreatedAt:           now,
			RetentionUntil:      now.Add(30 * 24 * time.Hour), // 30 days retention policy
		}
	}

	// 3. Compute Audit Link Hash
	audit, err := s.CalculateAuditHash(ctx, event)
	if err == nil {
		// 4. Save to database store
		_ = s.Store.SaveSecurityEvent(ctx, event, privateCtx, audit)
	}
}
