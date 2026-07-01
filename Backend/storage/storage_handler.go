// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package storage

import (
	"encoding/json"
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
	Service *StorageService
}

func NewStorageHandler(service *StorageService) *Handler {
	return &Handler{Service: service}
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

	if sec := security.GetInstance(); sec != nil {
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

	if err := h.Service.SaveChunk(userID, fileID, chunkIndex, r.FormValue("chunkHash"), fileHeader); err != nil {
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

	if err := h.Service.FinalizeUpload(fileID, userID); err != nil {
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

	w.Header().Set("Content-Type", metadata.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(metadata.FileSize, 10))
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safeDownloadFileName(metadata.FileName)))
	w.WriteHeader(http.StatusOK)

	for _, chunk := range chunks {
		chunkKey := chunk.MinioID
		if chunkKey == "" {
			chunkKey = h.Service.chunkObjectKey(metadata.FileID, chunk.Index)
		}

		file, err := h.Service.objectStore().Get(r.Context(), chunkKey)
		if err != nil {
			log.Printf("Failed to open chunk object %s: %v", chunkKey, err)
			return
		}

		_, err = io.Copy(w, file)
		_ = file.Close()
		if err != nil {
			log.Printf("Error streaming chunk: %v", err)
			return
		}
	}
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
