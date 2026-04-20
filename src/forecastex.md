---
title: ForecastEx
---

# ForecastEx

```js
const catDaily  = await FileAttachment("data/forecastex_categories_daily.csv").csv({typed: true});
const split     = await FileAttachment("data/forecastex_sports_split_daily.csv").csv({typed: true});
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #1a9641;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time contracts</div>
    <div style="font-size:1.6em;font-weight:700;color:#1a9641">${(totalContracts/1e6).toFixed(0)}M</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${(peakDay?.contracts_total/1e3).toFixed(0)}k</div>
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
      fill: "#1a9641", fillOpacity: 0.6,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n${(d.contracts_total||0).toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">ForecastEx full exchange volume from CFTC daily bulletins. Contract denominations vary by product; counts reflect individual contracts traded, not notional value.</p>

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

## Volume by category

```js
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const topCats = [...catTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);
const catFiltered = catDaily.filter(d => topCats.includes(d.category));
```

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    Plot.areaY(catFiltered, {
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

## Category breakdown (all time)

```js
const catBar = [...catTotals.entries()]
  .sort((a,b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
Plot.plot({
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 160,
  x: {label: "Contracts (all time)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "#1a9641", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${d.contracts.toLocaleString()}`
    }),
    Plot.ruleX([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Politics dominated 2024 volume (presidential election contracts). Weather contracts (city high-temperature markets) are now ForecastEx's primary product. Football = NFL game-winner contracts (NFLGW). Basketball = NBA game-winner contracts (NBAGW).</p>
