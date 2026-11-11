package governance

import (
	"os"
	"path/filepath"
	"testing"
)

func resetBootstrapGlobals() {
	BootstrapGaiaID = ""
	BootstrapGaiaIDs = nil
}

func writeGovernanceFile(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "governance.json")
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		t.Fatalf("write governance file: %v", err)
	}
	return path
}

func TestLoadBootstrapConfigRejectsDomainLessEntries(t *testing.T) {
	defer resetBootstrapGlobals()
	resetBootstrapGlobals()
	t.Setenv("GAIACOM_GOVERNANCE_CONFIG", writeGovernanceFile(t,
		`{"bootstrap_gaia_id":"operator","operators":[{"gaiaID":"backup@gaiacom.de"}]}`))

	LoadBootstrapConfig()

	if len(BootstrapGaiaIDs) != 1 || BootstrapGaiaIDs[0] != "@backup:gaiacom.de" {
		t.Fatalf("domain-less bootstrap entry must be rejected, got %+v", BootstrapGaiaIDs)
	}
	if BootstrapGaiaID != "@backup:gaiacom.de" {
		t.Fatalf("bootstrap gaia id mismatch: %q", BootstrapGaiaID)
	}
}

func TestLoadBootstrapConfigNormalizesFullyQualifiedIDs(t *testing.T) {
	defer resetBootstrapGlobals()
	resetBootstrapGlobals()
	t.Setenv("GAIACOM_GOVERNANCE_CONFIG", writeGovernanceFile(t,
		`{"bootstrap_gaia_id":"Operator@GAIACOM.de","bootstrap_gaia_ids":["second@gaiacom.de"],"operators":[{"gaiaID":"third@gaiacom.de"}]}`))

	LoadBootstrapConfig()

	want := []string{"@operator:gaiacom.de", "@second:gaiacom.de", "@third:gaiacom.de"}
	if len(BootstrapGaiaIDs) != len(want) {
		t.Fatalf("bootstrap gaia ids mismatch: %+v", BootstrapGaiaIDs)
	}
	for i := range want {
		if BootstrapGaiaIDs[i] != want[i] {
			t.Fatalf("bootstrap gaia ids mismatch: got %+v want %+v", BootstrapGaiaIDs, want)
		}
	}
}

func TestLoadBootstrapConfigDomainLessOnlyGrantsNothing(t *testing.T) {
	defer resetBootstrapGlobals()
	resetBootstrapGlobals()
	t.Setenv("GAIACOM_GOVERNANCE_CONFIG", writeGovernanceFile(t,
		`{"bootstrap_gaia_id":"operator","operators":[{"gaiaID":"sysadmin"}]}`))

	LoadBootstrapConfig()

	if BootstrapGaiaID != "" || len(BootstrapGaiaIDs) != 0 {
		t.Fatalf("domain-less-only config must grant no role, got %q/%+v", BootstrapGaiaID, BootstrapGaiaIDs)
	}
}
