// STATUS: DIAMANT VGT SUPREME
package transportqueue

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"gaiacom/backend/core/uuid"
)

const (
	MaxPayloadBytes   = 64 * 1024 * 1024
	MaxSignatureBytes = 4096
	MaxAttempts       = 12
	DefaultLease      = 2 * time.Minute
	MaxRetention      = 30 * 24 * time.Hour
)

var (
	ErrInvalidInput = errors.New("transport queue input rejected")
	ErrConflict     = errors.New("transport queue identity conflict")
	ErrLeaseLost    = errors.New("transport queue lease lost")
	ErrIntegrity    = errors.New("transport queue integrity failure")
)

type Transport uint8

const (
	TransportInternet     Transport = 1
	TransportLocalNetwork Transport = 2
	TransportBluetooth    Transport = 4
	TransportAll                    = TransportInternet | TransportLocalNetwork | TransportBluetooth
)

func (t Transport) ValidSingle() bool {
	return t == TransportInternet || t == TransportLocalNetwork || t == TransportBluetooth
}

func (t Transport) Name() string {
	switch t {
	case TransportInternet:
		return "internet"
	case TransportLocalNetwork:
		return "local_network"
	case TransportBluetooth:
		return "bluetooth"
	default:
		return ""
	}
}

type Envelope struct {
	ID                string
	Recipient         string
	Payload           []byte
	PayloadHash       [sha256.Size]byte
	Signature         []byte
	AllowedTransports Transport
	Priority          uint8
	Attempts          int
	CreatedAt         time.Time
	ExpiresAt         time.Time
}

type Lease struct {
	Envelope
	Owner string
	Until time.Time
}

type InboundClaim uint8

const (
	InboundAccepted InboundClaim = iota + 1
	InboundDuplicate
)

type Store interface {
	Enqueue(ctx context.Context, envelope Envelope) (bool, error)
	Claim(ctx context.Context, now time.Time, leaseDuration time.Duration) (*Lease, error)
	Complete(ctx context.Context, lease Lease, via Transport, now time.Time) error
	Defer(ctx context.Context, lease Lease, errorCode string, nextAttempt time.Time, deadLetter bool, now time.Time) error
	ClaimInbound(ctx context.Context, envelopeID string, payloadHash [sha256.Size]byte, via Transport, now, expiresAt time.Time) (InboundClaim, error)
}

func NewEnvelope(id, recipient string, payload, signature []byte, allowed Transport, priority uint8, now, expiresAt time.Time) (Envelope, error) {
	if _, err := uuid.Parse(id); err != nil || !validRecipient(recipient) || len(payload) == 0 || len(payload) > MaxPayloadBytes {
		return Envelope{}, ErrInvalidInput
	}
	if len(signature) == 0 || len(signature) > MaxSignatureBytes || allowed == 0 || allowed&^TransportAll != 0 || priority > 100 {
		return Envelope{}, ErrInvalidInput
	}
	now = now.UTC()
	expiresAt = expiresAt.UTC()
	if now.IsZero() || !expiresAt.After(now) || expiresAt.After(now.Add(MaxRetention)) {
		return Envelope{}, ErrInvalidInput
	}
	return Envelope{
		ID:                id,
		Recipient:         recipient,
		Payload:           append([]byte(nil), payload...),
		PayloadHash:       sha256.Sum256(payload),
		Signature:         append([]byte(nil), signature...),
		AllowedTransports: allowed,
		Priority:          priority,
		CreatedAt:         now,
		ExpiresAt:         expiresAt,
	}, nil
}

func VerifyPayload(payload []byte, expected [sha256.Size]byte) bool {
	actual := sha256.Sum256(payload)
	return subtle.ConstantTimeCompare(actual[:], expected[:]) == 1
}

func NewLeaseOwner() (string, error) {
	var entropy [32]byte
	if _, err := rand.Read(entropy[:]); err != nil {
		return "", ErrIntegrity
	}
	return hex.EncodeToString(entropy[:]), nil
}

func RetryDelay(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	return time.Duration(1<<uint(attempt-1)) * time.Second
}

func ValidErrorCode(value string) bool {
	if len(value) < 1 || len(value) > 64 {
		return false
	}
	for _, r := range value {
		if !(r == '_' || r == '-' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9') {
			return false
		}
	}
	return true
}

func validRecipient(value string) bool {
	if value == "" || value != strings.TrimSpace(value) || len(value) > 255 || !utf8.ValidString(value) {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return false
		}
	}
	return true
}
