---
title: Crypto.com/Nadex · Economics
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com/Nadex</div>
  <h1>What it charges</h1>
  <p class="page-lead">Nadex's standard direct-member exchange-fee benchmark, and what that works out to per dollar of contract.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {feeRows, feesDaily, realizedRate, rateShape, fmtCount, fmtUSD} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-nadex)";
const VENUE = "Crypto.com/Nadex";
// feeRows applies the Crypto.com/Nadex redenomination restatement; on every other
// venue contractDollars is 1 and this is a straight fees/contracts ratio.
const rows = feeRows(competitorDaily.filter(d => d.platform === "Crypto.com/Nadex"), VENUE);
const shape = rows.length ? rateShape(rows) : null;
const totalFees = d3.sum(rows, d => d.fees);
const totalContracts = d3.sum(rows, d => d.contracts);
```

```js
if (!rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--accent-warning)"><strong>No fee data is published for this venue.</strong></div>`);
```

## Fees per day

```js
if (rows.length) display(feesDaily({rows, width, color: ACCENT}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${fmtUSD(totalFees)} across ${fmtCount(totalContracts)} contracts, on ${rows.length.toLocaleString()} days carrying a reported fee.</div>`);
```

## Cumulative

```js
if (rows.length) display(feesDaily({rows, width, color: ACCENT, cumulative: true}));
```

## Effective rate

```js
if (rows.length) display(realizedRate({rows, width, color: ACCENT}));
```

```js
// The SHAPE of this line is the finding, and it is read from the data rather than
// written in: a venue charging a posted flat fee draws a flat line, and saying so
// is more useful than a caption implying a trend was discovered. rateShape judges
// on 0.05c clusters, not distinct values -- see its comment for why.
if (shape) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${
  shape.flat
    ? html`A posted flat fee, not a market outcome: <strong>${shape.levels[0].toFixed(2)}¢</strong> per $1 of contract on every day published.`
    : shape.posted
      ? html`A posted rate the venue changed, not a market outcome — it has only ever sat at ${shape.levels.map(v => `${v.toFixed(2)}¢`).join(" and ")} per $1 of contract.`
      : html`The rate moves with where on the probability axis the venue traded, from <strong>${shape.lo.toFixed(3)}¢</strong> to <strong>${shape.hi.toFixed(3)}¢</strong> per $1 of contract.`
}</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Reported fees divided by reported contracts</strong>, on days carrying both. Days without a defensible numerator are absent, not drawn as zero.</p>
  <p><strong>Why a fee rate moves at all.</strong> Most of these venues charge a parabola in price &mdash; roughly <code>&Theta; &times; contracts &times; p &times; (1&minus;p)</code> &mdash; which peaks at 50&cent; and falls to nearly nothing in the tails. So an effective rate tracks <em>where on the probability axis the venue traded</em>, not a change in its published schedule.</p>
  <p><strong>Restated per $1 of contract.</strong> Crypto.com/Nadex redenominated twice ($100 → $10 → $1) and the source counts one of each as a single contract, so the raw ratio would draw the first 141 days at 100¢ against Kalshi's 0.84¢ — a 119× cost gap that never existed, since $1.00 on a $100 contract is the same ~1%.</p>
  <p><strong>This is not Crypto.com's current app fee.</strong> The app moved on June 30, 2026 to a published 1–1.75¢ taker range, with maker and settlement fees at zero. The daily bulletin has no execution prices or member roles, so it cannot identify which retail rate applied; the comparison page draws both published bounds rather than fabricating a daily point.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./nadex">Crypto.com/Nadex &middot; Activity</a>, and <a href="./compare-fees">Fees across venues</a> for the comparison.</div>
