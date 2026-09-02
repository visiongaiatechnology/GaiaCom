# GaiaCom Frontend

React 18 client built with the pinned Vite 8 toolchain. Runtime dependencies are bundled locally; the production client does not load scripts, fonts, or cryptographic code from CDNs.

## Requirements

- Node.js 20.19 or newer
- npm with lockfile enforcement

## Verified commands

```bash
npm ci
npm test
npm run build
npm audit --audit-level=low
```

`npm run build` writes immutable, content-hashed production assets to `dist/`. Deploy the contents of that directory behind the CSP and security headers in `docs/deployment-guide.md`.

## Development

```bash
npm start
```

The development server binds to `127.0.0.1`. Set `VITE_API_URL` only to an origin URL. HTTPS is mandatory outside development; credentials, paths, query strings, and fragments are rejected.

## Desktop

The Tauri client consumes `dist/`. Its WebView has no native command permissions, uses an explicit capability allowlist, and restricts network access to the configured GaiaCom origin.
