---
title: Parlay P&L
---

# Parlay P&L

How parlay bettors on Kalshi actually do. A parlay needs every leg to hit — the payouts are big, but most expire worthless. These are the real dollars won and lost by the people buying them.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const raw = await FileAttachment("data/parlay_pnl_net.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L", date: latestDate(raw, d => d.row_label), updatedAt: fileUpdatedAt(freshness, "parlay_pnl_net.csv"), meta: "Settlement-dependent parlay export", tone: "settlement"}
  ],
  note: "Recent days are still filling in — a parlay only counts here once its markets settle, so today's numbers will keep moving."
}));
display(askPageLink({
  question: "Analyze parlay taker P&L and fee drag, noting whether recent dates may be settlement-incomplete.",
  context: "Parlay P&L page using parlay_pnl_net.csv."
}));
```

```js
// Build per-day series with cumulative P&L
let grossRunning = 0, netRunning = 0;
const pnl = raw
  .filter(d => d.row_label && d.row_label !== "TOTAL")
  .map(d => {
    const dailyNet   = +d.net_pnl_ALL_PARLAYS || 0;
    const dailyFees  = +d.fees_ALL_PARLAYS || 0;
    const dailyGross = dailyNet + dailyFees;
    const stakes     = +d.ALL_PARLAYS || 0;       // notional (USD at stake)
    const contracts  = +d.contracts_ALL_PARLAYS || 0;
    const pct        = +d.net_pnl_pct_ALL_PARLAYS || null; // P&L as % of stakes
    grossRunning += dailyGross;
    netRunning   += dailyNet;
    return {
      date: new Date(d.row_label),
      gross_cumul: grossRunning,
      net_cumul:   netRunning,
      daily_net:   dailyNet,
      daily_gross: dailyGross,
      daily_fees:  dailyFees,
      stakes,
      contracts,
      pct
    };
  })
  .filter(d => !isNaN(d.date.getTime()));
```

```js
// All-time KPIs (unaffected by date range)
const lastRow   = pnl[pnl.length - 1];
const totalNet  = lastRow?.net_cumul  ?? 0;
const totalGross = lastRow?.gross_cumul ?? 0;
const totalFees = totalGross - totalNet;
const totalStakes = d3.sum(pnl, d => d.stakes);
const totalContracts = d3.sum(pnl, d => d.contracts);
const overallPct = totalNet / totalStakes * 100;
```

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Cumulative taker P&L (net)</div>
    <div class="kpi-value">${fmtUSD(totalNet)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">All-time fees paid</div>
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Overall taker ROI</div>
    <div class="kpi-value">${overallPct.toFixed(1)}%</div>
    <div class="kpi-meta">of total stakes</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Total stakes</div>
    <div class="kpi-value">${fmtUSD(totalStakes)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Settled parlay contracts</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
  </div>
</div>


<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Parlays pay out only if every leg hits, so most expire worthless — the same dynamic as sportsbook parlays. This page totals what parlay bettors staked against what they got back.</p>
  <p>"Before fees" is their raw trading result; "after fees" is what they kept once Kalshi took its cut, and the gap between the two lines is the fee drag. Use the daily charts to tell a busy day apart from a good — or brutal — one.</p>
</details>

```js
// Mutable + brush rendered in the SAME cell so the brush callback closes over
// the Mutable wrapper. Observable Framework yields the unwrapped value (not
// the wrapper) to consuming cells, so a setter defined in another cell would
// only see the array and `.value = X` would be a no-op.
const parlayDateSel = Mutable([new Date("2025-01-01"), d3.max(pnl, d => d.date)]);
display(renderDateBrush({
  data: pnl,
  dateAccessor: d => d.date,
  valueAccessor: d => d.stakes,
  initialRange: [new Date("2025-01-01"), d3.max(pnl, d => d.date)],
  onSelect: r => { parlayDateSel.value = r; },
  color: "#5FD0C2",
  width
}));
```

```js
const [pStart, pEnd] = parlayDateSel;
const pnlFiltered = pnl.filter(d => d.date >= pStart && d.date <= pEnd);

// Recompute cumulative from filtered window start
let gr = 0, nr = 0;
const pnlCumul = pnlFiltered.map(d => {
  gr += d.daily_gross; nr += d.daily_net;
  return {...d, gross_cumul_w: gr, net_cumul_w: nr};
});

const tidyCumul = [
  ...pnlCumul.map(d => ({date: d.date, value: d.gross_cumul_w, series: "Before fees (gross)"})),
  ...pnlCumul.map(d => ({date: d.date, value: d.net_cumul_w,   series: "After fees (net)"}))
];

const cumulativeSeries = ["Before fees (gross)", "After fees (net)"];
const cumulativeColors = {
  "Before fees (gross)": "#5FD0C2",  // light teal
  "After fees (net)": "#0A7B6C"       // dark teal
};

// Pivot for single combined tooltip
const cumPivot = pnlCumul.map(d => ({date: d.date, gross: d.gross_cumul_w, net: d.net_cumul_w}));
```

## Cumulative taker P&L

_Every parlay bettor's wins and losses, added up over time. The line keeps sinking — in aggregate, parlays lose — and the space between the two lines is what Kalshi takes in fees._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 340,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative P&L (USD)", grid: true,
      tickFormat: d => "$" + (Math.abs(d) >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {legend: true, domain: cumulativeSeries, range: cumulativeSeries.map(label => cumulativeColors[label])},
  marks: [
    Plot.lineY(tidyCumul, {
      x: "date", y: "value", stroke: "series", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(cumPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(cumPivot, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nBefore fees: $${d.gross.toLocaleString(undefined,{maximumFractionDigits:0})}\nAfter fees: $${d.net.toLocaleString(undefined,{maximumFractionDigits:0})}`
    })),
    Plot.ruleY([0], {stroke: "#ccc"})
  ]
})
```

## Daily stakes & return

_Each bar is the money staked on parlays that day; its colour is how the day turned out for bettors — green for a win, red for a loss. The tallest bars are the heavy-action days around big games._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily stakes (USD)", grid: true,
      tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {
    type: "diverging",
    scheme: "RdYlGn",
    domain: [-50, 50],
    label: "Taker return %",
    legend: true
  },
  marks: [
    Plot.rectY(pnlFiltered.filter(d => d.stakes >= 1000), {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.stakes,
      fill: d => d.pct != null ? Math.max(-50, Math.min(50, d.pct)) : 0,
      tip: true,
      title: d => `${fmtDate(d.date)}\nStakes: $${d.stakes.toLocaleString(undefined,{maximumFractionDigits:0})}\nContracts: ${d.contracts.toLocaleString(undefined,{maximumFractionDigits:0})}\nTaker return: ${d.pct != null ? d.pct.toFixed(1)+"%" : "n/a"}\nNet P&L: $${d.daily_net.toLocaleString(undefined,{maximumFractionDigits:0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Daily taker return (% of stakes)

_Each day's parlay return for bettors. Mostly red — long-shot parlays usually miss — with the occasional big green day when enough of them cash._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 260,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Taker return (% of stakes)", domain: [-110, 150], grid: true, tickFormat: d => d + "%"},
  marks: [
    Plot.rectY(pnlFiltered.filter(d => d.pct != null && d.stakes >= 25000), {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => Math.max(-110, Math.min(150, d.pct)),
      fill: d => d.pct >= 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.75,
      tip: true,
      title: d => `${fmtDate(d.date)}\nReturn: ${d.pct.toFixed(1)}%\nStakes: $${d.stakes.toLocaleString(undefined,{maximumFractionDigits:0})}\nContracts: ${d.contracts.toLocaleString(undefined,{maximumFractionDigits:0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Return compares what bettors got back to what they staked, after fees. A 5¢ parlay that hits pays back about 19×, which is why one lucky day can send the line far past +100%.</p>
