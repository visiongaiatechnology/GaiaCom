// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"bytes"
	"strings"
	"testing"
)

func TestGeneratedDeviceSecretsAreValidIndependentAndClosable(t *testing.T) {
	first, err := GenerateDeviceSecrets()
	if err != nil {
		t.Fatalf("generate first device secrets: %v", err)
	}
	defer first.Close()
	second, err := GenerateDeviceSecrets()
	if err != nil {
		t.Fatalf("generate second device secrets: %v", err)
	}
	defer second.Close()

	if !strings.HasPrefix(first.ServerName(), "device-") || !strings.HasSuffix(first.ServerName(), ".gaiacom.local") {
		t.Fatalf("generated server name is invalid: %q", first.ServerName())
	}
	if first.ServerName() == second.ServerName() || bytes.Equal(first.ServerPrivateKey(), second.ServerPrivateKey()) {
		t.Fatal("independent device bootstrap generated duplicate identity material")
	}
	if len(first.ServerPrivateKey()) != 64 || len(first.TrustMeshEpochSecret()) != 32 ||
		len(first.JWTSecret()) != 32 || len(first.ShieldSecret()) != 32 || len(first.MetricsToken()) != 32 {
		t.Fatal("generated device bootstrap has invalid field lengths")
	}
	copyOfKey := first.ServerPrivateKey()
	copyOfKey[0] ^= 0xff
	if bytes.Equal(copyOfKey, first.ServerPrivateKey()) {
		t.Fatal("device secret getter exposed mutable internal memory")
	}
	first.Close()
	if first.ServerName() != "" || first.ServerPrivateKey() != nil {
		t.Fatal("closed device secrets retained accessible identity material")
	}
}
