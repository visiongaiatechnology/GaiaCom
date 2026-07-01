# GaiaCom Threat Model - v0.1

This document identifies security boundaries, threat vectors, assets, and mitigating controls implemented in the GaiaCom E2EE protocol and server software.

---

## 1. Asset Inventory & Trust Boundaries

### A. High-Value Assets
*   **User Master Secret:** The 64-byte master seed derived from the BIP-39 mnemonic. Used to derive all private signing and encryption keys.
*   **Mnemonic Phrase:** The 12-word plaintext seed phrase.
*   **Decrypted Messages:** Plaintext chat and email content displayed in the browser.
*   **Private Cryptographic Keys:** Signing key (Ed25519), Box key (X25519), and Decapsulation key (ML-KEM-1024).

### B. Trust Boundaries
*   **Client Sandbox:** The browser local storage and memory (under the CSP sandbox).
*   **Local Backend System:** The local database storage of identity records, contacts, and public cryptographic profiles.
*   **Server Egress (S2S Federation):** Outgoing client HTTP/HTTPS traffic to remote federation servers.

---

## 2. Threat Scenarios & Mitigations (STRIDE)

| Threat Category | Scenario | Mitigation |
|---|---|---|
| **Spoofing (S)** | An attacker tries to send a message pretending to be a verified user. | **Explicit Transcript Signatures:** Every message envelope is signed using the sender's Ed25519 private key. The signature covers the canonical AAD + ciphertext hash. |
| **Tampering (T)** | An attacker intercepts an envelope in transit and modifies metadata (e.g. `message_id`, `timestamp`, `sender`) to hijack context. | **Transcript Binding:** All envelope parameters are serialized into the Associated Authenticated Data (AAD) block of the AES-256-GCM cipher. Mutation triggers decryption failure. |
| **Tampering (T)** | An attacker replaces a contact's public keys with malicious keys (Man-in-the-Middle). | **Platin-UX Verification Modal:** Any mismatch between fetched public keys and local keys blocks sending. The user must type the last 6 characters of the new fingerprint to proceed. |
| **Repudiation (R)** | A sender claims they did not send a specific message. | **Non-Repudiation Signatures:** Ed25519 signatures over the envelope are non-forgeable. A message can be mathematically proved to originate from the identity owner. |
| **Information Disclosure (I)** | An attacker gets access to the server's local storage and reads the user's keys. | **PBKDF2 Key Vault:** Mnemonic seeds are encrypted via AES-256-GCM using keys derived via PBKDF2-HMAC-SHA256 (600,000 iterations). Plaintext seeds are never stored. |
| **Denial of Service (D)** | An attacker floods the server with fake CSP reports or PDUs to consume CPU/memory. | **CSP Rate Limiting & Eviction:** The CSP report endpoint enforces 16KB body limits, JSON syntax parsing, and IP-based rate limiting (1 req/5s). Replay caches cap at 50,000 items. |
| **Elevation of Privilege (E)** | An attacker redirects federation requests to local loopback endpoints (SSRF) to read internal server configuration. | **SSRF DNS Firewall:** A secure dialer resolves domains and blocks any connection to loopback, CGNAT, private subnets, unspecified, or mapped IPv6 addresses. |

---

## 3. Threat Model Limitations & Exclusions

*   **Endpoint Compromise:** If an attacker compromises the user's host OS, they can read the decrypted memory or log keystrokes. This is out of scope.
*   **DNS Rebinding (Strict Time Window):** While the SSRF firewall resolves IPs, a DNS rebinding attack within a very short TTL window could attempt a bypass. This is mitigated by re-resolving hosts on redirect checks.
*   **Abuse Score Collusion:** In a multi-node federation, compromised federated servers could collude to fabricate trust metrics. Mitigated by consensus rules.
