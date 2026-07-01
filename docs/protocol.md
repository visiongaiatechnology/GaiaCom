# GaiaCom Protocol Overview

This document summarizes the public beta protocol. The lower-level crypto
details remain in `docs/protocol-v0.1.md`.

## Native Envelope

Native GaiaCom content is encrypted client-side. The server stores an envelope
containing routing and verification material, not native plaintext.

Minimum visible transport fields:

- Message or object identifier.
- Sender/recipient routing identifiers.
- Ciphertext size and server receive time.
- Algorithm suite identifier.
- Signature material.

Private semantic data such as message body, attachment content, and GaiaDrive
object content must remain encrypted before server storage.

## Hybrid Encryption

The beta crypto harness verifies:

- X25519 classical key agreement.
- ML-KEM-1024 post-quantum key exchange.
- HKDF-SHA256 key derivation.
- AES-256-GCM authenticated encryption.
- AAD binding for identifiers, timestamps, IVs, KEM ciphertext, suite, and
  participant keys.

Tampering with ciphertext, KEM material, AAD fields, or suite identifiers must
fail closed.

## Signatures

Native messages use Ed25519 transcript signatures. Top Secret mode additionally
requires ML-DSA-87 capability and signature verification. Missing, invalid, or
mismatched ML-DSA-87 material is rejected in Top Secret contexts.

## SMTP Boundary

SMTP is a legacy/downgrade bridge. It is not native GaiaCom E2EE and must not
receive native trust badges or GaiaProof claims. The UI and mail model must keep
this distinction visible.

## Federation

Federated interactions are sent as signed PDUs. Federation validates:

- Sender signature.
- Timestamp skew.
- Replay ID.
- Destination binding.
- SSRF and DNS-rebinding limits.
- Top Secret capability where required.
