// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package publicchannels

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

type Handler struct {
	Service *Service
}

type channelInput struct {
	IdentityID      string       `json:"identityId"`
	ChannelID       string       `json:"channelId"`
	Name            string       `json:"name"`
	Description     string       `json:"description"`
	Avatar          models.JSONB `json:"avatar"`
	CommentsEnabled bool         `json:"commentsEnabled"`
	Category        string       `json:"category"`
}

type postInput struct {
	IdentityID   string       `json:"identityId"`
	ChannelID    string       `json:"channelId"`
	PostID       string       `json:"postId"`
	Body         string       `json:"body"`
	Emoji        string       `json:"emoji"`
	Pinned       bool         `json:"pinned"`
	Formatting   models.JSONB `json:"formatting"`
	Attachments  models.JSONB `json:"attachments"`
	ScheduledFor string       `json:"scheduledFor"`
}

type blockInput struct {
	IdentityID string `json:"identityId"`
	ChannelID  string `json:"channelId"`
}

type commentModerationInput struct {
	CommentID string `json:"commentId"`
	Status    string `json:"status"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

func writePublicChannelRejection(w http.ResponseWriter, status int, operation string, err error) {
	log.Printf("publicchannels %s rejected: %v", operation, err)
	httpx.WriteError(w, status, "Public channel request rejected")
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	channels, err := h.Service.List(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Channels unavailable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"channels": channels})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	channel, err := h.Service.Create(r.Context(), userID, identityID, input.Name, input.Description, input.Category, input.Avatar)
	if err != nil {
		writePublicChannelRejection(w, http.StatusBadRequest, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, channel)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel request")
		return
	}
	channelID, err := uuid.Parse(input.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	channel, err := h.Service.Update(r.Context(), userID, channelID, input.Name, input.Description, input.Category, input.Avatar)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, channel)
}

func (h *Handler) UpdateComments(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel request")
		return
	}
	channelID, err := uuid.Parse(input.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	channel, err := h.Service.UpdateCommentsEnabled(r.Context(), userID, channelID, input.CommentsEnabled)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, channel)
}

func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid subscription request")
		return
	}
	identityID, channelID, ok := parseIdentityAndChannel(input.IdentityID, input.ChannelID, w)
	if !ok {
		return
	}
	channel, err := h.Service.Subscribe(r.Context(), userID, identityID, channelID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, channel)
}

func (h *Handler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid subscription request")
		return
	}
	identityID, channelID, ok := parseIdentityAndChannel(input.IdentityID, input.ChannelID, w)
	if !ok {
		return
	}
	channel, err := h.Service.Unsubscribe(r.Context(), userID, identityID, channelID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, channel)
}

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input postInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid post request")
		return
	}
	identityID, channelID, ok := parseIdentityAndChannel(input.IdentityID, input.ChannelID, w)
	if !ok {
		return
	}
	post, err := h.Service.CreatePost(r.Context(), userID, channelID, identityID, input.Body, input.Formatting, input.Attachments, input.ScheduledFor)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, post)
}

func (h *Handler) ListPosts(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	channelID, err := uuid.Parse(r.URL.Query().Get("channelId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	identityID := uuid.Nil
	if value := r.URL.Query().Get("identityId"); value != "" {
		identityID, err = uuid.Parse(value)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
			return
		}
	}
	posts, err := h.Service.ListPosts(r.Context(), userID, identityID, channelID, limit)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Posts unavailable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"posts": posts})
}

func (h *Handler) TogglePostReaction(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input postInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid reaction request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	postID, err := uuid.Parse(input.PostID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid post")
		return
	}
	state, err := h.Service.TogglePostReaction(r.Context(), userID, identityID, postID, input.Emoji)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, state)
}

func (h *Handler) CreatePostComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input postInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid comment request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	postID, err := uuid.Parse(input.PostID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid post")
		return
	}
	comment, err := h.Service.CreatePostComment(r.Context(), userID, identityID, postID, input.Body)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, comment)
}

func (h *Handler) UpdatePostPin(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input postInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid pin request")
		return
	}
	postID, err := uuid.Parse(input.PostID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid post")
		return
	}
	post, err := h.Service.UpdatePostPin(r.Context(), userID, postID, input.Pinned)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, post)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input channelInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel request")
		return
	}
	channelID, err := uuid.Parse(input.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	err = h.Service.Delete(r.Context(), userID, channelID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "deleted"})
}

func parseIdentityAndChannel(identityValue string, channelValue string, w http.ResponseWriter) (uuid.UUID, uuid.UUID, bool) {
	identityID, err := uuid.Parse(identityValue)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return uuid.Nil, uuid.Nil, false
	}
	channelID, err := uuid.Parse(channelValue)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return uuid.Nil, uuid.Nil, false
	}
	return identityID, channelID, true
}

func (h *Handler) Block(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input blockInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid block request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	channelID, err := uuid.Parse(input.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	err = h.Service.Block(r.Context(), userID, identityID, channelID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "blocked"})
}

func (h *Handler) Unblock(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input blockInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid unblock request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	channelID, err := uuid.Parse(input.ChannelID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid channel")
		return
	}
	err = h.Service.Unblock(r.Context(), userID, identityID, channelID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "unblocked"})
}

func (h *Handler) Discover(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	query := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")
	identityIDVal := r.URL.Query().Get("identityId")
	if identityIDVal == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Identity is required")
		return
	}
	identityID, err := uuid.Parse(identityIDVal)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity")
		return
	}
	channels, err := h.Service.Discover(r.Context(), userID, identityID, query, category)
	if err != nil {
		writePublicChannelRejection(w, http.StatusBadRequest, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"channels": channels})
}

func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input commentModerationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid moderation request")
		return
	}
	commentID, err := uuid.Parse(input.CommentID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid comment")
		return
	}
	err = h.Service.DeleteComment(r.Context(), userID, commentID)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "deleted"})
}

func (h *Handler) ModerateComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input commentModerationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid moderation request")
		return
	}
	commentID, err := uuid.Parse(input.CommentID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid comment")
		return
	}
	err = h.Service.ModerateComment(r.Context(), userID, commentID, input.Status)
	if err != nil {
		writePublicChannelRejection(w, http.StatusForbidden, "operation", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "moderated"})
}
