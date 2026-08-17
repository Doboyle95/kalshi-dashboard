---
title: Novig · Outcomes
---

<div class="page-hero">
  <div class="page-eyebrow">Novig</div>
  <h1>Taker outcomes</h1>
  <p class="page-lead">Settled straight-contract P&amp;L and calibration. Novig is the first competitor with true taker outcomes: it publishes both who crossed the spread and who won.</p>
</div>

<div class="instruction-line"><strong>Straight contracts only.</strong> Novig's parlays are quoted by request and never become book markets, so not one resolves &mdash; they are about a third of taker contracts and are excluded from every number here. This is never a venue-wide figure.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

// The marker is anchored to a file that IS served today (novig_daily.csv), so the page's
// transport-health signal reflects a real load. The four settled-outcome series below load
// on a SECOND, undisplayed instance with a try/catch each, so that until the producer
// (build_novig_outcomes.py) runs and its files reach the /opt allowlist, this page renders
// the schedule and framing instead of erroring the whole page or raising a false health
// alarm over files that are simply not published yet. Same pattern as novig.md's fee section.
const daily = await DataAttachment("data/novig_daily.csv").csv({typed: true});

const Outcome = createRemoteDataAttachment(d3);
const load = async name => {
  try { return await Outcome(`data/${name}`).csv({typed: true}); }
  catch (error) {
    console.warn(`novig outcomes: ${name} unavailable — ${String(error?.message ?? error).slice(0, 160)}`);
    return [];
  }
};
const summaryRows = await load("novig_pnl_summary.csv");
const pnlDaily = await load("novig_pnl_daily.csv");
const calib = await load("novig_calibration.csv");
const fixtures = await load("novig_kalshi_same_fixture.csv");
const games = await load("novig_game_leaderboard.csv");
```

```js
const NV = "#6366F1";
const S = summaryRows.length ? summaryRows[0] : null;

const fmtCount = d => Math.abs(d) >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : Math.abs(d) >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : Math.abs(d) >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtUSD = d => { const a = Math.abs(d), s = d < 0 ? "−$" : "$"; return a >= 1e6 ? `${s}${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${s}${(a / 1e3).toFixed(0)}k` : `${s}${a.toFixed(0)}`; };
const fmtCents = d => `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(3)}¢`;
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : String(d).slice(5);
const asDate = d => d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
```

```js
display(S ? html`<div class="grid grid-cols-4">
  <div class="card"><h2>Taker P&amp;L, gross</h2><span class="big">${fmtCents(+S.gross_per_contract)}</span><span class="muted">per contract &middot; ${fmtUSD(+S.gross_pnl)} over ${fmtCount(+S.decisive_contracts)} contracts</span></div>
  <div class="card"><h2>After the live fee</h2><span class="big">${fmtCents(+S.gross_per_contract)} to ${fmtCents(+S.net_pnl_lo / +S.decisive_contracts)}</span><span class="muted">per contract, gross to fee ceiling &mdash; the feed can't split live from free pre-game trades</span></div>
  <div class="card"><h2>A real edge?</h2><span class="big">${+S.measurable ? "Yes" : "No"}</span><span class="muted">${+S.measurable ? "clears" : "does not clear"} 2 SE &mdash; fixture-clustered t = ${(+S.t_stat).toFixed(2)}</span></div>
  <div class="card"><h2>Settled coverage</h2><span class="big">${(+S.straight_join_rate).toFixed(1)}%</span><span class="muted">of straight prints join an outcome &middot; ${(+S.parlay_share_contracts).toFixed(0)}% of taker contracts are excluded parlays</span></div>
</div>`
: html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>The settled-outcome series are not being served yet, so there are no numbers on this page.</strong> The producer is built and registered; the deployed transport allowlist does not carry these files yet. The framing below is true either way: Novig publishes an aggressor flag and, on straight contracts, a settled WIN/LOSS, which is what makes taker P&amp;L and calibration possible here at all.</div>`);
```

## How straight-contract takers did

<div class="instruction-line">Cumulative gross taker P&amp;L on settled straight contracts; the shaded band is how much the live-straight fee could take off it.</div>

```js
if (pnlDaily.length) {
  let cg = 0, cl = 0;
  const rows = pnlDaily.slice().sort((a, b) => asDate(a.date) - asDate(b.date)).map(d => {
    cg += +d.gross_pnl || 0;
    cl += +d.net_pnl_lo || 0;
    return {date: asDate(d.date), grossCum: cg, netLoCum: cl, makerCum: -cg, gross: +d.gross_pnl || 0, contracts: +d.decisive_contracts || 0};
  });
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"}, width, height: 340, marginLeft: 72, marginBottom: 36,
    x: {label: null, type: "utc", tickFormat: "%b %d"},
    y: {label: "Cumulative taker P&L ($)", grid: true, tickFormat: d => fmtUSD(d)},
    marks: [
      Plot.areaY(rows, {x: "date", y1: "netLoCum", y2: "grossCum", fill: NV, fillOpacity: 0.14, curve: "monotone-x"}),
      Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
      Plot.line(rows, {x: "date", y: "grossCum", stroke: NV, strokeWidth: 2, curve: "monotone-x"}),
      Plot.line(rows, {x: "date", y: "makerCum", stroke: "#1a9641", strokeWidth: 2, curve: "monotone-x"}),
      Plot.line(rows, {x: "date", y: "netLoCum", stroke: NV, strokeWidth: 1, strokeDasharray: "3,2", curve: "monotone-x"}),
      Plot.dot(rows, {x: "date", y: "grossCum", fill: NV, r: 2.5, tip: true,
        title: d => `${fmtDate(d.date)}\ntaker gross: ${fmtUSD(d.grossCum)}\nmaker: ${fmtUSD(d.makerCum)}\ntaker net (fee ceiling): ${fmtUSD(d.netLoCum)}\nthat day: ${fmtUSD(d.gross)} on ${fmtCount(d.contracts)} contracts`})
    ]
  }));
}
```

```js
if (pnlDaily.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Blue is gross taker P&amp;L; the dashed floor is the most the live-straight fee could take off it. <span style="color:#1a9641;font-weight:600">Green is the maker side</span> — its exact mirror, and makers pay no fee, so Novig's liquidity providers made very nearly what takers lost.</div>`);
```

## Biggest games

<div class="instruction-line">The individual games Novig's moneyline takers won and lost the most on. The feed now carries real fixture names, so this is finally per game rather than per contract type. Flip winners and losers; search any team or league.</div>

```js
const gameDir = view(Inputs.radio(["Takers lost", "Takers won"], {value: "Takers lost", label: "Show"}));
```

```js
const gameRows = games
  .filter(d => d.game && Number.isFinite(+d.taker_pnl))
  .filter(d => gameDir === "Takers won" ? +d.taker_pnl > 0 : +d.taker_pnl < 0)
  .sort((a, b) => gameDir === "Takers won" ? +b.taker_pnl - +a.taker_pnl : +a.taker_pnl - +b.taker_pnl);
```

```js
const gameSearch = view(Inputs.search(gameRows, {placeholder: "Search team or league…"}));
```

```js
display(games.length
  ? Inputs.table(gameSearch, {
      columns: ["game", "game_date", "league", "contracts", "taker_pnl", "taker_pnl_per_contract", "winner"],
      header: {game: "Game", game_date: "Date", league: "League", contracts: "Contracts", taker_pnl: "Taker P&L", taker_pnl_per_contract: "¢/contract", winner: "Won"},
      format: {contracts: d => fmtCount(+d), taker_pnl: d => fmtUSD(+d), taker_pnl_per_contract: d => fmtCents(+d)},
      align: {contracts: "right", taker_pnl: "right", taker_pnl_per_contract: "right"},
      width: {game: 230}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The game leaderboard series is not being served yet.</div>`);
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Moneyline, straight, taker-side only, over the ~two-week window; P&amp;L is gross. The maker side made the mirror of each figure. This is the Novig counterpart of Kalshi's market leaderboard, which its nameless market ids used to make impossible.</div>

## Are Novig's prices calibrated?

<div class="instruction-line">Decisive contracts only; each dot is the price actually paid in a 5&cent; band against the realised win rate, so points on the diagonal are perfectly priced.</div>

```js
if (calib.length) {
  const rows = calib.filter(d => d.group === "ALL" && (+d.bin_width === 5) && +d.n_contracts > 0)
    .map(d => {
      const paid = +d.sum_price_contracts / +d.n_contracts / 100;
      const win = +d.actual_win_rate_wt, se = +d.se_clustered;
      return {bin: +d.price_bin, paid, win, se: Number.isFinite(se) ? se : null, contracts: +d.n_contracts};
    }).sort((a, b) => a.paid - b.paid);
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"}, width, height: Math.max(360, Math.min(500, width * 0.7)),
    marginLeft: 56, marginBottom: 46,
    x: {label: "Price paid", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}¢`, grid: true},
    y: {label: "Realised win rate", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
    marks: [
      Plot.line([{x: 0, y: 0}, {x: 1, y: 1}], {x: "x", y: "y", stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1.5}),
      Plot.ruleX(rows.filter(d => d.se != null), {x: "paid", y1: d => d.win - 2 * d.se, y2: d => d.win + 2 * d.se, stroke: NV, strokeOpacity: 0.4}),
      Plot.dot(rows, {x: "paid", y: "win", fill: NV, r: 5, fillOpacity: 0.82, stroke: "var(--theme-background)", strokeWidth: 0.9, tip: true,
        title: d => `${d.bin}–${d.bin + 5}¢ bin\npaid ${(d.paid * 100).toFixed(1)}¢ · won ${(d.win * 100).toFixed(1)}%\n${fmtCount(d.contracts)} contracts`})
    ]
  }));
}
```

```js
if (calib.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Bars are ±2 fixture-clustered standard errors; a bar spanning the diagonal is not distinguishable from a fair price. The price paid is used, not the bin midpoint, so the tails are not flattered.</div>`);
```

## Same game, two venues

<div class="instruction-line">Pre-game moneyline price — the last trade before first pitch — for the same MLB game on Novig and Kalshi. Points on the diagonal mean the two books agreed.</div>

```js
const fxRows = fixtures.filter(d => d.prob_diff != null && Number.isFinite(+d.prob_diff) && d.kalshi_home_prob != null && d.novig_home_prob != null);
const fxGaps = fxRows.map(d => Math.abs(+d.prob_diff)).sort((a, b) => a - b);
const fxMed = fxGaps.length ? fxGaps[Math.floor(fxGaps.length / 2)] : null;
const fxWithin1 = fxRows.length ? fxRows.filter(d => Math.abs(+d.prob_diff) <= 0.01).length / fxRows.length : null;
const fxRatios = fxRows.filter(d => +d.novig_contracts > 0 && +d.kalshi_contracts > 0).map(d => +d.kalshi_contracts / +d.novig_contracts).sort((a, b) => a - b);
const fxVolMult = fxRatios.length ? fxRatios[Math.floor(fxRatios.length / 2)] : null;
```

```js
display(fxRows.length
  ? html`<div class="grid grid-cols-4">
      <div class="card"><h2>MLB games compared</h2><span class="big">${fxRows.length}</span><span class="muted">both venues priced pre-game</span></div>
      <div class="card"><h2>Median price gap</h2><span class="big">${(100 * fxMed).toFixed(2)}¢</span><span class="muted">on P(home win)</span></div>
      <div class="card"><h2>Agree within 1¢</h2><span class="big">${Math.round(100 * fxWithin1)}%</span><span class="muted">of games</span></div>
      <div class="card"><h2>Kalshi volume</h2><span class="big">${fxVolMult == null ? "—" : "~" + fxVolMult.toFixed(0) + "×"}</span><span class="muted">Novig's, per game (median)</span></div>
    </div>`
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The same-game comparison series is not being served yet.</div>`);
```

```js
if (fxRows.length) display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: Math.max(360, Math.min(520, width * 0.7)),
  marginLeft: 58, marginBottom: 46, aspectRatio: 1,
  x: {label: "Kalshi pre-game P(home win)", domain: [0.2, 0.8], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  y: {label: "Novig pre-game P(home win)", domain: [0.2, 0.8], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  r: {range: [2, 10]},
  marks: [
    Plot.line([{x: 0.2, y: 0.2}, {x: 0.8, y: 0.8}], {x: "x", y: "y", stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1.5}),
    Plot.dot(fxRows, {x: d => +d.kalshi_home_prob, y: d => +d.novig_home_prob, r: d => +d.novig_contracts + +d.kalshi_contracts, fill: NV, fillOpacity: 0.5, stroke: "var(--theme-background)", strokeWidth: 0.6, tip: true,
      title: d => `${d.away_team} @ ${d.home_team}\n${d.game_date}\nKalshi ${(100 * +d.kalshi_home_prob).toFixed(1)}% · Novig ${(100 * +d.novig_home_prob).toFixed(1)}%\ngap ${+d.prob_diff >= 0 ? "+" : "−"}${Math.abs(100 * +d.prob_diff).toFixed(1)}¢\nNovig ${fmtCount(+d.novig_contracts)} · Kalshi ${fmtCount(+d.kalshi_contracts)} contracts`})
  ]
}));
```

```js
if (fxRows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The two books price the same MLB games almost identically — within a cent on ${Math.round(100 * fxWithin1)}% of games — though Kalshi trades roughly ${fxVolMult == null ? "many" : fxVolMult.toFixed(0)}× Novig's contracts per game. Straight moneylines only; price is the last trade before first pitch, as the home team's win probability. Dots are sized by combined volume.</div>`);
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Straight contracts only, and this is not a rounding caveat.</strong> Novig's parlays are quoted by request and never become book markets, so not one of them resolves in the feed. They are ${S ? `${(+S.parlay_share_contracts).toFixed(0)}% of taker contracts (and only ${(+S.parlay_share_dollars).toFixed(0)}% of taker dollars — parlay contracts are cheap longshots)` : "about a third of taker contracts, and only a few percent of taker dollars"}, so everything here covers roughly the straight ${S ? (100 - +S.parlay_share_contracts).toFixed(0) : "60"}% of contract volume. It is never a venue-wide figure.</p>
  <p><strong>What made this possible.</strong> Novig is the only competitor that publishes an aggressor flag — every trade is tagged taker or maker — and the public GraphQL snapshot now supplies the settled WIN/LOSS the trade file never had. Both together are what make this <em>true taker</em> P&L, not the price-bias proxy other venues are limited to. Only the taker side of each trade is counted; each trade appears twice and summing both would double the venue.</p>
  <p><strong>Gross is the headline; net is a band.</strong> There is no settlement fee — a winning contract pays the full $1.00. Novig charges the taker <code>0.03 × P × (1−P)</code> on <em>live</em> straights and nothing pre-game, and the feed carries no live/pre-game flag, so the true fee lies between zero and the ceiling drawn above. Because every window here is a loss and a fee only deepens a loss, gross is the conservative figure and net is more negative.</p>
  <p><strong>The status column is free text.</strong> It holds WIN, LOSS and TBD <em>and</em> numeric fair-value prices in one column; a naive equality filter would score every fair-value settlement as a loss. Decisive WIN/LOSS contracts drive both charts; the ${S ? fmtCount(+S.fmv_contracts) : "few"} fair-value-settled contracts are P&amp;L-computable (${S ? fmtUSD(+S.fmv_pnl) : "a small amount"}, folded into the daily gross) but have no binary outcome, so they are excluded from calibration.</p>
  <p><strong>Measurability.</strong> Thousands of prints on one game share a single outcome, so the standard error clusters on the fixture, not the print. ${S ? html`The whole-sample loss of <strong>${fmtCents(+S.gross_per_contract)}</strong> per contract stands at t = ${(+S.t_stat).toFixed(2)} against a fixture-clustered SE of ${(100 * +S.se_clustered).toFixed(3)}¢` : "The whole-sample loss is tested against a fixture-clustered standard error"} — ${S && +S.measurable ? "it clears two, so the edge is real, if modest" : "read the card above for whether it clears two"}. Individual price bins are noisier and most do not clear on their own; that is expected across twenty bins and is why the venue-level test is the one that decides.</p>
  <p><strong>A short, forward-only history.</strong> Novig regenerated every identifier at its 2026-08-04 move to a CFTC-regulated exchange, so nothing joins before then and the series is about two weeks long — expected, not a gap. Settlement is read from the current snapshot; a daily re-pull can re-grade a market, so history can shift slightly. The GraphQL source is announced as sunsetting, and the model here is written so the transport can later move to Novig's keyed API without changing what these charts show.</p>
  <p><strong>The same-game comparison is a constructed join.</strong> Kalshi publishes no fixture id, so games are matched on date and unordered team pair through a hand-checked team crosswalk — MLB only, and it covers the games both venues list. Each side's price is the last straight moneyline trade strictly before the scheduled first pitch: one pre-game snapshot, not a close. Volume is one-sided contracts on each venue's own convention, so the ratio is indicative, not a like-for-like count.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: this series next to every other venue on <a href="./pnl-venues">Cross-Venue P&amp;L</a> and <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>; Novig's volume, fees and parlay length on <a href="./novig">Novig · Activity</a>.</div>
