"""STATUS: DIAMANT VGT SUPREME — active release operations gate."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime


BASE_URL = os.environ.get("GAIACOM_TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
METRICS_TOKEN = os.environ.get("GAIACOM_METRICS_TOKEN", "")


def request(path: str, authorization: str = "") -> tuple[int, str, dict[str, str]]:
    headers = {"Accept": "application/json"}
    if authorization:
        headers["Authorization"] = authorization
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, response.read().decode("utf-8"), dict(response.headers.items())
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8"), dict(error.headers.items())


def fail(message: str) -> None:
    print(f"[RELEASE-OPERATIONS] FAIL: {message}")
    raise SystemExit(1)


def main() -> None:
    print("[RELEASE-OPERATIONS] Verifying liveness, readiness, metrics isolation, and immutable build identity...")
    if len(METRICS_TOKEN) < 32:
        fail("test metrics credential is missing")

    for path, expected_status in (("/livez", 200), ("/readyz", 200)):
        status, body, headers = request(path)
        if status != expected_status:
            fail(f"{path} returned {status}: {body}")
        if len(headers.get("X-Request-Id", headers.get("X-Request-ID", ""))) != 32:
            fail(f"{path} did not emit a 128-bit request correlation id")

    for authorization in ("", "Bearer invalid"):
        status, body, _ = request("/metrics", authorization)
        if status != 404:
            fail(f"metrics discovery was not opaque for {authorization!r}: {status} {body}")

    status, metrics, _ = request("/metrics", f"Bearer {METRICS_TOKEN}")
    if status != 200 or "gaiacom_http_requests_total" not in metrics:
        fail(f"authenticated metrics unavailable: {status} {metrics}")

    status, body, _ = request("/api/v1/public/version")
    if status != 200:
        fail(f"version endpoint returned {status}: {body}")
    metadata = json.loads(body)
    if metadata.get("version") != "2.0.0":
        fail(f"anonymous or unexpected build version: {metadata.get('version')!r}")
    commit = metadata.get("commit", "")
    if len(commit) < 7 or any(char not in "0123456789abcdefABCDEF" for char in commit):
        fail(f"invalid build commit: {commit!r}")
    built_at = metadata.get("built_at", "")
    try:
        datetime.fromisoformat(built_at.replace("Z", "+00:00"))
    except ValueError:
        fail(f"invalid build timestamp: {built_at!r}")

    print("[RELEASE-OPERATIONS] PASS: operational probes, protected metrics, request IDs, and release metadata hold")


if __name__ == "__main__":
    main()
