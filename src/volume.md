---
title: Kalshi Volume
---

# Kalshi Volume

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
// All-time KPIs (not filtered by date range)
const totalContracts = d3.sum(daily, d => d.contracts_total);
const totalFees = d3.sum(daily, d => d.fees_total);
const peakDay = daily.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, daily[0]);
const annualizedFees = totalFees / daily.length * 365;
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time contracts</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">${(totalContracts/1e9).toFixed(1)}B</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #756bb1;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time fee revenue</div>
    <div style="font-size:1.6em;font-weight:700;color:#756bb1">$${(totalFees/1e6).toFixed(0)}M</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #3f007d;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Annualized run rate</div>
    <div style="font-size:1.6em;font-weight:700;color:#3f007d">$${(annualizedFees/1e6).toFixed(0)}M/yr</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${(peakDay?.contracts_total/1e6).toFixed(0)}M</div>
    <div style="font-size:0.72em;color:#999">${peakDay?.date?.toISOString().slice(0,10)}</div>
  </div>
</div>

```js
const since = view(Inputs.select(["All time", "Since 2025", "Since 2026"], {
  label: "Time period",
  value: "Since 2025"
}));
```

```js
const startDate = since === "Since 2026" ? new Date("2026-01-01")
  : since === "Since 2025" ? new Date("2025-01-01")
  : new Date("2021-01-01");

const filteredDaily = daily.filter(d => d.date >= startDate);
const filteredSports = sports.filter(d => d.date >= startDate);
```

## Daily contracts traded

```js
const maxContracts = d3.max(filteredDaily, d => d.contracts_total);

const allMilestones = [
  {date: new Date("2024-11-05"), label: "Election Day '24",   tier: 0},
  {date: new Date("2025-09-07"), label: "NFL season '25",     tier: 1},
  {date: new Date("2026-01-17"), label: "NFL Divisional",     tier: 1},
  {date: new Date("2026-01-25"), label: "NFL Championship",   tier: 0},
  {date: new Date("2026-02-08"), label: "Super Bowl LIX",     tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness",      tier: 0},
];

const milestones = allMilestones
  .filter(m => m.date >= startDate)
  .map(m => ({...m, y: m.tier === 0 ? maxContracts : maxContracts * 0.78}));
```

```js
Plot.plot({
  width,
  height: 400,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(filteredDaily, {
      x: "date", y: "contracts_total",
      fill: "#2c7bb6", fillOpacity: 0.12, curve: "monotone-x"
    }),
    Plot.lineY(filteredDaily, {
      x: "date", y: "contracts_total",
      stroke: "#2c7bb6", curve: "monotone-x"
    }),
    Plot.lineY(filteredDaily.filter(d => d.ma7_contracts != null), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2,
      curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: ${d.ma7_contracts?.toLocaleString()}`
    }),
    Plot.ruleX(milestones, {
      x: "date", stroke: "#aaa", strokeDasharray: "3,3", strokeWidth: 1
    }),
    Plot.text(milestones, {
      x: "date", y: "y", text: "label",
      textAnchor: "start", lineAnchor: "bottom",
      rotate: -42, fontSize: 10, fill: "#666", dx: 3, dy: -2
    }),
    Plot.ruleY([0])
  ]
})
```

<span style="color:#2c7bb6">— Daily</span> &nbsp; <span style="color:#e15759">— 7-day average</span>

## Sports vs. non-sports volume

```js
const tidySports = filteredSports.flatMap(d => [
  {date: d.date, value: d.contracts_nonsports, type: "Non-sports"},
  {date: d.date, value: d.contracts_sports,    type: "Sports"}
]);
```

```js
Plot.plot({
  width,
  height: 300,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  color: {
    legend: true,
    domain: ["Non-sports", "Sports"],
    range: ["#2c7bb6", "#1a9641"]
  },
  marks: [
    Plot.areaY(tidySports, {
      x: "date", y: "value", fill: "type",
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleY([0])
  ]
})
```

## Daily fee revenue

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true},
  marks: [
    Plot.rectY(filteredDaily, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.fees_total || 0,
      fill: "#756bb1", fillOpacity: 0.8,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nFees: $${(d.fees_total||0).toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.lineY(filteredDaily.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "#3f007d", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: $${d.ma7_fees?.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Cumulative fee revenue

```js
let running = 0;
const cumFees = filteredDaily.map(d => {
  running += d.fees_total || 0;
  return {date: d.date, cumul: running};
});
```

```js
Plot.plot({
  width,
  height: 260,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative fees (USD)", grid: true,
    tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")
  },
  marks: [
    Plot.areaY(cumFees, {
      x: "date", y: "cumul",
      fill: "#756bb1", fillOpacity: 0.15, curve: "monotone-x"
    }),
    Plot.lineY(cumFees, {
      x: "date", y: "cumul",
      stroke: "#756bb1", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nCumulative: $${d.cumul.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.ruleY([0])
  ]
})
```
