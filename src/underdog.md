---
title: Underdog Exchange
---

<div class="page-hero" data-accent="underdog">
  <div class="page-eyebrow">Underdog Fantasy</div>
  <h1>Underdog Exchange</h1>
  <p class="page-lead">Underdog Exchange is Underdog Fantasy's CFTC-regulated event-contract exchange. The reports include individual trade prints plus daily market volume and open interest.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {ESTABLISHED_VOLUME_EVENTS, positionedVolumeEvents, volumeEventMarks} from "./components/volume-events.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily    = await DataAttachment("data/underdog_daily.csv").csv({typed: true});
const catDaily = await DataAttachment("data/underdog_categories_daily.csv").csv({typed: true});
const split    = await DataAttachment("data/underdog_sports_split_daily.csv").csv({typed: true});
// Bet-type mix reads the pre-aggregated multi-venue file, NOT the per-market report.
// underdog_market_daily.csv is one row per market per day -- 154,476 rows / 15.4 MB as of
// 2026-08-18, growing ~1.5 MB a day -- and the only thing this page ever did with it was
// roll it up to (date, bet type). bet_type_daily.csv IS that rollup, built from the same
// source by python/build_bet_type_daily.py.
// Verified 2026-08-18 against the full file: identical to the cent on every all-time
// series total (148,911,478.89 contracts), on all 111 (date, type) cells, and on the
// latest date. The per-market file is no longer published; per-market detail lives in
// underdog_market_leaderboard.csv, which the Top markets table below reads.
const betType = (await DataAttachment("data/bet_type_daily.csv").csv({typed: true}))
  .filter(d => d.venue === "Underdog");
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Daily volume", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "underdog_daily.csv"), meta: "Public Underdog Exchange trade + market reports", tone: "competitor"},
    {label: "Market report", date: latestDate(betType), updatedAt: fileUpdatedAt(freshness, "underdog_market_leaderboard.csv"), meta: "Per-market volume, aggregated to bet type and to the leaderboard", tone: "competitor"}
  ],
  note: "Underdog Exchange reports are published on Underdog Fantasy's CFTC public-reporting site and lag the trading day by roughly 12-24 hours. Fees are not published in these files. A day with no row is a day the exchange did not report, which is not the same as a day with no trades."
}));
display(askPageLink({
  question: "Summarize recent Underdog Exchange volume, category mix, bet-type mix, and open interest.",
  context: "Underdog Exchange page using underdog_daily.csv, underdog_categories_daily.csv, underdog_sports_split_daily.csv, bet_type_daily.csv, and underdog_market_leaderboard.csv."
}));
```

```js
const UNDERDOG = "var(--accent-underdog)";
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : (Number.isInteger(a) ? String(a) : a.toFixed(1))); };
const fmtAxisNum = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? Math.round(a/1e6)+"M" : a >= 1e3 ? Math.round(a/1e3)+"k" : String(Math.round(a))); };
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const fmtPrice = n => n == null || Number.isNaN(+n) ? "" : "$" + (+n).toFixed(2);
```

```js
const totalContracts = d3.sum(daily, d => d.contracts);
const totalTrades = d3.sum(daily, d => d.trade_count);
const peakDay = daily.reduce((best, d) => d.contracts > (best?.contracts ?? -1) ? d : best, daily[0]);
const latestDay = daily.reduce((best, d) => d.date > (best?.date ?? new Date(0)) ? d : best, daily[0]);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="underdog">
    <div class="kpi-label">Reported volume</div>
    <div class="kpi-value" title="${totalContracts.toLocaleString()} contracts">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts since first public file</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Trade prints</div>
    <div class="kpi-value" title="${totalTrades.toLocaleString()} trades">${fmtCount(totalTrades)}</div>
    <div class="kpi-meta">time-and-sales rows</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Latest open interest</div>
    <div class="kpi-value" title="${(latestDay?.open_interest ?? 0).toLocaleString()} contracts">${fmtCount(latestDay?.open_interest)}</div>
    <div class="kpi-meta">${fmtDate(latestDay?.date)}</div>
  </div>
  <div class="kpi-card" data-accent="positive">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value" title="${(peakDay?.contracts ?? 0).toLocaleString()} contracts">${fmtCount(peakDay?.contracts)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Underdog volume is the <code>daily_volume</code> field from the public daily market reports, confirmed to equal the sum of that ticker's <code>contracts_traded</code> in the public trade-level reports — the same contracts convention used everywhere else on this site (not dollar volume). Categories are parsed from the sport code embedded in each ticker (e.g. <code>UDXMLBGAMEWIN...</code> → Baseball); bet type (Moneyline / Spread / Total) is parsed from the rest of that same ticker segment. Multi-leg parlays are reported as <code>UDXCOMBO-&lt;hash&gt;</code> tickers that carry no sport or bet-type code, so they are grouped as Parlays rather than split across sports.</p>
  <p>The reports do not publish fees directly; the fee figures here are derived from Underdog's published schedule. Any Underdog fee on the Comparison page is derived from the exchange's published schedule — the same 0.07 coefficient Kalshi uses, but charged to both sides, so Underdog collects about twice per matched trade what Kalshi does. Contract sizes on this exchange can be fractional (unlike Kalshi's whole-contract trades), which is expected, not a parsing error.</p>
</details>

```js
function makeBrush(data, color, value = d => d.contracts_total ?? d.contracts ?? 0) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const xDomain = d3.extent(data, d => d.date);
  const x = d3.scaleUtc().domain(xDomain).range([ml, w - mr]);
  const yMax = d3.max(data, value) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(data)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h - mb).y1(d => y(value(d))).curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeDay.every(Math.max(1, Math.ceil(data.length / 8)))).tickFormat(d3.timeFormat("%b %d")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const start = xDomain[0];
  const end = xDomain[1];
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (!event.selection) {
        // Clearing the brush (a bare click) now means "show everything": reset to
        // the full domain and redraw the selection so the visuals match the filter.
        svg.property("value", x.domain());
        brushG.call(brush.move, x.domain().map(x));   // programmatic move — guarded above, no re-fire
        svg.dispatch("input");
        return;
      }
      svg.property("value", event.selection.map(x.invert)); svg.dispatch("input");
    });

  const brushG = svg.append("g");


  brushG.call(brush).call(brush.move, [start, end].map(x));
  svg.selectAll(".handle").style("display", "block").style("fill", color).style("fill-opacity", 0.9);
  svg.selectAll(".selection").style("stroke", color).style("stroke-width", "2px").style("fill", color).style("fill-opacity", 0.15);
  svg.property("value", [start, end]);
  return svg.node();
}
```

## Daily volume

<p class="section-intro">Underdog contract volume from the public daily market reports. Gaps between bars are real — the exchange had no reported trades those days.</p>

```js
const brushVolume = view(makeBrush(split, UNDERDOG));
```

```js
const [sV, eV] = brushVolume;
const splitFVolume = split.filter(d => d.date >= sV && d.date <= eV);
const volumeEvents = positionedVolumeEvents(ESTABLISHED_VOLUME_EVENTS, sV, eV, d3.max(splitFVolume, d => d.contracts_total) || 1);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    // Bars, not dots: 22 dates over a 26-day span (85% coverage, 16-day contiguous
    // run), so this is daily magnitude over a near-continuous window. The four absent
    // days read as missing without needing a marker. ry = 4px rounded data-end;
    // insets give the 2px surface gap between adjacent bars.
    Plot.rectY(splitFVolume, {
      x: d => d.date,
      interval: "day",
      y: d => d.contracts_total || 0,
      fill: UNDERDOG,
      fillOpacity: 0.85,
      ry: 4,
      insetLeft: 1,
      insetRight: 1,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total || 0)} contracts`
    }),
    ...volumeEventMarks(Plot, volumeEvents),
    Plot.ruleY([0])
  ]
})
```

## Single-game vs. parlay

<p class="section-intro">Everything Underdog has reported so far is a sports contract, so the useful split is not sports vs. non-sports but single-game markets vs. multi-leg parlays.</p>

```js
const brushSports = view(makeBrush(split, UNDERDOG));
```

```js
const [sS, eS] = brushSports;
const splitFSports = split.filter(d => d.date >= sS && d.date <= eS);
// contracts_nonsports is NOT a non-sports series: it is total minus the sport
// categories, and Underdog's only out-of-taxonomy tickers are the UDXCOMBO
// parlays. Labelling it "Non-sports" made the chart claim a non-sports market
// existed when none ever has. Labelled for what it actually measures.
const tidySplit = splitFSports.flatMap(d => [
  {date: d.date, category: "Single-game", value: d.contracts_sports || 0},
  {date: d.date, category: "Parlays (combos)", value: d.contracts_nonsports || 0}
]);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: ["Single-game", "Parlays (combos)"], range: [UNDERDOG, "var(--accent-kalshi)"]},
  marks: [
    // Stacked bars: two components of one daily total read as parts of a whole,
    // which dots cannot show. Same 4px data-end and 2px surface gap as chart 1;
    // the gap between the two segments comes from the 1px insets on each.
    Plot.rectY(tidySplit.filter(d => d.value > 0), {
      x: "date",
      interval: "day",
      y: "value",
      fill: "category",
      fillOpacity: 0.9,
      ry: 4,
      insetLeft: 1,
      insetRight: 1
    }),
    Plot.ruleX(splitFSports, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFSports, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSingle-game: ${fmtCount(d.contracts_sports || 0)}\nParlays (combos): ${fmtCount(d.contracts_nonsports || 0)}`
    })),
    Plot.ruleY([0])
  ]
})
```

## Parlay volume and stakes

<p class="section-intro">The same parlay band on its own, in contracts and in the money bettors put up for them.</p>

```js
import {GRANULARITIES, METRICS, metricLabel, parlayChart, toDailyParlay} from "./components/parlay-series.js";
const udParlayGranularity = view(Inputs.radio(GRANULARITIES, {value: "Daily", label: "View"}));
const udParlayMetric = view(Inputs.radio(METRICS, {value: "volume", label: "Metric", format: metricLabel}));
const brushParlay = view(makeBrush(daily, UNDERDOG));
```

```js
// A UDXCOMBO print's price is the combo's OWN price, not one leg's, so quantity x price is
// what the buyer paid. Underdog reports whole days only -- a date with no row is a date the
// exchange did not report, not a quiet day -- so no per-day partial flag is passed; only the
// running month is faded.
const [pS, pE] = brushParlay;
const udParlayDaily = toDailyParlay(
  daily.filter(d => d.date >= pS && d.date <= pE),
  {date: "date", contracts: "contracts_parlay", stake: "stake_parlay", venue: "contracts"}
);
display(parlayChart({
  daily: udParlayDaily, granularity: udParlayGranularity, metric: udParlayMetric,
  color: UNDERDOG, width, height: 260
}));
```

```js
const udParlayContracts = d3.sum(daily, d => +d.contracts_parlay || 0);
const udParlayStake = d3.sum(daily, d => +d.stake_parlay || 0);
const udAllContracts = d3.sum(daily, d => +d.contracts || 0);
```

<p class="chart-note">Parlays are ${(100 * udParlayContracts / udAllContracts).toFixed(1)}% of Underdog's contracts but only $${fmtCount(udParlayStake)} of stake, bought at ${(100 * udParlayStake / udParlayContracts).toFixed(1)}&cent; each.</p>

## Category mix

<p class="section-intro">Volume by sport, parsed from each contract's ticker.</p>

```js
const brushCats = view(makeBrush(split, UNDERDOG));
```

```js
const [sC, eC] = brushCats;
// The "Other" category is not a residual grab-bag: it is exactly the UDXCOMBO
// parlay tickers (verified 2026-08-06 against every date in the raw reports).
// A genuinely new unmapped sport code would also arrive as "Other", so if a
// non-parlay ever shows up here this label has to be revisited.
const catLabel = c => c === "Other" ? "Parlays (combos)" : c;
const catDailyF = catDaily.filter(d => d.date >= sC && d.date <= eC && d.contracts > 0)
  .map(d => ({...d, category: catLabel(d.category)}));
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => catLabel(d.category));
const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    // Daily volume by category is a FLOW, so it stacks as bars. Dots implied a level and
    // left the day total unreadable, because the eye cannot sum scattered points.
    Plot.rectY(catDailyF.filter(d => topCats.includes(d.category)), {
      x: "date", y: "contracts", fill: "category", interval: "day",
      insetLeft: 1, insetRight: 1, inset: 0.5,
      tip: true,
      title: d => fmtDate(d.date) + " · " + d.category + ": " + fmtCount(d.contracts) + " contracts"
    }),
    Plot.ruleY([0])
  ]
})
```

```js
const catBars = [...catTotals.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: Math.max(120, catBars.length * 30 + 40),
  marginLeft: 160,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => fmtAxisNum(d)},
  y: {label: null},
  marks: [
    Plot.barX(catBars, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: UNDERDOG, fillOpacity: 0.75,
      tip: true,
      title: d => `${d.category}\n${fmtCount(d.contracts)} contracts`
    }),
    Plot.ruleX([0])
  ]
})
```

## Bet type mix

<p class="section-intro">Underdog Exchange lists moneyline, spread, total and matchwin contracts on the same games.</p>

```js
// Underdog mints one ticker per parlay (UDXCOMBO-<hash>), and the ticker parser turns each
// of those hashes into its own market_type. Charted raw that was 3,006 distinct values --
// 2,999 of them occurring exactly once -- a 3,006-entry legend above a ~102,000px bar chart
// standing for 3.9% of volume. build_bet_type_daily.py already collapses them, on the same
// symbol-or-market_type rule, into the single source_type "Combo (UDXCOMBO)", so the series
// here is simply the raw bet type with that one bucket read out under its display name.
// source_type, not bet_type: bet_type buckets Matchwin INTO Moneyline, and this page has
// always shown Matchwin as its own series.
const betTypeLabel = d => d.bet_type === "Parlay" ? "Parlay" : d.source_type;

const betTypeTotals = d3.rollup(betType, v => d3.sum(v, d => d.contracts), betTypeLabel);
const topBetTypes = [...betTypeTotals.entries()].sort((a, b) => b[1] - a[1]).map(d => d[0]);

// Already one row per (date, source_type); rolled up anyway so that a future producer
// change mapping two source_types onto one label stacks instead of overplotting.
const betTypeDaily = Array.from(
  d3.rollup(betType.filter(d => d.contracts > 0), v => d3.sum(v, d => d.contracts), d => +d.date, betTypeLabel),
  ([ms, m]) => Array.from(m, ([bet_type, contracts]) => ({date: new Date(ms), bet_type, contracts}))
).flat();
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: topBetTypes, scheme: "set2"},
  marks: [
    Plot.rectY(betTypeDaily, {
      x: "date", y: "contracts", fill: "bet_type", interval: "day",
      insetLeft: 1, insetRight: 1, inset: 0.5,
      tip: true,
      title: d => fmtDate(d.date) + " · " + d.bet_type + ": " + fmtCount(d.contracts) + " contracts"
    }),
    Plot.ruleY([0])
  ]
})
```

```js
const betTypeBars = [...betTypeTotals.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([market_type, contracts]) => ({market_type, contracts}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: Math.max(100, betTypeBars.length * 34 + 40),
  marginLeft: 110,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => fmtAxisNum(d)},
  y: {label: null},
  marks: [
    Plot.barX(betTypeBars, {
      x: "contracts", y: "market_type",
      sort: {y: "x", reverse: true},
      fill: "#F59E0B", fillOpacity: 0.75,
      tip: true,
      title: d => `${d.market_type}\n${fmtCount(d.contracts)} contracts`
    }),
    Plot.ruleX([0])
  ]
})
```

## Top markets

<p class="section-intro">Underdog Exchange's individual markets, ranked by volume.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/underdog_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
import {attachMarketInspector} from "./components/inspect-tables.js";
```

```js
// The excluded share is DERIVED, not written down. Parlays were 0% of this venue
// through 2026-07-29 and are over half of some days now, so a hardcoded share
// can be true for only a day. Same file the charts above use.
const udTotal  = d3.sum(daily, d => d.contracts || 0);
const udParlay = d3.sum(daily, d => d.contracts_parlay || 0);
const udDays = new Set(daily.map(d => +d.date)).size;
const underdogSpec = udTotal > 0
  ? {
      ...LB_VENUES.underdog,
      coverage: `Since ${d3.utcFormat("%Y-%m-%d")(d3.min(daily, d => d.date))} only — ${udDays} days. `
        + `Parlay tickets are excluded (${(100 * udParlay / udTotal).toFixed(1)}% of the venue's contracts): `
        + "a bespoke basket keyed by a 19-digit hash cannot be ranked or searched against a repeatedly-traded game line."
    }
  : LB_VENUES.underdog;   // no daily file: keep the shared note rather than invent a share
```

```js
// Clicking a market name opens the same inspector drawer /market-explorer uses. The rows
// are held in a const because the click handler and the shared-link resolver both read them.
//
// `source` is this page's own key, and that matters: selection state lives in the GLOBAL
// pc_* query namespace, so a link copied from another venue's leaderboard would otherwise
// resolve against these rows and open the wrong market.
const lbMarkets = normalizeLeaderboard("underdog", lbRows);
display(marketLeaderboard({
  hashPrefix: "udlb",
  rowsPerPage: 20,
  venues: [{spec: underdogSpec, rows: lbMarkets}],
  onMarketSelect: attachMarketInspector({source: "underdog-markets", rows: lbMarkets})
}));
```
