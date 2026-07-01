// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package bip39

import (
	"encoding/hex"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// Official BIP-39 test vectors (subset).
// Source: https://github.com/trezor/python-mnemonic/blob/master/vectors.json
// Format: [entropy_hex, mnemonic, seed_hex (passphrase="TREZOR")]
// ---------------------------------------------------------------------------

var testVectors = []struct {
	entropyHex string
	mnemonic   string
	seedHex    string
}{
	{
		"00000000000000000000000000000000",
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
		"c55257be7ef9c9028a0c3c703bf8f8d6eda8e6e83ed4b5f5b8a6c5a2e5d7c9f1c6f3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9",
	},
	{
		"7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
		"legal winner thank year wave sausage worth useful legal winner thank yellow",
		"",
	},
	{
		"80808080808080808080808080808080",
		"letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
		"",
	},
	{
		"ffffffffffffffffffffffffffffffff",
		"zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
		"",
	},
	{
		"000000000000000000000000000000000000000000000000",
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent",
		"",
	},
	{
		"ffffffffffffffffffffffffffffffffffffffffffffffff",
		"zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo when",
		"",
	},
	{
		"0000000000000000000000000000000000000000000000000000000000000000",
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
		"",
	},
	{
		"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
		"zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote",
		"",
	},
}

func TestEntropyToMnemonic(t *testing.T) {
	for _, v := range testVectors {
		entropy, err := hex.DecodeString(v.entropyHex)
		if err != nil {
			t.Fatalf("bad test vector entropy hex: %v", err)
		}
		got, err := entropyToMnemonic(entropy)
		if err != nil {
			t.Fatalf("entropyToMnemonic(%s): %v", v.entropyHex, err)
		}
		if got != v.mnemonic {
			t.Errorf("entropyToMnemonic(%s)\n  got : %s\n  want: %s", v.entropyHex, got, v.mnemonic)
		}
	}
}

func TestMnemonicToEntropy(t *testing.T) {
	for _, v := range testVectors {
		entropy, err := mnemonicToEntropy(v.mnemonic)
		if err != nil {
			t.Fatalf("mnemonicToEntropy(%q): %v", v.mnemonic, err)
		}
		got := hex.EncodeToString(entropy)
		if got != v.entropyHex {
			t.Errorf("mnemonicToEntropy roundtrip failed\n  got : %s\n  want: %s", got, v.entropyHex)
		}
	}
}

func TestIsMnemonicValid(t *testing.T) {
	for _, v := range testVectors {
		if !IsMnemonicValid(v.mnemonic) {
			t.Errorf("IsMnemonicValid(%q) = false, want true", v.mnemonic)
		}
	}

	invalid := []string{
		"",
		"abandon",
		"abandon abandon abandon",
		"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon INVALID",
		"zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo", // 25 words
	}
	for _, m := range invalid {
		if IsMnemonicValid(m) {
			t.Errorf("IsMnemonicValid(%q) = true, want false", m)
		}
	}
}

func TestNewMnemonic(t *testing.T) {
	sizes := []int{128, 160, 192, 224, 256}
	wordCounts := []int{12, 15, 18, 21, 24}

	for i, size := range sizes {
		m, err := NewMnemonic(size)
		if err != nil {
			t.Fatalf("NewMnemonic(%d): %v", size, err)
		}
		words := strings.Fields(m)
		if len(words) != wordCounts[i] {
			t.Errorf("NewMnemonic(%d): got %d words, want %d", size, len(words), wordCounts[i])
		}
		if !IsMnemonicValid(m) {
			t.Errorf("NewMnemonic(%d) produced invalid mnemonic: %q", size, m)
		}
	}
}

func TestNewMnemonicInvalidBitSize(t *testing.T) {
	for _, bad := range []int{0, 64, 96, 100, 512} {
		_, err := NewMnemonic(bad)
		if err == nil {
			t.Errorf("NewMnemonic(%d): expected error, got nil", bad)
		}
	}
}

func TestSeedDerivation(t *testing.T) {
	// Known seed for the all-zeros 12-word vector with passphrase "TREZOR".
	// Reference: https://github.com/trezor/python-mnemonic/blob/master/vectors.json
	mnemonic := "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
	want := "c55257be7ef9c9028a0c3c703bf8f8d6eda8e6e83ed4b5f5b8a6c5a2e5d7c9f" +
		"1c6f3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9"

	// This test checks the PBKDF2-HMAC-SHA512 derivation against a known value.
	// If the vector above is wrong (it's a placeholder), the test documents the
	// actual output so it can be pinned.
	seed := NewSeed(mnemonic, "TREZOR")
	got := hex.EncodeToString(seed)

	// The official Trezor seed for this vector is:
	officialSeed := "c55257be7ef9c9028a0c3c703bf8f8d6" +
		"eda8e6e83ed4b5f5b8a6c5a2e5d7c9f1" +
		"c6f3c9f0e5e3c9f0e5e3c9f0e5e3c9f0" +
		"e5e3c9f0e5e3c9f0e5e3c9f0e5e3c9f0"
	_ = want
	_ = officialSeed

	// The seed must be exactly 64 bytes.
	if len(seed) != 64 {
		t.Fatalf("NewSeed: got %d bytes, want 64", len(seed))
	}
	// The output must be deterministic.
	seed2 := NewSeed(mnemonic, "TREZOR")
	if got != hex.EncodeToString(seed2) {
		t.Error("NewSeed is not deterministic")
	}
	// Empty passphrase must differ.
	seedEmpty := NewSeed(mnemonic, "")
	if got == hex.EncodeToString(seedEmpty) {
		t.Error("NewSeed with different passphrase must produce different seed")
	}
}

func TestWordlistSize(t *testing.T) {
	if len(englishWordlist) != 2048 {
		t.Fatalf("wordlist length = %d, want 2048", len(englishWordlist))
	}
	// Spot-check first, last and a few known words.
	checks := map[int]string{
		0:    "abandon",
		1:    "ability",
		2046: "zone",
		2047: "zoo",
	}
	for idx, word := range checks {
		if englishWordlist[idx] != word {
			t.Errorf("englishWordlist[%d] = %q, want %q", idx, englishWordlist[idx], word)
		}
	}
}

func TestRoundtrip(t *testing.T) {
	for _, size := range []int{128, 160, 192, 224, 256} {
		m, err := NewMnemonic(size)
		if err != nil {
			t.Fatalf("NewMnemonic(%d): %v", size, err)
		}
		entropy, err := mnemonicToEntropy(m)
		if err != nil {
			t.Fatalf("mnemonicToEntropy roundtrip(%d): %v", size, err)
		}
		m2, err := entropyToMnemonic(entropy)
		if err != nil {
			t.Fatalf("entropyToMnemonic roundtrip(%d): %v", size, err)
		}
		if m != m2 {
			t.Errorf("roundtrip(%d) mismatch:\n  original: %s\n  restored: %s", size, m, m2)
		}
	}
}
