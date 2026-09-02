// STATUS: DIAMANT VGT SUPREME
package operations

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

type probeStub struct {
	calls atomic.Int64
	err   error
}

func (p *probeStub) PingContext(context.Context) error {
	p.calls.Add(1)
	return p.err
}

func TestReadinessIsFailClosedAndCachesDatabaseProbe(t *testing.T) {
	probe := &probeStub{}
	monitor := NewMonitor(probe, "")

	notReady := httptest.NewRecorder()
	monitor.Readiness(notReady, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if notReady.Code != http.StatusServiceUnavailable || probe.calls.Load() != 0 {
		t.Fatalf("expected fail-closed pre-start readiness, status=%d calls=%d", notReady.Code, probe.calls.Load())
	}

	monitor.SetReady(true)
	for range 2 {
		ready := httptest.NewRecorder()
		monitor.Readiness(ready, httptest.NewRequest(http.MethodGet, "/readyz", nil))
		if ready.Code != http.StatusOK {
			t.Fatalf("expected ready status, got %d", ready.Code)
		}
	}
	if probe.calls.Load() != 1 {
		t.Fatalf("expected cached database probe, got %d calls", probe.calls.Load())
	}

	monitor.SetReady(false)
	stopped := httptest.NewRecorder()
	monitor.Readiness(stopped, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if stopped.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected shutdown readiness failure, got %d", stopped.Code)
	}
}

func TestReadinessRejectsDatabaseFailure(t *testing.T) {
	monitor := NewMonitor(&probeStub{err: errors.New("database unavailable")}, "")
	monitor.SetReady(true)
	recorder := httptest.NewRecorder()
	monitor.Readiness(recorder, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if recorder.Code != http.StatusServiceUnavailable || strings.Contains(recorder.Body.String(), "database") {
		t.Fatalf("readiness must be opaque, status=%d body=%q", recorder.Code, recorder.Body.String())
	}
}

func TestMetricsRequireConstantTimeBearerCredential(t *testing.T) {
	const token = "0123456789abcdef0123456789abcdef"
	monitor := NewMonitor(&probeStub{}, token)

	for _, authorization := range []string{"", "Bearer wrong", "Basic " + token} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/metrics", nil)
		request.Header.Set("Authorization", authorization)
		monitor.Metrics(recorder, request)
		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected opaque metrics rejection for %q, got %d", authorization, recorder.Code)
		}
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	monitor.Metrics(recorder, request)
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "gaiacom_http_requests_total") {
		t.Fatalf("expected authenticated metrics, status=%d body=%q", recorder.Code, recorder.Body.String())
	}
}

func TestMiddlewareContainsPanicsAndCorrelatesRequests(t *testing.T) {
	monitor := NewMonitor(&probeStub{}, "")
	handler := monitor.Middleware()(func(http.ResponseWriter, *http.Request) {
		panic("sensitive panic material")
	})
	recorder := httptest.NewRecorder()
	handler(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected contained panic response, got %d", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "sensitive") {
		t.Fatalf("panic details leaked to client: %q", recorder.Body.String())
	}
	if len(recorder.Header().Get("X-Request-ID")) != 32 {
		t.Fatalf("missing cryptographic request correlation id: %q", recorder.Header().Get("X-Request-ID"))
	}
	if monitor.panics.Load() != 1 || monitor.responses5xx.Load() != 1 {
		t.Fatalf("panic counters mismatch: panics=%d 5xx=%d", monitor.panics.Load(), monitor.responses5xx.Load())
	}
}
