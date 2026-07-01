# GaiaCom Final Risk Register

Date: 2026-06-30
Scope: GaiaCom Core beta release candidate

## Release-Blocking Risks

No release-blocking Core beta risks remain after the final gate.

## Accepted Beta Risks

| ID | Severity | Area | Status | Risk | Required Follow-up |
| --- | --- | --- | --- | --- | --- |
| R-001 | Medium | Frontend build chain | Accepted for Core beta | The deployed runtime dependency audit is clean, but the legacy CRA/react-scripts development toolchain still produces default `npm audit` findings when dev dependencies are included. | Migrate from CRA/react-scripts to a modern maintained build system and remove deprecated Workbox/SVGO/Jest 27 dependency chains. |
| R-002 | Medium | SQLite beta profile | Accepted for Core beta | SQLite busy retry/backoff is implemented and tested, but production HA/multi-node database operation is not the final target architecture. | Add Postgres/HA profile before enterprise-scale deployment. |
| R-003 | Medium | GaiaDrive portability | Accepted for Core beta | Encrypted local/cloud data portability depends on key availability and backup/recovery discipline. | Expand backup/restore operator runbooks and user-facing recovery UX. |
| R-004 | Low | Frontend bundle size | Accepted for Core beta | Production bundle is above recommended CRA size guidance. | Introduce route-level code splitting during the post-beta frontend build migration. |

## Closed Risks In This Gate

| ID | Area | Closure Evidence |
| --- | --- | --- |
| C-001 | Runtime frontend dependency audit | `npm.cmd audit --omit=dev --json` reports 0 total findings. |
| C-002 | Unnecessary browser polyfills | Removed unused Node-core Webpack fallbacks and related packages from runtime dependencies. |
| C-003 | Secret scan false positives from local dependency cache | Extreme and edition-boundary scans now ignore `.cache` source-external dependency caches. |
| C-004 | Reproducible Go dependency download | Fresh local `GOMODCACHE` with `go mod download` completed successfully. |
| C-005 | Master security suite | `python security/master_security_suite.py` passed 52/52. |
| C-006 | Local `.env` secret leak risk | Real `Backend/.env` was removed and replaced with `Backend/.env.example`; source scan for removed secret values returned no hits. |
| C-007 | Linux release artifacts | Linux AMD64 and ARM64 backend binaries were rebuilt and SHA256 hashes documented. |
