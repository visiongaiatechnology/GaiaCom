package smtpbridge

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"os"
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

	// maxSMTPTotalAttachBytes bounds the sum of all attachment metadata sizes in
	// one ingest request; the per-attachment ceiling alone allowed a 10x fan-out.
	maxSMTPTotalAttachBytes = maxSMTPAttachBytes
	// maxSMTPFromBytes bounds the raw external From header (RFC 5322 recommends
	// 998 octets per line; the bridge address is far shorter). Applied before
	// mail.ParseAddress so oversized input cannot reach the parser.
	maxSMTPFromBytes = 320
	// maxSMTPIngestBodyBytes is the handler-level request cap for the public
	// ingest route: it must fit the max body (256 KiB) plus JSON overhead.
	maxSMTPIngestBodyBytes = 512 * 1024
	// smtpIngestTokenPlaceholder is the shipped .env.example value. A bridge that
	// still runs with the template token is treated as unconfigured (fail closed).
	smtpIngestTokenPlaceholder = "TEST_ONLY_REPLACE_WITH_RANDOM_32_BYTE_TOKEN"
)

var (
	errSMTPNotConfigured = errors.New("smtp bridge not configured")
	errSMTPRejected      = errors.New("smtp bridge request rejected")
	// errSMTPUnauthorized distinguishes a bad/missing bridge token (HTTP 401)
	// from other rejections (HTTP 400) while still matching errSMTPRejected for
	// the existing fail-closed tests.
	errSMTPUnauthorized = errors.New("smtp bridge token rejected")
	// errSMTPRateLimited is returned by the ingest budget and mapped to HTTP 429.
	errSMTPRateLimited = errors.New("smtp bridge ingest rate limited")
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
	// ingestKeys holds the current ingest token plus any rotation tokens from a
	// comma-separated GAIACOM_SMTP_INGEST_TOKEN value (old+new during a rotation
	// window). Empty means the bridge is not configured and ingest fails closed.
	ingestKeys []string
	// messageAuth optionally binds each ingest message to the bridge with an
	// HMAC when GAIACOM_SMTP_MESSAGE_SECRET is configured.
	messageAuth *smtpMessageAuth
	tlsMode     string
	timeout     time.Duration
	security    *security.SecuritySystem
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
		Messages:    messages,
		Identities:  identities,
		host:        strings.TrimSpace(os.Getenv("GAIACOM_SMTP_HOST")),
		port:        port,
		username:    strings.TrimSpace(os.Getenv("GAIACOM_SMTP_USERNAME")),
		password:    os.Getenv("GAIACOM_SMTP_PASSWORD"),
		from:        strings.TrimSpace(os.Getenv("GAIACOM_SMTP_FROM")),
		ingestKeys:  parseSMTPIngestTokens(os.Getenv("GAIACOM_SMTP_INGEST_TOKEN")),
		tlsMode:     tlsMode,
		timeout:     30 * time.Second,
		messageAuth: newSMTPMessageAuth(os.Getenv("GAIACOM_SMTP_MESSAGE_SECRET")),
	}
	if len(service.ingestKeys) > 0 {
		service.ingestKey = service.ingestKeys[0]
	}
	if len(securitySystems) > 0 {
		service.security = securitySystems[0]
	}
	return service
}

// verifyIngestToken compares SHA-256 digests of the supplied and configured
// tokens in constant time. Hashing first gives every comparison the same length,
// so a wrong-length token cannot be distinguished by timing.
func (s *Service) verifyIngestToken(token string) bool {
	if s == nil || len(s.ingestKeys) == 0 || token == "" {
		return false
	}
	candidate := sha256.Sum256([]byte(token))
	matched := 0
	for _, configured := range s.ingestKeys {
		expected := sha256.Sum256([]byte(configured))
		matched |= subtle.ConstantTimeCompare(candidate[:], expected[:])
	}
	return matched == 1
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
	// Fail closed when the bridge is not configured (empty or placeholder-only
	// token list) and on any token mismatch. verifyIngestToken hashes both sides
	// and compares with subtle.ConstantTimeCompare across the rotation list.
	if s.ingestKey == "" || len(s.ingestKeys) == 0 || !s.verifyIngestToken(token) {
		return fmt.Errorf("%w: %w", errSMTPRejected, errSMTPUnauthorized)
	}

	// externalFrom is attacker-controlled and untrusted: bound its raw size and
	// reject header-injection bytes before it reaches the mail parser.
	if strings.TrimSpace(externalFrom) == "" || len([]byte(externalFrom)) > maxSMTPFromBytes || strings.ContainsAny(externalFrom, "\r\n\x00") {
		return errSMTPRejected
	}
	parsedFrom, err := mail.ParseAddress(externalFrom)
	if err != nil {
		return errSMTPRejected
	}
	// Store only the bare address, lowercased, without any display name: a
	// crafted display name must not be able to masquerade as a trusted label.
	externalSender := normalizeExternalSender(parsedFrom)
	if externalSender == "" {
		return errSMTPRejected
	}

	if err := validateLegacyEnvelope("bridge-inbound@gaiacom.local", subject, body, attachments); err != nil {
		return err
	}
	recipient, err := s.Identities.FindIdentityByGaiaID(targetGaiaID)
	if err != nil {
		return err
	}
	if recipient == nil {
		return errSMTPRejected
	}

	// The From address is never used for authentication or authorization. If it
	// resolves to a local GaiaID (e.g. "user@node.example"), reject the ingest so a
	// bridge message cannot present itself as a local identity.
	if s.isLocalIdentityReference(externalSender) {
		if sec := s.security; sec != nil {
			userID := recipient.UserID
			identityID := recipient.ID
			sec.RecordSecurityEvent(ctx, &userID, &identityID, "policy_violation", "high", "smtpbridge",
				"SMTP-Legacy-Ingest mit lokaler Absender-Identität abgelehnt (Impersonationsversuch).", "reject", nil)
		}
		return errSMTPRejected
	}

	if sec := s.security; sec != nil {
		if err := sec.CheckSMTPRequest(ctx, externalSender, targetGaiaID, subject, nil); err != nil {
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
		// Untrusted external metadata: stored for display only, never identity.
		"externalFrom":      externalSender,
		"externalUntrusted": true,
		"senderIdentity":    "",
		"security": map[string]interface{}{
			"transport":               "legacy-smtp",
			"endToEndEncrypted":       false,
			"untrusted":               true,
			"externalSenderUntrusted": true,
			"senderVerified":          false,
			"notice":                  "External SMTP mail. Treat links and attachments as untrusted; the From address is not verified.",
		},
	})
	if err != nil {
		return err
	}

	envelope := &models.MessageEnvelope{
		ID:        uuid.New(),
		Type:      "smtp.legacy",
		Sender:    externalSender,
		Recipient: recipient.GaiaID,
		Payload:   models.JSONB(payloadBytes),
		// Server-derived untrusted marker (never from externalFrom) so every
		// consumer sees the message as untrusted regardless of payload parsing.
		Untrusted: true,
		CreatedAt: time.Now().UTC(),
	}
	return s.Messages.SaveMessageEnvelopeWithInbox(ctx, envelope, []uuid.UUID{recipient.ID})
}
