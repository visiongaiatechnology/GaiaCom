# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root():
    return Path(__file__).resolve().parents[4]


def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")


def assert_contains(text, needle, label, failures):
    if needle not in text:
        failures.append(f"{label}: missing {needle}")


def assert_not_contains(text, needle, label, failures):
    if needle in text:
        failures.append(f"{label}: forbidden {needle}")


def run_poc():
    root = repo_root()
    failures = []

    poc_runner = root / "security" / "poc_runner.py"
    total_runner = root / "security" / "total_system_poc_runner.py"
    master_suite = root / "security" / "master_security_suite.py"
    extreme_runner = root / "security" / "extreme" / "extreme_runner.py"

    for path in [poc_runner, total_runner, master_suite, extreme_runner]:
        if not path.exists():
            failures.append(f"missing required runner: {path}")

    if failures:
        print("FAIL: runner portability preflight failed")
        for failure in failures:
            print(f" - {failure}")
        return False

    poc_runner_text = read_text(poc_runner)
    total_runner_text = read_text(total_runner)
    master_suite_text = read_text(master_suite)
    extreme_runner_text = read_text(extreme_runner)

    for label, text in [
        ("poc_runner", poc_runner_text),
        ("total_system_poc_runner", total_runner_text),
        ("master_security_suite", master_suite_text),
        ("extreme_runner", extreme_runner_text),
    ]:
        assert_not_contains(text, "C:\\Users", label, failures)
        assert_not_contains(text, "c:\\Users", label, failures)
        assert_not_contains(text, "base_dir = r", label, failures)

    assert_contains(poc_runner_text, "Path(__file__).resolve().parent", "poc_runner", failures)
    assert_contains(total_runner_text, "Path(__file__).resolve().parent", "total_system_poc_runner", failures)

    assert_contains(master_suite_text, "allocate_free_port", "master_security_suite", failures)
    assert_contains(master_suite_text, "GAIACOM_TEST_BASE_URL", "master_security_suite", failures)
    assert_contains(master_suite_text, "beta_audit_has_open_needs_test", "master_security_suite", failures)
    assert_not_contains(master_suite_text, 'SERVER_PORT"] = "8080"', "master_security_suite", failures)
    assert_not_contains(master_suite_text, "wait_for_port(8080", "master_security_suite", failures)

    assert_contains(extreme_runner_text, "allocate_free_port", "extreme_runner", failures)
    assert_contains(extreme_runner_text, "SERVER_PORT", "extreme_runner", failures)
    assert_contains(extreme_runner_text, "GAIACOM_TEST_BASE_URL", "extreme_runner", failures)
    assert_contains(extreme_runner_text, '"go", "run"', "extreme_runner", failures)

    poc_scripts = sorted((root / "security" / "poc").glob("**/poc_run.py"))
    for script in poc_scripts:
        text = read_text(script)
        rel = script.relative_to(root)
        if "def run_poc" in text:
            assert_contains(text, "sys.exit(0 if run_poc() else 1)", str(rel), failures)

    if failures:
        print("FAIL: PoC runner portability/security gate regression detected")
        for failure in failures:
            print(f" - {failure}")
        return False

    print("PASS: PoC runners are portable, dynamic-port aware, and fail-closed.")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
