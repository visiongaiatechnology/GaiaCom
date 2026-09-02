package repository

import (
	"context"
	"strings"
	"testing"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/database"
	"gaiacom/backend/models"
)

func TestSecurityAuditPersistenceIsAppendOnly(t *testing.T) {
	t.Setenv("DB_PATH", "")

	db, err := database.ConnectDB(&config.Config{DatabasePath: ":memory:"})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer db.Close()

	store := NewSQLStore(db)
	ctx := context.Background()
	userID := uuid.New()
	event := &models.SecurityEvent{
		EventID:       "gs_evt_append_only_test",
		OwnerUserID:   &userID,
		NodeID:        "local-test",
		Category:      "operator_action",
		Severity:      "high",
		Source:        "repository_test",
		Summary:       "node operator changed policy state",
		Action:        "allow",
		PublicVisible: false,
		UserVisible:   true,
		NodeVisible:   true,
		CreatedAt:     time.Now().UTC(),
	}
	audit := &models.SecurityAuditChain{
		EventID:      event.EventID,
		PreviousHash: strings.Repeat("0", 64),
		EventHash:    strings.Repeat("a", 64),
		CreatedAt:    event.CreatedAt,
		Signature:    strings.Repeat("b", 64),
	}

	if err := store.SaveSecurityEvent(ctx, event, nil, audit); err != nil {
		t.Fatalf("save security event: %v", err)
	}
	if err := store.AcknowledgeSecurityEvent(ctx, userID, event.EventID); err != nil {
		t.Fatalf("acknowledge must remain allowed: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE security_events SET summary = 'tampered' WHERE event_id = ?`, event.EventID); err == nil {
		t.Fatalf("immutable security event summary update succeeded")
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM security_events WHERE event_id = ?`, event.EventID); err == nil {
		t.Fatalf("security event delete succeeded")
	}
	if _, err := db.ExecContext(ctx, `UPDATE security_audit_chain SET event_hash = ? WHERE event_id = ?`, strings.Repeat("c", 64), event.EventID); err == nil {
		t.Fatalf("security audit chain update succeeded")
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM security_audit_chain WHERE event_id = ?`, event.EventID); err == nil {
		t.Fatalf("security audit chain delete succeeded")
	}
}
