// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"gaiacom/backend/core/uuid"
)

type plainEnvelope struct {
	ID                string      `json:"id"`
	ClientMessageID   string      `json:"client_message_id"`
	Timestamp         interface{} `json:"timestamp"`
	AlgorithmSuite    string      `json:"algorithm_suite"`
	Signature         string      `json:"signature"`
	SignatureBundle   struct {
		Ed25519        string `json:"ed25519"`
		MLDSA87        string `json:"ml_dsa_87"`
		MLDSA87Public  string `json:"ml_dsa_87_public"`
	} `json:"signature_bundle"`
	Payload           string      `json:"payload"`
	PayloadCiphertext string      `json:"payload_ciphertext"`
	RoomID            string      `json:"room_id"`
}

const topSecretAlgorithmSuite = "GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87"

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
	if env.AlgorithmSuite == topSecretAlgorithmSuite {
		if env.SignatureBundle.MLDSA87 == "" || env.SignatureBundle.MLDSA87Public == "" {
			s.RecordSecurityEvent(ctx, nil, &senderID, "message_tamper", "critical", "message_guard",
				"Top Secret Umschlag ohne ML-DSA-87 Signatur-Bundle.", "reject", r)
			return errors.New("invalid top secret envelope")
		}
	}

	return nil
}
