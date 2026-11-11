package governance

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gaiacom/backend/core/validate"
)

type BootstrapConfig struct {
	BootstrapGaiaID string `json:"bootstrap_gaia_id"`
	// BootstrapGaiaIDs is an optional additive list for fleets. Every entry is
	// validated with the same fail-closed rule as bootstrap_gaia_id.
	BootstrapGaiaIDs []string `json:"bootstrap_gaia_ids"`
	Operators        []struct {
		GaiaID string `json:"gaiaID"`
	} `json:"operators"`
}

var (
	BootstrapGaiaID  = ""
	BootstrapGaiaIDs = []string{}
)

// LoadBootstrapConfig loads the bootstrap operator identities. Fail-closed:
// every entry must be a fully-qualified GaiaID (local part AND domain). Entries
// without a domain are rejected at load time with a loud SECURITY log and never
// grant a role; the node still boots, so the operator can repair the config.
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

	rawIDs := make([]string, 0, 2+len(config.BootstrapGaiaIDs)+len(config.Operators))
	if gaiaID := strings.TrimSpace(config.BootstrapGaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
		rawIDs = append(rawIDs, gaiaID)
	}
	for _, gaiaID := range config.BootstrapGaiaIDs {
		if gaiaID = strings.TrimSpace(gaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
			rawIDs = append(rawIDs, gaiaID)
		}
	}
	for _, operator := range config.Operators {
		if gaiaID := strings.TrimSpace(operator.GaiaID); gaiaID != "" && gaiaID != "EnterYourGaiaComAddressHere" {
			rawIDs = append(rawIDs, gaiaID)
		}
	}

	bootstrapIDs := make([]string, 0, len(rawIDs))
	for _, gaiaID := range rawIDs {
		normalized, ok := validate.NormalizeGaiaID(gaiaID)
		if !ok {
			// Fail closed: never grant a role for a domain-less/malformed entry.
			log.Printf("[Governance] SECURITY: ignoring bootstrap identity without an explicit domain: %q (fix governance.json; no role was granted)", gaiaID)
			continue
		}
		bootstrapIDs = append(bootstrapIDs, normalized)
	}

	if len(bootstrapIDs) > 0 {
		BootstrapGaiaIDs = uniqueBootstrapIDs(bootstrapIDs)
		BootstrapGaiaID = BootstrapGaiaIDs[0]
		log.Printf("[Governance] Bootstrapping node with Admin/Node Operator(s): (%s)", strings.Join(BootstrapGaiaIDs, ", "))
	} else {
		BootstrapGaiaID = ""
		BootstrapGaiaIDs = nil
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
	values := make([]string, 0, 2+len(config.BootstrapGaiaIDs)+len(config.Operators))
	values = append(values, config.BootstrapGaiaID)
	values = append(values, config.BootstrapGaiaIDs...)
	for _, operator := range config.Operators {
		values = append(values, operator.GaiaID)
	}
	for _, value := range values {
		if _, ok := validate.NormalizeGaiaID(value); ok {
			return true
		}
	}
	return false
}

// bootstrapIdentityRefs returns the normalized bootstrap identity list used by
// role checks. Only fully-qualified entries can be present (loader rejects the
// rest and the helper itself fails closed for malformed candidates).
func bootstrapIdentityRefs() []string {
	refs := make([]string, 0, 1+len(BootstrapGaiaIDs))
	if BootstrapGaiaID != "" {
		refs = append(refs, BootstrapGaiaID)
	}
	refs = append(refs, BootstrapGaiaIDs...)
	return refs
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
