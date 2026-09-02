# GaiaCOM Security Invariants

// STATUS: PLATIN

These invariants are release-blocking for GaiaCOM Core, GaiaCOM Enterprise, and GaiaCOM Defense.

## Core Zero-Trust Boundary

- The server must never receive plaintext private chat, group chat, GaiaDrive file, GaiaVault, or native GaiaMail content unless the user explicitly creates a local disclosure export.
- The server must never store user private keys, mnemonic phrases, recovery seeds, device unlock codes, or decrypted GaiaVault material.
- No edition may add a server-side master key, recovery backdoor, plaintext decrypt endpoint, or admin impersonation endpoint.
- Admin, operator, Enterprise, and Defense capabilities may govern policy and operations only. They must not bypass end-to-end encryption.

## Forbidden Core Capabilities

The following capability classes are permanently forbidden:

- `readAllMessages`
- `decryptUserData`
- `impersonateUser`
- `exportPrivateKeys`
- `serverMasterKey`
- `bypassE2EE`

Equivalent names, aliases, route names, hook names, or environment variables with the same semantic effect are also forbidden.

## Edition Layer Boundary

- GaiaCOM Core owns authentication, identity, messaging, storage, cryptographic boundaries, and federation envelope validation.
- GaiaCOM Enterprise may add SSO, directory sync, policy management, audit reporting, retention metadata, and device administration.
- GaiaCOM Defense may add stricter policy defaults, Top Secret defaults, PQ-only rooms, airgap controls, and federation allowlists.
- Enterprise and Defense must consume Core through explicit capability-checked APIs. They must not mutate Core repositories directly.

## Hook Sandbox

- Hooks receive reduced DTOs only. DTOs must not contain private keys, mnemonics, JWTs, raw encrypted secret envelopes, local filesystem paths, or decrypted content.
- Hooks may return policy decisions, labels, or audit annotations.
- Hooks must not execute dynamic script strings, call `eval`, spawn shell commands, or obtain process-global secrets.
- Hook failures must be isolated and audited. Security hooks fail closed when their decision is required.

## Administrative Abuse Prevention

- Privileged actions require explicit capabilities, signed actor context, reason codes, and audit events.
- Risky administrative actions require four-eye approval or a time-limited break-glass workflow.
- Break-glass never grants plaintext access, private-key access, vault access, or impersonation.
- Admin and operator routes are rate-limited like user routes.

## Runtime Isolation

- Core, Enterprise, and Defense deployments must use separate database files, upload roots, JWT secrets, shield secrets, and node signing keys.
- Edition deployments must not point to the original GaiaCOM Core runtime storage by default.
- Production startup must reject short/default secrets and ambiguous shared runtime paths.
