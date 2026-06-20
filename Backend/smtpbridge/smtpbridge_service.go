package smtpbridge

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const (
	maxSMTPSubjectBytes = 240
	maxSMTPBodyBytes    = 256 * 1024
	maxSMTPAttachments  = 10
	maxSMTPAttachBytes  = 30 * 1024 * 1024
)

var (
	errSMTPNotConfigured = errors.New("smtp bridge not configured")
	errSMTPRejected      = errors.New("smtp bridge request rejected")
)

type Attachment struct {
	Name        string `json:"name"`
	MimeType    string `json:"mimeType,omitempty"`
	Size        int64  `json:"size"`
	DownloadURL string `json:"downloadUrl,omitempty"`
}

type Service struct {
	Messages   repository.MessageStore
	Identities repository.IdentityStore
	host       string
	port       int
	username   string
	password   string
	from       string
	ingestKey  string
}

func NewService(messages repository.MessageStore, identities repository.IdentityStore) *Service {
	port, _ := strconv.Atoi(strings.TrimSpace(os.Getenv("GAIACOM_SMTP_PORT")))
	if port == 0 {
		port = 587
	}
	return &Service{
		Messages:   messages,
		Identities: identities,
		host:       strings.TrimSpace(os.Getenv("GAIACOM_SMTP_HOST")),
		port:       port,
		username:   strings.TrimSpace(os.Getenv("GAIACOM_SMTP_USERNAME")),
		password:   os.Getenv("GAIACOM_SMTP_PASSWORD"),
		from:       strings.TrimSpace(os.Getenv("GAIACOM_SMTP_FROM")),
		ingestKey:  os.Getenv("GAIACOM_SMTP_INGEST_TOKEN"),
	}
}

func (s *Service) SendLegacyMail(ctx context.Context, userID uuid.UUID, senderIdentityID uuid.UUID, to string, subject string, body string, attachments []Attachment) error {
	if err := validateLegacyEnvelope(to, subject, body, attachments); err != nil {
		return err
	}
	ownsSender, err := s.Identities.IdentityBelongsToUser(senderIdentityID, userID)
	if err != nil {
		return err
	}
	if !ownsSender {
		return errSMTPRejected
	}
	senderIdent, err := s.Identities.FindIdentityByID(senderIdentityID)
	if err != nil {
		return err
	}

	if err := s.sendPlainTextSMTP(to, subject, body, attachments); err != nil {
		return err
	}

	payloadBytes, err := json.Marshal(map[string]interface{}{
		"type":        "smtp.legacy",
		"direction":   "outbound",
		"subject":     subject,
		"body":        body,
		"attachments": attachments,
		"security": map[string]interface{}{
			"transport":         "legacy-smtp",
			"endToEndEncrypted": false,
			"untrusted":         true,
			"notice":            "Legacy SMTP transport. No GaiaCOM E2EE guarantees apply outside the local envelope record.",
		},
	})
	if err != nil {
		return err
	}

	envelope := &models.MessageEnvelope{
		ID:               uuid.New(),
		Type:             "smtp.legacy",
		Sender:           senderIdent.GaiaID,
		Recipient:        to,
		Payload:          models.JSONB(payloadBytes),
		SenderIdentityID: senderIdentityID,
		CreatedAt:        time.Now().UTC(),
	}
	return s.Messages.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{senderIdentityID})
}

func (s *Service) IngestLegacyMail(ctx context.Context, token string, targetGaiaID string, externalFrom string, subject string, body string, attachments []Attachment) error {
	if s.ingestKey == "" || subtle.ConstantTimeCompare([]byte(token), []byte(s.ingestKey)) != 1 {
		return errSMTPRejected
	}
	if _, err := mail.ParseAddress(externalFrom); err != nil {
		return errSMTPRejected
	}
	if err := validateLegacyEnvelope("bridge-inbound@gaiacom.local", subject, body, attachments); err != nil {
		return err
	}
	recipient, err := s.Identities.FindIdentityByGaiaID(targetGaiaID)
	if err != nil {
		return err
	}

	payloadBytes, err := json.Marshal(map[string]interface{}{
		"type":        "smtp.legacy",
		"direction":   "inbound",
		"subject":     subject,
		"body":        body,
		"attachments": attachments,
		"security": map[string]interface{}{
			"transport":         "legacy-smtp",
			"endToEndEncrypted": false,
			"untrusted":         true,
			"notice":            "External SMTP mail. Treat links and attachments as untrusted.",
		},
	})
	if err != nil {
		return err
	}

	envelope := &models.MessageEnvelope{
		ID:        uuid.New(),
		Type:      "smtp.legacy",
		Sender:    externalFrom,
		Recipient: targetGaiaID,
		Payload:   models.JSONB(payloadBytes),
		CreatedAt: time.Now().UTC(),
	}
	return s.Messages.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{recipient.ID})
}

func (s *Service) sendPlainTextSMTP(to string, subject string, body string, attachments []Attachment) error {
	if s.host == "" || s.from == "" {
		return errSMTPNotConfigured
	}
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	fromAddr := s.from
	auth := smtp.Auth(nil)
	if s.username != "" {
		auth = smtp.PlainAuth("", s.username, s.password, s.host)
	}

	var builder strings.Builder
	builder.WriteString("From: ")
	builder.WriteString(fromAddr)
	builder.WriteString("\r\nTo: ")
	builder.WriteString(to)
	builder.WriteString("\r\nSubject: ")
	builder.WriteString(sanitizeHeader(subject))
	builder.WriteString("\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nX-GaiaCOM-Legacy-SMTP: untrusted\r\n\r\n")
	builder.WriteString(body)
	if len(attachments) > 0 {
		builder.WriteString("\r\n\r\n[GaiaCOM Hinweis: Anhänge wurden im Legacy-SMTP-Pfad nicht als ausführbare Inhalte eingebettet. Bitte sichere Quellen separat prüfen.]\r\n")
	}

	return smtp.SendMail(addr, auth, fromAddr, []string{to}, []byte(builder.String()))
}

func validateLegacyEnvelope(to string, subject string, body string, attachments []Attachment) error {
	if _, err := mail.ParseAddress(to); err != nil {
		return errSMTPRejected
	}
	if strings.TrimSpace(subject) == "" || len([]byte(subject)) > maxSMTPSubjectBytes {
		return errSMTPRejected
	}
	if strings.TrimSpace(body) == "" || len([]byte(body)) > maxSMTPBodyBytes {
		return errSMTPRejected
	}
	if len(attachments) > maxSMTPAttachments {
		return errSMTPRejected
	}
	for _, attachment := range attachments {
		if err := validateAttachment(attachment); err != nil {
			return err
		}
	}
	return nil
}

func validateAttachment(attachment Attachment) error {
	name := strings.TrimSpace(attachment.Name)
	if name == "" || len(name) > 180 || strings.ContainsAny(name, `/\`) {
		return errSMTPRejected
	}
	if attachment.Size < 0 || attachment.Size > maxSMTPAttachBytes {
		return errSMTPRejected
	}
	ext := strings.ToLower(filepath.Ext(name))
	mimeType := strings.ToLower(strings.TrimSpace(attachment.MimeType))
	blockedExt := map[string]bool{
		".js": true, ".mjs": true, ".cjs": true, ".html": true, ".htm": true, ".svg": true,
		".xhtml": true, ".xml": true, ".php": true, ".phtml": true, ".exe": true, ".bat": true,
		".cmd": true, ".ps1": true, ".vbs": true, ".jar": true, ".scr": true, ".msi": true,
	}
	if blockedExt[ext] {
		return errSMTPRejected
	}
	if strings.Contains(mimeType, "javascript") || strings.Contains(mimeType, "html") || strings.Contains(mimeType, "svg") || strings.Contains(mimeType, "xml") {
		return errSMTPRejected
	}
	return nil
}

func sanitizeHeader(input string) string {
	return strings.NewReplacer("\r", " ", "\n", " ").Replace(input)
}
