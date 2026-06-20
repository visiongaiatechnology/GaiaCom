package messaging

import (
	"encoding/json"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type MessagingHandler struct {
	Service *MessagingService
}

type SendMessageInput struct {
	SenderIdentityID string                 `json:"senderIdentityId"`
	RecipientIDs     []string               `json:"recipientIds"`
	EnvelopeData     map[string]interface{} `json:"envelopeData"`
}

func NewMessagingHandler(service *MessagingService) *MessagingHandler {
	return &MessagingHandler{Service: service}
}

func (h *MessagingHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input SendMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid message request")
		return
	}

	senderUUID, err := uuid.Parse(input.SenderIdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid sender ID")
		return
	}

	recipientUUIDs := make([]uuid.UUID, 0, len(input.RecipientIDs))
	for _, recipientID := range input.RecipientIDs {
		id, err := uuid.Parse(recipientID)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid recipient ID")
			return
		}
		recipientUUIDs = append(recipientUUIDs, id)
	}

	envelopeBytes, err := json.Marshal(input.EnvelopeData)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid envelope data")
		return
	}

	if err := h.Service.SaveAndDistributeMessage(r.Context(), userID, senderUUID, envelopeBytes, recipientUUIDs); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Message rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func (h *MessagingHandler) GetInbox(w http.ResponseWriter, r *http.Request) {
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

	messages, err := h.Service.GetInboxForUser(r.Context(), userID, identityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Inbox rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, messages)
}

func (h *MessagingHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		IdentityID string   `json:"identityId"`
		MessageIDs []string `json:"messageIds"`
		MessageID  string   `json:"messageId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid read-state request")
		return
	}

	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	rawIDs := input.MessageIDs
	if input.MessageID != "" {
		rawIDs = append(rawIDs, input.MessageID)
	}
	messageIDs := make([]uuid.UUID, 0, len(rawIDs))
	for _, rawID := range rawIDs {
		messageID, err := uuid.Parse(rawID)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid message ID")
			return
		}
		messageIDs = append(messageIDs, messageID)
	}

	if err := h.Service.MarkInboxMessagesReadForUser(r.Context(), userID, identityID, messageIDs); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Read-state rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "read"})
}

func (h *MessagingHandler) GetMessageProof(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	messageID, err := uuid.Parse(r.URL.Query().Get("messageId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	proof, err := h.Service.GetMessageProofForUser(r.Context(), userID, messageID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Proof not found")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, proof)
}

func (h *MessagingHandler) DeleteInboxMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		IdentityID  string `json:"identityId"`
		MessageID   string `json:"messageId"`
		ForEveryone bool   `json:"forEveryone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid delete request")
		return
	}

	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}
	messageID, err := uuid.Parse(input.MessageID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	if err := h.Service.DeleteInboxMessageForUser(r.Context(), userID, identityID, messageID, input.ForEveryone); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Delete rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *MessagingHandler) ClearInboxConversation(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		IdentityID  string `json:"identityId"`
		PeerGaiaID  string `json:"peerGaiaId"`
		ChannelID   string `json:"channelId"`
		ForEveryone bool   `json:"forEveryone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid clear request")
		return
	}

	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}

	deleted, err := h.Service.ClearInboxConversationForUser(r.Context(), userID, identityID, input.PeerGaiaID, input.ChannelID, input.ForEveryone)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Clear rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "cleared", "deleted": deleted})
}
