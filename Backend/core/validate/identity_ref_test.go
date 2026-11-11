package validate

import "testing"

func TestNormalizeGaiaID(t *testing.T) {
	cases := []struct {
		name   string
		input  string
		want   string
		wantOK bool
	}{
		{name: "canonical colon form", input: "@operator:gaiacom.de", want: "@operator:gaiacom.de", wantOK: true},
		{name: "at separator", input: "operator@gaiacom.de", want: "@operator:gaiacom.de", wantOK: true},
		{name: "uppercase and whitespace", input: "  Operator@Gaiacom.DE  ", want: "@operator:gaiacom.de", wantOK: true},
		{name: "bare local part", input: "operator", want: "", wantOK: false},
		{name: "missing domain", input: "@operator:", want: "", wantOK: false},
		{name: "missing local", input: "@:gaiacom.de", want: "", wantOK: false},
		{name: "empty", input: "   ", want: "", wantOK: false},
		{name: "placeholder", input: "EnterYourGaiaComAddressHere", want: "", wantOK: false},
		{name: "too short local", input: "@op:gaiacom.de", want: "", wantOK: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := NormalizeGaiaID(tc.input)
			if ok != tc.wantOK || got != tc.want {
				t.Fatalf("NormalizeGaiaID(%q) = (%q, %v), want (%q, %v)", tc.input, got, ok, tc.want, tc.wantOK)
			}
		})
	}
}

func TestGaiaIDMatchesRequiresDomain(t *testing.T) {
	cases := []struct {
		name string
		a    string
		b    string
		want bool
	}{
		{name: "exact match", a: "@operator:gaiacom.de", b: "operator@gaiacom.de", want: true},
		{name: "case normalized", a: "@Operator:Gaiacom.DE", b: "operator@gaiacom.de", want: true},
		{name: "local part only vs foreign domain", a: "@operator:evil.example", b: "@operator:gaiacom.de", want: false},
		{name: "domain-less candidate never matches", a: "@operator:gaiacom.de", b: "operator", want: false},
		{name: "domain-less identity never matches", a: "operator", b: "@operator:gaiacom.de", want: false},
		{name: "both domain-less", a: "operator", b: "operator", want: false},
		{name: "empty", a: "", b: "", want: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := GaiaIDMatches(tc.a, tc.b); got != tc.want {
				t.Fatalf("GaiaIDMatches(%q, %q) = %v, want %v", tc.a, tc.b, got, tc.want)
			}
		})
	}
}

func TestGaiaIDInListIgnoresDomainLessCandidates(t *testing.T) {
	candidates := []string{"operator", "", "  ", "@backup:gaiacom.de"}
	if GaiaIDInList("@operator:gaiacom.de", candidates) {
		t.Fatal("domain-less candidate must not match a fully-qualified identity")
	}
	if !GaiaIDInList("@operator:gaiacom.de", []string{"Operator@GAIACOM.de"}) {
		t.Fatal("case-normalized fully-qualified candidate must match")
	}
	if GaiaIDInList("@operator:gaiacom.de", nil) {
		t.Fatal("empty candidate list must not match")
	}
	if !GaiaIDInList("@backup:gaiacom.de", candidates) {
		t.Fatal("fully-qualified candidate must match")
	}
}

func TestGaiaIDDomain(t *testing.T) {
	cases := []struct {
		input  string
		domain string
		ok     bool
	}{
		{input: "@alice:gaiacom.local", domain: "gaiacom.local", ok: true},
		{input: "alice@gaiacom.local", domain: "gaiacom.local", ok: true},
		{input: "@alice", domain: "", ok: false},
		{input: "alice", domain: "", ok: false},
	}
	for _, tc := range cases {
		domain, ok := GaiaIDDomain(tc.input)
		if ok != tc.ok || domain != tc.domain {
			t.Fatalf("GaiaIDDomain(%q) = (%q, %v), want (%q, %v)", tc.input, domain, ok, tc.domain, tc.ok)
		}
	}
}
