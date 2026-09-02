// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"errors"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	backend "gaiacom/backend"
)

type Bootstrap struct {
	mu                   sync.Mutex
	databasePath         string
	storageRoot          string
	serverName           string
	serverPrivateKey     []byte
	trustMeshEpochSecret []byte
	jwtSecret            []byte
	shieldSecret         []byte
	metricsToken         []byte
	closed               bool
}

func NewBootstrap(
	databasePath string,
	storageRoot string,
	serverName string,
	serverPrivateKey []byte,
	trustMeshEpochSecret []byte,
	jwtSecret []byte,
	shieldSecret []byte,
	metricsToken []byte,
) (*Bootstrap, error) {
	cleanDatabasePath := filepath.Clean(strings.TrimSpace(databasePath))
	cleanStorageRoot := filepath.Clean(strings.TrimSpace(storageRoot))
	cleanServerName := strings.ToLower(strings.TrimSpace(serverName))
	if !filepath.IsAbs(cleanDatabasePath) || !filepath.IsAbs(cleanStorageRoot) {
		return nil, errors.New("mobile storage paths must be absolute")
	}
	if cleanServerName == "" || len(cleanServerName) > 253 {
		return nil, errors.New("mobile server name is invalid")
	}
	if len(serverPrivateKey) != 64 {
		return nil, errors.New("mobile server key has invalid length")
	}
	for _, secret := range [][]byte{trustMeshEpochSecret, jwtSecret, shieldSecret, metricsToken} {
		if len(secret) < 32 {
			return nil, errors.New("mobile bootstrap secret is too short")
		}
	}
	return &Bootstrap{
		databasePath:         cleanDatabasePath,
		storageRoot:          cleanStorageRoot,
		serverName:           cleanServerName,
		serverPrivateKey:     clone(serverPrivateKey),
		trustMeshEpochSecret: clone(trustMeshEpochSecret),
		jwtSecret:            clone(jwtSecret),
		shieldSecret:         clone(shieldSecret),
		metricsToken:         clone(metricsToken),
	}, nil
}

func (b *Bootstrap) Close() {
	if b == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return
	}
	b.closeLocked()
}

func (b *Bootstrap) closeLocked() {
	b.closed = true
	wipe(b.serverPrivateKey)
	wipe(b.trustMeshEpochSecret)
	wipe(b.jwtSecret)
	wipe(b.shieldSecret)
	wipe(b.metricsToken)
}

func (b *Bootstrap) consume() (backend.MobileNodeBootstrap, error) {
	if b == nil {
		return backend.MobileNodeBootstrap{}, errors.New("mobile bootstrap is closed")
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return backend.MobileNodeBootstrap{}, errors.New("mobile bootstrap is closed")
	}
	material := backend.MobileNodeBootstrap{
		DatabasePath:         b.databasePath,
		StorageRoot:          b.storageRoot,
		ServerName:           b.serverName,
		ServerPrivateKey:     clone(b.serverPrivateKey),
		TrustMeshEpochSecret: clone(b.trustMeshEpochSecret),
		JWTSecret:            clone(b.jwtSecret),
		ShieldSecret:         clone(b.shieldSecret),
		MetricsToken:         clone(b.metricsToken),
	}
	b.closeLocked()
	return material, nil
}

func clone(value []byte) []byte {
	return append([]byte(nil), value...)
}

func wipe(value []byte) {
	clear(value)
	runtime.KeepAlive(value)
}
