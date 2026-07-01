// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"encoding/json"
	"testing"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

func TestIdentityPublicProfileBacksGsnProfile(t *testing.T) {
	t.Setenv("DB_PATH", "")

	db := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()

	user := models.User{
		ID:           uuid.New(),
		Username:     "profile-owner",
		PasswordHash: "hash",
		PublicKey:    "pk",
	}
	if err := store.CreateUser(&user); err != nil {
		t.Fatalf("create user: %v", err)
	}

	identity := models.Identity{
		ID:           uuid.New(),
		UserID:       user.ID,
		GaiaID:       "@profile-owner:gaiacom.local",
		DisplayName:  "Legacy Name",
		PublicRecord: models.JSONB(`{"public_keys":{"ed25519":"abc"}}`),
		IsActive:     true,
	}
	if err := store.CreateIdentity(&identity); err != nil {
		t.Fatalf("create identity: %v", err)
	}

	updated, err := store.UpdateIdentityPublicProfile(ctx, user.ID, identity.ID, models.IdentityPublicProfile{
		RealName:    "Ada Lovelace",
		DisplayName: "Ada",
		Bio:         "Encrypted systems builder",
		Avatar:      `{"fileId":"avatar-file","keyHex":"00","ivHex":"11"}`,
		Website:     "https://gaia.example",
	})
	if err != nil {
		t.Fatalf("update identity profile: %v", err)
	}
	if updated.DisplayName != "Ada" {
		t.Fatalf("identity display name not updated: %q", updated.DisplayName)
	}

	var publicRecord map[string]interface{}
	if err := json.Unmarshal(updated.PublicRecord, &publicRecord); err != nil {
		t.Fatalf("public record must remain valid json: %v", err)
	}
	if _, ok := publicRecord["public_keys"]; !ok {
		t.Fatalf("existing public record fields were not preserved")
	}

	profile, err := store.GetGsnProfile(ctx, identity.GaiaID)
	if err != nil {
		t.Fatalf("load gsn profile: %v", err)
	}
	if profile.RealName != "Ada Lovelace" || profile.DisplayName != "Ada" {
		t.Fatalf("profile identity fields mismatch: %+v", profile)
	}
	if profile.Description != "Encrypted systems builder" {
		t.Fatalf("profile bio mismatch: %q", profile.Description)
	}
	if profile.Avatar == "" || profile.Website != "https://gaia.example" {
		t.Fatalf("profile media/link mismatch: %+v", profile)
	}
}
