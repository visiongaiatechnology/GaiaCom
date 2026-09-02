# STATUS: DIAMANT VGT SUPREME
# GaiaCOM Master Security Verification Suite
#
# Orchestrates and runs all security tests in the GaiaCOM ecosystem:
# 1. Backend Go Unit Tests
# 2. Frontend build, tests, dependency audit, and cryptographic harness
# 3. Active Security PoCs (Federation, SMTP Bridge, Path Traversal, etc.)
# 4. Total System Security Assurances
#
# Automatically manages background Go server lifecycle and clean test database states.

import os
import sys
import time
import socket
import platform
import subprocess
import tempfile
from contextlib import closing

# Define base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECURITY_DIR = os.path.join(BASE_DIR, "security")
POC_DIR = os.path.join(SECURITY_DIR, "poc")
TEST_DB_PREFIX = "test_security_gaiacom.db"
TEST_RELEASE_LDFLAGS = (
    "-s -w "
    "-X gaiacom/backend/buildinfo.Version=2.0.0 "
    "-X gaiacom/backend/buildinfo.Commit=0123456789abcdef "
    "-X gaiacom/backend/buildinfo.BuiltAt=2026-07-15T00:00:00Z"
)

# Color helpers for rich console output
class Colors:
    GREEN = "\033[92m" if sys.stdout.isatty() else ""
    RED = "\033[91m" if sys.stdout.isatty() else ""
    YELLOW = "\033[93m" if sys.stdout.isatty() else ""
    BLUE = "\033[94m" if sys.stdout.isatty() else ""
    BOLD = "\033[1m" if sys.stdout.isatty() else ""
    RESET = "\033[0m" if sys.stdout.isatty() else ""

def print_header(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE} {title} {Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")

def print_pass(msg):
    print(f"{Colors.GREEN}[PASS] {msg}{Colors.RESET}")

def print_fail(msg):
    print(f"{Colors.RED}[FAIL] {msg}{Colors.RESET}")

def cleanup_test_db():
    """Removes temporary SQLite database files created during the test run."""
    for suffix in ["", "-journal", "-wal", "-shm"]:
        db_file = os.path.join(BASE_DIR, f"{TEST_DB_PREFIX}{suffix}")
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except Exception as e:
                print(f"[!] Warning: Could not remove {db_file}: {e}")

def wait_for_port(port, timeout=12):
    """Waits until a local port is listening."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (socket.timeout, ConnectionRefusedError):
            time.sleep(0.5)
    return False

def allocate_free_port():
    """Returns a currently free loopback TCP port for isolated CI runs."""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return sock.getsockname()[1]

def beta_audit_has_open_needs_test():
    report_path = os.path.join(SECURITY_DIR, "reports", "beta-v2-security-audit.md")
    if not os.path.exists(report_path):
        return True, "beta-v2 security audit report missing"
    with open(report_path, "r", encoding="utf-8", errors="ignore") as handle:
        report = handle.read()
    if "NEEDS TEST" in report:
        return True, "beta-v2 security audit still contains NEEDS TEST rows"
    return False, ""

def run_cmd(args, cwd=BASE_DIR, env=None, show_output=True, timeout=120):
    """Runs a shell command and returns output, returncode."""
    try:
        res = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
        if show_output and res.stdout.strip():
            print(res.stdout.strip())
        if res.returncode != 0 and res.stderr.strip() and show_output:
            print(f"{Colors.RED}Error output:{Colors.RESET}\n{res.stderr.strip()}")
        return res.returncode, res.stdout, res.stderr
    except Exception as e:
        return -1, "", str(e)

POC_TIMEOUT_SECONDS = {
    # Composite hardening runs multiple nested Go packages. Its outer process
    # budget must exceed the script's own bounded 90-second command budget.
    "composite-hardening": 180,
    # Edition-boundary scans the complete source tree and is intentionally given
    # the same bounded budget as the total-system runner.
    "edition-boundary": 120,
    "supply-chain": 180,
}

def run_poc_script(script_path, env=None):
    """Runs a Python PoC script and returns whether it passed."""
    try:
        test_name = os.path.basename(os.path.dirname(script_path))
        timeout = POC_TIMEOUT_SECONDS.get(test_name, 30)
        res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, timeout=timeout, env=env or os.environ.copy())
        output = res.stdout.strip()
        if output:
            print(output)
        if res.returncode == 0 and "FAIL" not in output:
            return True
        else:
            if res.stderr.strip():
                print(f"{Colors.RED}Stderr:{Colors.RESET} {res.stderr.strip()}")
            return False
    except Exception as e:
        print(f"{Colors.RED}Execution failed:{Colors.RESET} {e}")
        return False

def main():
    total_passed = 0
    total_failed = 0
    failed_checks = []

    print(f"\n{Colors.BOLD}{Colors.GREEN}==================================================")
    print("      GaiaCOM Mastersuite Sicherheitsprüfungen")
    print(f"=================================================={Colors.RESET}")

    # -------------------------------------------------------------------------
    # STEP 1: Backend Go Unit Tests
    # -------------------------------------------------------------------------
    print_header("1. Backend Go Unit Tests")
    go_env = os.environ.copy()
    go_env["GAIACOM_SHIELD_SECRET"] = "test_gaiashield_secret_for_adversarial_routes"
    go_env["GAIACOM_DEV_MODE"] = "false"
    go_env["GOCACHE"] = os.path.join(BASE_DIR, "Backend", ".gocache")
    
    code, out, err = run_cmd(["go", "-C", "Backend", "test", "-count=1", "./..."], env=go_env, timeout=180)
    if code == 0:
        print_pass("All Backend Go unit tests passed.")
        total_passed += 1
    else:
        print_fail("Some Backend Go unit tests failed.")
        total_failed += 1
        failed_checks.append("backend-go-unit-tests")

    # -------------------------------------------------------------------------
    # STEP 2: Cryptographic & Frontend Harness
    # -------------------------------------------------------------------------
    print_header("2. Frontend & Cryptographic Harness")
    frontend_dir = os.path.join(BASE_DIR, "Frontend", "frontend")
    npm = "npm.cmd" if os.name == "nt" else "npm"
    frontend_checks = [
        ("frontend-tests", [npm, "test"], 120),
        ("frontend-production-build", [npm, "run", "build"], 180),
        ("frontend-dependency-audit", [npm, "audit", "--audit-level=low"], 120),
    ]
    for check_name, command, timeout in frontend_checks:
        code, _, _ = run_cmd(command, cwd=frontend_dir, timeout=timeout)
        if code == 0:
            print_pass(f"{check_name} passed.")
            total_passed += 1
        else:
            print_fail(f"{check_name} failed.")
            total_failed += 1
            failed_checks.append(check_name)

    code, out, err = run_cmd(["node", "Frontend/frontend/src/adversarial_run.mjs"])
    if code == 0 and "0 failed" in out:
        print_pass("All cryptographic properties and layout assertions passed.")
        total_passed += 1
    else:
        print_fail("Cryptographic / Frontend harness checks failed.")
        total_failed += 1
        failed_checks.append("frontend-cryptographic-harness")

    # -------------------------------------------------------------------------
    # STEP 3: Active Security PoCs & Total System Assurances
    # -------------------------------------------------------------------------
    print_header("3. Starting Local Go Server for Active PoC Checks")
    cleanup_test_db()
    dynamic_port = allocate_free_port()
    dynamic_base_url = f"http://127.0.0.1:{dynamic_port}"

    server_env = os.environ.copy()
    server_env["GAIACOM_SHIELD_SECRET"] = "test_gaiashield_secret_for_adversarial_routes"
    server_env["GAIACOM_METRICS_TOKEN"] = "test_metrics_token_with_at_least_32_random_bytes"
    server_env["GAIACOM_JWT_SECRET"] = "another_very_secret_key_for_jwt_signing_change_me_to_a_long_random_string"
    server_env["GAIACOM_SMTP_INGEST_TOKEN"] = "ingest-secret"
    server_env["GAIACOM_DEV_MODE"] = "false"
    server_env["GAIACOM_SERVER_NAME"] = "node.security.test"
    server_env["GAIACOM_TRUSTMESH_EPOCH_SECRET"] = "42" * 32
    server_env["GAIACOM_SERVER_PRIVATE_KEY"] = (
        "9d61b19deffd5a60ba844af492ec2cc4"
        "4449c5697b326919703bac031cae7f60"
        "d75a980182b10ab7d54bfed3c964073a"
        "0ee172f3daa62325af021a68f707511a"
    )
    server_env["DB_PATH"] = os.path.join(BASE_DIR, TEST_DB_PREFIX)
    server_env["SERVER_PORT"] = str(dynamic_port)
    server_env["GAIACOM_TEST_BASE_URL"] = dynamic_base_url

    binary_suffix = ".exe" if platform.system() == "Windows" else ""
    binary_path = os.path.join(tempfile.gettempdir(), f"gaiacom-security-{os.getpid()}{binary_suffix}")
    server_cmd = [binary_path]

    server_proc = None
    try:
        if os.path.exists(binary_path):
            os.remove(binary_path)
        print("[*] Building fresh backend binary from the current source tree...")
        build_code, _, build_err = run_cmd(
            ["go", "build", "-buildvcs=false", "-trimpath", "-ldflags", TEST_RELEASE_LDFLAGS, "-o", binary_path, "."],
            cwd=os.path.join(BASE_DIR, "Backend"),
            env=server_env,
            timeout=180,
        )
        if build_code != 0:
            raise RuntimeError(f"fresh backend build failed: {build_err}")
        print(f"[*] Launching fresh test binary: {binary_path}")
        server_proc = subprocess.Popen(
            server_cmd,
            cwd=os.path.join(BASE_DIR, "Backend"),
            env=server_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        print(f"[*] Waiting for GaiaCOM server to boot on port {dynamic_port}...")
        if not wait_for_port(dynamic_port):
            raise Exception(f"GaiaCOM local server failed to start on port {dynamic_port} within timeout.")
        print_pass("Local server is listening. Running active security PoCs...")

        # Find and run active PoC tests (federation, smtp-bridge, path-traversal)
        active_pocs = []
        total_system_pocs = []

        for root, _, files in os.walk(POC_DIR):
            if "poc_run.py" in files:
                script_path = os.path.join(root, "poc_run.py")
                rel_path = os.path.relpath(root, POC_DIR)
                if "total-system" in rel_path:
                    total_system_pocs.append((rel_path, script_path))
                else:
                    active_pocs.append((rel_path, script_path))

        # Run Active PoC Tests
        print_header("3a. Active API Security PoCs")
        for name, path in sorted(active_pocs):
            print(f"\n[*] Running active PoC: {Colors.BOLD}{name}{Colors.RESET}")
            if run_poc_script(path, server_env):
                print_pass(f"{name} verified successfully.")
                total_passed += 1
            else:
                print_fail(f"{name} verification failed.")
                total_failed += 1
                failed_checks.append(name)
            print("-" * 50)

        # Run Total System Assurances
        print_header("3b. Total System Security Assurances")
        for name, path in sorted(total_system_pocs):
            print(f"\n[*] Running system check: {Colors.BOLD}{name}{Colors.RESET}")
            if run_poc_script(path, server_env):
                print_pass(f"{name} assertion succeeded.")
                total_passed += 1
            else:
                print_fail(f"{name} assertion failed.")
                total_failed += 1
                failed_checks.append(name)
            print("-" * 50)

    except Exception as e:
        print_fail(f"Could not execute active PoC checks: {e}")
        total_failed += 1
        failed_checks.append("active-poc-orchestration")

    finally:
        if server_proc:
            print("\n[*] Terminating local Go server...")
            server_proc.terminate()
            try:
                server_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_proc.kill()
            print_pass("Local server terminated cleanly.")
        cleanup_test_db()
        if os.path.exists(binary_path):
            try:
                os.remove(binary_path)
            except OSError as exc:
                print(f"[!] Warning: could not remove temporary backend binary: {exc}")

    # -------------------------------------------------------------------------
    # STEP 4: Extreme Security Gate Tests
    # -------------------------------------------------------------------------
    print_header("4. Extreme Security Gate (extreme_runner.py)")
    code, out, err = run_cmd([sys.executable, os.path.join(SECURITY_DIR, "extreme", "extreme_runner.py")], env=go_env, timeout=240)
    if code == 0 and "DIAMANT VERIFIED" in out:
        print_pass("Extreme Security Gate verified with status DIAMANT VERIFIED.")
        total_passed += 1
    else:
        print_fail("Extreme Security Gate failed.")
        total_failed += 1
        failed_checks.append("extreme-security-gate")

    # -------------------------------------------------------------------------
    # STEP 5: Beta V2 Audit Release-Gate Closure
    # -------------------------------------------------------------------------
    print_header("5. Beta V2 Audit Needs-Test Gate")
    has_open_tests, needs_test_reason = beta_audit_has_open_needs_test()
    if has_open_tests:
        print_fail(needs_test_reason)
        total_failed += 1
        failed_checks.append("beta-v2-audit-needs-test")
    else:
        print_pass("No NEEDS TEST rows remain in beta-v2 security audit.")
        total_passed += 1

    # -------------------------------------------------------------------------
    # FINAL REPORT
    # -------------------------------------------------------------------------
    print_header("Zusammenfassung der Sicherheitsprüfungen")
    print(f"Gesamt bestanden: {Colors.GREEN}{total_passed}{Colors.RESET}")
    print(f"Gesamt fehlgeschlagen: {Colors.RED if total_failed > 0 else Colors.GREEN}{total_failed}{Colors.RESET}")
    if failed_checks:
        print(f"Failed checks: {', '.join(failed_checks)}")

    if total_failed > 0:
        print(f"\n{Colors.RED}[X] Einige Sicherheitspruefungen sind FEHLGESCHLAGEN! Bitte Log-Details pruefen.{Colors.RESET}\n")
        sys.exit(1)
    else:
        print(f"\n{Colors.GREEN}[OK] Alle Sicherheitspruefungen der Mastersuite wurden ERFOLGREICH BESTANDEN!{Colors.RESET}\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
