package security

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"gaiacom/backend/core/uuid"
)

type plainEnvelope struct {
	ID              string      `json:"id"`
	ClientMessageID string      `json:"client_message_id"`
	Timestamp       interface{} `json:"timestamp"`
	AlgorithmSuite  string      `json:"algorithm_suite"`
	Signature       string      `json:"signature"`
	SignatureBundle struct {
		Ed25519       string `json:"ed25519"`
		MLDSA87       string `json:"ml_dsa_87"`
		MLDSA87Public string `json:"ml_dsa_87_public"`
	} `json:"signature_bundle"`
	Payload           string `json:"payload"`
	PayloadCiphertext string `json:"payload_ciphertext"`
	HQCCiphertext     string `json:"hqc_ciphertext"`
	SovereignProfile  string `json:"sovereign_profile"`
	RoomID            string `json:"room_id"`
}

const (
	legacyStandardAlgorithmSuite       = "GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM"
	legacyTopSecretAlgorithmSuite      = "GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87"
	sovereignAcceleratedAlgorithmSuite = "GaiaCom/v1.0/sovereign-accelerated/X25519+ML-KEM-1024+HQC-256/Twofish-256-EAX+AES-256-GCM/Ed25519"
	sovereignTopSecretAlgorithmSuite   = "GaiaCom/v1.0/sovereign-top-secret/X25519+ML-KEM-1024+HQC-256/Serpent-256-CTR-HMAC-SHA3-512+Twofish-256-EAX+XChaCha20-Poly1305+AES-256-GCM-SIV/Ed25519+ML-DSA-87"
)

func (s *SecuritySystem) CheckMessageEnvelope(ctx context.Context, senderID uuid.UUID, envelopeData []byte, r *http.Request) error {
	if len(envelopeData) > 30*1024*1024 {
		s.RecordSecurityEvent(ctx, nil, &senderID, "malformed_request", "medium", "message_guard",
			"Nachricht überschreitet das maximal zulässige Größenlimit (30MB).", "reject", r)
		return errors.New("invalid envelope size")
	}

	var env plainEnvelope
	if err := json.Unmarshal(envelopeData, &env); err != nil {
		s.RecordSecurityEvent(ctx, nil, &senderID, "malformed_json", "medium", "message_guard",
			"Nachrichten-Umschlag enthält ungültiges JSON.", "reject", r)
		return errors.New("invalid JSON payload")
	}

	// 1. Validate Message UUID
	idStr := env.ClientMessageID
	if idStr == "" {
		idStr = env.ID
	}
	msgUUID, err := uuid.Parse(idStr)
	if err != nil || msgUUID == uuid.Nil {
		s.RecordSecurityEvent(ctx, nil, &senderID, "message_tamper", "medium", "message_guard",
			"Ungültiges Nachrichten-ID Format (keine valide UUID).", "reject", r)
		return errors.New("invalid message ID format")
	}

	// 2. Replay Protection (check if ID already exists in DB)
	existing, err := s.Store.FindMessageEnvelopesByIDs(ctx, []uuid.UUID{msgUUID})
	if err == nil && len(existing) > 0 {
		s.RecordSecurityEvent(ctx, nil, &senderID, "message_replay", "high", "message_guard",
			"Replay-Angriff erkannt: Nachricht mit ID "+idStr+" wurde bereits verarbeitet.", "reject", r)
		return errors.New("replay attack detected: message already processed")
	}

	// 3. Timestamp verification
	if env.Timestamp != nil {
		var t time.Time
		var parseErr error
		switch val := env.Timestamp.(type) {
		case string:
			if val != "" {
				t, parseErr = time.Parse(time.RFC3339Nano, val)
			}
		case float64:
			msec := int64(val)
			if msec > 100000000000 { // Milliseconds
				t = time.Unix(msec/1000, (msec%1000)*1000000)
			} else { // Seconds
				t = time.Unix(msec, 0)
			}
		case int64:
			msec := val
			if msec > 100000000000 {
				t = time.Unix(msec/1000, (msec%1000)*1000000)
			} else {
				t = time.Unix(msec, 0)
			}
		default:
			parseErr = errors.New("unsupported timestamp type")
		}

		if parseErr == nil && !t.IsZero() {
			skew := time.Since(t)
			if skew < 0 {
				skew = -skew
			}
			if skew > 10*time.Minute {
				s.RecordSecurityEvent(ctx, nil, &senderID, "message_tamper", "medium", "message_guard",
					"Nachrichten-Timestamp liegt außerhalb des erlaubten Fensters (Clock Skew).", "reject", r)
				return errors.New("clock skew limit exceeded: message timestamp too old or in future")
			}
		}
	}

	// 4. Integrity check (signature must be present)
	if env.Signature == "" {
		s.RecordSecurityEvent(ctx, nil, &senderID, "message_tamper", "high", "message_guard",
			"Kryptografische Signatur fehlt im Nachrichten-Umschlag.", "reject", r)
		return errors.New("invalid envelope: signature required")
	}
	switch env.AlgorithmSuite {
	case legacyStandardAlgorithmSuite, legacyTopSecretAlgorithmSuite, sovereignAcceleratedAlgorithmSuite, sovereignTopSecretAlgorithmSuite:
	default:
		return errors.New("unsupported message algorithm suite")
	}
	if env.AlgorithmSuite == sovereignAcceleratedAlgorithmSuite || env.AlgorithmSuite == sovereignTopSecretAlgorithmSuite {
		profileMatchesSuite := (env.AlgorithmSuite == sovereignAcceleratedAlgorithmSuite && env.SovereignProfile == "accelerated") ||
			(env.AlgorithmSuite == sovereignTopSecretAlgorithmSuite && env.SovereignProfile == "top-secret")
		hqcCiphertext, decodeErr := hex.DecodeString(env.HQCCiphertext)
		if !profileMatchesSuite || decodeErr != nil || len(hqcCiphertext) != 14421 {
			return errors.New("invalid sovereign envelope")
		}
	}
	if env.AlgorithmSuite == legacyTopSecretAlgorithmSuite || env.AlgorithmSuite == sovereignTopSecretAlgorithmSuite {
		if env.SignatureBundle.MLDSA87 == "" || env.SignatureBundle.MLDSA87Public == "" {
			s.RecordSecurityEvent(ctx, nil, &senderID, "message_tamper", "critical", "message_guard",
				"Top Secret Umschlag ohne ML-DSA-87 Signatur-Bundle.", "reject", r)
			return errors.New("invalid top secret envelope")
		}
	}

	return nil
}

// Message fan-out budgets (P-09 / FIND-011, CHAIN-003). These are per-user
// budgets across all sends in one minute; the per-request 256-recipient cap and
// the 30 MiB envelope cap in CheckMessageEnvelope remain in force.
const (
	messageFanoutRequestWindow   = time.Minute
	messageFanoutMaxRequests     = 60
	messageFanoutRecipientWindow = time.Minute
	messageFanoutMaxRecipients   = 600
	messageFanoutBytesWindow     = time.Minute
	messageFanoutMaxBytesMiB     = 64
)

// CheckMessageFanout enforces per-user send fan-out budgets before any
// distribution happens. Rejections record a security event and fail closed.
func (s *SecuritySystem) CheckMessageFanout(ctx context.Context, r *http.Request, senderID uuid.UUID, recipientCount int, envelopeBytes int) error {
	if s == nil {
		return errors.New("security system unavailable")
	}
	if recipientCount < 0 || envelopeBytes < 0 {
		return errors.New("invalid fan-out budget request")
	}
	material := senderID.String()

	requests, err := s.incrementCriticalRateLimit(ctx, "msg-send", material, messageFanoutRequestWindow)
	if err != nil {
		return errors.New("message throttled: quota backend unavailable")
	}
	if requests > messageFanoutMaxRequests {
		s.RecordSecurityEvent(ctx, nil, &senderID, "rate_limit", "medium", "message_guard",
			"Nachrichten-Sendebudget pro Minute überschritten.", "rate_limit", r)
		return errors.New("message send rate limit exceeded")
	}

	if recipientCount > 0 {
		recipients, err := s.incrementCriticalRateLimitBy(ctx, "msg-recipients", material, messageFanoutRecipientWindow, recipientCount)
		if err != nil {
			return errors.New("message throttled: quota backend unavailable")
		}
		if recipients > messageFanoutMaxRecipients {
			s.RecordSecurityEvent(ctx, nil, &senderID, "rate_limit", "medium", "message_guard",
				"Empfänger-Fanout-Budget pro Minute überschritten.", "rate_limit", r)
			return errors.New("message recipient budget exceeded")
		}
	}

	if envelopeBytes > 0 {
		units := (envelopeBytes + (1024*1024 - 1)) / (1024 * 1024)
		if units < 1 {
			units = 1
		}
		bytesCount, err := s.incrementCriticalRateLimitBy(ctx, "msg-bytes", material, messageFanoutBytesWindow, units)
		if err != nil {
			return errors.New("message throttled: quota backend unavailable")
		}
		if bytesCount > messageFanoutMaxBytesMiB {
			s.RecordSecurityEvent(ctx, nil, &senderID, "rate_limit", "medium", "message_guard",
				"Nachrichten-Bytebudget pro Minute überschritten.", "rate_limit", r)
			return errors.New("message byte budget exceeded")
		}
	}
	return nil
}
