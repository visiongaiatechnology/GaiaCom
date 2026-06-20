package crypto

import (
	"crypto/ed25519"
	"encoding/json"
	"fmt"

	"gaiacom/backend/core/bip39"
	"gaiacom/backend/crypto/types"

	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/sha3"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GenerateMasterKeyFromMnemonic(mnemonic string) ([]byte, error) {
	if !bip39.IsMnemonicValid(mnemonic) {
		return nil, fmt.Errorf("invalid mnemonic phrase")
	}
	seed := bip39.NewSeed(mnemonic, "")
	masterKey := make([]byte, 32)
	sha3.ShakeSum256(masterKey, seed)
	return masterKey, nil
}

func (s *Service) DeriveKeys(masterKey []byte) (*types.IdentityKeys, error) {
	if len(masterKey) != 32 {
		return nil, fmt.Errorf("invalid master key length: got %d, want 32", len(masterKey))
	}

	signSeed := deriveBytes("gaiacom.identity.sign.ed25519.v1", masterKey, ed25519.SeedSize)
	signPriv := ed25519.NewKeyFromSeed(signSeed)
	signPub := signPriv.Public().(ed25519.PublicKey)

	boxPriv := deriveBytes("gaiacom.identity.box.x25519.v1", masterKey, curve25519.ScalarSize)
	boxPriv[0] &= 248
	boxPriv[31] &= 127
	boxPriv[31] |= 64
	boxPub, err := curve25519.X25519(boxPriv, curve25519.Basepoint)
	if err != nil {
		return nil, fmt.Errorf("x25519 derivation failed: %w", err)
	}

	kemSeed := deriveBytes("gaiacom.identity.pq.mlkem1024.v1", masterKey, KeySeedSize)
	kemKeys, err := GenerateKeyPairFromSeed(kemSeed)
	if err != nil {
		return nil, err
	}
	pkePub, err := kemKeys.PublicKey.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ml-kem public key marshal failed: %w", err)
	}
	pkePriv, err := kemKeys.PrivateKey.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ml-kem private key marshal failed: %w", err)
	}

	return &types.IdentityKeys{
		Sign:      types.KeyPair{Public: signPub, Private: signPriv},
		Box:       types.PKEKeyPair{Public: boxPub, Private: boxPriv},
		PKE:       types.PKEKeyPair{Public: pkePub, Private: pkePriv},
		MasterKey: append([]byte(nil), masterKey...),
	}, nil
}

func (s *Service) SignPublicRecord(record *types.PublicRecord, privateKey ed25519.PrivateKey) (string, error) {
	record.Signature = nil
	recordBytes, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal record for signing: %w", err)
	}

	signature := ed25519.Sign(privateKey, recordBytes)
	record.Signature = signature

	finalBytes, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal final signed record: %w", err)
	}
	return string(finalBytes), nil
}

func (s *Service) Verify(publicKey ed25519.PublicKey, message, signature []byte) (bool, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return false, fmt.Errorf("invalid public key size")
	}
	return ed25519.Verify(publicKey, message, signature), nil
}

func deriveBytes(label string, masterKey []byte, size int) []byte {
	out := make([]byte, size)
	shake := sha3.NewShake256()
	_, _ = shake.Write([]byte(label))
	_, _ = shake.Write([]byte{0})
	_, _ = shake.Write(masterKey)
	_, _ = shake.Read(out)
	return out
}
