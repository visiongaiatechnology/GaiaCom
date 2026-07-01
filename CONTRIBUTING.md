# Contributing to GaiaCom Core

GaiaCom Core accepts focused contributions that preserve the security
invariants documented in `docs/security-invariants.md`.

## Ground Rules

- Keep Core zero-trust: no server-side plaintext access to native private content.
- Do not add God-mode APIs, impersonation, private-key export, or E2EE bypasses.
- Do not commit `.env`, databases, logs, private keys, real user data, or build folders.
- Use existing module boundaries before adding abstractions.
- Add tests for every security-relevant behavior change.
- Keep documentation honest and update known limitations when behavior changes.

## Local Verification

Before proposing changes:

```bash
cd Backend
go test ./...

cd ../Frontend/frontend
npm run build
node src/adversarial_run.mjs

cd ../..
python security/total_system_poc_runner.py
python security/extreme/extreme_runner.py
python security/master_security_suite.py
```

If a security gate fails, fix the underlying issue rather than weakening the
gate. Test fixtures may contain synthetic attack strings, but must not contain
real secrets.

## Pull Request Checklist

- Tests pass locally or the failure is clearly documented.
- No new browser-native `alert`, `prompt`, or `confirm` in Core UX.
- No raw user-controlled `innerHTML`.
- No new hardcoded secrets.
- No broadened production CSP, CORS, or federation egress rules.
- Docs and risk register are updated when scope changes.
