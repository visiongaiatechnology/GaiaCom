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

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func setupTestStorageDBAndStore(t *testing.T) (*sql.DB, *repository.SQLStore, func()) {
	t.Helper()
	t.Setenv("DB_PATH", "")
	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
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

	fileHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" // 64 chars (32 bytes hex)

	// 1. Success path
	metadata, err := svc.InitializeUpload(user1.ID, "document.pdf", 1024, "application/pdf", fileHash)
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
	chunkContent := []byte("chunk content data")
	chunkHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" // 64 hex chars (32 bytes)
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
	chunkFilePath := filepath.Join(metadata.Path, "chunk_00000.bin")
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

	fileHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	// 1. InitUpload - Success
	initPayload := map[string]interface{}{
		"fileName": "test.png",
		"fileSize": 5000,
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
	chunkContent := []byte("chunk content")
	chunkHash := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

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
