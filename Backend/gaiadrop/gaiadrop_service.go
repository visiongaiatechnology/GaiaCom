// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package gaiadrop

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Service struct {
	store repository.Store
}

type SubmitInput struct {
	TargetGaiaID string                 `json:"targetGaiaId"`
	SenderLabel  string                 `json:"senderLabel"`
	Payload      map[string]interface{} `json:"payload"`
}

func NewService(store repository.Store) *Service {
	return &Service{store: store}
}

func (s *Service) Submit(ctx context.Context, input SubmitInput) (*models.GaiaDropSubmission, error) {
	targetGaiaID := strings.TrimSpace(input.TargetGaiaID)
	if err := validate.GaiaID(targetGaiaID); err != nil {
		return nil, errors.New("invalid target gaiaId")
	}
	if len(input.Payload) == 0 {
		return nil, errors.New("encrypted payload is required")
	}
	senderLabel := strings.TrimSpace(input.SenderLabel)
	if len(senderLabel) > 80 {
		return nil, errors.New("sender label too long")
	}

	payloadBytes, err := json.Marshal(input.Payload)
	if err != nil {
		return nil, errors.New("invalid encrypted payload")
	}
	if len(payloadBytes) > 64*1024 {
		return nil, errors.New("encrypted payload too large")
	}

	identity, err := s.store.FindIdentityByGaiaID(targetGaiaID)
	if err != nil {
		return nil, errors.New("drop target not found")
	}
	sum := sha256.Sum256(payloadBytes)
	drop := &models.GaiaDropSubmission{
		ID:               uuid.New(),
		TargetIdentityID: identity.ID,
		TargetGaiaID:     identity.GaiaID,
		SenderLabel:      senderLabel,
		Payload:          models.JSONB(payloadBytes),
		PayloadHash:      hex.EncodeToString(sum[:]),
		Status:           "new",
	}
	if err := s.store.CreateGaiaDropSubmission(ctx, drop); err != nil {
		return nil, err
	}
	return drop, nil
}

func (s *Service) ListForIdentity(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.GaiaDropSubmission, error) {
	if userID == uuid.Nil || identityID == uuid.Nil {
		return nil, errors.New("invalid gaia drop inbox request")
	}
	return s.store.FindGaiaDropSubmissionsForIdentity(ctx, userID, identityID)
}

func (s *Service) MarkAsRead(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error {
	if userID == uuid.Nil || dropID == uuid.Nil {
		return errors.New("invalid request params")
	}
	return s.store.MarkGaiaDropRead(ctx, userID, dropID)
}

func (s *Service) Delete(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error {
	if userID == uuid.Nil || dropID == uuid.Nil {
		return errors.New("invalid request params")
	}
	return s.store.DeleteGaiaDrop(ctx, userID, dropID)
}
