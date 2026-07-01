// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package room

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
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
			role = "owner"
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

func (s *Service) UpdateRoom(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string, isPrivate *bool, readOnly *bool, slowModeSeconds *int, topSecret *bool) (*models.Room, error) {
	cleanName, cleanDescription, cleanAvatar, err := validateRoomMetadata(name, description, avatar)
	if err != nil {
		return nil, err
	}

	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("unauthorized: user is not an admin/owner of this room")
	}

	currentRoom, err := s.store.FindRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}

	pIsPrivate := currentRoom.IsPrivate
	if isPrivate != nil {
		pIsPrivate = *isPrivate
	}

	pReadOnly := currentRoom.ReadOnly
	if readOnly != nil {
		pReadOnly = *readOnly
	}

	pSlowModeSeconds := currentRoom.SlowModeSeconds
	if slowModeSeconds != nil {
		pSlowModeSeconds = *slowModeSeconds
	}

	pTopSecret := currentRoom.TopSecret
	if topSecret != nil {
		if currentRoom.TopSecret && !*topSecret {
			return nil, errors.New("top secret downgrade rejected")
		}
		if *topSecret {
			if err := requireTopSecretCapabilities(currentRoom); err != nil {
				return nil, err
			}
		}
		pTopSecret = *topSecret
	}

	updatedRoom, err := s.store.UpdateRoomSettingsForUser(ctx, userID, roomID, cleanName, cleanDescription, cleanAvatar, pIsPrivate, pReadOnly, pSlowModeSeconds, pTopSecret)
	if err != nil {
		return nil, err
	}

	// Create moderation log
	actorIdentity, err := s.getIdentityForUserInRoom(ctx, userID, roomID)
	if err == nil && actorIdentity != nil {
		_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
			RoomID:          roomID,
			ActorIdentityID: *actorIdentity,
			Action:          "update_settings",
			Details:         fmt.Sprintf("Updated settings: name=%s, private=%v, read_only=%v, slow_mode=%d, top_secret=%v", cleanName, pIsPrivate, pReadOnly, pSlowModeSeconds, pTopSecret),
		})
	}

	return updatedRoom, nil
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

func (s *Service) KickMember(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, targetID uuid.UUID) error {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("unauthorized: only admins or owners can kick members")
	}

	room, err := s.store.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}

	var actorIdentity *uuid.UUID
	var targetMember *models.RoomMember
	for i := range room.Members {
		if room.Members[i].Identity.UserID == userID {
			actorIdentity = &room.Members[i].IdentityID
		}
		if room.Members[i].IdentityID == targetID {
			targetMember = &room.Members[i]
		}
	}

	if targetMember == nil {
		return errors.New("target member not found in room")
	}

	actorRole := "admin"
	for _, m := range room.Members {
		if m.Identity.UserID == userID {
			actorRole = m.Role
			break
		}
	}

	if targetMember.Role == "owner" {
		return errors.New("cannot kick the owner of the room")
	}
	if targetMember.Role == "admin" && actorRole != "owner" {
		return errors.New("only the owner can kick admins")
	}

	err = s.store.RemoveRoomMember(ctx, roomID, targetID)
	if err != nil {
		return err
	}

	if actorIdentity != nil {
		_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
			RoomID:          roomID,
			ActorIdentityID: *actorIdentity,
			Action:          "kick",
			TargetID:        targetID.String(),
			Details:         fmt.Sprintf("Kicked member %s", targetID.String()),
		})
	}
	return nil
}

func (s *Service) TransferOwnership(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, targetID uuid.UUID) error {
	room, err := s.store.FindRoomByID(ctx, roomID)
	if err != nil {
		return err
	}

	var actorMember *models.RoomMember
	var targetMember *models.RoomMember
	for i := range room.Members {
		if room.Members[i].Identity.UserID == userID {
			actorMember = &room.Members[i]
		}
		if room.Members[i].IdentityID == targetID {
			targetMember = &room.Members[i]
		}
	}

	if actorMember == nil || actorMember.Role != "owner" {
		return errors.New("unauthorized: only the owner can transfer ownership")
	}
	if targetMember == nil {
		return errors.New("target member not found in room")
	}

	err = s.store.UpdateRoomMemberRoleForUser(ctx, userID, roomID, actorMember.IdentityID, "admin")
	if err != nil {
		return err
	}
	err = s.store.UpdateRoomMemberRoleForUser(ctx, userID, roomID, targetID, "owner")
	if err != nil {
		_ = s.store.UpdateRoomMemberRoleForUser(ctx, userID, roomID, actorMember.IdentityID, "owner")
		return err
	}

	_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
		RoomID:          roomID,
		ActorIdentityID: actorMember.IdentityID,
		Action:          "transfer_ownership",
		TargetID:        targetID.String(),
		Details:         fmt.Sprintf("Transferred room ownership to %s", targetID.String()),
	})

	return nil
}

func (s *Service) ToggleRoomMessagePin(ctx context.Context, userID uuid.UUID, roomID, channelID, messageID uuid.UUID, identityID uuid.UUID) (bool, error) {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return false, err
	}
	if !ownsIdentity {
		return false, errors.New("unauthorized: identity does not belong to user")
	}

	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return false, err
	}
	if !isAdmin {
		return false, errors.New("unauthorized: only admins can pin/unpin messages")
	}

	pinned, err := s.store.ToggleRoomMessagePin(ctx, roomID, channelID, messageID, identityID)
	if err != nil {
		return false, err
	}

	actionStr := "unpin"
	if pinned {
		actionStr = "pin"
	}

	_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
		RoomID:          roomID,
		ActorIdentityID: identityID,
		Action:          actionStr,
		TargetID:        messageID.String(),
		Details:         fmt.Sprintf("Toggled pin state of message %s to %v", messageID.String(), pinned),
	})

	return pinned, nil
}

func (s *Service) GetRoomPinnedMessages(ctx context.Context, roomID, channelID uuid.UUID) ([]uuid.UUID, error) {
	return s.store.GetRoomPinnedMessages(ctx, roomID, channelID)
}

func (s *Service) CreateRoomInviteLink(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, identityID uuid.UUID, expiresAfterSeconds int, maxUses int) (*models.RoomInviteLink, error) {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("unauthorized: identity does not belong to user")
	}

	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("unauthorized: only admins can create invite links")
	}

	token := uuid.New().String()
	expiry := time.Now().Add(time.Duration(expiresAfterSeconds) * time.Second)
	if expiresAfterSeconds <= 0 {
		expiry = time.Now().Add(365 * 24 * time.Hour)
	}

	invite := &models.RoomInviteLink{
		ID:        token,
		RoomID:    roomID,
		CreatedBy: identityID,
		ExpiresAt: expiry,
		MaxUses:   maxUses,
		Uses:      0,
		CreatedAt: time.Now().UTC(),
	}

	err = s.store.CreateRoomInviteLink(ctx, invite)
	if err != nil {
		return nil, err
	}

	_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
		RoomID:          roomID,
		ActorIdentityID: identityID,
		Action:          "create_invite",
		TargetID:        token,
		Details:         fmt.Sprintf("Created invite link with token %s (max uses: %d)", token, maxUses),
	})

	return invite, nil
}

func (s *Service) JoinRoomViaInviteLink(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, token string) (*models.Room, error) {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("unauthorized: identity does not belong to user")
	}

	invite, err := s.store.FindRoomInviteLink(ctx, token)
	if err != nil {
		return nil, errors.New("invite link not found")
	}

	if time.Now().After(invite.ExpiresAt) {
		return nil, errors.New("invite link has expired")
	}

	if invite.MaxUses > 0 && invite.Uses >= invite.MaxUses {
		return nil, errors.New("invite link has reached max usage limit")
	}

	room, err := s.store.FindRoomByID(ctx, invite.RoomID)
	if err != nil {
		return nil, err
	}

	for _, m := range room.Members {
		if m.IdentityID == identityID {
			return room, nil
		}
	}

	err = s.store.AddRoomMember(ctx, invite.RoomID, identityID, "member")
	if err != nil {
		return nil, err
	}

	err = s.store.UseRoomInviteLink(ctx, token)
	if err != nil {
		log.Printf("Warning: failed to increment invite link uses: %v", err)
	}

	return s.store.FindRoomByID(ctx, invite.RoomID)
}

func (s *Service) CreateRoomJoinRequest(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, roomID uuid.UUID) (*models.RoomJoinRequest, error) {
	ownsIdentity, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("unauthorized: identity does not belong to user")
	}

	req := &models.RoomJoinRequest{
		ID:         uuid.New(),
		RoomID:     roomID,
		IdentityID: identityID,
		Status:     "pending",
	}

	err = s.store.CreateRoomJoinRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	return req, nil
}

func (s *Service) GetRoomJoinRequests(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) ([]models.RoomJoinRequest, error) {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("unauthorized: only admins can view join requests")
	}

	return s.store.FindRoomJoinRequests(ctx, roomID)
}

func (s *Service) ModerateRoomJoinRequest(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, reqID uuid.UUID, status string) error {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("unauthorized: only admins can moderate join requests")
	}

	status = strings.ToLower(strings.TrimSpace(status))
	if status != "approved" && status != "rejected" {
		return errors.New("invalid status: must be approved or rejected")
	}

	req, err := s.store.ModerateRoomJoinRequest(ctx, reqID, status)
	if err != nil {
		return err
	}

	if status == "approved" {
		err = s.store.AddRoomMember(ctx, roomID, req.IdentityID, "member")
		if err != nil {
			return err
		}
	}

	actorIdentity, err := s.getIdentityForUserInRoom(ctx, userID, roomID)
	if err == nil && actorIdentity != nil {
		_ = s.store.CreateRoomModerationLog(ctx, &models.RoomModerationLog{
			RoomID:          roomID,
			ActorIdentityID: *actorIdentity,
			Action:          "moderate_join_request",
			TargetID:        req.IdentityID.String(),
			Details:         fmt.Sprintf("Moderate join request: %s (status: %s)", reqID.String(), status),
		})
	}

	return nil
}

func (s *Service) GetRoomModerationLogs(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) ([]models.RoomModerationLog, error) {
	isAdmin, err := s.store.UserIsRoomAdmin(ctx, userID, roomID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("unauthorized: only admins can view moderation logs")
	}

	return s.store.GetRoomModerationLogs(ctx, roomID)
}

func (s *Service) SearchPublicRooms(ctx context.Context, query string) ([]models.Room, error) {
	return s.store.SearchPublicRooms(ctx, query)
}

func (s *Service) getIdentityForUserInRoom(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) (*uuid.UUID, error) {
	room, err := s.store.FindRoomByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	for _, m := range room.Members {
		if m.Identity.UserID == userID {
			return &m.IdentityID, nil
		}
	}
	return nil, errors.New("user is not a member of the room")
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

func requireTopSecretCapabilities(room *models.Room) error {
	for _, member := range room.Members {
		if member.Identity.ID == uuid.Nil {
			return errors.New("top secret requires resolvable member identities")
		}
		var record struct {
			PublicKeys struct {
				MLDSA87 string `json:"mldsa87"`
			} `json:"public_keys"`
		}
		if err := json.Unmarshal(member.Identity.PublicRecord, &record); err != nil {
			return errors.New("top secret requires valid member public records")
		}
		if strings.TrimSpace(record.PublicKeys.MLDSA87) == "" {
			return errors.New("top secret requires ML-DSA-87 capable clients")
		}
	}
	return nil
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
