# GaiaCom Architecture Track

// STATUS: PLATIN

GaiaCom is moving toward a split runtime:

- Go owns HTTP, federation routing, persistence orchestration, and device-session APIs.
- Rust owns dependency-minimal core primitives that must be deterministic, memory-safe, and reusable across clients.
- Cryptographic algorithms stay on audited libraries. GaiaCom does not reimplement ML-KEM, Ed25519, password hashing, or AEAD primitives.
- Non-cryptographic policy code moves toward zero external dependencies when the standard library is sufficient.

Current hard boundary:

- `Backend/` remains the Go application layer.
- `Core/rust/gaiacore/` is the first zero-dependency Rust core crate.
- `Backend/httpx/` is the local zero-dependency HTTP edge foundation. Gin has been removed from the backend edge.

Dependency removal order:

1. Replace helper libraries only when the standard library implementation is smaller and clearer.
2. Keep security-critical crypto dependencies unless an audited platform primitive replaces them.
3. Remove framework dependencies only after equivalent routing, validation, CORS, and error handling exist in local modules.
4. Every removal must preserve tests or add tests covering the replaced behavior.

HTTP edge migration status:

1. `httpx.Router` owns route matching and path parameters.
2. `httpx` middleware owns CORS and security headers.
3. Handlers use `net/http` directly.
4. `go test ./...` must run once a Go toolchain is available; then `go mod tidy` finalizes manifest parity.

Persistence migration status:

1. Application services depend on repository interfaces, not concrete persistence drivers.
2. `repository.SQLStore` is the active adapter around `database/sql`.
3. SQLite migrations are explicit SQL in `Backend/database`.
4. GORM has been removed from the backend build path.

Product invariant:

Messages are encrypted on the device before transport. Servers route encrypted envelopes, identity records, federation events, and file chunks; servers do not receive plaintext message bodies.
