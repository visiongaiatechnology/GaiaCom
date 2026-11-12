# Desktop Release und Signing

Die Desktop-Clients (Tauri 2) werden nur als GitHub-Release veröffentlicht, wenn
alle Integritäts-Gates erfüllt sind. **Unsignierte Installer dürfen nicht als
offizieller Download verteilt werden** — sie sind nur für lokale Builds und
interne Tests geeignet.

## Release-Gates

1. **Builds aus CI**, nicht von Entwicklerrechnern (`desktop-release.yml`).
2. **Windows:** Authenticode-Signatur mit EV-/OV-Zertifikat (`WINDOWS_CERTIFICATE`,
   `WINDOWS_CERTIFICATE_PASSWORD`).
3. **macOS:** Developer ID + Notarisierung (`APPLE_*` Secrets).
4. **Linux:** `.deb`/AppImage mit GPG-Signatur/Repository-Metadaten; SHA256SUMS
   werden signiert veröffentlicht.
5. **Checksums:** `SHA256SUMS.txt` im Release; Hash vor Installation prüfen.
6. **Provenance:** Build-Artefakt ist dem Commit/Tag im Release zugeordnet;
   kein manuelles Nachladen von Binaries.

Solange `DESKTOP_SIGNING_ENABLED` (Repository-Variable) nicht `true` ist,
erzeugt der Workflow nur Workflow-Artefakte und **kein** GitHub-Release. Das ist
Absicht: ein unsigniertes Release wäre eine Supply-Chain-Lücke (VGT-055/056).

## Lokale Builds

Lokale Builds (`pnpm/npm run build` + `cargo tauri build`) sind unsigniert. Sie
dürfen nicht als Download angeboten werden. Prüfsummen werden lokal erzeugt,
sind aber ohne Signatur nicht authentisch.

## Verifikation

- Windows: `Get-AuthenticodeSignature .\GaiaCom_*.msi|*.exe` → `Status: Valid`
- Linux: `gpg --verify SHA256SUMS.sig SHA256SUMS` und `sha256sum -c SHA256SUMS.txt`
- macOS: `codesign --verify --deep --strict` + `spctl --assess`
