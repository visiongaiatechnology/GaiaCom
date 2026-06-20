package room

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Service struct {
	store repository.Store
}

func NewService(store repository.Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateRoom(ctx context.Context, userID uuid.UUID, req *CreateRoomRequest) (*models.Room, error) {
	name, description, avatar, err := validateRoomMetadata(req.Name, req.Description, req.Avatar)
	if err != nil {
		return nil, err
	}
	if len(req.MemberIDs) == 0 || len(req.MemberIDs) > 512 {
		return nil, errors.New("invalid room member set")
	}

	creatorID, err := uuid.Parse(req.MemberIDs[0])
	if err != nil {
		return nil, fmt.Errorf("invalid creator identity: %w", err)
	}

	ownsIdentity, err := s.store.IdentityBelongsToUser(creatorID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("unauthorized: creator identity does not belong to the user")
	}

	// Generate a unique global cryptographic secret hash for joining
	hashInput := fmt.Sprintf("%s:%s:%d", name, creatorID.String(), time.Now().UnixNano())
	sum := sha256.Sum256([]byte(hashInput))
	secretHash := hex.EncodeToString(sum[:])

	now := time.Now().UTC()
	room := &models.Room{
		ID:          uuid.New(),
		Name:        name,
		IsPrivate:   !req.IsPublic,
		CreatedBy:   creatorID,
		Description: description,
		Avatar:      avatar,
		SecretHash:  secretHash,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	members := make([]models.RoomMember, 0, len(req.MemberIDs))
	for _, memberIDStr := range req.MemberIDs {
		memberID, err := uuid.Parse(memberIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid room member identity: %w", err)
		}

		role := "member"
		if memberID == creatorID {
			role = "admin"
		}

		members = append(members, models.RoomMember{
			RoomID:     room.ID,
			IdentityID: memberID,
			Role:       role,
			JoinedAt:   now,
		})
	}

	err = s.store.CreateRoomWithMembers(ctx, room, members)
	if err != nil {
		return nil, fmt.Errorf("room could not be created: %w", err)
	}

	// Auto-create standard #general channel for topic chat
	generalChannel := &models.Channel{
		ID:        uuid.New(),
		RoomID:    room.ID,
		Name:      "general",
		CreatedAt: now,
	}
	_ = s.store.CreateChannel(ctx, generalChannel)

	return s.store.FindRoomByID(ctx, room.ID)
}

func (s *Service) GetRooms(ctx context.Context, userID uuid.UUID) ([]models.Room, error) {
	rooms, err := s.store.FindRooms(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("rooms could not be loaded: %w", err)
	}
	return rooms, nil
}

func (s *Service) UpdateRoom(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string) (*models.Room, error) {
	cleanName, cleanDescription, cleanAvatar, err := validateRoomMetadata(name, description, avatar)
	if err != nil {
		return nil, err
	}

	room, err := s.store.UpdateRoomMetadataForUser(ctx, userID, roomID, cleanName, cleanDescription, cleanAvatar)
	if err != nil {
		return nil, errors.New("unauthorized or room not found")
	}
	return room, nil
}

func (s *Service) GetRoomByID(ctx context.Context, roomID uuid.UUID) (*models.Room, error) {
	return s.store.FindRoomByID(ctx, roomID)
}

func (s *Service) JoinRoomByHash(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, hash string) (*models.Room, error) {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("unauthorized: identity does not belong to the user")
	}

	room, err := s.store.FindRoomBySecretHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("room hash not found: %w", err)
	}

	// Check if already a member
	for _, m := range room.Members {
		if m.IdentityID == identityID {
			return room, nil // Already member
		}
	}

	err = s.store.AddRoomMember(ctx, room.ID, identityID, "member")
	if err != nil {
		return nil, fmt.Errorf("failed to join room: %w", err)
	}

	// Reload room with new members
	return s.store.FindRoomByID(ctx, room.ID)
}

func (s *Service) LeaveRoom(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, identityID uuid.UUID) error {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return err
	}
	if !ownsIdentity {
		return errors.New("unauthorized: identity does not belong to the user")
	}
	return s.store.RemoveRoomMember(ctx, roomID, identityID)
}

func (s *Service) UpdateMemberRole(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, targetID uuid.UUID, role string) error {
	role = strings.TrimSpace(role)
	if role != "admin" && role != "member" {
		return errors.New("invalid member role")
	}

	if err := s.store.UpdateRoomMemberRoleForUser(ctx, userID, roomID, targetID, role); err != nil {
		return errors.New("unauthorized or member not found")
	}
	return nil
}

func (s *Service) CreateChannel(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string) (*models.Channel, error) {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("unauthorized: user is not a group admin")
	}

	cleanName := strings.TrimSpace(name)
	if len(cleanName) < 1 || len(cleanName) > 80 {
		return nil, errors.New("invalid channel name")
	}

	channel := &models.Channel{
		ID:        uuid.New(),
		RoomID:    roomID,
		Name:      cleanName,
		CreatedAt: time.Now().UTC(),
	}

	err = s.store.CreateChannel(ctx, channel)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (s *Service) GetChannels(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) ([]models.Channel, error) {
	room, err := s.store.FindRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}

	if room.IsPrivate {
		isMember := false
		for _, m := range room.Members {
			if m.Identity.UserID == userID {
				isMember = true
				break
			}
		}
		if !isMember {
			return nil, errors.New("unauthorized: user is not a member of this private room")
		}
	}

	return s.store.FindChannelsByRoom(ctx, roomID)
}

func (s *Service) DeleteRoom(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) error {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("unauthorized: user is not a group admin")
	}
	return s.store.DeleteRoom(ctx, roomID)
}


func validateRoomMetadata(name string, description string, avatar string) (string, string, string, error) {
	cleanName := strings.TrimSpace(name)
	cleanDescription := strings.TrimSpace(description)
	cleanAvatar := strings.TrimSpace(avatar)

	if len(cleanName) < 1 || len(cleanName) > 80 {
		return "", "", "", errors.New("invalid room name")
	}
	if len(cleanDescription) > 500 {
		return "", "", "", errors.New("invalid room description")
	}
	if !validRoomAvatar(cleanAvatar) {
		return "", "", "", errors.New("invalid room avatar")
	}
	return cleanName, cleanDescription, cleanAvatar, nil
}

func validRoomAvatar(value string) bool {
	if value == "" {
		return true
	}
	lower := strings.ToLower(value)
	if strings.HasPrefix(lower, "http://") ||
		strings.HasPrefix(lower, "https://") ||
		strings.HasPrefix(lower, "javascript:") ||
		strings.HasPrefix(lower, "data:") ||
		strings.ContainsAny(value, "/\\<>") {
		return false
	}
	return len([]rune(value)) <= 16 && len(value) <= 64
}
