package smtpbridge

import (
	"context"
	"crypto/subtle"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/internal/security"
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
	tlsMode    string
	timeout    time.Duration
	security   *security.SecuritySystem
}

func NewService(messages repository.MessageStore, identities repository.IdentityStore, securitySystems ...*security.SecuritySystem) *Service {
	port, _ := strconv.Atoi(strings.TrimSpace(os.Getenv("GAIACOM_SMTP_PORT")))
	if port == 0 {
		port = 587
	}
	tlsMode := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_SMTP_TLS_MODE")))
	if tlsMode == "" {
		tlsMode = "starttls"
	}
	service := &Service{
		Messages:   messages,
		Identities: identities,
		host:       strings.TrimSpace(os.Getenv("GAIACOM_SMTP_HOST")),
		port:       port,
		username:   strings.TrimSpace(os.Getenv("GAIACOM_SMTP_USERNAME")),
		password:   os.Getenv("GAIACOM_SMTP_PASSWORD"),
		from:       strings.TrimSpace(os.Getenv("GAIACOM_SMTP_FROM")),
		ingestKey:  os.Getenv("GAIACOM_SMTP_INGEST_TOKEN"),
		tlsMode:    tlsMode,
		timeout:    30 * time.Second,
	}
	if len(securitySystems) > 0 {
		service.security = securitySystems[0]
	}
	return service
}

func (s *Service) SendLegacyMail(ctx context.Context, userID uuid.UUID, senderIdentityID uuid.UUID, to string, subject string, body string, attachments []Attachment) error {
	if sec := s.security; sec != nil {
		if err := sec.CheckSMTPRequest(ctx, senderIdentityID.String(), to, subject, nil); err != nil {
			return err
		}
		sec.RecordSecurityEvent(ctx, &userID, &senderIdentityID, "policy_violation", "low", "smtp_guard",
			"Nachricht über SMTP-Legacy-Brücke gesendet. Sie war vor dem Gateway nicht GaiaCom-native geschützt.", "allow", nil)
	}

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

	if err := s.sendPlainTextSMTP(ctx, to, subject, body, attachments); err != nil {
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

	if sec := s.security; sec != nil {
		if err := sec.CheckSMTPRequest(ctx, externalFrom, targetGaiaID, subject, nil); err != nil {
			return err
		}
		sec.RecordSecurityEvent(ctx, &recipient.UserID, &recipient.ID, "policy_violation", "low", "smtp_guard",
			"Nachricht über SMTP-Legacy-Brücke empfangen. Sie war vor dem Gateway nicht GaiaCom-native geschützt.", "allow", nil)
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

func (s *Service) sendPlainTextSMTP(ctx context.Context, to string, subject string, body string, attachments []Attachment) error {
	fromAddress, toAddress, err := s.validateSMTPTransport(to)
	if err != nil {
		return err
	}

	var builder strings.Builder
	builder.WriteString("From: ")
	builder.WriteString(fromAddress.String())
	builder.WriteString("\r\nTo: ")
	builder.WriteString(toAddress.String())
	builder.WriteString("\r\nSubject: ")
	builder.WriteString(sanitizeHeader(subject))
	builder.WriteString("\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nX-GaiaCOM-Legacy-SMTP: untrusted\r\n\r\n")
	builder.WriteString(body)
	if len(attachments) > 0 {
		builder.WriteString("\r\n\r\n[GaiaCOM Hinweis: Anhänge wurden im Legacy-SMTP-Pfad nicht als ausführbare Inhalte eingebettet. Bitte sichere Quellen separat prüfen.]\r\n")
	}

	address := net.JoinHostPort(s.host, strconv.Itoa(s.port))
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: s.host,
	}
	dialer := &net.Dialer{Timeout: s.timeout, KeepAlive: 30 * time.Second}
	var connection net.Conn
	if s.tlsMode == "implicit" {
		connection, err = (&tls.Dialer{NetDialer: dialer, Config: tlsConfig}).DialContext(ctx, "tcp", address)
	} else {
		connection, err = dialer.DialContext(ctx, "tcp", address)
	}
	if err != nil {
		return fmt.Errorf("SMTP connection failed: %w", err)
	}
	defer connection.Close()
	deadline := time.Now().Add(s.timeout)
	if contextDeadline, ok := ctx.Deadline(); ok && contextDeadline.Before(deadline) {
		deadline = contextDeadline
	}
	if err := connection.SetDeadline(deadline); err != nil {
		return fmt.Errorf("SMTP deadline setup failed: %w", err)
	}

	client, err := smtp.NewClient(connection, s.host)
	if err != nil {
		return fmt.Errorf("SMTP handshake failed: %w", err)
	}
	defer client.Close()
	if s.tlsMode == "starttls" {
		if supported, _ := client.Extension("STARTTLS"); !supported {
			return errors.New("SMTP relay does not advertise mandatory STARTTLS")
		}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("SMTP STARTTLS failed: %w", err)
		}
	}
	if err := client.Auth(smtp.PlainAuth("", s.username, s.password, s.host)); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}
	if err := client.Mail(fromAddress.Address); err != nil {
		return fmt.Errorf("SMTP sender rejected: %w", err)
	}
	if err := client.Rcpt(toAddress.Address); err != nil {
		return fmt.Errorf("SMTP recipient rejected: %w", err)
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA rejected: %w", err)
	}
	if _, err := io.WriteString(writer, builder.String()); err != nil {
		_ = writer.Close()
		return fmt.Errorf("SMTP body transfer failed: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("SMTP body commit failed: %w", err)
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("SMTP QUIT failed: %w", err)
	}
	return nil
}

func (s *Service) validateSMTPTransport(to string) (*mail.Address, *mail.Address, error) {
	if s.host == "" || s.from == "" || s.port < 1 || s.port > 65535 {
		return nil, nil, errSMTPNotConfigured
	}
	if strings.ContainsAny(s.host, "\r\n\t /\\@") || strings.Contains(s.host, ":") {
		return nil, nil, errSMTPRejected
	}
	if s.tlsMode != "starttls" && s.tlsMode != "implicit" {
		return nil, nil, errSMTPRejected
	}
	if s.username == "" || s.password == "" {
		return nil, nil, errSMTPNotConfigured
	}
	fromAddress, err := mail.ParseAddress(s.from)
	if err != nil {
		return nil, nil, errSMTPRejected
	}
	toAddress, err := mail.ParseAddress(to)
	if err != nil {
		return nil, nil, errSMTPRejected
	}
	return fromAddress, toAddress, nil
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
