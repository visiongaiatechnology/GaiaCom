// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package governance

import (
	"crypto/ed25519"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

type Handler struct {
	Service *Service
}

func writeGovernanceRejection(w http.ResponseWriter, operation string, err error) {
	log.Printf("governance %s rejected: %v", operation, err)
	httpx.WriteError(w, http.StatusBadRequest, "Governance request rejected")
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

// User role check endpoint
func (h *Handler) CheckRoles(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Fetch user's identities to determine role credentials
	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"roles": []string{}})
		return
	}

	// Gather roles across all user identities
	rolesMap := make(map[string]bool)
	for _, id := range identities {
		roles, err := h.Service.GetActiveRoles(r.Context(), id.GaiaID)
		if err == nil {
			for _, r := range roles {
				rolesMap[r] = true
			}
		}
	}

	rolesList := []string{}
	for r := range rolesMap {
		rolesList = append(rolesList, r)
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"roles": rolesList})
}

// Submit a new abuse report
func (h *Handler) CreateReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	type reportInput struct {
		IdentityID string  `json:"identityId"` // Reporter acting identity
		TargetType string  `json:"targetType"` // "channel", "room", "user"
		TargetID   string  `json:"targetId"`   // Target UUID or Gaia ID
		Category   string  `json:"category"`   // spam, phishing, malware, harassment, illegal_content, threat, other
		Severity   string  `json:"severity"`   // low, medium, high, critical
		MessageID  *string `json:"messageId"`  // Optional specific message
		Comment    string  `json:"comment"`
	}

	var input reportInput
	r.Body = http.MaxBytesReader(w, r.Body, 128*1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid report payload")
		return
	}

	identityUUID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	// Verify identity belongs to user
	belongs, err := h.Service.store.IdentityBelongsToUser(identityUUID, userID)
	if err != nil || !belongs {
		httpx.WriteError(w, http.StatusForbidden, "Unauthorized identity")
		return
	}

	identity, err := h.Service.store.FindIdentityByID(identityUUID)
	if err != nil || identity == nil {
		httpx.WriteError(w, http.StatusBadRequest, "Identity not found")
		return
	}

	caseObj, err := h.Service.SubmitReport(r.Context(), identity.GaiaID, input.TargetType, input.TargetID, input.Category, input.Severity, input.MessageID, input.Comment)
	if err != nil {
		writeGovernanceRejection(w, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, caseObj)
}

// Get user's own reports
func (h *Handler) GetMyReports(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Error retrieving identities")
		return
	}

	allCases := []models.AbuseCase{}
	for _, id := range identities {
		reporterHash := reporterIdentityHash(id.GaiaID)
		cases, err := h.Service.store.GetAbuseCaseByReporter(r.Context(), reporterHash)
		if err == nil {
			allCases = append(allCases, cases...)
		}
		legacyHash := legacyReporterIdentityHash(id.GaiaID)
		if legacyHash != reporterHash {
			legacyCases, err := h.Service.store.GetAbuseCaseByReporter(r.Context(), legacyHash)
			if err == nil {
				allCases = append(allCases, legacyCases...)
			}
		}
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"cases": allCases})
}

// Fetch case details (restricted access)
func (h *Handler) GetReportDetail(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	caseID := httpx.Param(r, "caseID")
	if caseID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "caseID parameter is required")
		return
	}

	caseObj, err := h.Service.store.GetAbuseCase(r.Context(), caseID)
	if err != nil || caseObj == nil {
		httpx.WriteError(w, http.StatusNotFound, "Case not found")
		return
	}

	// Authorization Check:
	// 1. Check if user is the reporter
	isReporter := false
	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err == nil {
		for _, id := range identities {
			if caseObj.ReporterIdentityHash == reporterIdentityHash(id.GaiaID) || caseObj.ReporterIdentityHash == legacyReporterIdentityHash(id.GaiaID) {
				isReporter = true
				break
			}
		}
	}

	// 2. Check if user is reviewer or operator
	isStaff := false
	if err == nil {
		for _, id := range identities {
			roles, _ := h.Service.GetActiveRoles(r.Context(), id.GaiaID)
			if len(roles) > 0 {
				isStaff = true
				break
			}
		}
	}

	if !isReporter && !isStaff {
		httpx.WriteError(w, http.StatusForbidden, "Access to case details denied")
		return
	}

	// For normal users, return minimized view
	if !isStaff {
		// Minimized view (disclosed plaintext only, mask identity, etc.)
		minimized := map[string]interface{}{
			"id":         caseObj.ID,
			"caseType":   caseObj.CaseType,
			"category":   caseObj.Category,
			"severity":   caseObj.Severity,
			"status":     caseObj.Status,
			"decision":   caseObj.Decision,
			"createdAt":  caseObj.CreatedAt,
			"disclosure": caseObj.Disclosure,
		}
		httpx.WriteJSON(w, http.StatusOK, minimized)
		return
	}

	// Reviewer sees full case model but minimized private content (no raw inbox)
	events, _ := h.Service.store.GetAbuseCaseEvents(r.Context(), caseID)
	reviews, _ := h.Service.store.GetAbuseReviews(r.Context(), caseID)
	appeal, _ := h.Service.store.GetAbuseAppeal(r.Context(), caseID)

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"case":    caseObj,
		"events":  events,
		"reviews": reviews,
		"appeal":  appeal,
	})
}

// Appeal a case
func (h *Handler) AppealReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	caseID := httpx.Param(r, "caseID")
	if caseID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "caseID parameter is required")
		return
	}

	type appealInput struct {
		IdentityID string `json:"identityId"` // Appealing identity
		Reason     string `json:"reason"`     // wrong_identity, false_positive, context_missing, other
		Statement  string `json:"statement"`
	}

	var input appealInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid appeal payload")
		return
	}

	identityUUID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	belongs, err := h.Service.store.IdentityBelongsToUser(identityUUID, userID)
	if err != nil || !belongs {
		httpx.WriteError(w, http.StatusForbidden, "Unauthorized identity")
		return
	}

	identity, err := h.Service.store.FindIdentityByID(identityUUID)
	if err != nil || identity == nil {
		httpx.WriteError(w, http.StatusBadRequest, "Identity not found")
		return
	}

	appeal, err := h.Service.AppealCase(r.Context(), identity.GaiaID, caseID, input.Reason, input.Statement)
	if err != nil {
		writeGovernanceRejection(w, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, appeal)
}

// Reviewer case list queue
func (h *Handler) GetReviewerQueue(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Verify reviewer credential
	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		httpx.WriteError(w, http.StatusForbidden, "Reviewer credential required")
		return
	}

	isReviewer := false
	for _, id := range identities {
		has, _ := h.Service.HasRole(r.Context(), id.GaiaID, "trusted_reviewer")
		if has {
			isReviewer = true
			break
		}
	}

	if !isReviewer {
		httpx.WriteError(w, http.StatusForbidden, "Reviewer credential required")
		return
	}

	cases, err := h.Service.store.GetAbuseCases(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Abuse queue load failed")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"cases": cases})
}

// Reviewer submits a vote
func (h *Handler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	caseID := httpx.Param(r, "caseID")
	if caseID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "caseID is required")
		return
	}

	type reviewInput struct {
		IdentityID     string `json:"identityId"` // Reviewer identity
		CategoryVote   string `json:"categoryVote"`
		SeverityVote   string `json:"severityVote"`
		Recommendation string `json:"recommendation"` // suspend, quarantine, warn, reject
		Reason         string `json:"reason"`
	}

	var input reviewInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid review payload")
		return
	}

	identityUUID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	belongs, err := h.Service.store.IdentityBelongsToUser(identityUUID, userID)
	if err != nil || !belongs {
		httpx.WriteError(w, http.StatusForbidden, "Unauthorized identity")
		return
	}

	identity, err := h.Service.store.FindIdentityByID(identityUUID)
	if err != nil || identity == nil {
		httpx.WriteError(w, http.StatusBadRequest, "Identity not found")
		return
	}

	review, err := h.Service.ReviewCase(r.Context(), identity.GaiaID, caseID, input.CategoryVote, input.SeverityVote, input.Recommendation, input.Reason)
	if err != nil {
		writeGovernanceRejection(w, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, review)
}

// Node operator list queue
func (h *Handler) GetNodeOperatorQueue(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		httpx.WriteError(w, http.StatusForbidden, "Node operator credential required")
		return
	}

	isOp := false
	for _, id := range identities {
		has, _ := h.Service.HasRole(r.Context(), id.GaiaID, "node_operator")
		if has {
			isOp = true
			break
		}
	}

	if !isOp {
		httpx.WriteError(w, http.StatusForbidden, "Node operator credential required")
		return
	}

	cases, err := h.Service.store.GetAbuseCases(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Abuse queue load failed")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"cases": cases})
}

// Node Operator Override Action
func (h *Handler) ApplyNodeOperatorAction(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	type actionInput struct {
		IdentityID string `json:"identityId"` // Operator acting identity
		TargetType string `json:"targetType"` // "channel", "user"
		TargetID   string `json:"targetId"`
		Suspend    bool   `json:"suspend"`
		Reason     string `json:"reason"`
	}

	var input actionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid override payload")
		return
	}

	identityUUID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	belongs, err := h.Service.store.IdentityBelongsToUser(identityUUID, userID)
	if err != nil || !belongs {
		httpx.WriteError(w, http.StatusForbidden, "Unauthorized identity")
		return
	}

	identity, err := h.Service.store.FindIdentityByID(identityUUID)
	if err != nil || identity == nil {
		httpx.WriteError(w, http.StatusBadRequest, "Identity not found")
		return
	}

	if input.TargetType == "channel" {
		err = h.Service.NodeOperatorSuspendChannel(r.Context(), identity.GaiaID, input.TargetID, input.Suspend, input.Reason)
		if err != nil {
			writeGovernanceRejection(w, "operation", err)
			return
		}
	} else if input.TargetType == "verify_channel" {
		err = h.Service.NodeOperatorVerifyChannel(r.Context(), identity.GaiaID, input.TargetID, input.Suspend)
		if err != nil {
			writeGovernanceRejection(w, "operation", err)
			return
		}
	} else if input.TargetType == "appeal" {
		// Resolve appeal
		status := "rejected"
		if input.Suspend == false {
			status = "accepted"
		}
		err = h.Service.ResolveAppeal(r.Context(), identity.GaiaID, input.TargetID, status, input.Reason)
		if err != nil {
			writeGovernanceRejection(w, "operation", err)
			return
		}
	} else {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid target type")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "success"})
}

// Node operator snapshot trigger
func (h *Handler) CreateTransparencySnapshot(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	identities, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		httpx.WriteError(w, http.StatusForbidden, "Node operator credential required")
		return
	}

	isOp := false
	for _, id := range identities {
		has, _ := h.Service.HasRole(r.Context(), id.GaiaID, "node_operator")
		if has {
			isOp = true
			break
		}
	}

	if !isOp {
		httpx.WriteError(w, http.StatusForbidden, "Node operator credential required")
		return
	}

	report, err := h.Service.GetTransparencyReport(r.Context())
	if err != nil {
		writeGovernanceRejection(w, "operation", err)
		return
	}

	repBytes, _ := json.Marshal(report)
	sig := ed25519.Sign(h.Service.serverKey, repBytes)

	snapshot := &models.TransparencySnapshot{
		Node:         h.Service.serverName,
		Period:       time.Now().Format("2006-01"),
		SnapshotData: models.JSONB(repBytes),
		Timestamp:    time.Now(),
		Signature:    hexEncode(sig),
	}

	err = h.Service.store.CreateTransparencySnapshot(r.Context(), snapshot)
	if err != nil {
		writeGovernanceRejection(w, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, snapshot)
}

// Public transparency endpoint
func (h *Handler) GetPublicTransparency(w http.ResponseWriter, r *http.Request) {
	snapshots, err := h.Service.store.GetTransparencySnapshots(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Snapshots load failed")
		return
	}

	policies, _ := h.Service.store.GetPolicies(r.Context())
	credentials, _ := h.Service.store.GetCredentials(r.Context())
	revocations, _ := h.Service.store.GetRevocations(r.Context())

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"snapshots":   snapshots,
		"policies":    policies,
		"credentials": credentials,
		"revocations": revocations,
	})
}
