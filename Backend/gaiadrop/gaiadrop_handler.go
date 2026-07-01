// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package gaiadrop

import (
	"encoding/json"
	"log"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 96*1024)
	var input SubmitInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid GaiaDrop request")
		return
	}

	drop, err := h.service.Submit(r.Context(), input)
	if err != nil {
		log.Printf("gaiadrop submit rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GaiaDrop request rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"id":          drop.ID.String(),
		"status":      "received",
		"payloadHash": drop.PayloadHash,
		"createdAt":   drop.CreatedAt,
	})
}

func (h *Handler) ListInbox(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	identityID, err := uuid.Parse(r.URL.Query().Get("identityId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	submissions, err := h.service.ListForIdentity(r.Context(), userID, identityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "GaiaDrop inbox rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, submissions)
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	dropID, err := uuid.Parse(r.URL.Query().Get("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid drop ID")
		return
	}

	if err := h.service.MarkAsRead(r.Context(), userID, dropID); err != nil {
		log.Printf("gaiadrop mark-read rejected for user %s drop %s: %v", userID.String(), dropID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "GaiaDrop update rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	dropID, err := uuid.Parse(r.URL.Query().Get("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid drop ID")
		return
	}

	if err := h.service.Delete(r.Context(), userID, dropID); err != nil {
		log.Printf("gaiadrop delete rejected for user %s drop %s: %v", userID.String(), dropID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "GaiaDrop delete rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
