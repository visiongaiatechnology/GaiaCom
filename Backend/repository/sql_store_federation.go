// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"gaiacom/backend/models"
)

func (s *SQLStore) AddFederationQueueItem(item *models.FederationQueue) error {
	now := utcNow()
	item.CreatedAt = now
	item.UpdatedAt = now
	if item.Status == "" {
		item.Status = models.QueueStatusPending
	}
	result, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO federation_queues (pdu_id, pdu_payload, target_url, status, attempts, last_error, next_retry, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		item.PDUID,
		[]byte(item.PDUPayload),
		item.TargetURL,
		string(item.Status),
		item.Attempts,
		item.LastError,
		formatTime(item.NextRetry),
		formatTime(item.CreatedAt),
		formatTime(item.UpdatedAt),
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		item.ID = uint(id)
	}
	return nil
}

func (s *SQLStore) ClaimNextFederationQueueItem(ctx context.Context) (*models.FederationQueue, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollbackUnlessCommitted(tx, &err)

	item, err := scanFederationQueue(tx.QueryRowContext(
		ctx,
		`SELECT id, pdu_id, pdu_payload, target_url, status, attempts, last_error, next_retry, created_at, updated_at
		 FROM federation_queues
		 WHERE status = ? AND next_retry <= ?
		 ORDER BY next_retry ASC
		 LIMIT 1`,
		string(models.QueueStatusPending),
		formatTime(utcNow()),
	))
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.Commit()
		return nil, err
	}
	if err != nil {
		return nil, err
	}

	item.Status = models.QueueStatusSending
	item.Attempts++
	item.UpdatedAt = utcNow()
	result, err := tx.ExecContext(
		ctx,
		`UPDATE federation_queues SET status = ?, attempts = ?, updated_at = ? WHERE id = ? AND status = ?`,
		string(item.Status),
		item.Attempts,
		formatTime(item.UpdatedAt),
		item.ID,
		string(models.QueueStatusPending),
	)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		err = tx.Commit()
		return nil, err
	}

	err = tx.Commit()
	return item, err
}

func (s *SQLStore) DeleteFederationQueueItem(ctx context.Context, itemID uint) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM federation_queues WHERE id = ?`, itemID)
	return err
}

func (s *SQLStore) SaveFederationQueueItem(ctx context.Context, item *models.FederationQueue) error {
	item.UpdatedAt = utcNow()
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE federation_queues
		 SET pdu_id = ?, pdu_payload = ?, target_url = ?, status = ?, attempts = ?, last_error = ?, next_retry = ?, updated_at = ?
		 WHERE id = ?`,
		item.PDUID,
		[]byte(item.PDUPayload),
		item.TargetURL,
		string(item.Status),
		item.Attempts,
		item.LastError,
		formatTime(item.NextRetry),
		formatTime(item.UpdatedAt),
		item.ID,
	)
	return err
}

func (s *SQLStore) FindFederationServer(domain string) (*models.FederationServer, error) {
	return scanFederationServer(s.db.QueryRowContext(
		context.Background(),
		`SELECT id, domain, public_key, first_seen_at, last_seen_at, is_blocked FROM federation_servers WHERE domain = ? LIMIT 1`,
		domain,
	))
}

func (s *SQLStore) FindAllFederationServers() ([]models.FederationServer, error) {
	rows, err := s.db.QueryContext(
		context.Background(),
		`SELECT id, domain, public_key, first_seen_at, last_seen_at, is_blocked FROM federation_servers ORDER BY domain ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []models.FederationServer
	for rows.Next() {
		server, err := scanFederationServer(rows)
		if err != nil {
			return nil, err
		}
		servers = append(servers, *server)
	}
	return servers, rows.Err()
}

func (s *SQLStore) CreateFederationServer(server *models.FederationServer) error {
	result, err := s.db.ExecContext(
		context.Background(),
		`INSERT INTO federation_servers (domain, public_key, first_seen_at, last_seen_at, is_blocked) VALUES (?, ?, ?, ?, ?)`,
		server.Domain,
		server.PublicKey,
		formatTime(server.FirstSeenAt),
		formatTime(server.LastSeenAt),
		boolInt(server.IsBlocked),
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		server.ID = uint(id)
	}
	return nil
}

func (s *SQLStore) UpdateFederationServerLastSeen(server *models.FederationServer) error {
	server.LastSeenAt = utcNow()
	_, err := s.db.ExecContext(
		context.Background(),
		`UPDATE federation_servers SET last_seen_at = ? WHERE id = ?`,
		formatTime(server.LastSeenAt),
		server.ID,
	)
	return err
}

func (s *SQLStore) SetFederationServerBlocked(ctx context.Context, domain string, blocked bool) error {
	_, err := s.execWithBusyRetry(ctx, `UPDATE federation_servers SET is_blocked = ? WHERE domain = ?`, boolInt(blocked), domain)
	return err
}

func (s *SQLStore) UpsertNodeRegistryEntry(ctx context.Context, entry *models.NodeRegistryEntry) error {
	now := utcNow()
	if entry.FirstSeenAt.IsZero() {
		entry.FirstSeenAt = now
	}
	if entry.LastSeenAt.IsZero() {
		entry.LastSeenAt = now
	}
	entry.UpdatedAt = now
	if entry.Status == "" {
		entry.Status = "pending"
	}
	_, err := s.execWithBusyRetry(
		ctx,
		`INSERT INTO node_registry_entries
			(domain, server_name, public_key, core_hash, node_version, operator_gaia_id, status, last_error, ping_count, first_seen_at, last_seen_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
		 ON CONFLICT(domain) DO UPDATE SET
			server_name = excluded.server_name,
			public_key = excluded.public_key,
			core_hash = excluded.core_hash,
			node_version = excluded.node_version,
			operator_gaia_id = excluded.operator_gaia_id,
			last_error = excluded.last_error,
			ping_count = node_registry_entries.ping_count + 1,
			last_seen_at = excluded.last_seen_at,
			updated_at = excluded.updated_at`,
		entry.Domain,
		entry.ServerName,
		entry.PublicKey,
		entry.CoreHash,
		entry.NodeVersion,
		entry.OperatorGaiaID,
		entry.Status,
		entry.LastError,
		formatTime(entry.FirstSeenAt),
		formatTime(entry.LastSeenAt),
		formatTime(entry.UpdatedAt),
	)
	return err
}

func (s *SQLStore) FindNodeRegistryEntry(ctx context.Context, domain string) (*models.NodeRegistryEntry, error) {
	return scanNodeRegistryEntry(s.db.QueryRowContext(
		ctx,
		`SELECT id, domain, server_name, public_key, core_hash, node_version, operator_gaia_id, status, last_error, ping_count, first_seen_at, last_seen_at, updated_at
		 FROM node_registry_entries
		 WHERE domain = ?
		 LIMIT 1`,
		domain,
	))
}

func (s *SQLStore) FindAllNodeRegistryEntries(ctx context.Context) ([]models.NodeRegistryEntry, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, domain, server_name, public_key, core_hash, node_version, operator_gaia_id, status, last_error, ping_count, first_seen_at, last_seen_at, updated_at
		 FROM node_registry_entries
		 ORDER BY status ASC, domain ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.NodeRegistryEntry
	for rows.Next() {
		entry, err := scanNodeRegistryEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, *entry)
	}
	return entries, rows.Err()
}

func (s *SQLStore) UpdateNodeRegistryStatus(ctx context.Context, domain string, status string, lastError string) error {
	_, err := s.execWithBusyRetry(
		ctx,
		`UPDATE node_registry_entries SET status = ?, last_error = ?, updated_at = ? WHERE domain = ?`,
		status,
		lastError,
		formatTime(utcNow()),
		domain,
	)
	return err
}
