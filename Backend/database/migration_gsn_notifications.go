package database

// gsnNotificationMigrationStatements introduces the persistent notification ledger
// for real social events (follow / comment / reaction). The unique key makes event
// notification idempotent, so replaying a like or re-following never duplicates
// entries; rows are only ever created from real stored events.
var gsnNotificationMigrationStatements = []string{
	`CREATE TABLE gsn_notifications (
		id TEXT PRIMARY KEY,
		recipient_gaia_id TEXT NOT NULL,
		actor_gaia_id TEXT NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('follow', 'comment', 'reaction')),
		post_id TEXT NOT NULL DEFAULT '',
		comment_id TEXT NOT NULL DEFAULT '',
		preview TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		read_at TEXT NOT NULL DEFAULT '',
		UNIQUE(recipient_gaia_id, actor_gaia_id, type, post_id, comment_id)
	)`,
	`CREATE INDEX idx_gsn_notifications_recipient
		ON gsn_notifications(recipient_gaia_id, created_at)`,
}
