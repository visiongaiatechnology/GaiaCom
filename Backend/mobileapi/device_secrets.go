// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sync"
)

const runtimeSecretBytes = 32

type DeviceSecrets struct {
	mu                   sync.Mutex
	serverName           string
	serverPrivateKey     []byte
	trustMeshEpochSecret []byte
	jwtSecret            []byte
	shieldSecret         []byte
	metricsToken         []byte
	closed               bool
}

func GenerateDeviceSecrets() (*DeviceSecrets, error) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, errors.New("mobile device identity generation failed")
	}
	runtimeMaterial := make([]byte, runtimeSecretBytes*4)
	if _, err := rand.Read(runtimeMaterial); err != nil {
		wipe(privateKey)
		wipe(runtimeMaterial)
		return nil, errors.New("mobile runtime secret generation failed")
	}
	nameHash := sha256.Sum256(publicKey)
	secrets := &DeviceSecrets{
		serverName:           "device-" + hex.EncodeToString(nameHash[:8]) + ".gaiacom.local",
		serverPrivateKey:     clone(privateKey),
		trustMeshEpochSecret: clone(runtimeMaterial[0:runtimeSecretBytes]),
		jwtSecret:            clone(runtimeMaterial[runtimeSecretBytes : runtimeSecretBytes*2]),
		shieldSecret:         clone(runtimeMaterial[runtimeSecretBytes*2 : runtimeSecretBytes*3]),
		metricsToken:         clone(runtimeMaterial[runtimeSecretBytes*3 : runtimeSecretBytes*4]),
	}
	wipe(privateKey)
	wipe(runtimeMaterial)
	return secrets, nil
}

func (s *DeviceSecrets) ServerName() string {
	if s == nil {
		return ""
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return ""
	}
	return s.serverName
}

func (s *DeviceSecrets) ServerPrivateKey() []byte     { return s.secretCopy(0) }
func (s *DeviceSecrets) TrustMeshEpochSecret() []byte { return s.secretCopy(1) }
func (s *DeviceSecrets) JWTSecret() []byte            { return s.secretCopy(2) }
func (s *DeviceSecrets) ShieldSecret() []byte         { return s.secretCopy(3) }
func (s *DeviceSecrets) MetricsToken() []byte         { return s.secretCopy(4) }

func (s *DeviceSecrets) secretCopy(index int) []byte {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return nil
	}
	values := [][]byte{s.serverPrivateKey, s.trustMeshEpochSecret, s.jwtSecret, s.shieldSecret, s.metricsToken}
	if index < 0 || index >= len(values) {
		return nil
	}
	return clone(values[index])
}

func (s *DeviceSecrets) Close() {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	s.closed = true
	s.serverName = ""
	wipe(s.serverPrivateKey)
	wipe(s.trustMeshEpochSecret)
	wipe(s.jwtSecret)
	wipe(s.shieldSecret)
	wipe(s.metricsToken)
	s.serverPrivateKey = nil
	s.trustMeshEpochSecret = nil
	s.jwtSecret = nil
	s.shieldSecret = nil
	s.metricsToken = nil
}
