// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/ed25519"
	"crypto/rand"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMobileAPIExecutesEmbeddedNodeWithoutListener(t *testing.T) {
	bootstrap := newTestBootstrap(t)
	node, err := OpenNode(bootstrap)
	if err != nil {
		t.Fatalf("open mobile node: %v", err)
	}
	t.Cleanup(func() { _ = node.Close() })

	response, err := node.Execute("GET", "/livez", "{}", nil)
	if err != nil {
		t.Fatalf("execute liveness request: %v", err)
	}
	defer response.Close()
	if response.StatusCode() != 200 {
		t.Fatalf("unexpected liveness status: %d", response.StatusCode())
	}
	if !strings.Contains(string(response.Body()), `"status":"alive"`) {
		t.Fatalf("unexpected liveness body: %s", response.Body())
	}
}

func TestMobileAPIRejectsBridgeAttacksAndClosedNodes(t *testing.T) {
	node, err := OpenNode(newTestBootstrap(t))
	if err != nil {
		t.Fatalf("open mobile node: %v", err)
	}
	if _, err := node.Execute("GET", "https://attacker.invalid/livez", "{}", nil); err == nil {
		t.Fatal("absolute request URL was accepted")
	}
	if _, err := node.Execute("GET", "/livez", `{"Authorization":"ok\r\nInjected: yes"}`, nil); err == nil {
		t.Fatal("header line break was accepted")
	}
	if err := node.Close(); err != nil {
		t.Fatalf("close mobile node: %v", err)
	}
	if _, err := node.Execute("GET", "/livez", "{}", nil); err == nil {
		t.Fatal("closed mobile node accepted a request")
	}
}

func TestResponseBodyIsDefensivelyCopied(t *testing.T) {
	node, err := OpenNode(newTestBootstrap(t))
	if err != nil {
		t.Fatalf("open mobile node: %v", err)
	}
	t.Cleanup(func() { _ = node.Close() })
	response, err := node.Execute("GET", "/livez", "{}", nil)
	if err != nil {
		t.Fatalf("execute request: %v", err)
	}
	first := response.Body()
	first[0] ^= 0xff
	if string(first) == string(response.Body()) {
		t.Fatal("response exposed mutable internal body")
	}
	response.Close()
}

func TestGeneratedZeroValueProxiesFailClosed(t *testing.T) {
	zeroNode := &Node{}
	if _, err := zeroNode.Execute("GET", "/livez", "{}", nil); err == nil {
		t.Fatal("zero-value node proxy accepted a request")
	}
	if err := zeroNode.Close(); err != nil {
		t.Fatalf("zero-value node close must remain idempotent: %v", err)
	}
	zeroResponse := &Response{}
	if zeroResponse.StatusCode() != 0 || zeroResponse.HeadersJSON() != "" || zeroResponse.Body() != nil {
		t.Fatal("zero-value response exposed an initialized state")
	}
	zeroResponse.Close()
}

func TestBootstrapIsSingleUse(t *testing.T) {
	bootstrap := newTestBootstrap(t)
	node, err := OpenNode(bootstrap)
	if err != nil {
		t.Fatalf("open first node: %v", err)
	}
	t.Cleanup(func() { _ = node.Close() })
	if _, err := OpenNode(bootstrap); err == nil {
		t.Fatal("consumed bootstrap initialized a second node")
	}
}

func newTestBootstrap(t *testing.T) *Bootstrap {
	t.Helper()
	root := mobileAPITestRoot(t)
	_, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate test key: %v", err)
	}
	bootstrap, err := NewBootstrap(
		filepath.Join(root, "mobile-api.db"),
		filepath.Join(root, "objects"),
		"device.test.gaiacom.local",
		privateKey,
		filled(32, 1),
		filled(32, 2),
		filled(32, 3),
		filled(32, 4),
	)
	if err != nil {
		t.Fatalf("create bootstrap: %v", err)
	}
	return bootstrap
}

func mobileAPITestRoot(t *testing.T) string {
	t.Helper()
	workingDirectory, err := filepath.Abs("..")
	if err != nil {
		t.Fatalf("resolve backend root: %v", err)
	}
	root := filepath.Join(workingDirectory, ".embedded-node-test-mobileapi", sanitizeTestName(t.Name()))
	relative, err := filepath.Rel(workingDirectory, root)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		t.Fatalf("mobile API test root escaped backend workspace")
	}
	if err := os.MkdirAll(root, 0o700); err != nil {
		t.Fatalf("create test root: %v", err)
	}
	t.Cleanup(func() {
		if err := os.RemoveAll(root); err != nil {
			t.Errorf("remove test root: %v", err)
		}
	})
	return root
}

func sanitizeTestName(value string) string {
	return strings.NewReplacer("/", "_", "\\", "_", ":", "_").Replace(value)
}

func filled(size int, value byte) []byte {
	result := make([]byte, size)
	for index := range result {
		result[index] = value
	}
	return result
}
