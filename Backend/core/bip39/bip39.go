// Package bip39 implements BIP-0039: Mnemonic code for generating deterministic keys.
//
// Specification: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
//
// This implementation has zero external dependencies. It uses only the Go
// standard library: crypto/rand, crypto/sha256, crypto/sha512.
//
// Supported entropy sizes: 128, 160, 192, 224, 256 bits (12–24 words).
// The PBKDF2 seed derivation uses HMAC-SHA512 with 2048 iterations, which
// matches the Trezor reference implementation and is compatible with all
// BIP-32/BIP-44 HD wallet implementations.
package bip39

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"errors"
	"strings"
)

// ErrInvalidEntropy is returned when the requested entropy bit size is not one
// of the five values defined by BIP-39 (128 / 160 / 192 / 224 / 256).
var ErrInvalidEntropy = errors.New("bip39: entropy bit size must be 128, 160, 192, 224, or 256")

// ErrInvalidMnemonic is returned when a mnemonic phrase fails validation.
var ErrInvalidMnemonic = errors.New("bip39: invalid mnemonic phrase")

// validBitSizes lists the entropy sizes allowed by BIP-39.
var validBitSizes = [5]int{128, 160, 192, 224, 256}

// NewMnemonic generates a cryptographically random BIP-39 mnemonic phrase.
//
// bitSize must be one of: 128 (12 words), 160 (15 words), 192 (18 words),
// 224 (21 words), or 256 (24 words).
func NewMnemonic(bitSize int) (string, error) {
	if !isValidBitSize(bitSize) {
		return "", ErrInvalidEntropy
	}
	entropy := make([]byte, bitSize/8)
	if _, err := rand.Read(entropy); err != nil {
		return "", err
	}
	return entropyToMnemonic(entropy)
}

// IsMnemonicValid reports whether mnemonic is a valid BIP-39 phrase.
// It checks word count, wordlist membership, and the embedded checksum.
func IsMnemonicValid(mnemonic string) bool {
	_, err := mnemonicToEntropy(mnemonic)
	return err == nil
}

// NewSeed converts a mnemonic and an optional passphrase to a 64-byte seed
// using PBKDF2-HMAC-SHA512 with 2048 iterations, exactly as defined by BIP-39.
// The passphrase may be empty. The mnemonic is NOT validated here; call
// IsMnemonicValid first if you need to verify user input.
func NewSeed(mnemonic, passphrase string) []byte {
	return pbkdf2Key([]byte(mnemonic), []byte("mnemonic"+passphrase), 2048, 64)
}

// ---------------------------------------------------------------------------
// Bit-stream helpers
//
// BIP-39 treats entropy as a big-endian bit array. We avoid big.Int to keep
// the code simple and allocation-light: we work byte-by-byte and index bits
// via (byte_index, bit_within_byte) pairs.
// ---------------------------------------------------------------------------

// entropyToMnemonic converts raw entropy bytes to a BIP-39 mnemonic string.
func entropyToMnemonic(entropy []byte) (string, error) {
	entropyBits := len(entropy) * 8
	checksumBits := entropyBits / 32 // CS = ENT / 32 (4..8 bits)
	totalBits := entropyBits + checksumBits
	wordCount := totalBits / 11

	// Build the full bit-stream: entropy bytes followed by checksum bits.
	h := sha256.Sum256(entropy)
	// checksumBits is at most 8, so h[0] contains all checksum bits.
	// We append only the top checksumBits of h[0] into a bit buffer.

	// Concatenate into a []byte bit-stream (total bits rounded up to byte).
	streamLen := (totalBits + 7) / 8
	stream := make([]byte, streamLen)
	copy(stream, entropy)
	// Append checksum bits at position entropyBits..entropyBits+checksumBits-1
	// The checksum occupies the top checksumBits bits of h[0].
	// We need to OR them into the right position in stream.
	checkByte := h[0] >> (8 - uint(checksumBits)) // top checksumBits bits
	// Shift checkByte into the correct bit-position within stream.
	bitOffset := entropyBits
	byteIdx := bitOffset / 8
	bitShift := bitOffset % 8
	if bitShift == 0 {
		stream[byteIdx] |= checkByte << (8 - uint(checksumBits))
	} else {
		// Checksum spans a byte boundary — handle both halves.
		stream[byteIdx] |= checkByte >> uint(bitShift)
		if byteIdx+1 < len(stream) {
			stream[byteIdx+1] |= checkByte << (8 - uint(bitShift))
		}
	}

	// Extract wordCount 11-bit windows from stream.
	words := make([]string, wordCount)
	for i := range words {
		idx := read11Bits(stream, i*11)
		words[i] = englishWordlist[idx]
	}
	return strings.Join(words, " "), nil
}

// mnemonicToEntropy validates a mnemonic and returns the original entropy.
func mnemonicToEntropy(mnemonic string) ([]byte, error) {
	words := strings.Fields(mnemonic)
	wordCount := len(words)
	if wordCount < 12 || wordCount > 24 || wordCount%3 != 0 {
		return nil, ErrInvalidMnemonic
	}

	totalBits := wordCount * 11
	checksumBits := totalBits / 33
	entropyBits := totalBits - checksumBits

	// Build the full bit-stream from word indices.
	streamLen := (totalBits + 7) / 8
	stream := make([]byte, streamLen)
	for i, word := range words {
		idx, ok := wordIndex(word)
		if !ok {
			return nil, ErrInvalidMnemonic
		}
		write11Bits(stream, i*11, idx)
	}

	// Extract entropy bytes.
	entropyBytes := entropyBits / 8
	entropy := make([]byte, entropyBytes)
	// Copy only the entropyBits leading bits — last partial byte is masked.
	for i := range entropy {
		entropy[i] = stream[i]
	}
	// Mask off any checksum bits that leaked into the last entropy byte
	// (only when entropyBits % 8 != 0, which cannot happen for BIP-39 sizes,
	// but we keep it for correctness).
	if entropyBits%8 != 0 {
		mask := byte(0xFF) << (8 - uint(entropyBits%8))
		entropy[entropyBytes-1] &= mask
	}

	// Recompute checksum and compare.
	h := sha256.Sum256(entropy)
	expectedChecksum := h[0] >> (8 - uint(checksumBits))

	// Read actual checksum from stream starting at bit entropyBits.
	actualChecksum := readNBits(stream, entropyBits, checksumBits)

	if actualChecksum != expectedChecksum {
		return nil, ErrInvalidMnemonic
	}
	return entropy, nil
}

// read11Bits reads 11 bits starting at bit offset `start` from a big-endian
// byte slice, returning the value as an int (0..2047).
func read11Bits(stream []byte, start int) int {
	// We need bits [start, start+10] inclusive.
	// Span at most 3 bytes.
	b0 := start / 8
	shift := start % 8

	var val int
	val = int(stream[b0]) << 16
	if b0+1 < len(stream) {
		val |= int(stream[b0+1]) << 8
	}
	if b0+2 < len(stream) {
		val |= int(stream[b0+2])
	}
	// Right-align the 11-bit window.
	val >>= (24 - 11 - shift)
	return val & 0x7FF
}

// readNBits reads n bits (n ≤ 8) from a bit-stream starting at bit offset start.
func readNBits(stream []byte, start, n int) byte {
	b0 := start / 8
	shift := start % 8
	var val int
	val = int(stream[b0]) << 8
	if b0+1 < len(stream) {
		val |= int(stream[b0+1])
	}
	val >>= (16 - n - shift)
	return byte(val & ((1 << uint(n)) - 1))
}

// write11Bits writes the 11-bit value v into stream at bit offset start
// (big-endian, OR-merge).
func write11Bits(stream []byte, start, v int) {
	// Spread 11 bits across at most 3 bytes.
	b0 := start / 8
	shift := start % 8

	// Place v in a 24-bit window aligned to b0.
	v24 := v << (24 - 11 - shift)
	stream[b0] |= byte(v24 >> 16)
	if b0+1 < len(stream) {
		stream[b0+1] |= byte(v24 >> 8)
	}
	if b0+2 < len(stream) {
		stream[b0+2] |= byte(v24)
	}
}

// isValidBitSize reports whether size is one of the five BIP-39 entropy sizes.
func isValidBitSize(size int) bool {
	for _, v := range validBitSizes {
		if v == size {
			return true
		}
	}
	return false
}

// wordIndex returns the index of word in the English wordlist.
func wordIndex(word string) (int, bool) {
	for i, w := range englishWordlist {
		if w == word {
			return i, true
		}
	}
	return 0, false
}

// ---------------------------------------------------------------------------
// PBKDF2-HMAC-SHA512 — zero-dependency implementation.
// RFC 2898 §5.2. PRF = HMAC-SHA512, block size = 64, output = keyLen bytes.
// ---------------------------------------------------------------------------

func pbkdf2Key(password, salt []byte, iter, keyLen int) []byte {
	hashLen := sha512.Size
	numBlocks := (keyLen + hashLen - 1) / hashLen
	dk := make([]byte, 0, numBlocks*hashLen)
	for i := 1; i <= numBlocks; i++ {
		dk = append(dk, pbkdf2Block(password, salt, iter, i)...)
	}
	return dk[:keyLen]
}

func pbkdf2Block(password, salt []byte, iter, blockIdx int) []byte {
	buf := make([]byte, len(salt)+4)
	copy(buf, salt)
	buf[len(salt)] = byte(blockIdx >> 24)
	buf[len(salt)+1] = byte(blockIdx >> 16)
	buf[len(salt)+2] = byte(blockIdx >> 8)
	buf[len(salt)+3] = byte(blockIdx)

	u := hmacSHA512(password, buf)
	result := make([]byte, len(u))
	copy(result, u)
	for c := 2; c <= iter; c++ {
		u = hmacSHA512(password, u)
		for j := range result {
			result[j] ^= u[j]
		}
	}
	return result
}

func hmacSHA512(key, data []byte) []byte {
	const blockSize = 128
	if len(key) > blockSize {
		h := sha512.Sum512(key)
		key = h[:]
	}
	ipad := make([]byte, blockSize)
	opad := make([]byte, blockSize)
	copy(ipad, key)
	copy(opad, key)
	for i := range ipad {
		ipad[i] ^= 0x36
		opad[i] ^= 0x5c
	}
	inner := sha512.New()
	inner.Write(ipad)
	inner.Write(data)
	innerSum := inner.Sum(nil)
	outer := sha512.New()
	outer.Write(opad)
	outer.Write(innerSum)
	return outer.Sum(nil)
}
