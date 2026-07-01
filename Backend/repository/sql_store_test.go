// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

func TestSQLStoreDomainFlows(t *testing.T) {
	t.Setenv("DB_PATH", "")

	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()

	user := models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(&user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	count, err := store.CountUsersByUsername("alice")
	if err != nil {
		t.Fatalf("count user: %v", err)
	}
	if count != 1 {
		t.Fatalf("count user: got %d, want 1", count)
	}
	loadedUser, err := store.FindUserByUsername("alice")
	if err != nil {
		t.Fatalf("find user: %v", err)
	}
	if loadedUser.ID != user.ID {
		t.Fatalf("loaded user id mismatch")
	}

	identity := models.Identity{
		ID:           uuid.New(),
		UserID:       user.ID,
		GaiaID:       "@alice:gaiacom.local",
		DisplayName:  "Alice",
		PublicRecord: models.JSONB(`{"device":"primary"}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&identity); err != nil {
		t.Fatalf("create identity: %v", err)
	}
	identityCount, err := store.CountIdentitiesByGaiaID(identity.GaiaID)
	if err != nil {
		t.Fatalf("count identity: %v", err)
	}
	if identityCount != 1 {
		t.Fatalf("count identity: got %d, want 1", identityCount)
	}
	belongs, err := store.IdentityBelongsToUser(identity.ID, user.ID)
	if err != nil {
		t.Fatalf("identity ownership: %v", err)
	}
	if !belongs {
		t.Fatalf("identity ownership rejected")
	}

	otherUser := models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "hash",
		PublicKey:    "pk2",
	}
	if err := store.CreateUser(&otherUser); err != nil {
		t.Fatalf("create other user: %v", err)
	}
	otherIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       otherUser.ID,
		GaiaID:       "@bob:gaiacom.local",
		DisplayName:  "Bob",
		PublicRecord: models.JSONB(`{"device":"primary"}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&otherIdentity); err != nil {
		t.Fatalf("create other identity: %v", err)
	}

	envelope := models.MessageEnvelope{
		ID:        uuid.New(),
		Type:      "m.room.encrypted",
		Sender:    identity.GaiaID,
		Recipient: identity.GaiaID,
		Payload:   models.JSONB(`{"ciphertext":"abc"}`),
		Signature: "sig",
	}
	if err := store.SaveMessageEnvelopeWithInbox(ctx, &envelope, []uuid.UUID{identity.ID}); err != nil {
		t.Fatalf("save message envelope: %v", err)
	}
	inbox, err := store.FindInboxEntriesByIdentity(ctx, identity.ID)
	if err != nil {
		t.Fatalf("find inbox: %v", err)
	}
	if len(inbox) != 1 || inbox[0].MessageID != envelope.ID {
		t.Fatalf("inbox mismatch")
	}
	envelopes, err := store.FindMessageEnvelopesByIDs(ctx, []uuid.UUID{envelope.ID})
	if err != nil {
		t.Fatalf("find envelopes: %v", err)
	}
	if len(envelopes) != 1 || envelopes[0].ID != envelope.ID {
		t.Fatalf("envelope lookup mismatch")
	}
	if err := store.UpsertMailboxStates(ctx, user.ID, identity.ID, []models.MailboxState{{
		MessageID:   envelope.ID,
		Folder:      "archive",
		IsRead:      true,
		IsStarred:   true,
		IsImportant: true,
		Labels:      models.JSONB(`["Evidence"]`),
	}}); err != nil {
		t.Fatalf("upsert mailbox state: %v", err)
	}
	mailboxMessages, err := store.FindMailboxMessages(ctx, user.ID, identity.ID, MailboxQuery{Folder: "archive", Starred: true, Label: "Evidence"})
	if err != nil {
		t.Fatalf("find mailbox messages: %v", err)
	}
	if len(mailboxMessages) != 1 || mailboxMessages[0].Mailbox == nil || !mailboxMessages[0].Mailbox.IsImportant {
		t.Fatalf("mailbox state mismatch: %+v", mailboxMessages)
	}
	draft := models.MailDraft{
		UserID:        user.ID,
		IdentityID:    identity.ID,
		RecipientGaia: "legacy@example.org",
		RecipientIDs:  models.JSONB(`[]`),
		Subject:       "Draft",
		Body:          "Body",
	}
	if err := store.SaveMailDraft(ctx, &draft); err != nil {
		t.Fatalf("save mail draft: %v", err)
	}
	drafts, err := store.FindMailDrafts(ctx, user.ID, identity.ID)
	if err != nil {
		t.Fatalf("find mail drafts: %v", err)
	}
	if len(drafts) != 1 || drafts[0].Subject != "Draft" {
		t.Fatalf("mail draft mismatch: %+v", drafts)
	}
	label := models.MailLabel{UserID: user.ID, Name: "Evidence", Color: "#39ff14"}
	if err := store.SaveMailLabel(ctx, &label); err != nil {
		t.Fatalf("save mail label: %v", err)
	}
	labels, err := store.FindMailLabels(ctx, user.ID)
	if err != nil {
		t.Fatalf("find mail labels: %v", err)
	}
	if len(labels) != 1 || labels[0].Name != "Evidence" {
		t.Fatalf("mail label mismatch: %+v", labels)
	}
	contact := models.MailContact{UserID: user.ID, GaiaID: otherIdentity.GaiaID, DisplayName: "Bob", Email: "bob@example.org"}
	if err := store.SaveMailContact(ctx, &contact); err != nil {
		t.Fatalf("save mail contact: %v", err)
	}
	contacts, err := store.FindMailContacts(ctx, user.ID, "bob")
	if err != nil {
		t.Fatalf("find mail contacts: %v", err)
	}
	if len(contacts) != 1 || contacts[0].DisplayName != "Bob" {
		t.Fatalf("mail contact mismatch: %+v", contacts)
	}
	rule := models.MailFilterRule{UserID: user.ID, SenderContains: "@bob", AssignLabel: "Evidence", TargetFolder: "archive", MarkImportant: true, Enabled: true}
	if err := store.SaveMailFilterRule(ctx, &rule); err != nil {
		t.Fatalf("save mail filter: %v", err)
	}
	rules, err := store.FindMailFilterRules(ctx, user.ID)
	if err != nil {
		t.Fatalf("find mail filters: %v", err)
	}
	if len(rules) != 1 || !rules[0].MarkImportant {
		t.Fatalf("mail filter mismatch: %+v", rules)
	}
	settings := models.MailSettings{UserID: user.ID, Signature: "Alice / GaiaCOM", Locale: "de", Theme: "dark", KeyboardMode: "vim"}
	if err := store.SaveMailSettings(ctx, &settings); err != nil {
		t.Fatalf("save mail settings: %v", err)
	}
	loadedSettings, err := store.GetMailSettings(ctx, user.ID)
	if err != nil {
		t.Fatalf("get mail settings: %v", err)
	}
	if loadedSettings.Signature != settings.Signature || loadedSettings.KeyboardMode != "vim" {
		t.Fatalf("mail settings mismatch: %+v", loadedSettings)
	}
	searchResults, err := store.GlobalSearch(ctx, user.ID, identity.ID, "alice", 10)
	if err != nil {
		t.Fatalf("global search: %v", err)
	}
	if len(searchResults) == 0 {
		t.Fatalf("global search returned no results")
	}

	fileID := uuid.New()
	metadata := models.FileMetadata{
		FileID:   fileID,
		UserID:   user.ID,
		FileName: "payload.bin",
		FileSize: 64,
		FileHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		MimeType: "application/octet-stream",
		Path:     "vault",
		Status:   "pending",
	}
	if err := store.CreateFileMetadata(&metadata); err != nil {
		t.Fatalf("create file metadata: %v", err)
	}
	pending, err := store.FindPendingFileForUser(fileID, user.ID)
	if err != nil {
		t.Fatalf("find pending file: %v", err)
	}
	if pending.FileID != fileID {
		t.Fatalf("pending file mismatch")
	}
	chunk := models.FileChunk{
		FileID:    fileID,
		Index:     0,
		ChunkHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		ChunkSize: 32,
		MinioID:   "chunk_00000.bin",
	}
	if err := store.CreateFileChunk(&chunk); err != nil {
		t.Fatalf("create file chunk: %v", err)
	}
	finalized, err := store.FinalizePendingUpload(fileID, user.ID)
	if err != nil {
		t.Fatalf("finalize upload: %v", err)
	}
	if !finalized {
		t.Fatalf("finalize upload returned false")
	}

	server := models.FederationServer{
		Domain:      "peer.gaiacom.local",
		PublicKey:   []byte("public-key"),
		FirstSeenAt: time.Now().UTC(),
		LastSeenAt:  time.Now().UTC(),
	}
	if err := store.CreateFederationServer(&server); err != nil {
		t.Fatalf("create federation server: %v", err)
	}
	loadedServer, err := store.FindFederationServer(server.Domain)
	if err != nil {
		t.Fatalf("find federation server: %v", err)
	}
	if loadedServer.Domain != server.Domain {
		t.Fatalf("federation server mismatch")
	}
	if err := store.UpdateFederationServerLastSeen(loadedServer); err != nil {
		t.Fatalf("update federation last seen: %v", err)
	}

	queueItem := models.FederationQueue{
		PDUID:      "pdu-1",
		PDUPayload: models.JSONB(`{"type":"m.test"}`),
		TargetURL:  "https://peer.gaiacom.local/_matrix/federation/v1/send",
		Status:     models.QueueStatusPending,
		NextRetry:  time.Now().UTC().Add(-time.Second),
	}
	if err := store.AddFederationQueueItem(&queueItem); err != nil {
		t.Fatalf("add queue item: %v", err)
	}
	claimed, err := store.ClaimNextFederationQueueItem(ctx)
	if err != nil {
		t.Fatalf("claim queue item: %v", err)
	}
	if claimed == nil || claimed.ID != queueItem.ID || claimed.Status != models.QueueStatusSending {
		t.Fatalf("claimed queue item mismatch")
	}
	claimed.Status = models.QueueStatusPending
	claimed.LastError = "retry"
	claimed.NextRetry = time.Now().UTC().Add(time.Minute)
	if err := store.SaveFederationQueueItem(ctx, claimed); err != nil {
		t.Fatalf("save queue item: %v", err)
	}
	if err := store.DeleteFederationQueueItem(ctx, claimed.ID); err != nil {
		t.Fatalf("delete queue item: %v", err)
	}

	room := models.Room{
		ID:         uuid.New(),
		Name:       "General",
		IsPrivate:  true,
		CreatedBy:  identity.ID,
		SecretHash: "private-secret",
	}
	members := []models.RoomMember{{
		RoomID:     room.ID,
		IdentityID: identity.ID,
		Role:       "admin",
	}}
	if err := store.CreateRoomWithMembers(ctx, &room, members); err != nil {
		t.Fatalf("create room: %v", err)
	}
	publicRoom := models.Room{
		ID:         uuid.New(),
		Name:       "Public",
		IsPrivate:  false,
		CreatedBy:  identity.ID,
		SecretHash: "public-secret",
	}
	publicMembers := []models.RoomMember{{
		RoomID:     publicRoom.ID,
		IdentityID: identity.ID,
		Role:       "admin",
	}}
	if err := store.CreateRoomWithMembers(ctx, &publicRoom, publicMembers); err != nil {
		t.Fatalf("create public room: %v", err)
	}

	rooms, err := store.FindRooms(ctx, user.ID)
	if err != nil {
		t.Fatalf("find rooms: %v", err)
	}
	if len(rooms) != 2 {
		t.Fatalf("rooms lookup mismatch")
	}
	for _, loaded := range rooms {
		if len(loaded.Members) != 1 || loaded.SecretHash == "" {
			t.Fatalf("joined room should include members and secret hash")
		}
	}
	otherRooms, err := store.FindRooms(ctx, otherUser.ID)
	if err != nil {
		t.Fatalf("find rooms for other user: %v", err)
	}
	if len(otherRooms) != 1 || otherRooms[0].ID != publicRoom.ID {
		t.Fatalf("other user should only see public room")
	}
	if len(otherRooms[0].Members) != 0 || otherRooms[0].SecretHash != "" {
		t.Fatalf("public room leaked member data or secret hash")
	}
	updatedRoom, err := store.UpdateRoomMetadataForUser(ctx, user.ID, room.ID, "Renamed", "Description", "shield")
	if err != nil {
		t.Fatalf("update room metadata: %v", err)
	}
	if updatedRoom.Name != "Renamed" || updatedRoom.Description != "Description" || updatedRoom.Avatar != "shield" {
		t.Fatalf("updated room metadata mismatch")
	}
	if _, err := store.UpdateRoomMetadataForUser(ctx, otherUser.ID, room.ID, "Bad", "", ""); err == nil {
		t.Fatalf("non-admin room metadata update succeeded")
	}
	loadedRoom, err := store.FindRoomByID(ctx, room.ID)
	if err != nil {
		t.Fatalf("find room by id: %v", err)
	}
	if len(loadedRoom.Members) != 1 || loadedRoom.Members[0].Identity.GaiaID != identity.GaiaID {
		t.Fatalf("room member identity preload mismatch")
	}

	channel := models.PublicChannel{
		Name:        "GaiaCom News",
		Description: "Signed public updates",
		Avatar:      models.JSONB(`{"fileId":"avatar","encrypted":true}`),
	}
	if err := store.CreatePublicChannel(ctx, &channel, identity.ID); err != nil {
		t.Fatalf("create public channel: %v", err)
	}
	loadedChannels, err := store.FindPublicChannelsForUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("find public channels: %v", err)
	}
	if len(loadedChannels) != 1 || !loadedChannels[0].IsAdmin || !loadedChannels[0].IsSubscribed || loadedChannels[0].SubscriberCount != 1 {
		t.Fatalf("public channel admin/subscriber state mismatch: %+v", loadedChannels)
	}
	if err := store.SubscribePublicChannel(ctx, otherUser.ID, otherIdentity.ID, channel.ID); err != nil {
		t.Fatalf("subscribe public channel: %v", err)
	}
	loadedForOther, err := store.FindPublicChannelByIDForUser(ctx, otherUser.ID, channel.ID)
	if err != nil {
		t.Fatalf("find public channel for other: %v", err)
	}
	if loadedForOther.IsAdmin || !loadedForOther.IsSubscribed || loadedForOther.SubscriberCount != 2 {
		t.Fatalf("public channel viewer state mismatch: %+v", loadedForOther)
	}
	post := models.PublicChannelPost{
		ChannelID:        channel.ID,
		AuthorIdentityID: identity.ID,
		Body:             "**Launch** _ready_",
		Formatting:       models.JSONB(`{"mode":"markdown"}`),
		Attachments:      models.JSONB(`[{"fileId":"encrypted-image","mime":"image/webp"}]`),
	}
	if err := store.CreatePublicChannelPostForAdmin(ctx, user.ID, &post); err != nil {
		t.Fatalf("create public channel post: %v", err)
	}
	posts, err := store.FindPublicChannelPostsForUser(ctx, otherUser.ID, otherIdentity.ID, channel.ID, 10)
	if err != nil {
		t.Fatalf("find public channel posts: %v", err)
	}
	if len(posts) != 1 || posts[0].Body != post.Body {
		t.Fatalf("public channel post mismatch: %+v", posts)
	}
	reactionState, err := store.TogglePublicChannelPostReactionForUser(ctx, otherUser.ID, otherIdentity.ID, post.ID, "\U0001F44D")
	if err != nil {
		t.Fatalf("toggle public channel post reaction: %v", err)
	}
	if reactionState.Reactions["\U0001F44D"] != 1 || !reactionState.ReactedByMe["\U0001F44D"] {
		t.Fatalf("public channel reaction state mismatch: %+v", reactionState)
	}
	reactionState, err = store.TogglePublicChannelPostReactionForUser(ctx, otherUser.ID, otherIdentity.ID, post.ID, "\U0001F44D")
	if err != nil {
		t.Fatalf("toggle public channel post reaction off: %v", err)
	}
	if reactionState.Reactions["\U0001F44D"] != 0 || reactionState.ReactedByMe["\U0001F44D"] {
		t.Fatalf("public channel reaction toggle should remove own reaction: %+v", reactionState)
	}
	comment, err := store.CreatePublicChannelPostCommentForUser(ctx, otherUser.ID, otherIdentity.ID, post.ID, "Persisted comment")
	if err != nil {
		t.Fatalf("create public channel post comment: %v", err)
	}
	if comment.Body != "Persisted comment" || comment.AuthorGaiaID != otherIdentity.GaiaID {
		t.Fatalf("public channel comment mismatch: %+v", comment)
	}
	posts, err = store.FindPublicChannelPostsForUser(ctx, otherUser.ID, otherIdentity.ID, channel.ID, 10)
	if err != nil {
		t.Fatalf("find public channel posts with interactions: %v", err)
	}
	if len(posts) != 1 || len(posts[0].Comments) != 1 || posts[0].Comments[0].Body != "Persisted comment" {
		t.Fatalf("public channel persisted comment missing: %+v", posts)
	}
	pinnedPost, err := store.UpdatePublicChannelPostPinForAdmin(ctx, user.ID, post.ID, true)
	if err != nil {
		t.Fatalf("pin public channel post: %v", err)
	}
	if !pinnedPost.IsPinned || pinnedPost.PinnedAt.IsZero() {
		t.Fatalf("public channel pin state missing: %+v", pinnedPost)
	}
	loadedAfterPin, err := store.FindPublicChannelPostsForUser(ctx, otherUser.ID, otherIdentity.ID, channel.ID, 10)
	if err != nil {
		t.Fatalf("find public channel posts after pin: %v", err)
	}
	if len(loadedAfterPin) != 1 || !loadedAfterPin[0].IsPinned {
		t.Fatalf("persisted pin not returned: %+v", loadedAfterPin)
	}
	if _, err := store.UpdatePublicChannelCommentsForAdmin(ctx, user.ID, channel.ID, false); err != nil {
		t.Fatalf("disable public channel comments: %v", err)
	}
	if _, err := store.CreatePublicChannelPostCommentForUser(ctx, otherUser.ID, otherIdentity.ID, post.ID, "blocked comment"); err == nil {
		t.Fatalf("comment succeeded while channel comments disabled")
	}
	intruderPost := models.PublicChannelPost{
		ChannelID:        channel.ID,
		AuthorIdentityID: otherIdentity.ID,
		Body:             "blocked",
	}
	if err := store.CreatePublicChannelPostForAdmin(ctx, otherUser.ID, &intruderPost); err == nil {
		t.Fatalf("non-admin public channel post succeeded")
	}
}

func TestSQLiteBusyRetryRetriesTransientLocks(t *testing.T) {
	attempts := 0
	err := withSQLiteBusyRetry(t.Context(), func() error {
		attempts++
		if attempts < 3 {
			return errors.New("database is locked (5) (SQLITE_BUSY)")
		}
		return nil
	})
	if err != nil {
		t.Fatalf("expected transient busy error to recover, got %v", err)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestSQLiteBusyRetryRespectsContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	attempts := 0
	err := withSQLiteBusyRetry(ctx, func() error {
		attempts++
		return errors.New("SQLITE_BUSY")
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancellation, got %v", err)
	}
	if attempts != 1 {
		t.Fatalf("expected exactly one attempt after cancelled context, got %d", attempts)
	}
}
