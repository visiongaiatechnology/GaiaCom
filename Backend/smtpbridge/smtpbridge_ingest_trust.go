package smtpbridge

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"net/mail"
	"net/smtp"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Ingest trust helpers (FIND-006 / P-06, in-wave hardening).
//
// Shared by the SMTP ingest path: token-rotation list parsing, external sender
// normalisation and local-identity impersonation detection. Kept in its own file
// so smtpbridge_service.go stays inside the VGT 500-line rule.

// parseSMTPIngestTokens parses GAIACOM_SMTP_INGEST_TOKEN as a comma-separated
// rotation list (current token first, previous/next tokens following). Empty
// entries, duplicates and the shipped .env.example placeholder are dropped, so a
// deployment that never replaced the template token fails closed. Rotation is
// applied by restarting the node (no wire change); tokens can be removed from the
// list once the bridge MTA has been updated.
func parseSMTPIngestTokens(raw string) []string {
	seen := make(map[string]bool, 2)
	tokens := make([]string, 0, 2)
	for _, part := range strings.Split(raw, ",") {
		token := strings.TrimSpace(part)
		if token == "" || token == smtpIngestTokenPlaceholder || seen[token] {
			continue
		}
		seen[token] = true
		tokens = append(tokens, token)
	}
	return tokens
}

// normalizeExternalSender reduces a parsed From address to a bare, lowercased
// address for untrusted display metadata. Display names are intentionally dropped.
func normalizeExternalSender(parsed *mail.Address) string {
	if parsed == nil {
		return ""
	}
	address := strings.ToLower(strings.TrimSpace(parsed.Address))
	if address == "" || len(address) > maxSMTPFromBytes || strings.ContainsAny(address, "\r\n\x00") || !strings.Contains(address, "@") {
		return ""
	}
	return address
}

// externalSenderIdentityCandidates projects an external e-mail address onto the
// GaiaID shapes the node stores, so local-identity impersonation is detected.
func externalSenderIdentityCandidates(address string) []string {
	address = strings.ToLower(strings.TrimSpace(address))
	candidates := []string{address, "@" + address}
	if at := strings.LastIndex(address, "@"); at > 0 && at < len(address)-1 {
		local, domain := address[:at], address[at+1:]
		candidates = append(candidates, local+":"+domain, "@"+local+":"+domain)
	}
	seen := make(map[string]bool, len(candidates))
	out := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate == "" || seen[candidate] {
			continue
		}
		seen[candidate] = true
		out = append(out, candidate)
	}
	return out
}

// isLocalIdentityReference reports whether an untrusted external From address
// collides with a locally registered identity in any accepted GaiaID spelling.
func (s *Service) isLocalIdentityReference(address string) bool {
	if s == nil || s.Identities == nil {
		return false
	}
	for _, candidate := range externalSenderIdentityCandidates(address) {
		identity, err := s.Identities.FindIdentityByGaiaID(candidate)
		if err == nil && identity != nil {
			return true
		}
	}
	return false
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
	var totalAttachmentBytes int64
	for _, attachment := range attachments {
		if err := validateAttachment(attachment); err != nil {
			return err
		}
		totalAttachmentBytes += attachment.Size
		if totalAttachmentBytes > maxSMTPTotalAttachBytes {
			return errSMTPRejected
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
