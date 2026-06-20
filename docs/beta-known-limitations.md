# GaiaCom Beta Known Limitations - v0.1

This document outlines the known limitations, scoped boundaries, and disabled features of the GaiaCom v0.1 technical beta release.

---

## 1. Purposely Scoped Scope for Beta

### A. Text-only Messages
*   **Status:** Scoped.
*   **Limitation:** File attachments, images, and audio/video media are intentionally disabled to limit exposure to raw media parsing attacks and reduce storage vectors during the initial security burn-in.

### B. Single-Node Replay Cache (Memory Limit)
*   **Status:** Scoped.
*   **Limitation:** The duplicate PDU replay cache (`processedPDUs`) is stored in-memory (capped at 50,000 entries with batch eviction) per server node.
*   **Implication:** If a node restarts, the in-memory cache is wiped. Replays are still mitigated by the strict 1-hour clock-skew window, but a clusterwide persistent replay cache (e.g., Redis Cluster or Distributed Ledger) is not yet implemented.

### C. Manual Key-Replacement Checks
*   **Status:** Scoped.
*   **Limitation:** If a contact changes their public key, the UI blocks sending and triggers the Platin-UX key change modal.
*   **Implication:** This requires manual confirmation from the user by typing the last 6 characters of the fingerprint. Automated, decentralized Out-of-Band (OOB) key-attestation protocols (like Key Transparency) are deferred to Protocol v0.2.

---

## 2. Disabled Features (Audit Pending)

### A. Public Federation / Open Registrations
*   **Status:** Disabled.
*   **Limitation:** Federation is restricted to a whitelist of known controlled technical nodes. Open registrations and public federation with arbitrary domains are disabled to prevent spam and network enumeration.

### B. Group Messaging Multi-Device Sync
*   **Status:** Disabled.
*   **Limitation:** End-to-End group multiplexing encrypts messages individually for each recipient's active device key. Multiplexing across multiple concurrently active devices per identity is not supported in v0.1.

### C. Global Abuse Consensus (TrustMesh Reporting)
*   **Status:** Local Enforcement.
*   **Limitation:** Abuse scores are compiled and processed locally per server node based on reported cryptographic proof vectors. Automated global consensus synchronization between nodes is disabled.
