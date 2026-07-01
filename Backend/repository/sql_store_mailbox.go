// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

const defaultMailboxLimit = 100

func (s *SQLStore) FindMailboxMessages(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query MailboxQuery) ([]*models.MessageEnvelope, error) {
	limit := query.Limit
	if limit <= 0 || limit > 250 {
		limit = defaultMailboxLimit
	}

	folder := normalizeFolder(query.Folder)
	if folder == "" {
		folder = "inbox"
	}

	where := []string{
		`i.user_id = ?`,
		`i.id = ?`,
		`i.is_active = 1`,
		`me.replaced_by_message_id = ''`,
		`(EXISTS (SELECT 1 FROM inboxes ib WHERE ib.identity_id = i.id AND ib.message_id = me.id) OR me.sender = i.gaia_id COLLATE NOCASE)`,
	}
	args := []interface{}{userID, identityID}

	if folder != "all" {
		if folder == "sent" {
			where = append(where, `COALESCE(ms.folder, CASE WHEN me.sender = i.gaia_id COLLATE NOCASE THEN 'sent' ELSE 'inbox' END) = 'sent'`)
		} else {
			where = append(where, `COALESCE(ms.folder, CASE WHEN me.sender = i.gaia_id COLLATE NOCASE THEN 'sent' ELSE 'inbox' END) = ?`)
			args = append(args, folder)
		}
	}
	if query.Unread {
		where = append(where, `COALESCE(ms.is_read, ib.is_read, 0) = 0`)
	}
	if query.Starred {
		where = append(where, `COALESCE(ms.is_starred, 0) = 1`)
	}
	if query.Important {
		where = append(where, `COALESCE(ms.is_important, 0) = 1`)
	}
	if query.Label != "" {
		where = append(where, `COALESCE(ms.labels, '[]') LIKE ?`)
		args = append(args, "%"+escapeLike(query.Label)+"%")
	}
	if query.From != "" {
		where = append(where, `LOWER(me.sender) LIKE ?`)
		args = append(args, "%"+strings.ToLower(query.From)+"%")
	}
	if query.Subject != "" {
		where = append(where, `LOWER(COALESCE(CAST(me.payload AS TEXT), '')) LIKE ?`)
		args = append(args, "%"+strings.ToLower(query.Subject)+"%")
	}
	if query.Text != "" {
		needle := "%" + strings.ToLower(query.Text) + "%"
		where = append(where, `(LOWER(me.sender) LIKE ? OR LOWER(me.recipient) LIKE ? OR LOWER(COALESCE(CAST(me.payload AS TEXT), '')) LIKE ?)`)
		args = append(args, needle, needle, needle)
	}
	if !query.DateFrom.IsZero() {
		where = append(where, `me.created_at >= ?`)
		args = append(args, formatTime(query.DateFrom))
	}
	if !query.DateTo.IsZero() {
		where = append(where, `me.created_at <= ?`)
		args = append(args, formatTime(query.DateTo))
	}

	args = append(args, limit)
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT me.id, me.type, me.sender, me.recipient, me.payload, me.signature, me.channel_id, me.read_receipt_source_id, me.client_message_id, me.replaced_by_message_id, me.edited_at, me.created_at,
			COALESCE(ms.folder, CASE WHEN me.sender = i.gaia_id COLLATE NOCASE THEN 'sent' ELSE 'inbox' END),
			CASE
				WHEN me.sender = i.gaia_id COLLATE NOCASE THEN
					CASE
						WHEN me.read_receipt_source_id != '' THEN
							CASE WHEN EXISTS (
								SELECT 1 FROM message_read_receipts mrr
								WHERE mrr.message_id = me.read_receipt_source_id
							) THEN 1 ELSE 0 END
						ELSE COALESCE(ms.is_read, 1)
					END
				ELSE COALESCE(ms.is_read, ib.is_read, 0)
			END,
			COALESCE(ib.delivered, CASE WHEN me.sender = i.gaia_id COLLATE NOCASE THEN 1 ELSE 0 END, 0),
			COALESCE(ms.is_starred, 0),
			COALESCE(ms.is_important, 0),
			COALESCE(ms.is_spam, 0),
			COALESCE(ms.is_archived, 0),
			COALESCE(ms.labels, '[]'),
			COALESCE(ms.snoozed_until, ''),
			COALESCE(ms.updated_at, me.created_at)
		 FROM identities i
		 JOIN message_envelopes me ON 1 = 1
		 LEFT JOIN inboxes ib ON ib.identity_id = i.id AND ib.message_id = me.id
		 LEFT JOIN mailbox_states ms ON ms.user_id = i.user_id AND ms.identity_id = i.id AND ms.message_id = me.id
		 WHERE `+strings.Join(where, " AND ")+`
		 ORDER BY me.created_at DESC
		 LIMIT ?`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]*models.MessageEnvelope, 0, limit)
	var messageIDs []uuid.UUID
	for rows.Next() {
		message, err := scanMailboxMessageRows(rows, userID, identityID)
		if err != nil {
			return nil, err
		}
		messages = append(messages, message)
		messageIDs = append(messageIDs, message.ID)
	}

	if len(messageIDs) > 0 {
		reactionsMap, err := s.FindMessageReactionsForUser(ctx, userID, identityID, messageIDs)
		if err != nil {
			return nil, err
		}
		for _, message := range messages {
			if rState, ok := reactionsMap[message.ID]; ok {
				if rState.Reactions != nil {
					message.Reactions = rState.Reactions
				} else {
					message.Reactions = map[string]int{}
				}
				if rState.ReactedByMe != nil {
					message.ReactedByMe = rState.ReactedByMe
				} else {
					message.ReactedByMe = map[string]bool{}
				}
			} else {
				message.Reactions = map[string]int{}
				message.ReactedByMe = map[string]bool{}
			}
		}
	}

	return messages, rows.Err()
}

func (s *SQLStore) UpsertMailboxStates(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, states []models.MailboxState) error {
	if len(states) == 0 {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollbackUnlessCommitted(tx, &err)

	now := formatTime(utcNow())
	for _, state := range states {
		folder := normalizeFolder(state.Folder)
		if folder == "" {
			folder = "inbox"
		}
		labels := state.Labels
		if len(labels) == 0 {
			labels = models.JSONB(`[]`)
		}
		_, err = tx.ExecContext(
			ctx,
			`INSERT INTO mailbox_states
			 (user_id, identity_id, message_id, folder, is_read, is_starred, is_important, is_spam, is_archived, labels, snoozed_until, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, identity_id, message_id) DO UPDATE SET
			 folder = excluded.folder,
			 is_read = excluded.is_read,
			 is_starred = excluded.is_starred,
			 is_important = excluded.is_important,
			 is_spam = excluded.is_spam,
			 is_archived = excluded.is_archived,
			 labels = excluded.labels,
			 snoozed_until = excluded.snoozed_until,
			 updated_at = excluded.updated_at`,
			userID,
			identityID,
			state.MessageID,
			folder,
			boolToInt(state.IsRead),
			boolToInt(state.IsStarred),
			boolToInt(state.IsImportant),
			boolToInt(state.IsSpam),
			boolToInt(state.IsArchived || folder == "archive"),
			string(labels),
			formatTime(state.SnoozedUntil),
			now,
		)
		if err != nil {
			return err
		}
		if state.IsRead {
			_, err = tx.ExecContext(ctx, `UPDATE inboxes SET is_read = 1 WHERE identity_id = ? AND message_id = ?`, identityID, state.MessageID)
			if err != nil {
				return err
			}
		}
	}
	err = tx.Commit()
	return err
}

func (s *SQLStore) FindMailDrafts(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.MailDraft, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, identity_id, recipient_gaia, recipient_ids, subject, body, envelope_draft, attachments, scheduled_for, security_warning, created_at, updated_at
		 FROM mail_drafts
		 WHERE user_id = ? AND identity_id = ?
		 ORDER BY updated_at DESC`,
		userID,
		identityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	drafts := make([]models.MailDraft, 0)
	for rows.Next() {
		draft, err := scanMailDraftRows(rows)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, draft)
	}
	return drafts, rows.Err()
}

func (s *SQLStore) FindDueMailDrafts(ctx context.Context, now time.Time) ([]models.MailDraft, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, identity_id, recipient_gaia, recipient_ids, subject, body, envelope_draft, attachments, scheduled_for, security_warning, created_at, updated_at
		 FROM mail_drafts
		 WHERE scheduled_for != '' AND datetime(scheduled_for) <= datetime(?)
		 ORDER BY scheduled_for ASC`,
		formatTime(now),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	drafts := make([]models.MailDraft, 0)
	for rows.Next() {
		draft, err := scanMailDraftRows(rows)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, draft)
	}
	return drafts, rows.Err()
}

func (s *SQLStore) SaveMailDraft(ctx context.Context, draft *models.MailDraft) error {
	now := utcNow()
	if draft.ID == uuid.Nil {
		draft.ID = uuid.New()
		draft.CreatedAt = now
	}
	draft.UpdatedAt = now
	if len(draft.RecipientIDs) == 0 {
		draft.RecipientIDs = models.JSONB(`[]`)
	}
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO mail_drafts (id, user_id, identity_id, recipient_gaia, recipient_ids, subject, body, envelope_draft, attachments, scheduled_for, security_warning, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		 recipient_gaia = excluded.recipient_gaia,
		 recipient_ids = excluded.recipient_ids,
		 subject = excluded.subject,
		 body = excluded.body,
		 envelope_draft = excluded.envelope_draft,
		 attachments = excluded.attachments,
		 scheduled_for = excluded.scheduled_for,
		 security_warning = excluded.security_warning,
		 updated_at = excluded.updated_at`,
		draft.ID,
		draft.UserID,
		draft.IdentityID,
		draft.RecipientGaia,
		string(draft.RecipientIDs),
		draft.Subject,
		draft.Body,
		string(draft.EnvelopeDraft),
		string(draft.Attachments),
		formatTime(draft.ScheduledFor),
		draft.SecurityWarning,
		formatTime(draft.CreatedAt),
		formatTime(draft.UpdatedAt),
	)
	return err
}

func (s *SQLStore) DeleteMailDraft(ctx context.Context, userID uuid.UUID, draftID uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM mail_drafts WHERE user_id = ? AND id = ?`, userID, draftID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) FindMailLabels(ctx context.Context, userID uuid.UUID) ([]models.MailLabel, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, name, color, created_at, updated_at FROM mail_labels WHERE user_id = ? ORDER BY name ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	labels := make([]models.MailLabel, 0)
	for rows.Next() {
		var label models.MailLabel
		var createdAt, updatedAt string
		if err := rows.Scan(&label.ID, &label.UserID, &label.Name, &label.Color, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		label.CreatedAt = parseTime(createdAt)
		label.UpdatedAt = parseTime(updatedAt)
		labels = append(labels, label)
	}
	return labels, rows.Err()
}

func (s *SQLStore) SaveMailLabel(ctx context.Context, label *models.MailLabel) error {
	now := utcNow()
	if label.ID == uuid.Nil {
		label.ID = uuid.New()
		label.CreatedAt = now
	}
	label.UpdatedAt = now
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO mail_labels (id, user_id, name, color, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id, name) DO UPDATE SET color = excluded.color, updated_at = excluded.updated_at`,
		label.ID,
		label.UserID,
		label.Name,
		label.Color,
		formatTime(label.CreatedAt),
		formatTime(label.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindMailContacts(ctx context.Context, userID uuid.UUID, query string) ([]models.MailContact, error) {
	args := []interface{}{userID}
	where := `user_id = ?`
	if strings.TrimSpace(query) != "" {
		needle := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
		where += ` AND (LOWER(gaia_id) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(email) LIKE ?)`
		args = append(args, needle, needle, needle)
	}
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, gaia_id, display_name, email, trust_note, public_key, blocked, created_at, updated_at
		 FROM mail_contacts WHERE `+where+` ORDER BY display_name ASC, gaia_id ASC LIMIT 100`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	contacts := make([]models.MailContact, 0)
	for rows.Next() {
		var contact models.MailContact
		var blocked int
		var createdAt, updatedAt string
		if err := rows.Scan(&contact.ID, &contact.UserID, &contact.GaiaID, &contact.DisplayName, &contact.Email, &contact.TrustNote, &contact.PublicKey, &blocked, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		contact.Blocked = blocked != 0
		contact.CreatedAt = parseTime(createdAt)
		contact.UpdatedAt = parseTime(updatedAt)
		contacts = append(contacts, contact)
	}
	return contacts, rows.Err()
}

func (s *SQLStore) SaveMailContact(ctx context.Context, contact *models.MailContact) error {
	now := utcNow()
	if contact.ID == uuid.Nil {
		contact.ID = uuid.New()
		contact.CreatedAt = now
	}
	contact.UpdatedAt = now
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO mail_contacts (id, user_id, gaia_id, display_name, email, trust_note, public_key, blocked, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		 gaia_id = excluded.gaia_id,
		 display_name = excluded.display_name,
		 email = excluded.email,
		 trust_note = excluded.trust_note,
		 public_key = excluded.public_key,
		 blocked = excluded.blocked,
		 updated_at = excluded.updated_at`,
		contact.ID,
		contact.UserID,
		contact.GaiaID,
		contact.DisplayName,
		contact.Email,
		contact.TrustNote,
		contact.PublicKey,
		boolToInt(contact.Blocked),
		formatTime(contact.CreatedAt),
		formatTime(contact.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindMailFilterRules(ctx context.Context, userID uuid.UUID) ([]models.MailFilterRule, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, user_id, sender_contains, subject_contains, assign_label, target_folder, mark_important, enabled, created_at, updated_at
		 FROM mail_filter_rules WHERE user_id = ? ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rules := make([]models.MailFilterRule, 0)
	for rows.Next() {
		var rule models.MailFilterRule
		var markImportant, enabled int
		var createdAt, updatedAt string
		if err := rows.Scan(&rule.ID, &rule.UserID, &rule.SenderContains, &rule.SubjectContains, &rule.AssignLabel, &rule.TargetFolder, &markImportant, &enabled, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		rule.MarkImportant = markImportant != 0
		rule.Enabled = enabled != 0
		rule.CreatedAt = parseTime(createdAt)
		rule.UpdatedAt = parseTime(updatedAt)
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (s *SQLStore) SaveMailFilterRule(ctx context.Context, rule *models.MailFilterRule) error {
	now := utcNow()
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
		rule.CreatedAt = now
	}
	rule.UpdatedAt = now
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO mail_filter_rules (id, user_id, sender_contains, subject_contains, assign_label, target_folder, mark_important, enabled, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		 sender_contains = excluded.sender_contains,
		 subject_contains = excluded.subject_contains,
		 assign_label = excluded.assign_label,
		 target_folder = excluded.target_folder,
		 mark_important = excluded.mark_important,
		 enabled = excluded.enabled,
		 updated_at = excluded.updated_at`,
		rule.ID,
		rule.UserID,
		rule.SenderContains,
		rule.SubjectContains,
		rule.AssignLabel,
		normalizeFolder(rule.TargetFolder),
		boolToInt(rule.MarkImportant),
		boolToInt(rule.Enabled),
		formatTime(rule.CreatedAt),
		formatTime(rule.UpdatedAt),
	)
	return err
}

func (s *SQLStore) GetMailSettings(ctx context.Context, userID uuid.UUID) (*models.MailSettings, error) {
	var settings models.MailSettings
	var updatedAt string
	err := s.db.QueryRowContext(ctx, `SELECT user_id, signature, locale, theme, keyboard_mode, onboarding_done, updated_at FROM mail_settings WHERE user_id = ? LIMIT 1`, userID).
		Scan(&settings.UserID, &settings.Signature, &settings.Locale, &settings.Theme, &settings.KeyboardMode, &settings.OnboardingDone, &updatedAt)
	if err == sql.ErrNoRows {
		return &models.MailSettings{UserID: userID, Locale: "de", Theme: "dark", KeyboardMode: "default", OnboardingDone: false}, nil
	}
	if err != nil {
		return nil, err
	}
	settings.UpdatedAt = parseTime(updatedAt)
	return &settings, nil
}

func (s *SQLStore) SaveMailSettings(ctx context.Context, settings *models.MailSettings) error {
	settings.UpdatedAt = utcNow()
	_, err := s.db.ExecContext(
		ctx,
		`INSERT INTO mail_settings (user_id, signature, locale, theme, keyboard_mode, onboarding_done, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET
		 signature = excluded.signature,
		 locale = excluded.locale,
		 theme = excluded.theme,
		 keyboard_mode = excluded.keyboard_mode,
		 onboarding_done = excluded.onboarding_done,
		 updated_at = excluded.updated_at`,
		settings.UserID,
		settings.Signature,
		settings.Locale,
		settings.Theme,
		settings.KeyboardMode,
		settings.OnboardingDone,
		formatTime(settings.UpdatedAt),
	)
	return err
}

func (s *SQLStore) GlobalSearch(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query string, limit int) ([]models.GlobalSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 50
	}
	needle := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
	results := make([]models.GlobalSearchResult, 0, limit)

	messageRows, err := s.db.QueryContext(
		ctx,
		`SELECT me.id, me.sender, me.recipient, COALESCE(CAST(me.payload AS TEXT), ''), me.created_at
		 FROM identities i
		 JOIN message_envelopes me ON (EXISTS (SELECT 1 FROM inboxes ib WHERE ib.identity_id = i.id AND ib.message_id = me.id) OR me.sender = i.gaia_id COLLATE NOCASE)
		 WHERE i.user_id = ? AND i.id = ? AND (LOWER(me.sender) LIKE ? OR LOWER(me.recipient) LIKE ? OR LOWER(COALESCE(CAST(me.payload AS TEXT), '')) LIKE ?)
		 ORDER BY me.created_at DESC LIMIT ?`,
		userID,
		identityID,
		needle,
		needle,
		needle,
		limit,
	)
	if err != nil {
		return nil, err
	}
	for messageRows.Next() && len(results) < limit {
		var id, sender, recipient, payload, createdAt string
		if err := messageRows.Scan(&id, &sender, &recipient, &payload, &createdAt); err != nil {
			_ = messageRows.Close()
			return nil, err
		}
		results = append(results, models.GlobalSearchResult{
			Kind:      "mail",
			ID:        id,
			Title:     sender + " -> " + recipient,
			Snippet:   trimSnippet(payload, 160),
			Source:    "mailbox",
			CreatedAt: parseTime(createdAt),
		})
	}
	if err := messageRows.Close(); err != nil {
		return nil, err
	}
	if err := messageRows.Err(); err != nil {
		return nil, err
	}

	contactRows, err := s.db.QueryContext(
		ctx,
		`SELECT id, display_name, gaia_id, email, updated_at
		 FROM mail_contacts
		 WHERE user_id = ? AND (LOWER(display_name) LIKE ? OR LOWER(gaia_id) LIKE ? OR LOWER(email) LIKE ?)
		 ORDER BY updated_at DESC LIMIT ?`,
		userID,
		needle,
		needle,
		needle,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer contactRows.Close()
	for contactRows.Next() && len(results) < limit {
		var id, displayName, gaiaID, email, updatedAt string
		if err := contactRows.Scan(&id, &displayName, &gaiaID, &email, &updatedAt); err != nil {
			return nil, err
		}
		results = append(results, models.GlobalSearchResult{
			Kind:      "contact",
			ID:        id,
			Title:     firstNonEmpty(displayName, gaiaID, email),
			Snippet:   strings.TrimSpace(gaiaID + " " + email),
			Source:    "contacts",
			CreatedAt: parseTime(updatedAt),
		})
	}
	return results, contactRows.Err()
}

func scanMailboxMessageRows(rows *sql.Rows, userID uuid.UUID, identityID uuid.UUID) (*models.MessageEnvelope, error) {
	var message models.MessageEnvelope
	var createdAt, snoozedUntil, updatedAt, readReceiptSourceID, replacedByMessageID, editedAt string
	var isRead, delivered, isStarred, isImportant, isSpam, isArchived int
	var labels models.JSONB
	state := models.MailboxState{UserID: userID, IdentityID: identityID}
	if err := rows.Scan(
		&message.ID,
		&message.Type,
		&message.Sender,
		&message.Recipient,
		&message.Payload,
		&message.Signature,
		&message.ChannelID,
		&readReceiptSourceID,
		&message.ClientMessageID,
		&replacedByMessageID,
		&editedAt,
		&createdAt,
		&state.Folder,
		&isRead,
		&delivered,
		&isStarred,
		&isImportant,
		&isSpam,
		&isArchived,
		&labels,
		&snoozedUntil,
		&updatedAt,
	); err != nil {
		return nil, err
	}
	message.CreatedAt = parseTime(createdAt)
	if parsed, err := uuid.Parse(readReceiptSourceID); err == nil {
		message.ReadReceiptSourceID = parsed
	}
	if parsed, err := uuid.Parse(replacedByMessageID); err == nil {
		message.ReplacedByMessageID = parsed
	}
	message.EditedAt = parseTime(editedAt)
	message.IsRead = isRead != 0
	message.Delivered = delivered != 0
	state.MessageID = message.ID
	state.IsRead = isRead != 0
	state.IsStarred = isStarred != 0
	state.IsImportant = isImportant != 0
	state.IsSpam = isSpam != 0
	state.IsArchived = isArchived != 0
	state.Labels = labels
	state.SnoozedUntil = parseTime(snoozedUntil)
	state.UpdatedAt = parseTime(updatedAt)
	message.Mailbox = &state
	return &message, nil
}

func scanMailDraftRows(rows *sql.Rows) (models.MailDraft, error) {
	var draft models.MailDraft
	var envelopeDraft, attachments sql.NullString
	var scheduledFor, createdAt, updatedAt string
	if err := rows.Scan(&draft.ID, &draft.UserID, &draft.IdentityID, &draft.RecipientGaia, &draft.RecipientIDs, &draft.Subject, &draft.Body, &envelopeDraft, &attachments, &scheduledFor, &draft.SecurityWarning, &createdAt, &updatedAt); err != nil {
		return models.MailDraft{}, err
	}
	if envelopeDraft.Valid {
		draft.EnvelopeDraft = models.JSONB(envelopeDraft.String)
	}
	if attachments.Valid {
		draft.Attachments = models.JSONB(attachments.String)
	}
	draft.ScheduledFor = parseTime(scheduledFor)
	draft.CreatedAt = parseTime(createdAt)
	draft.UpdatedAt = parseTime(updatedAt)
	return draft, nil
}

func normalizeFolder(folder string) string {
	switch strings.ToLower(strings.TrimSpace(folder)) {
	case "", "all":
		return strings.ToLower(strings.TrimSpace(folder))
	case "inbox", "sent", "drafts", "trash", "archive", "spam", "snoozed":
		return strings.ToLower(strings.TrimSpace(folder))
	default:
		return "inbox"
	}
}

func escapeLike(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "%", "\\%"), "_", "\\_")
}

func trimSnippet(value string, max int) string {
	clean := strings.TrimSpace(value)
	if len(clean) <= max {
		return clean
	}
	return clean[:max]
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func parseAPITime(value string) time.Time {
	if strings.TrimSpace(value) == "" {
		return time.Time{}
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed
	}
	return parseTime(value)
}

func (s *SQLStore) IsContactBlocked(ctx context.Context, userID uuid.UUID, gaiaID string) (bool, error) {
	var blocked int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT blocked FROM mail_contacts WHERE user_id = ? AND gaia_id = ? LIMIT 1`,
		userID,
		gaiaID,
	).Scan(&blocked)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return blocked != 0, nil
}
