---
title: Competitors
---

# Platform Comparison

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const kalshiTidy = kalshi.map(d => ({
  date: d.date, platform: "Kalshi",
  contracts: d.contracts_total, fees: d.fees_total
}));
const forecastex = competitor.filter(d => d.platform === "ForecastEx").map(d => ({
  date: d.date, platform: "ForecastEx",
  contracts: +d.contracts, fees: +d.fees
}));
const polymarket = competitor.filter(d => d.platform === "Polymarket US").map(d => ({
  date: d.date, platform: "Polymarket US",
  contracts: +d.contracts, fees: +d.fees
}));
const all = [...kalshiTidy, ...forecastex, ...polymarket];
const xDomain = d3.extent(all, d => d.date);
```

```js
const metric = view(Inputs.radio(["contracts", "fees"], {value: "contracts", label: "Metric"}));
```

```js
{
  const fmt = metric === "contracts"
    ? d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));

  const panels = [
    {name: "Kalshi",        color: "#2c7bb6", data: kalshiTidy},
    {name: "Polymarket US", color: "#e66101", data: polymarket},
    {name: "ForecastEx",    color: "#1a9641", data: forecastex},
  ];

  const charts = panels.map(({name, color, data}, i) => {
    const isLast  = i === panels.length - 1;
    const peak    = d3.max(data, d => d[metric]) || 0;
    const peakStr = fmt(peak);

    const chart = Plot.plot({
      width,
      height: 170,
      marginLeft: 62,
      marginRight: 20,
      marginTop: 28,
      marginBottom: isLast ? 36 : 4,
      x: {
        type: "utc", label: null,
        axis: isLast ? "bottom" : null,
        domain: xDomain
      },
      y: {
        label: null, grid: true,
        ticks: 3,
        tickFormat: fmt
      },
      marks: [
        Plot.areaY(data, {
          x: "date", y: metric,
          fill: color, fillOpacity: 0.13,
          curve: "monotone-x"
        }),
        Plot.lineY(data, {
          x: "date", y: metric,
          stroke: color, strokeWidth: 2,
          curve: "monotone-x",
          tip: true
        }),
        Plot.ruleY([0], {stroke: "#e0e0e0"})
      ]
    });

    return html`<div style="position:relative;margin-bottom:${isLast ? 0 : 2}px;border-top:1px solid #e8e8e8">
      <div style="position:absolute;top:6px;left:64px;right:20px;display:flex;align-items:baseline;gap:8px;pointer-events:none">
        <span style="font-size:13px;font-weight:700;color:${color}">${name}</span>
        <span style="font-size:11px;color:#aaa">peak ${peakStr}</span>
      </div>
      ${chart}
    </div>`;
  });

  display(html`<div style="border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;background:#fff">${charts}</div>`);
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Each panel has its own Y-axis — scales are independent. Kalshi = US exchange data from trade records. Polymarket US = US-accessible volume only. ForecastEx = full exchange volume.</p>
