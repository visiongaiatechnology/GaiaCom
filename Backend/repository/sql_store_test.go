package repository

import (
	"context"
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
}
