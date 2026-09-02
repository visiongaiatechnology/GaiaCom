package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/internal/security"
)

type Handler struct {
	Service  *StorageService
	Security *security.SecuritySystem
}

func NewStorageHandler(service *StorageService, securitySystems ...*security.SecuritySystem) *Handler {
	handler := &Handler{Service: service}
	if len(securitySystems) > 0 {
		handler.Security = securitySystems[0]
	}
	return handler
}

func (h *Handler) InitUpload(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		FileName string `json:"fileName"`
		FileSize int64  `json:"fileSize"`
		MimeType string `json:"mimeType"`
		FileHash string `json:"fileHash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid upload request")
		return
	}

	if sec := h.Security; sec != nil {
		if err := sec.CheckAttachmentUpload(r.Context(), req.FileName, req.FileSize, req.MimeType, r); err != nil {
			log.Printf("storage init rejected by attachment guard: %v", err)
			httpx.WriteError(w, http.StatusBadRequest, "Upload rejected")
			return
		}
	}

	metadata, err := h.Service.InitializeUpload(userID, req.FileName, req.FileSize, req.MimeType, req.FileHash)
	if err != nil {
		log.Printf("storage init rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "Upload rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"fileId": metadata.FileID,
		"status": "initialized",
	})
}

func (h *Handler) UploadChunk(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid multipart request")
		return
	}

	file, fileHeader, err := r.FormFile("chunk")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Missing chunk file")
		return
	}
	_ = file.Close()

	fileID, err := uuid.Parse(r.FormValue("fileId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid fileId")
		return
	}

	chunkIndex, err := strconv.Atoi(r.FormValue("index"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid index")
		return
	}

	if err := h.Service.SaveChunkContext(r.Context(), userID, fileID, chunkIndex, r.FormValue("chunkHash"), fileHeader); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Chunk rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

func (h *Handler) CompleteUpload(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		FileID string `json:"fileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid fileId")
		return
	}

	if err := h.Service.FinalizeUploadContext(r.Context(), fileID, userID); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Upload cannot be finalized")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "completed", "fileId": fileID})
}

func (h *Handler) GrantAccess(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		FileID         string   `json:"fileId"`
		IdentityIDs    []string `json:"identityIds"`
		ExpiresInHours int      `json:"expiresInHours"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid access grant request")
		return
	}

	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid fileId")
		return
	}
	identityIDs := make([]uuid.UUID, 0, len(req.IdentityIDs))
	for _, value := range req.IdentityIDs {
		parsed, err := uuid.Parse(value)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
			return
		}
		identityIDs = append(identityIDs, parsed)
	}

	var grantErr error
	if req.ExpiresInHours > 0 {
		if req.ExpiresInHours > 12 {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid access grant expiry")
			return
		}
		grantErr = h.Service.GrantAccessUntil(userID, fileID, identityIDs, time.Now().UTC().Add(time.Duration(req.ExpiresInHours)*time.Hour))
	} else {
		grantErr = h.Service.GrantAccess(userID, fileID, identityIDs)
	}
	if grantErr != nil {
		log.Printf("storage access grant rejected for file %s by user %s: %v", fileID, userID, grantErr)
		httpx.WriteError(w, http.StatusForbidden, "File access grant rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "granted"})
}

func (h *Handler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	fileIDStr := httpx.Param(r, "fileId")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid fileId")
		return
	}

	metadata, err := h.Service.GetAccessibleFileMetadata(r.Context(), fileID, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "File metadata not found")
		return
	}
	if !isCompletedFileStatus(metadata.Status) {
		httpx.WriteError(w, http.StatusNotFound, "File metadata not found")
		return
	}

	chunks, err := h.Service.GetFileChunks(fileID)
	if err != nil || len(chunks) == 0 {
		httpx.WriteError(w, http.StatusNotFound, "File chunks not found")
		return
	}
	var storedSize int64
	for _, chunk := range chunks {
		if chunk.ChunkSize <= 0 || storedSize > metadata.FileSize-chunk.ChunkSize {
			httpx.WriteError(w, http.StatusInternalServerError, "Stored file manifest is invalid")
			return
		}
		storedSize += chunk.ChunkSize
	}
	if storedSize != metadata.FileSize {
		httpx.WriteError(w, http.StatusInternalServerError, "Stored file manifest is invalid")
		return
	}

	start, end, partial, err := parseDownloadRange(r.Header.Get("Range"), metadata.FileSize)
	if err != nil {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", metadata.FileSize))
		httpx.WriteError(w, http.StatusRequestedRangeNotSatisfiable, "Requested range is not satisfiable")
		return
	}
	w.Header().Set("Content-Type", metadata.MimeType)
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeDownloadFileName(metadata.FileName)))
	if partial {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, metadata.FileSize))
		w.WriteHeader(http.StatusPartialContent)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	responseController := http.NewResponseController(w)
	var fileOffset int64
	var written int64
	for _, chunk := range chunks {
		chunkStart := fileOffset
		chunkEnd := fileOffset + chunk.ChunkSize - 1
		fileOffset += chunk.ChunkSize
		if chunkEnd < start || chunkStart > end {
			continue
		}
		chunkKey := chunk.MinioID
		if chunkKey == "" {
			chunkKey = h.Service.chunkObjectKey(metadata.FileID, chunk.Index)
		}

		file, err := h.Service.objectStore().Get(r.Context(), chunkKey)
		if err != nil {
			log.Printf("Failed to open chunk object %s: %v", chunkKey, err)
			return
		}

		localStart := maxInt64(start-chunkStart, 0)
		localEnd := minInt64(end-chunkStart, chunk.ChunkSize-1)
		if localStart > 0 {
			if _, err := io.CopyN(io.Discard, file, localStart); err != nil {
				_ = file.Close()
				log.Printf("Error seeking chunk range: %v", err)
				return
			}
		}
		if err := responseController.SetWriteDeadline(time.Now().Add(30 * time.Second)); err != nil && !errors.Is(err, http.ErrNotSupported) {
			_ = file.Close()
			log.Printf("Failed to set download write deadline: %v", err)
			return
		}
		copied, copyErr := io.CopyN(w, file, localEnd-localStart+1)
		written += copied
		_ = file.Close()
		if copyErr != nil {
			log.Printf("Error streaming chunk: %v", copyErr)
			return
		}
	}
	_ = responseController.SetWriteDeadline(time.Time{})
	if written != end-start+1 {
		log.Printf("Download size mismatch for file %s: wrote %d, expected %d", fileID, written, end-start+1)
	}
}

func parseDownloadRange(value string, size int64) (start int64, end int64, partial bool, err error) {
	if size <= 0 {
		return 0, 0, false, errors.New("invalid file size")
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, size - 1, false, nil
	}
	if !strings.HasPrefix(value, "bytes=") || strings.Contains(value, ",") {
		return 0, 0, false, errors.New("unsupported byte range")
	}
	spec := strings.TrimPrefix(value, "bytes=")
	left, right, ok := strings.Cut(spec, "-")
	if !ok || (left == "" && right == "") {
		return 0, 0, false, errors.New("invalid byte range")
	}
	if left == "" {
		suffix, parseErr := strconv.ParseInt(right, 10, 64)
		if parseErr != nil || suffix <= 0 {
			return 0, 0, false, errors.New("invalid suffix range")
		}
		if suffix > size {
			suffix = size
		}
		return size - suffix, size - 1, true, nil
	}
	start, err = strconv.ParseInt(left, 10, 64)
	if err != nil || start < 0 || start >= size {
		return 0, 0, false, errors.New("invalid range start")
	}
	end = size - 1
	if right != "" {
		end, err = strconv.ParseInt(right, 10, 64)
		if err != nil || end < start {
			return 0, 0, false, errors.New("invalid range end")
		}
		if end >= size {
			end = size - 1
		}
	}
	return start, end, true, nil
}

func minInt64(left, right int64) int64 {
	if left < right {
		return left
	}
	return right
}

func maxInt64(left, right int64) int64 {
	if left > right {
		return left
	}
	return right
}

func safeDownloadFileName(value string) string {
	name := strings.TrimSpace(value)
	name = strings.NewReplacer("\r", " ", "\n", " ", `"`, "'", "\\", "_", "/", "_").Replace(name)
	if name == "" {
		return "gaiacom-attachment.bin"
	}
	if len(name) > 180 {
		return name[:180]
	}
	return name
}

func isCompletedFileStatus(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	return normalized == "complete" || normalized == "completed"
}
