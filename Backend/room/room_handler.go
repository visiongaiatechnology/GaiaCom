// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package room

import (
	"encoding/json"
	"log"
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

func writeRoomRejection(w http.ResponseWriter, status int, operation string, err error) {
	log.Printf("room %s rejected: %v", operation, err)
	httpx.WriteError(w, status, "Room request rejected")
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
		writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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

	room, err := h.Service.UpdateRoom(r.Context(), userID, roomUUID, req.Name, req.Description, req.Avatar, req.IsPrivate, req.ReadOnly, req.SlowModeSeconds, req.TopSecret)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
			writeRoomRejection(w, http.StatusForbidden, "operation", err)
		} else {
			writeRoomRejection(w, http.StatusBadRequest, "operation", err)
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
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) SearchPublicRooms(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	rooms, err := h.Service.SearchPublicRooms(r.Context(), query)
	if err != nil {
		writeRoomRejection(w, http.StatusBadRequest, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, rooms)
}

func (h *Handler) KickMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID   string `json:"roomId"`
		TargetID string `json:"targetId"`
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

	err = h.Service.KickMember(r.Context(), userID, roomUUID, targetUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "kicked"})
}

func (h *Handler) TransferOwnership(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID   string `json:"roomId"`
		TargetID string `json:"targetId"`
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

	err = h.Service.TransferOwnership(r.Context(), userID, roomUUID, targetUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "transferred"})
}

func (h *Handler) GetRoomPinnedMessages(w http.ResponseWriter, r *http.Request) {
	roomIDStr := r.URL.Query().Get("roomId")
	channelIDStr := r.URL.Query().Get("channelId")

	roomUUID, err := uuid.Parse(roomIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	channelUUID, err := uuid.Parse(channelIDStr)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel ID")
		return
	}

	pins, err := h.Service.GetRoomPinnedMessages(r.Context(), roomUUID, channelUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusBadRequest, "operation", err)
		return
	}

	pinStrs := make([]string, len(pins))
	for i, pin := range pins {
		pinStrs[i] = pin.String()
	}

	httpx.WriteJSON(w, http.StatusOK, pinStrs)
}

func (h *Handler) ToggleRoomMessagePin(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID     string `json:"roomId"`
		ChannelID  string `json:"channelId"`
		MessageID  string `json:"messageId"`
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

	channelUUID, err := uuid.Parse(req.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel ID")
		return
	}

	messageUUID, err := uuid.Parse(req.MessageID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	identityUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	pinned, err := h.Service.ToggleRoomMessagePin(r.Context(), userID, roomUUID, channelUUID, messageUUID, identityUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"pinned": pinned})
}

func (h *Handler) CreateRoomInviteLink(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID              string `json:"roomId"`
		IdentityID          string `json:"identityId"`
		ExpiresAfterSeconds int    `json:"expiresAfterSeconds"`
		MaxUses             int    `json:"maxUses"`
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

	identityUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	invite, err := h.Service.CreateRoomInviteLink(r.Context(), userID, roomUUID, identityUUID, req.ExpiresAfterSeconds, req.MaxUses)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, invite)
}

func (h *Handler) JoinRoomViaInviteLink(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID string `json:"identityId"`
		Token      string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identityUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	room, err := h.Service.JoinRoomViaInviteLink(r.Context(), userID, identityUUID, req.Token)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, room)
}

func (h *Handler) CreateRoomJoinRequest(w http.ResponseWriter, r *http.Request) {
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

	identityUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	joinReq, err := h.Service.CreateRoomJoinRequest(r.Context(), userID, identityUUID, roomUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, joinReq)
}

func (h *Handler) GetRoomJoinRequests(w http.ResponseWriter, r *http.Request) {
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

	reqs, err := h.Service.GetRoomJoinRequests(r.Context(), userID, roomUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, reqs)
}

func (h *Handler) ModerateRoomJoinRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		RoomID    string `json:"roomId"`
		RequestID string `json:"requestId"`
		Status    string `json:"status"`
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

	reqUUID, err := uuid.Parse(req.RequestID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request ID")
		return
	}

	err = h.Service.ModerateRoomJoinRequest(r.Context(), userID, roomUUID, reqUUID, req.Status)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func (h *Handler) GetRoomModerationLogs(w http.ResponseWriter, r *http.Request) {
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

	logs, err := h.Service.GetRoomModerationLogs(r.Context(), userID, roomUUID)
	if err != nil {
		writeRoomRejection(w, http.StatusForbidden, "operation", err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, logs)
}
