// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"reflect"
	"strings"
	"testing"
)

const publicParityMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

func TestMnemonicValidationMatchesWebCanonicalPolicy(t *testing.T) {
	valid := []byte(publicParityMnemonic)
	if !ValidateMnemonic(valid) {
		t.Fatal("known BIP-39 parity vector was rejected")
	}
	if !bytes.Equal(valid, []byte(publicParityMnemonic)) {
		t.Fatal("validation mutated caller-owned input")
	}
	invalid := [][]byte{
		{},
		[]byte("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"),
		[]byte(" " + publicParityMnemonic),
		[]byte(publicParityMnemonic + " "),
		[]byte(strings.Replace(publicParityMnemonic, "abandon abandon", "abandon  abandon", 1)),
		[]byte(strings.Replace(publicParityMnemonic, "abandon abandon", "abandon\tabandon", 1)),
		[]byte(strings.Replace(publicParityMnemonic, "abandon", "Abandon", 1)),
	}
	for index, mnemonic := range invalid {
		if ValidateMnemonic(mnemonic) {
			t.Fatalf("invalid canonical mnemonic case %d was accepted", index)
		}
	}
	if !ValidateMnemonic(fullwidthMnemonic(publicParityMnemonic)) {
		t.Fatal("NFKD-compatible mnemonic accepted by the web client was rejected")
	}
}

func TestIdentityDerivationMatchesNobleWebVectorByteForByte(t *testing.T) {
	identity, err := DeriveIdentity([]byte(publicParityMnemonic))
	if err != nil {
		t.Fatalf("derive public parity vector: %v", err)
	}
	defer identity.Close()

	assertHex(t, "Ed25519 public", identity.Ed25519Public(),
		"132f718ac4b11c5ccbd0b4bbbe232794657bf848081c7965f2692e4cb399df58")
	assertHex(t, "Ed25519 private seed", identity.Ed25519PrivateSeed(),
		"88b0a4300d59c2737063ea0b2e08445145bb29c135e5143cc6c12cc5fff3916f")
	assertHex(t, "X25519 public", identity.X25519Public(),
		"353ec5f5f88b7216ee5018780831edad953515144f24e3ee72460a111c5bb638")
	assertHex(t, "X25519 private", identity.X25519Private(),
		"30249bb0a65b84882e41ecb25edbabd9a4c5b30dac8d7b971036597a66260151")

	assertDigest(t, "ML-KEM-1024 public", identity.Mlkem1024Public(), 1568,
		"e54f781222b67d2743e3fbb0bd70fcdff9934a6991905f4e2042c05dccf00fcd")
	assertDigest(t, "ML-KEM-1024 private", identity.Mlkem1024Private(), 3168,
		"fa4584af157f49dcedeb5b0166dd58dd79f16a4f65c376281e65692e07f4b1d6")
	assertDigest(t, "ML-DSA-87 public", identity.Mldsa87Public(), 2592,
		"6ba253e653830e807c0876988899e3305091501e6443cb6ed930fcf4ac3ca1c4")
	assertDigest(t, "ML-DSA-87 private", identity.Mldsa87Private(), 4896,
		"d9adfc23a6c2981901caaeac39a98ed6f1097199a119bbf75c95f4f35e67430c")
}

func TestDerivedIdentityIsDeterministicDefensiveAndClosable(t *testing.T) {
	first, err := DeriveIdentity([]byte(publicParityMnemonic))
	if err != nil {
		t.Fatalf("derive first identity: %v", err)
	}
	defer first.Close()
	second, err := DeriveIdentity([]byte(publicParityMnemonic))
	if err != nil {
		t.Fatalf("derive second identity: %v", err)
	}
	defer second.Close()
	if !bytes.Equal(first.Mldsa87Private(), second.Mldsa87Private()) {
		t.Fatal("identity derivation is not deterministic")
	}

	copyOfSeed := first.Ed25519PrivateSeed()
	copyOfSeed[0] ^= 0xff
	if bytes.Equal(copyOfSeed, first.Ed25519PrivateSeed()) {
		t.Fatal("identity getter exposed mutable internal memory")
	}
	first.Close()
	if first.Ed25519PrivateSeed() != nil || first.Mlkem1024Private() != nil || first.Mldsa87Private() != nil {
		t.Fatal("closed identity retained accessible private material")
	}
	first.Close()
}

func TestNFKDMnemonicDerivesSameIdentityAsWebClient(t *testing.T) {
	canonical, err := DeriveIdentity([]byte(publicParityMnemonic))
	if err != nil {
		t.Fatalf("derive canonical vector: %v", err)
	}
	defer canonical.Close()
	compatibilityForm, err := DeriveIdentity(fullwidthMnemonic(publicParityMnemonic))
	if err != nil {
		t.Fatalf("derive NFKD compatibility vector: %v", err)
	}
	defer compatibilityForm.Close()
	if !bytes.Equal(canonical.Mlkem1024Private(), compatibilityForm.Mlkem1024Private()) ||
		!bytes.Equal(canonical.Mldsa87Private(), compatibilityForm.Mldsa87Private()) {
		t.Fatal("NFKD normalization differs from the web identity derivation")
	}
}

func TestMobileIdentityBridgeDoesNotExposeRecoveryMaterial(t *testing.T) {
	typeOfIdentity := reflect.TypeOf(&KeyBundle{})
	for index := 0; index < typeOfIdentity.NumMethod(); index++ {
		name := strings.ToLower(typeOfIdentity.Method(index).Name)
		if strings.Contains(name, "mnemonic") || strings.Contains(name, "master") {
			t.Fatalf("mobile identity bridge exposes recovery material through %q", name)
		}
	}
	if _, err := DeriveIdentity([]byte("not a recovery phrase")); err == nil {
		t.Fatal("invalid recovery material was accepted")
	} else if strings.Contains(strings.ToLower(err.Error()), "not a recovery phrase") {
		t.Fatal("derivation error reflected recovery material")
	}
}

func assertHex(t *testing.T, name string, actual []byte, expected string) {
	t.Helper()
	if hex.EncodeToString(actual) != expected {
		t.Fatalf("%s differs from the web parity vector", name)
	}
}

func assertDigest(t *testing.T, name string, actual []byte, expectedLength int, expectedDigest string) {
	t.Helper()
	if len(actual) != expectedLength {
		t.Fatalf("%s length = %d, want %d", name, len(actual), expectedLength)
	}
	digest := sha256.Sum256(actual)
	if hex.EncodeToString(digest[:]) != expectedDigest {
		t.Fatalf("%s differs from the web parity vector", name)
	}
}

func fullwidthMnemonic(value string) []byte {
	var builder strings.Builder
	for _, character := range value {
		if character >= 'a' && character <= 'z' {
			builder.WriteRune(character + 0xFEE0)
		} else {
			builder.WriteRune(character)
		}
	}
	return []byte(builder.String())
}
