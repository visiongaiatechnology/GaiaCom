// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package smtpbridge

import (
	"encoding/json"
	"errors"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type Handler struct {
	Service *Service
}

type sendLegacyInput struct {
	SenderIdentityID string       `json:"senderIdentityId"`
	To               string       `json:"to"`
	Subject          string       `json:"subject"`
	Body             string       `json:"body"`
	Attachments      []Attachment `json:"attachments"`
}

type ingestLegacyInput struct {
	TargetGaiaID string       `json:"targetGaiaId"`
	ExternalFrom string       `json:"externalFrom"`
	Subject      string       `json:"subject"`
	Body         string       `json:"body"`
	Attachments  []Attachment `json:"attachments"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input sendLegacyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid SMTP request")
		return
	}
	senderID, err := uuid.Parse(input.SenderIdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid sender ID")
		return
	}
	if err := h.Service.SendLegacyMail(r.Context(), userID, senderID, input.To, input.Subject, input.Body, input.Attachments); err != nil {
		writeSMTPError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent", "transport": "smtp.legacy"})
}

func (h *Handler) Ingest(w http.ResponseWriter, r *http.Request) {
	var input ingestLegacyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid SMTP ingest request")
		return
	}
	token := r.Header.Get("X-Gaia-SMTP-Token")
	if err := h.Service.IngestLegacyMail(r.Context(), token, input.TargetGaiaID, input.ExternalFrom, input.Subject, input.Body, input.Attachments); err != nil {
		writeSMTPError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusAccepted, map[string]string{"status": "accepted", "transport": "smtp.legacy"})
}

func writeSMTPError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errSMTPNotConfigured):
		httpx.WriteError(w, http.StatusServiceUnavailable, "SMTP bridge is not configured")
	default:
		httpx.WriteError(w, http.StatusBadRequest, "SMTP bridge request rejected")
	}
}
