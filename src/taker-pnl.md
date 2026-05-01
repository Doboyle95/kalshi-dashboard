---
title: Taker P&L
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker P&L</h1>
  <p class="page-lead">Track whether liquidity takers made or lost money after settlement, how much they paid to enter those positions, and which categories drove the result.</p>
  <div class="page-meta">Negative values mean takers lost money. Top-line ROI uses taker notional paid where available.</div>
</div>

```js
const daily = await FileAttachment("data/taker_pnl_daily.csv").csv({typed: true});
const notionalDaily = await FileAttachment("data/taker_notional_daily.csv").csv({typed: true});
const categorySummary = await FileAttachment("data/taker_category_summary.csv").csv({typed: true});
const categoryDaily = await FileAttachment("data/taker_category_daily.csv").csv({typed: true});
const sportsDaily = await FileAttachment("data/taker_sports_daily.csv").csv({typed: true});
```

```js
const fmtCount = n => {
  const a = Math.abs(n ?? 0), s = n < 0 ? "-" : "";
  return s + (a >= 1e9 ? (a / 1e9).toFixed(1) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : String(Math.round(a)));
};
const fmtUSD = n => (n < 0 ? "-$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`;
const fmtROI = n => `${(n ?? 0).toFixed(2)}%`;
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const latestDate = d3.max(daily, d => d.date);
const earliestDate = d3.min(daily, d => d.date);
const positive = "#1a9641";
const negative = "#d7191c";
const grossColor = "#f4a736";
const netColor = "#d7191c";
```

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Gross taker P&L is settlement outcome before fees. Net taker P&L subtracts taker fees. Overall ROI uses daily taker notional paid: yes takers pay price, no takers pay 100 minus price. Category charts still use settled face value until a category-level notional export is added.</p>
</details>

<div class="control-strip">

```js
const dateWindow = view(Inputs.radio(["All history", "Since sports launch", "2026", "Last 180 days", "Last 90 days"], {
  label: "Date window",
  value: "Since sports launch"
}));
```

</div>

```js
function windowStart(label) {
  if (label === "All history") return earliestDate;
  if (label === "Since sports launch") return new Date("2025-01-23");
  if (label === "2026") return new Date("2026-01-01");
  if (label === "Last 180 days") return new Date(latestDate.getTime() - 180 * 864e5);
  if (label === "Last 90 days") return new Date(latestDate.getTime() - 90 * 864e5);
  return earliestDate;
}

const startDate = windowStart(dateWindow);
const notionalByDate = new Map(notionalDaily.map(d => [+d.date, d]));
const dailyWithNotional = daily.map(d => {
  const n = notionalByDate.get(+d.date) ?? {};
  return {
    ...d,
    notional_yes: n.notional_yes || 0,
    notional_no: n.notional_no || 0,
    notional_total: n.notional_total || 0
  };
});

const filteredDaily = dailyWithNotional
  .filter(d => d.date >= startDate && d.date <= latestDate)
  .sort((a, b) => a.date - b.date);

const totals = {
  gross: d3.sum(filteredDaily, d => d.pnl_gross || 0),
  net: d3.sum(filteredDaily, d => d.pnl_net || 0),
  fees: d3.sum(filteredDaily, d => d.fees_taker || 0),
  notional: d3.sum(filteredDaily, d => d.notional_total || 0),
  settled: d3.sum(filteredDaily, d => d.contracts_settled || 0),
  total: d3.sum(filteredDaily, d => d.contracts_total || 0)
};
totals.netPerFace = totals.settled ? totals.net / totals.settled * 100 : 0;
totals.feesPerFace = totals.settled ? totals.fees / totals.settled * 100 : 0;
totals.grossRoi = totals.notional ? totals.gross / totals.notional * 100 : 0;
totals.netRoi = totals.notional ? totals.net / totals.notional * 100 : 0;
totals.feeDragRoi = totals.notional ? totals.fees / totals.notional * 100 : 0;
totals.coverage = totals.total ? totals.settled / totals.total * 100 : 0;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="negative">
    <div class="kpi-label">Net taker P&L</div>
    <div class="kpi-value">${fmtUSD(totals.net)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Taker fees paid</div>
    <div class="kpi-value">${fmtUSD(totals.fees)}</div>
    <div class="kpi-meta">${fmtROI(totals.feeDragRoi)} of taker notional</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Net ROI on taker cost</div>
    <div class="kpi-value">${fmtROI(totals.netRoi)}</div>
    <div class="kpi-meta">${fmtUSD(totals.notional)} taker notional</div>
  </div>
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Settled coverage</div>
    <div class="kpi-value">${fmtPct(totals.coverage)}</div>
    <div class="kpi-meta">${fmtCount(totals.settled)} settled contracts</div>
  </div>
</div>

```js
let runningGross = 0;
let runningNet = 0;
let runningNotional = 0;
const cumulativeRows = filteredDaily.flatMap(d => {
  runningGross += d.pnl_gross || 0;
  runningNet += d.pnl_net || 0;
  runningNotional += d.notional_total || 0;
  return [
    {date: d.date, series: "Before fees", value: runningGross, notional: runningNotional},
    {date: d.date, series: "After fees", value: runningNet, notional: runningNotional}
  ];
});

const cumulativeTip = Array.from(
  d3.rollup(
    cumulativeRows,
    rows => {
      const out = {date: rows[0].date};
      for (const row of rows) out[row.series] = row.value;
      out.notional = rows[0].notional;
      out.netRoi = out.notional ? out["After fees"] / out.notional * 100 : 0;
      return out;
    },
    d => +d.date
  ),
  ([, value]) => value
).sort((a, b) => a.date - b.date);
```

## Cumulative Taker P&L

<p class="section-intro">The gap between the gross and net lines is fee drag. If both lines slope down, takers are losing to outcomes even before fees.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 340,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative P&L (USD)",
    grid: true,
    tickFormat: d => fmtUSD(d)
  },
  color: {legend: true, domain: ["Before fees", "After fees"], range: [grossColor, netColor]},
  marks: [
    Plot.lineY(cumulativeRows, {
      x: "date",
      y: "value",
      stroke: "series",
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.ruleX(cumulativeTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.25})),
    Plot.tip(cumulativeTip, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d["Before fees"])}\nAfter fees: ${fmtUSD(d["After fees"])}\nTaker notional: ${fmtUSD(d.notional)}\nNet ROI: ${fmtROI(d.netRoi)}`
    })),
    Plot.ruleY([0], {stroke: "currentColor", strokeOpacity: 0.35})
  ]
})
```

</div>

```js
const dailyBars = filteredDaily
  .filter(d => (d.contracts_settled || 0) >= 25000)
  .map(d => ({
    ...d,
    netPerFace: d.contracts_settled ? d.pnl_net / d.contracts_settled * 100 : 0,
    netRoi: d.notional_total ? d.pnl_net / d.notional_total * 100 : 0
  }));
```

## Daily Outcome Swings

<p class="section-intro">Bars show dollars won or lost by takers each day. Color shows severity per settled contract, so huge days and bad prices are not conflated.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily net P&L (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  color: {
    type: "diverging",
    scheme: "RdYlGn",
    domain: [-20, 20],
    label: "Net ROI on taker cost",
    legend: true
  },
  marks: [
    Plot.rectY(dailyBars, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: "pnl_net",
      fill: d => Math.max(-20, Math.min(20, d.netRoi)),
      title: d => `${fmtDate(d.date)}\nNet taker P&L: ${fmtUSD(d.pnl_net)}\nGross: ${fmtUSD(d.pnl_gross)}\nFees: ${fmtUSD(d.fees_taker)}\nTaker notional: ${fmtUSD(d.notional_total)}\nNet ROI: ${fmtROI(d.netRoi)}\nSettled contracts: ${fmtCount(d.contracts_settled)}`,
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

```js
const categoryRows = categorySummary
  .filter(d => d.contracts_settled > 0)
  .map(d => ({
    category: d.kalshi_category || "Unknown",
    gross: d.pnl_gross || 0,
    net: d.pnl_net || 0,
    fees: d.fees_taker || 0,
    settled: d.contracts_settled || 0,
    n_days: d.n_days || 0,
    netPerFace: d.contracts_settled ? d.pnl_net / d.contracts_settled * 100 : 0
  }))
  .sort((a, b) => d3.ascending(a.net, b.net));

const categoryTop = categoryRows.slice(0, 12);
```

## Category Leaderboard

<p class="section-intro">The categories where takers lost the most net dollars. The tooltip separates outcome loss from fee drag.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: categoryTop.length * 30 + 44,
  marginLeft: 170,
  x: {label: "Net taker P&L (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  y: {label: null},
  marks: [
    Plot.barX(categoryTop, {
      x: "net",
      y: "category",
      fill: d => d.net >= 0 ? positive : negative,
      sort: {y: "x"},
      title: d => `${d.category}\nNet: ${fmtUSD(d.net)}\nGross: ${fmtUSD(d.gross)}\nFees: ${fmtUSD(d.fees)}\nNet per $1 settled: ${d.netPerFace.toFixed(2)}c\nSettled contracts: ${fmtCount(d.settled)}`,
      tip: true
    }),
    Plot.ruleX([0])
  ]
})
```

</div>

```js
const sportsRows = sportsDaily
  .filter(d => d.date >= startDate && d.date <= latestDate)
  .map(d => ({
    date: d.date,
    segment: String(d.is_sports).toLowerCase() === "true" ? "Sports" : "Non-sports",
    pnl_net: d.pnl_net || 0
  }))
  .sort((a, b) => a.date - b.date);

const sportsCumulative = [];
for (const segment of ["Sports", "Non-sports"]) {
  let running = 0;
  for (const row of sportsRows.filter(d => d.segment === segment)) {
    running += row.pnl_net;
    sportsCumulative.push({...row, cumulative: running});
  }
}
```

## Sports vs Non-Sports

<p class="section-intro">This separates the newer sports regime from the older non-sports book.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative net P&L (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "#00C2A8"]},
  marks: [
    Plot.lineY(sportsCumulative, {
      x: "date",
      y: "cumulative",
      stroke: "segment",
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="control-strip">

```js
const focusCategory = view(Inputs.select(categoryRows.map(d => d.category), {
  label: "Focus category",
  value: categoryRows[0]?.category
}));
```

</div>

```js
const focusRows = categoryDaily
  .filter(d => d.kalshi_category === focusCategory && d.date >= startDate && d.date <= latestDate)
  .sort((a, b) => a.date - b.date);

let focusRunning = 0;
const focusCumulative = focusRows.map(d => {
  focusRunning += d.pnl_net || 0;
  return {...d, cumulative: focusRunning, netPerFace: d.contracts_settled ? d.pnl_net / d.contracts_settled * 100 : 0};
});
```

## Focus Category

<p class="section-intro">Use this to see whether one category's losses came from a steady grind or a few sharp settlement events.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: `${focusCategory} cumulative net P&L`, grid: true, tickFormat: d => fmtUSD(d)},
  marks: [
    Plot.lineY(focusCumulative, {
      x: "date",
      y: "cumulative",
      stroke: netColor,
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.dot(focusCumulative.filter(d => Math.abs(d.netPerFace) >= 10), {
      x: "date",
      y: "cumulative",
      fill: d => d.netPerFace >= 0 ? positive : negative,
      r: 3,
      title: d => `${fmtDate(d.date)}\nDaily net: ${fmtUSD(d.pnl_net)}\nNet per $1 settled: ${d.netPerFace.toFixed(2)}c`,
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

```js
Inputs.table(categoryRows.map(d => ({
  Category: d.category,
  "Net taker P&L": fmtUSD(d.net),
  "Gross taker P&L": fmtUSD(d.gross),
  "Fees": fmtUSD(d.fees),
  "Settled contracts": fmtCount(d.settled),
  "Net cents / $1 settled": d.netPerFace.toFixed(2),
  "Active days": d.n_days
})), {
  rows: 12
})
```
