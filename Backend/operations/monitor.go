// STATUS: DIAMANT VGT SUPREME
package operations

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"gaiacom/backend/httpx"
)

const (
	readinessCacheLifetime = time.Second
	readinessProbeTimeout  = 1500 * time.Millisecond
)

// DatabaseProbe is intentionally minimal so readiness depends on the live
// database connection without coupling the HTTP layer to database/sql.
type DatabaseProbe interface {
	PingContext(context.Context) error
}

type readinessSnapshot struct {
	checkedAt time.Time
	healthy   bool
}

// Monitor owns process-level operational state and lock-free request counters.
type Monitor struct {
	startedAt    time.Time
	probe        DatabaseProbe
	metricsToken [sha256.Size]byte
	metricsOn    bool
	ready        atomic.Bool
	requests     atomic.Uint64
	inFlight     atomic.Int64
	responses2xx atomic.Uint64
	responses4xx atomic.Uint64
	responses5xx atomic.Uint64
	panics       atomic.Uint64
	readinessBad atomic.Uint64
	requestSeq   atomic.Uint64
	readinessMu  sync.Mutex
	readiness    readinessSnapshot
}

func NewMonitor(probe DatabaseProbe, metricsToken string) *Monitor {
	monitor := &Monitor{
		startedAt: time.Now().UTC(),
		probe:     probe,
	}
	if metricsToken != "" {
		monitor.metricsToken = sha256.Sum256([]byte(metricsToken))
		monitor.metricsOn = true
	}
	return monitor
}

func (m *Monitor) SetReady(ready bool) {
	m.ready.Store(ready)
	if !ready {
		m.readinessMu.Lock()
		m.readiness = readinessSnapshot{}
		m.readinessMu.Unlock()
	}
}

func (m *Monitor) Liveness(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "alive"})
}

func (m *Monitor) Readiness(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !m.ready.Load() || !m.databaseReady(r.Context()) {
		m.readinessBad.Add(1)
		httpx.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (m *Monitor) Metrics(w http.ResponseWriter, r *http.Request) {
	if !m.metricsOn || !m.authorized(r.Header.Get("Authorization")) {
		httpx.WriteError(w, http.StatusNotFound, "Not Found")
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	uptime := time.Since(m.startedAt).Seconds()
	_, _ = fmt.Fprintf(w,
		"# TYPE gaiacom_process_uptime_seconds gauge\n"+
			"gaiacom_process_uptime_seconds %.3f\n"+
			"# TYPE gaiacom_http_requests_total counter\n"+
			"gaiacom_http_requests_total %d\n"+
			"# TYPE gaiacom_http_requests_in_flight gauge\n"+
			"gaiacom_http_requests_in_flight %d\n"+
			"# TYPE gaiacom_http_responses_total counter\n"+
			"gaiacom_http_responses_total{class=\"2xx\"} %d\n"+
			"gaiacom_http_responses_total{class=\"4xx\"} %d\n"+
			"gaiacom_http_responses_total{class=\"5xx\"} %d\n"+
			"# TYPE gaiacom_http_panics_total counter\n"+
			"gaiacom_http_panics_total %d\n"+
			"# TYPE gaiacom_readiness_failures_total counter\n"+
			"gaiacom_readiness_failures_total %d\n",
		uptime,
		m.requests.Load(),
		m.inFlight.Load(),
		m.responses2xx.Load(),
		m.responses4xx.Load(),
		m.responses5xx.Load(),
		m.panics.Load(),
		m.readinessBad.Load(),
	)
}

func (m *Monitor) Middleware() httpx.Middleware {
	return func(next httpx.HandlerFunc) httpx.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			requestID := m.newRequestID()
			w.Header().Set("X-Request-ID", requestID)
			recorder := &responseRecorder{ResponseWriter: w}
			started := time.Now()
			m.requests.Add(1)
			m.inFlight.Add(1)

			defer func() {
				m.inFlight.Add(-1)
				if recovered := recover(); recovered != nil {
					m.panics.Add(1)
					m.responses5xx.Add(1)
					fingerprint := panicFingerprint(recovered)
					log.Printf("{\"event\":\"http_panic\",\"request_id\":%q,\"fingerprint\":%q}", requestID, fingerprint)
					if !recorder.wroteHeader {
						httpx.WriteError(recorder, http.StatusInternalServerError, "Internal Server Error")
					}
					return
				}

				status := recorder.status
				if status == 0 {
					status = http.StatusOK
				}
				m.recordStatus(status)
				log.Printf(
					"{\"event\":\"http_request\",\"request_id\":%q,\"method\":%q,\"status\":%d,\"duration_ms\":%d,\"bytes\":%d}",
					requestID,
					r.Method,
					status,
					time.Since(started).Milliseconds(),
					recorder.bytes,
				)
			}()

			next(recorder, r)
		}
	}
}

func (m *Monitor) databaseReady(parent context.Context) bool {
	if m.probe == nil {
		return false
	}

	m.readinessMu.Lock()
	defer m.readinessMu.Unlock()
	now := time.Now()
	if !m.readiness.checkedAt.IsZero() && now.Sub(m.readiness.checkedAt) < readinessCacheLifetime {
		return m.readiness.healthy
	}

	ctx, cancel := context.WithTimeout(parent, readinessProbeTimeout)
	defer cancel()
	healthy := m.probe.PingContext(ctx) == nil
	m.readiness = readinessSnapshot{checkedAt: now, healthy: healthy}
	return healthy
}

func (m *Monitor) authorized(authorization string) bool {
	const prefix = "Bearer "
	presented := ""
	if strings.HasPrefix(authorization, prefix) {
		presented = strings.TrimSpace(strings.TrimPrefix(authorization, prefix))
	}
	presentedHash := sha256.Sum256([]byte(presented))
	return subtle.ConstantTimeCompare(presentedHash[:], m.metricsToken[:]) == 1
}

func (m *Monitor) newRequestID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err == nil {
		return hex.EncodeToString(buffer)
	}
	sequence := m.requestSeq.Add(1)
	fallback := sha256.Sum256([]byte(fmt.Sprintf("%d:%d", time.Now().UnixNano(), sequence)))
	return hex.EncodeToString(fallback[:16])
}

func (m *Monitor) recordStatus(status int) {
	switch {
	case status >= 200 && status < 300:
		m.responses2xx.Add(1)
	case status >= 400 && status < 500:
		m.responses4xx.Add(1)
	case status >= 500:
		m.responses5xx.Add(1)
	}
}

func panicFingerprint(recovered interface{}) string {
	material := fmt.Sprintf("%T:%v:%x", recovered, recovered, sha256.Sum256(debug.Stack()))
	fingerprint := sha256.Sum256([]byte(material))
	return hex.EncodeToString(fingerprint[:16])
}

type responseRecorder struct {
	http.ResponseWriter
	status      int
	bytes       int64
	wroteHeader bool
}

func (r *responseRecorder) WriteHeader(status int) {
	if r.wroteHeader {
		return
	}
	r.status = status
	r.wroteHeader = true
	r.ResponseWriter.WriteHeader(status)
}

func (r *responseRecorder) Write(body []byte) (int, error) {
	if !r.wroteHeader {
		r.WriteHeader(http.StatusOK)
	}
	written, err := r.ResponseWriter.Write(body)
	r.bytes += int64(written)
	return written, err
}

func (r *responseRecorder) Flush() {
	if !r.wroteHeader {
		r.WriteHeader(http.StatusOK)
	}
	_ = http.NewResponseController(r.ResponseWriter).Flush()
}

func (r *responseRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}
