// STATUS: DIAMANT VGT SUPREME
package database

var transportQueueMigrationStatements = []string{
	`CREATE TABLE transport_outbox (
		envelope_id TEXT PRIMARY KEY,
		recipient TEXT NOT NULL,
		payload BLOB NOT NULL CHECK(length(payload) BETWEEN 1 AND 67108864),
		payload_hash BLOB NOT NULL CHECK(length(payload_hash) = 32),
		signature BLOB NOT NULL CHECK(length(signature) BETWEEN 1 AND 4096),
		allowed_transports INTEGER NOT NULL CHECK(allowed_transports BETWEEN 1 AND 7),
		priority INTEGER NOT NULL DEFAULT 50 CHECK(priority BETWEEN 0 AND 100),
		status TEXT NOT NULL CHECK(status IN ('pending', 'leased', 'delivered', 'dead_letter')),
		attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
		next_attempt_at TEXT NOT NULL,
		lease_owner TEXT NOT NULL DEFAULT '',
		lease_until TEXT NOT NULL DEFAULT '',
		last_error_code TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		delivered_at TEXT NOT NULL DEFAULT '',
		delivered_via TEXT NOT NULL DEFAULT '' CHECK(delivered_via IN ('', 'internet', 'local_network', 'bluetooth'))
	)`,
	`CREATE INDEX idx_transport_outbox_due
		ON transport_outbox(status, next_attempt_at, lease_until, priority, created_at)`,
	`CREATE INDEX idx_transport_outbox_retention
		ON transport_outbox(status, delivered_at, expires_at)`,
	`CREATE TABLE transport_inbox_dedup (
		envelope_id TEXT PRIMARY KEY,
		payload_hash BLOB NOT NULL CHECK(length(payload_hash) = 32),
		received_via TEXT NOT NULL CHECK(received_via IN ('internet', 'local_network', 'bluetooth')),
		first_seen_at TEXT NOT NULL,
		expires_at TEXT NOT NULL
	)`,
	`CREATE INDEX idx_transport_inbox_dedup_expiry ON transport_inbox_dedup(expires_at)`,
}
