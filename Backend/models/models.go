package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gaiacom/backend/core/uuid"
)

// JSONB is a byte slice that serialises to/from SQL as a JSON text column.
// It implements the database/sql driver.Valuer and sql.Scanner interfaces
// so it can be used directly with any database/sql driver.
type JSONB json.RawMessage

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	if s, ok := value.([]byte); ok {
		*j = append((*j)[0:0], s...)
		return nil
	}
	if text, ok := value.(string); ok {
		*j = append((*j)[0:0], text...)
		return nil
	}
	return errors.New("invalid JSONB scan source type")
}

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

func (j *JSONB) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("JSONB: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

type User struct {
	ID           uuid.UUID
	Username     string
	PasswordHash string
	PublicKey    string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Identities   []Identity
}

type DeviceSession struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"userId"`
	DeviceLabel string    `json:"deviceLabel"`
	DeviceType  string    `json:"deviceType"`
	OS          string    `json:"os"`
	Browser     string    `json:"browser"`
	IPAddress   string    `json:"ipAddress"`
	UserAgent   string    `json:"userAgent"`
	CreatedAt   time.Time `json:"createdAt"`
	LastSeenAt  time.Time `json:"lastSeenAt"`
	RevokedAt   time.Time `json:"revokedAt,omitempty"`
	IsCurrent   bool      `json:"isCurrent,omitempty"`
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

type Identity struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	GaiaID       string
	DisplayName  string
	Keys         JSONB
	PublicRecord JSONB
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

type MessageEnvelope struct {
	ID               uuid.UUID
	Type             string
	Sender           string
	Recipient        string
	Payload          JSONB
	Signature        string
	SenderIdentityID uuid.UUID `json:"senderIdentityId,omitempty"`
	ChannelID        string    `json:"channelId,omitempty"`
	CreatedAt        time.Time
	Untrusted        bool `json:"untrusted,omitempty"`
	IsRead           bool `json:"isRead,omitempty"`
}

type Inbox struct {
	ID         uint
	IdentityID uuid.UUID
	MessageID  uuid.UUID
	IsRead     bool
	Delivered  bool
	Untrusted  bool
	Identity   Identity
	Message    MessageEnvelope
}

type MessageProof struct {
	ID               uint              `json:"id"`
	MessageID        uuid.UUID         `json:"messageId"`
	SenderIdentity   uuid.UUID         `json:"senderIdentityId"`
	Sender           string            `json:"sender"`
	Recipient        string            `json:"recipient"`
	CiphertextHash   string            `json:"ciphertextHash"`
	SenderSignature  string            `json:"senderSignature"`
	EnvelopeHash     string            `json:"envelopeHash"`
	ServerReceivedAt time.Time         `json:"serverReceivedAt"`
	CreatedAt        time.Time         `json:"createdAt"`
	Receipts         []DeliveryReceipt `json:"receipts,omitempty"`
}

type DeliveryReceipt struct {
	ID             uint      `json:"id"`
	MessageID      uuid.UUID `json:"messageId"`
	IdentityID     uuid.UUID `json:"identityId"`
	Recipient      string    `json:"recipient"`
	Delivered      bool      `json:"delivered"`
	DeliveredAt    time.Time `json:"deliveredAt"`
	ReceiptHash    string    `json:"receiptHash"`
	TamperEvidence string    `json:"tamperEvidence"`
	CreatedAt      time.Time `json:"createdAt"`
}

type GaiaDropSubmission struct {
	ID               uuid.UUID `json:"id"`
	TargetIdentityID uuid.UUID `json:"targetIdentityId"`
	TargetGaiaID     string    `json:"targetGaiaId"`
	SenderLabel      string    `json:"senderLabel"`
	Payload          JSONB     `json:"payload"`
	PayloadHash      string    `json:"payloadHash"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"createdAt"`
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

type Room struct {
	ID          uuid.UUID
	Name        string
	IsPrivate   bool
	CreatedBy   uuid.UUID
	Description string
	Avatar      string
	SecretHash  string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Members     []RoomMember
}

type Channel struct {
	ID        uuid.UUID `json:"id"`
	RoomID    uuid.UUID `json:"roomId"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type RoomMember struct {
	ID         uint
	RoomID     uuid.UUID
	IdentityID uuid.UUID
	Role       string
	JoinedAt   time.Time
	Identity   Identity
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

type FileMetadata struct {
	FileID       uuid.UUID
	UserID       uuid.UUID
	FileName     string
	FileSize     int64
	FileHash     string
	MimeType     string
	EncryptionIV string
	Path         string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Chunks       []FileChunk
}

type FileChunk struct {
	ID        uint
	FileID    uuid.UUID
	Index     int
	ChunkHash string
	ChunkSize int64
	MinioID   string
}

// ---------------------------------------------------------------------------
// Federation — Protocol Data Units
// ---------------------------------------------------------------------------

type PDU struct {
	PDUID       string `json:"id"`
	Type        string `json:"type"`
	Sender      string `json:"sender"`
	Destination string `json:"destination"`
	Payload     string `json:"payload"`
	CreatedAt   int64  `json:"created_at"`
	Signature   string `json:"signature,omitempty"`
	PDUHash     string `json:"pdu_hash,omitempty"`
}

type FederationServer struct {
	ID          uint
	Domain      string
	PublicKey   []byte
	FirstSeenAt time.Time
	LastSeenAt  time.Time
	IsBlocked   bool
}

type QueueStatus string

const (
	QueueStatusPending QueueStatus = "pending"
	QueueStatusSending QueueStatus = "sending"
	QueueStatusFailed  QueueStatus = "failed"
)

type FederationQueue struct {
	ID         uint
	PDUID      string
	PDUPayload JSONB
	TargetURL  string
	Status     QueueStatus
	Attempts   int
	LastError  string
	NextRetry  time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Report struct {
	ID                 uint      `json:"id"`
	MessageID          string    `json:"messageId"`
	SenderPublicKey    string    `json:"senderPublicKey"`
	RecipientPublicKey string    `json:"recipientPublicKey"`
	CiphertextHash     string    `json:"ciphertextHash"`
	ReportProof        string    `json:"reportProof"`
	EpochHash          string    `json:"epochHash"`
	CreatedAt          time.Time `json:"createdAt"`
}

type AbuseScore struct {
	SenderPublicKey  string    `json:"senderPublicKey"`
	Score            int       `json:"score"`
	EscalationLevel  int       `json:"escalationLevel"`
	FrictionLimit    float64   `json:"frictionLimit"`
	QuarantinedUntil time.Time `json:"quarantinedUntil"`
	TimeoutUntil     time.Time `json:"timeoutUntil"`
	UpdatedAt        time.Time `json:"updatedAt"`
}
