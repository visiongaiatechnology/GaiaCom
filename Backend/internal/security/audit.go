// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"gaiacom/backend/models"
)

const genesisHash = "0000000000000000000000000000000000000000000000000000000000000000"

func (s *SecuritySystem) CalculateAuditHash(ctx context.Context, event *models.SecurityEvent) (*models.SecurityAuditChain, error) {
	// 1. Get the latest audit chain hash
	prevHash := genesisHash
	lastChain, err := s.Store.GetLatestSecurityAuditChain(ctx)
	if err == nil && lastChain != nil {
		prevHash = lastChain.EventHash
	}

	// 2. Hash canonical immutable event context
	payload := struct {
		EventID         string `json:"event_id"`
		PreviousHash    string `json:"previous_hash"`
		OwnerUserID     string `json:"owner_user_id,omitempty"`
		OwnerIdentityID string `json:"owner_identity_id,omitempty"`
		NodeID          string `json:"node_id"`
		Category        string `json:"category"`
		Severity        string `json:"severity"`
		Source          string `json:"source"`
		Summary         string `json:"summary"`
		Action          string `json:"action"`
		PublicVisible   bool   `json:"public_visible"`
		UserVisible     bool   `json:"user_visible"`
		NodeVisible     bool   `json:"node_visible"`
		CreatedAt       string `json:"created_at"`
	}{
		EventID:       event.EventID,
		PreviousHash:  prevHash,
		NodeID:        event.NodeID,
		Category:      event.Category,
		Severity:      event.Severity,
		Source:        event.Source,
		Summary:       event.Summary,
		Action:        event.Action,
		PublicVisible: event.PublicVisible,
		UserVisible:   event.UserVisible,
		NodeVisible:   event.NodeVisible,
		CreatedAt:     event.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	if event.OwnerUserID != nil {
		payload.OwnerUserID = event.OwnerUserID.String()
	}
	if event.OwnerIdentityID != nil {
		payload.OwnerIdentityID = event.OwnerIdentityID.String()
	}
	canonical, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	eventDigest := sha256.Sum256(canonical)
	eventHash := hex.EncodeToString(eventDigest[:])
	mac := hmac.New(sha256.New, s.HMACKey)
	mac.Write([]byte(eventHash))
	signature := hex.EncodeToString(mac.Sum(nil))

	return &models.SecurityAuditChain{
		EventID:      event.EventID,
		PreviousHash: prevHash,
		EventHash:    eventHash,
		CreatedAt:    event.CreatedAt,
		Signature:    signature,
	}, nil
}
