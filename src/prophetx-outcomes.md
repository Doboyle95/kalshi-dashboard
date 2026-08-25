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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: ProphetX volume, parlay share and biggest games on <a href="./prophetx">ProphetX · Activity</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
