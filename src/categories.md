---
title: Categories
---

# Kalshi Categories

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
```

## All-time leaderboard

```js
const metric = view(Inputs.select(["contracts", "fees", "notional"], {
  label: "Metric", value: "contracts"
}));
const showSports = view(Inputs.select(["All", "Sports only", "Non-sports only"], {
  label: "Filter", value: "All"
}));
const period = view(Inputs.select(["All time", "Since 2025", "Since 2026", "Last 90 days"], {
  label: "Period", value: "Since 2025"
}));
```

```js
// For filtered periods, aggregate from daily_top_categories (covers top 15 tickers)
// For all-time, use the full leaderboard
const cutoff = period === "Since 2026" ? new Date("2026-01-01")
  : period === "Since 2025" ? new Date("2025-01-01")
  : period === "Last 90 days" ? new Date(Date.now() - 90 * 864e5)
  : new Date("2021-01-01");

const catCols = Object.keys(topDaily[0]).filter(k => k !== "date");

// Aggregate contracts from daily data for the selected period (top 15 tickers)
const dailyAgg = catCols.map(cat => {
  const total = topDaily
    .filter(d => d.date >= cutoff)
    .reduce((s, r) => s + (+r[cat] || 0), 0);
  const meta = leaderboard.find(l => l.report_ticker === cat) || {};
  return {
    report_ticker: cat,
    contracts: total,
    fees: (meta.fees || 0) * (total / (meta.contracts || 1)),  // rough proportional estimate
    notional: (meta.notional || 0) * (total / (meta.contracts || 1)),
    is_sports: meta.is_sports ?? "FALSE"
  };
}).filter(d => d.contracts > 0);

// Use full leaderboard for all-time, aggregated daily data for filtered periods
const source = period === "All time" ? leaderboard : dailyAgg;

const filtered = source
  .filter(d => showSports === "All" ? true : showSports === "Sports only" ? d.is_sports === "TRUE" : d.is_sports === "FALSE")
  .sort((a, b) => b[metric] - a[metric])
  .slice(0, 25);
```

```js
Plot.plot({
  width,
  height: filtered.length * 22 + 40,
  marginLeft: 220,
  x: {label: metric === "contracts" ? "Contracts" : metric === "fees" ? "Fees (USD)" : "Notional (USD)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(filtered, {
      x: metric,
      y: "report_ticker",
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#2c7bb6",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.report_ticker}\n${metric}: ${d[metric]?.toLocaleString?.() ?? d[metric]}\nSports: ${d.is_sports}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">■ Sports</span> &nbsp; <span style="color:#2c7bb6">■ Non-sports</span>

${period !== "All time" ? html`<p style="font-size:0.82em;color:#888">Filtered view covers the top 15 tracked categories. All-time view covers all categories.</p>` : ""}

## Top categories over time

```js
// Top 5 categories by all-time volume
const totals = catCols.map(c => ({
  cat: c,
  total: topDaily.reduce((s, r) => s + (+r[c] || 0), 0)
})).sort((a, b) => b.total - a.total);

const top5 = totals.slice(0, 5).map(d => d.cat);

const sinceChart = view(Inputs.select(["All time", "Since 2025", "Since 2026"], {
  label: "Time period", value: "Since 2025"
}));
```

```js
const chartStart = sinceChart === "Since 2026" ? new Date("2026-01-01")
  : sinceChart === "Since 2025" ? new Date("2025-01-01")
  : new Date("2021-01-01");

const top5Tidy = topDaily
  .filter(d => d.date >= chartStart)
  .flatMap(row =>
    top5.map(cat => ({
      date: row.date,
      category: cat,
      contracts: +row[cat] || 0
    }))
  )
  .filter(d => d.contracts > 0);
```

```js
Plot.plot({
  width,
  height: 380,
  color: {legend: true, columns: 2},
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(top5Tidy, {
      x: "date",
      y: "contracts",
      fill: "category",
      curve: "monotone-x",
      fillOpacity: 0.85
    }),
    Plot.ruleY([0])
  ]
})
```
