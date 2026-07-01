// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package governance

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadBootstrapConfigPrefersConfiguredOperatorListOverPlaceholder(t *testing.T) {
	oldCwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("get cwd: %v", err)
	}
	defer func() {
		_ = os.Chdir(oldCwd)
		BootstrapGaiaID = ""
		BootstrapGaiaIDs = nil
	}()

	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "Backend"), 0700); err != nil {
		t.Fatalf("mkdir Backend: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "Frontend", "frontend", "public"), 0700); err != nil {
		t.Fatalf("mkdir public: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "Backend", "governance.json"), []byte(`{"bootstrap_gaia_id":"EnterYourGaiaComAddressHere"}`), 0600); err != nil {
		t.Fatalf("write placeholder governance: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "Frontend", "frontend", "public", "governance.json"), []byte(`{"operators":[{"gaiaID":"operator@gaiacom.de"}]}`), 0600); err != nil {
		t.Fatalf("write public governance: %v", err)
	}
	if err := os.Chdir(root); err != nil {
		t.Fatalf("chdir: %v", err)
	}

	BootstrapGaiaID = ""
	BootstrapGaiaIDs = nil
	LoadBootstrapConfig()

	if BootstrapGaiaID != "operator@gaiacom.de" {
		t.Fatalf("bootstrap gaia id mismatch: %q", BootstrapGaiaID)
	}
	if len(BootstrapGaiaIDs) != 1 || BootstrapGaiaIDs[0] != "operator@gaiacom.de" {
		t.Fatalf("bootstrap gaia ids mismatch: %+v", BootstrapGaiaIDs)
	}
}
