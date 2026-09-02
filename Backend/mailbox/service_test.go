// STATUS: DIAMANT VGT SUPREME
package mailbox

import (
	"context"
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type mailboxIsolationStore struct {
	repository.Store
	belongs      bool
	messageReads int
	stateWrites  int
}

func (s *mailboxIsolationStore) IdentityBelongsToUser(uuid.UUID, uuid.UUID) (bool, error) {
	return s.belongs, nil
}

func (s *mailboxIsolationStore) FindMailboxMessages(context.Context, uuid.UUID, uuid.UUID, repository.MailboxQuery) ([]*models.MessageEnvelope, error) {
	s.messageReads++
	return nil, nil
}

func (s *mailboxIsolationStore) UpsertMailboxStates(context.Context, uuid.UUID, uuid.UUID, []models.MailboxState) error {
	s.stateWrites++
	return nil
}

func TestMailboxRejectsForeignIdentityBeforePersistence(t *testing.T) {
	store := &mailboxIsolationStore{belongs: false}
	service := NewService(store)
	userID, identityID := uuid.New(), uuid.New()

	if _, err := service.Messages(context.Background(), userID, identityID, repository.MailboxQuery{}); err == nil {
		t.Fatal("foreign identity mailbox read was accepted")
	}
	state := models.MailboxState{MessageID: uuid.New(), Folder: "inbox"}
	if err := service.UpdateStates(context.Background(), userID, identityID, []models.MailboxState{state}); err == nil {
		t.Fatal("foreign identity mailbox state write was accepted")
	}
	if store.messageReads != 0 || store.stateWrites != 0 {
		t.Fatalf("persistence reached for foreign identity: reads=%d writes=%d", store.messageReads, store.stateWrites)
	}
}
