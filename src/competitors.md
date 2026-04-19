---
title: Competitors
---

# Platform Comparison

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const platforms = [
  {
    name: "Kalshi", color: "#2c7bb6",
    data: kalshi.map(d => ({date: d.date, contracts: d.contracts_total, fees: d.fees_total}))
  },
  {
    name: "Polymarket US", color: "#e66101",
    data: competitor.filter(d => d.platform === "Polymarket_US")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  },
  {
    name: "ForecastEx", color: "#1a9641",
    data: competitor.filter(d => d.platform === "ForecastEx")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  },
  {
    name: "Crypto.com/Nadex", color: "#9c27b0",
    data: competitor.filter(d => d.platform === "Crypto.com/Nadex")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: null}))
  }
];

// Tidy combined dataset and last-point labels
const all = platforms.flatMap(p => p.data.map(d => ({...d, platform: p.name})));
const lastLabels = platforms.map(p => {
  const last = p.data.filter(d => d[metric] != null).at(-1);
  return last ? {...last, platform: p.name, color: p.color} : null;
}).filter(Boolean);
```

```js
const metric = view(Inputs.radio(["contracts", "fees"], {value: "contracts", label: "Metric"}));
```

```js
{
  const fmt = metric === "contracts"
    ? d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));

  const colorDomain = platforms.map(p => p.name);
  const colorRange  = platforms.map(p => p.color);

  display(Plot.plot({
    width,
    height: 420,
    marginRight: 90,
    x: {type: "utc", label: null},
    y: {
      label: metric === "contracts" ? "Daily contracts" : "Daily fees (USD)",
      grid: true,
      tickFormat: fmt
    },
    color: {domain: colorDomain, range: colorRange},
    marks: [
      // Kalshi area fill — makes its dominance visually clear
      Plot.areaY(platforms[0].data, {
        x: "date", y: metric,
        fill: platforms[0].color, fillOpacity: 0.08,
        curve: "monotone-x"
      }),
      // All platform lines — skip nulls (e.g. Crypto.com has no fees data)
      ...platforms.map(p =>
        Plot.lineY(p.data.filter(d => d[metric] != null), {
          x: "date", y: metric,
          stroke: p.color,
          strokeWidth: p.name === "Kalshi" ? 2.5 : 1.75,
          curve: "monotone-x",
          tip: true
        })
      ),
      // Direct labels at right edge of each line
      Plot.text(lastLabels, {
        x: "date", y: metric,
        text: d => d.platform,
        fill: d => d.color,
        fontWeight: "600",
        fontSize: 12,
        dx: 6,
        textAnchor: "start"
      }),
      Plot.ruleY([0])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Shared Y-axis — the scale difference is real. Kalshi = US exchange trade records. Polymarket US = US-accessible volume only (separate from global Polymarket). ForecastEx = full exchange volume. Crypto.com/Nadex = event binary contracts only (from CFTC daily bulletins, starts Dec 2024); fees not available.</p>
