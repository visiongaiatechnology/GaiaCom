// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package noderegistry

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"gaiacom/backend/models"
	"gaiacom/backend/repository"
	"gaiacom/backend/utils"
)

const (
	statusPending     = "pending"
	statusAccepted    = "accepted"
	statusBlocked     = "blocked"
	statusQuarantined = "quarantined"
	nodeVersion       = "GaiaCom Beta v2"
)

type Service struct {
	store      repository.FederationStore
	serverName string
	publicKey  ed25519.PublicKey
	httpClient *http.Client
}

type PingRequest struct {
	Domain         string `json:"domain"`
	ServerName     string `json:"serverName"`
	PublicKey      string `json:"publicKey"`
	CoreHash       string `json:"coreHash"`
	NodeVersion    string `json:"nodeVersion"`
	OperatorGaiaID string `json:"operatorGaiaId"`
}

type SecretBundle struct {
	ServerName              string `json:"serverName"`
	ServerPrivateKeyHex     string `json:"serverPrivateKeyHex"`
	ServerPublicKeyBase64   string `json:"serverPublicKeyBase64"`
	TrustMeshEpochSecretHex string `json:"trustMeshEpochSecretHex"`
	SavedTo                 string `json:"savedTo"`
}

func NewService(store repository.FederationStore, serverName string, publicKey ed25519.PublicKey) *Service {
	return &Service{
		store:      store,
		serverName: strings.ToLower(strings.TrimSpace(serverName)),
		publicKey:  publicKey,
		httpClient: utils.NewSecureHTTPClient(),
	}
}

func (s *Service) LocalSummary(ctx context.Context) (map[string]interface{}, error) {
	entries, err := s.store.FindAllNodeRegistryEntries(ctx)
	if err != nil {
		return nil, err
	}
	nodes := s.publicNodesFromEntries(entries)
	return map[string]interface{}{
		"serverName":          s.serverName,
		"isRegistryAuthority": s.IsRegistryAuthority(),
		"coreHash":            LocalCoreHash(),
		"nodeVersion":         nodeVersion,
		"publicKey":           base64.StdEncoding.EncodeToString(s.publicKey),
		"mainNode":            mainNodeURL(),
		"acceptedNodes":       nodes,
		"registry":            entries,
	}, nil
}

func (s *Service) HandlePing(ctx context.Context, input PingRequest) (*models.NodeRegistryEntry, error) {
	domain := strings.ToLower(strings.TrimSpace(input.Domain))
	if domain == "" {
		domain = strings.ToLower(strings.TrimSpace(input.ServerName))
	}
	if err := validatePublicDomain(domain); err != nil {
		return nil, err
	}
	publicKey, err := base64.StdEncoding.DecodeString(strings.TrimSpace(input.PublicKey))
	if err != nil || len(publicKey) != ed25519.PublicKeySize {
		return nil, errors.New("invalid node public key")
	}
	coreHash := strings.ToLower(strings.TrimSpace(input.CoreHash))
	if !isHexHash(coreHash) {
		return nil, errors.New("invalid node core hash")
	}

	status := statusPending
	lastError := ""
	if s.IsRegistryAuthority() && coreHash != LocalCoreHash() {
		status = statusQuarantined
		lastError = "core hash differs from registry authority release hash"
	}

	entry := &models.NodeRegistryEntry{
		Domain:         domain,
		ServerName:     strings.TrimSpace(input.ServerName),
		PublicKey:      publicKey,
		CoreHash:       coreHash,
		NodeVersion:    safeShort(input.NodeVersion, 80),
		OperatorGaiaID: safeShort(input.OperatorGaiaID, 160),
		Status:         status,
		LastError:      lastError,
		LastSeenAt:     time.Now().UTC(),
	}
	if entry.ServerName == "" {
		entry.ServerName = domain
	}
	if entry.NodeVersion == "" {
		entry.NodeVersion = "unknown"
	}
	if err := s.store.UpsertNodeRegistryEntry(ctx, entry); err != nil {
		return nil, err
	}
	return s.store.FindNodeRegistryEntry(ctx, domain)
}

func (s *Service) PingMain(ctx context.Context, operatorGaiaID string) (*models.NodeRegistryEntry, error) {
	if s.serverName == "" || s.serverName == "localhost" {
		return nil, errors.New("GAIACOM_SERVER_NAME must be a public domain before registry ping")
	}
	if err := validatePublicDomain(s.serverName); err != nil {
		return nil, err
	}
	target := strings.TrimRight(mainNodeURL(), "/") + "/api/v1/public/node-registry/ping"
	payload := PingRequest{
		Domain:         s.serverName,
		ServerName:     s.serverName,
		PublicKey:      base64.StdEncoding.EncodeToString(s.publicKey),
		CoreHash:       LocalCoreHash(),
		NodeVersion:    nodeVersion,
		OperatorGaiaID: operatorGaiaID,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("main node ping failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("main node rejected ping with status %d: %s", resp.StatusCode, string(respBody))
	}
	var result struct {
		Entry models.NodeRegistryEntry `json:"entry"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	localEntry := result.Entry
	localEntry.PublicKey = s.publicKey
	if len(localEntry.PublicKey) == 0 && localEntry.PublicKeyBase64 != "" {
		if decoded, decodeErr := base64.StdEncoding.DecodeString(localEntry.PublicKeyBase64); decodeErr == nil {
			localEntry.PublicKey = decoded
		}
	}
	if localEntry.Domain == "" {
		localEntry.Domain = s.serverName
	}
	if err := s.store.UpsertNodeRegistryEntry(ctx, &localEntry); err != nil {
		return nil, err
	}
	return s.store.FindNodeRegistryEntry(ctx, localEntry.Domain)
}

func (s *Service) UpdateStatus(ctx context.Context, domain string, status string, lastError string) error {
	domain = strings.ToLower(strings.TrimSpace(domain))
	if err := validatePublicDomain(domain); err != nil {
		return err
	}
	switch status {
	case statusAccepted, statusBlocked, statusQuarantined, statusPending:
	default:
		return errors.New("invalid node registry status")
	}
	entry, err := s.store.FindNodeRegistryEntry(ctx, domain)
	if err != nil {
		return err
	}
	if err := s.store.UpdateNodeRegistryStatus(ctx, domain, status, safeShort(lastError, 500)); err != nil {
		return err
	}
	if status == statusAccepted {
		server := &models.FederationServer{
			Domain:      entry.Domain,
			PublicKey:   entry.PublicKey,
			FirstSeenAt: entry.FirstSeenAt,
			LastSeenAt:  time.Now().UTC(),
			IsBlocked:   false,
		}
		if err := s.store.CreateFederationServer(server); err != nil {
			_ = s.store.SetFederationServerBlocked(ctx, domain, false)
		}
		return nil
	}
	if status == statusBlocked || status == statusQuarantined {
		_ = s.store.SetFederationServerBlocked(ctx, domain, true)
	}
	return nil
}

func (s *Service) PublicNodeDocument(ctx context.Context) (map[string]interface{}, error) {
	entries, err := s.store.FindAllNodeRegistryEntries(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"serverName":  s.serverName,
		"coreHash":    LocalCoreHash(),
		"nodeVersion": nodeVersion,
		"updatedAt":   time.Now().UTC().Format(time.RFC3339),
		"nodes":       s.publicNodesFromEntries(entries),
	}, nil
}

func (s *Service) GenerateSecrets() (*SecretBundle, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	epoch := make([]byte, 32)
	if _, err := rand.Read(epoch); err != nil {
		return nil, err
	}
	bundle := &SecretBundle{
		ServerName:              s.serverName,
		ServerPrivateKeyHex:     hex.EncodeToString(priv),
		ServerPublicKeyBase64:   base64.StdEncoding.EncodeToString(pub),
		TrustMeshEpochSecretHex: hex.EncodeToString(epoch),
	}
	data, err := json.MarshalIndent(bundle, "", "  ")
	if err != nil {
		return nil, err
	}
	path := filepath.Clean("node_secrets.json")
	if err := os.WriteFile(path, data, 0600); err != nil {
		return nil, err
	}
	bundle.SavedTo = path
	return bundle, nil
}

func (s *Service) IsRegistryAuthority() bool {
	name := strings.ToLower(strings.TrimSpace(s.serverName))
	authority := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_REGISTRY_AUTHORITY_DOMAIN")))
	if authority == "" {
		authority = "gaiacom.de"
	}
	return name == authority || name == "beta.gaiacom.de" || strings.HasSuffix(name, ".gaiacom.de")
}

func (s *Service) publicNodesFromEntries(entries []models.NodeRegistryEntry) []map[string]interface{} {
	nodes := []map[string]interface{}{
		{
			"domain":      s.serverName,
			"serverName":  s.serverName,
			"coreHash":    LocalCoreHash(),
			"nodeVersion": nodeVersion,
			"status":      statusAccepted,
		},
	}
	for _, entry := range entries {
		if entry.Status != statusAccepted || entry.Domain == s.serverName {
			continue
		}
		nodes = append(nodes, map[string]interface{}{
			"domain":         entry.Domain,
			"serverName":     entry.ServerName,
			"publicKey":      entry.PublicKeyBase64,
			"coreHash":       entry.CoreHash,
			"nodeVersion":    entry.NodeVersion,
			"operatorGaiaId": entry.OperatorGaiaID,
			"lastSeenAt":     entry.LastSeenAt,
			"status":         entry.Status,
		})
	}
	sort.Slice(nodes, func(i, j int) bool {
		return fmt.Sprint(nodes[i]["domain"]) < fmt.Sprint(nodes[j]["domain"])
	})
	return nodes
}

func LocalCoreHash() string {
	if value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_CORE_HASH"))); isHexHash(value) {
		return value
	}
	candidates := []string{
		"main.go",
		"routes.go",
		filepath.Join("federation", "federation_service.go"),
		filepath.Join("database", "database.go"),
	}
	hash := sha256.New()
	found := false
	for _, candidate := range candidates {
		data, err := os.ReadFile(candidate)
		if err != nil {
			data, err = os.ReadFile(filepath.Join("Backend", candidate))
		}
		if err != nil {
			continue
		}
		found = true
		hash.Write([]byte(candidate))
		hash.Write(data)
	}
	if found {
		return hex.EncodeToString(hash.Sum(nil))
	}
	executable, err := os.Executable()
	if err == nil {
		if data, readErr := os.ReadFile(executable); readErr == nil {
			sum := sha256.Sum256(data)
			return hex.EncodeToString(sum[:])
		}
	}
	sum := sha256.Sum256([]byte(nodeVersion))
	return hex.EncodeToString(sum[:])
}

func mainNodeURL() string {
	value := strings.TrimSpace(os.Getenv("GAIACOM_REGISTRY_MAIN_NODE"))
	if value == "" {
		return "https://beta.gaiacom.de"
	}
	return strings.TrimRight(value, "/")
}

func validatePublicDomain(domain string) error {
	if domain == "" || strings.Contains(domain, "://") || strings.Contains(domain, "/") {
		return errors.New("invalid node domain")
	}
	if utils.IsPrivateOrLoopbackIP(domain) && !strings.Contains(domain, "localhost") {
		return errors.New("node domain is private or loopback")
	}
	if strings.Contains(domain, "localhost") || strings.Contains(domain, "127.0.0.1") || strings.Contains(domain, "192.168.") {
		return errors.New("node registry requires a public domain")
	}
	return nil
}

func isHexHash(value string) bool {
	if len(value) != sha256.Size*2 {
		return false
	}
	for _, char := range value {
		if (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') {
			continue
		}
		return false
	}
	return true
}

func safeShort(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}
