---
title: Polymarket US Parlay P&L
---

# Polymarket US Parlay P&L

How Polymarket US parlay bettors actually do.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD   = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const bins     = await DataAttachment("data/polymarket_parlay_pnl.csv").csv({typed: true});
const daily    = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
const dailyPnl = await DataAttachment("data/polymarket_parlay_pnl_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L", date: latestDate(dailyPnl), updatedAt: fileUpdatedAt(freshness, "polymarket_parlay_pnl_daily.csv"), meta: "Settlement-dependent; resolved contracts only", tone: "competitor"}
  ],
  note: "A parlay counts here only once it has matured, so recent days keep moving."
}));
display(askPageLink({
  question: "Analyze Polymarket US parlay taker P&L over time and by price bin, before and after fees, noting how much of the volume has actually resolved.",
  context: "Polymarket US parlay P&L page using polymarket_parlay_pnl.csv, polymarket_parlay_pnl_daily.csv and polymarket_parlay_daily.csv."
}));
```

```js
// Headline figures. contracts/pnl are resolved-only; the daily volume series (`daily`) is
// all traded volume on its own transaction-date basis -- see the clearing-vs-transaction
// note below before comparing dates across charts on this page.
const totalContracts = d3.sum(bins, d => d.contracts);
const totalPnlGross  = d3.sum(bins, d => d.pnl);
const totalFees      = d3.sum(bins, d => d.fees ?? 0);
const totalPnl       = d3.sum(bins, d => d.pnl_net ?? d.pnl);
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
    <div class="kpi-meta">resolved parlays only, after est. fees</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Before fees</div>
    <div class="kpi-value">${fmtUSD(totalPnlGross)}</div>
    <div class="kpi-meta">fee drag: ${fmtUSD(totalFees)}</div>
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
  Fees are estimated at Polymarket's standard taker rate (<code>6% × p × (1−p)</code> per contract) —
  the venue publishes no fee schedule specific to combos, so this is the general-market rate applied
  by assumption, not a confirmed combo rate.
</div>`);
```

## What parlay bettors realized, before and after fees

_Running total of resolved parlay P&L on the clearing-date report basis — **not** the same date axis as the daily-stakes chart further down, which is transaction-dated off the tape. The lighter dashed line is before fees; the solid line is after — the gap between them is the fee drag. Settled parlays only; a day here is when outcomes were published, not when the parlay was bought._

```js
const dpSorted = dailyPnl.slice().sort((a, b) => a.date - b.date);
let _pg = 0, _pn = 0;
const cumDailyPnl = dpSorted.map(d => { _pg += d.pnl_gross; _pn += d.pnl_net; return {date: d.date, gross: _pg, net: _pn}; });
```

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative realized P&L (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.areaY(cumDailyPnl, {x: "date", y: "net", fill: "var(--accent-polymarket)", fillOpacity: 0.1, curve: "monotone-x"}),
    Plot.lineY(cumDailyPnl, {x: "date", y: "gross", stroke: "var(--accent-polymarket)", strokeOpacity: 0.5, strokeDasharray: "4,3", strokeWidth: 2, curve: "monotone-x"}),
    Plot.lineY(cumDailyPnl, {x: "date", y: "net", stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumDailyPnl, Plot.pointerX({x: "date", y: "net",
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.gross)}\nAfter fees: ${fmtUSD(d.net)}`}))
  ]
}))
```

## Daily realized P&L

_Each bar is that day's resolved parlay P&L, after fees — same clearing-date basis as the chart above. Green days beat the house; red days didn't._

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 280, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily realized P&L, after fees (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.rectY(dpSorted, {x1: "date", x2: d => new Date(d.date.getTime() + 864e5), y: "pnl_net",
      fill: d => d.pnl_net < 0 ? "var(--accent-negative)" : "var(--accent-positive)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.pnl_gross)}\nAfter fees: ${fmtUSD(d.pnl_net)}\nStaked: ${fmtUSD(d.stake)}\nContracts: ${fmtCount(d.contracts)}` + (d.terminated_contracts ? `\nExcluded (early-terminated): ${fmtCount(d.terminated_contracts)} contracts` : "")}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"})
  ]
}))
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

_Dollars staked on parlays each day; the hollow point is a day still being collected. Transaction-date basis (off the tape) — a different date axis from the realized-P&L charts above, which use the clearing-date report basis._

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
  <p>Parlays are the venue's <code>caoc</code> contracts. They are quoted by the house on request, so the customer is necessarily the buyer and buyer P&L is taker P&L — the same footing on which Crypto.com combos are published. Outcomes come from the daily market report; the price paid for every contract comes from the venue's own time-and-sales tape, joined on symbol, so no bin midpoint or bid-range estimate is involved (<code>basis = ${meta.basis}</code>). Fees are estimated at the venue's standard taker rate (<code>6% × p × (1−p)</code> per contract) since combos carry no published fee schedule of their own — treat the after-fee figures as directional, not a confirmed venue disclosure.</p>
  <p>A parlay counts only once it has matured on a prior business day. Some positions close out early — a real trade against the house that drives the position's open interest to zero, the same underlying mechanism as a Kalshi cash-out — and those are quarantined rather than scored: ${meta.pct_terminated?.toFixed(3)}% of matured volume. Unlike Kalshi, this venue's trade tape carries no side/aggressor column, so a closing trade can't be identified directly the way a Kalshi cash-out is; only full closes that also get their maturity date backdated in the daily report are caught here, so this is a narrower net than a complete cash-out accounting would be. There is no held-to-settlement comparison on this page.</p>
</details>
