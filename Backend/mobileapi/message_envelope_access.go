// STATUS: DIAMANT VGT SUPREME
package mobileapi

func StandardMessageAlgorithmSuite() string  { return standardMessageSuite }
func TopSecretMessageAlgorithmSuite() string { return topSecretMessageSuite }

func (e *MessageEnvelope) AlgorithmSuite() string {
	if e == nil {
		return ""
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return ""
	}
	return e.algorithmSuite
}

func (e *MessageEnvelope) KemCiphertext() []byte {
	return e.bytesCopy(0)
}

func (e *MessageEnvelope) EphemeralPublic() []byte {
	return e.bytesCopy(1)
}

func (e *MessageEnvelope) PayloadCiphertext() []byte {
	return e.bytesCopy(2)
}

func (e *MessageEnvelope) IV() []byte {
	return e.bytesCopy(3)
}

func (e *MessageEnvelope) Ed25519Signature() []byte {
	return e.bytesCopy(4)
}

func (e *MessageEnvelope) Mldsa87Signature() []byte {
	return e.bytesCopy(5)
}

func (e *MessageEnvelope) SenderMldsa87Public() []byte {
	return e.bytesCopy(6)
}

func (e *MessageEnvelope) RecipientDeviceBoxPublic() []byte {
	return e.bytesCopy(7)
}

func (e *MessageEnvelope) bytesCopy(index int) []byte {
	if e == nil {
		return nil
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return nil
	}
	values := [][]byte{
		e.kemCiphertext,
		e.ephemeralPublic,
		e.payloadCiphertext,
		e.iv,
		e.ed25519Signature,
		e.mldsa87Signature,
		e.senderMldsa87Public,
		e.recipientDeviceBoxPublic,
	}
	if index < 0 || index >= len(values) {
		return nil
	}
	return clone(values[index])
}

func (e *MessageEnvelope) ClientMessageID() string {
	if e == nil {
		return ""
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return ""
	}
	return e.clientMessageID
}

func (e *MessageEnvelope) TimestampMillis() int64 {
	if e == nil {
		return 0
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return 0
	}
	return e.timestampMillis
}

func (e *MessageEnvelope) RecipientDeviceKeyID() string {
	if e == nil {
		return ""
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.closed {
		return ""
	}
	return e.recipientDeviceKeyID
}

func (e *MessageEnvelope) IsTopSecret() bool {
	return e.AlgorithmSuite() == topSecretMessageSuite
}
