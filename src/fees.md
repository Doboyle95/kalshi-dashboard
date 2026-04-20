---
title: Kalshi Fee Revenue
---

# Kalshi Fee Revenue

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
const fmtCount = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) ?? "";
```

```js
// All-time fee KPIs
const totalFees      = d3.sum(daily, d => d.fees_total);
const annualizedFees = totalFees / daily.length * 365;
const peakFeeDay     = daily.reduce((best, d) => (d.fees_total||0) > (best.fees_total||0) ? d : best, daily[0]);
const totalContracts = d3.sum(daily, d => d.contracts_total);
const avgFeeRate     = totalFees / totalContracts * 100; // cents per contract
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f9f6ff;border-left:4px solid #756bb1;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time fee revenue</div>
    <div style="font-size:1.6em;font-weight:700;color:#756bb1">${fmtUSD(totalFees)}</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #3f007d;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Annualized run rate</div>
    <div style="font-size:1.6em;font-weight:700;color:#3f007d">${fmtUSD(annualizedFees)}/yr</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak fee day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${fmtUSD(peakFeeDay?.fees_total||0)}</div>
    <div style="font-size:0.72em;color:#999">${fmtDate(peakFeeDay?.date)}</div>
  </div>
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Avg fee per contract</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">${avgFeeRate.toFixed(3)}¢</div>
  </div>
</div>

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
    .style("background", "#fafafa")
    .style("border", "1px solid #e8e8e8")
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

```js
const dr1 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);
```

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.fees_total || 0,
      fill: "#756bb1", fillOpacity: 0.8,
      tip: true,
      title: d => `${fmtDate(d.date)}\nFees: $${(d.fees_total||0).toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.lineY(fd1.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "#3f007d", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${fmtDate(d.date)}\n7-day avg: $${d.ma7_fees?.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

<span style="color:#756bb1">&#9632; Daily</span> &nbsp; <span style="color:#3f007d">&#8212; 7-day average</span>

## Cumulative fee revenue

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

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative fees (USD)", grid: true,
    tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")
  },
  color: {legend: true, domain: ["Non-sports", "Sports"], range: ["#2c7bb6", "#1a9641"]},
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

## Fee rate (&#162; per contract)

_Average fee Kalshi collects per contract traded. Peaks near 50&#162; contracts (where the bell-curve fee is highest); falls toward 0 at extreme prices. Drops reflect election-market fee waivers and shifts in mix toward high-certainty contracts._

```js
const dr3 = view(makeDateBrush(new Date("2025-01-01"), d => d.fees_total / (d.contracts_total || 1) * 100, "#756bb1"));
```

```js
const [s3, e3] = dr3;
const feeRate = daily
  .filter(d => d.date >= s3 && d.date <= e3 && d.contracts_total > 0)
  .map(d => ({date: d.date, rate: d.fees_total / d.contracts_total * 100}));
```

```js
Plot.plot({
  width,
  height: 240,
  x: {type: "utc", label: null},
  y: {label: "Avg fee per contract (&#162;)", grid: true, tickFormat: d => d.toFixed(2) + "&#162;"},
  marks: [
    Plot.lineY(feeRate, {
      x: "date", y: "rate",
      stroke: "#756bb1", strokeWidth: 1.5, curve: "monotone-x",
      tip: true,
      title: d => `${fmtDate(d.date)}\nAvg fee: ${d.rate.toFixed(3)}¢ per contract`
    }),
    Plot.ruleY([0])
  ]
})
```
