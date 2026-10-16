---
title: DKeX · Economics
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DKeX</div>
  <h1>What it charges</h1>
  <p class="page-lead">Modeled customer cost on DKeX trades, and what that works out to per contract. All DKeX volume is routed through DraftKings, so the customer fee is DraftKings' all-in fee.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {feeRows, feesDaily, realizedRate, fmtCount, fmtUSD} from "./components/venue-modules.js";
import {dateBrush, inDateRange} from "./components/date-brush.js";
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
const feesDayRange = view(dateBrush({data: rows, valueAccessor: d => d.fees, color: ACCENT, width}));
```

```js
if (rows.length) display(feesDaily({rows: rows.filter(inDateRange(feesDayRange)), width, color: ACCENT}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${fmtUSD(totalFees)} across ${fmtCount(totalContracts)} contracts, on ${rows.length.toLocaleString()} days carrying a modeled fee.</div>`);
```

## Cumulative

```js
const feesCumRange = view(dateBrush({data: rows, valueAccessor: d => d.fees, color: ACCENT, width}));
```

```js
if (rows.length) display(feesDaily({rows: rows.filter(inDateRange(feesCumRange)), width, color: ACCENT, cumulative: true}));
```

## Effective rate

```js
const rateRange = view(dateBrush({data: rows, valueAccessor: d => d.centsPerContract, color: ACCENT, width}));
```

```js
if (rows.length) display(realizedRate({rows: rows.filter(inDateRange(rateRange)), width, color: ACCENT}));
```

```js
// This page deliberately does not infer schedule changes from the shape of the
// realized-rate line. The exchange schedule changes only for combination makers, from
// October 1; the modeled customer-cost series has three DraftKings windows, and their
// dates are estimates.
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>The customer fee is DraftKings' all-in fee, and its dates are estimates.</strong> DraftKings' variable fee includes the exchange fee: its customer email of 2026-05-11 said all fees continue to include applicable exchange fees. All DKeX volume is routed through DraftKings. From DKeX's retail launch on June 26 to September 1 the fee is the May tiers. From September 2 it is the September ladder, first seen that day. From October 5 it is the latest ladder. None of these has a published effective date. Movement inside each window comes from the day's price mix and per-execution rounding.</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Fees here are computed, not reported.</strong> DKeX publishes no fee field. Its <a href="https://www.cftc.gov/filings/orgrules/rules0515263470.pdf">filed exchange schedule</a>, effective June 1, 2026, gives the exchange's taker and maker charges, which feed exchange revenue. DraftKings' all-in fee is applied to each print as the customer fee. Both are divided by contracts afterwards. The schedule arithmetic is exact at execution grain; treating the printed side as the customer side is a modeled convention because those records have no aggressor or member identity.</p>
  <p><strong>Customer cost and exchange revenue are separate.</strong> Customer cost is DraftKings' all-in fee, which already includes the exchange fee. Exchange revenue is the exchange's own taker-plus-maker charge; use the measure toggle on the comparison page to see it. The fee is per side, so a buyer pays it on entry; the fee on a seller's exit is not modeled separately.</p>
  <p><strong>Each fee is price-banded and rounded up per execution.</strong> The exchange's taker charge is $0.0100 per contract at 3&ndash;98&cent;, $0.0050 at 1&cent; and 99&cent;, and $0.0085 at 2&cent;. The maker pays $0.0025, or from October 1 on a combination contract round-up(0.035 &times; C &times; P &times; (1 &minus; P)). DraftKings' all-in fee is multiplied by execution quantity and rounded up the same way, so neither is recomputed from daily totals.</p>
  <p><strong>None of DraftKings' <a href="https://myaccount.draftkings.com/documents/fee-disclosure?product=predict">schedules</a> has a published effective date.</strong> Each window is estimated from when a schedule was first seen. The September ladder was first seen on September 2, 2026, and archived on September 24 and 25. The latest text is undated and was supplied on October 16. The September text printed $0.0880 at 97–98¢, a missing-zero typo we modeled as $0.0088. The latest text prints $0.0045 at 97–99¢.</p>
  
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./dkex">DKeX &middot; Activity</a>, and <a href="./compare-fees">Fees across venues</a> for the comparison.</div>
