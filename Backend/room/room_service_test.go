// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package room

import (
	"testing"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

func TestRequireTopSecretCapabilitiesRejectsLegacyMembers(t *testing.T) {
	room := &models.Room{
		ID: uuid.New(),
		Members: []models.RoomMember{
			{
				IdentityID: uuid.New(),
				Identity: models.Identity{
					ID:           uuid.New(),
					PublicRecord: models.JSONB(`{"public_keys":{"identity":"ed25519"}}`),
				},
			},
		},
	}

	if err := requireTopSecretCapabilities(room); err == nil {
		t.Fatalf("expected legacy member without ML-DSA-87 capability to be rejected")
	}
}

func TestRequireTopSecretCapabilitiesAcceptsMLDSAMembers(t *testing.T) {
	room := &models.Room{
		ID: uuid.New(),
		Members: []models.RoomMember{
			{
				IdentityID: uuid.New(),
				Identity: models.Identity{
					ID:           uuid.New(),
					PublicRecord: models.JSONB(`{"public_keys":{"identity":"ed25519","mldsa87":"pq-public-key"}}`),
				},
			},
		},
	}

	if err := requireTopSecretCapabilities(room); err != nil {
		t.Fatalf("expected ML-DSA-87 capable member to be accepted: %v", err)
	}
}
