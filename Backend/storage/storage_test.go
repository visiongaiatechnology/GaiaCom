package storage

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func setupTestStorageDBAndStore(t *testing.T) (*sql.DB, *repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	store := repository.NewSQLStore(db)

	cleanup := func() {
		db.Close()
	}
	return db, store, cleanup
}

func createTestMultipartFileHeader(t *testing.T, fieldName, fileName string, content []byte) *multipart.FileHeader {
	t.Helper()
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("failed to write content: %v", err)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if err := req.ParseMultipartForm(32 << 20); err != nil {
		t.Fatalf("failed to parse multipart: %v", err)
	}
	fileHeader := req.MultipartForm.File[fieldName][0]
	return fileHeader
}

func createCompletedTestFile(t *testing.T, svc *StorageService, userID uuid.UUID, fileName string, content []byte) *models.FileMetadata {
	t.Helper()
	fileHash := sha256Hex(content)
	metadata, err := svc.InitializeUpload(userID, fileName, int64(len(content)), "application/octet-stream", fileHash)
	if err != nil {
		t.Fatalf("InitializeUpload %s failed: %v", fileName, err)
	}
	fileHeader := createTestMultipartFileHeader(t, "chunk", "chunk.bin", content)
	if err := svc.SaveChunk(userID, metadata.FileID, 0, fileHash, fileHeader); err != nil {
		t.Fatalf("SaveChunk %s failed: %v", fileName, err)
	}
	if err := svc.FinalizeUpload(metadata.FileID, userID); err != nil {
		t.Fatalf("FinalizeUpload %s failed: %v", fileName, err)
	}
	return metadata
}

func TestStorageService(t *testing.T) {
	db, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	tempDir := t.TempDir()
	svc := &StorageService{
		Store:     store,
		UploadDir: tempDir,
	}

	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	if err := store.CreateUser(user1); err != nil {
		t.Fatalf("failed to create user1: %v", err)
	}

	user2 := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "hash2",
		PublicKey:    "pk2",
	}
	if err := store.CreateUser(user2); err != nil {
		t.Fatalf("failed to create user2: %v", err)
	}

	chunkContent := []byte("chunk content data")
	fileHash := sha256Hex(chunkContent)

	// 1. Success path
	metadata, err := svc.InitializeUpload(user1.ID, "document.pdf", int64(len(chunkContent)), "application/pdf", fileHash)
	if err != nil {
		t.Fatalf("InitializeUpload failed: %v", err)
	}
	if metadata.Status != "pending" {
		t.Errorf("expected pending status, got %q", metadata.Status)
	}

	// 2. InitializeUpload input validations
	_, err = svc.InitializeUpload(uuid.Nil, "doc.pdf", 1024, "application/pdf", fileHash)
	if err == nil {
		t.Error("expected error for invalid user, got nil")
	}
	_, err = svc.InitializeUpload(user1.ID, "doc.pdf", 0, "application/pdf", fileHash)
	if err == nil {
		t.Error("expected error for size 0, got nil")
	}
	_, err = svc.InitializeUpload(user1.ID, "", 1024, "application/pdf", fileHash)
	if err == nil {
		t.Error("expected error for empty filename, got nil")
	}
	_, err = svc.InitializeUpload(user1.ID, "doc.pdf", 1024, "application/pdf", "invalid-hash")
	if err == nil {
		t.Error("expected error for invalid hash, got nil")
	}

	// 3. SaveChunk - Success
	chunkHash := sha256Hex(chunkContent)
	fh := createTestMultipartFileHeader(t, "chunk", "chunk.bin", chunkContent)

	err = svc.SaveChunk(user1.ID, metadata.FileID, 0, chunkHash, fh)
	if err != nil {
		t.Fatalf("SaveChunk failed: %v", err)
	}

	// Verify chunk record in database
	var count int
	var dbChunkHash string
	err = db.QueryRow("SELECT COUNT(*), chunk_hash FROM file_chunks WHERE file_id = ?", metadata.FileID).Scan(&count, &dbChunkHash)
	if err != nil {
		t.Fatalf("QueryRow failed: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 chunk, got %d", count)
	}
	if dbChunkHash != chunkHash {
		t.Errorf("expected chunk hash %q, got %q", chunkHash, dbChunkHash)
	}

	// Verify chunk file physically exists
	storedChunks, err := svc.GetFileChunks(metadata.FileID)
	if err != nil || len(storedChunks) != 1 {
		t.Fatalf("expected one stored chunk, chunks=%d err=%v", len(storedChunks), err)
	}
	chunkFilePath := filepath.Join(tempDir, filepath.FromSlash(storedChunks[0].MinioID))
	if _, err := os.Stat(chunkFilePath); os.IsNotExist(err) {
		t.Errorf("expected chunk file to be saved at %q, but it does not exist", chunkFilePath)
	}

	// 4. SaveChunk - Validations
	err = svc.SaveChunk(uuid.Nil, metadata.FileID, 0, chunkHash, fh)
	if err == nil {
		t.Error("expected error for nil user ID, got nil")
	}
	err = svc.SaveChunk(user1.ID, metadata.FileID, -1, chunkHash, fh)
	if err == nil {
		t.Error("expected error for negative chunk index, got nil")
	}
	err = svc.SaveChunk(user1.ID, metadata.FileID, 0, "badhash", fh)
	if err == nil {
		t.Error("expected error for invalid chunk hash, got nil")
	}
	// Access denied (user2 trying to write to user1's upload)
	err = svc.SaveChunk(user2.ID, metadata.FileID, 0, chunkHash, fh)
	if err == nil {
		t.Error("expected error for unauthorized user access, got nil")
	}

	// 5. FinalizeUpload
	// Authorized user1 finishes the upload
	err = svc.FinalizeUpload(metadata.FileID, user1.ID)
	if err != nil {
		t.Fatalf("FinalizeUpload failed: %v", err)
	}

	// Access denied (user2 trying to finalize user1's upload)
	err = svc.FinalizeUpload(metadata.FileID, user2.ID)
	if err == nil {
		t.Error("expected error when unauthorized user finalizes, got nil")
	}

	if _, err := svc.GetAccessibleFileMetadata(t.Context(), metadata.FileID, user2.ID); err == nil {
		t.Fatal("expected unauthorized user to be denied file metadata before ACL grant")
	}

	user2Identity := &models.Identity{
		ID:           uuid.New(),
		UserID:       user2.ID,
		GaiaID:       "@bob:gaiacom.test",
		DisplayName:  "Bob",
		Keys:         models.JSONB(`{}`),
		PublicRecord: models.JSONB(`{"public_keys":{}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(user2Identity); err != nil {
		t.Fatalf("failed to create user2 identity: %v", err)
	}
	if err := svc.GrantAccess(user1.ID, metadata.FileID, []uuid.UUID{user2Identity.ID}); err != nil {
		t.Fatalf("GrantAccess failed: %v", err)
	}
	if _, err := svc.GetAccessibleFileMetadata(t.Context(), metadata.FileID, user2.ID); err != nil {
		t.Fatalf("expected ACL-granted user to access file metadata: %v", err)
	}

	metadataPublic := createCompletedTestFile(t, svc, user1.ID, "public-gsn-image.webp", []byte("encrypted-public-image"))
	if _, err := svc.GetAccessibleFileMetadata(t.Context(), metadataPublic.FileID, user2.ID); err == nil {
		t.Fatal("expected public file to remain private before MarkFilePublic")
	}
	if err := store.MarkFilePublic(t.Context(), metadataPublic.FileID, user1.ID); err != nil {
		t.Fatalf("MarkFilePublic failed: %v", err)
	}
	if _, err := svc.GetAccessibleFileMetadata(t.Context(), metadataPublic.FileID, user2.ID); err != nil {
		t.Fatalf("expected public file to be accessible to authenticated user: %v", err)
	}

	// 6. Path-traversal checks
	// Let's test jailedPath directly
	_, err = svc.jailedPath("..")
	if err == nil {
		t.Error("expected error for traversal '..', got nil")
	}

	_, err = svc.jailedPath("sub", "..", "..")
	if err == nil {
		t.Error("expected error for double traversal escaping jail, got nil")
	}

	// Safe traversal within jail
	p, err := svc.jailedPath("sub", "file.txt")
	if err != nil {
		t.Fatalf("expected subpath inside jail to succeed: %v", err)
	}
	expectedSubpath := filepath.Clean(filepath.Join(tempDir, "sub", "file.txt"))
	if p != expectedSubpath {
		t.Errorf("expected subpath %q, got %q", expectedSubpath, p)
	}
}

func TestStorageServiceRejectsBundledUploadAttacks(t *testing.T) {
	_, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	tempDir := t.TempDir()
	svc := &StorageService{
		Store:     store,
		UploadDir: tempDir,
	}

	user := &models.User{
		ID:           uuid.New(),
		Username:     "attack-target",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	fileHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	if _, err := svc.InitializeUpload(user.ID, "large-native-mail-envelope.bin", maxFileBytes, "application/octet-stream", fileHash); err != nil {
		t.Fatalf("expected native envelope ceiling to initialize: %v", err)
	}
	if _, err := svc.InitializeUpload(user.ID, "oversize-native-mail-envelope.bin", maxFileBytes+1, "application/octet-stream", fileHash); err == nil {
		t.Fatal("expected envelope larger than native storage ceiling to be rejected")
	}

	metadata, err := svc.InitializeUpload(user.ID, "chunk-boundary.bin", maxChunkBytes*2, "application/octet-stream", fileHash)
	if err != nil {
		t.Fatalf("InitializeUpload failed: %v", err)
	}

	oversizedChunk := bytes.Repeat([]byte{0x41}, int(maxChunkBytes)+1)
	overlargeHeader := createTestMultipartFileHeader(t, "chunk", "chunk_00000.bin", oversizedChunk)
	if err := svc.SaveChunk(user.ID, metadata.FileID, 0, sha256Hex(oversizedChunk), overlargeHeader); err == nil {
		t.Fatal("expected oversized encrypted chunk to be rejected")
	}
	entries, err := os.ReadDir(metadata.Path)
	if err != nil || len(entries) != 0 {
		t.Fatalf("oversized rejected chunk must not remain on disk, entries=%d err=%v", len(entries), err)
	}
	wrongHashHeader := createTestMultipartFileHeader(t, "chunk", "chunk.bin", []byte("integrity protected"))
	if err := svc.SaveChunk(user.ID, metadata.FileID, 0, sha256Hex([]byte("different content")), wrongHashHeader); err == nil {
		t.Fatal("expected forged chunk digest to be rejected")
	}
	entries, err = os.ReadDir(metadata.Path)
	if err != nil || len(entries) != 0 {
		t.Fatalf("digest-rejected chunk must not remain on disk, entries=%d err=%v", len(entries), err)
	}

	exactChunk := bytes.Repeat([]byte{0x42}, int(maxChunkBytes))
	exactHeader := createTestMultipartFileHeader(t, "chunk", "chunk_00001.bin", exactChunk)
	if err := svc.SaveChunk(user.ID, metadata.FileID, 1, sha256Hex(exactChunk), exactHeader); err != nil {
		t.Fatalf("expected exact 1 MiB encrypted chunk to be accepted: %v", err)
	}
	chunks, err := svc.GetFileChunks(metadata.FileID)
	if err != nil || len(chunks) != 1 {
		t.Fatalf("expected one accepted boundary chunk, chunks=%d err=%v", len(chunks), err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, filepath.FromSlash(chunks[0].MinioID))); err != nil {
		t.Fatalf("expected accepted boundary chunk object: %v", err)
	}
}

func TestFinalizeUploadRejectsIncompleteAndCorruptedObjects(t *testing.T) {
	_, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	tempDir := t.TempDir()
	svc := &StorageService{Store: store, UploadDir: tempDir}
	user := &models.User{ID: uuid.New(), Username: "integrity-user", PasswordHash: "hash", PublicKey: "pk"}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	content := []byte("complete encrypted payload")
	incomplete, err := svc.InitializeUpload(user.ID, "incomplete.bin", int64(len(content)+1), "application/octet-stream", sha256Hex(content))
	if err != nil {
		t.Fatalf("failed to initialize incomplete upload: %v", err)
	}
	if err := svc.SaveChunk(user.ID, incomplete.FileID, 0, sha256Hex(content), createTestMultipartFileHeader(t, "chunk", "chunk.bin", content)); err != nil {
		t.Fatalf("failed to save incomplete upload chunk: %v", err)
	}
	if err := svc.FinalizeUpload(incomplete.FileID, user.ID); err == nil {
		t.Fatal("expected incomplete upload finalization to fail")
	}

	corrupted, err := svc.InitializeUpload(user.ID, "corrupted.bin", int64(len(content)), "application/octet-stream", sha256Hex(content))
	if err != nil {
		t.Fatalf("failed to initialize corruptible upload: %v", err)
	}
	if err := svc.SaveChunk(user.ID, corrupted.FileID, 0, sha256Hex(content), createTestMultipartFileHeader(t, "chunk", "chunk.bin", content)); err != nil {
		t.Fatalf("failed to save corruptible upload chunk: %v", err)
	}
	chunks, err := svc.GetFileChunks(corrupted.FileID)
	if err != nil || len(chunks) != 1 {
		t.Fatalf("expected one corruptible chunk, chunks=%d err=%v", len(chunks), err)
	}
	objectPath := filepath.Join(tempDir, filepath.FromSlash(chunks[0].MinioID))
	if err := os.WriteFile(objectPath, bytes.Repeat([]byte{0xFF}, len(content)), 0600); err != nil {
		t.Fatalf("failed to corrupt test object: %v", err)
	}
	if err := svc.FinalizeUpload(corrupted.FileID, user.ID); err == nil {
		t.Fatal("expected corrupted object finalization to fail")
	}
	metadata, err := store.FindPendingFileForUser(corrupted.FileID, user.ID)
	if err != nil || metadata.Status != "pending" {
		t.Fatalf("corrupted upload must remain pending, metadata=%+v err=%v", metadata, err)
	}
}

func TestStorageServiceEnforcesUserQuota(t *testing.T) {
	_, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	svc := &StorageService{
		Store:          store,
		UploadDir:      t.TempDir(),
		UserQuotaBytes: 2048,
	}

	user := &models.User{
		ID:           uuid.New(),
		Username:     "quota-user",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	fileHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	if _, err := svc.InitializeUpload(user.ID, "first.bin", 1024, "application/octet-stream", fileHash); err != nil {
		t.Fatalf("expected first upload reservation below quota: %v", err)
	}
	if _, err := svc.InitializeUpload(user.ID, "too-much.bin", 1025, "application/octet-stream", fileHash); err == nil {
		t.Fatal("expected second upload reservation to exceed quota")
	}
	if _, err := svc.InitializeUpload(user.ID, "fits-exactly.bin", 1024, "application/octet-stream", fileHash); err != nil {
		t.Fatalf("expected exact quota boundary to be accepted: %v", err)
	}
	if _, err := svc.InitializeUpload(user.ID, "over-boundary.bin", 1, "application/octet-stream", fileHash); err == nil {
		t.Fatal("expected quota to reject any byte above the boundary")
	}
}

func TestStorageSweeperDeletesStalePendingUploadChunks(t *testing.T) {
	db, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	tempDir := t.TempDir()
	svc := &StorageService{
		Store:            store,
		UploadDir:        tempDir,
		PendingUploadTTL: time.Hour,
	}

	user := &models.User{
		ID:           uuid.New(),
		Username:     "stale-pending-user",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(user); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	chunkContent := []byte("abandoned encrypted chunk")
	fileHash := sha256Hex(chunkContent)
	metadata, err := svc.InitializeUpload(user.ID, "abandoned.bin", int64(len(chunkContent)), "application/octet-stream", fileHash)
	if err != nil {
		t.Fatalf("InitializeUpload failed: %v", err)
	}

	fh := createTestMultipartFileHeader(t, "chunk", "chunk.bin", chunkContent)
	if err := svc.SaveChunk(user.ID, metadata.FileID, 0, fileHash, fh); err != nil {
		t.Fatalf("SaveChunk failed: %v", err)
	}

	chunks, err := svc.GetFileChunks(metadata.FileID)
	if err != nil || len(chunks) != 1 {
		t.Fatalf("expected pending chunk manifest, chunks=%d err=%v", len(chunks), err)
	}
	chunkPath := filepath.Join(tempDir, filepath.FromSlash(chunks[0].MinioID))
	if _, err := os.Stat(chunkPath); err != nil {
		t.Fatalf("expected pending chunk on disk before cleanup: %v", err)
	}

	old := time.Now().Add(-2 * time.Hour).UTC().Format(time.RFC3339)
	if _, err := db.Exec(`UPDATE file_metadata SET updated_at = ? WHERE file_id = ?`, old, metadata.FileID); err != nil {
		t.Fatalf("failed to age pending metadata: %v", err)
	}

	svc.SweepExpiredFiles(t.Context())

	if _, err := store.FindFileMetadata(metadata.FileID); err == nil {
		t.Fatal("expected stale pending metadata to be deleted")
	}
	if _, err := os.Stat(chunkPath); !os.IsNotExist(err) {
		t.Fatalf("expected stale pending chunk to be deleted, stat err: %v", err)
	}
}

func TestStorageSweeperDeletesExpiredFileAccessGrants(t *testing.T) {
	db, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	svc := &StorageService{
		Store:     store,
		UploadDir: t.TempDir(),
	}

	owner := &models.User{ID: uuid.New(), Username: "owner", PasswordHash: "hash", PublicKey: "pk"}
	recipient := &models.User{ID: uuid.New(), Username: "recipient", PasswordHash: "hash", PublicKey: "pk2"}
	if err := store.CreateUser(owner); err != nil {
		t.Fatalf("failed to create owner: %v", err)
	}
	if err := store.CreateUser(recipient); err != nil {
		t.Fatalf("failed to create recipient: %v", err)
	}
	recipientIdentity := &models.Identity{
		ID:           uuid.New(),
		UserID:       recipient.ID,
		GaiaID:       "@recipient:gaiacom.local",
		DisplayName:  "Recipient",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"recipient-key"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(recipientIdentity); err != nil {
		t.Fatalf("failed to create recipient identity: %v", err)
	}

	expiredFile := createCompletedTestFile(t, svc, owner.ID, "expired-share.bin", []byte("expired encrypted share"))
	activeFile := createCompletedTestFile(t, svc, owner.ID, "active-share.bin", []byte("active encrypted share"))

	if err := svc.GrantAccessUntil(owner.ID, expiredFile.FileID, []uuid.UUID{recipientIdentity.ID}, time.Now().UTC().Add(time.Hour)); err != nil {
		t.Fatalf("GrantAccessUntil expired grant file failed: %v", err)
	}
	if err := svc.GrantAccessUntil(owner.ID, activeFile.FileID, []uuid.UUID{recipientIdentity.ID}, time.Now().UTC().Add(2*time.Hour)); err != nil {
		t.Fatalf("GrantAccessUntil active grant file failed: %v", err)
	}
	expiredAt := time.Now().UTC().Add(-time.Hour).Format(time.RFC3339)
	if _, err := db.Exec(`UPDATE file_access_grants SET expires_at = ? WHERE file_id = ?`, expiredAt, expiredFile.FileID); err != nil {
		t.Fatalf("failed to age file access grant: %v", err)
	}

	svc.SweepExpiredFiles(t.Context())

	var expiredCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM file_access_grants WHERE file_id = ?`, expiredFile.FileID).Scan(&expiredCount); err != nil {
		t.Fatalf("failed to count expired grants: %v", err)
	}
	if expiredCount != 0 {
		t.Fatalf("expected expired access grant to be deleted, got %d", expiredCount)
	}
	var activeCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM file_access_grants WHERE file_id = ?`, activeFile.FileID).Scan(&activeCount); err != nil {
		t.Fatalf("failed to count active grants: %v", err)
	}
	if activeCount != 1 {
		t.Fatalf("expected active access grant to remain, got %d", activeCount)
	}
}

func TestStorageHandler(t *testing.T) {
	_, store, cleanup := setupTestStorageDBAndStore(t)
	defer cleanup()

	tempDir := t.TempDir()
	svc := &StorageService{
		Store:     store,
		UploadDir: tempDir,
	}
	handler := NewStorageHandler(svc)

	user1 := &models.User{
		ID:           uuid.New(),
		Username:     "alice",
		PasswordHash: "hash1",
		PublicKey:    "pk1",
	}
	_ = store.CreateUser(user1)
	user2 := &models.User{
		ID:           uuid.New(),
		Username:     "bob",
		PasswordHash: "hash2",
		PublicKey:    "pk2",
	}
	_ = store.CreateUser(user2)
	user2Identity := &models.Identity{
		ID:           uuid.New(),
		UserID:       user2.ID,
		GaiaID:       "@bob:gaiacom.local",
		DisplayName:  "Bob",
		PublicRecord: models.JSONB(`{"public_keys":{"identity":"bob-key"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(user2Identity); err != nil {
		t.Fatalf("failed to create recipient identity: %v", err)
	}

	chunkContent := []byte("chunk content")
	fileHash := sha256Hex(chunkContent)

	// 1. InitUpload - Success
	initPayload := map[string]interface{}{
		"fileName": "test.png",
		"fileSize": len(chunkContent),
		"mimeType": "image/png",
		"fileHash": fileHash,
	}
	bodyBytes, _ := json.Marshal(initPayload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/storage/init", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec := httptest.NewRecorder()

	handler.InitUpload(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var initResp struct {
		FileID string `json:"fileId"`
		Status string `json:"status"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &initResp)
	if initResp.Status != "initialized" {
		t.Errorf("expected status 'initialized', got %q", initResp.Status)
	}

	fileID, err := uuid.Parse(initResp.FileID)
	if err != nil {
		t.Fatalf("returned file ID is not valid: %v", err)
	}

	// 2. UploadChunk - Success
	chunkHash := sha256Hex(chunkContent)

	var bodyBuf bytes.Buffer
	writer := multipart.NewWriter(&bodyBuf)
	_ = writer.WriteField("fileId", fileID.String())
	_ = writer.WriteField("index", "0")
	_ = writer.WriteField("chunkHash", chunkHash)
	part, _ := writer.CreateFormFile("chunk", "chunk_0.bin")
	_, _ = part.Write(chunkContent)
	_ = writer.Close()

	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/chunk", &bodyBuf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()

	handler.UploadChunk(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	// 3. CompleteUpload - Success
	completePayload := map[string]interface{}{
		"fileId": fileID.String(),
	}
	bodyBytes, _ = json.Marshal(completePayload)

	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/complete", bytes.NewReader(bodyBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()

	handler.CompleteUpload(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK (200), got %d: %s", rec.Code, rec.Body.String())
	}

	var completeResp struct {
		Status string `json:"status"`
		FileID string `json:"fileId"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &completeResp)
	if completeResp.Status != "completed" {
		t.Errorf("expected status 'completed', got %q", completeResp.Status)
	}

	downloadRouter := httpx.NewRouter()
	downloadRouter.GET("/api/v1/storage/download/:fileId", handler.DownloadFile)

	req = httptest.NewRequest(http.MethodGet, "/api/v1/storage/download/"+fileID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user2.ID))
	rec = httptest.NewRecorder()
	downloadRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for foreign fileId download, got %d: %s", rec.Code, rec.Body.String())
	}

	grantPayload := map[string]interface{}{
		"fileId":         fileID.String(),
		"identityIds":    []string{user2Identity.ID.String()},
		"expiresInHours": 12,
	}
	grantBytes, _ := json.Marshal(grantPayload)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/grant", bytes.NewReader(grantBytes))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.GrantAccess(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for owner access grant, got %d: %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/storage/download/"+fileID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user2.ID))
	rec = httptest.NewRecorder()
	downloadRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for granted recipient download, got %d: %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != string(chunkContent) {
		t.Fatalf("granted recipient download body mismatch: got %q want %q", rec.Body.String(), string(chunkContent))
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/storage/download/"+fileID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	downloadRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for owner fileId download, got %d: %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != string(chunkContent) {
		t.Fatalf("owner download body mismatch: got %q want %q", rec.Body.String(), string(chunkContent))
	}

	rangeContent := []byte("abcdefghij")
	rangeMetadata, err := svc.InitializeUpload(user1.ID, "range.bin", int64(len(rangeContent)), "application/octet-stream", sha256Hex(rangeContent))
	if err != nil {
		t.Fatalf("failed to initialize range upload: %v", err)
	}
	for index, content := range [][]byte{rangeContent[:5], rangeContent[5:]} {
		if err := svc.SaveChunk(user1.ID, rangeMetadata.FileID, index, sha256Hex(content), createTestMultipartFileHeader(t, "chunk", "chunk.bin", content)); err != nil {
			t.Fatalf("failed to save range chunk %d: %v", index, err)
		}
	}
	if err := svc.FinalizeUpload(rangeMetadata.FileID, user1.ID); err != nil {
		t.Fatalf("failed to finalize range upload: %v", err)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/storage/download/"+rangeMetadata.FileID.String(), nil)
	req.Header.Set("Range", "bytes=3-7")
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	downloadRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusPartialContent || rec.Body.String() != "defgh" {
		t.Fatalf("cross-chunk range mismatch: status=%d body=%q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Range"); got != "bytes 3-7/10" {
		t.Fatalf("unexpected Content-Range %q", got)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/storage/download/"+rangeMetadata.FileID.String(), nil)
	req.Header.Set("Range", "bytes=0-1,3-4")
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	downloadRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestedRangeNotSatisfiable {
		t.Fatalf("expected invalid multi-range to return 416, got %d", rec.Code)
	}

	// 4. Unauthorized checks
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/init", bytes.NewReader(bodyBytes))
	rec = httptest.NewRecorder()
	handler.InitUpload(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for InitUpload unauthorized, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/chunk", nil)
	rec = httptest.NewRecorder()
	handler.UploadChunk(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for UploadChunk unauthorized, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/complete", bytes.NewReader(bodyBytes))
	rec = httptest.NewRecorder()
	handler.CompleteUpload(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for CompleteUpload unauthorized, got %d", rec.Code)
	}

	// 5. Bad requests checks
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/init", bytes.NewReader([]byte("badjson")))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.InitUpload(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for InitUpload bad json, got %d", rec.Code)
	}

	// bad multipart form format
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/chunk", bytes.NewReader([]byte("not multipart")))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=invalid")
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.UploadChunk(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for bad multipart format, got %d", rec.Code)
	}

	// missing form field chunk
	var badBodyBuf bytes.Buffer
	badWriter := multipart.NewWriter(&badBodyBuf)
	_ = badWriter.WriteField("fileId", fileID.String())
	_ = badWriter.WriteField("index", "0")
	_ = badWriter.Close()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/chunk", &badBodyBuf)
	req.Header.Set("Content-Type", badWriter.FormDataContentType())
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.UploadChunk(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing chunk file, got %d", rec.Code)
	}

	// invalid fileId/index in UploadChunk
	var badBodyBuf2 bytes.Buffer
	badWriter2 := multipart.NewWriter(&badBodyBuf2)
	_ = badWriter2.WriteField("fileId", "invalid-uuid")
	_ = badWriter2.WriteField("index", "not-a-number")
	part2, _ := badWriter2.CreateFormFile("chunk", "chunk_0.bin")
	_, _ = part2.Write(chunkContent)
	_ = badWriter2.Close()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/chunk", &badBodyBuf2)
	req.Header.Set("Content-Type", badWriter2.FormDataContentType())
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.UploadChunk(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for bad UUID or index, got %d", rec.Code)
	}

	// invalid complete request body
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/complete", bytes.NewReader([]byte("badjson")))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.CompleteUpload(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for bad json in complete, got %d", rec.Code)
	}

	// invalid fileId in complete
	req = httptest.NewRequest(http.MethodPost, "/api/v1/storage/complete", bytes.NewReader([]byte(`{"fileId":"invalid-uuid"}`)))
	req = req.WithContext(auth.WithUserID(req.Context(), user1.ID))
	rec = httptest.NewRecorder()
	handler.CompleteUpload(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid fileId uuid in complete, got %d", rec.Code)
	}
}

func TestParseDownloadRange(t *testing.T) {
	tests := []struct {
		name        string
		header      string
		size        int64
		start       int64
		end         int64
		partial     bool
		shouldError bool
	}{
		{name: "full response", size: 100, start: 0, end: 99},
		{name: "bounded range", header: "bytes=10-19", size: 100, start: 10, end: 19, partial: true},
		{name: "open range", header: "bytes=90-", size: 100, start: 90, end: 99, partial: true},
		{name: "suffix range", header: "bytes=-10", size: 100, start: 90, end: 99, partial: true},
		{name: "oversized suffix is clamped", header: "bytes=-200", size: 100, start: 0, end: 99, partial: true},
		{name: "multiple ranges rejected", header: "bytes=0-1,3-4", size: 100, shouldError: true},
		{name: "range beyond file rejected", header: "bytes=100-110", size: 100, shouldError: true},
		{name: "reverse range rejected", header: "bytes=20-10", size: 100, shouldError: true},
		{name: "empty file rejected", size: 0, shouldError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			start, end, partial, err := parseDownloadRange(test.header, test.size)
			if test.shouldError {
				if err == nil {
					t.Fatal("expected range validation error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected range validation error: %v", err)
			}
			if start != test.start || end != test.end || partial != test.partial {
				t.Fatalf("got start=%d end=%d partial=%t; want start=%d end=%d partial=%t", start, end, partial, test.start, test.end, test.partial)
			}
		})
	}
}
