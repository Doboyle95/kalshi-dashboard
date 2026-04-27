---
title: Kalshi Fee Revenue
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Fee Revenue</h1>
  <p class="page-lead">Track how Kalshi monetizes its flow over time: daily fee capture, cumulative fee contribution, and the per-contract fee rate for overall activity, sports, and non-sports.</p>
  <div class="page-meta">This page complements the volume page by translating activity into revenue and take-rate.</div>
</div>

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
// All-time fee KPIs
const totalFees      = d3.sum(daily, d => d.fees_total);
const annualizedFees = totalFees / daily.length * 365;
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
  <summary>How this is calculated</summary>
  <p>Fee revenue is summed from cleaned trade-level fee fields and aggregated by day. The sports/non-sports toggle uses the same classification as the volume split. Fee per contract divides daily fees by daily contracts traded, so it is a realized average fee rate rather than Kalshi's posted fee schedule.</p>
</details>

<details class="surface-card compact-details">
  <summary>How to use this page</summary>
  <p>Read daily fees for short-term spikes, cumulative fees for who contributed over time, and cents per contract for monetization mix. If fee revenue rises while fee per contract falls, volume growth is doing more work than take-rate.</p>
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

<p class="section-intro">The daily chart shows raw fee capture day by day. It is the quickest way to compare the revenue effect of the same macro moments that drive the volume charts.</p>

<div class="instruction-line"><strong>Try this:</strong> brush into an era, then hover spike days against the 7-day baseline.</div>

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

<p class="section-intro">This section answers a different question: not what happened on a given day, but which side of the book has contributed more to total fee generation over time.</p>

<div class="instruction-line"><strong>How to read this:</strong> slope matters more than height; steeper segments mean faster fee capture.</div>

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

<p class="section-intro">Average fee Kalshi collects per contract traded. This usually peaks around mid-probability contracts and compresses when mix shifts toward higher-certainty outcomes or fee waivers.</p>

<div class="instruction-line"><strong>Try this:</strong> compare whether sports and non-sports monetize differently per contract.</div>

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
