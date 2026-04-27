---
title: Trade Size Mix
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi microstructure</div>
  <h1>Trade Size Mix</h1>
  <p class="page-lead">Separate broad participation from blocky, large-trade-driven volume. The mix chart shows how much of each day came from small trades versus increasingly large contract blocks.</p>
  <div class="page-meta">Compare Kalshi, Polymarket US, and ForecastEx. Crypto.com/Nadex is omitted because the local files available here are daily aggregates, not trade-level prints.</div>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtPct = n => `${((n ?? 0) * 100).toFixed((n ?? 0) >= 0.1 ? 1 : 2)}%`;
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const tradeSizeRaw = await FileAttachment("data/trade_size_daily.csv").csv({typed: true});
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
const platformOptions = ["Kalshi", "Polymarket US", "ForecastEx"]
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
  const x = d3.scaleUtc().domain(d3.extent(totals, d => d.date)).range([ml, w - mr]);
  const y = d3.scaleLinear().domain([0, d3.max(totals, d => d.contracts) || 1]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(totals)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultEnd = d3.max(totals, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", color).style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
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
    <div class="kpi-value">${fmtCount(selectedTotalContracts)}</div>
    <div class="kpi-meta">${optionLabel(selectedSegmentKey)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Trades</div>
    <div class="kpi-value">${fmtCount(selectedTotalTrades)}</div>
    <div class="kpi-meta">Avg size ${fmtCount(selectedTotalContracts / selectedTotalTrades)} contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Largest trade</div>
    <div class="kpi-value">${fmtCount(selectedMaxTrade)}</div>
    <div class="kpi-meta">Single print in selected segment</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>How to use this page</summary>
  <p>Pick a platform and segment first, then choose a large-trade threshold. The top chart shows only contracts from trades at or above that threshold; the ribbon shows the full size mix for the same window, so spikes are easiest to interpret when both move together.</p>
</details>

<div class="control-strip">

```js
const rangePreset = view(Inputs.radio(["Since Jan 2025", "Last 180 days", "Last 90 days", "All history"], {
  label: "Date window",
  value: "Since Jan 2025"
}));
```

</div>

```js
const latestSelectedDate = d3.max(selectedRowsAllTime, d => d.date) || latestTradeSizeDate;
const earliestSelectedDate = d3.min(selectedRowsAllTime, d => d.date) || new Date("2021-06-30");
const brushDefaultStart = rangePreset === "Last 90 days" ? new Date(+latestSelectedDate - 89 * 864e5)
  : rangePreset === "Last 180 days" ? new Date(+latestSelectedDate - 179 * 864e5)
  : rangePreset === "All history" ? earliestSelectedDate
  : new Date("2025-01-01");
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
const thresholdRows = dailyTotals.map((day, i) => {
  const bucketRows = mixRows.filter(d => +d.date === +day.date);
  const largeContracts = d3.sum(bucketRows.filter(d => d.bucket_order >= thresholdOrder), d => d.contracts);
  const largeTrades = d3.sum(bucketRows.filter(d => d.bucket_order >= thresholdOrder), d => d.trade_count);
  const share = day.contracts ? largeContracts / day.contracts : 0;
  const prior = dailyTotals.slice(Math.max(0, i - 30), i);
  const priorRows = prior.map(p => {
    const pr = mixRows.filter(d => +d.date === +p.date && d.bucket_order >= thresholdOrder);
    const pc = d3.sum(pr, d => d.contracts);
    return p.contracts ? pc / p.contracts : 0;
  }).filter(Number.isFinite);
  const baseline = priorRows.length >= 14 ? d3.mean(priorRows) : null;
  return {
    date: day.date,
    share,
    large_contracts: largeContracts,
    large_trades: largeTrades,
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

<p class="section-intro">The first chart now shows only volume from trades at or above the selected size. The ribbon below keeps the full composition view so you can tell whether the threshold spike is part of a broader shift in trade-size mix.</p>

<div class="instruction-line"><strong>Try this:</strong> switch between <em>Sports</em> and <em>Non-sports</em>, then change the threshold from <em>10k+</em> to <em>100k+</em> to see whether the spike is broad block flow or true whale flow.</div>

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
        `${largeThreshold} contracts: ${fmtCount(d.large_contracts)}`,
        `${largeThreshold} trades: ${fmtCount(d.large_trades)}`,
        `Share of total: ${fmtPct(d.share)}`,
        `Total contracts: ${fmtCount(d.total_contracts)}`,
        `Largest trade: ${fmtCount(d.max_trade_size)}`
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
      curve: "monotone-x",
      title: d => [
        fmtDate(d.date),
        `${d.size_bucket}: ${fmtPct(d.share)} of contracts`,
        `Bucket contracts: ${fmtCount(d.contracts)}`,
        `Bucket trades: ${fmtCount(d.trade_count)}`,
        `Total contracts: ${fmtCount(d.total_contracts)}`,
        `Largest trade: ${fmtCount(d.max_trade_size)}`
      ].join("\n")
    }),
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

<p class="section-intro">This isolates the selected threshold and flags days when large-trade share is far above its trailing baseline. The goal is to catch days where volume was not just high, but unusually block-heavy.</p>

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
        `${largeThreshold} contracts: ${fmtCount(d.large_contracts)}`,
        `${largeThreshold} trades: ${fmtCount(d.large_trades)}`,
        `Largest trade: ${fmtCount(d.max_trade_size)}`
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
  contracts: fmtCount(d.large_contracts),
  max_trade: fmtCount(d.max_trade_size)
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
