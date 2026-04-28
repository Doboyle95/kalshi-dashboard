---
title: Taker-Side Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker-Side Volume</h1>
  <p class="page-lead">The closest equivalent to sportsbook handle: every contract traded where the taker absorbed market risk. A rising taker share signals a healthy two-sided book.</p>
  <div class="page-meta">Taker side = the participant who crosses the spread and accepts the posted price. Maker side = the resting liquidity provider. Total taker volume ≈ gross handle.</div>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const taker = await FileAttachment("data/taker_volume_daily.csv").csv({typed: true});
```

```js
// Compute 7-day rolling mean for total and yes/no
function rollingMean(rows, key) {
  return rows.map((d, i) => ({
    date: d.date,
    ma: d3.mean(rows.slice(Math.max(0, i - 6), i + 1), r => r[key])
  })).filter((_, i) => i >= 6);
}
const ma7Total = rollingMean(taker, "contracts_total");
const ma7Yes   = rollingMean(taker, "contracts_yes");
const ma7No    = rollingMean(taker, "contracts_no");
```

```js
const totalTaker  = d3.sum(taker, d => d.contracts_total);
const peakDay     = taker.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, taker[0]);
const recentRows  = taker.slice(-30);
const recentAvg   = d3.mean(recentRows, d => d.contracts_total);
const recentPctYes = d3.mean(recentRows, d => d.pct_yes);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time taker volume</div>
    <div class="kpi-value">${fmtCount(totalTaker)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">30-day daily avg</div>
    <div class="kpi-value">${fmtCount(Math.round(recentAvg))}</div>
    <div class="kpi-meta">contracts/day</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Recent yes-side share</div>
    <div class="kpi-value">${recentPctYes?.toFixed(1)}%</div>
    <div class="kpi-meta">30-day avg</div>
  </div>
</div>

```js
// Date brush
function makeTakerBrush(defaultStart) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(taker, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(taker, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(taker)
    .attr("fill", "#00C2A8").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultEnd = d3.max(taker, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

## Daily taker volume

<p class="section-intro">Each bar is one day of taker-side contracts. The red line is the trailing 7-day average. Super Bowl LX (Feb 8, 2026) is the all-time peak.</p>

```js
const dr = view(makeTakerBrush(new Date("2025-01-01")));
```

```js
const [s1, e1] = dr;
const fd = taker.filter(d => d.date >= s1 && d.date <= e1);
const ma7fd = ma7Total.filter(d => d.date >= s1 && d.date <= e1);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 360,
  marginLeft: 72,
  x: {type: "utc", label: null},
  y: {label: "Taker contracts", grid: true},
  marks: [
    Plot.rectY(fd, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#00C2A8",
      fillOpacity: 0.6
    }),
    Plot.lineY(ma7fd, {
      x: "date", y: "ma",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(fd, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Total: ${fmtCount(d.contracts_total)}`,
        `Yes-side: ${fmtCount(d.contracts_yes)} (${d.pct_yes?.toFixed(1)}%)`,
        `No-side:  ${fmtCount(d.contracts_no)} (${d.pct_no?.toFixed(1)}%)`
      ].filter(Boolean).join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Daily taker volume</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #e15759"></span>7-day average</span>
</div>

## Yes vs. No side

<p class="section-intro">Which direction are takers leaning? A persistent yes-side majority means more participants are buying upside contracts — a rough read on directional sentiment across all markets.</p>

```js
const fdStack = fd.flatMap(d => [
  {date: d.date, side: "Yes", value: d.contracts_yes || 0},
  {date: d.date, side: "No",  value: d.contracts_no  || 0}
]);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 72,
  x: {type: "utc", label: null},
  y: {label: "Taker contracts", grid: true, stackOffset: null},
  color: {domain: ["Yes", "No"], range: ["#00C2A8", "#e15759"], legend: false},
  marks: [
    Plot.rectY(fdStack, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: "value",
      fill: "side",
      fillOpacity: 0.75,
      offset: "stack"
    }),
    Plot.ruleX(fd, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Yes: ${fmtCount(d.contracts_yes)} (${d.pct_yes?.toFixed(1)}%)`,
        `No:  ${fmtCount(d.contracts_no)} (${d.pct_no?.toFixed(1)}%)`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Yes-side takers</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#e15759"></span>No-side takers</span>
</div>

<details class="surface-card compact-details">
  <summary>About taker-side volume</summary>
  <p>In a limit-order-book exchange, every trade has two sides: a <strong>maker</strong> who posts a resting order and a <strong>taker</strong> who crosses the spread to fill it. Taker volume counts only the taking side of each matched trade — which is why it equals total contracts traded (each contract produces one taker and one maker). The split between yes-side and no-side takers reveals directional flow: if more takers are buying yes contracts, buyers are more aggressive than sellers across Kalshi's book. Sportsbooks call the equivalent number <em>handle</em>.</p>
</details>
