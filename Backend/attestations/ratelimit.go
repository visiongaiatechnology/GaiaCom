package attestations

import (
	"sync"
	"time"
)

// operatorRateLimiter bounds sensitive node-operator actions (break-glass
// directory reads, badge issuance/revocation) per operator identity. The
// transparency log detects abuse; these fixed windows also slow down
// enumeration if an operator session is stolen.
type operatorRateWindow struct {
	start time.Time
	count int
}

type operatorRateLimiter struct {
	mu      sync.Mutex
	entries map[string]operatorRateWindow
}

func newOperatorRateLimiter() *operatorRateLimiter {
	return &operatorRateLimiter{entries: make(map[string]operatorRateWindow)}
}

func (l *operatorRateLimiter) allow(actor, scope string, limit int, window time.Duration, now time.Time) bool {
	if l == nil || limit <= 0 {
		return true
	}
	key := scope + "\x00" + actor
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.entries) > 4096 {
		l.entries = make(map[string]operatorRateWindow)
	}
	entry, ok := l.entries[key]
	if !ok || now.Sub(entry.start) >= window {
		l.entries[key] = operatorRateWindow{start: now, count: 1}
		return true
	}
	if entry.count >= limit {
		return false
	}
	entry.count++
	l.entries[key] = entry
	return true
}
