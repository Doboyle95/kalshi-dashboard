---
title: Volume
---

# Kalshi Market Data

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

## Daily contracts traded

```js
Plot.plot({
  width,
  height: 380,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(daily, {
      x: "date", y: "contracts_total",
      fill: "#2c7bb6", fillOpacity: 0.12, curve: "monotone-x"
    }),
    Plot.lineY(daily, {
      x: "date", y: "contracts_total",
      stroke: "#2c7bb6", curve: "monotone-x"
    }),
    Plot.lineY(daily.filter(d => d.ma7_contracts != null), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2,
      curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: ${d.ma7_contracts?.toLocaleString()}`
    }),
    Plot.ruleY([0])
  ]
})
```

<span style="color:#2c7bb6">— Daily</span> &nbsp; <span style="color:#e15759">— 7-day average</span>

## Sports vs non-sports share

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Sports share (%)", domain: [0, 100], grid: true},
  marks: [
    Plot.areaY(sports, {
      x: "date",
      y: d => d.share_sports * 100,
      fill: "#1a9641", fillOpacity: 0.15, curve: "monotone-x"
    }),
    Plot.lineY(sports, {
      x: "date",
      y: d => d.share_sports * 100,
      stroke: "#1a9641", curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nSports: ${(d.share_sports*100).toFixed(1)}%`
    }),
    Plot.ruleY([50], {stroke: "#ccc", strokeDasharray: "4,2"})
  ]
})
```

## Daily fees

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true},
  marks: [
    Plot.barY(daily, {
      x: "date", y: "fees_total",
      fill: "#756bb1", fillOpacity: 0.8,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nFees: $${d.fees_total?.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.lineY(daily.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "#3f007d", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleY([0])
  ]
})
```
