from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / ".github" / "scripts" / "check_freshness.py"
SPEC = importlib.util.spec_from_file_location("check_freshness", SCRIPT)
check_freshness = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(check_freshness)


class FakeResponse(io.BytesIO):
    def __init__(self, url: str, payload: bytes):
        super().__init__(payload)
        self._url = url
        self.headers = {"Content-Length": str(len(payload))}

    def geturl(self) -> str:
        return self._url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class FakeOpener:
    def __init__(self, responses: dict[str, bytes]):
        self.responses = responses
        self.requests: list[str] = []

    def open(self, request, timeout: int):
        del timeout
        url = request.full_url
        self.requests.append(url)
        return FakeResponse(url, self.responses[url])


class RemoteFreshnessTests(unittest.TestCase):
    def fixture(self):
        origin = "https://data.example.com"
        generation = "0123456789abcdefabcd"
        freshness = json.dumps({"files": {}}, separators=(",", ":")).encode()
        current = {
            "schema_version": 1,
            "generation": generation,
            "file_count": 1,
            "files": {
                "freshness_manifest.json": {
                    "size_bytes": len(freshness),
                    "sha256": hashlib.sha256(freshness).hexdigest(),
                }
            },
        }
        current_url = f"{origin}/dashboard-data/current.json"
        freshness_url = (
            f"{origin}/dashboard-data/generations/{generation}/freshness_manifest.json"
        )
        responses = {
            current_url: json.dumps(current).encode(),
            freshness_url: freshness,
        }
        return origin, current, responses, freshness_url

    def test_fetches_verified_immutable_manifest(self):
        origin, _current, responses, freshness_url = self.fixture()
        opener = FakeOpener(responses)
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "endpoint.json"
            config.write_text(json.dumps({"api": origin}), encoding="utf-8")
            manifest = check_freshness.fetch_remote_manifest(str(config), opener)
        self.assertEqual(manifest, {"files": {}})
        self.assertEqual(opener.requests[-1], freshness_url)

    def test_rejects_unsafe_endpoint_before_fetch(self):
        _origin, current, _responses, _freshness_url = self.fixture()
        for endpoint in (
            "http://data.example.com",
            "https://user@data.example.com",
            "https://data.example.com:8443",
            "https://data.example.com/unexpected",
        ):
            with self.subTest(endpoint=endpoint):
                with self.assertRaisesRegex(ValueError, "unsafe"):
                    check_freshness._transport_location({"api": endpoint}, current)

    def test_rejects_manifest_hash_mismatch(self):
        origin, current, responses, _freshness_url = self.fixture()
        current["files"]["freshness_manifest.json"]["sha256"] = "0" * 64
        responses[f"{origin}/dashboard-data/current.json"] = json.dumps(current).encode()
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "endpoint.json"
            config.write_text(json.dumps({"api": origin}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                check_freshness.fetch_remote_manifest(str(config), FakeOpener(responses))

    def test_rejects_malformed_generation(self):
        origin, current, _responses, _freshness_url = self.fixture()
        current["generation"] = "../current"
        with self.assertRaisesRegex(ValueError, "generation manifest is invalid"):
            check_freshness._transport_location({"api": origin}, current)

    def test_acknowledged_freshness_lines_are_not_promoted(self):
        now = datetime.now(timezone.utc).isoformat()
        manifest = {
            "local_alerts": [
                "freshness_check: KNOWN    manual input backlog",
                "freshness_check: GAP_KNOWN old missing day",
                "freshness_check: STALE genuinely stale producer",
                "task_health: prod-example FAILED",
            ],
            "local_alerts_meta": {
                "task_health_generated": now,
                "freshness_report_mtime_utc": now,
            },
        }
        self.assertEqual(
            check_freshness.check_local_alerts(manifest),
            [
                "freshness_check: STALE genuinely stale producer",
                "task_health: prod-example FAILED",
            ],
        )


if __name__ == "__main__":
    unittest.main()
