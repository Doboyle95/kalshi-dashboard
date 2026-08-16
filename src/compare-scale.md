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
  <thead><tr><th>Venue</th><th>Reporting through</th><th>Latest day</th><th>7-day average</th><th>Last 30 reported days</th><th>vs prior 30</th><th>Coverage</th></tr></thead>
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
const scaleWindow = view(Inputs.radio(["30 days", "90 days", "All history"], {label: "Period", value: "90 days"}));
const scaleType = view(Inputs.radio(["Linear", "Log"], {label: "Scale", value: "Linear"}));
```

</div>

```js
const end = d3.max(rows, d => d.date);
const start = scaleWindow === "All history" ? d3.min(rows, d => d.date) : d3.utcDay.offset(end, scaleWindow === "30 days" ? -29 : -89);
const selected = rows.filter(d => !d.sparse && d.contracts > 0 && d.date >= start && d.date <= end && (scaleMetric === "Volume" || !d.partial));
const dayTotals = d3.rollup(selected.filter(d => !d.partial), group => d3.sum(group, d => d.contracts), d => +d.date);
const plotted = selected.map(d => ({...d, value: scaleMetric === "Volume" ? d.contracts : d.contracts / (dayTotals.get(+d.date) || d.contracts)}));
const venueNames = VENUE_ORDER.filter(venue => plotted.some(d => d.venue === venue));
const scaleBrushSeries = Array.from(d3.rollup(selected, group => d3.sum(group, d => d.contracts), d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const scaleDateSel = Mutable([start, end]);
display(renderDateBrush({
  data: scaleBrushSeries,
  initialRange: [start, end],
  onSelect: range => { scaleDateSel.value = range; },
  color: "#00C2A8",
  width
}));
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

```js
const oiRows = [
  ...kalshiOi.map(d => ({date: d.date, venue: "Kalshi", openInterest: +d.total_oi_contracts || 0})),
  ...competitor.filter(d => +d.open_interest > 0).map(d => ({date: d.date, venue: d.platform === "Polymarket_US" ? "Polymarket US" : d.platform === "Nadex" ? "Crypto.com/Nadex" : d.platform, openInterest: +d.open_interest}))
].filter(d => d.date && d.openInterest > 0);
const oiVenues = VENUE_ORDER.filter(venue => oiRows.some(d => d.venue === venue));
const oiBrushSeries = Array.from(d3.rollup(oiRows, group => d3.sum(group, d => d.openInterest), d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const oiDateSel = Mutable([d3.min(oiRows, d => d.date), d3.max(oiRows, d => d.date)]);
display(renderDateBrush({
  data: oiBrushSeries,
  initialRange: [d3.min(oiRows, d => d.date), d3.max(oiRows, d => d.date)],
  onSelect: range => { oiDateSel.value = range; },
  color: "#3B7DD8",
  width
}));
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

<div class="destination-grid">
  <a class="destination-card" href="./robinhood"><strong>Robinhood distribution spotlight</strong><span>Estimated volume routed through Robinhood and its share of Kalshi.</span></a>
  <a class="destination-card" href="./competitors#turnover-diagnostic"><strong>Liquidity diagnostics</strong><span>Reported volume ÷ prior-day open interest; secondary because it is sensitive to settlement timing and book coverage.</span></a>
</div>
