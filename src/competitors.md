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
  platform: "Polymarket",
  contracts: +d.contracts,
  fees: +d.fees
}));

const all = [...kalshiTidy, ...forecastex, ...polymarket];
```

```js
const platform = view(Inputs.select(["Kalshi", "ForecastEx", "Polymarket", "Comparison"], {
  label: "Platform", value: "Kalshi"
}));
```

```js
const metric = view(Inputs.select(["contracts", "fees"], {label: "Metric", value: "contracts"}));
```

```js
const colors = {Kalshi: "#2c7bb6", ForecastEx: "#d7191c", Polymarket: "#f4a736"};

if (platform !== "Comparison") {
  // Single platform view
  const data = all.filter(d => d.platform === platform);
  display(Plot.plot({
    width,
    height: 380,
    title: `${platform} daily ${metric}`,
    x: {type: "utc", label: null},
    y: {label: metric, grid: true},
    marks: [
      Plot.areaY(data, {
        x: "date", y: metric,
        fill: colors[platform], fillOpacity: 0.12, curve: "monotone-x"
      }),
      Plot.lineY(data, {
        x: "date", y: metric,
        stroke: colors[platform], curve: "monotone-x",
        tip: true
      }),
      Plot.ruleY([0])
    ]
  }));
} else {
  // Comparison: normalize each platform to % of its own peak
  const peaks = {};
  for (const p of ["Kalshi", "ForecastEx", "Polymarket"]) {
    const vals = all.filter(d => d.platform === p).map(d => d[metric]);
    peaks[p] = Math.max(...vals.filter(v => v != null && !isNaN(v)));
  }

  const normalized = all
    .filter(d => d[metric] != null && peaks[d.platform] > 0)
    .map(d => ({...d, pct_of_peak: d[metric] / peaks[d.platform] * 100}));

  display(Plot.plot({
    width,
    height: 380,
    title: "All platforms — % of own peak (normalized)",
    color: {legend: true, domain: ["Kalshi","ForecastEx","Polymarket"], range: Object.values(colors)},
    x: {type: "utc", label: null},
    y: {label: "% of peak", domain: [0, 105], grid: true},
    marks: [
      Plot.lineY(normalized, {
        x: "date", y: "pct_of_peak",
        stroke: "platform",
        curve: "monotone-x",
        tip: true,
        title: d => `${d.platform}\n${d.date}\n${d.pct_of_peak.toFixed(1)}% of peak`
      }),
      Plot.ruleY([0])
    ]
  }));

  display(html`<p style="font-size:0.85em;color:#666">Each platform normalized to 100% at its own all-time peak. Kalshi peak: ${peaks.Kalshi?.toLocaleString()} contracts. ForecastEx peak: ${peaks.ForecastEx?.toLocaleString()}. Polymarket peak: ${peaks.Polymarket?.toLocaleString()}.</p>`);
}
```

## Scale reference

```js
// Show absolute peak volumes for context
const peakTable = [
  {Platform: "Kalshi", "Peak daily contracts": kalshi.reduce((m, d) => Math.max(m, d.contracts_total||0), 0)},
  {Platform: "ForecastEx", "Peak daily contracts": forecastex.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
  {Platform: "Polymarket US", "Peak daily contracts": polymarket.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
];
display(Inputs.table(peakTable, {format: {"Peak daily contracts": d => d.toLocaleString()}}));
```
