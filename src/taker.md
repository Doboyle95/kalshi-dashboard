---
title: Taker-Side Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker-Side Volume</h1>
  <p class="page-lead">The closest equivalent to sportsbook handle: dollars staked by the participants crossing the spread. Yes-side takers bought upside; no-side takers faded it.</p>
  <div class="page-meta">Each trade has one taker (the aggressor who crosses the spread) and one maker (the resting order). Taker notional = contracts × price paid. For yes-side: price paid is the yes price. For no-side: price paid is 1 − yes price.</div>
</div>

```js
const fmtUSD  = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-$" : "$"; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : a.toFixed(0)); };
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const taker = await FileAttachment("data/taker_notional_daily.csv").csv({typed: true});
```

```js
function rollingMean(rows, key) {
  return rows.map((d, i) => ({
    date: d.date,
    ma: d3.mean(rows.slice(Math.max(0, i - 6), i + 1), r => r[key])
  })).filter((_, i) => i >= 6);
}
const ma7 = rollingMean(taker, "notional_total");
```

```js
const totalNotional = d3.sum(taker, d => d.notional_total);
const peakDay       = taker.reduce((b, d) => d.notional_total > b.notional_total ? d : b, taker[0]);
const recentRows    = taker.slice(-30);
const recentAvg     = d3.mean(recentRows, d => d.notional_total);
const recentPctYes  = d3.mean(recentRows, d => d.notional_yes / d.notional_total * 100);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time taker notional</div>
    <div class="kpi-value">${fmtUSD(totalNotional)}</div>
    <div class="kpi-meta">dollars staked by takers</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtUSD(peakDay?.notional_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">30-day daily avg</div>
    <div class="kpi-value">${fmtUSD(Math.round(recentAvg))}</div>
    <div class="kpi-meta">dollars/day</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Recent yes-side share</div>
    <div class="kpi-value">${recentPctYes?.toFixed(1)}%</div>
    <div class="kpi-meta">of notional (30-day avg)</div>
  </div>
</div>

```js
function makeTakerBrush(defaultStart) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8, w = width;
  const x = d3.scaleUtc().domain(d3.extent(taker, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(taker, d => d.notional_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);
  const svg = d3.create("svg").attr("width", w).attr("height", h)
    .style("display","block").style("background","var(--theme-background-alt)")
    .style("border","1px solid var(--card-border)").style("border-radius","4px")
    .style("margin-bottom","1.5rem");
  svg.append("path").datum(taker)
    .attr("fill","#00C2A8").attr("fill-opacity",0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h-mb).y1(d => y(d.notional_total)).curve(d3.curveBasis));
  svg.append("g").attr("transform",`translate(0,${h-mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke","#ccc"))
    .call(g => g.selectAll("text").style("font-size","10px").attr("fill","#888"));
  const defaultEnd = d3.max(taker, d => d.date);
  const brush = d3.brushX().extent([[ml,mt],[w-mr,h-mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });
  svg.append("g").attr("class","brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill","#00C2A8").style("fill-opacity",0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

## Daily taker notional

<p class="section-intro">Dollars staked by the active side of each trade — the sportsbook handle equivalent. Unlike contract count, this weights each bet by its dollar cost, so a 99¢ YES contract and a 1¢ NO contract on the same market contribute equally.</p>

```js
const dr = view(makeTakerBrush(new Date("2025-01-01")));
```

```js
const [s1, e1] = dr;
const fd    = taker.filter(d => d.date >= s1 && d.date <= e1);
const ma7fd = ma7.filter(d => d.date >= s1 && d.date <= e1);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 360,
  marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Taker notional ($)", grid: true},
  marks: [
    Plot.rectY(fd, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.notional_total || 0,
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
        `Total: ${fmtUSD(d.notional_total)}`,
        `Yes-side: ${fmtUSD(d.notional_yes)} (${(d.notional_yes/d.notional_total*100).toFixed(1)}%)`,
        `No-side:  ${fmtUSD(d.notional_no)}  (${(d.notional_no/d.notional_total*100).toFixed(1)}%)`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Daily taker notional</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #e15759"></span>7-day average</span>
</div>

## Yes vs. No notional

<p class="section-intro">Which direction is the aggressive money flowing? Yes-side takers are buying upside; no-side takers are fading it. A persistent yes-side majority reflects that buyers are more aggressive than sellers across the book.</p>

```js
const fdStack = fd.flatMap(d => [
  {date: d.date, side: "Yes", value: d.notional_yes  || 0},
  {date: d.date, side: "No",  value: d.notional_no   || 0}
]);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Taker notional ($)", grid: true},
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
        `Yes: ${fmtUSD(d.notional_yes)} (${(d.notional_yes/d.notional_total*100).toFixed(1)}%)`,
        `No:  ${fmtUSD(d.notional_no)}  (${(d.notional_no/d.notional_total*100).toFixed(1)}%)`
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
  <summary>How taker notional is calculated</summary>
  <p>Every matched trade has an aggressor (taker) who crosses the spread and a liquidity provider (maker) who rests. The taker's cost depends on which side they take: a yes-side taker pays the yes price per contract; a no-side taker pays <em>1 − yes price</em> per contract. Summing those dollar amounts across all takers gives total taker notional — the prediction-market equivalent of handle in sports betting. Unlike raw contract count, notional is unaffected by artificial inflation from high-frequency trading in near-certain contracts.</p>
</details>
