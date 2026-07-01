// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package room

import "time"

// CreateRoomRequest definiert die erwartete Payload für die Erstellung eines Raumes.
type CreateRoomRequest struct {
	Name        string   `json:"name"`
	IsPublic    bool     `json:"isPublic"`
	IsGroup     bool     `json:"isGroup"`
	Description string   `json:"description"`
	Avatar      string   `json:"avatar"`
	MemberIDs   []string `json:"memberIds" validate:"required,min=1"` // IDs der Identitäten
}

// CreateChannelRequest definiert die Payload zur Kanalerstellung.
type CreateChannelRequest struct {
	RoomID string `json:"roomId"`
	Name   string `json:"name"`
}

type UpdateRoomRequest struct {
	RoomID          string `json:"roomId"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	Avatar          string `json:"avatar"`
	IsPrivate       *bool  `json:"isPrivate"`
	ReadOnly        *bool  `json:"readOnly"`
	SlowModeSeconds *int   `json:"slowModeSeconds"`
	TopSecret       *bool  `json:"topSecret"`
}

// MemberResponse definiert die Struktur eines Mitglieds in der Raum-Antwort.
type MemberResponse struct {
	IdentityID string `json:"identityId"`
	Username   string `json:"username"`
	Role       string `json:"role"`
}

// RoomResponse definiert die Struktur für die Antwort bei Abfragen eines Raumes.
type RoomResponse struct {
	ID              string           `json:"id"`
	Name            string           `json:"name"`
	IsGroup         bool             `json:"isGroup"`
	Description     string           `json:"description"`
	Avatar          string           `json:"avatar"`
	SecretHash      string           `json:"secretHash"`
	CreatorID       string           `json:"creatorId"`
	IsPrivate       bool             `json:"isPrivate"`
	ReadOnly        bool             `json:"readOnly"`
	SlowModeSeconds int              `json:"slowModeSeconds"`
	TopSecret       bool             `json:"topSecret"`
	Members         []MemberResponse `json:"members"`
	CreatedAt       time.Time        `json:"createdAt"`
}
