---
title: Robinhood on Kalshi
---

<div class="page-hero" data-accent="robinhood">
  <div class="page-eyebrow">Robinhood</div>
  <h1>Robinhood on Kalshi</h1>
  <p class="page-lead">Robinhood distributes event contracts through Kalshi and, since June 2026, through its own exchange Rothera. This page estimates how much goes to Kalshi.</p>
</div>

<details class="surface-card compact-details">
  <summary>Methodology</summary>
  <p>Robinhood Derivatives files a daily report with the CFTC. Line <em>[8530]</em> gives the market value of its customers' open positions. We take that as a share of Kalshi's total open interest, then multiply by a coefficient — currently <strong>5.2455</strong> — that converts a share of positions held into a share of volume traded.</p>
  <p><strong>Rothera is subtracted first.</strong> It clears through the same firm, so from June 2026 its open positions sit inside the same filing. Left in, June 2026 estimates 66% high.</p>
  <p><strong>Accuracy.</strong> The coefficient is calibrated against the ten months where Robinhood published an actual figure. Mean error across those months is <strong>4.2%</strong>.</p>
  <p>Robinhood does not file at weekends. Weekend volume is already reflected in the open-interest level either side of it.</p>
</details>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const monthly = await DataAttachment("data/rh_monthly_estimates.csv").csv({typed: true});
const weekly  = await DataAttachment("data/rh_weekly_estimates.csv").csv({typed: true});
const reported = await DataAttachment("data/rh_actual_vs_estimate.csv").csv({typed: true});
import {renderDateBrush} from "./components/date-brush.js";
import {freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
const fmtB    = n => (n ?? 0).toFixed(2) + "B";
const fmtPct  = n => (n ?? 0).toFixed(1) + "%";
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", year: "numeric", timeZone: "UTC"}) ?? "";
// Weeks need the day — "Week of Apr 2026" is ambiguous across 4-5 weeks.
const fmtWeek = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";

// `month` is "2025-04" in the file, but the transport's autoType has ALREADY turned it
// into a Date -- remote-data.js's ISO_DATE matches a bare year-month. So `d.month + "-01"`
// did not append a day to a string; it stringified a Date to its LOCAL form and appended
// "-01", which V8 then read as a UTC offset. Measured: "2025-04" came back as
// 2025-03-31T21:00Z for an Eastern viewer, so every bar was labelled one month early.
// Rebuild the UTC month start from the parts, and still accept a plain string in case
// the transport's typing ever changes. Applies to BOTH monthly files.
const monthStart = (v) => v instanceof Date
  ? new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1))
  : new Date(String(v) + "-01T00:00:00Z");

const monthlyParsed = monthly.map(d => ({...d, month_date: monthStart(d.month)}));
const reportedParsed = reported
  .map(d => ({...d, month_date: monthStart(d.month), is_actual: String(d.basis) === "actual"}))
  .filter(d => d.rh_kalshi_billions > 0);

// `complete` is written FALSE for the week still in progress. Its share is sound (both
// sides are partial) but its volume is not a weekly total, so it is kept out of the
// volume view and left in the share view rather than dropped from the file.
const isComplete = d => d.complete === true || String(d.complete).toUpperCase() === "TRUE";
const weeklyComplete = weekly.filter(isComplete);
```

```js
const rhMonthlyLatest = latestDate(monthlyParsed, d => d.month_date);
const rhWeeklyLatest  = latestDate(weekly, d => d.week_start);
const rhStaleDays = rhWeeklyLatest ? Math.floor((Date.now() - +rhWeeklyLatest) / 86400000) : null;

// 2026-08-07: this page had NO freshness panel. It matters more here than anywhere else,
// because both feeds are REWRITTEN on every sync whether or not their CONTENT advances --
// between April and August 2026 the timestamps looked current over 108-day-old data. So
// this is driven by latestDate() over the DATA, deliberately passing NO updatedAt.
// The upstream cause was fixed 2026-08-21 (the CFTC filings are harvested again), but the
// signal stays data-driven: the input is still a periodic fetch that can stall silently.
display(freshnessPanel({
  title: rhStaleDays != null && rhStaleDays > 21
    ? `Data freshness — these estimates stopped updating ${rhStaleDays} days ago`
    : "Data freshness",
  items: [
    {label: "Weekly estimates", date: rhWeeklyLatest,
     meta: "Latest week present in the data", tone: "settlement"},
    {label: "Monthly estimates", date: rhMonthlyLatest,
     meta: "Latest month present in the data", tone: "settlement"}
  ],
  note: rhStaleDays != null && rhStaleDays > 21
    ? `Every figure on this page is as of ${fmtWeek(rhWeeklyLatest)} and will not move until the `
      + `CFTC filing harvest that drives it resumes. The underlying files are rewritten on every `
      + `sync, so their timestamps look current — the data inside them is not.`
    : "Derived from Robinhood's daily CFTC filings, harvested each weekday."
}));
```

## Estimated Robinhood volume on Kalshi

```js
const rhGrain = view(Inputs.radio(["Weekly", "Monthly"], {label: "Period", value: "Weekly"}));
```

```js
const rhMetric = view(Inputs.radio(["Estimated volume", "Share of Kalshi"], {label: "Metric", value: "Estimated volume"}));
```

<p class="section-intro">Estimated only — Robinhood does not report a Kalshi-specific figure.</p>

```js
// One series drives both the brush and the chart, so the two can never disagree about
// which points exist. Monthly is the same method at a monthly window, not a sum of the
// weekly rows -- weeks straddle month ends.
const rhSeries = rhGrain === "Monthly"
  ? monthlyParsed.map(d => ({
      date: d.month_date, value: d.rh_est_billions, share: d.rh_share_pct,
      kalshi: d.kalshi_billions, label: fmtDate(d.month_date)
    }))
  : (rhMetric === "Estimated volume" ? weeklyComplete : weekly).map(d => ({
      date: d.week_start, value: d.rh_est_billions, share: d.rh_share_pct,
      kalshi: d.kalshi_billions, label: "Week of " + fmtWeek(d.week_start)
    }));
```

```js
const rhSel = Mutable(d3.extent(rhSeries, d => d.date));
```

```js
display(renderDateBrush({
  data: rhSeries.map(d => ({date: d.date, value: rhMetric === "Estimated volume" ? d.value : d.share})),
  initialRange: d3.extent(rhSeries, d => d.date),
  onSelect: range => { rhSel.value = range; },
  color: "var(--accent-robinhood)",
  width
}));
```

```js
const rhView = rhSeries.filter(d => d.date >= rhSel[0] && d.date <= rhSel[1]);
```

```js
const rhPeak = rhView.length ? rhView.reduce((a, b) => (rhMetric === "Estimated volume" ? b.value > a.value : b.share > a.share) ? b : a) : null;
const rhLast = rhView.length ? rhView[rhView.length - 1] : null;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Peak ${rhGrain.toLowerCase()} (estimated)</div>
    <div class="kpi-value">${rhMetric === "Estimated volume" ? fmtB(rhPeak?.value) : fmtPct(rhPeak?.share)}</div>
    <div class="kpi-meta">${rhPeak ? `${rhPeak.label} — ${fmtPct(rhPeak.share)} of Kalshi` : ""}</div>
  </div>
  <div class="kpi-card" data-accent="robinhood">
    <div class="kpi-label">Latest ${rhGrain.toLowerCase()} (estimated)</div>
    <div class="kpi-value">${rhMetric === "Estimated volume" ? fmtB(rhLast?.value) : fmtPct(rhLast?.share)}</div>
    <div class="kpi-meta">${rhLast ? `${rhLast.label} — ${fmtPct(rhLast.share)} of Kalshi` : ""}</div>
  </div>
</div>

```js
Plot.plot({
  marginLeft: 58, marginBottom: 50,
  height: 340,
  width,
  x: rhGrain === "Monthly"
    // A band scale over one row per month. `interval` belongs HERE, on the scale, not on
    // the barY mark: as a mark option Plot applies it to the mark's VALUE dimension,
    // which for barY is y -- that turned every y into a month-long span in milliseconds,
    // so all bars became identical and full-height.
    ? {interval: d3.utcMonth, label: null, tickFormat: d => d3.utcFormat("%b '%y")(d), tickRotate: -35}
    : {label: null, tickRotate: -35},
  y: {
    label: rhMetric === "Estimated volume" ? "Estimated contracts (billions)" : "Estimated share of Kalshi (%)",
    grid: true,
    tickFormat: d => rhMetric === "Estimated volume" ? (+d).toFixed(1) + "B" : d + "%"
  },
  marks: [
    Plot.ruleY([0]),
    rhMetric === "Estimated volume"
      ? Plot.barY(rhView, {
          x: "date", y: "value",
          fill: "var(--accent-robinhood)", fillOpacity: 0.85,
          // Named channels rather than formatting x/y: Plot labels a tip row with the
          // channel's own name, and with `label: null` on x that falls back to the raw
          // field name. Suppressing x/y and naming three channels gives clean rows.
          channels: {
            Period: d => d.label,
            Estimated: d => fmtB(d.value) + " contracts",
            "Share of Kalshi": d => fmtPct(d.share)
          },
          tip: {format: {x: false, y: false, fill: false}}
        })
      : Plot.line(rhView, {
          x: "date", y: "share",
          stroke: "var(--accent-robinhood)", strokeWidth: 2, curve: "monotone-x"
        }),
    rhMetric === "Share of Kalshi"
      ? Plot.dot(rhView, {
          x: "date", y: "share", fill: "var(--accent-robinhood)", r: 3,
          channels: {
            Period: d => d.label,
            "Share of Kalshi": d => fmtPct(d.share),
            Estimated: d => fmtB(d.value) + " contracts"
          },
          tip: {format: {x: false, y: false, fill: false}}
        })
      : null
  ]
})
```

## Reported where Robinhood has published it

<p class="section-intro">Robinhood reports an all-venue total each month. Subtracting Rothera gives its Kalshi volume directly — no estimate involved. Paler bars are months it has not yet reported.</p>

```js
Plot.plot({
  marginLeft: 58, marginBottom: 50,
  height: 340,
  width,
  x: {interval: d3.utcMonth, label: null, tickFormat: d => d3.utcFormat("%b '%y")(d), tickRotate: -35},
  y: {label: "Contracts to Kalshi (billions)", grid: true, tickFormat: d => (+d).toFixed(1) + "B"},
  marks: [
    Plot.ruleY([0]),
    // Two marks rather than a fill scale: this needs exactly two visual states, and an
    // ordinal fill scale would add a legend that says less than the caption already does.
    Plot.barY(reportedParsed.filter(d => d.is_actual), {
      x: "month_date", y: "rh_kalshi_billions",
      fill: "var(--accent-robinhood)", fillOpacity: 0.9,
      channels: {
        Month: d => fmtDate(d.month_date),
        Basis: () => "Reported by Robinhood",
        "To Kalshi": d => fmtB(d.rh_kalshi_billions) + " contracts",
        "To Rothera": d => d.rothera_billions > 0 ? fmtB(d.rothera_billions) + " contracts" : "—",
        "All venues": d => fmtB(d.rh_total_billions) + " contracts",
        "Share of Kalshi": d => fmtPct(d.rh_share_pct)
      },
      tip: {format: {x: false, y: false, fill: false}}
    }),
    Plot.barY(reportedParsed.filter(d => !d.is_actual), {
      x: "month_date", y: "rh_kalshi_billions",
      fill: "var(--accent-robinhood)", fillOpacity: 0.3,
      channels: {
        Month: d => fmtDate(d.month_date),
        Basis: () => "Estimated — not yet reported",
        "To Kalshi": d => fmtB(d.rh_kalshi_billions) + " contracts",
        "Share of Kalshi": d => fmtPct(d.rh_share_pct)
      },
      tip: {format: {x: false, y: false, fill: false}}
    })
  ]
})
```
