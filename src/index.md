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

const competitorTidy = competitor.map(d => ({
  date: new Date(d.date),
  platform: d.platform === "Polymarket_US" ? "Polymarket" : d.platform,
  contracts: +d.contracts || 0,
  fees: +d.fees || 0
}));

const allPlatforms = [...kalshiTidy, ...competitorTidy];
```

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

const filtered = allPlatforms.filter(d => d.date >= startDate);
```

```js
// All-time peaks (for scale reference table — not affected by date filter)
const allTimePeaks = {};
for (const p of ["Kalshi", "ForecastEx", "Polymarket"]) {
  const vals = allPlatforms.filter(d => d.platform === p && d.contracts > 0).map(d => d.contracts);
  allTimePeaks[p] = vals.length ? Math.max(...vals) : 0;
}

// Peaks within the selected window (for normalization)
const windowPeaks = {};
for (const p of ["Kalshi", "ForecastEx", "Polymarket"]) {
  const vals = filtered.filter(d => d.platform === p && d.contracts > 0).map(d => d.contracts);
  windowPeaks[p] = vals.length ? Math.max(...vals) : 1;
}

const normalized = filtered
  .filter(d => d.contracts > 0)
  .map(d => ({
    ...d,
    pct: d.contracts / windowPeaks[d.platform] * 100
  }));
```

```js
const colors = {Kalshi: "#2c7bb6", ForecastEx: "#d7191c", Polymarket: "#f4a736"};

Plot.plot({
  width,
  height: 420,
  color: {
    legend: true,
    domain: ["Kalshi", "ForecastEx", "Polymarket"],
    range: [colors.Kalshi, colors.ForecastEx, colors.Polymarket]
  },
  x: {type: "utc", label: null},
  y: {label: "% of own peak within window", domain: [0, 108], grid: true},
  marks: [
    Plot.lineY(normalized, {
      x: "date",
      y: "pct",
      stroke: "platform",
      strokeWidth: 1.5,
      curve: "monotone-x",
      tip: true,
      title: d => {
        const dateStr = d.date instanceof Date ? d.date.toISOString().slice(0,10) : String(d.date);
        return `${d.platform}\n${dateStr}\n${(d.contracts/1e6).toFixed(2)}M contracts\n${d.pct.toFixed(1)}% of window peak`;
      }
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Each platform normalized to 100% at its own peak within the selected window. Absolute scale varies dramatically — see table below.</p>

## Scale reference

```js
const peakTable = [
  {
    Platform: "Kalshi",
    "All-time peak (contracts/day)": allTimePeaks.Kalshi,
    "vs. Kalshi": "—"
  },
  {
    Platform: "ForecastEx",
    "All-time peak (contracts/day)": allTimePeaks.ForecastEx,
    "vs. Kalshi": allTimePeaks.ForecastEx > 0 ? `${Math.round(allTimePeaks.Kalshi / allTimePeaks.ForecastEx).toLocaleString()}× smaller` : "n/a"
  },
  {
    Platform: "Polymarket US",
    "All-time peak (contracts/day)": allTimePeaks.Polymarket,
    "vs. Kalshi": allTimePeaks.Polymarket > 0 ? `${Math.round(allTimePeaks.Kalshi / allTimePeaks.Polymarket).toLocaleString()}× smaller` : "n/a"
  },
];

Inputs.table(peakTable, {
  format: {
    "All-time peak (contracts/day)": d => d > 0 ? d.toLocaleString() : "n/a"
  },
  width: {Platform: 130, "All-time peak (contracts/day)": 200, "vs. Kalshi": 140}
})
```

<p style="font-size:0.82em;color:#888">Kalshi data from trade records via InGame. ForecastEx and Polymarket US data from public sources. Kalshi's contract definition (1¢–99¢, binary) may differ from competitors' unit definitions.</p>
