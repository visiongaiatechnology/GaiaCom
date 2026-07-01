// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/messaging"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
	"gaiacom/backend/smtpbridge"
)

type DraftScheduler struct {
	store      repository.Store
	msgService *messaging.MessagingService
	smtpBridge *smtpbridge.Service
}

func NewDraftScheduler(store repository.Store, msgService *messaging.MessagingService, smtpBridge *smtpbridge.Service) *DraftScheduler {
	return &DraftScheduler{
		store:      store,
		msgService: msgService,
		smtpBridge: smtpBridge,
	}
}

func (ds *DraftScheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	log.Println("DraftScheduler: Hintergrund-Dienst gestartet (Intervall: 15s)")
	for {
		select {
		case <-ctx.Done():
			log.Println("DraftScheduler: Hintergrund-Dienst beendet")
			return
		case <-ticker.C:
			ds.processDueDrafts(ctx)
		}
	}
}

func (ds *DraftScheduler) processDueDrafts(ctx context.Context) {
	now := time.Now().UTC()
	drafts, err := ds.store.FindDueMailDrafts(ctx, now)
	if err != nil {
		return
	}

	for _, draft := range drafts {
		ds.sendDraft(ctx, draft)
	}
}

func (ds *DraftScheduler) sendDraft(ctx context.Context, draft models.MailDraft) {
	isSMTP := strings.Contains(draft.RecipientGaia, "@") && !strings.HasPrefix(draft.RecipientGaia, "@")

	log.Printf("DraftScheduler: Verarbeite geplante Nachricht %s (Empfaenger: %s, SMTP: %v)", draft.ID, draft.RecipientGaia, isSMTP)

	var sendErr error
	if isSMTP {
		var attachments []smtpbridge.Attachment
		if len(draft.Attachments) > 0 {
			_ = json.Unmarshal(draft.Attachments, &attachments)
		}

		sendErr = ds.smtpBridge.SendLegacyMail(
			ctx,
			draft.UserID,
			draft.IdentityID,
			draft.RecipientGaia,
			draft.Subject,
			draft.Body,
			attachments,
		)
	} else {
		if len(draft.EnvelopeDraft) == 0 {
			log.Printf("DraftScheduler: E2E-Entwurf %s enthaelt keinen vorbereiteten Umschlag (envelope_draft), wird geloescht", draft.ID)
			_ = ds.store.DeleteMailDraft(ctx, draft.UserID, draft.ID)
			return
		}

		var envelopeData struct {
			RecipientEnvelopes []struct {
				RecipientID string                 `json:"recipientId"`
				Envelope    map[string]interface{} `json:"envelope"`
			} `json:"recipientEnvelopes"`
			SelfEnvelope map[string]interface{} `json:"selfEnvelope"`
		}

		if err := json.Unmarshal(draft.EnvelopeDraft, &envelopeData); err != nil {
			log.Printf("DraftScheduler: Fehler beim Dekodieren der E2E-Umschlaege fuer Entwurf %s: %v", draft.ID, err)
			_ = ds.store.DeleteMailDraft(ctx, draft.UserID, draft.ID)
			return
		}

		// Send to all recipients
		for _, rec := range envelopeData.RecipientEnvelopes {
			recID, err := uuid.Parse(rec.RecipientID)
			if err != nil {
				continue
			}
			recEnvBytes, err := json.Marshal(rec.Envelope)
			if err != nil {
				continue
			}
			_, sendErr = ds.msgService.SaveAndDistributeMessage(ctx, draft.UserID, draft.IdentityID, recEnvBytes, []uuid.UUID{recID})
		}

		// Also send to self (for Sent folder)
		if len(envelopeData.SelfEnvelope) > 0 {
			selfEnvBytes, err := json.Marshal(envelopeData.SelfEnvelope)
			if err == nil {
				_, _ = ds.msgService.SaveAndDistributeMessage(ctx, draft.UserID, draft.IdentityID, selfEnvBytes, []uuid.UUID{draft.IdentityID})
			}
		}
	}

	if sendErr != nil {
		log.Printf("DraftScheduler: Fehler beim Senden von Entwurf %s: %v", draft.ID, sendErr)
		// De-schedule the draft to avoid infinite retry loops
		draft.ScheduledFor = time.Time{}
		_ = ds.store.SaveMailDraft(ctx, &draft)
	} else {
		log.Printf("DraftScheduler: Entwurf %s erfolgreich versendet und geloescht", draft.ID)
		_ = ds.store.DeleteMailDraft(ctx, draft.UserID, draft.ID)
	}
}
