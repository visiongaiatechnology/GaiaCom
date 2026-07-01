# GaiaCom Security Policy

GaiaCom is a beta communications platform with client-side encryption, strict
server-side authorization, and automated security gates. It is not a claim of
absolute security or guaranteed anonymity.

## Supported Scope

Security reports are accepted for the GaiaCom Core beta codebase:

- Backend API, federation, storage, governance, GaiaShield, and authentication.
- Frontend cryptography, session handling, rendering, and browser storage.
- Security PoCs, release gates, and documentation claims.

Enterprise/Defense edition experiments are outside the current Core beta
release scope unless they affect the shared Core.

## Reporting

Please do not open a public issue for an active vulnerability. Send reports to
the maintainer contact listed in `docs/responsible-disclosure.md`.

Include:

- Affected component and commit/build if known.
- Reproduction steps or proof of concept.
- Expected and observed behavior.
- Whether user data, private keys, JWTs, or storage objects are exposed.

## Release Blocking Classes

The following classes block a public beta release until fixed or explicitly
removed from scope:

- Server-side decryption of native GaiaCom content.
- Private key, mnemonic, JWT, SMTP, S3, or database secret leakage.
- BOLA/BFLA allowing access to foreign identities, messages, rooms, files, or reports.
- Federation SSRF to local/private/metadata addresses.
- Storage ACL bypass for foreign `fileId` values.
- Silent downgrade from native GaiaCom encryption to SMTP or weaker suites.
- Top Secret message acceptance without required ML-DSA-87 checks.
- Governance or admin God-mode that bypasses E2EE or thresholds.

## Expectations

GaiaCom security claims must stay bounded:

- Allowed: client-side encrypted, post-quantum-oriented, hybrid cryptography,
  server cannot decrypt native content, No-Godmode architecture.
- Forbidden: unbreakable, 100% secure, guaranteed anonymous, perfectly secure,
  guaranteed quantum-secure.
