package storage

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const (
	maxFileBytes  int64 = 10 * 1024 * 1024 * 1024
	maxChunkBytes int64 = 16 * 1024 * 1024
)

type StorageService struct {
	Store     repository.StorageStore
	UploadDir string
}

func NewStorageService(store repository.StorageStore) *StorageService {
	uploadDir := "./uploads"
	resolvedDir, err := filepath.Abs(uploadDir)
	if err != nil {
		panic("failed to resolve upload directory")
	}
	if err := os.MkdirAll(resolvedDir, 0700); err != nil {
		panic("failed to create upload directory")
	}

	return &StorageService{
		Store:     store,
		UploadDir: resolvedDir,
	}
}

func (s *StorageService) InitializeUpload(userID uuid.UUID, fileName string, fileSize int64, mimeType string, fileHash string) (*models.FileMetadata, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	if fileSize <= 0 || fileSize > maxFileBytes {
		return nil, errors.New("invalid file size")
	}
	if len(fileName) == 0 || len(fileName) > 255 {
		return nil, errors.New("invalid file name")
	}
	if !validate.FixedHex(fileHash, 32) && !validate.FixedHex(fileHash, 64) {
		return nil, errors.New("invalid file hash")
	}

	fileID := uuid.New()
	fileDir, err := s.jailedPath(fileID.String())
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(fileDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create file directory: %w", err)
	}

	metadata := models.FileMetadata{
		FileID:   fileID,
		FileName: fileName,
		FileSize: fileSize,
		MimeType: mimeType,
		FileHash: fileHash,
		UserID:   userID,
		Status:   "pending",
		Path:     fileDir,
	}

	if err := s.Store.CreateFileMetadata(&metadata); err != nil {
		return nil, err
	}

	return &metadata, nil
}

func (s *StorageService) SaveChunk(userID uuid.UUID, fileID uuid.UUID, chunkIndex int, chunkHash string, fileHeader *multipart.FileHeader) error {
	if userID == uuid.Nil || fileID == uuid.Nil {
		return errors.New("invalid upload request")
	}
	if chunkIndex < 0 {
		return errors.New("invalid chunk index")
	}
	if !validate.FixedHex(chunkHash, 32) {
		return errors.New("invalid chunk hash")
	}

	metadata, err := s.Store.FindPendingFileForUser(fileID, userID)
	if err != nil {
		return errors.New("file not found or access denied")
	}

	chunkFileName := fmt.Sprintf("chunk_%05d.bin", chunkIndex)
	dstPath, err := s.jailedPath(metadata.FileID.String(), chunkFileName)
	if err != nil {
		return err
	}

	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer dst.Close()

	bytesWritten, err := io.Copy(dst, io.LimitReader(src, maxChunkBytes+1))
	if err != nil {
		_ = os.Remove(dstPath)
		return err
	}
	if bytesWritten == 0 || bytesWritten > maxChunkBytes {
		_ = os.Remove(dstPath)
		return errors.New("chunk size boundary violation")
	}

	chunkRecord := models.FileChunk{
		FileID:    metadata.FileID,
		Index:     chunkIndex,
		ChunkHash: chunkHash,
		ChunkSize: bytesWritten,
		MinioID:   chunkFileName,
	}

	return s.Store.CreateFileChunk(&chunkRecord)
}

func (s *StorageService) FinalizeUpload(fileID uuid.UUID, userID uuid.UUID) error {
	ok, err := s.Store.FinalizePendingUpload(fileID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("file not found or not authorized")
	}
	return nil
}

func (s *StorageService) jailedPath(parts ...string) (string, error) {
	base := filepath.Clean(s.UploadDir)
	joined := filepath.Join(append([]string{base}, parts...)...)
	resolved := filepath.Clean(joined)
	if resolved != base && !strings.HasPrefix(resolved, base+string(os.PathSeparator)) {
		return "", errors.New("path escaped upload jail")
	}
	return resolved, nil
}
