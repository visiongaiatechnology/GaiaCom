package identity

import (
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

// P-02 regression: CreateIdentity only accepts identities whose domain is the
// configured local node domain. Local/uppercase forms are accepted; foreign,
// domain-less and default-fail-closed cases are rejected.
func TestCreateIdentityBindsLocalDomain(t *testing.T) {
	_, store, cleanup := setupTestIdentityDBAndStore(t)
	defer cleanup()

	svc := NewIdentityService(store, WithLocalDomain("gaiacom.local"))
	noDomainSvc := NewIdentityService(store)

	newUser := func(username string) *models.User {
		user := &models.User{ID: uuid.New(), Username: username, PasswordHash: "hash", PublicKey: "pk"}
		if err := store.CreateUser(user); err != nil {
			t.Fatalf("create user %s: %v", username, err)
		}
		return user
	}

	baseRecord := map[string]interface{}{"key": "value"}

	t.Run("local domain accepted", func(t *testing.T) {
		user := newUser("localowner")
		if _, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@localuser:gaiacom.local",
			DisplayName:  "Local",
			PublicRecord: baseRecord,
		}); err != nil {
			t.Fatalf("local-domain identity must be accepted: %v", err)
		}
	})

	t.Run("uppercase local domain accepted", func(t *testing.T) {
		user := newUser("uppercaseowner")
		if _, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@UpperUser:GAIACOM.LOCAL",
			DisplayName:  "Upper",
			PublicRecord: baseRecord,
		}); err != nil {
			t.Fatalf("case-insensitive local domain must be accepted: %v", err)
		}
	})

	t.Run("foreign domain rejected", func(t *testing.T) {
		user := newUser("foreignowner")
		if _, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@foreignuser:remote.example",
			DisplayName:  "Foreign",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("foreign-domain identity must be rejected")
		}
	})

	t.Run("domain-less rejected", func(t *testing.T) {
		user := newUser("domainedness")
		if _, err := svc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@localuser",
			DisplayName:  "Bare",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("domain-less identity must be rejected")
		}
	})

	t.Run("parent network domain accepted on subdomain node", func(t *testing.T) {
		nodeSvc := NewIdentityService(store, WithLocalDomain("beta.gaiacom.de"))
		user := newUser("parentdomainowner")
		if _, err := nodeSvc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@alice:gaiacom.de",
			DisplayName:  "ParentDomain",
			PublicRecord: baseRecord,
		}); err != nil {
			t.Fatalf("identity for the node's parent network domain must be accepted: %v", err)
		}
	})

	t.Run("bare TLD rejected", func(t *testing.T) {
		nodeSvc := NewIdentityService(store, WithLocalDomain("beta.gaiacom.de"))
		user := newUser("tldowner")
		if _, err := nodeSvc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@tlduser:de",
			DisplayName:  "TLD",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("bare top-level domain must be rejected")
		}
	})

	t.Run("lookalike suffix rejected", func(t *testing.T) {
		nodeSvc := NewIdentityService(store, WithLocalDomain("beta.gaiacom.de"))
		user := newUser("lookalikeowner")
		if _, err := nodeSvc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@lookalike:aiacom.de",
			DisplayName:  "Lookalike",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("lookalike domain must be rejected")
		}
	})

	t.Run("unrelated domain rejected on subdomain node", func(t *testing.T) {
		nodeSvc := NewIdentityService(store, WithLocalDomain("beta.gaiacom.de"))
		user := newUser("unrelatedowner")
		if _, err := nodeSvc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@remote:evil.example",
			DisplayName:  "Remote",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("unrelated domain must be rejected")
		}
	})

	t.Run("empty local domain fails closed", func(t *testing.T) {
		user := newUser("nodesettings")
		if _, err := noDomainSvc.CreateIdentity(user.ID, CreateIdentityInput{
			GaiaID:       "@localuser:gaiacom.local",
			DisplayName:  "NoConfig",
			PublicRecord: baseRecord,
		}); err == nil {
			t.Fatal("missing local-domain configuration must fail closed")
		}
	})
}
