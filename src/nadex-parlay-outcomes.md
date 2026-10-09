---
title: OG/Crypto.com · Parlay outcomes
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">OG/Crypto.com</div>
  <h1>Do parlay buyers win?</h1>
  <p class="page-lead">Every settled COMBO, in dollars: what buyers staked, what they got back, and the gap between the two. Parlays only &mdash; the whole-suite price calibration lives on <a href="./nadex-outcomes">Outcomes</a>.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {dateBrush, inDateRange} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
// No await: each file is its own promise, which Framework awaits in every cell that reads it.
const parlayDaily = DataAttachment("data/nadex_parlay_pnl_daily.csv").csv({typed: true});
// The Kalshi comparators below come from the SAME file /compare-accuracy derives every
// venue from, so the two pages cannot drift apart.
const kalshiPnlBins = DataAttachment("data/competitor_pnl_by_bin.csv").csv({typed: true});
```

## Parlay P&L

```js
const pdSorted = parlayDaily
  .map(d => ({
    ...d,
    // typed:true turns the date column into a Date; everything below wants one.
    date: d.date instanceof Date ? d.date : new Date(String(d.date)),
    prov: String(d.is_provisional) === "true"
  }))
  .sort((a, b) => a.date - b.date);

// Cumulative is built here rather than in the producer so the two charts can never
// disagree about which days they include.
let _c = 0;
const pdCumul = pdSorted.map(d => {
  _c += +d.gross_pnl;
  return {...d, cumul: _c};
});

const pdTotal = _c;
const pdContracts = d3.sum(pdSorted, d => +d.contracts_settled);

// Kalshi's per-contract comparators, contract-weighted over competitor_pnl_by_bin.csv.
// GROSS, matching pdTotal/pdContracts above (which sums gross_pnl), so the three figures in
// the callout are finally on ONE basis — the old sentence compared a gross Nadex number
// against two net Kalshi ones and asked the reader to hold that difference in their head.
const kalshiPerContract = group => {
  const rows = kalshiPnlBins.filter(d => d.venue === "Kalshi" && d.group === group);
  const c = d3.sum(rows, d => +d.contracts || 0);
  return c ? d3.sum(rows, d => +d.pnl || 0) / c : null;
};
const kalshiParlayPer = kalshiPerContract("PARLAY");
const kalshiSinglePer = kalshiPerContract("NON_PARLAY");
// Magnitude only — the verb carries the direction, and a signed format would render
// "lose +0.63c". Same rule, and the same reason, as compare-accuracy.md's fmtCentsMag.
const fmtCentsMag = d => `${Math.abs(d * 100).toFixed(2)}¢`;
const pdParlays = d3.sum(pdSorted, d => +d.parlays_settled);
const pdProv = pdSorted.filter(d => d.prov).length;
const fmtM = d => Math.abs(d) > 0 && Math.abs(d) < 0.5 ? (d < 0 ? "−" : "") + "<$1" : (d < 0 ? "−$" : "$") + (Math.abs(d) >= 1e6 ? (Math.abs(d) / 1e6).toFixed(2) + "M"
                       : Math.abs(d) >= 1e3 ? (Math.abs(d) / 1e3).toFixed(0) + "k"
                       : Math.abs(d).toFixed(0));
```

<div class="instruction-line">Over ${pdSorted.length} sessions, <strong>${pdParlays.toLocaleString()} settled parlays</strong> carrying ${(pdContracts / 1e6).toFixed(1)}M contracts lost their buyers <strong>${fmtM(Math.abs(pdTotal))}</strong> gross &mdash; ${fmtCentsMag(pdTotal / pdContracts)} per contract. <strong>The first ${pdProv} days are drawn faded and are provisional.</strong> A parlay is only counted when the window contains every print it ever traded, and a parlay settling in the opening days was often created before collection began, so those days hold less than their true volume. 80% of parlays settle within a day of being created and 99.9% within a fortnight, so the shortfall does not reach past it.</div>

```js
const nadexPnlDateSel = view(dateBrush({data: pdSorted, valueAccessor: d => Math.abs(+d.gross_pnl) || 0, color: "var(--accent-nadex)", width}));
```

```js
const pdSortedBrushed = pdSorted.filter(inDateRange(nadexPnlDateSel));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 78,
  x: {type: "utc", label: null},
  y: {label: "Daily parlay P&L, gross (USD)", grid: true,
      tickFormat: fmtM},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.2}),
    // Colour carries DIRECTION (did the bettor win that day), opacity carries how much
    // of the day the window can actually account for. Solid throughout: a faded bar is
    // a weaker reading, never a missing one.
    Plot.rectY(pdSortedBrushed, {
      x: "date", interval: "day", y: "gross_pnl",
      fill: d => +d.gross_pnl > 0 ? "var(--accent-positive)" : "var(--accent-negative)",
      fillOpacity: d => d.prov ? 0.4 : 0.92,
      title: d => `${d.date.toISOString().slice(0, 10)}${d.prov ? " — PROVISIONAL" : ""}
Gross P&L: ${fmtM(+d.gross_pnl)}
Staked: ${fmtM(+d.stake_usd)}
${(+d.contracts_settled).toLocaleString()} contracts on ${(+d.parlays_settled).toLocaleString()} parlays
${(+d.gross_pnl_cents_per_contract).toFixed(2)}¢ per contract
Coverage: ${(+d.coverage_pct).toFixed(1)}%`,
      tip: true
    })
  ]
})
```

_Green days are days the parlay bettors came out ahead; red days they did not. Because a parlay is settled as one contract, a single large winning combo can turn a day green on its own._

```js
const nadexCumDateSel = view(dateBrush({data: pdSorted, valueAccessor: d => Math.abs(+d.gross_pnl) || 0, color: "var(--accent-nadex)", width}));
```

```js
const pdCumulBrushed = pdCumul.filter(inDateRange(nadexCumDateSel));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 78,
  x: {type: "utc", label: null},
  y: {label: "Cumulative parlay P&L, gross (USD)", grid: true,
      tickFormat: fmtM},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.areaY(pdCumulBrushed, {x: "date", y: "cumul", fill: "var(--accent-nadex)", fillOpacity: 0.12}),
    Plot.line(pdCumulBrushed, {x: "date", y: "cumul", stroke: "var(--accent-nadex)", strokeWidth: 2}),
    Plot.dot(pdCumulBrushed, {
      x: "date", y: "cumul", r: 9, fill: "transparent",
      title: d => `${d.date.toISOString().slice(0, 10)}
Cumulative: ${fmtM(d.cumul)}
That day: ${fmtM(+d.gross_pnl)}`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./nadex-parlays">Parlays</a> for adoption and volume, <a href="./nadex-outcomes">OG/Crypto.com &middot; Outcomes</a> for whole-suite price calibration, and <a href="./nadex">OG/Crypto.com &middot; Activity</a>.</div>

## What bettors lost, by the price they paid

```js
// Loaded inside this section on purpose: build_chart_catalog.py credits a series to the nearest
// ## heading PRECEDING its DataAttachment call. A failed load shows the empty-state note instead.
const lossRows = await DataAttachment("data/competitor_parlay_pnl_by_price_daily.csv").csv({typed: true}).catch(() => []);
```

_Share of stakes lost at each price after the exchange's standard 2¢-a-contract fee, with the dollars under each bar — ${ogLoss.span}. Prices start at 1¢, where the fee alone is bigger than the stake._

```js
const ogLossRange = view(dateBrush({data: lossRows.filter(d => d.venue === "Crypto.com/Nadex"), valueAccessor: d => d.staked_usd, color: "var(--accent-nadex)", width}));
```

```js
import {lossByPrice, lossByPriceChart} from "./components/parlay-loss-by-price.js";
// Follows this chart's own date window, applied to the day each parlay was BOUGHT.
const ogLoss = lossByPrice(lossRows, "Crypto.com/Nadex", ogLossRange);
display(lossByPriceChart(ogLoss, {width, feeName: "the 2¢ fee"}));
```

<details class="surface-card compact-details">
  <summary>How the price breakdown is measured</summary>
  <p>Every COMBO trade is scored against its settlement and grouped by the price paid, on the day it was bought. The fee is the exchange's standard 2¢ a contract; the Crypto.com app has charged its own customers 1&ndash;1.75¢ since June 30, so for them the losses after fees are somewhat smaller. The venue's records don't say whether a trade was a buy or a sell, so a parlay sold back before settlement can't be separated out the way Kalshi's cash-outs are: every trade counts as a bet held to the end.</p>
</details>
