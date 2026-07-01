// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package uuid

import (
	"encoding/json"
	"testing"
)

func TestNewCreatesVersion4VariantUUID(t *testing.T) {
	value := New()
	if value == Nil {
		t.Fatal("New returned Nil")
	}
	if got := value[6] >> 4; got != 4 {
		t.Fatalf("wrong UUID version: %d", got)
	}
	if got := value[8] >> 6; got != 2 {
		t.Fatalf("wrong UUID variant: %d", got)
	}
}

func TestParseRoundTrip(t *testing.T) {
	input := "00112233-4455-6677-8899-aabbccddeeff"
	value, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}
	if value.String() != input {
		t.Fatalf("round trip mismatch: %s", value.String())
	}
}

func TestJSONRoundTrip(t *testing.T) {
	original := New()
	encoded, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var decoded UUID
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if decoded != original {
		t.Fatal("decoded UUID does not match original")
	}
}
