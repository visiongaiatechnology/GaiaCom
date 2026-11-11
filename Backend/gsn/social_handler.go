package gsn

import (
	"log"
	"net/http"
	"strconv"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
)

// resolveOwnedIdentity resolves the `identity_id` query parameter to a GaiaID and
// proves that the authenticated user owns that identity. All social inbox/network
// reads below are scoped to that owned identity only.
func (h *Handler) resolveOwnedIdentity(r *http.Request) (string, bool) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		return "", false
	}
	rawIdentityID := r.URL.Query().Get("identity_id")
	if rawIdentityID == "" {
		return "", false
	}
	identityID, err := uuid.Parse(rawIdentityID)
	if err != nil {
		return "", false
	}
	owns, err := h.Service.store.IdentityBelongsToUser(identityID, userID)
	if err != nil || !owns {
		return "", false
	}
	identity, err := h.Service.store.FindIdentityByID(identityID)
	if err != nil || identity == nil {
		return "", false
	}
	return identity.GaiaID, true
}

// GetNotifications returns the real notification inbox of the caller's identity.
func (h *Handler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	gaiaID, ok := h.resolveOwnedIdentity(r)
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}
	items, unreadCount, err := h.Service.ListNotifications(r.Context(), gaiaID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load notifications")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"items":       items,
		"unreadCount": unreadCount,
	})
}

// MarkNotificationsRead marks all real notifications of the caller's identity read.
func (h *Handler) MarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	gaiaID, ok := h.resolveOwnedIdentity(r)
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}
	if err := h.Service.MarkNotificationsRead(r.Context(), gaiaID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to update notifications")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "read", "unreadCount": 0})
}

// GetTrends returns real hashtag aggregates computed from stored posts.
func (h *Handler) GetTrends(w http.ResponseWriter, r *http.Request) {
	windowHours := gsnTrendWindowHoursDefault
	if raw := r.URL.Query().Get("window_hours"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			windowHours = parsed
		}
	}
	if windowHours < gsnTrendWindowHoursMin || windowHours > gsnTrendWindowHoursMax {
		windowHours = gsnTrendWindowHoursDefault
	}
	items, err := h.Service.Trends(r.Context(), windowHours)
	if err != nil {
		log.Printf("gsn trends failed: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to compute trends")
		return
	}
	if items == nil {
		items = []models.GsnTrend{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"windowHours": windowHours,
		"items":       items,
	})
}

// GetSuggestions returns real local identities ranked by real activity signals.
func (h *Handler) GetSuggestions(w http.ResponseWriter, r *http.Request) {
	gaiaID, ok := h.resolveOwnedIdentity(r)
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}
	limit := 5
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 20 {
			limit = parsed
		}
	}
	items, err := h.Service.Suggestions(r.Context(), gaiaID, limit)
	if err != nil {
		log.Printf("gsn suggestions failed: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load suggestions")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

// GetNetwork returns the real follower/following profiles of the caller's identity.
func (h *Handler) GetNetwork(w http.ResponseWriter, r *http.Request) {
	gaiaID, ok := h.resolveOwnedIdentity(r)
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: identity not owned")
		return
	}
	followers, following, err := h.Service.Network(r.Context(), gaiaID)
	if err != nil {
		log.Printf("gsn network failed: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load network")
		return
	}
	if followers == nil {
		followers = []models.GsnProfile{}
	}
	if following == nil {
		following = []models.GsnProfile{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"followers": followers,
		"following": following,
	})
}
