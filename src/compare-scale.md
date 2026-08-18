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

## The same game, on two venues

<p class="section-intro">Every fixture both Kalshi and Polymarket US listed, one dot each. Kalshi trades more of the same game in all six sports, but the gap runs from about 4&times; in baseball to 162&times; in the NFL.</p>

```js
const xvenue = await DataAttachment("data/polymarket_kalshi_same_fixture.csv").csv({typed: true});
```

```js
// One row per fixture both venues listed. The join is CONSTRUCTED, not an id lookup:
// Polymarket publishes sportradar_game_id but Kalshi publishes no fixture identifier at
// all, so the key is (league, date, unordered team pair) through a hand-checked 159-row
// team crosswalk. Alignment is by TEAM IDENTITY, never by position -- the two venues
// disagree about which team is named first on every IPL fixture and no other league.
const xvRows = xvenue
  .filter(d => (+d.kalshi_contracts || 0) > 0 && (+d.poly_contracts || 0) > 0)
  .map(d => ({
    league: String(d.league || "").toUpperCase(),
    date: d.game_date,
    kalshi: +d.kalshi_contracts,
    poly: +d.poly_contracts,
    ratio: +d.kalshi_contracts / +d.poly_contracts,
    fixture: `${d.kalshi_first}/${d.kalshi_second}`.toUpperCase()
  }));

const xvLeagues = Array.from(d3.rollup(xvRows, v => v.length, d => d.league))
  .sort((a, b) => b[1] - a[1]).map(d => d[0]);
const xvMedian = new Map(
  Array.from(d3.rollup(xvRows, v => d3.median(v, d => d.ratio), d => d.league))
);
const xvExtent = d3.extent([...xvRows.map(d => d.kalshi), ...xvRows.map(d => d.poly)]);
const fmtX = n => n >= 1e9 ? `${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 380,
  marginLeft: 76,
  grid: true,
  x: {type: "log", label: "Polymarket US contracts on that fixture →", tickFormat: fmtX},
  y: {type: "log", label: "↑ Kalshi contracts on that fixture", tickFormat: fmtX},
  color: {legend: true, domain: xvLeagues, scheme: "tableau10"},
  marks: [
    // Parity: everything above this line is a fixture Kalshi traded more of.
    Plot.line([[xvExtent[0], xvExtent[0]], [xvExtent[1], xvExtent[1]]],
      {stroke: "currentColor", strokeOpacity: 0.35, strokeDasharray: "4,4"}),
    Plot.dot(xvRows, {
      x: "poly", y: "kalshi", fill: "league", r: 3, fillOpacity: 0.72,
      tip: true,
      title: d => `${d.league} ${d.fixture}\n${d.date}\nKalshi ${fmtX(d.kalshi)} · Polymarket ${fmtX(d.poly)}\n${d.ratio.toFixed(1)}× Kalshi`
    })
  ]
})
```

<p class="chart-note">The dashed line is parity &mdash; ${xvRows.filter(d => d.ratio < 1).length} of ${xvRows.length} fixtures sit below it, where Polymarket US traded the larger book. Median ratio by league: ${xvLeagues.map(l => `${l} ${xvMedian.get(l).toFixed(1)}×`).join(" · ")}.</p>

<details class="surface-card compact-details">
  <summary>About this comparison — read before quoting any number</summary>
  <p><strong>This is not a random sample of either book.</strong> Kalshi publishes no per-fixture file; the only per-market data it publishes is two all-time leaderboards capped at its top 1,000 and 2,000 markets. A fixture outside those caps cannot appear here at all, so the ${xvRows.length} shown are weighted towards big games — and towards games Kalshi traded heavily, which is the very quantity being compared. Read the ratios as "on the fixtures both venues listed and Kalshi traded a lot of", not as a market-share estimate.</p>
  <p><strong>The join is constructed, and it is checked.</strong> Polymarket US publishes a third-party <code>sportradar_game_id</code> on 92.5% of its events; Kalshi publishes no fixture identifier of any kind, so that id can only ever name one side and cannot be the key. Fixtures are matched on league, date and the unordered team pair through a 159-row crosswalk, with a one-day tolerance for games that cross midnight in one venue's timezone and not the other. Where both venues have settled, the two agree on the winner on <strong>309 of 309</strong> fixtures; the producer refuses to publish if a single one disagrees, because a disagreement would mean the crosswalk had mapped two different teams onto each other.</p>
  <p><strong>The two venues disagree about team order, and only in one league.</strong> All 47 flipped fixtures are IPL, and every IPL fixture is flipped; no other league has one. That is a listing convention, not an error, and nothing here is aligned by position — but it is why a comparison built on "first team" rather than team identity would be silently wrong for an entire sport.</p>
  <p><strong>Soccer is absent by construction.</strong> Polymarket lists a soccer fixture as three separate binary markets (home, away, draw) where Kalshi lists one, so the two are not the same object and a join would compare a two-outcome market against one leg of a three-outcome one.</p>
  <p><strong>Contracts are each venue's own unit</strong> and are not adjusted. Polymarket US contract counts are fractional; Kalshi's are whole.</p>
</details>

## Reported open interest

<p class="section-intro">Open contracts at the reporting snapshot. Only directly published, comparable series are shown.</p>

```js
const oiRows = [
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
