---
title: Parlay P&L
---

# Parlay P&L

Cumulative taker profit/loss on parlay contracts (KXMVE\* and PREPACK\* series). Negative values mean takers (bettors) lost money overall.

```js
const raw = await FileAttachment("data/parlay_pnl_net.csv").csv({typed: true});
```

```js
// Build cumulative P&L series
// "Before fees" = taker P&L net of settlement, before Kalshi fees
// "After fees (net)" = taker P&L after paying Kalshi's fees
let grossRunning = 0, netRunning = 0;
const pnl = raw
  .filter(d => d.row_label && d.row_label !== "TOTAL")
  .map(d => {
    const dailyNet = +d.net_pnl_ALL_PARLAYS || 0;
    const dailyFees = +d.fees_ALL_PARLAYS || 0;
    const dailyGross = dailyNet + dailyFees;
    grossRunning += dailyGross;
    netRunning += dailyNet;
    return {
      date: new Date(d.row_label),
      gross_cumul: grossRunning,
      net_cumul: netRunning
    };
  })
  .filter(d => !isNaN(d.date.getTime()));
```

```js
// Tidy for multi-line plot
const tidy = [
  ...pnl.map(d => ({date: d.date, value: d.gross_cumul, series: "Before fees (gross)"})),
  ...pnl.map(d => ({date: d.date, value: d.net_cumul, series: "After fees (net)"}))
];
```

```js
const lastRow = pnl[pnl.length - 1];
const totalGross = lastRow?.gross_cumul ?? 0;
const totalNet = lastRow?.net_cumul ?? 0;
const totalFees = totalGross - totalNet;
```

<div style="display:flex;gap:2rem;margin-bottom:1.5rem;flex-wrap:wrap">
  <div style="background:#f8f8f8;border-radius:8px;padding:1rem 1.5rem;min-width:160px">
    <div style="font-size:0.8em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Cumulative taker P&L (net)</div>
    <div style="font-size:1.8em;font-weight:700;color:#d7191c">${totalNet.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0})}</div>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:1rem 1.5rem;min-width:160px">
    <div style="font-size:0.8em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Fees paid by takers</div>
    <div style="font-size:1.8em;font-weight:700;color:#756bb1">${totalFees.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0})}</div>
  </div>
</div>

```js
Plot.plot({
  width,
  height: 400,
  x: {type: "utc", label: null},
  y: {label: "Cumulative P&L (USD)", grid: true, tickFormat: d => "$" + (d/1000).toFixed(0) + "k"},
  color: {
    legend: true,
    domain: ["Before fees (gross)", "After fees (net)"],
    range: ["#f4a736", "#d7191c"]
  },
  marks: [
    Plot.lineY(tidy, {
      x: "date", y: "value",
      stroke: "series",
      strokeWidth: 2,
      curve: "monotone-x",
      tip: true,
      title: d => `${d.series}\n${d.date.toISOString().slice(0,10)}\n$${d.value.toLocaleString(undefined,{maximumFractionDigits:0})}`
    }),
    Plot.ruleY([0], {stroke: "#ccc"})
  ]
})
```

<p style="font-size:0.82em;color:#888">Taker P&L = settlement received minus price paid. "Before fees" excludes Kalshi's trading fee. "After fees" is the taker's true net return. Parlay markets identified by KXMVE* and PREPACK* series prefixes. Data from Kalshi S3 trade files.</p>

## Daily P&L

```js
const dailyTidy = [
  ...raw.filter(d => d.row_label && d.row_label !== "TOTAL").map(d => ({
    date: new Date(d.row_label),
    value: +d.net_pnl_ALL_PARLAYS || 0,
    series: "After fees (net)"
  })),
  ...raw.filter(d => d.row_label && d.row_label !== "TOTAL").map(d => ({
    date: new Date(d.row_label),
    value: (+d.net_pnl_ALL_PARLAYS || 0) + (+d.fees_ALL_PARLAYS || 0),
    series: "Before fees (gross)"
  }))
].filter(d => !isNaN(d.date.getTime()));
```

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Daily P&L (USD)", grid: true},
  color: {
    domain: ["Before fees (gross)", "After fees (net)"],
    range: ["#f4a736", "#d7191c"]
  },
  marks: [
    Plot.lineY(dailyTidy, {
      x: "date", y: "value",
      stroke: "series",
      strokeWidth: 1.5,
      curve: "monotone-x",
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```
