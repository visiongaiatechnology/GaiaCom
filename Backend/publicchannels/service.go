// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package publicchannels

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const (
	maxChannelNameLength        = 80
	maxChannelDescriptionLength = 600
	maxPostBodyLength           = 3000
	maxCommentBodyLength        = 1000
	maxAvatarJSONBytes          = 8192
	maxAttachmentJSONBytes      = 2 * 1024 * 1024
)

var allowedPostReactionEmojis = map[string]struct{}{
	"\U0001F44D":       {},
	"\u2764\uFE0F":     {},
	"\U0001F602":       {},
	"\U0001F62E":       {},
	"\U0001F622":       {},
	"\U0001F525":       {},
	"\u2728":           {},
	"\U0001F6E1\uFE0F": {},
}

type Service struct {
	store repository.Store
}

func NewService(store repository.Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]models.PublicChannel, error) {
	return s.store.FindPublicChannelsForUser(ctx, userID)
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, name string, description string, category string, avatar models.JSONB) (*models.PublicChannel, error) {
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.New("unauthorized identity")
	}
	cleanName, cleanDescription, cleanAvatar, err := validateChannelMetadata(name, description, avatar)
	if err != nil {
		return nil, err
	}
	channel := &models.PublicChannel{
		Name:        cleanName,
		Description: cleanDescription,
		Avatar:      cleanAvatar,
		Category:    category,
	}
	if err := s.store.CreatePublicChannel(ctx, channel, identityID); err != nil {
		return nil, err
	}
	return s.store.FindPublicChannelByIDForUser(ctx, userID, channel.ID)
}

func (s *Service) Update(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, name string, description string, category string, avatar models.JSONB) (*models.PublicChannel, error) {
	cleanName, cleanDescription, cleanAvatar, err := validateChannelMetadata(name, description, avatar)
	if err != nil {
		return nil, err
	}
	channel, err := s.store.UpdatePublicChannelForAdmin(ctx, userID, channelID, cleanName, cleanDescription, category, cleanAvatar)
	if err != nil {
		return nil, errors.New("unauthorized or channel not found")
	}
	return channel, nil
}

func (s *Service) UpdateCommentsEnabled(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, enabled bool) (*models.PublicChannel, error) {
	channel, err := s.store.UpdatePublicChannelCommentsForAdmin(ctx, userID, channelID, enabled)
	if err != nil {
		return nil, errors.New("unauthorized or channel not found")
	}
	return channel, nil
}

func (s *Service) Delete(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) error {
	return s.store.DeletePublicChannel(ctx, userID, channelID)
}

func (s *Service) Subscribe(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) (*models.PublicChannel, error) {
	if err := s.store.SubscribePublicChannel(ctx, userID, identityID, channelID); err != nil {
		return nil, errors.New("subscription rejected")
	}
	return s.store.FindPublicChannelByIDForUser(ctx, userID, channelID)
}

func (s *Service) Unsubscribe(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) (*models.PublicChannel, error) {
	if err := s.store.UnsubscribePublicChannel(ctx, userID, identityID, channelID); err != nil {
		return nil, errors.New("subscription update rejected")
	}
	return s.store.FindPublicChannelByIDForUser(ctx, userID, channelID)
}

func (s *Service) CreatePost(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, authorIdentityID uuid.UUID, body string, formatting models.JSONB, attachments models.JSONB, scheduledFor string) (*models.PublicChannelPost, error) {
	channel, err := s.store.FindPublicChannelByIDForUser(ctx, userID, channelID)
	if err != nil || channel == nil {
		return nil, errors.New("channel not found")
	}
	if channel.IsSuspended {
		return nil, errors.New("cannot publish: this channel has been suspended by Abuse Consensus")
	}

	if ok, err := s.store.IdentityBelongsToUser(authorIdentityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.New("unauthorized identity")
	}
	cleanBody := strings.TrimSpace(body)
	if cleanBody == "" && len(attachments) == 0 {
		return nil, errors.New("post content required")
	}
	if len([]rune(cleanBody)) > maxPostBodyLength {
		return nil, errors.New("post text exceeds 3000 characters")
	}
	cleanFormatting, err := validateJSONEnvelope(formatting, 8192)
	if err != nil {
		return nil, err
	}
	cleanAttachments, err := validateJSONEnvelope(attachments, maxAttachmentJSONBytes)
	if err != nil {
		return nil, err
	}
	post := &models.PublicChannelPost{
		ChannelID:        channelID,
		AuthorIdentityID: authorIdentityID,
		Body:             cleanBody,
		Formatting:       cleanFormatting,
		Attachments:      cleanAttachments,
		ScheduledFor:     scheduledFor,
	}
	if err := s.store.CreatePublicChannelPostForAdmin(ctx, userID, post); err != nil {
		return nil, errors.New("only channel admins can publish")
	}
	return post, nil
}

func (s *Service) ListPosts(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID, limit int) ([]models.PublicChannelPost, error) {
	if identityID != uuid.Nil {
		if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
			return nil, err
		} else if !ok {
			return nil, errors.New("unauthorized identity")
		}
	}
	return s.store.FindPublicChannelPostsForUser(ctx, userID, identityID, channelID, limit)
}

func (s *Service) TogglePostReaction(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, emoji string) (*models.PublicChannelPostReactionState, error) {
	if userID == uuid.Nil || identityID == uuid.Nil || postID == uuid.Nil {
		return nil, errors.New("invalid reaction request")
	}
	cleanEmoji := strings.TrimSpace(emoji)
	if _, ok := allowedPostReactionEmojis[cleanEmoji]; !ok {
		return nil, errors.New("unsupported reaction")
	}
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.New("unauthorized identity")
	}
	return s.store.TogglePublicChannelPostReactionForUser(ctx, userID, identityID, postID, cleanEmoji)
}

func (s *Service) CreatePostComment(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, body string) (*models.PublicChannelPostComment, error) {
	if userID == uuid.Nil || identityID == uuid.Nil || postID == uuid.Nil {
		return nil, errors.New("invalid comment request")
	}
	cleanBody := strings.TrimSpace(body)
	if cleanBody == "" {
		return nil, errors.New("comment body required")
	}
	if len([]rune(cleanBody)) > maxCommentBodyLength {
		return nil, errors.New("comment exceeds 1000 characters")
	}
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.New("unauthorized identity")
	}
	return s.store.CreatePublicChannelPostCommentForUser(ctx, userID, identityID, postID, cleanBody)
}

func (s *Service) UpdatePostPin(ctx context.Context, userID uuid.UUID, postID uuid.UUID, pinned bool) (*models.PublicChannelPost, error) {
	if userID == uuid.Nil || postID == uuid.Nil {
		return nil, errors.New("invalid pin request")
	}
	post, err := s.store.UpdatePublicChannelPostPinForAdmin(ctx, userID, postID, pinned)
	if err != nil {
		return nil, errors.New("only channel admins can pin posts")
	}
	return post, nil
}

func (s *Service) Block(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error {
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return err
	} else if !ok {
		return errors.New("unauthorized identity")
	}
	return s.store.BlockPublicChannel(ctx, identityID, channelID)
}

func (s *Service) Unblock(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error {
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return err
	} else if !ok {
		return errors.New("unauthorized identity")
	}
	return s.store.UnblockPublicChannel(ctx, identityID, channelID)
}

func (s *Service) Discover(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query string, category string) ([]models.PublicChannel, error) {
	if ok, err := s.store.IdentityBelongsToUser(identityID, userID); err != nil {
		return nil, err
	} else if !ok {
		return nil, errors.New("unauthorized identity")
	}
	return s.store.SearchDiscoverablePublicChannels(ctx, userID, identityID, query, category)
}

func (s *Service) DeleteComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID) error {
	return s.store.DeletePublicChannelCommentForAdmin(ctx, userID, commentID)
}

func (s *Service) ModerateComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID, status string) error {
	cleanStatus := strings.ToLower(strings.TrimSpace(status))
	if cleanStatus != "approved" && cleanStatus != "hidden" && cleanStatus != "deleted" {
		return errors.New("invalid moderation status")
	}
	return s.store.ModeratePublicChannelComment(ctx, userID, commentID, cleanStatus)
}

func validateChannelMetadata(name string, description string, avatar models.JSONB) (string, string, models.JSONB, error) {
	cleanName := strings.TrimSpace(name)
	if !strings.HasPrefix(cleanName, "@") {
		cleanName = "@" + cleanName
	}
	cleanDescription := strings.TrimSpace(description)
	if len(cleanName) < 2 || len([]rune(cleanName)) > maxChannelNameLength {
		return "", "", nil, errors.New("invalid channel name")
	}
	if len([]rune(cleanDescription)) > maxChannelDescriptionLength {
		return "", "", nil, errors.New("invalid channel description")
	}
	cleanAvatar, err := validateJSONEnvelope(avatar, maxAvatarJSONBytes)
	if err != nil {
		return "", "", nil, err
	}
	return cleanName, cleanDescription, cleanAvatar, nil
}

func validateJSONEnvelope(value models.JSONB, maxBytes int) (models.JSONB, error) {
	if len(value) == 0 || string(value) == "null" {
		return nil, nil
	}
	if len(value) > maxBytes {
		return nil, errors.New("metadata envelope too large")
	}
	if !json.Valid(value) {
		return nil, errors.New("invalid metadata envelope")
	}
	return value, nil
}
