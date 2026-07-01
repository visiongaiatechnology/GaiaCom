// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
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

func TestFileAccessGrantExpiry(t *testing.T) {
	t.Setenv("DB_PATH", "")

	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()

	owner := models.User{ID: uuid.New(), Username: "owner", PasswordHash: "hash", PublicKey: "pk"}
	recipient := models.User{ID: uuid.New(), Username: "recipient", PasswordHash: "hash", PublicKey: "pk2"}
	if err := store.CreateUser(&owner); err != nil {
		t.Fatalf("create owner: %v", err)
	}
	if err := store.CreateUser(&recipient); err != nil {
		t.Fatalf("create recipient: %v", err)
	}

	recipientIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       recipient.ID,
		GaiaID:       "@recipient:gaiacom.local",
		DisplayName:  "Recipient",
		PublicRecord: models.JSONB(`{}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&recipientIdentity); err != nil {
		t.Fatalf("create recipient identity: %v", err)
	}

	file := models.FileMetadata{
		FileID:    uuid.New(),
		UserID:    owner.ID,
		FileName:  "drive-share.bin",
		FileSize:  1024,
		FileHash:  "hash",
		MimeType:  "application/octet-stream",
		Path:      "test-path",
		Status:    "completed",
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	if err := store.CreateFileMetadata(&file); err != nil {
		t.Fatalf("create file metadata: %v", err)
	}

	if err := store.GrantFileAccessToIdentities(ctx, file.FileID, owner.ID, []uuid.UUID{recipientIdentity.ID}, time.Now().UTC().Add(-time.Hour)); err != nil {
		t.Fatalf("grant expired access: %v", err)
	}
	if _, err := store.FindAccessibleFileMetadata(ctx, file.FileID, recipient.ID); err == nil {
		t.Fatalf("expired grant unexpectedly allowed file access")
	}

	if err := store.GrantFileAccessToIdentities(ctx, file.FileID, owner.ID, []uuid.UUID{recipientIdentity.ID}, time.Now().UTC().Add(12*time.Hour)); err != nil {
		t.Fatalf("grant future access: %v", err)
	}
	accessible, err := store.FindAccessibleFileMetadata(ctx, file.FileID, recipient.ID)
	if err != nil {
		t.Fatalf("future grant rejected: %v", err)
	}
	if accessible.FileID != file.FileID {
		t.Fatalf("accessible file mismatch: got %s want %s", accessible.FileID, file.FileID)
	}
}
