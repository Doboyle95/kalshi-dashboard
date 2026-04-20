---
title: Categories
---

# Kalshi Categories

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
const mktLeaderboard = await FileAttachment("data/market_leaderboard.csv").csv({typed: true});
import {hashGet, hashSet, hashInput} from "./components/hash-state.js";
```

## All-time leaderboard

```js
const metric = view(hashInput("metric", Inputs.select(["contracts", "fees", "notional"], {
  label: "Metric", value: hashGet("metric", "contracts")
})));
const showSports = view(hashInput("sports", Inputs.select(["All", "Sports only", "Non-sports only"], {
  label: "Filter", value: hashGet("sports", "All")
})));
```

```js
const fromStr = view(hashInput("from", Inputs.text({label: "From", placeholder: "YYYY-MM-DD", value: hashGet("from", "2025-01-01"), width: 130})));
const toStr   = view(hashInput("to",   Inputs.text({label: "To",   placeholder: "YYYY-MM-DD (blank = latest)", value: hashGet("to", ""), width: 130})));
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
    .on("brush end", (event) => { if (!event.sourceEvent) return; if (event.selection) catDateSel.value = event.selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const chartScale  = view(hashInput("scale",  Inputs.radio(["Absolute", "Normalized"], {value: hashGet("scale",  "Absolute"), label: "Scale"})));
const chartDetail = view(hashInput("detail", Inputs.radio(["General", "Detailed"],    {value: hashGet("detail", "General"),  label: "Categories"})));
```

```js
// General (5-category) grouping
const generalMap = {
  "NFL": "Football", "College football": "Football",
  "NBA": "Basketball", "College basketball": "Basketball",
  "Baseball": "Baseball",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Soccer": "Other sports", "Combat sports": "Other sports", "Other sports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Weather": "Non-sports", "Other non-sports": "Non-sports"
};
const generalOrder  = ["Non-sports", "Other sports", "Baseball", "Basketball", "Football", "Parlay"];
const generalColors = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2"
};

const activeOrder    = chartDetail === "Detailed" ? wideOrder    : generalOrder;
const activeColorMap = chartDetail === "Detailed" ? wideColors   : generalColors;
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
  d => d.date.toISOString().slice(0, 7)
);

const sortedMonths = [...monthRolled].sort(([a], [b]) => a < b ? -1 : 1);

// Build tidy rows for active detail level
const activeTidy = sortedMonths.flatMap(([mo, vals]) => {
  if (chartDetail === "General") {
    const gen = Object.fromEntries(generalOrder.map(g => [g, 0]));
    for (const [det, gname] of Object.entries(generalMap)) gen[gname] += vals[det] || 0;
    return generalOrder.map(g => ({month: mo, category: g, contracts: gen[g]}));
  } else {
    return wideOrder.map(g => ({month: mo, category: g, contracts: vals[g] || 0}));
  }
});

// For normalized: compute each row as a fraction of its month's total
const monthTotals = d3.rollup(activeTidy, rs => d3.sum(rs, r => r.contracts), d => d.month);
const plotTidy = activeTidy.map(d => ({
  ...d,
  value: chartScale === "Normalized"
    ? d.contracts / (monthTotals.get(d.month) || 1)
    : d.contracts
}));

const monthLabels = sortedMonths.map(([mo]) => mo);
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
  marginBottom: monthLabels.length > 18 ? 50 : 40,
  color: {
    legend: true,
    domain: activeOrder,
    range: activeOrder.map(g => activeColorMap[g])
  },
  x: {
    type: "band",
    domain: monthLabels,
    label: null,
    tickFormat: monthTickFormat,
    tickRotate: monthLabels.length > 18 ? -45 : 0
  },
  y: {
    label: chartScale === "Normalized" ? "Share of monthly contracts" : "Monthly contracts",
    grid: true,
    tickFormat: chartScale === "Normalized"
      ? d => (d * 100).toFixed(0) + "%"
      : d => d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"
  },
  marks: [
    Plot.barY(plotTidy, {
      x: "month",
      y: "value",
      fill: "category",
      order: activeOrder,
      tip: true,
      title: d => chartScale === "Normalized"
        ? `${d.category}\n${d.month}\n${(d.value * 100).toFixed(1)}% of month`
        : `${d.category}\n${d.month}\n${d.contracts.toLocaleString()} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Monthly totals. <em>General</em>: Football, Basketball, Baseball, Other sports, Parlay, Non-sports. <em>Detailed</em>: NFL vs College football (orange pair), NBA vs College basketball (blue pair), plus all other individual categories. <em>Normalized</em> shows each category's share of total monthly volume.</p>

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
    .on("brush end", (event) => { if (!event.sourceEvent) return; if (event.selection) mtDateSel.value = event.selection.map(x.invert); });
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
    Plot.ruleX(mtTidy, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.25})),
    Plot.ruleY([0])
  ]
})
```

---

## All-time individual market leaderboard

Ranked by total contracts across all outcomes. Each row is one market (e.g. "Super Bowl 2026 winner"), not an individual yes/no contract.

```js
// ── Category colors ──────────────────────────────────────────────────────────
// Sports is split into Football / Basketball / Other sport for legibility.
const CAT_COLORS = {
  "Football":               "#bf360c",  // deep orange
  "Basketball":             "#0d47a1",  // deep blue
  "Other sport":            "#1a7a3a",  // green
  "Politics":               "#b71c1c",  // red (covers Elections too)
  "Economics":              "#4e342e",  // brown
  "Entertainment":          "#880e4f",  // magenta
  "Crypto":                 "#e65100",  // orange
  "Science and Technology": "#00695c",  // teal
  "Companies":              "#1b5e20",  // green
};

// ── Team maps for game-ticker parsing ────────────────────────────────────────
const NFL_TEAMS = {
  // 3-letter first so longest-match wins
  ARI:"Cardinals", ATL:"Falcons", BAL:"Ravens", BUF:"Bills", CAR:"Panthers",
  CHI:"Bears", CIN:"Bengals", CLE:"Browns", DAL:"Cowboys", DEN:"Broncos",
  DET:"Lions", HOU:"Texans", IND:"Colts", JAC:"Jaguars", JAX:"Jaguars",
  LAC:"Chargers", MIN:"Vikings", NOR:"Saints", NYG:"Giants", NYJ:"Jets",
  PHI:"Eagles", PIT:"Steelers", SEA:"Seahawks", TEN:"Titans", WAS:"Commanders",
  // 2-letter
  GB:"Packers", KC:"Chiefs", LA:"Rams", LV:"Raiders", MIA:"Dolphins",
  NE:"Patriots", NO:"Saints", SF:"49ers", TB:"Buccaneers",
};
const NBA_TEAMS = {
  ATL:"Hawks", BKN:"Nets", BOS:"Celtics", CHA:"Hornets", CHI:"Bulls",
  CLE:"Cavaliers", DAL:"Mavericks", DEN:"Nuggets", DET:"Pistons",
  GSW:"Warriors", HOU:"Rockets", IND:"Pacers", LAC:"Clippers", LAL:"Lakers",
  MEM:"Grizzlies", MIA:"Heat", MIL:"Bucks", MIN:"Wolves", NOP:"Pelicans",
  NYK:"Knicks", OKC:"Thunder", ORL:"Magic", PHI:"76ers", PHX:"Suns",
  POR:"Blazers", SAC:"Kings", SAS:"Spurs", TOR:"Raptors", UTA:"Jazz",
  WAS:"Wizards",
};
const MLB_TEAMS = {
  ARI:"Diamondbacks", ATL:"Braves", BAL:"Orioles", BOS:"Red Sox", CHC:"Cubs",
  CWS:"White Sox", CIN:"Reds", CLE:"Guardians", COL:"Rockies", DET:"Tigers",
  HOU:"Astros", KC:"Royals", LAA:"Angels", LAD:"Dodgers", MIA:"Marlins",
  MIL:"Brewers", MIN:"Twins", NYM:"Mets", NYY:"Yankees", OAK:"Athletics",
  PHI:"Phillies", PIT:"Pirates", SD:"Padres", SEA:"Mariners", SF:"Giants",
  STL:"Cardinals", TB:"Rays", TEX:"Rangers", TOR:"Blue Jays", WSH:"Nationals",
  ATH:"Athletics",
};
const NHL_TEAMS = {
  ANA:"Ducks", ARI:"Coyotes", BOS:"Bruins", BUF:"Sabres", CAR:"Hurricanes",
  CBJ:"Blue Jackets", CGY:"Flames", CHI:"Blackhawks", COL:"Avalanche",
  DAL:"Stars", DET:"Red Wings", EDM:"Oilers", FLA:"Panthers", LA:"Kings",
  LAK:"Kings", MIN:"Wild", MTL:"Canadiens", NJ:"Devils", NJD:"Devils",
  NSH:"Predators", NYI:"Islanders", NYR:"Rangers", OTT:"Senators",
  PHI:"Flyers", PIT:"Penguins", SEA:"Kraken", SJ:"Sharks", SJS:"Sharks",
  STL:"Blues", TB:"Lightning", TBL:"Lightning", TOR:"Maple Leafs",
  UTA:"Utah HC", VAN:"Canucks", VGK:"Golden Knights", WPG:"Jets", WSH:"Capitals",
};
const SOCCER_TEAMS = {
  RMA:"Real Madrid", FCB:"Barcelona", BAR:"Barcelona", ATM:"Atlético Madrid",
  MCI:"Man City", MCFC:"Man City", MUN:"Man United", LIV:"Liverpool",
  ARS:"Arsenal", CHE:"Chelsea", TOT:"Tottenham", NEW:"Newcastle",
  BAY:"Bayern", BVB:"Dortmund", PSG:"PSG", JUV:"Juventus", INT:"Inter",
  ACM:"AC Milan", NAP:"Napoli", POR:"Porto", BEN:"Benfica", SPOR:"Sporting CP",
  AJAX:"Ajax",
};
const CRICKET_TEAMS = {
  // International teams (T20 World Cup, WBC, etc.)
  IND:"India", PAK:"Pakistan", AUS:"Australia", ENG:"England", SA:"South Africa",
  RSA:"South Africa", NZ:"New Zealand", SL:"Sri Lanka", BAN:"Bangladesh",
  WI:"West Indies", AFG:"Afghanistan", IRE:"Ireland", ZIM:"Zimbabwe",
  USA:"USA", CAN:"Canada", NED:"Netherlands", NAM:"Namibia", UAE:"UAE",
  NEP:"Nepal", OMN:"Oman", SCO:"Scotland",
  // Latin American / WBC flavor
  DOM:"Dominican Rep.", VE:"Venezuela", VEN:"Venezuela", MEX:"Mexico",
  PR:"Puerto Rico", CUB:"Cuba", COL:"Colombia", ISR:"Israel",
  JPN:"Japan", KOR:"South Korea", TPE:"Chinese Taipei", CHN:"China",
  ITA:"Italy", PAN:"Panama", NIC:"Nicaragua", BRA:"Brazil",
};
const IPL_TEAMS = {
  CSK:"Chennai Super Kings", DC:"Delhi Capitals", GT:"Gujarat Titans",
  KKR:"Kolkata Knight Riders", LSG:"Lucknow Super Giants",
  MI:"Mumbai Indians", PBKS:"Punjab Kings", RCB:"Royal Challengers",
  RR:"Rajasthan Royals", SRH:"Sunrisers Hyderabad",
};
const TENNIS_PLAYERS = {
  // 2-letter
  JS:"Sinner", CA:"Alcaraz", ND:"Djokovic", AZ:"Zverev", TF:"Fritz",
  HR:"Rune", SM:"Medvedev", AR:"Rublev", DM:"Medvedev", JR:"Ruud",
  // 3-letter
  ALC:"Alcaraz", SIN:"Sinner", DJO:"Djokovic", ZVE:"Zverev", MUS:"Musetti",
  RUN:"Rune", FRI:"Fritz", MED:"Medvedev", RUB:"Rublev", RUU:"Ruud",
  SHE:"Shelton", TIA:"Tiafoe", DIM:"Dimitrov",
  // Women
  CG:"Gauff", AS:"Sabalenka", IS:"Świątek", ES:"Świątek", JP:"Pegula",
  EA:"Andreeva", MK:"Keys", QZ:"Zheng", OJ:"Jabeur",
  SAB:"Sabalenka", SWI:"Świątek", GAU:"Gauff", PEG:"Pegula",
  // 4-letter disambiguation forms sometimes used by Kalshi
  CALC:"Alcaraz", NDJO:"Djokovic", JSIN:"Sinner",
};
const CFB_TEAMS = {
  // 4-letter first
  ARIZ:"Arizona", ARMY:"Army", CCAR:"Coastal Carolina", CLEM:"Clemson",
  COLO:"Colorado", CONN:"UConn", DUKE:"Duke", IOWA:"Iowa", MISS:"Ole Miss",
  MIZZ:"Missouri", MSST:"Miss. State", NAVY:"Navy", NCST:"NC State",
  OHIO:"Ohio", OKLA:"Oklahoma", OKST:"Oklahoma St.", ORST:"Oregon St.",
  RICE:"Rice", RUTG:"Rutgers", SCAR:"South Carolina", STAN:"Stanford",
  TENN:"Tennessee", TLSA:"Tulsa", TULN:"Tulane", TXAM:"Texas A&M",
  TXST:"Texas St.", UTAH:"Utah", UTSA:"UTSA", WAKE:"Wake Forest",
  WASH:"Washington", MINN:"Minnesota", UNLV:"UNLV",
  // 3-letter
  ALA:"Alabama", ARK:"Arkansas", ASU:"Arizona St.", AUB:"Auburn", BYU:"BYU",
  CAL:"California", CIN:"Cincinnati", CMU:"Central Mich.", ECU:"East Carolina",
  FIU:"FIU", FLA:"Florida", FSU:"Florida St.",
  HAW:"Hawai'i", HOU:"Houston", IND:"Indiana", ISU:"Iowa St.", JMU:"James Madison",
  LOU:"Louisville", LSU:"LSU", MEM:"Memphis", MIA:"Miami (FL)", MICH:"Michigan",
  MSU:"Michigan St.", NEB:"Nebraska", OSU:"Ohio State", UNM:"New Mexico",
  ORE:"Oregon", PSU:"Penn State", PUR:"Purdue", SMU:"SMU", SYR:"Syracuse",
  TCU:"TCU", TEX:"Texas", TTU:"Texas Tech", UGA:"Georgia", UNC:"UNC",
  USC:"USC", USM:"Southern Miss", UVA:"Virginia", VAN:"Vanderbilt",
  WKU:"Western Ky.", WVU:"W. Virginia",
  // 2-letter
  GT:"Georgia Tech", ND:"Notre Dame", NW:"Northwestern", VT:"Virginia Tech",
  LT:"Louisiana Tech", FL:"Florida",
};
const CBB_TEAMS = {
  ...CFB_TEAMS,
  // Basketball-specific overrides / additions
  GONZ:"Gonzaga", VILL:"Villanova", VCU:"VCU", UCLA:"UCLA",
  ILL:"Illinois", WIS:"Wisconsin", KU:"Kansas", UK:"Kentucky",
  SJU:"St. John's", USU:"Utah St.", KENN:"Kennesaw St.", HOF:"Hofstra",
  FUR:"Furman", HOW:"Howard", MOH:"Monmouth", PV:"Prairie View",
  WRST:"Wright St.", PARK:"Park", PENN:"Penn",
  HP:"High Point", SCU:"Santa Clara",
  SIE:"Siena",
};

// Combined team lookup for generic winner extraction (fallback only — sport-
// specific lookups should use getTeamsForMarket to avoid cross-sport collisions)
const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// PGA Tour player code → last name
const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
  RM:"McIlroy",     SS:"Scheffler",  CAME:"Cam Young",  LABE:"Åberg",
  JBRI:"Bradley",
};

// Route a market_key to the right sport-specific team dictionary so e.g. a
// Kalshi MLB "SEA" strike doesn't get labeled "Seahawks".
function getTeamsForMarket(mk) {
  if (!mk) return ALL_TEAMS;
  if (/^KXNFL/.test(mk))                       return NFL_TEAMS;
  if (/^KXSB-/.test(mk))                       return NFL_TEAMS;
  if (/^KXNCAAF/.test(mk))                     return CFB_TEAMS;
  if (/^KXNBA/.test(mk))                       return NBA_TEAMS;
  if (/^KXNCAAMB|^KXMARMAD|^KXWMARMAD/.test(mk)) return CBB_TEAMS;
  if (/^KXMLB/.test(mk))                       return MLB_TEAMS;
  if (/^KXNHL/.test(mk))                       return NHL_TEAMS;
  if (/^KXUCL|^KXEPL|^KXLALIGA/.test(mk))      return SOCCER_TEAMS;
  if (/^KXT20|^KXICC|^KXWBC/.test(mk))         return CRICKET_TEAMS;
  if (/^KXIPL/.test(mk))                       return IPL_TEAMS;
  if (/^KXATP|^KXWTA|^KXWMEN|^KXFOMEN|^KXUSOMEN|^KXAOMEN|^KXAUSOPEN/.test(mk)) return TENNIS_PLAYERS;
  if (/^KXPGATOUR|^KXMASTERS|^KXUSOPEN/.test(mk)) return GOLF_PLAYERS;
  return ALL_TEAMS;
}

function parseGame(code, teamMap) {
  const keys = Object.keys(teamMap).sort((a, b) => b.length - a.length);
  function go(s, acc) {
    if (acc.length === 2 && s.length === 0) return acc;
    if (acc.length >= 2) return null;
    for (const k of keys) {
      if (s.startsWith(k)) { const r = go(s.slice(k.length), [...acc, k]); if (r) return r; }
    }
    return null;
  }
  const t = go(code, []);
  return t ? `${teamMap[t[0]]} vs. ${teamMap[t[1]]}` : null;
}

function parseTicker(mk) {
  if (/^KXFEDCHAIRNOM/.test(mk))  return "Next Fed Chair";
  // Flip date before label so "Sep '25 Fed rate decision" reads well when truncated
  const fedM = mk.match(/^KXFEDDECISION-(\d{2})([A-Z]{3})$/);
  if (fedM) {
    const yy = fedM[1], mon = fedM[2];
    return `${mon[0]+mon.slice(1).toLowerCase()} '${yy} Fed rate decision`;
  }
  if (/^KXNFLNFCCHAMP/.test(mk))     return `NFC Championship`;
  if (/^KXNFLAFCCHAMP/.test(mk))     return `AFC Championship`;
  if (/^KXFIRSTSUPERBOWLSONG/.test(mk)) return "SB halftime: first song";
  if (/^KXSUPERBOWLAD/.test(mk))     return "Super Bowl ad";
  if (/^KXKHAMENEIOUT/.test(mk))     return "Khamenei out of power";
  if (/^KXBOXING/.test(mk))          return "Boxing match";
  // Kalshi parlays — all start with KXMVE (multi-game extended)
  if (/^KXMVE/.test(mk))             return "Parlay";
  // NFL / NCAAF spread and total markets
  const nflSpr = mk.match(/^KXNFLSPREAD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflSpr) { const g = parseGame(nflSpr[1], NFL_TEAMS); return g ? `${g} (spread)` : null; }
  const ncaafSpr = mk.match(/^KXNCAAFSPREAD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (ncaafSpr) { const g = parseGame(ncaafSpr[1], CFB_TEAMS); return g ? `${g} (spread)` : null; }
  // NBA series
  const nbaSer = mk.match(/^KXNBASERIES-\d{2}([A-Z]+)$/);
  if (nbaSer) { const g = parseGame(nbaSer[1], NBA_TEAMS); return g ? `${g} (series)` : null; }
  // NFL / college games
  const nflM   = mk.match(/^KXNFLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflM)   return parseGame(nflM[1],   NFL_TEAMS) ?? mk;
  const ncaafM = mk.match(/^KXNCAAFGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (ncaafM) return parseGame(ncaafM[1], CFB_TEAMS) ?? mk;
  const cbbM   = mk.match(/^KXNCAAMBGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (cbbM)   return parseGame(cbbM[1],   CBB_TEAMS) ?? mk;
  const nbaM   = mk.match(/^KXNBAGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nbaM)   return parseGame(nbaM[1],   NBA_TEAMS) ?? mk;
  // MLB / NHL / UCL / IPL / WBC games
  const mlbGame = mk.match(/^KXMLBGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (mlbGame) return parseGame(mlbGame[1], MLB_TEAMS) ?? mk;
  const mlbSer = mk.match(/^KXMLBSERIES-\d{2}([A-Z]+)$/);
  if (mlbSer) { const g = parseGame(mlbSer[1], MLB_TEAMS); return g ? `${g} (series)` : null; }
  const nhlGame = mk.match(/^KXNHLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nhlGame) return parseGame(nhlGame[1], NHL_TEAMS) ?? mk;
  const uclGame = mk.match(/^KXUCLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (uclGame) return parseGame(uclGame[1], SOCCER_TEAMS) ?? mk;
  const iplGame = mk.match(/^KXIPLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (iplGame) return parseGame(iplGame[1], IPL_TEAMS) ?? mk;
  // WBC fixture format includes a 4-digit time code (e.g. ...152000USADOM)
  const wbcGame = mk.match(/^KXWBCGAME-\d{2}[A-Z]{3}\d{2}\d{4}([A-Z]+)$/);
  if (wbcGame) return parseGame(wbcGame[1], CRICKET_TEAMS) ?? mk;
  return null;
}

// ── Forced market-name overrides (take priority over Kalshi's market_name) ───
// Use when Kalshi's own label is misleading or missing context that matters.
const MKT_NAME_FORCE = {
  "PRES-2024":                  "Presidency 2024",
  "POPVOTE-24":                 "Popular vote 2024",
  "KXSB-26":                    "Super Bowl LX",
  "KXSB-25":                    "Super Bowl LIX",
  "KXMASTERS-25":               "2025 Masters Tournament",
  // World Series 2025: LAD vs TOR — games 3, 4, 5, 6, 7
  "KXMLBGAME-25OCT27TORLAD":    "World Series 2025 Game 3",
  "KXMLBGAME-25OCT28TORLAD":    "World Series 2025 Game 4",
  "KXMLBGAME-25OCT29TORLAD":    "World Series 2025 Game 5",
  "KXMLBGAME-25OCT31LADTOR":    "World Series 2025 Game 6",
  "KXMLBGAME-25NOV01LADTOR":    "World Series 2025 Game 7",
  "KXMLBGAME-25OCT24LADTOR":    "World Series 2025 Game 1",
  "KXMLBGAME-25OCT25LADTOR":    "World Series 2025 Game 2",
  "KXMLBGAME-25OCT15TORSEA":    "ALCS 2025 (Mariners vs Blue Jays)",
};

// ── Specific overrides (markets with no Kalshi title at all) ─────────────────
const MKT_NAME_OVERRIDES = {
  "POPVOTEMOV-24-R-B":      "Popular vote margin (R, wider)",
  "POPVOTEMOVSMALL-24-R":   "Popular vote margin (R, small range)",
  "POPVOTEMOVSMALLER-24-R": "Popular vote margin (R, narrow range)",
  "POPVOTEMOV-24-D":        "Popular vote margin (D)",
  "ECMOV-24-R-B35":         "Electoral college margin >35 (R)",
  "ECMOV-24-R-B65":         "Electoral college margin >65 (R)",
  // "Who wins Popular Vote + Electoral College?" — combined-outcome market.
  // -REC is the Republican-EC branch; outcome -RPV = Republican also wins PV.
  "PRESPARTYFULL-24-REC":   "Popular vote winner (if R wins EC)",
  "PRESPARTYFULL-24":       "Popular vote + Electoral College winner",
  "POWER-24-RH-RS":         "Republican House + Senate 2024",
  "KXGOVSHUT":              "Government shutdown",
  "KXGOVTSHUTDOWN":         "Government shutdown",
  "KXCITRINI":              "Citrini macro call",
  "KXALIENS":               "Alien/UAP disclosure",
  "KXBTCMAXY-25-DEC31":     "Bitcoin max price 2025",
  "KXBTCMINY-25-2-DEC31":   "Bitcoin min price 2025",
  // Added in cleanup
  "KXKHAMENEIOUT-AKHA":         "Khamenei out of power",
  "KXLAYOFFSYINFO-26":          "More tech layoffs in 2026 than in 2025?",
  "KXSBGUESTS-26":              "Super Bowl LX guests",
  "KXMLBWORLD-26":              "World Baseball Classic 2026",
  "KXNBACUP-25":                "NBA Cup 2025",
  "KXSECAG-26DEC31":            "US Attorney General by end of 2026",
  "KXSECDEF-26DEC31":           "US Secretary of Defense by end of 2026",
  "KXSECHHS-26DEC31":           "US Secretary of HHS by end of 2026",
  "KXTOPARTIST-25":             "Top Spotify Artist 2025",
  "KXMAYORNYCNOMD-25":          "NYC Mayor Democratic Primary 2025",
  "KXPERFORMSUPERBOWLB-26":     "Super Bowl LX halftime performers",
  "KXT20WORLDCUP-26":           "2026 ICC Men's T20 World Cup",
  "KXFEDCHAIRNOM-29":           "Next Fed Chair",
  "KXNFLNFCCHAMP-25":           "NFC Championship",
  "KXNFLAFCCHAMP-25":           "AFC Championship",
  "KXFIRSTSUPERBOWLSONG-26FEB09":"Super Bowl halftime: first song",
  "KXSUPERBOWLAD-SB2026":       "Most Super Bowl LX ads (by brand)",
  "KXRANKLISTGOOGLESEARCH-26JAN":"Top Google search (Jan 2026)",
};

// ── Shared winner-display logic ───────────────────────────────────────────────
// Hard overrides for winner display, keyed on winner_ticker.
const WINNER_OVERRIDES = {
  "PRES-2024-DJT":        "Trump",
  "POPVOTE-24-R":         "Trump",
  "ECMOV-24-R":           "Trump",
  "PRESPARTYGA-24-R":     "Trump",
  "PRESPARTYPA-24-R":     "Trump",
  "PRESPARTYMI-24-R":     "Trump",
  "PRESPARTYIA-24-R":     "Trump",
  "PRESPARTYFULL-24-R":   "Trump",
  "SENATEAZ-24-D":        "Gallego",
  "GOVPARTYNJ-25-D":      "Democratic",
  "KXMAYORNYCPARTY-25-D": "Mamdani",
  // Added in cleanup
  "KXWMENSINGLES-25-JS":                "Sinner",
  "KXMAYORNYCNOMD-25-ZM":               "Mamdani",
  "KXSBGUESTS-26-ROG":                  "Various",
  "KXMLBWORLD-26-VE":                   "Venezuela",
  "KXBOXING-25SEP13CALVTCRA-TCRA":      "Crawford",
  "KXUFCFIGHT-26MAR07HOLOLI-OLI":       "Oliveira",
  "KXNOBELPEACE-25-MARI":               "Machado",
  "KXFEDCHAIRNOM-29-KW":                "Warsh",
  "KXBOXING-25DEC19JPAUAJOS-AJOS":      "Joshua",
  "KXPERFORMSUPERBOWLB-26-LAD":         "Lady Gaga",
  "KXGOVSHUTLENGTH-26JAN01-42D":        "43 days",
  "KXGOVSHUTLENGTH-26FEB28-3D":         "4 days",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT":   "Tití Me Preguntó",
  "KXSUPERBOWLAD-SB2026-GEMI":           "Various",
  "KXTOPARTIST-25-BB":                   "Bad Bunny",
  "KXNFLNFCCHAMP-25-SEA":                "Seahawks",
  "KXNFLAFCCHAMP-25-NE":                 "Patriots",
};

// Winner lookup by market_key, used when winner_ticker is blank but the market
// has settled to a specific outcome.
const WINNER_BY_MARKET = {
  "KXPGATOUR-MAST26":    "McIlroy",
  "KXMARMAD-26":         "Michigan",
  "KXMASTERS-25":        "McIlroy",
  "KXKHAMENEIOUT-AKHA":  "it's complicated…",
  "KXSUPERBOWLAD-SB2026":"Various",
};

function fmtWinner(d) {
  const mk   = (d.market_key ?? "").trim();
  const rawW = (d.winner ?? "").trim();
  // Strip market-rule text (e.g. "If UConn wins the...") — not a name
  const w    = rawW.length > 50 ? "" : rawW;
  const wt   = (d.winner_ticker ?? "").trim();
  if (WINNER_OVERRIDES[wt]) return WINNER_OVERRIDES[wt];
  // Fix Kalshi metadata error: "Hike 0bps" = no rate change = hold
  if (/hike\s*0\s*bps/i.test(w)) return "Hold";
  if (w && !w.startsWith("::")) return w;
  if (w.startsWith("::")) { const a = w.replace(/^::\s*/, "").trim(); if (a) return a; }
  if (wt) {
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    const teamMap = getTeamsForMarket(mk);
    return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
  }
  if (WINNER_BY_MARKET[mk]) return WINNER_BY_MARKET[mk];
  return "—";
}

function bestName(d) {
  const mk = (d.market_key ?? "").trim();
  if (MKT_NAME_FORCE[mk]) return MKT_NAME_FORCE[mk];
  const mn = (d.market_name || "").trim();
  // Skip market_name if it's just echoing the ticker key (Kalshi leaves it blank)
  if (mn && mn !== mk) return mn;
  const imn = (d["i.market_name"] || "").trim();
  if (imn && imn !== mk) return imn;
  return MKT_NAME_OVERRIDES[mk] || parseTicker(mk) || mk;
}

const fmtC = n => n >= 1e9 ? (n/1e9).toFixed(2)+"B"
               : n >= 1e6 ? (n/1e6).toFixed(1)+"M"
               : n >= 1e3 ? (n/1e3).toFixed(0)+"k"
               : String(n);

// Human-readable overrides for top-outcome (keyed on full ticker for precision)
const TOP_OUTCOME_NAMES = {
  "PRES-2024-KH":                     "Harris",
  "POPVOTE-24-D":                     "Harris",
  "KXPGATOUR-MAST26-SSCH":            "Scheffler",
  "KXMARMAD-26-CONN":                 "UConn",
  "KXFEDCHAIRNOM-29-JS":              "Shelton",
  "KXMAYORNYCPARTY-25-AC":            "Cuomo",
  "KXNFLNFCCHAMP-25-LA":              "Rams",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT": "Tití Me Preguntó",
  "KXBOXING-25DEC19JPAUAJOS-JPAU":    "Jake Paul",
  "KXBOXING-25SEP13CALVTCRA-TCRA":    "Terrazas",
  // Added in cleanup
  "KXKHAMENEIOUT-AKHA-26MAR01":       "by March 1",
  "KXALIENS-27":                      "before 2027",
  "KXTOPARTIST-25-TS":                "Taylor Swift",
  "KXSECAG-26DEC31-MG":               "Matt Gaetz",
  "KXRANKLISTGOOGLESEARCH-26JAN-DON": "Trump",
  "KXRANKLISTGOOGLESEARCH-26JAN-D4D": "D4vd",
  "KXSBGUESTS-26-MWAH":               "Wahlberg",
  "SENATEAZ-24-R":                    "Lake",
  "KXSUPERBOWLAD-SB2026-ANTHROPIC":   "Anthropic",
  "KXMAYORNYCNOMD-25-ZM":             "Mamdani",
  "KXCITRINI-28JUL01":                "by July 2028",
  "KXGOVSHUT-26JAN31":                "by Jan 31, 2026",
  "KXGOVTSHUTDOWN-26FEB14":           "by Feb 14, 2026",
  "KXFEDCHAIRNOM-29-KW":              "Warsh",
  "KXLAYOFFSYINFO-26-494000":         "≥ 494,000 layoffs",
  "KXPERFORMSUPERBOWLB-26-CAR":       "Cardi B",
  "PRESPARTYFULL-24-REC-RPV":         "Republican",
  "PRESPARTYFULL-24-REC-DPV":         "Democratic",
  "PRESPARTYFULL-24-DEC-RPV":         "Republican",
  "PRESPARTYFULL-24-DEC-DPV":         "Democratic",
  "POWER-24-RH-RS-RP":                "Republican",
};

function fmtStrike(top_outcome, market_key) {
  if (!top_outcome) return "—";
  if (TOP_OUTCOME_NAMES[top_outcome]) return TOP_OUTCOME_NAMES[top_outcome];
  const mk = (market_key ?? "").trim();
  const short = mk
    ? top_outcome.replace(mk + "-", "")
    : top_outcome.split("-").pop();
  // Fed rate outcomes
  if (short === "H0") return "Hold";
  if (/^H(\d+)$/.test(short)) return `-${short.slice(1)}×25 bps`;
  if (/^C(\d+)$/.test(short)) return `-${short.slice(1)} bps (cut)`;
  // Shutdown length — e.g. "42D" → "42 days"
  const daysM = short.match(/^(\d+)D$/);
  if (daysM) return `${daysM[1]} days`;
  // Date-style strike like "26MAR01" → "by Mar 1"
  const dateM = short.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (dateM) {
    const mon = dateM[2];
    return `by ${mon[0]+mon.slice(1).toLowerCase()} ${parseInt(dateM[3],10)}`;
  }
  // Spread strike like "SEA4" / "IND7" when in a spread market
  if (/SPREAD/.test(mk)) {
    const spM = short.match(/^([A-Z]+)(\d+)$/);
    if (spM) {
      const teamMap = getTeamsForMarket(mk);
      const teamName = teamMap[spM[1]] ?? spM[1];
      return `${teamName} -${spM[2]}`;
    }
  }
  // Percentage-formatted strikes — only for popular-vote-margin markets.
  // Bitcoin and electoral-college-margin strikes are bare numbers that are NOT %.
  const isPctMarket = /^POPVOTEMOV/.test(mk);
  if (isPctMarket && /^[0-9]+(\.[0-9]+)?$/.test(short)) return short + "%";
  if (isPctMarket && /^B[0-9]/.test(short))             return short.slice(1) + "%";
  // Non-pct bare numbers: show as-is (formatted with comma thousands)
  if (/^[0-9]+(\.[0-9]+)?$/.test(short)) {
    const n = Number(short);
    if (Number.isFinite(n) && n >= 1000) return n.toLocaleString();
    return short;
  }
  if (/^B[0-9]/.test(short)) return short.slice(1);
  // Sport-aware team / player fallback
  const teamMap = getTeamsForMarket(mk);
  return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
}

// Map a row's Kalshi category to a display category used for row coloring:
// Sports is split into Football / Basketball / Other sport for legibility.
function getSportDisplayCategory(d) {
  const cat = (d.kalshi_category || "").trim();
  // Merge Elections into Politics — they're the same concept on Kalshi
  if (cat === "Elections") return "Politics";
  if (cat !== "Sports") return cat;
  const mk = (d.market_key || "").trim();
  if (/^KXNFL|^KXSB-|^KXNCAAF/.test(mk)) return "Football";
  if (/^KXNBA|^KXNCAAMB|^KXMARMAD|^KXWMARMAD/.test(mk)) return "Basketball";
  return "Other sport";
}

// Sort all-time by contracts and assign rank
const mktRanked = [...mktLeaderboard]
  .sort((a, b) => b.contracts - a.contracts)
  .map((d, i) => {
    const mk  = (d.market_key  ?? "").trim();
    const top = (d.top_outcome ?? "").trim();
    return {
      ...d,
      rank:           i + 1,
      display_name:   bestName(d),
      winner_display: fmtWinner(d),
      top_short:      fmtStrike(top, mk),
      display_cat:    getSportDisplayCategory(d)
    };
  });
```

```js
// Top-20 bar chart
const mktTop20 = mktRanked.slice(0, 20);
const mktCatDomain = Object.keys(CAT_COLORS).filter(c => mktTop20.some(d => d.display_cat === c));
Plot.plot({
  width,
  height: mktTop20.length * 24 + 40,
  marginLeft: 240,
  color: {
    legend: true,
    domain: mktCatDomain,
    range: mktCatDomain.map(c => CAT_COLORS[c])
  },
  x: {label: "Volume ($)", grid: true, tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null},
  marks: [
    Plot.barX(mktTop20, {
      x: "contracts",
      y: d => `#${d.rank} ${d.display_name}`,
      fill: d => CAT_COLORS[d.display_cat] ?? "#777",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.display_name}\n$${fmtC(d.contracts)} volume\nFees: $${fmtC(+d.fees_total||0)}\nWinner: ${d.winner_display}`
    }),
    Plot.ruleX([0])
  ]
})
```

```js
const mktSearch = view(Inputs.search(mktRanked, {placeholder: "Search markets..."}));
```

```js
// Expose the underlying input so the clickable legend below can drive it.
const mktCatInput = hashInput("mkt_cat", Inputs.select(
  ["All", ...Object.keys(CAT_COLORS)],
  {label: "Category", value: hashGet("mkt_cat", "All")}
));
const mktCatFilter = view(mktCatInput);
```

```js
const mktFiltered = mktSearch
  .filter(d => mktCatFilter === "All" || d.display_cat === mktCatFilter);

// Build per-category CSS using :has() so the full row is colored —
// no JS DOM timing issues; survives table sort/pagination automatically.
const catCss = Object.entries(CAT_COLORS).map(([cat, color]) =>
  `.mkt-table tr:has([data-mkt-cat="${cat}"]) { background: ${color}38 !important; }
.mkt-table tr:has([data-mkt-cat="${cat}"]): hover { background: ${color}55 !important; }`
).join("\n");

display(html`<style>
  .mkt-table table { font-size: 14px; border-collapse: collapse; width: 100%; }
  .mkt-table td, .mkt-table th { padding: 0.65em 0.8em; }
  .mkt-table tr { height: 2.7em; }
  /* Sortable headers — Observable Inputs.table sorts on click; surface the affordance.
     Column layout: 1=checkbox, 2=rank, 3=_c(hidden), 4=market, 5=volume, 6=fees, 7=winner, 8=strike */
  .mkt-table thead th:nth-child(n+2):not(:nth-child(3)) {
    cursor: pointer;
    user-select: none;
    position: sticky; top: 0;
    background: var(--theme-background, #fff);
    z-index: 1;
  }
  .mkt-table thead th:nth-child(n+4):hover { color: var(--accent-kalshi, #2563eb); }
  .mkt-table thead th:nth-child(n+4)::after {
    content: " \2195";
    opacity: 0.35;
    font-size: 0.85em;
  }
  .mkt-table thead th:nth-child(n+4)[aria-sort="ascending"]::after  { content: " \2191"; opacity: 1; color: var(--accent-kalshi, #2563eb); }
  .mkt-table thead th:nth-child(n+4)[aria-sort="descending"]::after { content: " \2193"; opacity: 1; color: var(--accent-kalshi, #2563eb); }
  /* Inputs.table already renders its own ▴/▾ in a leading <span> on the active column;
     hide it so it doesn't double up with our arrows. */
  .mkt-table thead th > span:first-child { display: none; }
  /* Collapse the hidden category-tag column (_c is 3rd child: checkbox, rank, _c, ...) */
  .mkt-table th:nth-child(3), .mkt-table td:nth-child(3) { padding: 0 !important; width: 0; max-width: 0; overflow: hidden; }
  ${catCss}
</style>`);

// Category legend — swatch rectangles matching row tint, click to cross-filter.
{
  const legend = html`<div class="mkt-legend" role="tablist" aria-label="Filter by category"></div>`;
  const chips = [["All", null], ...Object.entries(CAT_COLORS)];
  function render() {
    legend.replaceChildren(...chips.map(([cat, color]) => {
      const active = (cat === "All" ? mktCatFilter === "All" : mktCatFilter === cat);
      const sw = color
        ? html`<span class="mkt-legend-sw" style="background:${color}"></span>`
        : html`<span class="mkt-legend-sw mkt-legend-sw-all"></span>`;
      return html`<button type="button" class="mkt-legend-chip" aria-pressed="${active}" data-cat="${cat}">
        ${sw}<span>${cat}</span>
      </button>`;
    }));
    legend.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        const v = b.dataset.cat;
        if (mktCatInput.value !== v) {
          mktCatInput.value = v;
          mktCatInput.dispatchEvent(new Event("input", {bubbles: true}));
        }
      });
    });
  }
  render();
  display(legend);
}

// Add _c column — an invisible carrier for the data-mkt-cat attribute used by :has() CSS above.
// Coerce fees_total to a real number (null for missing) so column-sort is numeric, not string.
const mktDisplay = mktFiltered.map(d => {
  const fees = d.fees_total;
  const feesNum = (fees == null || fees === "" || isNaN(+fees)) ? null : +fees;
  return {...d, _c: d.display_cat || d.kalshi_category || "", fees_total: feesNum};
});

display(html`<div style="font-size:0.82em;color:var(--text-faint,#888);margin:0.3rem 0 0.6rem">Tip: click any column header to sort. Click again to reverse.</div>`);

const tbl = Inputs.table(mktDisplay, {
  columns: ["rank", "_c", "display_name", "contracts", "fees_total", "winner_display", "top_short"],
  header: {
    rank:          "#",
    _c:            "",
    display_name:  "Market",
    contracts:     "Volume",
    fees_total:    "Kalshi fees",
    winner_display:"Winner",
    top_short:     "Highest-vol. strike"
  },
  format: {
    rank: d => d,
    _c: cat => {
      const el = document.createElement("span");
      el.setAttribute("data-mkt-cat", cat);
      return el;
    },
    contracts:  d => "$" + fmtC(d),
    fees_total: d => (d == null || d === 0) ? "—" : "$" + fmtC(+d),
  },
  align: {
    rank: "right",
    contracts: "right",
    fees_total: "right"
  },
  width: {rank: 50, _c: 0},
  sort: "rank",
  reverse: false,
  rows: 50
});
tbl.classList.add("mkt-table");
display(tbl);
```
