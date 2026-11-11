[English](README.md) · **Deutsch** · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Souveräne Post-Quanten-Kommunikation" />

# GaiaCom

### Souveräne Post-Quanten-Kommunikationsinfrastruktur

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Eine föderierte, clientseitig verschlüsselte Kommunikationsplattform mit einem hybriden Post-Quanten-Design.**

</div>

> **VisionGaiaTechnology — Abteilung für unnötige Sicherheit™**
>
> Wir bauen Kommunikationsinfrastruktur, die kein Vertrauen verlangt, das sie nicht beweisen kann.
> Die Abteilung existiert, weil „unnötige“ Sicherheit genau das ist, was in dem Moment notwendig
> wird, in dem jemand anderes die Schlüssel hält.

---

## Menü

[Überblick](#overview) · [VGT Licence](#vgt-licence) · [Beta V3](#beta-v3) · [Screenshots](#screenshots) · [Funktionen](#features) · [Technische Informationen](#technical-information) · [Was GaiaCom unterscheidet](#what-makes-gaiacom-different) · [Aus dem Quellcode bauen](#build-from-source) · [Node-Betreiber werden](#become-a-node-operator) · [Sicherheits- und Audit-Status](#security-and-audit-status) · [Projektstruktur](#project-structure) · [Mitwirken](#contributing) · [Lizenz](#license)

---

<a id="overview"></a>
## Überblick

Die Kommunikationsstacks von heute wurden nicht für eine Post-Quanten-Welt entworfen. Messenger
zentralisieren Vertrauen bei einem einzigen Anbieter, klassische E-Mail war von ihrem Entwurf her
nie vertraulich, und die meisten Plattformen behalten eine lesbare Kopie von allem, was sie
transportieren.

**GaiaCom definiert sichere Kommunikation als souveräne Infrastruktur neu.**

Es kombiniert ein föderiertes Netzwerk, clientseitige Ende-zu-Ende-Verschlüsselung, einen
versionierten hybriden Post-Quanten-Envelope, verschlüsselte soziale Kanäle, verschlüsselten
Dateispeicher und eine Governance-Schicht für Node-Betreiber — in einer Identität, im Web, auf dem
Desktop und auf Mobilgeräten.

Die Kernregel ist bewusst klein gehalten:

```text
Der Server darf routen, speichern, Rate-Limits durchsetzen, auditieren und Richtlinien anwenden.
Der Server darf niemals die Fähigkeit erhalten, native private Inhalte zu entschlüsseln.
```

GaiaCom ist **kein** Anspruch auf absolute Sicherheit. Es ist der Versuch, die Vertrauensgrenzen
explizit, testbar und — wo möglich — mathematisch durchgesetzt zu machen.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom gibt es in 3 Ausführungen:

**Ein Protokoll. Drei Betriebsmodelle.**

### Business — GaiaCom Enterprise

Für Unternehmen, Kanzleien, Mittelstand, Industrie und Private Banking. Geschlossene Kommunikationskreise mit administrativer Kontrolle, Compliance und Support.

- Interne Souveränität und User-Verwaltung
- Self-hosted Node oder Managed Sovereign Cluster
- SLA, Support und Premium-Module

### Public — GaiaCom Network

Das offene Netz für digitale Privatsphäre. Keine Plattform für Datenhandel, sondern Infrastruktur für freie und verschlüsselte Kommunikation.

- Open Source Client
- Föderierte Nodes
- Kein zentraler Leseschlüssel

### Government — GaiaCom Defend

Spezialisierte Hochsicherheits-Infrastruktur für Behörden, kritische Infrastrukturen und isolierte Kommunikationssilos.

- Air-gapped und isolierte Deployments
- White Labeling und Source Code Audit
- Nationale digitale Souveränität

> **Aktuelle Testversion & kommerzielle Lizenzpflicht (Dual-Licensing)**
>
> Die Version, die hier in diesem Repository getestet wird, ist die öffentliche **GaiaCom Network**-Ausführung (Beta V3) unter der Open-Source-Lizenz **AGPL-3.0-or-later** (siehe [LICENSE](LICENSE)). Bei Betrieb oder Modifikation von `GaiaCom Network` unter der Open-Source-Lizenz gelten die verbindlichen AGPL-Copyleft- und Quellcode-Offenlegungspflichten für Netzwerkbetreiber (ohne Gewährung von Markenrechten, SLA oder Enterprise-/Defend-Modulen).
>
> **Für Unternehmen und Behörden ist das System nicht kostenfrei.** Wer GaiaCom in Unternehmen (**GaiaCom Enterprise**) oder in Behörden und kritischen Infrastrukturen (**GaiaCom Defend**) einsetzen möchte — einschließlich produktiver oder geschlossener Deployments ohne AGPL-Offenlegungspflichten, Enterprise-/Defend-Modulen, Managed Sovereign Cluster, White Labeling, Source Code Audit oder SLA/Support — benötigt eine kommerzielle **VGT Licence** und muss sich an VisionGaiaTechnology wenden, am besten über die verschlüsselte Anfrage:
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 ist eine öffentliche technische Beta. Behandle sie entsprechend.**

- **Status:** Beta V3, Version `3.0.2`.
- **Es wurde kein unabhängiges kryptografisches Audit abgeschlossen.** Das Post-Quanten-Design,
  die Protokollimplementierungen und die kryptografischen Grenzen wurden **nicht** von einem
  unabhängigen Kryptografie-Labor eines Drittanbieters überprüft.
- Wir haben **tiefgehende, KI-unterstützte Sicherheitsaudits** über Architektur, Authentifizierung,
  Autorisierung, Föderation, Speicherung sowie Browser- und Desktop-Grenzen durchgeführt. Diese
  Audits haben echte Probleme gefunden und behoben. Sie sind **kein Beweis für Sicherheit**.
- **Unbekannte Schwachstellen können weiterhin existieren** — im Protokolldesign, in der
  Implementierung, in den Abhängigkeiten, in der Betriebsumgebung oder auf dem Gerät der Nutzerin
  bzw. des Nutzers selbst.
- Kryptografie ist leicht auf subtile Weise falsch umzusetzen. Fehlerhafte Annahmen sind in Tests
  nicht immer sichtbar. Betrachte Algorithmusnamen nicht als Sicherheitsgarantie.
- **Verwende GaiaCom in dieser Beta nicht für lebenskritische, gesetzlich regulierte, hochwertige
  oder irreversible Kommunikation.** Bewahre unabhängige Backups wichtiger Seeds und Daten auf.
- Zwischen Beta-Releases können brechende Protokoll- und API-Änderungen auftreten. Datenverlust
  ist möglich.
- Ein Web-Client kann vor der Verschlüsselung durch einen kompromittierten Node ersetzt werden.
  Das High-Assurance-Profil setzt daher vertrauenswürdige, unabhängig gebaute native Clients
  voraus.
- SMTP-Bridging ist eine bewusste Downgrade-Grenze. Nachrichten, die den nativen
  GaiaCom-Sicherheitsraum verlassen, sind nur so weit geschützt, wie es der Legacy-Pfad zulässt.

Wenn du ein Sicherheitsproblem findest, melde es bitte vertraulich — siehe
[SECURITY.md](SECURITY.md). Bitte veröffentliche keine Details zu aktiven Exploits.

---

<a id="screenshots"></a>
## Screenshots

Alle Screenshots stammen aus GaiaCom 3.0.2 mit 2560 × 1440. Die gezeigte UI ist das aktuelle
VGT-Aurora-Design; die Screenshots enthalten ausschließlich öffentliche Produktoberflächen und
öffentliche Föderationsinhalte.

| Landingpage | Identität und Zugriff |
|---|---|
| ![Landingpage](docs/screenshots/landing.png) | ![Authentifizierungsdialog](docs/screenshots/auth.png) |
| **Öffentliche Kanäle — Entdeckung** | **Öffentliche Kanäle — Kanalansicht** |
| ![Kanal-Entdeckung](docs/screenshots/channels-discovery.png) | ![Kanalansicht](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Funktionen

### Identität und Zugriff

- **Selbstverwaltete Gaia-ID-Identität** — `@name:node.example.org`, abgeleitet aus einem lokal
  erzeugten Seed. Private Schlüssel bleiben auf dem Gerät.
- **Lokaler Schlüsseltresor** mit expliziter Entsperrung, Sitzungssperre und konfigurierbarer
  automatischer Sperre.
- **Multi-Device-Pairing** über QR- bzw. Einmal-Pairing-Flows, dazu Geräteliste und -widerruf.
- **Schlüsselhistorie und Änderungswarnungen**, wenn sich der Identitätsschlüssel eines Kontakts
  ändert.
- **Wiederherstellungs-Flows** mit einem expliziten, schriftlich festgehaltenen Recovery-Seed; es
  existiert keine serverseitige Wiederherstellungs-Hintertür.
- **18 UI-Sprachen** mit einem Live-Sprachumschalter (Landingpage, Authentifizierung, Workspace).

### Messaging

- **Quantum Chat** — 1:1-Unterhaltungen mit clientseitiger Verschlüsselung, Antworten, Reaktionen,
  Pins, Suche, Anhängen, Sprachnachrichten und verschlüsselten Bildvorschauen.
- **Gruppenchats** — Räume mit Kanälen, Rollen, Moderation, Mitgliederverwaltung, Slow Mode,
  schreibgeschützten Kanälen, Beitrittsanfragen, Einladungen, Audit-Ereignissen und verschlüsseltem
  Export.
- **Reaktionen** — herzfokussierte Reaktionssteuerung: Hover auf dem Desktop oder langes Drücken
  auf Touch-Geräten öffnet die vollständige Palette; genau eine Reaktion wird als deine eigene
  angezeigt.
- **Keine vorgetäuschten Zustände** — Werte für Nachrichten, Reaktionen, Präsenz und Aktivität
  stammen aus dem echten Backend oder werden als nicht verfügbar angezeigt. GaiaCom erfindet keine
  Zähler.

### GaiaMail

- Mail innerhalb derselben kryptografischen Identität wie der Chat.
- Natives GaiaMail zwischen GaiaCom-Identitäten.
- **SMTP-Bridge** für Legacy-Kontakte — klar von nativer E2EE getrennt und nur in dem Umfang
  geschützt, den der Legacy-Pfad zulässt.
- Signaturen, Ordner, Filter und Labels werden lokal verarbeitet.

### GSN Social

Die soziale Schicht von GaiaCom ist keine separate Plattform mit einem separaten Konto. Sie
verwendet deine souveräne Identität erneut:

- **Home-Feed**, **Entdecken**, **Mein Netzwerk**, **Nachrichten**, **Benachrichtigungen**,
  **Gruppen**, **Kanäle** und **GSN Cloud** (GaiaDrive-Integration).
- Beiträge, verschlüsselte Bilder, Kommentare, Reaktionen, Reposts und Hashtag-Trends, berechnet
  aus echten Beiträgen.
- Follower, Follows und empfohlene Kontakte, abgeleitet aus tatsächlichen
  Föderationsinteraktionen.
- **Öffentliche Kanäle** für Broadcast-Kommunikation mit Abonnements, Entdeckung, Kategorien,
  Medien, Kommentaren und Moderation.

### Dateien, Tresor und Sicherheitszentrum

- **GaiaDrive** — verschlüsselter Dateispeicher und verschlüsseltes Teilen, gebunden an dieselbe
  Identität.
- **GaiaDrop** — verschlüsselte Dateien von externen Absendern ohne Konto empfangen.
- **GaiaVault** — lokaler versiegelter Speicher für Geheimnisse und Schlüssel.
- **Sicherheitszentrum** — echter Geräte-, Sitzungs-, Schlüssel- und Sicherheitsereignis-Status,
  dazu Governance- und Abuse-Workflows.

### Governance und Betrieb

- Rollen für Node-Betreiber, Senior Reviewer und Trusted Reviewer.
- Fail-closed-Governance-Bootstrap: ein frischer Node vergibt standardmäßig **keine**
  Betreiberrolle.
- Abuse-Meldungen, Moderation, Transparenzoberflächen und append-only Audit-Ereignisse.
- Föderation über signierte Server-zu-Server-PDUs mit Replay-Schutz und SSRF-Limits.

### Desktop und Mobil

- **Web/PWA**-Client mit gehärteter CSP und keinem über CDN ausgelieferten Code.
- **Tauri 2 Desktop-Client** für Windows, Linux und macOS mit nativen Fenstersteuerungen und keinen
  nativen Befehlsberechtigungen über eine explizite Allowlist hinaus.
- **Android**-Node-/Client-Architektur mit nativem Krypto-Core und Plattform-Bindings.

---

<a id="technical-information"></a>
## Technische Informationen

### Stack

| Schicht | Technologie |
|---|---|
| Web-Client | React 18, Vite 8, reine CSS-Designschichten |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), eigenes rahmenloses Fenster |
| Backend | Go 1.25 (`toolchain go1.26.5`), Standardbibliothek + SQLite, Föderations- und Governance-Dienste |
| Datenbank | SQLite im WAL-Modus (Single-Writer-Beta-Profil), versionierte Migrationen |
| Krypto-Core | Rust (`gaiacore`), WebAssembly-Provider für HQC im Browser, nativer Tauri-Provider |
| Mobil | Android-App + Go-Mobile-Bindings / Node-Kernel-Architektur |
| Lokalisierung | 18 Sprachen, gemeinsame Übersetzungstabellen |

### Kryptografisches Design (Sovereign v1)

```text
Key establishment:  X25519  +  ML-KEM-1024  +  HQC-256
Combiner:           length-prefixed secrets → HKDF-SHA3-512
Accelerated AEAD:   Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:    Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                    → XChaCha20-Poly1305 → AES-256-GCM-SIV
Signatures:         Ed25519 transcript signature
Top Secret sigs:    Ed25519 + ML-DSA-87
```

Das signierte Transcript bindet die Protokollversion, die exakte Algorithmus-Suite, die Identitäten
von Sender und Empfänger, den Verschlüsselungsschlüssel des Empfängers, den ephemeren Schlüssel,
beide KEM-Ciphertexts, die Nachrichten-ID, den Zeitstempel, die Nonce und die verschlüsselte
Nutzlast. Unbekannte Suites, fehlende Keyset-Beweise, fehlende Top-Secret-Signaturen und
fehlerhafte HQC-Ciphertexts werden fail-closed abgelehnt.

**Wichtige Grenze:** Sovereign v1 ist ein hybrider Envelope pro Nachricht, **kein Triple Ratchet**.
Es wird keine aus einem Ratchet abgeleitete Post-Compromise-Sicherheit beworben. Die exakte Grenze
ist in [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md) dokumentiert.

### Netzwerkmodell

- Föderierte Nodes, kein zwingend zentraler Server.
- Signierte Server-zu-Server-PDUs für die Föderation.
- Der Server speichert Routing-Envelopes, verschlüsselte Nutzlasten/Chunks, öffentliche
  Profilfelder und minimale Metadaten — niemals nativen Klartext.
- Lokaler oder S3-/MinIO-kompatibler verschlüsselter Objektspeicher.
- TLS ist außerhalb der lokalen Entwicklung verpflichtend.

### Voraussetzungen

| Werkzeug | Version |
|---|---|
| Node.js | 24.13 (mindestens 20.19) |
| npm | lockfile-basierte Installation (`npm ci`) |
| Go | 1.26.5-Toolchain (Modul zielt auf 1.25) |
| Rust | stable (durch CI für den Core gepinnt) |
| Tauri CLI | 2.x für Desktop-Packaging |
| Python | 3.10+ (optionale Repository-/Sicherheitsskripte) |

---

<a id="what-makes-gaiacom-different"></a>
## Was GaiaCom unterscheidet

Die meisten „sicheren“ Messenger verbessern eine Schicht. GaiaCom versucht, den gesamten Stack
kohärent zu machen:

- **Souveräne Identität statt Plattformkonten.** Deine Identität ist eine kryptografische Identität,
  keine Zeile in der Nutzertabelle von jemand anderem. Nodes föderieren; sie besitzen dich nicht.
- **Duale Post-Quanten-Schlüsseletablierung pro Nachricht.** Ein klassisches und zwei unabhängige
  Post-Quanten-KEMs werden kombiniert, mit Ablehnung von Downgrades, wenn das Sovereign-Profil
  gewählt ist.
- **Verschlüsselung vor dem Transport, konstruktionsbedingt.** Der Client versiegelt Inhalte, bevor
  sie das Netzwerk erreichen; der Server routet Ciphertext und kann ihn nicht lesen.
- **Soziales, Mail, Dateien und Chat unter einer Identität.** Kein zweites Konto, kein zweites
  Vertrauensmodell, keine separate Plattform, die deinen Graphen preisgibt.
- **Föderiert by Design.** Kein zwingendes zentrales Postfach, kein einzelner Vertrauenspunkt,
  kein globaler Leseschlüssel.
- **Ehrliche UI-Zustände.** Fehlende Daten werden als fehlend angezeigt, nicht durch dekorative
  Zahlen oder erfundene Aktivität ersetzt.
- **Explizite Downgrade-Grenzen.** SMTP, Legacy-Envelopes und Browser-Auslieferung sind als Grenzen
  dokumentiert, nicht hinter Marketingsprache verborgen.
- **Open Source, AGPL-3.0-or-later.** Die Netzwerksoftware bleibt überprüfbar und Beiträge bleiben
  für die Community verfügbar.
- **Für Betreiber gebaut.** Fail-closed-Governance, Audit-Ereignisse, Abuse-Workflows und ein
  dokumentierter Pfad für Node-Betreiber.

---

<a id="build-from-source"></a>
## Aus dem Quellcode bauen

### 1. Voraussetzungen

Installiere Node.js 24.13+, Go 1.26.5+, Rust stable und — für Desktop-Builds — die
[Tauri-2-Voraussetzungen](https://tauri.app/start/prerequisites/) für dein Betriebssystem.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Web-Client

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Das Produktions-Bundle wird nach `Frontend/frontend/dist/` geschrieben.

Für die lokale Entwicklung:

```bash
npm start
# http://127.0.0.1:5173
```

Setze `VITE_API_URL` nur auf den Origin eines laufenden GaiaCom-Backends, zum Beispiel:

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. Backend

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

Starte einen lokalen Entwicklungs-Node:

```bash
cp .env.example .env
# generate independent secrets for development only
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

Die API lauscht auf `SERVER_PORT` (Standard `8080`). Die SQLite-Datenbank wird unter `DB_PATH`
angelegt. Verwende die Template-Geheimnisse niemals in der Produktion.

### 4. Desktop-Client (Tauri 2)

Baue zuerst den Web-Client, dann:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Die Installer bzw. ausführbaren Dateien werden unter
`DesktopClient/src-tauri/target/release/bundle/` abgelegt. Für einen schnellen unsignierten Build
ohne Installer:

```bash
cargo tauri build --no-bundle
```

### 5. Rust-Krypto-Core

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (optional)

Android-Builds erfordern JDK 17, das Android SDK/NDK und die gepinnte Toolchain. Siehe `Android/`
und `docs/` für das aktuelle Build-Profil. Der Android-Client ist Teil des Beta-Quellbaums, kein
fertiges Store-Release.

---

<a id="become-a-node-operator"></a>
## Node-Betreiber werden

Ein GaiaCom-Node ist das föderierte Backend, das Identitäten, Nachrichten, Kanäle, soziale
Oberflächen und Speicher für seine Nutzerinnen und Nutzer bereitstellt. Er kann auf einem normalen
Linux-Server laufen.

### Empfohlene Basis

- Linux x86_64 oder arm64, 64-Bit
- 2+ vCPU, 4 GB RAM, 20+ GB SSD für einen Evaluierungs-Node (dimensioniere nach deiner realen Last)
- Ein dedizierter DNS-Name, z. B. `node.example.org`
- Ein gültiges TLS-Zertifikat (Let's Encrypt funktioniert)
- Ein SMTP-Relay **nur dann**, wenn du die Legacy-Bridge absichtlich aktivierst
- Backups, die du tatsächlich testest

### 1. Bauen und installieren

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom

sudo install -d -o gaiacom -g gaiacom /opt/gaiacom /var/lib/gaiacom /etc/gaiacom
sudo install -o gaiacom -g gaiacom -m 0755 gaiacom-backend /opt/gaiacom/gaiacom-backend
```

Release-Binaries verweigern den Start ohne unveränderliche Build-Metadaten; entferne diese
`-X`-Werte nicht.

### 2. Node initialisieren

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` erzeugt unabhängige Produktionsgeheimnisse, die Signaturidentität des Nodes und die
Konfigurationsdatei. Halte `/etc/gaiacom/gaiacom.env` auf Modus `0600`, im Besitz des
Dienstbenutzers.

Wichtige Einstellungen:

| Variable | Zweck |
|---|---|
| `GAIACOM_SERVER_NAME` | Kanonischer FQDN dieses Nodes; verwendet in Gaia-IDs und Föderation |
| `GAIACOM_DEV_MODE=false` | Produktionsmodus, striktes SSRF- und CSP-Verhalten |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Unabhängige Geheimnisse mit 32+ Bytes |
| `GAIACOM_SERVER_PRIVATE_KEY` | Stabiler Ed25519-Signaturschlüssel des Nodes — niemals implizit rotieren |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Stabiles Geheimnis zur Ableitung der TrustMesh-Epoche |
| `DB_PATH` | Pfad zur persistenten SQLite-Datenbank |
| `GAIACOM_STORAGE_ROOT` | Verschlüsselter Anhangspeicher außerhalb des Web-Roots |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Nur wenn ein Reverse Proxy Client-IPs liefert |

### 3. Governance-Bootstrap (erforderlich, fail-closed)

Ein frischer Node vergibt bewusst **keine** Betreiberrolle. Erstelle die erste Identität über den
Client und autorisiere dann genau diese vollständig qualifizierte Gaia-ID als Node-Betreiber:

```bash
sudo install -o root -g gaiacom -m 0600 /dev/null /etc/gaiacom/governance.json
```

```json
{
  "bootstrap_gaia_id": "@operator:node.example.org",
  "operators": [
    { "gaiaID": "@operator:node.example.org" },
    { "gaiaID": "@backup-operator:node.example.org" }
  ]
}
```

Richte das Backend darauf aus und starte neu:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Verwende ausschließlich vollständig qualifizierte Gaia-IDs (`@name:node.example.org`). Es gibt
keinen Standardadministrator und keinen God-Mode-Fallback.

### 4. Systemd-Unit

```ini
[Unit]
Description=GaiaCom Node
After=network-online.target
Wants=network-online.target

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gaiacom
sudo systemctl status gaiacom
```

### 5. TLS-Reverse-Proxy und Web-Client

Liefere das gebaute `Frontend/frontend/dist/` hinter einem TLS-Reverse-Proxy aus und leite die API
an das Backend auf `127.0.0.1:8080` weiter. Mindestanforderungen:

- TLS 1.2+ (TLS 1.3 bevorzugt), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Eine strikte Content-Security-Policy
- Kein Directory Listing, keine Source Maps in der Produktion
- Nur Reverse Proxies, die in `GAIACOM_TRUSTED_PROXY_CIDRS` aufgeführt sind, dürfen
  weitergeleitete Client-IPs liefern

Eine Beispielkonfiguration wird absichtlich **nicht** mit echten Hostnamen oder Zertifikaten
ausgeliefert; verwende deine eigene Domain und deine eigenen Zertifikatspfade.

### 6. Föderation und Betrieb

- Kündige deinen kanonischen `GAIACOM_SERVER_NAME` an bzw. veröffentliche ihn; Peers adressieren
  dich über HTTPS.
- Die Föderation verwendet signierte Server-zu-Server-PDUs mit Replay-Schutz und SSRF-Schutz.
- Überwache den Dienst, die Speicherbelegung, die Backup-Integrität und den Ablauf der Zertifikate.
- Teste Wiederherstellungen der SQLite-Datenbank und des Objektspeichers regelmäßig.
- Halte den Signaturschlüssel des Nodes über Updates hinweg stabil; eine Rotation bricht das
  Föderationsvertrauen.
- Betreibe nicht mehrere Backend-Prozesse gegen eine SQLite-Datei. Horizontale
  Datenbank-Skalierung (Postgres, aktiv/aktiv-Replikate) ist nicht Teil dieses Beta-Profils.

### Warnhinweise für Node-Betreiber

- Beta-Software; kein HA-Anspruch; Wartungsfenster und Neustarts sind erforderlich.
- Governed Content und Abuse-Workflows sind in dieser Beta pro Node richtlinienbezogen.
- Automatische Desktop-Updates sind deaktiviert, bis ein signierter Updater existiert.
- SMTP-Relay erfordert authentifiziertes TLS plus SPF, DKIM und eine durchsetzende DMARC-Richtlinie.
  Nachrichten, die natives GaiaCom verlassen, sind nicht durch native E2EE-Garantien abgedeckt.
- Du bist verantwortlich für Backups, Geheimnisse, TLS, DNS, Abuse-Behandlung und lokales Recht.

---

<a id="security-and-audit-status"></a>
## Sicherheits- und Audit-Status

### Was getan wurde

- Tiefgehende, KI-unterstützte Sicherheitsprüfungen über Backend, Frontend, Föderation,
  Speicherung, Authentifizierung, Autorisierung sowie Desktop- und Browser-Grenzen.
- Statische Security-Gates, adversariale Test-Suites, Prüfungen von Abhängigkeiten und
  Geheimnis-Hygiene.
- Explizite Sicherheitsinvarianten: kein serverseitiger Klartext, kein Export privater Schlüssel,
  kein Impersonations-Endpunkt, keine E2EE-Umgehung, kein globaler Leseschlüssel.
- Fail-closed-Standardwerte für Governance, Geheimnisvalidierung und Protokollaushandlung.
- Echte Live-Verifikation der Produktoberflächen und UI-Flows während der Entwicklung.

### Was **nicht** getan wurde

- **Kein unabhängiges Kryptografie-Audit durch Dritte.**
- Keine formale Verifikation des Protokolls oder der Implementierungen.
- Keine Garantie, dass unbekannte Schwachstellen nicht existieren.
- Keine Zertifizierung auf Regierungsniveau oder mit High-Assurance.
- Das Laufzeitverhalten hängt vom Node, vom Browser, vom Betriebssystem und von der Sicherheit des
  Geräts der Nutzerin bzw. des Nutzers ab.

### Meldung

Bitte melde Schwachstellen vertraulich:

- E-Mail: **security@gaiacom.de**
- Eröffne für eine aktive Schwachstelle kein öffentliches Issue.
- Gib die betroffene Komponente, Version/Commit, Reproduktionsschritte sowie erwartetes und
  tatsächliches Verhalten an.
- Bitte teste nicht gegen die Nodes oder Daten anderer Personen und führe keine destruktiven
  Angriffe aus.

Siehe [SECURITY.md](SECURITY.md) für die vollständige Richtlinie und
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) für die aktuellen Beta-Grenzen.

### High-Assurance-Nutzung

Wenn du ein System benötigst, das Leben, Freiheit oder regulierte Daten schützt, ist diese Beta
**noch nicht** dieses System. Unabhängige Audits, reproduzierbare Builds, signierte Releases,
verifizierte Update-Ketten, operatives Schlüsselmanagement und Incident Response sind weiterhin
erforderlich.

---

<a id="project-structure"></a>
## Projektstruktur

```text
GaiaCom/
├── Backend/                  Go-API, Föderation, Governance, Speicher, Sicherheit
├── Frontend/frontend/        React-Web-Client und PWA
├── DesktopClient/src-tauri/  Tauri-2-Desktop-Shell
├── Android/                  Android-Node-/Client-Architektur
├── Core/rust/gaiacore/       Rust-Krypto-Core
├── SovereignCryptoCore/      Rust-Krypto-Bibliothek
├── SovereignCryptoWasm/      WASM-Krypto-Provider für den Browser
├── docs/                     Architektur, Node-Betrieb, Beta-Grenzen, Screenshots
├── assets/brand/             GaiaCom-Logo und Markenassets
├── SECURITY.md               Sicherheitsrichtlinie und Offenlegung
├── SOVEREIGN_CRYPTO.md       Kryptografisches Design und Grenzen
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Mitwirken

Beiträge sind willkommen, wenn sie die Sicherheitsinvarianten erhalten und Aussagen ehrlich halten.

- Lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md).
- Wahre die Zero-Trust-Grenze: kein serverseitiger Klartext, kein Export privater Schlüssel, keine
  E2EE-Umgehung.
- Ergänze Tests für sicherheitsrelevantes Verhalten.
- Committe niemals Geheimnisse, echte Nutzerdaten, private Schlüssel, Datenbanken oder
  Build-Artefakte.
- Schwäche keine Security-Gates ab, nur damit ein Build durchläuft.
- Melde Schwachstellen vertraulich, nicht in Pull Requests.

Durch deine Teilnahme stimmst du dem [Code of Conduct](CODE_OF_CONDUCT.md) zu.

---

<a id="license"></a>
## Lizenz

GaiaCom folgt einem **Dual-Licensing-Modell** (siehe [VGT Licence](#vgt-licence)): Die
öffentliche Open-Source-Codebasis (`GaiaCom Network`) ist unter der **GNU Affero General
Public License v3.0 or later** (AGPL-3.0-or-later) lizenziert — siehe [LICENSE](LICENSE).
Für den Einsatz in Unternehmen (**GaiaCom Enterprise**), Behörden (**GaiaCom Defend**)
sowie für geschlossene oder kommerzielle Deployments ohne AGPL-Offenlegungspflichten
(inkl. Premium-Modulen, SLA/Support, White Labeling und Air-gapped-Umgebungen) ist das
System **nicht kostenfrei** und erfordert eine kommerzielle **VGT Licence** über
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink).

Netzwerkbetreiber, die modifizierte Open-Source-Software von GaiaCom unter der AGPL
betreiben, müssen den entsprechenden Quellcode verfügbar machen, wie es die AGPL verlangt.
Komponenten von Drittanbietern und ihre Lizenzen sind in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) und in den jeweiligen Paketmanifesten
aufgeführt.

GaiaCom und das GaiaCom-Logo sind Marken von VisionGaiaTechnology. Die AGPL-Lizenz
gewährt keine Markenrechte.

---

<div align="center">

**VisionGaiaTechnology — Abteilung für unnötige Sicherheit™**

*Souveräne Kommunikation, offen entwickelt.*

[Website](https://gaiacom.de) · [Security](SECURITY.md) · [Architecture](docs/ARCHITECTURE.md)

</div>
