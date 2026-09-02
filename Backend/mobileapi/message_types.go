// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"errors"
	"sync"

	"gaiacom/backend/core/uuid"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

const (
	messageProtocolVersion = "v0.1"
	standardMessageSuite   = "GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM"
	topSecretMessageSuite  = "GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87"

	messageIdentityKeySize  = 32
	messageX25519KeySize    = 32
	messageIVSize           = 12
	messageEdSignatureSize  = 64
	messageGCMTagSize       = 16
	maximumMessagePlaintext = 8 * 1024 * 1024
	maximumTimestampMillis  = int64(9_007_199_254_740_991)
)

// MessageRecipient is a bounded, public-only recipient capability. Private
// identity material never crosses this bridge object.
type MessageRecipient struct {
	mu              sync.RWMutex
	identityPublic  []byte
	x25519Public    []byte
	mlkem1024Public []byte
	mldsa87Public   []byte
	deviceKeyID     string
	closed          bool
}

func NewMessageRecipient(
	identityPublic []byte,
	x25519Public []byte,
	mlkem1024Public []byte,
	mldsa87Public []byte,
	deviceKeyID string,
) (*MessageRecipient, error) {
	if len(identityPublic) != messageIdentityKeySize ||
		len(x25519Public) != messageX25519KeySize ||
		len(mlkem1024Public) != mlkem1024.PublicKeySize ||
		(len(mldsa87Public) != 0 && len(mldsa87Public) != mldsa87.PublicKeySize) ||
		!validOptionalCanonicalUUID(deviceKeyID) {
		return nil, errors.New("recipient capability was rejected")
	}
	var kemPublic mlkem1024.PublicKey
	if err := kemPublic.Unpack(mlkem1024Public); err != nil {
		return nil, errors.New("recipient capability was rejected")
	}
	return &MessageRecipient{
		identityPublic:  clone(identityPublic),
		x25519Public:    clone(x25519Public),
		mlkem1024Public: clone(mlkem1024Public),
		mldsa87Public:   clone(mldsa87Public),
		deviceKeyID:     deviceKeyID,
	}, nil
}

// MessageSender contains the independently trusted sender capabilities used
// for authentication before any KEM decapsulation is attempted.
type MessageSender struct {
	mu            sync.RWMutex
	ed25519Public []byte
	mldsa87Public []byte
	closed        bool
}

func NewMessageSender(ed25519Public, mldsa87Public []byte) (*MessageSender, error) {
	if len(ed25519Public) != messageIdentityKeySize ||
		(len(mldsa87Public) != 0 && len(mldsa87Public) != mldsa87.PublicKeySize) {
		return nil, errors.New("sender capability was rejected")
	}
	return &MessageSender{
		ed25519Public: clone(ed25519Public),
		mldsa87Public: clone(mldsa87Public),
	}, nil
}

// MessageEnvelope is a typed binary envelope. JSON encoding and decoding stay
// at the Android transport boundary and cannot influence cryptographic parsing.
type MessageEnvelope struct {
	mu                       sync.RWMutex
	algorithmSuite           string
	kemCiphertext            []byte
	ephemeralPublic          []byte
	payloadCiphertext        []byte
	iv                       []byte
	ed25519Signature         []byte
	mldsa87Signature         []byte
	senderMldsa87Public      []byte
	clientMessageID          string
	timestampMillis          int64
	recipientDeviceKeyID     string
	recipientDeviceBoxPublic []byte
	closed                   bool
}

func NewMessageEnvelope(
	algorithmSuite string,
	kemCiphertext, ephemeralPublic, payloadCiphertext, iv []byte,
	ed25519Signature, mldsa87Signature, senderMldsa87Public []byte,
	clientMessageID string,
	timestampMillis int64,
	recipientDeviceKeyID string,
	recipientDeviceBoxPublic []byte,
) (*MessageEnvelope, error) {
	if err := validateEnvelopeFields(
		algorithmSuite, kemCiphertext, ephemeralPublic, payloadCiphertext, iv,
		ed25519Signature, mldsa87Signature, senderMldsa87Public, clientMessageID,
		timestampMillis, recipientDeviceKeyID, recipientDeviceBoxPublic,
	); err != nil {
		return nil, err
	}
	return &MessageEnvelope{
		algorithmSuite:           algorithmSuite,
		kemCiphertext:            clone(kemCiphertext),
		ephemeralPublic:          clone(ephemeralPublic),
		payloadCiphertext:        clone(payloadCiphertext),
		iv:                       clone(iv),
		ed25519Signature:         clone(ed25519Signature),
		mldsa87Signature:         clone(mldsa87Signature),
		senderMldsa87Public:      clone(senderMldsa87Public),
		clientMessageID:          clientMessageID,
		timestampMillis:          timestampMillis,
		recipientDeviceKeyID:     recipientDeviceKeyID,
		recipientDeviceBoxPublic: clone(recipientDeviceBoxPublic),
	}, nil
}

func validateEnvelopeFields(
	suite string,
	kem, ephemeral, ciphertext, iv, edSignature, mlSignature, mlPublic []byte,
	messageID string,
	timestamp int64,
	deviceID string,
	recipientBox []byte,
) error {
	topSecret := suite == topSecretMessageSuite
	if suite != standardMessageSuite && !topSecret {
		return errors.New("message envelope was rejected")
	}
	if len(kem) != mlkem1024.CiphertextSize || len(ephemeral) != messageX25519KeySize ||
		len(ciphertext) < messageGCMTagSize || len(ciphertext) > maximumMessagePlaintext+messageGCMTagSize ||
		len(iv) != messageIVSize || len(edSignature) != messageEdSignatureSize ||
		len(recipientBox) != messageX25519KeySize || !validCanonicalUUID(messageID) ||
		timestamp <= 0 || timestamp > maximumTimestampMillis || !validOptionalCanonicalUUID(deviceID) {
		return errors.New("message envelope was rejected")
	}
	if topSecret {
		if len(mlSignature) != mldsa87.SignatureSize || len(mlPublic) != mldsa87.PublicKeySize {
			return errors.New("message envelope was rejected")
		}
	} else if len(mlSignature) != 0 || len(mlPublic) != 0 {
		return errors.New("message envelope was rejected")
	}
	return nil
}

func validCanonicalUUID(value string) bool {
	parsed, err := uuid.Parse(value)
	return err == nil && parsed != uuid.Nil && parsed.String() == value
}

func validOptionalCanonicalUUID(value string) bool {
	return value == "" || validCanonicalUUID(value)
}
