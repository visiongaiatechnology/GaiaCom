package attestations

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"gaiacom/backend/auth"
	"gaiacom/backend/httpx"
)

const maxAttestationBodyBytes = 64 * 1024

// Handler exposes the attestation registry and operator transparency endpoints.
type Handler struct {
	Service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

func (h *Handler) decodeJSON(w http.ResponseWriter, r *http.Request, target interface{}) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxAttestationBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return false
	}
	return true
}

func (h *Handler) writeServiceError(w http.ResponseWriter, operation string, err error) {
	switch {
	case errors.Is(err, ErrForbidden):
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: node_operator role required")
	case errors.Is(err, ErrInvalidInput):
		httpx.WriteError(w, http.StatusBadRequest, "Invalid attestation request")
	case errors.Is(err, ErrSubjectNotFound):
		httpx.WriteError(w, http.StatusNotFound, "Subject identity not found on this node")
	case errors.Is(err, ErrNotFound):
		httpx.WriteError(w, http.StatusNotFound, "Attestation not found")
	case errors.Is(err, ErrDuplicate), errors.Is(err, ErrAlreadyRevoked):
		httpx.WriteError(w, http.StatusConflict, "Attestation state conflict")
	case errors.Is(err, ErrRateLimited):
		httpx.WriteError(w, http.StatusTooManyRequests, "Operator action rate limit exceeded")
	default:
		log.Printf("attestations %s failed: %v", operation, err)
		httpx.WriteError(w, http.StatusInternalServerError, "Attestation operation failed")
	}
}

func (h *Handler) operatorActor(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return "", false
	}
	actor, ok := h.Service.OperatorActor(r.Context(), userID)
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: node_operator role required")
		return "", false
	}
	return actor, true
}

func (h *Handler) requireAuthenticated(w http.ResponseWriter, r *http.Request) bool {
	if _, ok := auth.UserIDFromContext(r.Context()); !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return false
	}
	return true
}

// GetSubjectAttestations handles GET /api/v1/identities/:gaia_id/attestations.
func (h *Handler) GetSubjectAttestations(w http.ResponseWriter, r *http.Request) {
	if !h.requireAuthenticated(w, r) {
		return
	}
	gaiaID := strings.TrimSpace(httpx.Param(r, "gaia_id"))
	if gaiaID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "GaiaID is required")
		return
	}
	views, err := h.Service.ListSubjectAttestations(r.Context(), gaiaID)
	if err != nil {
		h.writeServiceError(w, "list subject attestations", err)
		return
	}
	publicViews := make([]AttestationView, len(views))
	for index := range views {
		publicViews[index] = views[index]
		publicViews[index].EvidenceRef = ""
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"subject":      strings.ToLower(gaiaID),
		"attestations": publicViews,
	})
}

// CreateAttestation handles POST /api/v1/node/attestations.
func (h *Handler) CreateAttestation(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.operatorActor(w, r)
	if !ok {
		return
	}
	var input CreateAttestationInput
	if !h.decodeJSON(w, r, &input) {
		return
	}
	attestation, err := h.Service.CreateAttestation(r.Context(), actor, input)
	if err != nil {
		h.writeServiceError(w, "create", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"attestation": h.Service.ToView(attestation),
	})
}

// RevokeAttestation handles DELETE /api/v1/node/attestations/:id.
func (h *Handler) RevokeAttestation(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.operatorActor(w, r)
	if !ok {
		return
	}
	attestationID := strings.TrimSpace(httpx.Param(r, "id"))
	if attestationID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Attestation ID is required")
		return
	}
	var input struct {
		Reason string `json:"reason"`
	}
	if !h.decodeJSON(w, r, &input) {
		return
	}
	if err := h.Service.RevokeAttestation(r.Context(), actor, attestationID, input.Reason); err != nil {
		h.writeServiceError(w, "revoke", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"revoked": true})
}

// ListIssuedAttestations handles GET /api/v1/node/attestations.
func (h *Handler) ListIssuedAttestations(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.operatorActor(w, r)
	if !ok {
		return
	}
	query := r.URL.Query()
	limit := parseOptionalLimit(query.Get("limit"))
	views, nextCursor, err := h.Service.ListIssuedAttestations(
		r.Context(), actor, query.Get("status"), limit, query.Get("cursor"))
	if err != nil {
		h.writeServiceError(w, "list issued", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"attestations": views,
		"next_cursor":  nextCursor,
	})
}

// GetOperatorStats handles GET /api/v1/node/operator/stats.
func (h *Handler) GetOperatorStats(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.operatorActor(w, r)
	if !ok {
		return
	}
	stats, err := h.Service.OperatorStats(r.Context(), actor)
	if err != nil {
		h.writeServiceError(w, "operator stats", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, stats)
}

// ListIdentityDirectory handles POST /api/v1/node/identities/directory.
func (h *Handler) ListIdentityDirectory(w http.ResponseWriter, r *http.Request) {
	actor, ok := h.operatorActor(w, r)
	if !ok {
		return
	}
	var input struct {
		Reason string `json:"reason"`
		Query  string `json:"query"`
		Limit  int    `json:"limit"`
		Cursor string `json:"cursor"`
	}
	if !h.decodeJSON(w, r, &input) {
		return
	}
	limit := input.Limit
	if limit == 0 {
		limit = parseOptionalLimit(r.URL.Query().Get("limit"))
	}
	entries, nextCursor, total, err := h.Service.Directory(
		r.Context(), actor, input.Reason, input.Query, limit, input.Cursor)
	if err != nil {
		h.writeServiceError(w, "identity directory", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"entries":     entries,
		"next_cursor": nextCursor,
		"total":       total,
	})
}

// GetAccessLog handles GET /api/v1/node/operator/access-log (any authenticated role).
func (h *Handler) GetAccessLog(w http.ResponseWriter, r *http.Request) {
	if !h.requireAuthenticated(w, r) {
		return
	}
	events, err := h.Service.AccessLog(r.Context())
	if err != nil {
		h.writeServiceError(w, "access log", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"events": events})
}

func parseOptionalLimit(value string) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	limit, err := strconv.Atoi(value)
	if err != nil || limit < 0 {
		return 0
	}
	return limit
}
