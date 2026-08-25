# Predict Charts launch-fix handoff for Claude

Prepared 2026-08-24 23:13 ET. The dashboard repo is
`C:\Users\Owner\Documents\kalshi-work\dash` on `main`.

## What Claude should do

1. Review every dashboard commit in `origin/main..HEAD`, paying particular attention to
   calculation bases, Observable dependency resolution, and the data-transfer semaphore.
2. Run the verification commands below and repeat the browser smoke checks.
3. Complete or explicitly disposition the two private-VM producer items under
   **VM work still required**. Do not describe the full launch review as closed while the
   leaderboard job is still reporting success after its child OOMs.
4. If review is clean, push dashboard `main` to `origin/main`. Do not stage the user's
   untracked `LAUNCH-FOLLOWUPS.md` unless Daniel explicitly asks for it to be committed.
5. Verify both deployments and their build stamps after the push:
   `https://predict-charts.com/` and
   `https://doboyle95.github.io/kalshi-dashboard/`.

## Repository state

- Baseline at handoff start: `origin/main` = `5028ee0` (`Don't publish a "vs prior 7" for a venue that doesn't report weekly`).
- Dashboard implementation tip before this handoff document: `c1cd320`.
- `LAUNCH-FOLLOWUPS.md` is intentionally untracked and untouched; it is Claude's source
  review, not part of the dashboard artifact.
- The baseline already contains the earlier launch-gate work, including `12fd4c5`,
  `c9441c6`, `d75bd2f`, and `5028ee0`. In particular, follow-ups 1.1 (reported category
  fees on `/volume`) and 1.2 (brush-aware taker category leaderboard) are already on
  `origin/main`, which is why they do not appear in the local-only list below.

Use these commands before review:

```bash
git status --short
git log --reverse --oneline origin/main..HEAD
git diff --check origin/main..HEAD
git diff --stat origin/main..HEAD
```

## Local commits to review

| Commit | Follow-up | Result |
|---|---|---|
| `e7f3dde` | 1.3 | Labels ForecastEx category history as 2025 onward rather than all-time. |
| `5c00257` | 1.4 | Replaces the misleading generic sports residual with venue-specific parlay/non-parlay labels for Underdog and Nadex. |
| `778aec4` | 1.5 | Plots cash-out edge on the documented net basis. |
| `96fabf0` | 1.6 | Keeps Polymarket parlay resolution claims on the clearing-date report basis instead of mixing report and tape dates. |
| `b89091c` | 2.1, 3.4g | Derives the served P&L pricing-basis claim from the table rows, removes the stale 347-row literal, and removes the invalid cross-date-basis validation claim. Current served data renders all 4 venues exact. |
| `b32a219` | 2.2 | Describes the actual cash-out filter: 20 or more earlier buys spread across at least 6 hours. |
| `5ccfe7d` | 2.3 | Derives Underdog coverage from `underdog_daily.csv`, removes the rotating Rothera day literal, and correctly says Underdog is top-1,000 rather than all markets. |
| `9986788` | 2.4 | Makes the trade inspector acknowledge Novig's published aggressor flag, including its Ask Data prompt. |
| `c20e7aa` | 2.5 | Points `/parlay` Ask Data at the two files the page actually loads, avoiding the double-counting `TOTAL` row in the obsolete file. |
| `df17b4d` | 3.1 | Standardizes negative currency as `−$...`, fixes USD axes, and removes the Nadex double negative. |
| `52ff94f` | 3.2 | Adds `novig_category_daily.csv` to both cross-venue product-mix charts and maps Novig's `Parlay` bucket correctly. The copy now describes traded mix, not products merely offered. |
| `d0f6738` | 3.3 | Adds `src/favicon.svg` and a per-page icon link. Framework content-hashes it into `dist/_file/`; local HTTP returned 200 `image/svg+xml`. |
| `ec885bf` | 3.4a/b/d/e/f/h | Renames the Venues title; uses reported daily category fees for narrowed brushes; expands the Novig same-game domain from the data; removes ProphetX's unused bulletin fetch and DKeX's dead chart; and stops claiming fee bands exactly equal the headline. Item 3.4c did not reproduce and required no code change. |
| `c1cd320` | 4.3 | Adds a module-level four-slot semaphore around data-file transfers only. The manifest retains its unbounded fast path. A queued file's timeout begins after slot acquisition and stays active through body consumption. Adds regression tests for both properties. |

## Important review notes

### Remote-data semaphore

Review `src/components/remote-data.js` and `tests/remote-data.test.mjs` together.
The intended invariants are:

- no more than four data response bodies transfer concurrently per browser module;
- the manifest request never waits for a data slot;
- queue wait time is excluded from each file's abort budget;
- the slot is held through `arrayBuffer()`, not merely until response headers arrive;
- errors still propagate to the page marker and no stale repository fallback is introduced.

### Category fees

`src/categories.md` now references `topDailyFees` from cells that appear earlier in the
Markdown source than the attachment-loading cell. Observable resolves cells as a dependency
graph rather than executing them top-to-bottom; the full build and real browser load both
passed. Confirm this remains true in the emitted page rather than moving back to an all-time
fee-rate proxy.

### Fee producer disclosure

The dashboard clamps the inferred parlay fee residual at zero on three pages. Those clamps
remain deliberately. `src/fees.md` now tells readers the bands are an attribution view rather
than promising an exact decomposition; this is mitigation, not a repair of the private
producer arithmetic described below.

## Verification already completed

Run from the dashboard repo with the appropriate Node/Python executables:

```bash
node --test tests/daily-briefing-rules.test.mjs tests/remote-data.test.mjs tests/venue-data.test.mjs
python3 -m unittest tests.test_freshness_remote
node scripts/check-module-globals.mjs
node node_modules/@observablehq/framework/dist/bin/observable.js build
```

Observed results:

- 22 Node tests passed.
- 7 Python tests passed.
- Module-global check passed for all 16 component modules.
- Observable build passed: 55 pages, 1,436 links validated.
- A real in-app browser loaded `/categories.html` from a local `dist/` server against
  remote generation `caa0d8094e25a1ff446d`: remote data marker, 71 SVGs, zero
  `.observablehq--error` nodes.
- `/categories-venues.html`: Novig rendered, remote marker, zero runtime errors.
- `/compare-accuracy.html`: rendered “All 4 venues ... priced exactly” from live rows,
  zero runtime errors.
- `/parlay.html`: rendered `−$509.6M` and `−$452.1M`, zero runtime errors.
- Built favicon returned HTTP 200 with `image/svg+xml`.

## VM work still required

These changes live in the private `/root/KalshiData` checkout on the Contabo VM and cannot
be made from this workspace.

### 1. Fix `leaderboard_refresh` OOM and false success

The live `taker_pnl_by_market_leaderboard.csv` remained 39.9 hours old when checked at
2026-08-24 23:11 ET (`last_write_time` 2026-08-23 07:19:16 ET), while the current
generation itself was published at 23:07 ET. This reproduces the handoff finding; it is not
historical noise.

Required producer changes:

- find the child launched by `leaderboard_refresh` with `memory_limit=4GB threads=2` and
  raise/remove the self-imposed 4 GB cap to a value appropriate for the 62 GB VM;
- propagate a non-zero child exit/OOM to the parent task so the run cannot report
  `COMPLETED` after producing nothing;
- run the task manually and confirm it writes a fresh
  `taker_pnl_by_market_leaderboard.csv`;
- confirm the publish step creates a new immutable dashboard generation containing that
  fresh file and that `/taker-pnl` loads it;
- add a regression/health check for parent success with missing or unchanged child output.

### 2. Fix fee-component arithmetic

The private producer emits
`fees_sports_nonparlay + fees_nonsports > fees_total` on 383 of 1,881 measured days, with
an aggregate overshoot of about 0.46%. Investigate the component definitions/joins and make
them mutually exclusive on the same trade-date and fee-revenue basis as `fees_total`.

Do not remove the dashboard's `Math.max(0, ...)` residual clamps until regenerated data proves
the invariant over the complete history. After rebuilding, explicitly assert for every day:

```text
0 <= fees_sports_nonparlay
0 <= fees_nonsports
fees_sports_nonparlay + fees_nonsports <= fees_total
```

Then publish a new generation and verify `/fees`, `/volume`, and `/categories` in a browser.

## Push and deployment checklist

After dashboard and VM review is clean:

```bash
git status --short
git diff --check origin/main..HEAD
git push origin main
```

Do not use a force push. After push:

1. Wait for GitHub Pages and the VM timer build.
2. Compare each host's `<meta name="x-site-build">` with the pushed SHA.
3. Confirm the favicon returns 200 on both hosts.
4. Open `/categories`, `/categories-venues`, `/compare-accuracy`, `/parlay`, `/taker-pnl`,
   and `/market-explorer` on `predict-charts.com`; require remote data markers and no
   `.observablehq--error` nodes.
5. Confirm `taker_pnl_by_market_leaderboard.csv` is fresh in the served generation.
6. Confirm the fee producer invariant above before removing or weakening the dashboard's
   disclosure.
