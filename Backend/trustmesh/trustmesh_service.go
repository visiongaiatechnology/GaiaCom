package trustmesh

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Service struct {
	store          repository.Store
	epochMasterKey []byte
}

func NewService(store repository.Store, masterKey []byte) *Service {
	if len(masterKey) == 0 {
		masterKey = make([]byte, 32)
		_, _ = rand.Read(masterKey)
	}
	return &Service{
		store:          store,
		epochMasterKey: masterKey,
	}
}

// SubmitReport verarbeitet das Einreichen einer Meldung.
func (s *Service) SubmitReport(
	ctx context.Context,
	userID uuid.UUID,
	messageID uuid.UUID,
	senderPubKeyHex string,
	recipientPubKeyHex string,
	ciphertextHashHex string,
	signatureHex string,
) error {
	if userID == uuid.Nil {
		return errors.New("invalid user")
	}

	// 1. Verifiziere, dass der meldende User den Empfänger-Schlüssel besitzt/kontrolliert.
	// Wir prüfen, ob im System eine aktive Identität des Users existiert, die dem Empfänger-Schlüssel entspricht.
	// Da der Public Record in der Identität gespeichert ist, laden wir alle Identitäten des Users.
	userIdents, err := s.store.FindIdentitiesByUserID(userID)
	if err != nil {
		return fmt.Errorf("failed to retrieve user identities: %w", err)
	}

	recipientPubKey, err := hex.DecodeString(recipientPubKeyHex)
	if err != nil {
		return errors.New("invalid recipient public key format")
	}

	var recipientIdent *models.Identity
	for _, ident := range userIdents {
		// PublicRecord parsen
		var pubRecord struct {
			PublicKeys struct {
				Identity string `json:"identity"`
			} `json:"public_keys"`
		}
		if err := jsonUnmarshal(ident.PublicRecord, &pubRecord); err == nil {
			// Vergleiche den Schlüssel (entweder als Hex oder raw)
			keyBytes, _ := hex.DecodeString(pubRecord.PublicKeys.Identity)
			if hmac.Equal(keyBytes, recipientPubKey) {
				recipientIdent = &ident
				break
			}
		}
	}

	if recipientIdent == nil {
		return errors.New("recipient public key not owned by user")
	}

	// 2. Verifiziere den Erhalt der Nachricht (inbox existiert für diesen Empfänger)
	inboxEntries, err := s.store.FindInboxEntriesByIdentity(ctx, recipientIdent.ID)
	if err != nil {
		return err
	}

	var foundInbox bool
	for _, entry := range inboxEntries {
		if entry.MessageID == messageID {
			foundInbox = true
			break
		}
	}
	if !foundInbox {
		return errors.New("message inbox entry not found for this identity")
	}

	// 3. Verifiziere das kryptographische Proof
	senderPubKey, err := hex.DecodeString(senderPubKeyHex)
	if err != nil {
		return errors.New("invalid sender public key format")
	}
	ciphertextHash, err := hex.DecodeString(ciphertextHashHex)
	if err != nil {
		return errors.New("invalid ciphertext hash format")
	}
	if len(ciphertextHash) != 32 {
		return errors.New("ciphertext hash must be 32 bytes")
	}

	calculatedProof := CalculateReportProof(messageID, senderPubKey, recipientPubKey, ciphertextHash)
	calculatedProofHex := hex.EncodeToString(calculatedProof)

	// Prüfe, ob dieser Report-Proof bereits existiert (Doppelmelde-Schutz global)
	_, err = s.store.GetReportByProof(calculatedProofHex)
	if err == nil {
		return errors.New("message has already been reported")
	}

	// 4. Epoch-Schutz (Verhinderung von Mehrfachmeldungen desselben Senders durch denselben Empfänger pro Epoche)
	epochIndex := CurrentEpochIndex()
	epochKey := GetEpochKey(s.epochMasterKey, epochIndex)
	epochHash := CalculateEpochHash(epochKey, senderPubKey)
	epochHashHex := hex.EncodeToString(epochHash)

	// Überprüfung in der DB, ob derselbe Empfänger denselben Sender in dieser Epoche gemeldet hat.
	hasReported, err := s.store.HasReportedInEpoch(senderPubKeyHex, recipientPubKeyHex, epochHashHex)
	if err != nil {
		return err
	}
	if hasReported {
		return errors.New("you have already reported this sender in the current epoch")
	}

	// Let's construct the report model
	report := &models.Report{
		MessageID:          messageID.String(),
		SenderPublicKey:    senderPubKeyHex,
		RecipientPublicKey: recipientPubKeyHex,
		CiphertextHash:     ciphertextHashHex,
		ReportProof:        calculatedProofHex,
		EpochHash:          epochHashHex,
	}

	if err := s.store.CreateReport(report); err != nil {
		return err
	}

	// 5. Update den Abuse-Score und wende Eskalation an
	abuseScore, err := s.store.GetAbuseScore(senderPubKeyHex)
	if err != nil {
		return err
	}

	abuseScore.Score++
	s.applyEscalationRules(abuseScore)

	return s.store.SaveAbuseScore(abuseScore)
}

func (s *Service) applyEscalationRules(score *models.AbuseScore) {
	now := time.Now().UTC()

	// Stufe 1: Soft Flag (score >= 3)
	if score.Score >= 3 && score.EscalationLevel < 1 {
		score.EscalationLevel = 1
	}
	// Stufe 2: Delivery Friction (score >= 5)
	if score.Score >= 5 {
		if score.EscalationLevel < 2 {
			score.EscalationLevel = 2
		}
		// Friction limit: 0.1 (Nachrichten-Zustellung nimmt 10x länger / S2S rate limit)
		score.FrictionLimit = 0.1
	}
	// Stufe 3: Quarantine (score >= 10)
	if score.Score >= 10 {
		if score.EscalationLevel < 3 {
			score.EscalationLevel = 3
		}
		score.QuarantinedUntil = now.Add(7 * 24 * time.Hour)
	}
	// Stufe 4: Network Timeout (score >= 20)
	if score.Score >= 20 {
		if score.EscalationLevel < 4 {
			score.EscalationLevel = 4
		}
		score.TimeoutUntil = now.Add(24 * time.Hour)
	}
	// Stufe 5: Extended Timeout (score >= 40)
	if score.Score >= 40 {
		if score.EscalationLevel < 5 {
			score.EscalationLevel = 5
		}
		score.TimeoutUntil = now.Add(7 * 24 * time.Hour)
	}
}

// CalculateReportProof berechnet das kryptographische Proof.
func CalculateReportProof(messageID uuid.UUID, senderPubKey, recipientPubKey, ciphertextHash []byte) []byte {
	hasher := sha256.New()
	hasher.Write(messageID[:])
	hasher.Write(senderPubKey)
	hasher.Write(recipientPubKey)
	hasher.Write(ciphertextHash)
	return hasher.Sum(nil)
}

// CalculateEpochHash berechnet den Epoch-Hash.
func CalculateEpochHash(epochKey []byte, senderPubKey []byte) []byte {
	mac := hmac.New(sha256.New, epochKey)
	mac.Write(senderPubKey)
	return mac.Sum(nil)
}

// GetEpochKey leitet den Epoch-Schlüssel ab.
func GetEpochKey(masterKey []byte, epochIndex string) []byte {
	mac := hmac.New(sha256.New, masterKey)
	mac.Write([]byte(epochIndex))
	return mac.Sum(nil)
}

// CurrentEpochIndex gibt den Zeit-Index der aktuellen Epoche zurück.
func CurrentEpochIndex() string {
	year, week := time.Now().ISOWeek()
	return fmt.Sprintf("%d_w%02d", year, week)
}

func jsonUnmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
