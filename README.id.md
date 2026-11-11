[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · **Indonesia** · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Komunikasi Pasca-Kuantum Berdaulat" />

# GaiaCom

### Infrastruktur komunikasi pasca-kuantum yang berdaulat

[![Versi](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![Lisensi](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Tumpukan](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Kriptografi](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Situs web](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Platform komunikasi terfederasi yang terenkripsi di sisi klien dengan desain pasca-kuantum hibrida.**

</div>

> **VisionGaiaTechnology — Departemen Keamanan yang Tidak Perlu™**
>
> Kami membangun infrastruktur komunikasi yang tidak meminta kepercayaan yang tidak dapat dibuktikannya.
> Departemen ini ada karena keamanan "tidak perlu" justru menjadi kebutuhan
> begitu orang lain memegang kuncinya.

---

## Menu

[Ikhtisar](#overview) · [Beta V3](#beta-v3) · [Tangkapan layar](#screenshots) · [Fitur](#features) · [Informasi teknis](#technical-information) · [Apa yang membuat GaiaCom berbeda](#what-makes-gaiacom-different) · [Bangun dari sumber](#build-from-source) · [Menjadi operator node](#become-a-node-operator) · [Status keamanan dan audit](#security-and-audit-status) · [Struktur proyek](#project-structure) · [Berkontribusi](#contributing) · [Lisensi](#license)

---

<a id="overview"></a>
## Ikhtisar

Tumpukan komunikasi hari ini tidak dirancang untuk dunia pasca-kuantum. Aplikasi pesan memusatkan
kepercayaan pada satu penyedia, email klasik tidak pernah bersifat rahasia secara desain, dan sebagian besar platform
menyimpan salinan yang dapat dibaca dari semua yang mereka angkut.

**GaiaCom mendefinisikan ulang komunikasi aman sebagai infrastruktur berdaulat.**

Ia menggabungkan jaringan terfederasi, enkripsi ujung-ke-ujung di sisi klien, amplop pasca-kuantum
hibrida yang berversi, kanal sosial terenkripsi, penyimpanan file terenkripsi, dan lapisan tata kelola
untuk operator node — dalam satu identitas, di web, desktop, dan seluler.

Aturan intinya sengaja dibuat kecil:

```text
Server dapat merutekan, menyimpan, membatasi laju, mengaudit, dan menegakkan kebijakan.
Server tidak boleh pernah menerima kemampuan untuk mendekripsi konten pribadi asli.
```

GaiaCom **bukan** klaim keamanan absolut. Ini adalah upaya untuk membuat batas kepercayaan
eksplisit, dapat diuji, dan — bila memungkinkan — ditegakkan secara matematis.

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 adalah beta teknis publik. Perlakukan dengan semestinya.**

- **Status:** Beta V3, versi `3.0.2`.
- **Belum ada audit kriptografi independen yang diselesaikan.** Desain pasca-kuantum,
  implementasi protokol, dan batas kriptografi **belum** ditinjau
  oleh laboratorium kriptografi pihak ketiga yang independen.
- Kami telah melakukan **audit keamanan mendalam berbantuan AI** di seluruh arsitektur, autentikasi,
  otorisasi, federasi, penyimpanan, serta batas browser dan desktop. Audit tersebut menemukan dan
  memperbaiki masalah nyata. Audit itu **bukan bukti keamanan**.
- **Kerentanan yang tidak diketahui mungkin masih ada** — dalam desain protokol, implementasi,
  dependensi, lingkungan operasi, atau perangkat pengguna sendiri.
- Kriptografi mudah salah secara halus. Asumsi yang rusak tidak selalu terlihat dalam pengujian.
  Jangan menganggap nama algoritma sebagai jaminan keamanan.
- **Jangan gunakan GaiaCom untuk komunikasi yang kritis bagi nyawa, diatur secara hukum, bernilai tinggi, atau tidak dapat dibatalkan**
  dalam beta ini. Simpan cadangan independen untuk seed dan data penting.
- Perubahan protokol dan API yang merusak kompatibilitas dapat terjadi antar rilis beta. Kehilangan data mungkin terjadi.
- Klien web dapat digantikan oleh node yang terkompromi sebelum enkripsi terjadi. Karena itu,
  profil jaminan tinggi memerlukan klien native tepercaya yang dibangun secara independen.
- Penjembatanan SMTP adalah batas downgrade yang disengaja. Pesan yang meninggalkan ruang keamanan
  native GaiaCom hanya terlindungi sejauh jalur lama mengizinkan.

Jika Anda menemukan masalah keamanan, laporkan secara privat — lihat
[SECURITY.md](SECURITY.md). Jangan memublikasikan detail eksploit yang aktif.

---

<a id="screenshots"></a>
## Tangkapan layar

Semua tangkapan layar berasal dari GaiaCom 3.0.2 pada 2560 × 1440. UI yang ditampilkan adalah
desain VGT Aurora saat ini; tangkapan layar hanya memuat permukaan produk publik dan konten federasi publik.

| Halaman landing | Identitas dan akses |
|---|---|
| ![Halaman landing](docs/screenshots/landing.png) | ![Dialog autentikasi](docs/screenshots/auth.png) |
| **Kanal Publik — penemuan** | **Kanal Publik — tampilan kanal** |
| ![Penemuan kanal](docs/screenshots/channels-discovery.png) | ![Tampilan kanal](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Fitur

### Identitas dan akses

- **Identitas Gaia ID yang dikelola sendiri** — `@name:node.example.org`, diturunkan dari seed
  yang dihasilkan secara lokal. Kunci privat tetap berada di perangkat.
- **Brankas kunci lokal** dengan pembukaan eksplisit, kunci sesi, dan auto-lock yang dapat
  dikonfigurasi.
- **Pemasangan multi-perangkat** melalui alur pemasangan QR/sekali pakai, plus daftar perangkat
  dan pencabutan.
- **Riwayat kunci dan peringatan perubahan** saat kunci identitas kontak berubah.
- **Alur pemulihan** dengan seed pemulihan eksplisit yang dituliskan; tidak ada backdoor
  pemulihan di sisi server.
- **18 bahasa UI** dengan pengalih bahasa langsung (landing, autentikasi, ruang kerja).

### Perpesanan

- **Quantum Chat** — percakapan 1:1 dengan enkripsi di sisi klien, balasan, reaksi,
  pin, pencarian, lampiran, catatan suara, dan pratinjau gambar terenkripsi.
- **Obrolan Grup** — ruang dengan kanal, peran, moderasi, manajemen anggota, mode lambat,
  kanal baca-saja, permintaan bergabung, undangan, peristiwa audit, dan ekspor terenkripsi.
- **Reaksi** — kontrol reaksi yang mengutamakan hati: arahkan kursor di desktop atau tekan lama di
  layar sentuh untuk membuka palet lengkap; tepat satu reaksi ditampilkan sebagai milik Anda.
- **Tanpa status palsu** — nilai pesan, reaksi, kehadiran, dan aktivitas berasal dari backend
  nyata atau ditampilkan sebagai tidak tersedia. GaiaCom tidak mengarang penghitung.

### GaiaMail

- Surat di dalam identitas kriptografi yang sama dengan obrolan.
- GaiaMail native antar identitas GaiaCom.
- **Jembatan SMTP** untuk kontak lama — dipisahkan secara jelas dari E2EE native dan hanya
  terlindungi sejauh jalur lama mengizinkan.
- Tanda tangan, folder, filter, dan label ditangani secara lokal.

### GSN Social

Lapisan sosial GaiaCom bukan platform terpisah dengan akun terpisah. Ia menggunakan kembali
identitas berdaulat Anda:

- **Feed Beranda**, **Jelajahi**, **Jaringan Saya**, **Pesan**, **Notifikasi**, **Grup**,
  **Kanal**, dan **GSN Cloud** (integrasi GaiaDrive).
- Postingan, gambar terenkripsi, komentar, reaksi, repost, dan tren tagar yang dihitung dari
  postingan nyata.
- Pengikut, mengikuti, dan kontak yang direkomendasikan yang diturunkan dari interaksi federasi
  yang sebenarnya.
- **Kanal Publik** untuk komunikasi bergaya siaran dengan langganan, penemuan,
  kategori, media, komentar, dan moderasi.

### File, brankas, dan pusat keamanan

- **GaiaDrive** — penyimpanan dan berbagi file terenkripsi yang terikat pada identitas yang sama.
- **GaiaDrop** — terima file terenkripsi dari pengirim eksternal tanpa akun.
- **GaiaVault** — penyimpanan lokal tersegel untuk rahasia dan kunci.
- **Pusat Keamanan** — status perangkat, sesi, kunci, dan peristiwa keamanan yang nyata, plus
  alur kerja tata kelola dan penyalahgunaan.

### Tata kelola dan operasi

- Peran operator node, peninjau senior, dan peninjau tepercaya.
- Bootstrap tata kelola fail-closed: node baru tidak memberikan peran operator apa pun secara default.
- Pelaporan penyalahgunaan, moderasi, permukaan transparansi, dan peristiwa audit append-only.
- Federasi melalui PDU server-ke-server yang ditandatangani dengan perlindungan replay dan batas SSRF.

### Desktop dan seluler

- Klien **Web/PWA** dengan CSP yang diperketat dan tanpa kode yang dikirim melalui CDN.
- **Klien desktop Tauri 2** untuk Windows, Linux, dan macOS dengan kontrol jendela native dan tanpa
  izin perintah native di luar allowlist eksplisit.
- Arsitektur node/klien **Android** dengan inti kripto native dan binding platform.

---

<a id="technical-information"></a>
## Informasi teknis

### Tumpukan

| Lapisan | Teknologi |
|---|---|
| Klien web | React 18, Vite 8, lapisan desain CSS murni |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), jendela tanpa bingkai kustom |
| Backend | Go 1.25 (`toolchain go1.26.5`), pustaka standar + SQLite, layanan federasi dan tata kelola |
| Basis data | SQLite dalam mode WAL (profil beta penulis tunggal), migrasi berversi |
| Inti kripto | Rust (`gaiacore`), penyedia WebAssembly untuk HQC browser, penyedia Tauri native |
| Seluler | Aplikasi Android + binding Go mobile / arsitektur kernel node |
| Lokalisasi | 18 bahasa, tabel terjemahan bersama |

### Desain kriptografi (Sovereign v1)

```text
Key establishment:  X25519  +  ML-KEM-1024  +  HQC-256
Combiner:           length-prefixed secrets → HKDF-SHA3-512
Accelerated AEAD:   Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:    Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                    → XChaCha20-Poly1305 → AES-256-GCM-SIV
Signatures:         Ed25519 transcript signature
Top Secret sigs:    Ed25519 + ML-DSA-87
```

Transkrip yang ditandatangani mengikat versi protokol, rangkaian algoritma yang tepat, identitas
pengirim dan penerima, kunci enkripsi penerima, kunci efemeral, kedua ciphertext KEM, ID pesan,
timestamp, nonce, dan payload terenkripsi. Rangkaian yang tidak dikenal, bukti keyset yang hilang,
tanda tangan Top Secret yang hilang, dan ciphertext HQC yang cacat ditolak secara fail-closed.

**Batas penting:** Sovereign v1 adalah amplop hibrida per pesan, **bukan Triple Ratchet**.
Ia tidak mengiklankan keamanan pasca-kompromi yang diturunkan dari ratchet. Batas tepatnya didokumentasikan
di [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Model jaringan

- Node terfederasi, tanpa server pusat wajib.
- PDU server-ke-server yang ditandatangani untuk federasi.
- Server menyimpan amplop routing, payload/chunk terenkripsi, bidang profil publik, dan metadata
  minimal — tidak pernah plaintext native.
- Penyimpanan objek terenkripsi lokal atau yang kompatibel dengan S3/MinIO.
- TLS wajib di luar pengembangan lokal.

### Persyaratan

| Alat | Versi |
|---|---|
| Node.js | 24.13 (minimum 20.19) |
| npm | instalasi berbasis lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (modul menargetkan 1.25) |
| Rust | stabil (dipin oleh CI untuk inti) |
| Tauri CLI | 2.x untuk pengemasan desktop |
| Python | 3.10+ (skrip repositori/keamanan opsional) |

---

<a id="what-makes-gaiacom-different"></a>
## Apa yang membuat GaiaCom berbeda

Sebagian besar aplikasi pesan "aman" meningkatkan satu lapisan. GaiaCom berusaha membuat seluruh tumpukan koheren:

- **Identitas berdaulat alih-alih akun platform.** Identitas Anda adalah identitas
  kriptografi, bukan baris dalam tabel pengguna milik orang lain. Node berfederasi; mereka tidak memiliki Anda.
- **Pembentukan kunci pasca-kuantum ganda per pesan.** Satu KEM klasik dan dua KEM
  pasca-kuantum independen digabungkan, dengan penolakan downgrade saat profil Sovereign
  dipilih.
- **Enkripsi sebelum transportasi, secara konstruksi.** Klien menyegel konten sebelum mencapai
  jaringan; server merutekan ciphertext dan tidak dapat membacanya.
- **Sosial, surat, file, dan obrolan di bawah satu identitas.** Tanpa akun kedua, tanpa model
  kepercayaan kedua, tanpa platform terpisah yang membocorkan grafik Anda.
- **Terfederasi secara desain.** Tanpa kotak surat pusat wajib, tanpa titik kepercayaan tunggal,
  tanpa kunci baca global.
- **Status UI yang jujur.** Data yang hilang ditampilkan sebagai hilang, bukan diganti dengan angka
  dekoratif atau aktivitas yang dikarang.
- **Batas downgrade yang eksplisit.** SMTP, amplop lama, dan pengiriman browser didokumentasikan
  sebagai batas, bukan disembunyikan di balik bahasa pemasaran.
- **Sumber terbuka, AGPL-3.0-or-later.** Perangkat lunak jaringan tetap dapat diperiksa dan
  kontribusi tetap tersedia bagi komunitas.
- **Dibangun untuk operator.** Tata kelola fail-closed, peristiwa audit, alur kerja penyalahgunaan,
  dan jalur operator node yang terdokumentasi.

---

<a id="build-from-source"></a>
## Bangun dari sumber

### 1. Prasyarat

Instal Node.js 24.13+, Go 1.26.5+, Rust stabil dan — untuk build desktop —
[prasyarat Tauri 2](https://tauri.app/start/prerequisites/) untuk sistem operasi Anda.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Klien web

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Bundel produksi ditulis ke `Frontend/frontend/dist/`.

Untuk pengembangan lokal:

```bash
npm start
# http://127.0.0.1:5173
```

Setel `VITE_API_URL` hanya ke origin backend GaiaCom yang berjalan, misalnya:

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

Jalankan node pengembangan lokal:

```bash
cp .env.example .env
# generate independent secrets for development only
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API mendengarkan pada `SERVER_PORT` (default `8080`). Basis data SQLite dibuat di `DB_PATH`.
Jangan pernah menggunakan rahasia templat di produksi.

### 4. Klien desktop (Tauri 2)

Bangun klien web terlebih dahulu, lalu:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Installer/eksekutabel ditulis di bawah `DesktopClient/src-tauri/target/release/bundle/`.
Untuk build tidak tertandatangani yang cepat tanpa installer:

```bash
cargo tauri build --no-bundle
```

### 5. Inti kriptografi Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opsional)

Build Android memerlukan JDK 17, Android SDK/NDK, dan toolchain yang dipin. Lihat
`Android/` dan `docs/` untuk profil build saat ini. Klien Android adalah bagian dari pohon
sumber beta, bukan rilis toko yang sudah selesai.

---

<a id="become-a-node-operator"></a>
## Menjadi operator node

Node GaiaCom adalah backend terfederasi yang melayani identitas, pesan, kanal, permukaan sosial,
dan penyimpanan bagi penggunanya. Ia dapat berjalan di server Linux biasa.

### Baseline yang direkomendasikan

- Linux x86_64 atau arm64, 64-bit
- 2+ vCPU, 4 GB RAM, 20+ GB SSD untuk node evaluasi (sesuaikan dengan beban nyata Anda)
- Nama DNS khusus, misalnya `node.example.org`
- Sertifikat TLS yang valid (Let's Encrypt berfungsi)
- Relai SMTP **hanya jika** Anda dengan sengaja mengaktifkan jembatan lama
- Cadangan yang benar-benar Anda uji

### 1. Bangun dan pasang

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

Biner rilis menolak berjalan tanpa metadata build yang tidak dapat diubah; jangan menghapus nilai `-X`
tersebut.

### 2. Inisialisasi node

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` menghasilkan rahasia produksi independen, identitas penandatangan node, dan file
konfigurasi. Jaga `/etc/gaiacom/gaiacom.env` pada mode `0600`, dimiliki oleh pengguna layanan.

Pengaturan utama:

| Variabel | Tujuan |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN kanonis node ini; digunakan dalam Gaia ID dan federasi |
| `GAIACOM_DEV_MODE=false` | Mode produksi, perilaku SSRF dan CSP yang ketat |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Rahasia independen 32+ byte |
| `GAIACOM_SERVER_PRIVATE_KEY` | Kunci penandatangan node Ed25519 yang stabil — jangan pernah merotasi secara implisit |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Rahasia derivasi epoch TrustMesh yang stabil |
| `DB_PATH` | Jalur basis data SQLite persisten |
| `GAIACOM_STORAGE_ROOT` | Penyimpanan lampiran terenkripsi di luar web root |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Hanya jika reverse proxy memasok IP klien |

### 3. Bootstrap tata kelola (wajib, fail-closed)

Node baru dengan sengaja tidak memberikan **peran operator apa pun**. Buat identitas pertama melalui
klien, lalu otorisasi Gaia ID yang persis dan sepenuhnya memenuhi syarat itu sebagai operator node:

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

Arahkan backend ke sana dan mulai ulang:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Gunakan hanya Gaia ID yang sepenuhnya memenuhi syarat (`@name:node.example.org`). Tidak ada administrator default
dan tidak ada fallback god-mode.

### 4. Unit systemd

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

### 5. Reverse proxy TLS dan klien web

Sajikan `Frontend/frontend/dist/` yang telah dibangun di belakang reverse proxy TLS dan teruskan API ke
backend pada `127.0.0.1:8080`. Persyaratan minimum:

- TLS 1.2+ (TLS 1.3 dipreferensikan), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Content-Security-Policy yang ketat
- Tanpa daftar direktori, tanpa source map di produksi
- Hanya reverse proxy yang terdaftar di `GAIACOM_TRUSTED_PROXY_CIDRS` yang boleh memasok IP klien yang diteruskan

Konfigurasi contoh sengaja **tidak** disertakan dengan nama host atau sertifikat nyata;
gunakan domain dan jalur sertifikat Anda sendiri.

### 6. Federasi dan operasi

- Umumkan/publikasikan `GAIACOM_SERVER_NAME` kanonis Anda; peer menghubungi Anda melalui HTTPS.
- Federasi menggunakan PDU server-ke-server yang ditandatangani dengan penjaga replay dan perlindungan SSRF.
- Pantau layanan, penggunaan disk, integritas cadangan, dan kedaluwarsa sertifikat.
- Uji pemulihan basis data SQLite dan penyimpanan objek secara rutin.
- Jaga kunci penandatangan node tetap stabil di seluruh pembaruan; merotasinya memutus kepercayaan federasi.
- Jangan menjalankan beberapa proses backend terhadap satu file SQLite. Penskalaan basis data
  horizontal (Postgres, replika active/active) bukan bagian dari profil beta ini.

### Peringatan operator node

- Perangkat lunak beta; tanpa klaim HA; jendela pemeliharaan dan mulai ulang diperlukan.
- Konten yang ditata kelola dan alur kerja penyalahgunaan berlingkup kebijakan per node dalam beta ini.
- Pembaruan otomatis desktop dinonaktifkan sampai ada updater yang ditandatangani.
- Relai SMTP memerlukan TLS terautentikasi plus SPF, DKIM, dan kebijakan DMARC yang menegakkan. Pesan
  yang meninggalkan GaiaCom native tidak tercakup oleh jaminan E2EE native.
- Anda bertanggung jawab atas cadangan, rahasia, TLS, DNS, penanganan penyalahgunaan, dan hukum lokal.

---

<a id="security-and-audit-status"></a>
## Status keamanan dan audit

### Apa yang telah dilakukan

- Tinjauan keamanan mendalam berbantuan AI di seluruh backend, frontend, federasi, penyimpanan,
  autentikasi, otorisasi, serta batas desktop dan browser.
- Gerbang keamanan statis, rangkaian pengujian adversarial, pemeriksaan higiene dependensi dan rahasia.
- Invarian keamanan eksplisit: tanpa plaintext di sisi server, tanpa ekspor kunci privat, tanpa
  endpoint penyamaran, tanpa bypass E2EE, tanpa kunci baca global.
- Default fail-closed untuk tata kelola, validasi rahasia, dan negosiasi protokol.
- Verifikasi langsung nyata atas permukaan produk dan alur UI selama pengembangan.

### Apa yang **belum** dilakukan

- **Tidak ada audit kriptografi pihak ketiga yang independen.**
- Tidak ada verifikasi formal atas protokol atau implementasinya.
- Tidak ada jaminan bahwa kerentanan yang tidak diketahui tidak ada.
- Tidak ada sertifikasi tingkat pemerintah atau jaminan tinggi.
- Perilaku runtime bergantung pada node, browser, sistem operasi, dan keamanan perangkat
  pengguna sendiri.

### Pelaporan

Laporkan kerentanan secara privat:

- Email: **security@gaiacom.de**
- Jangan membuka issue publik untuk kerentanan yang aktif.
- Sertakan komponen yang terdampak, versi/commit, langkah reproduksi, dan perilaku yang diharapkan/diamati.
- Jangan menguji terhadap node atau data orang lain, dan jangan menjalankan serangan yang merusak.

Lihat [SECURITY.md](SECURITY.md) untuk kebijakan lengkap dan [docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md)
untuk batas beta saat ini.

### Penggunaan jaminan tinggi

Jika Anda memerlukan sistem yang melindungi nyawa, kebebasan, atau data yang diatur, beta ini **bukan**
sistem tersebut untuk saat ini. Audit independen, build yang dapat direproduksi, rilis bertanda tangan,
rantai pembaruan terverifikasi, manajemen kunci operasional, dan respons insiden masih diperlukan.

---

<a id="project-structure"></a>
## Struktur proyek

```text
GaiaCom/
├── Backend/                  Go API, federation, governance, storage, security
├── Frontend/frontend/        React web client and PWA
├── DesktopClient/src-tauri/  Tauri 2 desktop shell
├── Android/                  Android node/client architecture
├── Core/rust/gaiacore/       Rust cryptographic core
├── SovereignCryptoCore/      Rust crypto library
├── SovereignCryptoWasm/      Browser WASM crypto provider
├── docs/                     Architecture, node operation, beta boundaries, screenshots
├── assets/brand/             GaiaCom logo and brand assets
├── SECURITY.md               Security policy and disclosure
├── SOVEREIGN_CRYPTO.md       Cryptographic design and boundaries
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Berkontribusi

Kontribusi diterima jika menjaga invarian keamanan dan menjaga klaim tetap jujur.

- Baca [CONTRIBUTING.md](CONTRIBUTING.md) terlebih dahulu.
- Jaga batas zero-trust: tanpa plaintext di sisi server, tanpa ekspor kunci privat, tanpa bypass E2EE.
- Tambahkan pengujian untuk perilaku yang relevan dengan keamanan.
- Jangan pernah meng-commit rahasia, data pengguna nyata, kunci privat, basis data, atau artefak build.
- Jangan melemahkan gerbang keamanan agar build lolos.
- Laporkan kerentanan secara privat, bukan di pull request.

Dengan berpartisipasi, Anda menyetujui [Code of Conduct](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Lisensi

GaiaCom dilisensikan di bawah **GNU Affero General Public License v3.0 atau lebih baru**
(AGPL-3.0-or-later). Lihat [LICENSE](LICENSE).

Operator jaringan yang menjalankan perangkat lunak GaiaCom yang dimodifikasi harus menyediakan sumber
yang sesuai sebagaimana disyaratkan oleh AGPL. Komponen pihak ketiga dan lisensinya tercantum dalam
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dan dalam manifes paket masing-masing.

GaiaCom dan logo GaiaCom adalah merek dagang VisionGaiaTechnology. Lisensi AGPL tidak
memberikan hak merek dagang.

---

<div align="center">

**VisionGaiaTechnology — Departemen Keamanan yang Tidak Perlu™**

*Komunikasi berdaulat, dibangun secara terbuka.*

[Situs web](https://gaiacom.de) · [Keamanan](SECURITY.md) · [Arsitektur](docs/ARCHITECTURE.md)

</div>
