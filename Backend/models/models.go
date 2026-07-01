// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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
	ID                  uuid.UUID
	Username            string
	PasswordHash        string
	PublicKey           string
	AllowAnonymousStats bool `json:"allowAnonymousStats"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
	Identities          []Identity
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

type IdentityPublicProfile struct {
	RealName    string `json:"realName,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	Bio         string `json:"bio,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
	Website     string `json:"website,omitempty"`
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

type MessageEnvelope struct {
	ID                  uuid.UUID
	Type                string
	Sender              string
	Recipient           string
	Payload             JSONB
	Signature           string
	SenderIdentityID    uuid.UUID `json:"senderIdentityId,omitempty"`
	ChannelID           string    `json:"channelId,omitempty"`
	ReadReceiptSourceID uuid.UUID `json:"readReceiptSourceId,omitempty"`
	ClientMessageID     string    `json:"clientMessageId,omitempty"`
	ReplacedByMessageID uuid.UUID `json:"replacedByMessageId,omitempty"`
	EditedAt            time.Time `json:"editedAt,omitempty"`
	CreatedAt           time.Time
	Untrusted           bool            `json:"untrusted,omitempty"`
	IsRead              bool            `json:"isRead,omitempty"`
	Delivered           bool            `json:"delivered,omitempty"`
	Reactions           map[string]int  `json:"reactions,omitempty"`
	ReactedByMe         map[string]bool `json:"reactedByMe,omitempty"`
	Mailbox             *MailboxState   `json:"mailbox,omitempty"`
}

type MessageReactionState struct {
	Reactions   map[string]int  `json:"reactions"`
	ReactedByMe map[string]bool `json:"reactedByMe"`
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

type MessageReadReceipt struct {
	ID         uint      `json:"id"`
	MessageID  uuid.UUID `json:"messageId"`
	IdentityID uuid.UUID `json:"identityId"`
	Reader     string    `json:"reader"`
	ReadAt     time.Time `json:"readAt"`
	CreatedAt  time.Time `json:"createdAt"`
}

type IdentityPresence struct {
	IdentityID uuid.UUID `json:"identityId"`
	UserID     uuid.UUID `json:"userId,omitempty"`
	GaiaID     string    `json:"gaiaId"`
	Status     string    `json:"status"`
	IsOnline   bool      `json:"isOnline"`
	LastSeenAt time.Time `json:"lastSeenAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type DirectTypingState struct {
	ActorGaiaID string `json:"actorGaiaId"`
	IsTyping    bool   `json:"isTyping"`
}

type ChannelTypingState struct {
	ActorGaiaID string `json:"actorGaiaId"`
	IsTyping    bool   `json:"isTyping"`
}

type TypingStatusResponse struct {
	Direct  *DirectTypingState   `json:"direct,omitempty"`
	Channel []ChannelTypingState `json:"channel,omitempty"`
}

type MailboxState struct {
	UserID       uuid.UUID `json:"userId"`
	IdentityID   uuid.UUID `json:"identityId"`
	MessageID    uuid.UUID `json:"messageId"`
	Folder       string    `json:"folder"`
	IsRead       bool      `json:"isRead"`
	IsStarred    bool      `json:"isStarred"`
	IsImportant  bool      `json:"isImportant"`
	IsSpam       bool      `json:"isSpam"`
	IsArchived   bool      `json:"isArchived"`
	Labels       JSONB     `json:"labels"`
	SnoozedUntil time.Time `json:"snoozedUntil,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type MailDraft struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"userId"`
	IdentityID      uuid.UUID `json:"identityId"`
	RecipientGaia   string    `json:"recipientGaia"`
	RecipientIDs    JSONB     `json:"recipientIds"`
	Subject         string    `json:"subject"`
	Body            string    `json:"body"`
	EnvelopeDraft   JSONB     `json:"envelopeDraft"`
	Attachments     JSONB     `json:"attachments"`
	ScheduledFor    time.Time `json:"scheduledFor,omitempty"`
	SecurityWarning string    `json:"securityWarning,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type MailLabel struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type MailContact struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"userId"`
	GaiaID      string    `json:"gaiaId"`
	DisplayName string    `json:"displayName"`
	Email       string    `json:"email"`
	TrustNote   string    `json:"trustNote"`
	PublicKey   string    `json:"publicKey"`
	Blocked     bool      `json:"blocked"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type MailFilterRule struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"userId"`
	SenderContains  string    `json:"senderContains"`
	SubjectContains string    `json:"subjectContains"`
	AssignLabel     string    `json:"assignLabel"`
	TargetFolder    string    `json:"targetFolder"`
	MarkImportant   bool      `json:"markImportant"`
	Enabled         bool      `json:"enabled"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type MailSettings struct {
	UserID         uuid.UUID `json:"userId"`
	Signature      string    `json:"signature"`
	Locale         string    `json:"locale"`
	Theme          string    `json:"theme"`
	KeyboardMode   string    `json:"keyboardMode"`
	OnboardingDone bool      `json:"onboardingDone"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type GlobalSearchResult struct {
	Kind      string    `json:"kind"`
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Snippet   string    `json:"snippet"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
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
	ID              uuid.UUID
	Name            string
	IsPrivate       bool
	CreatedBy       uuid.UUID
	Description     string
	Avatar          string
	SecretHash      string
	ReadOnly        bool
	SlowModeSeconds int
	TopSecret       bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Members         []RoomMember
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

type RoomPinnedMessage struct {
	RoomID    uuid.UUID `json:"roomId"`
	ChannelID uuid.UUID `json:"channelId"`
	MessageID uuid.UUID `json:"messageId"`
	PinnedBy  uuid.UUID `json:"pinnedBy"`
	PinnedAt  time.Time `json:"pinnedAt"`
}

type RoomInviteLink struct {
	ID        string    `json:"id"`
	RoomID    uuid.UUID `json:"roomId"`
	CreatedBy uuid.UUID `json:"createdBy"`
	ExpiresAt time.Time `json:"expiresAt"`
	MaxUses   int       `json:"maxUses"`
	Uses      int       `json:"uses"`
	CreatedAt time.Time `json:"createdAt"`
}

type RoomJoinRequest struct {
	ID         uuid.UUID `json:"id"`
	RoomID     uuid.UUID `json:"roomId"`
	IdentityID uuid.UUID `json:"identityId"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Identity   *Identity `json:"identity,omitempty"`
}

type RoomModerationLog struct {
	ID              uint      `json:"id"`
	RoomID          uuid.UUID `json:"roomId"`
	ActorIdentityID uuid.UUID `json:"actorIdentityId"`
	Action          string    `json:"action"`
	TargetID        string    `json:"targetId"`
	Details         string    `json:"details"`
	CreatedAt       time.Time `json:"createdAt"`
}

// ---------------------------------------------------------------------------
// Public Channels
// ---------------------------------------------------------------------------

type PublicChannel struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Avatar           JSONB     `json:"avatar"`
	CreatedBy        uuid.UUID `json:"createdBy"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	SubscriberCount  int64     `json:"subscriberCount"`
	IsSubscribed     bool      `json:"isSubscribed"`
	IsAdmin          bool      `json:"isAdmin"`
	IsSuspended      bool      `json:"isSuspended"`
	SuspensionReason string    `json:"suspensionReason"`
	IsVerified       bool      `json:"isVerified"`
	CommentsEnabled  bool      `json:"commentsEnabled"`
	Category         string    `json:"category"`
	IsBlocked        bool      `json:"isBlocked"`
}

type GovernancePolicy struct {
	ID              uuid.UUID `json:"id"`
	Version         string    `json:"version"`
	EffectiveFrom   time.Time `json:"effectiveFrom"`
	Categories      JSONB     `json:"categories"`
	Thresholds      JSONB     `json:"thresholds"`
	SignedBy        JSONB     `json:"signedBy"`
	SignatureBundle JSONB     `json:"signatureBundle"`
	CreatedAt       time.Time `json:"createdAt"`
}

type RoleCredential struct {
	ID               string    `json:"id"`
	Role             string    `json:"role"`
	SubjectIdentity  string    `json:"subjectIdentity"`
	SubjectPublicKey string    `json:"subjectPublicKey"`
	Scope            string    `json:"scope"`
	ValidFrom        time.Time `json:"validFrom"`
	ValidUntil       time.Time `json:"validUntil"`
	Permissions      JSONB     `json:"permissions"`
	Cannot           JSONB     `json:"cannot"`
	Issuer           string    `json:"issuer"`
	PolicyHash       string    `json:"policyHash"`
	Signature        string    `json:"signature"`
	CreatedAt        time.Time `json:"createdAt"`
}

type RoleCredentialRevocation struct {
	ID              string    `json:"id"`
	CredentialID    string    `json:"credentialId"`
	RevokedAt       time.Time `json:"revokedAt"`
	ReasonCode      string    `json:"reasonCode"`
	PolicyHash      string    `json:"policyHash"`
	SignedBy        JSONB     `json:"signedBy"`
	SignatureBundle JSONB     `json:"signatureBundle"`
}

type AbuseCase struct {
	ID                   string    `json:"id"`
	CaseType             string    `json:"caseType"`
	Category             string    `json:"category"`
	Severity             string    `json:"severity"`
	ReporterIdentityHash string    `json:"reporterIdentityHash"`
	ReportedIdentityHash string    `json:"reportedIdentityHash"`
	ReportedNode         string    `json:"reportedNode"`
	MessageID            *string   `json:"messageId"`
	MessageHash          string    `json:"messageHash"`
	GaiaProof            JSONB     `json:"gaiaProof"`
	Disclosure           JSONB     `json:"disclosure"`
	Status               string    `json:"status"`
	Decision             *string   `json:"decision"`
	CreatedAt            time.Time `json:"createdAt"`
}

type AbuseCaseEvent struct {
	ID            int64     `json:"id"`
	CaseID        string    `json:"caseId"`
	EventType     string    `json:"eventType"`
	ActorIdentity string    `json:"actorIdentity"`
	Details       string    `json:"details"`
	Timestamp     time.Time `json:"timestamp"`
}

type AbuseReview struct {
	ID               string    `json:"id"`
	CaseID           string    `json:"caseId"`
	ReviewerIdentity string    `json:"reviewerIdentity"`
	CredentialID     string    `json:"credentialId"`
	ReviewedAt       time.Time `json:"reviewedAt"`
	CategoryVote     string    `json:"categoryVote"`
	SeverityVote     string    `json:"severityVote"`
	Recommendation   string    `json:"recommendation"`
	ReasonCode       string    `json:"reasonCode"`
	VisibleReason    string    `json:"visibleReason"`
	PrivateNoteHash  string    `json:"privateNoteHash"`
	Signature        string    `json:"signature"`
}

type AbuseAction struct {
	ID         string    `json:"id"`
	CaseID     string    `json:"caseId"`
	TargetType string    `json:"targetType"`
	TargetID   string    `json:"targetId"`
	ActionType string    `json:"actionType"`
	Severity   string    `json:"severity"`
	AppliedAt  time.Time `json:"appliedAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
	Reason     string    `json:"reason"`
	Signature  string    `json:"signature"`
}

type AbuseAppeal struct {
	ID             string    `json:"id"`
	CaseID         string    `json:"caseId"`
	SubmittedBy    string    `json:"submittedBy"`
	SubmittedAt    time.Time `json:"submittedAt"`
	Reason         string    `json:"reason"`
	Statement      string    `json:"statement"`
	Status         string    `json:"status"`
	DecisionReason string    `json:"decisionReason"`
	DecidedAt      string    `json:"decidedAt"`
	DecidedBy      string    `json:"decidedBy"`
	Signature      string    `json:"signature"`
}

type FederationAbuseSignal struct {
	ID                   int64     `json:"id"`
	ReportedIdentityHash string    `json:"reportedIdentityHash"`
	SourceNode           string    `json:"sourceNode"`
	CaseHash             string    `json:"caseHash"`
	Category             string    `json:"category"`
	Severity             string    `json:"severity"`
	ActionTaken          string    `json:"actionTaken"`
	Timestamp            time.Time `json:"timestamp"`
	Signature            string    `json:"signature"`
}

type TransparencySnapshot struct {
	ID           int64     `json:"id"`
	Node         string    `json:"node"`
	Period       string    `json:"period"`
	SnapshotData JSONB     `json:"snapshotData"`
	Timestamp    time.Time `json:"timestamp"`
	Signature    string    `json:"signature"`
}

type PublicChannelPost struct {
	ID               uuid.UUID                       `json:"id"`
	ChannelID        uuid.UUID                       `json:"channelId"`
	AuthorIdentityID uuid.UUID                       `json:"authorIdentityId"`
	Body             string                          `json:"body"`
	Formatting       JSONB                           `json:"formatting"`
	Attachments      JSONB                           `json:"attachments"`
	CreatedAt        time.Time                       `json:"createdAt"`
	IsPinned         bool                            `json:"isPinned"`
	PinnedAt         time.Time                       `json:"pinnedAt,omitempty"`
	ReactionState    *PublicChannelPostReactionState `json:"reactionState,omitempty"`
	Comments         []PublicChannelPostComment      `json:"comments,omitempty"`
	ScheduledFor     string                          `json:"scheduledFor,omitempty"`
}

type PublicChannelPostReactionState struct {
	Reactions   map[string]int  `json:"reactions"`
	ReactedByMe map[string]bool `json:"reactedByMe"`
}

type PublicChannelPostComment struct {
	ID                uuid.UUID `json:"id"`
	PostID            uuid.UUID `json:"postId"`
	AuthorIdentityID  uuid.UUID `json:"authorIdentityId"`
	AuthorDisplayName string    `json:"authorDisplayName"`
	AuthorGaiaID      string    `json:"authorGaiaId"`
	Body              string    `json:"body"`
	CreatedAt         time.Time `json:"createdAt"`
	Status            string    `json:"status,omitempty"`
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
	PDUID          string `json:"id"`
	Type           string `json:"type"`
	Sender         string `json:"sender"`
	Destination    string `json:"destination"`
	Payload        string `json:"payload"`
	AlgorithmSuite string `json:"algorithm_suite,omitempty"`
	CreatedAt      int64  `json:"created_at"`
	Signature      string `json:"signature,omitempty"`
	PDUHash        string `json:"pdu_hash,omitempty"`
}

type FederationServer struct {
	ID          uint
	Domain      string
	PublicKey   []byte
	FirstSeenAt time.Time
	LastSeenAt  time.Time
	IsBlocked   bool
}

type NodeRegistryEntry struct {
	ID              uint      `json:"id"`
	Domain          string    `json:"domain"`
	ServerName      string    `json:"serverName"`
	PublicKey       []byte    `json:"-"`
	PublicKeyBase64 string    `json:"publicKey"`
	CoreHash        string    `json:"coreHash"`
	NodeVersion     string    `json:"nodeVersion"`
	OperatorGaiaID  string    `json:"operatorGaiaId"`
	Status          string    `json:"status"`
	LastError       string    `json:"lastError"`
	PingCount       int64     `json:"pingCount"`
	FirstSeenAt     time.Time `json:"firstSeenAt"`
	LastSeenAt      time.Time `json:"lastSeenAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
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

type NetworkHealthMetrics struct {
	Accounts             int64 `json:"accounts"`
	Identities           int64 `json:"identities"`
	Nodes                int64 `json:"nodes"`
	Rooms                int64 `json:"rooms"`
	Messages24h          int64 `json:"messages24h"`
	GaiaDrops24h         int64 `json:"gaiaDrops24h"`
	FederationEvents24h  int64 `json:"federationEvents24h"`
	SecurityEvents24h    int64 `json:"securityEvents24h"`
	BlockedRequests24h   int64 `json:"blockedRequests24h"`
	SMTPShieldEvents24h  int64 `json:"smtpShieldEvents24h"`
	FederationRejects24h int64 `json:"federationRejects24h"`
}

type SecurityEvent struct {
	ID              int64      `json:"id"`
	EventID         string     `json:"event_id"`
	OwnerUserID     *uuid.UUID `json:"owner_user_id,omitempty"`
	OwnerIdentityID *uuid.UUID `json:"owner_identity_id,omitempty"`
	NodeID          string     `json:"node_id"`
	Category        string     `json:"category"`
	Severity        string     `json:"severity"`
	Source          string     `json:"source"`
	Summary         string     `json:"summary"`
	Action          string     `json:"action"`
	PublicVisible   bool       `json:"public_visible"`
	UserVisible     bool       `json:"user_visible"`
	NodeVisible     bool       `json:"node_visible"`
	CreatedAt       time.Time  `json:"created_at"`
	AcknowledgedAt  *time.Time `json:"acknowledged_at,omitempty"`
}

type SecurityEventPrivateContext struct {
	EventID             string    `json:"event_id"`
	IPHash              string    `json:"ip_hash"`
	UserAgentHash       string    `json:"user_agent_hash"`
	RuleID              string    `json:"rule_id"`
	RequestID           string    `json:"request_id"`
	InternalContextJSON string    `json:"internal_context_json"`
	CreatedAt           time.Time `json:"created_at"`
	RetentionUntil      time.Time `json:"retention_until"`
}

type SecurityRule struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
}

type SecurityRuleHit struct {
	ID        int64     `json:"id"`
	RuleID    string    `json:"rule_id"`
	EventID   string    `json:"event_id"`
	CreatedAt time.Time `json:"created_at"`
}

type SecurityUserAcknowledgement struct {
	EventID        string    `json:"event_id"`
	UserID         uuid.UUID `json:"user_id"`
	AcknowledgedAt time.Time `json:"acknowledged_at"`
}

type SecurityRateLimit struct {
	Key       string    `json:"key"`
	Value     int       `json:"value"`
	ExpiresAt time.Time `json:"expires_at"`
}

type SecurityQuarantine struct {
	ID        string    `json:"id"`
	Target    string    `json:"target"`
	Reason    string    `json:"reason"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type SecurityAuditChain struct {
	EventID      string    `json:"event_id"`
	PreviousHash string    `json:"previous_hash"`
	EventHash    string    `json:"event_hash"`
	CreatedAt    time.Time `json:"created_at"`
	Signature    string    `json:"signature,omitempty"`
}

type NodeSecuritySummary struct {
	TotalEvents         int64            `json:"totalEvents"`
	AuthAttackCount     int64            `json:"authAttackCount"`
	RateLimitedRequests int64            `json:"rateLimitedRequests"`
	SMTPShieldEvents    int64            `json:"smtpShieldEvents"`
	FederationEvents    int64            `json:"federationEvents"`
	GovernanceEvents    int64            `json:"governanceEvents"`
	TopEventCategories  map[string]int64 `json:"topEventCategories"`
	CurrentQuarantines  int64            `json:"currentQuarantines"`
	RuleHealth          string           `json:"ruleHealth"`
}

type PublicSecuritySummary struct {
	GaiaShieldActive      bool   `json:"gaiaShieldActive"`
	SecurityEvents24h     int64  `json:"securityEvents24h"`
	BlockedRequests24h    int64  `json:"blockedRequests24h"`
	SMTPShieldEvents24h   int64  `json:"smtpShieldEvents24h"`
	FederationRejects24h  int64  `json:"federationRejects24h"`
	PolicyVersion         string `json:"policyVersion"`
	NodeGovernanceVersion string `json:"nodeGovernanceVersion"`
}

// ---------------------------------------------------------------------------
// GSN (GaiaSocialNetwork)
// ---------------------------------------------------------------------------

type GsnPost struct {
	ID                   string `json:"id"`
	GaiaID               string `json:"gaiaId"`
	DisplayName          string `json:"displayName"`
	Avatar               string `json:"avatar"`
	NodeID               string `json:"nodeId"`
	Timestamp            string `json:"timestamp"`
	Body                 string `json:"body"`
	ImageAttachment      string `json:"imageAttachment"`
	Signature            string `json:"signature"`
	RepostOfPostID       string `json:"repostOfPostId"`
	IsVerifiedOperator   bool   `json:"isVerifiedOperator"`
	IsVerifiedGovernance bool   `json:"isVerifiedGovernance"`
	IsVerifiedPassport   bool   `json:"isVerifiedPassport"`
}

type GsnComment struct {
	ID          string `json:"id"`
	PostID      string `json:"postId"`
	GaiaID      string `json:"gaiaId"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
	Timestamp   string `json:"timestamp"`
	Body        string `json:"body"`
	Signature   string `json:"signature"`
}

type GsnProfile struct {
	IdentityID           string `json:"identityId"`
	GaiaID               string `json:"gaiaId"`
	RealName             string `json:"realName"`
	DisplayName          string `json:"displayName"`
	Description          string `json:"description"`
	Avatar               string `json:"avatar"`
	Website              string `json:"website"`
	IsVerifiedOperator   bool   `json:"isVerifiedOperator"`
	IsVerifiedGovernance bool   `json:"isVerifiedGovernance"`
	IsVerifiedPassport   bool   `json:"isVerifiedPassport"`
	TrustPassportSummary string `json:"trustPassportSummary"`
	FollowersCount       int    `json:"followersCount"`
	FollowingCount       int    `json:"followingCount"`
	UpdatedAt            string `json:"updatedAt"`
}
