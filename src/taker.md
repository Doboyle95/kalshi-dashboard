---
title: Taker-Side Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Taker-Side Volume</h1>
  <p class="page-lead">The closest thing Kalshi has to sportsbook handle — the dollars staked by the bettor who takes the price on each trade rather than waiting for it.</p>
</div>

```js
const fmtUSD  = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-$" : "$"; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : a.toFixed(0)); };
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtPct = n => `${((n ?? 0) * 100).toFixed((n ?? 0) >= 0.1 ? 1 : 2)}%`;
const fmtPrice = p => p == null || p === "" ? "-" : `${Number(p) % 1 === 0 ? Number(p).toFixed(0) : Number(p).toFixed(2)}¢`;
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const taker = await DataAttachment("data/taker_notional_daily.csv").csv({typed: true});
const takerVolByTicker = await DataAttachment("data/taker_volume_by_ticker_daily.csv").csv({typed: true});
const takerVolByTickerSide = await DataAttachment("data/taker_volume_by_ticker_side_daily.csv").csv({typed: true});
const categoryLeaderboard = await DataAttachment("data/category_leaderboard.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {hashGet, hashInput} from "./components/hash-state.js";
import {renderDateBrush} from "./components/date-brush.js";
import {bestName, fmtStrike} from "./components/ticker-names.js";
import {buildReportTickerToCat, TAKER_DETAIL_ORDER, TAKER_DETAIL_COLORS, TAKER_GENERAL_MAP, TAKER_GENERAL_ORDER, TAKER_GENERAL_COLORS} from "./components/taker-categories.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Taker-side volume", date: latestDate(taker), updatedAt: fileUpdatedAt(freshness, "taker_notional_daily.csv"), meta: "Recent-window refreshable; can be within minutes locally"},
    {label: "Taker volume by category", date: latestDate(takerVolByTicker), updatedAt: fileUpdatedAt(freshness, "taker_volume_by_ticker_daily.csv"), meta: "Taker-side volume in dollars, broken out by category"},
    {label: "Largest trades", value: "All-time leaderboard", updatedAt: fileUpdatedAt(freshness, "large_trades.csv"), meta: "Settlement-dependent; refreshes every ~4h"}
  ],
  note: "This page can update more frequently than settlement-based P&L because it does not need final outcomes."
}));
display(askPageLink({
  question: "Analyze recent taker-side volume and whether yes-side or no-side takers are driving the change.",
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
const totalTakerVolume = d3.sum(taker, d => d.notional_total);
const peakDay       = taker.reduce((b, d) => d.notional_total > b.notional_total ? d : b, taker[0]);
const recentRows    = taker.slice(-30);
const recentAvg     = d3.mean(recentRows, d => d.notional_total);
const recentPctYes  = d3.mean(recentRows, d => d.notional_total ? d.notional_yes / d.notional_total * 100 : 0);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time taker-side volume</div>
    <div class="kpi-value">${fmtUSD(totalTakerVolume)}</div>
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
    <div class="kpi-meta">of taker-side volume (30-day avg)</div>
  </div>
</div>

```js
const takerMaxDate = d3.max(taker, d => d.date);
```

```js
// ── Category classification (report_ticker -> cat, sport-by-sport instead of Kalshi's own
// coarse kalshi_category) is shared across this page and taker-pnl.md - see
// components/taker-categories.js for the order/color/general-map definitions.
const reportTickerToCat = buildReportTickerToCat(categoryLeaderboard);

// Reclassify the per-ticker daily volume rows into detailed categories once, up front.
// value = taker-side volume in DOLLARS (not contracts) - Kalshi contracts price 1-99 cents, so a
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

## Daily taker-side volume

<p class="section-intro">Dollars staked by the aggressor on each trade — the handle equivalent. Because it weighs each bet by what it cost, a 99¢ contract counts for far more than a 1¢ one.</p>

<div class="instruction-line"><strong>Useful trick:</strong> when taker dollars spike but contract volume on the Volume page doesn't, the action moved into pricier, higher-conviction contracts — not just more of them.</div>

```js
const dr = Mutable([new Date("2025-01-01"), takerMaxDate]);
display(renderDateBrush({
  data: taker, dateAccessor: d => d.date, valueAccessor: d => d.notional_total,
  initialRange: [new Date("2025-01-01"), takerMaxDate],
  onSelect: r => { dr.value = r; },
  color: "var(--accent-kalshi)", width
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
  y: {label: "Taker-side volume ($)", grid: true},
  marks: [
    Plot.rectY(fd, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.notional_total || 0,
      fill: "var(--accent-kalshi)",
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
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:var(--accent-kalshi)"></span>Daily taker-side volume</span>
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
  color: "var(--accent-kalshi)", width
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
  y: {label: "Taker-side volume ($)", grid: true},
  color: {domain: ["Yes", "No"], range: ["var(--accent-kalshi)", "#e15759"], legend: false},
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
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:var(--accent-kalshi)"></span>Yes-side takers</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#e15759"></span>No-side takers</span>
</div>

## Volume by category

<p class="section-intro">Which categories the aggressive (taker) money is actually flowing into, in the same taker-side volume dollars as the chart above — just broken out by category. Sports are broken out sport-by-sport rather than lumped into Kalshi's single "Sports" bucket — switch to Detailed for the sport-by-sport split.</p>

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
  y: {label: "Taker-side volume ($)", grid: true, tickFormat: d => fmtUSD(d)},
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

## Yes/No skew by category

<p class="section-intro">Which categories takers only want to bet one way on. A category near 50/50 means the aggressive money is split; a category leaning hard to one side means takers overwhelmingly buy Yes (or fade to No) there. Same brushed window and General/Detailed toggle as the chart above.</p>

```js
// Same per-ticker classification and brushed window (sCat/eCat) as "Volume by category" above,
// just from the side-preserving sibling export instead of the side-collapsed one.
const takerSideRows = takerVolByTickerSide.map(d => ({
  date: d.date,
  category: reportTickerToCat.get(d.report_ticker) || "Uncategorized",
  side: d.side,
  value: +d.notional_settled || 0
}));

const fdCatSide = takerSideRows
  .filter(d => d.date >= sCat && d.date <= eCat)
  .map(d => ({...d, category: takerCatDetail === "Detailed" ? d.category : (TAKER_GENERAL_MAP[d.category] || "Uncategorized")}));

const skewByCategory = Array.from(
  d3.rollup(fdCatSide, rows => {
    const yes = d3.sum(rows.filter(r => r.side === "yes"), r => r.value);
    const no  = d3.sum(rows.filter(r => r.side === "no"),  r => r.value);
    return {yes, no, total: yes + no, yesShare: (yes + no) ? yes / (yes + no) * 100 : null};
  }, d => d.category),
  ([category, v]) => ({category, ...v})
).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

const skewBars = skewByCategory.flatMap(d => [
  {category: d.category, side: "Yes", y1: 0, y2: d.yes, total: d.total, yesShare: d.yesShare},
  {category: d.category, side: "No",  y1: d.yes, y2: d.total, total: d.total, yesShare: d.yesShare}
]);

const mostYesSkewed = [...skewByCategory].sort((a, b) => b.yesShare - a.yesShare)[0];
const mostNoSkewed  = [...skewByCategory].sort((a, b) => a.yesShare - b.yesShare)[0];
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: skewByCategory.length * 26 + 44,
  marginLeft: 130,
  x: {label: "Taker-side volume ($)", grid: true, tickFormat: d => fmtUSD(d)},
  y: {label: null, domain: skewByCategory.map(d => d.category)},
  color: {legend: true, domain: ["Yes", "No"], range: ["var(--accent-kalshi)", "#e15759"]},
  marks: [
    Plot.barX(skewBars, {
      x1: "y1",
      x2: "y2",
      y: "category",
      fill: "side",
      tip: true,
      title: d => `${d.category}\n${d.side}: ${fmtUSD(d.y2 - d.y1)}\nYes share: ${d.yesShare.toFixed(1)}%\nTotal: ${fmtUSD(d.total)}`
    }),
    Plot.ruleX([0])
  ]
})
```

</div>

<p class="chart-note">Most yes-skewed in the brushed window: ${mostYesSkewed ? `${mostYesSkewed.category} (${mostYesSkewed.yesShare.toFixed(1)}% yes)` : "n/a"}. Most no-skewed: ${mostNoSkewed ? `${mostNoSkewed.category} (${(100 - mostNoSkewed.yesShare).toFixed(1)}% no)` : "n/a"}.</p>

<details class="surface-card compact-details">
  <summary>How taker-side volume is calculated</summary>
  <p>Every matched trade has an aggressor (taker) who crosses the spread and a liquidity provider (maker) who rests. The taker's cost depends on which side they take: a yes-side taker pays the yes price per contract; a no-side taker pays <em>1 − yes price</em> per contract. Summing those dollar amounts across all takers gives total taker-side volume — the prediction-market equivalent of handle in sports betting. Unlike raw contract count, taker-side volume is unaffected by artificial inflation from high-frequency trading in near-certain contracts.</p>
</details>

## Largest individual trades

<p class="section-intro">The single biggest prints Kalshi has published — raw contracts, the larger side's dollar stake and what the taker specifically put up don't always pick the same winners.</p>

```js
// Loaded HERE, not in the page's shared block at the top: build_chart_catalog.py credits a
// series to the nearest "##" heading ABOVE its DataAttachment call, so a file loaded from a
// shared block gets filed under whatever section happens to sit above it.
const largeTrades = await DataAttachment("data/large_trades.csv").csv({typed: true});
```

```js
const LT_METRIC_KEYS = {"Contracts": "contracts", "One-party stake": "one_party_stake", "Taker stake": "taker_stake"};

// DERIVED FROM THE FILE, not a hand-kept list: Kalshi flags an aggressor on every print so all
// three rankings exist today, but an option offered for a metric the producer stopped emitting
// would render an empty table rather than disappear.
const ltMetrics = Object.keys(LT_METRIC_KEYS).filter(label => largeTrades.some(d => d.metric === LT_METRIC_KEYS[label]));

function largeTradeRows(table, metricLabel) {
  const metricKey = LT_METRIC_KEYS[metricLabel];
  return largeTrades
    .filter(d => d.table === table && d.metric === metricKey)
    .sort((a, b) => +a.rank - +b.rank)
    .map(d => ({
      date: d.date,
      // Same sport-by-sport classification the charts above use, falling back to Kalshi's own
      // coarser kalshi_category when a report_ticker is not in the leaderboard.
      category: reportTickerToCat.get(d.report_ticker) || d.kalshi_category || "Uncategorized",
      market: bestName({market_key: d.market_key, market_name: "", "i.market_name": ""}),
      outcome: fmtStrike(d.ticker_name, d.market_key),
      contracts: +d.contracts_traded || 0,
      price: d.price,
      taker_side: d.taker_side || "-",
      // "contracts" is the metric NAME, not a column: the count lives in contracts_traded.
      // Indexing the row by the metric name resolves for the two stake metrics and yields
      // undefined -> 0 for this one, so the ranking column read 0 on every row.
      metric_value: metricKey === "contracts" ? +d.contracts_traded || 0 : +d[metricKey] || 0,
      pct_of_market: d.pct_of_market === "" || d.pct_of_market == null ? null : +d.pct_of_market
    }));
}
```

<div class="control-strip">

```js
const overallMetric = view(Inputs.radio(ltMetrics, {label: "Rank by", value: "Contracts"}));
```

</div>

```js
const overallRows = largeTradeRows("overall", overallMetric);
display(overallRows.length
  ? Inputs.table(overallRows, {
      columns: ["date", "category", "market", "outcome", "contracts", "price", "taker_side", "metric_value"],
      header: {date: "Date", category: "Category", market: "Market", outcome: "Outcome", contracts: "Contracts", price: "Price", taker_side: "Taker side", metric_value: overallMetric},
      format: {date: fmtDate, contracts: fmtCount, price: fmtPrice, metric_value: overallMetric === "Contracts" ? fmtCount : fmtUSD},
      align: {contracts: "right", metric_value: "right"},
      rows: 15
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">No large-trade rows are being served.</div>`);
```

<div class="instruction-line"><strong>Useful trick:</strong> switch to "One-party stake" to surface trades at extreme prices, where one side risks close to the full dollar and the other almost nothing.</div>

## Largest trades in small markets

<p class="section-intro">The same rankings restricted to trades that were unusually large <em>for the market they happened in</em> — a print that ate a big share of everything that market ever traded, not just a big number in isolation.</p>

<div class="control-strip">

```js
const smallMarketMetric = view(Inputs.radio(ltMetrics, {label: "Rank by", value: ltMetrics.includes("Taker stake") ? "Taker stake" : "Contracts"}));
```

</div>

```js
const smallMarketRows = largeTradeRows("small_market", smallMarketMetric);
display(smallMarketRows.length
  ? Inputs.table(smallMarketRows, {
      columns: ["date", "category", "market", "outcome", "contracts", "price", "taker_side", "metric_value", "pct_of_market"],
      header: {date: "Date", category: "Category", market: "Market", outcome: "Outcome", contracts: "Contracts", price: "Price", taker_side: "Taker side", metric_value: smallMarketMetric, pct_of_market: "% of market"},
      format: {date: fmtDate, contracts: fmtCount, price: fmtPrice, metric_value: smallMarketMetric === "Contracts" ? fmtCount : fmtUSD, pct_of_market: d => d == null ? "-" : fmtPct(d)},
      align: {contracts: "right", metric_value: "right", pct_of_market: "right"},
      rows: 15
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">No small-market rows are being served.</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>A trade qualifies here when it was at least 100,000 contracts <strong>and</strong> at least 20% of that market's entire lifetime volume in that one print, excluding parlays. Parlays are left out because a parlay combo is by construction its own tiny market, so almost any parlay trade looks like a huge share of a thin one — and the per-combo volume totals behind that ratio aren't reliable at that granularity. Parlays still appear in the table above, which has no market-share requirement.</p>
  <p>Because the denominator — the market's lifetime volume — keeps growing while a market is still active, a trade can drop out of this list over time even though the trade itself never changes.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./trade-size">Trading behavior across venues</a>, which ranks the same prints against every other venue's tape.</div>
