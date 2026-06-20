package database

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	"gaiacom/backend/config"

	_ "modernc.org/sqlite"
)

func ConnectDB(cfg *config.Config) *sql.DB {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		if cfg != nil && cfg.DatabasePath != "" {
			dbPath = cfg.DatabasePath
		} else {
			dbPath = "gaiacom.db"
		}
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		log.Fatal("Failed to connect to database:", err)
	}
	if err := migrate(ctx, db); err != nil {
		_ = db.Close()
		log.Fatal("Failed to migrate database:", err)
	}

	log.Printf("Database connection established at %s", dbPath)
	return db
}

func migrate(ctx context.Context, db *sql.DB) error {
	for _, statement := range migrationStatements {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			if strings.Contains(err.Error(), "duplicate column name") {
				continue
			}
			return err
		}
	}
	return nil
}

var migrationStatements = []string{
	`PRAGMA foreign_keys = ON`,
	`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		public_key TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS identities (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		gaia_id TEXT NOT NULL UNIQUE,
		display_name TEXT NOT NULL DEFAULT '',
		keys TEXT,
		public_record TEXT,
		is_active INTEGER NOT NULL DEFAULT 1,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id)`,
	`CREATE TABLE IF NOT EXISTS device_sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		device_label TEXT NOT NULL DEFAULT '',
		device_type TEXT NOT NULL DEFAULT '',
		os TEXT NOT NULL DEFAULT '',
		browser TEXT NOT NULL DEFAULT '',
		ip_address TEXT NOT NULL DEFAULT '',
		user_agent TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		last_seen_at TEXT NOT NULL,
		revoked_at TEXT NOT NULL DEFAULT '',
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_device_sessions_revoked_at ON device_sessions(revoked_at)`,
	`CREATE TABLE IF NOT EXISTS rooms (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		is_private INTEGER NOT NULL DEFAULT 0,
		created_by TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS room_members (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		room_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'member',
		joined_at TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id)`,
	`CREATE INDEX IF NOT EXISTS idx_room_members_identity_id ON room_members(identity_id)`,
	`CREATE TABLE IF NOT EXISTS message_envelopes (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		sender TEXT NOT NULL,
		recipient TEXT NOT NULL,
		payload TEXT,
		signature TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_message_envelopes_created_at ON message_envelopes(created_at)`,
	`CREATE INDEX IF NOT EXISTS idx_message_envelopes_sender ON message_envelopes(sender)`,
	`CREATE INDEX IF NOT EXISTS idx_message_envelopes_recipient ON message_envelopes(recipient)`,
	`CREATE TABLE IF NOT EXISTS inboxes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		identity_id TEXT NOT NULL,
		message_id TEXT NOT NULL,
		is_read INTEGER NOT NULL DEFAULT 0,
		delivered INTEGER NOT NULL DEFAULT 0,
		untrusted INTEGER NOT NULL DEFAULT 0,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_inboxes_identity_id ON inboxes(identity_id)`,
	`CREATE INDEX IF NOT EXISTS idx_inboxes_message_id ON inboxes(message_id)`,
	`CREATE TABLE IF NOT EXISTS message_proofs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message_id TEXT NOT NULL UNIQUE,
		sender_identity_id TEXT,
		sender TEXT NOT NULL,
		recipient TEXT NOT NULL,
		ciphertext_hash TEXT NOT NULL,
		sender_signature TEXT NOT NULL,
		envelope_hash TEXT NOT NULL,
		server_received_at TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE,
		FOREIGN KEY(sender_identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_message_proofs_sender_identity_id ON message_proofs(sender_identity_id)`,
	`CREATE INDEX IF NOT EXISTS idx_message_proofs_ciphertext_hash ON message_proofs(ciphertext_hash)`,
	`CREATE TABLE IF NOT EXISTS delivery_receipts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		recipient TEXT NOT NULL,
		delivered INTEGER NOT NULL DEFAULT 1,
		delivered_at TEXT NOT NULL,
		receipt_hash TEXT NOT NULL UNIQUE,
		tamper_evidence TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_delivery_receipts_message_id ON delivery_receipts(message_id)`,
	`CREATE INDEX IF NOT EXISTS idx_delivery_receipts_identity_id ON delivery_receipts(identity_id)`,
	`CREATE TABLE IF NOT EXISTS gaia_drop_submissions (
		id TEXT PRIMARY KEY,
		target_identity_id TEXT NOT NULL,
		target_gaia_id TEXT NOT NULL,
		sender_label TEXT NOT NULL DEFAULT '',
		payload TEXT NOT NULL,
		payload_hash TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'new',
		created_at TEXT NOT NULL,
		FOREIGN KEY(target_identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_gaia_drop_target_identity_id ON gaia_drop_submissions(target_identity_id)`,
	`CREATE INDEX IF NOT EXISTS idx_gaia_drop_created_at ON gaia_drop_submissions(created_at)`,
	`CREATE TABLE IF NOT EXISTS file_metadata (
		file_id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		file_name TEXT NOT NULL,
		file_size INTEGER NOT NULL,
		file_hash TEXT NOT NULL,
		mime_type TEXT NOT NULL,
		encryption_iv TEXT NOT NULL DEFAULT '',
		path TEXT NOT NULL,
		status TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id)`,
	`CREATE TABLE IF NOT EXISTS file_chunks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		file_id TEXT NOT NULL,
		chunk_index INTEGER NOT NULL,
		chunk_hash TEXT NOT NULL,
		chunk_size INTEGER NOT NULL,
		minio_id TEXT NOT NULL,
		FOREIGN KEY(file_id) REFERENCES file_metadata(file_id) ON DELETE CASCADE,
		UNIQUE(file_id, chunk_index)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id)`,
	`CREATE TABLE IF NOT EXISTS federation_servers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		domain TEXT NOT NULL UNIQUE,
		public_key BLOB NOT NULL,
		first_seen_at TEXT NOT NULL,
		last_seen_at TEXT NOT NULL,
		is_blocked INTEGER NOT NULL DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS federation_queues (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		pdu_id TEXT NOT NULL,
		pdu_payload TEXT,
		target_url TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		attempts INTEGER NOT NULL DEFAULT 0,
		last_error TEXT NOT NULL DEFAULT '',
		next_retry TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_federation_queues_status_next_retry ON federation_queues(status, next_retry)`,
	`CREATE INDEX IF NOT EXISTS idx_federation_queues_pdu_id ON federation_queues(pdu_id)`,
	`CREATE TABLE IF NOT EXISTS reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message_id TEXT NOT NULL,
		sender_public_key TEXT NOT NULL,
		recipient_public_key TEXT NOT NULL,
		ciphertext_hash TEXT NOT NULL,
		report_proof TEXT NOT NULL UNIQUE,
		epoch_hash TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_reports_epoch_hash ON reports(epoch_hash)`,
	`CREATE INDEX IF NOT EXISTS idx_reports_sender_public_key ON reports(sender_public_key)`,
	`CREATE TABLE IF NOT EXISTS abuse_scores (
		sender_public_key TEXT PRIMARY KEY,
		score INTEGER NOT NULL DEFAULT 0,
		escalation_level INTEGER NOT NULL DEFAULT 0,
		friction_limit REAL NOT NULL DEFAULT 1.0,
		quarantined_until TEXT NOT NULL DEFAULT '',
		timeout_until TEXT NOT NULL DEFAULT '',
		updated_at TEXT NOT NULL
	)`,
	`ALTER TABLE inboxes ADD COLUMN untrusted INTEGER NOT NULL DEFAULT 0`,
	`INSERT OR IGNORE INTO users (id, username, password_hash, public_key, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000000', 'system_remote_hub', 'no_password_stub_hash', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
	`INSERT OR IGNORE INTO identities (id, user_id, gaia_id, display_name, keys, public_record, is_active, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '@system_remote_hub:localhost', 'System Remote Hub', '{}', '{}', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
	`ALTER TABLE rooms ADD COLUMN description TEXT DEFAULT ''`,
	`ALTER TABLE rooms ADD COLUMN avatar TEXT DEFAULT ''`,
	`ALTER TABLE rooms ADD COLUMN secret_hash TEXT DEFAULT ''`,
	`ALTER TABLE message_envelopes ADD COLUMN channel_id TEXT DEFAULT ''`,
	`CREATE TABLE IF NOT EXISTS channels (
		id TEXT PRIMARY KEY,
		room_id TEXT NOT NULL,
		name TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
	)`,
}
