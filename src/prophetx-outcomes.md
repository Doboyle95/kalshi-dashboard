---
title: ProphetX · Outcomes
---

<div class="page-hero">
  <div class="page-eyebrow">ProphetX</div>
  <h1>Do the prices come true?</h1>
  <p class="page-lead">Every single-market contract that has finished, joined back to the prices actually paid for it on the tape.</p>
</div>

<div class="instruction-line"><strong>Single markets only.</strong> Parlays are excluded and cannot be added &mdash; the published data does not resolve a combo's legs.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {normalizeCalibration, actualVsImplied, errorByPrice, calibrationVerdict, fmtCount} from "./components/calibration.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
```

```js
const PX = "#DB2777";
const GROUP_LABEL = {
  ALL: "All single markets",
  MONEYLINE: "Moneyline",
  SPREAD: "Spread",
  TOTAL: "Total",
  OUTRIGHT: "Outright",
  PROP_OTHER: "Props & other"
};
const ORDER = ["ALL", "MONEYLINE", "SPREAD", "TOTAL", "OUTRIGHT", "PROP_OTHER"];
const present = Array.from(new Set(calib.map(d => d.group)));
const groups = ORDER.filter(g => present.includes(g)).concat(present.filter(g => !ORDER.includes(g)));
const widths = Array.from(new Set(calib.map(d => +d.bin_width))).filter(Number.isFinite).sort((a, b) => a - b);
```

<div class="control-strip">

```js
const group = view(Inputs.select(groups, {label: "Market type", value: groups[0], format: g => GROUP_LABEL[g] ?? g}));
```

```js
const bandWidth = view(Inputs.radio(widths, {label: "Band width", value: widths.includes(10) ? 10 : widths[0], format: w => `${w}¢`}));
```

</div>

```js
// x is sum_price_contracts / n_contracts -- the contract-weighted price ACTUALLY
// PAID -- because on this venue that single choice decides the answer. Against the
// midpoint the cheapest band looks decisively mispriced; against what was actually
// paid it is not. The published calib_error and clears_2se columns use the
// midpoint and are deliberately not what is drawn here.
const rows = normalizeCalibration(calib.filter(d => d.group === group && +d.bin_width === bandWidth), {
  bin: d => d.price_bin,
  width: d => d.bin_width,
  implied: d => (+d.n_contracts > 0 ? +d.sum_price_contracts / +d.n_contracts / 100 : null),
  actual: d => d.actual_win_rate_wt,
  se: d => d.se_clustered,
  contracts: d => d.n_contracts,
  trades: d => d.n_trades,
  events: d => d.n_events
});
const verdict = calibrationVerdict(rows, {eventNoun: "fixtures"});
// Constant across a group's rows by construction -- bands SHARE fixtures.
const totalFixtures = +(calib.find(d => d.group === group && +d.bin_width === bandWidth)?.n_events_total ?? 0);
```

## Actual vs price paid

<div class="instruction-line">The diagonal is a perfectly priced contract. Bars are &plusmn;2 fixture-clustered standard errors, so a bar crossing the diagonal is not measurably mispriced.</div>

```js
if (rows.length) display(actualVsImplied({rows, color: PX, width, eventNoun: "fixtures"}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>${verdict.clearing} of ${verdict.measurable}</strong> bands are distinguishable from a fair price across ${totalFixtures.toLocaleString()} fixtures. Circle area is proportional to fixtures, not prints.</div>`);
```

## Calibration error by price

<div class="instruction-line">Actual minus the price paid. <span style="color:var(--accent-positive);font-weight:600">Green</span> means the contract was underpriced, <span style="color:var(--accent-negative);font-weight:600">red</span> overpriced.</div>

```js
if (rows.length) display(errorByPrice({rows, width, eventNoun: "fixtures"}));
```

```js
if (rows.length && verdict.meanPaid != null) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The priced side was bought at a mean <strong>${(100 * verdict.meanPaid).toFixed(2)}&cent;</strong> and won <strong>${(100 * verdict.meanWon).toFixed(2)}%</strong> of contracts &mdash; a tilt of <strong>${verdict.tilt >= 0 ? "+" : "−"}${Math.abs(100 * verdict.tilt).toFixed(2)}&cent;</strong> on ${fmtCount(verdict.totalContracts)} contracts. Its counterparty holds the exact mirror.</div>`);
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>The reference price is the price actually paid, not the band midpoint.</strong> That single choice decides the answer. In the cheapest band the mean price paid is a fraction of the midpoint, because that band is mostly longshots trading at two and three cents. Measured against the midpoint far more bands clear two standard errors than against what was actually paid, and that gap is the binning convention, not miscalibration. A chart or a sentence built on <code>calib_error</code> or <code>clears_2se</code> alone will claim a miscalibration this data does not support.</p>
  <p><strong>One fixture is one observation.</strong> Tens of prints sit on each fixture and every print on a game shares that game's single outcome. Intervals are clustered on the fixture taken from the event <em>description</em>, not the contract id &mdash; a player prop is keyed on the player, so id-based clustering would split a game's props away from its own moneyline. Golf outrights cluster on the tournament: one field is one observation, not 150.</p>
  <p><strong>Whose calibration this is.</strong> ProphetX publishes <strong>no aggressor flag</strong> &mdash; the tape records that a trade happened at a price, not who crossed the spread. This is <em>not</em> a taker curve. It is the <strong>priced side</strong>: the second-named side after the &ldquo;@&rdquo;, i.e. the home side, which is the only side the venue quotes. Kalshi's series bins the taker's own side, so the two are different statistics and should not be differenced.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: ProphetX volume, parlay share and biggest games on <a href="./prophetx">ProphetX · Activity</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
