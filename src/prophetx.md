---
title: ProphetX
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>ProphetX</h1>
  <p class="page-lead">A peer-to-peer sports exchange publishing a full time-and-sales tape. This page covers <strong>what trades there</strong> — daily contract volume, how much of it is parlays, and on single markets <strong>whether those prices come true</strong>.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
// The reconciliation between the tape and the venue's bulletin is published rather than
// kept private, because the bulletin is the file a reader would otherwise cite.
const recon = await DataAttachment("data/prophetx_bulletin_daily.csv").csv({typed: true});
// Individual fixtures, parsed out of the tape's contract_description. Loaded defensively
// because it is the newest file of the set and the DEPLOYED allowlist, not the repository
// one, decides what is actually served.
const pxGames = await (async () => {
  try {
    return await DataAttachment("data/prophetx_game_leaderboard.csv").csv({typed: true});
  } catch (error) {
    console.warn(`prophetx games: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
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
const pxBrushSeries = daily.map(d => ({date: d.date, value: d.contracts})).sort((a, b) => a.date - b.date);
const pxDateSel = Mutable([d3.min(pxBrushSeries, d => d.date), d3.max(pxBrushSeries, d => d.date)]);
display(renderDateBrush({
  data: pxBrushSeries,
  initialRange: [d3.min(pxBrushSeries, d => d.date), d3.max(pxBrushSeries, d => d.date)],
  onSelect: range => { pxDateSel.value = range; },
  color: PX,
  width
}));
```

```js
const [pxBrushFrom, pxBrushTo] = pxDateSel;
const completeBrushed = complete.filter(d => d.date >= pxBrushFrom && d.date <= pxBrushTo);
const partialBrushed = partial.filter(d => d.date >= pxBrushFrom && d.date <= pxBrushTo);
```

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
    Plot.rectY(completeBrushed, {
      x: "date", y: "contracts", fill: PX, interval: "day",
      // 4px rounded data-end, 2px gap to the surface on each side
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.trade_count)} trades · avg ${d3.format(",.0f")(d.avg_trade_size)}\n${d3.format(",")(d.traded_markets)} markets traded\nparlays ${d.pct_parlay.toFixed(1)}%`,
      tip: true
    }),
    Plot.rectY(partialBrushed, {
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
    Plot.line(completeBrushed, {x: "date", y: "pct_parlay", stroke: PX, strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(completeBrushed, {
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

```js
const vap = await DataAttachment("data/prophetx_volume_at_price.csv").csv({typed: true});
const calib = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
const plegs = await DataAttachment("data/prophetx_parlay_legs.csv").csv({typed: true});
```

## Biggest games by volume

<div class="instruction-line">Parlays and tournament outrights are left out because neither belongs to a single game; what remains is 77% of the tape.</div>

```js
// ProphetX names the fixture in every contract_description as
// "AWAY @ HOME, LEAGUE, START ET - MARKET: SELECTION", and it parses on the whole tape
// with no exceptions, so the board is a census rather than a sample. Keyed on the
// scheduled start as well as the teams, because a series repeats the same pairing.
const pxGameVol = pxGames
  .filter(d => d.game && +d.contracts > 0)
  .sort((a, b) => +b.contracts - +a.contracts);
```

```js
const pxGameSearch = view(Inputs.search(pxGameVol, {placeholder: "Search team, league or sport…"}));
```

```js
display(pxGameVol.length
  ? Inputs.table(pxGameSearch, {
      columns: ["game", "game_date", "league", "sport", "contracts", "trades"],
      header: {game: "Game", game_date: "Date", league: "League", sport: "Sport", contracts: "Contracts", trades: "Trades"},
      format: {game_date: d => fmtDate(d), contracts: d => fmtCount(+d), trades: d => d3.format(",")(+d)},
      align: {contracts: "right", trades: "right"},
      width: {game: 240}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The named-game series is not being served yet, so this table is empty; nothing else on the page depends on it.</div>`);
```

## What trades there

<div class="instruction-line">One row per league and contract type; parlays are a single row because they span games.</div>

```js
// The board above says which GAMES traded; this one says what KIND of bet did, which is the
// question Novig's page answers with MLB-MONEY / MLB-TOTAL. ProphetX names the market in
// every contract_description, so the types are the venue's own words, not a mapping.
// Loaded here rather than in the shared block above because the chatbot's catalog credits a
// series to the heading nearest its LOAD; parked upstream it gets filed under the parlay
// section, as prophetx_volume_at_price already is. Defensive for the same reason as the
// game board: the DEPLOYED allowlist, not the repository one, decides what is served.
const pxTypes = await (async () => {
  try {
    return await DataAttachment("data/prophetx_market_leaderboard.csv").csv({typed: true});
  } catch (error) {
    console.warn(`prophetx types: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
const pxTypeVol = pxTypes
  .filter(d => d.market_name && +d.contracts > 0)
  .sort((a, b) => +b.contracts - +a.contracts);
```

```js
const pxTypeSearch = view(Inputs.search(pxTypeVol, {placeholder: "Search contract type or league\u2026"}));
```

```js
display(pxTypeVol.length
  ? Inputs.table(pxTypeSearch, {
      columns: ["market_name", "category", "n_outcomes", "contracts", "last_trade_date"],
      header: {market_name: "Contract type", category: "League", n_outcomes: "Markets", contracts: "Contracts", last_trade_date: "Last trade"},
      format: {contracts: d => fmtCount(+d), n_outcomes: d => d3.format(",")(+d), last_trade_date: d => fmtDate(d)},
      align: {contracts: "right", n_outcomes: "right"},
      width: {market_name: 260}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The contract-type series is not being served yet, so this table is empty; nothing else on the page depends on it.</div>`);
```

## Where the volume sits on the probability axis

```js
Plot.plot({
  width,
  height: 320,
  marginLeft: 62,
  marginBottom: 40,
  x: {label: "Home side's price (¢)", domain: [0, 100], grid: true},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(vap, {
      x1: d => d.price_bin, x2: d => d.price_bin + 5, y: "n_contracts",
      fill: PX, ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${d.price_bin}–${d.price_bin + 5}¢\n${d3.format(",.0f")(d.n_contracts)} contracts (${d.pct_contracts.toFixed(1)}%)\n${d3.format(",")(d.n_trades)} trades\n$${d3.format(",.0f")(d.dollars)}`,
      tip: true
    })
  ]
})
```

<div hidden>

## Do those prices come true? (legacy duplicate)

<p class="section-intro">Every single-market contract that has finished is joined back to the prices actually paid for it on the tape, and the two are compared. The diagonal is perfect calibration. Parlays are excluded from this section and cannot be added &mdash; the reason is set out below.</p>

```js
const calBins = calib
  .filter(d => d.group === "ALL" && +d.bin_width === 10)
  .map(d => {
    const contracts = +d.n_contracts;
    const spc = +d.sum_price_contracts;
    const paid = spc / contracts / 100;
    const wt = +d.actual_win_rate_wt;
    // An empty se_clustered types to null and would coerce to 0 -- a zero-length
    // whisker reads as perfect precision. Keep it NaN so the mark is suppressed.
    const se = (d.se_clustered == null || d.se_clustered === "") ? NaN : +d.se_clustered;
    return {
      bin: +d.price_bin, width: +d.bin_width,
      band: `${+d.price_bin}\u2013${+d.price_bin + +d.bin_width}\u00a2`,
      contracts, spc, paid, wt,
      yesc: +d.yes_contracts,
      trades: +d.n_trades, fixtures: +d.n_events, se,
      errMid: +d.calib_error, tMid: +d.t_stat, clearsMid: +d.clears_2se === 1,
      errPaid: wt - paid,
      tPaid: se > 0 ? Math.abs(wt - paid) / se : NaN
    };
  })
  .sort((a, b) => a.bin - b.bin);

// Everything below is read live from the file rather than typed in.
const calContracts = d3.sum(calBins, d => d.contracts);
const calTrades = d3.sum(calBins, d => d.trades);
const calPaid = d3.sum(calBins, d => d.spc) / calContracts / 100;
const calWin = d3.sum(calBins, d => d.yesc) / calContracts;
const calTilt = calWin - calPaid;
// n_events_total is constant across the group's rows by construction: bins SHARE
// fixtures, so summing n_events would count the same game up to ten times.
const calFixtures = +calib.find(d => d.group === "ALL" && +d.bin_width === 10).n_events_total;
const calMaxFixtures = d3.max(calBins, d => d.fixtures);
const calClearMid = calBins.filter(d => d.clearsMid).length;
const calClearPaid = calBins.filter(d => d.tPaid >= 2).length;
const calCheapest = calBins[0];
const calBusiest = calBins.reduce((a, b) => b.fixtures > a.fixtures ? b : a);
const calThinnest = calBins.reduce((a, b) => b.fixtures < a.fixtures ? b : a);
// Single-market volume on the whole tape, for the coverage share. Both sums run
// over EVERY day including the partial one, because the calibration join does too.
const calParlayTape = d3.sum(daily, d => d.contracts_parlay);
const calParlayTapeLabel = d3.format(",.0f")(calParlayTape);
const calSingleTape = d3.sum(daily, d => d.contracts) - calParlayTape;

function calTip(d) {
  const s = v => `${v >= 0 ? "+" : "\u2212"}${Math.abs(100 * v).toFixed(2)}\u00a2`;
  return `${d.band} band\n`
    + `Mean price PAID: ${(100 * d.paid).toFixed(2)}\u00a2   (band midpoint ${d.bin + d.width / 2}\u00a2)\n`
    + `Won: ${(100 * d.wt).toFixed(2)}% of contracts\n`
    + `Error vs price paid: ${s(d.errPaid)}  (|t| = ${d.tPaid.toFixed(2)})\n`
    + `Error vs midpoint:   ${s(d.errMid)}  (|t| = ${d.tMid.toFixed(2)})\n`
    + `Clustered SE: ${(100 * d.se).toFixed(2)}\u00a2\n`
    + `Fixtures: ${d.fixtures.toLocaleString()}   Trades: ${d.trades.toLocaleString()}\n`
    + `Contracts: ${d3.format(",.0f")(d.contracts)}`;
}
```

<div class="instruction-line"><strong>ProphetX single markets show no measurable bias.</strong> Across <strong>${calFixtures.toLocaleString()}</strong> fixtures the priced side won <strong>${(100 * calWin).toFixed(2)}%</strong> of contracts against a mean price paid of <strong>${(100 * calPaid).toFixed(2)}&cent;</strong> &mdash; a tilt of <strong>${calTilt < 0 ? "&minus;" : "+"}${Math.abs(100 * calTilt).toFixed(2)}&cent;</strong> against the priced side. The fixture-clustered standard error on that tilt is <strong>0.79&cent;</strong>, so <strong>t&nbsp;=&nbsp;1.50</strong>: it does not clear two standard errors. The honest headline is <em>no measurable bias</em> &mdash; not a number. The tilt, win rate and price above are computed live from the file; the whole-sample standard error is not a column in it and is quoted from the build that also wrote the per-band errors below.</div>

<details class="surface-card compact-details">
  <summary>How this is measured &mdash; read before quoting any of it</summary>
  <p><strong>The reference price is the price actually paid, not the band midpoint.</strong> That single choice decides the answer. The published <code>calib_error</code> column measures each band against its midpoint, which is the convention the other venue calibration files on this site use and is kept here so the files stay comparable &mdash; but in the tails the midpoint is nowhere near what anyone paid. Everything plotted and quoted in this section instead uses <code>sum_price_contracts / n_contracts</code>, the contract-weighted mean price actually paid in the band. Against the midpoint, <strong>${calClearMid} of ${calBins.length}</strong> bands clear two standard errors; against the price paid, <strong>${calClearPaid} of ${calBins.length}</strong> do. A chart or a sentence built on <code>calib_error</code> or <code>clears_2se</code> alone will claim a miscalibration this data does not support.</p>
  <p><strong>One fixture is one observation.</strong> ${calTrades.toLocaleString()} prints sit on only ${calFixtures.toLocaleString()} fixtures &mdash; about ${Math.round(calTrades / calFixtures)} prints per game &mdash; and every print on a game shares that game's single outcome. Every error bar here is clustered on the fixture, and the fixture is taken from the event <em>description</em>, not the contract id: a player prop is keyed on the player, so id-based clustering would split a game's props away from its own moneyline and understate the error. Golf outrights cluster on the tournament, which is the conservative reading &mdash; one field is one observation, not 150. Treating prints as independent would shrink these bars by roughly the square root of ${Math.round(calTrades / calFixtures)} &mdash; about ${Math.round(Math.sqrt(calTrades / calFixtures))}&times; &mdash; and make every band look decisive.</p>
  <p><strong>Whose calibration this is.</strong> ProphetX publishes <strong>no aggressor flag</strong>: the tape records that a trade happened at a price, not who crossed the spread. This is therefore <em>not</em> a taker curve and must not be described as one. It is the <strong>priced side</strong> &mdash; the second-named side after the &ldquo;@&rdquo;, i.e. the home side, which is the only side the venue quotes. The counterparty holds the mirror image: it paid ${(100 * (1 - calPaid)).toFixed(2)}&cent; and won ${(100 * (1 - calWin)).toFixed(2)}% of contracts, the same ${Math.abs(100 * calTilt).toFixed(2)}&cent; the other way. Where <a href="./calibration">Kalshi's calibration</a> bins the taker's own side, this bins a fixed side of the market; the two are not the same statistic and should not be differenced.</p>
  <p><strong>When a contract counts as finished.</strong> It has dropped out of the bulletin, its last session is on or after its event date, and its terminal mark is exactly 0 or 1. Under a stricter rule &mdash; only marks seen on a session strictly <em>after</em> the event date &mdash; the sample falls to 51,554 contracts on 1,400 fixtures, a different population, and the tilt moves to &minus;1.28&cent; on a standard error of 0.89&cent;, t&nbsp;=&nbsp;1.45. Both rules give the same answer: short of two standard errors.</p>
  <p><strong>What is covered and what is left out.</strong> Of the <strong>78,193</strong> single-market contracts the bulletin has ever listed, <strong>63,915</strong> finished and can be scored, <strong>11,536</strong> voided or pushed, and <strong>2,742</strong> were still listed on the newest session &mdash; the three add to the whole, with nothing unaccounted for. On the tape that scores <strong>${calTrades.toLocaleString()} prints</strong> and <strong>${d3.format(",.0f")(calContracts)} contracts</strong>, or <strong>${(100 * calContracts / calSingleTape).toFixed(1)}%</strong> of all single-market contract volume. The remainder is named rather than quietly dropped: 193,271 prints (46,870,059 contracts) on contracts that had not resolved by the newest session, 657 prints (299,364 contracts) on contracts the bulletin has never listed at all, and 102 prints (350,066 contracts) priced off the 0&ndash;99&cent; scale. Those four figures add back to the single-market tape total exactly.</p>
  <p><strong>Read the tails with the fixture count.</strong> The ${calThinnest.band} band rests on ${calThinnest.fixtures.toLocaleString()} fixtures against ${calBusiest.fixtures.toLocaleString()} in the ${calBusiest.band} band, and its error bar is correspondingly the widest on the chart &mdash; ${(100 * calThinnest.se).toFixed(2)}&cent; against ${(100 * calBusiest.se).toFixed(2)}&cent;. The tails are thin, not anomalous. They are also the bins whose sample is most conditioned &mdash; but not by the product this paragraph used to name. Recounted from the raw tape on 2026-08-14, contract-weighted (each contract placed in the band of the contract-weighted mean price paid for it, then weighted by the contracts traded on it): void or pushed contracts are <strong>24.5%</strong> of the volume in the 0&ndash;10&cent; band that either resolved or voided, and <strong>22.9%</strong> of it in the 90&ndash;100&cent; band, against 9.8&ndash;19.9% across the middle of the book. The two ends void for different reasons and player props are neither. <strong>93.0%</strong> of the voided volume under 10&cent; is golf outrights &mdash; whole tournament fields, where one withdrawal voids that player's contract &mdash; against 5.4% player props; at 90&cent; and above it is 59.6% moneylines, 20.4% totals and 19.1% spreads, with props under 1%. The spike is basis-dependent as well: counted one contract id at a time instead of by contracts traded, those two bands void at 18.1% and 13.5% against 13.5&ndash;15.7% through the middle, so most of what looks like a tail spike is a few very large golf fields. Voided contracts are excluded before binning on either basis. The <a href="./calibration-venues">cross-venue calibration page</a> reports the same finding.</p>
  <p><strong>Parlays are not in this section and cannot be added.</strong> Not one of the 80,543 distinct multi-event contracts in the bulletin carries a parseable event date, so the maturity test that makes single markets safe cannot be applied to a parlay at all; and of the 79,279 that do reach a terminal mark of exactly 0 or 1, <strong>94.92%</strong> mark to <code>1</code> &mdash; which cannot be a win rate for a product running to twelve legs, so those marks are not outcomes. ${calParlayTapeLabel} parlay contracts on the tape are therefore outside every number in this section, and no amount of extra collection changes that: the missing field is in the venue's own bulletin.</p>
  <p><strong>P&amp;L: derivable, not built.</strong> The same join produces a per-contract profit and loss, because a settled outcome and a traded price are all it needs. It has not been built: the pipeline DOES produce prophetx_pnl.csv, but it is deliberately unpublished: with no aggressor flag the series measures price bias rather than taker P&amp;L, so it was pulled from the cross-venue page and no P&amp;L figure is drawn or quoted here. Do not read one off the tilt above &mdash; that tilt does not clear its own error bar, so multiplying it by volume would put a dollar sign on noise.</p>
</details>

```js
false ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 430,
  marginLeft: 62,
  marginBottom: 44,
  x: {label: "Mean price actually paid in the band (\u00a2)", domain: [0, 100], grid: true},
  y: {label: "Share of contracts that won (%)", domain: [0, 100], grid: true},
  // Radius on sqrt(fixtures): the fixture is the unit of information here. Sizing
  // by trades would inflate the busiest band ~70x and imply precision that is not there.
  r: {type: "sqrt", domain: [0, calMaxFixtures], range: [0, 11]},
  marks: [
    Plot.line([{x: 0, y: 0}, {x: 100, y: 100}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeDasharray: "4,3", strokeWidth: 1.5
    }),
    Plot.ruleX(calBins, {
      x: d => (d.fixtures < 2 || !(d.se > 0)) ? NaN : 100 * d.paid,
      y1: d => Math.max(0, 100 * (d.wt - 2 * d.se)),
      y2: d => Math.min(100, 100 * (d.wt + 2 * d.se)),
      stroke: d => d.tPaid >= 2 ? PX : "var(--theme-foreground-fainter)",
      strokeWidth: d => d.tPaid >= 2 ? 2 : 1.5,
      strokeLinecap: "round"
    }),
    Plot.dot(calBins.filter(d => !(d.tPaid >= 2)), {
      x: d => 100 * d.paid, y: d => 100 * d.wt, r: "fixtures",
      fill: PX, fillOpacity: 0.9, stroke: "var(--theme-background)", strokeWidth: 1.6,
      tip: true, title: calTip
    }),
    Plot.dot(calBins.filter(d => d.tPaid >= 2), {
      x: d => 100 * d.paid, y: d => 100 * d.wt, r: "fixtures",
      fill: PX, fillOpacity: 1, stroke: "var(--theme-foreground)", strokeWidth: 2,
      tip: true, title: calTip
    })
  ]
}) : null
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><span style="color:${PX}">&#9679;</span> One 5-cent price bin. Every bin is drawn identically &mdash; the interval around it, not the fill, says how precisely it is measured.</div>

<div class="instruction-line"><strong>Why the x-axis is the price paid and not the band midpoint.</strong> In the ${calCheapest.band} band the mean price actually paid is <strong>${(100 * calCheapest.paid).toFixed(2)}&cent;</strong>, nowhere near the ${calCheapest.bin + calCheapest.width / 2}&cent; midpoint, because that band is mostly longshots trading at two and three cents. Measured against the midpoint that band looks ${Math.abs(100 * calCheapest.errMid).toFixed(2)}&cent; mispriced at t&nbsp;=&nbsp;${calCheapest.tMid.toFixed(2)}; measured against what was actually paid it is ${Math.abs(100 * calCheapest.errPaid).toFixed(2)}&cent; at t&nbsp;=&nbsp;${calCheapest.tPaid.toFixed(2)}. Across all ${calBins.length} bands: <strong>${calClearMid}</strong> clear two standard errors against the midpoint, <strong>${calClearPaid}</strong> against the price paid. That gap is the binning convention, not miscalibration.</div>

<p class="section-intro">All ${calBins.length} bands, both readings side by side. <code>err_mid</code> is the published <code>calib_error</code> column, measured against the band midpoint; <code>err_paid</code> is the same win rate measured against the price actually paid. The fixture-clustered standard error applies to both, which is why the two <code>|t|</code> columns can disagree so sharply.</p>

```js
false ? Inputs.table(calBins, {
  columns: ["band", "fixtures", "trades", "contracts", "paid", "wt", "errMid", "tMid", "errPaid", "tPaid"],
  header: {
    band: "Band", fixtures: "Fixtures", trades: "Trades", contracts: "Contracts",
    paid: "Price paid", wt: "Won", errMid: "err_mid", tMid: "|t| mid",
    errPaid: "err_paid", tPaid: "|t| paid"
  },
  format: {
    fixtures: d => d3.format(",")(d),
    trades: d => d3.format(",")(d),
    contracts: d => d3.format(",.0f")(d),
    paid: d => `${(100 * d).toFixed(2)}\u00a2`,
    wt: d => `${(100 * d).toFixed(2)}%`,
    errMid: d => `${d >= 0 ? "+" : "\u2212"}${Math.abs(100 * d).toFixed(2)}\u00a2`,
    tMid: d => d.toFixed(2),
    errPaid: d => `${d >= 0 ? "+" : "\u2212"}${Math.abs(100 * d).toFixed(2)}\u00a2`,
    tPaid: d => d.toFixed(2)
  },
  align: {
    fixtures: "right", trades: "right", contracts: "right", paid: "right",
    wt: "right", errMid: "right", tMid: "right", errPaid: "right", tPaid: "right"
  },
  rows: 10
}) : null
```
</div>

## Do those prices come true?

<p class="section-intro">ProphetX single-market calibration is now shown in the shared Accuracy &amp; Outcomes view. Parlays remain excluded because the published data does not support defensible parlay outcomes.</p>

<a class="destination-card" href="./compare-accuracy"><strong>View ProphetX in Accuracy &amp; Outcomes</strong><span>Compare calibration error and actual versus implied results using one consistent presentation.</span></a>

## Parlays by leg count

<div class="instruction-line">ProphetX calls them multi-event contracts. They run from 2 legs to <strong>12</strong>, and shorter parlays dominate &mdash; but the tail is real, and a 12-leg ticket is a very different product from a 2-leg one.</div>

```js
Plot.plot({
  width,
  height: 300,
  marginLeft: 62,
  marginBottom: 44,
  x: {label: "Legs", type: "band", tickFormat: d => `${d}`},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(plegs, {
      x: "legs", y: "contracts", fill: PX, ry2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.legs}-leg parlays\n${d3.format(",.0f")(d.contracts)} contracts (${d.pct_of_parlay_volume.toFixed(1)}% of parlay volume)\n${d3.format(",")(d.trades)} trades`,
      tip: true
    })
  ]
})
```
