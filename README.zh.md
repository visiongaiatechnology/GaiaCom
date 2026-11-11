[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · **简体中文** · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — 主权后量子通信" />

# GaiaCom

### 主权后量子通信基础设施

[![版本](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![许可证](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![平台](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![技术栈](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![密码学](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![状态](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![审计状态](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![官方网站](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**一个采用混合后量子设计的联邦式、客户端加密通信平台。**

</div>

> **VisionGaiaTechnology — 不必要安全部™**
>
> 我们构建的通信基础设施，绝不索取无法自证的信任。
> 这个部门之所以存在，是因为所谓“不必要”的安全，恰恰是在别人掌握密钥的
> 那一刻变得必不可少的东西。

---

## 目录

[概述](#overview) · [Beta V3](#beta-v3) · [界面截图](#screenshots) · [功能特性](#features) · [技术信息](#technical-information) · [GaiaCom 的与众不同之处](#what-makes-gaiacom-different) · [从源码构建](#build-from-source) · [成为节点运营者](#become-a-node-operator) · [安全与审计状态](#security-and-audit-status) · [项目结构](#project-structure) · [参与贡献](#contributing) · [许可证](#license)

---

<a id="overview"></a>
## 概述

当今的通信技术栈并非为后量子世界而设计。即时通讯工具将信任集中于单一服务商，
传统电子邮件从设计之初就不具备机密性，而大多数平台都会保留其所传输一切内容的
可读副本。

**GaiaCom 将安全通信重新定义为主权基础设施。**

它将联邦网络、客户端端到端加密、版本化的混合后量子加密信封、加密社交频道、
加密文件存储以及面向节点运营者的治理层融为一体——通过单一身份，跨越 Web、
桌面端与移动端。

其核心规则刻意保持精简：

```text
服务器可以路由、存储、限流、审计并执行策略。
服务器绝不能获得解密原生私有内容的能力。
```

GaiaCom **并非**声称拥有绝对安全，而是力求让信任边界变得明确、可测试，并在
可能的地方通过数学机制加以强制执行。

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 是公开的技术测试版（Beta）。请据此谨慎对待。**

- **状态：** Beta V3，版本 `3.0.2`。
- **尚未完成独立密码学审计。** 本项目的后量子设计、协议实现与密码学边界**尚未**
  经过独立第三方密码学实验室的审查。
- 我们已在架构、身份认证、授权、联邦机制、存储、浏览器与桌面端边界方面开展了
  **深度的 AI 辅助安全审计**。这些审计确实发现并修复了真实存在的问题，但它们
  **不能作为安全性的证明**。
- **未知漏洞仍可能存在**——无论是在协议设计、具体实现、依赖项、运行环境还是
  用户自身的设备中。
- 密码学在细节上极易出错，被打破的安全假设并不总能在测试中显现。切勿将算法
  名称本身视为安全保证。
- 在此 Beta 阶段，**请勿将 GaiaCom 用于关乎生命安全、受法律严格监管、高价值或
  不可逆的通信**。请对重要助记词（Seed）和数据保留独立备份。
- 不同 Beta 版本之间可能会发生破坏性的协议和 API 变更，存在数据丢失的可能。
- Web 客户端在加密发生之前可能被遭到入侵的节点替换。因此，高保障使用场景必须
  依赖受信任、独立构建的原生客户端。
- SMTP 桥接是一个明确设定的降级边界。离开原生 GaiaCom 安全空间的消息，只能获得
  传统邮件路径所允许的保护程度。

如果您发现了安全问题，请通过私密渠道报告——请参阅
[SECURITY.md](SECURITY.md)。请勿公开披露可被主动利用的漏洞细节。

---

<a id="screenshots"></a>
## 界面截图

以下所有截图均采集自 2560 × 1440 分辨率下的 GaiaCom 3.0.2。展示的界面为当前
VGT Aurora 设计；截图中仅包含公开产品界面与公开联邦内容。

| 登录首页 | 身份与访问 |
|---|---|
| ![登录首页](docs/screenshots/landing.png) | ![认证对话框](docs/screenshots/auth.png) |
| **公共频道 — 发现页** | **公共频道 — 频道视图** |
| ![频道发现页](docs/screenshots/channels-discovery.png) | ![频道视图](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## 功能特性

### 身份与访问

- **自主管理的 Gaia ID 身份** — 格式为 `@name:node.example.org`，由本地生成的
  种子（Seed）派生。私钥始终保存在设备本地。
- **本地密钥库**，支持显式解锁、会话锁定及可配置的自动锁定。
- **多设备配对**，通过二维码或一次性配对流程完成，同时支持设备列表查看与吊销。
- **密钥历史与变更警告**，在联系人的身份密钥发生变化时发出提醒。
- **恢复流程**，使用明确记录在纸面等离线介质上的恢复种子；不存在服务端恢复后门。
- **18 种界面语言**，配备实时语言切换器（覆盖首页、认证流程及工作区）。

### 即时消息

- **Quantum Chat** — 支持客户端加密的 1 对 1 会话，提供回复、表情回应、置顶、
  搜索、附件、语音消息及加密图片预览功能。
- **群组聊天** — 支持分频道、角色权限、内容审核、成员管理、慢速模式、只读频道、
  入群申请、邀请、审计事件以及加密导出功能的房间。
- **表情回应** — 以点赞红心为首的回应控件：桌面端悬停或触屏长按即可展开完整
  表情面板；仅将你自己的回应标记为已选。
- **无虚假状态** — 消息、回应、在线状态和活跃度数值均来自真实后端，或在不可用时
  显示为不可用。GaiaCom 不会虚构任何计数。

### GaiaMail

- 与即时聊天共用同一密码学身份的邮件系统。
- GaiaCom 身份之间可进行原生 GaiaMail 加密通信。
- **SMTP 桥接**用于对接传统联系人——与原生端到端加密（E2EE）清晰隔离，仅受限于
  传统路径所能提供的保护级别。
- 签名、文件夹、过滤规则与标签均在本地处理。

### GSN Social

GaiaCom 的社交层并非需要单独注册账号的割裂平台，而是直接复用你的主权身份：

- **首页动态（Home feed）**、**发现（Discover）**、**我的人脉（My Network）**、
  **消息（Messages）**、**通知（Notifications）**、**群组（Groups）**、
  **频道（Channels）**以及 **GSN Cloud**（GaiaDrive 集成）。
- 帖子、加密图片、评论、点赞回应、转发以及基于真实帖文计算的话题标签趋势。
- 基于真实联邦交互生成的粉丝、关注及推荐联系人。
- **公共频道**，支持订阅、发现、分类、媒体附件、评论与审核的广播式传播。

### 文件、密钥库与安全中心

- **GaiaDrive** — 绑定在同一身份下的加密文件存储与分享服务。
- **GaiaDrop** — 无需账号即可接收来自外部发送者的加密文件。
- **GaiaVault** — 用于存储机密信息与密钥的本地密封存储。
- **安全中心（Security Center）** — 展示真实的设备、会话、密钥及安全事件状态，
  并提供治理与滥用处置工作流。

### 治理与运维

- 节点运营者（Node operator）、高级审核员（Senior reviewer）与受信任审核员（Trusted reviewer）角色。
- 失效关闭（Fail-closed）的治理引导机制：全新节点默认**不**授予任何运营者角色。
- 滥用举报、内容审核、透明度页面以及仅追加（append-only）的审计事件日志。
- 基于带签名服务器间 PDU 的联邦通信，具备重放保护与 SSRF 限制。

### 桌面端与移动端

- **Web/PWA** 客户端，采用严格加固的 CSP 策略，不包含任何 CDN 分发的代码。
- **Tauri 2 桌面客户端**，支持 Windows、Linux 和 macOS，配备原生窗口控件，且不授予
  显式白名单之外的任何原生命令权限。
- **Android** 节点/客户端架构，内置原生密码学核心及平台绑定。

---

<a id="technical-information"></a>
## 技术信息

### 技术栈

| 层级 | 技术实现 |
|---|---|
| Web 客户端 | React 18、Vite 8、纯 CSS 设计层级 |
| 桌面端 | Tauri 2（Rust + WebView2/WebKit）、自定义无边框窗口 |
| 后端 | Go 1.25（`toolchain go1.26.5`）、标准库 + SQLite、联邦与治理服务 |
| 数据库 | WAL 模式下的 SQLite（单写入者 Beta 配置）、版本化数据库迁移 |
| 密码学核心 | Rust（`gaiacore`）、浏览器端 HQC 的 WebAssembly 提供程序、原生 Tauri 提供程序 |
| 移动端 | Android 应用 + Go 移动端绑定 / 节点内核架构 |
| 本地化 | 18 种语言、共享翻译表 |

### 密码学设计（Sovereign v1）

```text
密钥协商:         X25519  +  ML-KEM-1024  +  HQC-256
密钥合并器:       带长度前缀的秘密值 → HKDF-SHA3-512
加速 AEAD:        Twofish-256-EAX → AES-256-GCM
Top Secret AEAD:  Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                  → XChaCha20-Poly1305 → AES-256-GCM-SIV
数字签名:         Ed25519 转录签名
Top Secret 签名:  Ed25519 + ML-DSA-87
```

签名转录绑定了协议版本、精确的算法套件、发送方与接收方身份、接收方加密公钥、
临时公钥、两个 KEM 密文、消息 ID、时间戳、随机数（Nonce）以及加密载荷。未知的
算法套件、缺失的密钥集证明、缺失的 Top Secret 签名以及格式错误的 HQC 密文均会
以失效关闭（fail-closed）方式被拒绝。

**重要边界说明：** Sovereign v1 是一种逐消息的混合加密信封，**而非 Triple Ratchet**。
它不承诺基于棘轮机制的泄露后安全性（Post-compromise security）。具体边界详见
[SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md)。

### 网络模型

- 联邦节点架构，无强制性的中心服务器。
- 使用经过签名的服务器间 PDU 进行联邦通信。
- 服务器仅存储路由信封、加密载荷/分片、公开个人资料字段及最少必要元数据——绝不
  存储原生明文。
- 本地存储或兼容 S3/MinIO 的加密对象存储。
- 除本地开发环境外，强制要求启用 TLS。

### 环境要求

| 工具 | 版本 |
|---|---|
| Node.js | 24.13（最低要求 20.19） |
| npm | 基于锁文件的安装（`npm ci`） |
| Go | 1.26.5 工具链（模块目标为 1.25） |
| Rust | stable（由 CI 针对核心库固定版本） |
| Tauri CLI | 2.x，用于桌面端打包 |
| Python | 3.10+（可选，用于仓库与安全脚本） |

---

<a id="what-makes-gaiacom-different"></a>
## GaiaCom 的与众不同之处

大多数“安全”通讯软件只改善某一个层级，而 GaiaCom 力求让整个技术栈保持一致：

- **主权身份替代平台账号。** 你的身份是一个密码学身份，而不是别人数据库用户表中的
  一行记录。节点之间彼此联邦互联，但它们并不拥有你。
- **逐消息的双重后量子密钥协商。** 将一种经典 KEM 与两种相互独立的后量子 KEM
  组合使用，并在选择 Sovereign 配置时拒绝任何降级行为。
- **架构级的传输前加密。** 客户端在内容进入网络之前即完成密封加密；服务器仅负责
  路由密文，无法读取其中内容。
- **社交、邮件、文件与聊天归于同一身份。** 无需第二个账号，无需第二套信任模型，
  也不会因割裂的平台而泄露你的关系图谱。
- **生而联邦。** 没有强制性的中心邮箱，没有单一信任节点，也没有全局读取密钥。
- **诚实的界面状态。** 缺失的数据就按缺失显示，绝不用装饰性数字或虚构的活跃度
  取而代之。
- **明确标示的降级边界。** SMTP、传统信封以及浏览器端分发均被明确记录为安全边界，
  而非隐藏在营销话术背后。
- **开源协议，AGPL-3.0-or-later。** 网络服务软件保持可审查性，社区贡献也始终向
  社区保持开放。
- **面向运营者打造。** 具备失效关闭的治理机制、审计事件、滥用处置流程以及成文的
  节点运营指南。

---

<a id="build-from-source"></a>
## 从源码构建

### 1. 前置依赖

请根据你的操作系统安装 Node.js 24.13+、Go 1.26.5+、Rust stable，若需构建桌面端，
还需安装对应平台的 [Tauri 2 前置依赖](https://tauri.app/start/prerequisites/)。

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Web 客户端

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

生产构建产物会输出到 `Frontend/frontend/dist/`。

本地开发启动命令：

```bash
npm start
# http://127.0.0.1:5173
```

请仅将 `VITE_API_URL` 设置为正在运行的 GaiaCom 后端地址（Origin），例如：

```bash
VITE_API_URL=http://127.0.0.1:8080 npm start
```

### 3. 后端

```bash
cd Backend
go build -trimpath \
  -ldflags="-s -w \
    -X gaiacom/backend/buildinfo.Version=3.0.2 \
    -X gaiacom/backend/buildinfo.Commit=$(git rev-parse --short HEAD) \
    -X gaiacom/backend/buildinfo.BuiltAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o gaiacom-backend ./cmd/gaiacom
```

运行本地开发节点：

```bash
cp .env.example .env
# 仅在开发环境中生成独立密钥
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

API 默认在 `SERVER_PORT`（默认 `8080`）端口监听，SQLite 数据库将创建于 `DB_PATH`。
切勿在生产环境中使用模板文件中的示例密钥。

### 4. 桌面客户端（Tauri 2）

请先构建 Web 客户端，然后执行：

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

安装包与可执行文件将生成在 `DesktopClient/src-tauri/target/release/bundle/` 目录下。
如需在不生成安装包的情况下进行快速未签名构建：

```bash
cargo tauri build --no-bundle
```

### 5. Rust 密码学核心

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android（可选）

Android 构建需要 JDK 17、Android SDK/NDK 以及固定的工具链。当前构建配置请参考
`Android/` 和 `docs/`。Android 客户端目前是 Beta 源码树的一部分，尚非面向应用商店的
最终发布版本。

---

<a id="become-a-node-operator"></a>
## 成为节点运营者

GaiaCom 节点是为其用户提供身份、消息、频道、社交界面与存储服务的联邦后端。它可以
运行在常规的 Linux 服务器上。

### 推荐基础配置

- 64 位 Linux（x86_64 或 arm64）
- 评估节点建议 2+ vCPU、4 GB 内存、20+ GB SSD（请根据实际负载调整规格）
- 专用域名（DNS 名称），例如 `node.example.org`
- 有效的 TLS 证书（Let's Encrypt 即可）
- **仅当**你明确需要启用传统桥接时配置 SMTP 中继
- 经过实际恢复验证的备份方案

### 1. 构建与安装

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

发行版二进制文件若缺少不可变的构建元数据将拒绝启动；请勿移除上述 `-X` 参数。

### 2. 初始化节点

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` 会生成独立的生产密钥、节点签名身份以及配置文件。请确保 `/etc/gaiacom/gaiacom.env`
权限保持为 `0600`，且归属于服务运行用户。

关键配置项：

| 变量 | 用途 |
|---|---|
| `GAIACOM_SERVER_NAME` | 本节点的规范 FQDN 域名；用于 Gaia ID 与联邦通信 |
| `GAIACOM_DEV_MODE=false` | 生产模式，启用严格的 SSRF 与 CSP 行为 |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | 各自独立的 32+ 字节密钥 |
| `GAIACOM_SERVER_PRIVATE_KEY` | 稳定的 Ed25519 节点签名私钥——切勿隐式轮换 |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | 稳定的 TrustMesh 纪元（Epoch）派生密钥 |
| `DB_PATH` | 持久化的 SQLite 数据库路径 |
| `GAIACOM_STORAGE_ROOT` | 位于 Web 根目录之外的加密附件存储路径 |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | 仅当反向代理转发客户端真实 IP 时配置 |

### 3. 治理引导（必需，失效关闭）

全新节点刻意**不**授予任何运营者角色。请先通过客户端创建第一个身份，然后将该精确的、
完全限定的 Gaia ID 授权为节点运营者：

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

让后端指向该配置文件并重启服务：

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

请仅使用完全限定的 Gaia ID（`@name:node.example.org`）。系统中不存在默认管理员，
也不存在上帝模式（god-mode）后备账号。

### 4. Systemd 服务单元

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

### 5. TLS 反向代理与 Web 客户端

请通过支持 TLS 的反向代理托管已构建的 `Frontend/frontend/dist/`，并将 API 请求转发至
`127.0.0.1:8080` 上的后端服务。最低安全要求：

- TLS 1.2+（推荐 TLS 1.3），启用 HSTS
- 设置 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`
- 配置严格的 Content-Security-Policy（CSP）
- 生产环境中禁用目录浏览，不提供 Source Map
- 仅允许列在 `GAIACOM_TRUSTED_PROXY_CIDRS` 中的反向代理传递转发的客户端 IP

本项目刻意**不**随附带有真实主机名或证书的示例配置文件；请使用你自己的域名与证书路径。

### 6. 联邦互联与日常运维

- 公布/发布你的规范 `GAIACOM_SERVER_NAME`；对等节点将通过 HTTPS 与你通信。
- 联邦通信使用经过签名的服务器间 PDU，内置重放防护与 SSRF 保护。
- 持续监控服务状态、磁盘占用、备份完整性及证书到期时间。
- 定期演练 SQLite 数据库与对象存储的恢复测试。
- 在版本更新过程中保持节点签名密钥不变；轮换该密钥会破坏联邦信任关系。
- 切勿让多个后端进程同时读写同一个 SQLite 文件。数据库水平扩展（如 Postgres、
  双活副本）不在当前 Beta 配置的支持范围内。

### 节点运营者注意事项

- 本软件仍处于 Beta 阶段，不提供高可用（HA）保证；需要预留维护窗口并执行重启。
- 在此 Beta 阶段，受治理的内容与滥用处置工作流仅在单个节点的策略范围内生效。
- 在具备签名更新机制之前，桌面客户端的自动更新功能处于禁用状态。
- SMTP 中继要求启用经过身份验证的 TLS 以及 SPF、DKIM 和强制执行模式的 DMARC 策略。
  离开原生 GaiaCom 的消息不再受原生 E2EE 安全保证覆盖。
- 你需自行负责备份、密钥管理、TLS、DNS、滥用处置以及遵守当地法律法规。

---

<a id="security-and-audit-status"></a>
## 安全与审计状态

### 已完成的工作

- 针对后端、前端、联邦、存储、身份认证、授权、桌面端与浏览器边界进行了深度的
  AI 辅助安全审查。
- 建立了静态安全门禁、对抗性测试套件、依赖项及密钥卫生检查。
- 确立了明确的安全不变量：无服务端明文、无私钥导出、无身份冒充端点、无 E2EE 绕过、
  无全局读取密钥。
- 在治理、密钥验证和协议协商中采用失效关闭（Fail-closed）默认策略。
- 在开发过程中对产品界面与 UI 流程开展了真实环境的实机验证。

### **尚未**完成的工作

- **尚未经过独立第三方密码学审计。**
- 尚未对协议或其代码实现进行形式化验证。
- 无法保证不存在未知漏洞。
- 未获得政府级或高保障安全认证。
- 运行时行为依然取决于节点环境、浏览器、操作系统以及用户自身设备的安全性。

### 漏洞报告

请通过私密渠道报告安全漏洞：

- 邮箱：**security@gaiacom.de**
- 请勿针对仍处于活跃状态的漏洞提交公开 Issue。
- 请附上受影响的组件、版本号/Commit ID、复现步骤以及预期行为与实际观察到的行为。
- 请勿对他人的节点或数据进行测试，也不要执行破坏性攻击。

完整策略请参阅 [SECURITY.md](SECURITY.md)，当前 Beta 边界请参阅
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md)。

### 高保障场景使用说明

如果你需要一套用于保护生命安全、人身自由或受严格监管数据的系统，当前 Beta 版本**还不是**
这样的系统。它仍然需要独立安全审计、可重现构建、签名发布、经过验证的更新链、规范的
运营密钥管理以及应急响应体系。

---

<a id="project-structure"></a>
## 项目结构

```text
GaiaCom/
├── Backend/                  Go API、联邦、治理、存储、安全模块
├── Frontend/frontend/        React Web 客户端与 PWA
├── DesktopClient/src-tauri/  Tauri 2 桌面端外壳
├── Android/                  Android 节点/客户端架构
├── Core/rust/gaiacore/       Rust 密码学核心
├── SovereignCryptoCore/      Rust 密码学基础库
├── SovereignCryptoWasm/      浏览器 WASM 密码学提供程序
├── docs/                     系统架构、节点运维、Beta 边界、界面截图
├── assets/brand/             GaiaCom 标志与品牌资产
├── SECURITY.md               安全策略与漏洞披露
├── SOVEREIGN_CRYPTO.md       密码学设计与安全边界
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## 参与贡献

只要能够坚守安全不变量并保持表述诚实，我们欢迎任何形式的贡献。

- 请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 坚守零信任边界：绝不在服务端保留明文、绝不导出私钥、绝不绕过端到端加密（E2EE）。
- 为涉及安全的行为编写测试。
- 切勿提交密钥、真实用户数据、私钥、数据库文件或构建产物。
- 切勿为了通过构建而削弱安全检查门禁。
- 请私密报告漏洞，切勿在 Pull Request 中披露。

参与本项目即表示你同意遵守我们的[行为准则](CODE_OF_CONDUCT.md)。

---

<a id="license"></a>
## 许可证

GaiaCom 基于 **GNU Affero General Public License v3.0 或更高版本**
（AGPL-3.0-or-later）发布。详见 [LICENSE](LICENSE)。

运行经过修改的 GaiaCom 软件的网络运营者，必须按照 AGPL 协议的要求提供对应的
源代码。第三方组件及其许可证列于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
以及各自的包清单文件中。

GaiaCom 及 GaiaCom 徽标均为 VisionGaiaTechnology 的商标。AGPL 许可证不授予任何
商标权利。

---

<div align="center">

**VisionGaiaTechnology — 不必要安全部™**

*主权通信，在开放中构建。*

[官方网站](https://gaiacom.de) · [安全政策](SECURITY.md) · [系统架构](docs/ARCHITECTURE.md)

</div>
