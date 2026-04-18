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
// Map tickers to display groups — Football and Basketball split into pro/college subcategories
const wideMap = {
  // NFL (pro football) — dark warm
  KXNFLGAME: "NFL", KXNFLSPREAD: "NFL", KXNFLTOTAL: "NFL", KXSB: "NFL",
  // College football — lighter warm
  KXNCAAFGAME: "College football", KXNCAAFSPREAD: "College football", KXNCAAFTOTAL: "College football",
  // NBA (pro basketball) — dark blue
  KXNBAGAME: "NBA", KXNBASPREAD: "NBA", KXNBATOTAL: "NBA", KXNBA: "NBA",
  // College basketball — lighter blue (includes March Madness)
  KXNCAAMBGAME: "College basketball", KXNCAAMBSPREAD: "College basketball",
  KXNCAAMBTOTAL: "College basketball", KXMARMAD: "College basketball", KXNCAAWBGAME: "College basketball",
  // Other sports
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Hockey",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXUFCFIGHT: "Combat sports",
  // Non-sports
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

// Build wide-category daily totals
const wideDaily = topDaily.map(row => {
  const sp = sportsSplit.find(s => +s.date === +row.date) || {};
  const groups = {
    NFL: 0, "College football": 0,
    NBA: 0, "College basketball": 0,
    Baseball: 0, Hockey: 0, Golf: 0, Tennis: 0,
    Soccer: 0, "Combat sports": 0,
    Crypto: 0, Politics: 0, Finance: 0, Entertainment: 0, Weather: 0
  };
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = wideMap[cat];
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Other sports":     Math.max(0, totSports    - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});

// Stacking order: non-sports bottom → sports → parlay top
// Football pair (warm): NFL dark, College football light
// Basketball pair (blue): NBA dark, College basketball light
const wideOrder = [
  "Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto",
  "Other sports", "Combat sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College football", "NFL",
  "College basketball", "NBA",
  "Parlay"
];

// Color map — subcategory pairs share hue family
const wideColors = {
  "Other non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Finance": "#6b8cae", "Politics": "#455a64", "Crypto": "#263238",
  "Other sports": "#c8e6c9",
  "Combat sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  // Football family — warm orange pair
  "College football": "#ffcc80", "NFL": "#bf360c",
  // Basketball family — blue pair
  "College basketball": "#90caf9", "NBA": "#0d47a1",
  // Parlay — top, prominent
  "Parlay": "#7b1fa2"
};
```

```js
// Mutable date range — default to 2025 onwards (earlier has near-zero sports volume)
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

// Roll up to monthly totals within the brushed window
const monthRolled = d3.rollup(
  wideDaily.filter(d => d.date >= chartStart && d.date <= chartEnd),
  rs => {
    const obj = {};
    for (const g of wideOrder) obj[g] = d3.sum(rs, d => d[g] || 0);
    return obj;
  },
  d => d.date.toISOString().slice(0, 7)   // "YYYY-MM"
);

const monthlyTidy = [...monthRolled]
  .sort(([a], [b]) => a < b ? -1 : 1)
  .flatMap(([mo, vals]) =>
    wideOrder.map(g => ({month: mo, category: g, contracts: vals[g] || 0}))
  );

const monthLabels = [...new Set(monthlyTidy.map(d => d.month))].sort();
const monthTickFormat = mo => {
  const [y, m] = mo.split("-");
  const abbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1];
  return m === "01" ? `${abbr} '${y.slice(2)}` : abbr;
};
```

```js
Plot.plot({
  width,
  height: 420,
  marginBottom: 40,
  color: {
    legend: true,
    domain: wideOrder,
    range: wideOrder.map(g => wideColors[g])
  },
  x: {
    type: "band",
    domain: monthLabels,
    label: null,
    tickFormat: monthTickFormat,
    tickRotate: monthLabels.length > 18 ? -45 : 0
  },
  y: {
    label: "Monthly contracts",
    grid: true,
    tickFormat: d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
  },
  marks: [
    Plot.barY(monthlyTidy, {
      x: "month",
      y: "contracts",
      fill: "category",
      order: wideOrder,
      tip: true,
      title: d => `${d.category}\n${d.month}\n${d.contracts.toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Monthly totals. Football and basketball split into pro and college (paired colors — dark/light). Parlay = cross-game multi-leg contracts. Other sports = all sports not individually tracked. Use the brush above to change the date window.</p>

## Sports market type breakdown

_How sports volume is split between market types across all sports tickers. Moneylines = individual game winners. Futures/Award = season champions, conference winners, awards, tournament brackets. Parlay (multi-game) = cross-game combos. Parlay (single-game) = same-game parlays._

```js
const marketTypeRaw = await FileAttachment("data/sports_market_type_daily.csv").csv({typed: true});
```

```js
// Consolidate minor categories for cleaner display
const MT_REMAP = {
  "Parlay (multi-game)": "Parlay (multi-game)",
  "Parlay (single-game)": "Parlay (SGP)",
  "Moneyline": "Moneyline",
  "Spread": "Spread",
  "Over/Under": "Over/Under",
  "Futures/Award": "Futures/Award",
  "Player Prop": "Player Prop",
  "Game Prop": "Game Prop",
  "Cricket": "Other",
  "Esports": "Other",
  "Motorsport": "Other",
  "Mention": "Other",
  "Other": "Other"
};

const mtOrder = [
  "Moneyline", "Futures/Award", "Spread", "Over/Under",
  "Parlay (multi-game)", "Parlay (SGP)", "Player Prop", "Game Prop", "Other"
];
const mtColors = [
  "#4e79a7", "#76b7b2", "#f28e2b", "#e15759",
  "#b07aa1", "#d4a0c7", "#59a14f", "#8cd17d", "#bab0ac"
];

// Roll up tidy data to consolidated categories
// Use ISO string as rollup key (Date objects compare by reference, not value)
const mtRolled = d3.rollup(
  marketTypeRaw,
  rs => d3.sum(rs, r => r.contracts),
  r => (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date)),
  r => MT_REMAP[r.market_type] || "Other"
);

const mtDaily = Array.from(mtRolled, ([dateStr, byType]) => {
  const row = {date: new Date(dateStr)};
  for (const g of mtOrder) row[g] = byType.get(g) || 0;
  return row;
}).sort((a, b) => a.date - b.date);
```

```js
// Independent date brush for this chart
const mtEnd0 = d3.max(mtDaily, d => d.date);
const mtStart0 = new Date(mtEnd0);
mtStart0.setMonth(mtStart0.getMonth() - 6);
const mtDateSel = Mutable([mtStart0, mtEnd0]);
```

```js
{
  const h = 60, mt = 4, mb = 22, ml = 8, mr = 8, w = width;
  const x = d3.scaleUtc().domain(d3.extent(mtDaily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(mtDaily, d => mtOrder.reduce((s, g) => s + (d[g] || 0), 0));
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg").attr("width", w).attr("height", h)
    .style("display", "block").style("background", "#fafafa")
    .style("border", "1px solid #e8e8e8").style("border-radius", "4px").style("margin-bottom", "1.5rem");

  // Total sports volume sparkline
  svg.append("path").datum(mtDaily)
    .attr("fill", "#4e79a7").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(mtOrder.reduce((s, g) => s + (d[g] || 0), 0)))
      .curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const [ds, de] = mtDateSel;
  const brush = d3.brushX().extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", ({selection}) => { if (selection) mtDateSel.value = selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const [mtStart, mtEnd] = mtDateSel;

const mtTidy = mtDaily
  .filter(d => d.date >= mtStart && d.date <= mtEnd)
  .flatMap(row => mtOrder.map(g => ({date: row.date, type: g, contracts: row[g] || 0})));
```

```js
Plot.plot({
  width,
  height: 380,
  color: {legend: true, domain: mtOrder, range: mtColors},
  x: {type: "utc", label: null},
  y: {label: "Contracts", grid: true},
  marks: [
    Plot.areaY(mtTidy, {
      x: "date",
      y: "contracts",
      fill: "type",
      order: mtOrder,
      curve: "monotone-x",
      fillOpacity: 0.85,
      tip: true,
      title: d => `${d.type}\n${d.date.toISOString().slice(0, 10)}\n${d.contracts.toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```
