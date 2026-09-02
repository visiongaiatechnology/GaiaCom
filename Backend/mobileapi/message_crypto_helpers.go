// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"
	"runtime"
	"time"

	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/hkdf"
)

type messageCryptoRuntime struct {
	random          io.Reader
	now             func() time.Time
	randomizedMLDSA bool
}

func productionMessageCryptoRuntime() messageCryptoRuntime {
	return messageCryptoRuntime{
		random:          rand.Reader,
		now:             time.Now,
		randomizedMLDSA: true,
	}
}

func deriveSymmetricMessageKey(
	x25519Private, peerX25519Public, ephemeralPublic, kemCiphertext, kemSecret []byte,
	algorithmSuite string,
) ([]byte, error) {
	x25519Secret, err := curve25519.X25519(x25519Private, peerX25519Public)
	if err != nil || len(x25519Secret) != messageX25519KeySize {
		wipe(x25519Secret)
		return nil, errors.New("hybrid secret derivation failed")
	}
	defer wipe(x25519Secret)

	ikm := combineHybridSecrets(x25519Secret, kemSecret)
	defer wipe(ikm)
	salt := make([]byte, 0, len(ephemeralPublic)+len(kemCiphertext))
	salt = append(salt, ephemeralPublic...)
	salt = append(salt, kemCiphertext...)
	defer wipe(salt)

	key := make([]byte, 32)
	reader := hkdf.New(sha256.New, ikm, salt, []byte(algorithmSuite))
	if _, err := io.ReadFull(reader, key); err != nil {
		wipe(key)
		return nil, errors.New("hybrid key derivation failed")
	}
	return key, nil
}

func newMessageGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, errors.New("message cipher initialization failed")
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil || gcm.NonceSize() != messageIVSize || gcm.Overhead() != messageGCMTagSize {
		return nil, errors.New("message cipher initialization failed")
	}
	return gcm, nil
}

func signEd25519(seed, payload []byte) ([]byte, error) {
	if len(seed) != ed25519.SeedSize {
		return nil, errors.New("message signing failed")
	}
	privateKey := ed25519.NewKeyFromSeed(seed)
	defer wipe(privateKey)
	signature := ed25519.Sign(privateKey, payload)
	if len(signature) != ed25519.SignatureSize {
		wipe(signature)
		return nil, errors.New("message signing failed")
	}
	return signature, nil
}

func signMLDSA87(privateBytes, payload []byte, randomized bool) ([]byte, error) {
	if len(privateBytes) != mldsa87.PrivateKeySize {
		return nil, errors.New("message signing failed")
	}
	var packed [mldsa87.PrivateKeySize]byte
	copy(packed[:], privateBytes)
	var privateKey mldsa87.PrivateKey
	privateKey.Unpack(&packed)
	clear(packed[:])
	signature := make([]byte, mldsa87.SignatureSize)
	err := mldsa87.SignTo(&privateKey, payload, nil, randomized, signature)
	privateKey = mldsa87.PrivateKey{}
	runtime.KeepAlive(privateKey)
	if err != nil {
		wipe(signature)
		return nil, errors.New("message signing failed")
	}
	return signature, nil
}

func generateMessageUUID(random io.Reader) (string, error) {
	var value [16]byte
	if _, err := io.ReadFull(random, value[:]); err != nil {
		clear(value[:])
		return "", errors.New("message identifier generation failed")
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	const hexTable = "0123456789abcdef"
	var encoded [36]byte
	source := 0
	for destination := 0; destination < len(encoded); destination++ {
		if destination == 8 || destination == 13 || destination == 18 || destination == 23 {
			encoded[destination] = '-'
			continue
		}
		byteIndex := source / 2
		if source%2 == 0 {
			encoded[destination] = hexTable[value[byteIndex]>>4]
		} else {
			encoded[destination] = hexTable[value[byteIndex]&0x0f]
		}
		source++
	}
	clear(value[:])
	return string(encoded[:]), nil
}
