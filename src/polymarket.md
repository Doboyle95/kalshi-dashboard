---
title: Polymarket US
---

# Polymarket US

```js
const catDaily  = await FileAttachment("data/polymarket_categories_daily.csv").csv({typed: true});
const split     = await FileAttachment("data/polymarket_sports_split_daily.csv").csv({typed: true});
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #e66101;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Contracts (since Oct 2025)</div>
    <div style="font-size:1.6em;font-weight:700;color:#e66101">${(totalContracts/1e6).toFixed(0)}M</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${(peakDay?.contracts_total/1e6).toFixed(1)}M</div>
    <div style="font-size:0.72em;color:#999">${peakDay?.date?.toISOString().slice(0,10)}</div>
  </div>
</div>

## Daily volume

```js
Plot.plot({
  width,
  height: 300,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.rectY(split, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#e66101", fillOpacity: 0.6,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n${(d.contracts_total||0).toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">US-accessible Polymarket volume only (separate from global Polymarket). Data from CFTC daily bulletins, starting Oct 30, 2025. Almost entirely sports.</p>

## Sports vs. non-sports

```js
const tidySplit = split.flatMap(d => [
  {date: d.date, category: "Sports",     value: d.contracts_sports    || 0},
  {date: d.date, category: "Non-sports", value: d.contracts_nonsports || 0}
]);
```

```js
Plot.plot({
  width,
  height: 240,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "#2c7bb6"]},
  marks: [
    Plot.areaY(tidySplit, {
      x: "date", y: "value", fill: "category",
      order: ["Non-sports", "Sports"],
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleY([0])
  ]
})
```

## Volume by sport

```js
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const topCats = [...catTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 9).map(d => d[0]);
const catDisplayed = catDaily.filter(d => topCats.includes(d.category));
```

```js
Plot.plot({
  width,
  height: 300,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    Plot.areaY(catDisplayed, {
      x: "date", y: "contracts", fill: "category",
      order: topCats.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)} · ${d.category}\n${(d.contracts||0).toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

## Sport breakdown (all time)

```js
const catBar = [...catTotals.entries()]
  .sort((a,b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
Plot.plot({
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 170,
  x: {label: "Contracts (all time)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "#e66101", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${d.contracts.toLocaleString()}`
    }),
    Plot.ruleX([0])
  ]
})
```

