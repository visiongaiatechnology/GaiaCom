# GaiaCom Security Invariants - v0.1

This document defines the core security invariants that the GaiaCom codebase **must** preserve at all times. These invariants are verified by the automated testing harness.

---

## 1. Cryptographic Invariants

### Invariant 1: Key Strength
*   **Definition:** Subkeys derived from the BIP-39 mnemonic must be cryptographically independent.
*   **Verification:** Derived seeds (Ed25519, X25519, ML-KEM) are hashed via SHAKE-256 with distinct domain separation strings.

### Invariant 2: Cryptographic Combination Fail-Closed
*   **Definition:** If either the classical X25519 ECDH or the post-quantum ML-KEM exchange fails or yields incorrect key sizes, key derivation must halt and fail-closed.
*   **Verification:** `encryptPayload` and `decryptPayload` enforce strict byte length checks (e.g., ML-KEM public key = 1568 bytes, private key = 3168 bytes, box key = 32 bytes).

### Invariant 3: AEAD Context Binding
*   **Definition:** Any modification to the message envelope metadata (UUID, timestamp, IV, KEM ciphertext) or the identity keys of the sender or recipient must cause authenticated decryption to fail.
*   **Verification:** `adversarial_run.mjs` runs individual tests mutating every single envelope parameter, asserting that all of them trigger decryption failures.

### Invariant 4: Signature Binding
*   **Definition:** A message must be rejected if the signature is invalid, missing, signed by a different private key, or if the underlying ciphertext hash was modified.
*   **Verification:** `adversarial_run.mjs` asserts that any change to the ciphertext hash or signature block triggers a signature-validation failure.

### Invariant 5: Downgrade Attack Immunity
*   **Definition:** The algorithm suite used for encryption must be strictly enforced during decryption. Changing the suite identifier in the envelope must prevent decryption.
*   **Verification:** `decryptPayload` reconstructs the AAD with the hardcoded suite string. Mutated suite envelopes fail tag verification.

---

## 2. Infrastructure & Network Invariants

### Invariant 6: SSRF Isolation
*   **Definition:** Egress federation connections (S2S) must never connect to private, loopback, multicast, CGNAT, benchmarking, documentation, or reserved IP ranges in production mode.
*   **Verification:** `TestAdversarialIsPrivateIP` validates the blocklist. `TestAdversarialSafeDialContextProduction` asserts that dialing loopback or CGNAT yields connection errors.

### Invariant 7: Port Restrictiveness
*   **Definition:** Egress federation calls in production mode must only use ports `80` and `443`.
*   **Verification:** `TestAdversarialSafeDialContextProduction` asserts that dialing port 8080 or port 22 yields egress rejection.

### Invariant 8: Replay Immunity
*   **Definition:** The server must reject any duplicate PDU ID.
*   **Verification:** `TestAdversarialReplayAndSkew` asserts that duplicate PDU IDs return duplicate/replay processing errors.

### Invariant 9: Clock-Skew Threshold
*   **Definition:** Egress/Ingress PDUs with a timestamp skew greater than 1 hour in the past or future must be rejected.
*   **Verification:** `TestAdversarialReplayAndSkew` asserts that PDUs older or newer than 1 hour are rejected.
