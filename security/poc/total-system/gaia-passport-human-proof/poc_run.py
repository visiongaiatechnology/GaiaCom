# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")


def require(label, condition):
    if not condition:
        print(f"[GAIA-PASSPORT-HUMAN-PROOF] FAIL: {label}")
        return False
    print(f"[GAIA-PASSPORT-HUMAN-PROOF] PASS: {label}")
    return True


def run_poc():
    root = repo_root()
    human_proof = read_text(root / "Frontend" / "frontend" / "src" / "utils" / "humanProof.js")
    api = read_text(root / "Frontend" / "frontend" / "src" / "api.js")
    dialog = read_text(root / "Frontend" / "frontend" / "src" / "components" / "common" / "HumanProofDialog.js")
    passport = read_text(root / "Frontend" / "frontend" / "src" / "components" / "common" / "GaiaPassportCard.js")
    crypto = read_text(root / "Frontend" / "frontend" / "src" / "crypto.js")
    gsn = read_text(root / "Frontend" / "frontend" / "src" / "components" / "chat" / "GsnPane.js")
    security_center = read_text(root / "Frontend" / "frontend" / "src" / "components" / "chat" / "SecurityCenter.js")
    contact_modal = read_text(root / "Frontend" / "frontend" / "src" / "components" / "modals" / "ContactProfileModal.js")
    css = read_text(root / "Frontend" / "frontend" / "src" / "styles" / "chat.css")
    identity_service = read_text(root / "Backend" / "identity" / "identity_service.go")
    identity_handler = read_text(root / "Backend" / "identity" / "identity_handler.go")
    routes = read_text(root / "Backend" / "routes.go")
    repository = read_text(root / "Backend" / "repository" / "repository.go")

    checks = [
        (
            "human proof uses WebCrypto SHA-256 inside an isolated worker",
            "new Worker(workerUrl)" in human_proof
            and "crypto.subtle.digest('SHA-256'" in human_proof
            and "URL.revokeObjectURL(workerUrl)" in human_proof,
        ),
        (
            "human proof ceremony is configured for a five minute local challenge",
            "const HUMAN_PROOF_DURATION_MS = 5 * 60 * 1000" in dialog
            and "5-Minuten-Verifizierung starten" in dialog,
        ),
        (
            "human proof result is signed with the identity Ed25519 key before storage",
            "crypto.signGsnMessage(signaturePayload, derivedKeys.sign.private)" in dialog
            and "signerPublicKey: derivedKeys.sign.public" in dialog,
        ),
        (
            "human proof binds the same canonical payload to ML-DSA-87 when the identity has PQ keys",
            "signMldsa87Message(messageText, privateKeyHex)" in crypto
            and "ml_dsa87.sign(messageBytes, privateKeyBytes)" in crypto
            and "signatureSuite: mldsa87Signature ? 'Ed25519+ML-DSA-87' : 'Ed25519'" in dialog
            and "mldsa87Signature" in dialog
            and "mldsa87PublicKey" in dialog,
        ),
        (
            "human proof persists server-side and keeps a scoped local cache for fast UI restore",
            "gaia_human_proof_v1_" in human_proof
            and "localStorage.setItem(storageKey(gaiaId), JSON.stringify(proof))" in human_proof
            and "saveIdentityHumanProof" in api
            and "/api/v1/identity/human-proof" in api
            and "api.saveIdentityHumanProof(identityId, signedProof)" in dialog,
        ),
        (
            "server verifies the signed proof against the identity public key before writing the public record",
            "ed25519.Verify" in identity_service
            and "human proof signer mismatch" in identity_service
            and "UpdateIdentityHumanProof" in repository
            and "protected.POST(\"/api/v1/identity/human-proof\", identityHandler.SaveHumanProof)" in routes
            and "Human proof rejected" in identity_handler,
        ),
        (
            "server rejects hybrid human proofs whose ML-DSA-87 key is not bound to the identity public record",
            "humanProofSuiteHybrid" in identity_service
            and "mldsa87PublicKeyHexLen" in identity_service
            and "mldsa87SignatureHexLen" in identity_service
            and "human proof mldsa87 signer mismatch" in identity_service
            and "invalid human proof mldsa87 encoding" in identity_service,
        ),
        (
            "server cryptographically verifies ML-DSA-87 human proof signatures",
            "\"github.com/cloudflare/circl/sign/mldsa/mldsa87\"" in identity_service
            and "mldsa87.Verify(&publicKey, []byte(payload), nil, mldsa87SignatureBytes)" in identity_service
            and "invalid human proof mldsa87 signature" in identity_service,
        ),
        (
            "Gaia Passport card is available in GSN, Security Center, and contact Trust Passport modal",
            "GaiaPassportCard" in gsn
            and "HumanProofDialog" in gsn
            and "GaiaPassportCard" in security_center
            and "HumanProofDialog" in security_center
            and "GaiaPassportCard" in contact_modal,
        ),
        (
            "Gaia Passport card has desktop ID layout and mobile 9:16 layout",
            ".gaia-passport-card" in css
            and "aspect-ratio: 9 / 16" in css
            and ".gaia-passport-mrz" in css,
        ),
        (
            "Passport rendering avoids raw HTML sinks",
            "dangerouslySetInnerHTML" not in passport
            and "innerHTML" not in passport
            and "dangerouslySetInnerHTML" not in dialog,
        ),
    ]

    ok = True
    for label, condition in checks:
        ok = require(label, condition) and ok

    if ok:
        print("[GAIA-PASSPORT-HUMAN-PROOF] PASS: Passport UI + signed local SHA ceremony regression guard holds")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
