[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · **한국어** · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — 주권적 포스트 양자 통신" />

# GaiaCom

### 주권적 포스트 양자 통신 인프라

[![버전](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![라이선스](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![플랫폼](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![기술 스택](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![암호학](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![상태](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![감사 상태](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![웹사이트](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**하이브리드 포스트 양자 설계를 적용한 연합형 클라이언트 암호화 통신 플랫폼.**

</div>

> **VisionGaiaTechnology — 불필요한 보안 부서™**
>
> 우리는 증명할 수 없는 신뢰를 요구하지 않는 통신 인프라를 구축합니다.
> 이 부서가 존재하는 이유는, 다른 누군가가 키를 쥐게 되는 순간 바로 그 "불필요한"
> 보안이 반드시 필요한 것이 되기 때문입니다.

---

## 메뉴

[개요](#overview) · [VGT Licence](#vgt-licence) · [베타 V3](#beta-v3) · [스크린샷](#screenshots) · [기능](#features) · [기술 정보](#technical-information) · [GaiaCom만의 차별점](#what-makes-gaiacom-different) · [소스에서 빌드하기](#build-from-source) · [노드 운영자 되기](#become-a-node-operator) · [보안 및 감사 현황](#security-and-audit-status) · [프로젝트 구조](#project-structure) · [기여하기](#contributing) · [라이선스](#license)

---

<a id="overview"></a>
## 개요

오늘날의 통신 스택은 포스트 양자 시대를 위해 설계되지 않았습니다. 메신저는 신뢰를
단일 제공자에게 집중시키며, 기존 이메일은 애초에 기밀성을 염두에 두고 설계된 적이
없고, 대부분의 플랫폼은 자신이 전송하는 모든 데이터의 읽을 수 있는 사본을 보관합니다.

**GaiaCom은 보안 통신을 주권적 인프라로 재정의합니다.**

연합 네트워크, 클라이언트 측 종단간 암호화, 버전이 지정된 하이브리드 포스트 양자
봉투(envelope), 암호화된 소셜 채널, 암호화된 파일 저장소, 그리고 노드 운영자를 위한
거버넌스 계층을 웹, 데스크톱, 모바일 전반에 걸친 단일 신원으로 결합합니다.

핵심 규칙은 의도적으로 간결합니다:

```text
서버는 라우팅, 저장, 속도 제한, 감사 및 정책 시행을 수행할 수 있습니다.
서버는 네이티브 비공개 콘텐츠를 복호화할 수 있는 권한을 절대 부여받아서는 안 됩니다.
```

GaiaCom은 절대적 보안을 주장하지 **않습니다**. 대신 신뢰 경계를 명확하고 검증
가능하며 — 가능한 곳에서는 — 수학적으로 강제할 수 있도록 만드는 시도입니다.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom은 3가지 에디션으로 제공됩니다:

**하나의 프로토콜. 세 가지 운영 모델.**

### Business — GaiaCom Enterprise

기업, 법률사무소, 중소기업, 산업 및 프라이빗 뱅킹용. 관리 권한 제어와 지원을 제공하는 독립된 통신망.

- 내부 주권 확보 및 사용자 관리
- 자체 호스팅 노드 또는 관리형 주권 클러스터 구축
- SLA 보장, 기술 지원 및 프리미엄 모듈 제공

### Public — GaiaCom Network

디지털 프라이버시를 위한 개방형 네트워크. 데이터 상거래가 없으며, 오직 자유롭고 암호화된 통신을 위한 인프라입니다.

- 오픈소스 클라이언트 앱
- 연합 노드 환경
- 중앙 복호화 키 미보유

### Government — GaiaCom Defend

정부 기관, 핵심 인프라 및 격리된 통신 환경을 위해 고도로 세분화된 맞춤형 보안 인프라.

- 인터넷과 완벽히 격리된 폐쇄망(air-gapped) 배포
- 화이트라벨 솔루션 제공 및 소스코드 감사 진행
- 국가 디지털 주권 확보

> **현재 테스트 버전 및 상용 라이선스 요건 (이중 라이선스 / Dual-Licensing)**
>
> 이 저장소에서 현재 테스트 중인 버전은 오픈소스 라이선스 **AGPL-3.0-or-later**([LICENSE](LICENSE) 참조) 하의 공개 **GaiaCom Network** 에디션(Beta V3)입니다. 오픈소스 라이선스 하에서 `GaiaCom Network`를 네트워크로 운영하거나 수정하는 경우, AGPL 카피레프트 및 소스코드 공개 의무가 엄격하게 적용되며 상표권, SLA 또는 Enterprise/Defend 모듈은 부여되지 않습니다.
>
> **기업 및 정부 기관의 경우 이 시스템은 무료로 제공되지 않습니다.** 기업 환경(**GaiaCom Enterprise**) 또는 정부·공공기관 및 핵심 인프라(**GaiaCom Defend**)에서 GaiaCom을 도입하려는 경우(AGPL 소스 공개 의무가 없는 폐쇄형·상용 운영 배포, Enterprise/Defend 모듈, 관리형 주권 클러스터, 화이트라벨, 소스코드 감사, SLA 및 기술 지원 포함) 상용 **VGT Licence**가 필요하며, 가급적 암호화된 문의 양식을 통해 VisionGaiaTechnology에 문의하시기 바랍니다:
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## 베타 V3

> **GaiaCom 3는 공개 기술 베타입니다. 이에 맞게 신중히 취급하십시오.**

- **상태:** 베타 V3, 버전 `3.0.2`.
- **독립적인 암호학 감사가 완료되지 않았습니다.** 포스트 양자 설계, 프로토콜 구현
  및 암호화 경계는 독립적인 제3자 암호학 연구소의 검토를 거치지 **않았습니다**.
- 우리는 아키텍처, 인증, 인가, 연합(federation), 스토리지, 브라우저 및 데스크톱
  경계 전반에 걸쳐 **심층적인 AI 지원 보안 감사**를 수행했습니다. 이러한 감사를 통해
  실제 문제를 발견하고 수정했지만, 이는 **보안의 증명이 아닙니다**.
- 프로토콜 설계, 구현, 의존성, 운영 환경 또는 사용자 본인의 기기에 **알려지지 않은
  취약점이 여전히 존재할 수 있습니다**.
- 암호학은 미묘한 부분에서 실수하기 쉽습니다. 깨진 가정은 테스트에서 항상 드러나지
  않습니다. 알고리즘 이름 자체를 보안 보증으로 취급하지 마십시오.
- 이 베타 단계에서는 **생명이 걸린 통신, 법적 규제를 받는 통신, 고가치 또는 되돌릴 수
  없는 통신에 GaiaCom을 사용하지 마십시오**. 중요한 시드와 데이터의 독립적인 백업을
  유지하십시오.
- 베타 릴리스 간에 호환성이 깨지는 프로토콜 및 API 변경이 발생할 수 있으며, 데이터
  손실이 발생할 수 있습니다.
- 웹 클라이언트는 암호화가 이루어지기 전에 침해된 노드에 의해 교체될 수 있습니다.
  따라서 높은 보증이 요구되는 프로파일에는 신뢰할 수 있고 독립적으로 빌드된 네이티브
  클라이언트가 필요합니다.
- SMTP 브리징은 의도적으로 설정된 다운그레이드 경계입니다. 네이티브 GaiaCom 보안
  공간을 벗어난 메시지는 레거시 경로가 허용하는 수준까지만 보호됩니다.

보안 문제를 발견한 경우 비공개로 보고해 주십시오 — [SECURITY.md](SECURITY.md)를
참고하십시오. 활성 익스플로잇 세부 정보를 공개하지 마십시오.

---

<a id="screenshots"></a>
## 스크린샷

모든 스크린샷은 2560 × 1440 해상도의 GaiaCom 3.0.2에서 촬영되었습니다. 표시된 UI는
현재 VGT Aurora 디자인이며, 스크린샷에는 공개 제품 화면과 공개 연합 콘텐츠만 포함되어
있습니다.

| 랜딩 페이지 | 신원 및 접근 |
|---|---|
| ![랜딩 페이지](docs/screenshots/landing.png) | ![인증 대화 상자](docs/screenshots/auth.png) |
| **공개 채널 — 탐색** | **공개 채널 — 채널 보기** |
| ![채널 탐색](docs/screenshots/channels-discovery.png) | ![채널 보기](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## 기능

### 신원 및 접근

- **자가 관리 Gaia ID 신원** — 로컬에서 생성된 시드에서 파생되는
  `@name:node.example.org` 형식의 신원입니다. 개인 키는 기기에만 보관됩니다.
- **로컬 키 볼트** — 명시적 잠금 해제, 세션 잠금 및 구성 가능한 자동 잠금 지원.
- **멀티 디바이스 페어링** — QR/일회성 페어링 흐름을 통한 연결, 디바이스 목록 조회
  및 폐기 지원.
- **키 이력 및 변경 경고** — 연락처의 신원 키가 변경될 때 경고 표시.
- **복구 흐름** — 직접 기록해 둔 복구 시드를 사용하는 복구 방식. 서버 측 복구 백도어는
  존재하지 않습니다.
- **18개 UI 언어** — 실시간 언어 전환기 제공(랜딩, 인증, 워크스페이스).

### 메시징

- **Quantum Chat** — 클라이언트 측 암호화, 답장, 반응(이모지), 고정, 검색, 첨부
  파일, 음성 메모 및 암호화된 이미지 미리보기를 지원하는 1:1 대화.
- **그룹 채팅** — 채널, 역할, 중재(모더레이션), 멤버 관리, 슬로우 모드, 읽기 전용
  채널, 가입 요청, 초대, 감사 이벤트 및 암호화된 내보내기를 지원하는 대화방.
- **반응(Reactions)** — 하트 우선 반응 컨트롤: 데스크톱에서는 마우스 오버, 터치
  기기에서는 길게 눌러 전체 팔레트를 열 수 있으며, 본인의 반응은 정확히 하나로만
  표시됩니다.
- **가짜 상태 없음** — 메시지, 반응, 접속 상태 및 활동 수치는 실제 백엔드에서
  가져오거나 사용 불가로 표시됩니다. GaiaCom은 수치를 지어내지 않습니다.

### GaiaMail

- 채팅과 동일한 암호학적 신원 내에서 작동하는 메일.
- GaiaCom 신원 간 네이티브 GaiaMail 송수신.
- 기존 연락처를 위한 **SMTP 브리지** — 네이티브 E2EE와 명확히 분리되어 있으며 레거시
  경로가 허용하는 범위까지만 보호됩니다.
- 서명, 폴더, 필터 및 라벨을 로컬에서 처리합니다.

### GSN Social

GaiaCom의 소셜 계층은 별도의 계정이 필요한 별도 플랫폼이 아닙니다. 사용자의 주권적
신원을 그대로 재사용합니다:

- **홈 피드**, **탐색**, **내 네트워크**, **메시지**, **알림**, **그룹**, **채널**
  및 **GSN Cloud**(GaiaDrive 연동).
- 실제 게시물에서 계산된 게시물, 암호화된 이미지, 댓글, 반응, 리포스트 및 해시태그
  트렌드.
- 실제 연합 상호작용에서 도출된 팔로워, 팔로우 및 추천 연락처.
- 구독, 탐색, 카테고리, 미디어, 댓글 및 중재 기능을 갖춘 브로드캐스트 스타일의
  **공개 채널**.

### 파일, 볼트 및 보안 센터

- **GaiaDrive** — 동일한 신원에 연결된 암호화된 파일 저장소 및 공유.
- **GaiaDrop** — 계정 없이도 외부 발신자로부터 암호화된 파일을 수신.
- **GaiaVault** — 시크릿과 키를 위한 로컬 봉인 저장소.
- **보안 센터(Security Center)** — 실제 디바이스, 세션, 키 및 보안 이벤트 상태와
  함께 거버넌스 및 악용 대응 워크플로 제공.

### 거버넌스 및 운영

- 노드 운영자, 선임 검토자, 신뢰 검토자 역할.
- 페일 클로즈드(fail-closed) 거버넌스 부트스트랩: 새 노드는 기본적으로 운영자 역할을
  **전혀** 부여하지 않습니다.
- 악용 신고, 콘텐츠 중재, 투명성 화면 및 추가 전용(append-only) 감사 이벤트.
- 재생 방지 및 SSRF 제한이 적용된 서명된 서버 간 PDU 기반 연합 통신.

### 데스크톱 및 모바일

- 강화된 CSP가 적용되고 CDN으로 전달되는 코드가 없는 **Web/PWA** 클라이언트.
- Windows, Linux 및 macOS용 **Tauri 2 데스크톱 클라이언트** — 네이티브 창 컨트롤을
  제공하며 명시적 허용 목록 외의 네이티브 명령 권한을 허용하지 않습니다.
- 네이티브 암호화 코어와 플랫폼 바인딩을 갖춘 **Android** 노드/클라이언트 아키텍처.

---

<a id="technical-information"></a>
## 기술 정보

### 기술 스택

| 계층 | 기술 |
|---|---|
| 웹 클라이언트 | React 18, Vite 8, 순수 CSS 디자인 레이어 |
| 데스크톱 | Tauri 2 (Rust + WebView2/WebKit), 커스텀 프레임리스 창 |
| 백엔드 | Go 1.25 (`toolchain go1.26.5`), 표준 라이브러리 + SQLite, 연합 및 거버넌스 서비스 |
| 데이터베이스 | WAL 모드의 SQLite (단일 라이터 베타 프로파일), 버전 관리 마이그레이션 |
| 암호화 코어 | Rust (`gaiacore`), 브라우저 HQC용 WebAssembly 프로바이더, 네이티브 Tauri 프로바이더 |
| 모바일 | Android 앱 + Go 모바일 바인딩 / 노드 커널 아키텍처 |
| 현지화 | 18개 언어, 공유 번역 테이블 |

### 암호화 설계 (Sovereign v1)

```text
키 합의:            X25519  +  ML-KEM-1024  +  HQC-256
결합기:             길이 접두사 시크릿 → HKDF-SHA3-512
가속 AEAD:          Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:    Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                    → XChaCha20-Poly1305 → AES-256-GCM-SIV
서명:               Ed25519 트랜스크립트 서명
Top Secret 서명:    Ed25519 + ML-DSA-87
```

서명된 트랜스크립트는 프로토콜 버전, 정확한 알고리즘 스위트, 발신자 및 수신자 신원,
수신자 암호화 키, 임시 키, 두 KEM 암호문, 메시지 ID, 타임스탬프, 논스(nonce) 및
암호화된 페이로드를 바인딩합니다. 알 수 없는 스위트, 누락된 키셋 증명, 누락된
Top Secret 서명 및 잘못된 형식의 HQC 암호문은 페일 클로즈드(fail-closed) 방식으로
거부됩니다.

**중요 경계:** Sovereign v1은 메시지별 하이브리드 봉투이며, **Triple Ratchet이
아닙니다**. 래칫 기반의 침해 후 보안(post-compromise security)을 표방하지 않습니다.
정확한 경계는 [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md)에 문서화되어 있습니다.

### 네트워크 모델

- 연합 노드 구조, 필수 중앙 서버 없음.
- 연합 통신에 서명된 서버 간 PDU 사용.
- 서버는 라우팅 봉투, 암호화된 페이로드/청크, 공개 프로필 필드 및 최소한의
  메타데이터만 저장합니다 — 네이티브 평문은 절대 저장하지 않습니다.
- 로컬 또는 S3/MinIO 호환 암호화 객체 스토리지.
- 로컬 개발 환경을 제외하고 TLS가 필수입니다.

### 요구 사항

| 도구 | 버전 |
|---|---|
| Node.js | 24.13 (최소 20.19) |
| npm | 록파일 기반 설치 (`npm ci`) |
| Go | 1.26.5 툴체인 (모듈 대상 1.25) |
| Rust | stable (코어용으로 CI에서 고정) |
| Tauri CLI | 데스크톱 패키징용 2.x |
| Python | 3.10+ (선택 사항: 저장소/보안 스크립트용) |

---

<a id="what-makes-gaiacom-different"></a>
## GaiaCom만의 차별점

대부분의 "보안" 메신저는 한 계층만 개선합니다. GaiaCom은 전체 스택의 일관성을
추구합니다:

- **플랫폼 계정 대신 주권적 신원.** 사용자의 신원은 남의 사용자 테이블 속 한 행이
  아닌 암호학적 신원입니다. 노드는 서로 연합할 뿐, 사용자를 소유하지 않습니다.
- **메시지당 이중 포스트 양자 키 합의.** 하나의 고전 KEM과 두 개의 독립적인 포스트
  양자 KEM을 결합하며, Sovereign 프로파일이 선택된 경우 다운그레이드를 거부합니다.
- **설계상 전송 전 암호화.** 클라이언트가 콘텐츠가 네트워크에 닿기 전에 봉인하며,
  서버는 암호문을 라우팅할 뿐 읽을 수 없습니다.
- **하나의 신원 아래 소셜, 메일, 파일 및 채팅 통합.** 두 번째 계정도, 두 번째 신뢰
  모델도 없으며, 관계 그래프가 유출될 별도 플랫폼도 없습니다.
- **설계 단계부터 연합형 구조.** 필수 중앙 사서함도, 단일 신뢰 지점도, 전역 읽기
  키도 없습니다.
- **정직한 UI 상태.** 누락된 데이터는 장식용 숫자나 지어낸 활동으로 대체하지 않고
  누락된 상태로 표시합니다.
- **명시적인 다운그레이드 경계.** SMTP, 레거시 봉투 및 브라우저 전달은 마케팅 문구
  뒤에 숨기지 않고 경계로서 문서화합니다.
- **오픈 소스, AGPL-3.0-or-later.** 네트워크 소프트웨어는 감사 가능한 상태로 유지되며
  기여분은 커뮤니티에 계속 공개됩니다.
- **운영자를 위한 설계.** 페일 클로즈드 거버넌스, 감사 이벤트, 악용 대응 워크플로 및
  문서화된 노드 운영자 경로를 제공합니다.

---

<a id="build-from-source"></a>
## 소스에서 빌드하기

### 1. 사전 요구 사항

사용 중인 운영체제에 맞게 Node.js 24.13+, Go 1.26.5+, Rust stable을 설치하고,
데스크톱 빌드의 경우 [Tauri 2 사전 요구 사항](https://tauri.app/start/prerequisites/)을
설치하십시오.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. 웹 클라이언트

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

프로덕션 번들은 `Frontend/frontend/dist/`에 생성됩니다.

로컬 개발용 실행:

```bash
npm start
# http://127.0.0.1:5173
```

`VITE_API_URL`은 실행 중인 GaiaCom 백엔드의 오리진(origin)으로만 설정하십시오. 예:

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. 백엔드

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

로컬 개발 노드 실행:

```bash
cp .env.example .env
# 개발 전용으로 독립적인 시크릿 생성
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API는 `SERVER_PORT`(기본값 `8080`)에서 수신 대기합니다. SQLite 데이터베이스는
`DB_PATH`에 생성됩니다. 프로덕션 환경에서는 템플릿 시크릿을 절대 사용하지 마십시오.

### 4. 데스크톱 클라이언트 (Tauri 2)

먼저 웹 클라이언트를 빌드한 다음 아래를 실행하십시오:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

설치 프로그램/실행 파일은 `DesktopClient/src-tauri/target/release/bundle/` 아래에
생성됩니다.
설치 프로그램 없이 빠르게 비서명 빌드를 수행하려면:

```bash
cargo tauri build --no-bundle
```

### 5. Rust 암호화 코어

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (선택 사항)

Android 빌드에는 JDK 17, Android SDK/NDK 및 고정된 툴체인이 필요합니다. 현재 빌드
프로파일은 `Android/` 및 `docs/`를 참고하십시오. Android 클라이언트는 베타 소스
트리의 일부이며, 완성된 스토어 릴리스가 아닙니다.

---

<a id="become-a-node-operator"></a>
## 노드 운영자 되기

GaiaCom 노드는 사용자를 위해 신원, 메시지, 채널, 소셜 화면 및 스토리지를 제공하는
연합 백엔드입니다. 일반 Linux 서버에서 실행할 수 있습니다.

### 권장 기본 사양

- Linux x86_64 또는 arm64, 64비트
- 평가용 노드의 경우 2+ vCPU, 4 GB RAM, 20+ GB SSD (실제 부하에 맞게 산정)
- 전용 DNS 이름 (예: `node.example.org`)
- 유효한 TLS 인증서 (Let's Encrypt 사용 가능)
- 레거시 브리지를 의도적으로 활성화하는 **경우에만** SMTP 릴레이 사용
- 실제로 복구 테스트를 거친 백업

### 1. 빌드 및 설치

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

릴리스 바이너리는 불변 빌드 메타데이터 없이는 시작을 거부합니다. 해당 `-X` 값을
제거하지 마십시오.

### 2. 노드 초기화

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup`은 독립적인 프로덕션 시크릿, 노드 서명 신원 및 구성 파일을 생성합니다.
`/etc/gaiacom/gaiacom.env`의 권한은 `0600`으로 유지하고 서비스 사용자가 소유하도록
설정하십시오.

주요 설정:

| 변수 | 용도 |
|---|---|
| `GAIACOM_SERVER_NAME` | 이 노드의 정규 FQDN; Gaia ID 및 연합에 사용 |
| `GAIACOM_DEV_MODE=false` | 프로덕션 모드, 엄격한 SSRF 및 CSP 동작 |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | 독립적인 32+ 바이트 시크릿 |
| `GAIACOM_SERVER_PRIVATE_KEY` | 안정적인 Ed25519 노드 서명 키 — 암묵적으로 교체하지 마십시오 |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | 안정적인 TrustMesh 에포크(epoch) 파생 시크릿 |
| `DB_PATH` | 영구 SQLite 데이터베이스 경로 |
| `GAIACOM_STORAGE_ROOT` | 웹 루트 외부의 암호화된 첨부 파일 저장소 |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | 리버스 프록시가 클라이언트 IP를 전달하는 경우에만 사용 |

### 3. 거버넌스 부트스트랩 (필수, 페일 클로즈드)

새 노드는 의도적으로 운영자 역할을 **전혀** 부여하지 않습니다. 먼저 클라이언트를 통해
첫 번째 신원을 생성한 다음, 그 정확한 정규화된 Gaia ID를 노드 운영자로 승인하십시오:

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

백엔드가 해당 파일을 가리키도록 설정하고 재시작하십시오:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

정규화된 Gaia ID(`@name:node.example.org`)만 사용하십시오. 기본 관리자 계정도,
갓 모드(god-mode) 폴백도 존재하지 않습니다.

### 4. Systemd 유닛

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

### 5. TLS 리버스 프록시 및 웹 클라이언트

빌드된 `Frontend/frontend/dist/`를 TLS 리버스 프록시 뒤에서 제공하고 API 요청을
`127.0.0.1:8080`의 백엔드로 전달하십시오. 최소 요구 사항:

- TLS 1.2+ (TLS 1.3 권장), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- 엄격한 Content-Security-Policy
- 프로덕션 환경에서 디렉터리 목록 비활성화, 소스 맵 제거
- `GAIACOM_TRUSTED_PROXY_CIDRS`에 나열된 리버스 프록시만 전달된 클라이언트 IP를
  제공할 수 있습니다

실제 호스트명이나 인증서가 포함된 예제 구성은 의도적으로 제공하지 **않습니다**.
자신의 도메인과 인증서 경로를 사용하십시오.

### 6. 연합 및 운영

- 정규 `GAIACOM_SERVER_NAME`을 공지/게시하십시오. 피어들은 HTTPS를 통해 귀하의
  노드에 접속합니다.
- 연합 통신은 재생 방지 및 SSRF 보호가 적용된 서명된 서버 간 PDU를 사용합니다.
- 서비스 상태, 디스크 사용량, 백업 무결성 및 인증서 만료일을 모니터링하십시오.
- SQLite 데이터베이스와 객체 스토리지의 복원을 정기적으로 테스트하십시오.
- 업데이트 중에도 노드 서명 키를 안정적으로 유지하십시오. 키를 교체하면 연합 신뢰가
  깨집니다.
- 하나의 SQLite 파일에 대해 여러 백엔드 프로세스를 실행하지 마십시오. 수평적
  데이터베이스 확장(Postgres, active/active 복제본)은 이 베타 프로파일에 포함되지
  않습니다.

### 노드 운영자 주의 사항

- 베타 소프트웨어이므로 HA(고가용성)를 보장하지 않으며, 유지보수 시간과 재시작이
  필요합니다.
- 이 베타에서는 거버넌스 대상 콘텐츠 및 악용 대응 워크플로가 노드별 정책 범위로
  제한됩니다.
- 서명된 업데이터가 마련되기 전까지 데스크톱 자동 업데이트는 비활성화됩니다.
- SMTP 릴레이에는 인증된 TLS와 함께 SPF, DKIM 및 강제(enforcing) 모드의 DMARC
  정책이 필요합니다. 네이티브 GaiaCom을 벗어나는 메시지는 네이티브 E2EE 보장의
  적용을 받지 않습니다.
- 백업, 시크릿, TLS, DNS, 악용 처리 및 현지 법률 준수에 대한 책임은 운영자 본인에게
  있습니다.

---

<a id="security-and-audit-status"></a>
## 보안 및 감사 현황

### 수행된 작업

- 백엔드, 프론트엔드, 연합, 스토리지, 인증, 인가, 데스크톱 및 브라우저 경계 전반에
  걸친 심층적인 AI 지원 보안 검토.
- 정적 보안 게이트, 적대적 테스트 스위트, 의존성 및 시크릿 위생 검사.
- 명시적 보안 불변량: 서버 측 평문 없음, 개인 키 내보내기 없음, 사칭 엔드포인트 없음,
  E2EE 우회 없음, 전역 읽기 키 없음.
- 거버넌스, 시크릿 검증 및 프로토콜 협상에 대한 페일 클로즈드(fail-closed) 기본값.
- 개발 중 제품 화면과 UI 흐름에 대한 실제 라이브 검증.

### **수행되지 않은** 작업

- **독립적인 제3자 암호학 감사 없음.**
- 프로토콜 또는 구현에 대한 형식 검증 없음.
- 알려지지 않은 취약점이 존재하지 않는다는 보장 없음.
- 정부 등급 또는 고보증 인증 없음.
- 런타임 동작은 노드, 브라우저, 운영체제 및 사용자 본인의 기기 보안에 의존합니다.

### 취약점 보고

취약점은 비공개로 보고해 주십시오:

- 이메일: **security@gaiacom.de**
- 활성 취약점에 대해 공개 Issue를 열지 마십시오.
- 영향을 받는 구성 요소, 버전/커밋, 재현 단계 및 예상/관찰된 동작을 포함해 주십시오.
- 다른 사람의 노드나 데이터를 대상으로 테스트하지 마시고, 파괴적인 공격을 실행하지
  마십시오.

전체 정책은 [SECURITY.md](SECURITY.md)를, 현재 베타 경계는
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md)를 참고하십시오.

### 고보증 환경 사용

생명, 자유 또는 규제 대상 데이터를 보호하는 시스템이 필요하다면, 이 베타는 아직 **그**
시스템이 아닙니다. 독립 감사, 재현 가능한 빌드, 서명된 릴리스, 검증된 업데이트 체인,
운영 키 관리 및 사고 대응 체계가 여전히 필요합니다.

---

<a id="project-structure"></a>
## 프로젝트 구조

```text
GaiaCom/
├── Backend/                  Go API, 연합, 거버넌스, 스토리지, 보안
├── Frontend/frontend/        React 웹 클라이언트 및 PWA
├── DesktopClient/src-tauri/  Tauri 2 데스크톱 셸
├── Android/                  Android 노드/클라이언트 아키텍처
├── Core/rust/gaiacore/       Rust 암호화 코어
├── SovereignCryptoCore/      Rust 암호화 라이브러리
├── SovereignCryptoWasm/      브라우저 WASM 암호화 프로바이더
├── docs/                     아키텍처, 노드 운영, 베타 경계, 스크린샷
├── assets/brand/             GaiaCom 로고 및 브랜드 에셋
├── SECURITY.md               보안 정책 및 공개 절차
├── SOVEREIGN_CRYPTO.md       암호화 설계 및 경계
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## 기여하기

보안 불변량을 유지하고 주장을 정직하게 유지하는 기여는 언제든 환영합니다.

- 먼저 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어 주십시오.
- 제로 트러스트 경계를 유지하십시오: 서버 측 평문 없음, 개인 키 내보내기 없음,
  E2EE 우회 없음.
- 보안과 관련된 동작에 대해 테스트를 추가하십시오.
- 시크릿, 실제 사용자 데이터, 개인 키, 데이터베이스 또는 빌드 산출물을 절대
  커밋하지 마십시오.
- 빌드를 통과시키기 위해 보안 게이트를 약화시키지 마십시오.
- 취약점은 풀 리퀘스트가 아닌 비공개 채널로 보고하십시오.

참여함으로써 귀하는 [행동 강령](CODE_OF_CONDUCT.md)에 동의하게 됩니다.

---

<a id="license"></a>
## 라이선스

GaiaCom은 **이중 라이선스 모델**([VGT Licence](#vgt-licence) 참조)을 따릅니다. 공개된
오픈소스 코드베이스(`GaiaCom Network`)는 **GNU Affero General Public License v3.0
이상**(AGPL-3.0-or-later)에 따라 라이선스가 부여됩니다([LICENSE](LICENSE) 참조). 기업용
운영(**GaiaCom Enterprise**), 공공·정부 기관(**GaiaCom Defend**) 및 AGPL 소스 공개
의무가 없는 상용·폐쇄형 배포(프리미엄 모듈, SLA/지원, 화이트라벨 및 폐쇄망 air-gapped
환경 포함)는 **무료가 아니며**, 다음 경로를 통해 상용 **VGT Licence**를 취득해야 합니다:
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink).

AGPL 하에서 수정된 GaiaCom 오픈소스 소프트웨어를 운영하는 네트워크 운영자는 AGPL의 요구
사항에 따라 해당 소스를 공개해야 합니다. 제3자 구성 요소 및 그 라이선스는
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)와 각 패키지 매니페스트에 나열되어
있습니다.

GaiaCom 및 GaiaCom 로고는 VisionGaiaTechnology의 상표입니다. AGPL 라이선스는 상표권을
부여하지 않습니다.

---

<div align="center">

**VisionGaiaTechnology — 불필요한 보안 부서™**

*공개된 공간에서 구축되는 주권적 통신.*

[웹사이트](https://gaiacom.de) · [보안](SECURITY.md) · [아키텍처](docs/ARCHITECTURE.md)

</div>
