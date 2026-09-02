// STATUS: DIAMANT VGT SUPREME
package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const (
	// Native GaiaCOM storage accepts 10 GiB payloads plus a small authenticated-encryption envelope.
	maxFileBytes                 int64         = (10 * 1024 * 1024 * 1024) + (2 * 1024 * 1024)
	maxChunkBytes                int64         = 1 * 1024 * 1024 // 1 MiB encrypted blob
	defaultUserStorageQuotaBytes int64         = 50 * 1024 * 1024 * 1024
	defaultPendingUploadTTL      time.Duration = 24 * time.Hour
)

type StorageService struct {
	Store            repository.StorageStore
	UploadDir        string
	ObjectStore      ObjectStore
	UserQuotaBytes   int64
	PendingUploadTTL time.Duration
}

type ServiceConfig struct {
	LocalStorageRoot string
	UserQuotaBytes   int64
	PendingUploadTTL time.Duration
}

func NewStorageService(store repository.StorageStore) *StorageService {
	uploadDir := strings.TrimSpace(os.Getenv("GAIACOM_STORAGE_ROOT"))
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	objectStoreType := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_OBJECT_STORE")))
	if objectStoreType == "" {
		objectStoreType = "local"
	}
	resolvedDir, err := filepath.Abs(uploadDir)
	if err != nil {
		panic("failed to resolve upload directory")
	}
	if err := os.MkdirAll(resolvedDir, 0700); err != nil {
		panic("failed to create upload directory")
	}

	objectStore, err := configuredObjectStore(objectStoreType, resolvedDir)
	if err != nil {
		panic("failed to initialize object store: " + err.Error())
	}

	return &StorageService{
		Store:            store,
		UploadDir:        resolvedDir,
		ObjectStore:      objectStore,
		UserQuotaBytes:   storageUserQuotaBytesFromEnv(),
		PendingUploadTTL: storagePendingUploadTTLFromEnv(),
	}
}

func NewStorageServiceWithConfig(store repository.StorageStore, config ServiceConfig) (*StorageService, error) {
	if store == nil {
		return nil, errors.New("storage store is required")
	}
	root := strings.TrimSpace(config.LocalStorageRoot)
	if root == "" {
		return nil, errors.New("local storage root is required")
	}
	resolvedDir, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("resolve local storage root: %w", err)
	}
	if err := os.MkdirAll(resolvedDir, 0700); err != nil {
		return nil, fmt.Errorf("create local storage root: %w", err)
	}
	objectStore, err := NewLocalObjectStore(resolvedDir)
	if err != nil {
		return nil, fmt.Errorf("initialize local object store: %w", err)
	}
	quota := config.UserQuotaBytes
	if quota <= 0 {
		quota = defaultUserStorageQuotaBytes
	}
	pendingTTL := config.PendingUploadTTL
	if pendingTTL <= 0 {
		pendingTTL = defaultPendingUploadTTL
	}
	return &StorageService{
		Store:            store,
		UploadDir:        resolvedDir,
		ObjectStore:      objectStore,
		UserQuotaBytes:   quota,
		PendingUploadTTL: pendingTTL,
	}, nil
}

func configuredObjectStore(objectStoreType string, resolvedDir string) (ObjectStore, error) {
	switch objectStoreType {
	case "local", "filesystem":
		return NewLocalObjectStore(resolvedDir)
	case "s3", "minio":
		return NewS3ObjectStoreFromEnv()
	default:
		return nil, errors.New("unsupported object store backend")
	}
}

func storageUserQuotaBytesFromEnv() int64 {
	raw := strings.TrimSpace(os.Getenv("GAIACOM_STORAGE_USER_QUOTA_BYTES"))
	if raw == "" {
		return defaultUserStorageQuotaBytes
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < maxFileBytes {
		panic("invalid GAIACOM_STORAGE_USER_QUOTA_BYTES")
	}
	return value
}

func storagePendingUploadTTLFromEnv() time.Duration {
	raw := strings.TrimSpace(os.Getenv("GAIACOM_STORAGE_PENDING_TTL_HOURS"))
	if raw == "" {
		return defaultPendingUploadTTL
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 || value > 168 {
		panic("invalid GAIACOM_STORAGE_PENDING_TTL_HOURS")
	}
	return time.Duration(value) * time.Hour
}

func (s *StorageService) effectiveUserQuotaBytes() int64 {
	if s.UserQuotaBytes > 0 {
		return s.UserQuotaBytes
	}
	return defaultUserStorageQuotaBytes
}

func (s *StorageService) effectivePendingUploadTTL() time.Duration {
	if s.PendingUploadTTL > 0 {
		return s.PendingUploadTTL
	}
	return defaultPendingUploadTTL
}

func (s *StorageService) enforceUserQuota(ctx context.Context, userID uuid.UUID, requestedBytes int64) error {
	quota := s.effectiveUserQuotaBytes()
	if requestedBytes > quota {
		return errors.New("storage quota exceeded")
	}
	currentBytes, err := s.Store.SumStoredFileBytesForUser(ctx, userID)
	if err != nil {
		return err
	}
	if currentBytes > quota-requestedBytes {
		return errors.New("storage quota exceeded")
	}
	return nil
}

func (s *StorageService) InitializeUpload(userID uuid.UUID, fileName string, fileSize int64, mimeType string, fileHash string) (*models.FileMetadata, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	if fileSize <= 0 || fileSize > maxFileBytes {
		return nil, errors.New("invalid file size")
	}
	if len(fileName) == 0 || len(fileName) > 255 {
		return nil, errors.New("invalid file name")
	}
	if !validate.FixedHex(fileHash, sha256.Size) {
		return nil, errors.New("invalid file hash")
	}
	if err := s.enforceUserQuota(context.Background(), userID, fileSize); err != nil {
		return nil, err
	}

	fileID := uuid.New()
	fileDir, err := s.jailedPath(fileID.String())
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(fileDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create file directory: %w", err)
	}

	metadata := models.FileMetadata{
		FileID:   fileID,
		FileName: fileName,
		FileSize: fileSize,
		MimeType: mimeType,
		FileHash: fileHash,
		UserID:   userID,
		Status:   "pending",
		Path:     fileDir,
	}

	if err := s.Store.CreateFileMetadata(&metadata); err != nil {
		return nil, err
	}

	return &metadata, nil
}

func (s *StorageService) SaveChunk(userID uuid.UUID, fileID uuid.UUID, chunkIndex int, chunkHash string, fileHeader *multipart.FileHeader) error {
	return s.SaveChunkContext(context.Background(), userID, fileID, chunkIndex, chunkHash, fileHeader)
}

func (s *StorageService) SaveChunkContext(ctx context.Context, userID uuid.UUID, fileID uuid.UUID, chunkIndex int, chunkHash string, fileHeader *multipart.FileHeader) error {
	if userID == uuid.Nil || fileID == uuid.Nil {
		return errors.New("invalid upload request")
	}
	if ctx == nil || fileHeader == nil {
		return errors.New("invalid upload request")
	}
	if chunkIndex < 0 {
		return errors.New("invalid chunk index")
	}
	if !validate.FixedHex(chunkHash, sha256.Size) {
		return errors.New("invalid chunk hash")
	}
	expectedHash, err := hex.DecodeString(chunkHash)
	if err != nil {
		return errors.New("invalid chunk hash")
	}

	metadata, err := s.Store.FindPendingFileForUser(fileID, userID)
	if err != nil {
		return errors.New("file not found or access denied")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	chunkKey := s.chunkObjectKey(metadata.FileID, chunkIndex)
	hasher := sha256.New()
	bytesWritten, err := s.objectStore().Put(ctx, chunkKey, io.TeeReader(src, hasher), maxChunkBytes)
	if err != nil {
		return err
	}
	if !hmac.Equal(hasher.Sum(nil), expectedHash) {
		_ = s.objectStore().Delete(ctx, chunkKey)
		return errors.New("chunk integrity verification failed")
	}

	chunkRecord := models.FileChunk{
		FileID:    metadata.FileID,
		Index:     chunkIndex,
		ChunkHash: chunkHash,
		ChunkSize: bytesWritten,
		MinioID:   chunkKey,
	}

	if err := s.Store.CreateFileChunk(&chunkRecord); err != nil {
		_ = s.objectStore().Delete(ctx, chunkKey)
		return err
	}

	return nil
}

func (s *StorageService) FinalizeUpload(fileID uuid.UUID, userID uuid.UUID) error {
	return s.FinalizeUploadContext(context.Background(), fileID, userID)
}

func (s *StorageService) FinalizeUploadContext(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) error {
	if ctx == nil || fileID == uuid.Nil || userID == uuid.Nil {
		return errors.New("invalid finalize request")
	}
	metadata, err := s.Store.FindPendingFileForUser(fileID, userID)
	if err != nil {
		return errors.New("file not found or not authorized")
	}
	chunks, err := s.GetFileChunks(fileID)
	if err != nil {
		return err
	}
	if len(chunks) == 0 {
		return errors.New("upload has no chunks")
	}

	fileHasher := sha256.New()
	var totalSize int64
	for index, chunk := range chunks {
		if chunk.Index != index || chunk.ChunkSize <= 0 || chunk.ChunkSize > maxChunkBytes || totalSize > metadata.FileSize-chunk.ChunkSize {
			return errors.New("invalid upload manifest")
		}
		expectedChunkHash, err := hex.DecodeString(chunk.ChunkHash)
		if err != nil || len(expectedChunkHash) != sha256.Size {
			return errors.New("invalid upload manifest")
		}
		object, err := s.objectStore().Get(ctx, chunk.MinioID)
		if err != nil {
			return errors.New("upload object unavailable")
		}
		chunkHasher := sha256.New()
		written, copyErr := io.CopyN(io.MultiWriter(fileHasher, chunkHasher), object, chunk.ChunkSize)
		var trailing [1]byte
		trailingBytes, trailingErr := object.Read(trailing[:])
		closeErr := object.Close()
		if copyErr != nil || written != chunk.ChunkSize || trailingBytes != 0 || (trailingErr != nil && !errors.Is(trailingErr, io.EOF)) || closeErr != nil {
			return errors.New("upload object size mismatch")
		}
		if !hmac.Equal(chunkHasher.Sum(nil), expectedChunkHash) {
			return errors.New("upload chunk integrity mismatch")
		}
		totalSize += chunk.ChunkSize
	}
	if totalSize != metadata.FileSize {
		return errors.New("upload size mismatch")
	}
	expectedFileHash, err := hex.DecodeString(metadata.FileHash)
	if err != nil || len(expectedFileHash) != sha256.Size || !hmac.Equal(fileHasher.Sum(nil), expectedFileHash) {
		return errors.New("upload file integrity mismatch")
	}

	ok, err := s.Store.FinalizePendingUpload(fileID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("file not found or not authorized")
	}
	return nil
}

func (s *StorageService) GrantAccess(userID uuid.UUID, fileID uuid.UUID, identityIDs []uuid.UUID) error {
	return s.GrantAccessUntil(userID, fileID, identityIDs, time.Time{})
}

func (s *StorageService) GrantAccessUntil(userID uuid.UUID, fileID uuid.UUID, identityIDs []uuid.UUID, expiresAt time.Time) error {
	if userID == uuid.Nil || fileID == uuid.Nil {
		return errors.New("invalid access grant request")
	}
	if len(identityIDs) == 0 || len(identityIDs) > 512 {
		return errors.New("invalid access grant recipient set")
	}
	if !expiresAt.IsZero() && !expiresAt.After(time.Now().UTC()) {
		return errors.New("invalid access grant expiry")
	}
	return s.Store.GrantFileAccessToIdentities(context.Background(), fileID, userID, uniqueUUIDs(identityIDs), expiresAt)
}

func (s *StorageService) jailedPath(parts ...string) (string, error) {
	base := filepath.Clean(s.UploadDir)
	joined := filepath.Join(append([]string{base}, parts...)...)
	resolved := filepath.Clean(joined)
	if resolved != base && !strings.HasPrefix(resolved, base+string(os.PathSeparator)) {
		return "", errors.New("path escaped upload jail")
	}
	return resolved, nil
}

func (s *StorageService) chunkObjectKey(fileID uuid.UUID, chunkIndex int) string {
	return filepath.ToSlash(filepath.Join(fileID.String(), fmt.Sprintf("chunk_%05d_%s.bin", chunkIndex, uuid.New().String())))
}

func (s *StorageService) objectStore() ObjectStore {
	if s.ObjectStore != nil {
		return s.ObjectStore
	}
	objectStore, err := NewLocalObjectStore(s.UploadDir)
	if err != nil {
		panic("failed to initialize local object store")
	}
	s.ObjectStore = objectStore
	return objectStore
}

func (s *StorageService) StartFileRetentionSweeper(ctx context.Context) {
	go s.RunFileRetentionSweeper(ctx)
}

func (s *StorageService) RunFileRetentionSweeper(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			s.SweepExpiredFiles(ctx)
		case <-ctx.Done():
			return
		}
	}
}

func (s *StorageService) SweepExpiredFiles(ctx context.Context) {
	// GaiaDrive retention policy: cloud copies expire after 14 days.
	cutoff := time.Now().Add(-14 * 24 * time.Hour).UTC().Format(time.RFC3339)

	type ExpiredSweeperStore interface {
		DeleteExpiredFileAccessGrants(ctx context.Context, cutoffTime string) (int64, error)
		FindExpiredFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error)
		FindStalePendingFiles(ctx context.Context, cutoffTime string) ([]models.FileMetadata, error)
		DeleteFileMetadata(ctx context.Context, fileID uuid.UUID) error
	}

	sweeperStore, ok := s.Store.(ExpiredSweeperStore)
	if !ok {
		log.Printf("Store does not implement ExpiredSweeperStore interface")
		return
	}

	if deletedGrants, err := sweeperStore.DeleteExpiredFileAccessGrants(ctx, time.Now().UTC().Format(time.RFC3339)); err != nil {
		log.Printf("Failed to delete expired file access grants: %v", err)
	} else if deletedGrants > 0 {
		log.Printf("Retention sweeper: deleted %d expired file access grant(s)", deletedGrants)
	}

	expired, err := sweeperStore.FindExpiredFiles(ctx, cutoff)
	if err != nil {
		log.Printf("Failed to find expired files: %v", err)
		return
	}

	for _, file := range expired {
		log.Printf("Retention sweeper: deleting expired file %s at path %s", file.FileID, file.Path)
		_ = s.objectStore().DeletePrefix(ctx, file.FileID.String())
		_ = sweeperStore.DeleteFileMetadata(ctx, file.FileID)
	}

	pendingCutoff := time.Now().Add(-s.effectivePendingUploadTTL()).UTC().Format(time.RFC3339)
	stalePending, err := sweeperStore.FindStalePendingFiles(ctx, pendingCutoff)
	if err != nil {
		log.Printf("Failed to find stale pending files: %v", err)
		return
	}

	for _, file := range stalePending {
		log.Printf("Retention sweeper: deleting stale pending file %s at path %s", file.FileID, file.Path)
		_ = s.objectStore().DeletePrefix(ctx, file.FileID.String())
		_ = sweeperStore.DeleteFileMetadata(ctx, file.FileID)
	}
}

func (s *StorageService) GetFileMetadata(fileID uuid.UUID) (*models.FileMetadata, error) {
	type ExtendedStorageStore interface {
		FindFileMetadata(fileID uuid.UUID) (*models.FileMetadata, error)
	}
	extStore, ok := s.Store.(ExtendedStorageStore)
	if !ok {
		return nil, errors.New("store does not implement ExtendedStorageStore")
	}
	return extStore.FindFileMetadata(fileID)
}

func (s *StorageService) GetAccessibleFileMetadata(ctx context.Context, fileID uuid.UUID, userID uuid.UUID) (*models.FileMetadata, error) {
	if fileID == uuid.Nil || userID == uuid.Nil {
		return nil, errors.New("invalid file access request")
	}
	return s.Store.FindAccessibleFileMetadata(ctx, fileID, userID)
}

func (s *StorageService) GetFileChunks(fileID uuid.UUID) ([]models.FileChunk, error) {
	type ExtendedStorageStore interface {
		FindFileChunks(fileID uuid.UUID) ([]models.FileChunk, error)
	}
	extStore, ok := s.Store.(ExtendedStorageStore)
	if !ok {
		return nil, errors.New("store does not implement ExtendedStorageStore")
	}
	return extStore.FindFileChunks(fileID)
}

func uniqueUUIDs(values []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(values))
	result := make([]uuid.UUID, 0, len(values))
	for _, value := range values {
		if value == uuid.Nil {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
