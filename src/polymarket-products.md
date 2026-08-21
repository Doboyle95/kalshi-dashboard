---
title: Polymarket US · Products
---

<div class="page-hero" data-accent="polymarket">
  <div class="page-eyebrow">Polymarket US</div>
  <h1>What trades here</h1>
  <p class="page-lead">The mix of contract categories Polymarket US lists, day by day.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {bucketOf, BUCKETS, bucketColor, categoryMix, categoryTotals, sportsSplit, fmtCount, fmtPct} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const cats = await DataAttachment("data/polymarket_categories_daily.csv").csv({typed: true});
const split = await DataAttachment("data/polymarket_sports_split_daily.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-polymarket)";
// bucketOf keys on the SHORT venue name, not the display name -- "Polymarket US" is what
// carries this venue's parlay-bucket exception in the shared taxonomy.
const rows = cats
  .filter(d => d.date && d.category != null && d.category !== "")
  .map(d => ({...d, category: bucketOf("Polymarket US", String(d.category).trim())}));
const present = BUCKETS.filter(b => rows.some(d => d.category === b && +d.contracts > 0));
const totals = categoryTotals(rows);
```

## The mix, day by day

<div class="control-strip">

```js
const mixMeasure = view(Inputs.radio(["Share", "Contracts"], {label: "Measure", value: "Share"}));
```

</div>

```js
display(categoryMix({rows, width, measure: mixMeasure, categories: present, colorOf: bucketColor}));
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Share answers what the venue is for; contracts answers how big it got. Same buckets as <a href="./categories-venues">Products across venues</a>.</div>

## Sports and everything else

```js
display(sportsSplit({rows: split, width, color: ACCENT, measure: mixMeasure}));
```

```js
display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Sports is ${fmtPct(d3.sum(split, d => +d.contracts_sports || 0) / Math.max(1, d3.sum(split, d => +d.contracts_total || 0)))} of all contracts this venue has published.</div>`);
```

## Every bucket, all time

```js
display(Inputs.table(totals, {
  columns: ["category", "contracts", "share", "days", "firstSeen", "lastSeen"],
  header: {category: "Bucket", contracts: "Contracts", share: "Share", days: "Days traded", firstSeen: "First", lastSeen: "Last"},
  format: {contracts: d => fmtCount(d), share: d => fmtPct(d)},
  align: {contracts: "right", share: "right", days: "right"},
  width: {category: 190}, rows: 12
}));
```

<details class="surface-card compact-details">
  <summary>How the buckets are built</summary>
  <p>Categories are rolled into seven shared buckets so venues can be read side by side. The taxonomy is broad because the broadest venue sets the ceiling &mdash; Kalshi publishes one <em>Sports</em> value where others name the sport, and inventing a split for it would be fabrication.</p>
  <p><strong>&ldquo;Other&rdquo; is not one thing.</strong> At Underdog it is the combo bucket; at Crypto.com/Nadex and DKeX it is a genuine residual, and Nadex carries a separate explicit <em>Parlays</em> value. It is mapped per venue rather than globally.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./polymarket">Polymarket US &middot; Activity</a> for volume and top markets, and <a href="./categories-venues">Products across venues</a> for the comparison.</div>
