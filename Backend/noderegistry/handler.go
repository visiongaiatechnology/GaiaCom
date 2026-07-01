// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package noderegistry

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/governance"
	"gaiacom/backend/httpx"
	"gaiacom/backend/repository"
)

type Handler struct {
	Service *Service
	store   repository.Store
}

func NewHandler(service *Service, store repository.Store) *Handler {
	return &Handler{Service: service, store: store}
}

func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireOperator(w, r)
	if !ok || userID == uuid.Nil {
		return
	}
	summary, err := h.Service.LocalSummary(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load node registry")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary)
}

func (h *Handler) GenerateSecrets(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireOperator(w, r); !ok {
		return
	}
	bundle, err := h.Service.GenerateSecrets()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to generate node secrets")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, bundle)
}

func (h *Handler) PingMain(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireOperator(w, r)
	if !ok {
		return
	}
	operatorGaiaID := h.primaryGaiaID(r.Context(), userID)
	entry, err := h.Service.PingMain(r.Context(), operatorGaiaID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "pinged", "entry": entry})
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireOperator(w, r); !ok {
		return
	}
	domain := httpx.Param(r, "domain")
	var input struct {
		Status    string `json:"status"`
		LastError string `json:"lastError"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := h.Service.UpdateStatus(r.Context(), domain, strings.ToLower(strings.TrimSpace(input.Status)), input.LastError); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) PublicPing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httpx.WriteError(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}
	var input PingRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	entry, err := h.Service.HandlePing(r.Context(), input)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": entry.Status, "entry": entry})
}

func (h *Handler) PublicNodes(w http.ResponseWriter, r *http.Request) {
	doc, err := h.Service.PublicNodeDocument(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load nodes")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, doc)
}

func (h *Handler) requireOperator(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, ok := httpx.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return uuid.Nil, false
	}
	if !h.hasRole(r.Context(), userID, "node_operator") {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden: node operator access only")
		return uuid.Nil, false
	}
	return userID, true
}

func (h *Handler) hasRole(ctx context.Context, userID uuid.UUID, role string) bool {
	identities, err := h.store.FindIdentitiesByUserID(userID)
	if err != nil {
		return false
	}
	for _, ident := range identities {
		for _, bootstrapID := range append([]string{governance.BootstrapGaiaID}, governance.BootstrapGaiaIDs...) {
			if bootstrapID != "" && bootstrapIdentityMatches(ident.GaiaID, bootstrapID) {
				return role == "node_operator" || role == "senior_reviewer" || role == "trusted_reviewer"
			}
		}
		creds, err := h.store.GetCredentialsBySubject(ctx, ident.GaiaID)
		if err != nil {
			continue
		}
		now := time.Now()
		for _, cred := range creds {
			if cred.Role != role && !(role == "trusted_reviewer" && cred.Role == "senior_reviewer") {
				continue
			}
			if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
				continue
			}
			rev, err := h.store.GetCredentialRevocation(ctx, cred.ID)
			if err != nil || rev != nil {
				continue
			}
			return true
		}
	}
	return false
}

func (h *Handler) primaryGaiaID(ctx context.Context, userID uuid.UUID) string {
	identities, err := h.store.FindIdentitiesByUserID(userID)
	if err != nil || len(identities) == 0 {
		return ""
	}
	return identities[0].GaiaID
}

func bootstrapIdentityMatches(identityGaiaID string, bootstrapGaiaID string) bool {
	identity := normalizeGaiaID(identityGaiaID)
	bootstrap := normalizeGaiaID(bootstrapGaiaID)
	if identity == bootstrap {
		return true
	}
	return stripDomain(identity) == stripDomain(bootstrap)
}

func normalizeGaiaID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func stripDomain(value string) string {
	value = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(value)), "@")
	if idx := strings.Index(value, ":"); idx >= 0 {
		return value[:idx]
	}
	if idx := strings.Index(value, "@"); idx >= 0 {
		return value[:idx]
	}
	return value
}
