// STATUS: DIAMANT VGT SUPREME
package buildinfo

import "testing"

func TestReleaseMetadataValidation(t *testing.T) {
	originalVersion, originalCommit, originalBuiltAt := Version, Commit, BuiltAt
	t.Cleanup(func() {
		Version, Commit, BuiltAt = originalVersion, originalCommit, originalBuiltAt
	})

	Version, Commit, BuiltAt = "2.0.0", "0123456789abcdef", "2026-07-15T01:00:00Z"
	if !IsRelease() {
		t.Fatal("expected valid release metadata")
	}

	for _, candidate := range []struct {
		version string
		commit  string
		builtAt string
	}{
		{"2.0.0-dev", "0123456789abcdef", "2026-07-15T01:00:00Z"},
		{"2.0.0-rc1", "0123456789abcdef", "2026-07-15T01:00:00Z"},
		{"2.0", "0123456789abcdef", "2026-07-15T01:00:00Z"},
		{"2.0.0", "unknown", "2026-07-15T01:00:00Z"},
		{"2.0.0", "not-a-commit", "2026-07-15T01:00:00Z"},
		{"2.0.0", "0123456789abcdef", "unknown"},
	} {
		Version, Commit, BuiltAt = candidate.version, candidate.commit, candidate.builtAt
		if IsRelease() {
			t.Fatalf("accepted invalid release metadata: %+v", candidate)
		}
	}
}
