import sys
from pathlib import Path


MAX_INLINE_STYLE_PROPS = 846
STRICT_COMPONENTS = (
    Path("Frontend/frontend/src/components/app/AppFeedbackModals.jsx"),
    Path("Frontend/frontend/src/components/auth/UnlockScreen.jsx"),
    Path("Frontend/frontend/src/components/common/AvatarPicker.jsx"),
    Path("Frontend/frontend/src/components/chat/gsn/DecryptedAvatar.jsx"),
    Path("Frontend/frontend/src/components/chat/gsn/DecryptedGsnImage.jsx"),
    Path("Frontend/frontend/src/components/layout/LogoMark.jsx"),
    Path("Frontend/frontend/src/components/modals/AddContactModal.jsx"),
    Path("Frontend/frontend/src/components/modals/ContactProfileModal.jsx"),
    Path("Frontend/frontend/src/components/modals/CreateChannelModal.jsx"),
    Path("Frontend/frontend/src/components/modals/CreateGroupModal.jsx"),
    Path("Frontend/frontend/src/components/modals/JoinGroupModal.jsx"),
    Path("Frontend/frontend/src/components/modals/KeyChangeWarningModal.jsx"),
    Path("Frontend/frontend/src/components/modals/QuantumShieldModal.jsx"),
    Path("Frontend/frontend/src/components/public/NetworkHealthDashboard.jsx"),
)


def repo_root():
    return Path(__file__).resolve().parents[4]


def count_inline_style_props(root):
    count = 0
    offenders = []
    src_root = root / "Frontend" / "frontend" / "src"
    for path in src_root.rglob("*"):
        if path.suffix.lower() not in {".js", ".jsx"}:
            continue
        if any(part in {"node_modules", "build"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        occurrences = text.count("style={{")
        if occurrences:
            count += occurrences
            offenders.append((path.relative_to(root), occurrences))
    return count, offenders


def run_poc():
    root = repo_root()
    print("[CSP-INLINE-STYLE] Measuring React inline style debt...")

    total, offenders = count_inline_style_props(root)
    if total > MAX_INLINE_STYLE_PROPS:
        print(f"[CSP-INLINE-STYLE] FAIL: inline style props increased to {total}; budget is {MAX_INLINE_STYLE_PROPS}")
        for path, occurrences in sorted(offenders, key=lambda item: item[1], reverse=True)[:8]:
            print(f"  {path}: {occurrences}")
        return False

    for component in STRICT_COMPONENTS:
        text = (root / component).read_text(encoding="utf-8", errors="ignore")
        if "style={{" in text:
            print(f"[CSP-INLINE-STYLE] FAIL: strict component regressed: {component}")
            return False

    print(f"[CSP-INLINE-STYLE] PASS: inline style debt is capped at {total}/{MAX_INLINE_STYLE_PROPS}; strict modal components remain clean")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
