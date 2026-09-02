// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"errors"
	"io"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"golang.org/x/crypto/curve25519"
)

// EncryptMessage creates a Web-compatible GaiaCom hybrid envelope. Sender
// private keys remain owned by KeyBundle and are never bridge parameters.
func (i *KeyBundle) EncryptMessage(
	recipient *MessageRecipient,
	plaintext []byte,
	messageID string,
	timestampMillis int64,
	topSecret bool,
) (*MessageEnvelope, error) {
	return i.encryptMessageWithRuntime(
		recipient,
		plaintext,
		messageID,
		timestampMillis,
		topSecret,
		productionMessageCryptoRuntime(),
	)
}

func (i *KeyBundle) encryptMessageWithRuntime(
	recipient *MessageRecipient,
	plaintext []byte,
	messageID string,
	timestampMillis int64,
	topSecret bool,
	runtime messageCryptoRuntime,
) (*MessageEnvelope, error) {
	if len(plaintext) > maximumMessagePlaintext || runtime.random == nil || runtime.now == nil ||
		(messageID != "" && !validCanonicalUUID(messageID)) ||
		timestampMillis < 0 || timestampMillis > maximumTimestampMillis {
		return nil, errors.New("message encryption request was rejected")
	}

	recipientKeys, err := recipient.snapshot()
	if err != nil {
		return nil, errors.New("message encryption request was rejected")
	}
	defer recipientKeys.wipe()
	if topSecret && len(recipientKeys.mldsaPublic) != 2592 {
		return nil, errors.New("message encryption request was rejected")
	}

	senderKeys, err := i.encryptionSnapshot(topSecret)
	if err != nil {
		return nil, errors.New("message encryption request was rejected")
	}
	defer senderKeys.wipe()

	suite := standardMessageSuite
	if topSecret {
		suite = topSecretMessageSuite
	}

	var kemPublic mlkem1024.PublicKey
	if err := kemPublic.Unpack(recipientKeys.mlkemPublic); err != nil {
		return nil, errors.New("message encryption failed")
	}
	kemSeed := make([]byte, mlkem1024.EncapsulationSeedSize)
	defer wipe(kemSeed)
	if _, err := io.ReadFull(runtime.random, kemSeed); err != nil {
		return nil, errors.New("message encryption failed")
	}
	kemCiphertext := make([]byte, mlkem1024.CiphertextSize)
	defer wipe(kemCiphertext)
	kemSecret := make([]byte, mlkem1024.SharedKeySize)
	defer wipe(kemSecret)
	kemPublic.EncapsulateTo(kemCiphertext, kemSecret, kemSeed)

	ephemeralPrivate := make([]byte, curve25519.ScalarSize)
	defer wipe(ephemeralPrivate)
	if _, err := io.ReadFull(runtime.random, ephemeralPrivate); err != nil {
		return nil, errors.New("message encryption failed")
	}
	ephemeralPublic, err := curve25519.X25519(ephemeralPrivate, curve25519.Basepoint)
	if err != nil {
		return nil, errors.New("message encryption failed")
	}
	defer wipe(ephemeralPublic)

	symmetricKey, err := deriveSymmetricMessageKey(
		ephemeralPrivate,
		recipientKeys.x25519Public,
		ephemeralPublic,
		kemCiphertext,
		kemSecret,
		suite,
	)
	if err != nil {
		return nil, errors.New("message encryption failed")
	}
	defer wipe(symmetricKey)

	iv := make([]byte, messageIVSize)
	defer wipe(iv)
	if _, err := io.ReadFull(runtime.random, iv); err != nil {
		return nil, errors.New("message encryption failed")
	}
	if messageID == "" {
		messageID, err = generateMessageUUID(runtime.random)
		if err != nil {
			return nil, errors.New("message encryption failed")
		}
	}
	if timestampMillis == 0 {
		timestampMillis = runtime.now().UnixMilli()
	}
	if !validCanonicalUUID(messageID) || timestampMillis <= 0 || timestampMillis > maximumTimestampMillis {
		return nil, errors.New("message encryption failed")
	}

	transcript := messageTranscript{
		algorithmSuite:       suite,
		senderIdentity:       senderKeys.ed25519Public,
		recipientIdentity:    recipientKeys.identityPublic,
		recipientDevice:      recipientKeys.x25519Public,
		recipientDeviceKeyID: recipientKeys.deviceKeyID,
		ephemeralPublic:      ephemeralPublic,
		kemCiphertext:        kemCiphertext,
		messageID:            messageID,
		timestampMillis:      timestampMillis,
		iv:                   iv,
	}
	aad := buildMessageAAD(transcript)
	defer wipe(aad)
	gcm, err := newMessageGCM(symmetricKey)
	if err != nil {
		return nil, errors.New("message encryption failed")
	}
	payloadCiphertext := gcm.Seal(nil, iv, plaintext, aad)
	defer wipe(payloadCiphertext)

	transcript.payloadCiphertext = payloadCiphertext
	signaturePayload := buildMessageSignaturePayload(transcript)
	defer wipe(signaturePayload)
	edSignature, err := signEd25519(senderKeys.ed25519Seed, signaturePayload)
	if err != nil {
		return nil, errors.New("message encryption failed")
	}
	defer wipe(edSignature)

	var mlSignature []byte
	if topSecret {
		mlSignature, err = signMLDSA87(
			senderKeys.mldsaPrivate,
			signaturePayload,
			runtime.randomizedMLDSA,
		)
		if err != nil {
			return nil, errors.New("message encryption failed")
		}
		defer wipe(mlSignature)
	}

	envelope, err := NewMessageEnvelope(
		suite,
		kemCiphertext,
		ephemeralPublic,
		payloadCiphertext,
		iv,
		edSignature,
		mlSignature,
		senderKeys.mldsaPublic,
		messageID,
		timestampMillis,
		recipientKeys.deviceKeyID,
		recipientKeys.x25519Public,
	)
	if err != nil {
		return nil, errors.New("message encryption failed")
	}
	return envelope, nil
}
