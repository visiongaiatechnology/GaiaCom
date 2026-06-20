package repository

import (
	"context"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

type Store interface {
	AuthStore
	IdentityStore
	MessageStore
	StorageStore
	FederationStore
	RoomStore
	TrustMeshStore
	GaiaDropStore
}

type AuthStore interface {
	CountUsersByUsername(username string) (int64, error)
	CreateUser(user *models.User) error
	FindUserByID(id uuid.UUID) (*models.User, error)
	FindUserByUsername(username string) (*models.User, error)
	UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error
	CreateDeviceSession(ctx context.Context, session *models.DeviceSession) error
	FindDeviceSessionsForUser(ctx context.Context, userID uuid.UUID) ([]models.DeviceSession, error)
	FindActiveDeviceSession(ctx context.Context, sessionID uuid.UUID) (*models.DeviceSession, error)
	UpdateDeviceSessionLastSeen(ctx context.Context, sessionID uuid.UUID, lastSeenAt time.Time) error
	RevokeDeviceSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error
}

type IdentityStore interface {
	CountIdentitiesByGaiaID(gaiaID string) (int64, error)
	CreateIdentity(identity *models.Identity) error
	FindIdentityByGaiaID(gaiaID string) (*models.Identity, error)
	FindIdentityByID(id uuid.UUID) (*models.Identity, error)
	FindIdentitiesByUserID(userID uuid.UUID) ([]models.Identity, error)
	IdentityBelongsToUser(identityID uuid.UUID, userID uuid.UUID) (bool, error)
}

type MessageStore interface {
	SaveMessageEnvelopeWithInbox(ctx context.Context, envelope *models.MessageEnvelope, recipientIDs []uuid.UUID) error
	FindInboxEntriesByIdentity(ctx context.Context, identityID uuid.UUID) ([]models.Inbox, error)
	FindMessageEnvelopesByIDs(ctx context.Context, ids []uuid.UUID) ([]*models.MessageEnvelope, error)
	FindMessageProofForUser(ctx context.Context, userID uuid.UUID, messageID uuid.UUID) (*models.MessageProof, error)
	MarkInboxMessagesReadForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) error
	DeleteInboxMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, forEveryone bool) error
	ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool) (int64, error)
}

type StorageStore interface {
	CreateFileMetadata(metadata *models.FileMetadata) error
	FindPendingFileForUser(fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error)
	CreateFileChunk(chunk *models.FileChunk) error
	FinalizePendingUpload(fileID uuid.UUID, userID uuid.UUID) (bool, error)
}

type FederationStore interface {
	AddFederationQueueItem(item *models.FederationQueue) error
	ClaimNextFederationQueueItem(ctx context.Context) (*models.FederationQueue, error)
	DeleteFederationQueueItem(ctx context.Context, itemID uint) error
	SaveFederationQueueItem(ctx context.Context, item *models.FederationQueue) error
	FindFederationServer(domain string) (*models.FederationServer, error)
	CreateFederationServer(server *models.FederationServer) error
	UpdateFederationServerLastSeen(server *models.FederationServer) error
	FindAllFederationServers() ([]models.FederationServer, error)
}

type RoomStore interface {
	CreateRoomWithMembers(ctx context.Context, room *models.Room, members []models.RoomMember) error
	FindRooms(ctx context.Context, userID uuid.UUID) ([]models.Room, error)
	FindRoomByID(ctx context.Context, roomID uuid.UUID) (*models.Room, error)
	FindRoomBySecretHash(ctx context.Context, hash string) (*models.Room, error)
	UpdateRoomMetadataForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string) (*models.Room, error)
	CreateChannel(ctx context.Context, channel *models.Channel) error
	FindChannelsByRoom(ctx context.Context, roomID uuid.UUID) ([]models.Channel, error)
	AddRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID, role string) error
	RemoveRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID) error
	UpdateRoomMemberRoleForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, identityID uuid.UUID, role string) error
	UserIsRoomAdmin(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) (bool, error)
	DeleteRoom(ctx context.Context, roomID uuid.UUID) error
}

type TrustMeshStore interface {
	CreateReport(report *models.Report) error
	GetReportByProof(proof string) (*models.Report, error)
	GetReportsCountForEpochHash(epochHash string) (int, error)
	HasReportedInEpoch(senderPubKey, recipientPubKey, epochHash string) (bool, error)
	GetAbuseScore(senderPubKey string) (*models.AbuseScore, error)
	SaveAbuseScore(score *models.AbuseScore) error
}

type GaiaDropStore interface {
	CreateGaiaDropSubmission(ctx context.Context, drop *models.GaiaDropSubmission) error
	FindGaiaDropSubmissionsForIdentity(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.GaiaDropSubmission, error)
	MarkGaiaDropRead(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error
	DeleteGaiaDrop(ctx context.Context, userID uuid.UUID, dropID uuid.UUID) error
}
