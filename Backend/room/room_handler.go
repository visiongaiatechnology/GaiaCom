package room

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

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	room, err := h.Service.CreateRoom(r.Context(), userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, room)
}

func (h *Handler) GetRooms(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	rooms, err := h.Service.GetRooms(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, rooms)
}

func (h *Handler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req UpdateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	roomUUID, err := uuid.Parse(req.RoomID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	room, err := h.Service.UpdateRoom(r.Context(), userID, roomUUID, req.Name, req.Description, req.Avatar)
	if err != nil {
		httpx.WriteError(w, http.StatusForbidden, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, room)
}

func (h *Handler) JoinRoomByHash(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID string `json:"identityId"`
		Hash       string `json:"hash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	room, err := h.Service.JoinRoomByHash(r.Context(), userID, identUUID, req.Hash)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, room)
}

func (h *Handler) LeaveRoom(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID     string `json:"roomId"`
		IdentityID string `json:"identityId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	roomUUID, err := uuid.Parse(req.RoomID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	err = h.Service.LeaveRoom(r.Context(), userID, roomUUID, identUUID)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "left"})
}

func (h *Handler) CreateChannel(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID string `json:"roomId"`
		Name   string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	roomUUID, err := uuid.Parse(req.RoomID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	channel, err := h.Service.CreateChannel(r.Context(), userID, roomUUID, req.Name)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, channel)
}

func (h *Handler) GetChannels(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	roomIDStr := r.URL.Query().Get("roomId")
	roomUUID, err := uuid.Parse(roomIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	channels, err := h.Service.GetChannels(r.Context(), userID, roomUUID)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, channels)
}

func (h *Handler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID   string `json:"roomId"`
		TargetID string `json:"targetId"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	roomUUID, err := uuid.Parse(req.RoomID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}
	targetUUID, err := uuid.Parse(req.TargetID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid target ID")
		return
	}

	err = h.Service.UpdateMemberRole(r.Context(), userID, roomUUID, targetUUID, req.Role)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			httpx.WriteError(w, http.StatusForbidden, err.Error())
		} else {
			httpx.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID string `json:"roomId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	roomUUID, err := uuid.Parse(req.RoomID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	err = h.Service.DeleteRoom(r.Context(), userID, roomUUID)
	if err != nil {
		httpx.WriteError(w, http.StatusForbidden, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

