// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package messaging

import (
	"encoding/json"
	"log"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/internal/security"
)

type MessagingHandler struct {
	Service *MessagingService
}

type SendMessageInput struct {
	SenderIdentityID string                 `json:"senderIdentityId"`
	RecipientIDs     []string               `json:"recipientIds"`
	EnvelopeData     map[string]interface{} `json:"envelopeData"`
}

type EditMessageInput struct {
	SenderIdentityID string                 `json:"senderIdentityId"`
	MessageID        string                 `json:"messageId"`
	PeerEnvelopeData map[string]interface{} `json:"peerEnvelopeData"`
	SelfEnvelopeData map[string]interface{} `json:"selfEnvelopeData"`
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

	if sec := security.GetInstance(); sec != nil {
		if err := sec.CheckAPIAction(r, "use_identity", userID, senderUUID); err != nil {
			log.Printf("messaging identity use rejected for user %s identity %s: %v", userID.String(), senderUUID.String(), err)
			httpx.WriteError(w, http.StatusForbidden, "Message rejected")
			return
		}
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

	if sec := security.GetInstance(); sec != nil {
		if err := sec.CheckMessageEnvelope(r.Context(), senderUUID, envelopeBytes, r); err != nil {
			log.Printf("messaging envelope rejected for sender %s: %v", senderUUID.String(), err)
			httpx.WriteError(w, http.StatusBadRequest, "Message rejected")
			return
		}
	}

	messageID, err := h.Service.SaveAndDistributeMessage(r.Context(), userID, senderUUID, envelopeBytes, recipientUUIDs)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Message rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent", "messageId": messageID.String()})
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

func (h *MessagingHandler) EditMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input EditMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid edit request")
		return
	}

	identityID, err := uuid.Parse(input.SenderIdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}
	messageID, err := uuid.Parse(input.MessageID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	peerEnvelopeBytes, err := json.Marshal(input.PeerEnvelopeData)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid peer envelope data")
		return
	}
	selfEnvelopeBytes, err := json.Marshal(input.SelfEnvelopeData)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid self envelope data")
		return
	}

	if sec := security.GetInstance(); sec != nil {
		if err := sec.CheckMessageEnvelope(r.Context(), identityID, peerEnvelopeBytes, r); err != nil {
			log.Printf("messaging edit peer envelope rejected for identity %s message %s: %v", identityID.String(), messageID.String(), err)
			httpx.WriteError(w, http.StatusBadRequest, "Edit rejected")
			return
		}
		if err := sec.CheckMessageEnvelope(r.Context(), identityID, selfEnvelopeBytes, r); err != nil {
			log.Printf("messaging edit self envelope rejected for identity %s message %s: %v", identityID.String(), messageID.String(), err)
			httpx.WriteError(w, http.StatusBadRequest, "Edit rejected")
			return
		}
	}

	updatedMessageID, err := h.Service.EditDirectMessageForUser(r.Context(), userID, identityID, messageID, peerEnvelopeBytes, selfEnvelopeBytes)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Edit rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "edited", "messageId": updatedMessageID.String()})
}

func (h *MessagingHandler) ToggleReaction(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		IdentityID string `json:"identityId"`
		MessageID  string `json:"messageId"`
		Emoji      string `json:"emoji"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid reaction request")
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

	state, err := h.Service.ToggleMessageReactionForUser(r.Context(), userID, identityID, messageID, input.Emoji)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Reaction rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, state)
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
		IdentityID  string   `json:"identityId"`
		PeerGaiaID  string   `json:"peerGaiaId"`
		ChannelID   string   `json:"channelId"`
		ForEveryone bool     `json:"forEveryone"`
		MessageIDs  []string `json:"messageIds"`
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

	messageUUIDs := make([]uuid.UUID, 0, len(input.MessageIDs))
	for _, mID := range input.MessageIDs {
		if u, err := uuid.Parse(mID); err == nil && u != uuid.Nil {
			messageUUIDs = append(messageUUIDs, u)
		}
	}

	deleted, err := h.Service.ClearInboxConversationForUser(r.Context(), userID, identityID, input.PeerGaiaID, input.ChannelID, input.ForEveryone, messageUUIDs)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Clear rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "cleared", "deleted": deleted})
}
