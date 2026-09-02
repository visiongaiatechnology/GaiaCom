// STATUS: DIAMANT VGT SUPREME
package database

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/config"
)

func TestConnectDBRejectsUnsupportedDriverWithoutTerminatingProcess(t *testing.T) {
	t.Setenv("DB_DRIVER", "postgres")
	db, err := ConnectDB(&config.Config{DBDriver: "postgres"})
	if err == nil || db != nil {
		t.Fatalf("unsupported driver was accepted: db=%v err=%v", db, err)
	}
	if !strings.Contains(err.Error(), "SQLite-only") {
		t.Fatalf("unexpected driver error: %v", err)
	}
}

func TestLegacyRateLimitSchemaIsNormalizedTransactionally(t *testing.T) {
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_PATH", "")
	databasePath := filepath.Join(t.TempDir(), "legacy-rate-limit.db")

	legacyDB, err := sql.Open("sqlite", databasePath)
	if err != nil {
		t.Fatalf("open legacy database: %v", err)
	}
	if _, err := legacyDB.Exec(`CREATE TABLE security_rate_limits (
		key TEXT PRIMARY KEY,
		value INTEGER NOT NULL,
		expires_at TEXT NOT NULL
	)`); err != nil {
		t.Fatalf("create legacy rate-limit table: %v", err)
	}
	if _, err := legacyDB.Exec(`INSERT INTO security_rate_limits (key, value, expires_at) VALUES ('login:test', 99, '2999-01-01T00:00:00Z')`); err != nil {
		t.Fatalf("seed legacy rate-limit row: %v", err)
	}
	if err := legacyDB.Close(); err != nil {
		t.Fatalf("close legacy database: %v", err)
	}

	db, err := ConnectDB(&config.Config{DatabasePath: databasePath})
	if err != nil {
		t.Fatalf("migrate legacy database: %v", err)
	}
	defer db.Close()
	backupPattern := databasePath + ".pre-migrate-v" + strconv.Itoa(currentSchemaVersion) + "-*.backup"
	backups, err := filepath.Glob(backupPattern)
	if err != nil {
		t.Fatalf("find migration backup: %v", err)
	}
	if len(backups) != 1 {
		t.Fatalf("migration backups=%v, want exactly one", backups)
	}
	backupInfo, err := os.Stat(backups[0])
	if err != nil {
		t.Fatalf("inspect migration backup: %v", err)
	}
	if backupInfo.Size() == 0 {
		t.Fatal("migration backup is empty")
	}

	rows, err := db.Query(`PRAGMA table_info("security_rate_limits")`)
	if err != nil {
		t.Fatalf("inspect normalized table: %v", err)
	}
	columns := make(map[string]struct{})
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, primaryKey int
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &primaryKey); err != nil {
			rows.Close()
			t.Fatalf("decode normalized table metadata: %v", err)
		}
		columns[name] = struct{}{}
	}
	if err := rows.Close(); err != nil {
		t.Fatalf("close normalized table metadata: %v", err)
	}
	for _, expected := range []string{"scope_key", "hit_count", "window_start", "expires_at", "updated_at"} {
		if _, exists := columns[expected]; !exists {
			t.Fatalf("normalized rate-limit column %q is missing: %#v", expected, columns)
		}
	}
	if _, exists := columns["key"]; exists {
		t.Fatalf("legacy rate-limit key column survived migration")
	}

	var rowCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM security_rate_limits`).Scan(&rowCount); err != nil {
		t.Fatalf("count normalized rate-limit rows: %v", err)
	}
	if rowCount != 0 {
		t.Fatalf("legacy transient counters were copied into incompatible schema: %d", rowCount)
	}
	var migrationCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&migrationCount); err != nil {
		t.Fatalf("count schema migrations: %v", err)
	}
	if migrationCount != currentSchemaVersion {
		t.Fatalf("applied migrations=%d, want %d", migrationCount, currentSchemaVersion)
	}
}

func TestMigrationLedgerRejectsChecksumTampering(t *testing.T) {
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_PATH", "")
	databasePath := filepath.Join(t.TempDir(), "tampered-ledger.db")
	db, err := ConnectDB(&config.Config{DatabasePath: databasePath})
	if err != nil {
		t.Fatalf("create database: %v", err)
	}
	if _, err := db.Exec(`UPDATE schema_migrations SET checksum = 'tampered' WHERE version = 1`); err != nil {
		t.Fatalf("tamper migration ledger: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close database: %v", err)
	}

	reopened, err := ConnectDB(&config.Config{DatabasePath: databasePath})
	if err == nil || reopened != nil {
		if reopened != nil {
			_ = reopened.Close()
		}
		t.Fatalf("tampered migration ledger was accepted: db=%v err=%v", reopened, err)
	}
	if !strings.Contains(err.Error(), "integrity mismatch") {
		t.Fatalf("unexpected tamper error: %v", err)
	}
}

func TestEveryPooledConnectionEnforcesSQLiteInvariants(t *testing.T) {
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_PATH", "")
	t.Setenv("SQLITE_MAX_OPEN_CONNS", "4")
	db, err := ConnectDB(&config.Config{DatabasePath: t.TempDir() + "/pool-invariants.db"})
	if err != nil {
		t.Fatalf("connect database: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	connections := make([]interface{ Close() error }, 0, 4)
	for index := 0; index < 4; index++ {
		connection, err := db.Conn(ctx)
		if err != nil {
			t.Fatalf("checkout connection %d: %v", index, err)
		}
		connections = append(connections, connection)
		for pragma, expected := range map[string]int{"foreign_keys": 1, "busy_timeout": 10000, "synchronous": 2} {
			var actual int
			if err := connection.QueryRowContext(ctx, "PRAGMA "+pragma).Scan(&actual); err != nil {
				t.Fatalf("query %s on connection %d: %v", pragma, index, err)
			}
			if actual != expected {
				t.Fatalf("connection %d has %s=%d, want %d", index, pragma, actual, expected)
			}
		}
	}
	for _, connection := range connections {
		if err := connection.Close(); err != nil {
			t.Fatalf("close pooled connection: %v", err)
		}
	}

	var journalMode string
	if err := db.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journalMode); err != nil {
		t.Fatalf("query journal mode: %v", err)
	}
	if !strings.EqualFold(journalMode, "wal") {
		t.Fatalf("journal mode=%q, want wal", journalMode)
	}
}
