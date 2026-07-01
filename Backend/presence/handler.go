// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package presence

import (
	"encoding/json"
	"net/http"
	"strings"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type Handler struct {
	Service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

func (h *Handler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input struct {
		IdentityID string `json:"identityId"`
		Status     string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid presence request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	presence, err := h.Service.Heartbeat(r.Context(), userID, identityID, input.Status)
	if err != nil {
		httpx.WriteError(w, http.StatusForbidden, "Presence rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, presence)
}

func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.UserIDFromContext(r.Context()); !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	values := r.URL.Query()["gaiaId"]
	if csv := r.URL.Query().Get("gaiaIds"); csv != "" {
		values = append(values, strings.Split(csv, ",")...)
	}
	presence, err := h.Service.Status(r.Context(), values)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Presence unavailable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"presence": presence})
}

func (h *Handler) UpdateTyping(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input struct {
		IdentityID string `json:"identityId"`
		PeerGaiaID string `json:"peerGaiaId"`
		ChannelID  string `json:"channelId"`
		IsTyping   bool   `json:"isTyping"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid typing request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	status, err := h.Service.UpdateTyping(r.Context(), userID, identityID, input.PeerGaiaID, input.ChannelID, input.IsTyping)
	if err != nil {
		httpx.WriteError(w, http.StatusForbidden, "Typing rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, status)
}

func (h *Handler) TypingStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	identityID, err := uuid.Parse(r.URL.Query().Get("identityId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	status, err := h.Service.TypingStatus(
		r.Context(),
		userID,
		identityID,
		r.URL.Query().Get("peerGaiaId"),
		r.URL.Query().Get("channelId"),
	)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Typing unavailable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, status)
}
