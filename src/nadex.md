---
title: Crypto.com/Nadex
---

# Crypto.com/Nadex

```js
const catDaily  = await FileAttachment("data/nadex_categories_daily.csv").csv({typed: true});
const split     = await FileAttachment("data/nadex_sports_split_daily.csv").csv({typed: true});
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="nadex">
    <div class="kpi-label">Volume (since Dec 2024)</div>
    <div class="kpi-value">${fmtUSD(totalContracts)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtUSD(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Crypto.com/Nadex views use daily event/category exports rather than trade-level prints. Volume is normalized contract count by day; sports and category splits come from local classification of event names and categories in the Nadex export.</p>
</details>

<details class="surface-card compact-details">
  <summary>How to use this page</summary>
  <p>Because this page uses daily aggregate source files, it is best for scale and mix rather than trade-level microstructure. Use the category charts to find dominant themes, then compare the all-time breakdown against the brushed time-series view.</p>
</details>

```js
function makeBrush(data, color) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(data, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(data, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block").style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)").style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(data)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total)).curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const start = d3.min(data, d => d.date);
  const end   = d3.max(data, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").call(brush).call(brush.move, [start, end].map(x));
  svg.selectAll(".handle").style("fill", color).style("fill-opacity", 0.8);
  svg.property("value", [start, end]);
  return svg.node();
}
```

```js
const brush = view(makeBrush(split, "#9c27b0"));
```

```js
const [s, e] = brush;
const splitF   = split.filter(d => d.date >= s && d.date <= e);
const catDailyF = catDaily.filter(d => d.date >= s && d.date <= e);
```

## Daily volume

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Volume ($)", grid: true},
  marks: [
    Plot.rectY(splitF, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#9c27b0", fillOpacity: 0.6,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtUSD(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Event binary contracts only (from CFTC daily bulletins). $1 per contract denomination. Data starts Dec 23, 2024 when CFTC bulletins began including Nadex event contract volumes.</p>

## Sports vs. non-sports

```js
const tidySplit = splitF.flatMap(d => [
  {date: d.date, category: "Sports",     value: d.contracts_sports    || 0},
  {date: d.date, category: "Non-sports", value: d.contracts_nonsports || 0}
]);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Volume ($)", grid: true},
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "#00C2A8"]},
  marks: [
    Plot.areaY(tidySplit, {
      x: "date", y: "value", fill: "category",
      order: ["Non-sports", "Sports"],
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(splitF, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitF, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSports: ${fmtUSD(d.contracts_sports||0)}\nNon-sports: ${fmtUSD(d.contracts_nonsports||0)}`
    })),
    Plot.ruleY([0])
  ]
})
```

## Volume by category

```js
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const topCats = [...catTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);
const catFiltered = catDailyF.filter(d => topCats.includes(d.category));
```

```js
// Per-date pivot for single combined tooltip (avoids overlapping bubbles)
const catTipData = Array.from(
  d3.rollup(catFiltered, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.category] = r.contracts || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Volume ($)", grid: true},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    Plot.areaY(catFiltered, {
      x: "date", y: "contracts", fill: "category",
      order: topCats.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(catTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(catTipData, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...topCats.map(c => d[c] > 0 ? `${c}: ${fmtUSD(d[c])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

## Category breakdown (all time)

```js
const catBar = [...catTotals.entries()]
  .sort((a,b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 160,
  x: {label: "Contracts (all time)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "#9c27b0", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtUSD(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
})
```
