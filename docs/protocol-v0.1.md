# GaiaCom Protocol Specification - v0.1 (Draft)

This document specifies the cryptographic structures, message envelope format, and key combining operations for the GaiaCom End-to-End Encrypted (E2EE) messaging protocol.

---

## 1. Cryptographic Suite & Primitives

GaiaCom implements a hybrid post-quantum / classical E2EE protocol.
*   **Suite Identifier:** `GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM`
*   **Classical Key Exchange:** X25519 Diffie-Hellman
*   **Post-Quantum Key Encapsulation:** ML-KEM-1024 (FIPS 203)
*   **Sender Authentication:** Ed25519 Signatures
*   **Symmetric Encryption:** AES-256-GCM
*   **KDF / Key Combination:** HKDF-SHA256
*   **Hashing / Digest:** SHA-256

---

## 2. Key Derivation from Mnemonic

Users register with an English BIP-39 mnemonic (12 words).
1.  Derive the 64-byte master seed from the mnemonic words (no passphrase).
2.  Hash the master seed to a 32-byte master key using SHAKE-256:
    $$\text{MasterKey} = \text{SHAKE-256}(\text{Seed}, 32 \text{ bytes})$$
3.  Derive domain-separated subkeys:
    *   **Ed25519 Identity Sign Key Seed:**
        $$\text{SignSeed} = \text{SHAKE-256}(\text{"gaiacom.identity.sign.ed25519.v1" } || 0x00 || \text{MasterKey}, 32)$$
    *   **X25519 Device Encryption Key Seed:**
        $$\text{BoxSeed} = \text{SHAKE-256}(\text{"gaiacom.identity.box.x25519.v1" } || 0x00 || \text{MasterKey}, 32)$$
        *Clamped as follows:* `BoxSeed[0] &= 248`, `BoxSeed[31] &= 127`, `BoxSeed[31] |= 64`.
    *   **ML-KEM-1024 Key Seed:**
        $$\text{KEMSeed} = \text{SHAKE-256}(\text{"gaiacom.identity.pq.mlkem1024.v1" } || 0x00 || \text{MasterKey}, 64)$$

---

## 3. Hybrid KEM Key Combination

To encrypt a message for a recipient, a combined symmetric key is derived from the classical X25519 shared secret and the post-quantum ML-KEM shared secret.

1.  **ML-KEM Encapsulation:**
    $$(\text{KEMCiphertext}, \text{KEMSecret}) = \text{ML-KEM-1024.Encapsulate}(\text{RecipientPKEPublicKey})$$
    *   `KEMCiphertext` is exactly 1568 bytes.
    *   `KEMSecret` is 32 bytes.
2.  **X25519 ECDH:**
    Generate an ephemeral X25519 key pair $(\text{EphemPriv}, \text{EphemPub})$.
    $$\text{X25519Secret} = \text{X25519.SharedSecret}(\text{EphemPriv}, \text{RecipientBoxPublicKey})$$
    *   `X25519Secret` is 32 bytes.
3.  **HKDF Combiner Input:**
    Combine secrets with explicit 32-bit big-endian length-prefixing:
    $$\text{IKM} = \text{LengthPrefix}(\text{X25519Secret}) \ || \ \text{LengthPrefix}(\text{KEMSecret})$$
    *   `LengthPrefix(S)` is `uint32_be(len(S)) || S`.
4.  **Salt and Info:**
    *   $$\text{Salt} = \text{EphemPub} \ || \ \text{KEMCiphertext}$$ (1600 bytes total)
    *   $$\text{Info} = \text{UTF-8("GaiaCom/v0.1/hybrid-kem/X25519+ML-KEM-1024/AES-256-GCM")}$$
5.  **Key Extraction:**
    $$\text{CombinedSymmetricKey} = \text{HKDF-Extract-and-Expand}(\text{SHA-256}, \text{IKM}, \text{Salt}, \text{Info}, 32 \text{ bytes})$$

---

## 4. Transcript Binding & Canonical AAD

To bind all transaction metadata to the ciphertext and prevent tampering, a canonical Associated Authenticated Data (AAD) block is constructed.

$$\text{AADBytes} = \text{buildCanonicalAAD}(\dots)$$

### Binary Layout:
| Field Name | Type / Length | Description |
|---|---|---|
| `protocol_version` | 2-byte len prefix + string | Must be `"v0.1"` |
| `algorithm_suite` | 2-byte len prefix + string | Must match the suite identifier |
| `sender_identity_key` | 32 bytes | Ed25519 public sign key of the sender |
| `recipient_identity_key` | 32 bytes | Ed25519 public sign key of the recipient |
| `recipient_device_key` | 32 bytes | X25519 public encryption key of the recipient |
| `ephemeral_x25519_public_key` | 32 bytes | Ephemeral public key used for ECDH |
| `mlkem_ciphertext_hash` | 32 bytes | SHA-256 hash of the 1568-byte KEM ciphertext |
| `message_id` | 2-byte len prefix + string | UUIDv4 string |
| `timestamp` | 8 bytes | Big-endian 64-bit integer Unix timestamp |
| `iv` | 12 bytes | AES-GCM Initialization Vector |

---

## 5. Explicit Transcript Umschlag-Signatur

To guarantee sender authenticity and prevent key-mismatch spoofing, the sender signs the transcript. The signature is passed in the envelope but is **not** part of the signed payload.

$$\text{Signature} = \text{Ed25519.Sign}(\text{SenderIdentityPrivateKey}, \text{SigPayload})$$

The signature payload `SigPayload` is a canonical binary serialization (`buildCanonicalSignaturePayload`):
$$\text{SigPayload} = \text{AADBytes} \ || \ \text{SHA-256}(\text{PayloadCiphertext})$$
*(where `PayloadCiphertext` is the encrypted message output from AES-GCM).*

---

## 6. Message Envelope Format (JSON)

Messages are transmitted between federation nodes as JSON structures:

```json
{
  "kem_ciphertext": "<hex-encoded-1568-bytes>",
  "ephemeral_pub": "<hex-encoded-32-bytes>",
  "payload_ciphertext": "<hex-encoded-variable-bytes>",
  "iv": "<hex-encoded-12-bytes>",
  "signature": "<hex-encoded-64-bytes-signature>",
  "client_message_id": "<uuid-string>",
  "timestamp": 1781881729381
}
```
