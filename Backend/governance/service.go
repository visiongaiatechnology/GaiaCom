// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package governance

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Service struct {
	store      repository.Store
	serverKey  ed25519.PrivateKey
	serverName string
	mu         sync.Mutex
}

const maxReportCommentRunes = 8000

var allowedReportTargetTypes = map[string]bool{
	"channel": true,
	"room":    true,
	"user":    true,
	"message": true,
	"post":    true,
}

var allowedReportCategories = map[string]bool{
	"spam":            true,
	"phishing":        true,
	"malware":         true,
	"harassment":      true,
	"illegal_content": true,
	"threat":          true,
	"other":           true,
}

var allowedReportSeverities = map[string]bool{
	"low":      true,
	"medium":   true,
	"high":     true,
	"critical": true,
}

var allowedReviewRecommendations = map[string]bool{
	"warn":       true,
	"timeout":    true,
	"quarantine": true,
	"suspend":    true,
	"reject":     true,
}

func NewService(store repository.Store, serverKey ed25519.PrivateKey, serverName string) *Service {
	return &Service{
		store:      store,
		serverKey:  serverKey,
		serverName: serverName,
	}
}

func canonicalReportField(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeReportComment(comment string) (string, error) {
	trimmed := strings.TrimSpace(comment)
	if len([]rune(trimmed)) > maxReportCommentRunes {
		return "", fmt.Errorf("report comment exceeds %d characters", maxReportCommentRunes)
	}
	return trimmed, nil
}

func reporterIdentityHash(gaiaID string) string {
	sum := sha256.Sum256([]byte(normalizeGaiaID(gaiaID)))
	return fmt.Sprintf("sha256:%x", sum[:])
}

func legacyReporterIdentityHash(gaiaID string) string {
	return fmt.Sprintf("sha256:%x", gaiaID)
}

func stableTextHash(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return fmt.Sprintf("sha256:%x", sum[:])
}

func severityWeight(severity string) int {
	switch canonicalReportField(severity) {
	case "critical":
		return 4
	case "high":
		return 3
	case "medium":
		return 2
	default:
		return 1
	}
}

func reviewerSeatLimit(userCount int) int {
	if userCount <= 0 {
		return 0
	}
	seats := int(math.Ceil(float64(userCount) * 0.4))
	if seats < 1 {
		seats = 1
	}
	if seats > userCount {
		seats = userCount
	}
	return seats
}

func seniorReviewerSeatLimit(reviewerSeats int) int {
	if reviewerSeats <= 0 {
		return 0
	}
	seniorSeats := int(math.Ceil(float64(reviewerSeats) * 0.35))
	if seniorSeats < 1 {
		seniorSeats = 1
	}
	if seniorSeats > reviewerSeats {
		seniorSeats = reviewerSeats
	}
	return seniorSeats
}

func actionConsensusThreshold(userCount int) (minReviewers int, minWeightedPoints int) {
	seats := reviewerSeatLimit(userCount)
	if seats <= 0 {
		return 1, 4
	}
	minReviewers = int(math.Ceil(float64(seats) * 0.5))
	if minReviewers < 2 && seats >= 2 {
		minReviewers = 2
	}
	if minReviewers > seats {
		minReviewers = seats
	}
	minWeightedPoints = seats * 2
	if minWeightedPoints < 4 {
		minWeightedPoints = 4
	}
	return minReviewers, minWeightedPoints
}

func uniqueNodeUserCount(identities []models.Identity) int {
	seen := make(map[uuid.UUID]bool, len(identities))
	for _, identity := range identities {
		if identity.IsActive {
			seen[identity.UserID] = true
		}
	}
	return len(seen)
}

func targetTypeFromDisclosure(c *models.AbuseCase) string {
	var disclosure struct {
		TargetType string `json:"targetType"`
	}
	if c != nil && len(c.Disclosure) > 0 {
		_ = json.Unmarshal(c.Disclosure, &disclosure)
	}
	return canonicalReportField(disclosure.TargetType)
}

func consensusActionType(votes map[string]int) string {
	priority := map[string]int{
		"suspend":    4,
		"timeout":    3,
		"quarantine": 2,
		"warn":       1,
	}
	bestAction := ""
	bestCount := 0
	bestPriority := 0
	for action, count := range votes {
		if count > bestCount || (count == bestCount && priority[action] > bestPriority) {
			bestAction = action
			bestCount = count
			bestPriority = priority[action]
		}
	}
	return bestAction
}

func abuseActionExpiry(actionType string, severity string) time.Time {
	now := time.Now()
	switch actionType {
	case "warn":
		return now.Add(7 * 24 * time.Hour)
	case "timeout":
		switch canonicalReportField(severity) {
		case "critical":
			return now.Add(14 * 24 * time.Hour)
		case "high":
			return now.Add(7 * 24 * time.Hour)
		default:
			return now.Add(48 * time.Hour)
		}
	case "suspend":
		return now.Add(30 * 24 * time.Hour)
	default:
		return now.Add(14 * 24 * time.Hour)
	}
}

func hasActiveReviewerCredential(creds []models.RoleCredential, now time.Time) bool {
	for _, c := range creds {
		if c.Role != "trusted_reviewer" && c.Role != "senior_reviewer" {
			continue
		}
		if now.Add(3*24*time.Hour).Before(c.ValidUntil) && now.After(c.ValidFrom) {
			return true
		}
	}
	return false
}

// Check if identity has node operator or reviewer credentials
func (s *Service) HasRole(ctx context.Context, gaiaID string, role string) (bool, error) {
	// 1. Check bootstrap config
	for _, bootstrapID := range append([]string{BootstrapGaiaID}, BootstrapGaiaIDs...) {
		if bootstrapID != "" && bootstrapIdentityMatches(gaiaID, bootstrapID) {
			if role == "node_operator" || role == "senior_reviewer" || role == "trusted_reviewer" {
				return true, nil
			}
		}
	}

	// 2. Check DB credentials
	creds, err := s.store.GetCredentialsBySubject(ctx, gaiaID)
	if err != nil {
		return false, err
	}

	now := time.Now()
	for _, cred := range creds {
		if cred.Role == role || (role == "trusted_reviewer" && cred.Role == "senior_reviewer") {
			// Check expiration
			if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
				continue
			}
			// Check revocation
			rev, err := s.store.GetCredentialRevocation(ctx, cred.ID)
			if err != nil || rev != nil {
				continue // Revoked or DB error
			}
			return true, nil
		}
	}
	return false, nil
}

// Fetch active roles for an identity
func (s *Service) GetActiveRoles(ctx context.Context, gaiaID string) ([]string, error) {
	roles := []string{}
	roleCandidates := []string{"node_operator", "senior_reviewer", "trusted_reviewer"}
	for _, r := range roleCandidates {
		has, err := s.HasRole(ctx, gaiaID, r)
		if err == nil && has {
			roles = append(roles, r)
		}
	}
	return roles, nil
}

// Auto-mint bootstrap credentials to DB if not present
func (s *Service) MintBootstrapCredentialsIfNeeded(ctx context.Context) error {
	if BootstrapGaiaID == "" {
		return nil
	}

	creds, err := s.store.GetCredentialsBySubject(ctx, BootstrapGaiaID)
	if err != nil {
		return err
	}

	hasOp := false
	hasReviewer := false
	for _, c := range creds {
		if c.Role == "node_operator" {
			hasOp = true
		}
		if c.Role == "senior_reviewer" {
			hasReviewer = true
		}
	}

	now := time.Now()
	exp := now.Add(365 * 24 * time.Hour) // 1 year validity

	if !hasOp {
		cred := &models.RoleCredential{
			ID:               "bootstrap_node_op_" + uuid.New().String(),
			Role:             "node_operator",
			SubjectIdentity:  BootstrapGaiaID,
			SubjectPublicKey: "",
			Scope:            "local-node-ops",
			ValidFrom:        now,
			ValidUntil:       exp,
			Permissions:      models.JSONB(`["view_abuse_queue", "apply_abuse_actions", "generate_transparency_snapshots"]`),
			Cannot:           models.JSONB(`["decrypt_messages"]`),
			Issuer:           "gaia:foundation:bootstrap",
			PolicyHash:       "genesis",
			Signature:        "bootstrap",
			CreatedAt:        now,
		}
		_ = s.store.CreateRoleCredential(ctx, cred)
	}

	if !hasReviewer {
		cred := &models.RoleCredential{
			ID:               "bootstrap_senior_rev_" + uuid.New().String(),
			Role:             "senior_reviewer",
			SubjectIdentity:  BootstrapGaiaID,
			SubjectPublicKey: "",
			Scope:            "abuse-review",
			ValidFrom:        now,
			ValidUntil:       exp,
			Permissions:      models.JSONB(`["view_minimized_case", "vote_on_case", "recommend_quarantine", "sign_emergency_action", "decide_appeals"]`),
			Cannot:           models.JSONB(`["decrypt_messages"]`),
			Issuer:           "gaia:foundation:bootstrap",
			PolicyHash:       "genesis",
			Signature:        "bootstrap",
			CreatedAt:        now,
		}
		_ = s.store.CreateRoleCredential(ctx, cred)
	}

	return nil
}

// Submit a case report
func (s *Service) SubmitReport(ctx context.Context, reporterGaiaID string, targetType string, targetID string, category string, severity string, messageID *string, comment string) (*models.AbuseCase, error) {
	targetType = canonicalReportField(targetType)
	category = canonicalReportField(category)
	severity = canonicalReportField(severity)
	targetID = strings.TrimSpace(targetID)
	if !allowedReportTargetTypes[targetType] {
		return nil, errors.New("invalid report target type")
	}
	if targetID == "" {
		return nil, errors.New("report target is required")
	}
	if !allowedReportCategories[category] {
		return nil, errors.New("invalid report category")
	}
	if !allowedReportSeverities[severity] {
		return nil, errors.New("invalid report severity")
	}
	comment, err := normalizeReportComment(comment)
	if err != nil {
		return nil, err
	}

	disclosureBytes, err := json.Marshal(map[string]interface{}{
		"schema":         "gaia.abuse.report.v2",
		"targetType":     targetType,
		"comment":        comment,
		"severityWeight": severityWeight(severity),
	})
	if err != nil {
		return nil, err
	}
	proofBytes, err := json.Marshal(map[string]interface{}{
		"commentHash": stableTextHash(comment),
		"targetHash":  stableTextHash(targetID),
	})
	if err != nil {
		return nil, err
	}

	c := &models.AbuseCase{
		ID:                   "case_" + uuid.New().String(),
		CaseType:             "abuse_report",
		Category:             category,
		Severity:             severity,
		ReporterIdentityHash: reporterIdentityHash(reporterGaiaID),
		ReportedIdentityHash: targetID,
		ReportedNode:         s.serverName,
		MessageID:            messageID,
		MessageHash:          "",
		GaiaProof:            models.JSONB(proofBytes),
		Disclosure:           models.JSONB(disclosureBytes),
		Status:               "new",
		CreatedAt:            time.Now(),
	}

	err = s.store.CreateAbuseCase(ctx, c)
	if err != nil {
		return nil, err
	}

	// Create event
	event := &models.AbuseCaseEvent{
		CaseID:        c.ID,
		EventType:     "case_created",
		ActorIdentity: reporterGaiaID,
		Details:       fmt.Sprintf("Report submitted against %s %s. Category: %s, Severity: %s", targetType, targetID, category, severity),
		Timestamp:     c.CreatedAt,
	}
	_ = s.store.CreateAbuseCaseEvent(ctx, event)

	// Algorithm check: If reported >= 5 times and target is channel, automatically check if we hide it from list.
	// But let's also support auto-suspension if highly critical
	if targetType == "channel" {
		count, err := s.store.GetAbuseCasesCountForChannel(ctx, targetID)
		if err == nil && count >= 5 {
			// Auto hide is handled in FindPublicChannelsForUser by filtering channel listings if report count >= 5.
			// Log audit event
			_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
				CaseID:        c.ID,
				EventType:     "channel_hidden_threshold",
				ActorIdentity: "system",
				Details:       fmt.Sprintf("Channel %s hit reporting threshold (%d reports) and is hidden from public lists.", targetID, count),
				Timestamp:     time.Now(),
			})
		}

		// If severe category reported (terrorism, drugs, child abuse) and reported multiple times, we flag it or Node Operator can suspend.
		if category == "illegal_content" || category == "threat" {
			_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
				CaseID:        c.ID,
				EventType:     "emergency_lane_triggered",
				ActorIdentity: "system",
				Details:       fmt.Sprintf("High severity report triggered on emergency lane for channel %s.", targetID),
				Timestamp:     time.Now(),
			})
		}
	}

	return c, nil
}

// Review a case
func (s *Service) ReviewCase(ctx context.Context, reviewerGaiaID string, caseID string, categoryVote string, severityVote string, recommendation string, reason string) (*models.AbuseReview, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	categoryVote = canonicalReportField(categoryVote)
	severityVote = canonicalReportField(severityVote)
	recommendation = canonicalReportField(recommendation)
	reason = strings.TrimSpace(reason)
	if !allowedReportCategories[categoryVote] {
		return nil, errors.New("invalid review category")
	}
	if !allowedReportSeverities[severityVote] {
		return nil, errors.New("invalid review severity")
	}
	if !allowedReviewRecommendations[recommendation] {
		return nil, errors.New("invalid review recommendation")
	}

	c, err := s.store.GetAbuseCase(ctx, caseID)
	if err != nil || c == nil {
		return nil, errors.New("case not found")
	}

	// 1. Get reviewer credential
	isReviewer, err := s.HasRole(ctx, reviewerGaiaID, "trusted_reviewer")
	if err != nil || !isReviewer {
		return nil, errors.New("unauthorized reviewer")
	}

	// Verify no double voting
	existing, err := s.store.GetAbuseReviews(ctx, caseID)
	if err == nil {
		for _, r := range existing {
			if r.ReviewerIdentity == reviewerGaiaID {
				return nil, errors.New("already reviewed this case")
			}
		}
	}

	r := &models.AbuseReview{
		ID:               "rev_" + uuid.New().String(),
		CaseID:           caseID,
		ReviewerIdentity: reviewerGaiaID,
		CredentialID:     "cred_active",
		ReviewedAt:       time.Now(),
		CategoryVote:     categoryVote,
		SeverityVote:     severityVote,
		Recommendation:   recommendation,
		ReasonCode:       "reviewer_evaluation",
		VisibleReason:    reason,
		PrivateNoteHash:  "",
		Signature:        "",
	}

	// Sign the review
	reviewBytes, _ := json.Marshal(r)
	sig := ed25519.Sign(s.serverKey, reviewBytes)
	r.Signature = hexEncode(sig)

	err = s.store.CreateAbuseReview(ctx, r)
	if err != nil {
		return nil, err
	}

	// Log event
	_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
		CaseID:        caseID,
		EventType:     "review_signed",
		ActorIdentity: reviewerGaiaID,
		Details:       fmt.Sprintf("Reviewer voted category: %s, recommendation: %s", categoryVote, recommendation),
		Timestamp:     r.ReviewedAt,
	})

	// Check if thresholds met
	reviews, err := s.store.GetAbuseReviews(ctx, caseID)
	if err == nil {
		nodeUserCount := 1
		if idStore, ok := s.store.(repository.IdentityStore); ok {
			if identities, err := idStore.FindAllIdentities(ctx); err == nil {
				nodeUserCount = uniqueNodeUserCount(identities)
			}
		}
		minReviewers, minWeightedPoints := actionConsensusThreshold(nodeUserCount)
		actionVotes := make(map[string]int)
		distinctReviewers := make(map[string]bool)
		weightedPoints := 0
		for _, rev := range reviews {
			switch rev.Recommendation {
			case "suspend", "quarantine", "timeout", "warn":
				actionVotes[rev.Recommendation]++
				distinctReviewers[rev.ReviewerIdentity] = true
				weightedPoints += severityWeight(rev.SeverityVote)
			}
		}

		if len(distinctReviewers) >= minReviewers && weightedPoints >= minWeightedPoints && c.Status == "new" {
			actionType := consensusActionType(actionVotes)
			if actionType == "" {
				actionType = "quarantine"
			}
			_ = s.store.UpdateAbuseCaseStatus(ctx, caseID, "actioned", nil)
			_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
				CaseID:        caseID,
				EventType:     "threshold_reached",
				ActorIdentity: "system",
				Details:       fmt.Sprintf("Abuse consensus reached: %d reviewers, %d weighted points, action %s.", len(distinctReviewers), weightedPoints, actionType),
				Timestamp:     time.Now(),
			})

			targetType := targetTypeFromDisclosure(c)
			if targetType == "" {
				targetType = "channel"
			}
			if targetType == "post" {
				targetType = "message"
			}
			if targetType == "channel" && (actionType == "suspend" || actionType == "quarantine") {
				if channelUUID, err := uuid.Parse(c.ReportedIdentityHash); err == nil {
					_ = s.store.SuspendPublicChannel(ctx, channelUUID, true, "Actioned by abuse consensus due to multiple node policy violations.")
				}
			}

			act := &models.AbuseAction{
				ID:         "act_" + uuid.New().String(),
				CaseID:     caseID,
				TargetType: targetType,
				TargetID:   c.ReportedIdentityHash,
				ActionType: actionType,
				Severity:   c.Severity,
				AppliedAt:  time.Now(),
				ExpiresAt:  abuseActionExpiry(actionType, c.Severity),
				Reason:     fmt.Sprintf("Consensus threshold met with %d weighted points.", weightedPoints),
				Signature:  "",
			}
			actBytes, _ := json.Marshal(act)
			actSig := ed25519.Sign(s.serverKey, actBytes)
			act.Signature = hexEncode(actSig)
			_ = s.store.CreateAbuseAction(ctx, act)
		}
	}

	return r, nil
}

// Appeal a case
func (s *Service) AppealCase(ctx context.Context, senderGaiaID string, caseID string, reason string, statement string) (*models.AbuseAppeal, error) {
	c, err := s.store.GetAbuseCase(ctx, caseID)
	if err != nil || c == nil {
		return nil, errors.New("case not found")
	}

	// User can appeal if the target channel belongs to them or they are affected
	// Let's verify if user has already appealed
	existing, err := s.store.GetAbuseAppeal(ctx, caseID)
	if err == nil && existing != nil {
		return nil, errors.New("appeal already submitted for this case")
	}

	appeal := &models.AbuseAppeal{
		ID:             "app_" + uuid.New().String(),
		CaseID:         caseID,
		SubmittedBy:    senderGaiaID,
		SubmittedAt:    time.Now(),
		Reason:         reason,
		Statement:      statement,
		Status:         "pending",
		DecisionReason: "",
		DecidedAt:      "",
		DecidedBy:      "",
		Signature:      "",
	}

	appealBytes, _ := json.Marshal(appeal)
	sig := ed25519.Sign(s.serverKey, appealBytes)
	appeal.Signature = hexEncode(sig)

	err = s.store.CreateAbuseAppeal(ctx, appeal)
	if err != nil {
		return nil, err
	}

	// Update case status
	_ = s.store.UpdateAbuseCaseStatus(ctx, caseID, "appealed", nil)

	_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
		CaseID:        caseID,
		EventType:     "appeal_submitted",
		ActorIdentity: senderGaiaID,
		Details:       fmt.Sprintf("Appeal submitted. Reason: %s", reason),
		Timestamp:     appeal.SubmittedAt,
	})

	return appeal, nil
}

// Decide on an appeal (Requires Senior Reviewer role)
func (s *Service) ResolveAppeal(ctx context.Context, reviewerGaiaID string, caseID string, status string, decisionReason string) error {
	isSenior, err := s.HasRole(ctx, reviewerGaiaID, "senior_reviewer")
	if err != nil || !isSenior {
		return errors.New("unauthorized senior reviewer")
	}

	appeal, err := s.store.GetAbuseAppeal(ctx, caseID)
	if err != nil || appeal == nil {
		return errors.New("appeal not found")
	}

	if appeal.Status != "pending" {
		return errors.New("appeal already resolved")
	}

	// Ensure the resolver didn't vote on the case original review
	reviews, err := s.store.GetAbuseReviews(ctx, caseID)
	if err == nil {
		for _, r := range reviews {
			if r.ReviewerIdentity == reviewerGaiaID {
				return errors.New("reviewer has conflict of interest (voted in original case)")
			}
		}
	}

	err = s.store.UpdateAbuseAppealStatus(ctx, caseID, status, decisionReason, reviewerGaiaID)
	if err != nil {
		return err
	}

	// If appeal accepted, lift channel suspension
	c, err := s.store.GetAbuseCase(ctx, caseID)
	if err == nil && c != nil {
		if status == "accepted" {
			_ = s.store.UpdateAbuseCaseStatus(ctx, caseID, "closed", nil)
			channelUUID, err := uuid.Parse(c.ReportedIdentityHash)
			if err == nil {
				_ = s.store.SuspendPublicChannel(ctx, channelUUID, false, "")
			}
			// Delete actions
			actions, err := s.store.GetAbuseActions(ctx, "channel", c.ReportedIdentityHash)
			if err == nil {
				for _, act := range actions {
					_ = s.store.DeleteAbuseAction(ctx, act.ID)
				}
			}
		} else {
			_ = s.store.UpdateAbuseCaseStatus(ctx, caseID, "closed", nil)
		}
	}

	_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
		CaseID:        caseID,
		EventType:     "appeal_decided",
		ActorIdentity: reviewerGaiaID,
		Details:       fmt.Sprintf("Appeal resolution: %s. Decision: %s", status, decisionReason),
		Timestamp:     time.Now(),
	})

	return nil
}

// Suspend channel manually (Node Operator override)
func (s *Service) NodeOperatorSuspendChannel(ctx context.Context, operatorGaiaID string, channelID string, suspended bool, reason string) error {
	isOp, err := s.HasRole(ctx, operatorGaiaID, "node_operator")
	if err != nil || !isOp {
		return errors.New("unauthorized node operator")
	}

	channelUUID, err := uuid.Parse(channelID)
	if err != nil {
		return errors.New("invalid channel id")
	}

	err = s.store.SuspendPublicChannel(ctx, channelUUID, suspended, reason)
	if err != nil {
		return err
	}

	// Log event
	logAction := "quarantined"
	if !suspended {
		logAction = "reinstated"
	}

	// Create case to track manual override
	c := &models.AbuseCase{
		ID:                   "case_override_" + uuid.New().String(),
		CaseType:             "manual_override",
		Category:             "operator_action",
		Severity:             "high",
		ReporterIdentityHash: fmt.Sprintf("sha256:%x", operatorGaiaID),
		ReportedIdentityHash: channelID,
		ReportedNode:         s.serverName,
		Status:               "actioned",
		CreatedAt:            time.Now(),
	}
	_ = s.store.CreateAbuseCase(ctx, c)

	_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
		CaseID:        c.ID,
		EventType:     "operator_override",
		ActorIdentity: operatorGaiaID,
		Details:       fmt.Sprintf("Node Operator manually %s channel %s. Reason: %s", logAction, channelID, reason),
		Timestamp:     time.Now(),
	})

	return nil
}

// Verify channel manually (Node Operator override)
func (s *Service) NodeOperatorVerifyChannel(ctx context.Context, operatorGaiaID string, channelID string, verified bool) error {
	isOp, err := s.HasRole(ctx, operatorGaiaID, "node_operator")
	if err != nil || !isOp {
		return errors.New("unauthorized node operator")
	}

	channelUUID, err := uuid.Parse(channelID)
	if err != nil {
		return errors.New("invalid channel id")
	}

	err = s.store.VerifyPublicChannel(ctx, channelUUID, verified)
	if err != nil {
		return err
	}

	_ = s.store.CreateAbuseCaseEvent(ctx, &models.AbuseCaseEvent{
		CaseID:        "verify_" + channelID,
		EventType:     "channel_verified",
		ActorIdentity: operatorGaiaID,
		Details:       fmt.Sprintf("Channel verification set to %v", verified),
		Timestamp:     time.Now(),
	})

	return nil
}

// Generate transparency logs
func (s *Service) GetTransparencyReport(ctx context.Context) (map[string]interface{}, error) {
	cases, err := s.store.GetAbuseCases(ctx)
	if err != nil {
		return nil, err
	}

	policies, err := s.store.GetPolicies(ctx)
	policyVer := "genesis"
	if err == nil && len(policies) > 0 {
		policyVer = policies[0].Version
	}

	repStats := map[string]int{
		"spam":            0,
		"phishing":        0,
		"malware":         0,
		"harassment":      0,
		"illegal_content": 0,
		"threat":          0,
		"other":           0,
	}
	actionStats := map[string]int{
		"quarantines":      0,
		"locks":            0,
		"suspensions":      0,
		"emergency_action": 0,
	}

	for _, c := range cases {
		repStats[c.Category]++
		if c.Status == "actioned" {
			actionStats["suspensions"]++
		}
	}

	// Calculate credentials count
	creds, err := s.store.GetCredentials(ctx)
	credsCount := len(creds)
	if BootstrapGaiaID != "" {
		credsCount += 2 // Plus dynamic bootstrap creds
	}

	appealsCount := 0
	acceptedAppeals := 0
	rejectedAppeals := 0

	return map[string]interface{}{
		"node":           s.serverName,
		"period":         time.Now().Format("2006-01"),
		"reports":        repStats,
		"actions":        actionStats,
		"policy_version": policyVer,
		"active_roles":   credsCount,
		"appeals": map[string]interface{}{
			"submitted": appealsCount,
			"accepted":  acceptedAppeals,
			"rejected":  rejectedAppeals,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	}, nil
}

// Helper: hex encoding
func hexEncode(b []byte) string {
	return hexEncodeString(b)
}

func hexEncodeString(b []byte) string {
	dst := make([]byte, hex.EncodedLen(len(b)))
	hex.Encode(dst, b)
	return string(dst)
}

func normalizeGaiaID(id string) string {
	id = strings.ToLower(strings.TrimSpace(id))
	id = strings.TrimPrefix(id, "@")
	id = strings.ReplaceAll(id, "@", ":")
	return id
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
	identity := strings.ToLower(strings.TrimSpace(identityGaiaID))
	bootstrap := strings.ToLower(strings.TrimSpace(bootstrapGaiaID))
	if identity == bootstrap {
		return true
	}
	return normalizeAndStripDomain(identity) == normalizeAndStripDomain(bootstrap)
}

func (s *Service) StartAutoGovernanceWorker(ctx context.Context) {
	log.Println("[Governance] Auto-Governance background worker started.")
	s.runAutoGovernance(ctx)

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Governance] Auto-Governance background worker stopping.")
			return
		case <-ticker.C:
			s.runAutoGovernance(ctx)
		}
	}
}

func (s *Service) runAutoGovernance(ctx context.Context) {
	log.Println("[Governance] Running auto-governance evaluation...")

	var identities []models.Identity
	var err error
	if idStore, ok := s.store.(repository.IdentityStore); ok {
		identities, err = idStore.FindAllIdentities(ctx)
		if err != nil {
			log.Printf("[Governance] Error fetching identities: %v", err)
			return
		}
	} else {
		log.Println("[Governance] Error: store does not implement IdentityStore")
		return
	}

	now := time.Now()
	since30d := now.Add(-30 * 24 * time.Hour)
	type reviewerCandidate struct {
		identity models.Identity
		msgCount int
	}
	candidates := make([]reviewerCandidate, 0, len(identities))
	activeReviewers := make(map[string]bool)
	activeSeniors := make(map[string]bool)

	for _, id := range identities {
		// Skip bootstrap user or system identity
		if id.GaiaID == "system" || (BootstrapGaiaID != "" && normalizeAndStripDomain(id.GaiaID) == normalizeAndStripDomain(BootstrapGaiaID)) {
			continue
		}

		// Check standing (open cases and abuse score)
		openCases, err := s.store.GetOpenAbuseCasesCount(ctx, id.GaiaID)
		if err != nil {
			log.Printf("[Governance] Error checking abuse cases for %s: %v", id.GaiaID, err)
			continue
		}
		if openCases > 0 {
			continue
		}

		var abuseScore int = 0
		if score, err := s.store.GetAbuseScore(id.GaiaID); err == nil && score != nil {
			abuseScore = score.Score
		}
		if abuseScore > 0 {
			continue
		}

		// Check activity (messages sent in the last 30 days)
		msgCount, err := s.store.GetMessageCountSince(ctx, id.GaiaID, since30d)
		if err != nil {
			log.Printf("[Governance] Error checking message count for %s: %v", id.GaiaID, err)
			continue
		}
		creds, err := s.store.GetCredentialsBySubject(ctx, id.GaiaID)
		if err == nil {
			for _, c := range creds {
				if (c.Role == "trusted_reviewer" || c.Role == "senior_reviewer") && now.Add(3*24*time.Hour).Before(c.ValidUntil) && now.After(c.ValidFrom) {
					rev, err := s.store.GetCredentialRevocation(ctx, c.ID)
					if err == nil && rev == nil {
						activeReviewers[id.GaiaID] = true
						if c.Role == "senior_reviewer" {
							activeSeniors[id.GaiaID] = true
						}
					}
				}
			}
		}
		if msgCount >= 5 {
			candidates = append(candidates, reviewerCandidate{identity: id, msgCount: msgCount})
		}
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].msgCount == candidates[j].msgCount {
			return candidates[i].identity.CreatedAt.Before(candidates[j].identity.CreatedAt)
		}
		return candidates[i].msgCount > candidates[j].msgCount
	})

	reviewerSeats := reviewerSeatLimit(uniqueNodeUserCount(identities))
	seniorSeats := seniorReviewerSeatLimit(reviewerSeats)

	for _, candidate := range candidates {
		if len(activeReviewers) >= reviewerSeats {
			break
		}
		id := candidate.identity
		msgCount := candidate.msgCount
		creds, err := s.store.GetCredentialsBySubject(ctx, id.GaiaID)
		if err == nil && hasActiveReviewerCredential(creds, now) {
			continue
		}

		targetRole := "trusted_reviewer"
		roleLabel := "Trusted Reviewer"
		if msgCount >= 15 && len(activeSeniors) < seniorSeats {
			targetRole = "senior_reviewer"
			roleLabel = "Senior Reviewer"
		}

		validFrom := now
		validUntil := now.Add(14 * 24 * time.Hour) // 2 weeks duration

		credID := fmt.Sprintf("auto_rev_%s_%s", targetRole, uuid.New().String())
		permissions := `["view_minimized_case", "vote_on_case"]`
		if targetRole == "senior_reviewer" {
			permissions = `["view_minimized_case", "vote_on_case", "recommend_quarantine", "decide_appeals"]`
		}

		cred := &models.RoleCredential{
			ID:               credID,
			Role:             targetRole,
			SubjectIdentity:  id.GaiaID,
			SubjectPublicKey: "",
			Scope:            "abuse-review",
			ValidFrom:        validFrom,
			ValidUntil:       validUntil,
			Permissions:      models.JSONB(permissions),
			Cannot:           models.JSONB(`["decrypt_messages"]`),
			Issuer:           "gaia:system:governance",
			PolicyHash:       "active-policy",
			Signature:        "system-minted",
			CreatedAt:        now,
		}

		err = s.store.CreateRoleCredential(ctx, cred)
		if err != nil {
			log.Printf("[Governance] Error creating auto role credential for %s: %v", id.GaiaID, err)
			continue
		}
		activeReviewers[id.GaiaID] = true
		if targetRole == "senior_reviewer" {
			activeSeniors[id.GaiaID] = true
		}

		log.Printf("[Governance] Auto-assigned role '%s' to %s until %v", targetRole, id.GaiaID, validUntil)

		// Send system notification
		lang := getIdentityLanguage(&id)
		subject, bodyFormat := getRoleAssignmentMessage(lang)
		dateStr := validUntil.Format("2006-01-02")
		body := fmt.Sprintf(bodyFormat, roleLabel, dateStr)

		payload := map[string]interface{}{
			"type":      "system",
			"subject":   subject,
			"body":      body,
			"createdAt": now.Format(time.RFC3339),
		}
		payloadBytes, _ := json.Marshal(payload)

		systemMsg := &models.MessageEnvelope{
			ID:        uuid.New(),
			Type:      "system",
			Sender:    "system",
			Recipient: id.GaiaID,
			Payload:   models.JSONB(payloadBytes),
		}

		err = s.store.SaveMessageEnvelopeWithInbox(ctx, systemMsg, []uuid.UUID{id.ID})
		if err != nil {
			log.Printf("[Governance] Error sending role notification to %s: %v", id.GaiaID, err)
		}
	}
}

func getIdentityLanguage(identity *models.Identity) string {
	var record struct {
		Language string `json:"language"`
	}
	if err := json.Unmarshal(identity.PublicRecord, &record); err == nil && record.Language != "" {
		return record.Language
	}
	return "de"
}

var roleAssignmentMessages = map[string][2]string{
	"de": {
		"Neue Systemrolle zugewiesen!",
		"Hallo! Aufgrund deiner vorbildlichen Aktivität und deines hervorragenden Verhaltens im Netzwerk hat der automatische Governance-Algorithmus dir die Rolle '%s' verliehen. Diese Rolle ist gültig für 2 Wochen (bis %s). Du kannst deine neuen Berechtigungen im Meldecenter einsehen. Vielen Dank für deinen Beitrag zum Schutz der Community!",
	},
	"en": {
		"New system role assigned!",
		"Hello! Based on your exemplary activity and excellent standing in the network, the automated governance algorithm has awarded you the role '%s'. This role is valid for 2 weeks (until %s). You can view your new permissions in the Abuse Center. Thank you for helping protect the community!",
	},
	"ru": {
		"Назначена новая системная роль!",
		"Здравствуйте! На основании вашей примерной активности и отличной репутации в сети автоматический алгоритм управления присвоил вам роль '%s'. Эта роль действительна в течение 2 недель (до %s). Вы можете просмотреть свои новые разрешения в Центре жалоб. Спасибо за помощь в защите сообщества!",
	},
	"es": {
		"¡Nueva rol de sistema asignado!",
		"¡Hola! Basado en tu actividad ejemplar y excelente reputación en la red, el algoritmo de gobernanza automatizado te ha otorgado el rol de '%s'. Este rol es válido por 2 semanas (hasta el %s). Puedes ver tus nuevos permisos en el Centro de Abuso. ¡Gracias por ayudar a proteger a la comunidad!",
	},
	"fr": {
		"Nouveau rôle système attribué !",
		"Bonjour ! En raison de votre activité exemplaire et de votre excellente réputation sur le réseau, l'algorithme de gouvernance automatisé vous a attribué le rôle '%s'. Ce rôle est valable pour 2 semaines (jusqu'au %s). Vous pouvez consulter vos nouvelles autorisations dans le Centre de signalement. Merci d'aider à protéger la communauté !",
	},
	"fa": {
		"نقش سیستم جدید اختصاص داده شد!",
		"سلام! بر اساس فعالیت نمونه و وضعیت عالی شما در شبکه، الگوریتم حاکمیت خودکار نقش '%s' را به شما اعطا کرده است. این نقش به مدت 2 هفته (تا %s) اعتبار دارد. می توانید مجوزهای جدید خود را در مرکز گزارش تخلف مشاهده کنید. از اینکه به محافظت از جامعه کمک می کنید متشکریم!",
	},
	"ja": {
		"新しいシステムロールが割り当てられました！",
		"こんにちは！ネットワーク内での模範的な活動 & 優れた評価に基づき、自動ガバナンスアルゴリズムによって '%s' のロールが授与されました。このロール is 2週間有効です（%sまで）。新しい権限は悪用センターで確認できます。コミュニティの保護にご協力いただきありがとうございます！",
	},
	"pt": {
		"Novo papel do sistema atribuído!",
		"Olá! Com base em sua atividade exemplar e excelente reputação na rede, o algoritmo de governança automatizado concedeu a você o papel de '%s'. Este papel é válido por 2 semanas (até %s). Você pode visualizar suas novas permissões no Central de Abusos. Obrigado por ajudar a proteger a comunidade!",
	},
	"ar": {
		"تم تعيين دور نظام جديد!",
		"مرحبًا! بناءً على نشاطك النموذجي ومكانتك الممتازة في الشبكة، فقد منحك خوارزمية الحوكمة التلقائية دور '%s'. هذا الدور صالح لمدة أسبوعين (حتى %s). يمكنك عرض أذوناتك الجديدة في مركز الإبلاغ. شكرًا لمساعدتك في حماية المجتمع!",
	},
	"zh": {
		"分配了新的系统角色！",
		"您好！基于您在网络中的模范活动和优异表现，自动治理算法已授予您“%s”角色。此角色有效期为2周（至 %s）。您可以在举报中心查看您的新权限。感谢您协助保护社区安全！",
	},
	"hi": {
		"नया सिस्टम रोल सौंपा गया!",
		"नमस्ते! नेटवर्क में आपकी अनुकरणीय गतिविधि और उत्कृष्ट स्थिति के आधार पर, स्वचालित शासन एल्गोरिथ्म ने आपको '%s' की भूमिका प्रदान की है। यह भूमिका 2 सप्ताह के लिए (%s तक) मान्य है। आप दुरुपयोग केंद्र में अपनी नई अनुमतियाँ देख सकते हैं। समुदाय की सुरक्षा में मदद करने के लिए धन्यवाद!",
	},
	"tr": {
		"Yeni sistem rolü atandı!",
		"Merhaba! Ağdaki örnek teşkil eden aktiviteniz ve mükemmel itibarınız doğrultusunda, otomatik yönetişim algoritması size '%s' rolünü verdi. Bu rol 2 hafta boyunca (kadar %s) geçerlidir. Yeni izinlerinizi Bildirim Merkezinde görebilirsiniz. Topluluğu korumaya yardımcı olduğunuz için teşekkür ederiz!",
	},
	"it": {
		"Nuovo ruolo di sistema assegnato!",
		"Ciao! Sulla base della tua attività esemplare e della tua eccellente reputazione nella rete, l'algoritmo di governance automatizzato ti ha assegnato il ruolo '%s'. Questo ruolo è valido per 2 settimane (fino al %s). Puoi visualizzare i tuoi nuovi permessi nel Centro segnalazioni. Grazie per aver aiutato a proteggere la comunità!",
	},
	"pl": {
		"Przypisano nową rolę systemową!",
		"Witaj! Na podstawie Twojej wzorowej aktywności i doskonałej reputacji w sieci, automatyczny algorytm zarządzania przyznał Ci rolę '%s'. Rola ta jest ważna przez 2 tygodnie (do %s). Nowe uprawnienia możesz sprawdzić w Centrum Zgłoszeń. Dziękujemy za pomoc w ochronie społeczności!",
	},
	"uk": {
		"Призначено нову системну роль!",
		"Вітаємо! На основі вашої зразкової активності та відмінної репутації в мережі автоматичний алгоритм управління присвоїв вам роль '%s'. Ця роль дійсна протягом 2 тижнів (до %s). Ви можете переглянути свої нові дозволи в Центрі скарг. Дякуємо за допомогу в захисті спільноти!",
	},
	"ko": {
		"새로운 시스템 역할이 할당되었습니다!",
		"안녕하세요! 네트워크에서의 모범적인 활동과 훌륭한 평판을 바탕으로, 자동 거버넌스 알고리즘에 의해 '%s' 역할이 부여되었습니다. 이 역할은 2주간 유효합니다(%s까지). 새로운 권한은 신고 센터에서 확인할 수 있습니다. 커뮤니티 보호를 지원해 주셔서 감사합니다!",
	},
	"id": {
		"Peran sistem baru ditetapkan!",
		"Halo! Berdasarkan aktivitas teladan dan reputasi baik Anda di jaringan, algoritma tata kelola otomatis telah menganugerahkan Anda peran '%s'. Peran ini berlaku selama 2 minggu (sampai %s). Anda dapat melihat izin baru Anda di Pusat Laporan. Terima kasih telah membantu melindungi komunitas!",
	},
	"sq": {
		"U caktua rol i ri i sistemit!",
		"Përshëndetje! Bazuar në aktivitetin tuaj shembullor dhe qëndrimin e shkëlqyer në rrjet, algoritmi i automatizuar i qeverisjes ju ka caktuar rolin '%s'. Ky rol është i vlefshëm për 2 javë (deri më %s). Ju mund të shikoni lejet tuaja të reja në Qendrën e Raportimit. Faleminderit që ndihmoni në mbrojtjen e komunitetit!",
	},
}

func getRoleAssignmentMessage(lang string) (string, string) {
	if msgs, ok := roleAssignmentMessages[strings.ToLower(lang)]; ok {
		return msgs[0], msgs[1]
	}
	return roleAssignmentMessages["de"][0], roleAssignmentMessages["de"][1]
}
