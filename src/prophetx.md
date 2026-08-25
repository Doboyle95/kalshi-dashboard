---
title: ProphetX
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>ProphetX</h1>
  <p class="page-lead">A peer-to-peer sports exchange publishing a full time-and-sales tape. This page covers <strong>what trades there</strong> — daily contract volume, how much of it is parlays, and on single markets <strong>whether those prices come true</strong>.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
// Individual fixtures, parsed out of the tape's contract_description. Loaded defensively
// because it is the newest file of the set and the DEPLOYED allowlist, not the repository
// one, decides what is actually served.
const pxGames = await (async () => {
  try {
    return await DataAttachment("data/prophetx_game_leaderboard.csv").csv({typed: true});
  } catch (error) {
    console.warn(`prophetx games: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
```

```js
const PX = "#DB2777";
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;

// The newest calendar date is only partly collected: a ProphetX session runs 16:30->16:30
// ET, so a date's post-16:30 trades arrive in the NEXT session file. Drawing it at full
// height beside complete days would read as a collapse in volume, so it is drawn but
// visually separated and excluded from every average quoted on this page.
const complete = daily.filter(d => d.complete === 1);
const partial = daily.filter(d => d.complete !== 1);
const totalContracts = d3.sum(complete, d => d.contracts);
const totalTrades = d3.sum(complete, d => d.trade_count);
const parlayContracts = d3.sum(complete, d => d.contracts_parlay);
// Dollars parlay buyers paid. Complete days only, like every other figure quoted here.
const parlayStakes = d3.sum(complete, d => d.stake_parlay);
const meanDaily = totalContracts / complete.length;
const pxBrushSeries = daily.map(d => ({date: d.date, value: d.contracts})).sort((a, b) => a.date - b.date);
const pxDateSel = Mutable([d3.min(pxBrushSeries, d => d.date), d3.max(pxBrushSeries, d => d.date)]);
display(renderDateBrush({
  data: pxBrushSeries,
  initialRange: [d3.min(pxBrushSeries, d => d.date), d3.max(pxBrushSeries, d => d.date)],
  onSelect: range => { pxDateSel.value = range; },
  color: PX,
  width
}));
```

```js
const [pxBrushFrom, pxBrushTo] = pxDateSel;
const completeBrushed = complete.filter(d => d.date >= pxBrushFrom && d.date <= pxBrushTo);
const partialBrushed = partial.filter(d => d.date >= pxBrushFrom && d.date <= pxBrushTo);
```

<div class="grid grid-cols-4">
  <div class="card"><h2>Contracts traded</h2><span class="big">${fmtCount(totalContracts)}</span><span class="muted">${complete.length} complete days</span></div>
  <div class="card"><h2>Trades</h2><span class="big">${fmtCount(totalTrades)}</span><span class="muted">avg ${d3.format(",.0f")(totalContracts / totalTrades)} contracts each</span></div>
  <div class="card"><h2>Typical day</h2><span class="big">${fmtCount(meanDaily)}</span><span class="muted">contracts</span></div>
  <div class="card"><h2>Parlays</h2><span class="big">${(100 * parlayContracts / totalContracts).toFixed(1)}%</span><span class="muted">of volume, up to 12 legs</span></div>
</div>

## Daily volume

<div class="instruction-line">Calendar days, not the venue's trading sessions. A ProphetX session runs 16:30&ndash;16:30 ET, so its own session labels straddle two dates; using the execution timestamp instead keeps this series comparable with every other venue on the site. ${partial.length ? html`The final bar is <strong>still being collected</strong> and is drawn hollow.` : ""}</div>

```js
Plot.plot({
  width,
  height: 340,
  marginLeft: 62,
  marginBottom: 40,
  x: {label: null, type: "utc", ticks: 8, tickFormat: "%b %d"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount, zero: true},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(completeBrushed, {
      x: "date", y: "contracts", fill: PX, interval: "day",
      // 4px rounded data-end, 2px gap to the surface on each side
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.trade_count)} trades · avg ${d3.format(",.0f")(d.avg_trade_size)}\n${d3.format(",")(d.traded_markets)} markets traded\nparlays ${d.pct_parlay.toFixed(1)}%`,
      tip: true
    }),
    Plot.rectY(partialBrushed, {
      x: "date", y: "contracts", interval: "day",
      fill: "none", stroke: PX, strokeWidth: 2, strokeDasharray: "3,2",
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts so far — STILL COLLECTING\nthis date's post-16:30 ET trades arrive in the next session file`,
      tip: true
    })
  ]
})
```
## How much of it is parlays

```js
Plot.plot({
  width,
  height: 280,
  marginLeft: 52,
  marginBottom: 40,
  x: {label: null, type: "utc", ticks: 8, tickFormat: "%b %d"},
  y: {label: "Parlay share of volume (%)", grid: true, zero: true},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(completeBrushed, {x: "date", y: "pct_parlay", stroke: PX, strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(completeBrushed, {
      x: "date", y: "pct_parlay", fill: PX, r: 3.5,
      stroke: "var(--theme-background)", strokeWidth: 2,
      title: d => `${fmtDate(d.date)}\n${d.pct_parlay.toFixed(2)}% of volume is parlays\n${d3.format(",.0f")(d.contracts_parlay)} of ${d3.format(",.0f")(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleY([100 * parlayContracts / totalContracts], {stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1})
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Dashed line is the period average, ${(100 * parlayContracts / totalContracts).toFixed(2)}%.</div>

```js
const vap = await DataAttachment("data/prophetx_volume_at_price.csv").csv({typed: true});
const plegs = await DataAttachment("data/prophetx_parlay_legs.csv").csv({typed: true});
```

## Parlay volume and stakes

```js
import {GRANULARITIES, METRICS, metricLabel, parlayChart, toDailyParlay} from "./components/parlay-series.js";
const pxParlayGranularity = view(Inputs.radio(GRANULARITIES, {value: "Daily", label: "View"}));
const pxParlayMetric = view(Inputs.radio(METRICS, {value: "volume", label: "Metric", format: metricLabel}));
```

```js
// Both metrics off the tape, on the page's shared window. The partial newest date is kept
// rather than filtered out the way the charts above do it — parlayChart fades an unfinished
// period instead of dropping it, which is the same disclosure without the gap.
//
// A MULTI-EVENT contract's price is the parlay's own price: mean price falls monotonically
// with leg count (0.34 at two legs to 0.02 at twelve) where a complement would rise, and
// only 11 of 18,262 multi-print parlays ever show a price and its complement. That is why
// this venue publishes a dollar figure for parlays and for nothing else.
const pxParlayDaily = toDailyParlay(
  daily.filter(d => d.date >= pxBrushFrom && d.date <= pxBrushTo),
  {date: "date", contracts: "contracts_parlay", stake: "stake_parlay", complete: "complete", venue: "contracts"}
);
display(parlayChart({
  daily: pxParlayDaily, granularity: pxParlayGranularity, metric: pxParlayMetric,
  color: PX, width, height: 280
}));
```

<div class="instruction-line">Parlays are ${(100 * parlayContracts / totalContracts).toFixed(1)}% of ProphetX's contracts, bought at ${(100 * parlayStakes / parlayContracts).toFixed(1)}&cent; each.</div>

## Biggest games by volume

<div class="instruction-line">Parlays and tournament outrights are left out because neither belongs to a single game; what remains is 77% of the tape.</div>

```js
// ProphetX names the fixture in every contract_description as
// "AWAY @ HOME, LEAGUE, START ET - MARKET: SELECTION", and it parses on the whole tape
// with no exceptions, so the board is a census rather than a sample. Keyed on the
// scheduled start as well as the teams, because a series repeats the same pairing.
const pxGameVol = pxGames
  .filter(d => d.game && +d.contracts > 0)
  .sort((a, b) => +b.contracts - +a.contracts);
```

```js
const pxGameSearch = view(Inputs.search(pxGameVol, {placeholder: "Search team, league or sport…"}));
```

```js
display(pxGameVol.length
  ? Inputs.table(pxGameSearch, {
      columns: ["game", "game_date", "league", "sport", "contracts", "trades"],
      header: {game: "Game", game_date: "Date", league: "League", sport: "Sport", contracts: "Contracts", trades: "Trades"},
      format: {game_date: d => fmtDate(d), contracts: d => fmtCount(+d), trades: d => d3.format(",")(+d)},
      align: {contracts: "right", trades: "right"},
      width: {game: 240}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The named-game series is not being served yet, so this table is empty; nothing else on the page depends on it.</div>`);
```

## What trades there

<div class="instruction-line">One row per league and contract type; parlays are a single row because they span games.</div>

```js
// The board above says which GAMES traded; this one says what KIND of bet did, which is the
// question Novig's page answers with MLB-MONEY / MLB-TOTAL. ProphetX names the market in
// every contract_description, so the types are the venue's own words, not a mapping.
// Loaded here rather than in the shared block above because the chatbot's catalog credits a
// series to the heading nearest its LOAD; parked upstream it gets filed under the parlay
// section, as prophetx_volume_at_price already is. Defensive for the same reason as the
// game board: the DEPLOYED allowlist, not the repository one, decides what is served.
const pxTypes = await (async () => {
  try {
    return await DataAttachment("data/prophetx_market_leaderboard.csv").csv({typed: true});
  } catch (error) {
    console.warn(`prophetx types: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
const pxTypeVol = pxTypes
  .filter(d => d.market_name && +d.contracts > 0)
  .sort((a, b) => +b.contracts - +a.contracts);
```

```js
const pxTypeSearch = view(Inputs.search(pxTypeVol, {placeholder: "Search contract type or league\u2026"}));
```

```js
display(pxTypeVol.length
  ? Inputs.table(pxTypeSearch, {
      columns: ["market_name", "category", "n_outcomes", "contracts", "last_trade_date"],
      header: {market_name: "Contract type", category: "League", n_outcomes: "Markets", contracts: "Contracts", last_trade_date: "Last trade"},
      format: {contracts: d => fmtCount(+d), n_outcomes: d => d3.format(",")(+d), last_trade_date: d => fmtDate(d)},
      align: {contracts: "right", n_outcomes: "right"},
      width: {market_name: 260}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The contract-type series is not being served yet, so this table is empty; nothing else on the page depends on it.</div>`);
```

## Where the volume sits on the probability axis

```js
Plot.plot({
  width,
  height: 320,
  marginLeft: 62,
  marginBottom: 40,
  x: {label: "Home side's price (¢)", domain: [0, 100], grid: true},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(vap, {
      x1: d => d.price_bin, x2: d => d.price_bin + 5, y: "n_contracts",
      fill: PX, ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${d.price_bin}–${d.price_bin + 5}¢\n${d3.format(",.0f")(d.n_contracts)} contracts (${d.pct_contracts.toFixed(1)}%)\n${d3.format(",")(d.n_trades)} trades\n$${d3.format(",.0f")(d.dollars)}`,
      tip: true
    })
  ]
})
```

## Parlays by leg count

<div class="instruction-line">ProphetX calls them multi-event contracts. They run from 2 legs to <strong>12</strong>, and shorter parlays dominate &mdash; but the tail is real, and a 12-leg ticket is a very different product from a 2-leg one.</div>

```js
Plot.plot({
  width,
  height: 300,
  marginLeft: 62,
  marginBottom: 44,
  x: {label: "Legs", type: "band", tickFormat: d => `${d}`},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(plegs, {
      x: "legs", y: "contracts", fill: PX, ry2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.legs}-leg parlays\n${d3.format(",.0f")(d.contracts)} contracts (${d.pct_of_parlay_volume.toFixed(1)}% of parlay volume)\n${d3.format(",")(d.trades)} trades`,
      tip: true
    })
  ]
})
```
