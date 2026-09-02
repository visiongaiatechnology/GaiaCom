// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"runtime"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
	"golang.org/x/crypto/curve25519"
)

const importedIdentityValidationDomain = "GaiaCom/mobileapi/import-identity/self-test/v1"

// ImportIdentity reconstructs a native identity from independently protected
// private-key encodings. Android must wipe its input ByteArrays after this call.
// No mnemonic or BIP-39 master key is accepted or retained by this API.
func ImportIdentity(
	ed25519Seed,
	x25519Private,
	mlkem1024Private,
	mldsa87Private []byte,
) (*KeyBundle, error) {
	if len(ed25519Seed) != ed25519.SeedSize ||
		len(x25519Private) != curve25519.ScalarSize ||
		len(mlkem1024Private) != mlkem1024.PrivateKeySize ||
		len(mldsa87Private) != mldsa87.PrivateKeySize ||
		!isCanonicalX25519Private(x25519Private) {
		return nil, errors.New("native identity import was rejected")
	}

	edSeedCopy := clone(ed25519Seed)
	defer wipe(edSeedCopy)
	xPrivateCopy := clone(x25519Private)
	defer wipe(xPrivateCopy)
	kemPrivateCopy := clone(mlkem1024Private)
	defer wipe(kemPrivateCopy)
	mlPrivateCopy := clone(mldsa87Private)
	defer wipe(mlPrivateCopy)

	edPrivate := ed25519.NewKeyFromSeed(edSeedCopy)
	edPublic := clone(edPrivate[ed25519.SeedSize:])
	wipe(edPrivate)
	defer wipe(edPublic)
	xPublic, err := curve25519.X25519(xPrivateCopy, curve25519.Basepoint)
	if err != nil || len(xPublic) != curve25519.PointSize {
		wipe(xPublic)
		return nil, errors.New("native identity import was rejected")
	}
	defer wipe(xPublic)

	kemPublic, err := validateImportedMLKEM(kemPrivateCopy)
	if err != nil {
		return nil, errors.New("native identity import was rejected")
	}
	defer wipe(kemPublic)
	mlPublic, err := validateImportedMLDSA(mlPrivateCopy)
	if err != nil {
		return nil, errors.New("native identity import was rejected")
	}
	defer wipe(mlPublic)

	return &KeyBundle{
		ed25519Public:    clone(edPublic),
		ed25519Seed:      clone(edSeedCopy),
		x25519Public:     clone(xPublic),
		x25519Private:    clone(xPrivateCopy),
		mlkem1024Public:  clone(kemPublic),
		mlkem1024Private: clone(kemPrivateCopy),
		mldsa87Public:    clone(mlPublic),
		mldsa87Private:   clone(mlPrivateCopy),
	}, nil
}

func isCanonicalX25519Private(private []byte) bool {
	return len(private) == curve25519.ScalarSize &&
		private[0]&7 == 0 && private[31]&0x80 == 0 && private[31]&0x40 == 0x40
}

func validateImportedMLKEM(privateBytes []byte) ([]byte, error) {
	var privateKey mlkem1024.PrivateKey
	if err := privateKey.Unpack(privateBytes); err != nil {
		return nil, errors.New("ML-KEM private encoding was rejected")
	}
	defer func() {
		privateKey = mlkem1024.PrivateKey{}
		runtime.KeepAlive(privateKey)
	}()

	repacked := make([]byte, mlkem1024.PrivateKeySize)
	defer wipe(repacked)
	privateKey.Pack(repacked)
	if subtle.ConstantTimeCompare(privateBytes, repacked) != 1 {
		return nil, errors.New("ML-KEM private encoding was rejected")
	}
	publicKey, ok := privateKey.Public().(*mlkem1024.PublicKey)
	if !ok || publicKey == nil {
		return nil, errors.New("ML-KEM private encoding was rejected")
	}
	publicBytes := make([]byte, mlkem1024.PublicKeySize)
	publicKey.Pack(publicBytes)
	var normalizedPublic mlkem1024.PublicKey
	if err := normalizedPublic.Unpack(publicBytes); err != nil {
		wipe(publicBytes)
		return nil, errors.New("ML-KEM private encoding was rejected")
	}

	seed := sha256.Sum256([]byte(importedIdentityValidationDomain))
	ciphertext := make([]byte, mlkem1024.CiphertextSize)
	defer wipe(ciphertext)
	expectedSecret := make([]byte, mlkem1024.SharedKeySize)
	defer wipe(expectedSecret)
	actualSecret := make([]byte, mlkem1024.SharedKeySize)
	defer wipe(actualSecret)
	publicKey.EncapsulateTo(ciphertext, expectedSecret, seed[:])
	privateKey.DecapsulateTo(actualSecret, ciphertext)
	clear(seed[:])
	if subtle.ConstantTimeCompare(expectedSecret, actualSecret) != 1 {
		wipe(publicBytes)
		return nil, errors.New("ML-KEM private encoding was rejected")
	}
	return publicBytes, nil
}

func validateImportedMLDSA(privateBytes []byte) ([]byte, error) {
	var packedPrivate [mldsa87.PrivateKeySize]byte
	copy(packedPrivate[:], privateBytes)
	var privateKey mldsa87.PrivateKey
	privateKey.Unpack(&packedPrivate)
	clear(packedPrivate[:])
	defer func() {
		privateKey = mldsa87.PrivateKey{}
		runtime.KeepAlive(privateKey)
	}()

	privateKey.Pack(&packedPrivate)
	if subtle.ConstantTimeCompare(privateBytes, packedPrivate[:]) != 1 {
		clear(packedPrivate[:])
		return nil, errors.New("ML-DSA private encoding was rejected")
	}
	clear(packedPrivate[:])
	publicKey, ok := privateKey.Public().(*mldsa87.PublicKey)
	if !ok || publicKey == nil {
		return nil, errors.New("ML-DSA private encoding was rejected")
	}
	publicBytes := publicKey.Bytes()
	var independentPublic mldsa87.PublicKey
	if err := independentPublic.UnmarshalBinary(publicBytes); err != nil ||
		!validateImportedMLDSASignatures(&privateKey, &independentPublic) {
		wipe(publicBytes)
		return nil, errors.New("ML-DSA private encoding was rejected")
	}
	return publicBytes, nil
}

func validateImportedMLDSASignatures(
	privateKey *mldsa87.PrivateKey,
	publicKey *mldsa87.PublicKey,
) bool {
	signature := make([]byte, mldsa87.SignatureSize)
	defer wipe(signature)
	for round := byte(0); round < 4; round++ {
		messageInput := append([]byte(importedIdentityValidationDomain), round)
		message := sha256.Sum256(messageInput)
		wipe(messageInput)
		if err := mldsa87.SignTo(privateKey, message[:], nil, false, signature); err != nil ||
			!mldsa87.Verify(publicKey, message[:], nil, signature) {
			clear(message[:])
			return false
		}
		clear(message[:])
		wipe(signature)
	}
	return true
}
