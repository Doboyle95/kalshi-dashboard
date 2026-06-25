---
title: Kalshi Fee Revenue
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Fee Revenue</h1>
  <p class="page-lead">How much Kalshi actually makes from all that trading — fees collected day by day, who's contributed over time, and how many cents it keeps per contract.</p>
</div>

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
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
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
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
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Annualized run rate</div>
    <div class="kpi-value">${fmtUSD(annualizedFees)}/yr</div>
    <div class="kpi-meta">based on trailing 30 days</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak fee day</div>
    <div class="kpi-value">${fmtUSD(peakFeeDay?.fees_total||0)}</div>
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
function makeDateBrush(defaultStart, yAcc = d => d.fees_total || 0, color = "#756bb1") {
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
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
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
      fill: "#756bb1", fillOpacity: 0.8
    }),
    Plot.lineY(fd1.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "#3f007d", strokeWidth: 2, curve: "monotone-x"
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
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#756bb1"></span>Daily fees</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #3f007d"></span>7-day average</span>
</div>

## Cumulative fee revenue

<p class="section-intro">How much sports and non-sports have each added to Kalshi's fee revenue over time.</p>

<div class="instruction-line"><strong>Useful trick:</strong> watch the slope, not just the height — a steeper stretch means Kalshi was collecting fees faster in that period.</div>

```js
const dr2 = view(makeDateBrush(new Date("2021-06-01"), d => d.fees_total || 0, "#1a9641"));
```

```js
const [s2, e2] = dr2;
const fs2 = sports.filter(d => d.date >= s2 && d.date <= e2).slice().sort((a, b) => a.date - b.date);
let sCum = 0, nsCum = 0;
const cumFeesSplit = fs2.flatMap(d => {
  sCum  += d.fees_sports    || 0;
  nsCum += d.fees_nonsports || 0;
  return [
    {date: d.date, category: "Sports",     cumul: sCum},
    {date: d.date, category: "Non-sports", cumul: nsCum}
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
  color: {legend: true, domain: ["Non-sports", "Sports"], range: ["#00C2A8", "#1a9641"]},
  marks: [
    Plot.areaY(cumFeesSplit, {
      x: "date", y: "cumul", fill: "category",
      order: ["Non-sports", "Sports"],
      fillOpacity: 0.85, curve: "monotone-x"
    }),
    Plot.ruleX(cumFeesTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(cumFeesTipData, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSports: $${(d.Sports||0).toLocaleString(undefined,{maximumFractionDigits:0})}\nNon-sports: $${(d["Non-sports"]||0).toLocaleString(undefined,{maximumFractionDigits:0})}`
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
const dr3 = view(makeDateBrush(new Date("2025-01-01"), d => d.fees_total / (d.contracts_total || 1) * 100, "#756bb1"));
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
        contracts: feeRateView === "Sports" ? (d.contracts_sports || 0) : (d.contracts_nonsports || 0),
        fees: feeRateView === "Sports" ? (d.fees_sports || 0) : (d.fees_nonsports || 0)
      }))
)
  .filter(d => d.date >= s3 && d.date <= e3 && d.contracts > 0)
  .map(d => ({date: d.date, rate: d.fees / d.contracts * 100}));

const feeRateColor =
  feeRateView === "Sports" ? "#1a9641"
  : feeRateView === "Non-sports" ? "#00C2A8"
  : "#756bb1";
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
const feeRateView = view(Inputs.radio(["Overall", "Sports", "Non-sports"], {
  label: "Segment",
  value: "Overall"
}));
```

</div>
