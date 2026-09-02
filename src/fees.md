---
title: Kalshi Fee Revenue
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Fee Revenue</h1>
  <p class="page-lead">How much Kalshi actually makes from all that trading — fees collected day by day, who's contributed over time, and how many cents it keeps per contract.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await DataAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Fee totals", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Can be within 15 minutes locally when the collector is running"},
    {label: "Sports fee split", date: latestDate(sports), updatedAt: fileUpdatedAt(freshness, "daily_sports_vs_nonsports.csv"), meta: "Can be within 15 minutes locally after near-live refresh"}
  ],
  note: "Fee-rate calculations update with the daily aggregate files; today can remain partial until the trading day closes."
}));
display(askPageLink({
  question: "Analyze the latest Kalshi fee revenue and whether sports or non-sports are driving recent fee-rate changes.",
  context: "Kalshi Fee Revenue page using daily_overall.csv and daily_sports_vs_nonsports.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
// Fee KPIs
const totalFees      = d3.sum(daily, d => d.fees_total);
// "Run rate" reflects the *current* pace, not the all-time average. Use the trailing
// 30 COMPLETED days of fee data (excluding today if partial). Matches the calc on
// index.md; the old all-time-average method understated this ~10x because of the
// years of sparse, near-zero pre-2024 days dragging the mean down.
const isPartialFee    = d => d.is_partial === true || d.is_partial === "TRUE";
const completedDaily  = daily.filter(d => !isPartialFee(d));
const recent30Fees    = completedDaily.slice(-30);
const recentDailyFees = recent30Fees.length > 0 ? d3.mean(recent30Fees, d => d.fees_total) : 0;
const annualizedFees  = Math.round(recentDailyFees * 365 / 1e6) * 1e6;
const peakFeeDay     = daily.reduce((best, d) => (d.fees_total||0) > (best.fees_total||0) ? d : best, daily[0]);
const totalContracts = d3.sum(daily, d => d.contracts_total);
const avgFeeRate     = totalFees / totalContracts * 100; // cents per contract
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">All-time fee revenue</div>
    <div class="kpi-value" title="$${totalFees.toLocaleString()}">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Annualized run rate</div>
    <div class="kpi-value" title="$${annualizedFees.toLocaleString()}/yr">${fmtUSD(annualizedFees)}/yr</div>
    <div class="kpi-meta">based on trailing 30 days</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak fee day</div>
    <div class="kpi-value" title="$${(peakFeeDay?.fees_total||0).toLocaleString()}">${fmtUSD(peakFeeDay?.fees_total||0)}</div>
    <div class="kpi-meta">${fmtDate(peakFeeDay?.date)}</div>
  </div>
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Avg fee per contract</div>
    <div class="kpi-value">${avgFeeRate.toFixed(3)} cents</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Fees are summed from Kalshi's trade records and totaled by day. Fee per contract divides daily fees by daily contracts, so it's the realized average rate Kalshi actually collected — not its posted fee schedule. If revenue climbs while cents-per-contract falls, growth is coming from more volume, not a richer take.</p>
</details>

```js
function makeDateBrush(defaultStart, yAcc = d => d.fees_total || 0, color = "var(--accent-secondary)") {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(daily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(daily, yAcc) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(daily)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(yAcc(d)))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultEnd = d3.max(daily, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
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


  brushG.call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", color).style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

## Daily fee revenue

<p class="section-intro">The fees Kalshi collected each day, from the same trading behind the volume charts.</p>

<div class="instruction-line"><strong>Useful trick:</strong> brush around a major volume spike, then check whether fees stayed elevated after volume cooled off.</div>

```js
const dr1 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.fees_total || 0,
      fill: "var(--accent-secondary)", fillOpacity: 0.8
    }),
    Plot.lineY(fd1.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "var(--accent-tertiary)", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(fd1, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd1, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Daily: $${(d.fees_total||0).toLocaleString(undefined, {maximumFractionDigits: 0})}`,
        d.ma7_fees != null ? `7-day avg: $${d.ma7_fees.toLocaleString(undefined, {maximumFractionDigits: 0})}` : null
      ].filter(Boolean).join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:var(--accent-secondary)"></span>Daily fees</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid var(--accent-tertiary)"></span>7-day average</span>
</div>

## Taker vs maker fees

<p class="section-intro">Kalshi bills the aggressor on almost every market, but it also charges the <strong>resting</strong> side on a named subset — soccer, tennis, rate and inflation markets. This splits the daily total above into those two parts.</p>

<div class="instruction-line"><strong>Useful trick:</strong> switch to <em>Share of total</em> and brush across mid-2025 — the maker component changes level when the flat per-contract maker fee gave way to a price-dependent curve, which a dollar view hides behind the growth in volume.</div>

```js
const dr4 = view(makeDateBrush(new Date("2025-01-01"), d => d.fees_total || 0, "#e6550d"));
```

```js
const [s4, e4] = dr4;
const feeSplitShare = feeSplitView === "Share of total";

// A date with no split is DROPPED, not drawn at zero. Zero here would assert "no maker fees
// were charged that day", which is a different claim from "the split is not available".
const feeSplitRows = daily.filter(d =>
  d.date >= s4 && d.date <= e4 && d.fees_taker != null && d.fees_maker != null);

// The stack is built explicitly rather than left to Plot's stack transform: taker sits on the
// baseline, maker directly on top of it, so the top of every bar IS fees_total and the reader
// can check this decomposition against the headline chart above by eye.
const feeSplitStacked = feeSplitRows.flatMap(d => {
  const denom = feeSplitShare ? (d.fees_total || 1) : 1;
  const taker = (d.fees_taker || 0) / denom;
  const maker = (d.fees_maker || 0) / denom;
  return [
    {date: d.date, side: "Taker", y0: 0,     y1: taker},
    {date: d.date, side: "Maker", y0: taker, y1: taker + maker}
  ];
});

// One row per date so the tooltip shows both sides together instead of whichever band the
// pointer happens to be inside.
const feeSplitTip = feeSplitRows.map(d => ({
  date:  d.date,
  taker: d.fees_taker || 0,
  maker: d.fees_maker || 0,
  total: d.fees_total || 0
}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: feeSplitShare
    ? {label: "Share of daily fees", grid: true, domain: [0, 1], tickFormat: d => (d * 100).toFixed(0) + "%"}
    : {label: "Fees (USD)", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {legend: true, domain: ["Taker", "Maker"], range: ["var(--accent-secondary)", "#e6550d"]},
  marks: [
    Plot.rect(feeSplitStacked, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y1: "y0", y2: "y1",
      fill: "side", fillOpacity: 0.85
    }),
    Plot.ruleX(feeSplitTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(feeSplitTip, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Taker: $${d.taker.toLocaleString(undefined, {maximumFractionDigits: 0})} (${(100 * d.taker / (d.total || 1)).toFixed(1)}%)`,
        `Maker: $${d.maker.toLocaleString(undefined, {maximumFractionDigits: 0})} (${(100 * d.maker / (d.total || 1)).toFixed(1)}%)`,
        `Total: $${d.total.toLocaleString(undefined, {maximumFractionDigits: 0})}`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="control-strip">

```js
const feeSplitView = view(Inputs.radio(["Dollars", "Share of total"], {
  label: "View",
  value: "Dollars"
}));
```

</div>

```js
const splitRows      = daily.filter(d => d.fees_taker != null && d.fees_maker != null);
const makerAllTime   = d3.sum(splitRows, d => d.fees_maker);
const takerAllTime   = d3.sum(splitRows, d => d.fees_taker);
const splitTotal     = d3.sum(splitRows, d => d.fees_total);
const rows2026       = splitRows.filter(d => d.date >= new Date("2026-01-01"));
const makerShare2026 = d3.sum(rows2026, d => d.fees_total) > 0
  ? 100 * d3.sum(rows2026, d => d.fees_maker) / d3.sum(rows2026, d => d.fees_total)
  : 0;
```

<div class="chart-note"><strong>Maker fees are ${(100 * makerAllTime / (splitTotal || 1)).toFixed(2)}% of all-time fee revenue</strong> (${fmtUSD(makerAllTime)} of ${fmtUSD(splitTotal)}), and ${makerShare2026.toFixed(2)}% in 2026, spread across a small set of report tickers. The two bands add to the daily total on the chart above them, so this decomposes the headline rather than restating it.</div>

<div class="chart-note"><strong>This page reports total fee revenue — everything Kalshi collects, from both sides.</strong> The Kalshi series on <a href="./compare-fees">Fees &amp; Economics</a> answers a different question: what <em>one trader</em> pays to execute. That number is the taker band alone, ${fmtUSD(takerAllTime)} against ${fmtUSD(splitTotal)} here, because a like-for-like comparison against venues that bill both sides has to count one side at each of them. The gap between the two pages is this maker band, and both figures are correct.</div>

## Cumulative fee revenue

<p class="section-intro">Reported non-sports and sports fees, plus the parlay residual. The published components are mutually exclusive and add up to the headline fee total, so the bands are an exact decomposition of the chart above.</p>

<div class="instruction-line"><strong>Useful trick:</strong> watch the slope, not just the height — a steeper stretch means Kalshi was collecting fees faster in that period.</div>

```js
const dr2 = view(makeDateBrush(new Date("2021-06-01"), d => d.fees_total || 0, "#1a9641"));
```

```js
const [s2, e2] = dr2;
const fs2 = sports.filter(d => d.date >= s2 && d.date <= e2).slice().sort((a, b) => a.date - b.date);

// Parlay fees land in fees_total but in neither fees_sports nor fees_nonsports, so summing
// only those two ran ~10% under the all-time KPI. Take parlays as the residual against
// daily_overall.csv (exactly $0 before 2025, when parlays launched).
const feesTotalByDate = new Map(daily.map(d => [+d.date, d.fees_total || 0]));

// The stack is built explicitly rather than left to Plot's stack transform — areaY given a
// bare `y` stacks implicitly, which is what made this chart disagree with the KPI unnoticed.
// One source of truth for the three band names. The stack, the colour domain and the
// tooltip all read it, so a rename can no longer orphan one of them. That is exactly what
// happened when "Sports" became "Sports (excl. parlays)" in 98002ae: the tooltip kept
// asking for `d.Sports`, got undefined, and printed "Sports: $0" with a Total of $500.1M
// on a page whose own KPI reads $1.85B -- while the band beside it drew the real $1.36bn.
const FEE_BANDS = ["Non-sports", "Sports (excl. parlays)", "Parlays"];
// Keep parlays in the sports family while the lighter lime shade distinguishes
// them from straight sports fees; non-sports stays clearly blue.
const FEE_BAND_COLORS = ["#377eb8", "#1b9e77", "#a6d854"];
const [BAND_NONSPORT, BAND_SPORT, BAND_PARLAY] = FEE_BANDS;
let sCum = 0, nsCum = 0, pCum = 0;
const cumFeesSplit = fs2.flatMap(d => {
  const s  = d.fees_sports_nonparlay || 0;
  const ns = d.fees_nonsports || 0;
  nsCum += ns;
  sCum  += s;
  // Keep the residual non-negative as a guard only. Since the producer made the components
  // mutually exclusive (KalshiData f7063f0, 2026-08-24) they never exceed fees_total --
  // 0 of 1,890 dates on 2026-09-02 -- so this clamps nothing in practice.
  pCum  += Math.max(0, (feesTotalByDate.get(+d.date) ?? (s + ns)) - s - ns);
  return [
    {date: d.date, category: BAND_NONSPORT, cumul: nsCum, y0: 0,            y1: nsCum},
    {date: d.date, category: BAND_SPORT,    cumul: sCum,  y0: nsCum,        y1: nsCum + sCum},
    {date: d.date, category: BAND_PARLAY,   cumul: pCum,  y0: nsCum + sCum, y1: nsCum + sCum + pCum}
  ];
});
```

```js
// Per-date pivot for single combined tooltip
const cumFeesTipData = Array.from(
  d3.rollup(cumFeesSplit, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.category] = r.cumul || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative fees (USD)", grid: true,
    tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")
  },
  color: {legend: true, domain: FEE_BANDS, range: FEE_BAND_COLORS},
  marks: [
    Plot.areaY(cumFeesSplit, {
      x: "date", y1: "y0", y2: "y1", fill: "category",
      fillOpacity: 0.85, curve: "monotone-x"
    }),
    Plot.ruleX(cumFeesTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(cumFeesTipData, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        ...FEE_BANDS.map(b => `${b}: $${(d[b]||0).toLocaleString(undefined,{maximumFractionDigits:0})}`),
        `Bands shown: $${FEE_BANDS.reduce((t, b) => t + (d[b]||0), 0).toLocaleString(undefined,{maximumFractionDigits:0})}`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

## Fee rate (cents per contract)

<p class="section-intro">The realized average fee Kalshi kept on each contract traded.</p>

<div class="instruction-line"><strong>Useful trick:</strong> after a volume spike, use this to tell whether revenue rose from more contracts or from each contract monetizing better.</div>

```js
const dr3 = view(makeDateBrush(new Date("2025-01-01"), d => d.fees_total / (d.contracts_total || 1) * 100, "var(--accent-secondary)"));
```

```js
const [s3, e3] = dr3;
const feeRate = (
  feeRateView === "Overall"
    ? daily.map(d => ({
        date: d.date,
        contracts: d.contracts_total || 0,
        fees: d.fees_total || 0
      }))
    : sports.map(d => ({
        date: d.date,
        contracts: feeRateView === "Sports (excl. parlays)" ? (d.contracts_sports_nonparlay || 0) : (d.contracts_nonsports || 0),
        fees: feeRateView === "Sports (excl. parlays)" ? (d.fees_sports_nonparlay || 0) : (d.fees_nonsports || 0)
      }))
)
  .filter(d => d.date >= s3 && d.date <= e3 && d.contracts > 0)
  .map(d => ({date: d.date, rate: d.fees / d.contracts * 100}));

const feeRateColor =
  feeRateView === "Sports (excl. parlays)" ? "#1a9641"
  : feeRateView === "Non-sports" ? "var(--accent-kalshi)"
  : "var(--accent-secondary)";
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Avg fee per contract (cents)", grid: true, tickFormat: d => d.toFixed(2) + "c"},
  marks: [
    Plot.lineY(feeRate, {
      x: "date", y: "rate",
      stroke: feeRateColor, strokeWidth: 1.5, curve: "monotone-x",
      tip: true,
      title: d => `${fmtDate(d.date)}\n${feeRateView} avg fee: ${d.rate.toFixed(3)} cents per contract`
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="control-strip">

```js
const feeRateView = view(Inputs.radio(["Overall", "Sports (excl. parlays)", "Non-sports"], {
  label: "Segment",
  value: "Overall"
}));
```

</div>
