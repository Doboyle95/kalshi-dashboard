---
title: Overview
---

# US Prediction Market Dashboard

_Comparing regulated prediction markets in the United States. Kalshi is the dominant market leader; ForecastEx, Polymarket US, and Crypto.com/Nadex operate at significantly smaller scale. Data updated nightly._

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const fmtCount = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) ?? "";
```

```js
const totalContracts = d3.sum(kalshi, d => d.contracts_total);
const totalFees = d3.sum(kalshi, d => d.fees_total);
const peakDay = kalshi.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, kalshi[0]);
const annualizedFees = totalFees / kalshi.length * 365;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Kalshi all-time contracts</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Kalshi all-time fee revenue</div>
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Kalshi annualized run rate</div>
    <div class="kpi-value">${fmtUSD(annualizedFees)}/yr</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Kalshi peak single day</div>
    <div class="kpi-value">${fmtCount(peakDay?.contracts_total)} contracts</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
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
    platform: d.platform === "Polymarket_US" ? "Polymarket US" : d.platform,
    contracts: +d.contracts || 0,
    fees: +d.fees || 0
  }));

const allPlatforms = [...kalshiTidy, ...competitorTidy];
```

```js
const indexLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

```js
{
  const fmt = d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k";
  const pColors = {
    Kalshi: "#00C2A8", "Polymarket US": "#3B7DD8",
    ForecastEx: "#E53535", "Crypto.com/Nadex": "#9c27b0"
  };

  const byPlatform = {
    Kalshi:             kalshiTidy,
    "Polymarket US":    competitorTidy.filter(d => d.platform === "Polymarket US"),
    ForecastEx:         competitorTidy.filter(d => d.platform === "ForecastEx"),
    "Crypto.com/Nadex": competitorTidy.filter(d => d.platform === "Crypto.com/Nadex"),
  };

  // Per-date pivot for single combined tooltip
  const tipPivot = Array.from(
    d3.rollup(
      allPlatforms.filter(d => d.contracts > 0),
      rs => { const o = {date: rs[0].date}; for (const r of rs) o[r.platform] = r.contracts; return o; },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date);

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 420,
    marginRight: 16,
    x: {type: "utc", label: null},
    y: {type: indexLogScale === "Log" ? "log" : "linear", label: "Daily contracts", grid: true, tickFormat: fmt},
    color: {legend: true, domain: Object.keys(pColors), range: Object.values(pColors)},
    marks: [
      Plot.areaY(kalshiTidy, {
        x: "date", y: "contracts",
        fill: pColors.Kalshi, fillOpacity: 0.08, curve: "monotone-x"
      }),
      ...Object.entries(byPlatform).map(([name, data]) =>
        Plot.lineY(data.filter(d => d.contracts > 0), {
          x: "date", y: "contracts",
          stroke: pColors[name],
          strokeWidth: name === "Kalshi" ? 2.5 : 1.75,
          curve: "monotone-x"
        })
      ),
      Plot.ruleX(tipPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(tipPivot, Plot.pointerX({
        x: "date",
        title: d => [fmtDate(d.date), ...Object.keys(pColors).map(p => d[p] != null ? `${p}: ${fmt(d[p])}` : null).filter(Boolean)].join("\n")
      })),
      ...(indexLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#888">Shared Y-axis — the scale gap is real. Kalshi data from trade records. Competitors from public sources. Crypto.com/Nadex from CFTC daily bulletins (starts Dec 2024).</p>
