param(
  [string]$SourceDir = "C:\Users\doboy\OneDrive\Documents\KalshiData\output",
  [string]$TargetDir = "$PSScriptRoot\..\src\data",
  [switch]$ForceAll
)

$ErrorActionPreference = "Stop"

$files = @(
  "daily_overall.csv",
  "daily_sports_vs_nonsports.csv",
  "daily_top_categories.csv",
  "daily_top_categories_fees.csv",
  "trades_by_hour.csv",
  "sports_market_type_daily.csv",
  "calibration_three_way.csv",
  "category_leaderboard.csv",
  "market_leaderboard.csv",
  "competitor_daily.csv",
  "dkex_daily.csv",
  "dkex_categories_daily.csv",
  "dkex_sports_split_daily.csv",
  "dkex_market_daily.csv",
  "dkex_settlement_daily.csv",
  "underdog_daily.csv",
  "underdog_categories_daily.csv",
  "underdog_sports_split_daily.csv",
  "underdog_market_daily.csv",
  "forecastex_categories_daily.csv",
  "forecastex_sports_split_daily.csv",
  "nadex_categories_daily.csv",
  "nadex_sports_split_daily.csv",
  "parlay_pnl_net.csv",
  "polymarket_categories_daily.csv",
  "polymarket_sports_split_daily.csv",
  "taker_pnl_daily.csv",
  "maker_pnl_daily.csv",
  "taker_notional_daily.csv",
  "taker_category_summary.csv",
  "taker_category_daily.csv",
  "taker_sports_daily.csv",
  "taker_volume_by_ticker_daily.csv",
  "taker_volume_by_ticker_side_daily.csv",
  "taker_pnl_by_ticker_daily.csv",
  "taker_pnl_by_ticker_summary.csv",
  # taker_pnl_by_market_leaderboard.csv only - the sibling _daily.csv is an ~850MB backend-only
  # bookkeeping file (millions of market_key rows), never meant to reach this repo.
  "taker_pnl_by_market_leaderboard.csv",
  "trade_size_daily.csv",
  # 2026-06-11 full review: these 18 are referenced by dashboard pages but were
  # absent from this list, so the freshness manifest never tracked them (their
  # fileUpdatedAt badges were blind) and a manual `npm run data:sync` published
  # a partial set. The canonical cadence copier already moved them; this list
  # now matches the full reader-facing surface.
  "cme_daily.csv",
  "cme_daily_distributed.csv",
  "kalshi_oi_daily.csv",
  "nadex_events_daily.csv",
  "parlay_cashout_daily.csv",
  "parlay_corr_by_ticker_daily.csv",
  "parlay_house_edge_by_legs.csv",
  "parlay_legs_over_time.csv",
  "parlay_mispricing_by_correlation.csv",
  "parlay_pnl_daily_by_corr_v2.csv",
  "parlay_pnl_unified_daily.csv",
  "parlay_popular_daily.csv",
  "parlay_popular_meta.csv",
  "parlay_sportsmix_v2.csv",
  "parlay_top_games_by_volume.csv",
  "parlay_volume_by_type_daily.csv",
  "rh_monthly_estimates.csv",
  "rh_weekly_estimates.csv"
)

$resolvedSource = Resolve-Path -LiteralPath $SourceDir
$resolvedTarget = Resolve-Path -LiteralPath $TargetDir

# Parlay-popular pair-integrity gate (Layer B, Gate #1 - the canonical chokepoint that all
# 'npm run data:sync' callers funnel through). export_popular_parlays.py writes the meta+daily
# pair (joined by an integer pid) as two separate files plus parlay_popular.manifest.json LAST
# (md5 of each CSV) as a commit point. Publish the pair only when BOTH source md5s match the
# manifest; on mismatch skip BOTH (keep the prior published pair) regardless of -ForceAll, and
# report the DESTINATION mtime for their freshness entry so the badge never advances on a torn
# pair. Fail-OPEN if the manifest is missing/unreadable (Layer A's stable pid backstops any
# residual tear). $ErrorActionPreference is 'Stop', so wrap the read+hash in try/catch.
$popPair = @("parlay_popular_daily.csv", "parlay_popular_meta.csv")
$popPairOk = $true
try {
  $popManifestPath = Join-Path $resolvedSource "parlay_popular.manifest.json"
  if (Test-Path -LiteralPath $popManifestPath) {
    $popManifest = Get-Content -LiteralPath $popManifestPath -Raw | ConvertFrom-Json
    foreach ($pf in $popPair) {
      $pfSrc = Join-Path $resolvedSource $pf
      $expectedMd5 = $popManifest.files.$pf.md5
      if ((-not (Test-Path -LiteralPath $pfSrc)) -or (-not $expectedMd5)) { $popPairOk = $false; break }
      $actualMd5 = (Get-FileHash -LiteralPath $pfSrc -Algorithm MD5).Hash.ToLower()
      if ($actualMd5 -ne ([string]$expectedMd5).ToLower()) { $popPairOk = $false; break }
    }
  }
} catch {
  $popPairOk = $true   # unreadable/malformed manifest -> fail-open
  Write-Host "  parlay_popular manifest unreadable - fail-open ($($_.Exception.Message))"
}
if (-not $popPairOk) {
  Write-Host "  parlay_popular pair FAILED manifest md5 check - skipping the pair (keeping prior published pair)"
}

Write-Host "Syncing dashboard CSVs"
Write-Host "  From: $resolvedSource"
Write-Host "  To:   $resolvedTarget"

$copied = 0
$skippedOlder = 0
$missing = @()

foreach ($file in $files) {
  if ((-not $popPairOk) -and ($popPair -contains $file)) {
    Write-Host ("  skipped {0} (parlay_popular pair failed manifest check)" -f $file)
    continue
  }
  $src = Join-Path $resolvedSource $file
  $dst = Join-Path $resolvedTarget $file

  if (-not (Test-Path -LiteralPath $src)) {
    $missing += $file
    continue
  }

  $srcItem = Get-Item -LiteralPath $src
  $dstItem = if (Test-Path -LiteralPath $dst) { Get-Item -LiteralPath $dst } else { $null }

  if ($ForceAll -or $null -eq $dstItem -or $srcItem.LastWriteTime -gt $dstItem.LastWriteTime) {
    Copy-Item -LiteralPath $src -Destination $dst -Force
    $copied += 1
    Write-Host ("  copied  {0} ({1:n0} bytes, {2})" -f $file, $srcItem.Length, $srcItem.LastWriteTime)
  } else {
    $skippedOlder += 1
    Write-Host ("  skipped {0} (dashboard copy is same age or newer)" -f $file)
  }
}

if ($missing.Count -gt 0) {
  # 2026-06-11 full review: this used to be a Write-Warning, and the manifest
  # below FELL BACK to the stale dashboard copy's mtime for missing sources —
  # a silently-incomplete publish set that still looked fresh. All files in
  # $files are required dashboard inputs; fail the sync so the caller's step
  # gate throws (task RED) and no partial set publishes.
  Write-Error ("FATAL: missing from source output: " + ($missing -join ", "))
  exit 1
}

$manifestFiles = @{}
foreach ($file in $files) {
  $src = Join-Path $resolvedSource $file
  $dst = Join-Path $resolvedTarget $file
  # A parlay_popular file we skipped (failed manifest check): report the DESTINATION (prior
  # published) file so the freshness badge reflects the live pair, not the torn source.
  $preferDst = ((-not $popPairOk) -and ($popPair -contains $file))
  $item = if ($preferDst -and (Test-Path -LiteralPath $dst)) {
    Get-Item -LiteralPath $dst
  } elseif (Test-Path -LiteralPath $src) {
    Get-Item -LiteralPath $src
  } elseif (Test-Path -LiteralPath $dst) {
    Get-Item -LiteralPath $dst
  } else {
    $null
  }

  if ($null -ne $item) {
    $manifestFiles[$file] = [pscustomobject]@{
      last_write_time       = $item.LastWriteTime.ToString("o")
      last_write_time_utc   = $item.LastWriteTimeUtc.ToString("o")
      size_bytes            = $item.Length
    }
  }
}

# --- Local pipeline alerts (2026-06-12) -------------------------------------
# The laptop-side monitors write output/task_health.json (check_task_results.ps1,
# every 4h) and output/freshness_alert.txt (freshness_check.ps1, hourly), but
# nothing READS them - the GitHub freshness-monitor issue is the only push
# channel that reaches a human. Embed a compact local_alerts block into the
# manifest (which the publisher already stages + pushes every iteration) so
# .github/scripts/check_freshness.py can include them in the alert issue.
# Best-effort BY DESIGN: this script gates the publish step (exit 1 fails the
# cycle), so a malformed/missing alert source must never throw - it becomes an
# alert line itself instead.
$localAlerts = @()
$localAlertsMeta = [ordered]@{
  task_health_generated      = $null
  freshness_report_mtime_utc = $null
}
try {
  $thPath = Join-Path $resolvedSource "task_health.json"
  if (Test-Path -LiteralPath $thPath) {
    $th = Get-Content -LiteralPath $thPath -Raw | ConvertFrom-Json
    $localAlertsMeta["task_health_generated"] = "$($th.generated)"
    foreach ($a in @($th.alerts)) {
      if ($a) { $localAlerts += "task_health: $a" }
    }
  }
} catch {
  $localAlerts += "task_health: UNREADABLE - $($_.Exception.Message)"
}
try {
  $faPath = Join-Path $resolvedSource "freshness_alert.txt"
  if (Test-Path -LiteralPath $faPath) {
    $localAlertsMeta["freshness_report_mtime_utc"] = (Get-Item -LiteralPath $faPath).LastWriteTimeUtc.ToString("o")
    # Alert lines start at column 0 with an ALL-CAPS tag (STALE, MISSING,
    # BAD_CONTENT, SEAL_BLOCKED, SHARD_PILEUP, PARLAY_BACKLOG, GATE_HEADROOM,
    # STALE_CONTEXT, REGRESSION, ...). Indented detail lines, "ok" lines and
    # section headers do not match. -cmatch is REQUIRED (PS -match is
    # case-insensitive and would also pick up the "ok" lines). TASK_ALERTS is
    # excluded: it only points at task_health.json, whose alerts are embedded
    # verbatim above.
    $alertLines = Get-Content -LiteralPath $faPath -ErrorAction Stop |
      Where-Object { $_ -cmatch '^[A-Z][A-Z_]{2,}\s' -and $_ -cnotmatch '^TASK_ALERTS' }
    foreach ($l in $alertLines) { $localAlerts += "freshness_check: $($l.Trim())" }
  }
} catch {
  $localAlerts += "freshness_check: UNREADABLE - $($_.Exception.Message)"
}
# Cap so a pathological report can't bloat the (public, every-iteration) manifest.
$maxLocalAlerts = 40
if ($localAlerts.Count -gt $maxLocalAlerts) {
  $overflow = $localAlerts.Count - $maxLocalAlerts
  $localAlerts = @($localAlerts | Select-Object -First $maxLocalAlerts) + @("(+$overflow more local alerts truncated)")
}
Write-Host ("  local_alerts: {0} entries embedded in manifest" -f $localAlerts.Count)

$manifest = [pscustomobject]@{
  generated_at      = (Get-Date).ToString("o")
  generated_at_utc  = (Get-Date).ToUniversalTime().ToString("o")
  source_dir        = $resolvedSource.Path
  local_alerts      = @($localAlerts)
  local_alerts_meta = [pscustomobject]$localAlertsMeta
  files             = $manifestFiles
}

$manifestPath = Join-Path $resolvedTarget "freshness_manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Host ("  wrote   freshness_manifest.json ({0:n0} files)" -f $manifestFiles.Count)

Write-Host "Done: $copied copied, $skippedOlder skipped."
