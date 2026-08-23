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
  <p><strong>What the estimate covers.</strong> It is fitted against Robinhood's announced total less Rothera, so it predicts everything Robinhood sends anywhere except Rothera. ForecastEx sports and weather volume — which we attribute to Robinhood — is then taken off to leave Kalshi alone. That is an attribution, not a second estimate: the coefficient is not refitted and the total does not change.</p>
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
const filing = await DataAttachment("data/rh_daily_filing.csv").csv({typed: true});
const fcmCmp = await DataAttachment("data/fcm_comparison.csv").csv({typed: true});
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
// One palette for every destination chart on this page.
//
// Kalshi takes --accent-kalshi rather than --accent-robinhood: the segment IS Kalshi
// volume, and the two green tokens are near-indistinguishable side by side (#5FB81E vs
// #00C805 in light, #3DDC84 vs #21E065 in dark -- worse). Rothera goes neutral-dark for
// maximum separation from teal, which also survives red-green colour blindness in a way
// green-on-green does not.
const DEST = [
  {key: "kalshi",     label: "Kalshi",     color: "var(--accent-kalshi)"},
  {key: "rothera",    label: "Rothera",    color: "var(--theme-foreground)"},
  {key: "forecastex", label: "ForecastEx", color: "var(--accent-forecastex)"}
];
const DEST_DOMAIN = DEST.map(d => d.label);
const DEST_RANGE  = DEST.map(d => d.color);

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

## Estimated Robinhood volume by destination

```js
const rhGrain = view(Inputs.radio(["Weekly", "Monthly"], {label: "Period", value: "Weekly"}));
```

```js
const rhMetric = view(Inputs.radio(["Estimated volume", "Share of Kalshi"], {label: "Metric", value: "Estimated volume"}));
```

<p class="section-intro">Estimated only — Robinhood does not report a per-venue figure. Rothera and ForecastEx are measured; Kalshi is what the model infers.</p>

```js
// One series drives both the brush and the chart, so the two can never disagree about
// which points exist. Monthly is the same method at a monthly window, not a sum of the
// weekly rows -- weeks straddle month ends.
const rhSeries = rhGrain === "Monthly"
  ? monthlyParsed.map(d => ({
      date: d.month_date, value: d.rh_est_billions, share: d.rh_share_pct,
      rothera: d.rothera_billions ?? 0, fx: d.fx_billions ?? 0,
      kalshi: d.kalshi_billions, label: fmtDate(d.month_date)
    }))
  : (rhMetric === "Estimated volume" ? weeklyComplete : weekly).map(d => ({
      date: d.week_start, value: d.rh_est_billions, share: d.rh_share_pct,
      rothera: d.rothera_billions ?? 0, fx: d.fx_billions ?? 0,
      kalshi: d.kalshi_billions, label: "Week of " + fmtWeek(d.week_start)
    }));
```

```js
const rhSel = Mutable(d3.extent(rhSeries, d => d.date));
```

```js
display(renderDateBrush({
  data: rhSeries.map(d => ({date: d.date,
    value: rhMetric === "Estimated volume" ? d.value + d.rothera + d.fx : d.share})),
  initialRange: d3.extent(rhSeries, d => d.date),
  onSelect: range => { rhSel.value = range; },
  color: "var(--accent-robinhood)",
  width
}));
```

```js
const rhView = rhSeries.filter(d => d.date >= rhSel[0] && d.date <= rhSel[1]);
// Long form for the stack. Kalshi is the estimate; the other two are measured.
const rhStack = rhView.flatMap(d => [
  {...d, dest: "Kalshi", v: d.value},
  {...d, dest: "Rothera", v: d.rothera},
  {...d, dest: "ForecastEx", v: d.fx}
]).filter(d => d.v > 0);
```

```js
const rhPeak = rhView.length ? rhView.reduce((a, b) => (rhMetric === "Estimated volume" ? b.value > a.value : b.share > a.share) ? b : a) : null;
const rhLast = rhView.length ? rhView[rhView.length - 1] : null;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Peak ${rhGrain.toLowerCase()} on Kalshi (estimated)</div>
    <div class="kpi-value">${rhMetric === "Estimated volume" ? fmtB(rhPeak?.value) : fmtPct(rhPeak?.share)}</div>
    <div class="kpi-meta">${rhPeak ? `${rhPeak.label} — ${fmtPct(rhPeak.share)} of Kalshi` : ""}</div>
  </div>
  <div class="kpi-card" data-accent="robinhood">
    <div class="kpi-label">Latest ${rhGrain.toLowerCase()} on Kalshi (estimated)</div>
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
    label: rhMetric === "Estimated volume" ? "Contracts (billions)" : "Estimated share of Kalshi (%)",
    grid: true,
    tickFormat: d => rhMetric === "Estimated volume" ? (+d).toFixed(1) + "B" : d + "%"
  },
  color: rhMetric === "Estimated volume"
    ? {domain: DEST_DOMAIN, range: DEST_RANGE, legend: true}
    : undefined,
  marks: [
    Plot.ruleY([0]),
    rhMetric === "Estimated volume"
      ? Plot.barY(rhStack, {
          x: "date", y: "v", fill: "dest", z: "dest",
          order: DEST_DOMAIN, fillOpacity: 0.9,
          // Named channels rather than formatting x/y: Plot labels a tip row with the
          // channel's own name, and with `label: null` on x that falls back to the raw
          // field name. Suppressing x/y gives clean rows.
          channels: {
            Period: d => d.label,
            Destination: d => d.dest,
            Contracts: d => fmtB(d.v) + " contracts",
            "Kalshi share": d => fmtPct(d.share)
          },
          tip: {format: {x: false, y: false, fill: false, z: false, fillOpacity: false}}
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

## Where Robinhood's volume goes

<p class="section-intro">Robinhood reports an all-venue total each month; taking off the Rothera and ForecastEx volume we measure ourselves leaves its Kalshi figure, with no estimate involved. Faded bars are months it has not reported yet.</p>

```js
// Long form, one row per destination, so Plot stacks them. Rothera is OBSERVED in every
// month including the unreported ones -- it is our own collection, not something
// Robinhood has to publish -- so the split runs to the end of the data even where the
// Kalshi side is still an estimate.
const destStack = reportedParsed.flatMap(d => [
  {...d, dest: "Kalshi",     value: d.rh_kalshi_billions},
  {...d, dest: "Rothera",    value: d.rothera_billions ?? 0},
  {...d, dest: "ForecastEx", value: d.forecastex_billions ?? 0}
]).filter(d => d.value > 0);
```

```js
Plot.plot({
  marginLeft: 58, marginBottom: 50,
  height: 360,
  width,
  x: {interval: d3.utcMonth, label: null, tickFormat: d => d3.utcFormat("%b '%y")(d), tickRotate: -35},
  y: {label: "Contracts (billions)", grid: true, tickFormat: d => (+d).toFixed(1) + "B"},
  color: {domain: DEST_DOMAIN, range: DEST_RANGE, legend: true},
  marks: [
    Plot.ruleY([0]),
    // `z` is passed explicitly even though barY would inherit it from `fill`: an array
    // `order` without a z channel throws "missing channel: z", and that is a trap worth
    // not re-laying for whoever edits this next.
    Plot.barY(destStack, {
      x: "month_date", y: "value", fill: "dest", z: "dest",
      order: ["Kalshi", "Rothera", "ForecastEx"],
      // Opacity carries reported-vs-estimated; colour carries destination. Two variables,
      // two visual channels, so neither has to be read out of the other.
      fillOpacity: d => d.is_actual ? 0.9 : 0.4,
      channels: {
        Month: d => fmtDate(d.month_date),
        Destination: d => d.dest,
        Contracts: d => fmtB(d.value) + " contracts",
        Basis: d => d.dest === "Kalshi"
          ? (d.is_actual ? "Reported by Robinhood" : "Estimated")
          : "Measured from " + d.dest,
        "All venues": d => d.rh_total_billions > 0
          ? fmtB(d.rh_total_billions) + " contracts"
          : "not yet reported"
      },
      // fillOpacity carries reported-vs-estimated visually and is named in the Basis
      // row already; without suppressing it Plot adds a raw "0.9"/"0.4" line to the tip.
      tip: {format: {x: false, y: false, fill: false, z: false, fillOpacity: false}}
    })
  ]
})
```

## The daily filing behind it

<p class="section-intro">CFTC line [8530] as Robinhood files it, and the Kalshi-only figure left after Rothera's positions are removed. The gap between the two lines opened in June 2026 and is the whole reason the correction exists.</p>

```js
// Two lines rather than a stack: the point is the DIVERGENCE, and a stack hides it by
// making the upper series ride on the lower one. Dollars, not contracts -- [8530] is a
// market value, which is why the estimate needs a coefficient to reach a volume at all.
const filingSeries = filing.flatMap(d => [
  {date: d.date, series: "As filed", value: d.swap_open_long},
  {date: d.date, series: "Kalshi only", value: d.kalshi_open_long}
]);
const fmtM = n => "$" + ((n ?? 0) / 1e6).toFixed(1) + "M";
```

```js
Plot.plot({
  marginLeft: 62, marginBottom: 40,
  height: 300,
  width,
  x: {label: null, tickRotate: -35},
  y: {
    label: "Open position (market value)",
    grid: true,
    tickFormat: d => "$" + (+d / 1e6).toFixed(0) + "M"
  },
  // Same two-greens problem as the stacks: as-filed goes neutral-dark, Kalshi teal.
  color: {
    domain: ["As filed", "Kalshi only"],
    range: ["var(--theme-foreground)", "var(--accent-kalshi)"],
    legend: true
  },
  marks: [
    Plot.ruleY([0]),
    Plot.line(filingSeries, {
      x: "date", y: "value", stroke: "series", strokeWidth: 1.6
    }),
    // One tip for both series at the hovered date, rather than two marks fighting over
    // the pointer.
    Plot.tip(filing, Plot.pointerX({
      x: "date",
      y: "swap_open_long",
      channels: {
        Date: d => fmtWeek(d.date),
        "As filed": d => fmtM(d.swap_open_long),
        Rothera: d => d.rothera_oi_value > 0 ? fmtM(d.rothera_oi_value) : "—",
        "Kalshi only": d => fmtM(d.kalshi_open_long)
      },
      format: {x: false, y: false}
    }))
  ]
})
```

## The three FCMs side by side

<p class="section-intro">The same filing, line [8530], for the three firms distributing event contracts. Note the scale is logarithmic — Robinhood's book is roughly a hundred times FanDuel's.</p>

<div class="surface-card compact-details" style="padding:0.75rem 1rem;">
  <p style="margin:0;">These firms serve different customers, so the same overnight position can correspond to very different amounts of trading at each. The shapes are comparable; the levels are not a proxy for relative volume.</p>
</div>

```js
// Long form for a colour-keyed line per firm. Zeros are dropped rather than clamped: a
// log scale cannot place them, and in every case a zero means the firm had not started
// yet rather than that it held nothing that day.
const FCMS = [
  {key: "robinhood", label: "Robinhood Derivatives", color: "var(--accent-robinhood)"},
  {key: "coinbase",  label: "Coinbase Financial Markets", color: "var(--accent-secondary)"},
  {key: "fanduel",   label: "FanDuel Prediction Markets", color: "var(--accent-cme)"}
];
const fcmSeries = fcmCmp.flatMap(d =>
  FCMS.map(f => ({date: d.date, firm: f.label, value: d[f.key]}))
).filter(d => d.value > 0);
```

```js
Plot.plot({
  marginLeft: 66, marginBottom: 40,
  height: 340,
  width,
  x: {label: null, tickRotate: -35},
  y: {
    type: "log",
    label: "Open position (market value, log scale)",
    grid: true,
    tickFormat: d => d >= 1e6 ? "$" + (d / 1e6) + "M" : "$" + (d / 1e3) + "k"
  },
  color: {domain: FCMS.map(f => f.label), range: FCMS.map(f => f.color), legend: true},
  marks: [
    Plot.line(fcmSeries, {x: "date", y: "value", stroke: "firm", strokeWidth: 1.5}),
    Plot.tip(fcmCmp, Plot.pointerX({
      x: "date",
      y: "robinhood",
      channels: {
        Date: d => fmtWeek(d.date),
        Robinhood: d => d.robinhood > 0 ? fmtM(d.robinhood) : "—",
        Coinbase: d => d.coinbase > 0 ? fmtM(d.coinbase) : "—",
        FanDuel: d => d.fanduel > 0 ? fmtM(d.fanduel) : "—"
      },
      format: {x: false, y: false}
    }))
  ]
})
```
