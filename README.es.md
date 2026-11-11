[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · **Español** · [Français](README.fr.md) · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Comunicación soberana postcuántica" />

# GaiaCom

### Infraestructura soberana de comunicación postcuántica

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Una plataforma de comunicación federada y cifrada en el cliente, con un diseño híbrido postcuántico.**

</div>

> **VisionGaiaTechnology — Departamento de Seguridad Innecesaria™**
>
> Construimos infraestructura de comunicación que no pide una confianza que no puede demostrar.
> El departamento existe porque la seguridad «innecesaria» es exactamente lo que se vuelve
> necesaria en el momento en que otra persona tiene las llaves.

---

## Menú

[Visión general](#overview) · [Beta V3](#beta-v3) · [Capturas de pantalla](#screenshots) · [Funciones](#features) · [Información técnica](#technical-information) · [Qué diferencia a GaiaCom](#what-makes-gaiacom-different) · [Compilar desde el código fuente](#build-from-source) · [Conviértete en operador de nodo](#become-a-node-operator) · [Estado de seguridad y auditoría](#security-and-audit-status) · [Estructura del proyecto](#project-structure) · [Contribuir](#contributing) · [Licencia](#license)

---

<a id="overview"></a>
## Visión general

Las pilas de comunicación actuales no se diseñaron para un mundo postcuántico. Los mensajeros
centralizan la confianza en un único proveedor, el correo electrónico clásico nunca fue
confidencial por diseño, y la mayoría de las plataformas conservan una copia legible de todo lo
que transportan.

**GaiaCom redefine la comunicación segura como infraestructura soberana.**

Combina una red federada, cifrado de extremo a extremo en el lado del cliente, un sobre
postcuántico híbrido versionado, canales sociales cifrados, almacenamiento de archivos cifrado y
una capa de gobernanza para operadores de nodo — en una sola identidad, en web, escritorio y
móvil.

La regla central es deliberadamente breve:

```text
El servidor puede enrutar, almacenar, limitar la tasa, auditar y aplicar políticas.
El servidor nunca debe recibir la capacidad de descifrar contenido privado nativo.
```

GaiaCom **no** es una promesa de seguridad absoluta. Es un intento de hacer que los límites de
confianza sean explícitos, verificables y — cuando es posible — matemáticamente exigibles.

---

<a id="beta-v3"></a>
## Beta V3

> **GaiaCom 3 es una beta técnica pública. Trátala como tal.**

- **Estado:** Beta V3, versión `3.0.2`.
- **No se ha completado ninguna auditoría criptográfica independiente.** El diseño postcuántico,
  las implementaciones del protocolo y los límites criptográficos **no** han sido revisados
  por un laboratorio de criptografía independiente.
- Hemos realizado **auditorías de seguridad profundas asistidas por IA** en la arquitectura, la
  autenticación, la autorización, la federación, el almacenamiento y los límites del navegador y
  del escritorio. Esas auditorías encontraron y corrigieron problemas reales. **No son una prueba
  de seguridad.**
- **Todavía pueden existir vulnerabilidades desconocidas** — en el diseño del protocolo, la
  implementación, las dependencias, el entorno operativo o el propio dispositivo del usuario.
- La criptografía es fácil de equivocar de forma sutil. Las suposiciones rotas no siempre son
  visibles en las pruebas. No interpretes los nombres de los algoritmos como una garantía de
  seguridad.
- **No uses GaiaCom para comunicaciones críticas para la vida, reguladas legalmente, de alto
  valor o irreversibles** en esta beta. Mantén copias de seguridad independientes de las semillas
  y los datos importantes.
- Pueden producirse cambios de protocolo y de API que rompan la compatibilidad entre versiones
  beta. Es posible la pérdida de datos.
- Un nodo comprometido puede sustituir a un cliente web antes de que se produzca el cifrado. Por
  eso el perfil de alta seguridad exige clientes nativos de confianza compilados de forma
  independiente.
- El puente SMTP es un límite de degradación deliberado. Los mensajes que abandonan el espacio
  de seguridad nativo de GaiaCom solo están protegidos hasta donde lo permite la ruta heredada.

Si encuentras un problema de seguridad, informa de ello de forma privada — consulta
[SECURITY.md](SECURITY.md). No publiques detalles de exploits activos.

---

<a id="screenshots"></a>
## Capturas de pantalla

Todas las capturas de pantalla son de GaiaCom 3.0.2 a 2560 × 1440. La interfaz mostrada es el
diseño actual VGT Aurora; las capturas solo contienen superficies públicas del producto y
contenido público de federación.

| Página de inicio | Identidad y acceso |
|---|---|
| ![Página de inicio](docs/screenshots/landing.png) | ![Diálogo de autenticación](docs/screenshots/auth.png) |
| **Canales públicos — descubrimiento** | **Canales públicos — vista de canal** |
| ![Descubrimiento de canales](docs/screenshots/channels-discovery.png) | ![Vista de canal](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Funciones

### Identidad y acceso

- **Identidad Gaia ID autogestionada** — `@name:node.example.org`, derivada de una semilla
  generada localmente. Las claves privadas permanecen en el dispositivo.
- **Bóveda de claves local** con desbloqueo explícito, bloqueo de sesión y autobloqueo
  configurable.
- **Emparejamiento de varios dispositivos** mediante flujos de QR/emparejamiento de un solo uso,
  además de listado y revocación de dispositivos.
- **Historial de claves y advertencias de cambio** cuando cambia la clave de identidad de un
  contacto.
- **Flujos de recuperación** con una semilla de recuperación explícita y anotada; no existe
  ninguna puerta trasera de recuperación en el servidor.
- **18 idiomas de interfaz** con un selector de idioma en vivo (página de inicio, autenticación,
  espacio de trabajo).

### Mensajería

- **Quantum Chat** — conversaciones 1:1 con cifrado en el cliente, respuestas, reacciones,
  fijaciones, búsqueda, archivos adjuntos, notas de voz y vistas previas de imágenes cifradas.
- **Chats de grupo** — salas con canales, roles, moderación, gestión de miembros, modo lento,
  canales de solo lectura, solicitudes de ingreso, invitaciones, eventos de auditoría y
  exportación cifrada.
- **Reacciones** — control de reacciones centrado en el corazón: pasa el cursor en el escritorio
  o mantén pulsado en la pantalla táctil para abrir la paleta completa; exactamente una reacción
  se muestra como tuya.
- **Sin estados falsos** — los valores de mensajes, reacciones, presencia y actividad provienen
  del backend real o se muestran como no disponibles. GaiaCom no inventa contadores.

### GaiaMail

- Correo dentro de la misma identidad criptográfica que el chat.
- GaiaMail nativo entre identidades GaiaCom.
- **Puente SMTP** para contactos heredados — claramente separado del E2EE nativo y protegido solo
  en la medida en que lo permite la ruta heredada.
- Firmas, carpetas, filtros y etiquetas gestionados localmente.

### GSN Social

La capa social de GaiaCom no es una plataforma separada con una cuenta separada. Reutiliza tu
identidad soberana:

- **Feed de inicio**, **Descubrir**, **Mi red**, **Mensajes**, **Notificaciones**, **Grupos**,
  **Canales** y **GSN Cloud** (integración con GaiaDrive).
- Publicaciones, imágenes cifradas, comentarios, reacciones, reposts y tendencias de hashtags
  calculados a partir de publicaciones reales.
- Seguidores, seguidos y contactos recomendados derivados de interacciones reales de federación.
- **Canales públicos** para comunicación de tipo difusión con suscripciones, descubrimiento,
  categorías, medios, comentarios y moderación.

### Archivos, bóveda y centro de seguridad

- **GaiaDrive** — almacenamiento y uso compartido de archivos cifrado, vinculado a la misma
  identidad.
- **GaiaDrop** — recibe archivos cifrados de remitentes externos sin necesidad de cuenta.
- **GaiaVault** — almacenamiento local sellado para secretos y claves.
- **Centro de seguridad** — estado real de dispositivos, sesiones, claves y eventos de seguridad,
  además de flujos de gobernanza y de abuso.

### Gobernanza y operaciones

- Roles de operador de nodo, revisor sénior y revisor de confianza.
- Arranque de gobernanza de fallo cerrado: un nodo nuevo **no** concede ningún rol de operador
  por defecto.
- Denuncia de abusos, moderación, superficies de transparencia y eventos de auditoría de solo
  adición.
- Federación mediante PDU firmadas de servidor a servidor con protección contra reproducción y
  límites SSRF.

### Escritorio y móvil

- Cliente **web/PWA** con una CSP reforzada y sin código servido desde CDN.
- **Cliente de escritorio Tauri 2** para Windows, Linux y macOS con controles de ventana nativos y
  sin permisos de comandos nativos más allá de una lista de permitidos explícita.
- Arquitectura de nodo/cliente **Android** con un núcleo criptográfico nativo y enlaces de
  plataforma.

---

<a id="technical-information"></a>
## Información técnica

### Pila tecnológica

| Capa | Tecnología |
|---|---|
| Cliente web | React 18, Vite 8, capas de diseño en CSS puro |
| Escritorio | Tauri 2 (Rust + WebView2/WebKit), ventana sin marco personalizada |
| Backend | Go 1.25 (`toolchain go1.26.5`), biblioteca estándar + SQLite, servicios de federación y gobernanza |
| Base de datos | SQLite en modo WAL (perfil beta de escritor único), migraciones versionadas |
| Núcleo criptográfico | Rust (`gaiacore`), proveedor WebAssembly para HQC en el navegador, proveedor nativo de Tauri |
| Móvil | Aplicación Android + enlaces móviles de Go / arquitectura de kernel de nodo |
| Localización | 18 idiomas, tablas de traducción compartidas |

### Diseño criptográfico (Sovereign v1)

```text
Establecimiento de claves:  X25519  +  ML-KEM-1024  +  HQC-256
Combinador:                 secretos con prefijo de longitud → HKDF-SHA3-512
AEAD acelerado:             Twofish-256-EAX → AES-256-GCM
AEAD Top Secret:            Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                            → XChaCha20-Poly1305 → AES-256-GCM-SIV
Firmas:                     firma de transcripción Ed25519
Firmas Top Secret:          Ed25519 + ML-DSA-87
```

La transcripción firmada vincula la versión del protocolo, la suite exacta de algoritmos, las
identidades del remitente y del destinatario, la clave de cifrado del destinatario, la clave
efímera, ambos criptogramas KEM, el ID del mensaje, la marca de tiempo, el nonce y la carga útil
cifrada. Las suites desconocidas, las pruebas de conjunto de claves ausentes, las firmas Top
Secret ausentes y los criptogramas HQC malformados se rechazan con fallo cerrado.

**Límite importante:** Sovereign v1 es un sobre híbrido por mensaje, **no un Triple Ratchet**.
No anuncia seguridad postcompromiso derivada de ratchet. El límite exacto está documentado en
[SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Modelo de red

- Nodos federados, sin servidor central obligatorio.
- PDU firmadas de servidor a servidor para la federación.
- El servidor almacena sobres de enrutamiento, cargas útiles/fragmentos cifrados, campos públicos
  de perfil y metadatos mínimos — nunca texto plano nativo.
- Almacenamiento de objetos cifrado local o compatible con S3/MinIO.
- TLS es obligatorio fuera del desarrollo local.

### Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 24.13 (mínimo 20.19) |
| npm | instalación basada en lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (el módulo apunta a 1.25) |
| Rust | estable (fijado por CI para el núcleo) |
| Tauri CLI | 2.x para el empaquetado de escritorio |
| Python | 3.10+ (scripts opcionales de repositorio/seguridad) |

---

<a id="what-makes-gaiacom-different"></a>
## Qué diferencia a GaiaCom

La mayoría de los mensajeros «seguros» mejoran una sola capa. GaiaCom intenta que toda la pila
sea coherente:

- **Identidad soberana en lugar de cuentas de plataforma.** Tu identidad es una identidad
  criptográfica, no una fila en la tabla de usuarios de otra persona. Los nodos se federan; no te
  poseen.
- **Establecimiento de claves postcuántico dual por mensaje.** Se combinan un KEM clásico y dos
  KEM postcuánticos independientes, con rechazo de degradación cuando se selecciona el perfil
  Sovereign.
- **Cifrado antes del transporte, por construcción.** El cliente sella el contenido antes de que
  llegue a la red; el servidor enruta texto cifrado y no puede leerlo.
- **Social, correo, archivos y chat bajo una sola identidad.** Sin segunda cuenta, sin segundo
  modelo de confianza, sin una plataforma separada que filtre tu grafo.
- **Federado por diseño.** Sin buzón central obligatorio, sin un único punto de confianza, sin
  clave de lectura global.
- **Estados de interfaz honestos.** Los datos que faltan se muestran como ausentes, no se
  sustituyen por números decorativos ni por actividad inventada.
- **Límites de degradación explícitos.** SMTP, los sobres heredados y la entrega por navegador se
  documentan como límites, no se ocultan tras un lenguaje de marketing.
- **Código abierto, AGPL-3.0-or-later.** El software de red sigue siendo inspeccionable y las
  contribuciones siguen disponibles para la comunidad.
- **Hecho para operadores.** Gobernanza de fallo cerrado, eventos de auditoría, flujos de abuso y
  una ruta documentada para el operador de nodo.

---

<a id="build-from-source"></a>
## Compilar desde el código fuente

### 1. Requisitos previos

Instala Node.js 24.13+, Go 1.26.5+, Rust estable y — para las compilaciones de escritorio — los
[requisitos previos de Tauri 2](https://tauri.app/start/prerequisites/) para tu sistema
operativo.

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

El paquete de producción se escribe en `Frontend/frontend/dist/`.

Para el desarrollo local:

```bash
npm start
# http://127.0.0.1:5173
```

Configura `VITE_API_URL` solo con el origen de un backend GaiaCom en ejecución, por ejemplo:

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

Ejecuta un nodo de desarrollo local:

```bash
cp .env.example .env
# generate independent secrets for development only
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

La API escucha en `SERVER_PORT` (por defecto `8080`). La base de datos SQLite se crea en
`DB_PATH`. Nunca uses los secretos de la plantilla en producción.

### 4. Cliente de escritorio (Tauri 2)

Compila primero el cliente web y luego:

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Los instaladores/ejecutables se escriben bajo `DesktopClient/src-tauri/target/release/bundle/`.
Para una compilación rápida sin firma y sin instaladores:

```bash
cargo tauri build --no-bundle
```

### 5. Núcleo criptográfico de Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (opcional)

Las compilaciones de Android requieren JDK 17, el SDK/NDK de Android y la cadena de herramientas
fijada. Consulta `Android/` y `docs/` para el perfil de compilación actual. El cliente Android
forma parte del árbol de código de la beta, no es una versión de tienda terminada.

---

<a id="become-a-node-operator"></a>
## Conviértete en operador de nodo

Un nodo GaiaCom es el backend federado que sirve identidades, mensajes, canales, superficies
sociales y almacenamiento a sus usuarios. Puede ejecutarse en un servidor Linux normal.

### Línea base recomendada

- Linux x86_64 o arm64, 64 bits
- 2+ vCPU, 4 GB de RAM, 20+ GB de SSD para un nodo de evaluación (dimensiónalo según tu carga
  real)
- Un nombre DNS dedicado, por ejemplo `node.example.org`
- Un certificado TLS válido (Let's Encrypt funciona)
- Un relay SMTP **solo si** habilitas intencionadamente el puente heredado
- Copias de seguridad que realmente pruebes

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

Los binarios de versión se niegan a arrancar sin metadatos de compilación inmutables; no elimines
esos valores `-X`.

### 2. Inicializar el nodo

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` genera secretos de producción independientes, la identidad de firma del nodo y el archivo
de configuración. Mantén `/etc/gaiacom/gaiacom.env` en modo `0600`, propiedad del usuario del
servicio.

Ajustes clave:

| Variable | Propósito |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN canónico de este nodo; se usa en los Gaia ID y en la federación |
| `GAIACOM_DEV_MODE=false` | Modo de producción, comportamiento estricto de SSRF y CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Secretos independientes de 32+ bytes |
| `GAIACOM_SERVER_PRIVATE_KEY` | Clave de firma Ed25519 estable del nodo — nunca la rotes de forma implícita |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Secreto estable de derivación de época de TrustMesh |
| `DB_PATH` | Ruta persistente de la base de datos SQLite |
| `GAIACOM_STORAGE_ROOT` | Almacenamiento cifrado de archivos adjuntos fuera de la raíz web |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Solo si un proxy inverso proporciona las IP de los clientes |

### 3. Arranque de gobernanza (obligatorio, de fallo cerrado)

Un nodo nuevo deliberadamente **no** concede ningún rol de operador. Crea la primera identidad a
través del cliente y luego autoriza ese Gaia ID exacto y totalmente cualificado como operador de
nodo:

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

Apunta el backend a ese archivo y reinicia:

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

Usa solo Gaia ID totalmente cualificados (`@name:node.example.org`). No hay administrador por
defecto ni solución de recuperación en modo dios.

### 4. Unidad de systemd

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

### 5. Proxy inverso TLS y cliente web

Sirve el `Frontend/frontend/dist/` compilado detrás de un proxy inverso TLS y reenvía la API al
backend en `127.0.0.1:8080`. Requisitos mínimos:

- TLS 1.2+ (se prefiere TLS 1.3), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Una Content-Security-Policy estricta
- Sin listado de directorios, sin source maps en producción
- Solo los proxies inversos listados en `GAIACOM_TRUSTED_PROXY_CIDRS` pueden proporcionar IP de
  cliente reenviadas

Una configuración de ejemplo deliberadamente **no** se incluye con nombres de host o certificados
reales; usa tu propio dominio y tus rutas de certificado.

### 6. Federación y operación

- Anuncia/publica tu `GAIACOM_SERVER_NAME` canónico; los pares se dirigen a ti por HTTPS.
- La federación usa PDU firmadas de servidor a servidor con protecciones contra reproducción y
  protección SSRF.
- Supervisa el servicio, el uso de disco, la integridad de las copias de seguridad y la caducidad
  de los certificados.
- Prueba regularmente las restauraciones de la base de datos SQLite y del almacenamiento de
  objetos.
- Mantén estable la clave de firma del nodo entre actualizaciones; rotarla rompe la confianza de
  la federación.
- No ejecutes varios procesos de backend contra un mismo archivo SQLite. El escalado horizontal de
  la base de datos (Postgres, réplicas activo/activo) no forma parte de este perfil beta.

### Advertencias para operadores de nodo

- Software beta; sin promesa de alta disponibilidad; se requieren ventanas de mantenimiento y
  reinicios.
- El contenido gobernado y los flujos de abuso tienen alcance de política por nodo en esta beta.
- Las actualizaciones automáticas de escritorio están deshabilitadas hasta que exista un
  actualizador firmado.
- El relay SMTP requiere TLS autenticado, además de SPF, DKIM y una política DMARC aplicada. Los
  mensajes que salen de GaiaCom nativo no están cubiertos por las garantías nativas de E2EE.
- Eres responsable de las copias de seguridad, los secretos, TLS, DNS, la gestión de abusos y la
  legislación local.

---

<a id="security-and-audit-status"></a>
## Estado de seguridad y auditoría

### Lo que se ha hecho

- Revisiones de seguridad profundas asistidas por IA en el backend, el frontend, la federación,
  el almacenamiento, la autenticación, la autorización y los límites del escritorio y del
  navegador.
- Puertas de seguridad estáticas, suites de pruebas adversarias, comprobaciones de higiene de
  dependencias y secretos.
- Invariantes de seguridad explícitas: sin texto plano en el servidor, sin exportación de claves
  privadas, sin endpoint de suplantación, sin bypass de E2EE, sin clave de lectura global.
- Valores predeterminados de fallo cerrado para la gobernanza, la validación de secretos y la
  negociación de protocolos.
- Verificación real en vivo de las superficies del producto y de los flujos de interfaz durante el
  desarrollo.

### Lo que **no** se ha hecho

- **Ninguna auditoría criptográfica independiente de terceros.**
- Ninguna verificación formal del protocolo ni de las implementaciones.
- Ninguna garantía de que no existan vulnerabilidades desconocidas.
- Ninguna certificación de nivel gubernamental o de alta seguridad.
- El comportamiento en tiempo de ejecución depende del nodo, el navegador, el sistema operativo y
  la seguridad del propio dispositivo del usuario.

### Informes

Informa de las vulnerabilidades de forma privada:

- Correo electrónico: **security@gaiacom.de**
- No abras una incidencia pública para una vulnerabilidad activa.
- Incluye el componente afectado, la versión/commit, los pasos de reproducción y el comportamiento
  esperado/observado.
- No pruebes contra los nodos o los datos de otras personas y no ejecutes ataques destructivos.

Consulta [SECURITY.md](SECURITY.md) para la política completa y
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) para los límites actuales de la beta.

### Uso de alta seguridad

Si necesitas un sistema que proteja la vida, la libertad o datos regulados, esta beta **todavía
no** es ese sistema. Aún se requieren auditorías independientes, compilaciones reproducibles,
versiones firmadas, cadenas de actualización verificadas, gestión operativa de claves y respuesta
a incidentes.

---

<a id="project-structure"></a>
## Estructura del proyecto

```text
GaiaCom/
├── Backend/                  API en Go, federación, gobernanza, almacenamiento, seguridad
├── Frontend/frontend/        Cliente web React y PWA
├── DesktopClient/src-tauri/  Shell de escritorio Tauri 2
├── Android/                  Arquitectura de nodo/cliente Android
├── Core/rust/gaiacore/       Núcleo criptográfico en Rust
├── SovereignCryptoCore/      Biblioteca criptográfica en Rust
├── SovereignCryptoWasm/      Proveedor criptográfico WASM para el navegador
├── docs/                     Arquitectura, operación de nodo, límites de la beta, capturas de pantalla
├── assets/brand/             Logotipo y recursos de marca de GaiaCom
├── SECURITY.md               Política de seguridad y divulgación
├── SOVEREIGN_CRYPTO.md       Diseño criptográfico y límites
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Contribuir

Las contribuciones son bienvenidas si preservan los invariantes de seguridad y mantienen las
afirmaciones honestas.

- Lee primero [CONTRIBUTING.md](CONTRIBUTING.md).
- Mantén el límite de confianza cero: sin texto plano en el servidor, sin exportación de claves
  privadas, sin bypass de E2EE.
- Añade pruebas para el comportamiento relevante para la seguridad.
- Nunca hagas commit de secretos, datos reales de usuarios, claves privadas, bases de datos o
  artefactos de compilación.
- No debilites las puertas de seguridad para que una compilación pase.
- Informa de las vulnerabilidades de forma privada, no en pull requests.

Al participar, aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licencia

GaiaCom está licenciado bajo la **GNU Affero General Public License v3.0 o posterior**
(AGPL-3.0-or-later). Consulta [LICENSE](LICENSE).

Los operadores de red que ejecuten software GaiaCom modificado deben poner a disposición el
código fuente correspondiente según lo exige la AGPL. Los componentes de terceros y sus licencias
se enumeran en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) y en los manifiestos de cada
paquete.

GaiaCom y el logotipo de GaiaCom son marcas comerciales de VisionGaiaTechnology. La licencia
AGPL no concede derechos de marca.

---

<div align="center">

**VisionGaiaTechnology — Departamento de Seguridad Innecesaria™**

*Comunicación soberana, construida en abierto.*

[Sitio web](https://gaiacom.de) · [Seguridad](SECURITY.md) · [Arquitectura](docs/ARCHITECTURE.md)

</div>
