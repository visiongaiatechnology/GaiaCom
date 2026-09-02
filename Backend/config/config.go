// STATUS: DIAMANT VGT SUPREME
package config

import (
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"net"
	"os"
	"sort"
	"strconv"
	"strings"
)

type Config struct {
	ServerBindAddress string
	ServerPort        string
	DBDriver          string // "postgres" oder "sqlite"
	DBHost            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBPort            string
	DatabasePath      string
	MetricsToken      string
}

func LoadConfig() (*Config, error) {
	if err := ValidateProductionEnvironment(os.LookupEnv); err != nil {
		return nil, err
	}
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbPassword := getEnv("DB_PASSWORD", "")
	metricsToken := getEnv("GAIACOM_METRICS_TOKEN", "")

	return &Config{
		ServerBindAddress: getEnv("SERVER_BIND_ADDRESS", "127.0.0.1"),
		ServerPort:        getEnv("SERVER_PORT", "8080"),
		DBDriver:          dbDriver,
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBUser:            getEnv("DB_USER", "postgres"),
		DBPassword:        dbPassword,
		DBName:            getEnv("DB_NAME", "gaiacom"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DatabasePath:      getEnv("DB_PATH", "gaiacom.db"),
		MetricsToken:      metricsToken,
	}, nil
}

type EnvironmentValidationError struct {
	Problems []string
}

func (e *EnvironmentValidationError) Error() string {
	if e == nil || len(e.Problems) == 0 {
		return "production configuration is invalid"
	}
	return "production configuration is invalid: " + strings.Join(e.Problems, "; ")
}

func ValidateProductionEnvironment(lookup func(string) (string, bool)) error {
	if lookup == nil {
		return errors.New("environment lookup is required")
	}
	if environmentBoolean(lookup, "GAIACOM_DEV_MODE") {
		return nil
	}

	problems := make([]string, 0, 8)
	dbDriver := normalizedEnvironmentValue(lookup, "DB_DRIVER", "sqlite")
	if dbDriver != "sqlite" {
		problems = append(problems, "DB_DRIVER must be sqlite for this binary")
		if environmentValue(lookup, "DB_PASSWORD") == "" {
			problems = append(problems, "DB_PASSWORD must be set when DB_DRIVER is not sqlite")
		}
	}
	if len(environmentValue(lookup, "GAIACOM_METRICS_TOKEN")) < 32 {
		problems = append(problems, "GAIACOM_METRICS_TOKEN must contain at least 32 bytes")
	}
	jwtSecret := environmentValue(lookup, "GAIACOM_JWT_SECRET")
	if len(jwtSecret) < 32 {
		jwtSecret = environmentValue(lookup, "JWT_SECRET")
	}
	if len(jwtSecret) < 32 {
		problems = append(problems, "GAIACOM_JWT_SECRET must contain at least 32 bytes")
	}
	if len(environmentValue(lookup, "GAIACOM_SHIELD_SECRET")) < 32 {
		problems = append(problems, "GAIACOM_SHIELD_SECRET must contain at least 32 bytes")
	}
	serverName := strings.ToLower(environmentValue(lookup, "GAIACOM_SERVER_NAME"))
	if !ValidProductionServerName(serverName) {
		problems = append(problems, "GAIACOM_SERVER_NAME must be a valid fully-qualified DNS name")
	}
	privateKey, err := hex.DecodeString(environmentValue(lookup, "GAIACOM_SERVER_PRIVATE_KEY"))
	if err != nil || len(privateKey) != ed25519.PrivateKeySize {
		problems = append(problems, "GAIACOM_SERVER_PRIVATE_KEY must encode an Ed25519 private key")
	}
	trustSecret, err := hex.DecodeString(environmentValue(lookup, "GAIACOM_TRUSTMESH_EPOCH_SECRET"))
	if err != nil || len(trustSecret) != 32 {
		problems = append(problems, "GAIACOM_TRUSTMESH_EPOCH_SECRET must encode exactly 32 bytes")
	}
	serverBindAddress := normalizedEnvironmentValue(lookup, "SERVER_BIND_ADDRESS", "127.0.0.1")
	bindIP := net.ParseIP(serverBindAddress)
	if bindIP == nil || bindIP.IsMulticast() {
		problems = append(problems, "SERVER_BIND_ADDRESS must be a unicast IP literal")
	} else if bindIP.IsUnspecified() && !environmentBoolean(lookup, "GAIACOM_ALLOW_PUBLIC_BIND") {
		problems = append(problems, "unspecified SERVER_BIND_ADDRESS requires GAIACOM_ALLOW_PUBLIC_BIND=true")
	}
	serverPort := normalizedEnvironmentValue(lookup, "SERVER_PORT", "8080")
	port, err := strconv.Atoi(serverPort)
	if err != nil || port < 1 || port > 65535 {
		problems = append(problems, "SERVER_PORT must be between 1 and 65535")
	}
	if strings.TrimSpace(normalizedEnvironmentValue(lookup, "DB_PATH", "gaiacom.db")) == "" {
		problems = append(problems, "DB_PATH must not be empty")
	}
	if len(problems) == 0 {
		return nil
	}
	sort.Strings(problems)
	return &EnvironmentValidationError{Problems: problems}
}

func ValidProductionServerName(name string) bool {
	name = strings.ToLower(strings.TrimSpace(name))
	if len(name) > 253 || !strings.Contains(name, ".") || strings.HasSuffix(name, ".") {
		return false
	}
	for _, label := range strings.Split(name, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}
		for _, char := range label {
			if (char < 'a' || char > 'z') && (char < '0' || char > '9') && char != '-' {
				return false
			}
		}
	}
	return true
}

func environmentValue(lookup func(string) (string, bool), key string) string {
	value, _ := lookup(key)
	return strings.TrimSpace(value)
}

func normalizedEnvironmentValue(lookup func(string) (string, bool), key, fallback string) string {
	value, exists := lookup(key)
	if !exists || strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.ToLower(strings.TrimSpace(value))
}

func environmentBoolean(lookup func(string) (string, bool), key string) bool {
	value := strings.ToLower(environmentValue(lookup, key))
	return value == "1" || value == "true" || value == "yes"
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
