[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · **Italiano** · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Comunicazione Sovrana Post-Quantistica" />

# GaiaCom

### Infrastruttura sovrana di comunicazione post-quantistica

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Una piattaforma di comunicazione federata e cifrata lato client con un design ibrido post-quantistico.**

</div>

> **VisionGaiaTechnology — Dipartimento della Sicurezza Non Necessaria™**
>
> Costruiamo infrastrutture di comunicazione che non chiedono una fiducia che non possono
> dimostrare. Il dipartimento esiste perché la sicurezza «non necessaria» è esattamente ciò che
> diventa necessario nel momento in cui qualcun altro detiene le chiavi.

---

## Menu

[Panoramica](#overview) · [Beta V3](#beta-v3) · [Screenshot](#screenshots) · [Funzionalità](#features) · [Informazioni tecniche](#technical-information) · [Cosa distingue GaiaCom](#what-makes-gaiacom-different) · [Compilazione dai sorgenti](#build-from-source) · [Diventare operatore di nodo](#become-a-node-operator) · [Stato della sicurezza e degli audit](#security-and-audit-status) · [Struttura del progetto](#project-structure) · [Contribuire](#contributing) · [Licenza](#license)

---

<a id="overview"></a>
## Panoramica

Gli stack di comunicazione attuali non sono stati progettati per un mondo post-quantistico. I
servizi di messaggistica centralizzano la fiducia in un unico fornitore, la posta elettronica
classica non è mai stata riservata per progettazione e la maggior parte delle piattaforme conserva
una copia leggibile di tutto ciò che trasporta.

**GaiaCom ridefinisce la comunicazione sicura come infrastruttura sovrana.**

Combina una rete federata, cifratura end-to-end lato client, un envelope ibrido post-quantistico
versionato, canali sociali cifrati, archiviazione cifrata dei file e un livello di governance per
gli operatori di nodo — in un'unica identità, su web, desktop e mobile.

La regola fondamentale è deliberatamente essenziale:

```text
Il server può instradare, archiviare, applicare rate-limit, eseguire audit e far rispettare le policy.
Il server non deve mai ricevere la capacità di decifrare i contenuti privati nativi.
```

GaiaCom **non** è una promessa di sicurezza assoluta. È il tentativo di rendere i confini di
fiducia espliciti, verificabili e — ove possibile — applicati matematicamente.

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 è una beta tecnica pubblica. Trattala di conseguenza.**

- **Stato:** Beta V3, versione `3.0.2`.
- **Non è stato completato alcun audit crittografico indipendente.** Il design post-quantistico, le
  implementazioni del protocollo e i confini crittografici **non** sono stati esaminati da un
  laboratorio indipendente di crittografia di terze parti.
- Abbiamo condotto **audit di sicurezza approfonditi assistiti da IA** su architettura,
  autenticazione, autorizzazione, federazione, archiviazione e confini di browser e desktop. Tali
  audit hanno individuato e corretto problemi reali. **Non costituiscono una prova di sicurezza.**
- **Possono comunque esistere vulnerabilità sconosciute** — nella progettazione del protocollo,
  nell'implementazione, nelle dipendenze, nell'ambiente operativo o sul dispositivo stesso
  dell'utente.
- È facile commettere errori sottili in crittografia. Assunzioni errate non sono sempre visibili nei
  test. Non considerare i nomi degli algoritmi come una garanzia di sicurezza.
- **Non utilizzare GaiaCom per comunicazioni critiche per la vita, regolamentate per legge, di alto
  valore o irreversibili** in questa beta. Conserva backup indipendenti dei seed e dei dati
  importanti.
- Tra le versioni beta possono verificarsi modifiche incompatibili al protocollo e alle API. La
  perdita di dati è possibile.
- Un client web può essere sostituito da un nodo compromesso prima che avvenga la cifratura. Il
  profilo ad alta garanzia richiede pertanto client nativi affidabili e compilati in modo
  indipendente.
- Il bridging SMTP rappresenta un confine di declassamento (downgrade) intenzionale. I messaggi
  che escono dallo spazio di sicurezza nativo di GaiaCom sono protetti solo nella misura consentita
  dal percorso legacy.

Se scopri un problema di sicurezza, segnalalo privatamente — vedi
[SECURITY.md](SECURITY.md). Non pubblicare dettagli di exploit attivi.

---

<a id="screenshots"></a>
## Screenshot

Tutti gli screenshot provengono da GaiaCom 3.0.2 a 2560 × 1440. L'interfaccia mostrata è l'attuale
design VGT Aurora; gli screenshot contengono esclusivamente superfici pubbliche del prodotto e
contenuti pubblici di federazione.

| Pagina iniziale | Identità e accesso |
|---|---|
| ![Pagina iniziale](docs/screenshots/landing.png) | ![Finestra di autenticazione](docs/screenshots/auth.png) |
| **Canali Pubblici — esplorazione** | **Canali Pubblici — vista canale** |
| ![Esplorazione dei canali](docs/screenshots/channels-discovery.png) | ![Vista del canale](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Funzionalità

### Identità e accesso

- **Identità Gaia ID autogestita** — `@name:node.example.org`, derivata da un seed generato
  localmente. Le chiavi private restano sul dispositivo.
- **Vault locale delle chiavi** con sblocco esplicito, blocco della sessione e blocco automatico
  configurabile.
- **Abbinamento multi-dispositivo** tramite flussi di pairing con QR o monouso, oltre a elenco e
  revoca dei dispositivi.
- **Cronologia delle chiavi e avvisi di modifica** quando la chiave di identità di un contatto
  cambia.
- **Flussi di recupero** con un seed di recupero esplicito e annotato; non esiste alcuna backdoor di
  recupero lato server.
- **18 lingue dell'interfaccia** con selettore lingua in tempo reale (pagina iniziale,
  autenticazione, area di lavoro).

### Messaggistica

- **Quantum Chat** — conversazioni 1:1 con cifratura lato client, risposte, reazioni, messaggi
  fissati, ricerca, allegati, note vocali e anteprime di immagini cifrate.
- **Chat di Gruppo** — stanze con canali, ruoli, moderazione, gestione dei membri, modalità lenta,
  canali in sola lettura, richieste di accesso, inviti, eventi di audit ed esportazione cifrata.
- **Reazioni** — controllo delle reazioni incentrato sul cuore: passa il cursore su desktop o tieni
  premuto su touch per aprire la tavolozza completa; esattamente una reazione viene mostrata come
  tua.
- **Nessuno stato fittizio** — i valori di messaggi, reazioni, presenza e attività provengono dal
  backend reale oppure vengono mostrati come non disponibili. GaiaCom non inventa contatori.

### GaiaMail

- Posta all'interno della stessa identità crittografica della chat.
- GaiaMail nativa tra identità GaiaCom.
- **Bridge SMTP** per i contatti legacy — chiaramente separato dalla E2EE nativa e protetto solo
  nella misura consentita dal percorso legacy.
- Firme, cartelle, filtri ed etichette gestiti localmente.

### GSN Social

Il livello sociale di GaiaCom non è una piattaforma separata con un account separato. Riutilizza la
tua identità sovrana:

- **Feed principale**, **Scopri**, **La mia rete**, **Messaggi**, **Notifiche**, **Gruppi**,
  **Canali** e **GSN Cloud** (integrazione con GaiaDrive).
- Post, immagini cifrate, commenti, reazioni, ripubblicazioni e tendenze degli hashtag calcolate a
  partire da post reali.
- Follower, profili seguiti e contatti consigliati derivati dalle interazioni effettive della
  federazione.
- **Canali Pubblici** per comunicazioni in stile broadcast con iscrizioni, esplorazione, categorie,
  media, commenti e moderazione.

### File, vault e centro sicurezza

- **GaiaDrive** — archiviazione e condivisione cifrata di file legata alla stessa identità.
- **GaiaDrop** — ricezione di file cifrati da mittenti esterni senza bisogno di un account.
- **GaiaVault** — archivio locale sigillato per segreti e chiavi.
- **Centro Sicurezza** — stato reale di dispositivi, sessioni, chiavi ed eventi di sicurezza, oltre
  ai flussi di governance e segnalazione abusi.

### Governance e operazioni

- Ruoli di operatore di nodo, revisore senior e revisore fidato.
- Bootstrap della governance fail-closed: un nodo appena creato **non** assegna alcun ruolo di
  operatore per impostazione predefinita.
- Segnalazione abusi, moderazione, superfici di trasparenza ed eventi di audit append-only.
- Federazione su PDU server-to-server firmate con protezione dai replay e limiti anti-SSRF.

### Desktop e mobile

- Client **Web/PWA** con CSP rafforzata e nessun codice distribuito tramite CDN.
- **Client desktop Tauri 2** per Windows, Linux e macOS con controlli finestra nativi e nessun
  permesso di comando nativo oltre a una allowlist esplicita.
- Architettura nodo/client **Android** con core crittografico nativo e binding di piattaforma.

---

<a id="technical-information"></a>
## Informazioni tecniche

### Stack

| Livello | Tecnologia |
|---|---|
| Client web | React 18, Vite 8, layer di design in CSS puro |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), finestra personalizzata senza cornice |
| Backend | Go 1.25 (`toolchain go1.26.5`), libreria standard + SQLite, servizi di federazione e governance |
| Database | SQLite in modalità WAL (profilo beta a singolo scrittore), migrazioni versionate |
| Core crittografico | Rust (`gaiacore`), provider WebAssembly per HQC nel browser, provider nativo Tauri |
| Mobile | App Android + binding mobili Go / architettura kernel di nodo |
| Localizzazione | 18 lingue, tabelle di traduzione condivise |

### Design crittografico (Sovereign v1)

```text
Scambio delle chiavi:  X25519  +  ML-KEM-1024  +  HQC-256
Combinatore:           segreti con prefisso di lunghezza → HKDF-SHA3-512
AEAD accelerato:       Twofish-256-EAX → AES-256-GCM
AEAD Top Secret:       Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                       → XChaCha20-Poly1305 → AES-256-GCM-SIV
Firme:                 firma di trascrizione Ed25519
Firme Top Secret:      Ed25519 + ML-DSA-87
```

La trascrizione firmata vincola la versione del protocollo, la suite esatta di algoritmi, le
identità di mittente e destinatario, la chiave di cifratura del destinatario, la chiave effimera,
entrambi i testi cifrati KEM, l'ID del messaggio, il timestamp, il nonce e il payload cifrato.
Suite sconosciute, prove di keyset mancanti, firme Top Secret mancanti e testi cifrati HQC
malformati vengono rifiutati in modalità fail-closed.

**Confine importante:** Sovereign v1 è un envelope ibrido per singolo messaggio, **non un Triple
Ratchet**. Non promette sicurezza post-compromissione derivata da ratchet. Il confine esatto è
documentato in [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Modello di rete

- Nodi federati, nessun server centrale obbligatorio.
- PDU server-to-server firmate per la federazione.
- Il server archivia envelope di instradamento, payload/chunk cifrati, campi del profilo pubblico e
  metadati minimi — mai testo in chiaro nativo.
- Archiviazione oggetti cifrata locale o compatibile con S3/MinIO.
- TLS è obbligatorio al di fuori dello sviluppo locale.

### Requisiti

| Strumento | Versione |
|---|---|
| Node.js | 24.13 (minimo 20.19) |
| npm | installazione basata su lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (il modulo punta a 1.25) |
| Rust | stable (fissata dalla CI per il core) |
| Tauri CLI | 2.x per il packaging desktop |
| Python | 3.10+ (script opzionali di repository/sicurezza) |

---

<a id="what-makes-gaiacom-different"></a>
## Cosa distingue GaiaCom

La maggior parte dei servizi di messaggistica «sicuri» migliora un solo livello. GaiaCom cerca di
rendere coerente l'intero stack:

- **Identità sovrana invece di account di piattaforma.** La tua identità è un'identità
  crittografica, non una riga nella tabella utenti di qualcun altro. I nodi si federano; non ti
  possiedono.
- **Doppio scambio di chiavi post-quantistico per ogni messaggio.** Un KEM classico e due KEM
  post-quantistici indipendenti vengono combinati, con rifiuto del downgrade quando è selezionato il
  profilo Sovereign.
- **Cifratura prima del trasporto, per costruzione.** Il client sigilla il contenuto prima che
  raggiunga la rete; il server instrada testo cifrato e non può leggerlo.
- **Social, posta, file e chat sotto un'unica identità.** Nessun secondo account, nessun secondo
  modello di fiducia, nessuna piattaforma separata da cui possa trapelare il tuo grafo sociale.
- **Federato per progettazione.** Nessuna casella di posta centrale obbligatoria, nessun punto unico
  di fiducia, nessuna chiave globale di lettura.
- **Stati UI onesti.** I dati mancanti vengono mostrati come mancanti, non sostituiti con numeri
  decorativi o attività inventate.
- **Confini di downgrade espliciti.** SMTP, envelope legacy e distribuzione via browser sono
  documentati come confini, non nascosti dietro linguaggio di marketing.
- **Open source, AGPL-3.0-or-later.** Il software di rete resta ispezionabile e i contributi
  restano disponibili alla comunità.
- **Progettato per gli operatori.** Governance fail-closed, eventi di audit, flussi di gestione
  degli abusi e un percorso documentato per gli operatori di nodo.

---

<a id="build-from-source"></a>
## Compilazione dai sorgenti

### 1. Prerequisiti

Installa Node.js 24.13+, Go 1.26.5+, Rust stable e — per le build desktop — i
[prerequisiti di Tauri 2](https://tauri.app/start/prerequisites/) per il tuo sistema operativo.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Client web

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Il bundle di produzione viene scritto in `Frontend/frontend/dist/`.

Per lo sviluppo locale:

```bash
npm start
# http://127.0.0.1:5173
```

Imposta `VITE_API_URL` esclusivamente sull'origine di un backend GaiaCom in esecuzione, ad esempio:

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

Avvia un nodo di sviluppo locale:

```bash
cp .env.example .env
# genera segreti indipendenti solo per lo sviluppo
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

L'API è in ascolto su `SERVER_PORT` (predefinito `8080`). Il database SQLite viene creato in
`DB_PATH`. Non usare mai in produzione i segreti del modello di esempio.

### 4. Client desktop (Tauri 2)

Compila prima il client web, poi:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Gli installer e gli eseguibili vengono generati in `DesktopClient/src-tauri/target/release/bundle/`.
Per una build rapida non firmata senza installer:

```bash
cargo tauri build --no-bundle
```

### 5. Core crittografico in Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opzionale)

Le build Android richiedono JDK 17, Android SDK/NDK e la toolchain fissata. Consulta `Android/` e
`docs/` per il profilo di compilazione attuale. Il client Android fa parte dell'albero dei sorgenti
della beta, non è un rilascio definitivo per gli store.

---

<a id="become-a-node-operator"></a>
## Diventare operatore di nodo

Un nodo GaiaCom è il backend federato che serve identità, messaggi, canali, superfici sociali e
archiviazione per i propri utenti. Può girare su un normale server Linux.

### Requisiti minimi consigliati

- Linux x86_64 o arm64, 64 bit
- 2+ vCPU, 4 GB di RAM, 20+ GB SSD per un nodo di valutazione (dimensiona in base al carico reale)
- Un nome DNS dedicato, ad es. `node.example.org`
- Un certificato TLS valido (Let's Encrypt funziona)
- Un relay SMTP **solo se** abiliti intenzionalmente il bridge legacy
- Backup che testi concretamente

### 1. Compilazione e installazione

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

I binari di rilascio rifiutano di avviarsi senza metadati di compilazione immutabili; non rimuovere
questi valori `-X`.

### 2. Inizializzazione del nodo

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` genera segreti di produzione indipendenti, l'identità di firma del nodo e il file di
configurazione. Mantieni `/etc/gaiacom/gaiacom.env` con permessi `0600`, di proprietà dell'utente di
servizio.

Impostazioni principali:

| Variabile | Scopo |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN canonico di questo nodo; usato nei Gaia ID e nella federazione |
| `GAIACOM_DEV_MODE=false` | Modalità produzione, comportamento rigoroso per SSRF e CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Segreti indipendenti di almeno 32 byte |
| `GAIACOM_SERVER_PRIVATE_KEY` | Chiave stabile di firma Ed25519 del nodo — non ruotare mai implicitamente |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Segreto stabile per la derivazione d'epoca TrustMesh |
| `DB_PATH` | Percorso persistente del database SQLite |
| `GAIACOM_STORAGE_ROOT` | Archiviazione cifrata degli allegati al di fuori della web root |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Solo se un reverse proxy fornisce gli IP dei client |

### 3. Bootstrap della governance (obbligatorio, fail-closed)

Un nodo appena installato non assegna deliberatamente **alcun** ruolo di operatore. Crea la prima
identità tramite il client, poi autorizza esattamente quel Gaia ID completo come operatore del nodo:

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

Indica il file al backend e riavvia:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Usa solo Gaia ID completi (`@name:node.example.org`). Non esiste alcun amministratore predefinito e
nessun fallback in modalità privilegiata.

### 4. Unità systemd

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

### 5. Reverse proxy TLS e client web

Pubblica `Frontend/frontend/dist/` compilato dietro un reverse proxy TLS e inoltra l'API al backend
su `127.0.0.1:8080`. Requisiti minimi:

- TLS 1.2+ (preferibilmente TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Una Content-Security-Policy rigorosa
- Nessun elenco delle directory, nessuna source map in produzione
- Solo i reverse proxy elencati in `GAIACOM_TRUSTED_PROXY_CIDRS` possono fornire gli IP inoltrati
  dei client

Una configurazione di esempio intenzionalmente **non** viene fornita con hostname o certificati
reali; usa il tuo dominio e i percorsi dei tuoi certificati.

### 6. Federazione e operatività

- Annuncia/pubblica il tuo `GAIACOM_SERVER_NAME` canonico; i peer ti contattano su HTTPS.
- La federazione usa PDU server-to-server firmate con protezioni dai replay e protezione SSRF.
- Monitora il servizio, lo spazio su disco, l'integrità dei backup e la scadenza dei certificati.
- Testa regolarmente i ripristini del database SQLite e dell'archiviazione a oggetti.
- Mantieni stabile la chiave di firma del nodo tra gli aggiornamenti; ruotarla interrompe la fiducia
  nella federazione.
- Non eseguire più processi backend sullo stesso file SQLite. La scalabilità orizzontale del
  database (Postgres, repliche attivo/attivo) non fa parte di questo profilo beta.

### Avvertenze per gli operatori di nodo

- Software beta; nessuna garanzia di alta disponibilità (HA); sono necessarie finestre di
  manutenzione e riavvii.
- In questa beta i contenuti soggetti a governance e i flussi sugli abusi hanno ambito di policy
  per singolo nodo.
- Gli aggiornamenti automatici sul desktop sono disabilitati finché non esisterà un sistema di
  aggiornamento firmato.
- Il relay SMTP richiede TLS autenticato oltre a SPF, DKIM e una policy DMARC restrittiva. I
  messaggi che escono da GaiaCom nativo non sono coperti dalle garanzie della E2EE nativa.
- Sei responsabile di backup, segreti, TLS, DNS, gestione degli abusi e normativa locale.

---

<a id="security-and-audit-status"></a>
## Stato della sicurezza e degli audit

### Cosa è stato fatto

- Revisioni approfondite di sicurezza assistite da IA su backend, frontend, federazione,
  archiviazione, autenticazione, autorizzazione, desktop e confini del browser.
- Controlli statici di sicurezza, suite di test avversariali, verifiche di dipendenze e igiene dei
  segreti.
- Invarianti di sicurezza espliciti: nessun testo in chiaro lato server, nessuna esportazione di
  chiavi private, nessun endpoint di impersonificazione, nessun aggiramento della E2EE, nessuna
  chiave globale di lettura.
- Impostazioni predefinite fail-closed per governance, validazione dei segreti e negoziazione del
  protocollo.
- Verifica reale dal vivo delle superfici del prodotto e dei flussi UI durante lo sviluppo.

### Cosa **non** è stato fatto

- **Nessun audit crittografico indipendente di terze parti.**
- Nessuna verifica formale del protocollo o delle implementazioni.
- Nessuna garanzia che non esistano vulnerabilità sconosciute.
- Nessuna certificazione di livello governativo o ad alta garanzia.
- Il comportamento a runtime dipende dal nodo, dal browser, dal sistema operativo e dalla sicurezza
  del dispositivo dell'utente stesso.

### Segnalazioni

Segnala le vulnerabilità in modo riservato:

- E-mail: **security@gaiacom.de**
- Non aprire una segnalazione pubblica per una vulnerabilità attiva.
- Includi il componente interessato, la versione/commit, i passaggi per la riproduzione e il
  comportamento atteso/osservato.
- Non eseguire test contro i nodi o i dati di altre persone e non condurre attacchi distruttivi.

Consulta [SECURITY.md](SECURITY.md) per la policy completa e
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) per i limiti attuali della beta.

### Utilizzo ad alta garanzia

Se hai bisogno di un sistema che protegga la vita, la libertà o dati regolamentati, questa beta
**non** è ancora quel sistema. Sono tuttora necessari audit indipendenti, build riproducibili,
rilasci firmati, catene di aggiornamento verificate, gestione operativa delle chiavi e risposta agli
incidenti.

---

<a id="project-structure"></a>
## Struttura del progetto

```text
GaiaCom/
├── Backend/                  API Go, federazione, governance, archiviazione, sicurezza
├── Frontend/frontend/        Client web React e PWA
├── DesktopClient/src-tauri/  Shell desktop Tauri 2
├── Android/                  Architettura nodo/client Android
├── Core/rust/gaiacore/       Core crittografico in Rust
├── SovereignCryptoCore/      Libreria crittografica in Rust
├── SovereignCryptoWasm/      Provider crittografico WASM per browser
├── docs/                     Architettura, operatività del nodo, limiti della beta, screenshot
├── assets/brand/             Logo GaiaCom e risorse del marchio
├── SECURITY.md               Policy di sicurezza e divulgazione
├── SOVEREIGN_CRYPTO.md       Design crittografico e confini
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Contribuire

I contributi sono benvenuti se preservano gli invarianti di sicurezza e mantengono le dichiarazioni
oneste.

- Leggi prima [CONTRIBUTING.md](CONTRIBUTING.md).
- Mantieni il confine zero-trust: nessun testo in chiaro lato server, nessuna esportazione di chiavi
  private, nessun aggiramento della E2EE.
- Aggiungi test per i comportamenti rilevanti per la sicurezza.
- Non fare mai commit di segreti, dati reali degli utenti, chiavi private, database o artefatti di
  compilazione.
- Non indebolire i controlli di sicurezza per far passare una build.
- Segnala le vulnerabilità privatamente, non nelle pull request.

Partecipando, accetti il [Codice di condotta](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licenza

GaiaCom è distribuito sotto la **GNU Affero General Public License v3.0 or later**
(AGPL-3.0-or-later). Vedi [LICENSE](LICENSE).

Gli operatori di rete che eseguono software GaiaCom modificato devono rendere disponibile il codice
sorgente corrispondente come richiesto dalla AGPL. I componenti di terze parti e le relative licenze
sono elencati in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) e nei rispettivi manifest dei
pacchetti.

GaiaCom e il logo GaiaCom sono marchi di VisionGaiaTechnology. La licenza AGPL non concede diritti
sui marchi.

---

<div align="center">

**VisionGaiaTechnology — Dipartimento della Sicurezza Non Necessaria™**

*Comunicazione sovrana, costruita in aperto.*

[Sito web](https://gaiacom.de) · [Sicurezza](SECURITY.md) · [Architettura](docs/ARCHITECTURE.md)

</div>
