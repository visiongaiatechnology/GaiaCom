package devices

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const pairingTTL = 10 * time.Minute

type Service struct{ Store repository.Store }

func NewService(store repository.Store) *Service { return &Service{Store: store} }

func (s *Service) Start(ctx context.Context, userID, identityID uuid.UUID, label, boxPublic, kemPublic, signPublic string) (*models.DevicePairing, string, error) {
	if userID == uuid.Nil || identityID == uuid.Nil || !validHex(boxPublic, 64) || !validHex(kemPublic, 3136) || !validHex(signPublic, ed25519.PublicKeySize*2) {
		return nil, "", errors.New("invalid device pairing request")
	}
	owned, err := s.Store.IdentityBelongsToUser(identityID, userID)
	if err != nil || !owned {
		return nil, "", errors.New("identity ownership rejected")
	}
	label = strings.TrimSpace(label)
	if label == "" || len([]rune(label)) > 80 {
		return nil, "", errors.New("invalid device label")
	}
	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		return nil, "", errors.New("pairing entropy failure")
	}
	secret := hex.EncodeToString(secretBytes)
	hash := sha256.Sum256(secretBytes)
	pairing := &models.DevicePairing{ID: uuid.New(), UserID: userID, IdentityID: identityID, SecretHash: hex.EncodeToString(hash[:]), DeviceLabel: label, DeviceBoxPublic: strings.ToLower(boxPublic), DeviceKemPublic: strings.ToLower(kemPublic), DeviceSignPublic: strings.ToLower(signPublic), Status: "pending", ExpiresAt: time.Now().UTC().Add(pairingTTL)}
	if err := s.Store.CreateDevicePairing(ctx, pairing); err != nil {
		return nil, "", err
	}
	return pairing, secret, nil
}

func (s *Service) Get(ctx context.Context, userID, pairingID uuid.UUID, secret string) (*models.DevicePairing, error) {
	pairing, err := s.Store.FindDevicePairing(ctx, pairingID)
	if err != nil || pairing.UserID != userID || !pairingSecretMatches(pairing, secret) || time.Now().UTC().After(pairing.ExpiresAt) || pairing.Status == "consumed" {
		return nil, errors.New("pairing unavailable")
	}
	return pairing, nil
}

func (s *Service) Approve(ctx context.Context, userID, pairingID uuid.UUID, secret, encryptedPayload, signature, approverDeviceKeyID, deviceSignature string) error {
	pairing, err := s.Get(ctx, userID, pairingID, secret)
	if err != nil || pairing.Status != "pending" {
		return errors.New("pairing approval rejected")
	}
	if len(encryptedPayload) < 32 || len(encryptedPayload) > 65536 || !validHex(signature, ed25519.SignatureSize*2) {
		return errors.New("invalid pairing approval")
	}
	identity, err := s.Store.FindIdentityByID(pairing.IdentityID)
	if err != nil || identity.UserID != userID {
		return errors.New("identity ownership rejected")
	}
	var record struct {
		PublicKeys map[string]string `json:"public_keys"`
	}
	if json.Unmarshal(identity.PublicRecord, &record) != nil || !validHex(record.PublicKeys["identity"], ed25519.PublicKeySize*2) {
		return errors.New("identity key unavailable")
	}
	publicKey, _ := hex.DecodeString(record.PublicKeys["identity"])
	signatureBytes, _ := hex.DecodeString(signature)
	if !ed25519.Verify(ed25519.PublicKey(publicKey), []byte(pairingApprovalPayload(pairing, encryptedPayload)), signatureBytes) {
		return errors.New("pairing signature rejected")
	}
	activeKeys, err := s.Store.FindActiveDeviceKeysForIdentity(ctx, pairing.IdentityID)
	if err != nil {
		return errors.New("pairing device attestation unavailable")
	}
	if len(activeKeys) > 0 {
		approverID, err := uuid.Parse(approverDeviceKeyID)
		if err != nil || approverID == uuid.Nil || !validHex(deviceSignature, ed25519.SignatureSize*2) {
			return errors.New("pairing device approval required")
		}
		approver, err := s.Store.FindActiveDeviceKey(ctx, pairing.IdentityID, approverID)
		if err != nil || !validHex(approver.SignPublic, ed25519.PublicKeySize*2) {
			return errors.New("pairing approver rejected")
		}
		approverPublic, _ := hex.DecodeString(approver.SignPublic)
		deviceSignatureBytes, _ := hex.DecodeString(deviceSignature)
		deviceProof := "gaiacom-device-pairing-approval-v1\n" + pairingApprovalPayload(pairing, encryptedPayload)
		if !ed25519.Verify(ed25519.PublicKey(approverPublic), []byte(deviceProof), deviceSignatureBytes) {
			return errors.New("pairing device approval rejected")
		}
	}
	return s.Store.ApproveDevicePairing(ctx, pairingID, encryptedPayload, strings.ToLower(signature), time.Now().UTC())
}

func (s *Service) Consume(ctx context.Context, userID, pairingID, sessionID uuid.UUID, secret string) (*models.DeviceKey, error) {
	pairing, err := s.Get(ctx, userID, pairingID, secret)
	if err != nil || pairing.Status != "approved" {
		return nil, errors.New("pairing consume rejected")
	}
	return s.Store.ConsumeDevicePairing(ctx, pairingID, sessionID, time.Now().UTC())
}

func (s *Service) ListKeys(ctx context.Context, userID uuid.UUID) ([]models.DeviceKey, error) {
	if userID == uuid.Nil {
		return nil, errors.New("device key access rejected")
	}
	return s.Store.FindDeviceKeysForUser(ctx, userID)
}

func (s *Service) RecipientKeys(ctx context.Context, identityID uuid.UUID) ([]models.DeviceKey, error) {
	if identityID == uuid.Nil {
		return nil, errors.New("recipient device keys rejected")
	}
	if _, err := s.Store.FindIdentityByID(identityID); err != nil {
		return nil, errors.New("recipient device keys rejected")
	}
	return s.Store.FindActiveDeviceKeysForIdentity(ctx, identityID)
}

func (s *Service) RevokeKey(ctx context.Context, userID, keyID uuid.UUID) error {
	if userID == uuid.Nil || keyID == uuid.Nil {
		return errors.New("device key revocation rejected")
	}
	return s.Store.RevokeDeviceKey(ctx, userID, keyID, time.Now().UTC())
}

func ApprovalPayload(pairing *models.DevicePairing, encryptedPayload string) string {
	return pairingApprovalPayload(pairing, encryptedPayload)
}
func pairingApprovalPayload(pairing *models.DevicePairing, encryptedPayload string) string {
	boxHash := sha256.Sum256([]byte(pairing.DeviceBoxPublic))
	kemHash := sha256.Sum256([]byte(pairing.DeviceKemPublic))
	payloadHash := sha256.Sum256([]byte(encryptedPayload))
	signHash := sha256.Sum256([]byte(pairing.DeviceSignPublic))
	return strings.Join([]string{"gaiacom-device-pairing-v1", pairing.ID.String(), pairing.SecretHash, hex.EncodeToString(boxHash[:]), hex.EncodeToString(kemHash[:]), hex.EncodeToString(signHash[:]), hex.EncodeToString(payloadHash[:]), pairing.ExpiresAt.UTC().Format(time.RFC3339Nano)}, "\n")
}
func pairingSecretMatches(pairing *models.DevicePairing, secret string) bool {
	raw, err := hex.DecodeString(strings.TrimSpace(secret))
	if err != nil || len(raw) != 32 {
		return false
	}
	hash := sha256.Sum256(raw)
	expected, err := hex.DecodeString(pairing.SecretHash)
	return err == nil && subtle.ConstantTimeCompare(hash[:], expected) == 1
}
func validHex(value string, length int) bool {
	if len(value) != length {
		return false
	}
	_, err := hex.DecodeString(value)
	return err == nil
}
