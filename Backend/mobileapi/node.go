// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"

	backend "gaiacom/backend"
)

const (
	maxHeadersJSONBytes  = 64 * 1024
	maxResponseBodyBytes = 128 * 1024 * 1024
)

type Node struct {
	mu       sync.RWMutex
	context  context.Context
	cancel   context.CancelFunc
	registry *backend.MobileNodeRegistry
	handle   backend.MobileNodeHandle
	closed   bool
}

type Response struct {
	mu          sync.RWMutex
	statusCode  int
	headersJSON string
	body        []byte
}

func OpenNode(bootstrap *Bootstrap) (*Node, error) {
	if bootstrap == nil {
		return nil, errors.New("mobile bootstrap is required")
	}
	material, err := bootstrap.consume()
	bootstrap.Close()
	if err != nil {
		return nil, err
	}
	defer material.Wipe()

	rootContext, cancel := context.WithCancel(context.Background())
	registry, err := backend.NewMobileNodeRegistry(rootContext)
	if err != nil {
		cancel()
		return nil, errors.New("mobile node runtime initialization failed")
	}
	handle, err := registry.Open(material)
	if err != nil {
		cancel()
		_ = registry.CloseAll()
		return nil, errors.New("mobile node initialization failed")
	}
	return &Node{
		context:  rootContext,
		cancel:   cancel,
		registry: registry,
		handle:   handle,
	}, nil
}

func (n *Node) Execute(method string, path string, headersJSON string, body []byte) (*Response, error) {
	if n == nil {
		return nil, errors.New("mobile node is required")
	}
	if n.registry == nil || n.cancel == nil || n.handle == 0 {
		return nil, errors.New("mobile node is not initialized")
	}
	if len(headersJSON) > maxHeadersJSONBytes {
		return nil, errors.New("mobile request headers exceed the bridge limit")
	}
	headers, err := decodeHeaders(headersJSON)
	if err != nil {
		return nil, err
	}
	n.mu.RLock()
	defer n.mu.RUnlock()
	if n.closed {
		return nil, errors.New("mobile node is closed")
	}
	requestBody := clone(body)
	defer wipe(requestBody)
	result, err := n.registry.Execute(n.context, n.handle, backend.EmbeddedRequest{
		Method:  strings.ToUpper(strings.TrimSpace(method)),
		Path:    strings.TrimSpace(path),
		Headers: headers,
		Body:    requestBody,
	})
	if err != nil {
		return nil, errors.New("mobile node request failed")
	}
	if len(result.Body) > maxResponseBodyBytes {
		wipe(result.Body)
		return nil, errors.New("mobile response exceeds the bridge limit")
	}
	encodedHeaders, err := json.Marshal(result.Headers)
	if err != nil {
		wipe(result.Body)
		return nil, errors.New("mobile response headers could not be encoded")
	}
	responseBody := clone(result.Body)
	wipe(result.Body)
	return &Response{
		statusCode:  result.StatusCode,
		headersJSON: string(encodedHeaders),
		body:        responseBody,
	}, nil
}

func (n *Node) Close() error {
	if n == nil {
		return nil
	}
	if n.registry == nil || n.cancel == nil || n.handle == 0 {
		n.mu.Lock()
		n.closed = true
		n.mu.Unlock()
		return nil
	}
	n.cancel()
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.closed {
		return nil
	}
	n.closed = true
	if err := n.registry.CloseAll(); err != nil {
		return errors.New("mobile node shutdown failed")
	}
	return nil
}

func (r *Response) StatusCode() int {
	if r == nil {
		return 0
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.statusCode
}

func (r *Response) HeadersJSON() string {
	if r == nil {
		return "{}"
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.headersJSON
}

func (r *Response) Body() []byte {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return clone(r.body)
}

func (r *Response) Close() {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	wipe(r.body)
	r.body = nil
	r.headersJSON = ""
	r.statusCode = 0
}

func decodeHeaders(encoded string) (map[string]string, error) {
	if strings.TrimSpace(encoded) == "" {
		return map[string]string{}, nil
	}
	var decoded map[string]string
	decoder := json.NewDecoder(strings.NewReader(encoded))
	if err := decoder.Decode(&decoded); err != nil {
		return nil, errors.New("mobile request headers are invalid")
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return nil, errors.New("mobile request headers contain trailing data")
	}
	headers := make(map[string]string, len(decoded))
	for key, value := range decoded {
		trimmedKey := strings.TrimSpace(key)
		canonical := http.CanonicalHeaderKey(trimmedKey)
		if canonical == "" || strings.ContainsAny(value, "\r\n") {
			return nil, errors.New("mobile request headers violate bridge policy")
		}
		if _, duplicate := headers[canonical]; duplicate {
			return nil, errors.New("mobile request headers contain a duplicate name")
		}
		headers[canonical] = value
	}
	return headers, nil
}
