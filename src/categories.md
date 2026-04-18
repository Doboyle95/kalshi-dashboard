---
title: Categories
---

# Kalshi Categories

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
```

## All-time leaderboard

```js
const metric = view(Inputs.select(["contracts", "fees", "notional"], {
  label: "Metric", value: "contracts"
}));
const showSports = view(Inputs.select(["All", "Sports only", "Non-sports only"], {
  label: "Filter", value: "All"
}));
```

```js
const fromStr = view(Inputs.text({label: "From", placeholder: "YYYY-MM-DD", value: "2025-01-01", width: 130}));
const toStr   = view(Inputs.text({label: "To",   placeholder: "YYYY-MM-DD (blank = latest)", value: "", width: 130}));
```

```js
const catCols = Object.keys(topDaily[0]).filter(k => k !== "date");

const cutoff  = fromStr && !isNaN(new Date(fromStr)) ? new Date(fromStr) : new Date("2021-01-01");
const cutoffTo = toStr && !isNaN(new Date(toStr)) ? new Date(toStr) : new Date();
const isAllTime = cutoff <= new Date("2021-07-01") && cutoffTo >= new Date();

// Aggregate contracts from daily data for the selected period (top 15 tickers)
const dailyAgg = catCols.map(cat => {
  const total = topDaily
    .filter(d => d.date >= cutoff && d.date <= cutoffTo)
    .reduce((s, r) => s + (+r[cat] || 0), 0);
  const meta = leaderboard.find(l => l.report_ticker === cat) || {};
  return {
    report_ticker: cat,
    contracts: total,
    fees: (meta.fees || 0) * (total / (meta.contracts || 1)),
    notional: (meta.notional || 0) * (total / (meta.contracts || 1)),
    is_sports: meta.is_sports ?? "FALSE"
  };
}).filter(d => d.contracts > 0);

// Full leaderboard for all-time span; aggregated daily for any date filter
const source = isAllTime ? leaderboard : dailyAgg;

const filtered = source
  .filter(d => showSports === "All" ? true : showSports === "Sports only" ? d.is_sports === "TRUE" : d.is_sports === "FALSE")
  .sort((a, b) => b[metric] - a[metric])
  .slice(0, 25);
```

```js
Plot.plot({
  width,
  height: filtered.length * 22 + 40,
  marginLeft: 220,
  x: {label: metric === "contracts" ? "Contracts" : metric === "fees" ? "Fees (USD)" : "Notional (USD)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(filtered, {
      x: metric,
      y: "report_ticker",
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#2c7bb6",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.report_ticker}\n${metric}: ${d[metric]?.toLocaleString?.() ?? d[metric]}\nSports: ${d.is_sports}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">■ Sports</span> &nbsp; <span style="color:#2c7bb6">■ Non-sports</span>

<p style="font-size:0.82em;color:#888">Date-filtered view covers the top 15 tracked categories. All-time view covers all categories.</p>

## Volume by category over time

```js
const sportsSplit = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
// Map tickers to broad display groups (mirrors volume page)
const wideMap = {
  KXNFLGAME: "Football", KXNCAAFGAME: "Football",
  KXNBAGAME: "Basketball", KXNCAAMBGAME: "Basketball", KXNCAAMBSPREAD: "Basketball",
  KXMLBGAME: "Baseball",
  KXNHLGAME: "Other sports",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis",
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  // Non-sports — populated once daily_top_categories.csv is regenerated
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance",
  KXFIRSTSUPERBOWLSONG: "Entertainment", KXSUPERBOWLAD: "Entertainment",
  KXHIGHNY: "Weather", KXHIGHLAX: "Weather", KXHIGHMIA: "Weather",
  KXHIGHCHI: "Weather", KXHIGHAUS: "Weather",
  // Parlay handled separately via contracts_parlay column
  KXMVECROSSCATEGORY: "_skip", KXMVESPORTSMULTIGAMEEXTENDED: "_skip"
};

// Build wide-category daily totals
const wideDaily = topDaily.map(row => {
  const sp = sportsSplit.find(s => +s.date === +row.date) || {};
  const groups = {Football:0, Basketball:0, Baseball:0, Golf:0, Tennis:0,
                  Crypto:0, Politics:0, Finance:0, Entertainment:0, Weather:0};
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = wideMap[cat];
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports  = groups.Football + groups.Basketball + groups.Baseball + groups.Golf + groups.Tennis;
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Other sports": Math.max(0, totSports - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});

// Stacking order: stable non-sports at bottom, spiky sports on top
const wideOrder = ["Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto", "Other sports", "Tennis", "Golf", "Baseball", "Basketball", "Football", "Parlay"];
```

```js
// Mutable date range for this chart
const catDateSel = Mutable([new Date("2025-01-01"), d3.max(topDaily, d => d.date)]);
```

```js
{
  const h = 60, mt = 4, mb = 22, ml = 8, mr = 8, w = width;
  const x = d3.scaleUtc().domain(d3.extent(topDaily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(wideDaily, d => wideOrder.reduce((s, g) => s + (d[g]||0), 0));
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg").attr("width", w).attr("height", h)
    .style("display","block").style("background","#fafafa")
    .style("border","1px solid #e8e8e8").style("border-radius","4px").style("margin-bottom","1.5rem");

  // Total volume sparkline
  svg.append("path").datum(wideDaily)
    .attr("fill","#1a9641").attr("fill-opacity",0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h-mb).y1(d => y(wideOrder.reduce((s,g) => s+(d[g]||0),0)))
      .curve(d3.curveBasis));

  svg.append("g").attr("transform",`translate(0,${h-mb})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke","#ccc"))
    .call(g => g.selectAll("text").style("font-size","10px").attr("fill","#888"));

  const [ds, de] = catDateSel;
  const brush = d3.brushX().extent([[ml,mt],[w-mr,h-mb]])
    .on("brush end", ({selection}) => { if (selection) catDateSel.value = selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const [chartStart, chartEnd] = catDateSel;

const wideTidy = wideDaily
  .filter(d => d.date >= chartStart && d.date <= chartEnd)
  .flatMap(row => wideOrder.map(g => ({date: row.date, category: g, contracts: row[g] || 0})));
```

```js
Plot.plot({
  width,
  height: 420,
  color: {legend: true, columns: 3, scheme: "tableau10"},
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(wideTidy, {
      x: "date",
      y: "contracts",
      fill: "category",
      order: wideOrder,
      curve: "monotone-x",
      fillOpacity: 0.85
    }),
    Plot.ruleY([0])
  ]
})
```
