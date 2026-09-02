# STATUS: DIAMANT VGT SUPREME
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def run(command, cwd, timeout=120, env=None):
    completed = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env=env,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()
        raise RuntimeError(f"{' '.join(command)} failed: {detail}")
    return completed.stdout


def run_poc():
    root = Path(__file__).resolve().parents[4]
    try:
        run([sys.executable, str(root / "scripts" / "repository_hygiene.py")], root)
        with tempfile.TemporaryDirectory(prefix="gaiacom-gomodcache-") as module_cache:
            go_env = os.environ.copy()
            go_env["GOMODCACHE"] = module_cache
            run(["go", "mod", "download"], root / "Backend", timeout=180, env=go_env)
            run(["go", "mod", "verify"], root / "Backend", timeout=180, env=go_env)

        npm = "npm.cmd" if os.name == "nt" else "npm"
        manifest_path = root / "Frontend" / "frontend" / "package.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        ranged_dependencies = []
        for section in ("dependencies", "devDependencies"):
            for name, version in manifest.get(section, {}).items():
                if version.startswith(("^", "~", ">", "<", "*", "latest", "http:", "https:", "git:", "file:")):
                    ranged_dependencies.append(f"{section}:{name}={version}")
        if ranged_dependencies:
            raise RuntimeError(f"frontend dependencies are not exactly pinned: {ranged_dependencies}")

        audit_output = run([npm, "audit", "--json"], root / "Frontend" / "frontend")
        audit = json.loads(audit_output)
        vulnerabilities = audit.get("metadata", {}).get("vulnerabilities", {})
        if int(vulnerabilities.get("total", 0)) != 0:
            raise RuntimeError(f"npm dependency audit contains findings: {vulnerabilities}")

        for crate in (root / "Core" / "rust" / "gaiacore", root / "DesktopClient" / "src-tauri"):
            if not (crate / "Cargo.lock").is_file():
                raise RuntimeError(f"missing Rust lockfile: {crate / 'Cargo.lock'}")
            run(["cargo", "metadata", "--locked", "--no-deps", "--format-version", "1"], crate)

        lockfile = root / "Frontend" / "frontend" / "package-lock.json"
        package_lock = json.loads(lockfile.read_text(encoding="utf-8"))
        packages = package_lock.get("packages", {})
        missing_integrity = [
            name for name, data in packages.items()
            if name.startswith("node_modules/") and data.get("resolved") and not data.get("integrity")
        ]
        if missing_integrity:
            raise RuntimeError(f"package-lock entries without integrity hashes: {missing_integrity[:5]}")
    except Exception as exc:
        print(f"[TOTAL-SC] FAIL: {exc}")
        return False

    print("[TOTAL-SC] PASS: repository hygiene, Go modules, frontend audit/pins, Rust lockfiles, and npm integrity hashes verified")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
