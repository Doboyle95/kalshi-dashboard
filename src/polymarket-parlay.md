---
title: Polymarket US Parlay P&L
---

# Polymarket US Parlay P&L

How Polymarket US parlay bettors actually do.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD   = n => { const a = Math.abs(n ?? 0); return ((n ?? 0) < 0 ? "−" : "") + (a > 0 && a < 0.5 ? "<$1" : "$" + fmtCount(a)); };
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
import {dateBrush, inDateRange} from "./components/date-brush.js";
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
// Headline figures: bets (buys) on parlays with a result, after cash-outs. The daily volume
// series (`daily`) counts every trade, cash-outs included; everything is dated by transaction
// date (build_polymarket_parlay.py, rebuilt 2026-09-27).
const totalContracts = d3.sum(bins, d => d.contracts);
const totalPnlGross  = d3.sum(bins, d => d.pnl);
const totalFees      = d3.sum(bins, d => d.fees ?? 0);
const totalPnl       = d3.sum(bins, d => d.pnl_net ?? d.pnl);
const totalStake     = d3.sum(bins, d => d.contracts * d.price_paid);
const pctOfStake     = totalStake ? totalPnl / totalStake * 100 : 0;
// Held-to-settlement counterfactual, before fees (pnl_held exists from the 2026-09-27 rebuild on).
const heldPnl        = bins.some(d => d.pnl_held != null) ? d3.sum(bins, d => d.pnl_held) : NaN;
const heldPct        = totalStake && Number.isFinite(heldPnl) ? `${(100 * heldPnl / totalStake).toFixed(1)}%` : "—";
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
    <div class="kpi-meta">after cash-outs and est. fees</div>
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
    <div class="kpi-meta">of stakes have a result</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Share of venue volume</div>
    <div class="kpi-value">${latestShare?.toFixed(1)}%</div>
    <div class="kpi-meta">most recent complete day</div>
  </div>
</div>

```js
display(html`<div class="chart-note">Every bet counts at the price paid, and a cashed-out bet at the price it was cashed out at. Fees are estimated at Polymarket's standard taker rate.</div>`);
```

## What parlay bettors realized, before and after fees

_Running total by the day each parlay was bought; the dashed line is before fees. Recent days keep moving as their parlays settle._

```js
const dpSorted = dailyPnl.slice().sort((a, b) => a.date - b.date);
let _pg = 0, _pn = 0;
const cumDailyPnl = dpSorted.map(d => { _pg += d.pnl_gross; _pn += d.pnl_net; return {date: d.date, gross: _pg, net: _pn}; });
```

```js
const pmCumRange = view(dateBrush({data: dailyPnl, valueAccessor: d => d.stake, color: "var(--accent-polymarket)", width}));
```

```js
const cumDailyPnlShown = cumDailyPnl.filter(inDateRange(pmCumRange));
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative realized P&L (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.areaY(cumDailyPnlShown, {x: "date", y: "net", fill: "var(--accent-polymarket)", fillOpacity: 0.1, curve: "monotone-x"}),
    Plot.lineY(cumDailyPnlShown, {x: "date", y: "gross", stroke: "var(--accent-polymarket)", strokeOpacity: 0.5, strokeDasharray: "4,3", strokeWidth: 2, curve: "monotone-x"}),
    Plot.lineY(cumDailyPnlShown, {x: "date", y: "net", stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumDailyPnlShown, Plot.pointerX({x: "date", y: "net",
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.gross)}\nAfter fees: ${fmtUSD(d.net)}`}))
  ]
}))
```

## Daily realized P&L

_What the parlays bought each day made or lost, after fees. Green days beat the house; red days didn't._

```js
const pmDailyPnlRange = view(dateBrush({data: dailyPnl, valueAccessor: d => d.stake, color: "var(--accent-polymarket)", width}));
```

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 280, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily realized P&L, after fees (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.rectY(dpSorted.filter(inDateRange(pmDailyPnlRange)), {x1: "date", x2: d => new Date(d.date.getTime() + 864e5), y: "pnl_net",
      fill: d => d.pnl_net < 0 ? "var(--accent-negative)" : "var(--accent-positive)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.pnl_gross)}\nAfter fees: ${fmtUSD(d.pnl_net)}\nStaked: ${fmtUSD(d.stake)}\nContracts: ${fmtCount(d.contracts)}` + (d.terminated_contracts ? `\nLeft out (settled at an in-between price): ${fmtCount(d.terminated_contracts)} contracts` : "")}),
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

## What bettors lost, by the price they paid

```js
// Loaded inside this section on purpose: build_chart_catalog.py credits a series to the nearest
// ## heading PRECEDING its DataAttachment call. A failed load shows the empty-state note instead.
const lossRows = await DataAttachment("data/competitor_parlay_pnl_by_price_daily.csv").csv({typed: true}).catch(() => []);
```

_Share of stakes lost at each price after cash-outs and fees, with the dollars under each bar — ${pmLoss.span}._

```js
import {lossByPrice, lossByPriceChart} from "./components/parlay-loss-by-price.js";
// Bands under 0.1% of the money are left out: under 0.1c holds ~0.02% of it and swings on one win.
const pmLoss = lossByPrice(lossRows, "Polymarket US", [], {minShare: 0.001});
display(lossByPriceChart(pmLoss, {width}));
```

## Daily stakes

_Money bet on new parlays each day (cash-outs are not counted as bets); the hollow point is a day still being collected._

```js
const pmStakesRange = view(dateBrush({data: daily, valueAccessor: d => d.buy_stake_usd ?? d.stake_usd, color: "var(--accent-polymarket)", width}));
```

```js
// buy_stake_usd leaves out the trades that close an earlier bet (~20% of parlay trade dollars);
// stake_usd, every trade, is the fallback for a file written before 2026-09-27.
const betStake = d => d.buy_stake_usd ?? d.stake_usd;
const inStakesRange = inDateRange(pmStakesRange);
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Staked (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.areaY(settled.filter(inStakesRange), {x: "date", y: betStake, fill: "var(--accent-polymarket)", fillOpacity: 0.15, curve: "monotone-x"}),
    Plot.lineY(settled.filter(inStakesRange), {x: "date", y: betStake, stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(provDaily.filter(inStakesRange), {x: "date", y: betStake, r: 4, fill: "var(--theme-background)", stroke: "var(--accent-polymarket)", strokeWidth: 2}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(daily.filter(inStakesRange), Plot.pointerX({x: "date", y: betStake,
      title: d => `${fmtDate(d.date)}\nStaked: ${fmtUSD(betStake(d))}` + (d.cashout_stake_usd != null ? `\nCashed out: ${fmtUSD(d.cashout_stake_usd)}` : "") + `\nContracts: ${fmtCount(d.contracts)}\nTrades: ${fmtCount(d.trades)}${d.complete ? "" : "\n(still collecting)"}`}))
  ]
}))
```

## Parlays as a share of Polymarket volume

_Parlays went from nothing to roughly a quarter of everything traded on the venue in under three weeks._

```js
const pmShareRange = view(dateBrush({data: daily, valueAccessor: d => d.contracts, color: "var(--accent-polymarket)", width}));
```

```js
const inShareRange = inDateRange(pmShareRange);
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 280, marginLeft: 60,
  x: {type: "utc", label: null},
  y: {label: "Share of venue contracts", grid: true, tickFormat: d => (d * 100).toFixed(0) + "%"},
  marks: [
    Plot.areaY(settled.filter(inShareRange), {x: "date", y: d => d.pct_of_venue / 100, fill: "var(--accent-polymarket)", fillOpacity: 0.15, curve: "monotone-x"}),
    Plot.lineY(settled.filter(inShareRange), {x: "date", y: d => d.pct_of_venue / 100, stroke: "var(--accent-polymarket)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(provDaily.filter(inShareRange), {x: "date", y: d => d.pct_of_venue / 100, r: 4, fill: "var(--theme-background)", stroke: "var(--accent-polymarket)", strokeWidth: 2}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(daily.filter(inShareRange), Plot.pointerX({x: "date", y: d => d.pct_of_venue / 100,
      title: d => `${fmtDate(d.date)}\nParlays: ${d.pct_of_venue.toFixed(2)}% of venue\nParlay contracts: ${fmtCount(d.contracts)}`}))
  ]
}))
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p>Parlays are the venue's <code>caoc</code> contracts. They are quoted by the house on request, so the customer is the buyer and buyer P&L is taker P&L. Every bet counts at the price it traded at on the venue's time-and-sales records. Those records carry no buy/sell flag, so a later trade of exactly the same size at a different price is read as that bet being cashed out, and the bet makes the cash-out price rather than the result. Held to settlement instead, the same bets would have returned ${heldPct} before fees.</p>
  <p>Results come from the daily market report where it gives one, and otherwise from the venue's own settlement record for each parlay; the report never gives one for about a seventh of the money, and those parlays win more often than the rest. ${meta.pct_resolved?.toFixed(1)}% of stakes have a result so far. Voided parlays and the few settled at an in-between price (${meta.pct_terminated?.toFixed(2)}% of contracts) are left out. Fees are estimated at the venue's standard taker rate (<code>6% × p × (1−p)</code> per contract, charged again on a cash-out), since combos have no published schedule of their own. Everything is dated by the day the parlay was bought.</p>
</details>
