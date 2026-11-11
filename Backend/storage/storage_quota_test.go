package storage

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

// P-08 / FIND-008 regression tests: quota reservation must be atomic
// (single statement, no check-then-act) and reject cleanly.

func newQuotaTestService(t *testing.T, quotaBytes int64) (*StorageService, uuid.UUID) {
	t.Helper()
	_, store, cleanup := setupTestStorageDBAndStore(t)
	t.Cleanup(cleanup)

	svc := &StorageService{
		Store:          store,
		UploadDir:      t.TempDir(),
		UserQuotaBytes: quotaBytes,
	}
	user := &models.User{
		ID:           uuid.New(),
		Username:     "quota-atomic-" + uuid.New().String(),
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	return svc, user.ID
}

func TestInitializeUploadReturnsQuotaSentinel(t *testing.T) {
	svc, userID := newQuotaTestService(t, 2048)
	fileHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	if _, err := svc.InitializeUploadContext(context.Background(), userID, "first.bin", 1024, "application/octet-stream", fileHash); err != nil {
		t.Fatalf("first upload below quota failed: %v", err)
	}

	_, err := svc.InitializeUploadContext(context.Background(), userID, "too-much.bin", 1025, "application/octet-stream", fileHash)
	if err == nil {
		t.Fatal("expected quota rejection")
	}
	if !errors.Is(err, ErrStorageQuotaExceeded) {
		t.Fatalf("expected ErrStorageQuotaExceeded, got %v", err)
	}

	if _, err := svc.InitializeUploadContext(context.Background(), userID, "fits-exactly.bin", 1024, "application/octet-stream", fileHash); err != nil {
		t.Fatalf("exact quota boundary must be accepted: %v", err)
	}
}

func TestConcurrentInitializeUploadCannotExceedQuota(t *testing.T) {
	const quota = int64(100)
	const fileSize = int64(30) // 3 * 30 = 90 <= 100; a 4th would exceed.
	svc, userID := newQuotaTestService(t, quota)
	fileHash := strings.Repeat("a", 64)

	var wg sync.WaitGroup
	var mu sync.Mutex
	successes, sentinelRejections := 0, 0

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			_, err := svc.InitializeUploadContext(
				context.Background(),
				userID,
				fmt.Sprintf("concurrent-%d.bin", index),
				fileSize,
				"application/octet-stream",
				fileHash,
			)
			mu.Lock()
			defer mu.Unlock()
			switch {
			case err == nil:
				successes++
			case errors.Is(err, ErrStorageQuotaExceeded):
				sentinelRejections++
			}
		}(i)
	}
	wg.Wait()

	if successes != 3 {
		t.Fatalf("expected exactly 3 reservations inside quota, got %d", successes)
	}
	if sentinelRejections != 2 {
		t.Fatalf("expected 2 quota rejections, got %d", sentinelRejections)
	}

	storedBytes, err := svc.Store.SumStoredFileBytesForUser(context.Background(), userID)
	if err != nil {
		t.Fatalf("sum stored bytes: %v", err)
	}
	if storedBytes > quota {
		t.Fatalf("concurrent reservations exceeded quota: stored=%d quota=%d", storedBytes, quota)
	}
}
