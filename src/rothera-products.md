---
title: Rothera · Products
---

<div class="page-hero" data-accent="rothera">
  <div class="page-eyebrow">Rothera</div>
  <h1>What trades here</h1>
  <p class="page-lead">The mix of contract categories Rothera lists, and how far ahead of settlement they trade.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {bucketOf, BUCKETS, bucketColor, categoryMix, categoryTotals, sportsSplit, fmtCount, fmtPct} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const cats = await DataAttachment("data/rothera_categories_daily.csv").csv({typed: true});
const split = await DataAttachment("data/rothera_sports_split_daily.csv").csv({typed: true});
const tenor = await DataAttachment("data/rothera_tenor_daily.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-rothera)";
// bucketOf keys on the SHORT venue name, not the display name -- "Rothera" is what
// carries this venue's parlay-bucket exception in the shared taxonomy.
const rows = cats
  .filter(d => d.date && d.category != null && d.category !== "")
  .map(d => ({...d, category: bucketOf("Rothera", String(d.category).trim())}));
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

## Days to expiration

<p class="section-intro">How far ahead of settlement Rothera actually trades. Volume is where the money moves; open interest is where it sits.</p>

<div class="control-strip">

```js
const tenorMeasure = view(Inputs.radio(["Volume", "Open interest"], {label: "Measure", value: "Volume"}));
```

</div>

```js
const tenorRows = tenor
  .filter(d => d.date && d.tenor_bucket)
  .map(d => ({
    date: d.date instanceof Date ? d.date : new Date(`${String(d.date).slice(0, 10)}T00:00:00Z`),
    bucket: String(d.tenor_bucket),
    order: +d.bucket_order,
    // OPEN INTEREST IS A STOCK. Splitting it by tenor and stacking one day's
    // buckets is legitimate -- they are disjoint slices of that day's book --
    // but it is still never summed ACROSS days, which is why the toggle switches
    // the series rather than offering a cumulative view.
    value: tenorMeasure === "Open interest" ? (+d.open_interest || 0) : (+d.contracts || 0),
    markets: +d.markets || 0
  }))
  .filter(d => !Number.isNaN(+d.date));
const tenorBuckets = Array.from(new Set(tenorRows.map(d => d.bucket)))
  .map(b => ({b, order: d3.min(tenorRows.filter(d => d.bucket === b), d => d.order)}))
  .sort((a, b) => a.order - b.order)
  .map(d => d.b);
```

```js
display(tenorRows.length
  ? Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width, height: 320, marginLeft: 70, marginBottom: 34,
      x: {type: "utc", label: null},
      y: {label: `${tenorMeasure} (contracts)`, grid: true, tickFormat: d => fmtCount(d)},
      // Tenor is an ORDERED dimension, so this takes a sequential ramp rather than a
      // categorical palette -- the same reasoning the shared trade-size chart uses.
      color: {legend: true, domain: tenorBuckets, type: "ordinal", scheme: "BuPu"},
      marks: [
        Plot.areaY(tenorRows, {
          x: "date", y: "value", fill: "bucket", order: tenorBuckets,
          curve: "monotone-x", fillOpacity: 0.92, tip: true,
          title: d => `${d.bucket} to expiration\n${fmtCount(d.value)} ${tenorMeasure.toLowerCase()} · ${d.markets.toLocaleString()} markets`
        }),
        Plot.ruleY([0])
      ]
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The tenor series is not being served for this venue.</div>`);
```

```js
// Read from the data so the sentence cannot drift from the chart above it.
const tenorShare = (() => {
  const byBucket = d3.rollup(tenor, rs => ({
    vol: d3.sum(rs, d => +d.contracts || 0), oi: d3.sum(rs, d => +d.open_interest || 0)
  }), d => String(d.tenor_bucket));
  const totalVol = d3.sum(Array.from(byBucket.values()), d => d.vol) || 1;
  const totalOi = d3.sum(Array.from(byBucket.values()), d => d.oi) || 1;
  const near = ["0-1d", "2-7d"];
  return {
    vol: d3.sum(near.map(b => byBucket.get(b)?.vol ?? 0)) / totalVol,
    oi: d3.sum(near.map(b => byBucket.get(b)?.oi ?? 0)) / totalOi
  };
})();
display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${fmtPct(tenorShare.vol)} of volume trades within a week of settling, against ${fmtPct(tenorShare.oi)} of open interest — the book is short-dated, and what sits on it for months is a much smaller thing than what trades.</div>`);
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

## Every category, all time

<p class="section-intro">Rothera's own categories, unbucketed, ranked by all-time volume.</p>

```js
const catBar = Array.from(
  d3.rollup(cats.filter(d => d.category != null && d.category !== ""),
    rs => d3.sum(rs, d => +d.contracts || 0),
    d => String(d.category).trim()),
  ([category, contracts]) => ({category, contracts})
).filter(d => d.contracts > 0);
```

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 160,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => fmtCount(d)},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: ACCENT, fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
}));
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The seven-bucket table above is the cross-venue view; this is what Rothera itself names.</div>

<details class="surface-card compact-details">
  <summary>How the buckets are built</summary>
  <p>Categories are rolled into seven shared buckets so venues can be read side by side. The taxonomy is broad because the broadest venue sets the ceiling &mdash; Kalshi publishes one <em>Sports</em> value where others name the sport, and inventing a split for it would be fabrication.</p>
  <p><strong>&ldquo;Other&rdquo; is not one thing.</strong> At Underdog it is the combo bucket; at Crypto.com/Nadex and DKeX it is a genuine residual, and Nadex carries a separate explicit <em>Parlays</em> value. It is mapped per venue rather than globally.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./rothera">Rothera &middot; Activity</a> for volume, open interest and top markets, <a href="./rothera-behavior">Trading behavior</a> for the trade tape, and <a href="./categories-venues">Products across venues</a> for the comparison.</div>
