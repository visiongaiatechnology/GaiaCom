# Security Policy

GaiaCom is beta communication software. This document describes what we claim, what we do not
claim, and how to report a vulnerability responsibly.

## Status — read this first

- **Version:** GaiaCom 3.0.2, public technical beta (Beta V3).
- **No independent third-party cryptographic audit has been completed.**
- The project has undergone **deep, AI-assisted security reviews** across backend, frontend,
  federation, storage, authentication, authorization, browser and desktop boundaries. These
  reviews are not a formal audit and are **not proof of security**.
- **Unknown vulnerabilities may exist.** Cryptographic and protocol implementations can fail in
  subtle ways that tests do not reveal.
- No claim of "unbreakable", "100% secure", "government-grade" or formally high-assurance
  security is made. Any such claim in older material is historical and not a current guarantee.

If you need a system that protects life, liberty or regulated data, this beta is not yet that
system.

## Supported versions

| Version | Support |
|---|---|
| 3.0.x (Beta V3) | Security fixes on a best-effort basis |
| Older 2.x builds | Not supported; upgrade to the current beta |

Only the current beta line receives security fixes. There is no guaranteed response or fix
deadline in this beta phase.

## Scope

In scope:

- Backend API, authentication, authorization, session handling, federation, storage,
  governance and abuse workflows.
- Frontend cryptography, key handling, rendering, browser storage and local session behavior.
- Desktop shell, IPC/capability boundaries and updater configuration.
- Android node/client architecture and native bindings.
- Documentation claims that are factually wrong or create a false security impression.

Out of scope:

- Attacks against other people's nodes, accounts or data.
- Denial-of-service testing, brute force, spam or social engineering.
- Physical attacks, compromised end devices, malicious browser extensions or operating-system
  malware.
- Third-party dependencies without a demonstrated impact on GaiaCom.
- Missing hardening headers without a concrete exploit path.

## Reporting a vulnerability

Please report privately and do not open a public issue for an active vulnerability.

**Email:** security@gaiacom.de

Include, where possible:

- Affected component and version/commit.
- A clear description and impact assessment.
- Reproduction steps or a minimal proof of concept.
- Expected and observed behavior.
- Whether private keys, session tokens, plaintext or user data could be exposed.
- Your preferred name/handle for credit, if you want attribution.

**Encrypted reports:** No verified PGP key is currently published. If you need encryption,
request a key through the contact address first. Do not send secrets in plain email without
prior agreement.

## Our commitments

- Acknowledge receipt within a reasonable time during the beta.
- Investigate and keep you informed about the status.
- Coordinate disclosure and credit with you after a fix is available.
- Not pursue legal action for good-faith research that follows this policy.

These commitments are best-effort beta commitments, not a commercial SLA.

## Safe harbor and rules

- Test only against your own node and your own accounts.
- Do not access, modify or exfiltrate other users' data.
- Do not run destructive, availability-impacting or mass-testing attacks.
- Do not use social engineering, phishing or physical intrusion.
- Give us reasonable time to fix the issue before publishing details.
- Do not publish active exploit code or step-by-step attack instructions before coordination.

## Cryptographic boundaries

Read [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md) before evaluating cryptographic claims. Key
boundaries:

- Sovereign v1 is a hybrid per-message envelope, **not a Triple Ratchet**.
- SMTP bridge messages leave native GaiaCom E2EE and are protected only to the extent the legacy
  path allows.
- A compromised web origin can serve modified JavaScript before encryption happens; the
  high-assurance profile requires trusted, independently built native clients.
- Client device compromise, malicious extensions and OS-level malware are outside the
  cryptographic model.

## Beta boundaries

See [docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) for the current operational and
architectural limits. Do not deploy the beta as a high-availability, regulated or
life-critical service.
