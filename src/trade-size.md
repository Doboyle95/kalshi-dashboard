---
title: Trade Size Mix
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi microstructure</div>
  <h1>Trade Size Mix</h1>
  <p class="page-lead">Whether a day's volume came from a crowd of small bets or a handful of huge blocks — and a radar that flags the days the big money showed up.</p>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtPct = n => `${((n ?? 0) * 100).toFixed((n ?? 0) >= 0.1 ? 1 : 2)}%`;
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const tradeSizeRaw = await FileAttachment("data/trade_size_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Trade-size mix", date: latestDate(tradeSizeRaw), updatedAt: fileUpdatedAt(freshness, "trade_size_daily.csv"), meta: "Kalshi can be within 15 minutes locally; competitors follow public files"},
    {label: "Supported platforms", value: "Kalshi, Polymarket US, ForecastEx, DKeX", updatedAt: fileUpdatedAt(freshness, "trade_size_daily.csv"), meta: "Crypto.com/Nadex omitted: no trade-level prints", tone: "competitor"}
  ],
  note: "Competitor rows update when their public trade files are downloaded and rebuilt."
}));
display(askPageLink({
  question: "Look for unusual recent large-trade activity and compare large-trade share across supported platforms.",
  context: "Trade Size Mix page using trade_size_daily.csv."
}));
```

```js
const BUCKETS = [
  {bucket: "1-9", order: 1, color: "#d8f3ee"},
  {bucket: "10-99", order: 2, color: "#aee5dc"},
  {bucket: "100-999", order: 3, color: "#73d2c4"},
  {bucket: "1k-9k", order: 4, color: "#2fb7a8"},
  {bucket: "10k-49k", order: 5, color: "#f5a35c"},
  {bucket: "50k-99k", order: 6, color: "#e15759"},
  {bucket: "100k+", order: 7, color: "#7f1d1d"}
];

const bucketByName = new Map(BUCKETS.map(d => [d.bucket, d]));
const bucketDomain = BUCKETS.map(d => d.bucket);
const bucketColors = BUCKETS.map(d => d.color);
const latestTradeSizeDate = d3.max(tradeSizeRaw, d => d.date);
```

```js
const platformOptions = ["Kalshi", "Polymarket US", "ForecastEx", "DKeX"]
  .filter(platform => tradeSizeRaw.some(d => d.platform === platform));

```

<div class="control-strip">

```js
const selectedPlatform = view(Inputs.radio(platformOptions, {
  label: "Platform",
  value: "Kalshi"
}));
```

```js
function optionLabel(value) {
  const [type, segment] = value.split("|");
  return type === "All" ? `All ${selectedPlatform}`
    : type === "Sports split" ? segment
    : `Category: ${segment}`;
}

const platformRows = tradeSizeRaw.filter(d => d.platform === selectedPlatform);
const segmentTotals = Array.from(
  d3.rollup(platformRows, rows => d3.sum(rows, d => d.contracts), d => `${d.segment_type}|${d.segment}`),
  ([value, contracts]) => ({value, contracts})
).sort((a, b) => {
  if (a.value === "All|All") return -1;
  if (b.value === "All|All") return 1;
  if (a.value.startsWith("Sports split|") && !b.value.startsWith("Sports split|")) return -1;
  if (!a.value.startsWith("Sports split|") && b.value.startsWith("Sports split|")) return 1;
  return d3.descending(a.contracts, b.contracts);
});

const segmentOptions = segmentTotals.map(d => d.value);
```

```js
const rawSegmentKey = view(Inputs.select(segmentOptions, {
  label: "Segment",
  value: segmentOptions[0],
  format: optionLabel
}));
```

</div>

```js
function makeDateBrush(defaultStart, rows, yAcc = d => d.contracts || 0, color = "#00C2A8") {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const totals = Array.from(
    d3.rollup(rows, rs => d3.sum(rs, yAcc), d => +d.date),
    ([date, contracts]) => ({date: new Date(date), contracts})
  ).sort((a, b) => a.date - b.date);

  // Defensive: if filtered rows have no data, fall back to global trade-size date span
  // so the brush remains usable (otherwise the x scale is degenerate and drag does nothing).
  const xDomain = totals.length > 0
    ? d3.extent(totals, d => d.date)
    : d3.extent(tradeSizeRaw, d => d.date);
  const yMax = totals.length > 0 ? (d3.max(totals, d => d.contracts) || 1) : 1;
  const x = d3.scaleUtc().domain(xDomain).range([ml, w - mr]);
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  if (totals.length > 0) {
    svg.append("path")
      .datum(totals)
      .attr("fill", color).attr("fill-opacity", 0.2)
      .attr("d", d3.area()
        .x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts))
        .curve(d3.curveBasis));
  }

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  // Clamp defaultStart to the available date range so the initial brush selection
  // is always meaningful even when preset windows are wider than the data.
  const xMin = xDomain[0], xMax = xDomain[1];
  const clampedStart = defaultStart && +defaultStart < +xMin ? xMin : (defaultStart || xMin);
  const defaultEnd = xMax;
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    // "end" only — see components/date-brush.js for why.
    .on("end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [clampedStart, defaultEnd].map(x));

  // d3 v7 hides .handle by default - force visible so users can see the draggable edges.
  svg.selectAll(".handle")
    .style("display", "block")
    .style("fill", color)
    .style("fill-opacity", 0.9);

  // Style the selection rectangle outline to make it obvious it's draggable.
  svg.selectAll(".selection")
    .style("stroke", color)
    .style("stroke-width", "2px")
    .style("fill", color)
    .style("fill-opacity", 0.15);

  svg.property("value", [clampedStart, defaultEnd]);
  return svg.node();
}
```

```js
const selectedSegmentKey = segmentOptions.includes(rawSegmentKey) ? rawSegmentKey : segmentOptions[0];
```

```js
const [selectedSegmentType, selectedSegment] = selectedSegmentKey.split("|");
const selectedRowsAllTime = platformRows.filter(d => d.segment_type === selectedSegmentType && d.segment === selectedSegment);
const selectedTotalContracts = d3.sum(selectedRowsAllTime, d => d.contracts);
const selectedTotalTrades = d3.sum(selectedRowsAllTime, d => d.trade_count);
const selectedMaxTrade = d3.max(selectedRowsAllTime, d => d.max_trade_size);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Selected contracts</div>
    <div class="kpi-value" title="${(selectedTotalContracts ?? 0).toLocaleString()} contracts">${fmtCount(selectedTotalContracts)}</div>
    <div class="kpi-meta">${optionLabel(selectedSegmentKey)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Trades</div>
    <div class="kpi-value" title="${(selectedTotalTrades ?? 0).toLocaleString()} trades">${fmtCount(selectedTotalTrades)}</div>
    <div class="kpi-meta">Avg size ${selectedTotalTrades > 0 ? fmtCount(selectedTotalContracts / selectedTotalTrades) : "0"} contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Largest trade</div>
    <div class="kpi-value" title="${(selectedMaxTrade ?? 0).toLocaleString()} contracts">${fmtCount(selectedMaxTrade)}</div>
    <div class="kpi-meta">Single print in selected segment</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>The top chart counts only the contracts from trades at or above the threshold you pick; the ribbon below shows the full size mix for the same window. Crypto.com/Nadex isn't shown here — only daily totals are available for it, not individual trades.</p>
</details>

```js
// Default brush window: Jan 1, 2025 → latest. Drag the brush edges to widen or
// narrow the range; the chart, mix ribbon, and KPIs all recompute reactively.
const brushDefaultStart = new Date("2025-01-01");
```

```js
const dateRange = view(makeDateBrush(brushDefaultStart, selectedRowsAllTime));
```

```js
const [startDate, endDate] = dateRange;
const dateWindowLabel = `${fmtDate(startDate)} to ${fmtDate(endDate)}`;
const selectedRows = selectedRowsAllTime.filter(d => d.date >= startDate && d.date <= endDate);
const dailyTotals = Array.from(
  d3.rollup(
    selectedRows,
    rows => ({
      contracts: d3.sum(rows, d => d.contracts),
      trades: d3.sum(rows, d => d.trade_count),
      max_trade_size: d3.max(rows, d => d.max_trade_size)
    }),
    d => +d.date
  ),
  ([date, values]) => ({date: new Date(date), ...values})
).sort((a, b) => a.date - b.date);

const dailyBucketMap = d3.rollup(selectedRows, rows => rows[0], d => +d.date, d => d.size_bucket);
const mixRows = dailyTotals.flatMap(day => {
  let y0 = 0;
  return BUCKETS.map(bucket => {
    const raw = dailyBucketMap.get(+day.date)?.get(bucket.bucket);
    const contracts = raw?.contracts || 0;
    const trade_count = raw?.trade_count || 0;
    const share = day.contracts ? contracts / day.contracts : 0;
    const row = {
      date: day.date,
      size_bucket: bucket.bucket,
      bucket_order: bucket.order,
      contracts,
      trade_count,
      share,
      y0,
      y1: y0 + share,
      total_contracts: day.contracts,
      total_trades: day.trades,
      max_trade_size: day.max_trade_size
    };
    y0 += share;
    return row;
  });
});
```

```js
const thresholdOrder = largeThreshold === "100k+" ? 7 : largeThreshold === "50k+" ? 6 : largeThreshold === "10k+" ? 5 : 4;
// Precompute each day's large-bucket sums once (Map keyed by epoch date), then take the
// trailing-30 baseline from the per-day share array. The old shape refiltered ALL of
// mixRows 30x per day on every brush/threshold change — O(days² × buckets), multi-second
// freezes on an all-time brush. Semantics unchanged.
const largeByDate = new Map();
for (const d of mixRows) {
  if (d.bucket_order < thresholdOrder) continue;
  const k = +d.date;
  const agg = largeByDate.get(k) || {contracts: 0, trades: 0};
  agg.contracts += d.contracts;
  agg.trades += d.trade_count;
  largeByDate.set(k, agg);
}
const shareByIndex = dailyTotals.map(day =>
  day.contracts ? ((largeByDate.get(+day.date)?.contracts || 0) / day.contracts) : 0
);
const thresholdRows = dailyTotals.map((day, i) => {
  const agg = largeByDate.get(+day.date) || {contracts: 0, trades: 0};
  const share = shareByIndex[i];
  const prior = shareByIndex.slice(Math.max(0, i - 30), i).filter(Number.isFinite);
  const baseline = prior.length >= 14 ? d3.mean(prior) : null;
  return {
    date: day.date,
    share,
    large_contracts: agg.contracts,
    large_trades: agg.trades,
    baseline,
    lift: baseline ? share / baseline : null,
    total_contracts: day.contracts,
    max_trade_size: day.max_trade_size
  };
});

const spikeRows = thresholdRows
  .filter(d => d.baseline != null && d.share >= 0.03 && d.lift >= 3 && d.large_contracts >= 1000000)
  .sort((a, b) => d3.descending(a.lift, b.lift))
  .slice(0, 12);
```

## Volume and size mix

<p class="section-intro">Big-trade volume up top; the full size breakdown below.</p>

<div class="instruction-line"><strong>Useful trick:</strong> move from <em>10k+</em> to <em>100k+</em> — if the spike still holds, it's true whale flow, not just ordinary block trading.</div>

<div class="chart-note">Showing ${optionLabel(selectedSegmentKey)} from ${dateWindowLabel}. The top chart is <strong>${largeThreshold} trade volume only</strong>, not total Kalshi volume.</div>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 170,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: `${largeThreshold} contracts`, grid: true, tickFormat: fmtCount},
  marks: [
    Plot.areaY(thresholdRows, {
      x: "date",
      y: "large_contracts",
      fill: "var(--accent-kalshi)",
      fillOpacity: 0.2,
      curve: "monotone-x"
    }),
    Plot.lineY(thresholdRows, {
      x: "date",
      y: "large_contracts",
      stroke: "var(--accent-kalshi)",
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.ruleX(thresholdRows, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(thresholdRows, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `${largeThreshold} contracts: ${fmtCount(d.large_contracts)} (${(d.large_contracts ?? 0).toLocaleString()})`,
        `${largeThreshold} trades: ${fmtCount(d.large_trades)} (${(d.large_trades ?? 0).toLocaleString()})`,
        `Share of total: ${fmtPct(d.share)}`,
        `Total contracts: ${fmtCount(d.total_contracts)} (${(d.total_contracts ?? 0).toLocaleString()})`,
        `Largest trade: ${fmtCount(d.max_trade_size)} (${(d.max_trade_size ?? 0).toLocaleString()})`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 360,
  marginLeft: 70,
  color: {domain: bucketDomain, range: bucketColors, legend: true},
  x: {type: "utc", label: null},
  y: {label: "Share of contracts", percent: true, grid: true},
  marks: [
    Plot.areaY(mixRows, {
      x: "date",
      y1: "y1",
      y2: "y0",
      fill: "size_bucket",
      fillOpacity: 0.92,
      curve: "monotone-x"
    }),
    Plot.ruleX(mixRows, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    // 2D pointer (not pointerX): on a stacked area we want the specific
    // colored bucket band under the cursor, so match on x=date AND the band
    // midpoint in share units. The old static `title:` channel rendered one
    // SVG <title> per area path and effectively showed no usable tooltip.
    Plot.tip(mixRows, Plot.pointer({
      x: "date",
      y: d => (d.y0 + d.y1) / 2,
      title: d => [
        fmtDate(d.date),
        `${d.size_bucket}: ${fmtPct(d.share)} of contracts`,
        `Bucket contracts: ${fmtCount(d.contracts)} (${(d.contracts ?? 0).toLocaleString()})`,
        `Bucket trades: ${fmtCount(d.trade_count)} (${(d.trade_count ?? 0).toLocaleString()})`,
        `Total contracts: ${fmtCount(d.total_contracts)} (${(d.total_contracts ?? 0).toLocaleString()})`,
        `Largest trade: ${fmtCount(d.max_trade_size)} (${(d.max_trade_size ?? 0).toLocaleString()})`
      ].join("\n")
    })),
    Plot.ruleY([0, 1])
  ]
})
```

</div>

<div class="control-strip">

```js
const largeThreshold = view(Inputs.radio(["1k+", "10k+", "50k+", "100k+"], {
  label: "Volume threshold",
  value: "1k+"
}));
```

</div>

## Large-trade share radar

<p class="section-intro">Flags the days when the big-block share ran well above its recent normal — not just busy days, but unusually top-heavy ones.</p>

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: `${largeThreshold} share`, percent: true, grid: true},
  marks: [
    Plot.areaY(thresholdRows, {
      x: "date",
      y: "share",
      fill: "#e15759",
      fillOpacity: 0.12,
      curve: "monotone-x"
    }),
    Plot.lineY(thresholdRows, {
      x: "date",
      y: "share",
      stroke: "#e15759",
      strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.lineY(thresholdRows.filter(d => d.baseline != null), {
      x: "date",
      y: "baseline",
      stroke: "var(--annotation-stroke)",
      strokeDasharray: "4,4",
      strokeWidth: 1.5,
      curve: "monotone-x"
    }),
    Plot.dot(spikeRows, {
      x: "date",
      y: "share",
      r: 5,
      fill: "#7f1d1d",
      stroke: "var(--theme-background)",
      strokeWidth: 1.5
    }),
    Plot.text(spikeRows.slice(0, 5), {
      x: "date",
      y: "share",
      text: d => `${d.lift.toFixed(1)}x`,
      dy: -12,
      fill: "var(--annotation-text)",
      fontSize: 11,
      fontWeight: 700
    }),
    Plot.ruleX(thresholdRows, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(thresholdRows, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `${largeThreshold} share: ${fmtPct(d.share)}`,
        d.baseline != null ? `30-day baseline: ${fmtPct(d.baseline)}` : null,
        d.lift != null ? `Lift: ${d.lift.toFixed(1)}x` : null,
        `${largeThreshold} contracts: ${fmtCount(d.large_contracts)} (${(d.large_contracts ?? 0).toLocaleString()})`,
        `${largeThreshold} trades: ${fmtCount(d.large_trades)} (${(d.large_trades ?? 0).toLocaleString()})`,
        `Largest trade: ${fmtCount(d.max_trade_size)} (${(d.max_trade_size ?? 0).toLocaleString()})`
      ].filter(Boolean).join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#e15759"></span>${largeThreshold} share</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px dashed var(--annotation-stroke)"></span>Trailing 30-day baseline</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#7f1d1d"></span>3x+ spike</span>
</div>

```js
const topSpikes = spikeRows.slice(0, 8).map(d => ({
  date: fmtDate(d.date),
  threshold: largeThreshold,
  share: fmtPct(d.share),
  baseline: fmtPct(d.baseline),
  lift: `${d.lift.toFixed(1)}x`,
  contracts: (d.large_contracts ?? 0).toLocaleString(),
  max_trade: (d.max_trade_size ?? 0).toLocaleString()
}));
```

```js
topSpikes.length ? Inputs.table(topSpikes, {
  columns: ["date", "threshold", "share", "baseline", "lift", "contracts", "max_trade"],
  header: {
    date: "Date",
    threshold: "Threshold",
    share: "Share",
    baseline: "30-day base",
    lift: "Lift",
    contracts: "Contracts",
    max_trade: "Largest trade"
  },
  rows: topSpikes.length
}) : html`<div class="chart-note">No ${largeThreshold} spikes met the 3x trailing-baseline rule in the selected window.</div>`
```

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Each raw trade is placed into a size bucket based on <code>contracts_traded</code>. The composition chart uses each bucket's share of daily contracts, not share of trade count. The spike radar compares the selected threshold's contract share with the previous 30 trading days and flags days at least 3x above baseline with at least 1M large-trade contracts.</p>
</details>
