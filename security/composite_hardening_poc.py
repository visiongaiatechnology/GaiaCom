# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import runpy
import sys
from pathlib import Path


def run_poc() -> bool:
    script = Path(__file__).resolve().parent / "poc" / "total-system" / "composite-hardening" / "poc_run.py"
    if not script.exists():
        print("[COMPOSITE-HARDENING] FAIL: nested PoC script is missing")
        return False
    namespace = runpy.run_path(str(script))
    nested = namespace.get("run_poc")
    if not callable(nested):
        print("[COMPOSITE-HARDENING] FAIL: nested PoC has no run_poc()")
        return False
    return bool(nested())


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
