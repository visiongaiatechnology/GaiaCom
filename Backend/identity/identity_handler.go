// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package identity

import (
	"encoding/json"
	"log"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type IdentityHandler struct {
	Service *Service
}

func NewIdentityHandler(service *Service) *IdentityHandler {
	return &IdentityHandler{Service: service}
}

func neutralTrustPassport(gaiaID string) map[string]interface{} {
	return map[string]interface{}{
		"gaiaId":           gaiaID,
		"gaiaID":           gaiaID,
		"fingerprint":      "",
		"trustAgeDays":     0,
		"keyHistory":       []interface{}{},
		"verifiedContacts": 0,
		"abuseScore": map[string]interface{}{
			"score":           0,
			"escalationLevel": 0,
		},
		"nodeReputation": "unresolved",
		"found":          false,
	}
}

func neutralPublicIdentity(gaiaID string) map[string]interface{} {
	return map[string]interface{}{
		"id":            "",
		"gaiaId":        gaiaID,
		"gaiaID":        gaiaID,
		"displayName":   "",
		"publicRecord":  nil,
		"trustPassport": neutralTrustPassport(gaiaID),
		"found":         false,
	}
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
		log.Printf("identity create rejected for user %s: %v", userID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "Identity creation rejected")
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

func (h *IdentityHandler) SaveHumanProof(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		IdentityID string             `json:"identityId"`
		Proof      HumanProofEnvelope `json:"proof"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid human proof request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil || identityID == uuid.Nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid human proof request")
		return
	}

	updated, err := h.Service.SaveHumanProof(r.Context(), userID, identityID, input.Proof)
	if err != nil {
		log.Printf("human proof rejected for user %s identity %s: %v", userID.String(), identityID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "Human proof rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":        "ok",
		"trustPassport": h.Service.BuildTrustPassport(updated),
	})
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
			httpx.WriteJSON(w, http.StatusOK, neutralPublicIdentity(gaiaID))
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
			httpx.WriteJSON(w, http.StatusOK, neutralTrustPassport(gaiaID))
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
