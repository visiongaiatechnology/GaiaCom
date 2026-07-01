// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package database

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/config"

	_ "modernc.org/sqlite"
)

func ConnectDB(cfg *config.Config) *sql.DB {
	dbDriver := "sqlite"
	if cfg != nil && strings.TrimSpace(cfg.DBDriver) != "" {
		dbDriver = strings.ToLower(strings.TrimSpace(cfg.DBDriver))
	}
	if envDriver := strings.TrimSpace(os.Getenv("DB_DRIVER")); envDriver != "" {
		dbDriver = strings.ToLower(envDriver)
	}
	if dbDriver != "sqlite" {
		log.Fatalf("Unsupported DB_DRIVER=%q. Current backend binary is SQLite-only; use sqlite until the Postgres dialect migration is enabled.", dbDriver)
	}

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
	maxOpenConns := sqliteMaxOpenConns(dbPath)
	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxOpenConns)
	if _, err := db.Exec("PRAGMA busy_timeout=10000;"); err != nil {
		log.Printf("Warning: failed to set busy_timeout: %v", err)
	}
	if dbPath != ":memory:" && !strings.Contains(dbPath, "mode=memory") {
		if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
			log.Printf("Warning: failed to enable WAL mode: %v", err)
		}
	}
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

func sqliteMaxOpenConns(dbPath string) int {
	if dbPath == ":memory:" || strings.Contains(dbPath, "mode=memory") {
		return 1
	}
	value := strings.TrimSpace(os.Getenv("SQLITE_MAX_OPEN_CONNS"))
	if value == "" {
		return 4
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		log.Printf("Warning: invalid SQLITE_MAX_OPEN_CONNS=%q, using 4", value)
		return 4
	}
	if parsed > 32 {
		return 32
	}
	return parsed
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
		allow_anonymous_stats INTEGER NOT NULL DEFAULT 1,
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
	`ALTER TABLE message_envelopes ADD COLUMN read_receipt_source_id TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE message_envelopes ADD COLUMN client_message_id TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE message_envelopes ADD COLUMN replaced_by_message_id TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE message_envelopes ADD COLUMN edited_at TEXT NOT NULL DEFAULT ''`,
	`CREATE INDEX IF NOT EXISTS idx_message_envelopes_client_message_id ON message_envelopes(client_message_id)`,
	`CREATE INDEX IF NOT EXISTS idx_message_envelopes_replaced_by_message_id ON message_envelopes(replaced_by_message_id)`,
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
	`CREATE TABLE IF NOT EXISTS message_read_receipts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		reader TEXT NOT NULL,
		read_at TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(message_id, identity_id)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id)`,
	`CREATE INDEX IF NOT EXISTS idx_message_read_receipts_identity_id ON message_read_receipts(identity_id)`,
	`CREATE TABLE IF NOT EXISTS message_reactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		emoji TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(message_id, identity_id, emoji)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id)`,
	`CREATE INDEX IF NOT EXISTS idx_message_reactions_identity_id ON message_reactions(identity_id)`,
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
	`ALTER TABLE file_metadata ADD COLUMN public_access INTEGER NOT NULL DEFAULT 0`,
	`CREATE INDEX IF NOT EXISTS idx_file_metadata_public_access ON file_metadata(public_access)`,
	`CREATE TABLE IF NOT EXISTS file_access_grants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		file_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		granted_by TEXT NOT NULL,
		created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL DEFAULT '',
		FOREIGN KEY(file_id) REFERENCES file_metadata(file_id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		FOREIGN KEY(granted_by) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(file_id, user_id, identity_id)
	)`,
	`ALTER TABLE file_access_grants ADD COLUMN expires_at TEXT NOT NULL DEFAULT ''`,
	`CREATE INDEX IF NOT EXISTS idx_file_access_grants_user_file ON file_access_grants(user_id, file_id)`,
	`CREATE INDEX IF NOT EXISTS idx_file_access_grants_file ON file_access_grants(file_id)`,
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
	`CREATE TABLE IF NOT EXISTS node_registry_entries (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		domain TEXT NOT NULL UNIQUE,
		server_name TEXT NOT NULL DEFAULT '',
		public_key BLOB NOT NULL,
		core_hash TEXT NOT NULL DEFAULT '',
		node_version TEXT NOT NULL DEFAULT '',
		operator_gaia_id TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'pending',
		last_error TEXT NOT NULL DEFAULT '',
		ping_count INTEGER NOT NULL DEFAULT 0,
		first_seen_at TEXT NOT NULL,
		last_seen_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_node_registry_status ON node_registry_entries(status)`,
	`CREATE INDEX IF NOT EXISTS idx_node_registry_last_seen ON node_registry_entries(last_seen_at)`,
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
	`ALTER TABLE users ADD COLUMN allow_anonymous_stats INTEGER NOT NULL DEFAULT 1`,
	`ALTER TABLE inboxes ADD COLUMN untrusted INTEGER NOT NULL DEFAULT 0`,
	`INSERT OR IGNORE INTO users (id, username, password_hash, public_key, allow_anonymous_stats, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000000', 'system_remote_hub', 'no_password_stub_hash', '', 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
	`UPDATE users SET allow_anonymous_stats = 0 WHERE id = '00000000-0000-0000-0000-000000000000'`,
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
	`CREATE TABLE IF NOT EXISTS public_channels (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		avatar TEXT,
		created_by TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(created_by) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channels_created_at ON public_channels(created_at)`,
	`CREATE TABLE IF NOT EXISTS public_channel_admins (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		channel_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'admin',
		created_at TEXT NOT NULL,
		FOREIGN KEY(channel_id) REFERENCES public_channels(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(channel_id, identity_id)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_admins_channel_id ON public_channel_admins(channel_id)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_admins_identity_id ON public_channel_admins(identity_id)`,
	`CREATE TABLE IF NOT EXISTS public_channel_subscribers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		channel_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(channel_id) REFERENCES public_channels(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(channel_id, identity_id)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_subscribers_channel_id ON public_channel_subscribers(channel_id)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_subscribers_identity_id ON public_channel_subscribers(identity_id)`,
	`CREATE TABLE IF NOT EXISTS public_channel_posts (
		id TEXT PRIMARY KEY,
		channel_id TEXT NOT NULL,
		author_identity_id TEXT NOT NULL,
		body TEXT NOT NULL DEFAULT '',
		formatting TEXT,
		attachments TEXT,
		created_at TEXT NOT NULL,
		FOREIGN KEY(channel_id) REFERENCES public_channels(id) ON DELETE CASCADE,
		FOREIGN KEY(author_identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_posts_channel_id_created_at ON public_channel_posts(channel_id, created_at)`,
	`CREATE TABLE IF NOT EXISTS public_channel_post_reactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		emoji TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(post_id) REFERENCES public_channel_posts(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(post_id, identity_id, emoji)
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_post_reactions_post_id ON public_channel_post_reactions(post_id)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_post_reactions_identity_id ON public_channel_post_reactions(identity_id)`,
	`CREATE TABLE IF NOT EXISTS public_channel_post_comments (
		id TEXT PRIMARY KEY,
		post_id TEXT NOT NULL,
		author_identity_id TEXT NOT NULL,
		body TEXT NOT NULL,
		created_at TEXT NOT NULL,
		deleted_at TEXT NOT NULL DEFAULT '',
		FOREIGN KEY(post_id) REFERENCES public_channel_posts(id) ON DELETE CASCADE,
		FOREIGN KEY(author_identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_post_comments_post_created ON public_channel_post_comments(post_id, created_at)`,
	`CREATE INDEX IF NOT EXISTS idx_public_channel_post_comments_author ON public_channel_post_comments(author_identity_id)`,
	`ALTER TABLE public_channels ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1`,
	`ALTER TABLE public_channel_posts ADD COLUMN pinned_at TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE public_channels ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0`,
	`ALTER TABLE public_channels ADD COLUMN suspension_reason TEXT NOT NULL DEFAULT ''`,
	`CREATE TABLE IF NOT EXISTS governance_policies (
		id TEXT PRIMARY KEY,
		version TEXT NOT NULL UNIQUE,
		effective_from TEXT NOT NULL,
		categories TEXT NOT NULL,
		thresholds TEXT NOT NULL,
		signed_by TEXT NOT NULL,
		signature_bundle TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS role_credentials (
		id TEXT PRIMARY KEY,
		role TEXT NOT NULL,
		subject_identity TEXT NOT NULL,
		subject_public_key TEXT NOT NULL,
		scope TEXT NOT NULL,
		valid_from TEXT NOT NULL,
		valid_until TEXT NOT NULL,
		permissions TEXT NOT NULL,
		cannot TEXT NOT NULL,
		issuer TEXT NOT NULL,
		policy_hash TEXT NOT NULL,
		signature TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS role_credential_revocations (
		id TEXT PRIMARY KEY,
		credential_id TEXT NOT NULL,
		revoked_at TEXT NOT NULL,
		reason_code TEXT NOT NULL,
		policy_hash TEXT NOT NULL,
		signed_by TEXT NOT NULL,
		signature_bundle TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS abuse_cases (
		id TEXT PRIMARY KEY,
		case_type TEXT NOT NULL,
		category TEXT NOT NULL,
		severity TEXT NOT NULL,
		reporter_identity_hash TEXT NOT NULL,
		reported_identity_hash TEXT NOT NULL,
		reported_node TEXT NOT NULL,
		message_id TEXT,
		message_hash TEXT NOT NULL,
		gaia_proof TEXT,
		disclosure TEXT,
		status TEXT NOT NULL,
		decision TEXT,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS abuse_case_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		case_id TEXT NOT NULL,
		event_type TEXT NOT NULL,
		actor_identity TEXT NOT NULL,
		details TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		FOREIGN KEY(case_id) REFERENCES abuse_cases(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS abuse_reviews (
		id TEXT PRIMARY KEY,
		case_id TEXT NOT NULL,
		reviewer_identity TEXT NOT NULL,
		credential_id TEXT NOT NULL,
		reviewed_at TEXT NOT NULL,
		category_vote TEXT NOT NULL,
		severity_vote TEXT NOT NULL,
		recommendation TEXT NOT NULL,
		reason_code TEXT NOT NULL,
		visible_reason TEXT NOT NULL,
		private_note_hash TEXT NOT NULL,
		signature TEXT NOT NULL,
		FOREIGN KEY(case_id) REFERENCES abuse_cases(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS abuse_actions (
		id TEXT PRIMARY KEY,
		case_id TEXT NOT NULL,
		target_type TEXT NOT NULL,
		target_id TEXT NOT NULL,
		action_type TEXT NOT NULL,
		severity TEXT NOT NULL,
		applied_at TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		reason TEXT NOT NULL,
		signature TEXT NOT NULL,
		FOREIGN KEY(case_id) REFERENCES abuse_cases(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS abuse_appeals (
		id TEXT PRIMARY KEY,
		case_id TEXT NOT NULL,
		submitted_by TEXT NOT NULL,
		submitted_at TEXT NOT NULL,
		reason TEXT NOT NULL,
		statement TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		decision_reason TEXT NOT NULL DEFAULT '',
		decided_at TEXT NOT NULL DEFAULT '',
		decided_by TEXT NOT NULL DEFAULT '',
		signature TEXT NOT NULL,
		FOREIGN KEY(case_id) REFERENCES abuse_cases(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS federation_abuse_signals (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		reported_identity_hash TEXT NOT NULL,
		source_node TEXT NOT NULL,
		case_hash TEXT NOT NULL,
		category TEXT NOT NULL,
		severity TEXT NOT NULL,
		action_taken TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		signature TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS transparency_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		node TEXT NOT NULL,
		period TEXT NOT NULL,
		snapshot_data TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		signature TEXT NOT NULL
	)`,
	`ALTER TABLE public_channels ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0`,
	`CREATE TABLE IF NOT EXISTS security_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT UNIQUE NOT NULL,
		owner_user_id TEXT,
		owner_identity_id TEXT,
		node_id TEXT NOT NULL,
		category TEXT NOT NULL,
		severity TEXT NOT NULL,
		source TEXT NOT NULL,
		summary TEXT NOT NULL,
		action TEXT NOT NULL,
		public_visible INTEGER NOT NULL DEFAULT 0,
		user_visible INTEGER NOT NULL DEFAULT 0,
		node_visible INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		acknowledged_at TEXT
	)`,
	`CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(owner_user_id)`,
	`CREATE TABLE IF NOT EXISTS security_event_private_context (
		event_id TEXT PRIMARY KEY,
		ip_hash TEXT NOT NULL,
		user_agent_hash TEXT NOT NULL,
		rule_id TEXT NOT NULL,
		request_id TEXT NOT NULL,
		internal_context_json TEXT NOT NULL,
		created_at TEXT NOT NULL,
		retention_until TEXT NOT NULL,
		FOREIGN KEY(event_id) REFERENCES security_events(event_id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS security_rules (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		enabled INTEGER NOT NULL DEFAULT 1
	)`,
	`CREATE TABLE IF NOT EXISTS security_rule_hits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		rule_id TEXT NOT NULL,
		event_id TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(rule_id) REFERENCES security_rules(id) ON DELETE CASCADE,
		FOREIGN KEY(event_id) REFERENCES security_events(event_id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS security_user_acknowledgements (
		event_id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		acknowledged_at TEXT NOT NULL,
		FOREIGN KEY(event_id) REFERENCES security_events(event_id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS security_rate_limits (
		key TEXT PRIMARY KEY,
		value INTEGER NOT NULL,
		expires_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS security_quarantines (
		id TEXT PRIMARY KEY,
		target TEXT NOT NULL,
		reason TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS security_audit_chain (
		event_id TEXT PRIMARY KEY,
		previous_hash TEXT NOT NULL,
		event_hash TEXT NOT NULL,
		created_at TEXT NOT NULL,
		signature TEXT NOT NULL DEFAULT '',
		FOREIGN KEY(event_id) REFERENCES security_events(event_id) ON DELETE CASCADE
	)`,
	`CREATE TRIGGER IF NOT EXISTS trg_security_events_immutable_update
	BEFORE UPDATE ON security_events
	WHEN OLD.event_id != NEW.event_id
	  OR COALESCE(OLD.owner_user_id, '') != COALESCE(NEW.owner_user_id, '')
	  OR COALESCE(OLD.owner_identity_id, '') != COALESCE(NEW.owner_identity_id, '')
	  OR OLD.node_id != NEW.node_id
	  OR OLD.category != NEW.category
	  OR OLD.severity != NEW.severity
	  OR OLD.source != NEW.source
	  OR OLD.summary != NEW.summary
	  OR OLD.action != NEW.action
	  OR OLD.public_visible != NEW.public_visible
	  OR OLD.user_visible != NEW.user_visible
	  OR OLD.node_visible != NEW.node_visible
	  OR OLD.created_at != NEW.created_at
	BEGIN
		SELECT RAISE(ABORT, 'security event immutable fields cannot be changed');
	END`,
	`CREATE TRIGGER IF NOT EXISTS trg_security_events_no_delete
	BEFORE DELETE ON security_events
	BEGIN
		SELECT RAISE(ABORT, 'security events are append-only');
	END`,
	`CREATE TRIGGER IF NOT EXISTS trg_security_audit_chain_no_update
	BEFORE UPDATE ON security_audit_chain
	BEGIN
		SELECT RAISE(ABORT, 'security audit chain is append-only');
	END`,
	`CREATE TRIGGER IF NOT EXISTS trg_security_audit_chain_no_delete
	BEFORE DELETE ON security_audit_chain
	BEGIN
		SELECT RAISE(ABORT, 'security audit chain is append-only');
	END`,
	`CREATE TABLE IF NOT EXISTS mailbox_states (
		user_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		message_id TEXT NOT NULL,
		folder TEXT NOT NULL DEFAULT 'inbox',
		is_read INTEGER NOT NULL DEFAULT 0,
		is_starred INTEGER NOT NULL DEFAULT 0,
		is_important INTEGER NOT NULL DEFAULT 0,
		is_spam INTEGER NOT NULL DEFAULT 0,
		is_archived INTEGER NOT NULL DEFAULT 0,
		labels TEXT NOT NULL DEFAULT '[]',
		snoozed_until TEXT NOT NULL DEFAULT '',
		updated_at TEXT NOT NULL,
		PRIMARY KEY(user_id, identity_id, message_id),
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_mailbox_states_identity_folder ON mailbox_states(identity_id, folder)`,
	`CREATE INDEX IF NOT EXISTS idx_mailbox_states_user_updated ON mailbox_states(user_id, updated_at)`,
	`CREATE TABLE IF NOT EXISTS identity_presence (
		identity_id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		gaia_id TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'online',
		last_seen_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_identity_presence_gaia_id ON identity_presence(gaia_id)`,
	`CREATE INDEX IF NOT EXISTS idx_identity_presence_last_seen_at ON identity_presence(last_seen_at)`,
	`CREATE TABLE IF NOT EXISTS mail_drafts (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		recipient_gaia TEXT NOT NULL DEFAULT '',
		recipient_ids TEXT NOT NULL DEFAULT '[]',
		subject TEXT NOT NULL DEFAULT '',
		body TEXT NOT NULL DEFAULT '',
		envelope_draft TEXT,
		attachments TEXT,
		scheduled_for TEXT NOT NULL DEFAULT '',
		security_warning TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_mail_drafts_user_identity ON mail_drafts(user_id, identity_id)`,
	`CREATE TABLE IF NOT EXISTS mail_labels (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		name TEXT NOT NULL,
		color TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(user_id, name)
	)`,
	`CREATE TABLE IF NOT EXISTS mail_contacts (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		gaia_id TEXT NOT NULL DEFAULT '',
		display_name TEXT NOT NULL DEFAULT '',
		email TEXT NOT NULL DEFAULT '',
		trust_note TEXT NOT NULL DEFAULT '',
		public_key TEXT NOT NULL DEFAULT '',
		blocked INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_mail_contacts_user_lookup ON mail_contacts(user_id, gaia_id, email)`,
	`CREATE TABLE IF NOT EXISTS mail_filter_rules (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		sender_contains TEXT NOT NULL DEFAULT '',
		subject_contains TEXT NOT NULL DEFAULT '',
		assign_label TEXT NOT NULL DEFAULT '',
		target_folder TEXT NOT NULL DEFAULT '',
		mark_important INTEGER NOT NULL DEFAULT 0,
		enabled INTEGER NOT NULL DEFAULT 1,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_mail_filter_rules_user ON mail_filter_rules(user_id, enabled)`,
	`CREATE TABLE IF NOT EXISTS mail_settings (
		user_id TEXT PRIMARY KEY,
		signature TEXT NOT NULL DEFAULT '',
		locale TEXT NOT NULL DEFAULT 'de',
		theme TEXT NOT NULL DEFAULT 'dark',
		keyboard_mode TEXT NOT NULL DEFAULT 'default',
		updated_at TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`ALTER TABLE rooms ADD COLUMN read_only INTEGER DEFAULT 0`,
	`ALTER TABLE rooms ADD COLUMN slow_mode_seconds INTEGER DEFAULT 0`,
	`ALTER TABLE rooms ADD COLUMN top_secret INTEGER DEFAULT 0`,
	`CREATE TABLE IF NOT EXISTS room_pinned_messages (
		room_id TEXT NOT NULL,
		channel_id TEXT NOT NULL,
		message_id TEXT NOT NULL,
		pinned_by TEXT NOT NULL,
		pinned_at TEXT NOT NULL,
		PRIMARY KEY(room_id, channel_id, message_id),
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
		FOREIGN KEY(message_id) REFERENCES message_envelopes(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS room_invite_links (
		id TEXT PRIMARY KEY,
		room_id TEXT NOT NULL,
		created_by TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		max_uses INTEGER DEFAULT 0,
		uses INTEGER DEFAULT 0,
		created_at TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS room_join_requests (
		id TEXT PRIMARY KEY,
		room_id TEXT NOT NULL,
		identity_id TEXT NOT NULL,
		status TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		UNIQUE(room_id, identity_id)
	)`,
	`CREATE TABLE IF NOT EXISTS room_moderation_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		room_id TEXT NOT NULL,
		actor_identity_id TEXT NOT NULL,
		action TEXT NOT NULL,
		target_id TEXT NOT NULL DEFAULT '',
		details TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
	)`,
	`ALTER TABLE public_channels ADD COLUMN category TEXT NOT NULL DEFAULT 'General'`,
	`ALTER TABLE public_channel_posts ADD COLUMN scheduled_for TEXT NOT NULL DEFAULT ''`,
	`ALTER TABLE public_channel_post_comments ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`,
	`CREATE TABLE IF NOT EXISTS public_channel_blocks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		identity_id TEXT NOT NULL,
		channel_id TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE,
		FOREIGN KEY(channel_id) REFERENCES public_channels(id) ON DELETE CASCADE,
		UNIQUE(identity_id, channel_id)
	)`,
	`CREATE TABLE IF NOT EXISTS gsn_posts (
		id TEXT PRIMARY KEY,
		gaia_id TEXT NOT NULL,
		display_name TEXT NOT NULL,
		avatar TEXT NOT NULL DEFAULT '',
		node_id TEXT NOT NULL,
		timestamp TEXT NOT NULL,
		body TEXT NOT NULL,
		image_attachment TEXT NOT NULL DEFAULT '',
		signature TEXT NOT NULL,
		repost_of_post_id TEXT NOT NULL DEFAULT '',
		is_verified_operator INTEGER DEFAULT 0,
		is_verified_governance INTEGER DEFAULT 0,
		is_verified_passport INTEGER DEFAULT 0
	)`,
	`CREATE INDEX IF NOT EXISTS idx_gsn_posts_node ON gsn_posts(node_id)`,
	`CREATE INDEX IF NOT EXISTS idx_gsn_posts_gaia ON gsn_posts(gaia_id)`,
	`CREATE TABLE IF NOT EXISTS gsn_post_comments (
		id TEXT PRIMARY KEY,
		post_id TEXT NOT NULL,
		gaia_id TEXT NOT NULL,
		display_name TEXT NOT NULL,
		avatar TEXT NOT NULL DEFAULT '',
		timestamp TEXT NOT NULL,
		body TEXT NOT NULL,
		signature TEXT NOT NULL,
		FOREIGN KEY(post_id) REFERENCES gsn_posts(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS idx_gsn_comments_post ON gsn_post_comments(post_id)`,
	`CREATE TABLE IF NOT EXISTS gsn_post_reactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id TEXT NOT NULL,
		gaia_id TEXT NOT NULL,
		emoji TEXT NOT NULL,
		FOREIGN KEY(post_id) REFERENCES gsn_posts(id) ON DELETE CASCADE,
		UNIQUE(post_id, gaia_id, emoji)
	)`,
	`CREATE TABLE IF NOT EXISTS gsn_follows (
		follower_gaia_id TEXT NOT NULL,
		following_gaia_id TEXT NOT NULL,
		created_at TEXT NOT NULL,
		PRIMARY KEY(follower_gaia_id, following_gaia_id)
	)`,
	`CREATE TABLE IF NOT EXISTS gsn_profiles (
		identity_id TEXT PRIMARY KEY,
		display_name TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		avatar TEXT NOT NULL DEFAULT '',
		website TEXT NOT NULL DEFAULT '',
		is_verified_operator INTEGER DEFAULT 0,
		is_verified_governance INTEGER DEFAULT 0,
		is_verified_passport INTEGER DEFAULT 0,
		trust_passport_summary TEXT NOT NULL DEFAULT '',
		updated_at TEXT NOT NULL,
		FOREIGN KEY(identity_id) REFERENCES identities(id) ON DELETE CASCADE
	)`,
	`ALTER TABLE mail_settings ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0`,
}
