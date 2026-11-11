[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · **Português** · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Comunicação Soberana Pós-Quântica" />

# GaiaCom

### Infraestrutura soberana de comunicação pós-quântica

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Uma plataforma de comunicação federada e criptografada no cliente com design híbrido pós-quântico.**

</div>

> **VisionGaiaTechnology — Departamento de Segurança Desnecessária™**
>
> Construímos infraestrutura de comunicação que não pede uma confiança que não pode provar.
> O departamento existe porque a segurança "desnecessária" é exatamente o que se torna necessário
> no momento em que outra pessoa detém as chaves.

---

## Menu

[Visão geral](#overview) · [Beta V3](#beta-v3) · [Capturas de tela](#screenshots) · [Funcionalidades](#features) · [Informações técnicas](#technical-information) · [O que torna o GaiaCom diferente](#what-makes-gaiacom-different) · [Compilar a partir do código-fonte](#build-from-source) · [Tornar-se operador de nó](#become-a-node-operator) · [Status de segurança e auditoria](#security-and-audit-status) · [Estrutura do projeto](#project-structure) · [Contribuir](#contributing) · [Licença](#license)

---

<a id="overview"></a>
## Visão geral

As pilhas de comunicação atuais não foram projetadas para um mundo pós-quântico. Os mensageiros
centralizam a confiança em um único provedor, o e-mail clássico nunca foi confidencial por
concepção e a maioria das plataformas mantém uma cópia legível de tudo o que transporta.

**O GaiaCom redefine a comunicação segura como infraestrutura soberana.**

Ele combina uma rede federada, criptografia de ponta a ponta no cliente, um envelope híbrido
pós-quântico versionado, canais sociais criptografados, armazenamento criptografado de arquivos e
uma camada de governança para operadores de nós — em uma única identidade, na web, no desktop e
em dispositivos móveis.

A regra central é deliberadamente concisa:

```text
O servidor pode rotear, armazenar, limitar taxa, auditar e aplicar políticas.
O servidor nunca deve receber a capacidade de descriptografar conteúdo privado nativo.
```

O GaiaCom **não** é uma alegação de segurança absoluta. É uma tentativa de tornar os limites de
confiança explícitos, testáveis e — onde possível — impostos matematicamente.

---

<a id="beta-v3"></a>
## Beta V3

> **O GaiaCom 3 é um beta técnico público. Trate-o como tal.**

- **Status:** Beta V3, versão `3.0.2`.
- **Nenhuma auditoria criptográfica independente foi concluída.** O design pós-quântico, as
  implementações de protocolo e os limites criptográficos **não** foram revisados por um
  laboratório independente de criptografia terceirizado.
- Realizamos **auditorias de segurança aprofundadas assistidas por IA** em arquitetura,
  autenticação, autorização, federação, armazenamento e limites de navegador e desktop. Essas
  auditorias encontraram e corrigiram problemas reais. Elas **não são prova de segurança**.
- **Vulnerabilidades desconhecidas ainda podem existir** — no design do protocolo, na
  implementação, nas dependências, no ambiente operacional ou no próprio dispositivo do usuário.
- É fácil errar sutilmente em criptografia. Premissas quebradas nem sempre são visíveis em testes.
  Não trate nomes de algoritmos como garantia de segurança.
- **Não utilize o GaiaCom para comunicação crítica à vida, regulada por lei, de alto valor ou
  irreversível** neste beta. Mantenha backups independentes de seeds e dados importantes.
- Alterações incompatíveis de protocolo e API podem ocorrer entre versões beta. Perda de dados é
  possível.
- Um cliente web pode ser substituído por um nó comprometido antes que a criptografia aconteça. O
  perfil de alta garantia exige, portanto, clientes nativos confiáveis e compilados de forma
  independente.
- A ponte SMTP é um limite deliberado de rebaixamento (downgrade). Mensagens que deixam o espaço
  de segurança nativo do GaiaCom são protegidas apenas até onde o caminho legado permite.

Se você encontrar um problema de segurança, relate-o em sigilo — consulte
[SECURITY.md](SECURITY.md). Não publique detalhes de exploits ativos.

---

<a id="screenshots"></a>
## Capturas de tela

Todas as capturas de tela são do GaiaCom 3.0.2 em 2560 × 1440. A interface exibida é o design
atual VGT Aurora; as capturas contêm apenas superfícies públicas do produto e conteúdo público de
federação.

| Página inicial | Identidade e acesso |
|---|---|
| ![Página inicial](docs/screenshots/landing.png) | ![Diálogo de autenticação](docs/screenshots/auth.png) |
| **Canais Públicos — descoberta** | **Canais Públicos — visualização de canal** |
| ![Descoberta de canais](docs/screenshots/channels-discovery.png) | ![Visualização de canal](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Funcionalidades

### Identidade e acesso

- **Identidade Gaia ID autogerenciada** — `@name:node.example.org`, derivada de uma seed gerada
  localmente. As chaves privadas permanecem no dispositivo.
- **Cofre local de chaves** com desbloqueio explícito, bloqueio de sessão e bloqueio automático
  configurável.
- **Pareamento multidispositivo** via fluxos de pareamento por QR/uso único, além de listagem e
  revogação de dispositivos.
- **Histórico de chaves e avisos de alteração** quando a chave de identidade de um contato muda.
- **Fluxos de recuperação** com uma seed de recuperação explícita e anotada; não existe backdoor de
  recuperação no servidor.
- **18 idiomas na interface** com seletor de idioma em tempo real (página inicial, autenticação,
  espaço de trabalho).

### Mensagens

- **Quantum Chat** — conversas 1:1 com criptografia no cliente, respostas, reações, mensagens
  fixadas, busca, anexos, notas de voz e pré-visualizações de imagens criptografadas.
- **Chats em Grupo** — salas com canais, papéis, moderação, gerenciamento de membros, modo lento,
  canais somente leitura, solicitações de entrada, convites, eventos de auditoria e exportação
  criptografada.
- **Reações** — controle de reação com foco no coração: passe o mouse no desktop ou pressione e
  segure no toque para abrir a paleta completa; exatamente uma reação é exibida como sua.
- **Sem estados falsos** — valores de mensagem, reação, presença e atividade vêm do backend real ou
  são exibidos como indisponíveis. O GaiaCom não inventa contadores.

### GaiaMail

- Correio dentro da mesma identidade criptográfica do chat.
- GaiaMail nativo entre identidades GaiaCom.
- **Ponte SMTP** para contatos legados — claramente separada da E2EE nativa e protegida apenas na
  medida em que o caminho legado permite.
- Assinaturas, pastas, filtros e marcadores tratados localmente.

### GSN Social

A camada social do GaiaCom não é uma plataforma separada com uma conta separada. Ela reutiliza sua
identidade soberana:

- **Feed inicial**, **Descobrir**, **Minha Rede**, **Mensagens**, **Notificações**, **Grupos**,
  **Canais** e **GSN Cloud** (integração com GaiaDrive).
- Publicações, imagens criptografadas, comentários, reações, republicações e tendências de hashtags
  calculadas a partir de publicações reais.
- Seguidores, perfis seguidos e contatos recomendados derivados de interações reais da federação.
- **Canais Públicos** para comunicação em estilo de transmissão com inscrições, descoberta,
  categorias, mídia, comentários e moderação.

### Arquivos, cofre e centro de segurança

- **GaiaDrive** — armazenamento e compartilhamento criptografado de arquivos vinculado à mesma
  identidade.
- **GaiaDrop** — receba arquivos criptografados de remetentes externos sem precisar de conta.
- **GaiaVault** — armazenamento local selado para segredos e chaves.
- **Centro de Segurança** — estado real de dispositivos, sessões, chaves e eventos de segurança,
  além de fluxos de governança e denúncia de abuso.

### Governança e operações

- Papéis de operador de nó, revisor sênior e revisor confiável.
- Bootstrap de governança fail-closed: um nó recém-criado **não** concede papel de operador por
  padrão.
- Denúncia de abuso, moderação, superfícies de transparência e eventos de auditoria somente para
  acréscimo (append-only).
- Federação via PDUs servidor-a-servidor assinadas com proteção contra replay e limites contra SSRF.

### Desktop e móvel

- Cliente **Web/PWA** com CSP endurecida e sem código entregue via CDN.
- **Cliente desktop Tauri 2** para Windows, Linux e macOS com controles de janela nativos e sem
  permissões de comandos nativos além de uma lista de permissões explícita.
- Arquitetura de nó/cliente **Android** com núcleo criptográfico nativo e bindings de plataforma.

---

<a id="technical-information"></a>
## Informações técnicas

### Stack

| Camada | Tecnologia |
|---|---|
| Cliente web | React 18, Vite 8, camadas de design em CSS puro |
| Desktop | Tauri 2 (Rust + WebView2/WebKit), janela sem moldura personalizada |
| Backend | Go 1.25 (`toolchain go1.26.5`), biblioteca padrão + SQLite, serviços de federação e governança |
| Banco de dados | SQLite em modo WAL (perfil beta de escritor único), migrações versionadas |
| Núcleo criptográfico | Rust (`gaiacore`), provedor WebAssembly para HQC no navegador, provedor nativo Tauri |
| Móvel | Aplicativo Android + Go mobile bindings / arquitetura de kernel de nó |
| Localização | 18 idiomas, tabelas de tradução compartilhadas |

### Design criptográfico (Sovereign v1)

```text
Estabelecimento de chaves:  X25519  +  ML-KEM-1024  +  HQC-256
Combinador:                 segredos prefixados por comprimento → HKDF-SHA3-512
AEAD acelerado:             Twofish-256-EAX → AES-256-GCM
AEAD Top Secret:            Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                            → XChaCha20-Poly1305 → AES-256-GCM-SIV
Assinaturas:                assinatura de transcrição Ed25519
Assinaturas Top Secret:     Ed25519 + ML-DSA-87
```

A transcrição assinada vincula a versão do protocolo, a suíte exata de algoritmos, as identidades
do remetente e do destinatário, a chave de criptografia do destinatário, a chave efêmera, ambos os
textos cifrados KEM, o ID da mensagem, o carimbo de data/hora, o nonce e a carga útil
criptografada. Suítes desconhecidas, provas de conjunto de chaves ausentes, assinaturas Top Secret
ausentes e textos cifrados HQC malformados são rejeitados em modo fail-closed.

**Limite importante:** o Sovereign v1 é um envelope híbrido por mensagem, **não um Triple
Ratchet**. Ele não anuncia segurança pós-comprometimento derivada de ratchet. O limite exato está
documentado em [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Modelo de rede

- Nós federados, sem servidor central obrigatório.
- PDUs servidor-a-servidor assinadas para federação.
- O servidor armazena envelopes de roteamento, cargas úteis/fragmentos criptografados, campos de
  perfil público e metadados mínimos — nunca texto simples nativo.
- Armazenamento de objetos criptografado local ou compatível com S3/MinIO.
- TLS é obrigatório fora do desenvolvimento local.

### Requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | 24.13 (mínimo 20.19) |
| npm | instalação baseada em lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (módulo tem alvo 1.25) |
| Rust | stable (fixado pelo CI para o núcleo) |
| Tauri CLI | 2.x para empacotamento desktop |
| Python | 3.10+ (scripts opcionais do repositório/segurança) |

---

<a id="what-makes-gaiacom-different"></a>
## O que torna o GaiaCom diferente

A maioria dos mensageiros "seguros" melhora uma única camada. O GaiaCom busca tornar toda a pilha
coerente:

- **Identidade soberana em vez de contas de plataforma.** Sua identidade é uma identidade
  criptográfica, não uma linha na tabela de usuários de outra pessoa. Os nós se federam; eles não
  são donos de você.
- **Estabelecimento de chaves pós-quântico duplo por mensagem.** Um KEM clássico e dois KEMs
  pós-quânticos independentes são combinados, com rejeição de downgrade quando o perfil Sovereign é
  selecionado.
- **Criptografia antes do transporte, por construção.** O cliente sela o conteúdo antes que ele
  chegue à rede; o servidor roteia texto cifrado e não consegue lê-lo.
- **Social, correio, arquivos e chat sob uma única identidade.** Nenhuma segunda conta, nenhum
  segundo modelo de confiança, nenhuma plataforma separada para vazar seu grafo social.
- **Federado por design.** Nenhuma caixa de correio central obrigatória, nenhum ponto único de
  confiança, nenhuma chave global de leitura.
- **Estados de UI honestos.** Dados ausentes são mostrados como ausentes, não substituídos por
  números decorativos ou atividade inventada.
- **Limites explícitos de downgrade.** SMTP, envelopes legados e entrega no navegador são
  documentados como limites, não escondidos atrás de linguagem de marketing.
- **Código aberto, AGPL-3.0-or-later.** O software de rede permanece inspecionável e as
  contribuições permanecem disponíveis à comunidade.
- **Construído para operadores.** Governança fail-closed, eventos de auditoria, fluxos de abuso e um
  caminho documentado para operadores de nó.

---

<a id="build-from-source"></a>
## Compilar a partir do código-fonte

### 1. Pré-requisitos

Instale Node.js 24.13+, Go 1.26.5+, Rust stable e — para builds desktop — os
[pré-requisitos do Tauri 2](https://tauri.app/start/prerequisites/) para o seu sistema operacional.

```bash
git clone <YOUR-REPOSITORY-URL> GaiaCom
cd GaiaCom
```

### 2. Cliente web

```bash
cd Frontend/frontend
npm ci
npm test
npm run build
```

O bundle de produção é gravado em `Frontend/frontend/dist/`.

Para desenvolvimento local:

```bash
npm start
# http://127.0.0.1:5173
```

Defina `VITE_API_URL` apenas para a origem de um backend GaiaCom em execução, por exemplo:

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

Execute um nó de desenvolvimento local:

```bash
cp .env.example .env
# gere segredos independentes apenas para desenvolvimento
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

A API escuta em `SERVER_PORT` (padrão `8080`). O banco de dados SQLite é criado em `DB_PATH`.
Nunca use os segredos de modelo em produção.

### 4. Cliente desktop (Tauri 2)

Compile primeiro o cliente web e depois:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Os instaladores/executáveis são gravados em `DesktopClient/src-tauri/target/release/bundle/`.
Para um build rápido sem assinatura e sem instaladores:

```bash
cargo tauri build --no-bundle
```

### 5. Núcleo criptográfico em Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opcional)

Builds Android exigem JDK 17, Android SDK/NDK e o toolchain fixado. Consulte `Android/` e `docs/`
para o perfil de compilação atual. O cliente Android faz parte da árvore de código-fonte do beta,
não sendo um lançamento final de loja.

---

<a id="become-a-node-operator"></a>
## Tornar-se operador de nó

Um nó GaiaCom é o backend federado que atende identidades, mensagens, canais, superfícies sociais
e armazenamento para seus usuários. Ele pode ser executado em um servidor Linux comum.

### Linha de base recomendada

- Linux x86_64 ou arm64, 64 bits
- 2+ vCPU, 4 GB de RAM, 20+ GB de SSD para um nó de avaliação (dimensione conforme sua carga real)
- Um nome DNS dedicado, por ex. `node.example.org`
- Um certificado TLS válido (Let's Encrypt funciona)
- Um relay SMTP **somente se** você ativar intencionalmente a ponte legada
- Backups que você realmente testa

### 1. Compilar e instalar

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

Binários de lançamento recusam iniciar sem metadados de compilação imutáveis; não remova esses
valores `-X`.

### 2. Inicializar o nó

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` gera segredos independentes de produção, a identidade de assinatura do nó e o arquivo de
configuração. Mantenha `/etc/gaiacom/gaiacom.env` com permissão `0600`, pertencente ao usuário do
serviço.

Configurações principais:

| Variável | Finalidade |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN canônico deste nó; usado em Gaia IDs e federação |
| `GAIACOM_DEV_MODE=false` | Modo de produção, comportamento estrito de SSRF e CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Segredos independentes com 32+ bytes |
| `GAIACOM_SERVER_PRIVATE_KEY` | Chave de assinatura Ed25519 estável do nó — nunca rotacione implicitamente |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Segredo estável de derivação de época TrustMesh |
| `DB_PATH` | Caminho persistente do banco de dados SQLite |
| `GAIACOM_STORAGE_ROOT` | Armazenamento criptografado de anexos fora da raiz web |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Somente se um proxy reverso fornecer IPs de clientes |

### 3. Bootstrap de governança (obrigatório, fail-closed)

Um nó novo deliberadamente **não** concede nenhum papel de operador. Crie a primeira identidade
pelo cliente e, em seguida, autorize esse exato Gaia ID totalmente qualificado como operador do nó:

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

Aponte o backend para ele e reinicie:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Use apenas Gaia IDs totalmente qualificados (`@name:node.example.org`). Não há administrador padrão
nem fallback de modo irrestrito.

### 4. Unidade systemd

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

### 5. Proxy reverso TLS e cliente web

Sirva o `Frontend/frontend/dist/` compilado atrás de um proxy reverso TLS e encaminhe a API para o
backend em `127.0.0.1:8080`. Requisitos mínimos:

- TLS 1.2+ (preferencialmente TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Uma Content-Security-Policy estrita
- Sem listagem de diretórios, sem source maps em produção
- Apenas proxies reversos listados em `GAIACOM_TRUSTED_PROXY_CIDRS` podem fornecer IPs de clientes
  encaminhados

Uma configuração de exemplo intencionalmente **não** é enviada com hostnames ou certificados reais;
use seu próprio domínio e caminhos de certificado.

### 6. Federação e operação

- Anuncie/publique seu `GAIACOM_SERVER_NAME` canônico; os pares endereçam você via HTTPS.
- A federação usa PDUs servidor-a-servidor assinadas com proteções contra replay e proteção SSRF.
- Monitore o serviço, o uso de disco, a integridade dos backups e a expiração dos certificados.
- Teste regularmente as restaurações do banco de dados SQLite e do armazenamento de objetos.
- Mantenha a chave de assinatura do nó estável entre atualizações; rotacioná-la quebra a confiança
  da federação.
- Não execute múltiplos processos de backend apontando para o mesmo arquivo SQLite. Escalonamento
  horizontal de banco de dados (Postgres, réplicas ativo/ativo) não faz parte deste perfil beta.

### Avisos para operadores de nó

- Software beta; sem garantia de alta disponibilidade (HA); janelas de manutenção e reinicializações
  são necessárias.
- Conteúdo governado e fluxos de abuso têm escopo de política por nó neste beta.
- Atualizações automáticas no desktop estão desativadas até que exista um atualizador assinado.
- O relay SMTP requer TLS autenticado além de SPF, DKIM e uma política DMARC impositiva. Mensagens
  que saem do GaiaCom nativo não são cobertas pelas garantias da E2EE nativa.
- Você é responsável por backups, segredos, TLS, DNS, tratamento de abusos e legislação local.

---

<a id="security-and-audit-status"></a>
## Status de segurança e auditoria

### O que foi feito

- Revisões aprofundadas de segurança assistidas por IA em backend, frontend, federação,
  armazenamento, autenticação, autorização, desktop e limites do navegador.
- Portões estáticos de segurança, suítes de testes adversariais, verificações de dependências e
  higiene de segredos.
- Invariantes de segurança explícitos: nenhum texto simples no servidor, nenhuma exportação de
  chave privada, nenhum endpoint de personificação, nenhum contorno de E2EE, nenhuma chave global
  de leitura.
- Padrões fail-closed para governança, validação de segredos e negociação de protocolo.
- Verificação real ao vivo das superfícies do produto e fluxos de UI durante o desenvolvimento.

### O que **não** foi feito

- **Nenhuma auditoria criptográfica independente por terceiros.**
- Nenhuma verificação formal do protocolo ou das implementações.
- Nenhuma garantia de que vulnerabilidades desconhecidas não existam.
- Nenhuma certificação de nível governamental ou de alta garantia.
- O comportamento em tempo de execução depende do nó, do navegador, do sistema operacional e da
  própria segurança do dispositivo do usuário.

### Relato de vulnerabilidades

Por favor, relate vulnerabilidades em sigilo:

- E-mail: **security@gaiacom.de**
- Não abra uma issue pública para uma vulnerabilidade ativa.
- Inclua componente afetado, versão/commit, passos de reprodução e comportamento esperado/observado.
- Não faça testes contra nós ou dados de outras pessoas e não execute ataques destrutivos.

Consulte [SECURITY.md](SECURITY.md) para a política completa e
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) para os limites atuais do beta.

### Uso de alta garantia

Se você precisa de um sistema que proteja a vida, a liberdade ou dados regulamentados, este beta
**ainda não** é esse sistema. Auditorias independentes, builds reproduzíveis, lançamentos
assinados, cadeias de atualização verificadas, gestão operacional de chaves e resposta a incidentes
ainda são necessários.

---

<a id="project-structure"></a>
## Estrutura do projeto

```text
GaiaCom/
├── Backend/                  API Go, federação, governança, armazenamento, segurança
├── Frontend/frontend/        Cliente web React e PWA
├── DesktopClient/src-tauri/  Shell desktop Tauri 2
├── Android/                  Arquitetura de nó/cliente Android
├── Core/rust/gaiacore/       Núcleo criptográfico em Rust
├── SovereignCryptoCore/      Biblioteca criptográfica em Rust
├── SovereignCryptoWasm/      Provedor criptográfico WASM para navegador
├── docs/                     Arquitetura, operação de nó, limites do beta, capturas de tela
├── assets/brand/             Logotipo do GaiaCom e ativos de marca
├── SECURITY.md               Política de segurança e divulgação
├── SOVEREIGN_CRYPTO.md       Design criptográfico e limites
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Contribuir

Contribuições são bem-vindas se preservarem os invariantes de segurança e mantiverem as afirmações
honestas.

- Leia primeiro [CONTRIBUTING.md](CONTRIBUTING.md).
- Mantenha o limite zero-trust: nenhum texto simples no servidor, nenhuma exportação de chave
  privada, nenhum contorno de E2EE.
- Adicione testes para comportamento relevante à segurança.
- Nunca faça commit de segredos, dados reais de usuários, chaves privadas, bancos de dados ou
  artefatos de compilação.
- Não enfraqueça portões de segurança para fazer um build passar.
- Relate vulnerabilidades em sigilo, não em pull requests.

Ao participar, você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licença

O GaiaCom é licenciado sob a **GNU Affero General Public License v3.0 or later**
(AGPL-3.0-or-later). Consulte [LICENSE](LICENSE).

Operadores de rede que executam software GaiaCom modificado devem disponibilizar o código-fonte
correspondente conforme exigido pela AGPL. Componentes de terceiros e suas licenças estão listados
em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) e nos respectivos manifestos de pacotes.

GaiaCom e o logotipo do GaiaCom são marcas registradas da VisionGaiaTechnology. A licença AGPL não
concede direitos de marca registrada.

---

<div align="center">

**VisionGaiaTechnology — Departamento de Segurança Desnecessária™**

*Comunicação soberana, construída em aberto.*

[Site](https://gaiacom.de) · [Segurança](SECURITY.md) · [Arquitetura](docs/ARCHITECTURE.md)

</div>
