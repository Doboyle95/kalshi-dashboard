---
title: DKeX · Economics
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DKeX</div>
  <h1>What it charges</h1>
  <p class="page-lead">Fees DKeX has collected, and what that works out to per dollar of contract.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {feeRows, feesDaily, realizedRate, fmtCount, fmtUSD} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-dkex)";
const VENUE = "DKeX";
// feeRows applies the Crypto.com/Nadex redenomination restatement; on every other
// venue contractDollars is 1 and this is a straight fees/contracts ratio.
const rows = feeRows(competitorDaily.filter(d => d.platform === "DKeX"), VENUE);
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
// ⚠ THIS PAGE DELIBERATELY DOES NOT USE rateShape(), for the same reason
// rothera-economics.md does not: DKeX's fee is not reported, it is COMPUTED by us from a
// filed schedule, so whether the schedule changed is something we KNOW rather than
// something to infer from the shape of this line.
//
// Inferring it here was actively wrong. Measured 2026-09-01 over 70 fee days, the rate
// runs 0.950c to 1.000c -- a smooth tail below 1.00c (0.9503, 0.9701, 0.9735, 0.9803,
// 0.9827, 0.9864 ...), not two levels -- which the helper's 0.05c grid slices into two
// adjacent cells (0.95 x 3 days, 1.00 x 67) covering 100% of days. That trips `posted`
// with `flat` false, so the shared caption announced "a posted rate the venue changed".
// DKeX has never changed it: CFTC Submission REX 26-04 is the only fee schedule it has
// ever filed, effective 2026-05-15, which predates our first published day.
//
// What actually moves the line is that the posted schedule is BANDED, not flat: $0.0100
// per contract at 3-98c, but $0.0050 at 1c and 99c and $0.0085 at 2c. So 1.00c is a CAP,
// and a day sits below it exactly in proportion to how much of its volume printed in the
// cheap tails. Recomputed from the trade tape, that reproduces every published day to
// four decimals: 2026-07-04 traded 0.47% of contracts in the cheap bands and realised
// 0.9984c; 2026-08-31 traded 17.05% there and realised 0.9503c. The late-August dip is a
// mix shift toward the tails, not a fee change.
//
// A shared fix in rateShape() does not work. Requiring the occupied clusters to be
// non-adjacent, or gating on spread (DKeX 1.05x vs Rothera 1.34x), reclassifies DKeX as a
// FLAT 1.00c rate -- also wrong, because the sub-1.00c days are the posted schedule
// working as filed, not noise around a single level. Checked against all five Economics
// pages: ForecastEx (0.50c x 564d stepping to 1.00c x 123d on 2026-05-01) and
// Crypto.com/Nadex (1.00c to 2.00c at the 2025-08-05 redenomination) are real,
// well-separated changes the helper reads correctly, and Polymarket US (19 clusters, 48%
// cover) and Underdog Exchange (14 clusters, 36%) both fall through to the "varies"
// branch, which is right -- Underdog's fee is a parabola, 0.07 x C x p x (1-p). DKeX was
// the only page it got wrong, so the helper is left alone.
const rateSpread = rows.length ? {
  lo: d3.min(rows, d => d.centsPerContract),
  hi: d3.max(rows, d => d.centsPerContract)
} : null;
if (rateSpread) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>1.00¢</strong> per $1 of contract is the posted rate across 3–98¢, and a day falls below it — to <strong>${rateSpread.lo.toFixed(3)}¢</strong> at the lowest — only in proportion to how much of its volume printed in the cheaper tails, where DKeX posts 0.50¢ at 1¢ and 99¢ and 0.85¢ at 2¢. <strong>The schedule has never changed</strong>; DKeX has filed exactly one. Compare <a href="./dkex-behavior">where on the probability axis it traded</a>, which is the thing moving this line.</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Fees here are computed, not reported.</strong> DKeX publishes no fee field. Every figure on this page is its own filed schedule &mdash; CFTC Submission REX 26-04, effective 2026-05-15 &mdash; applied to each individual print on the trade tape, then divided by the contracts those prints carried. Because it is billed per execution at the price that execution printed at, it is exact rather than an estimate. Days without a defensible numerator are absent, not drawn as zero.</p>
  <p><strong>Why this rate moves at all.</strong> DKeX charges a step function in price, not the parabola most of these venues use: <strong>$0.0100</strong> per contract to the taker at 3&ndash;98&cent;, but <strong>$0.0050</strong> at 1&cent; and 99&cent; and <strong>$0.0085</strong> at 2&cent;. So 1.00&cent; per $1 of contract is a ceiling, and the line dips below it on days that traded more in the tails &mdash; it tracks <em>where on the probability axis the venue traded</em>, never a change in what it charges.</p>
  <p><strong>Two roundings are visible in it.</strong> The schedule rounds each execution&rsquo;s fee <em>up</em> to the nearest $0.01, so fees are accumulated at trade grain and never recomputed from daily contract totals; across the days published that is +0.23% against daily aggregates. And the tape carries one price per print with no aggressor flag, so the taker&rsquo;s band is read off the printed price. Only prints at 2&cent; and 98&cent; straddle two bands &mdash; 0.95% of executions &mdash; and resolving them the other way moves the taker leg by &plusmn;0.07%.</p>
  
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./dkex">DKeX &middot; Activity</a>, and <a href="./compare-fees">Fees across venues</a> for the comparison.</div>
