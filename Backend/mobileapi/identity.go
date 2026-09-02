// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/ed25519"
	"errors"
	"sync"
	"unicode/utf8"

	"gaiacom/backend/core/bip39"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/sha3"
	"golang.org/x/text/unicode/norm"
)

const (
	maximumMnemonicInputBytes     = 1024
	maximumCanonicalMnemonicBytes = 256
)

const (
	ed25519Label = "gaiacom.identity.sign.ed25519.v1"
	x25519Label  = "gaiacom.identity.box.x25519.v1"
	mlkemLabel   = "gaiacom.identity.pq.mlkem1024.v1"
	mldsaLabel   = "gaiacom.identity.sign.ml-dsa-87.v1"
)

// KeyBundle owns locally derived identity material. It never retains or
// exposes the mnemonic or master key. Every getter returns a defensive copy.
type KeyBundle struct {
	mu               sync.RWMutex
	ed25519Public    []byte
	ed25519Seed      []byte
	x25519Public     []byte
	x25519Private    []byte
	mlkem1024Public  []byte
	mlkem1024Private []byte
	mldsa87Public    []byte
	mldsa87Private   []byte
	closed           bool
}

// ValidateMnemonic validates a canonical English BIP-39 mnemonic locally.
// The input is copied at the bridge boundary and the temporary copy is wiped.
func ValidateMnemonic(mnemonicUTF8 []byte) bool {
	mnemonic, valid := normalizedCanonicalMnemonic(mnemonicUTF8)
	if !valid {
		return false
	}
	defer wipe(mnemonic)
	return true
}

// DeriveIdentity reproduces Frontend/frontend/src/crypto.js byte-for-byte for
// Ed25519, X25519, ML-KEM-1024 and ML-DSA-87. The byte slice bridge avoids an
// immutable Java/Go string result; callers should wipe their input ByteArray.
func DeriveIdentity(mnemonicUTF8 []byte) (*KeyBundle, error) {
	mnemonic, valid := normalizedCanonicalMnemonic(mnemonicUTF8)
	if !valid {
		return nil, errors.New("mobile mnemonic was rejected")
	}
	defer wipe(mnemonic)

	seed := bip39.NewSeedFromCanonicalBytes(mnemonic, nil)
	defer wipe(seed)
	masterKey := make([]byte, 32)
	sha3.ShakeSum256(masterKey, seed)
	defer wipe(masterKey)

	identity, err := deriveIdentityFromMasterKey(masterKey)
	if err != nil {
		return nil, errors.New("mobile identity derivation failed")
	}
	return identity, nil
}

func normalizedCanonicalMnemonic(input []byte) ([]byte, bool) {
	if len(input) == 0 || len(input) > maximumMnemonicInputBytes || !utf8.Valid(input) {
		return nil, false
	}
	normalized := norm.NFKD.Append(make([]byte, 0, len(input)), input...)
	if len(normalized) == 0 || len(normalized) > maximumCanonicalMnemonicBytes ||
		!bip39.IsCanonicalMnemonicBytesValid(normalized) {
		wipe(normalized)
		return nil, false
	}
	return normalized, true
}

func deriveIdentityFromMasterKey(masterKey []byte) (*KeyBundle, error) {
	identity := &KeyBundle{}
	fail := func() (*KeyBundle, error) {
		identity.Close()
		return nil, errors.New("identity derivation failed")
	}

	signSeed := deriveIdentityBytes(ed25519Label, masterKey, ed25519.SeedSize)
	defer wipe(signSeed)
	edPrivate := ed25519.NewKeyFromSeed(signSeed)
	identity.ed25519Seed = clone(signSeed)
	identity.ed25519Public = clone(edPrivate[ed25519.SeedSize:])
	wipe(edPrivate)

	boxPrivate := deriveIdentityBytes(x25519Label, masterKey, curve25519.ScalarSize)
	defer wipe(boxPrivate)
	boxPrivate[0] &= 248
	boxPrivate[31] &= 127
	boxPrivate[31] |= 64
	boxPublic, err := curve25519.X25519(boxPrivate, curve25519.Basepoint)
	if err != nil {
		return fail()
	}
	identity.x25519Private = clone(boxPrivate)
	identity.x25519Public = clone(boxPublic)
	wipe(boxPublic)

	kemSeed := deriveIdentityBytes(mlkemLabel, masterKey, mlkem1024.KeySeedSize)
	defer wipe(kemSeed)
	kemPublic, kemPrivate := mlkem1024.NewKeyFromSeed(kemSeed)
	identity.mlkem1024Public = make([]byte, mlkem1024.PublicKeySize)
	identity.mlkem1024Private = make([]byte, mlkem1024.PrivateKeySize)
	kemPublic.Pack(identity.mlkem1024Public)
	kemPrivate.Pack(identity.mlkem1024Private)
	*kemPrivate = mlkem1024.PrivateKey{}

	mldsaSeedBytes := deriveIdentityBytes(mldsaLabel, masterKey, mldsa87.SeedSize)
	defer wipe(mldsaSeedBytes)
	var mldsaSeed [mldsa87.SeedSize]byte
	copy(mldsaSeed[:], mldsaSeedBytes)
	mldsaPublic, mldsaPrivate := mldsa87.NewKeyFromSeed(&mldsaSeed)
	identity.mldsa87Public = mldsaPublic.Bytes()
	identity.mldsa87Private = mldsaPrivate.Bytes()
	clear(mldsaSeed[:])
	*mldsaPrivate = mldsa87.PrivateKey{}

	return identity, nil
}

func deriveIdentityBytes(label string, masterKey []byte, size int) []byte {
	output := make([]byte, size)
	shake := sha3.NewShake256()
	_, _ = shake.Write([]byte(label))
	_, _ = shake.Write([]byte{0})
	_, _ = shake.Write(masterKey)
	_, _ = shake.Read(output)
	return output
}

func (i *KeyBundle) Ed25519Public() []byte      { return i.secretCopy(0) }
func (i *KeyBundle) Ed25519PrivateSeed() []byte { return i.secretCopy(1) }
func (i *KeyBundle) X25519Public() []byte       { return i.secretCopy(2) }
func (i *KeyBundle) X25519Private() []byte      { return i.secretCopy(3) }
func (i *KeyBundle) Mlkem1024Public() []byte    { return i.secretCopy(4) }
func (i *KeyBundle) Mlkem1024Private() []byte   { return i.secretCopy(5) }
func (i *KeyBundle) Mldsa87Public() []byte      { return i.secretCopy(6) }
func (i *KeyBundle) Mldsa87Private() []byte     { return i.secretCopy(7) }

func (i *KeyBundle) secretCopy(index int) []byte {
	if i == nil {
		return nil
	}
	i.mu.RLock()
	defer i.mu.RUnlock()
	if i.closed {
		return nil
	}
	values := [][]byte{
		i.ed25519Public, i.ed25519Seed, i.x25519Public, i.x25519Private,
		i.mlkem1024Public, i.mlkem1024Private, i.mldsa87Public, i.mldsa87Private,
	}
	if index < 0 || index >= len(values) {
		return nil
	}
	return clone(values[index])
}

func (i *KeyBundle) Close() {
	if i == nil {
		return
	}
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.closed {
		return
	}
	i.closed = true
	values := []*[]byte{
		&i.ed25519Public, &i.ed25519Seed, &i.x25519Public, &i.x25519Private,
		&i.mlkem1024Public, &i.mlkem1024Private, &i.mldsa87Public, &i.mldsa87Private,
	}
	for _, value := range values {
		wipe(*value)
		*value = nil
	}
}
