// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package types

import "crypto/ed25519"

// KeyPair enthält ein Paar aus privatem und öffentlichem Schlüssel für digitale Signaturen.
type KeyPair struct {
	Public  ed25519.PublicKey
	Private ed25519.PrivateKey
}

// PKEKeyPair enthält ein Schlüsselpaar für die Public-Key-Verschlüsselung.
type PKEKeyPair struct {
	Public  []byte
	Private []byte
}

// IdentityKeys bündelt alle kryptographischen Schlüssel für eine GaiaCom-Identität.
type IdentityKeys struct {
	Sign        KeyPair    // Für Signaturen (Ed25519)
	Box         PKEKeyPair // Für klassische Verschlüsselung (X25519)
	PKE         PKEKeyPair // Für Post-Quantum-Verschlüsselung (Kyber)
	MasterKey   []byte     // Der 32-Byte-Master-Schlüssel, von der Mnemonic abgeleitet
}

// PublicKeys ist die öffentliche Teilmenge von IdentityKeys.
type PublicKeys struct {
	Identity    []byte `json:"identity"`    // ed25519 public key
	Classic     []byte `json:"classic"`     // x25519 public key
	PostQuantum []byte `json:"post_quantum"`// kyber public key
}

// PublicRecord ist die signierte, öffentliche Aufzeichnung einer Identität.
type PublicRecord struct {
	GaiaID     string     `json:"gaia_id"`
	Version    int        `json:"version"`
	Timestamp  int64      `json:"timestamp"`
	PublicKeys PublicKeys `json:"public_keys"`
	Signature  []byte     `json:"signature,omitempty"`
}