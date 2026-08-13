---
title: ProphetX
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>ProphetX</h1>
  <p class="page-lead">A peer-to-peer sports exchange publishing a full time-and-sales tape. This page covers <strong>what trades there</strong> — daily contract volume and how much of it is parlays — from the tape itself rather than from the venue's own daily bulletin, for reasons set out below.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
// The reconciliation between the tape and the venue's bulletin is published rather than
// kept private, because the bulletin is the file a reader would otherwise cite.
const recon = await DataAttachment("data/prophetx_bulletin_daily.csv").csv({typed: true});
```

```js
const PX = "#DB2777";
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;

// The newest calendar date is only partly collected: a ProphetX session runs 16:30->16:30
// ET, so a date's post-16:30 trades arrive in the NEXT session file. Drawing it at full
// height beside complete days would read as a collapse in volume, so it is drawn but
// visually separated and excluded from every average quoted on this page.
const complete = daily.filter(d => d.complete === 1);
const partial = daily.filter(d => d.complete !== 1);
const totalContracts = d3.sum(complete, d => d.contracts);
const totalTrades = d3.sum(complete, d => d.trade_count);
const parlayContracts = d3.sum(complete, d => d.contracts_parlay);
const meanDaily = totalContracts / complete.length;
const usable = recon.filter(r => r.usable === 1).length;
```

<div class="instruction-line"><strong>Volume here comes from the trade tape, not from ProphetX's daily bulletin.</strong> The bulletin's own <code>daily_volume</code> column agrees with the tape on <strong>${usable} of ${recon.length}</strong> sessions. On the rest it stamps one aggregate figure across thousands of multi-event rows — on 2026-08-11 the single value 198,771.64 appears on 1,204 separate rows, pushing the bulletin to 362.7M contracts against a real 5.3M. Anyone quoting the bulletin's volume for this venue is quoting that artifact.</div>

<div class="grid grid-cols-4">
  <div class="card"><h2>Contracts traded</h2><span class="big">${fmtCount(totalContracts)}</span><span class="muted">${complete.length} complete days</span></div>
  <div class="card"><h2>Trades</h2><span class="big">${fmtCount(totalTrades)}</span><span class="muted">avg ${d3.format(",.0f")(totalContracts / totalTrades)} contracts each</span></div>
  <div class="card"><h2>Typical day</h2><span class="big">${fmtCount(meanDaily)}</span><span class="muted">contracts</span></div>
  <div class="card"><h2>Parlays</h2><span class="big">${(100 * parlayContracts / totalContracts).toFixed(1)}%</span><span class="muted">of volume, up to 12 legs</span></div>
</div>

## Daily volume

<div class="instruction-line">Calendar days, not the venue's trading sessions. A ProphetX session runs 16:30&ndash;16:30 ET, so its own session labels straddle two dates; using the execution timestamp instead keeps this series comparable with every other venue on the site. ${partial.length ? html`The final bar is <strong>still being collected</strong> and is drawn hollow.` : ""}</div>

```js
Plot.plot({
  width,
  height: 340,
  marginLeft: 62,
  marginBottom: 40,
  x: {label: null, type: "utc", ticks: 8, tickFormat: "%b %d"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount, zero: true},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(complete, {
      x: "date", y: "contracts", fill: PX, interval: "day",
      // 4px rounded data-end, 2px gap to the surface on each side
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.trade_count)} trades · avg ${d3.format(",.0f")(d.avg_trade_size)}\n${d3.format(",")(d.traded_markets)} markets traded\nparlays ${d.pct_parlay.toFixed(1)}%`,
      tip: true
    }),
    Plot.rectY(partial, {
      x: "date", y: "contracts", interval: "day",
      fill: "none", stroke: PX, strokeWidth: 2, strokeDasharray: "3,2",
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts so far — STILL COLLECTING\nthis date's post-16:30 ET trades arrive in the next session file`,
      tip: true
    })
  ]
})
```

## How much of it is parlays

<div class="instruction-line">ProphetX calls them multi-event contracts and lists them from 2 up to <strong>12</strong> legs. Parlay share is one of the few things measurable at every venue that runs them, so this sits alongside <a href="./parlay">Kalshi's parlay pages</a> without needing a settlement feed.</div>

```js
Plot.plot({
  width,
  height: 280,
  marginLeft: 52,
  marginBottom: 40,
  x: {label: null, type: "utc", ticks: 8, tickFormat: "%b %d"},
  y: {label: "Parlay share of volume (%)", grid: true, zero: true},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(complete, {x: "date", y: "pct_parlay", stroke: PX, strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(complete, {
      x: "date", y: "pct_parlay", fill: PX, r: 3.5,
      stroke: "var(--theme-background)", strokeWidth: 2,
      title: d => `${fmtDate(d.date)}\n${d.pct_parlay.toFixed(2)}% of volume is parlays\n${d3.format(",.0f")(d.contracts_parlay)} of ${d3.format(",.0f")(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleY([100 * parlayContracts / totalContracts], {stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1})
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Dashed line is the period average, ${(100 * parlayContracts / totalContracts).toFixed(2)}%.</div>

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Why not the bulletin.</strong> ProphetX publishes a daily bulletin with an <code>open_interest</code> and a <code>daily_volume</code> column, and it is the natural place to look. Its volume agrees with the trade tape on <strong>${usable} of ${recon.length}</strong> sessions. On the others it repeats one aggregate value across thousands of multi-event rows, taking multi-event contracts to ~98% of the day against a true 11&ndash;12% in the tape. The full session-by-session comparison is published as <code>prophetx_bulletin_daily.csv</code> rather than hidden, so the discrepancy can be checked rather than taken on trust.</p>
  <p><strong>The bulletin also lists every contract twice</strong>, once per side, carrying the same <code>daily_volume</code> on both rows. Summing its rows overstates volume by roughly 2.2&times; before the multi-event artifact is even considered. Deduplicate on <code>event_contract</code>.</p>
  <p><strong>No prices anywhere on this page, deliberately.</strong> Other venue pages here carry an average price and a dollar figure; ProphetX gets neither, because its price column does not survive inspection. Within a <em>single</em> contract id both selections trade at almost the same price — one tennis match shows both players near 0.90, one MMA fight shows both fighters near 0.03 — and across 110 two-sided full-game moneylines only 5 sum to within 0.02 of 1.00. No probability reading survives that, so nothing price-derived is published, and calibration, P&amp;L and volume-at-price are all deliberately absent until the convention is established from ProphetX's own specification. <strong>Contract counts are unaffected</strong> — they are a plain quantity sum, and they match the venue's own bulletin exactly on the one session where the bulletin is sane.</p>
  <p><strong>Sessions versus dates.</strong> ProphetX's <code>trade_date</code> field is a session label, not the date a trade happened: every row of the file for 13 August reads <code>2026-08-13 16:30:00</code> while its executions are all 12 August. This page keys on the execution timestamp. The cost is that a calendar date spans two session files, so the newest date is always partial — it is drawn hollow and excluded from the totals above.</p>
  <p><strong>Coverage.</strong> The tape is available from 2026-06-16; earlier dates return 403. There are no gaps in the ${recon.length} sessions since.</p>
</details>

## Every day

```js
Inputs.table(daily.slice().reverse(), {
  columns: ["date", "contracts", "trade_count", "avg_trade_size", "traded_markets", "pct_parlay", "complete"],
  header: {
    date: "Date", contracts: "Contracts", trade_count: "Trades",
    avg_trade_size: "Avg size", traded_markets: "Markets", pct_parlay: "Parlay %",
    complete: "Complete"
  },
  format: {
    date: fmtDate,
    contracts: d => d3.format(",.0f")(d),
    trade_count: d => d3.format(",")(d),
    avg_trade_size: d => d3.format(",.0f")(d),
    traded_markets: d => d3.format(",")(d),
    pct_parlay: d => `${d.toFixed(2)}%`,
    complete: d => d === 1 ? "yes" : html`<span style="color:var(--theme-foreground-muted)">collecting</span>`
  },
  align: {contracts: "right", trade_count: "right", avg_trade_size: "right", traded_markets: "right", pct_parlay: "right"},
  rows: 14
})
```
