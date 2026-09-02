---
title: DKeX · Economics
---

<div class="page-hero" data-accent="dkex">
  <div class="page-eyebrow">DKeX</div>
  <h1>What it charges</h1>
  <p class="page-lead">Modeled DraftKings customer cost on DKeX trades, and what that works out to per dollar of contract.</p>
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
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${fmtUSD(totalFees)} across ${fmtCount(totalContracts)} contracts, on ${rows.length.toLocaleString()} days carrying a modeled fee.</div>`);
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
// This page deliberately does not infer schedule changes from the shape of the
// realized-rate line. The exchange schedule is unchanged; the modeled customer-cost
// series has two explicit DraftKings retail boundaries instead.
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>Three disclosed regimes, applied by trade date.</strong> Before DraftKings' June 26 retail launch, the public tape carries DKeX's exchange fee only. June 26 through September 1 adds DraftKings Predictions' prior flat 1¢ introducing-broker commission. From September 2, the first day the new disclosure was observed, it adds the current price ladder instead. The DKeX exchange schedule itself has not changed; movement inside each regime comes from the day's price mix and per-execution rounding.</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Fees here are computed, not reported.</strong> DKeX publishes no fee field. Its <a href="https://www.cftc.gov/filings/orgrules/rules0515263470.pdf">filed exchange schedule</a>, effective June 1, 2026, and the applicable DraftKings broker schedule are applied to each print before division by contracts. The schedule arithmetic is exact at execution grain; treating the printed side as the customer side is a modeled convention because the tape has no aggressor or member identity.</p>
  <p><strong>Customer cost and exchange revenue are separate.</strong> From DraftKings' June 26 retail launch, customer cost adds DraftKings Predictions' introducing-broker commission to the DKeX taker fee. DKeX exchange revenue is its own taker-plus-maker charge and excludes the broker; use the measure toggle on the comparison page to see it.</p>
  <p><strong>Both charges are price-banded and rounded independently.</strong> DKeX charges the taker $0.0100 per contract at 3&ndash;98&cent;, $0.0050 at 1&cent; and 99&cent;, and $0.0085 at 2&cent;, plus $0.0025 to the maker. Each execution is rounded up to the nearest cent. DraftKings' current broker ladder is also multiplied by execution quantity and rounded up to the nearest cent, so neither fee is recomputed from daily totals.</p>
  <p><strong>The <a href="https://myaccount.draftkings.com/documents/fee-disclosure?product=predict">new broker ladder</a> has no published effective date.</strong> It is applied from September 2, 2026, the first date we observed it, so it cannot rewrite earlier trades. The source currently prints $0.0880 at 97–98¢; that evident missing-zero typo is modeled as $0.0088 and called out on the comparison chart.</p>
  
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./dkex">DKeX &middot; Activity</a>, and <a href="./compare-fees">Fees across venues</a> for the comparison.</div>
