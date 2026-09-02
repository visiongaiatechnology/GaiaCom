# GaiaCom Sovereign Crypto v1

## Security status

The client protocol provides two fail-closed, versioned suites in both native Tauri and browser deployments. Unknown suites, mismatched profiles, malformed HQC ciphertexts, missing keyset proofs, and missing Top Secret signatures are rejected. Browser cryptography executes in an isolated Worker; HQC-256 and both shared Rust cascade profiles must pass startup self-tests before the provider becomes usable.

### Accelerated

- Hybrid key establishment: ephemeral X25519 + ML-KEM-1024 + HQC-256.
- Length-prefixed secret combiner and HKDF-SHA3-512 domain separation.
- Native authenticated cascade: Twofish-256-EAX followed by AES-256-GCM.
- Ed25519 transcript signature.

### Top Secret

- The same X25519 + ML-KEM-1024 + HQC-256 hybrid establishment.
- Native authenticated cascade: Serpent-256-CTR authenticated by HMAC-SHA3-512, Twofish-256-EAX, XChaCha20-Poly1305, and AES-256-GCM-SIV.
- Hybrid Ed25519 + ML-DSA-87 transcript signatures.

The signed transcript binds protocol version, exact algorithm suite, sender identity, recipient identity, recipient encryption key, ephemeral X25519 key, both KEM ciphertexts, message ID, timestamp, nonce, and encrypted payload. The recipient public key set is identity-signed and validated at registration and before encryption.

## Trust and compatibility boundaries

Sovereign v1 uses the identity-signed static recipient key set. Device-specific keys are not substituted because the current device registry does not yet carry an identity-signed prekey certificate chain. Existing legacy v0.1/v0.2 envelopes remain readable for migration and mobile compatibility; new AstraeaOS desktop sends use Sovereign v1 and never silently downgrade.

## Ratchet boundary

Sovereign v1 is a hybrid per-message envelope, not a Triple Ratchet. Fresh KEM encapsulations do not by themselves provide post-compromise security against later compromise of the recipient's static private keys. A truthful Triple Ratchet release requires identity-signed per-device prekey bundles, one-time prekey consumption, persistent and transactional ratchet state, skipped-message-key bounds, replay-safe counters, concurrent-device conflict handling, recovery rules, and cross-client test vectors. Until that protocol is implemented, GaiaCom does not advertise ratchet-derived forward secrecy.

## Remaining hardening before high-assurance deployment

- Move mnemonic and all long-term private-key custody into the native process with Argon2id-based wrapping, locked memory where available, and explicit zeroization.
- Add identity-signed per-device HQC/ML-KEM/X25519 prekeys and a formally specified Triple Ratchet wire protocol.
- Bring mobile clients onto Sovereign v1 before disabling legacy suites.
- Add independent cryptographic review, deterministic interoperability vectors, fuzzing, side-channel assessment, and reproducible dependency provenance.
- Track the final HQC standard and update parameter identifiers or encodings only through a new protocol version.

No deployment should be described as government-grade or formally high assurance solely on the basis of algorithm selection. That classification additionally requires audited implementation, verified build and update chains, operational key management, incident response, and an applicable certification process.