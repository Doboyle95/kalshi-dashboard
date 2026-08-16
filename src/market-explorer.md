---
title: Market Explorer
---

<div class="page-hero">
  <div class="page-eyebrow">Explorer</div>
  <h1>Markets and venue leaders</h1>
  <p class="page-lead">Three different questions, kept separate: which venues are largest now, what leads each venue, and where a particular event or contract is listed.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, buildPlatformSeries, buildVenueScoreboard} from "./components/venue-data.js";
import {LB_VENUES, fmtLbCount, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
import {bestName, fmtStrike, fmtWinner} from "./components/ticker-names.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kalshiDaily = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const prophetxDaily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const cmeDaily = await DataAttachment("data/cme_daily_distributed.csv").csv({typed: true});

const lbKalshi = await DataAttachment("data/market_leaderboard.csv").csv();
const lbPolymarket = await DataAttachment("data/polymarket_market_leaderboard.csv").csv();
const lbForecastex = await DataAttachment("data/forecastex_market_leaderboard.csv").csv();
const lbNadex = await DataAttachment("data/nadex_market_leaderboard.csv").csv();
const lbRothera = await DataAttachment("data/rothera_market_leaderboard.csv").csv();
const lbDkex = await DataAttachment("data/dkex_market_leaderboard.csv").csv();
const lbUnderdog = await DataAttachment("data/underdog_market_leaderboard.csv").csv();
```

```js
const normalizedVenues = [
  {spec: LB_VENUES.kalshi, rows: normalizeLeaderboard("kalshi", lbKalshi, {nameFn: bestName, winnerFn: fmtWinner, topFn: fmtStrike})},
  {spec: LB_VENUES.polymarket, rows: normalizeLeaderboard("polymarket", lbPolymarket)},
  {spec: LB_VENUES.forecastex, rows: normalizeLeaderboard("forecastex", lbForecastex)},
  {spec: LB_VENUES.nadex, rows: normalizeLeaderboard("nadex", lbNadex)},
  {spec: LB_VENUES.rothera, rows: normalizeLeaderboard("rothera", lbRothera)},
  {spec: LB_VENUES.dkex, rows: normalizeLeaderboard("dkex", lbDkex)},
  {spec: LB_VENUES.underdog, rows: normalizeLeaderboard("underdog", lbUnderdog)}
];
const platformRows = buildPlatformSeries({kalshi: kalshiDaily, competitor: competitorDaily, prophetx: prophetxDaily, cme: cmeDaily});
const venueBoard = buildVenueScoreboard(platformRows);
const fmtDate = value => value?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "—";
const fmtPct = value => value == null ? "—" : `${value >= 0 ? "+" : ""}${(100 * value).toFixed(1)}%`;
```

## Venue leaderboard

<p class="section-intro">Recent reported scale, not an all-time contest between differently aged datasets.</p>

<div class="surface-card table-scroll">

```js
display(html`<table class="briefing-table">
  <thead><tr><th>Venue</th><th>Reporting through</th><th>7-day average</th><th>Last 30 reported days</th><th>vs prior 30</th><th>Coverage</th></tr></thead>
  <tbody>${venueBoard.map(row => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[row.venue]}"></span><strong>${row.venue}</strong></td>
    <td>${fmtDate(row.latest)}</td>
    <td title="${Math.round(row.average7 ?? 0).toLocaleString()}">${fmtLbCount(row.average7)}</td>
    <td title="${Math.round(row.recentTotal).toLocaleString()}">${fmtLbCount(row.recentTotal)} <span class="cell-note">${row.recentDays}d</span></td>
    <td class="${row.change == null ? "" : row.change >= 0 ? "is-positive" : "is-negative"}">${fmtPct(row.change)}</td>
    <td>${row.sparse ? html`<span class="coverage-badge is-limited">sparse bulletin</span>` : row.coverage}</td>
  </tr>`)}</tbody>
</table>`);
```

</div>

## Top markets by venue

<p class="section-intro">The five largest markets inside each venue's own published window and unit. These are separate lists by design; they are not a blended cross-venue ranking.</p>

```js
display(html`<div class="top-market-grid">${normalizedVenues.map(({spec, rows}) => {
  const top = rows.filter(row => row.period === "all").sort((a, b) => b.contracts - a.contracts).slice(0, 5);
  return html`<section class="top-market-card">
    <h3><span class="venue-dot" style="background:${spec.accent}"></span>${spec.label}</h3>
    <ol>${top.map(row => html`<li><span title="${row.marketKey}">${row.name || row.marketKey}</span><strong>${fmtLbCount(row.contracts)}${spec.unit === "pairs" ? " pairs" : ""}</strong></li>`)}</ol>
  </section>`;
})}</div>`);
```

## Market finder

<p class="section-intro">Search names, clubs, players, categories, outcomes, or ticker fragments across every supported venue. The default order is most recently traded. There is no meaningless all-venue rank and no separate “Label” column; name provenance is available in the Market-cell tooltip.</p>

```js
display(marketLeaderboard({
  hashPrefix: "finder",
  rowsPerPage: 25,
  venues: normalizedVenues
}));
```

<p class="chart-note"><strong>Current coverage gap:</strong> ProphetX and Novig publish per-market files but are not yet normalized into the shared finder. Their absence here is a finder limitation, not an absence of markets or trading.</p>
