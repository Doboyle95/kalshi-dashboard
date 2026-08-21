---
title: ForecastEx · Outcomes
---

<div class="page-hero" data-accent="forecastex">
  <div class="page-eyebrow">ForecastEx</div>
  <h1>Do the prices come true?</h1>
  <p class="page-lead">Every resolved contract, grouped by the price actually paid for it and compared against how often it really settled yes.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {normalizeCalibration, actualVsImplied, errorByPrice, calibrationVerdict, fmtCount} from "./components/calibration.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/forecastex_calibration.csv").csv({typed: true});
```

```js
const FX = "var(--accent-forecastex)";
const GROUP_LABEL = {
  ALL_EX_ELECTION: "Everything except the election",
  ALL: "All contracts",
  WEATHER: "Weather",
  NON_WEATHER_EX_ELECTION: "Non-weather, excluding the election",
  ELECTION_ONLY: "The 2024 election only"
};
const ORDER = ["ALL_EX_ELECTION", "ALL", "WEATHER", "NON_WEATHER_EX_ELECTION", "ELECTION_ONLY"];
const present = Array.from(new Set(calib.map(d => d.group)));
const groups = ORDER.filter(g => present.includes(g)).concat(present.filter(g => !ORDER.includes(g)));
```

<div class="control-strip">

```js
const group = view(Inputs.select(groups, {
  label: "Contracts",
  value: groups.includes("ALL_EX_ELECTION") ? "ALL_EX_ELECTION" : groups[0],
  format: g => GROUP_LABEL[g] ?? g
}));
```

</div>

```js
// ⚠ THIS FILE MIXES TWO WEIGHTINGS AND THE COLUMN NAMES DO NOT WARN YOU.
// implied_prob is sum_price / n_trades -- TRADE-weighted -- while
// actual_win_rate_wt is CONTRACT-weighted. Differencing them straight compares
// two different populations, and a past audit finding was traced to exactly that.
// The file ships calib_error_qty, the contract-weighted error, so the matching
// contract-weighted mean price is actual_win_rate_wt - calib_error_qty. Verified
// 2026-08-21: that value lands inside its own band on all 20 bands.
//
// se_event_cents_qty is in CENTS, not probability -- divide by 100 or every
// interval is drawn a hundred times too wide.
const rows = normalizeCalibration(calib.filter(d => d.group === group), {
  bin: d => d.price_bin,
  width: () => 5,
  implied: d => {
    const actual = +d.actual_win_rate_wt, err = +d.calib_error_qty;
    return Number.isFinite(actual) && Number.isFinite(err) ? actual - err : null;
  },
  actual: d => d.actual_win_rate_wt,
  se: d => (d.se_event_cents_qty == null || d.se_event_cents_qty === "" ? null : +d.se_event_cents_qty / 100),
  contracts: d => d.n_contracts,
  trades: d => d.n_trades,
  // g_eff is the effective number of settlement-day clusters.
  events: d => d.g_eff ?? d.n_events
});
const verdict = calibrationVerdict(rows, {eventNoun: "effective clusters"});
```

## Actual vs price paid

<div class="instruction-line">The diagonal is a perfectly priced contract. Bars are &plusmn;2 event-clustered standard errors, so a bar crossing the diagonal is not measurably mispriced.</div>

```js
if (rows.length) display(actualVsImplied({rows, color: FX, width, eventNoun: "effective clusters"}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>${verdict.clearing} of ${verdict.measurable}</strong> bands are distinguishable from a fair price. Circle area is proportional to independent clusters, not trades.</div>`);
```

## Calibration error by price

<div class="instruction-line">Actual minus the price paid. <span style="color:var(--accent-positive);font-weight:600">Green</span> means the contract was underpriced, <span style="color:var(--accent-negative);font-weight:600">red</span> overpriced.</div>

```js
if (rows.length) display(errorByPrice({rows, width, eventNoun: "effective clusters"}));
```

```js
if (rows.length && verdict.meanPaid != null) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Contracts were bought at a mean <strong>${(100 * verdict.meanPaid).toFixed(2)}&cent;</strong> and settled yes <strong>${(100 * verdict.meanWon).toFixed(2)}%</strong> of the time &mdash; a tilt of <strong>${verdict.tilt >= 0 ? "+" : "−"}${Math.abs(100 * verdict.tilt).toFixed(2)}&cent;</strong> on ${fmtCount(verdict.totalContracts)} contracts.</div>`);
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Contract-weighted throughout, and that is not the file's default.</strong> The published <code>implied_prob</code> column is trade-weighted while the win rate beside it is contract-weighted; differencing the two compares different populations. Everything here uses the contract-weighted pair, derived from <code>calib_error_qty</code>, so the price on the x-axis and the win rate on the y-axis describe the same contracts.</p>
  <p><strong>Why the election sits in its own bucket.</strong> The 2024 election is a single correlated event carrying an enormous share of all volume ever traded here. Pooled into an all-contracts curve it dominates the result, so the default view excludes it and it can be inspected on its own.</p>
  <p><strong>One settlement is one observation.</strong> Intervals are clustered so that many contracts resolving on the same underlying outcome count once, not once per print. The effective cluster count &mdash; which additionally accounts for how concentrated volume is across them &mdash; is what sizes each dot.</p>
  <p><strong>Whose price this is.</strong> ForecastEx publishes no aggressor flag, so this is a leg-price curve rather than a taker curve and should not be differenced against Kalshi's taker-side series.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: ForecastEx volume and contract mix on <a href="./forecastex">ForecastEx · Activity</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
