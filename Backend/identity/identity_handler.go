package identity

import (
	"encoding/json"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/httpx"
)

type IdentityHandler struct {
	Service *Service
}

func NewIdentityHandler(service *Service) *IdentityHandler {
	return &IdentityHandler{Service: service}
}

func (h *IdentityHandler) CreateIdentity(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input CreateIdentityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity request")
		return
	}

	identity, err := h.Service.CreateIdentity(userID, input)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, identity)
}

func (h *IdentityHandler) GetMyIdentities(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	identities, err := h.Service.GetIdentitiesForUser(userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Failed to load identities")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, identities)
}

func (h *IdentityHandler) GetPublicIdentity(w http.ResponseWriter, r *http.Request) {
	gaiaID := httpx.Param(r, "gaiaID")
	if gaiaID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "gaiaID is required")
		return
	}

	identity, err := h.Service.GetIdentityByGaiaID(gaiaID)
	if err != nil {
		resolved, errRemote := h.Service.ResolveRemoteIdentity(gaiaID)
		if errRemote != nil {
			httpx.WriteError(w, http.StatusNotFound, "Identity not found")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, resolved)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"id":            identity.ID.String(),
		"gaiaId":        identity.GaiaID,
		"gaiaID":        identity.GaiaID,
		"displayName":   identity.DisplayName,
		"publicRecord":  string(identity.PublicRecord),
		"trustPassport": h.Service.BuildTrustPassport(identity),
	})
}

func (h *IdentityHandler) GetTrustPassport(w http.ResponseWriter, r *http.Request) {
	gaiaID := httpx.Param(r, "gaiaID")
	if gaiaID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "gaiaID is required")
		return
	}

	identity, err := h.Service.GetIdentityByGaiaID(gaiaID)
	if err != nil {
		resolved, errRemote := h.Service.ResolveRemoteIdentity(gaiaID)
		if errRemote != nil {
			httpx.WriteError(w, http.StatusNotFound, "Trust passport not found")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"gaiaId":           resolved["gaiaID"],
			"fingerprint":      "",
			"trustAgeDays":     0,
			"keyHistory":       []interface{}{},
			"verifiedContacts": 0,
			"abuseScore": map[string]interface{}{
				"score":           0,
				"escalationLevel": 0,
			},
			"nodeReputation": "remote-resolved",
		})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, h.Service.BuildTrustPassport(identity))
}
