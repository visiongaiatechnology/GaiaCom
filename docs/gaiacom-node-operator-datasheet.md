# GaiaCom Node Operator Datenblatt

Status: DIAMANT VERIFIED (automatisierte Release-Suite)
Stand: 2026-07-15
Projekt: GaiaCom 2
Betreiberrolle: Node Operator
Lizenz: AGPL-3.0-or-later
Marke: GaiaCom ist eine Marke von VisionGaiaTechnology.

## 1. Zweck dieses Dokuments

Dieses Datenblatt beschreibt den aktuellen technischen Stand von GaiaCom und die notwendigen Schritte, um einen eigenen GaiaCom Node als Node Operator zu betreiben. Es deckt Backend, Frontend, Governance, Federation, Node Registry, Secrets, Storage, Security Center und produktive Deployment-Grundlagen ab.

Das Dokument ist fuer Betreiber gedacht, die GaiaCom aus dem Quellcode oder aus den bereitgestellten Builds auf einem eigenen Server starten und kontrolliert an der Federation teilnehmen wollen.

## 2. Aktueller Systemstand

GaiaCom besteht aktuell aus diesen Hauptbereichen:

- Go Backend fuer Auth, Identity, Messaging, Federation, Governance, Security, GSN, GaiaDrive, GaiaDrop, SMTP Bridge und Node Registry.
- React Frontend fuer Web/PWA/Tauri-nahe Nutzung.
- SQLite als aktueller produktiver Datenbankpfad.
- Optionaler S3-kompatibler Object Store fuer Dateiablage.
- End-to-End-Krypto auf Client-Ebene fuer Chat- und GaiaCom-spezifische Nachrichtenfluesse.
- Federation ueber signierte Server-to-Server-PDUs.
- Governance-System mit Node Operator, Senior Reviewer und Trusted Reviewer Rollen.
- Security Center mit User-Sicherheitsereignissen und Node-Operator-Ansicht.
- Node Registry MVP fuer kontrolliertes Node-Onboarding.
- Gaia Passport mit Trust, Profilinfos und Human Proof.
- Top Secret Chat Mode mit Ed25519 plus ML-DSA-87 Capability-Gate.

## 3. Wichtige Ordner

Standard-Arbeitsordner:

```text
C:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM
```

Backend:

```text
Backend
```

Frontend:

```text
Frontend/frontend
```

Security PoCs:

```text
security
```

Sauberer GitHub-Export:

```text
GaiaCom_GitHub_Source_20260701
```

## 4. Build-Artefakte fuer Serverbetrieb

Aktuelles Frontend Production Build:

```text
Frontend/frontend/dist
```

Aktuelles Linux AMD64 Backend:

```text
Backend/gaiacom-backend-linux-amd64
```

Build-Befehle:

```powershell
cd Frontend\frontend
npm ci
npm test
npm run build
```

```powershell
cd Backend
$env:GOOS='linux'
$env:GOARCH='amd64'
$env:CGO_ENABLED='0'
$env:GOCACHE='C:\Users\Masterboard\Desktop\Dev_Bunker\Programmierung\GaiaCOM\.gocache'
$version='2.0.0'
$commit=(git rev-parse HEAD).Trim()
$builtAt=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$ldflags="-s -w -X gaiacom/backend/buildinfo.Version=$version -X gaiacom/backend/buildinfo.Commit=$commit -X gaiacom/backend/buildinfo.BuiltAt=$builtAt"
go build -trimpath -ldflags=$ldflags -o gaiacom-backend-linux-amd64 .
```

## 5. Produktionsprinzipien

Ein produktiver GaiaCom Node darf nicht im Dev Mode laufen.

Pflicht:

- `GAIACOM_DEV_MODE` nicht setzen oder auf `false` setzen.
- HTTPS vor den Backend-Endpunkten.
- Starkes `GAIACOM_JWT_SECRET`.
- Starkes `GAIACOM_SHIELD_SECRET`.
- Statischer Ed25519 Server Key via `GAIACOM_SERVER_PRIVATE_KEY`.
- Eindeutiger oeffentlicher Servername via `GAIACOM_SERVER_NAME`.
- `governance.json` mit korrektem Node Operator.
- Dateirechte fuer `governance.json`: `0600`.
- Runtime-Dateien, Datenbanken, Uploads und Secrets nicht ins Git-Repo legen.

## 6. Pflicht-Umgebungsvariablen

### 6.1 Backend Basis

```bash
SERVER_PORT=8080
DB_PATH=/opt/gaiacom/data/gaiacom.db
SQLITE_MAX_OPEN_CONNS=4
GAIACOM_DEV_MODE=false
```

`SERVER_PORT` steuert den HTTP-Port des Backends.

`DB_PATH` legt die SQLite-Datenbank fest. Fuer Produktion sollte der Pfad ausserhalb des Source-Verzeichnisses liegen.

`SQLITE_MAX_OPEN_CONNS` ist standardmaessig `4`. Bei starker Last kann der Wert vorsichtig erhoeht werden, maximal auf `32`.

### 6.2 Auth und Security

```bash
GAIACOM_JWT_SECRET=<mindestens-32-byte-zufaelliger-secret>
GAIACOM_SHIELD_SECRET=<mindestens-32-byte-zufaelliger-secret>
GAIACOM_METRICS_TOKEN=<mindestens-32-byte-zufaelliger-secret>
GAIACOM_COOKIE_SECURE=true
```

`GAIACOM_JWT_SECRET` signiert Sessions/JWTs.

`GAIACOM_SHIELD_SECRET` wird fuer GaiaShield interne Security-HMACs genutzt.

`GAIACOM_COOKIE_SECURE=true` ist fuer HTTPS-Betrieb Pflicht.

### 6.3 Federation und Node Registry

```bash
GAIACOM_SERVER_NAME=beta.gaiacom.de
GAIACOM_SERVER_PRIVATE_KEY=<ed25519-private-key-hex>
GAIACOM_TRUSTMESH_EPOCH_SECRET=<32-byte-hex-secret>
GAIACOM_REGISTRY_MAIN_NODE=https://beta.gaiacom.de
GAIACOM_REGISTRY_AUTHORITY_DOMAIN=gaiacom.de
GAIACOM_CORE_HASH=<optional-64-hex-release-hash>
```

`GAIACOM_SERVER_NAME` muss die oeffentliche Domain des Nodes sein, zum Beispiel:

```bash
GAIACOM_SERVER_NAME=node.example.org
```

`GAIACOM_SERVER_PRIVATE_KEY` ist der private Ed25519 Server Key fuer S2S-Signaturen.

`GAIACOM_TRUSTMESH_EPOCH_SECRET` ist ein 32-Byte Hex Secret fuer TrustMesh.

`GAIACOM_REGISTRY_MAIN_NODE` zeigt standardmaessig auf:

```text
https://beta.gaiacom.de
```

`GAIACOM_REGISTRY_AUTHORITY_DOMAIN` definiert die Hauptdomain, die als Registry Authority gilt. Standard ist:

```text
gaiacom.de
```

`GAIACOM_CORE_HASH` ist optional. Wenn nicht gesetzt, berechnet GaiaCom einen lokalen Core-Fingerprint aus wichtigen Backend-Dateien oder aus dem Binary. Fuer reproduzierbare Release-Pruefungen sollte ein Release-Prozess diesen Wert setzen.

### 6.4 Governance Config Pfad

Optional:

```bash
GAIACOM_GOVERNANCE_CONFIG=/opt/gaiacom/config/governance.json
```

Wenn nicht gesetzt, sucht GaiaCom in dieser Reihenfolge:

```text
governance.json
Backend/governance.json
public/governance.json
Frontend/frontend/public/governance.json
```

Der erste konfigurierte Eintrag wird verwendet.

## 7. governance.json

Die `governance.json` ist der lokale Bootstrap-Anker fuer Node Operator Rechte. Ohne konfigurierte GaiaID wird kein Node Operator automatisch vergeben.

Minimal:

```json
{
  "bootstrap_gaia_id": "@operator:node.example.org"
}
```

Mehrere Operatoren:

```json
{
  "bootstrap_gaia_id": "@operator:node.example.org",
  "operators": [
    {
      "gaiaID": "@backup-operator:node.example.org"
    },
    {
      "gaiaID": "@security-admin:node.example.org"
    }
  ]
}
```

Wichtig:

- Platzhalter `EnterYourGaiaComAddressHere` muss ersetzt werden.
- GaiaIDs sollten exakt zur spaeter erstellten Identitaet passen.
- Das System akzeptiert auch Username-Matching ohne Domain als Fallback, trotzdem ist die volle GaiaID empfohlen.
- Datei unter Linux auf `0600` setzen:

```bash
chmod 600 /opt/gaiacom/config/governance.json
```

## 8. Node Operator Rechte

Ein Node Operator kann aktuell:

- Node Security Summary sehen.
- Node Security Events sehen.
- Abuse/Governance Operator-Aktionen ausfuehren.
- Transparenz-Snapshots erzeugen.
- Node Registry Summary sehen.
- Node-Secrets generieren.
- Main Node pingen.
- Registry Nodes annehmen, blockieren oder in Quarantaene setzen.

Node Operator Rechte entstehen durch:

1. `governance.json` Bootstrap.
2. Aktive `role_credentials` in der Datenbank.
3. Keine aktive Revocation.
4. Gueltiger Zeitraum `valid_from` bis `valid_until`.

## 9. Node Registry MVP

Die Node Registry ist ein kontrollierter Mechanismus, damit neue Nodes sichtbar werden und vom Hauptnode oder berechtigten Operatoren angenommen werden koennen.

### 9.1 Public Endpoints

Ping an Registry:

```http
POST /api/v1/public/node-registry/ping
```

Public Node-Liste:

```http
GET /api/v1/public/node-registry/nodes
GET /.well-known/gaiacom/nodes
```

### 9.2 Operator Endpoints

```http
GET  /api/v1/node/registry/summary
POST /api/v1/node/registry/secrets
POST /api/v1/node/registry/ping-main
POST /api/v1/node/registry/:domain/status
```

Diese Routen sind geschuetzt und nur fuer Node Operatoren freigegeben.

### 9.3 Statuswerte

```text
pending
accepted
quarantined
blocked
```

`pending`: Node hat gepingt, wurde aber noch nicht akzeptiert.

`accepted`: Node wird in die Federation-Server-Liste uebernommen.

`quarantined`: Node ist sichtbar, aber nicht aktiv vertraut. Typischer Grund: Core Hash weicht vom Registry Authority Hash ab.

`blocked`: Node wird blockiert.

### 9.4 Hash-Verhalten

Core Hash wird genutzt fuer:

- Release-Kompatibilitaet.
- Update-Hinweise.
- Fork-/Mismatch-Erkennung.
- Quarantaene-Signal bei Abweichung.

Wichtig: Ein Hash-Mismatch ist aktuell kein sofortiger Netzwerk-Tod. Das ist bewusst so. GaiaCom ist AGPL und Forks muessen technisch moeglich bleiben. Der sichere Weg ist:

```text
Hash-Mismatch -> quarantined/update_required -> Operator-Entscheidung
```

Spaeter kann daraus eine Download-/Update-Pipeline entstehen.

## 10. Node Join Ablauf

### 10.1 Vorbereitung

1. Domain bereitstellen, zum Beispiel:

```text
node.example.org
```

2. DNS auf Server zeigen lassen.

3. Reverse Proxy mit HTTPS konfigurieren.

4. Backend-Binary nach Server kopieren:

```text
gaiacom-backend-linux-amd64
```

5. Frontend Build deployen:

```text
Frontend/frontend/dist
```

6. `governance.json` mit Node Operator GaiaID anlegen.

7. Backend mit produktiven Env-Variablen starten.

### 10.2 Secrets erzeugen

Im Frontend:

```text
Security Center -> Nodesystem -> Secrets generieren
```

Das Backend erzeugt:

- `GAIACOM_SERVER_PRIVATE_KEY`
- `GAIACOM_TRUSTMESH_EPOCH_SECRET`
- Public Key fuer Sichtpruefung
- Datei `node_secrets.json`

`node_secrets.json` ist in `.gitignore` eingetragen und darf nicht veroeffentlicht werden.

Danach Werte als echte Umgebungsvariablen setzen und Backend neu starten.

### 10.3 Main Node pingen

Im Frontend:

```text
Security Center -> Nodesystem -> Main-Node pingen
```

Der Node sendet an:

```text
GAIACOM_REGISTRY_MAIN_NODE/api/v1/public/node-registry/ping
```

Payload enthaelt:

- Domain
- Server Name
- Public Key
- Core Hash
- Node Version
- Operator GaiaID

### 10.4 Annahme durch Hauptnode

Auf dem Hauptnode:

```text
Security Center -> Nodesystem -> Registry Tabelle
```

Operator kann setzen:

- `Annehmen`
- `Quarantaene`
- `Blocken`

Bei `Annehmen` wird der Node zusaetzlich in `federation_servers` uebernommen.

## 11. Federation Flow

GaiaCom nutzt GaiaIDs mit Domain-Anteil:

```text
@alice:node.example.org
```

Die Domain bestimmt den Federation-Zielserver.

Wichtige Well-Known-Routen:

```http
GET  /.well-known/gaiacom/server
GET  /.well-known/gaiacom/nodeinfo
GET  /.well-known/gaiacom/nodes
POST /.well-known/gaiacom/s2s/v1/forward
```

S2S Requests werden signiert:

```text
Authorization: X-Gaia-S2S-V1 Signature="...",KeyId="node.example.org",Timestamp="..."
```

Signaturbasis:

```text
timestamp.sha256(body)
```

## 12. Top Secret Federation

Top Secret Federation prueft Remote Capability ueber:

```http
GET /.well-known/gaiacom/nodeinfo
```

Erwartete Suite:

```text
GaiaCom/v0.2/top-secret/X25519+ML-KEM-1024/AES-256-GCM/Ed25519+ML-DSA-87
```

Ablehnung erfolgt bei:

- Fehlender ML-DSA-87 Capability.
- Downgrade von Top Secret auf Normal.
- Fehlendem ML-DSA-87 Signature Bundle.
- Unbekanntem oder nicht kompatiblem Remote Node.

## 13. Storage und GaiaDrive

Standard:

```bash
GAIACOM_STORAGE_ROOT=uploads
```

Empfohlen fuer Produktion:

```bash
GAIACOM_STORAGE_ROOT=/opt/gaiacom/storage
GAIACOM_STORAGE_USER_QUOTA_BYTES=10737418240
GAIACOM_STORAGE_PENDING_TTL_HOURS=24
```

Optional S3-kompatibel:

```bash
GAIACOM_OBJECT_STORE=s3
GAIACOM_S3_ENDPOINT=https://s3.example.org
GAIACOM_S3_BUCKET=gaiacom
GAIACOM_S3_REGION=us-east-1
GAIACOM_S3_ACCESS_KEY=<access-key>
GAIACOM_S3_SECRET_KEY=<secret-key>
GAIACOM_S3_PREFIX=node-example-org
GAIACOM_S3_PATH_STYLE=true
```

S3 ist optional. Es dient dazu, Dateiobjekte aus dem lokalen Filesystem herauszuziehen. Verschluesselung bleibt GaiaCom-seitig relevant.

## 14. SMTP Bridge

Optional:

```bash
GAIACOM_SMTP_HOST=smtp.example.org
GAIACOM_SMTP_PORT=587
GAIACOM_SMTP_USERNAME=<username>
GAIACOM_SMTP_PASSWORD=<password>
GAIACOM_SMTP_FROM=noreply@example.org
GAIACOM_SMTP_INGEST_TOKEN=<strong-ingest-token>
```

Wenn SMTP nicht genutzt wird, Variablen leer lassen.

## 15. Reverse Proxy Mindestanforderungen

Der Reverse Proxy muss:

- HTTPS terminieren.
- Webroot fuer Frontend Build ausliefern.
- `/api/` an Backend weiterleiten.
- `/.well-known/gaiacom/` an Backend weiterleiten.
- Request Body fuer Federation bis mindestens 2 MB erlauben.
- Datei-/Upload-Endpunkte passend zur GaiaDrive Nutzung erlauben.

Beispielstruktur:

```text
/                         -> Frontend build
/api/v1/...               -> Backend :8080
/.well-known/gaiacom/...  -> Backend :8080
```

## 16. Systemd Beispiel

```ini
[Unit]
Description=GaiaCom Backend
After=network-online.target
Wants=network-online.target

[Service]
User=gaiacom
Group=gaiacom
WorkingDirectory=/opt/gaiacom/backend
ExecStart=/opt/gaiacom/backend/gaiacom-backend-linux-amd64
Restart=always
RestartSec=5
Environment=SERVER_PORT=8080
Environment=DB_PATH=/opt/gaiacom/data/gaiacom.db
Environment=SQLITE_MAX_OPEN_CONNS=4
Environment=GAIACOM_DEV_MODE=false
Environment=GAIACOM_COOKIE_SECURE=true
Environment=GAIACOM_SERVER_NAME=node.example.org
Environment=GAIACOM_REGISTRY_MAIN_NODE=https://beta.gaiacom.de
Environment=GAIACOM_REGISTRY_AUTHORITY_DOMAIN=gaiacom.de
EnvironmentFile=/etc/gaiacom/gaiacom.env

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/gaiacom/data /opt/gaiacom/storage /opt/gaiacom/config

[Install]
WantedBy=multi-user.target
```

`gaiacom.secrets.env` sollte enthalten:

```bash
GAIACOM_JWT_SECRET=...
GAIACOM_SHIELD_SECRET=...
GAIACOM_METRICS_TOKEN=...
GAIACOM_SERVER_PRIVATE_KEY=...
GAIACOM_TRUSTMESH_EPOCH_SECRET=...
GAIACOM_GOVERNANCE_CONFIG=/opt/gaiacom/config/governance.json
```

Dateirechte:

```bash
chown gaiacom:gaiacom /etc/gaiacom/gaiacom.env
chmod 600 /etc/gaiacom/gaiacom.env
chmod 600 /opt/gaiacom/config/governance.json
chown -R gaiacom:gaiacom /opt/gaiacom
```

## 17. Security Checkliste vor Start

Pflicht:

- [ ] `GAIACOM_DEV_MODE=false`
- [ ] HTTPS aktiv
- [ ] `GAIACOM_COOKIE_SECURE=true`
- [ ] `GAIACOM_JWT_SECRET` stark und geheim
- [ ] `GAIACOM_SHIELD_SECRET` stark und geheim
- [ ] `GAIACOM_SERVER_PRIVATE_KEY` gesetzt
- [ ] `GAIACOM_TRUSTMESH_EPOCH_SECRET` gesetzt
- [ ] `GAIACOM_SERVER_NAME` ist oeffentliche Domain
- [ ] `governance.json` enthaelt echte Operator GaiaID
- [ ] `governance.json` Rechte `0600`
- [ ] DB liegt ausserhalb des Source-Verzeichnisses
- [ ] Storage liegt ausserhalb des Source-Verzeichnisses
- [ ] Backups fuer DB und Storage eingerichtet
- [ ] Nginx/Proxy leitet `/.well-known/gaiacom/*` ans Backend
- [ ] Security Center als Node Operator erreichbar
- [ ] Nodesystem zeigt Servername, Core Hash und Public Key
- [ ] Main-Node Ping getestet

## 18. Update Checkliste

1. Backend Binary ersetzen.
2. Frontend Build ersetzen.
3. Service stoppen.
4. Backup erstellen:

```bash
sqlite3 /opt/gaiacom/data/gaiacom.db ".timeout 10000" ".backup '/opt/gaiacom/backups/gaiacom-$(date +%F-%H%M).db'"
```

5. Neues Binary deployen.
6. Frontend Build deployen.
7. Service starten.
8. Logs pruefen.
9. `/.well-known/gaiacom/nodeinfo` pruefen.
10. `/.well-known/gaiacom/nodes` pruefen.
11. Security Center pruefen.
12. Nodesystem Main-Node Ping ausfuehren.

## 19. Release-Grenzen

Der unterstützte Produktionspfad ist bewusst ein Single-Node-Profil:

- Federation Registry ist operatorgesteuert, nicht global konsensbasiert.
- Automatische Desktop-Updates bleiben deaktiviert, bis Betreiber-Signierschlüssel und Update-Endpunkt provisioniert sind.
- Hash-Mismatch fuehrt zu Quarantaene, nicht zu vollautomatischer globaler Verbannung.
- SQLite ist stabilisiert; horizontale Backend-Skalierung ist ohne echten Postgres-Dialekt nicht freigegeben.
- Ein unabhaengiges externes Security-Audit bleibt Freigabevoraussetzung fuer eine breite oeffentliche Vermarktung.
- Node Registry Vertrauen ist aktuell operatorgesteuert, nicht voll dezentral konsensbasiert.

## 20. Empfohlener Betreiberfluss

Kurzfassung:

```text
1. Server vorbereiten
2. Domain + HTTPS einrichten
3. Backend Binary deployen
4. Frontend Build deployen
5. Secrets setzen
6. governance.json setzen
7. Backend starten
8. Account erstellen
9. GaiaID passend zur governance.json erstellen
10. Security Center oeffnen
11. Nodesystem oeffnen
12. Secrets generieren, falls noch nicht vorhanden
13. Backend mit finalen Secrets neu starten
14. Main-Node pingen
15. Auf Hauptnode annehmen lassen
16. Federation testen
```

## 21. Minimaler produktiver Env-Satz

```bash
SERVER_PORT=8080
DB_PATH=/opt/gaiacom/data/gaiacom.db
SQLITE_MAX_OPEN_CONNS=4
GAIACOM_DEV_MODE=false
GAIACOM_COOKIE_SECURE=true
GAIACOM_SERVER_NAME=node.example.org
GAIACOM_SERVER_PRIVATE_KEY=<hex>
GAIACOM_TRUSTMESH_EPOCH_SECRET=<hex>
GAIACOM_JWT_SECRET=<strong-secret>
GAIACOM_SHIELD_SECRET=<strong-secret>
GAIACOM_METRICS_TOKEN=<strong-secret>
GAIACOM_GOVERNANCE_CONFIG=/opt/gaiacom/config/governance.json
GAIACOM_REGISTRY_MAIN_NODE=https://beta.gaiacom.de
GAIACOM_REGISTRY_AUTHORITY_DOMAIN=gaiacom.de
GAIACOM_STORAGE_ROOT=/opt/gaiacom/storage
```

## 22. Betreiber-Fazit

Ein eigener GaiaCom Node ist jetzt praktisch betreibbar:

- Server bekommt eigene Identitaet.
- Node Operator wird ueber `governance.json` gebootstrapped.
- Federation-Endpunkte sind vorhanden.
- Node Registry Ping ist vorhanden.
- Hauptnode kann neue Nodes akzeptieren oder isolieren.
- Core Hash macht Updates und abweichende Builds sichtbar.
- Security Center ist der zentrale Operator-Arbeitsplatz.

Fuer GitHub ist damit ein reproduzierbarer Release-Testpfad vorhanden: Entwickler koennen GaiaCom auschecken, einen eigenen Node konfigurieren, Operator werden, den Main Node pingen und kontrolliert an der Federation teilnehmen.
