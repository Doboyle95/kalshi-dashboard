---
title: Underdog Exchange
---

<div class="page-hero" data-accent="underdog">
  <div class="page-eyebrow">Underdog Fantasy</div>
  <h1>Underdog Exchange</h1>
  <p class="page-lead">Underdog Exchange is Underdog Fantasy's CFTC-regulated event-contract exchange. Public reporting began June 24, 2026, and the exchange is still extremely early-stage — most calendar days so far report zero trades. The reports include individual trade prints plus daily market volume and open interest.</p>
</div>

```js
const daily    = await FileAttachment("data/underdog_daily.csv").csv({typed: true});
const catDaily = await FileAttachment("data/underdog_categories_daily.csv").csv({typed: true});
const split    = await FileAttachment("data/underdog_sports_split_daily.csv").csv({typed: true});
const market   = await FileAttachment("data/underdog_market_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Daily volume", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "underdog_daily.csv"), meta: "Public Underdog Exchange trade + market reports", tone: "competitor"},
    {label: "Market report", date: latestDate(market), updatedAt: fileUpdatedAt(freshness, "underdog_market_daily.csv"), meta: "Trade volume, prices, and open interest", tone: "competitor"}
  ],
  note: "Underdog Exchange reports are published on Underdog Fantasy's CFTC public-reporting site and lag the trading day by roughly 12-24 hours. Fees are not published in these files, and long stretches with no new date shown here mean the exchange genuinely reported zero trades that day — this is a very new, low-volume exchange, not a data gap."
}));
display(askPageLink({
  question: "Summarize recent Underdog Exchange volume, category mix, bet-type mix, and open interest.",
  context: "Underdog Exchange page using underdog_daily.csv, underdog_categories_daily.csv, underdog_sports_split_daily.csv, and underdog_market_daily.csv."
}));
```

```js
const UNDERDOG = "#EAB308";
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
  <p>The reports do not publish fees, so this page shows volume and trade size only. Any Underdog fee on the Comparison page is derived from the exchange's published schedule — the same 0.07 coefficient Kalshi uses, but charged to both sides, so Underdog collects about twice per matched trade what Kalshi does. Contract sizes on this exchange can be fractional (unlike Kalshi's whole-contract trades), which is expected, not a parsing error.</p>
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
    Plot.dot(splitFVolume, {
      x: d => d.date,
      y: d => d.contracts_total || 0,
      r: 4,
      fill: UNDERDOG,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total || 0)} contracts`
    }),
    Plot.ruleY([0])
  ]
})
```

## Single-game vs. parlay

<p class="section-intro">Everything Underdog has reported so far is a sports contract, so the useful split is not sports vs. non-sports but single-game markets vs. multi-leg parlays. The “non-sports” bucket in the underlying file is entirely the <code>UDXCOMBO-&lt;hash&gt;</code> parlay tickers — they carry no sport code, so the ticker parser files them outside the sport categories. Verified 2026-08-06: on every date in the file that bucket equals the UDXCOMBO total exactly, and no non-parlay ticker has ever landed in it.</p>

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
  color: {legend: true, domain: ["Single-game", "Parlays (combos)"], range: [UNDERDOG, "#00C2A8"]},
  marks: [
    Plot.dot(tidySplit.filter(d => d.value > 0), {x: "date", y: "value", fill: "category", r: 4}),
    Plot.ruleX(splitFSports, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFSports, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSingle-game: ${fmtCount(d.contracts_sports || 0)}\nParlays (combos): ${fmtCount(d.contracts_nonsports || 0)}`
    })),
    Plot.ruleY([0])
  ]
})
```

## Category mix

<p class="section-intro">Volume by sport, parsed from each contract's ticker. Underdog is not a baseball-only venue: WNBA has been listed since 2026-07-28 and is 12.6% of all contracts traded to date. The parlay bucket is the <code>UDXCOMBO</code> tickers, which carry no sport code.</p>

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
    Plot.dot(catDailyF.filter(d => topCats.includes(d.category)), {
      x: "date", y: "contracts", fill: "category", r: 4,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${d.category}: ${fmtCount(d.contracts)} contracts`
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

<p class="section-intro">Underdog Exchange lists moneyline, spread, and total contracts on the same games — a breakdown other venues on this site don't have. Parsed from the same ticker as category, one level down. Every multi-leg parlay is minted as its own one-off ticker, so all of them are grouped into a single Parlay series rather than charted individually.</p>

```js
// Underdog mints one ticker per parlay (UDXCOMBO-<hash>), and the ticker parser
// turns each of those hashes into its own market_type. Charted raw that is 3,006
// distinct values -- 2,999 of them occurring exactly once -- which rendered a
// 3,006-entry legend above a ~102,000px tall bar chart to represent 3.9% of
// volume. They are all the same thing, so they collapse into one Parlay series.
// Matching on the UDXCOMBO symbol as well as the Combo- market_type means a
// genuinely new bet type stays visible as itself instead of hiding in here.
// Verified 2026-08-06: this moves 0.00 contracts between series, the Parlay
// total equals the UDXCOMBO total exactly, and no non-combo row is relabelled.
const betTypeLabel = d =>
  (/^Combo-/.test(d.market_type) || /^UDXCOMBO/i.test(d.symbol || "")) ? "Parlay" : d.market_type;

const betTypeTotals = d3.rollup(market, v => d3.sum(v, d => d.trade_volume), d => betTypeLabel(d));
const topBetTypes = [...betTypeTotals.entries()].sort((a, b) => b[1] - a[1]).map(d => d[0]);

const betTypeTidy = market.filter(d => d.trade_volume > 0)
  .map(d => ({...d, bet_type: betTypeLabel(d)}));
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
    Plot.dot(betTypeTidy, {
      x: "date", y: "trade_volume", fill: "bet_type", r: 3, fillOpacity: 0.75,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${d.bet_type}: ${fmtCount(d.trade_volume)} contracts (${d.symbol})`
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

## Open interest

<p class="section-intro">Open interest reported across active Underdog markets. Hollow grey markers on the zero line are dates where Underdog reported no open interest at all — every market row came back 0, including 2026-07-24 on 911.9k contracts of volume — so those days are drawn as explicit gaps rather than as a real zero or dropped from the chart. 2026-08-02 is flagged separately: open interest fell 92% from the prior day on the third-heaviest volume day in the file, then fully recovered the next day, which is a partial reporting failure rather than a real unwind.</p>

```js
// Four dates come back with every single market row at exactly 0 open interest:
// 2026-07-17, 07-22, 07-23 and 07-24, on 1,012 / 56,132 / 220,210 / 911,855
// contracts of volume respectively. On every other date the rows are a mix of
// zero and positive, so a 100%-zero day is an upstream reporting gap, not a
// genuinely flat book. Derived from the data rather than hardcoded so a future
// gap is handled the same way.
const oiReported = daily.filter(d => (d.open_interest || 0) > 0);
const oiNotReported = daily.filter(d => !((d.open_interest || 0) > 0));
// 2026-08-02: 182,306 -> 14,614 (-92.0%) on the third-highest volume day in the
// file, back to 148,171 the next day. Annotated inline so it is not read as a
// real position unwind.
const oiCollapse = daily.filter(d => d.date.toISOString().slice(0, 10) === "2026-08-02");
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Open interest", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.ruleY([0]),
    Plot.dot(oiReported, {
      x: "date", y: "open_interest",
      r: 4, fill: UNDERDOG,
      tip: true,
      title: d => `${fmtDate(d.date)}\nOpen interest: ${fmtCount(d.open_interest || 0)}`
    }),
    // Explicit gap treatment: the old chart filtered these rows out entirely, so
    // four dates vanished and the series read as continuous across them.
    Plot.dot(oiNotReported, {
      x: "date", y: 0,
      r: 5, stroke: "#94A3B8", strokeWidth: 1.5, strokeDasharray: "2,2",
      tip: true,
      title: d => `${fmtDate(d.date)}\nOpen interest not reported\nEvery market row returned 0 on this date, on ${fmtCount(d.contracts)} contracts of traded volume.`
    }),
    Plot.dot(oiCollapse, {
      x: "date", y: "open_interest",
      r: 9, stroke: "#EF4444", strokeWidth: 1.5
    }),
    Plot.text(oiCollapse, {
      x: "date", y: "open_interest",
      text: () => "-92% vs prior day, recovered next day",
      dy: -16, textAnchor: "end", fontSize: 10, fill: "currentColor", fillOpacity: 0.75
    })
  ]
})
```

## Active markets

<p class="section-intro">Every Underdog market with reported volume or open interest.</p>

<div class="surface-card" style="overflow-x:auto">

```js
display((() => {
  const rows = market
    .filter(d => (d.trade_volume || 0) > 0 || (d.open_interest || 0) > 0)
    .sort((a, b) => d3.descending(a.trade_volume || 0, b.trade_volume || 0) || d3.descending(a.open_interest || 0, b.open_interest || 0))
    .slice(0, 20);
  return html`<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:0.9rem">
    <thead><tr style="border-bottom:2px solid var(--card-border)">
      <th style="text-align:left;padding:0.45rem 0.6rem">Date</th>
      <th style="text-align:left;padding:0.45rem 0.6rem">Symbol</th>
      <th style="text-align:left;padding:0.45rem 0.6rem">Category</th>
      <th style="text-align:left;padding:0.45rem 0.6rem">Type</th>
      <th style="text-align:right;padding:0.45rem 0.6rem">Volume</th>
      <th style="text-align:right;padding:0.45rem 0.6rem">Open interest</th>
      <th style="text-align:right;padding:0.45rem 0.6rem">Last</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => html`<tr style="border-bottom:1px solid var(--theme-background-alt)">
        <td style="text-align:left;padding:0.38rem 0.6rem;white-space:nowrap">${fmtDate(r.date)}</td>
        <td style="text-align:left;padding:0.38rem 0.6rem;white-space:nowrap">${r.symbol}</td>
        <td style="text-align:left;padding:0.38rem 0.6rem">${r.category}</td>
        <td style="text-align:left;padding:0.38rem 0.6rem">${r.market_type}</td>
        <td style="text-align:right;padding:0.38rem 0.6rem">${fmtCount(r.trade_volume || 0)}</td>
        <td style="text-align:right;padding:0.38rem 0.6rem">${fmtCount(r.open_interest || 0)}</td>
        <td style="text-align:right;padding:0.38rem 0.6rem">${fmtPrice(r.last_price)}</td>
      </tr>`)}
    </tbody>
  </table>`;
})());
```

</div>
