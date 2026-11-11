[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · **Türkçe** · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Egemen Kuantum Sonrası İletişim" />

# GaiaCom

### Egemen kuantum sonrası iletişim altyapısı

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Hibrit kuantum sonrası tasarıma sahip, federe ve istemci tarafında şifrelenmiş bir iletişim platformu.**

</div>

> **VisionGaiaTechnology — Gereksiz Güvenlik Departmanı™**
>
> Kanıtlayamayacağı bir güven talep etmeyen iletişim altyapısı inşa ediyoruz. Bu departman,
> anahtarları bir başkası tuttuğu anda tam olarak «gereksiz» güvenliğin gerekli hale gelmesi
> nedeniyle var.

---

## Menü

[Genel Bakış](#overview) · [VGT Licence](#vgt-licence) · [Beta V3](#beta-v3) · [Ekran Görüntüleri](#screenshots) · [Özellikler](#features) · [Teknik Bilgiler](#technical-information) · [GaiaCom'u Farklı Kılan Nedir](#what-makes-gaiacom-different) · [Kaynaktan Derleme](#build-from-source) · [Düğüm Operatörü Olun](#become-a-node-operator) · [Güvenlik ve Denetim Durumu](#security-and-audit-status) · [Proje Yapısı](#project-structure) · [Katkıda Bulunma](#contributing) · [Lisans](#license)

---

<a id="overview"></a>
## Genel Bakış

Günümüzün iletişim yığınları kuantum sonrası bir dünya için tasarlanmamıştır. Mesajlaşma
uygulamaları güveni tek bir sağlayıcıda merkezileştirir, klasik e-posta tasarımı gereği hiçbir
zaman gizli olmamıştır ve çoğu platform aktardığı her şeyin okunabilir bir kopyasını saklar.

**GaiaCom, güvenli iletişimi egemen altyapı olarak yeniden tanımlar.**

Federe bir ağı, istemci tarafında uçtan uca şifrelemeyi, sürümlendirilmiş hibrit kuantum sonrası
bir zarfı, şifrelenmiş sosyal kanalları, şifrelenmiş dosya depolamayı ve düğüm operatörleri için
bir yönetişim katmanını — web, masaüstü ve mobilde tek bir kimlik altında birleştirir.

Temel kural kasıtlı olarak kısadır:

```text
Sunucu yönlendirebilir, depolayabilir, hız sınırlaması uygulayabilir, denetleyebilir ve politika uygulayabilir.
Sunucu hiçbir zaman yerel özel içeriğin şifresini çözme yeteneğini almamalıdır.
```

GaiaCom mutlak güvenlik iddiası **değildir**. Güven sınırlarını açık, test edilebilir ve — mümkün
olduğu yerlerde — matematiksel olarak zorunlu kılma girişimidir.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom 3 sürüm hâlinde sunulmaktadır:

**Tek protokol. Üç işletim modeli.**

### Business — GaiaCom Enterprise

Şirketler, hukuk büroları, KOBİ'ler, sanayi ve özel bankacılık için. Yönetimsel kontrollere ve desteğe sahip kapalı iletişim çevreleri.

- İç egemenlik ve kullanıcı yönetimi
- Kendi sunucunuzda barındırma veya yönetilen egemen küme
- SLA, destek ve premium modüller

### Public — GaiaCom Network

Dijital gizlilik için açık ağ. Veri ticareti içermez, sadece özgür ve şifreli iletişim için bir altyapıdır.

- Açık kaynak kodlu istemci uygulaması
- Federe düğümler
- Merkezi şifre çözme anahtarı barındırmaz

### Government — GaiaCom Defend

Resmi makamlar, kritik altyapılar ve izole iletişim kanalları için yüksek güvenlikli özel altyapı.

- İnternetten tamamen izole (air-gapped) kurulumlar
- Özel markalama (white-label) ve kaynak kod denetimi
- Ulusal dijital egemenlik

> **Mevcut test sürümü ve ticari lisans gereksinimi (Çift Lisanslama)**
>
> Bu depoda şu anda test edilen sürüm, açık kaynak **AGPL-3.0-or-later** lisansı altındaki halka açık **GaiaCom Network** sürümüdür (Beta V3, bkz. [LICENSE](LICENSE)). Açık kaynak lisansı kapsamında `GaiaCom Network` üzerinde yapılan her türlü ağ işletimi veya değişiklik AGPL copyleft ve kaynak kod paylaşım yükümlülüklerine tabidir (ticari marka hakları, SLA veya Enterprise/Defend modülleri kapsam dışıdır).
>
> **Şirketler ve resmî kurumlar için sistem ücretsiz değildir.** GaiaCom'u şirketlerinde (**GaiaCom Enterprise**) ya da devlet kurumları ve kritik altyapılarda (**GaiaCom Defend**) kullanmak isteyenler — AGPL kaynak paylaşım yükümlülüğü olmaksızın kapalı veya canlı kurulumlar, Enterprise/Defend modülleri, yönetilen egemen kümeler, özel markalama (white labeling), kaynak kod denetimi veya SLA/destek dâhil — ticari bir **VGT Licence** edinmeli ve tercihen şifreli başvuru formu üzerinden VisionGaiaTechnology ile iletişime geçmelidir:
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 herkese açık bir teknik betadır. Buna göre değerlendirin.**

- **Durum:** Beta V3, sürüm `3.0.2`.
- **Henüz bağımsız bir kriptografik denetim tamamlanmamıştır.** Kuantum sonrası tasarım, protokol
  uygulamaları ve kriptografik sınırlar bağımsız bir üçüncü taraf kriptografi laboratuvarı
  tarafından **incelenmemiştir**.
- Mimari, kimlik doğrulama, yetkilendirme, federasyon, depolama, tarayıcı ve masaüstü sınırları
  genelinde **derinlemesine, yapay zekâ destekli güvenlik denetimleri** gerçekleştirdik. Bu
  denetimler gerçek sorunları tespit etti ve düzeltti. Ancak bunlar **güvenlik kanıtı değildir**.
- **Bilinmeyen güvenlik açıkları hâlâ mevcut olabilir** — protokol tasarımında, uygulamada,
  bağımlılıklarda, çalışma ortamında veya kullanıcının kendi cihazında.
- Kriptografide fark edilmeyecek şekilde hata yapmak kolaydır. Bozuk varsayımlar testlerde her
  zaman görünmez. Algoritma adlarını güvenlik garantisi olarak görmeyin.
- Bu betada **GaiaCom'u hayati önem taşıyan, yasal olarak düzenlenmiş, yüksek değerli veya geri
  döndürülemez iletişimler için kullanmayın**. Önemli seed ve verilerin bağımsız yedeklerini
  saklayın.
- Beta sürümleri arasında geriye dönük uyumsuz protokol ve API değişiklikleri meydana gelebilir.
  Veri kaybı mümkündür.
- Bir web istemcisi, şifreleme gerçekleşmeden önce ele geçirilmiş bir düğüm tarafından
  değiştirilebilir. Bu nedenle yüksek güvenceli profil, güvenilir ve bağımsız olarak derlenmiş yerel
  istemciler gerektirir.
- SMTP köprülemesi kasıtlı bir güvenlik düşürme (downgrade) sınırıdır. Yerel GaiaCom güvenlik
  alanından çıkan iletiler yalnızca eski (legacy) yolun izin verdiği ölçüde korunur.

Bir güvenlik sorunu bulursanız lütfen bunu gizli olarak bildirin — bkz. [SECURITY.md](SECURITY.md).
Lütfen aktif istismar (exploit) ayrıntılarını herkese açık şekilde yayınlamayın.

---

<a id="screenshots"></a>
## Ekran Görüntüleri

Tüm ekran görüntüleri 2560 × 1440 çözünürlüğündeki GaiaCom 3.0.2 sürümündendir. Gösterilen
arayüz güncel VGT Aurora tasarımıdır; ekran görüntüleri yalnızca herkese açık ürün yüzeylerini ve
herkese açık federasyon içeriklerini içerir.

| Açılış sayfası | Kimlik ve erişim |
|---|---|
| ![Açılış sayfası](docs/screenshots/landing.png) | ![Kimlik doğrulama penceresi](docs/screenshots/auth.png) |
| **Herkese Açık Kanallar — keşif** | **Herkese Açık Kanallar — kanal görünümü** |
| ![Kanal keşfi](docs/screenshots/channels-discovery.png) | ![Kanal görünümü](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Özellikler

### Kimlik ve erişim

- **Kendi kendini yöneten Gaia ID kimliği** — `@name:node.example.org`, yerel olarak üretilen bir
  seed'den türetilir. Özel anahtarlar cihazda kalır.
- Açık kilit açma, oturum kilidi ve yapılandırılabilir otomatik kilit içeren **yerel anahtar kasası**.
- QR/tek kullanımlık eşleştirme akışları aracılığıyla **çoklu cihaz eşleştirme**, ayrıca cihaz
  listeleme ve yetki iptali.
- Bir kişinin kimlik anahtarı değiştiğinde **anahtar geçmişi ve değişiklik uyarıları**.
- Açık, yazılı olarak saklanan bir kurtarma seed'i ile **kurtarma akışları**; sunucu tarafında
  hiçbir kurtarma arka kapısı yoktur.
- Canlı dil değiştiriciye sahip **18 arayüz dili** (açılış sayfası, kimlik doğrulama, çalışma alanı).

### Mesajlaşma

- **Quantum Chat** — istemci tarafında şifreleme, yanıtlar, tepkiler, sabitleme, arama, ekler,
  sesli notlar ve şifrelenmiş görsel önizlemeleri ile birebir sohbetler.
- **Grup Sohbetleri** — kanallar, roller, moderasyon, üye yönetimi, yavaş mod, salt okunur
  kanallar, katılma istekleri, davetler, denetim olayları ve şifrelenmiş dışa aktarma içeren odalar.
- **Tepkiler** — kalp odaklı tepki denetimi: tam paleti açmak için masaüstünde üzerine gelin veya
  dokunmatik ekranda uzun basın; yalnızca bir tepki size ait olarak gösterilir.
- **Sahte durumlar yok** — ileti, tepki, çevrimiçi durumu ve etkinlik değerleri gerçek arka uçtan
  gelir veya kullanılamaz olarak gösterilir. GaiaCom sayaç uydurmaz.

### GaiaMail

- Sohbetle aynı kriptografik kimlik içinde e-posta.
- GaiaCom kimlikleri arasında yerel GaiaMail.
- Eski kişiler için **SMTP köprüsü** — yerel E2EE'den açıkça ayrılmıştır ve yalnızca eski yolun
  izin verdiği ölçüde korunur.
- İmzalar, klasörler, filtreler ve etiketler yerel olarak işlenir.

### GSN Social

GaiaCom'un sosyal katmanı ayrı bir hesaba sahip ayrı bir platform değildir. Egemen kimliğinizi
yeniden kullanır:

- **Ana akış**, **Keşfet**, **Ağım**, **Mesajlar**, **Bildirimler**, **Gruplar**, **Kanallar** ve
  **GSN Cloud** (GaiaDrive entegrasyonu).
- Gerçek gönderilerden hesaplanan gönderiler, şifrelenmiş görseller, yorumlar, tepkiler, yeniden
  paylaşımlar ve etiket (hashtag) trendleri.
- Gerçek federasyon etkileşimlerinden türetilen takipçiler, takip edilenler ve önerilen kişiler.
- Abonelikler, keşif, kategoriler, medya, yorumlar ve moderasyon ile yayın tarzı iletişim için
  **Herkese Açık Kanallar**.

### Dosyalar, kasa ve güvenlik merkezi

- **GaiaDrive** — aynı kimliğe bağlı şifrelenmiş dosya depolama ve paylaşımı.
- **GaiaDrop** — hesap gerektirmeden harici göndericilerden şifrelenmiş dosyalar alın.
- **GaiaVault** — gizli veriler ve anahtarlar için mühürlü yerel depolama.
- **Güvenlik Merkezi** — gerçek cihaz, oturum, anahtar ve güvenlik olayı durumu; ayrıca yönetişim
  ve kötüye kullanım iş akışları.

### Yönetişim ve operasyonlar

- Düğüm operatörü, kıdemli inceleyici ve güvenilir inceleyici rolleri.
- Fail-closed yönetişim önyüklemesi: yeni kurulan bir düğüm varsayılan olarak **hiçbir** operatör
  rolü vermez.
- Kötüye kullanım bildirimi, moderasyon, şeffaflık yüzeyleri ve yalnızca eklemeli (append-only)
  denetim olayları.
- Tekrar (replay) koruması ve SSRF sınırlarıyla imzalanmış sunucudan sunucuya PDU'lar üzerinden
  federasyon.

### Masaüstü ve mobil

- Güçlendirilmiş CSP'ye sahip ve CDN üzerinden kod sunmayan **Web/PWA** istemcisi.
- Yerel pencere denetimlerine sahip ve açık bir izin listesi dışında hiçbir yerel komut izni
  vermeyen Windows, Linux ve macOS için **Tauri 2 masaüstü istemcisi**.
- Yerel kripto çekirdeği ve platform bağlayıcılarına (bindings) sahip **Android** düğüm/istemci
  mimarisi.

---

<a id="technical-information"></a>
## Teknik Bilgiler

### Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Web istemcisi | React 18, Vite 8, saf CSS tasarım katmanları |
| Masaüstü | Tauri 2 (Rust + WebView2/WebKit), özel çerçevesiz pencere |
| Arka uç (Backend) | Go 1.25 (`toolchain go1.26.5`), standart kütüphane + SQLite, federasyon ve yönetişim servisleri |
| Veritabanı | WAL modunda SQLite (tek yazıcılı beta profili), sürümlü geçişler |
| Kripto çekirdeği | Rust (`gaiacore`), tarayıcı HQC için WebAssembly sağlayıcısı, yerel Tauri sağlayıcısı |
| Mobil | Android uygulaması + Go mobil bağlayıcıları / düğüm çekirdeği mimarisi |
| Yerelleştirme | 18 dil, paylaşılan çeviri tabloları |

### Kriptografik Tasarım (Sovereign v1)

```text
Anahtar oluşturma:     X25519  +  ML-KEM-1024  +  HQC-256
Birleştirici:          uzunluk ön ekli gizli değerler → HKDF-SHA3-512
Hızlandırılmış AEAD:   Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:       Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                       → XChaCha20-Poly1305 → AES-256-GCM-SIV
İmzalar:               Ed25519 transkript imzası
Top Secret imzalar:    Ed25519 + ML-DSA-87
```

İmzalı transkript; protokol sürümünü, tam algoritma paketini, gönderen ve alıcı kimliklerini,
alıcının şifreleme anahtarını, geçici (ephemeral) anahtarı, her iki KEM şifreli metnini, ileti
kimliğini, zaman damgasını, nonce değerini ve şifrelenmiş yükü birbirine bağlar. Bilinmeyen
paketler, eksik anahtar kümesi kanıtları, eksik Top Secret imzaları ve hatalı biçimlendirilmiş HQC
şifreli metinleri fail-closed olarak reddedilir.

**Önemli sınır:** Sovereign v1 ileti başına hibrit bir zarftır, **Triple Ratchet değildir**.
Ratchet kaynaklı ihlal sonrası güvenlik (post-compromise security) vadetmez. Kesin sınır
[SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md) dosyasında belgelenmiştir.

### Ağ Modeli

- Federe düğümler, zorunlu merkezi sunucu yok.
- Federasyon için imzalı sunucudan sunucuya PDU'lar.
- Sunucu yönlendirme zarflarını, şifrelenmiş yükleri/parçaları, herkese açık profil alanlarını ve
  asgari meta verileri depolar — hiçbir zaman yerel düz metin saklamaz.
- Yerel veya S3/MinIO uyumlu şifrelenmiş nesne depolama.
- Yerel geliştirme dışında TLS zorunludur.

### Gereksinimler

| Araç | Sürüm |
|---|---|
| Node.js | 24.13 (en az 20.19) |
| npm | lockfile tabanlı kurulum (`npm ci`) |
| Go | 1.26.5 araç zinciri (modül 1.25'i hedefler) |
| Rust | stable (çekirdek için CI tarafından sabitlenmiştir) |
| Tauri CLI | masaüstü paketleme için 2.x |
| Python | 3.10+ (isteğe bağlı depo/güvenlik betikleri) |

---

<a id="what-makes-gaiacom-different"></a>
## GaiaCom'u Farklı Kılan Nedir

Çoğu "güvenli" mesajlaşma uygulaması tek bir katmanı iyileştirir. GaiaCom tüm yığını tutarlı hale
getirmeye çalışır:

- **Platform hesapları yerine egemen kimlik.** Kimliğiniz başka birinin kullanıcı tablosundaki bir
  satır değil, kriptografik bir kimliktir. Düğümler federe olur; size sahip olmazlar.
- **İleti başına çift kuantum sonrası anahtar oluşturma.** Bir klasik ve iki bağımsız kuantum
  sonrası KEM birleştirilir; Sovereign profili seçildiğinde sürüm düşürme reddedilir.
- **Tasarım gereği aktarımdan önce şifreleme.** İstemci, içeriği ağa ulaşmadan önce mühürler;
  sunucu şifreli metni yönlendirir ve okuyamaz.
- **Sosyal ağ, e-posta, dosyalar ve sohbet tek kimlik altında.** İkinci bir hesap yok, ikinci bir
  güven modeli yok, sosyal grafiğinizi sızdıracak ayrı bir platform yok.
- **Tasarım gereği federe.** Zorunlu merkezi posta kutusu yok, tek bir güven noktası yok, küresel
  okuma anahtarı yok.
- **Dürüst arayüz durumları.** Eksik veriler, süslü sayılar veya uydurulmuş etkinliklerle
  değiştirilmez, eksik olarak gösterilir.
- **Açık downgrade sınırları.** SMTP, eski zarflar ve tarayıcı üzerinden dağıtım, pazarlama
  dilinin arkasına gizlenmek yerine sınırlar olarak belgelenir.
- **Açık kaynak, AGPL-3.0-or-later.** Ağ yazılımı denetlenebilir kalır ve katkılar topluluk
  için erişilebilir olmaya devam eder.
- **Operatörler için inşa edildi.** Fail-closed yönetişim, denetim olayları, kötüye kullanım iş
  akışları ve belgelenmiş bir düğüm operatörü yolu.

---

<a id="build-from-source"></a>
## Kaynaktan Derleme

### 1. Önkoşullar

İşletim sisteminiz için Node.js 24.13+, Go 1.26.5+, Rust stable ve — masaüstü derlemeleri için —
[Tauri 2 önkoşullarını](https://tauri.app/start/prerequisites/) kurun.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Web istemcisi

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Üretim paketi `Frontend/frontend/dist/` dizinine yazılır.

Yerel geliştirme için:

```bash
npm start
# http://127.0.0.1:5173
```

`VITE_API_URL` değişkenini yalnızca çalışan bir GaiaCom arka ucunun kaynağına ayarlayın, örneğin:

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. Arka uç (Backend)

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

Yerel bir geliştirme düğümü çalıştırın:

```bash
cp .env.example .env
# yalnızca geliştirme için bağımsız gizli anahtarlar üretin
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API, `SERVER_PORT` (varsayılan `8080`) üzerinde dinler. SQLite veritabanı `DB_PATH` konumunda
oluşturulur. Şablon gizli anahtarlarını hiçbir zaman üretim ortamında kullanmayın.

### 4. Masaüstü istemcisi (Tauri 2)

Önce web istemcisini derleyin, ardından:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Yükleyiciler/çalıştırılabilir dosyalar `DesktopClient/src-tauri/target/release/bundle/` altında
oluşturulur. Yükleyicisiz hızlı ve imzasız bir derleme için:

```bash
cargo tauri build --no-bundle
```

### 5. Rust kriptografik çekirdeği

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (isteğe bağlı)

Android derlemeleri JDK 17, Android SDK/NDK ve sabitlenmiş araç zinciri gerektirir. Güncel derleme
profili için `Android/` ve `docs/` dizinlerine bakın. Android istemcisi beta kaynak ağacının bir
parçasıdır, tamamlanmış bir mağaza sürümü değildir.

---

<a id="become-a-node-operator"></a>
## Düğüm Operatörü Olun

Bir GaiaCom düğümü, kullanıcıları için kimlikleri, iletileri, kanalları, sosyal yüzeyleri ve
depolamayı sunan federe arka uçtur. Sıradan bir Linux sunucusunda çalıştırılabilir.

### Önerilen temel yapılandırma

- Linux x86_64 veya arm64, 64 bit
- Değerlendirme düğümü için 2+ vCPU, 4 GB RAM, 20+ GB SSD (gerçek yükünüze göre boyutlandırın)
- Özel bir DNS adı, örn. `node.example.org`
- Geçerli bir TLS sertifikası (Let's Encrypt çalışır)
- **Yalnızca** eski köprüyü bilerek etkinleştirirseniz bir SMTP rölesi
- Gerçekten test ettiğiniz yedeklemeler

### 1. Derleme ve kurulum

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

Sürüm ikili dosyaları değişmez derleme meta verileri olmadan başlamayı reddeder; bu `-X`
değerlerini çıkarmayın.

### 2. Düğümü başlatma

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` komutu bağımsız üretim gizli anahtarlarını, düğüm imzalama kimliğini ve yapılandırma
dosyasını oluşturur. `/etc/gaiacom/gaiacom.env` dosyasını hizmet kullanıcısına ait olacak şekilde
`0600` izin modunda tutun.

Temel ayarlar:

| Değişken | Amaç |
|---|---|
| `GAIACOM_SERVER_NAME` | Bu düğümün kurallı FQDN'i; Gaia ID'lerde ve federasyonda kullanılır |
| `GAIACOM_DEV_MODE=false` | Üretim modu, katı SSRF ve CSP davranışı |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | 32+ baytlık bağımsız gizli anahtarlar |
| `GAIACOM_SERVER_PRIVATE_KEY` | Kararlı Ed25519 düğüm imzalama anahtarı — asla örtülü olarak döndürmeyin |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Kararlı TrustMesh dönem türetme gizli anahtarı |
| `DB_PATH` | Kalıcı SQLite veritabanı yolu |
| `GAIACOM_STORAGE_ROOT` | Web kök dizini dışında şifrelenmiş ek depolama alanı |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Yalnızca bir ters vekil sunucu istemci IP'lerini iletiyorsa |

### 3. Yönetişim önyüklemesi (zorunlu, fail-closed)

Yeni bir düğüm kasıtlı olarak **hiçbir** operatör rolü vermez. İlk kimliği istemci üzerinden
oluşturun, ardından tam olarak o tam nitelikli Gaia ID'yi düğüm operatörü olarak yetkilendirin:

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

Arka ucu buna yönlendirin ve yeniden başlatın:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Yalnızca tam nitelikli Gaia ID'ler (`@name:node.example.org`) kullanın. Varsayılan yönetici ve
sınırsız yetki (god-mode) yedeği yoktur.

### 4. Systemd birimi

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

### 5. TLS ters vekil sunucusu ve web istemcisi

Derlenen `Frontend/frontend/dist/` çıktısını bir TLS ters vekil sunucusunun arkasından sunun ve
API'yi `127.0.0.1:8080` üzerindeki arka uca yönlendirin. Asgari gereksinimler:

- TLS 1.2+ (tercihen TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Katı bir Content-Security-Policy
- Üretim ortamında dizin listelemesi yok, source map yok
- Yalnızca `GAIACOM_TRUSTED_PROXY_CIDRS` içinde listelenen ters vekil sunucular yönlendirilen
  istemci IP'lerini sağlayabilir

Örnek bir yapılandırma kasıtlı olarak gerçek ana bilgisayar adları veya sertifikalarla **birlikte
dağıtılmaz**; kendi alan adınızı ve sertifika yollarınızı kullanın.

### 6. Federasyon ve işletim

- Kurallı `GAIACOM_SERVER_NAME` değerinizi duyurun/yayınlayın; eşler sizinle HTTPS üzerinden
  iletişim kurar.
- Federasyon, tekrar (replay) korumaları ve SSRF koruması içeren imzalı sunucudan sunucuya PDU'lar
  kullanır.
- Hizmeti, disk kullanımını, yedekleme bütünlüğünü ve sertifika son kullanma tarihlerini izleyin.
- SQLite veritabanı ve nesne depolama geri yüklemelerini düzenli olarak test edin.
- Düğüm imzalama anahtarını güncellemeler boyunca sabit tutun; döndürmek federasyon güvenini bozar.
- Aynı SQLite dosyasına karşı birden fazla arka uç süreci çalıştırmayın. Yatay veritabanı ölçekleme
  (Postgres, aktif/aktif çoğaltmalar) bu beta profilinin bir parçası değildir.

### Düğüm operatörü uyarıları

- Beta yazılımdır; yüksek erişilebilirlik (HA) iddiası yoktur; bakım pencereleri ve yeniden
  başlatmalar gereklidir.
- Bu betada yönetilen içerik ve kötüye kullanım iş akışları düğüm başına politika kapsamındadır.
- İmzalı bir güncelleyici mevcut olana kadar masaüstü otomatik güncellemeleri devre dışıdır.
- SMTP rölesi, SPF, DKIM ve zorlayıcı bir DMARC politikasına ek olarak kimliği doğrulanmış TLS
  gerektirir. Yerel GaiaCom'dan ayrılan iletiler yerel E2EE garantileri kapsamında değildir.
- Yedeklemelerden, gizli anahtarlardan, TLS'den, DNS'den, kötüye kullanım yönetiminden ve yerel
  yasalardan siz sorumlusunuz.

---

<a id="security-and-audit-status"></a>
## Güvenlik ve Denetim Durumu

### Yapılanlar

- Arka uç, ön uç, federasyon, depolama, kimlik doğrulama, yetkilendirme, masaüstü ve tarayıcı
  sınırları genelinde derinlemesine, yapay zekâ destekli güvenlik incelemeleri.
- Statik güvenlik kapıları, çekişmeli (adversarial) test paketleri, bağımlılık ve gizli anahtar
  hijyeni denetimleri.
- Açık güvenlik değişmezleri (invariants): sunucu tarafında düz metin yok, özel anahtar dışa
  aktarımı yok, kimliğe bürünme uç noktası yok, E2EE atlatma yok, küresel okuma anahtarı yok.
- Yönetişim, gizli anahtar doğrulaması ve protokol müzakeresi için fail-closed varsayılanlar.
- Geliştirme sırasında ürün yüzeylerinin ve kullanıcı arayüzü akışlarının gerçek canlı doğrulaması.

### Yapıl**ma**yanlar

- **Bağımsız üçüncü taraf kriptografik denetim yok.**
- Protokolün veya uygulamaların biçimsel (formal) doğrulaması yok.
- Bilinmeyen güvenlik açıklarının bulunmadığına dair hiçbir garanti yok.
- Devlet düzeyinde veya yüksek güvenceli sertifikasyon yok.
- Çalışma zamanı davranışı düğüme, tarayıcıya, işletim sistemine ve kullanıcının kendi cihaz
  güvenliğine bağlıdır.

### Bildirim

Lütfen güvenlik açıklarını gizli olarak bildirin:

- E-posta: **security@gaiacom.de**
- Aktif bir güvenlik açığı için herkese açık bir sorun (issue) açmayın.
- Etkilenen bileşeni, sürümü/commit'i, yeniden oluşturma adımlarını ve beklenen/gözlenen davranışı
  ekleyin.
- Lütfen başka kişilerin düğümlerine veya verilerine karşı test yapmayın ve yıkıcı saldırılar
  gerçekleştirmeyin.

Tam politika için [SECURITY.md](SECURITY.md) dosyasına ve mevcut beta sınırları için
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) dosyasına bakın.

### Yüksek güvenceli kullanım

Yaşamı, özgürlüğü veya düzenlemeye tabi verileri koruyan bir sisteme ihtiyacınız varsa, bu beta
**henüz** o sistem değildir. Bağımsız denetimler, tekrarlanabilir derlemeler, imzalı sürümler,
doğrulanmış güncelleme zincirleri, operasyonel anahtar yönetimi ve olay müdahalesi hâlâ
gereklidir.

---

<a id="project-structure"></a>
## Proje Yapısı

```text
GaiaCom/
├── Backend/                  Go API, federasyon, yönetişim, depolama, güvenlik
├── Frontend/frontend/        React web istemcisi ve PWA
├── DesktopClient/src-tauri/  Tauri 2 masaüstü kabuğu
├── Android/                  Android düğüm/istemci mimarisi
├── Core/rust/gaiacore/       Rust kriptografik çekirdeği
├── SovereignCryptoCore/      Rust kripto kütüphanesi
├── SovereignCryptoWasm/      Tarayıcı WASM kripto sağlayıcısı
├── docs/                     Mimari, düğüm işletimi, beta sınırları, ekran görüntüleri
├── assets/brand/             GaiaCom logosu ve marka varlıkları
├── SECURITY.md               Güvenlik politikası ve bildirim
├── SOVEREIGN_CRYPTO.md       Kriptografik tasarım ve sınırlar
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Katkıda Bulunma

Güvenlik değişmezlerini koruyan ve iddiaları dürüst tutan katkılar memnuniyetle karşılanır.

- Önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.
- Sıfır güven (zero-trust) sınırını koruyun: sunucu tarafında düz metin yok, özel anahtar dışa
  aktarımı yok, E2EE atlatma yok.
- Güvenlikle ilgili davranışlar için testler ekleyin.
- Gizli anahtarları, gerçek kullanıcı verilerini, özel anahtarları, veritabanlarını veya derleme
  çıktılarını asla commit etmeyin.
- Bir derlemenin geçmesini sağlamak için güvenlik kapılarını zayıflatmayın.
- Güvenlik açıklarını pull request'lerde değil, gizli olarak bildirin.

Katılarak [Davranış Kuralları](CODE_OF_CONDUCT.md)'nı kabul etmiş olursunuz.

---

<a id="license"></a>
## Lisans

GaiaCom **çift lisanslama modelini** uygular (bkz. [VGT Licence](#vgt-licence)): halka
açık kaynak kod tabanı (`GaiaCom Network`), **GNU Affero General Public License v3.0 or
later** (AGPL-3.0-or-later) altında lisanslanmıştır — bkz. [LICENSE](LICENSE). Şirketlerde
(**GaiaCom Enterprise**), devlet kurumlarında (**GaiaCom Defend**) veya AGPL kaynak kod
paylaşım yükümlülüğü olmaksızın kapalı/ticari kurulumlarda (premium modüller, SLA/destek,
white labeling ve air-gapped ortamlar dâhil) sistem **ücretsiz değildir** ve
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink) üzerinden ticari bir **VGT Licence** gerektirir.

AGPL kapsamında değiştirilmiş GaiaCom açık kaynak yazılımını çalıştıran ağ operatörleri,
AGPL'nin gerektirdiği şekilde ilgili kaynak kodunu kullanıma sunmalıdır. Üçüncü taraf
bileşenler ve lisansları [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dosyasında ve
ilgili paket bildirimlerinde listelenmiştir.

GaiaCom ve GaiaCom logosu VisionGaiaTechnology'nin ticari markalarıdır. AGPL lisansı
ticari marka hakları vermez.

---

<div align="center">

**VisionGaiaTechnology — Gereksiz Güvenlik Departmanı™**

*Açıkta inşa edilen egemen iletişim.*

[Web Sitesi](https://gaiacom.de) · [Güvenlik](SECURITY.md) · [Mimari](docs/ARCHITECTURE.md)

</div>
