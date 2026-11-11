[English](README.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Español](README.es.md) · **Français** · [فارسی](README.fa.md) · [日本語](README.ja.md) · [Português](README.pt.md) · [العربية](README.ar.md) · [简体中文](README.zh.md) · [हिन्दी](README.hi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [한국어](README.ko.md) · [Indonesia](README.id.md) · [Shqip](README.sq.md)

<div align="center">

<img src="assets/brand/gaiacom-logo.png" width="520" alt="GaiaCom — Communication souveraine post-quantique" />

# GaiaCom

### Infrastructure souveraine de communication post-quantique

[![Version](https://img.shields.io/badge/version-3.0.2_Beta-blue?style=for-the-badge)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web_%7C_Windows_%7C_Linux_%7C_macOS_%7C_Android-4b5563?style=for-the-badge)](#technical-information)
[![Stack](https://img.shields.io/badge/stack-Go_%7C_React_%7C_Tauri_%7C_Rust-00ADD8?style=for-the-badge)](#technical-information)
[![Cryptography](https://img.shields.io/badge/crypto-X25519_%2B_ML--KEM--1024_%2B_HQC--256-orange?style=for-the-badge)](SOVEREIGN_CRYPTO.md)
[![Status](https://img.shields.io/badge/status-Beta_V3-yellow?style=for-the-badge)](#beta-v3)
[![Audit](https://img.shields.io/badge/security-no_independent_crypto_audit_yet-critical?style=for-the-badge)](#security-and-audit-status)
[![Website](https://img.shields.io/badge/website-gaiacom.de-00c2b2?style=for-the-badge)](https://gaiacom.de)

**Une plateforme de communication fédérée, chiffrée côté client, avec une conception hybride post-quantique.**

</div>

> **VisionGaiaTechnology — Département de la Sécurité Inutile™**
>
> Nous construisons une infrastructure de communication qui ne demande pas une confiance
> qu'elle ne peut pas prouver. Le département existe parce que la sécurité « inutile » est
> exactement ce qui devient nécessaire au moment où quelqu'un d'autre détient les clés.

---

## Sommaire

[Aperçu](#overview) · [VGT Licence](#vgt-licence) · [Bêta V3](#beta-v3) · [Captures d'écran](#screenshots) · [Fonctionnalités](#features) · [Informations techniques](#technical-information) · [Ce qui distingue GaiaCom](#what-makes-gaiacom-different) · [Compiler depuis les sources](#build-from-source) · [Devenir opérateur de nœud](#become-a-node-operator) · [État de sécurité et d'audit](#security-and-audit-status) · [Structure du projet](#project-structure) · [Contribuer](#contributing) · [Licence](#license)

---

<a id="overview"></a>
## Aperçu

Les piles de communication actuelles n'ont pas été conçues pour un monde post-quantique. Les
messageries centralisent la confiance chez un fournisseur unique, le courrier électronique
classique n'a jamais été confidentiel par conception, et la plupart des plateformes conservent une
copie lisible de tout ce qu'elles transportent.

**GaiaCom redéfinit la communication sécurisée comme une infrastructure souveraine.**

Elle combine un réseau fédéré, un chiffrement de bout en bout côté client, une enveloppe
post-quantique hybride versionnée, des canaux sociaux chiffrés, un stockage de fichiers chiffré et
une couche de gouvernance pour les opérateurs de nœuds — au sein d'une seule identité, sur le web,
le bureau et le mobile.

La règle centrale est délibérément courte :

```text
Le serveur peut router, stocker, limiter le débit, auditer et appliquer des politiques.
Le serveur ne doit jamais recevoir la capacité de déchiffrer du contenu privé natif.
```

GaiaCom n'est **pas** une promesse de sécurité absolue. C'est une tentative de rendre les
frontières de confiance explicites, testables et — lorsque c'est possible — mathématiquement
garanties.

---

<a id="vgt-licence"></a>
## VGT Licence

GaiaCom est disponible en 3 éditions :

**Un protocole. Trois modèles d'exploitation.**

### Business — GaiaCom Enterprise

Pour les entreprises, cabinets d'avocats, PME, industries et banque privée. Cercles de communication fermés avec contrôle administratif, conformité et support.

- Souveraineté interne et administration des utilisateurs
- Nœud auto-hébergé ou cluster souverain managé
- SLA, support et modules premium

### Public — GaiaCom Network

Le réseau ouvert pour la vie privée numérique. Pas de commerce de données, mais une infrastructure pour une communication libre et chiffrée.

- Client open source
- Nœuds fédérés
- Sans clés de déchiffrement centrales

### Government — GaiaCom Defend

Infrastructure de haute sécurité spécialisée pour les autorités, les infrastructures critiques et les silos de communication isolés.

- Déploiements isolés et hors ligne (air-gapped)
- Marque blanche et audit du code source
- Souveraineté numérique nationale

> **Version de test actuelle et licence commerciale requise (double licence)**
>
> L'édition actuellement testée dans ce dépôt est la version publique **GaiaCom Network** (Bêta V3) sous licence open source **AGPL-3.0-or-later** (voir [LICENSE](LICENSE)). Toute exploitation en réseau ou modification de `GaiaCom Network` sous licence open source est soumise aux obligations strictes de copyleft et de mise à disposition du code source de l'AGPL (et n'accorde aucun droit de marque, SLA ou module Enterprise/Defend).
>
> **Pour les entreprises et les administrations publiques, le système n'est pas gratuit.** Toute organisation souhaitant utiliser GaiaCom en entreprise (**GaiaCom Enterprise**) ou au sein d'autorités publiques et d'infrastructures critiques (**GaiaCom Defend**) — y compris pour des déploiements fermés ou en production sans obligations de divulgation AGPL, des modules Enterprise/Defend, des clusters souverains managés, la marque blanche, un audit du code source ou un SLA/support — doit obtenir une **VGT Licence** commerciale et contacter VisionGaiaTechnology, idéalement via la demande chiffrée :
> **[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink)**

---

<a id="beta-v3"></a>
## Bêta V3

> **GaiaCom 3 est une bêta technique publique. Traitez-la comme telle.**

- **Statut :** Bêta V3, version `3.0.2`.
- **Aucun audit cryptographique indépendant n'a été réalisé.** La conception post-quantique, les
  implémentations du protocole et les frontières cryptographiques **n'ont pas** été examinées par
  un laboratoire de cryptographie tiers indépendant.
- Nous avons mené des **audits de sécurité approfondis assistés par IA** sur l'architecture,
  l'authentification, l'autorisation, la fédération, le stockage et les frontières du navigateur et
  du bureau. Ces audits ont trouvé et corrigé de vrais problèmes. Ils **ne constituent pas une
  preuve de sécurité**.
- **Des vulnérabilités inconnues peuvent encore exister** — dans la conception du protocole,
  l'implémentation, les dépendances, l'environnement d'exploitation ou l'appareil de l'utilisateur
  lui-même.
- La cryptographie est facile à fausser de manière subtile. Les hypothèses rompues ne sont pas
  toujours visibles dans les tests. Ne considérez pas les noms d'algorithmes comme une garantie de
  sécurité.
- **N'utilisez pas GaiaCom pour des communications vitales, soumises à une réglementation légale,
  de grande valeur ou irréversibles** dans cette bêta. Conservez des sauvegardes indépendantes des
  graines et des données importantes.
- Des changements de protocole et d'API cassants peuvent survenir entre les versions bêta. Une
  perte de données est possible.
- Un nœud compromis peut remplacer un client web avant que le chiffrement n'ait lieu. Le profil de
  haute assurance exige donc des clients natifs de confiance, compilés de manière indépendante.
- Le pont SMTP est une frontière de dégradation délibérée. Les messages qui quittent l'espace de
  sécurité natif de GaiaCom ne sont protégés que dans la mesure permise par le chemin hérité.

Si vous découvrez un problème de sécurité, signalez-le en privé — voir [SECURITY.md](SECURITY.md).
Ne publiez pas de détails d'exploits actifs.

---

<a id="screenshots"></a>
## Captures d'écran

Toutes les captures d'écran proviennent de GaiaCom 3.0.2 en 2560 × 1440. L'interface affichée est
le design actuel VGT Aurora ; les captures ne contiennent que des surfaces produit publiques et du
contenu de fédération public.

| Page d'accueil | Identité et accès |
|---|---|
| ![Page d'accueil](docs/screenshots/landing.png) | ![Boîte de dialogue d'authentification](docs/screenshots/auth.png) |
| **Canaux publics — découverte** | **Canaux publics — vue du canal** |
| ![Découverte des canaux](docs/screenshots/channels-discovery.png) | ![Vue du canal](docs/screenshots/channel-view.png) |

---

<a id="features"></a>
## Fonctionnalités

### Identité et accès

- **Identité Gaia ID auto-gérée** — `@name:node.example.org`, dérivée d'une graine générée
  localement. Les clés privées restent sur l'appareil.
- **Coffre de clés local** avec déverrouillage explicite, verrouillage de session et verrouillage
  automatique configurable.
- **Appairage multi-appareils** via des flux QR/appairage à usage unique, ainsi que la liste et la
  révocation des appareils.
- **Historique des clés et avertissements de changement** lorsqu'une clé d'identité de contact
  change.
- **Flux de récupération** avec une graine de récupération explicite et notée par écrit ; il
  n'existe aucune porte dérobée de récupération côté serveur.
- **18 langues d'interface** avec un sélecteur de langue en direct (page d'accueil,
  authentification, espace de travail).

### Messagerie

- **Quantum Chat** — conversations 1:1 avec chiffrement côté client, réponses, réactions,
  épinglages, recherche, pièces jointes, notes vocales et aperçus d'images chiffrés.
- **Discussions de groupe** — salons avec canaux, rôles, modération, gestion des membres, mode
  lent, canaux en lecture seule, demandes d'adhésion, invitations, événements d'audit et export
  chiffré.
- **Réactions** — contrôle des réactions centré sur le cœur : survolez sur ordinateur ou appuyez
  longuement sur tactile pour ouvrir la palette complète ; exactement une réaction est affichée
  comme la vôtre.
- **Aucun état factice** — les valeurs de message, de réaction, de présence et d'activité
  proviennent du backend réel ou sont affichées comme indisponibles. GaiaCom n'invente pas de
  compteurs.

### GaiaMail

- Courrier au sein de la même identité cryptographique que le chat.
- GaiaMail natif entre identités GaiaCom.
- **Pont SMTP** pour les contacts hérités — clairement séparé de l'E2EE natif et protégé
  uniquement dans la mesure permise par le chemin hérité.
- Signatures, dossiers, filtres et étiquettes gérés localement.

### GSN Social

La couche sociale de GaiaCom n'est pas une plateforme séparée avec un compte séparé. Elle
réutilise votre identité souveraine :

- **Fil d'accueil**, **Découvrir**, **Mon réseau**, **Messages**, **Notifications**, **Groupes**,
  **Canaux** et **GSN Cloud** (intégration GaiaDrive).
- Publications, images chiffrées, commentaires, réactions, reposts et tendances de hashtags
  calculés à partir de publications réelles.
- Abonnés, abonnements et contacts recommandés dérivés d'interactions de fédération réelles.
- **Canaux publics** pour une communication de type diffusion avec abonnements, découverte,
  catégories, médias, commentaires et modération.

### Fichiers, coffre et centre de sécurité

- **GaiaDrive** — stockage et partage de fichiers chiffrés liés à la même identité.
- **GaiaDrop** — recevez des fichiers chiffrés d'expéditeurs externes sans compte.
- **GaiaVault** — stockage local scellé pour les secrets et les clés.
- **Centre de sécurité** — état réel des appareils, sessions, clés et événements de sécurité,
  ainsi que les flux de gouvernance et d'abus.

### Gouvernance et exploitation

- Rôles d'opérateur de nœud, de réviseur senior et de réviseur de confiance.
- Amorçage de gouvernance en échec fermé : un nœud neuf n'accorde **aucun** rôle d'opérateur par
  défaut.
- Signalement d'abus, modération, surfaces de transparence et événements d'audit en ajout seul.
- Fédération via des PDU signées de serveur à serveur avec protection contre la relecture et
  limites SSRF.

### Bureau et mobile

- Client **web/PWA** avec une CSP durcie et aucun code livré par CDN.
- **Client de bureau Tauri 2** pour Windows, Linux et macOS avec des contrôles de fenêtre natifs et
  aucune permission de commande native au-delà d'une liste d'autorisation explicite.
- Architecture de nœud/client **Android** avec un cœur cryptographique natif et des liaisons de
  plateforme.

---

<a id="technical-information"></a>
## Informations techniques

### Pile technique

| Couche | Technologie |
|---|---|
| Client web | React 18, Vite 8, couches de design en CSS pur |
| Bureau | Tauri 2 (Rust + WebView2/WebKit), fenêtre sans cadre personnalisée |
| Backend | Go 1.25 (`toolchain go1.26.5`), bibliothèque standard + SQLite, services de fédération et de gouvernance |
| Base de données | SQLite en mode WAL (profil bêta à écriture unique), migrations versionnées |
| Cœur cryptographique | Rust (`gaiacore`), fournisseur WebAssembly pour HQC dans le navigateur, fournisseur natif Tauri |
| Mobile | Application Android + liaisons mobiles Go / architecture de noyau de nœud |
| Localisation | 18 langues, tables de traduction partagées |

### Conception cryptographique (Sovereign v1)

```text
Établissement de clés :  X25519  +  ML-KEM-1024  +  HQC-256
Combineur :              secrets préfixés par leur longueur → HKDF-SHA3-512
AEAD accéléré :          Twofish-256-EAX → AES-256-GCM
AEAD Top Secret :        Serpent-256-CTR + HMAC-SHA3-512 → Twofish-256-EAX
                         → XChaCha20-Poly1305 → AES-256-GCM-SIV
Signatures :             signature de transcription Ed25519
Signatures Top Secret :  Ed25519 + ML-DSA-87
```

La transcription signée lie la version du protocole, la suite d'algorithmes exacte, les identités
de l'expéditeur et du destinataire, la clé de chiffrement du destinataire, la clé éphémère, les
deux chiffrés KEM, l'ID du message, l'horodatage, le nonce et la charge utile chiffrée. Les suites
inconnues, les preuves de jeu de clés manquantes, les signatures Top Secret manquantes et les
chiffrés HQC malformés sont rejetés en échec fermé.

**Frontière importante :** Sovereign v1 est une enveloppe hybride par message, **pas un Triple
Ratchet**. Elle ne revendique pas de sécurité post-compromission dérivée d'un ratchet. La frontière
exacte est documentée dans [SOVEREIGN_CRYPTO.md](SOVEREIGN_CRYPTO.md).

### Modèle de réseau

- Nœuds fédérés, sans serveur central obligatoire.
- PDU signées de serveur à serveur pour la fédération.
- Le serveur stocke les enveloppes de routage, les charges utiles/fragments chiffrés, les champs de
  profil publics et un minimum de métadonnées — jamais de texte en clair natif.
- Stockage d'objets chiffré local ou compatible S3/MinIO.
- TLS est obligatoire hors du développement local.

### Prérequis

| Outil | Version |
|---|---|
| Node.js | 24.13 (minimum 20.19) |
| npm | installation basée sur le lockfile (`npm ci`) |
| Go | toolchain 1.26.5 (le module cible 1.25) |
| Rust | stable (épinglé par la CI pour le cœur) |
| Tauri CLI | 2.x pour l'empaquetage de bureau |
| Python | 3.10+ (scripts optionnels de dépôt/sécurité) |

---

<a id="what-makes-gaiacom-different"></a>
## Ce qui distingue GaiaCom

La plupart des messageries « sécurisées » améliorent une seule couche. GaiaCom cherche à rendre
toute la pile cohérente :

- **Une identité souveraine plutôt que des comptes de plateforme.** Votre identité est une
  identité cryptographique, pas une ligne dans la table des utilisateurs de quelqu'un d'autre. Les
  nœuds se fédèrent ; ils ne vous possèdent pas.
- **Double établissement de clés post-quantique par message.** Un KEM classique et deux KEM
  post-quantiques indépendants sont combinés, avec rejet de la rétrogradation lorsque le profil
  Sovereign est sélectionné.
- **Chiffrement avant transport, par construction.** Le client scelle le contenu avant qu'il
  n'atteigne le réseau ; le serveur route du texte chiffré et ne peut pas le lire.
- **Social, courrier, fichiers et chat sous une seule identité.** Pas de second compte, pas de
  second modèle de confiance, pas de plateforme séparée qui divulgue votre graphe.
- **Fédéré par conception.** Pas de boîte aux lettres centrale obligatoire, pas de point de
  confiance unique, pas de clé de lecture globale.
- **États d'interface honnêtes.** Les données manquantes sont affichées comme manquantes, et non
  remplacées par des nombres décoratifs ou une activité inventée.
- **Frontières de dégradation explicites.** SMTP, les enveloppes héritées et la livraison par
  navigateur sont documentés comme des frontières, et non dissimulés derrière un langage marketing.
- **Open source, AGPL-3.0-or-later.** Le logiciel réseau reste inspectable et les contributions
  restent disponibles pour la communauté.
- **Conçu pour les opérateurs.** Gouvernance en échec fermé, événements d'audit, flux d'abus et un
  parcours d'opérateur de nœud documenté.

---

<a id="build-from-source"></a>
## Compiler depuis les sources

### 1. Prérequis

Installez Node.js 24.13+, Go 1.26.5+, Rust stable et — pour les compilations de bureau — les
[prérequis de Tauri 2](https://tauri.app/start/prerequisites/) pour votre système d'exploitation.

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

Le bundle de production est écrit dans `Frontend/frontend/dist/`.

Pour le développement local :

```bash
npm start
# http://127.0.0.1:5173
```

Ne définissez `VITE_API_URL` que sur l'origine d'un backend GaiaCom en cours d'exécution, par
exemple :

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

Lancez un nœud de développement local :

```bash
cp .env.example .env
# generate independent secrets for development only
export $(grep -v '^#' .env | xargs)
./gaiacom-backend
```

L'API écoute sur `SERVER_PORT` (par défaut `8080`). La base de données SQLite est créée à
l'emplacement `DB_PATH`. N'utilisez jamais les secrets du modèle en production.

### 4. Client de bureau (Tauri 2)

Compilez d'abord le client web, puis :

```bash
cargo install tauri-cli --version "^2"
cd DesktopClient/src-tauri
cargo tauri build
```

Les installateurs/exécutables sont écrits sous `DesktopClient/src-tauri/target/release/bundle/`.
Pour une compilation rapide non signée sans installateurs :

```bash
cargo tauri build --no-bundle
```

### 5. Cœur cryptographique Rust

```bash
cd Core/rust/gaiacore
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

### 6. Android (facultatif)

Les compilations Android nécessitent JDK 17, le SDK/NDK Android et la chaîne d'outils épinglée.
Voir `Android/` et `docs/` pour le profil de compilation actuel. Le client Android fait partie de
l'arbre de sources bêta, et non d'une version de magasin finalisée.

---

<a id="become-a-node-operator"></a>
## Devenir opérateur de nœud

Un nœud GaiaCom est le backend fédéré qui fournit des identités, des messages, des canaux, des
surfaces sociales et du stockage à ses utilisateurs. Il peut fonctionner sur un serveur Linux
ordinaire.

### Base recommandée

- Linux x86_64 ou arm64, 64 bits
- 2+ vCPU, 4 Go de RAM, 20+ Go de SSD pour un nœud d'évaluation (dimensionnez selon votre charge
  réelle)
- Un nom DNS dédié, par exemple `node.example.org`
- Un certificat TLS valide (Let's Encrypt fonctionne)
- Un relais SMTP **uniquement si** vous activez intentionnellement le pont hérité
- Des sauvegardes que vous testez réellement

### 1. Compiler et installer

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

Les binaires de version refusent de démarrer sans métadonnées de compilation immuables ; ne
supprimez pas ces valeurs `-X`.

### 2. Initialiser le nœud

```bash
sudo /opt/gaiacom/gaiacom-backend setup \
  --server-name node.example.org \
  --config /etc/gaiacom/gaiacom.env \
  --db-path /var/lib/gaiacom/gaiacom.db \
  --port 8080

sudo /opt/gaiacom/gaiacom-backend doctor --config /etc/gaiacom/gaiacom.env
```

`setup` génère des secrets de production indépendants, l'identité de signature du nœud et le
fichier de configuration. Maintenez `/etc/gaiacom/gaiacom.env` en mode `0600`, propriété de
l'utilisateur du service.

Paramètres clés :

| Variable | Rôle |
|---|---|
| `GAIACOM_SERVER_NAME` | FQDN canonique de ce nœud ; utilisé dans les Gaia ID et la fédération |
| `GAIACOM_DEV_MODE=false` | Mode production, comportement strict SSRF et CSP |
| `GAIACOM_JWT_SECRET`, `GAIACOM_SHIELD_SECRET`, `GAIACOM_METRICS_TOKEN` | Secrets indépendants de 32 octets ou plus |
| `GAIACOM_SERVER_PRIVATE_KEY` | Clé de signature Ed25519 stable du nœud — ne jamais la faire tourner implicitement |
| `GAIACOM_TRUSTMESH_EPOCH_SECRET` | Secret stable de dérivation d'époque TrustMesh |
| `DB_PATH` | Chemin persistant de la base de données SQLite |
| `GAIACOM_STORAGE_ROOT` | Stockage chiffré des pièces jointes hors de la racine web |
| `GAIACOM_TRUSTED_PROXY_CIDRS` | Uniquement si un proxy inverse fournit les IP des clients |

### 3. Amorçage de la gouvernance (obligatoire, en échec fermé)

Un nœud neuf n'accorde délibérément **aucun** rôle d'opérateur. Créez la première identité via le
client, puis autorisez ce Gaia ID exact et pleinement qualifié comme opérateur de nœud :

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

Pointez le backend vers ce fichier et redémarrez :

```bash
echo 'GAIACOM_GOVERNANCE_CONFIG=/etc/gaiacom/governance.json' \
  | sudo tee -a /etc/gaiacom/gaiacom.env
```

N'utilisez que des Gaia ID pleinement qualifiés (`@name:node.example.org`). Il n'existe ni
administrateur par défaut ni solution de secours en mode dieu.

### 4. Unité systemd

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

### 5. Proxy inverse TLS et client web

Servez le `Frontend/frontend/dist/` compilé derrière un proxy inverse TLS et transmettez l'API au
backend sur `127.0.0.1:8080`. Exigences minimales :

- TLS 1.2+ (TLS 1.3 préféré), HSTS
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Une Content-Security-Policy stricte
- Pas de listage de répertoires, pas de source maps en production
- Seuls les proxys inverses listés dans `GAIACOM_TRUSTED_PROXY_CIDRS` peuvent fournir des IP
  client transmises

Une configuration d'exemple n'est délibérément **pas** fournie avec de vrais noms d'hôtes ou
certificats ; utilisez votre propre domaine et vos propres chemins de certificat.

### 6. Fédération et exploitation

- Annoncez/publiez votre `GAIACOM_SERVER_NAME` canonique ; les pairs s'adressent à vous via HTTPS.
- La fédération utilise des PDU signées de serveur à serveur avec des gardes anti-relecture et une
  protection SSRF.
- Surveillez le service, l'utilisation du disque, l'intégrité des sauvegardes et l'expiration des
  certificats.
- Testez régulièrement les restaurations de la base de données SQLite et du stockage d'objets.
- Gardez la clé de signature du nœud stable entre les mises à jour ; la faire tourner rompt la
  confiance de la fédération.
- N'exécutez pas plusieurs processus backend sur un même fichier SQLite. La mise à l'échelle
  horizontale de la base de données (Postgres, réplicas actif/actif) ne fait pas partie de ce
  profil bêta.

### Avertissements aux opérateurs de nœuds

- Logiciel bêta ; aucune promesse de haute disponibilité ; des fenêtres de maintenance et des
  redémarrages sont nécessaires.
- Le contenu gouverné et les flux d'abus sont délimités par politique et par nœud dans cette bêta.
- Les mises à jour automatiques de bureau sont désactivées jusqu'à ce qu'un programme de mise à
  jour signé existe.
- Le relais SMTP exige TLS authentifié ainsi que SPF, DKIM et une politique DMARC appliquée. Les
  messages quittant GaiaCom natif ne bénéficient pas des garanties E2EE natives.
- Vous êtes responsable des sauvegardes, des secrets, de TLS, du DNS, du traitement des abus et de
  la loi locale.

---

<a id="security-and-audit-status"></a>
## État de sécurité et d'audit

### Ce qui a été fait

- Des revues de sécurité approfondies assistées par IA sur le backend, le frontend, la
  fédération, le stockage, l'authentification, l'autorisation et les frontières du bureau et du
  navigateur.
- Des barrières de sécurité statiques, des suites de tests adverses, des contrôles d'hygiène des
  dépendances et des secrets.
- Des invariants de sécurité explicites : aucun texte en clair côté serveur, aucune exportation de
  clés privées, aucun point de terminaison d'usurpation d'identité, aucun contournement de l'E2EE,
  aucune clé de lecture globale.
- Des valeurs par défaut en échec fermé pour la gouvernance, la validation des secrets et la
  négociation de protocole.
- Une vérification réelle et en direct des surfaces produit et des parcours d'interface pendant le
  développement.

### Ce qui **n'a pas** été fait

- **Aucun audit cryptographique indépendant par un tiers.**
- Aucune vérification formelle du protocole ni des implémentations.
- Aucune garantie que des vulnérabilités inconnues n'existent pas.
- Aucune certification de niveau gouvernemental ou de haute assurance.
- Le comportement à l'exécution dépend du nœud, du navigateur, du système d'exploitation et de la
  sécurité de l'appareil de l'utilisateur.

### Signalement

Veuillez signaler les vulnérabilités en privé :

- E-mail : **security@gaiacom.de**
- N'ouvrez pas de ticket public pour une vulnérabilité active.
- Indiquez le composant concerné, la version/le commit, les étapes de reproduction et le
  comportement attendu/observé.
- Ne testez pas sur les nœuds ou les données d'autres personnes et ne lancez pas d'attaques
  destructrices.

Voir [SECURITY.md](SECURITY.md) pour la politique complète et
[docs/BETA_LIMITATIONS.md](docs/BETA_LIMITATIONS.md) pour les frontières actuelles de la bêta.

### Usage de haute assurance

Si vous avez besoin d'un système qui protège la vie, la liberté ou des données réglementées, cette
bêta **n'est pas encore** ce système. Des audits indépendants, des compilations reproductibles, des
versions signées, des chaînes de mise à jour vérifiées, une gestion opérationnelle des clés et une
réponse aux incidents restent nécessaires.

---

<a id="project-structure"></a>
## Structure du projet

```text
GaiaCom/
├── Backend/                  API Go, fédération, gouvernance, stockage, sécurité
├── Frontend/frontend/        Client web React et PWA
├── DesktopClient/src-tauri/  Coque de bureau Tauri 2
├── Android/                  Architecture nœud/client Android
├── Core/rust/gaiacore/       Cœur cryptographique Rust
├── SovereignCryptoCore/      Bibliothèque cryptographique Rust
├── SovereignCryptoWasm/      Fournisseur cryptographique WASM pour navigateur
├── docs/                     Architecture, exploitation de nœud, frontières bêta, captures d'écran
├── assets/brand/             Logo GaiaCom et ressources de marque
├── SECURITY.md               Politique de sécurité et divulgation
├── SOVEREIGN_CRYPTO.md       Conception cryptographique et frontières
└── LICENSE                   AGPL-3.0-or-later
```

---

<a id="contributing"></a>
## Contribuer

Les contributions sont les bienvenues si elles préservent les invariants de sécurité et gardent des
affirmations honnêtes.

- Lisez d'abord [CONTRIBUTING.md](CONTRIBUTING.md).
- Respectez la frontière de confiance zéro : aucun texte en clair côté serveur, aucune exportation
  de clés privées, aucun contournement de l'E2EE.
- Ajoutez des tests pour les comportements liés à la sécurité.
- Ne validez jamais de secrets, de données utilisateur réelles, de clés privées, de bases de
  données ou d'artefacts de compilation.
- N'affaiblissez pas les barrières de sécurité pour faire passer une compilation.
- Signalez les vulnérabilités en privé, pas dans des pull requests.

En participant, vous acceptez le [Code de conduite](CODE_OF_CONDUCT.md).

---

<a id="license"></a>
## Licence

GaiaCom repose sur un modèle de **double licence** (voir [VGT Licence](#vgt-licence)) :
la base de code open source publique (`GaiaCom Network`) est distribuée sous la **GNU
Affero General Public License v3.0 ou ultérieure** (AGPL-3.0-or-later) — voir
[LICENSE](LICENSE). Pour les déploiements en entreprise (**GaiaCom Enterprise**),
les autorités publiques (**GaiaCom Defend**) ou tout environnement commercial ou fermé sans
obligation de publication sous AGPL (incluant modules premium, SLA/support, marque blanche
et environnements isolés air-gapped), le système **n'est pas gratuit** et nécessite une
**VGT Licence** commerciale via
[https://visiongaiatechnology.de/#vgt-comlink](https://visiongaiatechnology.de/#vgt-comlink).

Les opérateurs de réseau qui exécutent une version modifiée du logiciel open source GaiaCom
sous AGPL doivent rendre le code source correspondant disponible comme l'exige l'AGPL. Les
composants tiers et leurs licences sont listés dans
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) et dans les manifestes de paquets
respectifs.

GaiaCom et le logo GaiaCom sont des marques de VisionGaiaTechnology. La licence AGPL
n'accorde aucun droit de marque.

---

<div align="center">

**VisionGaiaTechnology — Département de la Sécurité Inutile™**

*Communication souveraine, construite à ciel ouvert.*

[Site web](https://gaiacom.de) · [Sécurité](SECURITY.md) · [Architecture](docs/ARCHITECTURE.md)

</div>
