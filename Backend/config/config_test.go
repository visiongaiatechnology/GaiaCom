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
