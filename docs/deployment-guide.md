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
Environment=GAIACOM_JWT_SECRET=super_secret_jwt_signing_key_at_least_32_bytes_long
Environment=JWT_SECRET=super_secret_jwt_signing_key_at_least_32_bytes_long
Environment=DB_PATH=/opt/gaiacom/data/gaiacom.db
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
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://beta.gaiacom.de; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; report-uri /api/v1/public/csp-report;" always;

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
