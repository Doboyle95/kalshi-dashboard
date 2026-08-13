---
title: Novig
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>Novig</h1>
  <p class="page-lead">A commission-free peer-to-peer sports exchange that launched in early August 2026. This page covers what trades there, how it splits between takers and makers, and how much of it is parlays &mdash; plus the one number that makes Novig unusual: <strong>the spread it charges, which measures as zero</strong>.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/novig_daily.csv").csv({typed: true});
const tm = await DataAttachment("data/novig_taker_maker_daily.csv").csv({typed: true});
const parlay = await DataAttachment("data/novig_parlay_daily.csv").csv({typed: true});
const board = await DataAttachment("data/novig_market_leaderboard.csv").csv({typed: true});
```

```js
const NV = "#6366F1";
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;

const totalContracts = d3.sum(daily, d => d.contracts);
const meanEdge = tm.length ? d3.mean(tm, d => d.implied_edge) : null;
// Parlay share is computed from the leg breakdown: anything with more than one leg.
const parlayTotal = d3.sum(parlay.filter(d => d.legs > 1), d => d.contracts);
const parlayAll = d3.sum(parlay, d => d.contracts);
const maxLegs = d3.max(parlay, d => d.legs);
```

<div class="grid grid-cols-4">
  <div class="card"><h2>Contracts traded</h2><span class="big">${fmtCount(totalContracts)}</span><span class="muted">${daily.length} days</span></div>
  <div class="card"><h2>Implied spread</h2><span class="big">${meanEdge == null ? "—" : `${(100 * meanEdge).toFixed(2)}%`}</span><span class="muted">measured, not assumed</span></div>
  <div class="card"><h2>Parlays</h2><span class="big">${parlayAll ? `${(100 * parlayTotal / parlayAll).toFixed(1)}%` : "—"}</span><span class="muted">of volume, up to ${maxLegs} legs</span></div>
  <div class="card"><h2>Markets traded</h2><span class="big">${fmtCount(d3.max(daily, d => d.markets_traded) ?? 0)}</span><span class="muted">busiest day</span></div>
</div>

## Daily volume

```js
Plot.plot({
  width,
  height: 320,
  marginLeft: 64,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(daily, {
      x: "date", y: "contracts", fill: NV, interval: "day",
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.markets_traded)} of ${d3.format(",")(d.markets_listed)} listed markets traded\nopen interest ${d3.format(",.0f")(d.open_interest)}`,
      tip: true
    })
  ]
})
```

## The spread Novig charges

<div class="instruction-line">On a two-sided exchange the venue's cut shows up as the amount by which the two sides' prices exceed 1.00. This is <strong>computed from the tape every run rather than hardcoded</strong>: mean taker price plus mean maker price, minus one. If Novig ever starts taking a spread, this line moves on its own instead of continuing to publish a zero.</div>

```js
Plot.plot({
  width,
  height: 260,
  marginLeft: 64,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Implied spread (%)", grid: true, tickFormat: d => `${(100 * d).toFixed(2)}%`},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(tm, {x: "date", y: "implied_edge", stroke: NV, strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(tm, {
      x: "date", y: "implied_edge", fill: NV, r: 4,
      stroke: "var(--theme-background)", strokeWidth: 2,
      title: d => `${fmtDate(d.date)}\nimplied spread ${(100 * d.implied_edge).toFixed(4)}%\nmean taker price ${d.mean_taker_price.toFixed(4)}\nmean maker price ${d.mean_maker_price.toFixed(4)}\n${d3.format(",")(d.taker_trades)} taker / ${d3.format(",")(d.maker_trades)} maker prints`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Flat on zero. Every other venue on this site charges something &mdash; see <a href="./fees">fee revenue</a> for what that costs traders elsewhere.</div>

## Parlays by leg count

```js
const legAgg = Array.from(d3.rollup(parlay, v => d3.sum(v, d => d.contracts), d => d.legs), ([legs, contracts]) => ({legs, contracts})).sort((a, b) => a.legs - b.legs);
```

```js
Plot.plot({
  width,
  height: 280,
  marginLeft: 64,
  marginBottom: 44,
  x: {label: "Legs", type: "band"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(legAgg, {
      x: "legs", y: "contracts", fill: NV, ry2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.legs === 1 ? "Single-leg" : `${d.legs}-leg parlays`}\n${d3.format(",.0f")(d.contracts)} contracts`,
      tip: true
    })
  ]
})
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>The zero spread is measured, not taken from a press release.</strong> Across 92,087 paired trade groups the mean of taker price plus maker price came to 1.0000, with no group outside 0.98&ndash;1.05 &mdash; an implied venue cut of 0.00%. That matches the public record, since Novig launched commission-free, but the reporting qualifies it as a current state, so the producer recomputes it daily rather than writing a constant.</p>
  <p><strong>Every trade appears twice</strong> in Novig's feed, once as the taker and once as the maker. Volume, trade sizes and leaderboard totals here are <strong>taker-side only</strong>; summing both would double the venue. The one place both sides are used deliberately is the spread above, which is about the two sides by definition. The daily volume is verified against Novig's own <code>dailyVolume</code> figure on every date and the build fails if they ever diverge.</p>
  <p><strong>No calibration or P&amp;L, and this will not change without a feed change.</strong> Novig publishes no settlement outcome anywhere. Markets carry a status and a closing price, but on finalised markets that price spreads across the whole range &mdash; thousands of rows sit in the 0&ndash;9 band and hundreds in the 90&ndash;99 band, with only a handful at either extreme. That is a last traded price, not a resolution, and it must not be dressed up as one. Novig is the frustrating inverse of most venues here: it publishes who was the aggressor on every trade, which almost nobody does, but never publishes who won.</p>
  <p><strong>The leaderboard is keyed on contract type, not on individual markets.</strong> Novig's market identifiers are bare UUIDs and the feed carries no per-event name &mdash; no teams, no fixture, no description. The only published label is a series ticker covering many markets at once, so a per-market board would have produced a thousand rows sharing about 126 repeating names. Keyed on the contract type instead, every label is meaningful and the chart answers a real question: what does Novig actually trade?</p>
</details>

## What trades there

```js
Inputs.table(board.slice(0, 40), {
  columns: ["market_name", "category", "n_outcomes", "contracts", "last_trade_date"],
  header: {market_name: "Contract type", category: "League", n_outcomes: "Markets", contracts: "Contracts", last_trade_date: "Last trade"},
  format: {
    contracts: d => d3.format(",.0f")(d),
    n_outcomes: d => d3.format(",")(d),
    last_trade_date: d => fmtDate(d)
  },
  align: {contracts: "right", n_outcomes: "right"},
  width: {market_name: 240},
  rows: 12
})
```
