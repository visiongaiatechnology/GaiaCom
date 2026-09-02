# GaiaCom 2.0.0 Sovereign Release Ã¢â‚¬â€ Linux amd64

## Release contents

- `release/linux-amd64/gaiacom-backend`: hardened Linux amd64 PIE backend.
- `release/frontend/`: immutable production web assets for the existing TLS virtual host.
- `release/SHA256SUMS`: integrity manifest for every release artifact.
- `deploy/gaiacom.service`: least-privilege systemd service.
- Full reviewed source is included beside this document.

## Mandatory security boundary

The web build supports the complete Sovereign message path. HQC-256 runs in a dedicated Web Worker through the locally vendored `@oqs/liboqs-js` 0.15.1 HQC-only WASM module with explicit temporary-memory zeroing; the native and browser clients share the same Rust cascade core compiled to WebAssembly. Registration and Sovereign messaging fail closed until the worker completes HQC-256 plus accelerated/top-secret round-trip self-tests. All modules are self-hosted in the release bundle; no CDN or server-side private-key operation is used. This implementation has interoperability tests but has not yet received an independent cryptographic audit.

## Backend installation

Create a dedicated system account and directories, then install the binary:

```bash
sudo useradd --system --home-dir /var/lib/gaiacom --shell /usr/bin/nologin gaiacom
sudo install -d -o gaiacom -g gaiacom -m 0700 /var/lib/gaiacom
sudo install -d -o root -g gaiacom -m 0750 /etc/gaiacom
sudo install -d -o root -g root -m 0755 /opt/gaiacom/backend /opt/gaiacom/frontend
sudo install -o root -g root -m 0755 release/linux-amd64/gaiacom-backend /opt/gaiacom/backend/gaiacom-backend
sudo cp -a release/frontend/. /opt/gaiacom/frontend/
sudo install -o root -g root -m 0644 deploy/gaiacom.service /etc/systemd/system/gaiacom.service
```

Generate the production environment once. The setup command creates independent random secrets and writes no secrets to stdout:

```bash
sudo /opt/gaiacom/backend/gaiacom-backend setup --server-name YOUR_REAL_FQDN --config /etc/gaiacom/gaiacom.env --db-path /var/lib/gaiacom/gaiacom.db --port 8080
sudo chown root:gaiacom /etc/gaiacom/gaiacom.env
sudo chmod 0640 /etc/gaiacom/gaiacom.env
sudo -u gaiacom /opt/gaiacom/backend/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
sudo systemctl daemon-reload
sudo systemctl enable --now gaiacom.service
```

Replace `YOUR_REAL_FQDN` with the actual public DNS name when executing the command. `setup` binds the backend to `127.0.0.1` by default. Exposing the plaintext backend directly through `0.0.0.0` is rejected unless `GAIACOM_ALLOW_PUBLIC_BIND=true` is explicitly set. Normal production uses an HTTPS reverse proxy to `127.0.0.1:8080`.

## Reverse-proxy invariants

- TLS termination must use a publicly trusted certificate and TLS 1.3 where client policy permits.
- `/api/` is proxied to `http://127.0.0.1:8080`; all other paths use `release/frontend` with `index.html` fallback.
- Preserve the original `Host`, set `X-Forwarded-Proto https`, and configure `GAIACOM_TRUSTED_PROXY_CIDRS` to the exact proxy address range.
- Do not cache authenticated API responses. Fingerprinted frontend assets may be cached immutably.
- Keep port 8080 blocked at the external firewall.

## Upgrade procedure

Verify `release/SHA256SUMS`, stop the service, back up `/var/lib/gaiacom`, atomically replace backend and frontend files, run `doctor`, then restart. Never replace `/etc/gaiacom/gaiacom.env` during an application upgrade.