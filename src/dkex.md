---
title: DKeX (DraftKings)
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DraftKings Exchange</div>
  <h1>DKeX (DraftKings)</h1>
  <p class="page-lead">DKeX is DraftKings' CFTC-regulated event-contract exchange, formerly Railbird. The public files are young and volume is still tiny next to Kalshi, but the reports include trade prints, daily market volume/open interest, and settlements.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
import {ESTABLISHED_VOLUME_EVENTS, positionedVolumeEvents, volumeEventMarks} from "./components/volume-events.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily      = await DataAttachment("data/dkex_daily.csv").csv({typed: true});
const catDaily   = await DataAttachment("data/dkex_categories_daily.csv").csv({typed: true});
const split      = await DataAttachment("data/dkex_sports_split_daily.csv").csv({typed: true});
const market     = await DataAttachment("data/dkex_market_daily.csv").csv({typed: true});
const settlement = await DataAttachment("data/dkex_settlement_daily.csv").csv({typed: true});
const freshness  = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Daily volume", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "dkex_daily.csv"), meta: "Public DKeX time-and-sales reports", tone: "competitor"},
    {label: "Market report", date: latestDate(market), updatedAt: fileUpdatedAt(freshness, "dkex_market_daily.csv"), meta: "Trade volume, prices, and open interest", tone: "competitor"},
    {label: "Settlements", date: latestDate(settlement), updatedAt: fileUpdatedAt(freshness, "dkex_settlement_daily.csv"), meta: "Public DKeX daily settlement reports", tone: "competitor"}
  ],
  note: "DKeX reports are published by the DraftKings/Railbird site and generally lag the trading day. Fees are not published in these files."
}));
display(askPageLink({
  question: "Summarize recent DKeX volume, category mix, open interest, and settlement activity.",
  context: "DKeX page using dkex_daily.csv, dkex_categories_daily.csv, dkex_market_daily.csv, and dkex_settlement_daily.csv."
}));
```

```js
const DKEX = "var(--accent-dkex)";
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
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
  <div class="kpi-card" data-accent="dkex">
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
  <p>DKeX volume is the sum of <code>Last Quantity</code> in the public time-and-sales files. Categories come from the report symbol prefix, or, for a prefix the map has not been taught, from the bets the market itself offers &mdash; "both teams to score" only exists in soccer. The league chart splices the MLB, NPB and KBO columns of <code>dkex_sports_split_daily.csv</code> into that category mix in place of Baseball, which those three leagues make up exactly, so the bands cover the whole book with no residual. That CSV still carries its own <code>contracts_other_leagues</code> column, which is a different cut: everything outside the three named leagues. Market/open-interest rows come from the daily market report; the market table keeps rows with either trade volume or open interest. Settlement rows come from the daily settlement report.</p>
  <p>The reports do not publish fees, so this page shows volume and trade size only. Any DKeX fee on the Comparison page is derived from the exchange's published schedule — a step of about $0.01 per contract across almost the whole book, charged to the taker, with a further $0.0025 charged to the maker rather than rebated.</p>
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

<p class="section-intro">DKeX contract volume from the public time-and-sales reports.</p>

```js
const brushVolume = view(makeBrush(split, DKEX));
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
    Plot.rectY(splitFVolume, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: DKEX, fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total || 0)} contracts`
    }),
    ...volumeEventMarks(Plot, volumeEvents),
    Plot.ruleY([0])
  ]
})
```

```js
// ── Bands: one palette and one tooltip for BOTH charts on this page ─────────
// The league chart and the category chart draw overlapping series (Parlays,
// Soccer, Football...). Two palettes meant one band was two colours on one
// screen. Sport colours match categories.md so a sport keeps its colour across
// the site; MLB/NPB/KBO keep the accents this page already used for them.
const BAND_COLOR = {
  "MLB": DKEX, "NPB (Japan)": "var(--accent-kalshi)", "KBO (Korea)": "#7C6CF0",
  "Other baseball": "#C5B8F7", "Baseball": "#880e4f",
  "Parlays": "#7b1fa2",
  "Football": "var(--cat-football)",
  "Basketball (pro)": "var(--cat-basketball)", "Basketball (college)": "#90caf9",
  "Basketball": "var(--cat-basketball)",
  "Soccer": "#827717", "Golf": "#33691e", "Tennis": "#4a148c", "Hockey": "#006064",
  "Combat sports": "#6d4c41", "Cricket": "#00695c", "Esports": "#5c6bc0",
  "Motorsport": "#546e7a",
  "Other": "var(--pc-unclassified)"
};
const bandColor = b => BAND_COLOR[b] ?? "var(--pc-unclassified)";

// Fixed stacking order so a band does not jump when the window changes. Anything
// unlisted is APPENDED rather than dropped -- a category this page has never seen
// must still be drawn, which is the whole lesson of the "Other" spike.
const BAND_ORDER = ["MLB", "NPB (Japan)", "KBO (Korea)", "Other baseball", "Baseball",
  "Basketball (pro)", "Basketball (college)", "Basketball", "Football", "Soccer",
  "Golf", "Tennis", "Hockey", "Cricket", "Esports", "Combat sports", "Motorsport",
  "Parlays", "Other"];

// One row per (date, band). Plot.areaY does not aggregate; duplicates render as
// sails. Every band series on this page goes through here.
const tidyBands = rows => [...d3.rollup(rows, rs => d3.sum(rs, r => r.value),
                                        r => +r.date, r => r.band)]
  .flatMap(([t, m]) => [...m].map(([band, value]) => ({date: new Date(t), band, value})));

const bandsPresent = tidy => {
  const seen = new Set(tidy.filter(r => r.value > 0).map(r => r.band));
  return [...BAND_ORDER.filter(b => seen.has(b)),
          ...[...seen].filter(b => !BAND_ORDER.includes(b)).sort()];
};

// Per-date wide rows: pointerX needs ONE row per x, or the tip quotes a single
// series instead of the whole stack.
const wideByDate = (tidy, bands) => {
  const m = d3.rollup(tidy, rs => d3.sum(rs, r => r.value), r => +r.date, r => r.band);
  return [...m].sort((a, b) => a[0] - b[0]).map(([t, byBand]) => {
    const o = {date: new Date(t)};
    for (const b of bands) o[b] = byBand.get(b) ?? 0;
    o.total = d3.sum(bands, b => o[b]);
    return o;
  });
};

const bandTip = (d, bands) => [`${fmtDate(d.date)}  ${fmtCount(d.total)} contracts`]
  .concat(bands.filter(b => d[b] > 0).sort((a, b) => d[b] - d[a])
    .map(b => `${b}: ${fmtCount(d[b])}  (${(100 * d[b] / d.total).toFixed(1)}%)`))
  .join("\n");
```

## League mix

<p class="section-intro">Baseball split by its three leagues, everything else by category &mdash; the whole book, with nothing left unnamed.</p>

```js
const brushLeague = view(makeBrush(split, DKEX));
```

```js
const [sL, eL] = brushLeague;
const splitFLeague = split.filter(d => d.date >= sL && d.date <= eL);
const catFLeague = catDaily.filter(d => d.date >= sL && d.date <= eL);

// The chart used to be MLB / NPB / KBO / "Other leagues", and that residual grew
// into the biggest thing on the page it could not name: by 2026-08-29 it held the
// COMBO parlay book (21% of contracts), college football, WNBA and eleven soccer
// leagues. Rather than widen dkex_sports_split_daily.csv with a hand-kept league
// list -- the same kind of list that had just gone stale in CATEGORY_MAP -- the
// bands now come from the CATEGORY feed, which classifies itself, with only the
// baseball split taken from the league columns.
//
// That works because "Baseball" IS exactly MLB + NPB + KBO: those three prefixes
// are the only ones CATEGORY_MAP sends to Baseball. Verified across all 82
// published days -- 0 mismatches, and the spliced bands reconcile to
// contracts_total to the contract on every day.
//
// Should a FOURTH baseball league appear, the identity breaks in the safe
// direction: the remainder surfaces as its own "Other baseball" band instead of
// silently unbalancing the stack.
const leagueRows = (() => {
  const bal = new Map(splitFLeague.map(d => [+d.date, d]));
  const out = [];
  for (const r of catFLeague) {
    const t = +r.date, v = +r.contracts || 0;
    if (r.category !== "Baseball") { out.push({date: t, band: r.category, value: v}); continue; }
    const b = bal.get(t);
    if (!b) { out.push({date: t, band: "Baseball", value: v}); continue; }
    const mlb = +b.contracts_mlb || 0, npb = +b.contracts_npb || 0, kbo = +b.contracts_kbo || 0;
    out.push({date: t, band: "MLB", value: mlb},
             {date: t, band: "NPB (Japan)", value: npb},
             {date: t, band: "KBO (Korea)", value: kbo},
             {date: t, band: "Other baseball", value: Math.max(0, v - mlb - npb - kbo)});
  }
  return out;
})();

// ⚠ Re-aggregate after the splice. Plot.areaY does NOT sum rows sharing an
// (x, fill) -- it gives each its own sub-band and draws the path through all of
// them, which renders as sails. One row per (date, band), always.
const tidyLeague = tidyBands(leagueRows);
const leagueOrder = bandsPresent(tidyLeague);
const leagueWide = wideByDate(tidyLeague, leagueOrder);
const leagueTotals = leagueOrder.map(b => ({label: b, value: d3.sum(tidyLeague.filter(r => r.band === b), r => r.value)}));
const leagueGrand = d3.sum(leagueTotals, t => t.value);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, columns: 4, domain: leagueOrder, range: leagueOrder.map(bandColor)},
  marks: [
    Plot.areaY(tidyLeague, {
      x: "date", y: "value", fill: "band",
      order: leagueOrder.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(leagueWide, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(leagueWide, Plot.pointerX({x: "date", title: d => bandTip(d, leagueOrder)})),
    Plot.ruleY([0])
  ]
})
```

```js
display(leagueGrand
  ? html`<p class="section-intro">Share of the selected window: ${leagueTotals
      .filter(t => t.value > 0)
      .map(t => `${t.label} ${(100 * t.value / leagueGrand).toFixed(1)}%`)
      .join(" / ")}. Baseball is split by league; everything else is its own category, so no volume is left unnamed.</p>`
  : html`<p class="section-intro">League columns arrive with the next competitor data refresh (~6h); this chart fills in then.</p>`);
```

## Category mix

<p class="section-intro">Volume by parsed category, with market-report open interest available beside it.</p>

```js
const brushCats = view(makeBrush(split, DKEX));
```

```js
const [sC, eC] = brushCats;
const catDailyF = catDaily.filter(d => d.date >= sC && d.date <= eC);
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const catFiltered = tidyBands(catDailyF.map(d => ({date: +d.date, band: d.category, value: +d.contracts || 0})));
const topCats = bandsPresent(catFiltered);
const catWide = wideByDate(catFiltered, topCats);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  // Was scheme:"tableau10" over a domain sorted by all-time volume, so a
  // category's colour moved whenever the ranking did, and disagreed with the
  // league chart directly above it. The shared map pins each band.
  color: {legend: true, columns: 4, domain: topCats, range: topCats.map(bandColor)},
  marks: [
    Plot.areaY(catFiltered, {
      x: "date", y: "value", fill: "band",
      order: topCats.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(catWide, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(catWide, Plot.pointerX({x: "date", title: d => bandTip(d, topCats)})),
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
      fill: DKEX, fillOpacity: 0.75,
      tip: true,
      title: d => `${d.category}\n${fmtCount(d.contracts)} contracts`
    }),
    Plot.ruleX([0])
  ]
})
```

## Settlements

<p class="section-intro">Daily settlement report counts by outcome. DKeX settles a contract at $1.00 (won), $0.00 (lost), or $0.50 &mdash; and $0.50 means the event was <strong>voided or postponed</strong>, so both sides refund at half. Voids are counted separately, not as wins. &ldquo;Other&rdquo; is the rare partial or pro-rated settlement.</p>

```js
const settlementByDate = Array.from(
  d3.rollup(settlement, rows => ({
    date: rows[0].date,
    settlements: d3.sum(rows, d => d.settlements || 0),
    settled_yes: d3.sum(rows, d => d.settled_yes || 0),
    settled_no: d3.sum(rows, d => d.settled_no || 0),
    settled_void: d3.sum(rows, d => d.settled_void || 0),
    settled_other: d3.sum(rows, d => d.settled_other || 0)
  }), d => +d.date),
  ([, v]) => v
).sort((a, b) => a.date - b.date);

const settlementTidy = settlementByDate.flatMap(d => [
  {date: d.date, outcome: "Settled yes", count: d.settled_yes || 0},
  {date: d.date, outcome: "Settled no", count: d.settled_no || 0},
  {date: d.date, outcome: "Voided ($0.50)", count: d.settled_void || 0},
  {date: d.date, outcome: "Other", count: d.settled_other || 0}
]);

// The per-day void rate ships as a column in dkex_daily.csv (build_dkex_daily.py)
// so this chart, the DuckDB tables and the chatbot all read one definition.
// Days with no settlement report leave void_rate blank -> null under typed:true.
const voidRate = daily
  .filter(d => d.void_rate != null && (d.settlements || 0) > 0)
  .map(d => ({date: d.date, void_rate: +d.void_rate}))
  .sort((a, b) => a.date - b.date);
const fmtPct = n => n == null || Number.isNaN(+n) ? "" : (100 * +n).toFixed(2) + "%";
const settlementScaleMax = d3.max(settlementByDate, d => d.settlements) || 1;
const voidRateScaled = voidRate.map(d => ({...d, scaled: d.void_rate * settlementScaleMax}));
const settlementBrushSeries = settlementByDate.map(d => ({date: d.date, value: d.settlements}));
const settlementDateSel = Mutable([d3.min(settlementBrushSeries, d => d.date), d3.max(settlementBrushSeries, d => d.date)]);
display(renderDateBrush({
  data: settlementBrushSeries,
  initialRange: [d3.min(settlementBrushSeries, d => d.date), d3.max(settlementBrushSeries, d => d.date)],
  onSelect: range => { settlementDateSel.value = range; },
  color: DKEX,
  width
}));
```

```js
const [settlementFrom, settlementTo] = settlementDateSel;
const settlementTidyBrushed = settlementTidy.filter(d => d.date >= settlementFrom && d.date <= settlementTo);
const voidRateScaledBrushed = voidRateScaled.filter(d => d.date >= settlementFrom && d.date <= settlementTo);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  marginRight: 64,
  x: {type: "utc", label: null},
  y: {label: "Settled contracts", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: ["Settled yes", "Settled no", "Voided ($0.50)", "Other"], range: ["#1a9641", "#d7191c", "#fdae61", "#9ca3af"]},
  marks: [
    Plot.rectY(settlementTidyBrushed, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: "count",
      fill: "outcome",
      tip: true,
      title: d => `${fmtDate(d.date)}\n${d.outcome}: ${fmtCount(d.count)}`
    }),
    Plot.lineY(voidRateScaledBrushed, {x: "date", y: "scaled", stroke: "#111827", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(voidRateScaledBrushed, {
      x: "date", y: "scaled", r: 2.5, fill: "#111827", tip: true,
      title: d => `${fmtDate(d.date)}\nVoid rate: ${fmtPct(d.void_rate)}`
    }),
    Plot.axisY({anchor: "right", label: "Void rate", tickFormat: d => `${Math.round(100 * d / settlementScaleMax)}%`}),
    Plot.ruleY([0])
  ]
})
```

<p class="chart-note">Bars show settlement counts on the left axis. The dark line shows the same day's void rate on the right axis.</p>

## Top markets

<p class="section-intro">DKeX's individual markets, ranked by volume and searchable by club, driver or player. These names are <strong>composed</strong>: DKeX publishes an English name for each <em>outcome</em> in its settlement report but never for the market, so each title here is built from that published text plus the market type and the published settlement date.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/dkex_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
import {attachMarketInspector} from "./components/inspect-tables.js";
```

```js
// Clicking a market name opens the same inspector drawer /market-explorer uses. The rows
// are held in a const because the click handler and the shared-link resolver both read them.
//
// `source` is this page's own key, and that matters: selection state lives in the GLOBAL
// pc_* query namespace, so a link copied from another venue's leaderboard would otherwise
// resolve against these rows and open the wrong market.
const lbMarkets = normalizeLeaderboard("dkex", lbRows);
display(marketLeaderboard({
  hashPrefix: "dklb",
  rowsPerPage: 20,
  venues: [{spec: LB_VENUES.dkex, rows: lbMarkets}],
  onMarketSelect: attachMarketInspector({source: "dkex-markets", rows: lbMarkets})
}));
```
