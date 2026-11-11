# Third-Party Notices

GaiaCom includes third-party open-source software. This file provides an overview; the
authoritative license texts ship with the respective dependencies and are reproduced in their
repositories and package metadata.

## Runtime components

| Component | Project | License |
|---|---|---|
| React / React DOM | Meta | MIT |
| Vite (build toolchain) | Vite contributors | MIT |
| Tauri 2 | Tauri contributors | MIT / Apache-2.0 |
| Go standard library and `golang.org/x/*` | Go project | BSD-3-Clause |
| `github.com/cloudflare/circl` | Cloudflare | BSD-3-Clause |
| `modernc.org/sqlite` | modernc project | BSD-3-Clause |
| `@noble/curves`, `@noble/hashes`, `@noble/post-quantum` | Paul Miller / contributors | MIT |
| `@scure/bip39` | Paul Miller / contributors | MIT |
| `qrcode` | soldair / contributors | MIT |
| `@fontsource-variable/inter`, `@fontsource-variable/sora` | Fontsource / Rasmus Andersson & Jonathan Barnbrook | OFL-1.1 |
| Font Awesome Free Solid Icons (94 UI SVG glyphs) | Fonticons, Inc. | CC BY 4.0 (see [ATTRIBUTION.md](Frontend/frontend/public/brand/ATTRIBUTION.md)) |
| liboqs-js (browser HQC provider) | Open Quantum Safe contributors | See [licenses/liboqs-js-LICENSE.md](licenses/liboqs-js-LICENSE.md) |

## Brand and media assets

GaiaCom names, logos and brand assets are trademarks of VisionGaiaTechnology. The AGPL license
does not grant trademark rights.

Background and interface artwork was produced for VisionGaiaTechnology or generated for the
project. If you redistribute modified builds, replace branded assets and do not imply official
endorsement.

## Notes

- Dependency versions are pinned in `Frontend/frontend/package-lock.json`, `Backend/go.sum`,
  `Core/rust/gaiacore/Cargo.lock`, `SovereignCryptoCore/Cargo.lock`,
  `SovereignCryptoWasm/Cargo.lock` and `DesktopClient/src-tauri/Cargo.lock`.
- If you redistribute GaiaCom, keep this notice and the upstream license texts.
- This overview is not a legal opinion. Verify the license of every dependency you redistribute.
