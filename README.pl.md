[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · **Polski** · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Suwerenna komunikacja postkwantowa" />

# GaiaCom

### Suwerenna infrastruktura komunikacji postkwantowej

[![Wersja](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![Licencja](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platforma](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stos](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Kryptografia](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audyt](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Strona internetowa](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Sfederowana, szyfrowana po stronie klienta platforma komunikacyjna o hybrydowej konstrukcji postkwantowej.**

</div>

> **VisionGaiaTechnology — Departament Zbędnego Bezpieczeństwa™**
>
> Budujemy infrastrukturę komunikacyjną, która nie wymaga zaufania, jakiego nie potrafi udowodnić.
> Departament istnieje dlatego, że „zbędne” bezpieczeństwo jest dokładnie tym, co staje się
> niezbędne w chwili, gdy ktoś inny trzyma klucze.

---

## Menu

[Przegląd](#overview) · [VGT Licence](#vgt-licence) · [Beta V3](#beta-v3) · [Zrzuty ekranu](#screenshots) · [Funkcje](#features) · [Informacje techniczne](#technical-information) · [Co wyróżnia GaiaCom](#what-makes-gaiacom-different) · [Kompilacja ze źródeł](#build-from-source) · [Zostań operatorem węzła](#become-a-node-operator) · [Status bezpieczeństwa i audytu](#security-and-audit-status) · [Struktura projektu](#project-structure) · [Współpraca](#contributing) · [Licencja](#license)

---

<a id="overview"></a>
## Przegląd

Dzisiejsze stosy komunikacyjne nie zostały zaprojektowane z myślą o świecie postkwantowym.
Komunikatory centralizują zaufanie u jednego dostawcy, klasyczna poczta e-mail nigdy nie była
poufna z założenia, a większość platform przechowuje czytelną kopię wszystkiego, co przesyła.

**GaiaCom na nowo definiuje bezpieczną komunikację jako suwerenną infrastrukturę.**

Łączy sieć federacyjną, szyfrowanie end-to-end po stronie klienta, wersjonowaną hybrydową kopertę
postkwantową, szyfrowane kanały społecznościowe, szyfrowane przechowywanie plików oraz warstwę
zarządzania dla operatorów węzłów — w ramach jednej tożsamości, w przeglądarce, na komputerze i na
urządzeniach mobilnych.

Podstawowa zasada jest celowo zwięzła:

```text
Serwer może trasować, przechowywać, stosować limity szybkości (rate-limit), audytować i egzekwować polityki.
Serwer nigdy nie może otrzymać możliwości odszyfrowania natywnych treści prywatnych.
```

GaiaCom **nie** jest deklaracją absolutnego bezpieczeństwa. Jest próbą uczynienia granic zaufania
jawnymi, testowalnymi i — tam, gdzie to możliwe — wymuszonymi matematycznie.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom jest dostępny w 3 wersjach:

**Jeden protokół. Trzy modele działania.**

### Business — GaiaCom Enterprise

Dla korporacji, kancelarii prawnych, MŚP i bankowości prywatnej. Zamknięte środowiska komunikacyjne z kontrolą administratora.

- Pełna suwerenność i zaawansowane zarządzanie użytkownikami
- Dedykowany węzeł serwerowy (self-hosted lub managed)
- Gwarancja SLA, pełne wsparcie i moduły Premium

### Public — GaiaCom Network

Otwarta sieć chroniąca prywatność. Brak handlu danymi. Infrastruktura do darmowej i bezpiecznej komunikacji.

- Otwarty kod źródłowy aplikacji klienckiej
- Federacyjne węzły sieciowe
- Brak centralnego klucza deszyfrującego

### Government — GaiaCom Defend

Wysoce zabezpieczona infrastruktura dla instytucji rządowych i odizolowanych silosów komunikacyjnych.

- Wdrożenia w środowiskach odizolowanych fizycznie (air-gapped)
- Możliwość modyfikacji wizualnej i audyt kodu źródłowego
- Krajowa suwerenność cyfrowa

> **Obecna wersja testowa i wymóg licencji komercyjnej (podwójne licencjonowanie)**
>
> Wersją testowaną obecnie w tym repozytorium jest publiczna edycja **GaiaCom Network** (Beta V3) na licencji open source **AGPL-3.0-or-later** (zobacz [LICENSE](LICENSE)). Każde uruchomienie sieciowe lub modyfikacja `GaiaCom Network` na warunkach otwartej licencji podlega rygorystycznym wymogom copyleft oraz obowiązkowi udostępniania kodu źródłowego AGPL (i nie nadaje praw do znaków towarowych, SLA ani modułów Enterprise/Defend).
>
> **Dla firm oraz instytucji państwowych i organów publicznych system nie jest bezpłatny.** Podmioty chcące wdrożyć GaiaCom w firmach (**GaiaCom Enterprise**) lub w urzędach i infrastrukturze krytycznej (**GaiaCom Defend**) — w tym wdrożenia zamknięte lub produkcyjne bez obowiązków ujawniania kodu AGPL, moduły Enterprise/Defend, zarządzane suwerenne klastry, white labeling, audyt kodu źródłowego czy SLA i wsparcie — muszą uzyskać komercyjną **VGT Licence** i skontaktować się z VisionGaiaTechnology, najlepiej poprzez zaszyfrowany formularz zapytania:
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 to publiczna beta techniczna. Traktuj ją odpowiednio.**

- **Status:** Beta V3, wersja `3.0.2`.
- **Nie ukończono żadnego niezależnego audytu kryptograficznego.** Projekt postkwantowy,
  implementacje protokołu oraz granice kryptograficzne **nie** zostały jeszcze sprawdzone przez
  niezależne laboratorium kryptograficzne strony trzeciej.
- Przeprowadziliśmy **dogłębne audyty bezpieczeństwa wspomagane przez AI** w zakresie architektury,
  uwierzytelniania, autoryzacji, federacji, pamięci masowej oraz granic przeglądarki i aplikacji
  desktopowej. Audyty te wykryły i wyeliminowały realne problemy. Nie stanowią one jednak
  **dowodu bezpieczeństwa**.
- **Nadal mogą istnieć nieznane podatności** — w projekcie protokołu, implementacji, zależnościach,
  środowisku uruchomieniowym lub na własnym urządzeniu użytkownika.
- W kryptografii łatwo o subtelne błędy. Błędne założenia nie zawsze są widoczne w testach. Nie
  traktuj nazw algorytmów jako gwarancji bezpieczeństwa.
- **Nie używaj GaiaCom w tej wersji beta do komunikacji krytycznej dla życia, regulowanej prawnie,
  o wysokiej wartości lub nieodwracalnej.** Przechowuj niezależne kopie zapasowe ważnych ziaren
  (seedów) i danych.
- Między wydaniami beta mogą występować niekompatybilne zmiany protokołu i API. Możliwa jest
  utrata danych.
- Klient webowy może zostać podmieniony przez skompromitowany węzeł jeszcze przed szyfrowaniem.
  Profil wysokiego zaufania (high-assurance) wymaga dlatego zaufanych, niezależnie zbudowanych
  klientów natywnych.
- Mostkowanie SMTP jest świadomą granicą obniżenia poziomu ochrony (downgrade). Wiadomości
  opuszczające natywną przestrzeń bezpieczeństwa GaiaCom są chronione tylko na tyle, na ile pozwala
  starsza ścieżka (legacy).

Jeśli znajdziesz problem związany z bezpieczeństwem, zgłoś go prywatnie — zobacz
[SECURITY.md](SECURITY.md). Prosimy nie publikować szczegółów aktywnych exploitów.

---

<a id="screenshots"></a>
## Zrzuty ekranu

Wszystkie zrzuty ekranu pochodzą z GaiaCom 3.0.2 w rozdzielczości 2560 × 1440. Przedstawiony
interfejs to aktualny projekt VGT Aurora; zrzuty zawierają wyłącznie publiczne powierzchnie produktu
oraz publiczne treści federacyjne.

| Strona główna | Tożsamość i dostęp |
|---|---|
| ![Strona główna](docs/screenshots/landing.png) | ![Okno uwierzytelniania](docs/screenshots/auth.png) |
| **Kanały publiczne — odkrywanie** | **Kanały publiczne — widok kanału** |
| ![Odkrywanie kanałów](docs/screenshots/channels-discovery.png) | ![Widok kanału](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Funkcje

### Tożsamość i dostęp

- **Samodzielnie zarządzana tożsamość Gaia ID** — `@name:node.example.org`, wyprowadzana z lokalnie
  wygenerowanego ziarna (seed). Klucze prywatne pozostają na urządzeniu.
- **Lokalny sejf kluczy** z jawnym odblokowaniem, blokadą sesji i konfigurowalną automatyczną
  blokadą.
- **Parowanie wielu urządzeń** za pomocą przepływów QR / jednorazowego parowania, wraz z listą
  urządzeń i możliwością ich odwołania.
- **Historia kluczy i ostrzeżenia o zmianie**, gdy zmienia się klucz tożsamości kontaktu.
- **Procedury odzyskiwania** z jawnym, zapisanym przez użytkownika ziarnem odzyskiwania (recovery
  seed); po stronie serwera nie istnieje żadna tylna furtka do odzyskiwania.
- **18 języków interfejsu** z przełącznikiem języka działającym na żywo (strona główna,
  uwierzytelnianie, przestrzeń robocza).

### Wiadomości

- **Quantum Chat** — rozmowy 1:1 z szyfrowaniem po stronie klienta, odpowiedziami, reakcjami,
  przypinaniem, wyszukiwaniem, załącznikami, notatkami głosowymi i zaszyfrowanymi podglądami
  obrazów.
- **Czaty grupowe** — pokoje z kanałami, rolami, moderacją, zarządzaniem członkami, trybem powolnym,
  kanałami tylko do odczytu, prośbami o dołączenie, zaproszeniami, zdarzeniami audytu i
  zaszyfrowanym eksportem.
- **Reakcje** — sterowanie reakcjami z sercem na pierwszym miejscu: najedź kursorem na komputerze
  lub przytrzymaj na ekranie dotykowym, aby otworzyć pełną paletę; dokładnie jedna reakcja jest
  oznaczona jako Twoja własna.
- **Brak fałszywych stanów** — wartości wiadomości, reakcji, obecności i aktywności pochodzą z
  rzeczywistego backendu albo są pokazywane jako niedostępne. GaiaCom nie zmyśla liczników.

### GaiaMail

- Poczta wewnątrz tej samej tożsamości kryptograficznej co czat.
- Natywna poczta GaiaMail między tożsamościami GaiaCom.
- **Most SMTP** dla starszych kontaktów (legacy) — wyraźnie oddzielony od natywnego E2EE i
  chroniony wyłącznie w zakresie, na jaki pozwala ścieżka legacy.
- Podpisy, foldery, filtry i etykiety obsługiwane lokalnie.

### GSN Social

Warstwa społecznościowa GaiaCom nie jest osobną platformą z osobnym kontem. Ponownie wykorzystuje
Twoją suwerenną tożsamość:

- **Strona główna (Home feed)**, **Odkrywaj**, **Moja sieć**, **Wiadomości**, **Powiadomienia**,
  **Grupy**, **Kanały** oraz **GSN Cloud** (integracja z GaiaDrive).
- Wpisy, zaszyfrowane obrazy, komentarze, reakcje, reposty oraz trendy hashtagów obliczane na
  podstawie prawdziwych wpisów.
- Obserwujący, obserwowani oraz polecane kontakty wyprowadzane z rzeczywistych interakcji
  federacyjnych.
- **Kanały publiczne** do komunikacji rozgłoszeniowej z subskrypcjami, odkrywaniem, kategoriami,
  mediami, komentarzami i moderacją.

### Pliki, sejf i centrum bezpieczeństwa

- **GaiaDrive** — szyfrowane przechowywanie i udostępnianie plików powiązane z tą samą
  tożsamością.
- **GaiaDrop** — odbieranie zaszyfrowanych plików od nadawców zewnętrznych bez posiadania konta.
- **GaiaVault** — lokalny zapieczętowany magazyn na sekrety i klucze.
- **Centrum bezpieczeństwa** — rzeczywisty stan urządzeń, sesji, kluczy i zdarzeń bezpieczeństwa,
  a także procedury zarządzania (governance) i zgłaszania nadużyć.

### Zarządzanie i operacje

- Role operatora węzła, starszego recenzenta i zaufanego recenzenta.
- Rozruch zarządzania (governance bootstrap) w trybie fail-closed: świeży węzeł domyślnie **nie**
  przyznaje roli operatora.
- Zgłaszanie nadużyć, moderacja, widoki przejrzystości oraz zdarzenia audytu wyłącznie dopisywane
  (append-only).
- Federacja przez podpisane pakiety PDU serwer-serwer z ochroną przed powtórzeniami (replay) i
  limitami SSRF.

### Komputer i urządzenia mobilne

- Klient **Web/PWA** ze wzmocnioną polityką CSP i bez kodu dostarczanego z sieci CDN.
- **Klient desktopowy Tauri 2** dla systemów Windows, Linux i macOS z natywnym sterowaniem oknem i
  bez uprawnień do poleceń natywnych wykraczających poza jawną listę dozwolonych (allowlist).
- Architektura węzła/klienta **Android** z natywnym rdzeniem kryptograficznym i powiązaniami
  platformowymi.

---

<a id="technical-information"></a>
## Informacje techniczne

### Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Klient webowy | React 18, Vite 8, czyste warstwy stylów CSS |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), niestandardowe okno bez ramki |
| Backend | Go 1.25 (`toolchain go1.26.5`), biblioteka standardowa + SQLite, usługi federacji i zarządzania |
| Baza danych | SQLite w trybie WAL (profil beta z jednym piszącym), wersjonowane migracje |
| Rdzeń krypto | Rust (`gaiacore`), dostawca WebAssembly dla HQC w przeglądarce, natywny dostawca Tauri |
| Mobile | Aplikacja Android + powiązania Go mobile / architektura jądra węzła |
| Lokalizacja | 18 języków, współdzielone tabele tłumaczeń |

### Projekt kryptograficzny (Sovereign v1)

```text
Ustanawianie kluczy:  X25519  +  ML-KEM-1024  +  HQC-256
Łącznik (Combiner):   sekrety z prefiksem długości → HKDF-SHA3-512
Przyspieszony AEAD:   Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:      Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                      → XChaCha20-Poly1305 → AES-256-GCM-SIV
Podpisy:              podpis transkryptu Ed25519
Podpisy Top Secret:   Ed25519 + ML-DSA-87
```

Podpisany transkrypt wiąże wersję protokołu, dokładny zestaw algorytmów, tożsamości nadawcy i
odbiorcy, klucz szyfrujący odbiorcy, klucz efemeryczny, oba szyfrogramy KEM, identyfikator
wiadomości, znacznik czasu, wartość nonce oraz zaszyfrowany ładunek (payload). Nieznane zestawy
algorytmów, brakujące dowody zestawu kluczy, brakujące podpisy Top Secret oraz zniekształcone
szyfrogramy HQC są odrzucane w trybie fail-closed.

**Ważna granica:** Sovereign v1 jest hybrydową kopertą dla każdej wiadomości z osobna, **a nie
protokołem Triple Ratchet**. Nie deklaruje bezpieczeństwa po kompromitacji wywodzonego z mechanizmu
ratchet. Dokładna granica jest opisana w [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Model sieciowy

- Sfederowane węzły, brak obowiązkowego serwera centralnego.
- Podpisane pakiety PDU serwer-serwer do federacji.
- Serwer przechowuje koperty trasowania, zaszyfrowane ładunki/fragmenty, publiczne pola profilu oraz
  minimalne metadane — nigdy natywnego tekstu jawnego.
- Lokalne lub zgodne z S3/MinIO szyfrowane przechowywanie obiektowe.
- Poza rozwojem lokalnym protokół TLS jest obowiązkowy.

### Wymagania

| Narzędzie | Wersja |
|---|---|
| Node.js | 24.13 (minimum 20.19) |
| npm | instalacja oparta na lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (moduł celuje w 1.25) |
| Rust | stable (przypięta wersja przez CI dla rdzenia) |
| Tauri CLI | 2.x do pakowania wersji desktopowych |
| Python | 3.10+ (opcjonalne skrypty repozytorium/bezpieczeństwa) |

---

<a id="what-makes-gaiacom-different"></a>
## Co wyróżnia GaiaCom

Większość „bezpiecznych” komunikatorów ulepsza tylko jedną warstwę. GaiaCom stara się uczynić spójnym
cały stos:

- **Suwerenna tożsamość zamiast kont na platformie.** Twoja tożsamość jest tożsamością
  kryptograficzną, a nie wierszem w cudzej tabeli użytkowników. Węzły federują się; nie są Twoimi
  właścicielami.
- **Podwójne postkwantowe ustanawianie kluczy dla każdej wiadomości.** Jeden klasyczny i dwa
  niezależne mechanizmy KEM postkwantowe są łączone z odrzucaniem obniżenia ochrony (downgrade), gdy
  wybrany jest profil Sovereign.
- **Szyfrowanie przed transportem, z samej konstrukcji.** Klient pieczętuje treść, zanim trafi ona
  do sieci; serwer trasuje szyfrogram i nie może go odczytać.
- **Sieć społecznościowa, poczta, pliki i czat pod jedną tożsamością.** Żadnego drugiego konta,
  żadnego drugiego modelu zaufania, żadnej osobnej platformy ujawniającej Twój graf powiązań.
- **Federacja z założenia.** Brak obowiązkowej centralnej skrzynki pocztowej, brak pojedynczego
  punktu zaufania, brak globalnego klucza odczytu.
- **Uczciwe stany interfejsu.** Brakujące dane są pokazywane jako brakujące, a nie zastępowane
  ozdobnymi liczbami lub zmyśloną aktywnością.
- **Jawne granice obniżenia ochrony (downgrade).** SMTP, starsze koperty i dostarczanie w
  przeglądarce są udokumentowane jako granice, a nie ukrywane za marketingowym językiem.
- **Otwarte źródło, AGPL-3.0-or-later.** Oprogramowanie sieciowe pozostaje możliwe do inspekcji, a
  wkład społeczności pozostaje dla niej dostępny.
- **Zbudowane z myślą o operatorach.** Zarządzanie w trybie fail-closed, zdarzenia audytu, procedury
  zgłaszania nadużyć oraz udokumentowana ścieżka operatora węzła.

---

<a id="build-from-source"></a>
## Kompilacja ze źródeł

### 1. Wymagania wstępne

Zainstaluj Node.js 24.13+, Go 1.26.5+, Rust stable oraz — w przypadku kompilacji desktopowych —
[wymagania wstępne Tauri 2](https://tauri.app/start/prerequisites/) dla Twojego systemu operacyjnego.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Klient webowy

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

Paczka produkcyjna jest zapisywana w katalogu `Frontend/frontend/dist/`.

Do lokalnego rozwoju:

```bash
npm start
# http://127.0.0.1:5173
```

Ustaw `VITE_API_URL` wyłącznie na adres źródłowy (origin) uruchomionego backendu GaiaCom, na przykład:

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

Uruchom lokalny węzeł deweloperski:

```bash
cp .env.example .env
# wygeneruj niezależne sekrety wyłącznie na potrzeby środowiska deweloperskiego
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API nasłuchuje na porcie `SERVER_PORT` (domyślnie `8080`). Baza danych SQLite jest tworzona w
ścieżce `DB_PATH`. Nigdy nie używaj szablonowych sekretów na produkcji.

### 4. Klient desktopowy (Tauri 2)

Najpierw zbuduj klienta webowego, a następnie:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Instalatory/pliki wykonywalne są zapisywane w `DesktopClient/src-tauri/target/release/bundle/`.
Aby wykonać szybką, niepodpisaną kompilację bez instalatorów:

```bash
cargo tauri build --no-bundle
```

### 5. Rdzeń kryptograficzny w Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opcjonalnie)

Kompilacje dla Androida wymagają JDK 17, pakietu Android SDK/NDK oraz przypiętego zestawu narzędzi
(toolchain). Sprawdź `Android/` oraz `docs/`, aby poznać bieżący profil kompilacji. Klient Android
jest częścią drzewa źródeł wersji beta, a nie gotowym wydaniem sklepowym.

---

<a id="become-a-node-operator"></a>
## Zostań operatorem węzła

Węzeł GaiaCom to sfederowany backend obsługujący tożsamości, wiadomości, kanały, powierzchnie
społecznościowe oraz magazyn danych dla swoich użytkowników. Może działać na zwykłym serwerze
Linux.

### Zalecana konfiguracja bazowa

- Linux x86_64 lub arm64, 64-bitowy
- 2+ vCPU, 4 GB RAM, 20+ GB SSD dla węzła ewaluacyjnego (dobierz zasoby do rzeczywistego obciążenia)
- Dedykowana nazwa DNS, np. `node.example.org`
- Ważny certyfikat TLS (Let's Encrypt działa poprawnie)
- Przekaźnik SMTP **tylko wtedy**, gdy celowo włączasz most legacy
- Kopie zapasowe, które faktycznie testujesz

### 1. Kompilacja i instalacja

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

Pliki binarne wydania odmawiają uruchomienia bez niezmiennych metadanych kompilacji; nie usuwaj
tych wartości `-X`.

### 2. Inicjalizacja węzła

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

Polecenie `setup` generuje niezależne sekrety produkcyjne, tożsamość podpisującą węzła oraz plik
konfiguracyjny. Utrzymuj uprawnienia `/etc/gaiacom/gaiacom.env` na `0600`, z właścicielem będącym
użytkownikiem usługi.

Kluczowe ustawienia:

| Zmienna | Przeznaczenie |
|---|---|
| `GAIACOM_SERVER_NAME` | Kanoniczna nazwa FQDN tego węzła; używana w Gaia ID i federacji |
| `GAIACOM_DEV_MODE=false` | Tryb produkcyjny, ścisłe zachowanie SSRF i CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Niezależne sekrety o długości 32+ bajtów |
| `GAIACOM_SERVER_PRIVATE_KEY` | Stabilny klucz podpisujący węzła Ed25519 — nigdy nie rotuj go niejawnie |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Stabilny sekret wyprowadzania epok TrustMesh |
| `DB_PATH` | Ścieżka trwałej bazy danych SQLite |
| `GAIACOM_STORAGE_ROOT` | Zaszyfrowany magazyn załączników poza katalogiem głównym serwera WWW |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Tylko wtedy, gdy odwrotne proxy przekazuje adresy IP klientów |

### 3. Rozruch zarządzania (wymagany, fail-closed)

Świeży węzeł celowo **nie** przyznaje żadnej roli operatora. Utwórz pierwszą tożsamość przez
klienta, a następnie autoryzuj to dokładne, w pełni kwalifikowane Gaia ID jako operatora węzła:

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

Wskaż ten plik backendowi i uruchom go ponownie:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Używaj wyłącznie w pełni kwalifikowanych Gaia ID (`@name:node.example.org`). Nie istnieje domyślny
administrator ani awaryjny tryb nadrzędny (god-mode).

### 4. Jednostka Systemd

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

### 5. Odwrotne proxy TLS i klient webowy

Udostępniaj zbudowany katalog `Frontend/frontend/dist/` za odwrotnym proxy TLS i przekierowuj
zapytania API do backendu na `127.0.0.1:8080`. Minimalne wymagania:

- TLS 1.2+ (preferowany TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Ścisła polityka Content-Security-Policy
- Brak listowania katalogów, brak map źródeł (source maps) na produkcji
- Tylko odwrotne proxy wymienione w `GAIACOM_TRUSTED_PROXY_CIDRS` mogą przekazywać nagłówki z
  adresami IP klientów

Przykładowa konfiguracja celowo **nie** jest dostarczana z prawdziwymi nazwami hostów ani
certyfikatami; użyj własnej domeny i ścieżek do certyfikatów.

### 6. Federacja i eksploatacja

- Ogłoś/opublikuj swoją kanoniczną nazwę `GAIACOM_SERVER_NAME`; inne węzły łączą się z Tobą przez
  HTTPS.
- Federacja używa podpisanych pakietów PDU serwer-serwer z zabezpieczeniami przed powtórzeniami
  (replay) oraz ochroną przed SSRF.
- Monitoruj usługę, zużycie dysku, integralność kopii zapasowych oraz ważność certyfikatów.
- Regularnie testuj przywracanie bazy danych SQLite i magazynu obiektowego.
- Zachowaj stabilny klucz podpisujący węzła między aktualizacjami; jego rotacja przerywa zaufanie w
  federacji.
- Nie uruchamiaj wielu procesów backendu na jednym pliku SQLite. Poziome skalowanie bazy danych
  (Postgres, repliki active/active) nie jest częścią tego profilu beta.

### Ostrzeżenia dla operatorów węzłów

- Oprogramowanie beta; brak gwarancji wysokiej dostępności (HA); wymagane są okna serwisowe i
  restarty.
- Zarządzane treści i procedury zgłaszania nadużyć mają w tej wersji beta zasięg polityki na poziomie
  pojedynczego węzła.
- Automatyczne aktualizacje wersji desktopowej są wyłączone do czasu powstania podpisanego systemu
  aktualizacji.
- Przekaźnik SMTP wymaga uwierzytelnionego TLS oraz SPF, DKIM i wymuszającej polityki DMARC.
  Wiadomości opuszczające natywną przestrzeń GaiaCom nie są objęte natywnymi gwarancjami E2EE.
- Ponosisz odpowiedzialność za kopie zapasowe, sekrety, TLS, DNS, obsługę nadużyć oraz zgodność z
  lokalnym prawem.

---

<a id="security-and-audit-status"></a>
## Status bezpieczeństwa i audytu

### Co zostało zrobione

- Dogłębne przeglądy bezpieczeństwa wspomagane przez AI w zakresie backendu, frontendu, federacji,
  przechowywania danych, uwierzytelniania, autoryzacji oraz granic aplikacji desktopowej i
  przeglądarki.
- Statyczne bramki bezpieczeństwa, zestawy testów adwersarialnych, kontrole zależności i higieny
  sekretów.
- Jawne niezmienniki bezpieczeństwa: brak tekstu jawnego po stronie serwera, brak eksportu kluczy
  prywatnych, brak punktu końcowego podszywania się (impersonation), brak obejścia E2EE, brak
  globalnego klucza odczytu.
- Domyślne ustawienia fail-closed dla zarządzania, walidacji sekretów i negocjacji protokołu.
- Rzeczywista weryfikacja działania powierzchni produktu i przepływów interfejsu w trakcie prac.

### Czego **nie** zrobiono

- **Brak niezależnego audytu kryptograficznego strony trzeciej.**
- Brak formalnej weryfikacji protokołu ani jego implementacji.
- Brak gwarancji, że nie istnieją nieznane podatności.
- Brak certyfikacji klasy rządowej lub high-assurance.
- Zachowanie w czasie działania zależy od węzła, przeglądarki, systemu operacyjnego oraz
  bezpieczeństwa własnego urządzenia użytkownika.

### Zgłaszanie podatności

Prosimy o prywatne zgłaszanie podatności:

- E-mail: **security@gaiacom.de**
- Nie otwieraj publicznego zgłoszenia (issue) dla aktywnej podatności.
- Dołącz nazwę komponentu, wersję/commit, kroki reprodukcji oraz oczekiwane i obserwowane zachowanie.
- Prosimy nie prowadzić testów na cudzych węzłach ani danych i nie przeprowadzać ataków
  niszczących.

Pełną politykę znajdziesz w pliku [SECURITY.md](SECURITY.md), a aktualne ograniczenia wersji beta
w pliku [docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md).

### Zastosowania wysokiego zaufania (high-assurance)

Jeśli potrzebujesz systemu chroniącego życie, wolność lub dane podlegające ścisłym regulacjom, ta
wersja beta **jeszcze nie** jest takim systemem. Niezależne audyty, powtarzalne kompilacje
(reproducible builds), podpisane wydania, zweryfikowane łańcuchy aktualizacji, operacyjne zarządzanie
kluczami oraz procedury reagowania na incydenty są nadal wymagane.

---

<a id="project-structure"></a>
## Struktura projektu

```text
GaiaCom/
├── Backend/                  API w Go, federacja, zarządzanie, przechowywanie, bezpieczeństwo
├── Frontend/frontend/        Klient webowy React i PWA
├── DesktopClient/src-tauri/  Powłoka desktopowa Tauri 2
├── Android/                  Architektura węzła/klienta Android
├── Core/rust/gaiacore/       Rdzeń kryptograficzny w Rust
├── SovereignCryptoCore/      Biblioteka kryptograficzna w Rust
├── SovereignCryptoWasm/      Dostawca kryptografii WASM dla przeglądarki
├── docs/                     Architektura, obsługa węzła, granice wersji beta, zrzuty ekranu
├── assets/brand/             Logo GaiaCom i zasoby marki
├── SECURITY.md               Polityka bezpieczeństwa i ujawniania podatności
├── SOVEREIGN_CRYPTO.md       Projekt kryptograficzny i granice
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Współpraca

Wkład w projekt jest mile widziany, o ile zachowuje niezmienniki bezpieczeństwa i uczciwość deklaracji.

- Przeczytaj najpierw [CONTRIBUTING.md](CONTRIBUTING.md).
- Przestrzegaj granicy zaufania zero-trust: brak tekstu jawnego po stronie serwera, brak eksportu
  kluczy prywatnych, brak obejść E2EE.
- Dodawaj testy dla zachowań istotnych z punktu widzenia bezpieczeństwa.
- Nigdy nie commituj sekretów, prawdziwych danych użytkowników, kluczy prywatnych, baz danych ani
  artefaktów kompilacji.
- Nie osłabiaj bramek bezpieczeństwa tylko po to, aby kompilacja przeszła.
- Zgłaszaj podatności prywatnie, a nie w pull requestach.

Uczestnicząc w projekcie, akceptujesz [Kodeks postępowania](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licencja

GaiaCom stosuje model **podwójnego licencjonowania** (zobacz [VGT Licence](#vgt-licence)):
publiczna otwarta baza kodu (`GaiaCom Network`) jest udostępniana na licencji **GNU Affero
General Public License v3.0 or later** (AGPL-3.0-or-later) — zobacz [LICENSE](LICENSE).
W przypadku zastosowań firmowych (**GaiaCom Enterprise**), instytucji publicznych
(**GaiaCom Defend**) oraz zamkniętych lub komercyjnych wdrożeń bez obowiązków publikacji
kodu AGPL (w tym modułów premium, SLA/wsparcia, white labeling oraz środowisk air-gapped),
system **nie jest bezpłatny** i wymaga komercyjnej licencji **VGT Licence** poprzez
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink).

Operatorzy sieci uruchamiający zmodyfikowane otwarte oprogramowanie GaiaCom na licencji
AGPL muszą udostępnić odpowiedni kod źródłowy zgodnie z wymogami AGPL. Komponenty
zewnętrzne i ich licencje są wymienione w pliku
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) oraz w odpowiednich manifestach pakietów.

GaiaCom oraz logo GaiaCom są znakami towarowymi firmy VisionGaiaTechnology. Licencja AGPL
nie udziela praw do znaków towarowych.

---

<div align="center">

**VisionGaiaTechnology — Departament Zbędnego Bezpieczeństwa™**

*Suwerenna komunikacja, tworzona w sposób otwarty.*

[Strona internetowa](https://gaiacom.de) · [Bezpieczeństwo](SECURITY.md) · [Architektura](docs/ARCHITECTURE.md)

</div>
