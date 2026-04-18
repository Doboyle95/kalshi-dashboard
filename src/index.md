---
title: Volume
---

# Kalshi Daily Volume

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
```

```js
const platforms = ["Kalshi", "ForecastEx", "Polymarket", "Comparison"];
const platform = view(Inputs.select(platforms, {label: "Platform", value: "Kalshi"}));
```

```js
// Filter/display logic per platform selection
// For now: show Kalshi daily contracts
const filtered = daily.filter(d => d.contracts_total != null);
```

```js
Plot.plot({
  title: "Daily contracts traded",
  width,
  height: 400,
  x: {type: "utc", label: "Date"},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(filtered, {
      x: "date",
      y: "contracts_total",
      fill: "#2c7bb6",
      fillOpacity: 0.15,
      curve: "monotone-x"
    }),
    Plot.lineY(filtered, {
      x: "date",
      y: "contracts_total",
      stroke: "#2c7bb6",
      curve: "monotone-x"
    }),
    Plot.lineY(filtered.filter(d => d.ma7_contracts != null), {
      x: "date",
      y: "ma7_contracts",
      stroke: "#e15759",
      strokeWidth: 1.5,
      strokeDasharray: "4,2",
      curve: "monotone-x",
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```

<div class="note">
Red dashed line = 7-day moving average. Data updated nightly from Kalshi trade records via InGame.
</div>

## Sports vs non-sports

```js
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
Plot.plot({
  width,
  height: 300,
  x: {type: "utc", label: "Date"},
  y: {label: "Sports share (%)", domain: [0, 100], grid: true},
  marks: [
    Plot.lineY(sports, {
      x: "date",
      y: d => d.sports_contracts / (d.sports_contracts + d.nonsports_contracts) * 100,
      stroke: "#1a9641",
      curve: "monotone-x",
      tip: true
    }),
    Plot.ruleY([50], {stroke: "#ccc", strokeDasharray: "4,2"})
  ]
})
```
