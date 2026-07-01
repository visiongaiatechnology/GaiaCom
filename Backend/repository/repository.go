// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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
	MailboxStore
	StorageStore
	FederationStore
	RoomStore
	TrustMeshStore
	GaiaDropStore
	NetworkHealthStore
	PublicChannelStore
	GovernanceStore
	SecurityStore
	PresenceStore
	GsnStore
}

type AuthStore interface {
	CountUsersByUsername(username string) (int64, error)
	CreateUser(user *models.User) error
	FindUserByID(id uuid.UUID) (*models.User, error)
	FindUserByUsername(username string) (*models.User, error)
	UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error
	UpdateUserAnonymousStats(ctx context.Context, userID uuid.UUID, allow bool) error
	DeleteUserAccount(ctx context.Context, userID uuid.UUID) error
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
	UpdateIdentityPublicProfile(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, profile models.IdentityPublicProfile) (*models.Identity, error)
	UpdateIdentityHumanProof(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, proof map[string]interface{}) (*models.Identity, error)
	FindAllIdentities(ctx context.Context) ([]models.Identity, error)
	IsContactBlocked(ctx context.Context, userID uuid.UUID, gaiaID string) (bool, error)
}

type MessageStore interface {
	SaveMessageEnvelopeWithInbox(ctx context.Context, envelope *models.MessageEnvelope, recipientIDs []uuid.UUID) error
	FindInboxEntriesByIdentity(ctx context.Context, identityID uuid.UUID) ([]models.Inbox, error)
	FindMessageEnvelopesByIDs(ctx context.Context, ids []uuid.UUID) ([]*models.MessageEnvelope, error)
	FindMessageReactionsForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) (map[uuid.UUID]models.MessageReactionState, error)
	ToggleMessageReactionForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, emoji string) (*models.MessageReactionState, error)
	FindMessageProofForUser(ctx context.Context, userID uuid.UUID, messageID uuid.UUID) (*models.MessageProof, error)
	MarkInboxMessagesReadForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) error
	EditDirectMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, originalMessageID uuid.UUID, peerEnvelopeData []byte, selfEnvelopeData []byte) (uuid.UUID, error)
	DeleteInboxMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, forEveryone bool) error
	ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool, messageIDs []uuid.UUID) (int64, error)
}

type PresenceStore interface {
	UpsertIdentityPresence(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, status string) (*models.IdentityPresence, error)
	FindIdentityPresenceByGaiaIDs(ctx context.Context, gaiaIDs []string) (map[string]models.IdentityPresence, error)
}

type MailboxStore interface {
	FindMailboxMessages(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query MailboxQuery) ([]*models.MessageEnvelope, error)
	UpsertMailboxStates(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, states []models.MailboxState) error
	FindMailDrafts(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]models.MailDraft, error)
	FindDueMailDrafts(ctx context.Context, now time.Time) ([]models.MailDraft, error)
	SaveMailDraft(ctx context.Context, draft *models.MailDraft) error
	DeleteMailDraft(ctx context.Context, userID uuid.UUID, draftID uuid.UUID) error
	FindMailLabels(ctx context.Context, userID uuid.UUID) ([]models.MailLabel, error)
	SaveMailLabel(ctx context.Context, label *models.MailLabel) error
	FindMailContacts(ctx context.Context, userID uuid.UUID, query string) ([]models.MailContact, error)
	SaveMailContact(ctx context.Context, contact *models.MailContact) error
	FindMailFilterRules(ctx context.Context, userID uuid.UUID) ([]models.MailFilterRule, error)
	SaveMailFilterRule(ctx context.Context, rule *models.MailFilterRule) error
	GetMailSettings(ctx context.Context, userID uuid.UUID) (*models.MailSettings, error)
	SaveMailSettings(ctx context.Context, settings *models.MailSettings) error
	GlobalSearch(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, query string, limit int) ([]models.GlobalSearchResult, error)
}

type MailboxQuery struct {
	Folder    string
	Text      string
	From      string
	Subject   string
	DateFrom  time.Time
	DateTo    time.Time
	Label     string
	Unread    bool
	Starred   bool
	Important bool
	Limit     int
}

type StorageStore interface {
	CreateFileMetadata(metadata *models.FileMetadata) error
	FindPendingFileForUser(fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error)
	CreateFileChunk(chunk *models.FileChunk) error
	FinalizePendingUpload(fileID uuid.UUID, userID uuid.UUID) (bool, error)
	FindFileMetadata(fileID uuid.UUID) (*models.FileMetadata, error)
	FindAccessibleFileMetadata(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error)
	FindFileChunks(fileID uuid.UUID) ([]models.FileChunk, error)
	GrantFileAccessToIdentities(ctx context.Context, fileID uuid.UUID, ownerUserID uuid.UUID, identityIDs []uuid.UUID, expiresAt time.Time) error
	MarkFilePublic(ctx context.Context, fileID uuid.UUID, ownerUserID uuid.UUID) error
	SumStoredFileBytesForUser(ctx context.Context, userID uuid.UUID) (int64, error)
	DeleteExpiredFileAccessGrants(ctx context.Context, cutoffTime string) (int64, error)
	FindExpiredFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error)
	FindStalePendingFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error)
	DeleteFileMetadata(ctx context.Context, fileID uuid.UUID) error
}

type FederationStore interface {
	AddFederationQueueItem(item *models.FederationQueue) error
	ClaimNextFederationQueueItem(ctx context.Context) (*models.FederationQueue, error)
	DeleteFederationQueueItem(ctx context.Context, itemID uint) error
	SaveFederationQueueItem(ctx context.Context, item *models.FederationQueue) error
	FindFederationServer(domain string) (*models.FederationServer, error)
	CreateFederationServer(server *models.FederationServer) error
	UpdateFederationServerLastSeen(server *models.FederationServer) error
	SetFederationServerBlocked(ctx context.Context, domain string, blocked bool) error
	FindAllFederationServers() ([]models.FederationServer, error)
	UpsertNodeRegistryEntry(ctx context.Context, entry *models.NodeRegistryEntry) error
	FindNodeRegistryEntry(ctx context.Context, domain string) (*models.NodeRegistryEntry, error)
	FindAllNodeRegistryEntries(ctx context.Context) ([]models.NodeRegistryEntry, error)
	UpdateNodeRegistryStatus(ctx context.Context, domain string, status string, lastError string) error
}

type RoomStore interface {
	CreateRoomWithMembers(ctx context.Context, room *models.Room, members []models.RoomMember) error
	FindRooms(ctx context.Context, userID uuid.UUID) ([]models.Room, error)
	FindRoomByID(ctx context.Context, roomID uuid.UUID) (*models.Room, error)
	FindRoomBySecretHash(ctx context.Context, hash string) (*models.Room, error)
	UpdateRoomMetadataForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string) (*models.Room, error)
	UpdateRoomSettingsForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, name string, description string, avatar string, isPrivate bool, readOnly bool, slowModeSeconds int, topSecret bool) (*models.Room, error)
	CreateChannel(ctx context.Context, channel *models.Channel) error
	FindChannelsByRoom(ctx context.Context, roomID uuid.UUID) ([]models.Channel, error)
	AddRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID, role string) error
	RemoveRoomMember(ctx context.Context, roomID uuid.UUID, identityID uuid.UUID) error
	UpdateRoomMemberRoleForUser(ctx context.Context, userID uuid.UUID, roomID uuid.UUID, identityID uuid.UUID, role string) error
	UserIsRoomAdmin(ctx context.Context, userID uuid.UUID, roomID uuid.UUID) (bool, error)
	DeleteRoom(ctx context.Context, roomID uuid.UUID) error
	ToggleRoomMessagePin(ctx context.Context, roomID, channelID, messageID uuid.UUID, pinnedBy uuid.UUID) (bool, error)
	GetRoomPinnedMessages(ctx context.Context, roomID, channelID uuid.UUID) ([]uuid.UUID, error)
	CreateRoomInviteLink(ctx context.Context, invite *models.RoomInviteLink) error
	FindRoomInviteLink(ctx context.Context, token string) (*models.RoomInviteLink, error)
	UseRoomInviteLink(ctx context.Context, token string) error
	CreateRoomJoinRequest(ctx context.Context, req *models.RoomJoinRequest) error
	FindRoomJoinRequests(ctx context.Context, roomID uuid.UUID) ([]models.RoomJoinRequest, error)
	ModerateRoomJoinRequest(ctx context.Context, reqID uuid.UUID, status string) (*models.RoomJoinRequest, error)
	CreateRoomModerationLog(ctx context.Context, log *models.RoomModerationLog) error
	GetRoomModerationLogs(ctx context.Context, roomID uuid.UUID) ([]models.RoomModerationLog, error)
	SearchPublicRooms(ctx context.Context, query string) ([]models.Room, error)
	GetLastMessageTimestamp(ctx context.Context, identityID uuid.UUID, channelID string) (time.Time, error)
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

type NetworkHealthStore interface {
	ReadNetworkHealthMetrics(ctx context.Context, since time.Time) (*models.NetworkHealthMetrics, error)
}

type PublicChannelStore interface {
	CreatePublicChannel(ctx context.Context, channel *models.PublicChannel, adminIdentityID uuid.UUID) error
	UpdatePublicChannelForAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, name string, description string, category string, avatar models.JSONB) (*models.PublicChannel, error)
	FindPublicChannelsForUser(ctx context.Context, userID uuid.UUID) ([]models.PublicChannel, error)
	FindPublicChannelByIDForUser(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) (*models.PublicChannel, error)
	UserIsPublicChannelAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) (bool, error)
	UpdatePublicChannelCommentsForAdmin(ctx context.Context, userID uuid.UUID, channelID uuid.UUID, enabled bool) (*models.PublicChannel, error)
	SubscribePublicChannel(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error
	UnsubscribePublicChannel(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID) error
	CreatePublicChannelPostForAdmin(ctx context.Context, userID uuid.UUID, post *models.PublicChannelPost) error
	FindPublicChannelPostsForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, channelID uuid.UUID, limit int) ([]models.PublicChannelPost, error)
	FindPublicChannelPostReactionStatesForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postIDs []uuid.UUID) (map[uuid.UUID]models.PublicChannelPostReactionState, error)
	TogglePublicChannelPostReactionForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, emoji string) (*models.PublicChannelPostReactionState, error)
	CreatePublicChannelPostCommentForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID uuid.UUID, body string) (*models.PublicChannelPostComment, error)
	FindPublicChannelPostComments(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID][]models.PublicChannelPostComment, error)
	UpdatePublicChannelPostPinForAdmin(ctx context.Context, userID uuid.UUID, postID uuid.UUID, pinned bool) (*models.PublicChannelPost, error)
	DeletePublicChannel(ctx context.Context, userID uuid.UUID, channelID uuid.UUID) error

	BlockPublicChannel(ctx context.Context, identityID, channelID uuid.UUID) error
	UnblockPublicChannel(ctx context.Context, identityID, channelID uuid.UUID) error
	FindBlockedPublicChannels(ctx context.Context, identityID uuid.UUID) ([]uuid.UUID, error)
	DeletePublicChannelCommentForAdmin(ctx context.Context, userID, commentID uuid.UUID) error
	ModeratePublicChannelComment(ctx context.Context, userID, commentID uuid.UUID, status string) error
	SearchDiscoverablePublicChannels(ctx context.Context, userID, identityID uuid.UUID, query string, category string) ([]models.PublicChannel, error)
}

type GovernanceStore interface {
	GetLatestPolicy(ctx context.Context) (*models.GovernancePolicy, error)
	CreatePolicy(ctx context.Context, policy *models.GovernancePolicy) error
	GetPolicies(ctx context.Context) ([]models.GovernancePolicy, error)

	GetRoleCredential(ctx context.Context, id string) (*models.RoleCredential, error)
	GetCredentialsBySubject(ctx context.Context, subjectIdentity string) ([]models.RoleCredential, error)
	CreateRoleCredential(ctx context.Context, cred *models.RoleCredential) error
	GetCredentials(ctx context.Context) ([]models.RoleCredential, error)

	GetCredentialRevocation(ctx context.Context, credID string) (*models.RoleCredentialRevocation, error)
	CreateCredentialRevocation(ctx context.Context, revocation *models.RoleCredentialRevocation) error
	GetRevocations(ctx context.Context) ([]models.RoleCredentialRevocation, error)

	GetAbuseCase(ctx context.Context, id string) (*models.AbuseCase, error)
	GetAbuseCaseByReporter(ctx context.Context, reporterIdentityHash string) ([]models.AbuseCase, error)
	GetAbuseCases(ctx context.Context) ([]models.AbuseCase, error)
	CreateAbuseCase(ctx context.Context, c *models.AbuseCase) error
	UpdateAbuseCaseStatus(ctx context.Context, id string, status string, decision *string) error
	GetAbuseCasesCountForChannel(ctx context.Context, channelID string) (int, error)

	GetAbuseCaseEvents(ctx context.Context, caseID string) ([]models.AbuseCaseEvent, error)
	CreateAbuseCaseEvent(ctx context.Context, event *models.AbuseCaseEvent) error

	GetAbuseReviews(ctx context.Context, caseID string) ([]models.AbuseReview, error)
	CreateAbuseReview(ctx context.Context, review *models.AbuseReview) error

	GetAbuseActions(ctx context.Context, targetType string, targetID string) ([]models.AbuseAction, error)
	CreateAbuseAction(ctx context.Context, action *models.AbuseAction) error
	DeleteAbuseAction(ctx context.Context, id string) error

	GetAbuseAppeal(ctx context.Context, caseID string) (*models.AbuseAppeal, error)
	CreateAbuseAppeal(ctx context.Context, appeal *models.AbuseAppeal) error
	UpdateAbuseAppealStatus(ctx context.Context, caseID string, status string, decisionReason string, decidedBy string) error

	GetFederationAbuseSignals(ctx context.Context) ([]models.FederationAbuseSignal, error)
	CreateFederationAbuseSignal(ctx context.Context, sig *models.FederationAbuseSignal) error

	GetTransparencySnapshots(ctx context.Context) ([]models.TransparencySnapshot, error)
	CreateTransparencySnapshot(ctx context.Context, snapshot *models.TransparencySnapshot) error

	SuspendPublicChannel(ctx context.Context, channelID uuid.UUID, suspended bool, reason string) error
	VerifyPublicChannel(ctx context.Context, channelID uuid.UUID, verified bool) error
	GetMessageCountSince(ctx context.Context, senderGaiaID string, since time.Time) (int, error)
	GetOpenAbuseCasesCount(ctx context.Context, gaiaID string) (int, error)
}

type SecurityStore interface {
	SaveSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateContext *models.SecurityEventPrivateContext, audit *models.SecurityAuditChain) error
	GetLatestSecurityAuditChain(ctx context.Context) (*models.SecurityAuditChain, error)
	GetSecurityEventsForUser(ctx context.Context, userID uuid.UUID) ([]models.SecurityEvent, error)
	AcknowledgeSecurityEvent(ctx context.Context, userID uuid.UUID, eventID string) error
	GetNodeSecurityEvents(ctx context.Context) ([]models.SecurityEvent, error)
	GetNodeSecuritySummary(ctx context.Context) (*models.NodeSecuritySummary, error)
}

type GsnStore interface {
	CreateGsnPost(ctx context.Context, post *models.GsnPost) error
	GetGsnPost(ctx context.Context, postID string) (*models.GsnPost, error)
	DeleteGsnPost(ctx context.Context, postID string) error
	ListGsnPostsByNode(ctx context.Context, nodeID string) ([]models.GsnPost, error)
	ListGsnPostsByFollowed(ctx context.Context, followerGaiaID string) ([]models.GsnPost, error)
	CreateGsnComment(ctx context.Context, comment *models.GsnComment) error
	GetGsnComment(ctx context.Context, commentID string) (*models.GsnComment, error)
	ListGsnComments(ctx context.Context, postID string) ([]models.GsnComment, error)
	DeleteGsnComment(ctx context.Context, commentID string) error
	ToggleGsnReaction(ctx context.Context, postID string, gaiaID string, emoji string) (string, error)
	SaveGsnReaction(ctx context.Context, postID string, gaiaID string, emoji string, action string) error
	GetGsnReactions(ctx context.Context, postID string, gaiaID string) (map[string]int, map[string]bool, error)
	FollowGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) error
	UnfollowGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) error
	IsFollowingGsnUser(ctx context.Context, followerGaiaID string, followingGaiaID string) (bool, error)
	GetGsnProfile(ctx context.Context, gaiaID string) (*models.GsnProfile, error)
	UpdateGsnProfile(ctx context.Context, profile *models.GsnProfile) error
	CountGsnPostsCommentsInDuration(ctx context.Context, gaiaID string, duration time.Duration) (int, error)
	CountGsnFollowsInDuration(ctx context.Context, followerGaiaID string, duration time.Duration) (int, error)
}
