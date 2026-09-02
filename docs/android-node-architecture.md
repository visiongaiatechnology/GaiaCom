# GaiaCom Android Node Architecture v0.1

Status: DIAMANT VGT SUPREME architecture baseline  
Date: 2026-07-16

## Product boundary

The Android application is a complete GaiaCom client and an embedded GaiaCom
node. It is not a WebView, browser wrapper, remote-control shell, or separate
rewrite of GaiaCom cryptography and business rules.

The application has four independently testable planes:

1. Native Android presentation: Kotlin and Jetpack Compose only.
2. Application kernel: lifecycle, commands, events, authorization context, and
   feature registration.
3. Embedded node: the importable Go backend invoked in-process through one
   `gomobile` API without a TCP listener.
4. Cryptographic core: GaiaCore Rust with a narrow, versioned native ABI.

Internet, local Wi-Fi, and Bluetooth are transports. They do not own messages,
identities, rooms, feeds, or cryptographic state.

## Mandatory module graph

```text
app
  -> platform:kernel
  -> platform:designsystem
  -> feature:*

feature:*
  -> platform:contracts
  -> platform:designsystem

platform:kernel
  -> platform:contracts
  -> platform:node
  -> platform:security
  -> platform:transport

platform:node
  -> native Go embedded-node bridge

platform:security
  -> Android Keystore / StrongBox wrapper
  -> native GaiaCore bridge

transport:internet | transport:lan | transport:bluetooth
  -> platform:transport
```

No feature module may depend on another feature module. No feature may call
JNI, Android Keystore, SQLite, Bluetooth, Wi-Fi, HTTP, or GaiaCore directly.

## Complete feature partition

| Module | GaiaCom capability |
| --- | --- |
| `feature:auth` | Registration, login, unlock, recovery, onboarding |
| `feature:dashboard` | Node and account overview |
| `feature:mail` | Native encrypted mail and explicit SMTP downgrade |
| `feature:chat` | Direct E2EE conversations, attachments, presence |
| `feature:groups` | Rooms, channels, membership and role controls |
| `feature:channels` | Public channels, posts, comments, reactions, pins |
| `feature:gsn` | GSN feed, profiles, encrypted media, federation |
| `feature:drive` | GaiaDrive encrypted storage |
| `feature:drop` | GaiaDrop secure inbox and submissions |
| `feature:contacts` | Address book, key history, trust passport |
| `feature:profile` | Identity profile and Gaia Passport |
| `feature:security` | GaiaShield events, devices, fingerprints, vault |
| `feature:governance` | Meldecenter, abuse cases, consensus workflows |
| `feature:network` | Node health, federation and transport state |
| `feature:settings` | Notifications, language, privacy and node policy |

All modules ship in the first public Android release. Delivery may occur in
vertical slices, but the dependency graph is fixed before feature work begins.

## Embedded node boundary

The Go node receives typed requests through an in-memory bridge. The bridge:

- opens no loopback port;
- accepts only explicit HTTP-equivalent methods and an allowlist of headers;
- rejects absolute URLs, traversal, encoded path separators and header breaks;
- caps request and response memory;
- injects independent JWT, GaiaShield, TrustMesh and node identity secrets;
- owns SQLite and the local object-store lifecycle;
- joins all background workers before closing the database.

`gomobile bind` generates JNI/Java for Android and Objective-C for the later
iOS target from the same `Backend/mobileapi` package. Generated bindings are
adapters around this boundary, never a second API implementation.

## Offline transport model

Every outbound object is a signed, encrypted Gaia envelope with a stable ID.
The durable outbox exists once in the embedded node. A transport lease selects
one eligible path:

1. authenticated internet federation;
2. mutually authenticated LAN peer;
3. mutually authenticated Bluetooth peer.

Receivers apply the same signature, replay, authorization and deduplication
checks regardless of transport. Transport discovery never establishes trust.
Trust comes from Gaia identities, device keys and explicit pairing.

## Android key hierarchy

- Android Keystore AES-256 key: non-exportable wrapper key, StrongBox preferred.
- Vault master key: random, wrapped by the Keystore key, never persisted raw.
- Gaia identity/device keys: encrypted by the vault master key.
- Node JWT, GaiaShield and TrustMesh secrets: independent random values encrypted
  inside the vault; never derived from one another.
- Database and object payloads: encrypted content; metadata exposure is tracked
  explicitly in the threat model.

StrongBox failure falls back only to a hardware-backed TEE. Software-only key
storage is a visible reduced-assurance state, never silently labelled secure.

## Enforced engineering limits

- Maximum 500 physical lines per Kotlin, Java, Rust, Go, C, C++, or Gradle source file.
- No WebView or dynamically downloaded executable UI.
- No feature-to-feature build dependency.
- No raw cryptography or platform transport API inside feature modules.
- No external analytics, advertising, remote font, or UI SDK.
- Release builds are minified, resource-shrunk, signed and reproducible.
- Every native ABI request is versioned, bounded and fuzzed.

## Release evidence

The Android release is not complete until all feature modules are functional,
the embedded Go and Rust libraries build for every supported ABI, device tests
pass on API 28 through the current target API, and signed APK/AAB reproducibility
is independently verified.
