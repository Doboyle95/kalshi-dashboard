---
title: Competitors
---

# Platform Comparison

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
import {hashGet, hashInput} from "./components/hash-state.js";
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
    // $0.02 flat fee per contract (exchange fee for $1 event contracts; settlement fees waived)
    data: competitor.filter(d => d.platform === "Crypto.com/Nadex")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
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
const metric = view(hashInput("metric", Inputs.radio(["contracts", "fees"], {value: hashGet("metric", "contracts"), label: "Metric"})));
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
    marginRight: 16,
    x: {type: "utc", label: null},
    y: {
      label: metric === "contracts" ? "Daily contracts" : "Daily fees (USD)",
      grid: true,
      tickFormat: fmt
    },
    color: {legend: true, domain: colorDomain, range: colorRange},
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
      Plot.ruleX(all, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.25})),
      Plot.ruleY([0])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Shared Y-axis — the scale difference is real. Kalshi = US exchange trade records. Polymarket US = US-accessible volume only (separate from global Polymarket). ForecastEx = full exchange volume. Crypto.com/Nadex = event binary contracts only (from CFTC daily bulletins, starts Dec 2024); fees computed at $0.02/contract (exchange fee for $1 contracts; settlement fees waived).</p>

## Market share over time

_Weekly contract share across the four US regulated venues. Gaps where a platform had no reported volume are treated as 0._

```js
// Build weekly totals per platform for the shared date range so 100% stacks
// look clean (daily values are too noisy for a share chart).
const weekKey = d => d3.utcMonday.floor(d);
const byWeek = d3.rollup(
  all.filter(d => d.contracts != null && d.contracts >= 0),
  v => d3.sum(v, d => d.contracts || 0),
  d => +weekKey(d.date),
  d => d.platform
);

const shareStart = d3.min(competitor, d => d.date) || new Date("2024-12-01");
const shareData = [];
for (const [ts, byP] of byWeek) {
  const week = new Date(+ts);
  if (week < shareStart) continue;
  const total = d3.sum([...byP.values()]);
  if (!total) continue;
  for (const p of platforms) {
    shareData.push({
      date: week,
      platform: p.name,
      contracts: byP.get(p.name) || 0,
      share: (byP.get(p.name) || 0) / total
    });
  }
}
```

```js
Plot.plot({
  width,
  height: 320,
  marginRight: 16,
  x: {type: "utc", label: null},
  y: {label: "Share of weekly contracts", grid: true, tickFormat: "%", domain: [0, 1]},
  color: {legend: true, domain: platforms.map(p => p.name), range: platforms.map(p => p.color)},
  marks: [
    Plot.areaY(shareData, {
      x: "date",
      y: "share",
      fill: "platform",
      order: platforms.map(p => p.name),
      curve: "monotone-x",
      fillOpacity: 0.9,
      tip: true,
      title: d => `${d.platform}\n${d3.timeFormat("%b %-d, %Y")(d.date)}\n${(d.share * 100).toFixed(1)}% · ${(d.contracts || 0).toLocaleString()} contracts`
    }),
    Plot.ruleX(shareData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.3})),
    Plot.ruleY([0, 1])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Weekly aggregation (Monday-start). Chart begins when the first competitor reports non-zero volume. Values sum to 100% within each week.</p>
