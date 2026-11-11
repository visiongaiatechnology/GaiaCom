# Contributing to GaiaCom

Thank you for helping improve GaiaCom. The project is a public technical beta, so changes must
preserve the security boundaries and keep security claims honest.

## Ground rules

- Keep the zero-trust boundary: the server must never gain the ability to decrypt native private
  content.
- Do not add server-side master keys, private-key export, impersonation endpoints or E2EE
  bypasses.
- Do not weaken CSP, CORS, federation egress rules or authorization checks to make a test pass.
- Do not commit secrets, real user data, private keys, databases, logs or build artifacts.
- Add tests for security-relevant behavior changes.
- Update documentation when behavior, limitations or security claims change.
- Keep the UI honest: missing data is shown as missing, never replaced by invented values.

## Development setup

### Backend

```bash
cd Backend
cp .env.example .env    # development-only secrets; never use in production
export $(grep -v '^#' .env | xargs)
go test ./...
go run ./cmd/gaiacom
```

### Frontend

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
npm start
```

### Rust core

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### Desktop

```bash
cd Frontend/frontend && npm run build
cd ../../DesktopClient/src-tauri
cargo tauri build --no-bundle
```

## Pull request checklist

- Tests pass locally, or the failure is clearly documented with a reason.
- No new secrets, real user data, private keys or local paths.
- No raw user-controlled HTML injection.
- No new browser-native `alert`, `prompt` or `confirm` in the product UI.
- CSP, CORS, federation and authorization behavior is not broadened without review.
- Security-relevant documentation and known limitations are updated.
- The change does not introduce fake data, invented counters or decorative security claims.

## Security issues

Do not open a public issue for an active vulnerability. Contact **security@gaiacom.de** and read
[SECURITY.md](SECURITY.md). Coordinated disclosure is required.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License of contributions

By submitting a contribution you agree that it is licensed under the project license
(AGPL-3.0-or-later) and that you have the right to submit it.
