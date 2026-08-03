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
const takerVolumeDaily = await FileAttachment("data/taker_notional_daily.csv").csv({typed: true});
const pnlByTicker = await FileAttachment("data/taker_pnl_by_ticker_daily.csv").csv({typed: true});
const categoryLeaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const sportsDaily = await FileAttachment("data/taker_sports_daily.csv").csv({typed: true});
const pnlByMarket = await FileAttachment("data/taker_pnl_by_market_leaderboard.csv").csv({typed: true});
const marketLeaderboard = await FileAttachment("data/market_leaderboard.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
import {hashGet, hashInput} from "./components/hash-state.js";
import {buildReportTickerToCat, TAKER_GENERAL_MAP} from "./components/taker-categories.js";
import {bestName, fmtWinner, fmtStrike, parseMarketDateFromKey} from "./components/ticker-names.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Settled taker P&L", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "taker_pnl_daily.csv"), meta: "Settlement-dependent; recent-window refreshable", tone: "settlement"},
    {label: "Settled maker P&L", date: latestDate(makerDaily), updatedAt: fileUpdatedAt(freshness, "maker_pnl_daily.csv"), meta: "Settlement-dependent; recent-window refreshable", tone: "settlement"},
    {label: "Taker-side volume", date: latestDate(takerVolumeDaily), updatedAt: fileUpdatedAt(freshness, "taker_notional_daily.csv"), meta: "Can be within minutes locally"},
    {label: "Category P&L", date: latestDate(pnlByTicker), updatedAt: fileUpdatedAt(freshness, "taker_pnl_by_ticker_daily.csv"), meta: "Settlement-dependent category split", tone: "settlement"},
    {label: "Market P&L leaderboard", date: null, value: `${pnlByMarket.length.toLocaleString()} markets`, updatedAt: fileUpdatedAt(freshness, "taker_pnl_by_market_leaderboard.csv"), meta: "All-time, refreshed once daily (not the settlement-cycle cadence above)", tone: "settlement"}
  ],
  note: "Recent dates can look incomplete until markets settle. Open interest is not part of the fast window refresh because it requires full rolling position state."
}));
display(askPageLink({
  question: "Explain recent taker P&L, including whether results are complete enough to interpret and which categories drove the result.",
  context: "Taker P&L page using taker_pnl_daily.csv, maker_pnl_daily.csv, taker_notional_daily.csv, taker_pnl_by_ticker_daily.csv, taker_sports_daily.csv, and taker_pnl_by_market_leaderboard.csv."
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
const takerVolumeByDate = new Map(takerVolumeDaily.map(d => [+d.date, d]));
const dailyWithTakerVolume = daily.map(d => {
  const n = takerVolumeByDate.get(+d.date) ?? {};
  return {
    ...d,
    notional_yes: n.notional_yes || 0,
    notional_no: n.notional_no || 0,
    notional_total: n.notional_total || 0
  };
});

const filteredDaily = dailyWithTakerVolume
  .filter(d => d.date >= startDate && d.date <= endDate)
  .sort((a, b) => a.date - b.date);

const filteredMakerDaily = makerDaily
  .filter(d => d.date >= startDate && d.date <= endDate)
  .sort((a, b) => a.date - b.date);

const totals = {
  gross: d3.sum(filteredDaily, d => d.pnl_gross || 0),
  net: d3.sum(filteredDaily, d => d.pnl_net || 0),
  fees: d3.sum(filteredDaily, d => d.fees_taker || 0),
  takerVolume: d3.sum(filteredDaily, d => d.notional_total || 0),
  settled: d3.sum(filteredDaily, d => d.contracts_settled || 0),
  total: d3.sum(filteredDaily, d => d.contracts_total || 0)
};
totals.netPerFace = totals.settled ? totals.net / totals.settled * 100 : 0;
totals.feesPerFace = totals.settled ? totals.fees / totals.settled * 100 : 0;
totals.grossRoi = totals.takerVolume ? totals.gross / totals.takerVolume * 100 : 0;
totals.netRoi = totals.takerVolume ? totals.net / totals.takerVolume * 100 : 0;
totals.feeDragRoi = totals.takerVolume ? totals.fees / totals.takerVolume * 100 : 0;
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
    <div class="kpi-meta">${fmtROI(totals.feeDragRoi)} of taker-side volume</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Net ROI on taker cost</div>
    <div class="kpi-value">${fmtROI(totals.netRoi)}</div>
    <div class="kpi-meta" title="$${totals.takerVolume.toLocaleString()} taker-side volume">${fmtUSD(totals.takerVolume)} taker-side volume</div>
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
let runningTakerVolume = 0;
const cumulativeRows = filteredDaily.flatMap(d => {
  runningGross += d.pnl_gross || 0;
  runningNet += d.pnl_net || 0;
  runningTakerVolume += d.notional_total || 0;
  return [
    {date: d.date, series: "Before fees", value: runningGross, takerVolume: runningTakerVolume},
    {date: d.date, series: "After fees", value: runningNet, takerVolume: runningTakerVolume}
  ];
});

const cumulativeTip = Array.from(
  d3.rollup(
    cumulativeRows,
    rows => {
      const out = {date: rows[0].date};
      for (const row of rows) out[row.series] = row.value;
      out.takerVolume = rows[0].takerVolume;
      out.netRoi = out.takerVolume ? out["After fees"] / out.takerVolume * 100 : 0;
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
      title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d["Before fees"])} ($${d["Before fees"].toLocaleString()})\nAfter fees: ${fmtUSD(d["After fees"])} ($${d["After fees"].toLocaleString()})\nTaker-side volume: ${fmtUSD(d.takerVolume)} ($${d.takerVolume.toLocaleString()})\nNet ROI: ${fmtROI(d.netRoi)}`
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
      title: d => `${fmtDate(d.date)}\nNet taker P&L: ${fmtUSD(d.pnl_net)}\nGross: ${fmtUSD(d.pnl_gross)}\nFees: ${fmtUSD(d.fees_taker)}\nTaker-side volume: ${fmtUSD(d.notional_total)}\nNet ROI: ${fmtROI(d.netRoi)}\nSettled contracts: ${fmtCount(d.contracts_settled)}`,
      tip: true
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

```js
// ── Category classification: report_ticker -> cat, sport-by-sport instead of Kalshi's own
// coarse kalshi_category (see components/taker-categories.js, shared with taker.md).
const reportTickerToCat = buildReportTickerToCat(categoryLeaderboard);
```

<div class="control-strip">

```js
const pnlCatDetail = view(hashInput("pnlCatDetail", Inputs.radio(["General", "Detailed"], {value: hashGet("pnlCatDetail", "General"), label: "Categories"})));
```

</div>

```js
// Reclassify the per-ticker DAILY P&L into detailed categories once, then collapse to General if
// that's the active toggle. Shared by the leaderboard below (summed to all-time) and the Focus
// category detail section further down (kept at daily grain there).
const pnlByTickerCatDaily = pnlByTicker.map(d => {
  const detailCat = reportTickerToCat.get(d.report_ticker) || "Uncategorized";
  return {
    date: d.date,
    category: pnlCatDetail === "Detailed" ? detailCat : (TAKER_GENERAL_MAP[detailCat] || "Uncategorized"),
    pnl_gross: d.pnl_gross || 0,
    pnl_net: d.pnl_net || 0,
    fees_taker: d.fees_taker || 0,
    fees_maker: d.fees_maker || 0,
    contracts_settled: d.contracts_settled || 0
  };
});

const pnlSummaryByCat = new Map();
for (const d of pnlByTickerCatDaily) {
  if (!(d.contracts_settled > 0)) continue;
  const acc = pnlSummaryByCat.get(d.category) || {category: d.category, gross: 0, net: 0, fees: 0, feesMaker: 0, settled: 0, days: new Set()};
  acc.gross += d.pnl_gross;
  acc.net += d.pnl_net;
  acc.fees += d.fees_taker;
  acc.feesMaker += d.fees_maker;
  acc.settled += d.contracts_settled;
  acc.days.add(+d.date);
  pnlSummaryByCat.set(d.category, acc);
}

const categoryRows = Array.from(pnlSummaryByCat.values())
  .map(d => ({
    category: d.category,
    gross: d.gross,
    net: d.net,
    fees: d.fees,
    feesMaker: d.feesMaker,
    settled: d.settled,
    n_days: d.days.size,
    netPerFace: d.settled ? d.net / d.settled * 100 : 0
  }))
  .sort((a, b) => d3.ascending(a.net, b.net));

// Top by |net| — categoryRows is sorted ascending (most negative first), so a bare
// slice could never show a category where takers WON if one ever goes positive.
const categoryTop = [...categoryRows]
  .sort((a, b) => d3.descending(Math.abs(a.net), Math.abs(b.net)))
  .slice(0, pnlCatDetail === "Detailed" ? 15 : 7);
```

## Category Leaderboard

<p class="section-intro">The categories where takers won or lost the most net dollars — sports broken out sport-by-sport rather than lumped into one Kalshi "Sports" bucket. Switch to Detailed for the sport-by-sport split.</p>

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
      title: d => `${d.category}\nNet: ${fmtUSD(d.net)}\nGross: ${fmtUSD(d.gross)}\nTaker fees: ${fmtUSD(d.fees)}\nMaker fees: ${fmtUSD(d.feesMaker)}\nNet per $1 settled: ${d.netPerFace.toFixed(2)}c\nSettled contracts: ${fmtCount(d.settled)}`,
      tip: true
    }),
    Plot.ruleX([0])
  ]
})
```

</div>

<details class="surface-card compact-details secondary-section">
  <summary>Maker fee revenue by category</summary>
  <p>The other side of the same trades: which categories generate the most fee revenue from market-makers, not just takers. Maker-fee markets are a small subset of Kalshi's book, so most categories show little or nothing here even when taker activity is high.</p>

```js
const makerFeeTop = [...categoryRows]
  .filter(d => d.feesMaker > 0)
  .sort((a, b) => d3.descending(a.feesMaker, b.feesMaker))
  .slice(0, pnlCatDetail === "Detailed" ? 15 : 7);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: Math.max(makerFeeTop.length, 1) * 30 + 44,
  marginLeft: 170,
  x: {label: "Maker fees (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  y: {label: null},
  marks: [
    Plot.barX(makerFeeTop, {
      x: "feesMaker",
      y: "category",
      fill: makerGrossColor,
      sort: {y: "x"},
      title: d => `${d.category}\nMaker fees: ${fmtUSD(d.feesMaker)}\nSettled contracts: ${fmtCount(d.settled)}`,
      tip: true
    }),
    Plot.ruleX([0])
  ]
})
```

</div>

<p class="chart-note">${makerFeeTop.length === 0 ? "No maker-fee revenue in any category for the current toggle." : `${makerFeeTop.length} of ${categoryRows.length} categories have maker-fee revenue.`}</p>

</details>

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
// pnlByTickerCatDaily (defined above, next to the leaderboard) already has every report_ticker
// reclassified into the active toggle's categories - sum across every one that lands in
// focusCategory (a General bucket like "Football" spans multiple report_tickers).
const focusRows = Array.from(
  d3.rollup(
    pnlByTickerCatDaily.filter(d => d.category === focusCategory && d.date >= startDate && d.date <= endDate),
    rows => ({
      pnl_net: d3.sum(rows, r => r.pnl_net),
      contracts_settled: d3.sum(rows, r => r.contracts_settled)
    }),
    d => +d.date
  ),
  ([t, v]) => ({date: new Date(t), ...v})
).sort((a, b) => a.date - b.date);

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
  "Taker fees": "$" + Math.round(d.fees).toLocaleString(),
  "Maker fees": "$" + Math.round(d.feesMaker).toLocaleString(),
  "Settled contracts": Math.round(d.settled).toLocaleString(),
  "Net cents / $1 settled": d.netPerFace.toFixed(2),
  "Active days": d.n_days
})), {
  rows: 12
})
```

## Market Leaderboard

<p class="section-intro">The individual settled markets — specific real-world events, not categories or recurring series — where takers made or lost the most money. Toggle to see the biggest taker wins (maker losses) or the biggest taker losses (maker wins).</p>

```js
// Join the P&L-ranked leaderboard onto market_leaderboard.csv's display enrichment by
// market_key. market_leaderboard.csv is capped at its own top-1000-by-volume, so some
// big-P&L-swing markets outside that cutoff won't have a match here - bestName/fmtWinner/
// fmtStrike (components/ticker-names.js) already degrade gracefully to the raw market_key
// in that case, same fallback categories.md itself depends on.
const marketLeaderboardByKey = new Map(marketLeaderboard.map(d => [d.market_key, d]));

const marketPnlRows = pnlByMarket
  .filter(d => d.contracts_settled > 0)
  .map(d => {
    const enrich = marketLeaderboardByKey.get(d.market_key) || {};
    const merged = {...enrich, ...d};
    return {
      market_key: d.market_key,
      display_name: bestName(merged),
      winner_display: fmtWinner(merged),
      market_date: parseMarketDateFromKey(d.market_key) || (enrich.last_trade_date ? new Date(enrich.last_trade_date) : null),
      taker_pnl_gross: d.taker_pnl_gross || 0,
      taker_pnl_net: d.taker_pnl_net || 0,
      maker_pnl_net: d.maker_pnl_net || 0,
      taker_roi_pct: d.notional_settled ? (d.taker_pnl_net / d.notional_settled * 100) : 0,
      contracts_settled: d.contracts_settled || 0
    };
  });
```

<div class="control-strip">

```js
const marketPnlDirection = view(hashInput("marketPnlDirection", Inputs.radio(
  ["Takers profited", "Makers profited"],
  {value: hashGet("marketPnlDirection", "Takers profited"), label: "Direction"}
)));
```

</div>

```js
// Maker P&L is defined as the exact mirror of taker P&L (same trades, other side), so
// filtering on taker_pnl_net's sign alone is sufficient - no need to check both columns.
const marketPnlFiltered = marketPnlRows
  .filter(d => marketPnlDirection === "Takers profited" ? d.taker_pnl_net > 0 : d.taker_pnl_net < 0)
  .sort((a, b) => marketPnlDirection === "Takers profited"
    ? d3.descending(a.taker_pnl_net, b.taker_pnl_net)
    : d3.ascending(a.taker_pnl_net, b.taker_pnl_net));
```

<div class="plot-shell">

```js
const marketPnlTop = marketPnlFiltered.slice(0, 15);
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: marketPnlTop.length * 30 + 44,
  marginLeft: 240,
  x: {label: "Net taker P&L (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  y: {label: null},
  marks: [
    Plot.barX(marketPnlTop, {
      x: "taker_pnl_net",
      y: d => d.display_name,
      fill: d => d.taker_pnl_net >= 0 ? positive : negative,
      sort: {y: "x"},
      title: d => `${d.display_name}\nTaker net: ${fmtUSD(d.taker_pnl_net)}\nTaker gross: ${fmtUSD(d.taker_pnl_gross)}\nMaker net: ${fmtUSD(d.maker_pnl_net)}\nTaker ROI: ${d.taker_roi_pct.toFixed(2)}%\nSettled contracts: ${fmtCount(d.contracts_settled)}\nWinner: ${d.winner_display}`,
      tip: true
    }),
    Plot.ruleX([0])
  ]
})
```

</div>

<p class="chart-note">Ranked by net taker P&L magnitude within the selected direction. Includes only markets settled since 2026-04-15 (the start of the current P&L data scope) — pre-2026 markets, including the 2024 election, have no P&L data to rank by and won't appear here.</p>

```js
const marketPnlSearch = view(Inputs.search(marketPnlFiltered, {placeholder: "Search markets..."}));
```

```js
Inputs.table(marketPnlSearch, {
  columns: ["display_name", "market_date", "taker_pnl_gross", "taker_pnl_net", "maker_pnl_net", "taker_roi_pct", "contracts_settled", "winner_display"],
  header: {
    display_name: "Market",
    market_date: "Date",
    taker_pnl_gross: "Taker P&L (before fees)",
    taker_pnl_net: "Taker P&L (after fees)",
    maker_pnl_net: "Maker P&L (after fees)",
    taker_roi_pct: "Taker ROI (% of stakes)",
    contracts_settled: "Settled contracts",
    winner_display: "Winner"
  },
  format: {
    taker_pnl_gross: d => fmtUSD(d),
    taker_pnl_net: d => fmtUSD(d),
    maker_pnl_net: d => fmtUSD(d),
    taker_roi_pct: d => fmtROI(d),
    contracts_settled: d => fmtCount(d),
    market_date: d => d ? d.toLocaleDateString("en-US", {timeZone: "UTC"}) : "—",
    display_name: v => html`<div title=${v ?? ""}>${v}</div>`
  },
  align: {taker_pnl_gross: "right", taker_pnl_net: "right", maker_pnl_net: "right", taker_roi_pct: "right", contracts_settled: "right"},
  width: {display_name: 280, market_date: 90},
  rows: 15
})
```
