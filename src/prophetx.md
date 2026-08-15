---
title: ProphetX
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>ProphetX</h1>
  <p class="page-lead">A peer-to-peer sports exchange publishing a full time-and-sales tape. This page covers <strong>what trades there</strong> — daily contract volume, how much of it is parlays, and on single markets <strong>whether those prices come true</strong> — volume from the tape rather than from the venue's own daily bulletin, for the reason set out below, and outcomes from that bulletin, because its settlement column is the only place this venue publishes a result. The rule for reading that column &mdash; a mark on a contract still listed is a daily mark, not an outcome &mdash; is set out with the calibration.</p>
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

<div class="instruction-line" style="border-left-color:#DB2777"><strong>What ProphetX charges, and why no fee figure appears anywhere on this site.</strong> Its published schedule is <strong>2% of net gains per market</strong> on straight trades and <strong>0% on parlays</strong> (Trading Fees v1.0, 10 June 2026, covering this entire tape). That is a commission on <em>winnings</em>, not a per-contract charge, so computing it needs each user’s wins netted against their losses inside one market — and this tape is anonymous. The rate is documented; a fee series is not derivable, and applying 2% to volume would overstate it by roughly an order of magnitude, since net gains are a small fraction of turnover. ProphetX is therefore absent from every fee chart on the site, and that absence means <em>not measurable</em>, never <em>free</em>.</div>

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Why not the bulletin.</strong> ProphetX publishes a daily bulletin with an <code>open_interest</code> and a <code>daily_volume</code> column, and it is the natural place to look. Its volume agrees with the trade tape on <strong>${usable} of ${recon.length}</strong> sessions. On the others it repeats one aggregate value across thousands of multi-event rows, taking multi-event contracts to ~98% of the day against a true 11&ndash;12% in the tape. The full session-by-session comparison is published as <code>prophetx_bulletin_daily.csv</code> rather than hidden, so the discrepancy can be checked rather than taken on trust.</p>
  <p><strong>The bulletin repeats some contracts across rows</strong>, so deduplicate on <code>event_contract</code> before summing anything. Measured over all 60 sessions on disk (recount 2026-08-14): 35.7% of contract-sessions appear twice, 62.7% appear once, and the rest three to six times &mdash; so <em>every contract is listed twice</em> would be wrong. Deduplicating changes the volume total by <strong>1.013&times;</strong> in aggregate, though the effect is far larger on individual sessions, which is how an earlier single-session reading of 2.2&times; came to be quoted here as a property of the whole feed.</p>
  <p><strong>What the price means — solved.</strong> ProphetX publishes ONE price per market, and it is the probability of the <strong>second-named side</strong>: the team or player after the “@”, i.e. the home side. One number describes both sides, so the away side is simply one minus it. The confirmation is tennis: across 1,244 tennis matches, where “A @ B” is an arbitrary ordering and there is no home advantage, the mean market price is <strong>0.5026</strong> — dead on a coin flip. Every other sport sits above it, ordered by how much home advantage that sport really has: baseball 0.5248 (MLB home teams win about 54%), basketball 0.5330, MMA 0.5417, soccer 0.5922. That ordering is not something a meaningless number could produce.</p>
  <p>This resolves what earlier looked impossible. A top-five player against a wildcard printed every trade between 10¢ and 15¢, which read as “both players at 14%” and cannot be true — but as P(home) it is simply the wildcard at 14% and the favourite at 86%, which is exactly right. The per-trade selection label is <em>not</em> the priced side and must not be used as one; the fixture ordering is.</p>
  <p><strong>Outcomes: single markets yes, parlays no.</strong> This page used to say the bulletin&rsquo;s <code>settlement_price</code> records only that a contract resolved, never which side won, and that calibration and P&amp;L were therefore unavailable. That holds for <strong>parlays</strong> and is wrong for single markets, and the pooled test that produced it was dominated by parlays. Not one of the <strong>80,543</strong> distinct multi-event contracts in the bulletin carries a parseable event date, so the maturity rule that makes single markets safe cannot be applied to a parlay at all, and of the 79,279 that do reach a terminal mark of exactly 0 or 1, <strong>94.92%</strong> mark to <code>1</code> &mdash; an impossible win rate for a product that runs to twelve legs, so those marks are not outcomes. Parlays also crowd the cheap end of the book, which is exactly where the old test was run: recounted from the raw tape on 2026-08-14, of the <strong>16,760</strong> contracts whose contract-weighted mean traded price was 5&cent; or below and whose last bulletin mark is exactly 0 or 1, <strong>15,830 are parlays</strong> &mdash; 94.5% of that pool &mdash; and pooled they mark to 1 <strong>86.76%</strong> of the time, the parlays alone 91.82%. Run the identical test on single markets and the column separates almost perfectly: <strong>930</strong> singles, of which <strong>six</strong> marked to 1, <strong>0.65%</strong>. Those are the same six contracts under every contract-weighted variant tried &mdash; under-5&cent; or 5&cent;-and-under, raw or whole-cent prices, with or without the requirement that the contract has stopped being listed &mdash; and only the denominator moves, 782 to 930, so the rate stays between 0.65% and 0.77%. The basis matters more than the decimal here, which is why it is stated. Single-market calibration is therefore published in the calibration section further down this page. <strong>Parlay outcomes remain underivable</strong>: parlay calibration and parlay P&amp;L cannot be built at all, and the ${calParlayTapeLabel} parlay contracts on the tape sit outside every number in that section. Volume is unaffected throughout &mdash; it is a plain quantity sum that matches the venue&rsquo;s own bulletin exactly on the one session where the bulletin is sane.</p>
  <p><strong>Sessions versus dates.</strong> ProphetX's <code>trade_date</code> field is a session label, not the date a trade happened: every row of the file for 13 August reads <code>2026-08-13 16:30:00</code> while its executions are all 12 August. This page keys on the execution timestamp. The cost is that a calendar date spans two session files, so the newest date is always partial — it is drawn hollow and excluded from the totals above.</p>
  <p><strong>Coverage.</strong> The tape is available from 2026-06-16; earlier dates return 403. There are no gaps in the ${recon.length} sessions since.</p>
</details>



```js
const vap = await DataAttachment("data/prophetx_volume_at_price.csv").csv({typed: true});
const calib = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
const plegs = await DataAttachment("data/prophetx_parlay_legs.csv").csv({typed: true});
```

## Where the volume sits on the probability axis

<div class="instruction-line">Contracts traded by price, on the home side. Every trade also has an away side at one minus this price, so counting both would double the venue &mdash; one side per trade is what the other venue pages here show too.</div>

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

## Do those prices come true?

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
  <p><strong>P&amp;L: derivable, not built.</strong> The same join produces a per-contract profit and loss, because a settled outcome and a traded price are all it needs. It has not been built: nothing in the pipeline produces a ProphetX P&amp;L series, and no P&amp;L figure is drawn or quoted on this page. Do not read one off the tilt above &mdash; that tilt does not clear its own error bar, so multiplying it by volume would put a dollar sign on noise.</p>
</details>

```js
Plot.plot({
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
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><span style="color:${PX}">&#9679;</span> One 5-cent price bin. Every bin is drawn identically &mdash; the interval around it, not the fill, says how precisely it is measured.</div>

<div class="instruction-line"><strong>Why the x-axis is the price paid and not the band midpoint.</strong> In the ${calCheapest.band} band the mean price actually paid is <strong>${(100 * calCheapest.paid).toFixed(2)}&cent;</strong>, nowhere near the ${calCheapest.bin + calCheapest.width / 2}&cent; midpoint, because that band is mostly longshots trading at two and three cents. Measured against the midpoint that band looks ${Math.abs(100 * calCheapest.errMid).toFixed(2)}&cent; mispriced at t&nbsp;=&nbsp;${calCheapest.tMid.toFixed(2)}; measured against what was actually paid it is ${Math.abs(100 * calCheapest.errPaid).toFixed(2)}&cent; at t&nbsp;=&nbsp;${calCheapest.tPaid.toFixed(2)}. Across all ${calBins.length} bands: <strong>${calClearMid}</strong> clear two standard errors against the midpoint, <strong>${calClearPaid}</strong> against the price paid. That gap is the binning convention, not miscalibration.</div>

<p class="section-intro">All ${calBins.length} bands, both readings side by side. <code>err_mid</code> is the published <code>calib_error</code> column, measured against the band midpoint; <code>err_paid</code> is the same win rate measured against the price actually paid. The fixture-clustered standard error applies to both, which is why the two <code>|t|</code> columns can disagree so sharply.</p>

```js
Inputs.table(calBins, {
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
})
```

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
