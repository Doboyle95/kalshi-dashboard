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
    return {date: asDate(d.date), grossCum: cg, netLoCum: cl, gross: +d.gross_pnl || 0, contracts: +d.decisive_contracts || 0};
  });
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"}, width, height: 340, marginLeft: 72, marginBottom: 36,
    x: {label: null, type: "utc", tickFormat: "%b %d"},
    y: {label: "Cumulative taker P&L ($)", grid: true, tickFormat: d => fmtUSD(d)},
    marks: [
      Plot.areaY(rows, {x: "date", y1: "netLoCum", y2: "grossCum", fill: NV, fillOpacity: 0.14, curve: "monotone-x"}),
      Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
      Plot.line(rows, {x: "date", y: "grossCum", stroke: NV, strokeWidth: 2, curve: "monotone-x"}),
      Plot.line(rows, {x: "date", y: "netLoCum", stroke: NV, strokeWidth: 1, strokeDasharray: "3,2", curve: "monotone-x"}),
      Plot.dot(rows, {x: "date", y: "grossCum", fill: NV, r: 2.5, tip: true,
        title: d => `${fmtDate(d.date)}\ncumulative gross: ${fmtUSD(d.grossCum)}\ncumulative net (fee ceiling): ${fmtUSD(d.netLoCum)}\nthat day: ${fmtUSD(d.gross)} on ${fmtCount(d.contracts)} contracts`})
    ]
  }));
}
```

```js
if (pnlDaily.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Solid is gross; the dashed floor assumes every straight trade was in-game (the most the fee could be). The truth is between them, and closer to gross the more trading happens pre-game.</div>`);
```

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

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Straight contracts only, and this is not a rounding caveat.</strong> Novig's parlays are quoted by request and never become book markets, so not one of them resolves in the feed. They are ${S ? `${(+S.parlay_share_contracts).toFixed(0)}% of taker contracts (and only ${(+S.parlay_share_dollars).toFixed(0)}% of taker dollars — parlay contracts are cheap longshots)` : "about a third of taker contracts, and only a few percent of taker dollars"}, so everything here covers roughly the straight ${S ? (100 - +S.parlay_share_contracts).toFixed(0) : "60"}% of contract volume. It is never a venue-wide figure.</p>
  <p><strong>What made this possible.</strong> Novig is the only competitor that publishes an aggressor flag — every trade is tagged taker or maker — and the public GraphQL snapshot now supplies the settled WIN/LOSS the trade file never had. Both together are what make this <em>true taker</em> P&L, not the price-bias proxy other venues are limited to. Only the taker side of each trade is counted; each trade appears twice and summing both would double the venue.</p>
  <p><strong>Gross is the headline; net is a band.</strong> There is no settlement fee — a winning contract pays the full $1.00. Novig charges the taker <code>0.03 × P × (1−P)</code> on <em>live</em> straights and nothing pre-game, and the feed carries no live/pre-game flag, so the true fee lies between zero and the ceiling drawn above. Because every window here is a loss and a fee only deepens a loss, gross is the conservative figure and net is more negative.</p>
  <p><strong>The status column is free text.</strong> It holds WIN, LOSS and TBD <em>and</em> numeric fair-value prices in one column; a naive equality filter would score every fair-value settlement as a loss. Decisive WIN/LOSS contracts drive both charts; the ${S ? fmtCount(+S.fmv_contracts) : "few"} fair-value-settled contracts are P&amp;L-computable (${S ? fmtUSD(+S.fmv_pnl) : "a small amount"}, folded into the daily gross) but have no binary outcome, so they are excluded from calibration.</p>
  <p><strong>Measurability.</strong> Thousands of prints on one game share a single outcome, so the standard error clusters on the fixture, not the print. ${S ? html`The whole-sample loss of <strong>${fmtCents(+S.gross_per_contract)}</strong> per contract stands at t = ${(+S.t_stat).toFixed(2)} against a fixture-clustered SE of ${(100 * +S.se_clustered).toFixed(3)}¢` : "The whole-sample loss is tested against a fixture-clustered standard error"} — ${S && +S.measurable ? "it clears two, so the edge is real, if modest" : "read the card above for whether it clears two"}. Individual price bins are noisier and most do not clear on their own; that is expected across twenty bins and is why the venue-level test is the one that decides.</p>
  <p><strong>A short, forward-only history.</strong> Novig regenerated every identifier at its 2026-08-04 move to a CFTC-regulated exchange, so nothing joins before then and the series is about two weeks long — expected, not a gap. Settlement is read from the current snapshot; a daily re-pull can re-grade a market, so history can shift slightly. The GraphQL source is announced as sunsetting, and the model here is written so the transport can later move to Novig's keyed API without changing what these charts show.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: this series next to every other venue on <a href="./pnl-venues">Cross-Venue P&amp;L</a> and <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>; Novig's volume, fees and parlay length on <a href="./novig">Novig · Activity</a>.</div>
