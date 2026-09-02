// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"bytes"
	"testing"
	"time"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

type exportedPrivateIdentity struct {
	edSeed     []byte
	xPrivate   []byte
	kemPrivate []byte
	mlPrivate  []byte
}

func TestImportIdentityReconstructsDerivedIdentity(t *testing.T) {
	derived := deriveFixtureIdentity(
		t,
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
	)
	defer derived.Close()
	material := exportPrivateIdentity(derived)
	imported, err := ImportIdentity(
		material.edSeed,
		material.xPrivate,
		material.kemPrivate,
		material.mlPrivate,
	)
	material.wipe()
	if err != nil {
		t.Fatalf("import derived identity: %v", err)
	}
	defer imported.Close()
	assertIdentityPublicKeysEqual(t, imported, derived)
	assertIdentityPrivateKeysEqual(t, imported, derived)
}

func TestImportedIdentityEncryptsAndDecryptsWithDerivedPeer(t *testing.T) {
	senderDerived := deriveFixtureIdentity(
		t,
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
	)
	defer senderDerived.Close()
	recipientDerived := deriveFixtureIdentity(
		t,
		"legal winner thank year wave sausage worth useful legal winner thank yellow",
	)
	defer recipientDerived.Close()
	senderImported := importExportedIdentity(t, senderDerived)
	defer senderImported.Close()
	recipientImported := importExportedIdentity(t, recipientDerived)
	defer recipientImported.Close()

	recipient := mustMessageRecipient(
		t,
		recipientDerived.Ed25519Public(),
		recipientDerived.X25519Public(),
		recipientDerived.Mlkem1024Public(),
		recipientDerived.Mldsa87Public(),
		"aabbccdd-eeff-4123-8abc-0123456789ab",
	)
	defer recipient.Close()
	sender := mustMessageSender(
		t,
		senderDerived.Ed25519Public(),
		senderDerived.Mldsa87Public(),
	)
	defer sender.Close()

	plaintext := []byte("imported identity protocol parity")
	randomMaterial := make([]byte, 32+32+12)
	for index := range randomMaterial {
		randomMaterial[index] = byte(index*31 + 9)
	}
	envelope, err := senderImported.encryptMessageWithRuntime(
		recipient,
		plaintext,
		"11223344-5566-4788-99aa-bbccddeeff05",
		1_784_332_802_000,
		true,
		messageCryptoRuntime{
			random:          bytes.NewReader(randomMaterial),
			now:             func() time.Time { return time.UnixMilli(1_784_332_802_000) },
			randomizedMLDSA: false,
		},
	)
	wipe(randomMaterial)
	if err != nil {
		t.Fatalf("encrypt through imported identity: %v", err)
	}
	defer envelope.Close()
	decrypted, err := recipientImported.DecryptMessage(sender, envelope)
	if err != nil {
		t.Fatalf("decrypt through imported identity: %v", err)
	}
	defer wipe(decrypted)
	if !bytes.Equal(decrypted, plaintext) {
		t.Fatal("imported identity protocol plaintext differs")
	}
}

func TestImportIdentityRejectsEveryLengthViolation(t *testing.T) {
	derived := deriveFixtureIdentity(
		t,
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
	)
	defer derived.Close()
	valid := exportPrivateIdentity(derived)
	defer valid.wipe()
	if mlkem1024.PrivateKeySize != 3168 || mldsa87.PrivateKeySize != 4896 {
		t.Fatal("post-quantum private serialization constants changed")
	}
	if len(valid.edSeed) != 32 || len(valid.xPrivate) != 32 ||
		len(valid.kemPrivate) != mlkem1024.PrivateKeySize ||
		len(valid.mlPrivate) != mldsa87.PrivateKeySize {
		t.Fatal("private identity serialization lengths changed")
	}

	tests := []struct {
		name           string
		ed, x, kem, ml []byte
	}{
		{"ed-short", valid.edSeed[:31], valid.xPrivate, valid.kemPrivate, valid.mlPrivate},
		{"ed-long", append(clone(valid.edSeed), 0), valid.xPrivate, valid.kemPrivate, valid.mlPrivate},
		{"x-short", valid.edSeed, valid.xPrivate[:31], valid.kemPrivate, valid.mlPrivate},
		{"x-long", valid.edSeed, append(clone(valid.xPrivate), 0), valid.kemPrivate, valid.mlPrivate},
		{"kem-short", valid.edSeed, valid.xPrivate, valid.kemPrivate[:len(valid.kemPrivate)-1], valid.mlPrivate},
		{"kem-long", valid.edSeed, valid.xPrivate, append(clone(valid.kemPrivate), 0), valid.mlPrivate},
		{"mldsa-short", valid.edSeed, valid.xPrivate, valid.kemPrivate, valid.mlPrivate[:len(valid.mlPrivate)-1]},
		{"mldsa-long", valid.edSeed, valid.xPrivate, valid.kemPrivate, append(clone(valid.mlPrivate), 0)},
	}
	for index := range tests {
		testCase := tests[index]
		t.Run(testCase.name, func(t *testing.T) {
			identity, err := ImportIdentity(testCase.ed, testCase.x, testCase.kem, testCase.ml)
			if identity != nil {
				identity.Close()
			}
			if err == nil {
				t.Fatal("invalid private serialization length was accepted")
			}
		})
	}
	for index := range tests {
		if cap(tests[index].ed) > len(valid.edSeed) {
			wipe(tests[index].ed)
		}
		if cap(tests[index].x) > len(valid.xPrivate) {
			wipe(tests[index].x)
		}
		if cap(tests[index].kem) > len(valid.kemPrivate) {
			wipe(tests[index].kem)
		}
		if cap(tests[index].ml) > len(valid.mlPrivate) {
			wipe(tests[index].ml)
		}
	}
}

func TestImportIdentityRejectsInvalidOrInconsistentEncodings(t *testing.T) {
	derived := deriveFixtureIdentity(
		t,
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
	)
	defer derived.Close()

	tests := []struct {
		name   string
		mutate func(*exportedPrivateIdentity)
	}{
		{"noncanonical-x25519", func(value *exportedPrivateIdentity) { value.xPrivate[0] |= 1 }},
		{"mlkem-secret-mismatch", func(value *exportedPrivateIdentity) { value.kemPrivate[0] ^= 0x01 }},
		{"mlkem-public-hash-mismatch", func(value *exportedPrivateIdentity) { value.kemPrivate[len(value.kemPrivate)-64] ^= 0x01 }},
		{"mldsa-tr-mismatch", func(value *exportedPrivateIdentity) { value.mlPrivate[64] ^= 0x01 }},
		{"mldsa-secret-vector-mismatch", func(value *exportedPrivateIdentity) { value.mlPrivate[128] ^= 0x01 }},
	}
	for index := range tests {
		testCase := tests[index]
		t.Run(testCase.name, func(t *testing.T) {
			material := exportPrivateIdentity(derived)
			defer material.wipe()
			testCase.mutate(&material)
			identity, err := ImportIdentity(
				material.edSeed,
				material.xPrivate,
				material.kemPrivate,
				material.mlPrivate,
			)
			if identity != nil {
				identity.Close()
			}
			if err == nil {
				t.Fatal("inconsistent private serialization was accepted")
			}
		})
	}
}

func exportPrivateIdentity(identity *KeyBundle) exportedPrivateIdentity {
	return exportedPrivateIdentity{
		edSeed:     identity.Ed25519PrivateSeed(),
		xPrivate:   identity.X25519Private(),
		kemPrivate: identity.Mlkem1024Private(),
		mlPrivate:  identity.Mldsa87Private(),
	}
}

func importExportedIdentity(t *testing.T, identity *KeyBundle) *KeyBundle {
	t.Helper()
	material := exportPrivateIdentity(identity)
	defer material.wipe()
	imported, err := ImportIdentity(
		material.edSeed,
		material.xPrivate,
		material.kemPrivate,
		material.mlPrivate,
	)
	if err != nil {
		t.Fatalf("import exported identity: %v", err)
	}
	return imported
}

func (value *exportedPrivateIdentity) wipe() {
	wipe(value.edSeed)
	wipe(value.xPrivate)
	wipe(value.kemPrivate)
	wipe(value.mlPrivate)
	value.edSeed, value.xPrivate, value.kemPrivate, value.mlPrivate = nil, nil, nil, nil
}

func assertIdentityPublicKeysEqual(t *testing.T, left, right *KeyBundle) {
	t.Helper()
	assertIdentityByteGettersEqual(t, []func() []byte{
		left.Ed25519Public,
		left.X25519Public,
		left.Mlkem1024Public,
		left.Mldsa87Public,
	}, []func() []byte{
		right.Ed25519Public,
		right.X25519Public,
		right.Mlkem1024Public,
		right.Mldsa87Public,
	})
}

func assertIdentityPrivateKeysEqual(t *testing.T, left, right *KeyBundle) {
	t.Helper()
	assertIdentityByteGettersEqual(t, []func() []byte{
		left.Ed25519PrivateSeed,
		left.X25519Private,
		left.Mlkem1024Private,
		left.Mldsa87Private,
	}, []func() []byte{
		right.Ed25519PrivateSeed,
		right.X25519Private,
		right.Mlkem1024Private,
		right.Mldsa87Private,
	})
}

func assertIdentityByteGettersEqual(t *testing.T, left, right []func() []byte) {
	t.Helper()
	for index := range left {
		leftBytes := left[index]()
		rightBytes := right[index]()
		if !bytes.Equal(leftBytes, rightBytes) {
			wipe(leftBytes)
			wipe(rightBytes)
			t.Fatalf("identity key field %d differs after import", index)
		}
		wipe(leftBytes)
		wipe(rightBytes)
	}
}
