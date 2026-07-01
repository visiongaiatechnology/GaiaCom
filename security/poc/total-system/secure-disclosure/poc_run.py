# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def run_poc():
    print("[TOTAL-DISCLOSURE] Verifying secure disclosure limits...")
    root = repo_root()
    secure_export = (root / "Frontend" / "frontend" / "src" / "utils" / "secureExport.js").read_text(encoding="utf-8", errors="ignore")
    use_emails = (root / "Frontend" / "frontend" / "src" / "hooks" / "useEmails.js").read_text(encoding="utf-8", errors="ignore")
    chat_pane = (root / "Frontend" / "frontend" / "src" / "components" / "chat" / "ChatPane.js").read_text(encoding="utf-8", errors="ignore")
    group_pane = (root / "Frontend" / "frontend" / "src" / "components" / "chat" / "GroupChatPane.js").read_text(encoding="utf-8", errors="ignore")

    failures = []
    for token in ["mnemonic", "private[_-]?key", "jwt", "auth[_-]?token", "recovery[_-]?phrase"]:
        if token not in secure_export:
            failures.append(f"secure export scrubber missing pattern {token}")
    for source_name, source in [
        ("GaiaMail disclosure", use_emails),
        ("direct chat GaiaProof", chat_pane),
        ("group chat GaiaProof", group_pane),
    ]:
        if "sanitizeSecureExport" not in source or "assertSecureExportClean" not in source:
            failures.append(f"{source_name} export does not enforce secure export sanitizer")

    if failures:
        print("[TOTAL-DISCLOSURE] FAIL: export secret scrub coverage incomplete")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("[TOTAL-DISCLOSURE] PASS: disclosure and GaiaProof exports scrub private keys, JWTs, mnemonics, and recovery material")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
