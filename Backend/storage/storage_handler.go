package storage

import (
	"encoding/json"
	"net/http"
	"strconv"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
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

	metadata, err := h.Service.InitializeUpload(userID, req.FileName, req.FileSize, req.MimeType, req.FileHash)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
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
