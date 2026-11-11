[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · **Shqip**

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Komunikim Sovran Post-Kuantik" />

# GaiaCom

### Infrastrukturë sovrane komunikimi post-kuantik

[![Versioni](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![Licenca](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platforma](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Teknologjitë](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Kriptografia](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Statusi](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Auditimi](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Uebsajti](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Një platformë komunikimi e federuar dhe e enkriptuar në anën e klientit, me një dizajn hibrid post-kuantik.**

</div>

> **VisionGaiaTechnology — Departamenti i Sigurisë së Panevojshme™**
>
> Ne ndërtojmë infrastrukturë komunikimi që nuk kërkon besim të cilin nuk mund ta provojë.
> Departamenti ekziston sepse siguria “e panevojshme” është pikërisht ajo që bëhet e nevojshme
> në çastin kur dikush tjetër mban çelësat.

---

## Menyja

[Përmbledhje](#overview) · [Beta V3](#beta-v3) · [Pamjet e ekranit](#screenshots) · [Veçoritë](#features) · [Informacione teknike](#technical-information) · [Çfarë e dallon GaiaCom](#what-makes-gaiacom-different) · [Ndërtimi nga kodi burimor](#build-from-source) · [Bëhu operator nyjeje](#become-a-node-operator) · [Statusi i sigurisë dhe auditimit](#security-and-audit-status) · [Struktura e projektit](#project-structure) · [Kontributi](#contributing) · [Licenca](#license)

---

<a id="overview"></a>
## Përmbledhje

Sistemet e sotme të komunikimit nuk u projektuan për një botë post-kuantike. Aplikacionet e
mesazheve e centralizojnë besimin te një ofrues i vetëm, posta elektronike klasike nuk ka qenë
kurrë konfidenciale në dizajn dhe shumica e platformave ruajnë një kopje të lexueshme të gjithçkaje
që transportojnë.

**GaiaCom e ripërcakton komunikimin e sigurt si infrastrukturë sovrane.**

Ai kombinon një rrjet të federuar, enkriptim nga skaji në skaj në anën e klientit, një zarf hibrid
post-kuantik me versione, kanale sociale të enkriptuara, ruajtje të enkriptuar skedarësh dhe një
shtresë qeverisjeje për operatorët e nyjeve — në një identitet të vetëm, në ueb, desktop dhe
celular.

Rregulli bazë është qëllimisht i shkurtër:

```text
Serveri mund të rrugëzojë, të ruajë, të kufizojë shpejtësinë e kërkesave, të auditojë dhe të zbatojë politika.
Serveri nuk duhet të marrë kurrë aftësinë për të deshifruar përmbajtje private native.
```

GaiaCom **nuk** është një pretendim për siguri absolute. Ai është një përpjekje për t’i bërë kufijtë
e besimit të qartë, të testueshëm dhe — aty ku është e mundur — të zbatuar matematikisht.

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 është një beta publike teknike. Trajtojeni si të tillë.**

- **Statusi:** Beta V3, versioni `3.0.2`.
- **Nuk është përfunduar asnjë auditim i pavarur kriptografik.** Dizajni post-kuantik, zbatimet e
  protokollit dhe kufijtë kriptografikë **nuk** janë shqyrtuar nga një laborator i pavarur
  kriptografie i palëve të treta.
- Kemi kryer **auditime të thella sigurie me ndihmën e AI** në arkitekturë, autentifikim,
  autorizim, federim, ruajtje të dhënash dhe në kufijtë e shfletuesit e të desktopit. Këto auditime
  gjetën dhe rregulluan probleme reale. Ato **nuk janë provë sigurie**.
- **Ende mund të ekzistojnë dobësi të panjohura** — në dizajnin e protokollit, në zbatim, në
  varësitë, në mjedisin e ekzekutimit ose në vetë pajisjen e përdoruesit.
- Kriptografia është e lehtë të zbatohet gabim në mënyra delikate. Supozimet e gabuara nuk janë
  gjithmonë të dukshme në teste. Mos i trajtoni emrat e algoritmeve si garanci sigurie.
- **Mos e përdorni GaiaCom në këtë beta për komunikime kritike për jetën, të rregulluara me ligj,
  me vlerë të lartë ose të pakthyeshme.** Mbani kopje rezervë të pavarura të farave (seed) dhe të
  dhënave të rëndësishme.
- Midis publikimeve beta mund të ndodhin ndryshime të papajtueshme në protokoll dhe API. Humbja e
  të dhënave është e mundur.
- Një klient ueb mund të zëvendësohet nga një nyjë e komprometuar përpara se të ndodhë enkriptimi.
  Prandaj, profili me besueshmëri të lartë (high-assurance) kërkon klientë nativë të besuar dhe të
  ndërtuar në mënyrë të pavarur.
- Ura SMTP është një kufi i qëllimshëm uljeje të sigurisë (downgrade). Mesazhet që dalin nga
  hapësira native e sigurisë së GaiaCom mbrohen vetëm aq sa lejon rruga e trashëguar (legacy).

Nëse gjeni një problem sigurie, ju lutemi raportojeni privatisht — shihni [SECURITY.md](SECURITY.md).
Ju lutemi mos publikoni detaje të shfrytëzimit aktiv të dobësive (exploit).

---

<a id="screenshots"></a>
## Pamjet e ekranit

Të gjitha pamjet e ekranit janë nga GaiaCom 3.0.2 në rezolucion 2560 × 1440. Ndërfaqja e paraqitur
është dizajni aktual VGT Aurora; pamjet përmbajnë vetëm sipërfaqe publike të produktit dhe
përmbajtje publike federimi.

| Faqja kryesore | Identiteti dhe aksesi |
|---|---|
| ![Faqja kryesore](docs/screenshots/landing.png) | ![Dialogu i autentifikimit](docs/screenshots/auth.png) |
| **Kanale publike — zbulimi** | **Kanale publike — pamja e kanalit** |
| ![Zbulimi i kanaleve](docs/screenshots/channels-discovery.png) | ![Pamja e kanalit](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Veçoritë

### Identiteti dhe aksesi

- **Identitet Gaia ID i vetë-menaxhuar** — `@name:node.example.org`, i nxjerrë nga një farë (seed)
  e gjeneruar lokalisht. Çelësat privatë mbeten në pajisje.
- **Kasafortë lokale çelësash** me zhbllokim të qartë, kyçje sesioni dhe vetëkyçje të
  konfigurueshme.
- **Çiftim i shumë pajisjeve** përmes flukseve QR / çiftimit me një përdorim, plus listimi dhe
  revokimi i pajisjeve.
- **Historiku i çelësave dhe paralajmërimet për ndryshim** kur ndryshon çelësi i identitetit të një
  kontakti.
- **Flukse rikuperimi** me një farë rikuperimi (recovery seed) të shprehur qartë dhe të shkruar nga
  përdoruesi; nuk ekziston asnjë derë e pasme rikuperimi në anën e serverit.
- **18 gjuhë të ndërfaqes** me ndërrues gjuhe në kohë reale (faqja kryesore, autentifikimi,
  hapësira e punës).

### Mesazhet

- **Quantum Chat** — biseda 1:1 me enkriptim në anën e klientit, përgjigje, reagime, fiksim
  mesazhesh, kërkim, bashkëngjitje, shënime zanore dhe pamje paraprake të enkriptuara të imazheve.
- **Biseda në grup** — dhoma me kanale, role, moderim, menaxhim anëtarësh, modalitet të ngadaltë,
  kanale vetëm për lexim, kërkesa për bashkim, ftesa, ngjarje auditimi dhe eksport të enkriptuar.
- **Reagimet** — kontroll reagimesh me zemrën në plan të parë: kaloni kursorin në desktop ose
  mbani shtypur në ekran me prekje për të hapur paletën e plotë; saktësisht një reagim shfaqet si
  i juaji.
- **Pa gjendje të rreme** — vlerat e mesazheve, reagimeve, pranisë dhe aktivitetit vijnë nga
  backend-i real ose shfaqen si të padisponueshme. GaiaCom nuk shpik numërues.

### GaiaMail

- Postë elektronike brenda të njëjtit identitet kriptografik si bisedat.
- GaiaMail nativ ndërmjet identiteteve GaiaCom.
- **Ura SMTP** për kontaktet e trashëguara — e ndarë qartë nga E2EE nativ dhe e mbrojtur vetëm
  në masën që lejon rruga e trashëguar.
- Nënshkrimet, dosjet, filtrat dhe etiketat trajtohen lokalisht.

### GSN Social

Shtresa sociale e GaiaCom nuk është një platformë e veçantë me një llogari të veçantë. Ajo
ripërdor identitetin tuaj sovran:

- **Burimi kryesor (Home feed)**, **Zbulo**, **Rrjeti im**, **Mesazhet**, **Njoftimet**,
  **Grupet**, **Kanalet** dhe **GSN Cloud** (integrimi me GaiaDrive).
- Postime, imazhe të enkriptuara, komente, reagime, ripostime dhe prirje të hashtag-ëve të
  llogaritura nga postime reale.
- Ndjekës, ndjekje dhe kontakte të rekomanduara të nxjerra nga ndërveprimet aktuale të federimit.
- **Kanale publike** për komunikim të tipit transmetim me abonime, zbulim, kategori, media,
  komente dhe moderim.

### Skedarët, kasaforta dhe qendra e sigurisë

- **GaiaDrive** — ruajtje dhe ndarje e enkriptuar skedarësh e lidhur me të njëjtin identitet.
- **GaiaDrop** — merrni skedarë të enkriptuar nga dërgues të jashtëm pa pasur llogari.
- **GaiaVault** — ruajtje lokale e vulosur për sekrete dhe çelësa.
- **Qendra e Sigurisë** — gjendja reale e pajisjeve, sesioneve, çelësave dhe ngjarjeve të sigurisë,
  plus flukset e qeverisjes dhe të raportimit të abuzimeve.

### Qeverisja dhe operacionet

- Rolet e operatorit të nyjës, recensuesit të lartë dhe recensuesit të besuar.
- Nisja e qeverisjes me parimin fail-closed: një nyjë e re nuk jep **asnjë** rol operatori si
  parazgjedhje.
- Raportimi i abuzimeve, moderimi, sipërfaqet e transparencës dhe ngjarjet e auditimit vetëm me
  shtim (append-only).
- Federimi përmes PDU-ve të nënshkruara server-me-server me mbrojtje ndaj ripërsëritjes (replay) dhe
  kufizime SSRF.

### Desktopi dhe celulari

- Klient **Web/PWA** me CSP të forcuar dhe pa kod të shpërndarë nga CDN.
- **Klient desktopi Tauri 2** për Windows, Linux dhe macOS me kontrolle native të dritares dhe pa
  leje për komanda native përtej një liste të qartë të lejuar (allowlist).
- Arkitekturë nyjeje/klienti **Android** me bërthamë kriptografike native dhe lidhje të
  platformës.

---

<a id="technical-information"></a>
## Informacione teknike

### Teknologjitë

| Shtresa | Teknologjia |
|---|---|
| Klienti ueb | React 18, Vite 8, shtresa dizajni me CSS të pastër |
| Desktopi | Tauri 2 (Rust + WebView2/WebKit), dritare e personalizuar pa kornizë |
| Backend-i | Go 1.25 (`toolchain go1.26.5`), biblioteka standarde + SQLite, shërbime federimi dhe qeverisjeje |
| Baza e të dhënave | SQLite në modalitetin WAL (profil beta me një shkrues të vetëm), migrime të versionuara |
| Bërthama kripto | Rust (`gaiacore`), ofrues WebAssembly për HQC në shfletues, ofrues nativ Tauri |
| Celulari | Aplikacion Android + lidhje mobile Go / arkitekturë e kernelit të nyjës |
| Lokalizimi | 18 gjuhë, tabela të përbashkëta përkthimi |

### Dizajni kriptografik (Sovereign v1)

```text
Vendosja e çelësave:  X25519  +  ML-KEM-1024  +  HQC-256
Kombinuesi:           sekrete me prefiks gjatësie → HKDF-SHA3-512
AEAD i përshpejtuar:  Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:      Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                      → XChaCha20-Poly1305 → AES-256-GCM-SIV
Nënshkrimet:          nënshkrim i transkriptit Ed25519
Nënshkrimet Top Secret: Ed25519 + ML-DSA-87
```

Transkripti i nënshkruar lidh versionin e protokollit, setin e saktë të algoritmeve, identitetet e
dërguesit dhe marrësit, çelësin e enkriptimit të marrësit, çelësin efemer, të dy tekstet e
shifruara KEM, ID-në e mesazhit, vulën kohore, nonce-n dhe ngarkesën e enkriptuar. Setet e
panjohura, provat e munguara të bashkësisë së çelësave, nënshkrimet e munguara Top Secret dhe
tekstet e shifruara HQC të keqformuara refuzohen në mënyrë fail-closed.

**Kufiri i rëndësishëm:** Sovereign v1 është një zarf hibrid për çdo mesazh, **jo një Triple
Ratchet**. Ai nuk premton siguri pas komprometimit të nxjerrë nga mekanizmi ratchet. Kufiri i
saktë është dokumentuar në [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Modeli i rrjetit

- Nyje të federuara, pa server qendror të detyrueshëm.
- PDU të nënshkruara server-me-server për federim.
- Serveri ruan zarfet e rrugëzimit, ngarkesat/fragmentet e enkriptuara, fushat publike të profilit
  dhe metadata minimale — kurrë tekst të hapur nativ.
- Ruajtje objektesh e enkriptuar lokale ose e pajtueshme me S3/MinIO.
- TLS është i detyrueshëm jashtë zhvillimit lokal.

### Kërkesat

| Mjeti | Versioni |
|---|---|
| Node.js | 24.13 (minimumi 20.19) |
| npm | instalim i bazuar në lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (moduli synon 1.25) |
| Rust | stable (e fiksuar nga CI për bërthamën) |
| Tauri CLI | 2.x për paketimin e desktopit |
| Python | 3.10+ (skripte opsionale të depos/sigurisë) |

---

<a id="what-makes-gaiacom-different"></a>
## Çfarë e dallon GaiaCom

Shumica e aplikacioneve “të sigurta” të mesazheve përmirësojnë vetëm një shtresë. GaiaCom përpiqet
ta bëjë koherent të gjithë stakun:

- **Identitet sovran në vend të llogarive të platformës.** Identiteti juaj është një identitet
  kriptografik, jo një rresht në tabelën e përdoruesve të dikujt tjetër. Nyjet federohen; ato nuk
  ju zotërojnë.
- **Vendosje e dyfishtë post-kuantike e çelësave për çdo mesazh.** Një KEM klasik dhe dy KEM
  post-kuantikë të pavarur kombinohen, me refuzim të uljes së sigurisë (downgrade) kur zgjidhet
  profili Sovereign.
- **Enkriptim para transportit, sipas ndërtimit.** Klienti e vulos përmbajtjen përpara se ajo të
  arrijë në rrjet; serveri rrugëzon tekst të shifruar dhe nuk mund ta lexojë atë.
- **Rrjet social, postë, skedarë dhe biseda nën një identitet.** Asnjë llogari e dytë, asnjë model
  i dytë besimi, asnjë platformë e veçantë që zbulon grafikun tuaj të lidhjeve.
- **I federuar sipas dizajnit.** Pa kuti postare qendrore të detyrueshme, pa pikë të vetme besimi,
  pa çelës global leximi.
- **Gjendje të ndershme të ndërfaqes.** Të dhënat që mungojnë shfaqen si të munguara, jo të
  zëvendësuara nga numra dekorativë apo aktivitet i shpikur.
- **Kufij të qartë të uljes së sigurisë.** SMTP, zarfet e trashëguara dhe shpërndarja në shfletues
  janë të dokumentuara si kufij, jo të fshehura pas gjuhës së marketingut.
- **Burim i hapur, AGPL-3.0-or-later.** Softueri i rrjetit mbetet i inspektueshëm dhe kontributet
  mbeten të disponueshme për komunitetin.
- **Ndërtuar për operatorët.** Qeverisje fail-closed, ngjarje auditimi, flukse raportimi të
  abuzimeve dhe një rrugë e dokumentuar për operatorin e nyjës.

---

<a id="build-from-source"></a>
## Ndërtimi nga kodi burimor

### 1. Parakushtet

Instaloni Node.js 24.13+, Go 1.26.5+, Rust stable dhe — për ndërtimet e desktopit —
[parakushtet e Tauri 2](https://tauri.app/start/prerequisites/) për sistemin tuaj operativ.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Klienti ueb

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Paketa e prodhimit shkruhet në `Frontend/frontend/dist/`.

Për zhvillim lokal:

```bash
npm start
# http://127.0.0.1:5173
```

Vendoseni `VITE_API_URL` vetëm në origjinën (origin) e një backend-i GaiaCom në ekzekutim, për
shembull:

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. Backend-i

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

Nisni një nyjë lokale zhvillimi:

```bash
cp .env.example .env
# gjeneroni sekrete të pavarura vetëm për zhvillim
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API dëgjon në portën `SERVER_PORT` (parazgjedhja `8080`). Baza e të dhënave SQLite krijohet në
`DB_PATH`. Mos i përdorni kurrë sekretet e shabllonit në prodhim.

### 4. Klienti i desktopit (Tauri 2)

Ndërtoni fillimisht klientin ueb, pastaj:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Instaluesit/skedarët e ekzekutueshëm shkruhen nën `DesktopClient/src-tauri/target/release/bundle/`.
Për një ndërtim të shpejtë të panënshkruar pa instalues:

```bash
cargo tauri build --no-bundle
```

### 5. Bërthama kriptografike në Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opsionale)

Ndërtimet për Android kërkojnë JDK 17, Android SDK/NDK dhe grupin e fiksuar të mjeteve (toolchain).
Shihni `Android/` dhe `docs/` për profilin aktual të ndërtimit. Klienti Android është pjesë e
pemës së kodit burimor të betës, jo një publikim i përfunduar për dyqane aplikacionesh.

---

<a id="become-a-node-operator"></a>
## Bëhu operator nyjeje

Një nyjë GaiaCom është backend-i i federuar që shërben identitete, mesazhe, kanale, sipërfaqe
sociale dhe ruajtje për përdoruesit e saj. Ajo mund të ekzekutohet në një server të zakonshëm Linux.

### Konfigurimi bazë i rekomanduar

- Linux x86_64 ose arm64, 64-bit
- 2+ vCPU, 4 GB RAM, 20+ GB SSD për një nyjë vlerësimi (përshtatini burimet sipas ngarkesës reale)
- Një emër DNS i dedikuar, p.sh. `node.example.org`
- Një certifikatë e vlefshme TLS (Let's Encrypt funksionon)
- Një relay SMTP **vetëm nëse** aktivizoni qëllimisht urën e trashëguar
- Kopje rezervë që i testoni realisht

### 1. Ndërtimi dhe instalimi

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

Skedarët binarë të publikimit refuzojnë të nisen pa metadata të pandryshueshme ndërtimi; mos i
hiqni ato vlera `-X`.

### 2. Inicializimi i nyjës

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

Komanda `setup` gjeneron sekrete të pavarura prodhimi, identitetin e nënshkrimit të nyjës dhe
skedarin e konfigurimit. Mbajeni `/etc/gaiacom/gaiacom.env` me leje `0600`, në pronësi të
përdoruesit të shërbimit.

Cilësimet kryesore:

| Variabli | Qëllimi |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN kanonik i kësaj nyjeje; përdoret në Gaia ID dhe federim |
| `GAIACOM_DEV_MODE=false` | Modaliteti i prodhimit, sjellje strikte për SSRF dhe CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Sekrete të pavarura me gjatësi 32+ bajtë |
| `GAIACOM_SERVER_PRIVATE_KEY` | Çelës i qëndrueshëm nënshkrimi Ed25519 i nyjës — mos e rrotulloni kurrë në mënyrë implicite |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Sekret i qëndrueshëm për nxjerrjen e epokave TrustMesh |
| `DB_PATH` | Shtegu i bazës së përhershme të të dhënave SQLite |
| `GAIACOM_STORAGE_ROOT` | Ruajtje e enkriptuar e bashkëngjitjeve jashtë rrënjës së uebit |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Vetëm nëse një proxy i kundërt dërgon adresat IP të klientëve |

### 3. Nisja e qeverisjes (e detyrueshme, fail-closed)

Një nyjë e re qëllimisht nuk jep **asnjë** rol operatori. Krijoni identitetin e parë përmes
klientit, pastaj autorizoni atë Gaia ID të saktë dhe të kualifikuar plotësisht si operator nyjeje:

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

Drejtojeni backend-in drejt tij dhe riniseni:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Përdorni vetëm Gaia ID të kualifikuara plotësisht (`@name:node.example.org`). Nuk ka administrator
të parazgjedhur dhe asnjë modalitet rezervë god-mode.

### 4. Njësia Systemd

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

### 5. Proxy i kundërt TLS dhe klienti ueb

Shërbeni dosjen e ndërtuar `Frontend/frontend/dist/` pas një proxy të kundërt TLS dhe përcillni
API-në te backend-i në `127.0.0.1:8080`. Kërkesat minimale:

- TLS 1.2+ (preferohet TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Një Content-Security-Policy strikte
- Pa listim të direktorive, pa source maps në prodhim
- Vetëm proxy-t e kundërt të listuar në `GAIACOM_TRUSTED_PROXY_CIDRS` mund të furnizojnë adresat IP
  të përcjella të klientëve

Një konfigurim shembull qëllimisht **nuk** dërgohet me emra realë hostesh apo certifikata; përdorni
domenin dhe shtigjet tuaja të certifikatave.

### 6. Federimi dhe funksionimi

- Njoftoni/publikoni `GAIACOM_SERVER_NAME` tuaj kanonik; nyjet e tjera ju drejtohen përmes HTTPS.
- Federimi përdor PDU të nënshkruara server-me-server me mbrojtje ndaj ripërsëritjes (replay) dhe
  mbrojtje ndaj SSRF.
- Monitoroni shërbimin, përdorimin e diskut, integritetin e kopjeve rezervë dhe skadimin e
  certifikatave.
- Testoni rregullisht rikthimin e bazës së të dhënave SQLite dhe të ruajtjes së objekteve.
- Mbajeni çelësin e nënshkrimit të nyjës të pandryshuar mes përditësimeve; rrotullimi i tij prish
  besimin e federimit.
- Mos ekzekutoni disa procese backend-i kundrejt një skedari të vetëm SQLite. Shkallëzimi
  horizontal i bazës së të dhënave (Postgres, replika active/active) nuk është pjesë e këtij profili
  beta.

### Paralajmërime për operatorët e nyjeve

- Softuer beta; pa pretendim për disponueshmëri të lartë (HA); nevojiten dritare mirëmbajtjeje dhe
  rinisje.
- Përmbajtja e qeverisur dhe flukset e raportimit të abuzimeve janë të kufizuara në nivel politike
  për çdo nyjë në këtë beta.
- Përditësimet automatike të desktopit janë të çaktivizuara derisa të ekzistojë një përditësues i
  nënshkruar.
- Relay-i SMTP kërkon TLS të autentifikuar plus SPF, DKIM dhe një politikë detyruese DMARC.
  Mesazhet që dalin nga GaiaCom nativ nuk mbulohen nga garancitë native E2EE.
- Ju jeni përgjegjës për kopjet rezervë, sekretet, TLS, DNS, trajtimin e abuzimeve dhe ligjin
  vendor.

---

<a id="security-and-audit-status"></a>
## Statusi i sigurisë dhe auditimit

### Çfarë është bërë

- Rishikime të thella sigurie me ndihmën e AI në backend, frontend, federim, ruajtje të dhënash,
  autentifikim, autorizim dhe në kufijtë e desktopit e të shfletuesit.
- Porta statike sigurie, grupe testesh kundërshtare (adversarial), kontrolle të varësive dhe të
  higjienës së sekreteve.
- Invariantë të qartë sigurie: pa tekst të hapur në anën e serverit, pa eksportim të çelësave
  privatë, pa pikë fundore impersonimi, pa anashkalim të E2EE, pa çelës global leximi.
- Parazgjedhje fail-closed për qeverisjen, vlefshmërinë e sekreteve dhe negocimin e protokollit.
- Verifikim real i drejtpërdrejtë i sipërfaqeve të produktit dhe flukseve të ndërfaqes gjatë
  zhvillimit.

### Çfarë **nuk** është bërë

- **Asnjë auditim i pavarur kriptografik nga palë të treta.**
- Asnjë verifikim formal i protokollit ose i zbatimeve.
- Asnjë garanci që nuk ekzistojnë dobësi të panjohura.
- Asnjë certifikim i nivelit qeveritar ose me besueshmëri të lartë (high-assurance).
- Sjellja gjatë ekzekutimit varet nga nyja, shfletuesi, sistemi operativ dhe siguria e vetë
  pajisjes së përdoruesit.

### Raportimi

Ju lutemi raportoni dobësitë privatisht:

- Email: **security@gaiacom.de**
- Mos hapni një çështje publike (issue) për një dobësi aktive.
- Përfshini komponentin e prekur, versionin/commit-in, hapat e riprodhimit dhe sjelljen e pritur
  kundrejt asaj të vëzhguar.
- Ju lutemi mos testoni kundër nyjeve ose të dhënave të personave të tjerë dhe mos kryeni sulme
  shkatërruese.

Shihni [SECURITY.md](SECURITY.md) për politikën e plotë dhe
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) për kufijtë aktualë të betës.

### Përdorimi me besueshmëri të lartë (high-assurance)

Nëse keni nevojë për një sistem që mbron jetën, lirinë ose të dhëna të rregulluara me ligj, kjo
beta **nuk** është ende ai sistem. Auditimet e pavarura, ndërtimet e riprodhueshme, publikimet e
nënshkruara, zinxhirët e verifikuar të përditësimeve, menaxhimi operacional i çelësave dhe reagimi
ndaj incidenteve janë ende të nevojshme.

---

<a id="project-structure"></a>
## Struktura e projektit

```text
GaiaCom/
├── Backend/                  API në Go, federimi, qeverisja, ruajtja, siguria
├── Frontend/frontend/        Klienti ueb React dhe PWA
├── DesktopClient/src-tauri/  Mbështjellësi i desktopit Tauri 2
├── Android/                  Arkitektura e nyjës/klientit Android
├── Core/rust/gaiacore/       Bërthama kriptografike në Rust
├── SovereignCryptoCore/      Biblioteka kriptografike në Rust
├── SovereignCryptoWasm/      Ofruesi kriptografik WASM për shfletuesin
├── docs/                     Arkitektura, funksionimi i nyjës, kufijtë e betës, pamjet e ekranit
├── assets/brand/             Logoja e GaiaCom dhe materialet e markës
├── SECURITY.md               Politika e sigurisë dhe zbulimi i dobësive
├── SOVEREIGN_CRYPTO.md       Dizajni kriptografik dhe kufijtë
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Kontributi

Kontributet janë të mirëpritura nëse ruajnë invariantët e sigurisë dhe i mbajnë pretendimet të
ndershme.

- Lexoni fillimisht [CONTRIBUTING.md](CONTRIBUTING.md).
- Mbani kufirin zero-trust: pa tekst të hapur në anën e serverit, pa eksportim të çelësave privatë,
  pa anashkalim të E2EE.
- Shtoni teste për sjelljet e rëndësishme për sigurinë.
- Mos bëni kurrë commit sekrete, të dhëna reale përdoruesish, çelësa privatë, baza të dhënash ose
  artefakte ndërtimi.
- Mos i dobësoni portat e sigurisë për të bërë një ndërtim të kalojë.
- Raportoni dobësitë privatisht, jo në pull requests.

Duke marrë pjesë, ju pranoni [Kodin e Sjelljes](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licenca

GaiaCom licencohet sipas **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later).
Shihni [LICENSE](LICENSE).

Operatorët e rrjetit që ekzekutojnë softuer të modifikuar të GaiaCom duhet ta bëjnë të
disponueshëm kodin burimor përkatës siç kërkohet nga AGPL. Komponentët e palëve të treta dhe
licencat e tyre janë renditur në [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dhe në manifestet
përkatëse të paketave.

GaiaCom dhe logoja e GaiaCom janë marka tregtare të VisionGaiaTechnology. Licenca AGPL nuk jep të
drejta mbi markat tregtare.

---

<div align="center">

**VisionGaiaTechnology — Departamenti i Sigurisë së Panevojshme™**

*Komunikim sovran, i ndërtuar hapur.*

[Uebsajti](https://gaiacom.de) · [Siguria](SECURITY.md) · [Arkitektura](docs/ARCHITECTURE.md)

</div>
