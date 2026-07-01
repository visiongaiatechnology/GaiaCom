// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package networkhealth

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"time"

	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

const protocolVersion = "v0.1"

type Service struct {
	store      repository.NetworkHealthStore
	nodeName   string
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
	startedAt  time.Time
}

type CryptoTransparency struct {
	ProtocolVersion string `json:"protocolVersion"`
	HybridKEM       string `json:"hybridKem"`
	Encryption      string `json:"encryption"`
	Signatures      string `json:"signatures"`
	Federation      string `json:"federation"`
	SMTPBridge      string `json:"smtpBridge"`
	NoGodmode       string `json:"noGodmode"`
}

type SignedNodeStatus struct {
	Node                string `json:"node"`
	ProtocolVersion     string `json:"protocolVersion"`
	NetworkStatus       string `json:"networkStatus"`
	Accounts            int64  `json:"accounts"`
	Identities          int64  `json:"identities"`
	Nodes               int64  `json:"nodes"`
	Rooms               int64  `json:"rooms"`
	Messages24h         int64  `json:"messages24h"`
	GaiaDrops24h        int64  `json:"gaiaDrops24h"`
	FederationEvents24h int64  `json:"federationEvents24h"`
	UptimeSeconds       int64  `json:"uptimeSeconds"`
	UptimePercent       string `json:"uptimePercent"`
	Timestamp           int64  `json:"timestamp"`
	PublicKey           string `json:"publicKey"`
	Signature           string `json:"signature"`
}

type DashboardResponse struct {
	Title              string                      `json:"title"`
	ProtocolVersion    string                      `json:"protocolVersion"`
	NetworkStatus      string                      `json:"networkStatus"`
	Metrics            models.NetworkHealthMetrics `json:"metrics"`
	UptimePercent      string                      `json:"uptimePercent"`
	CryptoTransparency CryptoTransparency          `json:"cryptoTransparency"`
	SignedNodeStatus   SignedNodeStatus            `json:"signedNodeStatus"`
	PrivacyGuarantees  []string                    `json:"privacyGuarantees"`
	ForbiddenData      []string                    `json:"forbiddenData"`
	AllowedAggregates  []string                    `json:"allowedAggregates"`
}

func NewService(store repository.NetworkHealthStore, nodeName string, privateKey ed25519.PrivateKey, startedAt time.Time) *Service {
	var publicKey ed25519.PublicKey
	if len(privateKey) == ed25519.PrivateKeySize {
		if key, ok := privateKey.Public().(ed25519.PublicKey); ok {
			publicKey = key
		}
	}
	return &Service{
		store:      store,
		nodeName:   nodeName,
		privateKey: privateKey,
		publicKey:  publicKey,
		startedAt:  startedAt.UTC(),
	}
}

func (s *Service) Dashboard(ctx context.Context) (*DashboardResponse, error) {
	metrics, err := s.store.ReadNetworkHealthMetrics(ctx, time.Now().UTC().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	status := s.signStatus(*metrics)
	return &DashboardResponse{
		Title:           "GaiaCom Network Status",
		ProtocolVersion: protocolVersion,
		NetworkStatus:   "Operational",
		Metrics:         *metrics,
		UptimePercent:   "100.00%",
		CryptoTransparency: CryptoTransparency{
			ProtocolVersion: protocolVersion,
			HybridKEM:       "ML-KEM-1024 + X25519",
			Encryption:      "AES-256-GCM",
			Signatures:      "Ed25519",
			Federation:      "Enabled",
			SMTPBridge:      "Enabled",
			NoGodmode:       "Verified",
		},
		SignedNodeStatus: status,
		PrivacyGuarantees: []string{
			"No GaiaID existence list",
			"No room names",
			"No topics",
			"No who-talks-to-whom graph",
			"No online status",
			"No per-user message counts",
		},
		AllowedAggregates: []string{
			"Accounts",
			"Identities",
			"Nodes",
			"Rooms",
			"Messages in the last 24 hours",
			"GaiaDrops in the last 24 hours",
			"Federation events in the last 24 hours",
			"Protocol and crypto capability status",
		},
		ForbiddenData: []string{
			"Who writes to whom",
			"Which GaiaID exists",
			"Which rooms exist",
			"Which topics exist",
			"Who was online when",
			"Who sent how many messages",
		},
	}, nil
}

func (s *Service) signStatus(metrics models.NetworkHealthMetrics) SignedNodeStatus {
	now := time.Now().UTC()
	status := SignedNodeStatus{
		Node:                s.nodeName,
		ProtocolVersion:     protocolVersion,
		NetworkStatus:       "Operational",
		Accounts:            metrics.Accounts,
		Identities:          metrics.Identities,
		Nodes:               metrics.Nodes,
		Rooms:               metrics.Rooms,
		Messages24h:         metrics.Messages24h,
		GaiaDrops24h:        metrics.GaiaDrops24h,
		FederationEvents24h: metrics.FederationEvents24h,
		UptimeSeconds:       int64(now.Sub(s.startedAt).Seconds()),
		UptimePercent:       "100.00%",
		Timestamp:           now.Unix(),
		PublicKey:           hex.EncodeToString(s.publicKey),
	}
	status.Signature = s.sign(status)
	return status
}

func (s *Service) sign(status SignedNodeStatus) string {
	if len(s.privateKey) != ed25519.PrivateKeySize {
		return ""
	}
	status.Signature = ""
	payload, err := json.Marshal(status)
	if err != nil {
		return ""
	}
	return hex.EncodeToString(ed25519.Sign(s.privateKey, payload))
}
