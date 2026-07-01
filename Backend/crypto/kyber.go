// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package crypto

import (
	"crypto/rand"
	"fmt"
	"io"

	"github.com/cloudflare/circl/kem"
	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
)

var scheme = mlkem1024.Scheme()

const (
	KeySeedSize           = mlkem1024.KeySeedSize
	EncapsulationSeedSize = mlkem1024.EncapsulationSeedSize
	SharedKeySize         = mlkem1024.SharedKeySize
	CiphertextSize        = mlkem1024.CiphertextSize
	PublicKeySize         = mlkem1024.PublicKeySize
	PrivateKeySize        = mlkem1024.PrivateKeySize
)

type KeyPair struct {
	PublicKey  kem.PublicKey
	PrivateKey kem.PrivateKey
}

func GenerateKeyPair() (*KeyPair, error) {
	pk, sk, err := scheme.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("ML-KEM key generation failed: %w", err)
	}
	return &KeyPair{PublicKey: pk, PrivateKey: sk}, nil
}

func GenerateKeyPairFromSeed(seed []byte) (*KeyPair, error) {
	if len(seed) != KeySeedSize {
		return nil, fmt.Errorf("invalid seed length: got %d, want %d", len(seed), KeySeedSize)
	}
	pk, sk := scheme.DeriveKeyPair(seed)
	return &KeyPair{PublicKey: pk, PrivateKey: sk}, nil
}

func Encapsulate(pubKeyBytes []byte) ([]byte, []byte, error) {
	pk, err := scheme.UnmarshalBinaryPublicKey(pubKeyBytes)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid public key: %w", err)
	}

	ct, ss, err := scheme.Encapsulate(pk)
	if err != nil {
		return nil, nil, fmt.Errorf("encapsulation failed: %w", err)
	}
	return ct, ss, nil
}

func Decapsulate(privKeyBytes []byte, ciphertext []byte) ([]byte, error) {
	sk, err := scheme.UnmarshalBinaryPrivateKey(privKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	ss, err := scheme.Decapsulate(sk, ciphertext)
	if err != nil {
		return nil, fmt.Errorf("decapsulation failed: %w", err)
	}
	return ss, nil
}

func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return nil, err
	}
	return b, nil
}

func GetSchemeName() string {
	return scheme.Name()
}
