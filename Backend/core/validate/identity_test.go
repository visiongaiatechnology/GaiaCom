package validate

import "testing"

func TestGaiaID(t *testing.T) {
	cases := []struct {
		name string
		id   string
		ok   bool
	}{
		{name: "valid", id: "@alice:gaia.local", ok: true},
		{name: "missing prefix", id: "alice:gaia.local", ok: false},
		{name: "short local", id: "@al:gaia.local", ok: false},
		{name: "bad domain edge", id: "@alice:.local", ok: false},
		{name: "bad local char", id: "@ali ce:gaia.local", ok: false},
	}

	for _, tc := range cases {
		err := GaiaID(tc.id)
		if tc.ok && err != nil {
			t.Fatalf("%s: expected valid GaiaID, got %v", tc.name, err)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%s: expected invalid GaiaID", tc.name)
		}
	}
}

func TestFixedHex(t *testing.T) {
	if !FixedHex("001122aabbcc", 6) {
		t.Fatal("expected fixed hex to pass")
	}
	if FixedHex("001122aabbcg", 6) {
		t.Fatal("expected non-hex input to fail")
	}
	if FixedHex("001122aabb", 6) {
		t.Fatal("expected short input to fail")
	}
}

func TestDomain(t *testing.T) {
	if !Domain("gaia.local") {
		t.Fatal("expected domain to pass")
	}
	if Domain(".gaia.local") {
		t.Fatal("expected leading dot to fail")
	}
	if Domain("gaia local") {
		t.Fatal("expected space to fail")
	}
}
