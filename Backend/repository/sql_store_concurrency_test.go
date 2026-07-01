// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

func TestCriticalLongTextWritesUnderConcurrentLoad(t *testing.T) {
	t.Setenv("DB_PATH", "")
	t.Setenv("SQLITE_MAX_OPEN_CONNS", "8")

	dbPath := filepath.Join(t.TempDir(), "concurrent-writes.db")
	db := database.ConnectDB(&config.Config{DatabasePath: dbPath})
	defer db.Close()

	store := NewSQLStore(db)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	user := models.User{
		ID:           uuid.New(),
		Username:     "concurrent-owner",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(&user); err != nil {
		t.Fatalf("create user: %v", err)
	}

	longBody := strings.Repeat("GaiaCom long report body with unicode-safe ascii payload. ", 256)
	const workers = 8
	var wg sync.WaitGroup
	errs := make(chan error, workers)

	for i := 0; i < workers; i++ {
		i := i
		wg.Add(1)
		go func() {
			defer wg.Done()
			postID := fmt.Sprintf("post-%02d", i)
			commentID := fmt.Sprintf("comment-%02d", i)
			gaiaID := fmt.Sprintf("@concurrent-%02d:gaiacom.local", i)
			now := time.Now().UTC().Format(time.RFC3339Nano)

			if err := store.CreateGsnPost(ctx, &models.GsnPost{
				ID:          postID,
				GaiaID:      gaiaID,
				DisplayName: fmt.Sprintf("Concurrent %02d", i),
				NodeID:      "local",
				Timestamp:   now,
				Body:        longBody,
				Signature:   fmt.Sprintf("sig-post-%02d", i),
			}); err != nil {
				errs <- fmt.Errorf("create gsn post %d: %w", i, err)
				return
			}
			if err := store.CreateGsnComment(ctx, &models.GsnComment{
				ID:          commentID,
				PostID:      postID,
				GaiaID:      gaiaID,
				DisplayName: fmt.Sprintf("Concurrent %02d", i),
				Timestamp:   now,
				Body:        longBody,
				Signature:   fmt.Sprintf("sig-comment-%02d", i),
			}); err != nil {
				errs <- fmt.Errorf("create gsn comment %d: %w", i, err)
				return
			}
			if err := store.SaveGsnReaction(ctx, postID, gaiaID, "heart", "add"); err != nil {
				errs <- fmt.Errorf("save gsn reaction %d: %w", i, err)
				return
			}

			fileID := uuid.New()
			if err := store.CreateFileMetadata(&models.FileMetadata{
				FileID:       fileID,
				UserID:       user.ID,
				FileName:     fmt.Sprintf("concurrent-%02d.bin", i),
				FileSize:     int64(len(longBody)),
				FileHash:     fmt.Sprintf("hash-%02d", i),
				MimeType:     "application/octet-stream",
				EncryptionIV: fmt.Sprintf("iv-%02d", i),
				Path:         fmt.Sprintf("vault/concurrent-%02d.bin", i),
				Status:       "pending",
			}); err != nil {
				errs <- fmt.Errorf("create file metadata %d: %w", i, err)
				return
			}
			if err := store.CreateFileChunk(&models.FileChunk{
				FileID:    fileID,
				Index:     0,
				ChunkHash: fmt.Sprintf("chunk-hash-%02d", i),
				ChunkSize: int64(len(longBody)),
				MinioID:   fmt.Sprintf("object-%02d", i),
			}); err != nil {
				errs <- fmt.Errorf("create file chunk %d: %w", i, err)
				return
			}
			if ok, err := store.FinalizePendingUpload(fileID, user.ID); err != nil || !ok {
				errs <- fmt.Errorf("finalize upload %d: ok=%v err=%w", i, ok, err)
				return
			}

			if err := store.CreateReport(&models.Report{
				MessageID:          fmt.Sprintf("message-%02d", i),
				SenderPublicKey:    fmt.Sprintf("sender-%02d", i),
				RecipientPublicKey: fmt.Sprintf("recipient-%02d", i),
				CiphertextHash:     fmt.Sprintf("cipher-%02d", i),
				ReportProof:        fmt.Sprintf("proof-%02d-%s", i, longBody[:32]),
				EpochHash:          "epoch-longtext",
			}); err != nil {
				errs <- fmt.Errorf("create report %d: %w", i, err)
				return
			}
			if err := store.SaveAbuseScore(&models.AbuseScore{
				SenderPublicKey: fmt.Sprintf("sender-%02d", i),
				Score:           i + 1,
				EscalationLevel: i % 4,
				FrictionLimit:   1.25,
			}); err != nil {
				errs <- fmt.Errorf("save abuse score %d: %w", i, err)
				return
			}
		}()
	}

	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
}
