// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package storage

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalObjectStoreJailAndRoundTrip(t *testing.T) {
	root := t.TempDir()
	store, err := NewLocalObjectStore(root)
	if err != nil {
		t.Fatalf("NewLocalObjectStore failed: %v", err)
	}

	payload := []byte("encrypted chunk payload")
	written, err := store.Put(t.Context(), "file-a/chunk_00000.bin", bytes.NewReader(payload), 1024)
	if err != nil {
		t.Fatalf("Put failed: %v", err)
	}
	if written != int64(len(payload)) {
		t.Fatalf("expected %d bytes written, got %d", len(payload), written)
	}

	rc, err := store.Get(t.Context(), "file-a/chunk_00000.bin")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	readBack, err := io.ReadAll(rc)
	_ = rc.Close()
	if err != nil {
		t.Fatalf("ReadAll failed: %v", err)
	}
	if !bytes.Equal(readBack, payload) {
		t.Fatalf("round trip mismatch")
	}

	if _, err := os.Stat(filepath.Join(root, "file-a", "chunk_00000.bin")); err != nil {
		t.Fatalf("expected object on disk: %v", err)
	}
	if _, err := store.Put(t.Context(), "../escape.bin", bytes.NewReader(payload), 1024); err == nil {
		t.Fatal("expected traversal key to be rejected")
	}
	if _, err := store.Get(t.Context(), "../escape.bin"); err == nil {
		t.Fatal("expected traversal get to be rejected")
	}
}

func TestLocalObjectStoreRejectsOversizeAndDeletesPartial(t *testing.T) {
	root := t.TempDir()
	store, err := NewLocalObjectStore(root)
	if err != nil {
		t.Fatalf("NewLocalObjectStore failed: %v", err)
	}

	payload := bytes.Repeat([]byte{0x41}, 17)
	if _, err := store.Put(t.Context(), "file-b/chunk_00000.bin", bytes.NewReader(payload), 16); err == nil {
		t.Fatal("expected oversize object to be rejected")
	}
	if _, err := os.Stat(filepath.Join(root, "file-b", "chunk_00000.bin")); !os.IsNotExist(err) {
		t.Fatalf("oversize object must not remain on disk, stat err: %v", err)
	}
}
