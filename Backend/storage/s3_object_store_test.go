// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package storage

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestS3ObjectStoreSignsAndTransfersObjects(t *testing.T) {
	var saved []byte
	var sawPut bool
	var sawGet bool
	var sawDelete bool

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/gaiacom-test/vault/file-a/chunk_00000.bin" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("X-Amz-Date") != "20260102T030405Z" {
			t.Fatalf("unexpected x-amz-date: %s", r.Header.Get("X-Amz-Date"))
		}
		auth := r.Header.Get("Authorization")
		if !strings.Contains(auth, "Credential=AKIATEST/20260102/eu-central-1/s3/aws4_request") {
			t.Fatalf("authorization header missing credential scope: %s", auth)
		}
		if !strings.Contains(auth, "SignedHeaders=host;x-amz-content-sha256;x-amz-date") {
			t.Fatalf("authorization header missing signed headers: %s", auth)
		}

		switch r.Method {
		case http.MethodPut:
			sawPut = true
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("read put body: %v", err)
			}
			saved = body
			w.WriteHeader(http.StatusOK)
		case http.MethodGet:
			sawGet = true
			_, _ = w.Write(saved)
		case http.MethodDelete:
			sawDelete = true
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Fatalf("unexpected method: %s", r.Method)
		}
	}))
	defer server.Close()

	store := newTestS3Store(t, server.URL)
	payload := []byte("encrypted object payload")
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

	if err := store.Delete(t.Context(), "file-a/chunk_00000.bin"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if !sawPut || !sawGet || !sawDelete {
		t.Fatalf("expected put/get/delete requests, got put=%v get=%v delete=%v", sawPut, sawGet, sawDelete)
	}
}

func TestS3ObjectStoreRejectsOversizeBeforeNetwork(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	store := newTestS3Store(t, server.URL)
	if _, err := store.Put(t.Context(), "file-a/chunk_00000.bin", bytes.NewReader([]byte("too-large")), 3); err == nil {
		t.Fatal("expected oversize object to be rejected")
	}
	if requests.Load() != 0 {
		t.Fatalf("oversize object must not reach network, got %d requests", requests.Load())
	}
}

func TestS3ObjectStoreRejectsEscapedKeys(t *testing.T) {
	store := newTestS3Store(t, "http://127.0.0.1:9000")
	if _, err := store.Get(t.Context(), "../escape.bin"); err == nil {
		t.Fatal("expected traversal get key to be rejected")
	}
	if err := store.Delete(t.Context(), "/absolute.bin"); err == nil {
		t.Fatal("expected absolute delete key to be rejected")
	}
}

func TestS3ObjectStoreConfigValidation(t *testing.T) {
	if _, err := NewS3ObjectStore(S3ObjectStoreConfig{
		Endpoint:       "ftp://127.0.0.1:9000",
		Bucket:         "gaiacom-test",
		Region:         "eu-central-1",
		AccessKey:      "AKIATEST",
		SecretKey:      "secret",
		ForcePathStyle: true,
	}); err == nil {
		t.Fatal("expected invalid endpoint scheme to be rejected")
	}

	if _, err := NewS3ObjectStore(S3ObjectStoreConfig{
		Endpoint:       "http://127.0.0.1:9000",
		Bucket:         "../bad",
		Region:         "eu-central-1",
		AccessKey:      "AKIATEST",
		SecretKey:      "secret",
		ForcePathStyle: true,
	}); err == nil {
		t.Fatal("expected invalid bucket to be rejected")
	}

	if _, err := NewS3ObjectStore(S3ObjectStoreConfig{
		Endpoint:       "http://127.0.0.1:9000",
		Bucket:         "gaiacom-test",
		Region:         "eu-central-1",
		AccessKey:      "AKIATEST",
		SecretKey:      "secret",
		Prefix:         "../vault",
		ForcePathStyle: true,
	}); err == nil {
		t.Fatal("expected escaped prefix to be rejected")
	}
}

func newTestS3Store(t *testing.T, endpoint string) *S3ObjectStore {
	t.Helper()
	store, err := NewS3ObjectStore(S3ObjectStoreConfig{
		Endpoint:       endpoint,
		Bucket:         "gaiacom-test",
		Region:         "eu-central-1",
		AccessKey:      "AKIATEST",
		SecretKey:      "test-secret",
		Prefix:         "vault",
		ForcePathStyle: true,
	})
	if err != nil {
		t.Fatalf("NewS3ObjectStore failed: %v", err)
	}
	store.now = func() time.Time {
		return time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	}
	return store
}
