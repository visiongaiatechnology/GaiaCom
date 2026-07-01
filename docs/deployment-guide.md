# GaiaCom Deployment Guide — beta.gaiacom.de

This guide outlines the production deployment steps for the GaiaCom E2EE platform on a server mapping to `beta.gaiacom.de`.

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
# Build the optimized executable
go build -ldflags="-s -w" -o gaiacom-backend .
```

Copy the compiled `gaiacom-backend` executable to your production deployment directory (e.g. `/opt/gaiacom/`).

---

## 3. Step 2: Building the Web Frontend

Compile the React frontend into static assets:

```bash
cd Frontend/frontend
# Build the static build/ folder
npm run build
```

Copy the output `build/` directory contents to your web server host root (e.g. `/var/www/gaiacom/`).

---

## 4. Step 3: Production Environment Variables

Ensure that the following environment variables are set in your production service manager (e.g. Systemd service or Docker):

| Variable Name | Required Value | Purpose |
|---|---|---|
| `GAIACOM_DEV_MODE` | `"false"` | **CRITICAL:** Enforces strict SSRF firewall blocks, limits egress ports, and strips localhost from CSP headers. |
| `GAIACOM_JWT_SECRET` | `<32-byte-hex-string>` | Secret key used to sign and verify JSON Web Tokens (JWT). |
| `JWT_SECRET` | `<same-32-byte-hex-string>` | Compatibility mapping for legacy sessions. |
| `DB_PATH` | `"/opt/gaiacom/data/gaiacom.db"` | Path to the persistent SQLite production database file. |
| `DB_DRIVER` | `"sqlite"` | Active database driver. The current binary fails fast for non-SQLite drivers until the Postgres dialect migration is implemented. |
| `SQLITE_MAX_OPEN_CONNS` | `"4"` | SQLite connection pool size for WAL mode. Keep `1` only for memory tests or extremely constrained nodes. |
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
| `PORT` | `"8080"` | Internal port the Go server listens to. |

### Systemd Service Configuration Example (`/etc/systemd/system/gaiacom.service`):
```ini
[Unit]
Description=GaiaCom Go Backend
After=network.target

[Service]
Type=simple
User=gaiacom
WorkingDirectory=/opt/gaiacom
Environment=GAIACOM_DEV_MODE=false
Environment=GAIACOM_JWT_SECRET=TEST_ONLY_DO_NOT_USE_IN_PRODUCTION_replace_with_32_byte_random_secret
Environment=JWT_SECRET=TEST_ONLY_DO_NOT_USE_IN_PRODUCTION_replace_with_32_byte_random_secret
Environment=DB_PATH=/opt/gaiacom/data/gaiacom.db
Environment=DB_DRIVER=sqlite
Environment=SQLITE_MAX_OPEN_CONNS=4
Environment=GAIACOM_OBJECT_STORE=local
Environment=GAIACOM_STORAGE_ROOT=/opt/gaiacom/storage
Environment=GAIACOM_STORAGE_USER_QUOTA_BYTES=53687091200
Environment=GAIACOM_STORAGE_PENDING_TTL_HOURS=24
Environment=PORT=8080
ExecStart=/opt/gaiacom/gaiacom-backend
Restart=always
RestartSec=5

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
    location /static/ {
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
