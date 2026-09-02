// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMobileNodeRegistryOwnsOpaqueNodeHandles(t *testing.T) {
	root := mobileRegistryTestRoot(t)
	registry, err := NewMobileNodeRegistry(context.Background())
	if err != nil {
		t.Fatalf("create registry: %v", err)
	}
	t.Cleanup(func() { _ = registry.CloseAll() })

	handle, err := registry.Open(mobileRegistryBootstrap(t, root))
	if err != nil {
		t.Fatalf("open embedded node: %v", err)
	}
	if handle == 0 {
		t.Fatal("registry returned the reserved zero handle")
	}
	response, err := registry.Execute(context.Background(), handle, EmbeddedRequest{
		Method: http.MethodGet,
		Path:   "/livez",
	})
	if err != nil {
		t.Fatalf("execute liveness request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("unexpected liveness status: %d", response.StatusCode)
	}
	if err := registry.Close(handle); err != nil {
		t.Fatalf("close node: %v", err)
	}
	if _, err := registry.Execute(context.Background(), handle, EmbeddedRequest{
		Method: http.MethodGet,
		Path:   "/livez",
	}); err == nil {
		t.Fatal("closed handle accepted a request")
	}
}

func TestMobileNodeRegistryCloseAllIsIdempotentAndFinal(t *testing.T) {
	root := mobileRegistryTestRoot(t)
	registry, err := NewMobileNodeRegistry(context.Background())
	if err != nil {
		t.Fatalf("create registry: %v", err)
	}
	if _, err := registry.Open(mobileRegistryBootstrap(t, root)); err != nil {
		t.Fatalf("open embedded node: %v", err)
	}
	if err := registry.CloseAll(); err != nil {
		t.Fatalf("close all: %v", err)
	}
	if err := registry.CloseAll(); err != nil {
		t.Fatalf("second close all: %v", err)
	}
	if _, err := registry.Open(mobileRegistryBootstrap(t, root)); err == nil {
		t.Fatal("closed registry accepted another node")
	}
}

func TestMobileNodeBootstrapWipeClearsCallerMaterial(t *testing.T) {
	bootstrap := MobileNodeBootstrap{
		ServerPrivateKey:     bytesOf(64, 1),
		TrustMeshEpochSecret: bytesOf(32, 2),
		JWTSecret:            bytesOf(32, 3),
		ShieldSecret:         bytesOf(32, 4),
		MetricsToken:         bytesOf(32, 5),
	}
	bootstrap.Wipe()
	for name, material := range map[string][]byte{
		"private": bootstrap.ServerPrivateKey,
		"trust":   bootstrap.TrustMeshEpochSecret,
		"jwt":     bootstrap.JWTSecret,
		"shield":  bootstrap.ShieldSecret,
		"metrics": bootstrap.MetricsToken,
	} {
		for _, value := range material {
			if value != 0 {
				t.Fatalf("%s material was not wiped", name)
			}
		}
	}
}

func mobileRegistryBootstrap(t *testing.T, root string) MobileNodeBootstrap {
	t.Helper()
	_, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate server key: %v", err)
	}
	return MobileNodeBootstrap{
		DatabasePath:         filepath.Join(root, "mobile.db"),
		StorageRoot:          filepath.Join(root, "objects"),
		ServerName:           "device.test.gaiacom.local",
		ServerPrivateKey:     privateKey,
		TrustMeshEpochSecret: bytesOf(32, 11),
		JWTSecret:            bytesOf(32, 12),
		ShieldSecret:         bytesOf(32, 13),
		MetricsToken:         bytesOf(32, 14),
	}
}

func mobileRegistryTestRoot(t *testing.T) string {
	t.Helper()
	workingDirectory, err := filepath.Abs(".")
	if err != nil {
		t.Fatalf("resolve backend working directory: %v", err)
	}
	root, err := filepath.Abs(filepath.Join(".embedded-node-test-mobile", t.Name()))
	if err != nil {
		t.Fatalf("resolve mobile test root: %v", err)
	}
	relative, err := filepath.Rel(workingDirectory, root)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		t.Fatalf("mobile test root escaped backend workspace: %q", root)
	}
	if err := os.MkdirAll(root, 0o700); err != nil {
		t.Fatalf("create mobile test root: %v", err)
	}
	if err := os.Chmod(root, 0o700); err != nil {
		t.Fatalf("harden mobile test root: %v", err)
	}
	t.Cleanup(func() {
		if err := os.RemoveAll(root); err != nil {
			t.Errorf("remove mobile test root: %v", err)
		}
	})
	return root
}

func bytesOf(size int, value byte) []byte {
	result := make([]byte, size)
	for index := range result {
		result[index] = value
	}
	return result
}
