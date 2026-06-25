---
title: Taker P&L
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker P&L</h1>
  <p class="page-lead">How Kalshi's aggressive bettors — the takers who cross the spread — did once their markets settled: what they won or lost, what fees cost them, and which categories did the damage.</p>
</div>

```js
const daily = await FileAttachment("data/taker_pnl_daily.csv").csv({typed: true});
const makerDaily = await FileAttachment("data/maker_pnl_daily.csv").csv({typed: true});
const notionalDaily = await FileAttachment("data/taker_notional_daily.csv").csv({typed: true});
const categorySummary = await FileAttachment("data/taker_category_summary.csv").csv({typed: true});
const categoryDaily = await FileAttachment("data/taker_category_daily.csv").csv({typed: true});
const sportsDaily = await FileAttachment("data/taker_sports_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Settled taker P&L", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "taker_pnl_daily.csv"), meta: "Settlement-dependent; recent-window refreshable", tone: "settlement"},
    {label: "Settled maker P&L", date: latestDate(makerDaily), updatedAt: fileUpdatedAt(freshness, "maker_pnl_daily.csv"), meta: "Settlement-dependent; recent-window refreshable", tone: "settlement"},
    {label: "Taker-side notional", date: latestDate(notionalDaily), updatedAt: fileUpdatedAt(freshness, "taker_notional_daily.csv"), meta: "Can be within minutes locally"},
    {label: "Category P&L", date: latestDate(categoryDaily), updatedAt: fileUpdatedAt(freshness, "taker_category_daily.csv"), meta: "Settlement-dependent category split", tone: "settlement"}
  ],
  note: "Recent dates can look incomplete until markets settle. Open interest is not part of the fast window refresh because it requires full rolling position state."
}));
display(askPageLink({
  question: "Explain recent taker P&L, including whether results are complete enough to interpret and which categories drove the result.",
  context: "Taker P&L page using taker_pnl_daily.csv, maker_pnl_daily.csv, taker_notional_daily.csv, taker_category_daily.csv, and taker_sports_daily.csv."
}));
```

```js
const fmtCount = n => {
  const a = Math.abs(n ?? 0), s = n < 0 ? "-" : "";
  return s + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : String(Math.round(a)));
};
const fmtUSD = n => (n < 0 ? "-$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`;
const fmtROI = n => `${(n ?? 0).toFixed(2)}%`;
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const latestPnlDate = d3.max(daily, d => d.date);
const earliestPnlDate = d3.min(daily, d => d.date);
const positive = "#1a9641";
const negative = "#d7191c";
const grossColor = "#f4a736";
const netColor = "#d7191c";
const makerGrossColor = "#2f7dd1";
const makerNetColor = "#0b4f8a";
const takerPnlSeries = ["Before fees", "After fees"];
const takerPnlColors = {"Before fees": "#5FD0C2", "After fees": "#0A7B6C"};  // cumulative: light/dark teal
const makerPnlSeries = ["Before maker fees", "After maker fees"];
const makerPnlColors = {"Before maker fees": makerGrossColor, "After maker fees": makerNetColor};
const sportsSegmentSeries = ["Sports", "Non-sports"];
const sportsSegmentColors = {"Sports": "#1a9641", "Non-sports": "#00C2A8"};
```

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Gross P&L shows how settled taker bets performed before fees; net P&L subtracts the fees they paid. Maker P&L is the other side of those same trades. ROI is measured against the taker's entry cost: the yes price for yes bets, and 100 minus the price for no bets.</p>
</details>

```js
// Mutable + brush in the same cell so the brush callback closes over the
// Mutable wrapper (see parlay.md / categories.md for the same pattern). The
// runtime hands consuming cells the unwrapped value, so a setter in another
// cell would no-op.
const takerDateSel = Mutable([
  new Date(Math.max(+new Date("2025-01-01"), +earliestPnlDate)),
  latestPnlDate
]);
display(renderDateBrush({
  data: daily,
  dateAccessor: d => d.date,
  valueAccessor: d => d.contracts_total || 0,
  initialRange: [
    new Date(Math.max(+new Date("2025-01-01"), +earliestPnlDate)),
    latestPnlDate
  ],
  onSelect: r => { takerDateSel.value = r; },
  color: grossColor,
  width
}));
```

```js
const [startDate, endDate] = takerDateSel;
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
  .filter(d => d.date >= startDate && d.date <= endDate)
  .sort((a, b) => a.date - b.date);

const filteredMakerDaily = makerDaily
  .filter(d => d.date >= startDate && d.date <= endDate)
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

const makerTotals = {
  gross: d3.sum(filteredMakerDaily, d => d.pnl_gross || 0),
  net: d3.sum(filteredMakerDaily, d => d.pnl_net || 0),
  fees: d3.sum(filteredMakerDaily, d => d.fees_maker || 0),
  settled: d3.sum(filteredMakerDaily, d => d.contracts_settled || 0)
};
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="negative">
    <div class="kpi-label">Net taker P&L</div>
    <div class="kpi-value" title="$${totals.net.toLocaleString()}">${fmtUSD(totals.net)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Taker fees paid</div>
    <div class="kpi-value" title="$${totals.fees.toLocaleString()}">${fmtUSD(totals.fees)}</div>
    <div class="kpi-meta">${fmtROI(totals.feeDragRoi)} of taker-side notional</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Net ROI on taker cost</div>
    <div class="kpi-value">${fmtROI(totals.netRoi)}</div>
    <div class="kpi-meta" title="$${totals.notional.toLocaleString()} taker-side notional">${fmtUSD(totals.notional)} taker-side notional</div>
  </div>
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Settled coverage</div>
    <div class="kpi-value">${fmtPct(totals.coverage)}</div>
    <div class="kpi-meta" title="${totals.settled.toLocaleString()} settled contracts">${fmtCount(totals.settled)} settled contracts</div>
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

<p class="section-intro">The gap between the gross and net lines is fee drag. If both lines fall, takers are losing to outcomes before fees even enter the picture.</p>

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
  color: {legend: true, domain: takerPnlSeries, range: takerPnlSeries.map(label => takerPnlColors[label])},
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
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d["Before fees"])} ($${d["Before fees"].toLocaleString()})\nAfter fees: ${fmtUSD(d["After fees"])} ($${d["After fees"].toLocaleString()})\nTaker-side notional: ${fmtUSD(d.notional)} ($${d.notional.toLocaleString()})\nNet ROI: ${fmtROI(d.netRoi)}`
    })),
    Plot.ruleY([0], {stroke: "currentColor", strokeOpacity: 0.35})
  ]
})
```

</div>

```js
let runningMakerGross = 0;
let runningMakerNet = 0;
const makerCumulativeRows = filteredMakerDaily.flatMap(d => {
  runningMakerGross += d.pnl_gross || 0;
  runningMakerNet += d.pnl_net || 0;
  return [
    {date: d.date, series: "Before maker fees", value: runningMakerGross, dailyGross: d.pnl_gross || 0, dailyNet: d.pnl_net || 0, fees: d.fees_maker || 0, contracts: d.contracts_settled || 0},
    {date: d.date, series: "After maker fees", value: runningMakerNet, dailyGross: d.pnl_gross || 0, dailyNet: d.pnl_net || 0, fees: d.fees_maker || 0, contracts: d.contracts_settled || 0}
  ];
});

const makerCumulativeTip = Array.from(
  d3.rollup(
    makerCumulativeRows,
    rows => {
      const out = {date: rows[0].date, dailyGross: rows[0].dailyGross, dailyNet: rows[0].dailyNet, fees: rows[0].fees, contracts: rows[0].contracts};
      for (const row of rows) out[row.series] = row.value;
      return out;
    },
    d => +d.date
  ),
  ([, value]) => value
).sort((a, b) => a.date - b.date);
```

## Cumulative Maker P&L

<p class="section-intro">Maker P&L is the other side of those same settled taker trades. The gap between the lines is maker fees, which only apply in maker-fee markets and changed from flat per-contract pricing to a price-curve fee in July 2025.</p>

<div class="instruction-line"><strong>Useful trick:</strong> the maker chart is the taker chart flipped around — a steep taker loss means the market-makers on the other side won big.</div>

<div class="kpi-grid compact-kpis">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Net maker P&L</div>
    <div class="kpi-value" title="$${makerTotals.net.toLocaleString()}">${fmtUSD(makerTotals.net)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Maker fees paid</div>
    <div class="kpi-value" title="$${makerTotals.fees.toLocaleString()}">${fmtUSD(makerTotals.fees)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Gross maker P&L</div>
    <div class="kpi-value" title="$${makerTotals.gross.toLocaleString()}">${fmtUSD(makerTotals.gross)}</div>
  </div>
</div>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 320,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative maker P&L (USD)",
    grid: true,
    tickFormat: d => fmtUSD(d)
  },
  color: {legend: true, domain: makerPnlSeries, range: makerPnlSeries.map(label => makerPnlColors[label])},
  marks: [
    Plot.lineY(makerCumulativeRows, {
      x: "date",
      y: "value",
      stroke: "series",
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.ruleX(makerCumulativeTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.25})),
    Plot.tip(makerCumulativeTip, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nBefore maker fees: ${fmtUSD(d["Before maker fees"])} ($${d["Before maker fees"].toLocaleString()})\nAfter maker fees: ${fmtUSD(d["After maker fees"])} ($${d["After maker fees"].toLocaleString()})\nDaily gross maker P&L: ${fmtUSD(d.dailyGross)}\nDaily net maker P&L: ${fmtUSD(d.dailyNet)}\nMaker fees: ${fmtUSD(d.fees)}\nSettled contracts: ${fmtCount(d.contracts)} (${d.contracts.toLocaleString()})`
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

<p class="section-intro">Each day's net result for takers, colored by return on what they staked — so a big-dollar day isn't mistaken for a high-percentage one.</p>

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
      title: d => `${fmtDate(d.date)}\nNet taker P&L: ${fmtUSD(d.pnl_net)}\nGross: ${fmtUSD(d.pnl_gross)}\nFees: ${fmtUSD(d.fees_taker)}\nTaker-side notional: ${fmtUSD(d.notional_total)}\nNet ROI: ${fmtROI(d.netRoi)}\nSettled contracts: ${fmtCount(d.contracts_settled)}`,
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

<p class="section-intro">The categories where takers won or lost the most net dollars.</p>

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
  .filter(d => d.date >= startDate && d.date <= endDate)
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

<details class="surface-card compact-details secondary-section">
  <summary>Sports vs non-sports detail</summary>
  <p>Optional split between the newer sports regime and the older non-sports book.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative net P&L (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  color: {legend: true, domain: sportsSegmentSeries, range: sportsSegmentSeries.map(label => sportsSegmentColors[label])},
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

</details>

<details class="surface-card compact-details secondary-section">
  <summary>Focus category detail</summary>
  <p>Optional drill-in for whether one category's losses came from a steady grind or a few sharp settlement events.</p>

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
  .filter(d => d.kalshi_category === focusCategory && d.date >= startDate && d.date <= endDate)
  .sort((a, b) => a.date - b.date);

let focusRunning = 0;
const focusCumulative = focusRows.map(d => {
  focusRunning += d.pnl_net || 0;
  return {...d, cumulative: focusRunning, netPerFace: d.contracts_settled ? d.pnl_net / d.contracts_settled * 100 : 0};
});
```

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

</details>

```js
Inputs.table(categoryRows.map(d => ({
  Category: d.category,
  "Net taker P&L": "$" + Math.round(d.net).toLocaleString(),
  "Gross taker P&L": "$" + Math.round(d.gross).toLocaleString(),
  "Fees": "$" + Math.round(d.fees).toLocaleString(),
  "Settled contracts": Math.round(d.settled).toLocaleString(),
  "Net cents / $1 settled": d.netPerFace.toFixed(2),
  "Active days": d.n_days
})), {
  rows: 12
})
```
