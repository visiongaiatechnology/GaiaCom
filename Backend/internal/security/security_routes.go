// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

var BootstrapGaiaID string
var BootstrapGaiaIDs []string

type SecurityHandler struct {
	System *SecuritySystem
}

func NewSecurityHandler(sys *SecuritySystem) *SecurityHandler {
	return &SecurityHandler{System: sys}
}

func (h *SecurityHandler) GetMySummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	events, err := h.System.Store.GetSecurityEventsForUser(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load security summary")
		return
	}

	activeWarnings := 0
	for _, ev := range events {
		if ev.AcknowledgedAt == nil && ev.Severity != "info" && ev.Severity != "low" {
			activeWarnings++
		}
	}

	status := "secured"
	if activeWarnings > 0 {
		status = "warnings_active"
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":          status,
		"activeWarnings":  activeWarnings,
		"gaiaShieldState": "active",
		"lastChecked":     timeToEpoch(timeNowUTC()),
	})
}

func (h *SecurityHandler) GetMyEvents(w http.ResponseWriter, r *http.Request) {
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	events, err := h.System.Store.GetSecurityEventsForUser(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load security events")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
	})
}

func (h *SecurityHandler) AcknowledgeEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	eventID := httpx.Param(r, "event_id")
	if eventID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Missing event ID")
		return
	}

	err := h.System.Store.AcknowledgeSecurityEvent(r.Context(), userID, eventID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to acknowledge event")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "acknowledged"})
}

func (h *SecurityHandler) ExportReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	events, err := h.System.Store.GetSecurityEventsForUser(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load report data")
		return
	}

	format := strings.ToLower(r.URL.Query().Get("format"))
	if format == "csv" {
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", "attachment; filename=gaiashield_report.csv")

		writer := csv.NewWriter(w)
		_ = writer.Write([]string{"Event ID", "Category", "Severity", "Source", "Summary", "Action", "Created At"})
		for _, ev := range events {
			_ = writer.Write([]string{
				ev.EventID,
				ev.Category,
				ev.Severity,
				ev.Source,
				ev.Summary,
				ev.Action,
				ev.CreatedAt.Format(http.TimeFormat),
			})
		}
		writer.Flush()
		return
	}

	// Default to JSON
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=gaiashield_report.json")
	_ = json.NewEncoder(w).Encode(events)
}

func (h *SecurityHandler) GetNodeSummary(w http.ResponseWriter, r *http.Request) {
	// Verify user is Node Operator
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check node operator role
	if !h.hasRole(r.Context(), userID, "node_operator") {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: node operator access only")
		return
	}

	summary, err := h.System.Store.GetNodeSecuritySummary(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load node security summary")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, summary)
}

func (h *SecurityHandler) GetNodeEvents(w http.ResponseWriter, r *http.Request) {
	// Verify user is Node Operator
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if !h.hasRole(r.Context(), userID, "node_operator") {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: node operator access only")
		return
	}

	events, err := h.System.Store.GetNodeSecurityEvents(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load node security events")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
	})
}

func (h *SecurityHandler) GetPublicHealth(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.System.Store.ReadNetworkHealthMetrics(r.Context(), timeNowUTC().Add(-24*time.Hour))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load health metrics")
		return
	}

	summary := &models.PublicSecuritySummary{
		GaiaShieldActive:      true,
		SecurityEvents24h:     metrics.SecurityEvents24h,
		BlockedRequests24h:    metrics.BlockedRequests24h,
		SMTPShieldEvents24h:   metrics.SMTPShieldEvents24h,
		FederationRejects24h:  metrics.FederationRejects24h,
		PolicyVersion:         "GaiaShield-v1.0",
		NodeGovernanceVersion: "GaiaGov-v1.2",
	}

	httpx.WriteJSON(w, http.StatusOK, summary)
}

// Helpers
func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

func timeToEpoch(t interface{}) int64 {
	switch v := t.(type) {
	case time.Time:
		return v.Unix()
	case *time.Time:
		if v == nil {
			return 0
		}
		return v.Unix()
	}
	return 0
}

func timeNowUTC() time.Time {
	return time.Now().UTC()
}

func (h *SecurityHandler) hasRole(ctx context.Context, userID uuid.UUID, role string) bool {
	identities, err := h.System.Store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		return false
	}

	for _, ident := range identities {
		// 1. Check bootstrap config
		for _, bootstrapID := range append([]string{BootstrapGaiaID}, BootstrapGaiaIDs...) {
			if bootstrapID != "" && bootstrapIdentityMatches(ident.GaiaID, bootstrapID) {
				if role == "node_operator" || role == "senior_reviewer" || role == "trusted_reviewer" {
					return true
				}
			}
		}

		// 2. Check DB credentials
		creds, err := h.System.Store.GetCredentialsBySubject(ctx, ident.GaiaID)
		if err == nil {
			now := time.Now()
			for _, cred := range creds {
				if cred.Role == role || (role == "trusted_reviewer" && cred.Role == "senior_reviewer") {
					// Check expiration
					if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
						continue
					}
					// Check revocation
					rev, err := h.System.Store.GetCredentialRevocation(ctx, cred.ID)
					if err != nil || rev != nil {
						continue
					}
					return true
				}
			}
		}
	}
	return false
}

func normalizeGaiaID(g string) string {
	return strings.ToLower(strings.TrimSpace(g))
}

func normalizeAndStripDomain(id string) string {
	id = strings.ToLower(strings.TrimSpace(id))
	id = strings.TrimPrefix(id, "@")
	if idx := strings.Index(id, ":"); idx != -1 {
		id = id[:idx]
	}
	if idx := strings.Index(id, "@"); idx != -1 {
		id = id[:idx]
	}
	return id
}

func bootstrapIdentityMatches(identityGaiaID string, bootstrapGaiaID string) bool {
	identity := normalizeGaiaID(identityGaiaID)
	bootstrap := normalizeGaiaID(bootstrapGaiaID)
	if identity == bootstrap {
		return true
	}
	return normalizeAndStripDomain(identity) == normalizeAndStripDomain(bootstrap)
}
