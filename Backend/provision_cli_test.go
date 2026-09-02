// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestSetupAndDoctorCommandsCreateIdempotentOpaqueConfiguration(t *testing.T) {
	root := t.TempDir()
	configPath := filepath.Join(root, "config", "gaiacom.env")
	databasePath := filepath.Join(root, "data", "gaiacom.db")
	arguments := []string{
		"setup",
		"--server-name", "node.example.org",
		"--config", configPath,
		"--db-path", databasePath,
		"--port", "8080",
	}
	var stdout, stderr bytes.Buffer
	if err := execute(arguments, &stdout, &stderr); err != nil {
		t.Fatalf("run setup: %v stderr=%s", err, stderr.String())
	}
	firstContents, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read generated configuration: %v", err)
	}
	for _, key := range []string{
		"GAIACOM_JWT_SECRET",
		"GAIACOM_METRICS_TOKEN",
		"GAIACOM_SERVER_PRIVATE_KEY",
		"GAIACOM_SHIELD_SECRET",
		"GAIACOM_TRUSTMESH_EPOCH_SECRET",
	} {
		pattern := regexp.MustCompile(`(?m)^` + regexp.QuoteMeta(key) + `="([^"]+)"$`)
		match := pattern.FindSubmatch(firstContents)
		if len(match) != 2 || len(match[1]) < 32 {
			t.Fatalf("generated %s is missing or weak", key)
		}
		if strings.Contains(stdout.String(), string(match[1])) || strings.Contains(stderr.String(), string(match[1])) {
			t.Fatalf("setup exposed %s in command output", key)
		}
	}

	stdout.Reset()
	stderr.Reset()
	if err := execute(arguments, &stdout, &stderr); err != nil {
		t.Fatalf("rerun setup: %v stderr=%s", err, stderr.String())
	}
	secondContents, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read idempotent configuration: %v", err)
	}
	if !bytes.Equal(firstContents, secondContents) {
		t.Fatal("idempotent setup rotated or reordered production configuration")
	}

	stdout.Reset()
	stderr.Reset()
	if err := execute([]string{"doctor", "--config", configPath}, &stdout, &stderr); err != nil {
		t.Fatalf("run doctor: %v stderr=%s", err, stderr.String())
	}
	if !strings.Contains(stdout.String(), "healthy") {
		t.Fatalf("doctor did not report success: %s", stdout.String())
	}
}

func TestSetupRefusesToRotateInvalidExistingSecret(t *testing.T) {
	root := t.TempDir()
	configPath := filepath.Join(root, "gaiacom.env")
	contents := "GAIACOM_SERVER_NAME=\"node.example.org\"\nGAIACOM_JWT_SECRET=\"weak\"\n"
	if err := os.WriteFile(configPath, []byte(contents), 0o600); err != nil {
		t.Fatalf("write invalid configuration: %v", err)
	}
	var stdout, stderr bytes.Buffer
	err := execute([]string{
		"setup",
		"--server-name", "node.example.org",
		"--config", configPath,
		"--db-path", filepath.Join(root, "data", "gaiacom.db"),
	}, &stdout, &stderr)
	if err == nil || !strings.Contains(err.Error(), "refusing automatic rotation") {
		t.Fatalf("invalid existing secret was silently rotated: %v", err)
	}
	after, readErr := os.ReadFile(configPath)
	if readErr != nil {
		t.Fatalf("read rejected configuration: %v", readErr)
	}
	if string(after) != contents {
		t.Fatal("rejected setup modified the existing configuration")
	}
}
