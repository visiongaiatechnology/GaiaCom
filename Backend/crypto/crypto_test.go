package crypto

import (
	"bytes"
	"crypto/ed25519"
	"encoding/json"
	"testing"

	"gaiacom/backend/crypto/types"
)

const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

func TestGenerateMasterKeyFromMnemonic(t *testing.T) {
	svc := NewService()

	// Valid mnemonic
	masterKey, err := svc.GenerateMasterKeyFromMnemonic(testMnemonic)
	if err != nil {
		t.Fatalf("GenerateMasterKeyFromMnemonic failed: %v", err)
	}
	if len(masterKey) != 32 {
		t.Errorf("expected master key of length 32, got %d", len(masterKey))
	}

	// Invalid mnemonic
	_, err = svc.GenerateMasterKeyFromMnemonic("invalid mnemonic phrase structure")
	if err == nil {
		t.Error("expected error for invalid mnemonic, got nil")
	}
}

func TestDeriveKeys(t *testing.T) {
	svc := NewService()

	masterKey, err := svc.GenerateMasterKeyFromMnemonic(testMnemonic)
	if err != nil {
		t.Fatalf("GenerateMasterKeyFromMnemonic failed: %v", err)
	}

	// Correct derivation
	keys, err := svc.DeriveKeys(masterKey)
	if err != nil {
		t.Fatalf("DeriveKeys failed: %v", err)
	}

	if len(keys.MasterKey) != 32 {
		t.Errorf("expected stored MasterKey to be 32 bytes, got %d", len(keys.MasterKey))
	}
	if len(keys.Sign.Private) != ed25519.PrivateKeySize {
		t.Errorf("expected Sign private key size %d, got %d", ed25519.PrivateKeySize, len(keys.Sign.Private))
	}
	if len(keys.Sign.Public) != ed25519.PublicKeySize {
		t.Errorf("expected Sign public key size %d, got %d", ed25519.PublicKeySize, len(keys.Sign.Public))
	}
	if len(keys.Box.Private) != 32 {
		t.Errorf("expected Box private key size 32, got %d", len(keys.Box.Private))
	}
	if len(keys.Box.Public) != 32 {
		t.Errorf("expected Box public key size 32, got %d", len(keys.Box.Public))
	}
	if len(keys.PKE.Private) != PrivateKeySize {
		t.Errorf("expected PKE private key size %d, got %d", PrivateKeySize, len(keys.PKE.Private))
	}
	if len(keys.PKE.Public) != PublicKeySize {
		t.Errorf("expected PKE public key size %d, got %d", PublicKeySize, len(keys.PKE.Public))
	}

	// Determinism check
	keys2, err := svc.DeriveKeys(masterKey)
	if err != nil {
		t.Fatalf("DeriveKeys failed on second run: %v", err)
	}
	if !bytes.Equal(keys.Sign.Private, keys2.Sign.Private) {
		t.Error("derived Sign keys are not deterministic")
	}
	if !bytes.Equal(keys.Box.Private, keys2.Box.Private) {
		t.Error("derived Box keys are not deterministic")
	}
	if !bytes.Equal(keys.PKE.Private, keys2.PKE.Private) {
		t.Error("derived PKE keys are not deterministic")
	}

	// Invalid master key length
	_, err = svc.DeriveKeys([]byte{1, 2, 3})
	if err == nil {
		t.Error("expected error for invalid master key length, got nil")
	}
}

func TestSignPublicRecordAndVerify(t *testing.T) {
	svc := NewService()

	masterKey, err := svc.GenerateMasterKeyFromMnemonic(testMnemonic)
	if err != nil {
		t.Fatalf("GenerateMasterKeyFromMnemonic failed: %v", err)
	}
	keys, err := svc.DeriveKeys(masterKey)
	if err != nil {
		t.Fatalf("DeriveKeys failed: %v", err)
	}

	record := &types.PublicRecord{
		GaiaID:    "gaia:user1.test",
		Version:   1,
		Timestamp: 1600000000,
		PublicKeys: types.PublicKeys{
			Identity:    keys.Sign.Public,
			Classic:     keys.Box.Public,
			PostQuantum: keys.PKE.Public,
		},
	}

	signedJSON, err := svc.SignPublicRecord(record, keys.Sign.Private)
	if err != nil {
		t.Fatalf("SignPublicRecord failed: %v", err)
	}

	if len(signedJSON) == 0 {
		t.Error("expected signed JSON to be non-empty")
	}
	if len(record.Signature) != ed25519.SignatureSize {
		t.Errorf("expected record to contain signature of size %d, got %d", ed25519.SignatureSize, len(record.Signature))
	}

	// Verify original signature
	recordNoSig := *record
	recordNoSig.Signature = nil
	recordNoSigBytes, err := json.Marshal(&recordNoSig)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	ok, err := svc.Verify(keys.Sign.Public, recordNoSigBytes, record.Signature)
	if err != nil {
		t.Fatalf("Verify failed: %v", err)
	}
	if !ok {
		t.Error("expected Verify to return true for valid signature")
	}

	// Mismatched message verification
	ok, err = svc.Verify(keys.Sign.Public, []byte("some other message"), record.Signature)
	if err != nil {
		t.Fatalf("Verify failed: %v", err)
	}
	if ok {
		t.Error("expected Verify to return false for mismatched message")
	}

	// Verify with invalid public key size
	_, err = svc.Verify([]byte("too short"), []byte("message"), record.Signature)
	if err == nil {
		t.Error("expected error for invalid public key size, got nil")
	}
}

func TestMLKEMKyber(t *testing.T) {
	// Scheme name
	if GetSchemeName() == "" {
		t.Error("expected scheme name to be non-empty")
	}

	// Generate key pair
	kp, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair failed: %v", err)
	}
	if kp.PublicKey == nil || kp.PrivateKey == nil {
		t.Fatal("expected key pair keys to be non-nil")
	}

	pubBytes, err := kp.PublicKey.MarshalBinary()
	if err != nil {
		t.Fatalf("PublicKey.MarshalBinary failed: %v", err)
	}
	privBytes, err := kp.PrivateKey.MarshalBinary()
	if err != nil {
		t.Fatalf("PrivateKey.MarshalBinary failed: %v", err)
	}

	// Encapsulate
	ct, ss, err := Encapsulate(pubBytes)
	if err != nil {
		t.Fatalf("Encapsulate failed: %v", err)
	}
	if len(ct) != CiphertextSize {
		t.Errorf("expected ciphertext size %d, got %d", CiphertextSize, len(ct))
	}
	if len(ss) != SharedKeySize {
		t.Errorf("expected shared secret size %d, got %d", SharedKeySize, len(ss))
	}

	// Decapsulate
	ssDec, err := Decapsulate(privBytes, ct)
	if err != nil {
		t.Fatalf("Decapsulate failed: %v", err)
	}
	if !bytes.Equal(ss, ssDec) {
		t.Error("shared secrets do not match")
	}

	// Seed keygen
	seed, err := RandomBytes(KeySeedSize)
	if err != nil {
		t.Fatalf("RandomBytes failed: %v", err)
	}
	kpFromSeed, err := GenerateKeyPairFromSeed(seed)
	if err != nil {
		t.Fatalf("GenerateKeyPairFromSeed failed: %v", err)
	}

	// Verify determinism
	kpFromSeed2, err := GenerateKeyPairFromSeed(seed)
	if err != nil {
		t.Fatalf("GenerateKeyPairFromSeed failed: %v", err)
	}
	pubBytes1, _ := kpFromSeed.PublicKey.MarshalBinary()
	pubBytes2, _ := kpFromSeed2.PublicKey.MarshalBinary()
	if !bytes.Equal(pubBytes1, pubBytes2) {
		t.Error("GenerateKeyPairFromSeed is not deterministic")
	}

	// Wrong seed size
	_, err = GenerateKeyPairFromSeed([]byte{1, 2, 3})
	if err == nil {
		t.Error("expected error for invalid seed size, got nil")
	}

	// Invalid pubkey/privkey marshaled input
	_, _, err = Encapsulate([]byte{1, 2, 3})
	if err == nil {
		t.Error("expected error for Encapsulate with invalid pubkey, got nil")
	}
	_, err = Decapsulate([]byte{1, 2, 3}, ct)
	if err == nil {
		t.Error("expected error for Decapsulate with invalid privkey, got nil")
	}
}

func TestRandomBytes(t *testing.T) {
	b, err := RandomBytes(10)
	if err != nil {
		t.Fatalf("RandomBytes failed: %v", err)
	}
	if len(b) != 10 {
		t.Errorf("expected 10 bytes, got %d", len(b))
	}
}
