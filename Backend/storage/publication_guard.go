package storage

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"gaiacom/backend/models"
)

// Public image publication policy (FIND-024 / P-11).
//
// Only completed image files from a strict allowlist may become publicly
// downloadable. The allowlist intentionally mirrors the browser-side image set
// (Frontend/frontend/src/utils/mediaLimits.js + crypto/files.js): PNG, JPEG,
// GIF, WebP and AVIF.
const (
	// MaxPublicImageBytes bounds files that may be exposed publicly (25 MiB).
	MaxPublicImageBytes int64 = 25 * 1024 * 1024
	// Encrypted payloads additionally carry a 16-byte AES-GCM tag.
	maxPublicImageEnvelopeBytes int64 = MaxPublicImageBytes + 16
)

var (
	// ErrPublicImageRejected is returned when a file may not be published.
	ErrPublicImageRejected = errors.New("public image publication rejected")
)

var allowedPublicImageMIME = map[string]struct{}{
	"image/png":  {},
	"image/jpeg": {},
	"image/gif":  {},
	"image/webp": {},
	"image/avif": {},
}

var allowedPublicImageExtensions = []string{".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"}

// dangerousWebUploadExtensions are rejected at upload time as a defensive
// denylist extension (coupled FIND-012 partial fix; the full magic-byte policy
// for every upload would break the client-side encrypted storage pipeline).
var dangerousWebUploadExtensions = []string{
	".html", ".htm", ".xhtml", ".svg", ".svgz", ".xml", ".xsl", ".mjs",
	".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".vbs", ".scr", ".pif", ".cpl",
}

// IsAllowedPublicImageMIME reports whether the declared MIME is in the
// publication allowlist.
func IsAllowedPublicImageMIME(mimeType string) bool {
	_, ok := allowedPublicImageMIME[normalizeMIME(mimeType)]
	return ok
}

// IsAllowedPublicImageExtension reports whether the filename extension is an
// allowed public image extension.
func IsAllowedPublicImageExtension(fileName string) bool {
	lower := strings.ToLower(strings.TrimSpace(fileName))
	for _, ext := range allowedPublicImageExtensions {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// IsDangerousWebUploadName flags executable or active-web-content filenames that
// must never be accepted as a general upload (coupled FIND-012 hardening).
func IsDangerousWebUploadName(fileName string) bool {
	lower := strings.ToLower(strings.TrimSpace(fileName))
	for _, ext := range dangerousWebUploadExtensions {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// IsDangerousWebUploadMIME flags active-web-content MIME declarations that must
// never be accepted for storage/sharing (coupled FIND-012 hardening).
func IsDangerousWebUploadMIME(mimeType string) bool {
	lower := normalizeMIME(mimeType)
	if strings.Contains(lower, "html") || strings.Contains(lower, "javascript") ||
		strings.Contains(lower, "svg") || strings.Contains(lower, "xml") ||
		strings.Contains(lower, "executable") {
		return true
	}
	return false
}

// DownloadContentType derives a server-controlled Content-Type for downloads.
// Anything outside the safe media allowlist is downgraded to
// application/octet-stream so a client-declared MIME can never be echoed as
// active content (FIND-012 partial mitigation).
func DownloadContentType(declared string) string {
	normalized := normalizeMIME(declared)
	if IsAllowedPublicImageMIME(normalized) {
		return normalized
	}
	switch normalized {
	case "application/pdf", "application/zip", "application/octet-stream",
		"audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
		"video/mp4", "video/webm", "video/ogg":
		return normalized
	}
	return "application/octet-stream"
}

// SniffPublicImageMIME identifies an allowlisted image format from file magic
// bytes and returns "" for anything else (including HTML/SVG/text).
func SniffPublicImageMIME(header []byte) string {
	if len(header) >= 8 && bytes.Equal(header[:8], []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}) {
		return "image/png"
	}
	if len(header) >= 3 && header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff {
		return "image/jpeg"
	}
	if len(header) >= 6 && (bytes.Equal(header[:6], []byte("GIF87a")) || bytes.Equal(header[:6], []byte("GIF89a"))) {
		return "image/gif"
	}
	if len(header) >= 12 && bytes.Equal(header[:4], []byte("RIFF")) && bytes.Equal(header[8:12], []byte("WEBP")) {
		return "image/webp"
	}
	if len(header) >= 12 && bytes.Equal(header[4:8], []byte("ftyp")) {
		brand := string(header[8:12])
		if brand == "avif" || brand == "avis" || brand == "av01" {
			return "image/avif"
		}
	}
	return ""
}

// ValidatePublicImageMetadata enforces the publication allowlist on stored
// metadata: completed image file of an allowlisted MIME/extension, under the
// public size cap. It never trusts the filename/MIME alone for content.
func ValidatePublicImageMetadata(meta *models.FileMetadata) error {
	if meta == nil {
		return ErrPublicImageRejected
	}
	status := strings.ToLower(strings.TrimSpace(meta.Status))
	if status != "complete" && status != "completed" {
		return ErrPublicImageRejected
	}
	if meta.FileSize <= 0 || meta.FileSize > maxPublicImageEnvelopeBytes {
		return ErrPublicImageRejected
	}
	if !IsAllowedPublicImageMIME(meta.MimeType) {
		return ErrPublicImageRejected
	}
	if !IsAllowedPublicImageExtension(meta.FileName) {
		return ErrPublicImageRejected
	}
	return nil
}

// ObjectStoreFromEnvironment builds the configured object store for read-side
// verification. It mirrors the storage service configuration (local default,
// S3/MinIO when configured) without changing service wiring.
func ObjectStoreFromEnvironment() (ObjectStore, error) {
	uploadDir := strings.TrimSpace(os.Getenv("GAIACOM_STORAGE_ROOT"))
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	resolvedDir, err := filepath.Abs(uploadDir)
	if err != nil {
		return nil, errors.New("resolve upload directory")
	}
	if err := os.MkdirAll(resolvedDir, 0o700); err != nil {
		return nil, errors.New("prepare upload directory")
	}
	objectStoreType := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_OBJECT_STORE")))
	if objectStoreType == "" {
		objectStoreType = "local"
	}
	return configuredObjectStore(objectStoreType, resolvedDir)
}

// VerifyEncryptedPublicImage performs the server-side content check before a
// file may be marked public:
//
//  1. metadata allowlist (completed image, MIME/extension allowlist, size cap),
//  2. read every stored chunk from the configured object store,
//  3. decrypt the client-side AES-256-GCM envelope using the key/IV that the
//     (already signature-verified) GSN payload carries,
//  4. sniff the plaintext magic bytes and require the sniffed type to match the
//     declared allowlisted image MIME.
//
// The client-side encryption means the server cannot inspect stored bytes
// without the uploaded envelope key; that key is part of the signed post/avatar
// payload, so this remains a genuine server-side content verification for GSN
// publication. General uploads are unaffected (FIND-012 remains PARTIAL).
func VerifyEncryptedPublicImage(ctx context.Context, meta *models.FileMetadata, chunks []models.FileChunk, keyHex string, ivHex string) error {
	if err := ValidatePublicImageMetadata(meta); err != nil {
		return err
	}
	key, err := hex.DecodeString(strings.TrimSpace(keyHex))
	if err != nil || len(key) != 32 {
		return ErrPublicImageRejected
	}
	iv, err := hex.DecodeString(strings.TrimSpace(ivHex))
	if err != nil || len(iv) != 12 {
		return ErrPublicImageRejected
	}
	if len(chunks) == 0 {
		return ErrPublicImageRejected
	}

	ordered := make([]models.FileChunk, len(chunks))
	copy(ordered, chunks)
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].Index < ordered[j].Index })

	var total int64
	for index, chunk := range ordered {
		if chunk.Index != index || chunk.ChunkSize <= 0 || total > maxPublicImageEnvelopeBytes-chunk.ChunkSize {
			return ErrPublicImageRejected
		}
		if strings.TrimSpace(chunk.MinioID) == "" {
			return ErrPublicImageRejected
		}
		total += chunk.ChunkSize
	}
	if total <= 0 || total > maxPublicImageEnvelopeBytes {
		return ErrPublicImageRejected
	}

	store, err := ObjectStoreFromEnvironment()
	if err != nil {
		return ErrPublicImageRejected
	}

	ciphertext := make([]byte, 0, total)
	for _, chunk := range ordered {
		object, err := store.Get(ctx, chunk.MinioID)
		if err != nil {
			return ErrPublicImageRejected
		}
		remaining := chunk.ChunkSize
		for remaining > 0 {
			buffer := make([]byte, 32*1024)
			readSize := int64(len(buffer))
			if remaining < readSize {
				readSize = remaining
			}
			readN, readErr := object.Read(buffer[:int(readSize)])
			if readN > 0 {
				ciphertext = append(ciphertext, buffer[:readN]...)
				remaining -= int64(readN)
			}
			if readErr != nil {
				if errors.Is(readErr, io.EOF) {
					break
				}
				_ = object.Close()
				return ErrPublicImageRejected
			}
		}
		closeErr := object.Close()
		if closeErr != nil || remaining != 0 {
			return ErrPublicImageRejected
		}
	}
	if int64(len(ciphertext)) != total {
		return ErrPublicImageRejected
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return ErrPublicImageRejected
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return ErrPublicImageRejected
	}
	plaintext, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return ErrPublicImageRejected
	}
	if int64(len(plaintext)) > MaxPublicImageBytes {
		return ErrPublicImageRejected
	}

	headerSize := len(plaintext)
	if headerSize > 64 {
		headerSize = 64
	}
	sniffed := SniffPublicImageMIME(plaintext[:headerSize])
	if sniffed == "" {
		return ErrPublicImageRejected
	}
	declared := normalizeMIME(meta.MimeType)
	if declared == "image/jpg" {
		declared = "image/jpeg"
	}
	if declared != sniffed {
		return ErrPublicImageRejected
	}
	return nil
}

func normalizeMIME(mimeType string) string {
	normalized := strings.ToLower(strings.TrimSpace(mimeType))
	if semi := strings.IndexByte(normalized, ';'); semi >= 0 {
		normalized = strings.TrimSpace(normalized[:semi])
	}
	return normalized
}
