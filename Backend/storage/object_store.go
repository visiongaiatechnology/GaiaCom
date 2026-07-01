// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type ObjectStore interface {
	Put(ctx context.Context, key string, src io.Reader, maxBytes int64) (int64, error)
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) error
}

type LocalObjectStore struct {
	root string
}

func NewLocalObjectStore(root string) (*LocalObjectStore, error) {
	resolvedRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(resolvedRoot, 0700); err != nil {
		return nil, err
	}
	return &LocalObjectStore{root: filepath.Clean(resolvedRoot)}, nil
}

func (s *LocalObjectStore) Put(ctx context.Context, key string, src io.Reader, maxBytes int64) (int64, error) {
	if maxBytes <= 0 {
		return 0, errors.New("invalid object size limit")
	}
	dstPath, err := s.pathForKey(key)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(filepath.Dir(dstPath), 0700); err != nil {
		return 0, err
	}

	dst, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return 0, err
	}
	closed := false
	closeDst := func() {
		if !closed {
			_ = dst.Close()
			closed = true
		}
	}
	defer closeDst()

	written, err := copyWithContext(ctx, dst, io.LimitReader(src, maxBytes+1))
	if err != nil {
		closeDst()
		_ = os.Remove(dstPath)
		return 0, err
	}
	if written == 0 || written > maxBytes {
		closeDst()
		_ = os.Remove(dstPath)
		return 0, errors.New("object size boundary violation")
	}
	return written, nil
}

func (s *LocalObjectStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	path, err := s.pathForKey(key)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

func (s *LocalObjectStore) Delete(ctx context.Context, key string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	path, err := s.pathForKey(key)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *LocalObjectStore) DeletePrefix(ctx context.Context, prefix string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	path, err := s.pathForKey(prefix)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *LocalObjectStore) pathForKey(key string) (string, error) {
	cleanSlashKey, err := cleanObjectKey(key)
	if err != nil {
		return "", err
	}
	cleanKey := filepath.FromSlash(cleanSlashKey)
	if filepath.IsAbs(cleanKey) {
		return "", errors.New("object key escaped storage jail")
	}
	path := filepath.Clean(filepath.Join(s.root, cleanKey))
	if path != s.root && !strings.HasPrefix(path, s.root+string(os.PathSeparator)) {
		return "", errors.New("object key escaped storage jail")
	}
	return path, nil
}

func cleanObjectKey(key string) (string, error) {
	normalized := strings.ReplaceAll(strings.TrimSpace(key), "\\", "/")
	cleanKey := path.Clean(normalized)
	if cleanKey == "." || cleanKey == "" || cleanKey == ".." || strings.HasPrefix(cleanKey, "../") || strings.HasPrefix(cleanKey, "/") {
		return "", errors.New("object key escaped storage jail")
	}
	return cleanKey, nil
}

func copyWithContext(ctx context.Context, dst io.Writer, src io.Reader) (int64, error) {
	buffer := make([]byte, 128*1024)
	var written int64
	for {
		select {
		case <-ctx.Done():
			return written, ctx.Err()
		default:
		}
		nr, er := src.Read(buffer)
		if nr > 0 {
			nw, ew := dst.Write(buffer[:nr])
			if nw > 0 {
				written += int64(nw)
			}
			if ew != nil {
				return written, ew
			}
			if nr != nw {
				return written, io.ErrShortWrite
			}
		}
		if er != nil {
			if errors.Is(er, io.EOF) {
				return written, nil
			}
			return written, er
		}
	}
}
