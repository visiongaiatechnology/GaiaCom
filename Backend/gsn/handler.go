// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package gsn

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

type Handler struct {
	Service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

type PostWithStats struct {
	models.GsnPost
	Reactions    map[string]int  `json:"reactions"`
	ReactedByMe  map[string]bool `json:"reactedByMe"`
	CommentCount int             `json:"commentCount"`
}

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID      string `json:"identityId"`
		Body            string `json:"body"`
		ImageAttachment string `json:"imageAttachment"`
		Signature       string `json:"signature"`
		RepostOfPostID  string `json:"repostOfPostId"`
		Timestamp       string `json:"timestamp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned by user")
		return
	}

	post, err := h.Service.CreatePost(r.Context(), userID, identUUID, req.Body, req.ImageAttachment, req.Signature, req.RepostOfPostID, req.Timestamp, r)
	if err != nil {
		log.Printf("gsn create post rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GSN post rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, post)
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	postID := httpx.Param(r, "id")
	if postID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	err := h.Service.DeletePost(r.Context(), userID, postID)
	if err != nil {
		log.Printf("gsn delete post rejected: %v", err)
		httpx.WriteError(w, http.StatusForbidden, "GSN delete rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) GetFeedNode(w http.ResponseWriter, r *http.Request) {
	// Optional auth to customize ReactedByMe, but let's resolve if available
	var currentGaiaID string
	userID, ok := auth.UserIDFromContext(r.Context())
	if ok {
		idents, err := h.Service.store.FindIdentitiesByUserID(userID)
		if err == nil && len(idents) > 0 {
			currentGaiaID = idents[0].GaiaID // default to primary active
		}
	}

	nodeID := r.URL.Query().Get("node_id")
	if nodeID == "" {
		nodeID = h.Service.fedService.GetServerName()
	}

	posts, err := h.Service.ListPostsByNode(r.Context(), nodeID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load feed")
		return
	}

	var results []PostWithStats
	for _, post := range posts {
		reactions, reactedByMe, err := h.Service.store.GetGsnReactions(r.Context(), post.ID, currentGaiaID)
		if err != nil {
			reactions = make(map[string]int)
			reactedByMe = make(map[string]bool)
		}

		comments, err := h.Service.ListComments(r.Context(), post.ID)
		commentCount := len(comments)

		results = append(results, PostWithStats{
			GsnPost:      post,
			Reactions:    reactions,
			ReactedByMe:  reactedByMe,
			CommentCount: commentCount,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, results)
}

func (h *Handler) GetFeedFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idents, err := h.Service.store.FindIdentitiesByUserID(userID)
	if err != nil || len(idents) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "No local identity found")
		return
	}

	currentGaiaID := idents[0].GaiaID

	posts, err := h.Service.ListPostsByFollowed(r.Context(), currentGaiaID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load following feed")
		return
	}

	var results []PostWithStats
	for _, post := range posts {
		reactions, reactedByMe, err := h.Service.store.GetGsnReactions(r.Context(), post.ID, currentGaiaID)
		if err != nil {
			reactions = make(map[string]int)
			reactedByMe = make(map[string]bool)
		}

		comments, err := h.Service.ListComments(r.Context(), post.ID)
		commentCount := len(comments)

		results = append(results, PostWithStats{
			GsnPost:      post,
			Reactions:    reactions,
			ReactedByMe:  reactedByMe,
			CommentCount: commentCount,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, results)
}

func (h *Handler) ReactToPost(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	postID := httpx.Param(r, "id")
	if postID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	var req struct {
		IdentityID string `json:"identityId"`
		Emoji      string `json:"emoji"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}

	ident, err := h.Service.store.FindIdentityByID(identUUID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Identity not found")
		return
	}

	emoji := strings.TrimSpace(req.Emoji)
	// Validate allowed emojis: 👍, ❤️, 🔥, 👀
	if emoji != "👍" && emoji != "❤️" && emoji != "🔥" && emoji != "👀" {
		httpx.WriteError(w, http.StatusBadRequest, "Reaction emoji not allowed")
		return
	}

	_, err = h.Service.ReactToPost(r.Context(), userID, identUUID, postID, emoji, r)
	if err != nil {
		log.Printf("gsn reaction rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GSN reaction rejected")
		return
	}

	// Fetch updated reactions and reactedByMe state
	reactions, reactedByMe, err := h.Service.store.GetGsnReactions(r.Context(), postID, ident.GaiaID)
	if err != nil {
		reactions = make(map[string]int)
		reactedByMe = make(map[string]bool)
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"reactions":   reactions,
		"reactedByMe": reactedByMe,
	})
}

func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	postID := httpx.Param(r, "id")
	if postID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	var req struct {
		IdentityID string `json:"identityId"`
		Body       string `json:"body"`
		Signature  string `json:"signature"`
		Timestamp  string `json:"timestamp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}

	comment, err := h.Service.CreateComment(r.Context(), userID, identUUID, postID, req.Body, req.Signature, req.Timestamp, r)
	if err != nil {
		log.Printf("gsn comment rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GSN comment rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, comment)
}

func (h *Handler) GetComments(w http.ResponseWriter, r *http.Request) {
	postID := httpx.Param(r, "id")
	if postID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	comments, err := h.Service.ListComments(r.Context(), postID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load comments")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, comments)
}

func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	commentID := httpx.Param(r, "commentId")
	if commentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Comment ID is required")
		return
	}

	err := h.Service.DeleteComment(r.Context(), userID, commentID)
	if err != nil {
		log.Printf("gsn delete comment rejected: %v", err)
		httpx.WriteError(w, http.StatusForbidden, "GSN comment delete rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) FollowUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID      string `json:"identityId"`
		FollowingGaiaID string `json:"followingGaiaId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}

	err = h.Service.FollowUser(r.Context(), userID, identUUID, req.FollowingGaiaID, r)
	if err != nil {
		log.Printf("gsn follow rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GSN follow rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "followed"})
}

func (h *Handler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID      string `json:"identityId"`
		FollowingGaiaID string `json:"followingGaiaId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}

	err = h.Service.UnfollowUser(r.Context(), identUUID, req.FollowingGaiaID)
	if err != nil {
		log.Printf("gsn unfollow rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "GSN unfollow rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "unfollowed"})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	gaiaID := httpx.Param(r, "gaia_id")
	if gaiaID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "GaiaID is required")
		return
	}

	profile, err := h.Service.store.GetGsnProfile(r.Context(), gaiaID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Profile not found")
		return
	}

	// Optional check: is current user following this profile?
	isFollowing := false
	userID, ok := auth.UserIDFromContext(r.Context())
	if ok {
		idents, err := h.Service.store.FindIdentitiesByUserID(userID)
		if err == nil && len(idents) > 0 {
			following, err := h.Service.store.IsFollowingGsnUser(r.Context(), idents[0].GaiaID, gaiaID)
			if err == nil {
				isFollowing = following
			}
		}
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"profile":     profile,
		"isFollowing": isFollowing,
	})
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		IdentityID  string `json:"identityId"`
		RealName    string `json:"realName"`
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
		Avatar      string `json:"avatar"`
		Website     string `json:"website"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	identUUID, err := uuid.Parse(req.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identityId")
		return
	}

	owns, err := h.Service.store.IdentityBelongsToUser(identUUID, userID)
	if err != nil || !owns {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}

	profile, err := h.Service.UpdateProfile(r.Context(), userID, identUUID, req.RealName, req.DisplayName, req.Description, req.Avatar, req.Website)
	if err != nil {
		if errors.Is(err, ErrInvalidProfile) {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid profile data")
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, profile)
}
