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

## Calibration

<p class="section-intro">Do DKeX prices actually predict outcomes? Every settled print is grouped by the price paid and compared against how often that leg really won. The diagonal is perfect calibration.</p>

<details class="surface-card compact-details">
  <summary>How this is measured &mdash; read before drawing conclusions</summary>
  <p><strong>One game is one observation, not one per print.</strong> Thousands of prints on a single ball game all settle on the same result, so they carry nothing like a thousand times the information. Every error bar here is <strong>clustered on the event</strong> &mdash; the game or race, from field 4 of the DKeX symbol, which is shared across every market type and period on that game. A player prop and the moneyline on the same game go in the <em>same</em> cluster: correlated but not identical, so pooling them is the conservative choice. Clustering on event &times; market type instead moves the decile errors by under half a cent. Treating prints as independent would shrink these bars by roughly <strong>3&ndash;7&times;</strong> and manufacture significance the sample does not contain. Dot area is proportional to <strong>events</strong>, never trades.</p>
  <p><strong>Whose price.</strong> A binary has two legs. DKeX prints one price per row and the symbol names the specific leg &mdash; &ldquo;Over 1.5&rdquo;, one club, one driver &mdash; so the x-axis is that leg&rsquo;s own price and the win rate is that same leg&rsquo;s own settlement. DKeX publishes no aggressor flag, so a print is booked to the leg its symbol names; Kalshi bins the taker&rsquo;s own side, the one place the two series are not strictly identical.</p>
  <p><strong>Weighting.</strong> Contract-weighted, matching the series Kalshi&rsquo;s <a href="./calibration">calibration page</a> plots (<code>yes_contracts / n_contracts</code>): of every contract bought near 25&cent;, what share paid out. The trade-weighted rate ships in the same file.</p>
  <p><strong>Voids are excluded, and that exclusion is load-bearing.</strong> A refunded event has no outcome: both legs of a voided or postponed event settle at $0.50. Excluded before binning, <strong>as of 2026-08-07</strong>: <strong>3,941 void prints</strong> (665,501 contracts across 94 events), <strong>1,366 pro-rated partial prints</strong> (126,821 contracts across 48 events), and <strong>557 prints</strong> on markets that had not settled yet &mdash; 0.43% of the tape, almost all from the last three days. Those three counts are from that run's log and do not move with the chart; the prints, contracts and events below are read live from the file. Before the 2026-08-06 settlement fix, voids were scored as <em>wins</em>, which alone moved the 10&ndash;20&cent; band from &minus;0.18&cent; to +4.01&cent; and the cheapest band from +0.16&cent; to +0.80&cent;.</p>
</details>

```js
const calibDkex = await DataAttachment("data/dkex_calibration.csv").csv({typed: true});
```

```js
const calibWidth = view(Inputs.radio([10, 5], {
  label: "Price bins",
  value: 10,
  format: w => w === 10 ? "Deciles (10¢)" : "5¢ bins (Kalshi axis)"
}));
```

```js
// price_bin ships in INTEGER CENTS (0..95), the same axis as Kalshi's
// calibration_three_way.csv, so the two venues can be read side by side.
const calibRows = calibDkex
  .filter(d => +d.bin_width === +calibWidth)
  .sort((a, b) => +a.price_bin - +b.price_bin);
const calibClear = calibRows.filter(d => +d.clears_2se === 1);
const calibNoise = calibRows.filter(d => +d.clears_2se !== 1);
const calibMaxEvents = d3.max(calibRows, d => +d.n_events) ?? 0;
// n_events_total is constant across rows by construction: bins SHARE events, so
// summing n_events would multiple-count the same games many times over.
const calibEvents = +(calibRows[0]?.n_events_total ?? 0);

function calibTip(d) {
  const w = +d.bin_width;
  const e = 100 * +d.calib_error;
  return `${d.price_bin}–${+d.price_bin + w}¢\n`
    + `Actual: ${(100 * +d.actual_win_rate_wt).toFixed(2)}%\n`
    + `Implied: ${(100 * +d.implied_prob).toFixed(1)}%\n`
    + `Error: ${e >= 0 ? "+" : ""}${e.toFixed(2)}¢\n`
    + `Clustered SE: ${(100 * +d.se_clustered).toFixed(2)}¢  (|t| = ${(+d.t_stat).toFixed(2)})\n`
    + `Events: ${(+d.n_events).toLocaleString()}\n`
    + `Trades: ${(+d.n_trades).toLocaleString()}   Contracts: ${(+d.n_contracts).toLocaleString()}`;
}
```

<div class="instruction-line">
  <strong>${calibClear.length} of ${calibRows.length}</strong> price bins are distinguishable from perfect calibration at 2 event-clustered standard errors.
  Solid dots clear that bar; hollow dots do not, and should be read as <em>no measurable bias</em> rather than as a small one.
</div>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 430,
  marginLeft: 60,
  x: {label: "Price paid (implied probability)", domain: [0, 1], tickFormat: "%", grid: true},
  y: {label: "Actual win rate (contract-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  // Radius proportional to sqrt(n_events): an event is the unit of information
  // here. Sizing by trade count would inflate the busiest bins ~5x and imply a
  // precision the sample does not have.
  r: {type: "sqrt", domain: [0, calibMaxEvents], range: [0, 11]},
  marks: [
    Plot.line([{x: 0, y: 0}, {x: 1, y: 1}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeDasharray: "4,3", strokeWidth: 1.5
    }),
    // +/- 2 event-clustered SE. These are the point of the chart.
    Plot.ruleX(calibRows, {
      // A bin with fewer than two events writes an empty se, which types to null
      // and coerces to 0 -- a zero-length whisker reads as perfect precision.
      // NaN suppresses the mark instead. Unreachable on today's corpus.
      x: d => +d.n_events < 2 ? NaN : +d.implied_prob,
      y1: d => Math.max(0, +d.ci_low),
      y2: d => Math.min(1, +d.ci_high),
      stroke: d => +d.clears_2se === 1 ? DKEX : "var(--theme-foreground-fainter)",
      strokeWidth: d => +d.clears_2se === 1 ? 2 : 1.25,
      strokeLinecap: "round"
    }),
    Plot.dot(calibNoise, {
      x: d => +d.implied_prob, y: d => +d.actual_win_rate_wt, r: d => +d.n_events,
      fill: "none", stroke: "var(--theme-foreground-muted)", strokeWidth: 1.25,
      tip: true, title: calibTip
    }),
    Plot.dot(calibClear, {
      x: d => +d.implied_prob, y: d => +d.actual_win_rate_wt, r: d => +d.n_events,
      fill: DKEX, fillOpacity: 0.85, stroke: "var(--theme-background)", strokeWidth: 1,
      tip: true, title: calibTip
    })
  ]
})
```

<span style="color:${DKEX}">● Clears 2 clustered SE</span> &nbsp; <span style="color:var(--theme-foreground-muted)">○ Indistinguishable from calibrated</span> &nbsp; Bars are &plusmn;2 event-clustered SE &nbsp; Dot area &prop; events in the bin

<p class="section-intro">The same numbers as error, in cents. A bin whose interval crosses zero is not evidence of mispricing in either direction.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 60,
  x: {label: "Price paid (¢)", domain: [0, 100], grid: true},
  y: {label: "Calibration error (actual − implied, ¢)", grid: true},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1}),
    Plot.ruleX(calibRows, {
      // Same zero-length-whisker guard as the scatter above.
      x: d => +d.n_events < 2 ? NaN : +d.price_bin + +d.bin_width / 2,
      y1: d => 100 * (+d.calib_error - 2 * +d.se_clustered),
      y2: d => 100 * (+d.calib_error + 2 * +d.se_clustered),
      stroke: d => +d.clears_2se === 1 ? DKEX : "var(--theme-foreground-fainter)",
      strokeWidth: d => +d.clears_2se === 1 ? 2 : 1.25,
      strokeLinecap: "round"
    }),
    Plot.dot(calibNoise, {
      x: d => +d.price_bin + +d.bin_width / 2, y: d => 100 * +d.calib_error,
      r: 4, fill: "none", stroke: "var(--theme-foreground-muted)", strokeWidth: 1.25,
      tip: true, title: calibTip
    }),
    Plot.dot(calibClear, {
      x: d => +d.price_bin + +d.bin_width / 2, y: d => 100 * +d.calib_error,
      r: 4.5, fill: DKEX, tip: true, title: calibTip
    })
  ]
})
```

```js
const calibPrints = d3.sum(calibRows, d => +d.n_trades);
const calibContracts = d3.sum(calibRows, d => +d.n_contracts);
// Both sides contract-weighted, so the gap is coherent with the chart above.
const calibActual = d3.sum(calibRows, d => +d.yes_contracts) / calibContracts;
const calibPaid = d3.sum(calibRows, d => +d.sum_price_contracts) / calibContracts / 100;
const calibGap = 100 * (calibActual - calibPaid);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="dkex">
    <div class="kpi-label">Settled sample</div>
    <div class="kpi-value" title="${calibPrints.toLocaleString()} prints">${fmtCount(calibPrints)}</div>
    <div class="kpi-meta">prints &middot; ${fmtCount(calibContracts)} contracts</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Independent events</div>
    <div class="kpi-value">${calibEvents.toLocaleString()}</div>
    <div class="kpi-meta">games and races &mdash; the real sample size</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Overall gap</div>
    <div class="kpi-value">${(calibGap >= 0 ? "+" : "") + calibGap.toFixed(2)}&cent;</div>
    <div class="kpi-meta">${(100 * calibActual).toFixed(2)}% won vs ${(100 * calibPaid).toFixed(2)}&cent; paid</div>
  </div>
</div>

<div class="instruction-line"><strong>How to read this:</strong> across ${calibEvents.toLocaleString()} settled events DKeX prices land close to outcomes, and the honest summary is that <em>no price band shows a bias this sample can measure</em>. The tails lean the textbook way &mdash; cheap contracts a little rich, favourites a little cheap &mdash; but each of those gaps sits inside its own error bar. Switching to 5&cent; bins puts one or two bands across the line, which is about what twenty draws produce by chance; treat them as noise unless they persist as the sample grows.</div>

## Individual markets

<p class="section-intro">DKeX's individual markets, ranked by volume and searchable by club, driver or player. These names are <strong>composed</strong>: DKeX publishes an English name for each <em>outcome</em> in its settlement report but never for the market, so each title here is built from that published text plus the market type and the published settlement date.</p>

<p class="chart-note">A blank winner is not missing data. A total or handicap ladder settles several rungs at 1.00 at the same time, a voided game settles both legs at 0.50 as a refund, and an open market has not settled at all — so the column is filled only where exactly one outcome settled at 1.00, which is about 47% of rows. The date in each name is the <em>settlement</em> date from the settlement report, not the maturity stamped in the market report: DKeX gives races a placeholder maturity, and every race in a season can share one.</p>
<p class="chart-note">Fees are the taker-side number, for comparability with Kalshi. DKeX bills the resting side too, at $0.0025 per contract — as do ForecastEx, Crypto.com/Nadex, Rothera and Underdog Exchange; <strong>Kalshi is the one venue here that bills a single side</strong>. What DKeX itself keeps is about a quarter more than this column shows.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/dkex_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
```

```js
display(marketLeaderboard({
  hashPrefix: "dklb",
  venues: [{spec: LB_VENUES.dkex, rows: normalizeLeaderboard("dkex", lbRows)}]
}));
```
