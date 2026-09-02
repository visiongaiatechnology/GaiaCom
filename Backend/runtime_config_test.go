// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"strings"
	"testing"

	"gaiacom/backend/auth"
)

const testServerPrivateKey = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"

func TestLoadRouteIdentityAcceptsCompleteProductionIdentity(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "false")
	t.Setenv("GAIACOM_SERVER_NAME", "node.example.org")
	t.Setenv("GAIACOM_SERVER_PRIVATE_KEY", testServerPrivateKey)
	t.Setenv("GAIACOM_TRUSTMESH_EPOCH_SECRET", strings.Repeat("42", 32))

	name, privateKey, trustSecret, err := loadRouteIdentity()
	if err != nil {
		t.Fatalf("load production route identity: %v", err)
	}
	if name != "node.example.org" || len(privateKey) != 64 || len(trustSecret) != 32 {
		t.Fatalf("invalid production route identity: name=%q key=%d trust=%d", name, len(privateKey), len(trustSecret))
	}
}

func TestDefaultRouteOriginsExcludeDevelopmentAndWebOriginsInProduction(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "false")
	origins := defaultAllowOrigins()

	for _, required := range []string{auth.TauriAppOrigin, auth.TauriHTTPOrigin} {
		if !containsExactString(origins, required) {
			t.Fatalf("production origin allowlist missing %q: %#v", required, origins)
		}
	}
	for _, forbidden := range []string{"http://localhost:3000", "http://localhost:1420", "https://app.gaiacom.net", "https://appassets.androidplatform.net"} {
		if containsExactString(origins, forbidden) {
			t.Fatalf("production origin allowlist contains %q: %#v", forbidden, origins)
		}
	}
}

func TestDefaultRouteOriginsEnableLocalhostOnlyInDevelopment(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	origins := defaultAllowOrigins()
	for _, required := range []string{"http://localhost:3000", "http://localhost:1420"} {
		if !containsExactString(origins, required) {
			t.Fatalf("development origin allowlist missing %q: %#v", required, origins)
		}
	}
}

func containsExactString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func TestLoadRouteIdentityRejectsIncompleteProductionIdentity(t *testing.T) {
	for _, testCase := range []struct {
		name        string
		serverName  string
		privateKey  string
		trustSecret string
	}{
		{"missing server name", "", testServerPrivateKey, strings.Repeat("42", 32)},
		{"non-fqdn server name", "localhost", testServerPrivateKey, strings.Repeat("42", 32)},
		{"scheme in server name", "https://node.example.org", testServerPrivateKey, strings.Repeat("42", 32)},
		{"invalid private key", "node.example.org", "00", strings.Repeat("42", 32)},
		{"missing trust secret", "node.example.org", testServerPrivateKey, ""},
		{"invalid trust secret", "node.example.org", testServerPrivateKey, "abcd"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			t.Setenv("GAIACOM_DEV_MODE", "false")
			t.Setenv("GAIACOM_SERVER_NAME", testCase.serverName)
			t.Setenv("GAIACOM_SERVER_PRIVATE_KEY", testCase.privateKey)
			t.Setenv("GAIACOM_TRUSTMESH_EPOCH_SECRET", testCase.trustSecret)
			if _, _, _, err := loadRouteIdentity(); err == nil {
				t.Fatalf("accepted incomplete production identity: %+v", testCase)
			}
		})
	}
}

func TestProductionServerNameValidation(t *testing.T) {
	valid := []string{"node.example.org", "eu-west-1.node.example"}
	invalid := []string{"", "localhost", "node.example.org.", "-node.example.org", "node_.example.org", "node..example.org"}
	for _, name := range valid {
		if !validProductionServerName(name) {
			t.Fatalf("rejected valid server name %q", name)
		}
	}
	for _, name := range invalid {
		if validProductionServerName(name) {
			t.Fatalf("accepted invalid server name %q", name)
		}
	}
}
