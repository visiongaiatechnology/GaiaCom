// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package gaiadrop

import (
	"context"
	"strings"
	"testing"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type gaiaDropTestRig struct {
	store          repository.Store
	service        *Service
	ownerUser      models.User
	intruderUser   models.User
	targetIdentity models.Identity
}

func newGaiaDropTestRig(t *testing.T) gaiaDropTestRig {
	t.Helper()
	t.Setenv("DB_PATH", "")

	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close database: %v", err)
		}
	})

	store := repository.NewSQLStore(db)
	ownerUser := models.User{
		ID:           uuid.New(),
		Username:     "drop-owner",
		PasswordHash: "hash",
		PublicKey:    "owner-pk",
	}
	if err := store.CreateUser(&ownerUser); err != nil {
		t.Fatalf("create owner user: %v", err)
	}

	intruderUser := models.User{
		ID:           uuid.New(),
		Username:     "drop-intruder",
		PasswordHash: "hash",
		PublicKey:    "intruder-pk",
	}
	if err := store.CreateUser(&intruderUser); err != nil {
		t.Fatalf("create intruder user: %v", err)
	}

	targetIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       ownerUser.ID,
		GaiaID:       "@drop-owner:gaiacom.local",
		DisplayName:  "Drop Owner",
		PublicRecord: models.JSONB(`{"curve":"test"}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&targetIdentity); err != nil {
		t.Fatalf("create target identity: %v", err)
	}

	return gaiaDropTestRig{
		store:          store,
		service:        NewService(store),
		ownerUser:      ownerUser,
		intruderUser:   intruderUser,
		targetIdentity: targetIdentity,
	}
}

func TestSubmitRejectsOversizedEncryptedPayload(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	_, err := rig.service.Submit(context.Background(), SubmitInput{
		TargetGaiaID: rig.targetIdentity.GaiaID,
		SenderLabel:  "external",
		Payload: map[string]interface{}{
			"ciphertext": strings.Repeat("A", 65*1024),
		},
	})
	if err == nil {
		t.Fatalf("oversized encrypted payload was accepted")
	}
	if !strings.Contains(err.Error(), "too large") {
		t.Fatalf("oversized encrypted payload returned wrong error: %v", err)
	}
}

func TestInboxListingIsScopedToIdentityOwner(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	ctx := context.Background()

	drop, err := rig.service.Submit(ctx, SubmitInput{
		TargetGaiaID: rig.targetIdentity.GaiaID,
		SenderLabel:  "external",
		Payload: map[string]interface{}{
			"ciphertext": "sealed-payload",
			"nonce":      "nonce",
		},
	})
	if err != nil {
		t.Fatalf("submit drop: %v", err)
	}

	ownerInbox, err := rig.service.ListForIdentity(ctx, rig.ownerUser.ID, rig.targetIdentity.ID)
	if err != nil {
		t.Fatalf("list owner inbox: %v", err)
	}
	if len(ownerInbox) != 1 || ownerInbox[0].ID != drop.ID {
		t.Fatalf("owner inbox mismatch")
	}

	intruderInbox, err := rig.service.ListForIdentity(ctx, rig.intruderUser.ID, rig.targetIdentity.ID)
	if err != nil {
		t.Fatalf("list intruder inbox: %v", err)
	}
	if len(intruderInbox) != 0 {
		t.Fatalf("intruder received drops for a foreign identity")
	}
}

func TestReadAndDeleteMutationsAreScopedToIdentityOwner(t *testing.T) {
	rig := newGaiaDropTestRig(t)
	ctx := context.Background()

	drop, err := rig.service.Submit(ctx, SubmitInput{
		TargetGaiaID: rig.targetIdentity.GaiaID,
		SenderLabel:  "external",
		Payload: map[string]interface{}{
			"ciphertext": "sealed-payload",
			"nonce":      "nonce",
		},
	})
	if err != nil {
		t.Fatalf("submit drop: %v", err)
	}

	if err := rig.service.MarkAsRead(ctx, rig.intruderUser.ID, drop.ID); err != nil {
		t.Fatalf("intruder mark-read should be a no-op: %v", err)
	}
	ownerInbox, err := rig.service.ListForIdentity(ctx, rig.ownerUser.ID, rig.targetIdentity.ID)
	if err != nil {
		t.Fatalf("list owner inbox after intruder mark-read: %v", err)
	}
	if len(ownerInbox) != 1 || ownerInbox[0].Status != "new" {
		t.Fatalf("intruder changed foreign drop status")
	}

	if err := rig.service.Delete(ctx, rig.intruderUser.ID, drop.ID); err != nil {
		t.Fatalf("intruder delete should be a no-op: %v", err)
	}
	ownerInbox, err = rig.service.ListForIdentity(ctx, rig.ownerUser.ID, rig.targetIdentity.ID)
	if err != nil {
		t.Fatalf("list owner inbox after intruder delete: %v", err)
	}
	if len(ownerInbox) != 1 || ownerInbox[0].ID != drop.ID {
		t.Fatalf("intruder deleted foreign drop")
	}
}
