---
title: Kalshi Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Volume</h1>
  <p class="page-lead">Follow the shape of participation as Kalshi scales: daily volume, trade count, and the internal split between sports, non-sports, and parlays.</p>
  <div class="page-meta">Use the same reading pattern across sections: brush to zoom, hover for exact values, and toggle annotations when you want cleaner trend reading.</div>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
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

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time volume</div>
    <div class="kpi-value">${fmtUSD(totalContracts)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtUSD(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
</div>

```js
// Reusable mini-brush factory. Returns an SVG node whose .value = [startDate, endDate].
// Each chart calls view(makeDateBrush(...)) independently.
function makeDateBrush(defaultStart, yAcc = d => d.contracts_total, color = "#00C2A8") {
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

```js
function rollingMean7By(rows, valueAcc) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  return sorted.map((d, i) => ({
    date: d.date,
    ma: d3.mean(sorted.slice(Math.max(0, i - 6), i + 1), valueAcc)
  })).filter((_, i) => i >= 6);
}
```

```js
const VOLUME_EVENTS = [
  {date: new Date("2024-11-05"), label: "Election Day '24", tier: 0},
  {date: new Date("2025-01-23"), label: "Sports launch", tier: 1},
  {date: new Date("2025-03-20"), label: "March Madness '25", tier: 2},
  {date: new Date("2025-09-07"), label: "NFL season '25", tier: 1},
  {date: new Date("2025-09-27"), label: "Parlays launch", tier: 2},
  {date: new Date("2026-02-08"), label: "Super Bowl LX", tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness '26", tier: 2}
];

const volumeEventMode = view(Inputs.radio(["On", "Off"], {
  label: "Annotated event mode",
  value: "On"
}));
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

## Daily volume

<p class="section-intro">This is the cleanest view of headline activity. The bars show each trading day, the moving average smooths short-term volatility, and the event overlay helps separate structural step-ups from one-off spikes.</p>

```js
const dr1 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const yScaleType = view(Inputs.radio(["Linear", "Log"], {value: "Linear"}));
```

<div class="instruction-line"><strong>Try this:</strong> hover an outlier day to compare raw volume, fees, and the 7-day baseline. Turn annotations off when you want a cleaner read on the trendline.</div>

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);

const maxContracts = d3.max(fd1, d => d.contracts_total) || 1;
const milestones = VOLUME_EVENTS
  .filter(m => m.date >= s1 && m.date <= e1)
  .map(m => ({...m, y: m.tier === 0 ? maxContracts : m.tier === 1 ? maxContracts * 0.75 : maxContracts * 0.48}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 380,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {type: yScaleType === "Log" ? "log" : "linear", label: "Volume ($)", grid: true},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "#00C2A8", fillOpacity: 0.6
    }),
    Plot.lineY(fd1.filter(d => d.ma7_contracts != null), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(fd1, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd1, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Daily: ${fmtUSD(d.contracts_total||0)}`,
        `Fees: ${fmtUSD(d.fees_total||0)}`,
        d.ma7_contracts != null ? `7-day avg: ${fmtUSD(Math.round(d.ma7_contracts))}` : null
      ].filter(Boolean).join("\n")
    })),
    ...(volumeEventMode === "On" ? [
      Plot.ruleX(milestones, {x: "date", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
      Plot.text(milestones, {
        x: "date", y: "y", text: "label",
        textAnchor: "start", lineAnchor: "bottom",
        rotate: -42, fontSize: 10, fill: "var(--annotation-text)", dx: 3, dy: -2
      })
    ] : []),
    ...(yScaleType === "Log" ? [] : [Plot.ruleY([0])])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Daily bars</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #e15759"></span>7-day average</span>
  <span class="legend-chip is-active annotation-key">Event overlay</span>
</div>

## Daily trade count

<p class="section-intro">Volume alone can hide whether activity came from many traders or a smaller number of larger tickets. This chart gives you the participation side of that same story.</p>

<div class="instruction-line"><strong>Try this:</strong> compare trade spikes with the volume chart above to see whether a regime shift came from broader participation or larger average trade size.</div>

```js
const drTrades = view(makeDateBrush(new Date("2025-01-01"), d => d.trades || 0, "#f28e2b"));
```

```js
const [sTrades, eTrades] = drTrades;
const tradeDaily = daily.filter(d => d.date >= sTrades && d.date <= eTrades);
const tradeMA = rollingMean7By(tradeDaily, d => d.trades || 0);
const maxTrades = d3.max(tradeDaily, d => d.trades || 0) || 1;
const tradeMilestones = VOLUME_EVENTS
  .filter(m => m.date >= sTrades && m.date <= eTrades)
  .map(m => ({...m, y: m.tier === 0 ? maxTrades : m.tier === 1 ? maxTrades * 0.75 : maxTrades * 0.48}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 340,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Trades", grid: true, tickFormat: d => fmtCount(d)},
  marks: [
    Plot.rectY(tradeDaily, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.trades || 0,
      fill: "#f28e2b", fillOpacity: 0.65
    }),
    Plot.lineY(tradeMA, {
      x: "date", y: "ma",
      stroke: "#8c564b", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(tradeDaily, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(tradeDaily, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Trades: ${(d.trades || 0).toLocaleString()}`,
        `Volume: ${fmtUSD(d.contracts_total || 0)}`,
        `Contracts per trade: ${((d.contracts_total || 0) / Math.max(1, d.trades || 0)).toFixed(1)}`
      ].join("\n")
    })),
    ...(volumeEventMode === "On" ? [
      Plot.ruleX(tradeMilestones, {x: "date", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
      Plot.text(tradeMilestones, {
        x: "date", y: "y", text: "label",
        textAnchor: "start", lineAnchor: "bottom",
        rotate: -42, fontSize: 10, fill: "var(--annotation-text)", dx: 3, dy: -2
      })
    ] : []),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f28e2b"></span>Daily trades</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #8c564b"></span>7-day average</span>
  <span class="legend-chip is-active annotation-key">Event overlay</span>
</div>

## Sports vs. non-sports volume

<p class="section-intro">Use this section to see what kind of business is driving the headline number. The stacked view is the fastest read on internal mix; the isolated views are better for category-level regime changes.</p>

<div class="instruction-line"><strong>Try this:</strong> switch between <em>Volume</em> and <em>Fees</em>, then isolate sports or non-sports to see whether revenue mix moves differently from headline activity.</div>

```js
const sportsView = view(Inputs.radio(["Both (stacked)", "Sports only", "Non-sports only"], {
  value: "Both (stacked)"
}));
const sportsMetric = view(Inputs.radio(["Volume", "Fees"], {value: "Volume"}));
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
  }).filter((_, i) => i >= 6);
}
const sportsMA = useTableau ? rollingMean7(tidySports, "value") : [];
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: sportsMetric === "Fees" ? "Fees ($)" : "Volume ($)", grid: true},
  color: useTableau
    ? {legend: true, columns: 4, scheme: "tableau10", domain: subOrder}
    : {legend: true, domain: ["Non-sports", "Sports"], range: ["#00C2A8", "#1a9641"]},
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
      title: d => `7-day avg: $${Math.round(d.ma||0).toLocaleString()}`
    })] : []),
    Plot.ruleY([0])
  ]
})
```

