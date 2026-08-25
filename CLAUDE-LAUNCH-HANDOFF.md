# Predict Charts final launch handoff for Claude

**Prepared 2026-08-25. Nothing in this handoff has been pushed or deployed.**

The dashboard fixes are committed on a review branch, and the two private-producer fixes
are committed in a clean local clone. The remaining work is review plus a controlled VM
rollout/rebuild. Do not declare launch-ready until the producer checklist below is green:
the currently served generation still contains the stale market-P&L leaderboard and the
historically overlapping fee/contract buckets.

## Repositories and commits

### Dashboard

- Working copy: `C:\Users\Owner\Documents\kalshi-work\dash`
- Review branch: `fix/robinhood-fcm-linear-default`
- Current `main` / `origin/main`: `b1359d9`
- Preserve the untracked user file `LAUNCH-FOLLOWUPS.md`; it is intentionally not committed.

Commits to review and cherry-pick onto current `main`, in order:

| Commit | Change |
|---|---|
| `f540015` | Makes the Robinhood FCM comparison Linear by default, with a Linear/Log toggle. |
| `bfb2223` | Breaks `/volume`'s Observable circular definition and adds a post-build cycle detector to both deploy workflows. |

`b1359d9` (the prose cleanup already on `main`) is not in this review branch because the
two branches moved concurrently. Cherry-picking the two commits above onto current `main`
is the clean integration path.

### Private producer

- Clean review clone: `C:\Users\Owner\Documents\kalshi-work\KalshiData-launch-fixes`
- Base: `5af3389` (`master` from `/root/KalshiData`)
- Local HEAD: `9d66c08`

Commits to review and apply, in order:

| Commit | Change |
|---|---|
| `bf3db18` | Makes all four active R sports/nonsports writers exclude parlays from the nonsports bucket, and adds a cross-file publish gate for fee and contract partitions. |
| `9d66c08` | Raises market-P&L DuckDB memory from 4 GB to 8 GB with a 13 GB scheduler lease; rejects missing/unchanged output; fails the parent after publishing independent healthy boards. |

The clone shows many unrelated modified files because this Windows checkout normalizes line
endings differently from the repository. `git diff --ignore-cr-at-eol` is empty for all of
those files. The two commits above contain only their explicit target paths.

## What was fixed and why

### 1. `/volume` runtime failure

`feeWideDaily` depended on `parlayFeesFor`, while `parlayFeesFor` had been emitted in a later
cell whose dependency graph led back through `feeWideDaily`. Observable Framework built the
page successfully, but the browser reported three circular-definition errors and blanked the
sports/category fee section.

`bfb2223` moves the helper into the upstream data cell. It also adds
`scripts/check-observable-cycles.mjs`, which parses all emitted page cell definitions after a
build and rejects any strongly connected component. Both normal deployment and autopilot
repair validation now run this check.

### 2. Fee/contract component arithmetic

The exact producer bug was not a dashboard join or rounding issue. Four active R writers used
`is_sports == "FALSE"` for nonsports but used `!is_parlay` only for the sports bucket. A parlay
classified as nonsports was therefore counted in both nonsports and parlay.

`bf3db18` fixes:

- `R/near_live_update.R`
- `R/repair_daily_timeseries_window.R`
- `R/rebuild_daily_timeseries.R`
- `R/apply_maker_fee_corrections.R`

The publish gate now joins `daily_overall.csv` to `daily_sports_vs_nonsports.csv` by date and
blocks on missing/duplicate dates, missing/non-finite/negative values, fee components above
`fees_total` (with two cents of rounding slack), or the three contract buckets above
`contracts_total`.

Measured against served generation `f6cba110a5dceda94992`:

- 1,881 dates, 2021-06-30 through 2026-08-24;
- 381 dates have fee overshoot, totaling $8,465,022.74;
- 34 dates have contract overshoot;
- 405 distinct dates violate at least one partition invariant.

This new gate is expected to block the current data. That is deliberate; apply the code and
run the complete historical repair before the next data publish.

### 3. Market-P&L leaderboard OOM and false success

The served generation still carries
`taker_pnl_by_market_leaderboard.csv` with source mtime from 2026-08-23 07:19 ET while the
generation itself continues advancing. The exporter was imposing `memory_limit=4GB` on a
62 GB VM, and the parent flow treated child failure as non-fatal.

`9d66c08` changes the DuckDB default to 8 GB and its scheduler lease from 9 GB to 13 GB. A
zero child exit is no longer sufficient: the dashboard-facing output must be newly created
or atomically replaced. The flow still publishes the independent market/category boards,
then raises if market P&L failed, so Prefect cannot show a false-green parent run.

## Validation already completed

Dashboard validation on `bfb2223`:

- 22 Node tests passed.
- 7 Python freshness tests passed.
- Module-global check passed for all 16 component modules.
- Prose check: 0 flipped claims.
- Observable build: 55 pages and 1,436 links validated.
- Cycle detector: 55 built pages, no cycles.
- Full local browser sweep: all 55 routes reached zero loading cells with no
  `.observablehq--error` nodes.
- Real in-app browser on local `/volume.html`: 16 SVGs, no loading cells, zero runtime
  errors; after selecting **Sports only → Fees**, 21 SVGs, Golf present, zero errors.
- `/robinhood.html` rendered 18 SVGs with Linear selected and zero runtime errors.

Producer validation:

- 4 fee/partition tests and 4 leaderboard-completion tests passed locally.
- The same eight focused tests passed in an isolated copy on the VM.
- All four changed R scripts parsed successfully with the VM's `/usr/bin/Rscript`.
- The existing market-P&L streaming test passed under `/root/kalshi-venv`; its log confirmed
  `memory_limit=8GB threads=2` and both CSVs were written.
- Changed Python files compile cleanly and the Prefect task/flow import successfully in the
  VM environment.

The production-sized exporter and full historical repair have intentionally not been run
before review.

## Important VM state

`/root/KalshiData` is a heavily dirty working tree. Of the files changed by these two commits,
only `R/near_live_update.R` is already modified on the VM. Its existing uncommitted hunk is a
separate, plausible `fcoalesce` repair around lines 424-435; the new nonsports/parlay fix is
around lines 450-454, so the hunks do not overlap. Preserve and review that VM change. Do not
replace the file wholesale and do not use `git reset --hard` or a blanket stash.

The isolated validation copy at `/tmp/predict-launch-validate-20260825` is disposable and
contains no production outputs.

## Recommended review and rollout

### A. Dashboard integration

```bash
cd C:/Users/Owner/Documents/kalshi-work/dash
git switch main
git pull --ff-only
git cherry-pick f540015 bfb2223
```

Then repeat the dashboard test/build commands above. Do not stage `LAUNCH-FOLLOWUPS.md`.

### B. Make the producer commits visible to the VM

From the clean clone, after review, push a temporary review branch rather than `master`:

```bash
cd C:/Users/Owner/Documents/kalshi-work/KalshiData-launch-fixes
git show --stat bf3db18
git show --stat 9d66c08
git push origin HEAD:refs/heads/codex-launch-fixes
```

On the VM, first reconcile/commit the pre-existing `R/near_live_update.R` fcoalesce change
with an explicit pathspec. Then cherry-pick the two reviewed commits. Re-check `git status`
before every commit because many unrelated VM changes must remain untouched.

### C. Repair history before allowing a publish

From `/root/KalshiData`, run the corrected full-window repair on the VM (update `--end` if a
new ET date has appeared):

```bash
KALSHI_DATA_ROOT=/root/KalshiData Rscript R/repair_daily_timeseries_window.R \
  --start=2021-06-30 --end=2026-08-24
```

Then call `check_daily_component_partition(Path("output"))` from
`cadence_v2.helpers.publish_gate`; it must return `pass` across every date. Do not weaken the
gate and do not remove the dashboard's residual clamps yet.

### D. Run the production market-P&L task

Use the task wrapper so the 13 GB scheduler lease and output-refresh check are exercised:

```bash
cd /root/KalshiData
KALSHI_DATA_ROOT=/root/KalshiData /root/kalshi-venv/bin/python -c \
  'from cadence_v2.tasks.leaderboard_tasks import lb_build_market_pnl; print(lb_build_market_pnl.fn())'
```

Require `ok: true`, a new mtime/size for
`output/taker_pnl_by_market_leaderboard.csv`, and no OOM. Then run the normal dashboard sync
to create a new immutable generation.

### E. Final launch verification and push

Before pushing dashboard `main`:

1. Confirm the new generation passes the component partition gate for all dates.
2. Confirm `taker_pnl_by_market_leaderboard.csv` has the new source mtime/hash.
3. Open `/fees`, `/volume` (including Sports only → Fees), `/categories`, and `/taker-pnl` in
   a real browser; require remote-data markers, rendered charts, and zero
   `.observablehq--error` nodes.
4. Push dashboard `main` without force.
5. Wait for GitHub Pages and the VM build; require both hosts' `x-site-build` stamp to equal
   the pushed SHA.
6. Re-run the page checks on `https://predict-charts.com`.

If all six pass, no unresolved code-level launch blocker remains from this scan.
