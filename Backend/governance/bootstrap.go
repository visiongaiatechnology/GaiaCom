// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package governance

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type BootstrapConfig struct {
	BootstrapGaiaID string `json:"bootstrap_gaia_id"`
	Operators       []struct {
		GaiaID string `json:"gaiaID"`
	} `json:"operators"`
}

var (
	BootstrapGaiaID  = ""
	BootstrapGaiaIDs = []string{}
)

func LoadBootstrapConfig() {
	path := resolveBootstrapConfigPath()

	if _, err := os.Stat(path); os.IsNotExist(err) {
		config := BootstrapConfig{
			BootstrapGaiaID: "EnterYourGaiaComAddressHere",
		}
		data, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			log.Printf("[Governance] Error marshaling default bootstrap config: %v", err)
			return
		}
		err = os.WriteFile(path, data, 0600)
		if err != nil {
			log.Printf("[Governance] Error creating governance.json: %v", err)
			return
		}
		log.Printf("[Governance] Created governance.json with 0600 permissions. Please fill it with your bootstrap user.")
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("[Governance] Error reading governance.json: %v", err)
		return
	}

	if info, err := os.Stat(path); err == nil {
		mode := info.Mode()
		if mode&0077 != 0 {
			log.Printf("[Governance] WARNING: governance.json has insecure permissions (%04o). It is recommended to restrict access to 0600.", mode)
		}
	}

	var config BootstrapConfig
	if err := json.Unmarshal(data, &config); err != nil {
		log.Printf("[Governance] Error unmarshaling governance.json: %v", err)
		return
	}

	bootstrapIDs := make([]string, 0, 1+len(config.Operators))
	if gaiaID := strings.TrimSpace(config.BootstrapGaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
		bootstrapIDs = append(bootstrapIDs, gaiaID)
	}
	for _, operator := range config.Operators {
		if gaiaID := strings.TrimSpace(operator.GaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
			bootstrapIDs = append(bootstrapIDs, gaiaID)
		}
	}

	if len(bootstrapIDs) > 0 {
		BootstrapGaiaIDs = uniqueBootstrapIDs(bootstrapIDs)
		BootstrapGaiaID = BootstrapGaiaIDs[0]
		log.Printf("[Governance] Bootstrapping node with Admin/Node Operator(s): (%s)", strings.Join(BootstrapGaiaIDs, ", "))
	} else {
		log.Printf("[Governance] No bootstrap user configured in governance.json. Node operator role will not be auto-assigned.")
	}
}

func resolveBootstrapConfigPath() string {
	if explicit := strings.TrimSpace(os.Getenv("GAIACOM_GOVERNANCE_CONFIG")); explicit != "" {
		return explicit
	}

	candidates := []string{
		"governance.json",
		filepath.Join("Backend", "governance.json"),
		filepath.Join("public", "governance.json"),
		filepath.Join("Frontend", "frontend", "public", "governance.json"),
	}
	firstExisting := ""
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			if firstExisting == "" {
				firstExisting = candidate
			}
			if bootstrapConfigIsConfigured(candidate) {
				return candidate
			}
		}
	}
	if firstExisting != "" {
		return firstExisting
	}
	return "governance.json"
}

func bootstrapConfigIsConfigured(path string) bool {
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var config BootstrapConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return false
	}
	if gaiaID := strings.TrimSpace(config.BootstrapGaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
		return true
	}
	for _, operator := range config.Operators {
		if gaiaID := strings.TrimSpace(operator.GaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
			return true
		}
	}
	return false
}

func uniqueBootstrapIDs(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		clean := strings.TrimSpace(value)
		key := strings.ToLower(clean)
		if clean == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, clean)
	}
	return result
}
