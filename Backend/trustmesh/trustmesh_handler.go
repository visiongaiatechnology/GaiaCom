// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package trustmesh

import (
	"encoding/json"
	"log"
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
		log.Printf("trustmesh report rejected for user %s message %s: %v", userID.String(), msgUUID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "Trust report rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "submitted"})
}
