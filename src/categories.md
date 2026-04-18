---
title: Categories
---

# Categories

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
```

```js
const filtered = leaderboard
  .filter(d => showSports === "All" ? true : showSports === "Sports only" ? d.is_sports === "TRUE" : d.is_sports === "FALSE")
  .sort((a, b) => b[metric] - a[metric])
  .slice(0, 25);
```

```js
Plot.plot({
  width,
  height: filtered.length * 22 + 40,
  marginLeft: 220,
  x: {label: metric, grid: true},
  y: {label: null},
  marks: [
    Plot.barX(filtered, {
      x: metric,
      y: "report_ticker",
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#2c7bb6",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.report_ticker}\n${metric}: ${d[metric]?.toLocaleString()}\nSports: ${d.is_sports}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">■ Sports</span> &nbsp; <span style="color:#2c7bb6">■ Non-sports</span>

## Top categories over time

```js
// Melt wide daily_top_categories to tidy format
const catCols = Object.keys(topDaily[0]).filter(k => k !== "date");
const tidyCats = topDaily.flatMap(row =>
  catCols.map(cat => ({
    date: row.date,
    category: cat,
    contracts: +row[cat] || 0
  }))
);

// Pick top 8 by total contracts for legibility
const totals = catCols.map(c => ({
  cat: c,
  total: topDaily.reduce((s, r) => s + (+r[c] || 0), 0)
})).sort((a, b) => b.total - a.total);
const top8 = new Set(totals.slice(0, 8).map(d => d.cat));
const tidyTop8 = tidyCats.filter(d => top8.has(d.category) && d.contracts > 0);
```

```js
Plot.plot({
  width,
  height: 380,
  color: {legend: true, columns: 2},
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.lineY(tidyTop8, {
      x: "date",
      y: "contracts",
      stroke: "category",
      curve: "monotone-x",
      tip: true
    })
  ]
})
```
