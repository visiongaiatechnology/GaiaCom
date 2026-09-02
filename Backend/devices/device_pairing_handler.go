package devices

import (
	"encoding/json"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type Handler struct{ Service *Service }

func NewHandler(service *Service) *Handler { return &Handler{Service: service} }

type startInput struct {
	IdentityID       uuid.UUID `json:"identityId"`
	DeviceLabel      string    `json:"deviceLabel"`
	DeviceBoxPublic  string    `json:"deviceBoxPublic"`
	DeviceKemPublic  string    `json:"deviceKemPublic"`
	DeviceSignPublic string    `json:"deviceSignPublic"`
}
type secretInput struct {
	Secret string `json:"secret"`
}
type approveInput struct {
	Secret              string `json:"secret"`
	EncryptedPayload    string `json:"encryptedPayload"`
	Signature           string `json:"signature"`
	ApproverDeviceKeyID string `json:"approverDeviceKeyId"`
	DeviceSignature     string `json:"deviceSignature"`
}

func (h *Handler) Start(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	var input startInput
	if json.NewDecoder(r.Body).Decode(&input) != nil {
		httpx.WriteError(w, 400, "Invalid pairing request")
		return
	}
	pairing, secret, err := h.Service.Start(r.Context(), userID, input.IdentityID, input.DeviceLabel, input.DeviceBoxPublic, input.DeviceKemPublic, input.DeviceSignPublic)
	if err != nil {
		httpx.WriteError(w, 400, "Pairing rejected")
		return
	}
	httpx.WriteJSON(w, 201, map[string]interface{}{"pairing": pairing, "secret": secret})
}
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	id, err := uuid.Parse(httpx.Param(r, "id"))
	if err != nil {
		httpx.WriteError(w, 400, "Invalid pairing id")
		return
	}
	pairing, err := h.Service.Get(r.Context(), userID, id, r.Header.Get("X-Gaia-Pairing-Secret"))
	if err != nil {
		httpx.WriteError(w, 404, "Pairing unavailable")
		return
	}
	httpx.WriteJSON(w, 200, pairing)
}
func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	id, err := uuid.Parse(httpx.Param(r, "id"))
	if err != nil {
		httpx.WriteError(w, 400, "Invalid pairing id")
		return
	}
	var input approveInput
	if json.NewDecoder(r.Body).Decode(&input) != nil {
		httpx.WriteError(w, 400, "Invalid pairing approval")
		return
	}
	if err := h.Service.Approve(r.Context(), userID, id, input.Secret, input.EncryptedPayload, input.Signature, input.ApproverDeviceKeyID, input.DeviceSignature); err != nil {
		httpx.WriteError(w, 400, "Pairing approval rejected")
		return
	}
	httpx.WriteJSON(w, 200, map[string]string{"status": "approved"})
}
func (h *Handler) Consume(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	sessionID, ok := auth.SessionIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	id, err := uuid.Parse(httpx.Param(r, "id"))
	if err != nil {
		httpx.WriteError(w, 400, "Invalid pairing id")
		return
	}
	var input secretInput
	if json.NewDecoder(r.Body).Decode(&input) != nil {
		httpx.WriteError(w, 400, "Invalid pairing consume")
		return
	}
	key, err := h.Service.Consume(r.Context(), userID, id, sessionID, input.Secret)
	if err != nil {
		httpx.WriteError(w, 400, "Pairing consume rejected")
		return
	}
	httpx.WriteJSON(w, 200, map[string]interface{}{"status": "consumed", "deviceKey": key})
}

func (h *Handler) ListKeys(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	keys, err := h.Service.ListKeys(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, 500, "Device keys unavailable")
		return
	}
	httpx.WriteJSON(w, 200, map[string]interface{}{"keys": keys})
}

func (h *Handler) RecipientKeys(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.UserIDFromContext(r.Context()); !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	id, err := uuid.Parse(r.URL.Query().Get("identityId"))
	if err != nil {
		httpx.WriteError(w, 400, "Invalid identity id")
		return
	}
	keys, err := h.Service.RecipientKeys(r.Context(), id)
	if err != nil {
		httpx.WriteError(w, 404, "Recipient keys unavailable")
		return
	}
	publicKeys := make([]map[string]interface{}, 0, len(keys))
	for _, key := range keys {
		publicKeys = append(publicKeys, map[string]interface{}{
			"id": key.ID, "identityId": key.IdentityID, "boxPublic": key.BoxPublic,
			"kemPublic": key.KemPublic, "signPublic": key.SignPublic, "status": key.Status,
		})
	}
	httpx.WriteJSON(w, 200, map[string]interface{}{"keys": publicKeys})
}

func (h *Handler) RevokeKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, 401, "Unauthorized")
		return
	}
	id, err := uuid.Parse(httpx.Param(r, "id"))
	if err != nil {
		httpx.WriteError(w, 400, "Invalid device key id")
		return
	}
	if err := h.Service.RevokeKey(r.Context(), userID, id); err != nil {
		httpx.WriteError(w, 400, "Device key revocation rejected")
		return
	}
	httpx.WriteJSON(w, 200, map[string]string{"status": "revoked"})
}
