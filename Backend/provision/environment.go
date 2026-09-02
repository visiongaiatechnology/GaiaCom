// STATUS: DIAMANT VGT SUPREME
package provision

import (
	"bufio"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"

	"gaiacom/backend/config"
)

const maximumEnvironmentFileBytes = 1 << 20

var environmentKeyPattern = regexp.MustCompile(`^[A-Z][A-Z0-9_]*$`)

type SetupOptions struct {
	ServerName   string
	ConfigPath   string
	DatabasePath string
	ServerPort   string
}

type SetupResult struct {
	ConfigPath   string
	DatabasePath string
	Created      bool
}

type DoctorReport struct {
	ConfigPath   string
	DatabasePath string
	Checks       []string
}

func Setup(options SetupOptions) (SetupResult, error) {
	serverName := strings.ToLower(strings.TrimSpace(options.ServerName))
	if !config.ValidProductionServerName(serverName) {
		return SetupResult{}, errors.New("server name must be a valid fully-qualified DNS name")
	}
	configPath, err := normalizeFilesystemPath(options.ConfigPath, "configuration")
	if err != nil {
		return SetupResult{}, err
	}
	databasePath, err := normalizeFilesystemPath(options.DatabasePath, "database")
	if err != nil {
		return SetupResult{}, err
	}
	serverPort := strings.TrimSpace(options.ServerPort)
	if serverPort == "" {
		serverPort = "8080"
	}
	port, err := strconv.Atoi(serverPort)
	if err != nil || port < 1 || port > 65535 {
		return SetupResult{}, errors.New("server port must be between 1 and 65535")
	}

	values, existed, err := readExistingEnvironment(configPath)
	if err != nil {
		return SetupResult{}, err
	}
	if existingName := strings.ToLower(strings.TrimSpace(values["GAIACOM_SERVER_NAME"])); existingName != "" && existingName != serverName {
		return SetupResult{}, errors.New("existing configuration belongs to a different server name")
	}
	if driver := strings.ToLower(strings.TrimSpace(values["DB_DRIVER"])); driver != "" && driver != "sqlite" {
		return SetupResult{}, errors.New("existing configuration uses a database driver unsupported by this binary")
	}
	if err := validateExistingSecrets(values); err != nil {
		return SetupResult{}, err
	}

	values["GAIACOM_DEV_MODE"] = "false"
	values["GAIACOM_SERVER_NAME"] = serverName
	values["DB_DRIVER"] = "sqlite"
	values["GAIACOM_COOKIE_SECURE"] = "true"
	if strings.TrimSpace(values["DB_PATH"]) == "" {
		values["DB_PATH"] = databasePath
	}
	if strings.TrimSpace(values["SERVER_PORT"]) == "" {
		values["SERVER_PORT"] = serverPort
	}
	if strings.TrimSpace(values["OPEN_REGISTRATION"]) == "" {
		values["OPEN_REGISTRATION"] = "false"
	}
	if strings.TrimSpace(values["GAIACOM_JWT_SECRET"]) == "" && len(values["JWT_SECRET"]) >= 32 {
		values["GAIACOM_JWT_SECRET"] = values["JWT_SECRET"]
	}
	if strings.TrimSpace(values["GAIACOM_SERVER_PRIVATE_KEY"]) == "" {
		_, privateKey, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return SetupResult{}, fmt.Errorf("generate server identity: %w", err)
		}
		values["GAIACOM_SERVER_PRIVATE_KEY"] = hex.EncodeToString(privateKey)
	}
	for _, key := range []string{
		"GAIACOM_JWT_SECRET",
		"GAIACOM_METRICS_TOKEN",
		"GAIACOM_SHIELD_SECRET",
		"GAIACOM_TRUSTMESH_EPOCH_SECRET",
	} {
		if strings.TrimSpace(values[key]) != "" {
			continue
		}
		secret, err := randomHexSecret(32)
		if err != nil {
			return SetupResult{}, fmt.Errorf("generate %s: %w", key, err)
		}
		values[key] = secret
	}
	if err := config.ValidateProductionEnvironment(mapLookup(values)); err != nil {
		return SetupResult{}, fmt.Errorf("validate generated configuration: %w", err)
	}
	effectiveDatabasePath, err := normalizeFilesystemPath(values["DB_PATH"], "database")
	if err != nil {
		return SetupResult{}, err
	}
	values["DB_PATH"] = effectiveDatabasePath
	if err := secureDirectory(filepath.Dir(effectiveDatabasePath)); err != nil {
		return SetupResult{}, fmt.Errorf("prepare database directory: %w", err)
	}
	if err := writeEnvironmentAtomically(configPath, values); err != nil {
		return SetupResult{}, err
	}
	return SetupResult{
		ConfigPath:   configPath,
		DatabasePath: effectiveDatabasePath,
		Created:      !existed,
	}, nil
}

func Doctor(configPath string) (DoctorReport, error) {
	normalizedPath, err := normalizeFilesystemPath(configPath, "configuration")
	if err != nil {
		return DoctorReport{}, err
	}
	info, err := os.Lstat(normalizedPath)
	if err != nil {
		return DoctorReport{}, fmt.Errorf("inspect configuration file: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
		return DoctorReport{}, errors.New("configuration must be a regular non-symlink file")
	}
	if runtime.GOOS != "windows" && info.Mode().Perm()&0o077 != 0 {
		return DoctorReport{}, errors.New("configuration permissions must not grant group or world access")
	}
	values, err := readEnvironmentFile(normalizedPath)
	if err != nil {
		return DoctorReport{}, err
	}
	if err := config.ValidateProductionEnvironment(mapLookup(values)); err != nil {
		return DoctorReport{}, err
	}
	databasePath, err := normalizeFilesystemPath(values["DB_PATH"], "database")
	if err != nil {
		return DoctorReport{}, err
	}
	databaseDirectory := filepath.Dir(databasePath)
	directoryInfo, err := os.Lstat(databaseDirectory)
	if err != nil {
		return DoctorReport{}, fmt.Errorf("inspect database directory: %w", err)
	}
	if directoryInfo.Mode()&os.ModeSymlink != 0 || !directoryInfo.IsDir() {
		return DoctorReport{}, errors.New("database directory must be a non-symlink directory")
	}
	return DoctorReport{
		ConfigPath:   normalizedPath,
		DatabasePath: databasePath,
		Checks: []string{
			"configuration syntax",
			"secret strength",
			"server identity",
			"database directory",
			"file permissions",
		},
	}, nil
}

func readExistingEnvironment(path string) (map[string]string, bool, error) {
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return make(map[string]string), false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("inspect existing configuration: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
		return nil, false, errors.New("existing configuration must be a regular non-symlink file")
	}
	values, err := readEnvironmentFile(path)
	if err != nil {
		return nil, false, err
	}
	return values, true, nil
}

func readEnvironmentFile(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open configuration file: %w", err)
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return nil, fmt.Errorf("inspect configuration file: %w", err)
	}
	if info.Size() > maximumEnvironmentFileBytes {
		return nil, errors.New("configuration file exceeds size limit")
	}
	reader := io.LimitReader(file, maximumEnvironmentFileBytes+1)
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 4096), 128*1024)
	values := make(map[string]string)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, rawValue, exists := strings.Cut(line, "=")
		key = strings.TrimSpace(key)
		if !exists || !environmentKeyPattern.MatchString(key) {
			return nil, fmt.Errorf("configuration line %d has invalid syntax", lineNumber)
		}
		if _, duplicate := values[key]; duplicate {
			return nil, fmt.Errorf("configuration line %d duplicates %s", lineNumber, key)
		}
		value, err := parseEnvironmentValue(strings.TrimSpace(rawValue))
		if err != nil {
			return nil, fmt.Errorf("configuration line %d for %s: %w", lineNumber, key, err)
		}
		values[key] = value
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read configuration file: %w", err)
	}
	return values, nil
}

func parseEnvironmentValue(raw string) (string, error) {
	if raw == "" {
		return "", nil
	}
	if raw[0] == '"' || raw[0] == '\'' {
		if len(raw) < 2 || raw[len(raw)-1] != raw[0] {
			return "", errors.New("quoted value is not terminated")
		}
		if raw[0] == '\'' {
			return raw[1 : len(raw)-1], nil
		}
		value, err := strconv.Unquote(raw)
		if err != nil {
			return "", errors.New("quoted value contains an invalid escape")
		}
		return value, nil
	}
	if strings.ContainsAny(raw, "\x00\r\n") {
		return "", errors.New("value contains a forbidden control character")
	}
	return raw, nil
}

func validateExistingSecrets(values map[string]string) error {
	if value := strings.TrimSpace(values["GAIACOM_SERVER_PRIVATE_KEY"]); value != "" {
		decoded, err := hex.DecodeString(value)
		if err != nil || len(decoded) != ed25519.PrivateKeySize {
			return errors.New("existing server private key is invalid; refusing automatic rotation")
		}
	}
	if value := strings.TrimSpace(values["GAIACOM_TRUSTMESH_EPOCH_SECRET"]); value != "" {
		decoded, err := hex.DecodeString(value)
		if err != nil || len(decoded) != 32 {
			return errors.New("existing TrustMesh epoch secret is invalid; refusing automatic rotation")
		}
	}
	for _, key := range []string{"GAIACOM_JWT_SECRET", "GAIACOM_METRICS_TOKEN", "GAIACOM_SHIELD_SECRET"} {
		if value := values[key]; value != "" && len(value) < 32 {
			return fmt.Errorf("existing %s is too weak; refusing automatic rotation", key)
		}
	}
	return nil
}

func writeEnvironmentAtomically(path string, values map[string]string) error {
	if err := secureDirectory(filepath.Dir(path)); err != nil {
		return fmt.Errorf("prepare configuration directory: %w", err)
	}
	temporary, err := os.CreateTemp(filepath.Dir(path), ".gaiacom-env-*")
	if err != nil {
		return fmt.Errorf("create temporary configuration: %w", err)
	}
	temporaryPath := temporary.Name()
	committed := false
	defer func() {
		_ = temporary.Close()
		if !committed {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := temporary.Chmod(0o600); err != nil {
		return fmt.Errorf("secure temporary configuration: %w", err)
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		if !environmentKeyPattern.MatchString(key) {
			return errors.New("configuration contains an invalid environment key")
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	if _, err := io.WriteString(temporary, "# GaiaCom managed production environment\n# Secrets are generated once and preserved across updates.\n"); err != nil {
		return fmt.Errorf("write configuration header: %w", err)
	}
	for _, key := range keys {
		value, err := quoteEnvironmentValue(values[key])
		if err != nil {
			return fmt.Errorf("encode %s: %w", key, err)
		}
		if _, err := fmt.Fprintf(temporary, "%s=%s\n", key, value); err != nil {
			return fmt.Errorf("write configuration value: %w", err)
		}
	}
	if err := temporary.Sync(); err != nil {
		return fmt.Errorf("flush configuration: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close configuration: %w", err)
	}
	if err := replaceFile(temporaryPath, path); err != nil {
		return fmt.Errorf("activate configuration: %w", err)
	}
	if err := os.Chmod(path, 0o600); err != nil {
		return fmt.Errorf("secure configuration permissions: %w", err)
	}
	committed = true
	return nil
}

func quoteEnvironmentValue(value string) (string, error) {
	if strings.ContainsAny(value, "\x00\r\n") {
		return "", errors.New("value contains a forbidden control character")
	}
	return strconv.Quote(value), nil
}

func secureDirectory(path string) error {
	if err := os.MkdirAll(path, 0o700); err != nil {
		return err
	}
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.IsDir() {
		return errors.New("path must be a non-symlink directory")
	}
	return os.Chmod(path, 0o700)
}

func normalizeFilesystemPath(path, purpose string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" || strings.ContainsAny(trimmed, "\x00\r\n") {
		return "", fmt.Errorf("%s path is required", purpose)
	}
	absolute, err := filepath.Abs(trimmed)
	if err != nil {
		return "", fmt.Errorf("normalize %s path: %w", purpose, err)
	}
	return filepath.Clean(absolute), nil
}

func randomHexSecret(size int) (string, error) {
	if size < 32 {
		return "", errors.New("secret size must be at least 32 bytes")
	}
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}

func mapLookup(values map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, exists := values[key]
		return value, exists
	}
}
