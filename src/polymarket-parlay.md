---
title: Polymarket US Parlay P&L
---

# Polymarket US Parlay P&L

How Polymarket US parlay bettors actually do. Every contract is priced at what was really paid for it, taken from the venue's own time-and-sales tape.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD   = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const bins  = await DataAttachment("data/polymarket_parlay_pnl.csv").csv({typed: true});
const daily = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "polymarket_parlay_pnl.csv"), meta: "Settlement-dependent; resolved contracts only", tone: "competitor"}
  ],
  note: "A parlay counts here only once it has matured, so recent days keep moving."
}));
display(askPageLink({
  question: "Analyze Polymarket US parlay taker P&L by price bin, noting how much of the volume has actually resolved.",
  context: "Polymarket US parlay P&L page using polymarket_parlay_pnl.csv and polymarket_parlay_daily.csv."
}));
```

```js
// Headline figures. contracts/pnl are resolved-only; the daily series is all traded volume.
const totalContracts = d3.sum(bins, d => d.contracts);
const totalPnl       = d3.sum(bins, d => d.pnl);
const totalStake     = d3.sum(bins, d => d.contracts * d.price_paid);
const pctOfStake     = totalStake ? totalPnl / totalStake * 100 : 0;
const meta           = bins[0] ?? {};
const provDaily       = daily.filter(d => !d.complete);
const settled         = daily.filter(d => d.complete);
// Read from `settled`, not `daily`. This was the ONE place on the page the provisional day
// was not excluded — every chart below deliberately draws those as hollow dots. A partial
// day understates the share, because the venue total it divides into settles first, so the
// KPI read low against the last complete day (2.0 points apart when measured 2026-08-25).
const latestShare     = settled.length ? settled[settled.length - 1].pct_of_venue : 0;
```

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Realized taker P&L</div>
    <div class="kpi-value">${fmtUSD(totalPnl)}</div>
    <div class="kpi-meta">resolved parlays only</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Return on stakes</div>
    <div class="kpi-value">${pctOfStake.toFixed(1)}%</div>
    <div class="kpi-meta">95% CI ${meta.ci_lo_pct?.toFixed(1)}% to ${meta.ci_hi_pct?.toFixed(1)}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Staked</div>
    <div class="kpi-value">${fmtUSD(totalStake)}</div>
    <div class="kpi-meta">${fmtCount(totalContracts)} contracts</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Resolved so far</div>
    <div class="kpi-value">${meta.pct_resolved?.toFixed(1)}%</div>
    <div class="kpi-meta">clearing-date report basis</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Share of venue volume</div>
    <div class="kpi-value">${latestShare?.toFixed(1)}%</div>
    <div class="kpi-meta">most recent complete day</div>
  </div>
</div>

```js
// The single most important caveat on this page, so it sits directly under the KPIs.
display(html`<div class="chart-note" style="border-left:3px solid var(--accent-negative); padding-left:.75rem;">
  ○ On the clearing-date report basis, only <strong>${meta.pct_resolved?.toFixed(1)}%</strong> of
  parlay volume has matured. The P&L is a real figure for that settled cohort, not an estimate of
  the eventual total; trade-date tape totals use a different date basis and are not mixed into this percentage.
</div>`);
```

## What they paid versus what they won

_Each dot is a 5¢ price bin, sized by volume; below the dashed line means bettors paid more than the outcome turned out to be worth._

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 340, marginLeft: 60,
  x: {label: "Price paid (probability)", domain: [0, 1], grid: true, tickFormat: ".0%"},
  y: {label: "Actual win rate", domain: [0, 1], grid: true, tickFormat: ".0%"},
  marks: [
    Plot.line([[0, 0], [1, 1]], {stroke: "var(--theme-foreground-fainter)", strokeDasharray: "3,3"}),
    Plot.dot(bins, {x: "price_paid", y: "win_rate", r: d => Math.sqrt(d.contracts) / 260,
                    fill: "var(--accent-polymarket)", fillOpacity: 0.75, stroke: "var(--accent-polymarket)"}),
    Plot.tip(bins, Plot.pointer({x: "price_paid", y: "win_rate",
      title: d => `${d.price_bin}-${d.price_bin + 5}c\nPaid: ${(d.price_paid * 100).toFixed(1)}c\nWon: ${(d.win_rate * 100).toFixed(1)}%\nContracts: ${fmtCount(d.contracts)}\nP&L: ${fmtUSD(d.pnl)}`}))
  ]
}))
```

## Where the money went

_P&L by price bin, which separates the cheap-longshot end from everything else._

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 76,
  x: {label: "Price bin (cents)", tickFormat: d => d + "c"},
  y: {label: "P&L (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.rectY(bins, {x: "price_bin", y: "pnl", interval: 5,
                      fill: d => d.pnl < 0 ? "var(--accent-negative)" : "var(--accent-positive)", fillOpacity: 0.85}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(bins, Plot.pointerX({x: "price_bin", y: "pnl",
      title: d => `${d.price_bin}-${d.price_bin + 5}c\nP&L: ${fmtUSD(d.pnl)}\nPer contract: ${(d.pnl_per_contract * 100).toFixed(2)}c\nContracts: ${fmtCount(d.contracts)}`}))
  ]
}))
```

## Daily stakes

_Dollars staked on parlays each day; the hollow point is a day still being collected._

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Staked (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.areaY(settled, {x: "date", y: "stake_usd", fill: "var(--accent-polymarket)", fillOpacity: 0.15, curve: "monotone-x"}),
    Plot.lineY(settled, {x: "date", y: "stake_usd", stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(provDaily, {x: "date", y: "stake_usd", r: 4, fill: "var(--theme-background)", stroke: "var(--accent-polymarket)", strokeWidth: 2}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(daily, Plot.pointerX({x: "date", y: "stake_usd",
      title: d => `${fmtDate(d.date)}\nStaked: ${fmtUSD(d.stake_usd)}\nContracts: ${fmtCount(d.contracts)}\nTrades: ${fmtCount(d.trades)}${d.complete ? "" : "\n(still collecting)"}`}))
  ]
}))
```

## Parlays as a share of Polymarket volume

_Parlays went from nothing to roughly a quarter of everything traded on the venue in under three weeks._

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 280, marginLeft: 60,
  x: {type: "utc", label: null},
  y: {label: "Share of venue contracts", grid: true, tickFormat: d => (d * 100).toFixed(0) + "%"},
  marks: [
    Plot.areaY(settled, {x: "date", y: d => d.pct_of_venue / 100, fill: "var(--accent-polymarket)", fillOpacity: 0.15, curve: "monotone-x"}),
    Plot.lineY(settled, {x: "date", y: d => d.pct_of_venue / 100, stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(provDaily, {x: "date", y: d => d.pct_of_venue / 100, r: 4, fill: "var(--theme-background)", stroke: "var(--accent-polymarket)", strokeWidth: 2}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(daily, Plot.pointerX({x: "date", y: d => d.pct_of_venue / 100,
      title: d => `${fmtDate(d.date)}\nParlays: ${d.pct_of_venue.toFixed(2)}% of venue\nParlay contracts: ${fmtCount(d.contracts)}`}))
  ]
}))
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p>Parlays are the venue's <code>caoc</code> contracts. They are quoted by the house on request, so the customer is necessarily the buyer and buyer P&L is taker P&L — the same footing on which Crypto.com combos are published. Outcomes come from the daily market report; the price paid for every contract comes from the venue's own time-and-sales tape, joined on symbol, so no bin midpoint or bid-range estimate is involved (<code>basis = ${meta.basis}</code>). A parlay counts only once it has matured on a prior business day; positions closed out early are quarantined rather than scored, and are ${meta.pct_terminated?.toFixed(3)}% of matured volume.</p>
</details>
