"""Dashboard freshness monitor — external watchdog.

Runs from GitHub Actions on a 30-min schedule. Reads
src/data/freshness_manifest.json and alerts when any tracked dashboard CSV
exceeds its freshness threshold.

Also relays "local pipeline alerts" (2026-06-12): the laptop-side monitors
(task_health.json from check_task_results.ps1, freshness_alert.txt from
freshness_check.ps1) have no push channel of their own — the publisher embeds
their alert lines into the manifest as `local_alerts`, and this watchdog
carries them into the same alert issue. That means the issue can be open while
every tracked CSV is fresh (e.g. a producer task is red but yesterday's CSV is
still within threshold).

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
import hashlib
import json
import os
import re
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
    "trades_by_hour.csv": 6,
    # settlement chain (refresh every ~4h via settlement_cycle)
    "taker_pnl_daily.csv": 12,
    "taker_category_daily.csv": 12,
    "taker_category_summary.csv": 12,
    "taker_notional_daily.csv": 12,
    "taker_volume_by_ticker_daily.csv": 12,
    "taker_volume_by_ticker_side_daily.csv": 12,
    "taker_pnl_by_ticker_daily.csv": 12,
    "taker_pnl_by_ticker_summary.csv": 12,
    # Once-daily (02:00 ET leaderboard_refresh), not the 4hr settlement cadence its report_ticker-
    # grain sibling above uses - 60h mirrors the same 2x-over-source-threshold margin as every
    # other pair here (30h source threshold on the KalshiData side).
    "taker_pnl_by_market_leaderboard.csv": 60,
    "maker_pnl_daily.csv": 12,
    "market_leaderboard.csv": 12,
    "category_leaderboard.csv": 12,
    "trade_size_daily.csv": 12,
    "large_trades.csv": 12,
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
    # monthly_top_categories.csv removed 2026-06-12: no dashboard page reads
    # it (grep src/*.md), it was never in the publisher's sync list, and it
    # produced a permanent "missing from manifest" alert.
    "kalshi_oi_daily.csv": 24,
    # parlay anatomy + cashout set (added 2026-06-12: these six were in the
    # manifest since 06-11 but watched by NO staleness monitor; their producer
    # froze silently for ~5 days in early June). Producers run daily (anatomy)
    # or every 30-min v3 cycle (popular_meta); 48h is the permissive bound.
    "parlay_house_edge_by_legs.csv": 48,
    "parlay_legs_over_time.csv": 48,
    "parlay_mispricing_by_correlation.csv": 48,
    "parlay_top_games_by_volume.csv": 48,
    "parlay_sportsmix_v2.csv": 48,
    "parlay_popular_meta.csv": 48,
    # 2026-07-02 coverage backfill — published files that had NO threshold here
    # (the check_coverage() gap alert below now catches this class of drift):
    "daily_top_categories_fees.csv": 36,     # daily 07:00 producer; froze at 06-26 unnoticed
    "rothera_categories_daily.csv": 24,
    "rothera_sports_split_daily.csv": 24,
    "nadex_events_daily.csv": 48,             # the 06-28 weekend-data-loss file
    "parlay_pnl_unified_daily.csv": 24,       # the parlay page's primary chart source
    "parlay_cashout_daily.csv": 48,
    "parlay_pnl_daily_by_corr_v2.csv": 48,
    "parlay_corr_by_ticker_daily.csv": 48,
    "parlay_volume_by_type_daily.csv": 48,
    "parlay_popular_daily.csv": 48,
    "taker_sports_daily.csv": 240,            # weekly v3 taker-category reconcile
    "dkex_daily.csv": 36,
    "dkex_categories_daily.csv": 36,
    "dkex_sports_split_daily.csv": 36,
    "dkex_market_daily.csv": 36,
    "dkex_settlement_daily.csv": 36,
}

# Published files deliberately NOT threshold-monitored here: CME is hand-collected
# from 24h-window bulletins (legitimately sparse/irregular — an mtime threshold would
# false-alarm), and the RH estimate files are rewritten every competitor cycle even
# when their manual FCM input hasn't advanced (mtime is meaningless; the VM-side
# keystone's STALE_TAIL content check owns their staleness).
KNOWN_UNMONITORED = {
    "cme_daily.csv", "cme_daily_distributed.csv",
    "rh_monthly_estimates.csv", "rh_weekly_estimates.csv",
}


ISSUE_TITLE = "Dashboard freshness alert"
ISSUE_LABEL = "stale"

# 2026-07-03: GitHub does not notify issue subscribers on a body PATCH, only on
# new comments/state changes. This watchdog used to only PATCH the body on every
# run, so a genuinely new alarm condition updated the issue silently. We persist
# a signature of the current alarm set as a hidden HTML comment in the issue body
# and diff against it each run; when it changes we POST a real comment (in
# addition to the body PATCH) so subscribers actually get notified.
ALARM_MARKER_RE = re.compile(r"<!--\s*alarm-signature:\s*([0-9a-f]{12})\s*-->")

# If the local alert SOURCES themselves are older than this, the local monitors
# are probably dead — which would otherwise read as "no local alerts". Both
# sources rerun at least every 4h, so 26h is permissive.
LOCAL_SOURCE_STALE_H = 26


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


def _parse_manifest_ts(value: str) -> datetime | None:
    """Parse a .NET round-trip ("o") timestamp, local-offset or Z-suffixed.

    PowerShell writes 7 fractional digits; Pythons before 3.11 only accept 6
    in fromisoformat, so fall back to trimming the fraction.
    """
    candidate = value.replace("Z", "+00:00")
    for attempt in (candidate, re.sub(r"(\.\d{6})\d+", r"\1", candidate)):
        try:
            dt = datetime.fromisoformat(attempt)
        except ValueError:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def check_local_alerts(manifest: dict) -> list[str]:
    """Return local pipeline alerts relayed through the manifest.

    sync-kalshi-output.ps1 embeds `local_alerts` (task_health.json alert lines
    + freshness_alert.txt stale lines) and `local_alerts_meta` (source
    timestamps). Also flags the sources going stale: a dead local monitor
    produces no alerts, which must not read as "all healthy".
    """
    alerts = [str(a) for a in (manifest.get("local_alerts") or []) if str(a).strip()]
    meta = manifest.get("local_alerts_meta") or {}
    now = datetime.now(timezone.utc)
    for key, label in (
        ("task_health_generated", "task_health.json (task-results watcher)"),
        ("freshness_report_mtime_utc", "freshness_alert.txt (local freshness check)"),
    ):
        ts = meta.get(key)
        if not ts:
            # A missing/null source timestamp must not read as "all healthy" — it
            # means the publisher stopped embedding the local-monitor relay (or the
            # monitor never ran), which is exactly when we'd otherwise go blind.
            alerts.append(
                f"local-monitor: no timestamp for {label} in the manifest — "
                "the local-alert relay may be broken"
            )
            continue
        parsed = _parse_manifest_ts(str(ts))
        if parsed is None:
            alerts.append(f"local-monitor: unparseable timestamp for {label}: {ts}")
            continue
        age_h = (now - parsed).total_seconds() / 3600
        if age_h > LOCAL_SOURCE_STALE_H:
            alerts.append(
                f"local-monitor: {label} is {age_h:.1f}h old "
                f"(threshold {LOCAL_SOURCE_STALE_H}h) — the local monitor itself may be down"
            )
    return alerts


def check_coverage(manifest: dict) -> list[str]:
    """Published-but-unmonitored drift alarm.

    The publish surface is defined in four places (VM copier FILES, laptop .ps1
    $files, this THRESHOLDS dict, the VM keystone CHECKS) and they have drifted
    before — daily_top_categories_fees.csv shipped for days with no watcher.
    Any file present in the manifest but absent from both THRESHOLDS and
    KNOWN_UNMONITORED gets an alert line until someone classifies it.
    """
    files = set((manifest.get("files") or {}).keys())
    gaps = sorted(files - set(THRESHOLDS) - KNOWN_UNMONITORED)
    return [
        f"`{name}` is published (present in the manifest) but has no freshness "
        "threshold in check_freshness.py — add one, or list it in KNOWN_UNMONITORED"
        for name in gaps
    ]


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


def compute_alarm_signature(stale: list[dict], missing: list[dict],
                            local_alerts: list[str]) -> str:
    """Stable fingerprint of *which* things are alarming, not their timings.

    Deliberately excludes age_hours/mtime_utc so an unchanged stale set doesn't
    re-signature (and re-comment) every 30 min just because the age ticked up —
    only a genuinely new/changed/cleared condition should trigger a comment.
    """
    names = sorted(s["name"] for s in stale)
    missing_names = sorted(m["name"] for m in missing)
    alerts = sorted(local_alerts)
    payload = json.dumps([names, missing_names, alerts], sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]


def extract_alarm_signature(body: str | None) -> str | None:
    """Pull the hidden alarm-signature marker out of a previous issue body."""
    if not body:
        return None
    m = ALARM_MARKER_RE.search(body)
    return m.group(1) if m else None


def render_body(stale: list[dict], missing: list[dict],
                local_alerts: list[str], manifest: dict, signature: str) -> str:
    now = datetime.now(timezone.utc).isoformat()
    parts = [
        f"<!-- alarm-signature: {signature} -->",
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
    if local_alerts:
        parts.append(f"### Local pipeline alerts ({len(local_alerts)})")
        parts.append(
            "_Relayed from the laptop-side monitors via the manifest. The "
            "published CSVs may still be fresh — these flag failing producer "
            "tasks / local staleness before it reaches the dashboard._"
        )
        for a in local_alerts:
            parts.append(f"- `{a}`")
        parts.append("")
    parts.append("---")
    parts.append(
        "_This issue is opened/updated automatically by the "
        "`freshness_monitor` workflow. It closes automatically when "
        "all tracked CSVs return to freshness AND the local pipeline "
        "alerts clear._"
    )
    return "\n".join(parts)


def render_change_comment(stale: list[dict], missing: list[dict],
                          local_alerts: list[str]) -> str:
    """Short notification comment posted only when the alarm set changed.

    This is what actually pings issue subscribers (see ALARM_MARKER_RE
    comment above) — the body PATCH alone is silent.
    """
    parts = ["**Alarm condition changed** — new/updated freshness issue state:", ""]
    if stale:
        parts.append(f"- Stale ({len(stale)}): " + ", ".join(f"`{s['name']}`" for s in stale))
    if missing:
        parts.append(f"- Missing ({len(missing)}): " + ", ".join(f"`{m['name']}`" for m in missing))
    if local_alerts:
        parts.append(f"- Local pipeline alerts ({len(local_alerts)}): " +
                      ", ".join(f"`{a}`" for a in local_alerts))
    if not (stale or missing or local_alerts):
        parts.append("- All clear.")
    return "\n".join(parts)


def post_slack(stale: list[dict], missing: list[dict],
               local_alerts: list[str]) -> None:
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
    if local_alerts:
        text_parts.append(f"*Local pipeline alerts ({len(local_alerts)}):*")
        text_parts.extend(f"  • `{a}`" for a in local_alerts)
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
    local_alerts = check_local_alerts(manifest)
    # Coverage-drift alarms ride the local_alerts channel: same severity class
    # (ops gap, CSVs may still be fresh) and it flows through the issue body,
    # Slack, and the open/close gate without new plumbing.
    local_alerts += check_coverage(manifest)

    # 2026-07-03: current alarm signature, compared below against whatever
    # marker (if any) is embedded in the existing open issue's body — this is
    # what decides whether a new notifying comment is needed.
    signature = compute_alarm_signature(stale, missing, local_alerts)

    if not stale and not missing and not local_alerts:
        print("All tracked CSVs fresh; no local pipeline alerts.")
        if not args.dry_run:
            existing = find_open_issue()
            if existing:
                prev_signature = extract_alarm_signature(existing.get("body"))
                gh_request("PATCH", f"/issues/{existing['number']}", {
                    "state": "closed",
                    "body": existing["body"] + "\n\n---\n**Resolved: all CSVs fresh and local alerts clear.**",
                })
                print(f"Closed previously-open issue #{existing['number']}.")
                # A close is always a real state change worth a comment (GitHub
                # does notify on state changes, but a comment gives the "why").
                if prev_signature != signature:
                    gh_request("POST", f"/issues/{existing['number']}/comments", {
                        "body": render_change_comment(stale, missing, local_alerts),
                    })
        return 0

    body = render_body(stale, missing, local_alerts, manifest, signature)
    print("=" * 60)
    print(body)
    print("=" * 60)

    if args.dry_run:
        print(f"\n[DRY RUN] would have alerted: {len(stale)} stale, "
              f"{len(missing)} missing, {len(local_alerts)} local")
        return 1

    existing = find_open_issue()
    if existing:
        prev_signature = extract_alarm_signature(existing.get("body"))
        gh_request("PATCH", f"/issues/{existing['number']}", {"body": body})
        print(f"Updated existing issue #{existing['number']}.")
        # CORE FIX: a body PATCH does not notify GitHub issue subscribers —
        # only a new comment or state change does. Without this, a genuinely
        # new/changed alarm condition (e.g. a different CSV goes stale) would
        # silently update the issue with zero notification to anyone watching.
        if prev_signature != signature:
            gh_request("POST", f"/issues/{existing['number']}/comments", {
                "body": render_change_comment(stale, missing, local_alerts),
            })
            print("Alarm signature changed — posted notifying comment.")
        else:
            print("Alarm signature unchanged — body PATCH only, no comment.")
    else:
        new = gh_request("POST", "/issues", {
            "title": ISSUE_TITLE,
            "body": body,
            "labels": [ISSUE_LABEL],
        })
        print(f"Created issue #{new['number']}.")
        # A newly-created issue already notifies subscribers/assignees via the
        # normal GitHub "issue opened" event, so no extra comment is needed here.

    post_slack(stale, missing, local_alerts)

    # Exit 0 even when stale (2026-06-12): the GitHub ISSUE is the alert
    # channel - it notifies once when a staleness episode opens and once when
    # it closes. Returning 1 here made every 30-min scheduled run send a
    # "Run failed" email for the entire episode (48 emails/day for one known
    # condition - the Jun 3-12 frozen-manifest incident sent hundreds).
    # Unexpected script crashes still exit non-zero via the normal exception
    # path, so genuine workflow breakage still surfaces as a failed run.
    print(f"ALERT: {len(stale)} stale, {len(missing)} missing, "
          f"{len(local_alerts)} local - tracked in the alert issue.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
