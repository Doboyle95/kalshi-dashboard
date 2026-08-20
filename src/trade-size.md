---
title: Trading Behavior
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Trading Behavior</h1>
  <p class="page-lead">Where contracts trade on the probability axis, how trade sizes differ by venue, and when unusually large prints appear.</p>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtPct = n => `${((n ?? 0) * 100).toFixed((n ?? 0) >= 0.1 ? 1 : 2)}%`;
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const fmtUSD = n => (n < 0 ? "-$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtPrice = p => p == null ? "-" : `${Number(p) % 1 === 0 ? Number(p).toFixed(0) : Number(p).toFixed(2)}¢`;
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_ORDER} from "./components/venue-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const tradeSizeRaw = await DataAttachment("data/trade_size_daily.csv").csv({typed: true});
const largeTrades = await DataAttachment("data/large_trades.csv").csv({typed: true});
const competitorLargeTrades = await DataAttachment("data/competitor_large_trades.csv").csv({typed: true});
const categoryLeaderboard = await DataAttachment("data/category_leaderboard.csv").csv({typed: true});
const priceFiles = await Promise.all([
  DataAttachment("data/volume_at_price_kalshi.csv").csv({typed: true}),
  DataAttachment("data/polymarket_price_distribution.csv").csv({typed: true}),
  DataAttachment("data/volume_at_price_forecastex.csv").csv({typed: true}),
  DataAttachment("data/dkex_volume_at_price.csv").csv({typed: true}),
  DataAttachment("data/underdog_volume_at_price.csv").csv({typed: true}),
  DataAttachment("data/prophetx_volume_at_price.csv").csv({typed: true})
]);
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {bestName, fmtStrike} from "./components/ticker-names.js";
import {buildReportTickerToCat} from "./components/taker-categories.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Trade-size mix", date: latestDate(tradeSizeRaw), updatedAt: fileUpdatedAt(freshness, "trade_size_daily.csv"), meta: "Kalshi can be within 15 minutes locally; competitors follow public files"},
    {label: "Largest trades", value: "All-time leaderboard", updatedAt: fileUpdatedAt(freshness, "large_trades.csv"), meta: "Settlement-dependent; refreshes every ~4h"},
    {label: "Supported platforms", value: platformOptions.join(", "), updatedAt: fileUpdatedAt(freshness, "trade_size_daily.csv"), meta: "Crypto.com/Nadex and Rothera omitted: the size producer does not cover them", tone: "competitor"}
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

## Volume and size mix

<p class="section-intro">How a venue&rsquo;s volume splits across trade sizes, and how much of it moves in large blocks. Pick a venue and a segment here &mdash; both controls govern every chart in this section.</p>

```js
// DERIVED FROM THE DATA, never a hand-kept list. The previous hardcoded five silently
// dropped ProphetX and Novig for as long as the producer had been emitting them, and a
// venue absent from a selector reads as a venue with no data. VENUE_ORDER only sorts;
// anything the producer emits appears whether or not it is a known name.
const platformOptions = Array.from(new Set(tradeSizeRaw.map(d => d.platform)))
  .filter(Boolean)
  .sort((a, b) => {
    const ia = VENUE_ORDER.indexOf(a), ib = VENUE_ORDER.indexOf(b);
    return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib) || d3.ascending(a, b);
  });

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
function makeDateBrush(defaultStart, rows, yAcc = d => d.contracts || 0, color = "var(--accent-kalshi)") {
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
      if (!event.selection) {
        // Clearing the brush (a bare click) now means "show everything": reset to
        // the full domain and redraw the selection so the visuals match the filter.
        svg.property("value", x.domain());
        brushG.call(brush.move, x.domain().map(x));   // programmatic move — guarded above, no re-fire
        svg.dispatch("input");
        return;
      }
      svg.property("value", event.selection.map(x.invert)); svg.dispatch("input");
    });

  const brushG = svg.append("g").attr("class", "brush");

  brushG.call(brush).call(brush.move, [clampedStart, defaultEnd].map(x));

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

<div class="instruction-line"><strong>Useful trick:</strong> move from <em>10k+</em> to <em>100k+</em> — if the spike still holds, it's true whale flow, not just ordinary block trading.</div>

<div class="control-strip">

```js
const largeThreshold = view(Inputs.radio(["1k+", "10k+", "50k+", "100k+"], {
  label: "Volume threshold",
  value: "1k+"
}));
```

</div>

<div class="chart-note">Showing ${optionLabel(selectedSegmentKey)} from ${dateWindowLabel}. The top chart is <strong>${largeThreshold} trade volume only</strong>, not total ${selectedPlatform} volume. Use the <strong>Platform</strong> control above to change venue.</div>

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

### Flagged anomaly days

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

```js
const reportTickerToCat = buildReportTickerToCat(categoryLeaderboard);
const RANK_METRICS = {"Contracts": "contracts", "One-party stake": "one_party_stake", "Taker stake": "taker_stake"};

// Competitor rows live in their own file because they are built by a different
// producer off six separate raw tapes, not because they are second class -- the
// two render through one code path below.
const ltVenues = ["Kalshi", ...VENUE_ORDER.filter(v => competitorLargeTrades.some(d => d.venue === v))];

// TAKER STAKE IS NOT UNIVERSAL. Kalshi publishes an aggressor flag, and Novig is
// the only competitor that does -- its tape marks every print TAKER or MAKER. On
// every other venue there is no taker to attribute a stake to, so the option is
// absent rather than blank.
function metricsFor(venue) {
  const hasTaker = venue === "Kalshi"
    || competitorLargeTrades.some(d => d.venue === venue && d.metric === "taker_stake");
  return hasTaker ? ["Contracts", "One-party stake", "Taker stake"] : ["Contracts", "One-party stake"];
}

function competitorRows(tableName, metricLabel, venue) {
  const metricKey = RANK_METRICS[metricLabel];
  return competitorLargeTrades
    .filter(d => d.venue === venue && d.table === tableName && d.metric === metricKey)
    .sort((a, b) => a.rank - b.rank)
    .map(d => ({
      date: d.date,
      market: d.market_name || d.ticker_name,
      contracts: d.contracts_traded,
      price: d.price,
      pct_of_market: d.pct_of_market,
      metric_value: metricValue(d, metricKey),
      censored: d.window_left_censored
    }));
}

function tradeCategory(d) {
  return reportTickerToCat.get(d.report_ticker) || d.kalshi_category || "Uncategorized";
}

function tradeMarket(d) {
  return bestName({market_key: d.market_key, market_name: "", "i.market_name": ""});
}

function tradeOutcome(d) {
  return fmtStrike(d.ticker_name, d.market_key);
}

function metricValue(d, metricKey) {
  return metricKey === "contracts" ? d.contracts_traded
    : metricKey === "one_party_stake" ? d.one_party_stake
    : d.taker_stake;
}

function rowsForTable(tableName, metricLabel) {
  const metricKey = RANK_METRICS[metricLabel];
  return largeTrades
    .filter(d => d.table === tableName && d.metric === metricKey)
    .sort((a, b) => a.rank - b.rank)
    .map(d => ({
      date: d.date,
      category: tradeCategory(d),
      market: tradeMarket(d),
      outcome: tradeOutcome(d),
      contracts: d.contracts_traded,
      price: d.price,
      taker_side: d.taker_side || "-",
      metric_value: metricValue(d, metricKey),
      pct_of_market: d.pct_of_market
    }));
}
```

## Largest individual trades

<p class="section-intro">The single biggest prints a venue has published — different notions of "big," since raw contracts, the larger side's dollar stake, and what the taker specifically put up don't always pick the same winners.</p>

<div class="instruction-line"><strong>Useful trick:</strong> switch to "One-party stake" to surface trades at extreme prices (near-certain or near-impossible outcomes), where one side risks close to the full dollar and the other risks almost nothing.</div>

<div class="control-strip">

```js
const overallVenue = view(Inputs.radio(ltVenues, {label: "Venue", value: "Kalshi"}));
```

```js
const overallMetricLabel = view(Inputs.radio(metricsFor(overallVenue), {
  label: "Rank by",
  value: "Contracts"
}));
```

</div>

```js
const overallKalshi = overallVenue === "Kalshi";
const overallRows = overallKalshi
  ? rowsForTable("overall", overallMetricLabel)
  : competitorRows("overall", overallMetricLabel, overallVenue);
```

```js
Inputs.table(overallRows, {
  columns: overallKalshi
    ? ["date", "category", "market", "outcome", "contracts", "price", "taker_side", "metric_value"]
    : ["date", "market", "contracts", "price", "metric_value"],
  header: {
    date: "Date",
    category: "Category",
    market: "Market",
    outcome: "Outcome",
    contracts: "Contracts",
    price: "Price",
    taker_side: "Taker side",
    metric_value: overallMetricLabel
  },
  format: {
    date: fmtDate,
    contracts: fmtCount,
    price: fmtPrice,
    metric_value: overallMetricLabel === "Contracts" ? fmtCount : fmtUSD
  },
  align: {contracts: "right", metric_value: "right"},
  rows: overallRows.length
})
```

<p class="chart-note">${overallKalshi
  ? html`Kalshi is the only venue here with an aggressor flag on every print and a market-name dictionary, so it carries the extra Category, Outcome and Taker-side columns.`
  : html`Covers this venue's collected tape, not its whole history. Market labels are whatever the venue itself publishes &mdash; ProphetX and Novig name their fixtures, DKeX, Polymarket and Underdog publish only an opaque contract id, and none of them is renamed here. <strong>Taker stake</strong> is offered on Kalshi and Novig only, the two venues that flag the aggressor.`}</p>

## Largest trades in small markets

<p class="section-intro">The same rankings, but restricted to trades that were unusually large <em>for the specific market they happened in</em> — a print that ate a huge share of everything that market traded, not just a big number in isolation.</p>

<div class="control-strip">

```js
const smallMarketVenue = view(Inputs.radio(ltVenues, {label: "Venue", value: "Kalshi"}));
```

```js
const smallMarketMetricLabel = view(Inputs.radio(metricsFor(smallMarketVenue), {
  label: "Rank by",
  value: metricsFor(smallMarketVenue).includes("Taker stake") ? "Taker stake" : "Contracts"
}));
```

</div>

```js
const smallMarketKalshi = smallMarketVenue === "Kalshi";
const smallMarketRows = smallMarketKalshi
  ? rowsForTable("small_market", smallMarketMetricLabel)
  : competitorRows("small_market", smallMarketMetricLabel, smallMarketVenue);
```

```js
Inputs.table(smallMarketRows, {
  columns: smallMarketKalshi
    ? ["date", "category", "market", "outcome", "contracts", "price", "taker_side", "metric_value", "pct_of_market"]
    : ["date", "market", "contracts", "price", "metric_value", "pct_of_market"],
  header: {
    date: "Date",
    category: "Category",
    market: "Market",
    outcome: "Outcome",
    contracts: "Contracts",
    price: "Price",
    taker_side: "Taker side",
    metric_value: smallMarketMetricLabel,
    pct_of_market: "% of market"
  },
  format: {
    date: fmtDate,
    contracts: fmtCount,
    price: fmtPrice,
    metric_value: smallMarketMetricLabel === "Contracts" ? fmtCount : fmtUSD,
    pct_of_market: fmtPct
  },
  align: {contracts: "right", metric_value: "right", pct_of_market: "right"},
  rows: smallMarketRows.length
})
```

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p><strong>On Kalshi</strong>, a trade qualifies when it was at least 100,000 contracts <strong>and</strong> at least 20% of that market's entire lifetime volume in that one print, excluding parlays. Parlays are left out here for two reasons: a parlay combo is by construction its own tiny market, so almost any parlay trade looks like a huge share of a thin one — and the per-combo volume totals behind that ratio aren't reliable at that granularity. Parlays still show up in the table above, which has no market-share requirement. Because the denominator (the market's lifetime volume) can keep growing for still-active markets, a trade can drop out of this list over time even though the trade itself never changes.</p>
  <p><strong>On the competitor venues the denominator is a window, not a lifetime.</strong> Those tapes only run as far back as collection does — from a few weeks on the newest venues to about two years on ForecastEx — so "% of market" means share of what that market traded <em>while we were watching it</em>. Numerator and denominator are both inside the window, so the figure is still bounded by 100%, but a market that was already busy before collection started will read as more concentrated than it truly was. The 20% share floor is Kalshi's; the contract floor is set per venue, since these books are one to three orders of magnitude smaller and a flat 100,000 would empty the table.</p>
  <p>A market must also have traded at least 20 separate times to appear at all. Without that rule the table degenerates on venues whose market identifier is close to one-per-trade — Novig's median market carries a single print, and its first build returned trades sitting at exactly 100% of "their market", which is true and tells you nothing. It is the venue-neutral form of Kalshi's parlay exclusion.</p>
</details>

## Volume by probability

<p class="section-intro">The share of each venue's observed volume traded in each five-cent price bin.</p>

```js
const PRICE_SPECS = [
  {name: "Kalshi", color: "var(--accent-kalshi)", rows: priceFiles[0], keep: d => d.leg == null || d.leg === "taker"},
  {name: "Polymarket US", color: "var(--accent-polymarket)", rows: priceFiles[1], keep: d => (d.period == null || d.period === "all") && (d.group == null || d.group === "LEG_PRICE")},
  {name: "ForecastEx", color: "var(--accent-forecastex)", rows: priceFiles[2], keep: d => d.leg == null || d.leg === "yes"},
  {name: "DKeX", color: "var(--accent-dkex)", rows: priceFiles[3], keep: d => (d.bin_width == null || +d.bin_width === 5) && (d.group == null || d.group === "ALL")},
  {name: "Underdog Exchange", color: "var(--accent-underdog)", rows: priceFiles[4], keep: d => d.group == null || d.group === "SINGLE"},
  {name: "ProphetX", color: "#DB2777", rows: priceFiles[5], keep: d => (d.bin_width == null || +d.bin_width === 5) && (d.group == null || d.group === "HOME")}
];
const priceSeries = PRICE_SPECS.map(spec => {
  const selected = spec.rows.filter(spec.keep);
  const bins = Array.from(d3.rollup(
    selected,
    rows => ({
      contracts: d3.sum(rows, d => +(d.contracts ?? d.n_contracts) || 0),
      dollars: d3.sum(rows, d => +d.dollars || 0)
    }),
    d => +d.price_bin
  ), ([price_bin, values]) => ({price_bin, ...values})).filter(d => Number.isFinite(d.price_bin));
  const totalContracts = d3.sum(bins, d => d.contracts);
  const totalDollars = d3.sum(bins, d => d.dollars);
  return {
    ...spec,
    bins: bins.map(d => ({
      ...d,
      venue: spec.name,
      midpoint: d.price_bin + 2.5,
      contractsShare: totalContracts ? 100 * d.contracts / totalContracts : 0,
      dollarsShare: totalDollars ? 100 * d.dollars / totalDollars : 0
    }))
  };
}).filter(d => d.bins.length);
```

<div class="control-strip">

```js
const probabilityMeasure = view(Inputs.radio(["Contracts", "Dollars"], {label: "Measure", value: "Contracts"}));
const probabilityVenues = view(Inputs.checkbox(priceSeries.map(d => d.name), {label: "Venues", value: priceSeries.map(d => d.name)}));
```

</div>

```js
const probabilityRows = priceSeries
  .filter(d => probabilityVenues.includes(d.name))
  .flatMap(d => d.bins.map(row => ({...row, value: probabilityMeasure === "Dollars" ? row.dollarsShare : row.contractsShare})));
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 380,
  marginLeft: 62,
  x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
  y: {label: `Share of venue ${probabilityMeasure.toLowerCase()} (%)`, grid: true},
  color: {legend: true, domain: priceSeries.map(d => d.name), range: priceSeries.map(d => d.color)},
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(probabilityRows, {x: "midpoint", y: "value", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(probabilityRows, {
      x: "midpoint", y: "value", fill: "venue", r: 3, tip: true,
      title: d => `${d.venue}\n${d.price_bin}–${d.price_bin + 5}¢\n${d.value.toFixed(2)}% of venue ${probabilityMeasure.toLowerCase()}\n${fmtCount(d.contracts)} contracts · ${fmtUSD(d.dollars)}`
    })
  ]
}));
```

<p class="chart-note">Coverage differs by venue. Kalshi uses the taker's side; ForecastEx uses the yes leg; DKeX, Polymarket US, and Underdog use the named leg; ProphetX uses its published home-side price. Underdog parlays are excluded because a combination price is not a single-market probability.</p>
