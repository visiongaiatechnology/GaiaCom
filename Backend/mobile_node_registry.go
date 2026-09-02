// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
)

type MobileNodeHandle uint64

type MobileNodeBootstrap struct {
	DatabasePath         string
	StorageRoot          string
	ServerName           string
	ServerPrivateKey     []byte
	TrustMeshEpochSecret []byte
	JWTSecret            []byte
	ShieldSecret         []byte
	MetricsToken         []byte
}

func (b *MobileNodeBootstrap) Wipe() {
	if b == nil {
		return
	}
	wipeBytes(b.ServerPrivateKey)
	wipeBytes(b.TrustMeshEpochSecret)
	wipeBytes(b.JWTSecret)
	wipeBytes(b.ShieldSecret)
	wipeBytes(b.MetricsToken)
}

type MobileNodeRegistry struct {
	mu     sync.RWMutex
	parent context.Context
	next   uint64
	closed bool
	nodes  map[MobileNodeHandle]*EmbeddedNode
}

func NewMobileNodeRegistry(parent context.Context) (*MobileNodeRegistry, error) {
	if parent == nil {
		return nil, errors.New("mobile node registry parent context is required")
	}
	return &MobileNodeRegistry{
		parent: parent,
		nodes:  make(map[MobileNodeHandle]*EmbeddedNode),
	}, nil
}

func (r *MobileNodeRegistry) Open(bootstrap MobileNodeBootstrap) (MobileNodeHandle, error) {
	if r == nil {
		return 0, errors.New("mobile node registry is nil")
	}
	config, err := bootstrap.embeddedConfig()
	if err != nil {
		return 0, err
	}
	node, err := NewEmbeddedNode(r.parent, config)
	wipeEmbeddedConfig(&config)
	if err != nil {
		return 0, fmt.Errorf("open embedded mobile node: %w", err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		_ = node.Close()
		return 0, errors.New("mobile node registry is closed")
	}
	if r.next == math.MaxUint64 {
		_ = node.Close()
		return 0, errors.New("mobile node handle space exhausted")
	}
	r.next++
	handle := MobileNodeHandle(r.next)
	r.nodes[handle] = node
	return handle, nil
}

func (r *MobileNodeRegistry) Execute(
	ctx context.Context,
	handle MobileNodeHandle,
	request EmbeddedRequest,
) (EmbeddedResponse, error) {
	if r == nil {
		return EmbeddedResponse{}, errors.New("mobile node registry is nil")
	}
	if handle == 0 {
		return EmbeddedResponse{}, errors.New("mobile node handle is invalid")
	}
	r.mu.RLock()
	node := r.nodes[handle]
	closed := r.closed
	r.mu.RUnlock()
	if closed {
		return EmbeddedResponse{}, errors.New("mobile node registry is closed")
	}
	if node == nil {
		return EmbeddedResponse{}, errors.New("mobile node handle was not found")
	}
	return node.Execute(ctx, request)
}

func (r *MobileNodeRegistry) Close(handle MobileNodeHandle) error {
	if r == nil {
		return nil
	}
	if handle == 0 {
		return errors.New("mobile node handle is invalid")
	}
	r.mu.Lock()
	node := r.nodes[handle]
	delete(r.nodes, handle)
	r.mu.Unlock()
	if node == nil {
		return nil
	}
	return node.Close()
}

func (r *MobileNodeRegistry) CloseAll() error {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	nodes := make([]*EmbeddedNode, 0, len(r.nodes))
	for handle, node := range r.nodes {
		nodes = append(nodes, node)
		delete(r.nodes, handle)
	}
	r.mu.Unlock()

	closeErrors := make([]error, 0)
	for _, node := range nodes {
		if err := node.Close(); err != nil {
			closeErrors = append(closeErrors, err)
		}
	}
	return errors.Join(closeErrors...)
}

func (b MobileNodeBootstrap) embeddedConfig() (EmbeddedNodeConfig, error) {
	if strings.TrimSpace(b.DatabasePath) == "" || strings.TrimSpace(b.StorageRoot) == "" {
		return EmbeddedNodeConfig{}, errors.New("mobile node storage paths are required")
	}
	if len(b.ServerPrivateKey) != ed25519.PrivateKeySize {
		return EmbeddedNodeConfig{}, errors.New("mobile node private key has invalid length")
	}
	return EmbeddedNodeConfig{
		DatabasePath:         strings.TrimSpace(b.DatabasePath),
		StorageRoot:          strings.TrimSpace(b.StorageRoot),
		ServerName:           strings.ToLower(strings.TrimSpace(b.ServerName)),
		ServerPrivateKey:     append(ed25519.PrivateKey(nil), b.ServerPrivateKey...),
		TrustMeshEpochSecret: append([]byte(nil), b.TrustMeshEpochSecret...),
		JWTSecret:            append([]byte(nil), b.JWTSecret...),
		ShieldSecret:         append([]byte(nil), b.ShieldSecret...),
		MetricsToken:         string(b.MetricsToken),
	}, nil
}

func wipeEmbeddedConfig(config *EmbeddedNodeConfig) {
	if config == nil {
		return
	}
	wipeBytes(config.ServerPrivateKey)
	wipeBytes(config.TrustMeshEpochSecret)
	wipeBytes(config.JWTSecret)
	wipeBytes(config.ShieldSecret)
	config.MetricsToken = ""
}

func wipeBytes(value []byte) {
	for index := range value {
		value[index] = 0
	}
}
