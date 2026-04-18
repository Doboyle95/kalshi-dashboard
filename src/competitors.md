---
title: Competitors
---

# Platform Comparison

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
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

const polymarket = competitor.filter(d => d.platform === "Polymarket US").map(d => ({
  date: d.date,
  platform: "Polymarket US",
  contracts: +d.contracts,
  fees: +d.fees
}));

const all = [...kalshiTidy, ...forecastex, ...polymarket];

const platformColors = {
  "Kalshi":        "#2c7bb6",
  "Polymarket US": "#e66101",
  "ForecastEx":    "#1a9641"
};
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
  const data = all.filter(d => selectedPlatforms.includes(d.platform) && d[metric] != null);

  if (data.length === 0) {
    display(html`<p style="color:#999;font-style:italic">Select at least one platform above.</p>`);
  } else {
    const colorDomain = selectedPlatforms;
    const colorRange  = selectedPlatforms.map(p => platformColors[p]);

    display(Plot.plot({
      width,
      height: 420,
      marginRight: 10,
      x: {type: "utc", label: null},
      y: {
        label: metric === "contracts" ? "Daily contracts" : "Daily fees (USD)",
        grid: true,
        tickFormat: metric === "contracts"
          ? d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
          : d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d)
      },
      color: {legend: true, domain: colorDomain, range: colorRange},
      marks: [
        Plot.areaY(data, {
          x: "date",
          y: metric,
          fill: "platform",
          fillOpacity: 0.08,
          curve: "monotone-x"
        }),
        Plot.lineY(data, {
          x: "date",
          y: metric,
          stroke: "platform",
          strokeWidth: 2,
          curve: "monotone-x",
          tip: true
        }),
        Plot.ruleY([0])
      ]
    }));
  }
}
```

<p style="font-size:0.82em;color:#999">Kalshi = US exchange volume from trade records. Polymarket US = US-legal volume only (separate from global). ForecastEx = full exchange volume. Note: Kalshi is many times larger — deselect it to compare Polymarket US and ForecastEx on their own scale.</p>

## Scale reference

```js
{
  const peakTable = [
    {Platform: "Kalshi",        "Peak daily contracts": kalshiTidy.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
    {Platform: "Polymarket US", "Peak daily contracts": polymarket.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
    {Platform: "ForecastEx",    "Peak daily contracts": forecastex.reduce((m, d) => Math.max(m, d.contracts||0), 0)},
  ];
  display(Inputs.table(peakTable, {format: {"Peak daily contracts": d => d.toLocaleString()}}));
}
```
