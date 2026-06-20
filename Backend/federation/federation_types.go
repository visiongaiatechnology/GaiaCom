package federation

import "gaiacom/backend/models"

// FederationPayload ist die Top-Level-Struktur für eine S2S-Transaktion.
// Diese Struktur wird als JSON-Body in POST-Anfragen an föderierte Server gesendet.
type FederationPayload struct {
	Origin         string       `json:"origin"`
	OriginServerTS int64        `json:"origin_server_ts"`
	PDUs           []models.PDU `json:"pdus"`
}

// NodeInfo repräsentiert grundlegende, öffentliche Informationen über eine GaiaCom-Serverinstanz.
// Dies wird für die Server-Erkennung in der Föderation verwendet.
type NodeInfo struct {
	Version          string       `json:"version"`
	Software         SoftwareInfo `json:"software"`
	Protocols        []string     `json:"protocols"` // z.B., ["s2s/v1"]
	Services         ServicesInfo `json:"services"`
	OpenRegistration bool         `json:"openRegistration"`
}

// SoftwareInfo enthält Details über die Server-Software.
type SoftwareInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ServicesInfo listet verfügbare Dienste für die Föderation auf.
type ServicesInfo struct {
	Outbound []string `json:"outbound"`
	Inbound  []string `json:"inbound"`
}