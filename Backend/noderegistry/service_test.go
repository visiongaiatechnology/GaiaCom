// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package noderegistry

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/models"
)

type memoryFederationStore struct {
	entries map[string]models.NodeRegistryEntry
	servers map[string]models.FederationServer
}

func newMemoryFederationStore() *memoryFederationStore {
	return &memoryFederationStore{
		entries: make(map[string]models.NodeRegistryEntry),
		servers: make(map[string]models.FederationServer),
	}
}

func (m *memoryFederationStore) AddFederationQueueItem(item *models.FederationQueue) error {
	return nil
}
func (m *memoryFederationStore) ClaimNextFederationQueueItem(ctx context.Context) (*models.FederationQueue, error) {
	return nil, nil
}
func (m *memoryFederationStore) DeleteFederationQueueItem(ctx context.Context, itemID uint) error {
	return nil
}
func (m *memoryFederationStore) SaveFederationQueueItem(ctx context.Context, item *models.FederationQueue) error {
	return nil
}
func (m *memoryFederationStore) FindFederationServer(domain string) (*models.FederationServer, error) {
	server, ok := m.servers[domain]
	if !ok {
		return nil, errNotFound{}
	}
	return &server, nil
}
func (m *memoryFederationStore) CreateFederationServer(server *models.FederationServer) error {
	m.servers[server.Domain] = *server
	return nil
}
func (m *memoryFederationStore) UpdateFederationServerLastSeen(server *models.FederationServer) error {
	m.servers[server.Domain] = *server
	return nil
}
func (m *memoryFederationStore) SetFederationServerBlocked(ctx context.Context, domain string, blocked bool) error {
	server := m.servers[domain]
	server.Domain = domain
	server.IsBlocked = blocked
	m.servers[domain] = server
	return nil
}
func (m *memoryFederationStore) FindAllFederationServers() ([]models.FederationServer, error) {
	servers := make([]models.FederationServer, 0, len(m.servers))
	for _, server := range m.servers {
		servers = append(servers, server)
	}
	return servers, nil
}
func (m *memoryFederationStore) UpsertNodeRegistryEntry(ctx context.Context, entry *models.NodeRegistryEntry) error {
	now := time.Now().UTC()
	existing := m.entries[entry.Domain]
	if existing.Domain == "" {
		entry.FirstSeenAt = now
		entry.PingCount = 1
	} else {
		entry.FirstSeenAt = existing.FirstSeenAt
		entry.PingCount = existing.PingCount + 1
		if existing.Status == "accepted" || existing.Status == "blocked" {
			entry.Status = existing.Status
		}
	}
	entry.LastSeenAt = now
	entry.UpdatedAt = now
	entry.PublicKeyBase64 = base64.StdEncoding.EncodeToString(entry.PublicKey)
	m.entries[entry.Domain] = *entry
	return nil
}
func (m *memoryFederationStore) FindNodeRegistryEntry(ctx context.Context, domain string) (*models.NodeRegistryEntry, error) {
	entry, ok := m.entries[domain]
	if !ok {
		return nil, errNotFound{}
	}
	return &entry, nil
}
func (m *memoryFederationStore) FindAllNodeRegistryEntries(ctx context.Context) ([]models.NodeRegistryEntry, error) {
	entries := make([]models.NodeRegistryEntry, 0, len(m.entries))
	for _, entry := range m.entries {
		entries = append(entries, entry)
	}
	return entries, nil
}
func (m *memoryFederationStore) UpdateNodeRegistryStatus(ctx context.Context, domain string, status string, lastError string) error {
	entry := m.entries[domain]
	entry.Status = status
	entry.LastError = lastError
	m.entries[domain] = entry
	return nil
}

type errNotFound struct{}

func (errNotFound) Error() string { return "not found" }

func TestAuthorityQuarantinesCoreHashMismatch(t *testing.T) {
	t.Setenv("GAIACOM_CORE_HASH", strings.Repeat("a", 64))
	t.Setenv("GAIACOM_DEV_MODE", "true")
	store := newMemoryFederationStore()
	pub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	remotePub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	service := NewService(store, "beta.gaiacom.de", pub)
	entry, err := service.HandlePing(context.Background(), PingRequest{
		Domain:      "node.gaiacom-test.net",
		ServerName:  "node.gaiacom-test.net",
		PublicKey:   base64.StdEncoding.EncodeToString(remotePub),
		CoreHash:    strings.Repeat("b", 64),
		NodeVersion: "GaiaCom Beta v2",
	})
	if err != nil {
		t.Fatal(err)
	}
	if entry.Status != "quarantined" {
		t.Fatalf("expected mismatched node to be quarantined, got %s", entry.Status)
	}
	if entry.LastError == "" {
		t.Fatal("expected mismatch reason to be persisted")
	}
}

func TestUpdateStatusAcceptsFederationServer(t *testing.T) {
	t.Setenv("GAIACOM_CORE_HASH", strings.Repeat("a", 64))
	t.Setenv("GAIACOM_DEV_MODE", "true")
	store := newMemoryFederationStore()
	pub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	remotePub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	service := NewService(store, "beta.gaiacom.de", pub)
	if _, err := service.HandlePing(context.Background(), PingRequest{
		Domain:      "node.gaiacom-test.net",
		ServerName:  "node.gaiacom-test.net",
		PublicKey:   base64.StdEncoding.EncodeToString(remotePub),
		CoreHash:    strings.Repeat("a", 64),
		NodeVersion: "GaiaCom Beta v2",
	}); err != nil {
		t.Fatal(err)
	}
	if err := service.UpdateStatus(context.Background(), "node.gaiacom-test.net", "accepted", ""); err != nil {
		t.Fatal(err)
	}
	server, ok := store.servers["node.gaiacom-test.net"]
	if !ok {
		t.Fatal("accepted node was not added to federation servers")
	}
	if server.IsBlocked {
		t.Fatal("accepted federation server is still blocked")
	}
}

func TestRegistryRejectsPrivateDomain(t *testing.T) {
	store := newMemoryFederationStore()
	pub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	service := NewService(store, "beta.gaiacom.de", pub)
	_, err = service.HandlePing(context.Background(), PingRequest{
		Domain:    "127.0.0.1",
		PublicKey: base64.StdEncoding.EncodeToString(pub),
		CoreHash:  strings.Repeat("a", 64),
	})
	if err == nil {
		t.Fatal("private registry domain was accepted")
	}
}
