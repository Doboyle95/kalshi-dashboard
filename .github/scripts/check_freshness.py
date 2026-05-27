"""Dashboard freshness monitor — external watchdog.

Runs from GitHub Actions on a 30-min schedule. Reads
src/data/freshness_manifest.json and alerts when any tracked dashboard CSV
exceeds its freshness threshold.

Alerting:
  - GitHub Issue: opens or updates a single "Dashboard freshness alert"
    issue labeled `stale`. Closes the issue automatically when freshness
    is restored. Uses the workflow's GITHUB_TOKEN (no extra secret needed).
  - Slack (optional): if SLACK_WEBHOOK_URL secret is set, also posts to
    Slack. Suppressed if no creds.

Exit code:
  0  = all CSVs fresh (also the case if previously-stale issue exists; the
        script closes it)
  1  = one or more CSVs stale (issue opened/updated; non-zero so the
        Actions UI flags the run)
  2  = manifest unreadable (treated as critical — orchestrator may be dead)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


# Per-CSV freshness thresholds in HOURS. Mirrors cadence_v2's defaults but
# kept separate so this watchdog has zero dependency on the rebuild repo.
# Values err on the side of permissive — alerts here should signal real
# breakage, not minor cadence slowdowns.
THRESHOLDS = {
    # near-live (refresh every ~2 min via near_live_update)
    "daily_overall.csv": 6,
    "daily_sports_vs_nonsports.csv": 6,
    "daily_top_categories.csv": 6,
    "sports_market_type_daily.csv": 6,
    # settlement chain (refresh every ~4h via settlement_cycle)
    "taker_pnl_daily.csv": 12,
    "taker_sports_daily.csv": 12,
    "taker_category_daily.csv": 12,
    "taker_category_summary.csv": 12,
    "taker_notional_daily.csv": 12,
    "maker_pnl_daily.csv": 12,
    "market_leaderboard.csv": 12,
    "category_leaderboard.csv": 12,
    "trade_size_daily.csv": 12,
    "parlay_pnl_net.csv": 12,
    # competitor (refresh every ~6h)
    "competitor_daily.csv": 24,
    "polymarket_categories_daily.csv": 24,
    "polymarket_sports_split_daily.csv": 24,
    "nadex_categories_daily.csv": 24,
    "nadex_sports_split_daily.csv": 24,
    "forecastex_categories_daily.csv": 24,
    "forecastex_sports_split_daily.csv": 24,
    # weekly
    "calibration_three_way.csv": 192,    # 8 days
    "monthly_top_categories.csv": 168,
    "kalshi_oi_daily.csv": 24,
}


ISSUE_TITLE = "Dashboard freshness alert"
ISSUE_LABEL = "stale"


def load_manifest(path: str) -> dict:
    # utf-8-sig handles the BOM that the cadence's manifest writer (a PS1
    # script) leaves at the start. Plain utf-8 errors with "Unexpected BOM".
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def check_freshness(manifest: dict) -> tuple[list[dict], list[dict]]:
    """Return (stale_entries, missing_entries) lists."""
    now = datetime.now(timezone.utc)
    stale: list[dict] = []
    missing: list[dict] = []

    files = manifest.get("files", {}) or {}
    for csv_name, threshold_h in THRESHOLDS.items():
        entry = files.get(csv_name)
        if entry is None:
            missing.append({
                "name": csv_name,
                "threshold_h": threshold_h,
                "reason": "not present in manifest",
            })
            continue

        # Manifest writes both local and UTC time. Prefer UTC for math.
        mtime_str = entry.get("last_write_time_utc") or entry.get("last_write_time")
        if not mtime_str:
            missing.append({"name": csv_name, "threshold_h": threshold_h,
                           "reason": "no mtime in manifest entry"})
            continue
        try:
            # Manifest format: YYYY-MM-DDTHH:MM:SS.ffffffZ
            mtime = datetime.strptime(mtime_str, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
        except ValueError:
            # Fall back to ISO parse
            try:
                mtime = datetime.fromisoformat(mtime_str.replace("Z", "+00:00"))
            except Exception:
                missing.append({"name": csv_name, "threshold_h": threshold_h,
                               "reason": f"unparseable mtime: {mtime_str}"})
                continue

        age_h = (now - mtime).total_seconds() / 3600
        if age_h > threshold_h:
            stale.append({
                "name": csv_name,
                "age_hours": round(age_h, 1),
                "threshold_h": threshold_h,
                "mtime_utc": mtime_str,
            })
    return stale, missing


def gh_request(method: str, endpoint: str, body: dict | None = None) -> dict:
    """Minimal GitHub API client using the GH_TOKEN env var."""
    token = os.environ["GH_TOKEN"]
    repo = os.environ["GH_REPO"]
    url = f"https://api.github.com/repos/{repo}{endpoint}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def find_open_issue() -> dict | None:
    """Return the existing open freshness alert issue, if any."""
    issues = gh_request("GET", f"/issues?state=open&labels={ISSUE_LABEL}&per_page=5")
    for issue in issues:
        if issue.get("title") == ISSUE_TITLE:
            return issue
    return None


def render_body(stale: list[dict], missing: list[dict], manifest: dict) -> str:
    now = datetime.now(timezone.utc).isoformat()
    parts = [
        f"**Detected at:** {now}",
        f"**Manifest generated_at_utc:** {manifest.get('generated_at_utc', '?')}",
        "",
    ]
    if stale:
        parts.append(f"### Stale CSVs ({len(stale)})")
        for s in stale:
            parts.append(
                f"- `{s['name']}` — {s['age_hours']}h old (threshold {s['threshold_h']}h), "
                f"last write {s['mtime_utc']}"
            )
        parts.append("")
    if missing:
        parts.append(f"### Missing from manifest ({len(missing)})")
        for m in missing:
            parts.append(f"- `{m['name']}` — {m['reason']}")
        parts.append("")
    parts.append("---")
    parts.append(
        "_This issue is opened/updated automatically by the "
        "`freshness_monitor` workflow. It closes automatically when "
        "all tracked CSVs return to freshness._"
    )
    return "\n".join(parts)


def post_slack(stale: list[dict], missing: list[dict]) -> None:
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        return
    text_parts = ["*Dashboard freshness alert*"]
    if stale:
        text_parts.append(f"*Stale ({len(stale)}):*")
        text_parts.extend(
            f"  • `{s['name']}` — {s['age_hours']}h (limit {s['threshold_h']}h)"
            for s in stale
        )
    if missing:
        text_parts.append(f"*Missing from manifest ({len(missing)}):*")
        text_parts.extend(f"  • `{m['name']}` ({m['reason']})" for m in missing)
    payload = {"text": "\n".join(text_parts)}
    req = urllib.request.Request(
        webhook,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            r.read()
    except Exception as e:
        print(f"WARN: Slack post failed: {e}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="src/data/freshness_manifest.json")
    ap.add_argument("--dry-run", action="store_true",
                    help="Skip GitHub + Slack calls; print findings only.")
    args = ap.parse_args()

    try:
        manifest = load_manifest(args.manifest)
    except Exception as e:
        print(f"ERROR: could not load manifest at {args.manifest}: {e}", file=sys.stderr)
        return 2

    stale, missing = check_freshness(manifest)

    if not stale and not missing:
        print("All tracked CSVs fresh.")
        if not args.dry_run:
            existing = find_open_issue()
            if existing:
                gh_request("PATCH", f"/issues/{existing['number']}", {
                    "state": "closed",
                    "body": existing["body"] + "\n\n---\n**Resolved: all CSVs returned to freshness.**",
                })
                print(f"Closed previously-open issue #{existing['number']}.")
        return 0

    body = render_body(stale, missing, manifest)
    print("=" * 60)
    print(body)
    print("=" * 60)

    if args.dry_run:
        print(f"\n[DRY RUN] would have alerted: {len(stale)} stale, {len(missing)} missing")
        return 1

    existing = find_open_issue()
    if existing:
        gh_request("PATCH", f"/issues/{existing['number']}", {"body": body})
        print(f"Updated existing issue #{existing['number']}.")
    else:
        new = gh_request("POST", "/issues", {
            "title": ISSUE_TITLE,
            "body": body,
            "labels": [ISSUE_LABEL],
        })
        print(f"Created issue #{new['number']}.")

    post_slack(stale, missing)

    print(f"FAILED: {len(stale)} stale, {len(missing)} missing.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
