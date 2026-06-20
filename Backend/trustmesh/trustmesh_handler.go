package trustmesh

import (
	"encoding/json"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type SubmitReportInput struct {
	MessageID          string `json:"messageId"`
	SenderPublicKey    string `json:"senderPublicKey"`
	RecipientPublicKey string `json:"recipientPublicKey"`
	CiphertextHash     string `json:"ciphertextHash"`
	Signature          string `json:"signature"`
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) SubmitReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input SubmitReportInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	msgUUID, err := uuid.Parse(input.MessageID)
	if err != nil || msgUUID == uuid.Nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid messageId")
		return
	}

	if input.SenderPublicKey == "" {
		httpx.WriteError(w, http.StatusBadRequest, "senderPublicKey is required")
		return
	}

	if input.RecipientPublicKey == "" {
		httpx.WriteError(w, http.StatusBadRequest, "recipientPublicKey is required")
		return
	}

	if input.CiphertextHash == "" {
		httpx.WriteError(w, http.StatusBadRequest, "ciphertextHash is required")
		return
	}

	err = h.service.SubmitReport(
		r.Context(),
		userID,
		msgUUID,
		input.SenderPublicKey,
		input.RecipientPublicKey,
		input.CiphertextHash,
		input.Signature,
	)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "submitted"})
}
