// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package presence

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const typingSignalWindow = 6 * time.Second

type typingSignal struct {
	actorGaiaID string
	peerGaiaID  string
	channelID   string
	expiresAt   time.Time
}

type Service struct {
	store repository.Store
	mu    sync.Mutex
	state map[string]typingSignal
}

func NewService(store repository.Store) *Service {
	return &Service{
		store: store,
		state: make(map[string]typingSignal),
	}
}

func (s *Service) Heartbeat(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, status string) (*models.IdentityPresence, error) {
	if userID == uuid.Nil || identityID == uuid.Nil {
		return nil, errors.New("invalid presence request")
	}
	return s.store.UpsertIdentityPresence(ctx, userID, identityID, status)
}

func (s *Service) Status(ctx context.Context, gaiaIDs []string) (map[string]models.IdentityPresence, error) {
	clean := make([]string, 0, len(gaiaIDs))
	for _, gaiaID := range gaiaIDs {
		value := strings.TrimSpace(gaiaID)
		if value == "" || len(value) > 256 {
			continue
		}
		clean = append(clean, value)
		if len(clean) >= 64 {
			break
		}
	}
	return s.store.FindIdentityPresenceByGaiaIDs(ctx, clean)
}

func (s *Service) UpdateTyping(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, isTyping bool) (*models.TypingStatusResponse, error) {
	identity, err := s.resolveOwnedIdentity(ctx, userID, identityID)
	if err != nil {
		return nil, err
	}

	scope, target, err := normalizeTypingScope(peerGaiaID, channelID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneExpiredLocked()

	key := typingStateKey(strings.ToLower(identity.GaiaID), scope, target)
	if !isTyping {
		delete(s.state, key)
		return &models.TypingStatusResponse{}, nil
	}

	s.state[key] = typingSignal{
		actorGaiaID: identity.GaiaID,
		peerGaiaID:  target,
		channelID:   target,
		expiresAt:   time.Now().UTC().Add(typingSignalWindow),
	}
	return &models.TypingStatusResponse{}, nil
}

func (s *Service) TypingStatus(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string) (*models.TypingStatusResponse, error) {
	identity, err := s.resolveOwnedIdentity(ctx, userID, identityID)
	if err != nil {
		return nil, err
	}

	scope, target, err := normalizeTypingScope(peerGaiaID, channelID)
	if err != nil {
		return nil, err
	}

	selfGaiaID := strings.ToLower(strings.TrimSpace(identity.GaiaID))

	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneExpiredLocked()

	response := &models.TypingStatusResponse{}
	if scope == "direct" {
		key := typingStateKey(strings.ToLower(target), scope, selfGaiaID)
		signal, ok := s.state[key]
		if ok {
			response.Direct = &models.DirectTypingState{
				ActorGaiaID: signal.actorGaiaID,
				IsTyping:    true,
			}
		}
		return response, nil
	}

	channelSignals := make([]models.ChannelTypingState, 0, 4)
	for _, signal := range s.state {
		if signal.channelID != target {
			continue
		}
		if strings.EqualFold(signal.actorGaiaID, identity.GaiaID) {
			continue
		}
		channelSignals = append(channelSignals, models.ChannelTypingState{
			ActorGaiaID: signal.actorGaiaID,
			IsTyping:    true,
		})
	}
	response.Channel = channelSignals
	return response, nil
}

func (s *Service) resolveOwnedIdentity(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) (*models.Identity, error) {
	if userID == uuid.Nil || identityID == uuid.Nil {
		return nil, errors.New("invalid typing request")
	}
	owned, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil || !owned {
		return nil, errors.New("identity not authorized")
	}
	identity, err := s.store.FindIdentityByID(identityID)
	if err != nil || identity == nil {
		return nil, errors.New("identity not found")
	}
	return identity, nil
}

func normalizeTypingScope(peerGaiaID string, channelID string) (string, string, error) {
	cleanPeer := strings.ToLower(strings.TrimSpace(peerGaiaID))
	cleanChannel := strings.TrimSpace(channelID)
	switch {
	case cleanPeer != "" && cleanChannel == "":
		return "direct", cleanPeer, nil
	case cleanChannel != "" && cleanPeer == "":
		return "channel", cleanChannel, nil
	default:
		return "", "", errors.New("invalid typing scope")
	}
}

func typingStateKey(actorGaiaID string, scope string, target string) string {
	return actorGaiaID + "|" + scope + "|" + target
}

func (s *Service) pruneExpiredLocked() {
	now := time.Now().UTC()
	for key, signal := range s.state {
		if signal.expiresAt.Before(now) {
			delete(s.state, key)
		}
	}
}
