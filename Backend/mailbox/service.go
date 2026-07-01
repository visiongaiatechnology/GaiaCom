// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package mailbox

import (
	"context"
	"encoding/json"
	"errors"
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

func (s *Service) Messages(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query repository.MailboxQuery) ([]*models.MessageEnvelope, error) {
	if err := s.requireIdentity(ctx, userID, identityID); err != nil {
		return nil, err
	}
	query.Folder = cleanFolder(query.Folder)
	query.Text = trimLimit(query.Text, 256)
	query.From = trimLimit(query.From, 256)
	query.Subject = trimLimit(query.Subject, 256)
	query.Label = trimLimit(query.Label, 80)
	return s.store.FindMailboxMessages(ctx, userID, identityID, query)
}

func (s *Service) UpdateStates(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, states []models.MailboxState) error {
	if err := s.requireIdentity(ctx, userID, identityID); err != nil {
		return err
	}
	if len(states) == 0 || len(states) > 500 {
		return errors.New("invalid mailbox state batch")
	}
	clean := make([]models.MailboxState, 0, len(states))
	for _, state := range states {
		if state.MessageID == uuid.Nil {
			return errors.New("invalid message id")
		}
		state.UserID = userID
		state.IdentityID = identityID
		state.Folder = cleanFolder(state.Folder)
		if state.Folder == "" {
			state.Folder = "inbox"
		}
		if len(state.Labels) == 0 {
			state.Labels = models.JSONB(`[]`)
		} else if !json.Valid(state.Labels) {
			return errors.New("invalid label payload")
		}
		clean = append(clean, state)
	}
	return s.store.UpsertMailboxStates(ctx, userID, identityID, clean)
}

func (s *Service) Drafts(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.MailDraft, error) {
	if err := s.requireIdentity(ctx, userID, identityID); err != nil {
		return nil, err
	}
	return s.store.FindMailDrafts(ctx, userID, identityID)
}

func (s *Service) SaveDraft(ctx context.Context, userID uuid.UUID, draft *models.MailDraft) (*models.MailDraft, error) {
	if err := s.requireIdentity(ctx, userID, draft.IdentityID); err != nil {
		return nil, err
	}
	draft.UserID = userID
	draft.RecipientGaia = trimLimit(draft.RecipientGaia, 256)
	draft.Subject = trimLimit(draft.Subject, 512)
	draft.Body = trimLimit(draft.Body, 128*1024)
	draft.SecurityWarning = legacyWarning(draft.RecipientGaia, draft.SecurityWarning)
	if len(draft.RecipientIDs) == 0 {
		draft.RecipientIDs = models.JSONB(`[]`)
	}
	if len(draft.Attachments) > 0 && !json.Valid(draft.Attachments) {
		return nil, errors.New("invalid attachment payload")
	}
	if len(draft.EnvelopeDraft) > 0 && !json.Valid(draft.EnvelopeDraft) {
		return nil, errors.New("invalid envelope draft")
	}
	if err := s.store.SaveMailDraft(ctx, draft); err != nil {
		return nil, err
	}
	return draft, nil
}

func (s *Service) DeleteDraft(ctx context.Context, userID uuid.UUID, draftID uuid.UUID) error {
	if draftID == uuid.Nil {
		return errors.New("invalid draft id")
	}
	return s.store.DeleteMailDraft(ctx, userID, draftID)
}

func (s *Service) Labels(ctx context.Context, userID uuid.UUID) ([]models.MailLabel, error) {
	return s.store.FindMailLabels(ctx, userID)
}

func (s *Service) SaveLabel(ctx context.Context, userID uuid.UUID, label *models.MailLabel) (*models.MailLabel, error) {
	label.UserID = userID
	label.Name = trimLimit(label.Name, 80)
	label.Color = trimLimit(label.Color, 32)
	if label.Name == "" {
		return nil, errors.New("label name required")
	}
	if err := s.store.SaveMailLabel(ctx, label); err != nil {
		return nil, err
	}
	return label, nil
}

func (s *Service) Contacts(ctx context.Context, userID uuid.UUID, query string) ([]models.MailContact, error) {
	return s.store.FindMailContacts(ctx, userID, trimLimit(query, 128))
}

func (s *Service) SaveContact(ctx context.Context, userID uuid.UUID, contact *models.MailContact) (*models.MailContact, error) {
	contact.UserID = userID
	contact.GaiaID = trimLimit(contact.GaiaID, 256)
	contact.DisplayName = trimLimit(contact.DisplayName, 160)
	contact.Email = trimLimit(contact.Email, 256)
	contact.TrustNote = trimLimit(contact.TrustNote, 512)
	contact.PublicKey = trimLimit(contact.PublicKey, 512)
	if contact.GaiaID == "" && contact.Email == "" {
		return nil, errors.New("contact address required")
	}
	if err := s.store.SaveMailContact(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (s *Service) FilterRules(ctx context.Context, userID uuid.UUID) ([]models.MailFilterRule, error) {
	return s.store.FindMailFilterRules(ctx, userID)
}

func (s *Service) SaveFilterRule(ctx context.Context, userID uuid.UUID, rule *models.MailFilterRule) (*models.MailFilterRule, error) {
	rule.UserID = userID
	rule.SenderContains = trimLimit(rule.SenderContains, 256)
	rule.SubjectContains = trimLimit(rule.SubjectContains, 256)
	rule.AssignLabel = trimLimit(rule.AssignLabel, 80)
	rule.TargetFolder = cleanFolder(rule.TargetFolder)
	if rule.SenderContains == "" && rule.SubjectContains == "" {
		return nil, errors.New("filter condition required")
	}
	if rule.TargetFolder == "" && rule.AssignLabel == "" && !rule.MarkImportant {
		return nil, errors.New("filter action required")
	}
	if err := s.store.SaveMailFilterRule(ctx, rule); err != nil {
		return nil, err
	}
	return rule, nil
}

func (s *Service) Settings(ctx context.Context, userID uuid.UUID) (*models.MailSettings, error) {
	return s.store.GetMailSettings(ctx, userID)
}

func (s *Service) SaveSettings(ctx context.Context, userID uuid.UUID, settings *models.MailSettings) (*models.MailSettings, error) {
	settings.UserID = userID
	settings.Signature = trimLimit(settings.Signature, 4096)
	settings.Locale = trimLimit(settings.Locale, 16)
	settings.Theme = trimLimit(settings.Theme, 24)
	settings.KeyboardMode = trimLimit(settings.KeyboardMode, 24)
	if settings.Locale == "" {
		settings.Locale = "de"
	}
	if settings.Theme == "" {
		settings.Theme = "dark"
	}
	if settings.KeyboardMode == "" {
		settings.KeyboardMode = "default"
	}
	if err := s.store.SaveMailSettings(ctx, settings); err != nil {
		return nil, err
	}
	return settings, nil
}

func (s *Service) GlobalSearch(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query string, limit int) ([]models.GlobalSearchResult, error) {
	if err := s.requireIdentity(ctx, userID, identityID); err != nil {
		return nil, err
	}
	query = trimLimit(query, 256)
	if query == "" {
		return []models.GlobalSearchResult{}, nil
	}
	return s.store.GlobalSearch(ctx, userID, identityID, query, limit)
}

func (s *Service) requireIdentity(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) error {
	if userID == uuid.Nil || identityID == uuid.Nil {
		return errors.New("invalid identity")
	}
	ok, err := s.store.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("identity not authorized")
	}
	return nil
}

func cleanFolder(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "all":
		return strings.ToLower(strings.TrimSpace(value))
	case "inbox", "sent", "drafts", "trash", "archive", "spam", "snoozed":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "inbox"
	}
}

func trimLimit(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}

func legacyWarning(recipient string, provided string) string {
	if strings.TrimSpace(provided) != "" {
		return trimLimit(provided, 512)
	}
	if strings.Contains(recipient, "@") && !strings.HasPrefix(recipient, "@") {
		return "SMTP-Legacy: Nachricht verlässt den nativen GaiaCOM-Sicherheitskontext."
	}
	return ""
}

func parseRequestTime(value string) time.Time {
	if strings.TrimSpace(value) == "" {
		return time.Time{}
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed
	}
	return time.Time{}
}
