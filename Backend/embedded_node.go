// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gaiacom/backend/database"
	"gaiacom/backend/operations"
	"gaiacom/backend/repository"
	"gaiacom/backend/transportqueue"
)

const (
	maxEmbeddedRequestBytes  = 64 * 1024 * 1024
	maxEmbeddedResponseBytes = 128 * 1024 * 1024
)

var embeddedRequestHeaders = map[string]struct{}{
	"Authorization":         {},
	"Content-Type":          {},
	"Cookie":                {},
	"X-Gaia-Pairing-Secret": {},
	"X-Gaia-S2S-V1":         {},
}

type EmbeddedNodeConfig struct {
	DatabasePath         string
	ServerName           string
	ServerPrivateKey     ed25519.PrivateKey
	TrustMeshEpochSecret []byte
	JWTSecret            []byte
	ShieldSecret         []byte
	MetricsToken         string
	StorageRoot          string
}

type EmbeddedRequest struct {
	Method  string
	Path    string
	Headers map[string]string
	Body    []byte
}

type EmbeddedResponse struct {
	StatusCode int
	Headers    http.Header
	Body       []byte
}

type EmbeddedNode struct {
	mu      sync.RWMutex
	wait    sync.WaitGroup
	closed  bool
	cancel  context.CancelFunc
	db      *sql.DB
	monitor *operations.Monitor
	handler http.Handler
	workers *sync.WaitGroup
	queue   transportqueue.Store
}

func NewEmbeddedNode(parent context.Context, config EmbeddedNodeConfig) (*EmbeddedNode, error) {
	if parent == nil {
		return nil, errors.New("embedded node parent context is required")
	}
	databasePath, err := secureEmbeddedDatabasePath(config.DatabasePath)
	if err != nil {
		return nil, err
	}
	runtimeConfig := RouteRuntimeConfig{
		ServerName:           strings.ToLower(strings.TrimSpace(config.ServerName)),
		ServerPrivateKey:     append(ed25519.PrivateKey(nil), config.ServerPrivateKey...),
		TrustMeshEpochSecret: append([]byte(nil), config.TrustMeshEpochSecret...),
		JWTSecret:            append([]byte(nil), config.JWTSecret...),
		ShieldSecret:         append([]byte(nil), config.ShieldSecret...),
		MetricsToken:         strings.TrimSpace(config.MetricsToken),
		AllowOrigins:         []string{"app://gaiacom.internal"},
		StorageRoot:          strings.TrimSpace(config.StorageRoot),
	}
	if err := runtimeConfig.Validate(); err != nil {
		return nil, fmt.Errorf("validate embedded node configuration: %w", err)
	}

	db, err := database.ConnectEmbeddedDB(databasePath)
	if err != nil {
		return nil, fmt.Errorf("connect embedded node database: %w", err)
	}
	rootContext, cancel := context.WithCancel(parent)
	workerGroup := &sync.WaitGroup{}
	runtimeConfig.workerGroup = workerGroup
	store := repository.NewSQLStore(db)
	monitor := newOperationsMonitor(store, runtimeConfig.MetricsToken)
	handler, err := SetupRoutesWithRuntimeConfig(rootContext, store, monitor, runtimeConfig)
	if err != nil {
		cancel()
		_ = db.Close()
		return nil, fmt.Errorf("initialize embedded node routes: %w", err)
	}
	monitor.SetReady(true)
	return &EmbeddedNode{
		cancel:  cancel,
		db:      db,
		monitor: monitor,
		handler: handler,
		workers: workerGroup,
		queue:   store,
	}, nil
}

func (n *EmbeddedNode) Execute(ctx context.Context, request EmbeddedRequest) (EmbeddedResponse, error) {
	if n == nil {
		return EmbeddedResponse{}, errors.New("embedded node is nil")
	}
	if ctx == nil {
		return EmbeddedResponse{}, errors.New("request context is required")
	}
	validated, err := validateEmbeddedRequest(request)
	if err != nil {
		return EmbeddedResponse{}, err
	}

	n.mu.RLock()
	if n.closed {
		n.mu.RUnlock()
		return EmbeddedResponse{}, errors.New("embedded node is closed")
	}
	n.wait.Add(1)
	handler := n.handler
	n.mu.RUnlock()
	defer n.wait.Done()

	httpRequest := httptest.NewRequest(validated.Method, validated.Path, bytes.NewReader(validated.Body)).WithContext(ctx)
	for key, value := range validated.Headers {
		httpRequest.Header.Set(key, value)
	}
	recorder := newBoundedResponseRecorder(maxEmbeddedResponseBytes)
	handler.ServeHTTP(recorder, httpRequest)
	if recorder.exceeded {
		return EmbeddedResponse{}, errors.New("embedded response exceeded the mobile bridge limit")
	}
	return EmbeddedResponse{
		StatusCode: recorder.statusCode(),
		Headers:    recorder.Header().Clone(),
		Body:       append([]byte(nil), recorder.body.Bytes()...),
	}, nil
}

func (n *EmbeddedNode) Close() error {
	if n == nil {
		return nil
	}
	n.mu.Lock()
	if n.closed {
		n.mu.Unlock()
		return nil
	}
	n.closed = true
	n.monitor.SetReady(false)
	n.cancel()
	n.mu.Unlock()
	n.wait.Wait()
	n.workers.Wait()
	return n.db.Close()
}

func secureEmbeddedDatabasePath(input string) (string, error) {
	cleaned := filepath.Clean(strings.TrimSpace(input))
	if cleaned == "." || !filepath.IsAbs(cleaned) {
		return "", errors.New("embedded database path must be absolute")
	}
	parent := filepath.Dir(cleaned)
	resolvedParent, err := resolveDirectoryWithoutLinks(parent)
	if err != nil {
		return "", fmt.Errorf("resolve embedded database directory: %w", err)
	}
	destination := filepath.Join(resolvedParent, filepath.Base(cleaned))
	relative, err := filepath.Rel(resolvedParent, destination)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", errors.New("embedded database path escaped its storage directory")
	}
	if fileInfo, statErr := os.Lstat(destination); statErr == nil && fileInfo.Mode()&os.ModeSymlink != 0 {
		return "", errors.New("embedded database must not be a symbolic link")
	} else if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
		return "", fmt.Errorf("inspect embedded database destination: %w", statErr)
	}
	return destination, nil
}

func resolveDirectoryWithoutLinks(input string) (string, error) {
	absolute, err := filepath.Abs(input)
	if err != nil {
		return "", err
	}
	current := absolute
	for {
		info, statErr := os.Lstat(current)
		if statErr != nil {
			return "", statErr
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return "", errors.New("embedded storage ancestry contains a symbolic link")
		}
		if current == absolute && !info.IsDir() {
			return "", errors.New("embedded database directory must exist")
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return absolute, nil
}

func validateEmbeddedRequest(request EmbeddedRequest) (EmbeddedRequest, error) {
	method := strings.ToUpper(strings.TrimSpace(request.Method))
	switch method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions:
	default:
		return EmbeddedRequest{}, errors.New("embedded request method is not allowed")
	}
	if len(request.Body) > maxEmbeddedRequestBytes {
		return EmbeddedRequest{}, errors.New("embedded request exceeds the mobile bridge limit")
	}
	parsed, err := url.ParseRequestURI(request.Path)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Fragment != "" || !strings.HasPrefix(parsed.Path, "/") {
		return EmbeddedRequest{}, errors.New("embedded request path is invalid")
	}
	if strings.Contains(strings.ToLower(parsed.EscapedPath()), "%2f") || strings.Contains(parsed.Path, "..") || strings.Contains(parsed.Path, "//") {
		return EmbeddedRequest{}, errors.New("embedded request path violates normalization policy")
	}
	headers := make(map[string]string, len(request.Headers))
	for rawKey, value := range request.Headers {
		key := http.CanonicalHeaderKey(strings.TrimSpace(rawKey))
		if _, allowed := embeddedRequestHeaders[key]; !allowed {
			return EmbeddedRequest{}, fmt.Errorf("embedded request header %q is not allowed", key)
		}
		if strings.ContainsAny(value, "\r\n") {
			return EmbeddedRequest{}, errors.New("embedded request header contains a line break")
		}
		headers[key] = value
	}
	return EmbeddedRequest{Method: method, Path: parsed.RequestURI(), Headers: headers, Body: append([]byte(nil), request.Body...)}, nil
}

type boundedResponseRecorder struct {
	header   http.Header
	body     bytes.Buffer
	status   int
	limit    int64
	exceeded bool
}

func newBoundedResponseRecorder(limit int64) *boundedResponseRecorder {
	return &boundedResponseRecorder{header: make(http.Header), limit: limit}
}

func (r *boundedResponseRecorder) Header() http.Header { return r.header }

func (r *boundedResponseRecorder) WriteHeader(statusCode int) {
	if r.status == 0 {
		r.status = statusCode
	}
}

func (r *boundedResponseRecorder) Write(data []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	if r.exceeded || int64(r.body.Len())+int64(len(data)) > r.limit {
		r.exceeded = true
		return 0, errors.New("response size limit exceeded")
	}
	return r.body.Write(data)
}

func (r *boundedResponseRecorder) statusCode() int {
	if r.status == 0 {
		return http.StatusOK
	}
	return r.status
}

var _ http.ResponseWriter = (*boundedResponseRecorder)(nil)
var _ io.Writer = (*boundedResponseRecorder)(nil)
