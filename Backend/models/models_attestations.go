package models

// IdentityAttestation is one node-signed attestation of an identity attribute
// (human, organization, node_operator, moderator, official). It is the persisted
// audit record: the canonical signed bytes and signature are retained even after
// expiry/revocation so integrity can be re-verified later.
type IdentityAttestation struct {
	ID                  string
	SubjectIdentityID   string
	SubjectGaiaID       string
	Type                string
	IssuerGaiaID        string
	Authority           string
	EvidenceRef         string
	IssuedAt            string
	ExpiresAt           string
	RevokedAt           string
	RevokedReason       string
	Canonical           string
	SignatureHex        string
	SigningPublicKeyHex string
	Algorithm           string
	CreatedAt           string
}

// NodeIdentityAccessLog is one operator access to the identity directory
// (transparency log). It intentionally stores no directory content beyond the
// result count.
type NodeIdentityAccessLog struct {
	ID             string `json:"id"`
	OperatorGaiaID string `json:"operator_gaia_id"`
	Reason         string `json:"reason"`
	ResultCount    int    `json:"result_count"`
	CreatedAt      string `json:"created_at"`
}

// OperatorStats is the real node-operator dashboard snapshot. Every field is
// derived from an existing store source; unknown sources are omitted (0).
type OperatorStats struct {
	Accounts           int64 `json:"accounts"`
	Identities         int64 `json:"identities"`
	Rooms              int64 `json:"rooms"`
	Messages24h        int64 `json:"messages_24h"`
	GaiaDrops24h       int64 `json:"gaiadrops_24h"`
	OpenAbuseCases     int64 `json:"open_abuse_cases"`
	ActiveAttestations int64 `json:"active_attestations"`
	DirectoryReads24h  int64 `json:"directory_reads_24h"`
}

// OperatorDirectoryEntry is the minimised identity-directory row exposed to node
// operators: no keys, no message content, no e-mail addresses.
type OperatorDirectoryEntry struct {
	GaiaID      string `json:"gaia_id"`
	DisplayName string `json:"display_name"`
	CreatedAt   string `json:"created_at"`
	Status      string `json:"status"`
}
