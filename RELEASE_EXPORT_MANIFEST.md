# GaiaCom GitHub Source Export

This folder contains the clean GaiaCom source package prepared for repository upload.

## Included

- Backend Go source and tests
- Frontend React source and public assets
- Core and DesktopClient source where present
- Documentation and security documentation
- Security PoCs and runners
- Node Registry MVP for federated node onboarding
- AGPLv3 license text
- GaiaCom trademark notice

## Excluded

- Git metadata and IDE state
- Dependency folders such as node_modules
- Build outputs and compiled binaries
- Runtime storage, uploads, caches, logs and local databases
- Local-only planning notes and internal agent instruction files

## License

GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology.
The source code is licensed under AGPL-3.0-or-later. Trademark rights are reserved.

## Verification

Backend verification from this export:

```powershell
go test ./...
```

Frontend dependencies are intentionally not vendored. Run this from Frontend/frontend after checkout:

```powershell
npm ci
npm run build
```
