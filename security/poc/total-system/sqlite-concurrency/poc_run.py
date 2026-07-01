#!/usr/bin/env python3
# GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
import sys
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


CRITICAL_WRITE_FILES = {
    "Backend/repository/sql_store_gsn.go": [
        "CreateGsnPost",
        "DeleteGsnPost",
        "CreateGsnComment",
        "DeleteGsnComment",
        "ToggleGsnReaction",
        "SaveGsnReaction",
        "FollowGsnUser",
        "UnfollowGsnUser",
        "UpdateGsnProfile",
    ],
    "Backend/repository/sql_store_storage_gaiadrop.go": [
        "CreateFileMetadata",
        "CreateFileChunk",
        "FinalizePendingUpload",
        "CreateGaiaDropSubmission",
        "MarkFilePublic",
        "DeleteExpiredFileAccessGrants",
        "DeleteFileMetadata",
    ],
    "Backend/repository/sql_store_reports.go": [
        "CreateReport",
        "SaveAbuseScore",
    ],
}


def read(path: str) -> str:
    return (repo_root() / path).read_text(encoding="utf-8")


def function_body(source: str, name: str) -> str:
    marker = f"func (s *SQLStore) {name}"
    start = source.find(marker)
    if start < 0:
        raise AssertionError(f"{name} missing")
    next_func = source.find("\nfunc ", start + len(marker))
    if next_func < 0:
        return source[start:]
    return source[start:next_func]


def assert_busy_retry_coverage() -> None:
    store_core = read("Backend/repository/sql_store.go")
    required_core = [
        "func (s *SQLStore) execWithBusyRetry",
        "func withSQLiteBusyRetry",
        "const attempts = 10",
        "database is locked",
        "database table is locked",
        "SQLITE_BUSY".lower(),
    ]
    lowered = store_core.lower()
    for token in required_core:
        haystack = lowered if token == token.lower() else store_core
        if token not in haystack:
            raise AssertionError(f"busy retry core missing token: {token}")

    for path, functions in CRITICAL_WRITE_FILES.items():
        source = read(path)
        if "s.db.Exec(" in source:
            raise AssertionError(f"{path} still uses contextless s.db.Exec")
        for name in functions:
            body = function_body(source, name)
            if "execWithBusyRetry" not in body:
                raise AssertionError(f"{path}:{name} bypasses execWithBusyRetry")
            if "s.db.ExecContext" in body:
                raise AssertionError(f"{path}:{name} still uses direct s.db.ExecContext")


def run_poc() -> bool:
    try:
        assert_busy_retry_coverage()
    except AssertionError as exc:
        print(f"[FAIL] SQLite concurrency hardening incomplete: {exc}")
        return False
    print("[PASS] Critical GSN, GaiaDrive/GaiaDrop, and report writes use SQLite busy retry/backoff.")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_poc() else 1)
