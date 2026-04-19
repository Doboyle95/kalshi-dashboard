---
title: Overview
---

# US Prediction Market Dashboard

_Comparing regulated prediction markets in the United States. Kalshi is the dominant market leader; ForecastEx and Polymarket US operate at significantly smaller scale. Data updated nightly._

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const totalContracts = d3.sum(kalshi, d => d.contracts_total);
const totalFees = d3.sum(kalshi, d => d.fees_total);
const peakDay = kalshi.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, kalshi[0]);
const annualizedFees = totalFees / kalshi.length * 365;
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Kalshi all-time contracts</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">${(totalContracts/1e9).toFixed(1)}B</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #756bb1;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Kalshi all-time fee revenue</div>
    <div style="font-size:1.6em;font-weight:700;color:#756bb1">$${(totalFees/1e6).toFixed(0)}M</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #3f007d;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Kalshi annualized run rate</div>
    <div style="font-size:1.6em;font-weight:700;color:#3f007d">$${(annualizedFees/1e6).toFixed(0)}M/yr</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Kalshi peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${(peakDay?.contracts_total/1e6).toFixed(0)}M contracts</div>
    <div style="font-size:0.72em;color:#999">${peakDay?.date?.toISOString().slice(0,10)}</div>
  </div>
</div>

## Platform comparison

```js
const kalshiTidy = kalshi.map(d => ({
  date: d.date,
  platform: "Kalshi",
  contracts: d.contracts_total,
  fees: d.fees_total
}));

const competitorTidy = competitor
  .filter(d => d.platform !== "Kalshi")
  .map(d => ({
    date: new Date(d.date),
    platform: d.platform === "Polymarket_US" ? "Polymarket" : d.platform,
    contracts: +d.contracts || 0,
    fees: +d.fees || 0
  }));

const allPlatforms = [...kalshiTidy, ...competitorTidy];
```

```js
{
  const fmt = d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k";
  const pColors = {Kalshi: "#2c7bb6", ForecastEx: "#1a9641", Polymarket: "#e66101"};

  const byPlatform = {
    Kalshi:      kalshiTidy,
    Polymarket:  competitorTidy.filter(d => d.platform === "Polymarket"),
    ForecastEx:  competitorTidy.filter(d => d.platform === "ForecastEx"),
  };

  const lastLabels = Object.entries(byPlatform).map(([name, data]) => {
    const last = data.filter(d => d.contracts > 0).at(-1);
    return last ? {...last, platform: name} : null;
  }).filter(Boolean);

  display(Plot.plot({
    width,
    height: 420,
    marginRight: 100,
    x: {type: "utc", label: null},
    y: {label: "Daily contracts", grid: true, tickFormat: fmt},
    color: {domain: Object.keys(pColors), range: Object.values(pColors)},
    marks: [
      Plot.areaY(kalshiTidy, {
        x: "date", y: "contracts",
        fill: pColors.Kalshi, fillOpacity: 0.08, curve: "monotone-x"
      }),
      ...Object.entries(byPlatform).map(([name, data]) =>
        Plot.lineY(data, {
          x: "date", y: "contracts",
          stroke: pColors[name],
          strokeWidth: name === "Kalshi" ? 2.5 : 1.75,
          curve: "monotone-x", tip: true
        })
      ),
      Plot.text(lastLabels, {
        x: "date", y: "contracts",
        text: d => d.platform,
        fill: d => pColors[d.platform],
        fontWeight: "600", fontSize: 12,
        dx: 6, textAnchor: "start"
      }),
      Plot.ruleY([0])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#888">Shared Y-axis — the scale gap is real. Kalshi data from trade records. ForecastEx and Polymarket US from public sources.</p>
