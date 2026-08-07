---
title: DKeX (DraftKings)
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DraftKings Exchange</div>
  <h1>DKeX (DraftKings)</h1>
  <p class="page-lead">DKeX is DraftKings' CFTC-regulated event-contract exchange, formerly Railbird. The public files are young and volume is still tiny next to Kalshi, but the reports include trade prints, daily market volume/open interest, and settlements.</p>
</div>

```js
const daily      = await FileAttachment("data/dkex_daily.csv").csv({typed: true});
const catDaily   = await FileAttachment("data/dkex_categories_daily.csv").csv({typed: true});
const split      = await FileAttachment("data/dkex_sports_split_daily.csv").csv({typed: true});
const market     = await FileAttachment("data/dkex_market_daily.csv").csv({typed: true});
const settlement = await FileAttachment("data/dkex_settlement_daily.csv").csv({typed: true});
const freshness  = await FileAttachment("data/freshness_manifest.json").json();
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
const DKEX = "#F97316";
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
  <p>DKeX volume is the sum of <code>Last Quantity</code> in the public time-and-sales files. Categories come from the report symbol prefix using the same style as the Polymarket US parsing; the league columns on <code>dkex_sports_split_daily.csv</code> break out MLB, NPB and KBO and roll every other league into "Other leagues", so the four always sum to the daily total. Market/open-interest rows come from the daily market report; the market table keeps rows with either trade volume or open interest. Settlement rows come from the daily settlement report.</p>
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
    Plot.ruleY([0])
  ]
})
```

## League mix

<p class="section-intro">Every symbol DKeX has listed since its first public file belongs to a sports league, so a sports-vs-non-sports split would be a flat line at 100% and is no longer shown. The cut that carries information is the league: MLB is the majority, but NPB (Japan) and KBO (Korea) together are about a third of the venue.</p>

```js
const brushLeague = view(makeBrush(split, DKEX));
```

```js
const [sL, eL] = brushLeague;
const splitFLeague = split.filter(d => d.date >= sL && d.date <= eL);
const LEAGUE_SERIES = [
  {key: "contracts_mlb", label: "MLB", color: DKEX},
  {key: "contracts_npb", label: "NPB (Japan)", color: "#00C2A8"},
  {key: "contracts_kbo", label: "KBO (Korea)", color: "#7C6CF0"},
  {key: "contracts_other_leagues", label: "Other leagues", color: "#94A3B8"}
];
const leagueOrder = LEAGUE_SERIES.map(s => s.label);
const tidyLeague = splitFLeague.flatMap(d => LEAGUE_SERIES.map(s => ({
  date: d.date, league: s.label, value: d[s.key] || 0
})));
const leagueTotals = LEAGUE_SERIES.map(s => ({label: s.label, value: d3.sum(splitFLeague, d => d[s.key] || 0)}));
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
  color: {legend: true, domain: leagueOrder, range: LEAGUE_SERIES.map(s => s.color)},
  marks: [
    Plot.areaY(tidyLeague, {
      x: "date", y: "value", fill: "league",
      order: leagueOrder.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(splitFLeague, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFLeague, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date)].concat(LEAGUE_SERIES.map(s => `${s.label}: ${fmtCount(d[s.key] || 0)}`)).join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

```js
display(leagueGrand
  ? html`<p class="section-intro">Share of the selected window: ${leagueTotals
      .map(t => `${t.label} ${(100 * t.value / leagueGrand).toFixed(1)}%`)
      .join(" / ")}. "Other leagues" is everything outside MLB, NPB and KBO - today NWSL, NASCAR and INDYCAR.</p>`
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
const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);
const catFiltered = catDailyF.filter(d => topCats.includes(d.category));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
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

## Open interest

<p class="section-intro">Open interest reported across active DKeX markets.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Open interest", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.lineY(daily, {
      x: "date", y: "open_interest",
      stroke: DKEX, strokeWidth: 2.25,
      curve: "monotone-x",
      tip: true,
      title: d => `${fmtDate(d.date)}\nOpen interest: ${fmtCount(d.open_interest || 0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Active markets

<p class="section-intro">Top DKeX markets with reported volume or open interest.</p>

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
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Settled contracts", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: ["Settled yes", "Settled no", "Voided ($0.50)", "Other"], range: ["#1a9641", "#d7191c", "#fdae61", "#9ca3af"]},
  marks: [
    Plot.rectY(settlementTidy, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: "count",
      fill: "outcome",
      tip: true,
      title: d => `${fmtDate(d.date)}\n${d.outcome}: ${fmtCount(d.count)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p class="section-intro">Share of each day&rsquo;s settlements that voided at $0.50. Spikes are postponement days &mdash; before this fix those legs were reported as wins.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 200,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Void rate", grid: true, zero: true, tickFormat: d => (100 * d).toFixed(0) + "%"},
  marks: [
    Plot.areaY(voidRate, {x: "date", y: "void_rate", fill: "#fdae61", fillOpacity: 0.3, curve: "monotone-x"}),
    Plot.lineY(voidRate, {x: "date", y: "void_rate", stroke: "#b45309", strokeWidth: 1.5, curve: "monotone-x"}),
    Plot.dot(voidRate, {
      x: "date",
      y: "void_rate",
      r: 2,
      fill: "#b45309",
      tip: true,
      title: d => fmtDate(d.date) + "\nVoid rate: " + fmtPct(d.void_rate)
    }),
    Plot.ruleY([0])
  ]
})
```
