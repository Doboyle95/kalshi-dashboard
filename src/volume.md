---
title: Kalshi Volume
---

# Kalshi Volume

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
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
const sportsMetric = view(Inputs.radio(["Contracts", "Fees"], {value: "Contracts"}));
```

```js
// Map tickers to broad display groups
const volWideMap = {
  // Football (pro + college, all market types)
  KXNFLGAME: "Football", KXNFLSPREAD: "Football", KXNFLTOTAL: "Football",
  KXNCAAFGAME: "Football", KXNCAAFSPREAD: "Football", KXNCAAFTOTAL: "Football",
  KXSB: "Football",
  // Basketball (pro + college, all market types, March Madness, women's)
  KXNBAGAME: "Basketball", KXNBASPREAD: "Basketball", KXNBATOTAL: "Basketball", KXNBA: "Basketball",
  KXNCAAMBGAME: "Basketball", KXNCAAMBSPREAD: "Basketball", KXNCAAMBTOTAL: "Basketball",
  KXMARMAD: "Basketball", KXNCAAWBGAME: "Basketball",
  // Other sports
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Other sports",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXUFCFIGHT: "Other sports",
  // Non-sports — crypto
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  // Non-sports — politics
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  // Non-sports — finance/economy
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance",
  // Non-sports — entertainment
  KXFIRSTSUPERBOWLSONG: "Entertainment", KXSUPERBOWLAD: "Entertainment",
  // Non-sports — weather
  KXHIGHNY: "Weather", KXHIGHLAX: "Weather", KXHIGHMIA: "Weather",
  KXHIGHCHI: "Weather", KXHIGHAUS: "Weather",
  // Skip parlay cross-category (captured via sportsSplit parlay column)
  KXMVECROSSCATEGORY: "_skip", KXMVESPORTSMULTIGAMEEXTENDED: "_skip"
};

const volWideDaily = topDaily.map(row => {
  const sp = sports.find(s => +s.date === +row.date) || {};
  const groups = {Football:0, Basketball:0, Baseball:0, Golf:0, Tennis:0, Soccer:0,
                  Crypto:0, Politics:0, Finance:0, Entertainment:0, Weather:0};
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = volWideMap[cat];
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports  = groups.Football + groups.Basketball + groups.Baseball + groups.Golf + groups.Tennis + groups.Soccer;
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Other sports": Math.max(0, totSports - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});

const sportsOrder    = ["Other sports", "Soccer", "Golf", "Tennis", "Baseball", "Basketball", "Football", "Parlay"];
const nonSportsOrder = ["Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto"];
```

```js
// Build tidy data for the selected view
// For subcategory fee views, pro-rate segment fees by each category's contract share
const tidySports =
  sportsView === "Sports only"
    ? filteredDaily.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = filteredSports.find(r => +r.date === +d.date) || {};
        const totalContracts = sportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees = sp.fees_sports || 0;
        return sportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees"
            ? totalFees * ((w[g] || 0) / totalContracts)
            : (w[g] || 0)
        }));
      })
  : sportsView === "Non-sports only"
    ? filteredDaily.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = filteredSports.find(r => +r.date === +d.date) || {};
        const totalContracts = nonSportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees = sp.fees_nonsports || 0;
        return nonSportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees"
            ? totalFees * ((w[g] || 0) / totalContracts)
            : (w[g] || 0)
        }));
      })
  : filteredSports.flatMap(d => [
      {date: d.date, category: "Non-sports", value: sportsMetric === "Fees" ? (d.fees_nonsports || 0) : (d.contracts_nonsports || 0)},
      {date: d.date, category: "Sports",     value: sportsMetric === "Fees" ? (d.fees_sports    || 0) : (d.contracts_sports    || 0)}
    ]);

const subOrder =
  sportsView === "Sports only"    ? sportsOrder
  : sportsView === "Non-sports only" ? nonSportsOrder
  : ["Non-sports", "Sports"];

const useTableau = sportsView !== "Both (stacked)";

// 7-day moving average of total across all categories (for subcategory views)
function rollingMean7(rows, valueKey) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  // Sum total per date
  const byDate = d3.rollup(sorted, v => d3.sum(v, d => d[valueKey]), d => +d.date);
  const dates  = [...byDate.keys()].sort((a,b) => a-b);
  return dates.map((t, i) => {
    const slice = dates.slice(Math.max(0, i-6), i+1).map(k => byDate.get(k));
    return {date: new Date(t), ma: d3.mean(slice)};
  }).filter(d => dates.indexOf(+d.date) >= 6); // only show where full 7-day window available
}
const sportsMA = useTableau ? rollingMean7(tidySports, "value") : [];
```

```js
Plot.plot({
  width,
  height: 280,
  x: {type: "utc", label: null},
  y: {label: sportsMetric === "Fees" ? "Fees (USD)" : "Contracts", grid: true},
  color: useTableau
    ? {legend: true, columns: 4, scheme: "tableau10", domain: subOrder}
    : {legend: true, domain: ["Non-sports", "Sports"], range: ["#2c7bb6", "#1a9641"]},
  marks: [
    Plot.areaY(tidySports, {
      x: "date", y: "value", fill: "category",
      order: subOrder,
      curve: "monotone-x", fillOpacity: 0.85
    }),
    ...(useTableau ? [Plot.lineY(sportsMA, {
      x: "date", y: "ma",
      stroke: "#111", strokeWidth: 1.8, strokeDasharray: "4,2",
      curve: "monotone-x",
      tip: true,
      title: d => `7-day avg total: ${d.ma?.toLocaleString(undefined, {maximumFractionDigits: 0})}`
    })] : []),
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

_Average fee Kalshi collects per contract traded. Peaks near 50¢ contracts (where the bell-curve fee is highest); falls toward 0 at extreme prices._

```js
const feeRate = filteredDaily
  .filter(d => d.contracts_total > 0)
  .map(d => ({date: d.date, rate: d.fees_total / d.contracts_total * 100}));
```

```js
Plot.plot({
  width,
  height: 220,
  x: {type: "utc", label: null},
  y: {label: "Avg fee per contract (¢)", grid: true, tickFormat: d => d.toFixed(2) + "¢"},
  marks: [
    Plot.lineY(feeRate, {
      x: "date", y: "rate",
      stroke: "#756bb1", strokeWidth: 1.5, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\nAvg fee: ${d.rate.toFixed(3)}¢ per contract`
    }),
    Plot.ruleY([0])
  ]
})
```
