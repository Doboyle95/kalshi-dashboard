---
title: Kalshi Volume
---

# Kalshi Volume

```js
const fmtCount = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
```

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
```

```js
// All-time KPIs (not filtered by date range)
const totalContracts = d3.sum(daily, d => d.contracts_total);
const peakDay = daily.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, daily[0]);
```

<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">All-time contracts</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">${fmtCount(totalContracts)}</div>
  </div>
  <div style="background:#fff8f0;border-left:4px solid #e15759;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Peak single day</div>
    <div style="font-size:1.6em;font-weight:700;color:#e15759">${fmtCount(peakDay?.contracts_total)}</div>
    <div style="font-size:0.72em;color:#999">${peakDay?.date?.toISOString().slice(0,10)}</div>
  </div>
</div>

```js
// Reusable mini-brush factory. Returns an SVG node whose .value = [startDate, endDate].
// Each chart calls view(makeDateBrush(...)) independently.
function makeDateBrush(defaultStart, yAcc = d => d.contracts_total, color = "#2c7bb6") {
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

```js
// Shared wide-category mapping (no date dependency)
const volWideMap = {
  KXNFLGAME: "Football", KXNFLSPREAD: "Football", KXNFLTOTAL: "Football",
  KXNCAAFGAME: "Football", KXNCAAFSPREAD: "Football", KXNCAAFTOTAL: "Football",
  KXSB: "Football",
  KXNBAGAME: "Basketball", KXNBASPREAD: "Basketball", KXNBATOTAL: "Basketball", KXNBA: "Basketball",
  KXNCAAMBGAME: "Basketball", KXNCAAMBSPREAD: "Basketball", KXNCAAMBTOTAL: "Basketball",
  KXMARMAD: "Basketball", KXNCAAWBGAME: "Basketball",
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Other sports",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance",
  KXFIRSTSUPERBOWLSONG: "Entertainment", KXSUPERBOWLAD: "Entertainment",
  KXPERFORMSUPERBOWLB: "Entertainment", KXSBGUESTS: "Entertainment",
  KXSBADS: "Entertainment", KXHALFTIMESHOW: "Entertainment",
  KXSBPERFORM: "Entertainment", KXSUPERBOWLHEADLINE: "Entertainment",
  KXSBADAPPEARANCES: "Entertainment", KXSBVIEWER: "Entertainment",
  KXSBMENTION: "Entertainment", KXSBSETLISTS: "Entertainment",
  KXHIGHNY: "Weather", KXHIGHLAX: "Weather", KXHIGHMIA: "Weather",
  KXHIGHCHI: "Weather", KXHIGHAUS: "Weather",
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
  const knownSports    = groups.Football + groups.Basketball + groups.Baseball + groups.Golf + groups.Tennis + groups.Soccer;
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date, ...groups, Parlay: parlay,
    "Other sports":     Math.max(0, totSports    - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});
```

## Daily contracts traded

```js
const dr1 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);

const maxContracts = d3.max(fd1, d => d.contracts_total);
const allMilestones = [
  {date: new Date("2024-11-05"), label: "Election Day '24", tier: 0},
  {date: new Date("2025-09-07"), label: "NFL season '25",   tier: 1},
  {date: new Date("2026-01-17"), label: "NFL Divisional",   tier: 1},
  {date: new Date("2026-01-25"), label: "NFL Championship", tier: 0},
  {date: new Date("2026-02-08"), label: "Super Bowl LIX",   tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness",    tier: 0},
];
const milestones = allMilestones
  .filter(m => m.date >= s1 && m.date <= e1)
  .map(m => ({...m, y: m.tier === 0 ? maxContracts : maxContracts * 0.78}));
```

```js
Plot.plot({
  width,
  height: 380,
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#2c7bb6", fillOpacity: 0.6,
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n${(d.contracts_total||0).toLocaleString()} contracts`
    }),
    Plot.lineY(fd1.filter(d => d.ma7_contracts != null), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x",
      tip: true,
      title: d => `${d.date.toISOString().slice(0,10)}\n7-day avg: ${d.ma7_contracts?.toLocaleString()}`
    }),
    Plot.ruleX(milestones, {x: "date", stroke: "#555", strokeDasharray: "3,3", strokeWidth: 1}),
    Plot.text(milestones, {
      x: "date", y: "y", text: "label",
      textAnchor: "start", lineAnchor: "bottom",
      rotate: -42, fontSize: 10, fill: "#555", dx: 3, dy: -2
    }),
    Plot.ruleY([0])
  ]
})
```

<span style="color:#2c7bb6">&#9632; Daily</span> &nbsp; <span style="color:#e15759">&#8212; 7-day average</span>

## Sports vs. non-sports volume

```js
const sportsView = view(Inputs.radio(["Both (stacked)", "Sports only", "Non-sports only"], {
  value: "Both (stacked)"
}));
const sportsMetric = view(Inputs.radio(["Contracts", "Fees"], {value: "Contracts"}));
```

```js
const dr2 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const [s2, e2] = dr2;
const fd2 = daily.filter(d => d.date >= s2 && d.date <= e2);
const fs2 = sports.filter(d => d.date >= s2 && d.date <= e2);

const sportsOrder    = ["Other sports", "Soccer", "Golf", "Tennis", "Baseball", "Basketball", "Football", "Parlay"];
const nonSportsOrder = ["Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto"];

const tidySports =
  sportsView === "Sports only"
    ? fd2.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = fs2.find(r => +r.date === +d.date) || {};
        const totalContracts2 = sportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees2 = sp.fees_sports || 0;
        return sportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees" ? totalFees2 * ((w[g] || 0) / totalContracts2) : (w[g] || 0)
        }));
      })
  : sportsView === "Non-sports only"
    ? fd2.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = fs2.find(r => +r.date === +d.date) || {};
        const totalContracts2 = nonSportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees2 = sp.fees_nonsports || 0;
        return nonSportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees" ? totalFees2 * ((w[g] || 0) / totalContracts2) : (w[g] || 0)
        }));
      })
  : fs2.flatMap(d => [
      {date: d.date, category: "Non-sports", value: sportsMetric === "Fees" ? (d.fees_nonsports || 0) : (d.contracts_nonsports || 0)},
      {date: d.date, category: "Sports",     value: sportsMetric === "Fees" ? (d.fees_sports    || 0) : (d.contracts_sports    || 0)}
    ]);

const subOrder =
  sportsView === "Sports only"    ? sportsOrder
  : sportsView === "Non-sports only" ? nonSportsOrder
  : ["Non-sports", "Sports"];

const useTableau = sportsView !== "Both (stacked)";

function rollingMean7(rows, valueKey) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  const byDate = d3.rollup(sorted, v => d3.sum(v, d => d[valueKey]), d => +d.date);
  const dates  = [...byDate.keys()].sort((a,b) => a-b);
  return dates.map((t, i) => {
    const slice = dates.slice(Math.max(0, i-6), i+1).map(k => byDate.get(k));
    return {date: new Date(t), ma: d3.mean(slice)};
  }).filter(d => dates.indexOf(+d.date) >= 6);
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
      order: subOrder, curve: "monotone-x", fillOpacity: 0.85
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

