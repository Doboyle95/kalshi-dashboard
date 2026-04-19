---
title: Categories
---

# Kalshi Categories

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
const mktLeaderboard = await FileAttachment("data/market_leaderboard.csv").csv({typed: true});
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
    .on("brush end", (event) => { if (!event.sourceEvent) return; if (event.selection) catDateSel.value = event.selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const chartScale  = view(Inputs.radio(["Absolute", "Normalized"], {value: "Absolute", label: "Scale"}));
const chartDetail = view(Inputs.radio(["General", "Detailed"],    {value: "General",  label: "Categories"}));
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
    Plot.ruleY([0])
  ]
})
```

---

## All-time individual market leaderboard

Ranked by total contracts across all outcomes. Each row is one market (e.g. "Super Bowl 2026 winner"), not an individual yes/no contract.

```js
// ── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  "Sports":                 "#1565c0",  // blue
  "Politics":               "#6a1b9a",  // violet
  "Economics":              "#4e342e",  // brown
  "Elections":              "#b71c1c",  // red
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
const CFB_TEAMS = {
  // 4-letter first
  ARIZ:"Arizona", ARMY:"Army", CCAR:"Coastal Carolina", CLEM:"Clemson",
  COLO:"Colorado", CONN:"UConn", DUKE:"Duke", IOWA:"Iowa", MISS:"Ole Miss",
  MIZZ:"Missouri", MSST:"Miss. State", NAVY:"Navy", NCST:"NC State",
  OHIO:"Ohio", OKLA:"Oklahoma", OKST:"Oklahoma St.", ORST:"Oregon St.",
  RICE:"Rice", RUTG:"Rutgers", SCAR:"South Carolina", STAN:"Stanford",
  TENN:"Tennessee", TLSA:"Tulsa", TULN:"Tulane", TXAM:"Texas A&M",
  TXST:"Texas St.", UTAH:"Utah", UTSA:"UTSA", WAKE:"Wake Forest",
  WASH:"Washington",
  // 3-letter
  ALA:"Alabama", ARK:"Arkansas", ASU:"Arizona St.", AUB:"Auburn", BYU:"BYU",
  CAL:"California", CIN:"Cincinnati", CMU:"Central Mich.", ECU:"East Carolina",
  FIU:"FIU", FLA:"Florida", FSU:"Florida St.",
  HAW:"Hawai'i", HOU:"Houston", IND:"Indiana", ISU:"Iowa St.", JMU:"James Madison",
  LOU:"Louisville", LSU:"LSU", MEM:"Memphis", MIA:"Miami (FL)", MICH:"Michigan",
  MSU:"Michigan St.", NEB:"Nebraska",
  ORE:"Oregon", PSU:"Penn State", PUR:"Purdue", SMU:"SMU", SYR:"Syracuse",
  TCU:"TCU", TEX:"Texas", TTU:"Texas Tech", UGA:"Georgia", UNC:"UNC",
  USC:"USC", USM:"Southern Miss", UVA:"Virginia", VAN:"Vanderbilt",
  WKU:"Western Ky.", WVU:"W. Virginia",
  // 2-letter
  GT:"Georgia Tech", ND:"Notre Dame", NW:"Northwestern", VT:"Virginia Tech",
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
};

// Combined team lookup for winner extraction
const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// PGA Tour player code → last name
const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
};

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
  if (/^KXFEDDECISION-\d{2}([A-Z]{3})$/.test(mk)) {
    const mon = mk.replace(/^KXFEDDECISION-\d{2}/, "");
    const yy  = mk.match(/\d{2}/)[0];
    return `Fed rate decision (${mon[0]+mon.slice(1).toLowerCase()} '${yy})`;
  }
  if (/^KXNFLNFCCHAMP/.test(mk))     return `NFC Championship`;
  if (/^KXNFLAFCCHAMP/.test(mk))     return `AFC Championship`;
  if (/^KXFIRSTSUPERBOWLSONG/.test(mk)) return "SB halftime: first song";
  if (/^KXSUPERBOWLAD/.test(mk))     return "Super Bowl ad";
  if (/^KXKHAMENEIOUT/.test(mk))     return "Khamenei out of power";
  if (/^KXBOXING/.test(mk))          return "Boxing match";
  const nflM   = mk.match(/^KXNFLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflM)   return parseGame(nflM[1],   NFL_TEAMS) ?? mk;
  const ncaafM = mk.match(/^KXNCAAFGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (ncaafM) return parseGame(ncaafM[1], CFB_TEAMS) ?? mk;
  const cbbM   = mk.match(/^KXNCAAMBGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (cbbM)   return parseGame(cbbM[1],   CBB_TEAMS) ?? mk;
  const nbaM   = mk.match(/^KXNBAGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nbaM)   return parseGame(nbaM[1],   NBA_TEAMS) ?? mk;
  return null;
}

// ── Specific overrides (markets with no Kalshi title at all) ─────────────────
const MKT_NAME_OVERRIDES = {
  "POPVOTEMOV-24-R-B":      "Popular vote margin (R)",
  "POPVOTEMOVSMALL-24-R":   "Popular vote margin (R, small)",
  "POPVOTEMOVSMALLER-24-R": "Popular vote margin (R, smaller)",
  "POPVOTEMOV-24-D":        "Popular vote margin (D)",
  "ECMOV-24-R-B35":         "Electoral college margin >35 (R)",
  "ECMOV-24-R-B65":         "Electoral college margin >65 (R)",
  "PRESPARTYFULL-24-REC":   "Presidential party (full recount)",
  "POWER-24-RH-RS":         "Republican House + Senate 2024",
  "KXGOVSHUT":              "Government shutdown",
  "KXGOVTSHUTDOWN":         "Government shutdown",
  "KXCITRINI":              "Citrini macro call",
  "KXALIENS":               "Alien/UAP disclosure",
  "KXBTCMAXY-25-DEC31":     "Bitcoin max price 2025",
  "KXBTCMINY-25-2-DEC31":   "Bitcoin min price 2025",
};

// ── Shared winner-display logic ───────────────────────────────────────────────
function fmtWinner(d) {
  // Strip market-rule text (e.g. "If UConn wins the...") — not a name
  const rawW = (d.winner ?? "").trim();
  const w    = rawW.length > 50 ? "" : rawW;
  const wt   = (d.winner_ticker ?? "").trim();
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
  };
  if (WINNER_OVERRIDES[wt]) return WINNER_OVERRIDES[wt];
  // Fix Kalshi metadata error: "Hike 0bps" = no rate change = hold
  if (/hike\s*0\s*bps/i.test(w)) return "Hold";
  if (w && !w.startsWith("::")) return w;
  if (w.startsWith("::")) { const a = w.replace(/^::\s*/, "").trim(); return a || "—"; }
  if (wt) {
    const mk    = (d.market_key ?? "").trim();
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    return ALL_TEAMS[short] ?? GOLF_PLAYERS[short] ?? short;
  }
  return "—";
}

function bestName(d) {
  const mk = (d.market_key ?? "").trim();
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
  "KXNFLNFCCHAMP-25-LA":              "LAR",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT": "Tití Me Preguntó",
  "KXBOXING-25DEC19JPAUAJOS-JPAU":    "Jake Paul",
  "KXBOXING-25SEP13CALVTCRA-TCRA":    "Terrazas",
};

function fmtStrike(top_outcome, market_key) {
  if (!top_outcome) return "—";
  if (TOP_OUTCOME_NAMES[top_outcome]) return TOP_OUTCOME_NAMES[top_outcome];
  const short = market_key
    ? top_outcome.replace(market_key + "-", "")
    : top_outcome.split("-").pop();
  if (short === "H0") return "Hold";                     // Fed rate hold
  if (/^H(\d+)$/.test(short)) return `-${short.slice(1)}×25 bps`;  // H1 = one cut, etc.
  if (/^[0-9]+(\.[0-9]+)?$/.test(short)) return short + "%";       // bare number → add %
  if (/^B[0-9]/.test(short)) return short.slice(1) + "%";          // B1.4 → 1.4%
  return GOLF_PLAYERS[short] ?? ALL_TEAMS[short] ?? short;
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
      top_short:      fmtStrike(top, mk)
    };
  });
```

```js
// Top-20 bar chart
const mktTop20 = mktRanked.slice(0, 20);
Plot.plot({
  width,
  height: mktTop20.length * 24 + 40,
  marginLeft: 240,
  x: {label: "Volume ($)", grid: true, tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null},
  marks: [
    Plot.barX(mktTop20, {
      x: "contracts",
      y: d => `#${d.rank} ${d.display_name}`,
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#2c7bb6",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.display_name}\n$${fmtC(d.contracts)} volume\nFees: $${fmtC(+d.fees_total||0)}\nWinner: ${d.winner_display}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">■ Sports</span> &nbsp; <span style="color:#2c7bb6">■ Non-sports</span>

```js
const mktSearch = view(Inputs.search(mktRanked, {placeholder: "Search markets..."}));
```

```js
const mktCatFilter = view(Inputs.select(
  ["All", ...new Set(mktLeaderboard.map(d => d.kalshi_category).filter(Boolean).sort())],
  {label: "Category", value: "All"}
));
```

```js
const mktFiltered = mktSearch
  .filter(d => mktCatFilter === "All" || d.kalshi_category === mktCatFilter);

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
  /* Collapse the hidden category-tag column (2nd column) */
  .mkt-table th:nth-child(2), .mkt-table td:nth-child(2) { padding: 0 !important; width: 0; max-width: 0; overflow: hidden; }
  ${catCss}
</style>`);

// Category legend — swatch rectangles matching row tint
display(html`<div style="display:flex;flex-wrap:wrap;gap:0.5em 1.3em;margin-bottom:0.8rem;font-size:0.8em;color:#555">
  ${Object.entries(CAT_COLORS).map(([cat, color]) =>
    html`<span style="display:inline-flex;align-items:center;gap:5px">
      <span style="display:inline-block;width:14px;height:9px;border-radius:2px;background:${color};opacity:0.55"></span>${cat}
    </span>`
  )}
</div>`);

// Add _c column — an invisible carrier for the data-mkt-cat attribute used by :has() CSS above
const mktDisplay = mktFiltered.map(d => ({...d, _c: d.kalshi_category || ""}));

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
    fees_total: d => (d == null || d === "" || isNaN(+d) || +d === 0) ? "—" : "$" + fmtC(+d),
  },
  width: {rank: 36, _c: 0},
  sort: "rank",
  reverse: false,
  rows: 50
});
tbl.classList.add("mkt-table");
display(tbl);
```
