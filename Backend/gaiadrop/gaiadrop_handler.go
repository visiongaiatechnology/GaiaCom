package gaiadrop

import (
	"encoding/json"
	"log"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/internal/security"
)

type Handler struct {
	service  *Service
	security *security.SecuritySystem
}

// NewHandler accepts an optional SecuritySystem so the public submit path can be
// budgeted (P-07/FIND-007). Variadic keeps existing call sites/tests source-compatible.
func NewHandler(service *Service, securitySystems ...*security.SecuritySystem) *Handler {
	handler := &Handler{service: service}
	if len(securitySystems) > 0 {
		handler.security = securitySystems[0]
	}
	return handler
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 96*1024)
	var input SubmitInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid GaiaDrop request")
		return
	}

	// P-07 / FIND-007: unauthenticated submit budgets (per IP, per target,
	// global). Fail closed with 429 when the limiter or its backend rejects.
	if h.security != nil {
		if err := h.security.CheckGaiaDropSubmit(r.Context(), r, input.TargetGaiaID); err != nil {
			log.Printf("gaiadrop submit throttled: %v", err)
			httpx.WriteError(w, http.StatusTooManyRequests, "GaiaDrop request temporarily throttled")
			return
		}
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
