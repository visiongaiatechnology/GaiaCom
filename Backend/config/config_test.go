// STATUS: DIAMANT VGT SUPREME
package config

import "testing"

func TestProductionConfigurationRequiresMetricsCredential(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "false")
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("GAIACOM_METRICS_TOKEN", "short")
	if _, err := LoadConfig(); err == nil {
		t.Fatal("production accepted a weak metrics credential")
	}
}

func TestDevelopmentConfigurationCanDisableMetrics(t *testing.T) {
	t.Setenv("GAIACOM_DEV_MODE", "true")
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("GAIACOM_METRICS_TOKEN", "")
	config, err := LoadConfig()
	if err != nil {
		t.Fatalf("load development configuration: %v", err)
	}
	if config.ServerPort == "" || config.DBDriver != "sqlite" {
		t.Fatalf("unexpected development configuration: %+v", config)
	}
}

func TestProductionRejectsUnapprovedPublicBind(t *testing.T) {
	valid := map[string]string{
		"GAIACOM_DEV_MODE":               "false",
		"DB_DRIVER":                      "sqlite",
		"DB_PATH":                        "/var/lib/gaiacom/gaiacom.db",
		"GAIACOM_METRICS_TOKEN":          "0123456789abcdef0123456789abcdef",
		"GAIACOM_JWT_SECRET":             "0123456789abcdef0123456789abcdef",
		"GAIACOM_SHIELD_SECRET":          "0123456789abcdef0123456789abcdef",
		"GAIACOM_SERVER_NAME":            "node.gaiacom.example",
		"GAIACOM_SERVER_PRIVATE_KEY":     "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
		"GAIACOM_TRUSTMESH_EPOCH_SECRET": "0000000000000000000000000000000000000000000000000000000000000000",
		"SERVER_BIND_ADDRESS":            "0.0.0.0",
		"SERVER_PORT":                    "8080",
	}
	lookup := func(key string) (string, bool) { value, exists := valid[key]; return value, exists }
	if err := ValidateProductionEnvironment(lookup); err == nil {
		t.Fatal("production accepted an unspecified bind address without explicit approval")
	}
	valid["GAIACOM_ALLOW_PUBLIC_BIND"] = "true"
	if err := ValidateProductionEnvironment(lookup); err != nil {
		t.Fatalf("explicitly approved public bind was rejected: %v", err)
	}
}
