package devices

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

func TestPairingRequiresIdentitySignatureAndIsSingleUse(t *testing.T) {
	t.Setenv("DB_PATH", "")
	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer db.Close()
	store := repository.NewSQLStore(db)
	user := &models.User{ID: uuid.New(), Username: "pairing-user", PasswordHash: "test", PublicKey: "test", AllowAnonymousStats: true}
	if err := store.CreateUser(user); err != nil {
		t.Fatal(err)
	}
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	identity := &models.Identity{ID: uuid.New(), UserID: user.ID, GaiaID: "@pairing:node.test", DisplayName: "Pairing", PublicRecord: models.JSONB([]byte(`{"public_keys":{"identity":"` + hex.EncodeToString(publicKey) + `"}}`)), IsActive: true}
	if err := store.CreateIdentity(identity); err != nil {
		t.Fatal(err)
	}
	service := NewService(store)
	session := &models.DeviceSession{ID: uuid.New(), UserID: user.ID, DeviceLabel: "New device", DeviceType: "desktop", CreatedAt: time.Now().UTC(), LastSeenAt: time.Now().UTC()}
	if err := store.CreateDeviceSession(context.Background(), session); err != nil {
		t.Fatal(err)
	}
	box := make([]byte, 32)
	kem := make([]byte, 1568)
	deviceSign := make([]byte, ed25519.PublicKeySize)
	_, _ = rand.Read(box)
	_, _ = rand.Read(kem)
	_, _ = rand.Read(deviceSign)
	pairing, secret, err := service.Start(context.Background(), user.ID, identity.ID, "New device", hex.EncodeToString(box), hex.EncodeToString(kem), hex.EncodeToString(deviceSign))
	if err != nil {
		t.Fatal(err)
	}
	payload := "ciphertext-handover-which-is-long-enough-for-the-boundary"
	if err := service.Approve(context.Background(), user.ID, pairing.ID, secret, payload, hex.EncodeToString(make([]byte, ed25519.SignatureSize)), "", ""); err == nil {
		t.Fatal("unsigned pairing approval accepted")
	}
	signature := ed25519.Sign(privateKey, []byte(ApprovalPayload(pairing, payload)))
	if err := service.Approve(context.Background(), user.ID, pairing.ID, secret, payload, hex.EncodeToString(signature), "", ""); err != nil {
		t.Fatalf("valid pairing approval rejected: %v", err)
	}
	approved, err := service.Get(context.Background(), user.ID, pairing.ID, secret)
	if err != nil || approved.Status != "approved" || approved.EncryptedPayload != payload {
		t.Fatalf("approved payload unavailable: %#v %v", approved, err)
	}
	if _, err := service.Consume(context.Background(), user.ID, pairing.ID, session.ID, secret); err != nil {
		t.Fatal(err)
	}
	keys, err := service.ListKeys(context.Background(), user.ID)
	if err != nil || len(keys) != 1 || keys[0].Status != "active" || keys[0].BoxPublic != hex.EncodeToString(box) || keys[0].KemPublic != hex.EncodeToString(kem) || keys[0].SignPublic != hex.EncodeToString(deviceSign) {
		t.Fatalf("consumed pairing did not create its durable device key: %#v %v", keys, err)
	}
	secondPairing, secondSecret, err := service.Start(context.Background(), user.ID, identity.ID, "Untrusted replacement", hex.EncodeToString(box), hex.EncodeToString(kem), hex.EncodeToString(deviceSign))
	if err != nil {
		t.Fatal(err)
	}
	secondPayload := "second-encrypted-handover-payload-long-enough"
	secondIdentitySignature := ed25519.Sign(privateKey, []byte(ApprovalPayload(secondPairing, secondPayload)))
	if err := service.Approve(context.Background(), user.ID, secondPairing.ID, secondSecret, secondPayload, hex.EncodeToString(secondIdentitySignature), "", ""); err == nil {
		t.Fatal("additional pairing accepted without an active device attestation")
	}
	if err := service.RevokeKey(context.Background(), user.ID, keys[0].ID); err != nil {
		t.Fatalf("device key revocation rejected: %v", err)
	}
	keys, err = service.ListKeys(context.Background(), user.ID)
	if err != nil || len(keys) != 1 || keys[0].Status != "revoked" || keys[0].RevokedAt.IsZero() {
		t.Fatalf("device key was not durably revoked: %#v %v", keys, err)
	}
	if _, err := store.FindActiveDeviceSession(context.Background(), session.ID); err == nil {
		t.Fatal("device revocation left its bound server session active")
	}
	if _, err := service.Get(context.Background(), user.ID, pairing.ID, secret); err == nil {
		t.Fatal("consumed pairing remained retrievable")
	}
}
