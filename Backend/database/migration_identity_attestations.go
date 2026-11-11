package database

// identityAttestationMigrationStatements introduces the node attestation registry
// and the operator identity-directory access transparency log.
//
// identity_attestations stores one signed, canonical attestation per
// (subject, type, issuer). The partial unique index enforces "only one ACTIVE
// attestation per subject/type/issuer": revoked rows remain for audit and a new
// active attestation may be issued afterwards.
var identityAttestationMigrationStatements = []string{
	`CREATE TABLE identity_attestations (
		id TEXT PRIMARY KEY,
		subject_identity_id TEXT NOT NULL DEFAULT '',
		subject_gaia_id TEXT NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('human', 'organization', 'node_operator', 'moderator', 'official')),
		issuer_gaia_id TEXT NOT NULL,
		authority TEXT NOT NULL CHECK(authority IN ('node', 'governance', 'domain_proof', 'organization')),
		evidence_ref TEXT NOT NULL CHECK(length(evidence_ref) >= 4),
		issued_at TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		revoked_at TEXT NOT NULL DEFAULT '',
		revoked_reason TEXT NOT NULL DEFAULT '',
		canonical TEXT NOT NULL,
		signature_hex TEXT NOT NULL,
		signing_public_key_hex TEXT NOT NULL,
		algorithm TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE INDEX idx_identity_attestations_subject
		ON identity_attestations(subject_gaia_id)`,
	`CREATE INDEX idx_identity_attestations_type_revoked
		ON identity_attestations(type, revoked_at)`,
	`CREATE UNIQUE INDEX idx_identity_attestations_active
		ON identity_attestations(subject_gaia_id, type, issuer_gaia_id)
		WHERE revoked_at = ''`,
	`CREATE TABLE node_identity_access_log (
		id TEXT PRIMARY KEY,
		operator_gaia_id TEXT NOT NULL,
		reason TEXT NOT NULL,
		result_count INTEGER NOT NULL DEFAULT 0 CHECK(result_count >= 0),
		created_at TEXT NOT NULL
	)`,
	`CREATE INDEX idx_node_identity_access_log_created
		ON node_identity_access_log(created_at)`,
}
