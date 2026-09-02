# GaiaCom Network Constitution and Trust Architecture - Draft

Status: Architecture backlog
Scope: GaiaCom Network, AGPLv3 federation, backwards compatibility, no-godmode enforcement

This document records the architectural direction for preventing any effective "God Mode" in GaiaCom Network while still allowing open-source AGPLv3 nodes and independent operators.

The core rule is simple:

> A node may transport, moderate, rate-limit, quarantine, and prove. A node must never decrypt, impersonate, forge identity state, forge receipts, or globally override the network.

## 1. Threat Model

GaiaCom Network will be AGPLv3. Therefore the network must assume:

- Anyone can run a node.
- Anyone can fork the code.
- Anyone can remove local UI restrictions.
- Anyone can advertise false capabilities.
- A node operator can be malicious.
- A node operator can collude with other malicious nodes.
- A node operator can expose or manipulate data that their own node legitimately stores.

The architecture must not rely on "good operators". It must rely on cryptographic verification, protocol compatibility checks, transparency, and federation isolation.

## 2. Non-Negotiable Invariants

These invariants define what GaiaCom Network is. A node that violates them is not a compatible GaiaCom Network node.

### No God Mode

- No node receives private user keys.
- No node receives a master recovery key.
- No node can decrypt private messages.
- No node can impersonate a GaiaID without the identity private signing key.
- No node can mark a message as read without a recipient-signed read receipt.
- No node can globally delete or alter another node's data.
- No role may include `decrypt_messages`, `impersonate_identity`, `read_private_inbox`, `forge_receipts`, or `modify_foreign_node`.

### Client-Side Cryptographic Authority

- Identity ownership is derived from public keys and signatures, not from node database authority.
- Private keys are generated and retained client-side.
- Message payloads and attachments are encrypted before upload.
- Profile updates, key rotations, message envelopes, read receipts, and sensitive channel events must be signed by the relevant identity key.

### Node-Limited Moderation

- A node operator may quarantine local content.
- A node operator may suspend local channels hosted by that node.
- A node operator may rate-limit or block local abuse.
- A node operator may resolve local abuse cases and appeals.
- A node operator may not impose global state on other nodes.

### Transparency by Default

- Operator actions must be appended to an auditable transparency log.
- Transparency log heads must be signed.
- Federation peers may compare observed behavior with published log heads.
- A node can be malicious, but it must not be silently malicious without losing trust.

## 3. Immutable Protocol Core

The protocol core is the backwards-compatible part of GaiaCom Network. Minor versions may add optional fields or capabilities. They must not change the meaning of existing fields.

The immutable core includes:

- Identity and public key format
- Message envelope format
- Signature verification rules
- E2EE payload requirements
- Delivery receipt format
- Recipient-signed read receipt format
- Federation handshake format
- Abuse case event format
- Transparency log head format
- Capability naming rules
- Forbidden capability list
- Version compatibility rules
- No-godmode invariants

Breaking changes require a major protocol version and explicit migration support.

## 4. Protocol Versioning Rules

GaiaCom Network should use semantic protocol versioning:

- Patch version: bug fix, no protocol behavior change.
- Minor version: additive only; old valid messages remain valid.
- Major version: breaking change; requires migration, dual-stack support, or explicit network transition.

Compatibility rules:

- A `1.x` node must accept valid older `1.x` envelopes unless a security revocation explicitly forbids them.
- A node must ignore unknown optional fields.
- A node must reject unknown mandatory fields.
- A node must reject a peer that changes the semantics of existing fields.
- A node must reject a peer that advertises forbidden capabilities.

## 5. Node Compatibility Manifest

Each node should publish a signed manifest during federation handshake.

Required manifest fields:

- `protocol`: expected value `gaiacom-network`
- `protocolVersion`: semantic version
- `nodeId`: stable node identifier
- `nodePublicKey`: node signing key
- `softwareName`: implementation name
- `softwareVersion`: implementation version
- `softwareBuildHash`: optional build hash
- `capabilities`: supported capabilities
- `forbiddenCapabilitiesAbsent`: explicit no-godmode assertion
- `transparencyLogHead`: latest signed transparency log head
- `policyHash`: hash of active federation policy
- `signature`: node signature over canonical manifest bytes

Example:

```json
{
  "protocol": "gaiacom-network",
  "protocolVersion": "1.4.0",
  "nodeId": "gaia-node-example",
  "nodePublicKey": "ed25519:...",
  "softwareName": "gaiacom-network-node",
  "softwareVersion": "1.4.2",
  "softwareBuildHash": "sha256:...",
  "capabilities": [
    "federation.v1",
    "e2ee.required",
    "signed_identity_events.v1",
    "signed_read_receipts.v1",
    "transparency_log.v1",
    "abuse_consensus.v1"
  ],
  "forbiddenCapabilitiesAbsent": [
    "decrypt_messages",
    "impersonate_identity",
    "read_private_inbox",
    "forge_receipts",
    "modify_foreign_node"
  ],
  "transparencyLogHead": "sha256:...",
  "policyHash": "sha256:...",
  "signature": "ed25519:..."
}
```

The manifest is not trusted by itself. It is an input into compatibility evaluation and later behavioral auditing.

## 6. Capability Model

Capabilities must be explicit and narrow.

Allowed examples:

- `federation.v1`
- `e2ee.required`
- `signed_identity_events.v1`
- `signed_delivery_receipts.v1`
- `signed_read_receipts.v1`
- `transparency_log.v1`
- `local_channel_moderation.v1`
- `local_abuse_queue.v1`
- `abuse_consensus.v1`

Forbidden examples:

- `decrypt_messages`
- `impersonate_identity`
- `read_private_inbox`
- `read_all_messages`
- `forge_receipts`
- `modify_foreign_node`
- `global_ban`
- `global_delete`
- `silent_operator_action`

No implementation may treat "admin", "root", "operator", or "bootstrap" as wildcard authority.

## 7. Trust Tiers

Trusted nodes should exist, but trust must never grant cryptographic superpowers.

Trust tier definitions:

- `unknown`: new or unobserved node; minimal federation, strict rate limits.
- `observed`: compatible behavior observed over time.
- `trusted`: stable compatibility, valid logs, acceptable reputation.
- `verified`: trusted plus stronger audit, build, or operator evidence.
- `quarantined`: suspicious or incompatible behavior; restricted federation.
- `blocked`: no federation.

Trusted means lower friction and higher routing confidence. It never means access to private content.

## 8. Automatic Quarantine Triggers

A node should be quarantined when it:

- Sends unsigned identity events.
- Sends invalidly signed message envelopes.
- Sends forged or sender-created read receipts.
- Omits required transparency log data.
- Advertises forbidden capabilities.
- Requests plaintext payloads.
- Attempts to modify foreign node state.
- Claims global delete or global ban authority.
- Replays old federation PDUs beyond allowed replay windows.
- Breaks backwards compatibility for the active major protocol version.
- Uses a protocol version outside the configured compatibility window.

Quarantine should be deterministic and explainable. Every quarantine decision should record a reason code.

## 9. Federation Compatibility Evaluator

Future implementation target: `federation/compatibility`.

Recommended components:

- `ProtocolManifest`
- `CapabilitySet`
- `ForbiddenCapability`
- `CompatibilityEvaluator`
- `TrustTier`
- `QuarantineReason`
- `FederationPolicy`
- `TransparencyLogHeadVerifier`

The evaluator should output:

- `accepted`
- `restricted`
- `quarantined`
- `blocked`

The decision must include machine-readable reasons.

## 10. No-Godmode Test Suite

Future automated tests should assert:

- A node operator cannot read another user's mailbox.
- A node operator cannot fetch private message bodies unless they are sender or recipient.
- A node operator cannot decrypt E2EE payloads.
- A node operator cannot impersonate an identity.
- Bootstrap credentials cannot bypass mailbox ownership.
- A read receipt requires recipient authority.
- A delivery receipt cannot be displayed as a read receipt.
- Federation rejects unsigned identity events.
- Federation rejects forbidden capabilities.
- Federation rejects foreign-node modification attempts.
- Operator actions are logged.
- Transparency log heads are signed.

These tests should run in normal CI and in the adversarial security gate.

## 11. Defense and Enterprise Boundary

GaiaCom Defense and GaiaCom Enterprise may define separate ecosystems, policies, and operator powers.

They must not weaken GaiaCom Network invariants.

Network compatibility rule:

- A Defense-only or Enterprise-only power must not be advertised as a GaiaCom Network capability.
- A Defense node with ecosystem-specific authority must either run in a separate federation namespace or be restricted to peers that explicitly accept that namespace.
- GaiaCom Network clients must treat non-network capabilities as incompatible unless explicitly supported by a separate profile.

## 12. Implementation Backlog

Recommended order:

1. Define `ProtocolManifest` and canonical signing format.
2. Implement forbidden capability evaluation.
3. Add trust tier model and quarantine reason codes.
4. Wire compatibility evaluation into federation handshake.
5. Add signed transparency log heads.
6. Add no-godmode invariant tests.
7. Add UI visibility for node trust tier and quarantine reason.
8. Add optional trusted-node registry support.

## 13. Design Principle

God Mode must not be a missing permission check.

God Mode must be structurally impossible because the node lacks the keys, lacks the signatures, lacks the accepted capabilities, and cannot convince compatible peers to accept forged state.
