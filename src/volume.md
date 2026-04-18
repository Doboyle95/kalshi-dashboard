---
title: Kalshi Volume
---

# Kalshi Volume

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
// All-time KPIs (not filtered by date range)
const totalContracts = d3.sum(daily, d => d.contracts_total);
const totalFees = d3.sum(daily, d => d.fees_total);
const peakDay = daily.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, daily[0]);
const annualizedFees = totalFees / daily.length * 365;
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time contracts</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">${(totalContracts/1e9).toFixed(1)}B</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #756bb1;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time fee revenue</div>
    <div style="font-size:1.6em;font-weight:700;color:#756bb1">$${(totalFees/1e6).toFixed(0)}M</div>
  </div>
  <div style="background:#f9f6ff;border-left:4px solid #3f007d;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Annualized run rate</div>
    <div style="font-size:1.6em;font-weight:700;color:#3f007d">$${(annualizedFees/1e6).toFixed(0)}M/yr</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${(peakDay?.contracts_total/1e6).toFixed(0)}M</div>
    <div style="font-size:0.72em;color:#999">${peakDay?.date?.toISOString().slice(0,10)}</div>
  </div>
</div>

```js
// Date range brush — mini overview chart with draggable handles
// Drag the shaded region or its edges to zoom all charts below
const dateRange = view((() => {
  const h = 72, mt = 6, mb = 24, ml = 8, mr = 8;
  const w = width;

  const x = d3.scaleUtc()
    .domain(d3.extent(daily, d => d.date))
    .range([ml, w - mr]);

  const yMax = d3.max(daily, d => d.contracts_total);
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "#fafafa")
    .style("border", "1px solid #e8e8e8")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  // Full-history area sparkline
  svg.append("path")
    .datum(daily)
    .attr("fill", "#2c7bb6").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date))
      .y0(h - mb)
      .y1(d => y(d.contracts_total))
      .curve(d3.curveBasis));

  // X axis (years only)
  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x)
      .ticks(d3.timeYear.every(1))
      .tickFormat(d3.timeFormat("%Y"))
      .tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  // Brush
  const defaultStart = new Date("2025-01-01");
  const defaultEnd = d3.max(daily, d => d.date);

  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", ({selection}) => {
      if (selection) {
        svg.property("value", selection.map(x.invert));
        svg.dispatch("input");
      }
    });

  svg.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, [defaultStart, defaultEnd].map(x));

  // Style the brush handles
  svg.selectAll(".handle")
    .style("fill", "#2c7bb6")
    .style("fill-opacity", 0.8);

  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
})());
```

```js
const [startDate, endDate] = dateRange;
const filteredDaily = daily.filter(d => d.date >= startDate && d.date <= endDate);
const filteredSports = sports.filter(d => d.date >= startDate && d.date <= endDate);
```

## Daily contracts traded

```js
const maxContracts = d3.max(filteredDaily, d => d.contracts_total);

const allMilestones = [
  {date: new Date("2024-11-05"), label: "Election Day '24", tier: 0},
  {date: new Date("2025-09-07"), label: "NFL season '25",   tier: 1},
  {date: new Date("2026-01-17"), label: "NFL Divisional",   tier: 1},
  {date: new Date("2026-01-25"), label: "NFL Championship", tier: 0},
  {date: new Date("2026-02-08"), label: "Super Bowl LIX",   tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness",    tier: 0},
];

const milestones = allMilestones
  .filter(m => m.date >= startDate && m.date <= endDate)
  .map(m => ({...m, y: m.tier === 0 ? maxContracts : maxContracts * 0.78}));
```

```js
Plot.plot({
  width,
  height: 380,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.rectY(filteredDaily, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#2c7bb6", fillOpacity: 0.6,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n${(d.contracts_total||0).toLocaleString()} contracts`
    }),
    Plot.lineY(filteredDaily.filter(d => d.ma7_contracts != null), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: ${d.ma7_contracts?.toLocaleString()}`
    }),
    Plot.ruleX(milestones, {
      x: "date", stroke: "#555", strokeDasharray: "3,3", strokeWidth: 1
    }),
    Plot.text(milestones, {
      x: "date", y: "y", text: "label",
      textAnchor: "start", lineAnchor: "bottom",
      rotate: -42, fontSize: 10, fill: "#555", dx: 3, dy: -2
    }),
    Plot.ruleY([0])
  ]
})
```

<span style="color:#2c7bb6">■ Daily</span> &nbsp; <span style="color:#e15759">— 7-day average</span>

## Sports vs. non-sports volume

```js
const sportsView = view(Inputs.radio(["Both (stacked)", "Sports only", "Non-sports only"], {
  value: "Both (stacked)"
}));
```

```js
const tidySports = sportsView === "Sports only"
  ? filteredSports.map(d => ({date: d.date, value: d.contracts_sports,    type: "Sports"}))
  : sportsView === "Non-sports only"
  ? filteredSports.map(d => ({date: d.date, value: d.contracts_nonsports, type: "Non-sports"}))
  : filteredSports.flatMap(d => [
      {date: d.date, value: d.contracts_nonsports, type: "Non-sports"},
      {date: d.date, value: d.contracts_sports,    type: "Sports"}
    ]);

const sportsDomain  = sportsView === "Sports only"    ? ["Sports"]
  : sportsView === "Non-sports only" ? ["Non-sports"]
  : ["Non-sports", "Sports"];
```

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  color: {
    legend: true,
    domain: sportsDomain,
    range: sportsDomain.map(t => t === "Sports" ? "#1a9641" : "#2c7bb6")
  },
  marks: [
    Plot.areaY(tidySports, {
      x: "date", y: "value", fill: "type",
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleY([0])
  ]
})
```

## Daily fee revenue

```js
Plot.plot({
  width,
  height: 260,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true},
  marks: [
    Plot.rectY(filteredDaily, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.fees_total || 0,
      fill: "#756bb1", fillOpacity: 0.8,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nFees: $${(d.fees_total||0).toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.lineY(filteredDaily.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "#3f007d", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: $${d.ma7_fees?.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Cumulative fee revenue

```js
let running = 0;
const cumFees = filteredDaily.map(d => {
  running += d.fees_total || 0;
  return {date: d.date, cumul: running};
});
```

```js
Plot.plot({
  width,
  height: 240,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative fees (USD)", grid: true,
    tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")
  },
  marks: [
    Plot.areaY(cumFees, {
      x: "date", y: "cumul",
      fill: "#756bb1", fillOpacity: 0.15, curve: "monotone-x"
    }),
    Plot.lineY(cumFees, {
      x: "date", y: "cumul",
      stroke: "#756bb1", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nCumulative: $${d.cumul.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Fee rate (% of notional)

_How much Kalshi earns as a share of money flowing through the market. Peaks near 50¢ contracts; falls toward 0 at extreme prices._

```js
const feeRate = filteredDaily
  .filter(d => d.notional_total > 0)
  .map(d => ({date: d.date, rate: d.fees_total / d.notional_total * 100}));
```

```js
Plot.plot({
  width,
  height: 220,
  x: {type: "utc", label: null},
  y: {label: "Fee rate (% of notional)", grid: true, tickFormat: d => d.toFixed(1) + "%"},
  marks: [
    Plot.lineY(feeRate, {
      x: "date", y: "rate",
      stroke: "#756bb1", strokeWidth: 1.5, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nFee rate: ${d.rate.toFixed(2)}% of notional`
    }),
    Plot.ruleY([0])
  ]
})
```
