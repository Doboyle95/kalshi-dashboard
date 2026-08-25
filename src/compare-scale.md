---
title: Scale & Liquidity
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Scale & Liquidity</h1>
  <p class="page-lead">Recent venue scale, market share, reported open interest, and clearly labeled secondary liquidity diagnostics.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, VENUE_ORDER, buildPlatformSeries, buildVenueScoreboard} from "./components/venue-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const kalshi = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const prophetx = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const cme = await DataAttachment("data/cme_daily_distributed.csv").csv({typed: true});
const kalshiOi = await DataAttachment("data/kalshi_oi_daily.csv").csv({typed: true});

const fmtCount = value => {
  const n = +value || 0, a = Math.abs(n), sign = n < 0 ? "−" : "";
  return sign + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : Math.round(a).toLocaleString());
};
const fmtPct = value => value == null ? "—" : `${value >= 0 ? "+" : ""}${(100 * value).toFixed(1)}%`;
const fmtDate = value => value?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "—";
const rows = buildPlatformSeries({kalshi, competitor, prophetx, cme});
const scoreboard = buildVenueScoreboard(rows);
```

## Venue scoreboard

<div class="surface-card table-scroll">

```js
display(html`<table class="briefing-table scoreboard-table">
  <thead><tr><th>Venue</th><th>Reporting through</th><th>Latest day</th><th>7-day average</th><th>Last 7 reported days</th><th>vs prior 7</th><th>Coverage</th></tr></thead>
  <tbody>${scoreboard.map(row => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[row.venue]}"></span><strong>${row.venue}</strong></td>
    <td>${fmtDate(row.latest)}</td><td>${fmtCount(row.latestVolume)}</td><td>${fmtCount(row.average7)}</td>
    <td>${fmtCount(row.recentTotal)} <span class="cell-note">${row.recentDays}d</span></td>
    <td class="${row.change == null ? "" : row.change >= 0 ? "is-positive" : "is-negative"}">${fmtPct(row.change)}</td>
    <td>${row.sparse ? html`<span class="coverage-badge is-limited">sparse bulletin</span>` : row.coverage}</td>
  </tr>`)}</tbody>
</table>`);
```

</div>

## Volume and market share

<div class="control-strip">

```js
const scaleMetric = view(Inputs.radio(["Volume", "Market share"], {label: "Metric", value: "Volume"}));
const scaleType = view(Inputs.radio(["Linear", "Log"], {label: "Scale", value: "Linear"}));
const scaleExclude = view(Inputs.checkbox(["Exclude Kalshi"], {value: []}));
```

</div>

```js
// The brush is the ONLY date filter on this chart, and its domain is now the FULL
// history. It used to be handed data that a separate "Period" radio had already
// trimmed, which made the period the brush's entire world: with Period = 30 days you
// could brush to LESS than 30 days but never more. The period presets moved onto the
// brush itself, which is what index.md and compare-fees.md already do.
//
// This cell deliberately reads NEITHER scaleMetric NOR scaleExclude. A Mutable is
// rebuilt whenever its defining cell re-runs, so referencing either here would snap the
// window back to the 90d default every time you switched metric or ticked Exclude
// Kalshi. It also fixes the sparkline as the all-venue shape in both states -- that
// strip is for orientation, not measurement, and a stable one is easier to aim with.
const scaleUniverse = rows.filter(d => !d.sparse && d.contracts > 0);
const scaleLatest = d3.max(scaleUniverse, d => d.date);
const scaleDefaultStart = d3.utcDay.offset(scaleLatest, -89);
const scaleBrushSeries = Array.from(d3.rollup(scaleUniverse, group => d3.sum(group, d => d.contracts), d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const scaleDateSel = Mutable([scaleDefaultStart, scaleLatest]);
const setScaleDate = range => { scaleDateSel.value = range; };
display(renderDateBrush({
  data: scaleBrushSeries,
  initialRange: [scaleDefaultStart, scaleLatest],
  quickRanges: [
    {label: "30d", days: 30, title: "Last 30 days"},
    {label: "90d", days: 90, title: "Last 90 days"},
    {label: "365d", days: 365, title: "Last 365 days"},
    {label: "All", days: Infinity, title: "All available history"}
  ],
  onSelect: setScaleDate,
  color: "var(--accent-kalshi)",
  width
}));
```

```js
const scaleExKalshi = scaleExclude.includes("Exclude Kalshi");
const eligible = scaleUniverse.filter(d => scaleMetric === "Volume" || !d.partial);
// Market-share denominators are built BEFORE the exclusion, so "Exclude Kalshi" only
// HIDES a line: every plotted share stays a share of the whole reported market and
// reads identically with the box ticked or not. Filtering first would silently restate
// the metric as share-of-the-rest (Polymarket US 8.3% -> 59.0% on the last 14 days) --
// same visual separation, different meaning, no label saying so.
const dayTotals = d3.rollup(eligible.filter(d => !d.partial), group => d3.sum(group, d => d.contracts), d => +d.date);
const selected = scaleExKalshi ? eligible.filter(d => d.venue !== "Kalshi") : eligible;
const plotted = selected.map(d => ({...d, value: scaleMetric === "Volume" ? d.contracts : d.contracts / (dayTotals.get(+d.date) || d.contracts)}));
const venueNames = VENUE_ORDER.filter(venue => plotted.some(d => d.venue === venue));
```

```js
const [scaleBrushFrom, scaleBrushTo] = scaleDateSel;
const plottedBrushed = plotted.filter(d => d.date >= scaleBrushFrom && d.date <= scaleBrushTo);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 400, marginLeft: 74,
  x: {type: "utc", label: null},
  y: {type: scaleMetric === "Volume" && scaleType === "Log" ? "log" : "linear", label: scaleMetric === "Volume" ? "Daily reported contracts" : "Share of reported contracts", percent: scaleMetric === "Market share", grid: true, tickFormat: scaleMetric === "Volume" ? fmtCount : undefined},
  color: {legend: true, domain: venueNames, range: venueNames.map(d => VENUE_COLORS[d])},
  marks: [
    Plot.lineY(plottedBrushed.filter(d => !d.partial), {x: "date", y: "value", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(plottedBrushed.filter(d => d.partial), {x: "date", y: "value", fill: "venue", r: 4, symbol: "diamond"}),
    scaleMetric === "Volume" && scaleType === "Linear" ? Plot.ruleY([0]) : null
  ].filter(Boolean)
})
```

## Reported open interest

<p class="section-intro">Open contracts at the reporting snapshot. Only directly published, comparable series are shown.</p>

<div class="control-strip">

```js
const oiExclude = view(Inputs.checkbox(["Exclude Kalshi"], {value: []}));
```

</div>

```js
const oiAll = [
  ...kalshiOi.map(d => ({date: d.date, venue: "Kalshi", openInterest: +d.total_oi_contracts || 0})),
  // KALSHI IS EXCLUDED HERE BECAUSE IT ALREADY ARRIVES ABOVE, from its own
  // kalshi_oi_daily.csv. competitor_daily.csv also carries a Kalshi open_interest
  // column, so without this filter the venue was appended TWICE into one series:
  // 1,005 points across 503 dates, with a single backward jump in data order
  // (2026-08-16 -> 2025-04-02). Plot draws that as one path, and curve monotone-x
  // renders the reversal as a long smooth sweep across the panel -- which read as a
  // trend line for Kalshi that nobody had written and no other venue had. It was an
  // artefact of the duplicate, not a fitted series.
  ...competitor.filter(d => +d.open_interest > 0 && d.platform !== "Kalshi").map(d => ({date: d.date, venue: d.platform === "Polymarket_US" ? "Polymarket US" : d.platform === "Nadex" ? "Crypto.com/Nadex" : d.platform, openInterest: +d.open_interest}))
].filter(d => d.date && d.openInterest > 0);
// Split for the same reason as the chart above: the Mutable must not live in a cell
// that reads oiExclude, or ticking the box throws away the brushed window.
const oiFirst = d3.min(oiAll, d => d.date), oiLast = d3.max(oiAll, d => d.date);
const oiBrushSeries = Array.from(d3.rollup(oiAll, group => d3.sum(group, d => d.openInterest), d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const oiDateSel = Mutable([oiFirst, oiLast]);
const setOiDate = range => { oiDateSel.value = range; };
display(renderDateBrush({
  data: oiBrushSeries,
  initialRange: [oiFirst, oiLast],
  quickRanges: [
    {label: "30d", days: 30, title: "Last 30 days"},
    {label: "90d", days: 90, title: "Last 90 days"},
    {label: "365d", days: 365, title: "Last 365 days"},
    {label: "All", days: Infinity, title: "All available history"}
  ],
  onSelect: setOiDate,
  color: "var(--accent-polymarket)",
  width
}));
```

```js
const oiRows = oiExclude.includes("Exclude Kalshi") ? oiAll.filter(d => d.venue !== "Kalshi") : oiAll;
const oiVenues = VENUE_ORDER.filter(venue => oiRows.some(d => d.venue === venue));
```

```js
const [oiBrushFrom, oiBrushTo] = oiDateSel;
const oiRowsBrushed = oiRows.filter(d => d.date >= oiBrushFrom && d.date <= oiBrushTo);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 330, marginLeft: 72,
  x: {type: "utc", label: null}, y: {label: "Reported open interest", grid: true, tickFormat: fmtCount},
  color: {legend: true, domain: oiVenues, range: oiVenues.map(d => VENUE_COLORS[d])},
  marks: [Plot.ruleY([0]), Plot.lineY(oiRowsBrushed, {x: "date", y: "openInterest", stroke: "venue", strokeWidth: 2, curve: "monotone-x"})]
})
```

<div class="module-links">
  <a href="./robinhood">Robinhood distribution estimate →</a>
</div>
