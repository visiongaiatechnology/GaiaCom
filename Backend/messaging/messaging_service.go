package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

func NewMessagingService(messages repository.MessageStore, identities repository.IdentityStore) *MessagingService {
	return &MessagingService{
		Messages:   messages,
		Identities: identities,
	}
}

func (s *MessagingService) SaveAndDistributeMessage(ctx context.Context, userID uuid.UUID, senderID uuid.UUID, envelopeData []byte, recipientIDs []uuid.UUID) error {
	if userID == uuid.Nil || senderID == uuid.Nil {
		return errors.New("invalid message sender")
	}
	if len(envelopeData) == 0 || len(envelopeData) > 1024*1024 {
		return errors.New("invalid envelope size")
	}
	if len(recipientIDs) == 0 || len(recipientIDs) > 256 {
		return errors.New("invalid recipient set")
	}

	ownsSender, err := s.Identities.IdentityBelongsToUser(senderID, userID)
	if err != nil {
		return err
	}
	if !ownsSender {
		return errors.New("sender identity not authorized")
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
						return errors.New("sender is timed out due to abuse policies")
					}
				}
			}
		}
	}

	senderIdent, err := s.Identities.FindIdentityByID(senderID)
	if err != nil {
		return fmt.Errorf("sender identity not found: %w", err)
	}

	senderSep := strings.LastIndex(senderIdent.GaiaID, ":")
	if senderSep == -1 {
		return errors.New("invalid sender gaiaId")
	}
	localServerName := senderIdent.GaiaID[senderSep+1:]

	recipients := uniqueUUIDs(recipientIDs)
	var firstRecipientGaia string

	for _, recipientID := range recipients {
		if recipientID == uuid.Nil {
			return errors.New("invalid recipient")
		}

		recipIdent, err := s.Identities.FindIdentityByID(recipientID)
		if err != nil {
			return fmt.Errorf("recipient identity %s not found: %w", recipientID, err)
		}

		if firstRecipientGaia == "" {
			firstRecipientGaia = recipIdent.GaiaID
		}

		recipSep := strings.LastIndex(recipIdent.GaiaID, ":")
		if recipSep == -1 {
			return fmt.Errorf("invalid recipient gaiaId %s", recipIdent.GaiaID)
		}
		recipDomain := recipIdent.GaiaID[recipSep+1:]

		if recipDomain != localServerName {
			fedStore, ok := s.Identities.(repository.FederationStore)
			if !ok {
				return errors.New("store does not implement FederationStore")
			}

			pdu := models.PDU{
				PDUID:       uuid.New().String(),
				Type:        "gaia.encrypted.v1",
				Sender:      senderIdent.GaiaID,
				Destination: recipIdent.GaiaID,
				Payload:     string(envelopeData),
				CreatedAt:   time.Now().UTC().Unix(),
			}

			pduBytes, err := json.Marshal(pdu)
			if err != nil {
				return fmt.Errorf("failed to serialize PDU: %w", err)
			}

			err = fedStore.AddFederationQueueItem(&models.FederationQueue{
				PDUID:      pdu.PDUID,
				PDUPayload: models.JSONB(pduBytes),
				TargetURL:  recipDomain,
				Status:     models.QueueStatusPending,
				NextRetry:  time.Now().UTC(),
			})
			if err != nil {
				return fmt.Errorf("failed to queue federation task: %w", err)
			}
		}
	}

	envelope := &models.MessageEnvelope{
		ID:               uuid.New(),
		Type:             "gaia.encrypted.v1",
		Sender:           senderIdent.GaiaID,
		Recipient:        firstRecipientGaia,
		Payload:          models.JSONB(envelopeData),
		SenderIdentityID: senderID,
		CreatedAt:        time.Now().UTC(),
	}

	return s.Messages.SaveMessageEnvelopeWithInbox(ctx, envelope, recipients)
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
	for _, entry := range inboxEntries {
		untrustedMap[entry.MessageID] = entry.Untrusted
		readMap[entry.MessageID] = entry.IsRead
	}
	for _, env := range envelopes {
		env.Untrusted = untrustedMap[env.ID]
		env.IsRead = readMap[env.ID]
	}

	return envelopes, nil
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

func (s *MessagingService) ClearInboxConversationForUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, peerGaiaID string, channelID string, forEveryone bool) (int64, error) {
	ownsIdentity, err := s.Identities.IdentityBelongsToUser(identityID, userID)
	if err != nil {
		return 0, err
	}
	if !ownsIdentity {
		return 0, errors.New("identity not authorized")
	}
	peerGaiaID = strings.TrimSpace(peerGaiaID)
	channelID = strings.TrimSpace(channelID)
	if peerGaiaID == "" && channelID == "" {
		return 0, errors.New("conversation selector required")
	}
	if len(peerGaiaID) > 256 || len(channelID) > 128 {
		return 0, errors.New("conversation selector too large")
	}
	return s.Messages.ClearInboxConversationForUser(ctx, userID, identityID, peerGaiaID, channelID, forEveryone)
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
