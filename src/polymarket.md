---
title: Polymarket US
---

<div class="page-hero" data-accent="polymarket">
  <div class="page-eyebrow">Polymarket US</div>
  <h1>Polymarket US</h1>
  <p class="page-lead">The US-walled-off version of Polymarket, separate from the global site and regulated by the CFTC. It started reporting in late 2025, and it's almost all sports.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily  = await DataAttachment("data/polymarket_categories_daily.csv").csv({typed: true});
const split     = await DataAttachment("data/polymarket_sports_split_daily.csv").csv({typed: true});
const mktType   = await DataAttachment("data/polymarket_market_type_daily.csv").csv({typed: true});
const settlement = await DataAttachment("data/polymarket_settlement_daily.csv").csv({typed: true});
const parlay    = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category data", date: latestDate(catDaily), updatedAt: fileUpdatedAt(freshness, "polymarket_categories_daily.csv"), meta: "Public Polymarket US files", tone: "competitor"},
    {label: "Sports split", date: latestDate(split), updatedAt: fileUpdatedAt(freshness, "polymarket_sports_split_daily.csv"), meta: "Derived from mapped categories", tone: "competitor"},
    {label: "Settlements", date: latestDate(settlement), updatedAt: fileUpdatedAt(freshness, "polymarket_settlement_daily.csv"), meta: "Outcome by event date, from the venue's market catalogue", tone: "competitor"}
  ],
  note: "Polymarket US is refreshed when public files are downloaded and rebuilt; it is not tied to the Kalshi near-live API collector."
}));
display(askPageLink({
  question: "Summarize recent Polymarket US activity and whether sports or non-sports categories are driving it.",
  context: "Polymarket US page using polymarket_categories_daily.csv and polymarket_sports_split_daily.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="polymarket">
    <div class="kpi-label">Volume (since Oct 2025)</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)} · contracts</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Polymarket US volume comes from public daily market reports normalized into category and sports-split files. Volume is contract count. Category charts use the mapped category attached to each market report row; the sports split sums categories classified as sports versus everything else.</p>
  <p>Because the source is daily totals rather than individual trades, this page is best for scale and mix, not trade-by-trade detail.</p>
</details>

```js
function makeBrush(data, color) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(data, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(data, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block").style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)").style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(data)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total)).curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const start = d3.min(data, d => d.date);
  const end   = d3.max(data, d => d.date);
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

const fmtAxisNum = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? Math.round(a/1e6)+"M" : a >= 1e3 ? Math.round(a/1e3)+"k" : String(a)); };
```

## Daily volume

<p class="section-intro">Polymarket US volume since it began reporting in late 2025.</p>

```js
const brushVolume = view(makeBrush(split, "#3B7DD8"));
```

```js
const [sV, eV] = brushVolume;
const splitFVolume = split.filter(d => d.date >= sV && d.date <= eV);
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
      fill: "#3B7DD8", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">US-accessible Polymarket volume only (separate from global Polymarket). Data from the exchange's own daily bulletins, starting Oct 30, 2025. Almost entirely sports.</p>

## Product mix

<p class="section-intro">Switch between the broad sports split, the daily sport mix, the all-time ranking, and the venue's own contract types without repeating the same product story in four separate sections.</p>

```js
const polymarketProductView = view(Inputs.radio(
  ["Sports vs non-sports", "Sport trend", "All-time sport mix", "Contract types"],
  {label: "View", value: "Sports vs non-sports"}
));
```

```js
const brushProducts = view(makeBrush(split, "#3B7DD8"));
```

```js
const [sS, eS] = brushProducts;
const splitFSports = split.filter(d => d.date >= sS && d.date <= eS);
const tidySplit = splitFSports.flatMap(d => [
  {date: d.date, category: "Sports",     value: d.contracts_sports    || 0},
  {date: d.date, category: "Non-sports", value: d.contracts_nonsports || 0}
]);
```

```js
polymarketProductView === "Sports vs non-sports" ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "#00C2A8"]},
  marks: [
    Plot.areaY(tidySplit, {
      x: "date", y: "value", fill: "category",
      order: ["Non-sports", "Sports"],
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(splitFSports, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFSports, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSports: ${fmtCount(d.contracts_sports||0)}\nNon-sports: ${fmtCount(d.contracts_nonsports||0)}`
    })),
    Plot.ruleY([0])
  ]
}) : null
```

<h2 hidden>Volume by sport</h2>

<p class="section-intro" hidden>Where the sports money lands, day by day.</p>

```js
const brushCats = brushProducts;
```

```js
const [sC, eC] = brushCats;
const catDailyFCats = catDaily.filter(d => d.date >= sC && d.date <= eC);
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const topCats = [...catTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 9).map(d => d[0]);
const catFiltered = catDailyFCats.filter(d => topCats.includes(d.category));
```

```js
// Per-date pivot for single combined tooltip (avoids overlapping bubbles)
const catTipData = Array.from(
  d3.rollup(catFiltered, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.category] = r.contracts || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

```js
polymarketProductView === "Sport trend" ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    Plot.areaY(catFiltered, {
      x: "date", y: "contracts", fill: "category",
      order: topCats.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(catTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(catTipData, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...topCats.map(c => d[c] > 0 ? `${c}: ${fmtCount(d[c])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
}) : null
```

<h2 hidden>Sport breakdown (all time)</h2>

<p class="section-intro" hidden>The all-time pecking order, with every category stacked up.</p>

```js
const catBar = [...catTotals.entries()]
  .sort((a,b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
polymarketProductView === "All-time sport mix" ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 170,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => fmtAxisNum(d)},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "#3B7DD8", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
}) : null
```

<h2 hidden>Contract types</h2>

<p class="section-intro" hidden>Which kind of bet trades, in the venue's own vocabulary.</p>

```js
// The venue publishes a granular bet-type field (`sports_market_type`, 185 values in its
// catalogue) which the producer reduces to its 15 largest labels plus three named residuals.
//
// THE GATE. Drawing this from the venue's launch would be false. `taxonomy_coverage` is the
// share of matched sports contracts carrying a GRANULAR label rather than the venue's legacy
// generic one, and it is 0% for the first eight months: January 2026 has a 99.86% symbol
// join and exactly ONE distinct label all month. The venue rolled the vocabulary out in
// mid-2026 -- coverage first passes 10% on 2026-06-13, 50% on 06-23 and 90% on 06-24.
// Before that this series measures a metadata rollout, not a product mix, so the chart
// starts at the first day coverage clears 90% and says so.
const MIN_TAXONOMY_COVERAGE = 0.9;
const mtCovered = mktType
  .filter(d => (+d.taxonomy_coverage || 0) >= MIN_TAXONOMY_COVERAGE)
  .map(d => d.date)
  .sort((a, b) => a - b);
const mtFrom = mtCovered.length ? mtCovered[0] : null;
```

```js
const [sM, eM] = brushProducts;
// Respect the shared brush, but never draw below the coverage gate.
const mtWin = mtFrom
  ? mktType.filter(d => d.date >= Math.max(sM, mtFrom) && d.date <= eM && (+d.contracts || 0) > 0)
  : [];

// The producer already emits three residuals of its own (the 163 labels outside its top 15,
// plus non-sports and unjoinable symbols). Those are ALWAYS held out of the ranking and folded
// into this chart's single residual band -- otherwise `other_market_type` ranks third on its own
// and the legend shows two different "Other"s, which reads as a bug. One residual, named once.
const MT_RESIDUALS = new Set(["other_market_type", "non_sports", "unmatched_symbol"]);

// Rank inside the visible window, not all-time: the point of the view is what trades now.
const mtTotals = d3.rollup(mtWin, v => d3.sum(v, d => +d.contracts || 0), d => d.sports_market_type);
const mtTop = [...mtTotals.entries()]
  .filter(([label]) => !MT_RESIDUALS.has(label))
  .sort((a, b) => b[1] - a[1]).slice(0, 11).map(d => d[0]);

// Nothing is renormalised: the bands still sum to the venue's own daily total.
const humanize = s => {
  const t = String(s).replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const OTHER = "Other contract types";
const mtTidy = Array.from(
  d3.rollup(
    mtWin.map(d => ({
      date: d.date,
      label: mtTop.includes(d.sports_market_type) ? humanize(d.sports_market_type) : OTHER,
      contracts: +d.contracts || 0
    })),
    v => d3.sum(v, d => d.contracts),
    d => d.date.getTime(), d => d.label
  ),
  ([t, m]) => [...m.entries()].map(([label, contracts]) => ({date: new Date(t), label, contracts}))
).flat();

const mtOrder = [...mtTop.map(humanize), OTHER];
const mtTip = Array.from(
  d3.rollup(mtTidy, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.label] = r.contracts;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

```js
polymarketProductView === "Contract types" ? (mtFrom ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, columns: 3, scheme: "tableau10", domain: mtOrder},
  marks: [
    Plot.areaY(mtTidy, {
      x: "date", y: "contracts", fill: "label",
      order: mtOrder.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(mtTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(mtTip, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...mtOrder.map(c => d[c] > 0 ? `${c}: ${fmtCount(d[c])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
}) : html`<p class="chart-note">No day yet carries granular contract types for 90% of its volume.</p>`) : null
```

```js
polymarketProductView === "Contract types" && mtFrom
  ? html`<p class="chart-note">Starts ${fmtDate(mtFrom)}, the first day the venue tagged 90% of its volume with a specific contract type &mdash; earlier days carry one generic label and would chart its metadata rollout, not its book. <strong>Other contract types</strong> is a real residual and includes the venue's own unclassified bucket.</p>`
  : null
```

## Settlements

<p class="section-intro">How markets resolved, by the day the outcome was decided. A void is the paired $0.50 refund both sides receive when an event is cancelled or postponed &mdash; counted separately, never as a win.</p>

```js
// Sibling of the DKeX settlement chart and deliberately the same shape.
//
// THE DATE IS AN EVENT DATE. The venue's catalogue carries no settlement timestamp
// (updated_at is the bulk export stamp; 390,591 of 447,767 rows share one day), so the
// producer keys on the ET calendar date of game_start_time -- the day the outcome was
// decided. Scored against the daily market report's own settlement date it lands within
// one day 98.04% of the time. It is NOT a settlement-report date and is not labelled one.
const settlementByDate = Array.from(
  d3.rollup(settlement, rows => ({
    date: rows[0].date,
    settlements:   d3.sum(rows, d => d.settlements   || 0),
    settled_yes:   d3.sum(rows, d => d.settled_yes   || 0),
    settled_no:    d3.sum(rows, d => d.settled_no    || 0),
    settled_void:  d3.sum(rows, d => d.settled_void  || 0),
    settled_other: d3.sum(rows, d => d.settled_other || 0)
  }), d => +d.date),
  ([, v]) => v
).sort((a, b) => a.date - b.date);

// "yes" is the FIRST-NAMED side settling at 1.00, which is the reading the published
// polymarket_market_leaderboard.csv already uses for this venue. It was measured, not
// assumed: the report's single Settlement Price equals the first side's value on
// 99.3652% of the 270,328 markets where both sources reached a terminal value.
const settlementTidy = settlementByDate.flatMap(d => [
  {date: d.date, outcome: "First side won",  count: d.settled_yes   || 0},
  {date: d.date, outcome: "First side lost", count: d.settled_no    || 0},
  {date: d.date, outcome: "Voided ($0.50)",  count: d.settled_void  || 0},
  {date: d.date, outcome: "Other",           count: d.settled_other || 0}
]);

// Void rate is derived here rather than read from a column: unlike DKeX, this venue
// publishes no daily file carrying one, and inventing a second definition elsewhere is
// how two numbers drift apart.
const settlementScaleMax = d3.max(settlementByDate, d => d.settlements) || 1;
const voidRateScaled = settlementByDate
  .filter(d => (d.settlements || 0) > 0)
  .map(d => ({date: d.date, void_rate: d.settled_void / d.settlements,
              scaled: (d.settled_void / d.settlements) * settlementScaleMax}));
const fmtPct2 = n => n == null || Number.isNaN(+n) ? "" : (100 * +n).toFixed(2) + "%";
```

```js
// The page's own brush helper keys on `contracts_total`; map settlement counts into that
// shape rather than importing a second brush component.
const brushSettle = view(makeBrush(
  settlementByDate.map(d => ({date: d.date, contracts_total: d.settlements})), "#3B7DD8"));
```

```js
const [sT, eT] = brushSettle;
const settlementTidyBrushed = settlementTidy.filter(d => d.date >= sT && d.date <= eT);
const voidRateBrushed = voidRateScaled.filter(d => d.date >= sT && d.date <= eT);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  marginRight: 64,
  x: {type: "utc", label: null},
  y: {label: "Markets settled", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true,
          domain: ["First side won", "First side lost", "Voided ($0.50)", "Other"],
          range: ["#1a9641", "#d7191c", "#fdae61", "#9ca3af"]},
  marks: [
    Plot.rectY(settlementTidyBrushed, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: "count", fill: "outcome", tip: true,
      title: d => `${fmtDate(d.date)}\n${d.outcome}: ${fmtCount(d.count)}`
    }),
    Plot.lineY(voidRateBrushed, {x: "date", y: "scaled", stroke: "#111827", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(voidRateBrushed, {
      x: "date", y: "scaled", r: 2.5, fill: "#111827", tip: true,
      title: d => `${fmtDate(d.date)}\nVoid rate: ${fmtPct2(d.void_rate)}`
    }),
    Plot.axisY({anchor: "right", label: "Void rate", tickFormat: d => `${Math.round(100 * d / settlementScaleMax)}%`}),
    Plot.ruleY([0])
  ]
})
```

<p class="chart-note">Bars are market counts on the left axis; the dark line is that day's void rate on the right. <strong>&ldquo;First side&rdquo; is the market's first-listed outcome, not a bet on it</strong> &mdash; across head-to-head types it wins about half the time, which is the check that the reading is right.</p>

## Combos (gated beta)

<p class="section-intro">Multi-leg &ldquo;Combinatoric Athletic Outcome Contracts&rdquo;, first traded 2026-08-05. <strong>This is not a feature in the Polymarket US app</strong> &mdash; combos are an API-only beta open to explicitly enabled participants, so this is a small number of programmatic traders, not a retail launch.</p>

```js
// Same toggle as Kalshi's parlay pages, and the same wording, so the two read alike.
const parlayMetric = view(Inputs.radio(["volume", "stakes"], {
  value: "volume", label: "Metric",
  format: x => x === "volume" ? "Volume (contracts)" : "Taker stakes ($)"
}));
```

```js
// "Taker stakes" is justified on this venue only for parlays. Polymarket publishes no
// aggressor flag, so a single market's flow cannot be attributed to a taker -- but
// parlays are priced by request-for-quote, so the customer lifts a quote the venue makes
// and the buyer IS the taker. The producer asserts that rather than assuming it: Strike
// Price is YES on all 10,379 parlay rows, and it fails rather than mislabel the series if
// a NO-side parlay ever appears.
const parlayRows = parlay
  .filter(d => d.date && (+d.contracts || 0) > 0)
  .map(d => ({
    date: d.date,
    contracts: +d.contracts || 0,
    stake: +d.stake_usd || 0,
    trades: +d.trades || 0,
    // pct_of_venue is ALREADY a percentage, not a fraction: 2.175675 means 2.18% of the
    // venue that day (2,945,593 of 135,387,525 contracts). Multiplying by 100 again
    // renders parlays as 217% of the venue, which is what the first draft of this did.
    pct: +d.pct_of_venue || 0
  }))
  .sort((a, b) => a.date - b.date);

const parlayPeak = d3.greatest(parlayRows, d => d.pct);
// Contracts ARE dollars on this venue: every matured combo settles at exactly 1 or 0
// (voids at 0.50), so a contract is a $1 claim and the count is a face-value figure --
// the same convention the rest of the site uses. Both toggles are therefore dollars and
// the page says so; an earlier draft implied only the stake was real money.
const parlayTotal = d3.sum(parlayRows, d => d.contracts);
const parlayStakeTotal = d3.sum(parlayRows, d => d.stake);
const parlayTotalTrades = d3.sum(parlayRows, d => d.trades);
const parlayAvgPrice = parlayTotal > 0 ? parlayStakeTotal / parlayTotal : 0;
const fmtUSD0 = n => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${d3.format(",.0f")(n)}`;
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 76,
  x: {type: "utc", label: null},
  y: {
    label: parlayMetric === "volume" ? "Daily volume (contracts)" : "Daily taker stakes ($)",
    grid: true,
    tickFormat: d => parlayMetric === "volume" ? fmtAxisNum(d) : fmtUSD0(d)
  },
  marks: [
    // Bars, not an area: twelve days of a launch ramp is a series of discrete days, and a
    // smoothed curve over that few points invents a shape the data does not have.
    Plot.rectY(parlayRows, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => parlayMetric === "volume" ? d.contracts : d.stake,
      fill: "#B07AA1", fillOpacity: 0.85, tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts)} contracts\n${fmtUSD0(d.stake)} staked\n${d.trades.toLocaleString()} trades\n${d.pct.toFixed(2)}% of the venue that day`
    }),
    Plot.ruleY([0])
  ]
})
```

<p class="chart-note">Since ${fmtDate(parlayRows[0].date)}: <strong>${fmtUSD0(parlayTotal)} of contracts traded</strong>, of which combo buyers staked <strong>${fmtUSD0(parlayStakeTotal)}</strong>, across ${parlayTotalTrades.toLocaleString()} trades &mdash; peaking at ${parlayPeak.pct.toFixed(2)}% of the venue's contracts on ${fmtDate(parlayPeak.date)}. These are $1 contracts, so both toggles are dollars: face value is what settles, stake is what the buyer paid for it at an average of ${(100 * parlayAvgPrice).toFixed(1)}&cent;.</p>

<details class="surface-card compact-details">
  <summary>About combos here — read before quoting any number</summary>
  <p><strong>Do not read this as a Kalshi-style parlay product.</strong> Polymarket's own documentation calls the Combos API a beta "available only to explicitly enabled Retail API users", and a combo is a user-defined instrument of 2–10 legs created on demand through the API rather than a listed market anyone can browse. That is why these never appear in the app, why the venue's own market catalogue contains none of them, and why the public search cannot find one: each is minted against a hash of its legs and is addressable only once it exists. Kalshi's parlays are a consumer feature; these are a programmatic facility, and putting the two share numbers side by side compares different things.</p>
  <p><strong>Both toggles are dollars, and they answer different questions.</strong> Every matured combo settles at exactly $1 or $0, so the contract count is a face-value figure: ${fmtUSD0(parlayTotal)} of contracts changed hands. Buyers funded ${fmtUSD0(parlayStakeTotal)} of that at an average of ${(100 * parlayAvgPrice).toFixed(1)}&cent; and their counterparties posted the remaining ${fmtUSD0(parlayTotal - parlayStakeTotal)}, because in a binary the two sides together put up the dollar. Use face value for what settles and stake for what a combo buyer risked; neither is the "real" number on its own.</p>
  <p><strong>Why the two diverge so far here.</strong> Combining legs multiplies their probabilities, so most combos are longshots and a small bet books as a large number of contracts. On 2026-08-15 the largest single combo trade was <strong>94,340 contracts at $0.004 — a $377 bet</strong>, and the second was 56,610 contracts for $57. Trades at 5&cent; or less were 69% of that day's contracts and 5.9% of its stake. That is pricing, not concentration: 2,586 distinct combos traded that day across 3,716 trades.</p>
  <p><strong>These are dated by when the trade happened, not by which file carried it.</strong> The venue's tape is named for its reporting date and holds the prior session's trades, so grouping by filename would reproduce the daily report's clearing-date series and discard the one thing the tape knows that the report does not. On transaction date, parlay trading is visible from 2026-08-05, a day before the product's first report row.</p>
  <p><strong>Parlays can be sized but never decomposed.</strong> No public endpoint resolves a combo's legs, and combos appear in none of the 447,767 markets in the venue's own catalogue, so there is no leg count, no correlation classification and no comparison with Kalshi's leg-length distribution. Everything here is the outside of the product.</p>
  <p><strong>The published series was wrong until 2026-08-17 and this is the corrected one.</strong> The venue publishes parlays under two symbol formats — a bare aggregate row per maturity from 08-06, and one row per individual parlay from 08-12 — and the producer matched only the first. It therefore read zero from 08-15 onward and showed the product collapsing at the moment it took off. Both formats are now matched, and the tape and the daily report reconcile to 0.000%.</p>
</details>

## Top markets

<p class="section-intro">The biggest individual Polymarket US markets, ranked by all-time contracts and searchable by name. This is the one venue on the site that publishes a full English question for its markets, so most rows read as sentences rather than tickers.</p>

<p class="chart-note">Half of these rows have no &ldquo;busiest outcome&rdquo; and that is correct, not missing data: Polymarket lists a head-to-head as a <em>single</em> instrument settling to 1.00 or 0.00, so there is no sibling outcome to name and the winner column carries yes/no instead. Where the venue does list an outcome per contestant — a World Cup or a golf major — the outcome count runs to several hundred.</p>
<p class="chart-note">This table's universe is slightly larger than the volume charts above it. Those are built from the tick feed, which is short on four dates (2026-06-27, 07-01, 07-06 and 07-08); the leaderboard reads volume from the daily market report and tops it up from ticks only where no report exists, which is about 1.4% more contracts overall. Where the two disagree the leaderboard is the more complete number. Fees still need a per-trade price and so can only come from ticks, which leaves fees understated on those same four dates and absent — never zero — on the eight dates in May 2026 when the venue exported placeholder symbols that cannot be attributed to a market.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/polymarket_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
```

```js
display(marketLeaderboard({
  hashPrefix: "pmlb",
  venues: [{spec: LB_VENUES.polymarket, rows: normalizeLeaderboard("polymarket", lbRows)}]
}));
```
