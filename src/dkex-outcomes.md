---
title: DKeX · Outcomes
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DKeX</div>
  <h1>Do the prices come true?</h1>
  <p class="page-lead">Every settled print, grouped by the price actually paid for it and compared against how often that leg really won.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {normalizeCalibration, actualVsImplied, errorByPrice, calibrationVerdict, fmtCount} from "./components/calibration.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/dkex_calibration.csv").csv({typed: true});
```

```js
const DK = "var(--accent-dkex)";
const widths = Array.from(new Set(calib.map(d => +d.bin_width))).filter(Number.isFinite).sort((a, b) => a - b);
```

<div class="control-strip">

```js
const bandWidth = view(Inputs.radio(widths, {label: "Band width", value: widths.includes(10) ? 10 : widths[0], format: w => `${w}¢`}));
```

</div>

```js
// x is sum_price_contracts / n_contracts -- the contract-weighted price ACTUALLY
// PAID. The file also ships implied_prob (the band midpoint) plus calib_error and
// clears_2se measured against it; those are kept for cross-file comparability and
// are deliberately NOT what is drawn here. In the cheap bands the midpoint is
// nowhere near what anyone paid, so it books a mispricing nobody was charged.
const rows = normalizeCalibration(calib.filter(d => d.group === "ALL" && +d.bin_width === bandWidth), {
  bin: d => d.price_bin,
  width: d => d.bin_width,
  implied: d => (+d.n_contracts > 0 ? +d.sum_price_contracts / +d.n_contracts / 100 : null),
  actual: d => d.actual_win_rate_wt,
  se: d => d.se_clustered,
  contracts: d => d.n_contracts,
  trades: d => d.n_trades,
  events: d => d.n_events
});
const verdict = calibrationVerdict(rows, {eventNoun: "events"});
// n_events_total is constant across a group's rows by construction: bands SHARE
// events, so summing n_events would count one ball game once per band it traded in.
const totalEvents = +(calib.find(d => d.group === "ALL" && +d.bin_width === bandWidth)?.n_events_total ?? 0);
```

## Actual vs price paid

<div class="instruction-line">The diagonal is a perfectly priced contract. Bars are &plusmn;2 event-clustered standard errors, so a bar crossing the diagonal is not measurably mispriced.</div>

```js
if (rows.length) display(actualVsImplied({rows, color: DK, width}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>${verdict.clearing} of ${verdict.measurable}</strong> bands are distinguishable from a fair price across ${totalEvents.toLocaleString()} settled events. Circle area is proportional to events, not trades.</div>`);
```

## Calibration error by price

<div class="instruction-line">Actual minus the price paid. <span style="color:var(--accent-positive);font-weight:600">Green</span> means the contract was underpriced, <span style="color:var(--accent-negative);font-weight:600">red</span> overpriced.</div>

```js
if (rows.length) display(errorByPrice({rows, width}));
```

```js
if (rows.length && verdict.meanPaid != null) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Contracts were bought at a mean <strong>${(100 * verdict.meanPaid).toFixed(2)}&cent;</strong> and won <strong>${(100 * verdict.meanWon).toFixed(2)}%</strong> of the time &mdash; a tilt of <strong>${verdict.tilt >= 0 ? "+" : "−"}${Math.abs(100 * verdict.tilt).toFixed(2)}&cent;</strong> on ${fmtCount(verdict.totalContracts)} contracts.</div>`);
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>The x-axis is the price actually paid, not the band midpoint.</strong> The published <code>calib_error</code> and <code>clears_2se</code> columns measure each band against its midpoint, which is the convention the other venue files use and is kept so they stay comparable. In the tails the midpoint is nowhere near what anyone paid, so everything here is recomputed against <code>sum_price_contracts / n_contracts</code>.</p>
  <p><strong>One game is one observation, not one per print.</strong> Thousands of prints on a single ball game settle on the same result. Every interval is clustered on the event &mdash; field 4 of the DKeX symbol, shared across every market type and period on that game, so a player prop and the moneyline on the same game go in the same cluster. Treating prints as independent would shrink these bars by roughly 3&ndash;7&times;.</p>
  <p><strong>Voids are excluded, and that exclusion is load-bearing.</strong> A refunded event has no outcome: both legs of a voided or postponed event settle at $0.50. Void prints, pro-rated partials and not-yet-settled markets are removed before binning &mdash; about 0.43% of the tape. Before the 2026-08-06 settlement fix, voids were scored as <em>wins</em>, which alone moved the 10&ndash;20&cent; band from &minus;0.18&cent; to +4.01&cent;.</p>
  <p><strong>Whose price.</strong> A binary has two legs. DKeX prints one price per row and the symbol names the specific leg, so the x-axis is that leg's own price and the win rate is that same leg's own settlement. DKeX publishes no aggressor flag, so this is not a taker curve; Kalshi bins the taker's own side, which is the one place the two series are not strictly comparable.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: DKeX volume, league and category mix on <a href="./dkex">DKeX · Activity</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
