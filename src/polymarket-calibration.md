---
title: Polymarket US · Outcomes
---

<div class="page-hero" data-accent="polymarket">
  <div class="page-eyebrow">Polymarket US</div>
  <h1>Do the prices come true?</h1>
  <p class="page-lead">Every resolved binary leg, grouped by the price actually paid for it and compared against how often that leg really won.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {normalizeCalibration, actualVsImplied, errorByPrice, calibrationVerdict, fmtCount} from "./components/calibration.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/calibration_polymarket.csv").csv({typed: true});
```

```js
const PM = "var(--accent-polymarket)";

const GROUP_LABEL = {
  ALL_DEEP: "All deep products",
  ALL:      "All products, including thin ones",
  AEC:      "Match winner",
  ATC:      "Team total / moneyline",
  ASTATC:   "Player stat over-under",
  TSC:      "Game total",
  ASC:      "Spread",
  AADC:     "To advance"
};
const ORDER = ["ALL_DEEP", "ALL", "AEC", "ATC", "ASTATC", "TSC", "ASC", "AADC"];
const present = Array.from(new Set(calib.map(d => d.group)));
const groups = ORDER.filter(g => present.includes(g)).concat(present.filter(g => !ORDER.includes(g)));
```

<div class="control-strip">

```js
const group = view(Inputs.select(groups, {
  label: "Product",
  value: groups.includes("ALL_DEEP") ? "ALL_DEEP" : groups[0],
  format: g => GROUP_LABEL[g] ?? g
}));
```

</div>

```js
// ⚠ x is sum_price_contracts / n_contracts -- the contract-weighted price ACTUALLY
// PAID -- not implied_prob, which is the bin midpoint by construction. The file's
// own calib_error and significant columns are measured against that midpoint and
// are therefore NOT what is drawn here; the error and the |t| below are recomputed
// against the price paid. On ALL_DEEP bin 0 the two differ by more than 2x, and
// that bin alone is over 850 million contracts.
//
// sum_price_contracts was added to the producer 2026-08-21. Guard for it rather
// than assume it: a served generation predating that change has only the midpoint,
// and silently plotting the midpoint as though it were the price paid is precisely
// the defect this page exists to avoid.
const rowsFor = g => calib.filter(d => d.group === g);
const hasPaid = calib.length > 0 && calib[0].sum_price_contracts != null && calib[0].sum_price_contracts !== "";
const rows = hasPaid
  ? normalizeCalibration(rowsFor(group), {
      bin: d => d.price_bin,
      width: () => 5,
      implied: d => (+d.n_contracts > 0 ? +d.sum_price_contracts / +d.n_contracts / 100 : null),
      actual: d => d.actual_win_rate_wt,
      se: d => d.se_wt,
      contracts: d => d.n_contracts,
      trades: d => d.n_trades,
      // n_events_eff is the Kish effective cluster count: contract weighting
      // concentrates the sample, so it is the honest sizing variable, and it is
      // what se_reliable is gated on upstream.
      events: d => d.n_events_eff ?? d.n_events
    })
  : [];
const verdict = calibrationVerdict(rows, {eventNoun: "effective contests"});
```

```js
if (!hasPaid) display(html`<div class="instruction-line" style="border-left-color:var(--accent-warning)"><strong>The served calibration file does not yet carry the price actually paid.</strong> This page draws nothing rather than fall back to the bin midpoint, which would overstate the error in the cheap bins by more than double.</div>`);
```

## Actual vs price paid

<div class="instruction-line">Each dot is a 5&cent; band; the diagonal is a perfectly priced contract. Bars are &plusmn;2 event-clustered standard errors, so a bar crossing the diagonal is not measurably mispriced.</div>

```js
if (rows.length) display(actualVsImplied({rows, color: PM, width, eventNoun: "effective contests"}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Circle area is proportional to independent contests, not trades &mdash; thousands of prints on one match are one observation. <strong>${verdict.clearing} of ${verdict.measurable}</strong> bands are distinguishable from a fair price.</div>`);
```

## Calibration error by price

<div class="instruction-line">Actual minus the price paid. <span style="color:var(--accent-positive);font-weight:600">Green</span> means the contract was underpriced, <span style="color:var(--accent-negative);font-weight:600">red</span> overpriced.</div>

```js
if (rows.length) display(errorByPrice({rows, width, eventNoun: "effective contests"}));
```

```js
if (rows.length && verdict.meanPaid != null) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Across this product, contracts were bought at a mean <strong>${(100 * verdict.meanPaid).toFixed(2)}&cent;</strong> and won <strong>${(100 * verdict.meanWon).toFixed(2)}%</strong> of the time &mdash; a tilt of <strong>${verdict.tilt >= 0 ? "+" : "−"}${Math.abs(100 * verdict.tilt).toFixed(2)}&cent;</strong> on ${fmtCount(verdict.totalContracts)} contracts.</div>`);
```

## Which products are measurable

<div class="instruction-line">Player stat over-unders carry enormous print counts on very few contests; match winners carry the opposite. The right-hand column is what decides whether a product can support a finding at all.</div>

```js
// Bins SHARE contests, so n_events must be MAXed, never summed -- summing would
// count the same match once per band it traded in.
const byProduct = Array.from(
  d3.group(calib.filter(d => !["ALL", "ALL_DEEP"].includes(d.group)), d => d.group),
  ([g, rs]) => {
    const contracts = d3.sum(rs, d => +d.n_contracts);
    const paid = hasPaid && contracts > 0 ? d3.sum(rs, d => +d.sum_price_contracts) / contracts / 100 : null;
    const won = contracts > 0 ? d3.sum(rs, d => +d.actual_win_rate_wt * +d.n_contracts) / contracts : null;
    const measurable = rs.filter(d => +d.se_reliable === 1).length;
    return {
      label: GROUP_LABEL[g] ?? g,
      trades: d3.sum(rs, d => +d.n_trades),
      contracts,
      events: d3.max(rs, d => +d.n_events),
      paid, won,
      tilt: paid == null || won == null ? null : won - paid,
      measurable, bands: rs.length
    };
  }
).sort((a, b) => b.contracts - a.contracts);
```

```js
display(Inputs.table(byProduct, {
  columns: ["label", "contracts", "events", "paid", "won", "tilt", "measurable"],
  header: {label: "Product", contracts: "Contracts", events: "Contests (largest band)", paid: "Mean paid", won: "Mean won", tilt: "Tilt", measurable: "Measurable bands"},
  format: {
    contracts: d => fmtCount(d),
    events: d => d.toLocaleString(),
    paid: d => (d == null ? "—" : `${(100 * d).toFixed(2)}¢`),
    won: d => (d == null ? "—" : `${(100 * d).toFixed(2)}%`),
    tilt: d => (d == null ? "—" : `${d >= 0 ? "+" : "−"}${Math.abs(100 * d).toFixed(2)}¢`),
    measurable: (d, i) => `${d} of ${byProduct[i].bands}`
  },
  align: {contracts: "right", events: "right", paid: "right", won: "right", tilt: "right", measurable: "right"},
  width: {label: 220},
  rows: 10
}));
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>The x-axis is the price actually paid, not the band midpoint.</strong> A 0&ndash;5&cent; band is mostly longshots trading at one and two cents, so its mean price is nowhere near 2.5&cent;. Measured against the midpoint, that band reads &minus;0.64&cent;; against what was actually paid, &minus;0.28&cent;. The file's own <code>calib_error</code> and <code>significant</code> columns use the midpoint and are deliberately not what is drawn here.</p>
  <p><strong>One contest is one observation.</strong> Thousands of prints on a single match share one result. Every interval is a CR1 cluster-robust standard error with the contest as the cluster; treating prints as independent understates it by 26&times; to 90&times;. Dots are sized by the effective contest count, which additionally accounts for how concentrated traded volume is across them.</p>
  <p><strong>Why "deep products" is the default.</strong> The <em>to advance</em> product carries 3.2 million trades across roughly 32 contests. Pooled into an all-products curve it was, on its own, enough to make the 50&cent; band read as significant. Products whose bands rest on too few effective contests are reported as unmeasurable rather than plotted as findings.</p>
  <p><strong>Whose price this is.</strong> Each Polymarket US symbol is a single binary leg and the daily market report lists only that leg, so this is a leg-price curve. Time-and-sales carries no aggressor flag, so unlike Kalshi's series this is not taker-side, and small level differences between the two venues should not be over-read.</p>
  <p><strong>What is excluded.</strong> Symbols naming more than one contract cannot be attributed to an outcome and are dropped rather than guessed at; markets delisted before reaching their event are never counted as losses. In total 89.8% of trades and 89.4% of traded value reach a resolved, unambiguously attributable market.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: Polymarket US volume, fees and category mix on <a href="./polymarket">Polymarket US · Activity</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
