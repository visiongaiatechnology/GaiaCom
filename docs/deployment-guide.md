# GaiaCom 2 Production Deployment Guide

This guide defines the production deployment profile for the GaiaCom E2EE platform. The examples use `beta.gaiacom.de` as an existing deployment hostname; the software build itself is not a beta build.

---

## 1. Directory Structure Overview

The deployment consists of two primary services:
1.  **Go Backend Service:** Executable serving API endpoints, federation, and routing on port `8080`.
2.  **React static files:** Static JS/CSS/HTML built from the React application, served by Nginx on port `80`/`443`.

---

## 2. Step 1: Compiling the Backend

On your build server or production server, compile the Go binary:

```bash
cd Backend
VERSION=2.0.0
COMMIT="$(git rev-parse HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
go build -trimpath \
  -ldflags="-s -w -X gaiacom/backend/buildinfo.Version=${VERSION} -X gaiacom/backend/buildinfo.Commit=${COMMIT} -X gaiacom/backend/buildinfo.BuiltAt=${BUILT_AT}" \
  -o gaiacom-backend .
```

Copy the compiled `gaiacom-backend` executable to your production deployment directory (e.g. `/opt/gaiacom/`).

---

## 3. Step 2: Building the Web Frontend

Compile the React frontend into static assets:

```bash
cd Frontend/frontend
# Reproduce the locked dependency graph, then build static assets
npm ci
npm run build
```

Copy the output `dist/` directory contents to your web server host root (e.g. `/var/www/gaiacom/`).

---

## 4. Step 3: Production Environment Variables

Generate the production environment once after installing the release binary.
The command is idempotent: existing identity and signing secrets are preserved,
while malformed existing secrets cause a fail-closed error instead of rotation.

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080
sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

The generated file contains the following production values. Manual creation is
reserved for external secret-manager integrations:

| Variable Name | Required Value | Purpose |
|---|---|---|
| `GAIACOM_DEV_MODE` | `"false"` | **CRITICAL:** Enforces strict SSRF firewall blocks, limits egress ports, and strips localhost from CSP headers. |
| `GAIACOM_METRICS_TOKEN` | `<32+ random bytes>` | Bearer credential for the otherwise undiscoverable `/metrics` endpoint. |
| `GAIACOM_JWT_SECRET` | `<32-byte-hex-string>` | Secret key used to sign and verify JSON Web Tokens (JWT). |
| `GAIACOM_SHIELD_SECRET` | `<32+ random bytes>` | Independent HMAC key for GaiaShield integrity records. |
| `GAIACOM_SERVER_NAME` | `"node.example.org"` | Canonical federation identity; must be a fully-qualified DNS name. |
| `GAIACOM_SERVER_PRIVATE_KEY` | `<Ed25519 private key hex>` | Stable node signing identity. Never rotate implicitly during an update. |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | `<32-byte hex>` | Stable TrustMesh epoch derivation secret. |
| `JWT_SECRET` | `<same-32-byte value>` | Optional compatibility mapping for legacy sessions. |
| `DB_PATH` | `"/var/lib/gaiacom/gaiacom.db"` | Path to the persistent SQLite production database file. |
| `DB_DRIVER` | `"sqlite"` | Active database driver. The current binary fails fast for non-SQLite drivers until the Postgres dialect migration is implemented. |
| `SQLITE_MAX_OPEN_CONNS` | `"4"` | SQLite connection pool size for WAL mode. Keep `1` only for memory tests or extremely constrained nodes. |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | `"127.0.0.1/32,::1/128"` | CIDRs allowed to supply `X-Forwarded-For` / `X-Real-IP`. Leave empty when the backend is directly exposed. |
| `GAIACOM_OBJECT_STORE` | `"local"` or `"s3"` | Object-store adapter. `local` stores encrypted chunks on disk; `s3`/`minio` stores the same encrypted chunks through a SigV4-compatible bucket. |
| `GAIACOM_STORAGE_ROOT` | `"/opt/gaiacom/storage"` | Root directory for encrypted attachment chunks. Keep it outside the static web root. |
| `GAIACOM_STORAGE_USER_QUOTA_BYTES` | `"53687091200"` | Per-user reserved storage ceiling across pending and completed encrypted attachments. Must be at least one native GaiaCOM max file envelope. |
| `GAIACOM_STORAGE_PENDING_TTL_HOURS` | `"24"` | Cleanup window for abandoned pending uploads. Accepted range: `1` to `168` hours. |
| `GAIACOM_S3_ENDPOINT` | `"https://minio.example.internal"` | Required when `GAIACOM_OBJECT_STORE=s3|minio`. S3/MinIO endpoint without query string or fragment. |
| `GAIACOM_S3_BUCKET` | `"gaiacom-objects"` | Required S3/MinIO bucket for encrypted attachment chunks. |
| `GAIACOM_S3_REGION` | `"us-east-1"` | S3 signing region. Defaults to `us-east-1` when unset. |
| `GAIACOM_S3_ACCESS_KEY` | `<access-key>` | S3/MinIO access key with least-privilege bucket read/write/delete permissions. |
| `GAIACOM_S3_SECRET_KEY` | `<secret-key>` | S3/MinIO secret key. Keep in the service secret store, not in the repository. |
| `GAIACOM_S3_PREFIX` | `"prod"` | Optional object-key prefix for environment separation. Traversal-style prefixes are rejected at startup. |
| `GAIACOM_S3_PATH_STYLE` | `"true"` | Keep `true` for MinIO and hardened internal object stores. Set `false` only for virtual-hosted S3 endpoints. |
| `SERVER_PORT` | `"8080"` | Internal port the Go server listens to. |
| `GAIACOM_SMTP_TLS_MODE` | `"starttls"` or `"implicit"` | Mandatory authenticated TLS mode for the legacy SMTP relay. Plaintext SMTP is rejected. |

### SMTP authentication gate

The SMTP bridge only connects through an authenticated TLS relay. Before enabling
outbound SMTP in production, the operator must verify all three domain controls
from an independent resolver and retain the output with the release evidence:

```bash
dig +short TXT example.com              # must contain the intended v=spf1 policy
dig +short TXT selector._domainkey.example.com
dig +short TXT _dmarc.example.com       # must contain v=DMARC1 and p=quarantine or p=reject
```

The configured `GAIACOM_SMTP_FROM` domain must match the authenticated relay and
the verified SPF/DKIM/DMARC domain. A successful local security suite does not
claim that public DNS is configured; DNS verification is a deployment gate.

### Systemd Service Configuration Example (`/etc/systemd/system/gaiacom.service`):

Store the variables in `/etc/gaiacom/gaiacom.env`, owned by `root:root` with
mode `0600`. Systemd reads the file before dropping privileges. Do not put
production secrets directly in the unit file or in shell history.

```ini
[Unit]
Description=GaiaCom Go Backend
After=network.target

[Service]
Type=simple
User=gaiacom
Group=gaiacom
WorkingDirectory=/var/lib/gaiacom
EnvironmentFile=/etc/gaiacom/gaiacom.env
ExecStart=/opt/gaiacom/gaiacom-backend
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
ProtectProc=invisible
ProcSubset=pid
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
MemoryDenyWriteExecute=true
SystemCallArchitectures=native
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
StateDirectory=gaiacom
StateDirectoryMode=0700
ConfigurationDirectory=gaiacom
ConfigurationDirectoryMode=0700
ReadWritePaths=/var/lib/gaiacom /opt/gaiacom/storage
UMask=0077
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

---

## 5. Step 4: Nginx Reverse Proxy Config

Configure Nginx to serve static React files directly and proxy API/discovery routes to the Go backend.

### Recommended Nginx Config (`/etc/nginx/sites-available/gaiacom`):
```nginx
server {
    listen 80;
    server_name beta.gaiacom.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name beta.gaiacom.de;

    # SSL Certificates (Set up using Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/beta.gaiacom.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beta.gaiacom.de/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Document Root (React Static Files)
    root /var/www/gaiacom;
    index index.html;

    # Security Headers for Static files
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://beta.gaiacom.de; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'none'; report-uri /api/v1/public/csp-report;" always;

    # Static Assets Cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Proxy API requests to Go Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /livez {
        proxy_pass http://127.0.0.1:8080;
    }

    location = /readyz {
        proxy_pass http://127.0.0.1:8080;
    }

    # Prometheus should scrape the backend loopback/private address directly
    # with Authorization: Bearer $GAIACOM_METRICS_TOKEN.
    location = /metrics { return 404; }

    # Proxy Server Discovery and S2S Federation
    location /.well-known/gaiacom/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA Router redirection
    location / {
        try_files $uri /index.html;
    }
}
```

---

## 6. Step 5: Post-Deployment Verification

Once deployed and running:
1.  **Verify HTTPS:** Open `https://beta.gaiacom.de` in browser, verify SSL connection.
2.  **Verify CSP Headers:** Inspect a resource load in DevTools network tab, verify `Content-Security-Policy` connect-src has `https://beta.gaiacom.de` and **no localhost targets**.
3.  **Confirm Database Persistence:** Create an account, restart the systemd backend service, log back in. Confirm that the mnemonic decrypts correctly.
4.  **Verify process health:** `curl --fail https://beta.gaiacom.de/livez` must return `alive`; `/readyz` must switch to HTTP 503 before shutdown and return `ready` only while the database is reachable.
5.  **Verify release identity:** `/api/v1/public/version` must contain version `2.0.0`, the exact Git commit, and an RFC3339 UTC build timestamp. Production startup rejects anonymous development metadata.
6.  **Verify protected metrics locally:** scrape `http://127.0.0.1:8080/metrics` with the bearer token and verify that an absent or invalid token returns HTTP 404.
