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
  "sports_market_type_daily.csv",
  "calibration_three_way.csv",
  "category_leaderboard.csv",
  "market_leaderboard.csv",
  "competitor_daily.csv",
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
  "trade_size_daily.csv"
)

$resolvedSource = Resolve-Path -LiteralPath $SourceDir
$resolvedTarget = Resolve-Path -LiteralPath $TargetDir

Write-Host "Syncing dashboard CSVs"
Write-Host "  From: $resolvedSource"
Write-Host "  To:   $resolvedTarget"

$copied = 0
$skippedOlder = 0
$missing = @()

foreach ($file in $files) {
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
  Write-Warning ("Missing from source output: " + ($missing -join ", "))
}

$manifestFiles = @{}
foreach ($file in $files) {
  $src = Join-Path $resolvedSource $file
  $dst = Join-Path $resolvedTarget $file
  $item = if (Test-Path -LiteralPath $src) {
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

$manifest = [pscustomobject]@{
  generated_at      = (Get-Date).ToString("o")
  generated_at_utc  = (Get-Date).ToUniversalTime().ToString("o")
  source_dir        = $resolvedSource.Path
  files             = $manifestFiles
}

$manifestPath = Join-Path $resolvedTarget "freshness_manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Host ("  wrote   freshness_manifest.json ({0:n0} files)" -f $manifestFiles.Count)

Write-Host "Done: $copied copied, $skippedOlder skipped."
