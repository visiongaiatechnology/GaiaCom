// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"gaiacom/backend/models"
	"gaiacom/backend/repository"

	"gaiacom/backend/core/uuid"
)

type MessagingService struct {
	Messages   repository.MessageStore
	Identities repository.IdentityStore
}

var allowedReactionEmojis = map[string]struct{}{
	"\U0001F600":       {},
	"\U0001F604":       {},
	"\U0001F602":       {},
	"\U0001F60A":       {},
	"\U0001F60D":       {},
	"\U0001F60E":       {},
	"\U0001F91D":       {},
	"\U0001F64F":       {},
	"\U0001F44D":       {},
	"\U0001F525":       {},
	"\u2728":           {},
	"\U0001F680":       {},
	"\U0001F512":       {},
	"\U0001F6E1\uFE0F": {},
	"\u26A1":           {},
	"\u2705":           {},
	"\u2757":           {},
	"\u2764\uFE0F":     {},
}

func NewMessagingService(messages repository.MessageStore, identities repository.IdentityStore) *MessagingService {
	return &MessagingService{
		Messages:   messages,
		Identities: identities,
	}
}

func (s *MessagingService) SaveAndDistributeMessage(ctx context.Context, userID uuid.UUID, senderID uuid.UUID, envelopeData []byte, recipientIDs []uuid.UUID) (uuid.UUID, error) {
	if userID == uuid.Nil || senderID == uuid.Nil {
		return uuid.Nil, errors.New("invalid message sender")
	}
	if len(envelopeData) == 0 || len(envelopeData) > 1024*1024 {
		return uuid.Nil, errors.New("invalid envelope size")
	}
	if len(recipientIDs) == 0 || len(recipientIDs) > 256 {
		return uuid.Nil, errors.New("invalid recipient set")
	}

	ownsSender, err := s.Identities.IdentityBelongsToUser(senderID, userID)
	if err != nil {
		return uuid.Nil, err
	}
	if !ownsSender {
		return uuid.Nil, errors.New("sender identity not authorized")
	}

	var meta struct {
		RecipientGaia       string `json:"recipient_gaia"`
		ReadReceiptSourceID string `json:"read_receipt_source_id"`
		RoomID              string `json:"room_id"`
		ChannelID           string `json:"channel_id"`
		AlgorithmSuite      string `json:"algorithm_suite"`
		SignatureBundle     struct {
			MLDSA87       string `json:"ml_dsa_87"`
			MLDSA87Public string `json:"ml_dsa_87_public"`
		} `json:"signature_bundle"`
	}
	_ = json.Unmarshal(envelopeData, &meta)

	var roomsStore repository.RoomStore
	if r, ok := s.Messages.(repository.RoomStore); ok {
		roomsStore = r
	} else if r, ok := s.Identities.(repository.RoomStore); ok {
		roomsStore = r
	}

	if meta.RoomID != "" && roomsStore != nil {
		roomUUID, err := uuid.Parse(meta.RoomID)
		if err == nil {
			room, err := roomsStore.FindRoomByID(ctx, roomUUID)
			if err == nil && room != nil {
				var senderMember *models.RoomMember
				for i := range room.Members {
					if room.Members[i].IdentityID == senderID {
						senderMember = &room.Members[i]
						break
					}
				}
				if senderMember == nil {
					return uuid.Nil, errors.New("sender is not a member of the room")
				}

				if room.ReadOnly && senderMember.Role != "admin" && senderMember.Role != "owner" {
					return uuid.Nil, errors.New("room is read-only for members")
				}
				if room.TopSecret {
					if meta.AlgorithmSuite != "GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87" {
						return uuid.Nil, errors.New("top secret room requires top secret algorithm suite")
					}
					if meta.SignatureBundle.MLDSA87 == "" || meta.SignatureBundle.MLDSA87Public == "" {
						return uuid.Nil, errors.New("top secret room requires ML-DSA-87 signature bundle")
					}
				}

				if room.SlowModeSeconds > 0 && senderMember.Role != "admin" && senderMember.Role != "owner" && meta.ChannelID != "" {
					lastMsgTime, err := roomsStore.GetLastMessageTimestamp(ctx, senderID, meta.ChannelID)
					if err == nil && !lastMsgTime.IsZero() {
						if time.Now().UTC().Before(lastMsgTime.Add(time.Duration(room.SlowModeSeconds) * time.Second)) {
							return uuid.Nil, errors.New("slow mode: rate limit exceeded")
						}
					}
				}
			}
		}
	}

	// Timeout checks (reject messaging if sender is timed out)
	idents, err := s.Identities.FindIdentitiesByUserID(userID)
	if err == nil {
		var senderPubKeyHex string
		for _, ident := range idents {
			if ident.ID == senderID {
				var pubRecord struct {
					PublicKeys struct {
						Identity string `json:"identity"`
					} `json:"public_keys"`
				}
				if err := json.Unmarshal(ident.PublicRecord, &pubRecord); err == nil {
					senderPubKeyHex = pubRecord.PublicKeys.Identity
				}
				break
			}
		}
		if senderPubKeyHex != "" {
			if trustStore, ok := s.Identities.(repository.TrustMeshStore); ok {
				score, err := trustStore.GetAbuseScore(senderPubKeyHex)
				if err == nil && score != nil {
					if !score.TimeoutUntil.IsZero() && score.TimeoutUntil.After(time.Now().UTC()) {
						return uuid.Nil, errors.New("sender is timed out due to abuse policies")
					}
				}
			}
		}
	}

	senderIdent, err := s.Identities.FindIdentityByID(senderID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("sender identity not found: %w", err)
	}

	senderSep := strings.LastIndex(senderIdent.GaiaID, ":")
	if senderSep == -1 {
		return uuid.Nil, errors.New("invalid sender gaiaId")
	}
	localServerName := senderIdent.GaiaID[senderSep+1:]

	recipients := uniqueUUIDs(recipientIDs)
	var firstRecipientGaia string
	var activeRecipients []uuid.UUID

	for _, recipientID := range recipients {
		if recipientID == uuid.Nil {
			return uuid.Nil, errors.New("invalid recipient")
		}

		recipIdent, err := s.Identities.FindIdentityByID(recipientID)
		if err != nil {
			return uuid.Nil, fmt.Errorf("recipient identity %s not found: %w", recipientID, err)
		}

		// Block check: check if the recipient has blocked the sender
		blocked := false
		if b, err := s.Identities.IsContactBlocked(ctx, recipIdent.UserID, senderIdent.GaiaID); err == nil && b {
			blocked = true
		}

		if blocked {
			log.Printf("Message distribution blocked: recipient %s has blocked sender %s", recipIdent.GaiaID, senderIdent.GaiaID)
			continue
		}

		activeRecipients = append(activeRecipients, recipientID)

		if firstRecipientGaia == "" {
			firstRecipientGaia = recipIdent.GaiaID
		}

		recipSep := strings.LastIndex(recipIdent.GaiaID, ":")
		if recipSep == -1 {
			return uuid.Nil, fmt.Errorf("invalid recipient gaiaId %s", recipIdent.GaiaID)
		}
		recipDomain := recipIdent.GaiaID[recipSep+1:]

		if recipDomain != localServerName {
			fedStore, ok := s.Identities.(repository.FederationStore)
			if !ok {
				return uuid.Nil, errors.New("store does not implement FederationStore")
			}

			pdu := models.PDU{
				PDUID:          uuid.New().String(),
				Type:           "gaia.encrypted.v1",
				Sender:         senderIdent.GaiaID,
				Destination:    recipIdent.GaiaID,
				Payload:        string(envelopeData),
				AlgorithmSuite: meta.AlgorithmSuite,
				CreatedAt:      time.Now().UTC().Unix(),
			}

			pduBytes, err := json.Marshal(pdu)
			if err != nil {
				return uuid.Nil, fmt.Errorf("failed to serialize PDU: %w", err)
			}

			err = fedStore.AddFederationQueueItem(&models.FederationQueue{
				PDUID:      pdu.PDUID,
				PDUPayload: models.JSONB(pduBytes),
				TargetURL:  recipDomain,
				Status:     models.QueueStatusPending,
				NextRetry:  time.Now().UTC(),
			})
			if err != nil {
				return uuid.Nil, fmt.Errorf("failed to queue federation task: %w", err)
			}
		}
	}

	recipientGaia := firstRecipientGaia
	readReceiptSourceID := uuid.Nil
	if meta.RecipientGaia != "" {
		recipientGaia = meta.RecipientGaia
	}
	if strings.TrimSpace(meta.ReadReceiptSourceID) != "" {
		if parsed, err := uuid.Parse(meta.ReadReceiptSourceID); err == nil {
			readReceiptSourceID = parsed
		}
	}

	envelope := &models.MessageEnvelope{
		ID:                  uuid.New(),
		Type:                "gaia.encrypted.v1",
		Sender:              senderIdent.GaiaID,
		Recipient:           recipientGaia,
		Payload:             models.JSONB(envelopeData),
		SenderIdentityID:    senderID,
		ChannelID:           meta.ChannelID,
		ReadReceiptSourceID: readReceiptSourceID,
		CreatedAt:           time.Now().UTC(),
	}

	if err := s.Messages.SaveMessageEnvelopeWithInbox(ctx, envelope, activeRecipients); err != nil {
		return uuid.Nil, err
	}
	return envelope.ID, nil
}

func (s *MessagingService) GetInboxForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID) ([]*models.MessageEnvelope, error) {
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("identity not authorized")
	}

	inboxEntries, err := s.Messages.FindInboxEntriesByIdentity(ctx, identityID)
	if err != nil {
		return nil, err
	}
	if len(inboxEntries) == 0 {
		return []*models.MessageEnvelope{}, nil
	}

	envelopeIDs := make([]uuid.UUID, 0, len(inboxEntries))
	for _, entry := range inboxEntries {
		envelopeIDs = append(envelopeIDs, entry.MessageID)
	}

	envelopes, err := s.Messages.FindMessageEnvelopesByIDs(ctx, envelopeIDs)
	if err != nil {
		return nil, err
	}

	// Map inbox state from entries to envelopes.
	untrustedMap := make(map[uuid.UUID]bool, len(inboxEntries))
	readMap := make(map[uuid.UUID]bool, len(inboxEntries))
	deliveredMap := make(map[uuid.UUID]bool, len(inboxEntries))
	for _, entry := range inboxEntries {
		untrustedMap[entry.MessageID] = entry.Untrusted
		readMap[entry.MessageID] = entry.IsRead
		deliveredMap[entry.MessageID] = entry.Delivered
	}
	for _, env := range envelopes {
		env.Untrusted = untrustedMap[env.ID]
		env.IsRead = readMap[env.ID]
		env.Delivered = deliveredMap[env.ID]
	}

	reactionStates, err := s.Messages.FindMessageReactionsForUser(ctx, userID, identityID, envelopeIDs)
	if err != nil {
		return nil, err
	}
	for _, env := range envelopes {
		state := reactionStates[env.ID]
		if state.Reactions != nil {
			env.Reactions = state.Reactions
		}
		if state.ReactedByMe != nil {
			env.ReactedByMe = state.ReactedByMe
		}
	}

	return envelopes, nil
}

func (s *MessagingService) ToggleMessageReactionForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, emoji string) (*models.MessageReactionState, error) {
	if userID == uuid.Nil || identityID == uuid.Nil || messageID == uuid.Nil {
		return nil, errors.New("invalid reaction request")
	}
	cleanEmoji := strings.TrimSpace(emoji)
	if _, ok := allowedReactionEmojis[cleanEmoji]; !ok {
		return nil, errors.New("unsupported reaction")
	}
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return nil, err
	}
	if !ownsIdentity {
		return nil, errors.New("identity not authorized")
	}
	return s.Messages.ToggleMessageReactionForUser(ctx, userID, identityID, messageID, cleanEmoji)
}

func (s *MessagingService) MarkInboxMessagesReadForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageIDs []uuid.UUID) error {
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return err
	}
	if !ownsIdentity {
		return errors.New("identity not authorized")
	}
	if len(messageIDs) > 512 {
		return errors.New("too many messages")
	}
	cleanIDs := uniqueUUIDs(messageIDs)
	return s.Messages.MarkInboxMessagesReadForUser(ctx, userID, identityID, cleanIDs)
}

func (s *MessagingService) EditDirectMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, originalMessageID uuid.UUID, peerEnvelopeData []byte, selfEnvelopeData []byte) (uuid.UUID, error) {
	if userID == uuid.Nil || identityID == uuid.Nil || originalMessageID == uuid.Nil {
		return uuid.Nil, errors.New("invalid edit request")
	}
	if len(peerEnvelopeData) == 0 || len(peerEnvelopeData) > 1024*1024 {
		return uuid.Nil, errors.New("invalid peer envelope size")
	}
	if len(selfEnvelopeData) == 0 || len(selfEnvelopeData) > 1024*1024 {
		return uuid.Nil, errors.New("invalid self envelope size")
	}
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return uuid.Nil, err
	}
	if !ownsIdentity {
		return uuid.Nil, errors.New("identity not authorized")
	}
	return s.Messages.EditDirectMessageForUser(ctx, userID, identityID, originalMessageID, peerEnvelopeData, selfEnvelopeData)
}

func (s *MessagingService) GetMessageProofForUser(ctx context.Context, userID uuid.UUID, messageID uuid.UUID) (*models.MessageProof, error) {
	if userID == uuid.Nil || messageID == uuid.Nil {
		return nil, errors.New("invalid proof request")
	}
	return s.Messages.FindMessageProofForUser(ctx, userID, messageID)
}

func (s *MessagingService) DeleteInboxMessageForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, messageID uuid.UUID, forEveryone bool) error {
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return err
	}
	if !ownsIdentity {
		return errors.New("identity not authorized")
	}
	return s.Messages.DeleteInboxMessageForUser(ctx, userID, identityID, messageID, forEveryone)
}

func (s *MessagingService) ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool, messageIDs []uuid.UUID) (int64, error) {
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return 0, err
	}
	if !ownsIdentity {
		return 0, errors.New("identity not authorized")
	}
	peerGaiaID = strings.TrimSpace(peerGaiaID)
	channelID = strings.TrimSpace(channelID)
	if peerGaiaID == "" && channelID == "" && len(messageIDs) == 0 {
		return 0, errors.New("conversation selector required")
	}
	if len(peerGaiaID) > 256 || len(channelID) > 128 {
		return 0, errors.New("conversation selector too large")
	}
	return s.Messages.ClearInboxConversationForUser(ctx, userID, identityID, peerGaiaID, channelID, forEveryone, messageIDs)
}

func uniqueUUIDs(values []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(values))
	result := make([]uuid.UUID, 0, len(values))
	for _, value := range values {
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
