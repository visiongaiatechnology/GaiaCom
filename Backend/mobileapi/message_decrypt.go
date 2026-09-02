// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/ed25519"
	"crypto/subtle"
	"errors"
	"runtime"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

// DecryptMessage authenticates the complete transcript before KEM
// decapsulation, then decrypts using private keys retained by KeyBundle.
func (i *KeyBundle) DecryptMessage(
	sender *MessageSender,
	envelope *MessageEnvelope,
) ([]byte, error) {
	received, err := envelope.snapshot()
	if err != nil {
		return nil, errors.New("message decryption request was rejected")
	}
	defer received.wipe()
	if err := validateEnvelopeFields(
		received.algorithmSuite,
		received.kemCiphertext,
		received.ephemeralPublic,
		received.payloadCiphertext,
		received.iv,
		received.ed25519Signature,
		received.mldsa87Signature,
		received.senderMldsa87Public,
		received.clientMessageID,
		received.timestampMillis,
		received.recipientDeviceKeyID,
		received.recipientDeviceBoxPublic,
	); err != nil {
		return nil, errors.New("message decryption request was rejected")
	}

	senderKeys, err := sender.snapshot()
	if err != nil {
		return nil, errors.New("message decryption request was rejected")
	}
	defer senderKeys.wipe()
	recipientKeys, err := i.decryptionSnapshot()
	if err != nil {
		return nil, errors.New("message decryption request was rejected")
	}
	defer recipientKeys.wipe()

	if subtle.ConstantTimeCompare(
		received.recipientDeviceBoxPublic,
		recipientKeys.x25519Public,
	) != 1 {
		return nil, errors.New("message decryption failed")
	}

	transcript := messageTranscript{
		algorithmSuite:       received.algorithmSuite,
		senderIdentity:       senderKeys.ed25519Public,
		recipientIdentity:    recipientKeys.ed25519Public,
		recipientDevice:      recipientKeys.x25519Public,
		recipientDeviceKeyID: received.recipientDeviceKeyID,
		ephemeralPublic:      received.ephemeralPublic,
		kemCiphertext:        received.kemCiphertext,
		messageID:            received.clientMessageID,
		timestampMillis:      received.timestampMillis,
		iv:                   received.iv,
		payloadCiphertext:    received.payloadCiphertext,
	}
	signaturePayload := buildMessageSignaturePayload(transcript)
	defer wipe(signaturePayload)
	if !ed25519.Verify(senderKeys.ed25519Public, signaturePayload, received.ed25519Signature) {
		return nil, errors.New("message decryption failed")
	}

	if received.algorithmSuite == topSecretMessageSuite {
		if len(senderKeys.mldsaPublic) != mldsa87.PublicKeySize ||
			subtle.ConstantTimeCompare(received.senderMldsa87Public, senderKeys.mldsaPublic) != 1 ||
			!verifyMLDSA87(received.senderMldsa87Public, signaturePayload, received.mldsa87Signature) {
			return nil, errors.New("message decryption failed")
		}
	}

	var kemPrivate mlkem1024.PrivateKey
	if err := kemPrivate.Unpack(recipientKeys.mlkemPrivate); err != nil {
		return nil, errors.New("message decryption failed")
	}
	kemSecret := make([]byte, mlkem1024.SharedKeySize)
	defer wipe(kemSecret)
	kemPrivate.DecapsulateTo(kemSecret, received.kemCiphertext)
	kemPrivate = mlkem1024.PrivateKey{}
	runtime.KeepAlive(kemPrivate)

	symmetricKey, err := deriveSymmetricMessageKey(
		recipientKeys.x25519Private,
		received.ephemeralPublic,
		received.ephemeralPublic,
		received.kemCiphertext,
		kemSecret,
		received.algorithmSuite,
	)
	if err != nil {
		return nil, errors.New("message decryption failed")
	}
	defer wipe(symmetricKey)

	aad := buildMessageAAD(transcript)
	defer wipe(aad)
	gcm, err := newMessageGCM(symmetricKey)
	if err != nil {
		return nil, errors.New("message decryption failed")
	}
	plaintext, err := gcm.Open(nil, received.iv, received.payloadCiphertext, aad)
	if err != nil || len(plaintext) > maximumMessagePlaintext {
		wipe(plaintext)
		return nil, errors.New("message decryption failed")
	}
	return plaintext, nil
}

func verifyMLDSA87(publicBytes, payload, signature []byte) bool {
	if len(publicBytes) != mldsa87.PublicKeySize || len(signature) != mldsa87.SignatureSize {
		return false
	}
	var packed [mldsa87.PublicKeySize]byte
	copy(packed[:], publicBytes)
	var publicKey mldsa87.PublicKey
	publicKey.Unpack(&packed)
	clear(packed[:])
	valid := mldsa87.Verify(&publicKey, payload, nil, signature)
	publicKey = mldsa87.PublicKey{}
	runtime.KeepAlive(publicKey)
	return valid
}
