# GaiaCom TrustMesh & Abuse Consensus - v0.1

This document specifies the TrustMesh scoring algorithms, reporting proofs, and escalation friction policies implemented in the GaiaCom server nodes to protect against envelope flooding and spam.

---

## 1. TrustMesh Abuse Scoring Model

Every federated identity has an associated `AbuseScore` tracked locally by each server node.
$$\text{AbuseScore} \in [0, 100]$$

### A. Reporting Proof Generation
To prevent malicious spam reporting, a node must submit a cryptographic report proof matching the target envelope:
$$\text{Proof} = \text{SHA-256}(\text{MessageUUID} \ || \ \text{SenderPubKey} \ || \ \text{RecipientPubKey} \ || \ \text{CiphertextHash})$$

---

## 2. Friction & Quarantine Escalation

When an abuse report is validated, the target identity's abuse score increases. Server nodes apply escalation penalties depending on the score:

| Abuse Score Range | Escalation Level | Friction / Penalty Policy |
|---|---|---|
| **0 – 4** | Level 0 | Normal message delivery. No friction. |
| **5 – 8** | Level 1 | **Friction Delay:** Egress message processing is throttled (1.5 seconds delay injected). |
| **9 – 12** | Level 2 | **Heavy Friction:** Message processing delayed by 5.0 seconds. |
| **13+** | Level 3 | **Quarantine:** The sender's public key is placed in quarantine for a time period: $$\text{QuarantineDuration} = 1 \text{ hour} \times (\text{Score} - 12)$$ Egress messages from this key are dropped. |

---

## 3. Score Decay & Eviction

To allow rehabilitated nodes to recover, abuse scores decay dynamically over time:
*   **Decay Rate:** -1 point per hour of zero reported abuse.
*   **Decay Trigger:** Evaluated on every incoming PDU validation. If the score decays to `0`, the quarantine is lifted automatically.
*   **Database Cleanup:** Records with a score of `0` and empty timeout periods are evictable.
