// STATUS: DIAMANT VGT SUPREME
package mobileapi

import "errors"

type recipientSnapshot struct {
	identityPublic []byte
	x25519Public   []byte
	mlkemPublic    []byte
	mldsaPublic    []byte
	deviceKeyID    string
}

type senderSnapshot struct {
	ed25519Public []byte
	mldsaPublic   []byte
}

type envelopeSnapshot struct {
	algorithmSuite           string
	kemCiphertext            []byte
	ephemeralPublic          []byte
	payloadCiphertext        []byte
	iv                       []byte
	ed25519Signature         []byte
	mldsa87Signature         []byte
	senderMldsa87Public      []byte
	clientMessageID          string
	timestampMillis          int64
	recipientDeviceKeyID     string
	recipientDeviceBoxPublic []byte
}

func (r *MessageRecipient) snapshot() (recipientSnapshot, error) {
	if r == nil {
		return recipientSnapshot{}, errors.New("recipient capability is closed")
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.closed {
		return recipientSnapshot{}, errors.New("recipient capability is closed")
	}
	return recipientSnapshot{
		identityPublic: clone(r.identityPublic),
		x25519Public:   clone(r.x25519Public),
		mlkemPublic:    clone(r.mlkem1024Public),
		mldsaPublic:    clone(r.mldsa87Public),
		deviceKeyID:    r.deviceKeyID,
	}, nil
}

func (s *MessageSender) snapshot() (senderSnapshot, error) {
	if s == nil {
		return senderSnapshot{}, errors.New("sender capability is closed")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.closed {
		return senderSnapshot{}, errors.New("sender capability is closed")
	}
	return senderSnapshot{
		ed25519Public: clone(s.ed25519Public),
		mldsaPublic:   clone(s.mldsa87Public),
	}, nil
}

func (e *MessageEnvelope) snapshot() (envelopeSnapshot, error) {
	if e == nil {
		return envelopeSnapshot{}, errors.New("message envelope is closed")
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return envelopeSnapshot{}, errors.New("message envelope is closed")
	}
	return envelopeSnapshot{
		algorithmSuite:           e.algorithmSuite,
		kemCiphertext:            clone(e.kemCiphertext),
		ephemeralPublic:          clone(e.ephemeralPublic),
		payloadCiphertext:        clone(e.payloadCiphertext),
		iv:                       clone(e.iv),
		ed25519Signature:         clone(e.ed25519Signature),
		mldsa87Signature:         clone(e.mldsa87Signature),
		senderMldsa87Public:      clone(e.senderMldsa87Public),
		clientMessageID:          e.clientMessageID,
		timestampMillis:          e.timestampMillis,
		recipientDeviceKeyID:     e.recipientDeviceKeyID,
		recipientDeviceBoxPublic: clone(e.recipientDeviceBoxPublic),
	}, nil
}

func (r *recipientSnapshot) wipe() {
	wipe(r.identityPublic)
	wipe(r.x25519Public)
	wipe(r.mlkemPublic)
	wipe(r.mldsaPublic)
}

func (s *senderSnapshot) wipe() {
	wipe(s.ed25519Public)
	wipe(s.mldsaPublic)
}

func (e *envelopeSnapshot) wipe() {
	wipe(e.kemCiphertext)
	wipe(e.ephemeralPublic)
	wipe(e.payloadCiphertext)
	wipe(e.iv)
	wipe(e.ed25519Signature)
	wipe(e.mldsa87Signature)
	wipe(e.senderMldsa87Public)
	wipe(e.recipientDeviceBoxPublic)
}

func (r *MessageRecipient) Close() {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return
	}
	r.closed = true
	wipe(r.identityPublic)
	wipe(r.x25519Public)
	wipe(r.mlkem1024Public)
	wipe(r.mldsa87Public)
	r.identityPublic, r.x25519Public, r.mlkem1024Public, r.mldsa87Public = nil, nil, nil, nil
	r.deviceKeyID = ""
}

func (s *MessageSender) Close() {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	s.closed = true
	wipe(s.ed25519Public)
	wipe(s.mldsa87Public)
	s.ed25519Public, s.mldsa87Public = nil, nil
}

func (e *MessageEnvelope) Close() {
	if e == nil {
		return
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.closed {
		return
	}
	e.closed = true
	for _, value := range [][]byte{
		e.kemCiphertext, e.ephemeralPublic, e.payloadCiphertext, e.iv,
		e.ed25519Signature, e.mldsa87Signature, e.senderMldsa87Public,
		e.recipientDeviceBoxPublic,
	} {
		wipe(value)
	}
	e.kemCiphertext, e.ephemeralPublic, e.payloadCiphertext, e.iv = nil, nil, nil, nil
	e.ed25519Signature, e.mldsa87Signature, e.senderMldsa87Public = nil, nil, nil
	e.recipientDeviceBoxPublic = nil
	e.algorithmSuite, e.clientMessageID, e.recipientDeviceKeyID = "", "", ""
	e.timestampMillis = 0
}
