// STATUS: DIAMANT VGT SUPREME
package mobileapi

import "errors"

type encryptionIdentitySnapshot struct {
	ed25519Public []byte
	ed25519Seed   []byte
	mldsaPublic   []byte
	mldsaPrivate  []byte
}

type decryptionIdentitySnapshot struct {
	ed25519Public []byte
	x25519Public  []byte
	x25519Private []byte
	mlkemPrivate  []byte
}

func (i *KeyBundle) encryptionSnapshot(topSecret bool) (encryptionIdentitySnapshot, error) {
	if i == nil {
		return encryptionIdentitySnapshot{}, errors.New("native identity is closed")
	}
	i.mu.RLock()
	defer i.mu.RUnlock()
	if i.closed {
		return encryptionIdentitySnapshot{}, errors.New("native identity is closed")
	}
	snapshot := encryptionIdentitySnapshot{
		ed25519Public: clone(i.ed25519Public),
		ed25519Seed:   clone(i.ed25519Seed),
	}
	if topSecret {
		snapshot.mldsaPublic = clone(i.mldsa87Public)
		snapshot.mldsaPrivate = clone(i.mldsa87Private)
	}
	return snapshot, nil
}

func (i *KeyBundle) decryptionSnapshot() (decryptionIdentitySnapshot, error) {
	if i == nil {
		return decryptionIdentitySnapshot{}, errors.New("native identity is closed")
	}
	i.mu.RLock()
	defer i.mu.RUnlock()
	if i.closed {
		return decryptionIdentitySnapshot{}, errors.New("native identity is closed")
	}
	return decryptionIdentitySnapshot{
		ed25519Public: clone(i.ed25519Public),
		x25519Public:  clone(i.x25519Public),
		x25519Private: clone(i.x25519Private),
		mlkemPrivate:  clone(i.mlkem1024Private),
	}, nil
}

func (s *encryptionIdentitySnapshot) wipe() {
	wipe(s.ed25519Public)
	wipe(s.ed25519Seed)
	wipe(s.mldsaPublic)
	wipe(s.mldsaPrivate)
}

func (s *decryptionIdentitySnapshot) wipe() {
	wipe(s.ed25519Public)
	wipe(s.x25519Public)
	wipe(s.x25519Private)
	wipe(s.mlkemPrivate)
}
