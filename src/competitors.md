---
title: Competitors
---

# Platform Comparison

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
// Build a combined tidy dataset
const kalshiTidy = kalshi.map(d => ({
  date: d.date,
  platform: "Kalshi",
  contracts: d.contracts_total,
  fees: d.fees_total
}));

const forecastex = competitor.filter(d => d.platform === "ForecastEx").map(d => ({
  date: d.date,
  platform: "ForecastEx",
  contracts: +d.contracts,
  fees: +d.fees
}));

const polymarket = competitor.filter(d => d.platform === "Polymarket_US").map(d => ({
  date: d.date,
  platform: "Polymarket US",
  contracts: +d.contracts,
  fees: +d.fees
}));

const all = [...kalshiTidy, ...forecastex, ...polymarket];
const colors = {Kalshi: "#2c7bb6", "ForecastEx": "#d7191c", "Polymarket US": "#f4a736"};
```

```js
const selectedPlatforms = view(Inputs.checkbox(
  ["Kalshi", "Polymarket US", "ForecastEx"],
  {value: ["Kalshi", "Polymarket US", "ForecastEx"], label: "Platforms"}
));
```

```js
const metric = view(Inputs.select(["contracts", "fees"], {label: "Metric", value: "contracts"}));
```

```js
{
  const filtered = all.filter(d => selectedPlatforms.includes(d.platform));

  if (filtered.length === 0) {
    display(html`<p style="color:#888">Select at least one platform above.</p>`);
  } else {
    display(Plot.plot({
      width,
      height: 380,
      x: {type: "utc", label: null},
      y: {
        label: metric === "contracts" ? "Daily contracts" : "Daily fees (USD)",
        grid: true,
        tickFormat: metric === "contracts"
          ? d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
          : d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")
      },
      color: {
        legend: true,
        domain: ["Kalshi", "Polymarket US", "ForecastEx"],
        range: ["#2c7bb6", "#f4a736", "#d7191c"]
      },
      marks: [
        Plot.lineY(filtered, {
          x: "date",
          y: metric,
          stroke: "platform",
          curve: "monotone-x",
          tip: true
        }),
        Plot.ruleY([0])
      ]
    }));
  }
}
```

## Scale reference

```js
const peakTable = [
  {Platform: "Kalshi", "Peak daily contracts": kalshiTidy.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
  {Platform: "ForecastEx", "Peak daily contracts": forecastex.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
  {Platform: "Polymarket US", "Peak daily contracts": polymarket.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
];
display(Inputs.table(peakTable, {format: {"Peak daily contracts": d => d.toLocaleString()}}));
```
