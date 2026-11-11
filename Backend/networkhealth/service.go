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

const (
	protocolVersion = "v0.1"

	// Declared protocol profile. These constants document what this build
	// implements (see README.md and SOVEREIGN_CRYPTO.md); they are protocol
	// declarations, not runtime measurements or peer-network attestations.
	// Keep them in sync with the wire suite constants in
	// internal/security/message_guard.go and the client crypto suite constants.
	profileSource      = "declared-protocol-profile"
	declaredHybridKEM  = "X25519 + ML-KEM-1024 + HQC-256"
	declaredEncryption = "AES-256-GCM + Twofish-256-EAX"
	declaredSignatures = "Ed25519 + ML-DSA-87"
	declaredNoGodmode  = "Not runtime-attested"

	// Federation and SMTP bridge are capabilities compiled into this build. The
	// strings do not assert that an operator configured the transport at runtime.
	declaredFederation = "Declared build capability (not runtime-probed)"
	declaredSMTPBridge = "Declared build capability (not runtime-probed)"

	// Network status labels are derived from runtime state, never hardcoded.
	statusOK          = "operational"
	statusDegraded    = "degraded"
	statusUnavailable = "unavailable"

	// Uptime semantics: the node exposes process uptime only and keeps no
	// availability samples, so an availability percentage cannot be computed.
	uptimePercentUnavailable = "unavailable"
	uptimeScopeProcess       = "process"
)

// RuntimeSnapshot is a point-in-time view of real node runtime state supplied
// by the operations monitor. The zero value means "no runtime evidence".
type RuntimeSnapshot struct {
	Ready         bool
	DatabaseReady bool
	UptimeSeconds int64
}

// StatusProvider supplies real runtime state for the public network status. It
// is optional: without a provider the service reports "unavailable" instead of
// pretending the node is healthy.
type StatusProvider func(ctx context.Context) RuntimeSnapshot

// Option configures optional runtime dependencies of the service.
type Option func(*Service)

// WithStatusProvider wires real operational state (operations.Monitor) into the
// public network status. Existing call sites stay valid because NewService keeps
// the previous parameter list and accepts options variadically.
func WithStatusProvider(provider StatusProvider) Option {
	return func(service *Service) {
		service.statusProvider = provider
	}
}

type Service struct {
	store          repository.NetworkHealthStore
	nodeName       string
	privateKey     ed25519.PrivateKey
	publicKey      ed25519.PublicKey
	startedAt      time.Time
	statusProvider StatusProvider
}

type CryptoTransparency struct {
	ProtocolVersion string `json:"protocolVersion"`
	HybridKEM       string `json:"hybridKem"`
	Encryption      string `json:"encryption"`
	Signatures      string `json:"signatures"`
	Federation      string `json:"federation"`
	SMTPBridge      string `json:"smtpBridge"`
	NoGodmode       string `json:"noGodmode"`
	ProfileSource   string `json:"profileSource"`
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
	UptimeScope         string `json:"uptimeScope"`
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
	UptimeScope        string                      `json:"uptimeScope"`
	CryptoTransparency CryptoTransparency          `json:"cryptoTransparency"`
	SignedNodeStatus   SignedNodeStatus            `json:"signedNodeStatus"`
	PrivacyGuarantees  []string                    `json:"privacyGuarantees"`
	ForbiddenData      []string                    `json:"forbiddenData"`
	AllowedAggregates  []string                    `json:"allowedAggregates"`
}

func NewService(store repository.NetworkHealthStore, nodeName string, privateKey ed25519.PrivateKey, startedAt time.Time, options ...Option) *Service {
	var publicKey ed25519.PublicKey
	if len(privateKey) == ed25519.PrivateKeySize {
		if key, ok := privateKey.Public().(ed25519.PublicKey); ok {
			publicKey = key
		}
	}
	service := &Service{
		store:      store,
		nodeName:   nodeName,
		privateKey: privateKey,
		publicKey:  publicKey,
		startedAt:  startedAt.UTC(),
	}
	for _, option := range options {
		if option != nil {
			option(service)
		}
	}
	return service
}

// deriveNetworkStatus derives the public status from real process state. Without
// a wired provider the endpoint reports "unavailable" rather than claiming
// health it cannot evidence.
func (s *Service) deriveNetworkStatus(ctx context.Context) (string, int64) {
	if s == nil || s.statusProvider == nil {
		return statusUnavailable, 0
	}
	if ctx == nil {
		ctx = context.Background()
	}

	snapshot := s.statusProvider(ctx)
	status := statusOK
	if !snapshot.Ready || !snapshot.DatabaseReady {
		status = statusDegraded
	}

	uptimeSeconds := snapshot.UptimeSeconds
	if uptimeSeconds < 0 {
		uptimeSeconds = 0
	}
	if uptimeSeconds == 0 && !s.startedAt.IsZero() {
		uptimeSeconds = int64(time.Since(s.startedAt).Seconds())
		if uptimeSeconds < 0 {
			uptimeSeconds = 0
		}
	}
	return status, uptimeSeconds
}

// declaredCryptoTransparency returns the declared protocol profile of this
// build. It is deliberately labelled as a declaration: no runtime capability
// probe is performed here, so the values must not be read as measurements.
func declaredCryptoTransparency() CryptoTransparency {
	return CryptoTransparency{
		ProtocolVersion: protocolVersion,
		HybridKEM:       declaredHybridKEM,
		Encryption:      declaredEncryption,
		Signatures:      declaredSignatures,
		Federation:      declaredFederation,
		SMTPBridge:      declaredSMTPBridge,
		NoGodmode:       declaredNoGodmode,
		ProfileSource:   profileSource,
	}
}

func (s *Service) Dashboard(ctx context.Context) (*DashboardResponse, error) {
	metrics, err := s.store.ReadNetworkHealthMetrics(ctx, time.Now().UTC().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	networkStatus, uptimeSeconds := s.deriveNetworkStatus(ctx)
	return &DashboardResponse{
		Title:              "GaiaCom Network Status",
		ProtocolVersion:    protocolVersion,
		NetworkStatus:      networkStatus,
		Metrics:            *metrics,
		UptimePercent:      uptimePercentUnavailable,
		UptimeScope:        uptimeScopeProcess,
		CryptoTransparency: declaredCryptoTransparency(),
		SignedNodeStatus:   s.signStatus(*metrics, networkStatus, uptimeSeconds),
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

func (s *Service) signStatus(metrics models.NetworkHealthMetrics, networkStatus string, uptimeSeconds int64) SignedNodeStatus {
	now := time.Now().UTC()
	status := SignedNodeStatus{
		Node:                s.nodeName,
		ProtocolVersion:     protocolVersion,
		NetworkStatus:       networkStatus,
		Accounts:            metrics.Accounts,
		Identities:          metrics.Identities,
		Nodes:               metrics.Nodes,
		Rooms:               metrics.Rooms,
		Messages24h:         metrics.Messages24h,
		GaiaDrops24h:        metrics.GaiaDrops24h,
		FederationEvents24h: metrics.FederationEvents24h,
		UptimeSeconds:       uptimeSeconds,
		UptimePercent:       uptimePercentUnavailable,
		UptimeScope:         uptimeScopeProcess,
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
