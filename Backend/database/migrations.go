// STATUS: DIAMANT VGT SUPREME
package database

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const currentSchemaVersion = 3

var sqlIdentifierPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type schemaMigration struct {
	version          int
	name             string
	statements       []string
	checksumMaterial string
	apply            func(context.Context, *sql.Tx) error
}

type appliedMigration struct {
	name     string
	checksum string
}

func migrate(ctx context.Context, db *sql.DB, dbPath string) error {
	if db == nil {
		return errors.New("database connection is required")
	}
	hasApplicationSchema, err := databaseHasApplicationSchema(ctx, db)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		checksum TEXT NOT NULL,
		applied_at TEXT NOT NULL
	)`); err != nil {
		return fmt.Errorf("create schema migration ledger: %w", err)
	}

	applied, err := loadAppliedMigrations(ctx, db)
	if err != nil {
		return err
	}
	if hasApplicationSchema && hasPendingMigrations(applied) && !sqliteMemoryDatabase(dbPath) {
		if _, err := backupDatabaseBeforeMigration(ctx, db, dbPath); err != nil {
			return err
		}
	}
	for _, migration := range registeredMigrations() {
		checksum := migrationChecksum(migration)
		if record, exists := applied[migration.version]; exists {
			if record.name != migration.name || record.checksum != checksum {
				return fmt.Errorf("schema migration %d integrity mismatch", migration.version)
			}
			continue
		}
		if err := applyMigration(ctx, db, migration, checksum); err != nil {
			return fmt.Errorf("apply schema migration %d (%s): %w", migration.version, migration.name, err)
		}
	}
	return verifySchemaVersion(ctx, db)
}

func databaseHasApplicationSchema(ctx context.Context, db *sql.DB) (bool, error) {
	var count int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table'
		  AND name NOT LIKE 'sqlite_%'
		  AND name <> 'schema_migrations'`).Scan(&count); err != nil {
		return false, fmt.Errorf("inspect existing application schema: %w", err)
	}
	return count > 0, nil
}

func hasPendingMigrations(applied map[int]appliedMigration) bool {
	for _, migration := range registeredMigrations() {
		if _, exists := applied[migration.version]; !exists {
			return true
		}
	}
	return false
}

func backupDatabaseBeforeMigration(ctx context.Context, db *sql.DB, dbPath string) (string, error) {
	sourcePath, err := sqliteDatabaseFilePath(dbPath)
	if err != nil {
		return "", err
	}
	info, err := os.Lstat(sourcePath)
	if err != nil {
		return "", fmt.Errorf("inspect database before migration backup: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
		return "", errors.New("database migration backup requires a regular non-symlink file")
	}
	resolvedDirectory, err := filepath.Abs(filepath.Dir(sourcePath))
	if err != nil {
		return "", fmt.Errorf("normalize database backup directory: %w", err)
	}
	directoryInfo, err := os.Lstat(resolvedDirectory)
	if err != nil {
		return "", fmt.Errorf("inspect database backup directory: %w", err)
	}
	if directoryInfo.Mode()&os.ModeSymlink != 0 || !directoryInfo.IsDir() {
		return "", errors.New("database backup directory must be a non-symlink directory")
	}

	randomSuffix := make([]byte, 6)
	if _, err := rand.Read(randomSuffix); err != nil {
		return "", fmt.Errorf("generate migration backup identifier: %w", err)
	}
	backupName := fmt.Sprintf("%s.pre-migrate-v%d-%s.backup", filepath.Base(sourcePath), currentSchemaVersion, hex.EncodeToString(randomSuffix))
	backupPath := filepath.Join(resolvedDirectory, backupName)
	if filepath.Dir(backupPath) != resolvedDirectory {
		return "", errors.New("database migration backup escaped its storage directory")
	}
	if _, err := os.Lstat(backupPath); !errors.Is(err, os.ErrNotExist) {
		if err == nil {
			return "", errors.New("database migration backup destination already exists")
		}
		return "", fmt.Errorf("inspect database migration backup destination: %w", err)
	}
	if _, err := db.ExecContext(ctx, `VACUUM INTO ?`, backupPath); err != nil {
		return "", fmt.Errorf("create consistent database migration backup: %w", err)
	}
	if err := os.Chmod(backupPath, 0o600); err != nil {
		_ = os.Remove(backupPath)
		return "", fmt.Errorf("secure database migration backup permissions: %w", err)
	}
	backupInfo, err := os.Stat(backupPath)
	if err != nil {
		return "", fmt.Errorf("verify database migration backup: %w", err)
	}
	if backupInfo.Size() == 0 {
		_ = os.Remove(backupPath)
		return "", errors.New("database migration backup is empty")
	}
	return backupPath, nil
}

func sqliteDatabaseFilePath(dbPath string) (string, error) {
	trimmed := strings.TrimSpace(dbPath)
	if trimmed == "" || sqliteMemoryDatabase(trimmed) {
		return "", errors.New("database migration backup requires a filesystem database")
	}
	if strings.HasPrefix(strings.ToLower(trimmed), "file:") {
		trimmed = strings.TrimPrefix(trimmed, "file:")
	}
	if separator := strings.IndexByte(trimmed, '?'); separator >= 0 {
		trimmed = trimmed[:separator]
	}
	if trimmed == "" {
		return "", errors.New("database path does not contain a filesystem location")
	}
	absolutePath, err := filepath.Abs(trimmed)
	if err != nil {
		return "", fmt.Errorf("normalize database path: %w", err)
	}
	return filepath.Clean(absolutePath), nil
}

func registeredMigrations() []schemaMigration {
	return []schemaMigration{
		{
			version:    1,
			name:       "core_schema_baseline",
			statements: migrationStatements,
		},
		{
			version:          2,
			name:             "normalize_security_rate_limits",
			checksumMaterial: "replace key/value/expires_at with scope_key/hit_count/window_start/expires_at/updated_at; discard incompatible transient counters; recreate expiry index",
			apply:            normalizeSecurityRateLimits,
		},
		{
			version:    3,
			name:       "transport_neutral_mobile_outbox",
			statements: transportQueueMigrationStatements,
		},
	}
}

func loadAppliedMigrations(ctx context.Context, db *sql.DB) (map[int]appliedMigration, error) {
	rows, err := db.QueryContext(ctx, `SELECT version, name, checksum FROM schema_migrations ORDER BY version`)
	if err != nil {
		return nil, fmt.Errorf("read schema migration ledger: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]appliedMigration)
	for rows.Next() {
		var version int
		var record appliedMigration
		if err := rows.Scan(&version, &record.name, &record.checksum); err != nil {
			return nil, fmt.Errorf("decode schema migration ledger: %w", err)
		}
		if version < 1 || version > currentSchemaVersion {
			return nil, fmt.Errorf("database schema version %d is unsupported by this binary", version)
		}
		applied[version] = record
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate schema migration ledger: %w", err)
	}
	return applied, nil
}

func applyMigration(ctx context.Context, db *sql.DB, migration schemaMigration, checksum string) error {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if migration.apply != nil {
		if err := migration.apply(ctx, tx); err != nil {
			return err
		}
	} else if err := applyMigrationStatements(ctx, tx, migration.statements); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)`,
		migration.version,
		migration.name,
		checksum,
		time.Now().UTC().Format(time.RFC3339Nano),
	); err != nil {
		return fmt.Errorf("record migration: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	committed = true
	return nil
}

func applyMigrationStatements(ctx context.Context, tx *sql.Tx, statements []string) error {
	for index, statement := range statements {
		trimmed := strings.TrimSpace(statement)
		if trimmed == "" || strings.EqualFold(trimmed, "PRAGMA foreign_keys = ON") {
			continue
		}
		table, column, isAddColumn, err := parseAddColumn(trimmed)
		if err != nil {
			return fmt.Errorf("statement %d validation: %w", index+1, err)
		}
		if isAddColumn {
			exists, err := columnExists(ctx, tx, table, column)
			if err != nil {
				return fmt.Errorf("statement %d inspect column: %w", index+1, err)
			}
			if exists {
				continue
			}
		}
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("statement %d failed: %w", index+1, err)
		}
	}
	return nil
}

func parseAddColumn(statement string) (string, string, bool, error) {
	fields := strings.Fields(statement)
	if len(fields) < 6 || !strings.EqualFold(fields[0], "ALTER") || !strings.EqualFold(fields[1], "TABLE") {
		return "", "", false, nil
	}
	if !strings.EqualFold(fields[3], "ADD") || !strings.EqualFold(fields[4], "COLUMN") {
		return "", "", false, errors.New("only ALTER TABLE ADD COLUMN is permitted in managed migrations")
	}
	table := strings.Trim(fields[2], "`\"")
	column := strings.Trim(fields[5], "`\"")
	if !sqlIdentifierPattern.MatchString(table) || !sqlIdentifierPattern.MatchString(column) {
		return "", "", false, errors.New("migration contains an invalid SQL identifier")
	}
	return table, column, true, nil
}

func columnExists(ctx context.Context, tx *sql.Tx, table, column string) (bool, error) {
	columns, err := tableColumns(ctx, tx, table)
	if err != nil {
		return false, err
	}
	_, exists := columns[column]
	return exists, nil
}

func tableColumns(ctx context.Context, tx *sql.Tx, table string) (map[string]struct{}, error) {
	if !sqlIdentifierPattern.MatchString(table) {
		return nil, errors.New("invalid table identifier")
	}
	rows, err := tx.QueryContext(ctx, `PRAGMA table_info("`+table+`")`)
	if err != nil {
		return nil, fmt.Errorf("inspect table %s: %w", table, err)
	}
	defer rows.Close()

	columns := make(map[string]struct{})
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, primaryKey int
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &primaryKey); err != nil {
			return nil, fmt.Errorf("decode table %s metadata: %w", table, err)
		}
		columns[name] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate table %s metadata: %w", table, err)
	}
	return columns, nil
}

func normalizeSecurityRateLimits(ctx context.Context, tx *sql.Tx) error {
	columns, err := tableColumns(ctx, tx, "security_rate_limits")
	if err != nil {
		return err
	}
	expected := []string{"scope_key", "hit_count", "window_start", "expires_at", "updated_at"}
	if exactColumnSet(columns, expected) {
		return nil
	}
	if len(columns) == 0 {
		return errors.New("security_rate_limits table is missing after baseline migration")
	}
	legacyColumns, err := tableColumns(ctx, tx, "security_rate_limits_legacy_v1")
	if err != nil {
		return err
	}
	if len(legacyColumns) != 0 {
		return errors.New("legacy rate-limit recovery table already exists")
	}

	if _, err := tx.ExecContext(ctx, `DROP INDEX IF EXISTS idx_security_rate_limits_expiry`); err != nil {
		return fmt.Errorf("drop legacy rate-limit index: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `ALTER TABLE security_rate_limits RENAME TO security_rate_limits_legacy_v1`); err != nil {
		return fmt.Errorf("preserve legacy rate-limit table: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `CREATE TABLE security_rate_limits (
		scope_key TEXT PRIMARY KEY,
		hit_count INTEGER NOT NULL CHECK(hit_count >= 0),
		window_start TEXT NOT NULL,
		expires_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`); err != nil {
		return fmt.Errorf("create normalized rate-limit table: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `CREATE INDEX idx_security_rate_limits_expiry ON security_rate_limits(expires_at)`); err != nil {
		return fmt.Errorf("create rate-limit expiry index: %w", err)
	}
	// Rate-limit rows are intentionally not copied: they are transient counters whose
	// legacy timestamps cannot be converted into the new fixed-window semantics safely.
	if _, err := tx.ExecContext(ctx, `DROP TABLE security_rate_limits_legacy_v1`); err != nil {
		return fmt.Errorf("remove migrated legacy rate-limit table: %w", err)
	}
	return nil
}

func exactColumnSet(columns map[string]struct{}, expected []string) bool {
	if len(columns) != len(expected) {
		return false
	}
	for _, column := range expected {
		if _, exists := columns[column]; !exists {
			return false
		}
	}
	return true
}

func migrationChecksum(migration schemaMigration) string {
	parts := make([]string, 0, len(migration.statements)+3)
	parts = append(parts, fmt.Sprintf("%d", migration.version), migration.name)
	parts = append(parts, migration.statements...)
	if migration.apply != nil {
		parts = append(parts, migration.checksumMaterial)
	}
	digest := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(digest[:])
}

func verifySchemaVersion(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations ORDER BY version`)
	if err != nil {
		return fmt.Errorf("verify schema version: %w", err)
	}
	defer rows.Close()
	versions := make([]int, 0, currentSchemaVersion)
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return fmt.Errorf("decode schema version: %w", err)
		}
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate schema versions: %w", err)
	}
	sort.Ints(versions)
	if len(versions) != currentSchemaVersion {
		return fmt.Errorf("schema is incomplete: applied %d of %d migrations", len(versions), currentSchemaVersion)
	}
	for index, version := range versions {
		if version != index+1 {
			return fmt.Errorf("schema migration sequence has a gap before version %d", index+1)
		}
	}
	return nil
}
