package security

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

// P-10 / FIND-023 regression tests for the bounded asynchronous security-event
// writer. They are written but NOT executed in this environment (no-build
// directive) → runtime status NOT_TESTED.

func newWriterTestSystem(t *testing.T) (*SecuritySystem, *MockStore) {
	t.Helper()
	store := NewMockStore()
	system, err := NewSecuritySystemWithConfig(store, SystemConfig{
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	})
	if err != nil {
		t.Fatalf("construct security system: %v", err)
	}
	return system, store
}

func TestSecurityEventsStaySynchronousWithoutWriter(t *testing.T) {
	system, store := newWriterTestSystem(t)
	system.RecordSecurityEvent(context.Background(), nil, nil, "policy_violation", "high", "events_writer_test", "inline", "reject", nil)

	if len(store.savedEvents) != 1 {
		t.Fatalf("expected inline persistence without writer, got %d", len(store.savedEvents))
	}
	if dropped := system.DroppedEventCount(); dropped != 0 {
		t.Fatalf("unexpected dropped events: %d", dropped)
	}
}

func TestEventWriterSyncEscapeHatch(t *testing.T) {
	t.Setenv(eventSyncEnvVar, "true")
	system, store := newWriterTestSystem(t)

	// Sync mode must return immediately (no queue writer) and persist inline.
	system.StartEventWriter(context.Background())
	system.RecordSecurityEvent(context.Background(), nil, nil, "rate_limit", "medium", "events_writer_test", "sync-mode", "rate_limit", nil)

	if len(store.savedEvents) != 1 {
		t.Fatalf("sync escape hatch did not persist inline: got %d", len(store.savedEvents))
	}
}

func TestEventWriterDrainsQueueOnShutdown(t *testing.T) {
	system, store := newWriterTestSystem(t)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		system.StartEventWriter(ctx)
		close(done)
	}()
	waitForWriter(t, system)

	const count = 25
	for i := 0; i < count; i++ {
		system.RecordSecurityEvent(context.Background(), nil, nil, "rate_limit", "medium", "events_writer_test", "queued", "rate_limit", nil)
	}
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("event writer did not stop after context cancellation")
	}
	if len(store.savedEvents) != count {
		t.Fatalf("shutdown drain lost events: got %d want %d", len(store.savedEvents), count)
	}
}

// gatedEventStore blocks the first SaveSecurityEvent call so the writer stalls,
// letting the test fill the bounded queue and exercise the overflow policy.
type gatedEventStore struct {
	*MockStore
	mu      sync.Mutex
	calls   int64
	release chan struct{}
	blocked chan struct{}
	once    sync.Once
}

func newGatedEventStore() *gatedEventStore {
	return &gatedEventStore{
		MockStore: NewMockStore(),
		release:   make(chan struct{}),
		blocked:   make(chan struct{}),
	}
}

func (g *gatedEventStore) SaveSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateContext *models.SecurityEventPrivateContext, audit *models.SecurityAuditChain) error {
	call := atomic.AddInt64(&g.calls, 1)
	if call == 1 {
		g.once.Do(func() { close(g.blocked) })
		<-g.release
	}
	return g.MockStore.SaveSecurityEvent(ctx, event, privateContext, audit)
}

func TestEventWriterOverflowIsCountedAndTraced(t *testing.T) {
	store := newGatedEventStore()
	system, err := NewSecuritySystemWithConfig(store, SystemConfig{
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	})
	if err != nil {
		t.Fatalf("construct security system: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() {
		system.StartEventWriter(ctx)
		close(done)
	}()
	waitForWriter(t, system)

	// Wait until the writer is processing the first event (queue can fill).
	select {
	case <-store.blocked:
	case <-time.After(2 * time.Second):
		t.Fatal("writer did not start processing")
	}

	total := cap(system.eventQueue) + 100
	for i := 0; i < total; i++ {
		system.RecordSecurityEvent(context.Background(), nil, nil, "rate_limit", "medium", "events_writer_test", "burst", "rate_limit", nil)
	}
	if dropped := system.DroppedEventCount(); dropped == 0 {
		t.Fatal("queue overflow was not counted (silent loss!)")
	}

	// Release the writer and stop it.
	close(store.release)
	cancel()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("event writer did not stop")
	}

	if !containsEventCategory(store.MockStore.savedEvents, "audit_overflow") {
		t.Fatal("overflow fallback event was not written")
	}
}

func TestEventWriterOverflowFallbackIsRateLimited(t *testing.T) {
	store := newGatedEventStore()
	system, err := NewSecuritySystemWithConfig(store, SystemConfig{
		HMACKey: []byte("test-hmac-key-with-enough-entropy"),
		NodeID:  "test-node",
	})
	if err != nil {
		t.Fatalf("construct security system: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() {
		system.StartEventWriter(ctx)
		close(done)
	}()
	waitForWriter(t, system)
	select {
	case <-store.blocked:
	case <-time.After(2 * time.Second):
		t.Fatal("writer did not start processing")
	}

	for i := 0; i < cap(system.eventQueue)+200; i++ {
		system.RecordSecurityEvent(context.Background(), nil, nil, "rate_limit", "medium", "events_writer_test", "burst", "rate_limit", nil)
	}

	overflowEvents := 0
	for _, event := range store.MockStore.savedEvents {
		if event.Category == "audit_overflow" {
			overflowEvents++
		}
	}
	if overflowEvents > 1 {
		t.Fatalf("overflow fallback must be rate-limited, wrote %d aggregated events", overflowEvents)
	}

	close(store.release)
	cancel()
	<-done
}

func TestCheckMessageFanoutEnforcesBudgets(t *testing.T) {
	system, _ := newWriterTestSystem(t)
	ctx := context.Background()

	send := uuid.New()
	for i := 0; i < messageFanoutMaxRequests; i++ {
		if err := system.CheckMessageFanout(ctx, nil, send, 1, 1024); err != nil {
			t.Fatalf("send %d within request budget rejected: %v", i+1, err)
		}
	}
	if err := system.CheckMessageFanout(ctx, nil, send, 1, 1024); err == nil {
		t.Fatal("request budget was not enforced")
	}

	if err := system.CheckMessageFanout(ctx, nil, uuid.New(), messageFanoutMaxRecipients+1, 1024); err == nil {
		t.Fatal("recipient budget was not enforced")
	}

	if err := system.CheckMessageFanout(ctx, nil, uuid.New(), 1, (messageFanoutMaxBytesMiB+1)*1024*1024); err == nil {
		t.Fatal("byte budget was not enforced")
	}
}

func waitForWriter(t *testing.T, system *SecuritySystem) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if system.eventWriterOn.Load() {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("event writer was not started")
}

func containsEventCategory(events []*models.SecurityEvent, category string) bool {
	for _, event := range events {
		if event.Category == category {
			return true
		}
	}
	return false
}
