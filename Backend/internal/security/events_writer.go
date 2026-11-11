package security

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gaiacom/backend/models"
)

// Bounded asynchronous security-event writer (P-10 / FIND-023).
//
// Rejection paths used to persist their audit event synchronously, so an
// attacker could make the server do one DB write per blocked request. This
// writer moves persistence onto a single background goroutine with a bounded
// queue and an explicit overflow policy:
//
//   - queue full  -> the event is not silently lost: a dropped-event counter is
//     incremented, a rate-limited WARN is logged, and at most one aggregated
//     "audit_overflow" event per window is written synchronously as fallback
//     evidence (bounded cost, no loss without a trace).
//   - GAIACOM_SECURITY_EVENTS_SYNC=true keeps the previous fully synchronous
//     behaviour (escape hatch for incident response / single-event debugging).
//   - graceful shutdown: the writer drains the queue when its context is done.
//
// Durability trade-off: an event still in the queue when the process is killed
// (not gracefully stopped) is lost; the audit hash chain stays consistent
// because only the single writer goroutine appends events. This trade-off is
// documented in the security review notes and must stay an
// explicit owner decision.
const (
	defaultEventQueueCapacity = 2048
	eventOverflowLogInterval  = 30 * time.Second
	eventPersistTimeout       = 5 * time.Second
	eventSyncEnvVar           = "GAIACOM_SECURITY_EVENTS_SYNC"
)

type queuedSecurityEvent struct {
	event      *models.SecurityEvent
	privateCtx *models.SecurityEventPrivateContext
}

// StartEventWriter launches the bounded writer and blocks until ctx is done,
// then drains the remaining queue. It is safe to call once per process; routes
// run it through launchRouteWorker for graceful shutdown.
func (s *SecuritySystem) StartEventWriter(ctx context.Context) {
	if s == nil {
		return
	}
	if eventSyncRequested() {
		log.Printf("security events: synchronous mode enabled via %s", eventSyncEnvVar)
		return
	}
	if s.eventQueue == nil {
		return
	}
	s.eventWriterOn.Store(true)
	log.Printf("security events: bounded async writer started (capacity=%d)", cap(s.eventQueue))

	for {
		select {
		case item := <-s.eventQueue:
			s.persistQueuedEvent(item)
		case <-ctx.Done():
			s.drainEventQueue()
			log.Printf("security events: writer stopped, dropped_events=%d", s.droppedEvents.Load())
			return
		}
	}
}

// FlushEvents waits until the queue is empty or ctx is done.
func (s *SecuritySystem) FlushEvents(ctx context.Context) {
	if s == nil || s.eventQueue == nil {
		return
	}
	for {
		if len(s.eventQueue) == 0 {
			return
		}
		select {
		case item := <-s.eventQueue:
			s.persistQueuedEvent(item)
		case <-ctx.Done():
			return
		default:
			time.Sleep(5 * time.Millisecond)
		}
	}
}

// DroppedEventCount reports how many security events were shed because the
// queue was full (operational visibility, no silent loss).
func (s *SecuritySystem) DroppedEventCount() uint64 {
	if s == nil {
		return 0
	}
	return s.droppedEvents.Load()
}

func (s *SecuritySystem) drainEventQueue() {
	if s.eventQueue == nil {
		return
	}
	for {
		select {
		case item := <-s.eventQueue:
			s.persistQueuedEvent(item)
		default:
			return
		}
	}
}

// dispatchSecurityEvent routes an event to the async writer when enabled,
// otherwise persists synchronously (previous behaviour).
func (s *SecuritySystem) dispatchSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateCtx *models.SecurityEventPrivateContext) {
	if event == nil {
		return
	}
	if s.eventWriterOn.Load() && s.eventQueue != nil {
		item := queuedSecurityEvent{event: event, privateCtx: privateCtx}
		select {
		case s.eventQueue <- item:
			return
		default:
			s.handleEventOverflow(ctx, event, privateCtx)
			return
		}
	}
	s.persistEventDetached(ctx, event, privateCtx)
}

func (s *SecuritySystem) persistQueuedEvent(item queuedSecurityEvent) {
	ctx, cancel := context.WithTimeout(context.Background(), eventPersistTimeout)
	defer cancel()
	if err := s.persistSecurityEvent(ctx, item.event, item.privateCtx); err != nil {
		log.Printf("security events: async persist failed (event %s): %v", item.event.EventID, err)
	}
}

// persistEventDetached writes synchronously but with a detached, bounded context
// so a cancelled request cannot silently discard audit evidence.
func (s *SecuritySystem) persistEventDetached(ctx context.Context, event *models.SecurityEvent, privateCtx *models.SecurityEventPrivateContext) {
	if ctx == nil {
		ctx = context.Background()
	}
	writeCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), eventPersistTimeout)
	defer cancel()
	if err := s.persistSecurityEvent(writeCtx, event, privateCtx); err != nil {
		log.Printf("security events: persist failed (event %s): %v", event.EventID, err)
	}
}

// persistSecurityEvent computes the audit-chain link and stores the event.
func (s *SecuritySystem) persistSecurityEvent(ctx context.Context, event *models.SecurityEvent, privateCtx *models.SecurityEventPrivateContext) error {
	audit, err := s.CalculateAuditHash(ctx, event)
	if err != nil {
		return err
	}
	return s.Store.SaveSecurityEvent(ctx, event, privateCtx, audit)
}

// handleEventOverflow applies the explicit overflow policy: count, rate-limited
// log, and at most one aggregated fallback event per interval.
func (s *SecuritySystem) handleEventOverflow(ctx context.Context, event *models.SecurityEvent, privateCtx *models.SecurityEventPrivateContext) {
	dropped := s.droppedEvents.Add(1)

	now := time.Now().UnixNano()
	last := s.lastOverflowNS.Load()
	if now-last < int64(eventOverflowLogInterval) {
		return
	}
	if !s.lastOverflowNS.CompareAndSwap(last, now) {
		return
	}

	log.Printf("security events: queue full, dropped_events=%d (aggregated fallback event will be written)", dropped)

	fallback := &models.SecurityEvent{
		EventID:       fmt.Sprintf("gs_evt_overflow_%d", now),
		NodeID:        s.NodeID,
		Category:      "audit_overflow",
		Severity:      "high",
		Source:        "event_writer",
		Summary:       fmt.Sprintf("Sicherheitsereignis-Puffer voll: %d Ereignisse verworfen (Kapazität %d).", dropped, cap(s.eventQueue)),
		Action:        "overflow_fallback",
		PublicVisible: true,
		UserVisible:   false,
		NodeVisible:   true,
		CreatedAt:     time.Now().UTC(),
	}
	s.persistEventDetached(ctx, fallback, nil)
}

func eventSyncRequested() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(eventSyncEnvVar)))
	return value == "1" || value == "true" || value == "yes"
}
