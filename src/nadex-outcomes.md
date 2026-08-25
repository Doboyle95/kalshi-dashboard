---
title: Crypto.com/Nadex · Outcomes
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com/Nadex</div>
  <h1>Do the prices come true?</h1>
  <p class="page-lead">Every settled contract, grouped by the price actually paid for it and compared against how often it really finished in the money.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {normalizeCalibration, actualVsImplied, errorByPrice, calibrationVerdict, fmtCount} from "./components/calibration.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/nadex_calibration.csv").csv({typed: true});
```

```js
const ND = "var(--accent-nadex)";
const GROUP_LABEL = {
  ALL: "All contracts",
  STRIKE: "Crypto strikes",
  EVENT: "Event contracts",
  COMBO: "Combos (parlays)",
  OTHER: "Other"
};
const ORDER = ["ALL", "STRIKE", "EVENT", "COMBO", "OTHER"];
const present = Array.from(new Set(calib.map(d => d.group)));
const groups = ORDER.filter(g => present.includes(g)).concat(present.filter(g => !ORDER.includes(g)));
```

<div class="control-strip">

```js
const group = view(Inputs.select(groups, {label: "Contracts", value: groups[0], format: g => GROUP_LABEL[g] ?? g}));
```

</div>

```js
// Unlike every other venue file on this site, `implied` here is ALREADY the
// contract-weighted price actually paid off Nadex's own tape -- not a band
// midpoint -- so it is used directly. `n_eff` counts effective CONTRACTS rather
// than prints, because one contract can print dozens of times and every one of
// those prints shares a single settlement.
const rows = normalizeCalibration(calib.filter(d => d.group === group && (d.bin_width == null || +d.bin_width === 5)), {
  bin: d => d.price_bin,
  width: d => d.bin_width ?? 5,
  implied: d => d.implied,
  actual: d => d.actual,
  se: d => d.se_calib_error,
  contracts: d => d.contracts,
  events: d => d.n_eff
});
const verdict = calibrationVerdict(rows, {eventNoun: "effective contracts"});
const joinRate = d3.mean(calib.filter(d => d.group === group), d => +d.join_rate_contracts);
```

## Actual vs price paid

<div class="instruction-line">The diagonal is a perfectly priced contract. Bars are &plusmn;2 clustered standard errors, so a bar crossing the diagonal is not measurably mispriced.</div>

```js
if (rows.length) display(actualVsImplied({rows, color: ND, width, eventNoun: "effective contracts"}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>${verdict.clearing} of ${verdict.measurable}</strong> bands are distinguishable from a fair price. Circle area is proportional to effective contracts, not prints.</div>`);
```

## Calibration error by price

<div class="instruction-line">Actual minus the price paid. <span style="color:var(--accent-positive);font-weight:600">Green</span> means the contract was underpriced, <span style="color:var(--accent-negative);font-weight:600">red</span> overpriced.</div>

```js
if (rows.length) display(errorByPrice({rows, width, eventNoun: "effective contracts"}));
```

```js
if (rows.length && verdict.meanPaid != null) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Contracts were bought at a mean <strong>${(100 * verdict.meanPaid).toFixed(2)}&cent;</strong> and finished in the money <strong>${(100 * verdict.meanWon).toFixed(2)}%</strong> of the time &mdash; a tilt of <strong>${verdict.tilt >= 0 ? "+" : "−"}${Math.abs(100 * verdict.tilt).toFixed(2)}&cent;</strong> on ${fmtCount(verdict.totalContracts)} contracts.</div>`);
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>This is the whole contract suite, not just parlays.</strong> Calibration asks whether a contract trading at a price resolves that way that often, which needs no aggressor flag &mdash; so crypto strikes, event contracts and combos all qualify. Nadex parlay P&amp;L, on its own <a href="./nadex-parlay-outcomes">Parlay outcomes</a> tab, is parlays-only, because buyer-equals-taker holds only for a house-quoted combo. The two are different populations and should not be read as one.</p>
  <p><strong>The x-axis is already the price paid.</strong> Nadex publishes a contract-weighted mean price off its own tape, so unlike the other venue files nothing has to be reconstructed from a band midpoint here.</p>
  <p><strong>One contract is one observation, not one print.</strong> A single contract can print dozens of times and every print shares one settlement, so the effective count behind each band is contracts rather than prints, and that is what sizes the dots and widens the intervals.</p>
  <p>${Number.isFinite(joinRate) ? html`<strong>Coverage.</strong> ${(100 * joinRate).toFixed(1)}% of contracts in this view join a settled market; the remainder cannot be attributed to an outcome and is excluded rather than guessed at.` : html`<strong>Coverage.</strong> Contracts that cannot be joined to a settled market are excluded rather than guessed at.`}</p>
  <p><strong>A contract count is a dollar count here.</strong> Nadex binaries settle at $1, the one venue on this site where the two are the same number.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: Crypto.com/Nadex volume and contract mix on <a href="./nadex">Crypto.com/Nadex · Activity</a>; parlay P&amp;L on <a href="./nadex-parlay-outcomes">Parlay outcomes</a>; the same series against every other venue on <a href="./compare-accuracy">Accuracy &amp; Outcomes</a>.</div>
