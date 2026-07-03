---
title: Taker-Side Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker-Side Volume</h1>
  <p class="page-lead">The closest thing Kalshi has to sportsbook handle — the dollars staked by the bettor who takes the price on each trade rather than waiting for it. Yes-side takers are buying upside; no-side takers are fading it.</p>
</div>

```js
const fmtUSD  = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-$" : "$"; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : a.toFixed(0)); };
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const taker = await FileAttachment("data/taker_notional_daily.csv").csv({typed: true});
const takerVolByTicker = await FileAttachment("data/taker_volume_by_ticker_daily.csv").csv({typed: true});
const categoryLeaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {hashGet, hashInput} from "./components/hash-state.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Taker-side notional", date: latestDate(taker), updatedAt: fileUpdatedAt(freshness, "taker_notional_daily.csv"), meta: "Recent-window refreshable; can be within minutes locally"},
    {label: "Taker volume by category", date: latestDate(takerVolByTicker), updatedAt: fileUpdatedAt(freshness, "taker_volume_by_ticker_daily.csv"), meta: "Taker-side notional dollars, broken out by category"}
  ],
  note: "This page can update more frequently than settlement-based P&L because it does not need final outcomes."
}));
display(askPageLink({
  question: "Analyze recent taker-side notional and whether yes-side or no-side takers are driving the change.",
  context: "Taker-Side Volume page using taker_notional_daily.csv."
}));
```

```js
function rollingMean(rows, key) {
  return rows.map((d, i) => ({
    date: d.date,
    ma: d3.mean(rows.slice(Math.max(0, i - 6), i + 1), r => r[key])
  })).filter((_, i) => i >= 6);
}
const ma7 = rollingMean(taker, "notional_total");
```

```js
const totalNotional = d3.sum(taker, d => d.notional_total);
const peakDay       = taker.reduce((b, d) => d.notional_total > b.notional_total ? d : b, taker[0]);
const recentRows    = taker.slice(-30);
const recentAvg     = d3.mean(recentRows, d => d.notional_total);
const recentPctYes  = d3.mean(recentRows, d => d.notional_total ? d.notional_yes / d.notional_total * 100 : 0);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time taker-side notional</div>
    <div class="kpi-value">${fmtUSD(totalNotional)}</div>
    <div class="kpi-meta">dollars staked by takers</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtUSD(peakDay?.notional_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">30-day daily avg</div>
    <div class="kpi-value">${fmtUSD(Math.round(recentAvg))}</div>
    <div class="kpi-meta">dollars/day</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Recent yes-side share</div>
    <div class="kpi-value">${recentPctYes?.toFixed(1)}%</div>
    <div class="kpi-meta">of taker-side notional (30-day avg)</div>
  </div>
</div>

```js
const takerMaxDate = d3.max(taker, d => d.date);
```

```js
// ── Category classification: report_ticker -> cat, read straight from
// category_leaderboard.csv (the same per-ticker classification categories.md's
// classByReportTicker uses) instead of Kalshi's own kalshi_category. Kalshi's
// taxonomy dumps every sport into one "Sports" bucket that swamps the other ~13
// categories down to a few percent combined - not useful for a volume breakdown.
const reportTickerToCat = new Map(
  categoryLeaderboard.filter(d => d.report_ticker && d.cat).map(d => [d.report_ticker, d.cat])
);

// Detailed (sport-by-sport) order/palette - mirrors categories.md's Detailed view,
// extended with Cricket/Racing/Esports (real `cat` values not carried by categories.md's
// older wideOrder) plus an "Uncategorized" catch-all so a future report_ticker not yet in
// the leaderboard is still visible instead of silently dropped from the stack.
const TAKER_DETAIL_ORDER = [
  "Other Non-sports", "Weather", "Mention", "Entertainment", "Finance", "Politics", "Crypto",
  "Other Sports", "Esports", "Racing", "Cricket", "Combat Sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College Football", "NFL", "College Basketball", "NBA", "Parlay", "Uncategorized"
];
const TAKER_DETAIL_COLORS = {
  "Other Non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Mention": "#78909c", "Finance": "#6b8cae", "Politics": "#455a64", "Crypto": "#263238",
  "Other Sports": "#c8e6c9", "Esports": "#BCAAA4", "Racing": "#A1887F", "Cricket": "#FA8072",
  "Combat Sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  "College Football": "#ffcc80", "NFL": "#bf360c",
  "College Basketball": "#90caf9", "NBA": "#0d47a1",
  "Parlay": "#7b1fa2",
  "Uncategorized": "#9E9E9E"
};

// Broad (default) grouping - mirrors categories.md's generalMap/generalOrder/generalColors.
const TAKER_GENERAL_MAP = {
  "NFL": "Football", "College Football": "Football",
  "NBA": "Basketball", "College Basketball": "Basketball",
  "Baseball": "Baseball",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Soccer": "Other sports", "Combat Sports": "Other sports", "Other Sports": "Other sports",
  "Cricket": "Other sports", "Racing": "Other sports", "Esports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Mention": "Non-sports", "Weather": "Non-sports", "Other Non-sports": "Non-sports",
  "Uncategorized": "Uncategorized"
};
const TAKER_GENERAL_ORDER  = ["Non-sports", "Other sports", "Baseball", "Basketball", "Football", "Parlay", "Uncategorized"];
const TAKER_GENERAL_COLORS = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2",
  "Uncategorized": "#9E9E9E"
};

// Reclassify the per-ticker daily volume rows into detailed categories once, up front.
// value = taker-side notional DOLLARS (not contracts) - Kalshi contracts price 1-99 cents, so a
// "taker volume" chart plotted in raw contract counts isn't comparable to this page's other
// dollar-denominated charts and overweights categories full of cheap, high-count contracts.
const takerCatRows = takerVolByTicker.map(d => ({
  date: d.date,
  category: reportTickerToCat.get(d.report_ticker) || "Uncategorized",
  value: +d.notional_settled || 0
}));

const takerCatDaily = Array.from(
  d3.rollup(takerCatRows, rows => d3.sum(rows, r => r.value), d => +d.date),
  ([t, value]) => ({date: new Date(t), value})
).sort((a, b) => a.date - b.date);
const takerCatMaxDate = d3.max(takerCatDaily, d => d.date);
```

## Daily taker-side notional

<p class="section-intro">Dollars staked by the aggressor on each trade — the handle equivalent. Because it weighs each bet by what it cost, a 99¢ contract counts for far more than a 1¢ one.</p>

<div class="instruction-line"><strong>Useful trick:</strong> when taker dollars spike but contract volume on the Volume page doesn't, the action moved into pricier, higher-conviction contracts — not just more of them.</div>

```js
const dr = Mutable([new Date("2025-01-01"), takerMaxDate]);
display(renderDateBrush({
  data: taker, dateAccessor: d => d.date, valueAccessor: d => d.notional_total,
  initialRange: [new Date("2025-01-01"), takerMaxDate],
  onSelect: r => { dr.value = r; },
  color: "#00C2A8", width
}));
```

```js
const [s1, e1] = dr;
const fd    = taker.filter(d => d.date >= s1 && d.date <= e1);
const ma7fd = ma7.filter(d => d.date >= s1 && d.date <= e1);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 360,
  marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Taker-side notional ($)", grid: true},
  marks: [
    Plot.rectY(fd, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.notional_total || 0,
      fill: "#00C2A8",
      fillOpacity: 0.6
    }),
    Plot.lineY(ma7fd, {
      x: "date", y: "ma",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(fd, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Total: ${fmtUSD(d.notional_total)}`,
        `Yes-side: ${fmtUSD(d.notional_yes)} (${(d.notional_total ? d.notional_yes/d.notional_total*100 : 0).toFixed(1)}%)`,
        `No-side:  ${fmtUSD(d.notional_no)}  (${(d.notional_total ? d.notional_no/d.notional_total*100 : 0).toFixed(1)}%)`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Daily taker-side notional</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #e15759"></span>7-day average</span>
</div>

## Yes vs No takers

<p class="section-intro">Which way the aggressive money is leaning. A steady yes-side majority means buyers are pushing harder than sellers across the board.</p>

```js
const drYesNo = Mutable([new Date("2025-01-01"), takerMaxDate]);
display(renderDateBrush({
  data: taker, dateAccessor: d => d.date, valueAccessor: d => d.notional_total,
  initialRange: [new Date("2025-01-01"), takerMaxDate],
  onSelect: r => { drYesNo.value = r; },
  color: "#00C2A8", width
}));
```

```js
const [sYN, eYN] = drYesNo;
const fdYesNo = taker.filter(d => d.date >= sYN && d.date <= eYN);
const fdStack = fdYesNo.flatMap(d => {
  const yes = d.notional_yes || 0;
  const no = d.notional_no || 0;
  return [
    {date: d.date, side: "Yes", y1: 0, y2: yes},
    {date: d.date, side: "No",  y1: yes, y2: yes + no}
  ];
});
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Taker-side notional ($)", grid: true},
  color: {domain: ["Yes", "No"], range: ["#00C2A8", "#e15759"], legend: false},
  marks: [
    Plot.rectY(fdStack, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y1: "y1",
      y2: "y2",
      fill: "side",
      fillOpacity: 0.75
    }),
    Plot.ruleX(fdYesNo, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fdYesNo, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Yes: ${fmtUSD(d.notional_yes)} (${(d.notional_total ? d.notional_yes/d.notional_total*100 : 0).toFixed(1)}%)`,
        `No:  ${fmtUSD(d.notional_no)}  (${(d.notional_total ? d.notional_no/d.notional_total*100 : 0).toFixed(1)}%)`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Yes-side takers</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#e15759"></span>No-side takers</span>
</div>

## Volume by category

<p class="section-intro">Which categories the aggressive (taker) money is actually flowing into, in the same taker-side notional dollars as the chart above — just broken out by category. Sports are broken out sport-by-sport rather than lumped into Kalshi's single "Sports" bucket — switch to Detailed for the sport-by-sport split.</p>

```js
const drCat = Mutable([new Date("2025-01-01"), takerCatMaxDate]);
display(renderDateBrush({
  data: takerCatDaily, dateAccessor: d => d.date, valueAccessor: d => d.value,
  initialRange: [new Date("2025-01-01"), takerCatMaxDate],
  onSelect: r => { drCat.value = r; },
  color: "#8E24AA", width
}));
```

<div class="control-strip">

```js
const takerCatDetail = view(hashInput("takerCatDetail", Inputs.radio(["General", "Detailed"], {value: hashGet("takerCatDetail", "General"), label: "Categories"})));
```

</div>

```js
const [sCat, eCat] = drCat;
const activeCatOrder  = takerCatDetail === "Detailed" ? TAKER_DETAIL_ORDER  : TAKER_GENERAL_ORDER;
const activeCatColors = takerCatDetail === "Detailed" ? TAKER_DETAIL_COLORS : TAKER_GENERAL_COLORS;

const fdCat = takerCatRows
  .filter(d => d.date >= sCat && d.date <= eCat)
  .map(d => ({date: d.date, category: takerCatDetail === "Detailed" ? d.category : (TAKER_GENERAL_MAP[d.category] || "Uncategorized"), value: d.value}));

const catTotalsInRange = Array.from(
  d3.rollup(fdCat, rows => d3.sum(rows, r => r.value), d => d.category),
  ([category, value]) => ({category, value})
).sort((a, b) => b.value - a.value);

// Manual cumulative stack (mirrors the Yes/No section above) rather than relying on an
// implicit mark-level stack transform, since this needs one bar segment per category
// per day, in a fixed draw order, skipping zero/missing categories cleanly. Grouping by
// date first, then re-summing per category, correctly merges rows that collapse onto the
// same General bucket (e.g. NFL + College Football -> Football).
const catByDate = d3.group(fdCat, d => +d.date);
const stackedCat = [];
for (const [t, rowsForDate] of catByDate) {
  const byCategory = new Map();
  for (const r of rowsForDate) byCategory.set(r.category, (byCategory.get(r.category) || 0) + r.value);
  let cum = 0;
  for (const cat of activeCatOrder) {
    const v = byCategory.get(cat) || 0;
    if (v <= 0) continue;
    stackedCat.push({date: new Date(+t), category: cat, y1: cum, y2: cum + v, value: v});
    cum += v;
  }
}
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 380,
  marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Taker-side notional ($)", grid: true, tickFormat: d => fmtUSD(d)},
  color: {legend: true, domain: activeCatOrder, range: activeCatOrder.map(c => activeCatColors[c])},
  marks: [
    Plot.rectY(stackedCat, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y1: "y1",
      y2: "y2",
      fill: "category",
      tip: true,
      title: d => `${fmtDate(d.date)}\n${d.category}: ${fmtUSD(d.value)}`
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

<p class="chart-note">Top categories in the brushed window: ${catTotalsInRange.slice(0, 5).map(d => `${d.category} (${fmtUSD(d.value)})`).join(", ")}.</p>

<details class="surface-card compact-details">
  <summary>How taker-side notional is calculated</summary>
  <p>Every matched trade has an aggressor (taker) who crosses the spread and a liquidity provider (maker) who rests. The taker's cost depends on which side they take: a yes-side taker pays the yes price per contract; a no-side taker pays <em>1 − yes price</em> per contract. Summing those dollar amounts across all takers gives total taker-side notional — the prediction-market equivalent of handle in sports betting. Unlike raw contract count, taker-side notional is unaffected by artificial inflation from high-frequency trading in near-certain contracts.</p>
</details>
