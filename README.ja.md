[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · **日本語** · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — 主権的ポスト量子通信" />

# GaiaCom

### 主権的なポスト量子通信インフラストラクチャ

[![バージョン](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![ライセンス](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![プラットフォーム](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![スタック](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![暗号技術](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![ステータス](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![監査](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![ウェブサイト](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**連合型でクライアント側で暗号化される、ハイブリッド・ポスト量子設計の通信プラットフォーム。**

</div>

> **VisionGaiaTechnology — Department of Unnecessary Security™**
>
> 私たちは、証明できない信頼を要求しない通信インフラストラクチャを構築しています。
> この部門が存在するのは、「不要な」セキュリティこそが、誰かほかの人が鍵を握った
> その瞬間に必要になるものだからです。

---

## 目次

[概要](#overview) · [ベータ V3](#beta-v3) · [スクリーンショット](#screenshots) · [機能](#features) · [技術情報](#technical-information) · [GaiaCom が他と異なる点](#what-makes-gaiacom-different) · [ソースからのビルド](#build-from-source) · [ノード運営者になる](#become-a-node-operator) · [セキュリティと監査の状況](#security-and-audit-status) · [プロジェクト構成](#project-structure) · [コントリビューション](#contributing) · [ライセンス](#license)

---

<a id="overview"></a>
## 概要

今日の通信スタックは、ポスト量子の世界のために設計されていません。メッセンジャーは信頼を
単一のプロバイダーに集中させ、従来のメールは設計の時点で機密ではまったくなく、そして
ほとんどのプラットフォームは、運ぶすべてのものの可読なコピーを保持し続けています。

**GaiaCom は、セキュアな通信を主権的インフラストラクチャとして再定義します。**

GaiaCom は、連合型ネットワーク、クライアント側エンドツーエンド暗号化、バージョン管理された
ハイブリッド・ポスト量子エンベロープ、暗号化されたソーシャルチャネル、暗号化ファイル
ストレージ、そしてノード運営者のためのガバナンス層を、ひとつのアイデンティティのもとで、
ウェブ・デスクトップ・モバイルにわたって統合します。

中核となるルールは、意図的に小さく保たれています。

```text
サーバーはルーティング、保存、レート制限、監査、ポリシーの適用を行ってよい。
サーバーは、ネイティブのプライベートコンテンツを復号する能力を決して受け取ってはならない。
```

GaiaCom は絶対的なセキュリティを主張するものでは**ありません**。それは信頼境界を明示的で、
検証可能で、可能な限り数学的に強制されるものにしようとする試みです。

---

<a id="beta-v3"></a>
## ベータ V3

> **GaiaCom 3 は公開テクニカルベータです。それに応じて扱ってください。**

- **ステータス:** ベータ V3、バージョン `3.0.2`。
- **独立した暗号監査は完了していません。** ポスト量子設計、プロトコル実装、暗号境界は、
  独立した第三者暗号学研究所によるレビューを**受けていません**。
- 私たちはアーキテクチャ、認証、認可、連合、ストレージ、ブラウザおよびデスクトップの境界に
  わたり、**AI 支援による詳細なセキュリティ監査**を実施しました。これらの監査は実際の問題を
  発見し、修正しました。しかしそれは**セキュリティの証明ではありません**。
- **未知の脆弱性が依然として存在する可能性があります** — プロトコル設計、実装、
  依存関係、動作環境、あるいはユーザー自身のデバイスの中に。
- 暗号はささいなところで間違えやすいものです。壊れた前提はテストで常に見えるとは限りません。
  アルゴリズム名をセキュリティの保証とみなさないでください。
- **生命に関わる通信、法的に規制された通信、高価値の通信、不可逆な通信には、このベータで
  GaiaCom を使用しないでください。** 重要なシードとデータの独立したバックアップを保管してください。
- ベータリリース間で破壊的なプロトコル変更や API 変更が発生することがあります。データ損失が
  起こる可能性があります。
- 暗号化が行われる前に、Web クライアントが侵害されたノードによって差し替えられる可能性が
  あります。そのため高保証プロファイルでは、信頼できる独立ビルドのネイティブクライアントが
  必須です。
- SMTP ブリッジは意図的なダウングレード境界です。ネイティブの GaiaCom セキュリティ空間を
  離れたメッセージは、レガシー経路が許す範囲でのみ保護されます。

セキュリティ上の問題を発見した場合は、非公開で報告してください —
[SECURITY.md](SECURITY.md) を参照してください。実際に悪用可能な脆弱性の詳細を公開しないでください。

---

<a id="screenshots"></a>
## スクリーンショット

すべてのスクリーンショットは GaiaCom 3.0.2 を 2560 × 1440 で撮影したものです。表示されている
UI は現在の VGT Aurora デザインであり、スクリーンショットには公開されている製品面と公開連合
コンテンツのみが含まれています。

| ランディングページ | アイデンティティとアクセス |
|---|---|
| ![ランディングページ](docs/screenshots/landing.png) | ![認証ダイアログ](docs/screenshots/auth.png) |
| **公開チャネル — 発見** | **公開チャネル — チャネル表示** |
| ![チャネルの発見](docs/screenshots/channels-discovery.png) | ![チャネル表示](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## 機能

### アイデンティティとアクセス

- **自己管理型の Gaia ID アイデンティティ** — `@name:node.example.org`。ローカルで生成した
  シードから導出されます。秘密鍵はデバイス上に留まります。
- **ローカル鍵保管庫** — 明示的なロック解除、セッションロック、設定可能な自動ロックを備えます。
- **複数デバイスのペアリング** — QR／ワンタイムのペアリングフローに加え、デバイスの一覧表示と失効。
- **鍵履歴と変更警告** — 連絡先のアイデンティティ鍵が変更されたときに警告します。
- **リカバリーフロー** — 明示的に書き留めたリカバリーシードを使用します。サーバー側のリカバリー
  バックドアは存在しません。
- **18 の UI 言語** — ライブの言語切り替え（ランディング、認証、ワークスペース）。

### メッセージング

- **Quantum Chat** — クライアント側暗号化による 1:1 の会話。返信、リアクション、
  ピン留め、検索、添付ファイル、ボイスメモ、暗号化された画像プレビュー。
- **グループチャット** — チャネル、ロール、モデレーション、メンバー管理、スローモード、
  読み取り専用チャネル、参加リクエスト、招待、監査イベント、暗号化エクスポートを備えたルーム。
- **リアクション** — ハートを優先するリアクション操作。デスクトップではホバー、タッチでは長押しで
  パレット全体が開きます。自分のリアクションとして表示されるのは常にちょうど 1 つです。
- **偽の状態はありません** — メッセージ、リアクション、プレゼンス、アクティビティの値は、
  実際のバックエンドに由来するか、利用不可として表示されます。GaiaCom はカウンターを捏造しません。

### GaiaMail

- チャットと同じ暗号アイデンティティの内側にあるメール。
- GaiaCom アイデンティティ間のネイティブ GaiaMail。
- レガシーな連絡先のための **SMTP ブリッジ** — ネイティブ E2EE から明確に分離され、
  レガシー経路が許す範囲でのみ保護されます。
- 署名、フォルダ、フィルタ、ラベルはローカルで処理されます。

### GSN Social

GaiaCom のソーシャル層は、別のアカウントを持つ独立したプラットフォームではありません。あなたの
主権的アイデンティティを再利用します。

- **ホームフィード**、**発見**、**マイネットワーク**、**メッセージ**、**通知**、**グループ**、
  **チャネル**、**GSN Cloud**（GaiaDrive 統合）。
- 投稿、暗号化画像、コメント、リアクション、リポスト、ハッシュタグのトレンドは、実際の
  投稿から計算されます。
- フォロワー、フォロー、おすすめの連絡先は、実際の連合インタラクションから導出されます。
- **公開チャネル** — 購読、発見、カテゴリ、メディア、コメント、モデレーションを備えた、
  ブロードキャスト型コミュニケーションのための場。

### ファイル、保管庫、セキュリティセンター

- **GaiaDrive** — 同じアイデンティティに紐づく暗号化ファイルストレージと共有。
- **GaiaDrop** — アカウントなしで、外部の送信者から暗号化ファイルを受け取ります。
- **GaiaVault** — シークレットと鍵のためのローカル封緘ストレージ。
- **セキュリティセンター** — 実際のデバイス、セッション、鍵、セキュリティイベントの状態に加え、
  ガバナンスと不正利用対応のワークフロー。

### ガバナンスと運用

- ノード運営者、シニアレビュアー、信頼されたレビュアーというロール。
- フェイルクローズドなガバナンスのブートストラップ：新しいノードは既定で運営者ロールを**一切**付与しません。
- 不正利用の報告、モデレーション、透明性の可視化、追記専用の監査イベント。
- リプレイ保護と SSRF 制限を備えた、署名付きサーバー間 PDU による連合。

### デスクトップとモバイル

- **Web/PWA** クライアント — 強化された CSP を備え、CDN 配信のコードを一切使用しません。
- **Tauri 2 デスクトップクライアント** — Windows、Linux、macOS 向け。ネイティブのウィンドウ
  コントロールを備え、明示的な許可リストを超えるネイティブコマンド権限を持ちません。
- **Android** のノード／クライアントアーキテクチャ — ネイティブ暗号コアとプラットフォームバインディング。

---

<a id="technical-information"></a>
## 技術情報

### スタック

| レイヤー | 技術 |
|---|---|
| Web クライアント | React 18、Vite 8、プレーン CSS のデザインレイヤー |
| デスクトップ | Tauri 2（Rust + WebView2/WebKit）、カスタムのフレームレスウィンドウ |
| バックエンド | Go 1.25（`toolchain go1.26.5`）、標準ライブラリ + SQLite、連合およびガバナンスサービス |
| データベース | WAL モードの SQLite（単一ライターのベータプロファイル）、バージョン管理されたマイグレーション |
| 暗号コア | Rust（`gaiacore`）、ブラウザ HQC 用の WebAssembly プロバイダー、ネイティブ Tauri プロバイダー |
| モバイル | Android アプリ + Go モバイルバインディング／ノードカーネルアーキテクチャ |
| ローカリゼーション | 18 言語、共有の翻訳テーブル |

### 暗号設計（Sovereign v1）

```text
鍵確立:             X25519  +  ML-KEM-1024  +  HQC-256
結合器:             長さプレフィックス付きシークレット → HKDF-SHA3-512
高速 AEAD:          Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:    Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                    → XChaCha20-Poly1305 → AES-256-GCM-SIV
署名:               Ed25519 トランスクリプト署名
Top Secret 署名:    Ed25519 + ML-DSA-87
```

署名されたトランスクリプトは、プロトコルバージョン、正確なアルゴリズムスイート、送信者と受信者の
アイデンティティ、受信者の暗号化鍵、エフェメラル鍵、両方の KEM 暗号文、メッセージ ID、
タイムスタンプ、ナンス、暗号化ペイロードを束縛します。未知のスイート、欠落した鍵セット証明、
欠落した Top Secret 署名、不正な HQC 暗号文はフェイルクローズドで拒否されます。

**重要な境界:** Sovereign v1 はメッセージごとのハイブリッドエンベロープであり、
**Triple Ratchet ではありません**。ラチェット由来のポストコンプロマイズセキュリティを
宣伝することはありません。正確な境界は
[SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md) に文書化されています。

### ネットワークモデル

- 連合型ノード、必須の中央サーバーはありません。
- 連合には署名付きサーバー間 PDU を使用します。
- サーバーはルーティングエンベロープ、暗号化されたペイロード／チャンク、公開プロフィール
  フィールド、最小限のメタデータを保存します — ネイティブの平文は決して保存しません。
- ローカル、または S3/MinIO 互換の暗号化オブジェクトストレージ。
- ローカル開発以外では TLS が必須です。

### 要件

| ツール | バージョン |
|---|---|
| Node.js | 24.13（最小 20.19） |
| npm | ロックファイルベースのインストール（`npm ci`） |
| Go | 1.26.5 ツールチェーン（モジュールの対象は 1.25） |
| Rust | stable（コアは CI で固定） |
| Tauri CLI | デスクトップパッケージング用の 2.x |
| Python | 3.10+（任意のリポジトリ／セキュリティスクリプト） |

---

<a id="what-makes-gaiacom-different"></a>
## GaiaCom が他と異なる点

ほとんどの「セキュアな」メッセンジャーは 1 つのレイヤーを改善します。GaiaCom はスタック全体を
一貫したものにしようとします。

- **プラットフォームのアカウントではなく、主権的アイデンティティ。** あなたのアイデンティティは
  暗号的なアイデンティティであり、誰かのユーザーテーブルの 1 行ではありません。ノードは連合しますが、
  あなたを所有することはありません。
- **メッセージごとの二重ポスト量子鍵確立。** 1 つの古典的 KEM と 2 つの独立した
  ポスト量子 KEM が結合され、Sovereign プロファイルが選択されている場合にはダウングレードが
  拒否されます。
- **構造上、転送の前に暗号化。** クライアントはコンテンツがネットワークに到達する前にそれを封緘します。
  サーバーは暗号文をルーティングするだけで、それを読むことはできません。
- **ソーシャル、メール、ファイル、チャットをひとつのアイデンティティの下に。** 2 つ目のアカウントも、
  2 つ目の信頼モデルも、あなたの関係グラフを漏らす別のプラットフォームもありません。
- **設計段階からの連合。** 必須の中央メールボックスも、単一の信頼点も、グローバルな読み取り鍵も
  ありません。
- **正直な UI 状態。** 欠けているデータは欠けているものとして表示され、装飾的な数値や
  でっち上げのアクティビティで置き換えられることはありません。
- **明示的なダウングレード境界。** SMTP、レガシーエンベロープ、ブラウザ配信は、マーケティングの
  言葉で隠すのではなく、境界として文書化されています。
- **オープンソース、AGPL-3.0-or-later。** ネットワークソフトウェアは検査可能なままであり、
  コントリビューションはコミュニティに利用可能なままです。
- **運営者のために作られています。** フェイルクローズドなガバナンス、監査イベント、不正利用対応の
  ワークフロー、そして文書化されたノード運営者の道筋。

---

<a id="build-from-source"></a>
## ソースからのビルド

### 1. 前提条件

Node.js 24.13+、Go 1.26.5+、Rust stable をインストールし、デスクトップビルドの場合は、
お使いのオペレーティングシステム用の
[Tauri 2 の前提条件](https://tauri.app/start/prerequisites/) をインストールしてください。

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Web クライアント

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

本番バンドルは `Frontend/frontend/dist/` に出力されます。

ローカル開発の場合：

```bash
npm start
# http://127.0.0.1:5173
```

`VITE_API_URL` は、稼働中の GaiaCom バックエンドのオリジンにのみ設定してください。例：

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. バックエンド

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

ローカル開発ノードを実行します：

```bash
cp .env.example .env
# 開発専用の独立したシークレットを生成する
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API は `SERVER_PORT`（既定値 `8080`）で待ち受けます。SQLite データベースは `DB_PATH` に
作成されます。テンプレートのシークレットを本番環境で決して使用しないでください。

### 4. デスクトップクライアント（Tauri 2）

まず Web クライアントをビルドしてから、次のようにします：

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

インストーラー／実行ファイルは `DesktopClient/src-tauri/target/release/bundle/` の下に
出力されます。
インストーラーなしの迅速な未署名ビルドの場合：

```bash
cargo tauri build --no-bundle
```

### 5. Rust 暗号コア

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android（任意）

Android ビルドには JDK 17、Android SDK/NDK、そして固定されたツールチェーンが必要です。現在の
ビルドプロファイルについては `Android/` と `docs/` を参照してください。Android クライアントは
ベータのソースツリーの一部であり、完成したストアリリースではありません。

---

<a id="become-a-node-operator"></a>
## ノード運営者になる

GaiaCom ノードは、そのユーザーにアイデンティティ、メッセージ、チャネル、ソーシャル機能、
ストレージを提供する連合型バックエンドです。通常の Linux サーバー上で実行できます。

### 推奨ベースライン

- Linux x86_64 または arm64、64 ビット
- 評価用ノードなら 2 以上の vCPU、4 GB の RAM、20 GB 以上の SSD（実際の負荷に合わせて
  サイズを決めてください）
- 専用の DNS 名（例：`node.example.org`）
- 有効な TLS 証明書（Let's Encrypt で問題ありません）
- **レガシーブリッジを意図的に有効にする場合にのみ** SMTP リレー
- 実際にテストしたバックアップ

### 1. ビルドとインストール

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

リリースバイナリは、不変のビルドメタデータがないと起動を拒否します。これらの `-X` の値を
削除しないでください。

### 2. ノードの初期化

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` は独立した本番シークレット、ノードの署名アイデンティティ、設定ファイルを生成します。
`/etc/gaiacom/gaiacom.env` はモード `0600`、サービスユーザーの所有のままにしてください。

主要な設定：

| 変数 | 目的 |
|---|---|
| `GAIACOM_SERVER_NAME` | このノードの正規 FQDN。Gaia ID と連合で使用されます |
| `GAIACOM_DEV_MODE=false` | 本番モード。厳格な SSRF と CSP の動作 |
| `GAIACOM_JWT_SECRET`、`GAIACOM_SHIELD_SECRET`、`GAIACOM_METRICS_TOKEN` | 独立した 32 バイト以上のシークレット |
| `GAIACOM_SERVER_PRIVATE_KEY` | 安定した Ed25519 ノード署名鍵 — 暗黙にローテーションしないでください |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | 安定した TrustMesh エポック導出シークレット |
| `DB_PATH` | 永続化する SQLite データベースのパス |
| `GAIACOM_STORAGE_ROOT` | Web ルートの外にある暗号化添付ファイルストレージ |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | リバースプロキシがクライアント IP を提供する場合のみ |

### 3. ガバナンスのブートストラップ（必須、フェイルクローズド）

新しいノードは、意図的に運営者ロールを**一切**付与しません。クライアント経由で最初の
アイデンティティを作成し、その正確で完全修飾された Gaia ID をノード運営者として承認してください：

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

バックエンドをそのファイルに向けて、再起動します：

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

完全修飾された Gaia ID（`@name:node.example.org`）のみを使用してください。既定の管理者は
存在せず、ゴッドモードのフォールバックもありません。

### 4. systemd ユニット

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

### 5. TLS リバースプロキシと Web クライアント

ビルドされた `Frontend/frontend/dist/` を TLS リバースプロキシの背後で配信し、API を
`127.0.0.1:8080` のバックエンドへ転送します。最低要件：

- TLS 1.2+（TLS 1.3 を推奨）、HSTS
- `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`
- 厳格な Content-Security-Policy
- ディレクトリリスティングなし、本番環境でのソースマップなし
- 転送されたクライアント IP を提供できるのは、`GAIACOM_TRUSTED_PROXY_CIDRS` に列挙された
  リバースプロキシのみ

サンプル設定には、実際のホスト名や証明書を意図的に**同梱していません**。ご自身のドメインと
証明書のパスを使用してください。

### 6. 連合と運用

- 正規の `GAIACOM_SERVER_NAME` をアナウンス／公開してください。ピアは HTTPS 経由であなたに
  接続します。
- 連合は、リプレイガードと SSRF 保護を備えた署名付きサーバー間 PDU を使用します。
- サービス、ディスク使用量、バックアップの整合性、証明書の有効期限を監視してください。
- SQLite データベースとオブジェクトストレージのリストアを定期的にテストしてください。
- ノード署名鍵は更新をまたいで安定させてください。ローテーションすると連合の信頼が壊れます。
- 1 つの SQLite ファイルに対して複数のバックエンドプロセスを実行しないでください。水平方向の
  データベーススケーリング（Postgres、アクティブ／アクティブのレプリカ）は、このベータ
  プロファイルの対象外です。

### ノード運営者への警告

- ベータソフトウェアです。HA の主張はありません。メンテナンスウィンドウと再起動が必要です。
- このベータでは、ガバナンス対象のコンテンツと不正利用対応のワークフローは、ノードごとの
  ポリシー範囲です。
- 署名付きアップデーターが存在するまで、デスクトップの自動更新は無効です。
- SMTP リレーには、認証された TLS に加えて SPF、DKIM、そして強制ポリシーの DMARC が
  必要です。ネイティブの GaiaCom を離れるメッセージは、ネイティブ E2EE の保証の対象外です。
- バックアップ、シークレット、TLS、DNS、不正利用対応、地域の法律については、あなたが
  責任を負います。

---

<a id="security-and-audit-status"></a>
## セキュリティと監査の状況

### 実施したこと

- バックエンド、フロントエンド、連合、ストレージ、認証、認可、デスクトップ、ブラウザの境界に
  わたる詳細な、AI 支援によるセキュリティレビュー。
- 静的なセキュリティゲート、敵対的テストスイート、依存関係とシークレットの衛生チェック。
- 明示的なセキュリティ不変条件：サーバー側の平文なし、秘密鍵のエクスポートなし、
  なりすまし用エンドポイントなし、E2EE のバイパスなし、グローバルな読み取り鍵なし。
- ガバナンス、シークレット検証、プロトコルネゴシエーションにおけるフェイルクローズドな既定値。
- 開発中の製品面と UI フローに対する実際のライブ検証。

### **実施していない**こと

- **独立した第三者による暗号監査はありません。**
- プロトコルや実装の形式的検証はありません。
- 未知の脆弱性が存在しないという保証はありません。
- 政府グレードまたは高保証の認証はありません。
- 実行時の動作は、ノード、ブラウザ、オペレーティングシステム、そしてユーザー自身の
  デバイスのセキュリティに依存します。

### 報告

脆弱性は非公開で報告してください：

- メール: **security@gaiacom.de**
- 有効な脆弱性について公開 Issue を作成しないでください。
- 影響を受けるコンポーネント、バージョン／コミット、再現手順、期待される動作と実際に
  観測された動作を含めてください。
- 他の人のノードやデータに対してテストを行わないでください。破壊的な攻撃を実行しないでください。

完全なポリシーについては [SECURITY.md](SECURITY.md) を、現在のベータ境界については
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) を参照してください。

### 高保証での利用

生命、自由、または規制対象データを保護するシステムが必要な場合、このベータはまだ**その**
システムではありません。独立した監査、再現可能なビルド、署名付きリリース、検証された更新
チェーン、運用上の鍵管理、インシデント対応が依然として必要です。

---

<a id="project-structure"></a>
## プロジェクト構成

```text
GaiaCom/
├── Backend/                  Go API、連合、ガバナンス、ストレージ、セキュリティ
├── Frontend/frontend/        React Web クライアントと PWA
├── DesktopClient/src-tauri/  Tauri 2 デスクトップシェル
├── Android/                  Android ノード／クライアントアーキテクチャ
├── Core/rust/gaiacore/       Rust 暗号コア
├── SovereignCryptoCore/      Rust 暗号ライブラリ
├── SovereignCryptoWasm/      ブラウザ WASM 暗号プロバイダー
├── docs/                     アーキテクチャ、ノード運用、ベータ境界、スクリーンショット
├── assets/brand/             GaiaCom ロゴとブランドアセット
├── SECURITY.md               セキュリティポリシーと開示
├── SOVEREIGN_CRYPTO.md       暗号設計と境界
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## コントリビューション

セキュリティ不変条件を維持し、主張を正直に保つコントリビューションを歓迎します。

- まず [CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。
- ゼロトラストの境界を維持してください：サーバー側の平文なし、秘密鍵のエクスポートなし、
  E2EE のバイパスなし。
- セキュリティに関わる動作にはテストを追加してください。
- シークレット、実際のユーザーデータ、秘密鍵、データベース、ビルド成果物を決して
  コミットしないでください。
- ビルドを通すためにセキュリティゲートを弱めないでください。
- 脆弱性はプルリクエストの中ではなく、非公開で報告してください。

参加することにより、[行動規範](CODE_OF_CONDUCT.md) に同意したものとみなされます。

---

<a id="license"></a>
## ライセンス

GaiaCom は **GNU Affero General Public License v3.0 or later**（AGPL-3.0-or-later）の下で
ライセンスされています。[LICENSE](LICENSE) を参照してください。

変更した GaiaCom ソフトウェアを運用するネットワーク運営者は、AGPL の要求に従い、対応する
ソースを利用可能にしなければなりません。サードパーティのコンポーネントとそのライセンスは
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) および各パッケージマニフェストに記載されています。

GaiaCom および GaiaCom ロゴは VisionGaiaTechnology の商標です。AGPL ライセンスは商標権を
付与するものではありません。

---

<div align="center">

**VisionGaiaTechnology — Department of Unnecessary Security™**

*主権的な通信を、オープンに構築する。*

[ウェブサイト](https://gaiacom.de) · [セキュリティ](SECURITY.md) · [アーキテクチャ](docs/ARCHITECTURE.md)

</div>
