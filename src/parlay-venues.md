---
title: Cross-Venue Parlays
---

# Who sells parlays, and how long are they?

<p class="page-lead">Kalshi's own <a href="./parlay">parlay pages</a> ask how much of the venue is parlays, how many legs they carry, and what they cost the people buying them. This page asks the first two of those questions of every venue whose data can answer &mdash; and is explicit that the third, <strong>what parlays cost</strong>, remains a Kalshi-only chart, because no competitor here publishes a settled outcome.</p>

<div class="instruction-line"><strong>The headline contrast:</strong> parlays are a similar share of volume at several venues, but they are not the same product. Kalshi's are <em>long</em> &mdash; the largest single band is eight legs or more. ProphetX's are <em>short</em> &mdash; two-leg tickets dominate. A venue can look identical on share and be selling something quite different.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kParlay = await DataAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const kOverall = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const kEdge = await DataAttachment("data/parlay_house_edge_by_legs.csv").csv({typed: true});
const px = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const pxLegs = await DataAttachment("data/prophetx_parlay_legs.csv").csv({typed: true});
const nvParlay = await DataAttachment("data/novig_parlay_daily.csv").csv({typed: true});
const pmParlay = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
const udDaily = await DataAttachment("data/underdog_daily.csv").csv({typed: true});
```

```js
// Venue colour is the site-wide mapping and follows the entity, never the rank.
const C = {
  "Kalshi": "#00C2A8", "ProphetX": "#DB2777", "Novig": "#6366F1",
  "Polymarket US": "#3B7DD8", "Underdog": "#EAB308"
};
const fmtPct = d => `${d.toFixed(1)}%`;
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const iso = d => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

// Kalshi's parlay volume is spread across classes and leg buckets; total it per day and
// divide by the venue's own all-markets total from daily_overall.
const kByDay = d3.rollup(kParlay, v => d3.sum(v, d => d.contracts), d => iso(d.date));
const kTotalByDay = new Map(kOverall.map(d => [iso(d.date), d.contracts_total]));
const kShare = Array.from(kByDay, ([date, parlay]) => {
  const tot = kTotalByDay.get(date);
  return tot > 0 ? {venue: "Kalshi", date: new Date(date), share: 100 * parlay / tot, parlay, tot} : null;
}).filter(Boolean).sort((a, b) => a.date - b.date);

// Novig publishes contracts per leg-count per day; anything above one leg is a parlay.
const nvByDay = d3.rollup(nvParlay, v => ({
  parlay: d3.sum(v.filter(x => x.legs > 1), x => x.contracts),
  tot: d3.sum(v, x => x.contracts)
}), d => iso(d.date));
const nvShare = Array.from(nvByDay, ([date, o]) => o.tot > 0
  ? {venue: "Novig", date: new Date(date), share: 100 * o.parlay / o.tot, parlay: o.parlay, tot: o.tot} : null)
  .filter(Boolean).sort((a, b) => a.date - b.date);

const pxShare = px.filter(d => d.complete === 1)
  .map(d => ({venue: "ProphetX", date: d.date, share: d.pct_parlay, parlay: d.contracts_parlay, tot: d.contracts}));
const pmShare = pmParlay.filter(d => d.venue_contracts > 0)
  .map(d => ({venue: "Polymarket US", date: d.date, share: d.pct_of_venue, parlay: d.contracts, tot: d.venue_contracts}));
// Underdog's contracts_parlay column only starts being populated on 2026-07-30: the nine
// days before that are a contiguous block of exact zeros followed by a contiguous block of
// real values, which is a tracking cutover rather than nine parlay-free days. Counting them
// as genuine zeros understates the venue by about 3 points (33.8% against 36.8%), so the
// series starts at the first populated date and the window is reported on the bar.
const udFirst = d3.min(udDaily.filter(d => d.contracts_parlay > 0), d => d.date);
const udShare = udDaily
  .filter(d => d.contracts > 0 && d.contracts_parlay != null && udFirst != null && d.date >= udFirst)
  .map(d => ({venue: "Underdog", date: d.date, share: 100 * d.contracts_parlay / d.contracts, parlay: d.contracts_parlay, tot: d.contracts}));

const series = [...kShare, ...pxShare, ...nvShare, ...pmShare, ...udShare];

// Headline is volume-weighted over each venue's own coverage, not a mean of daily shares:
// a mean of percentages lets a near-zero day count as much as the venue's busiest.
const headline = Array.from(d3.group(series, d => d.venue), ([venue, v]) => {
  const parlay = d3.sum(v, d => d.parlay), tot = d3.sum(v, d => d.tot);
  const dates = v.map(d => d.date).sort((a, b) => a - b);
  return {venue, share: tot > 0 ? 100 * parlay / tot : 0, parlay, tot, days: v.length,
          from: dates[0], to: dates[dates.length - 1]};
}).filter(d => d.tot > 0).sort((a, b) => b.share - a.share);
```

## How much of each venue is parlays

<div class="instruction-line">Volume-weighted over each venue's own coverage, which differs a lot &mdash; Kalshi has close to a year, ProphetX two months, Novig and Polymarket days. Each bar states its own window; they are not a like-for-like time comparison.</div>

```js
Plot.plot({
  width,
  height: 60 + headline.length * 46,
  marginLeft: 116,
  marginRight: 116,
  x: {label: "Parlay share of contracts (%)", grid: true, nice: true},
  y: {label: null, domain: headline.map(d => d.venue)},
  color: {domain: Object.keys(C), range: Object.values(C)},
  marks: [
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barX(headline, {
      y: "venue", x: "share", fill: "venue", rx1: 4, insetTop: 3, insetBottom: 3,
      title: d => `${d.venue}\n${d.share.toFixed(2)}% of contracts are parlays\n${fmtCount(d.parlay)} of ${fmtCount(d.tot)}\n${d.days} days, ${iso(d.from)} to ${iso(d.to)}`,
      tip: true
    }),
    Plot.text(headline, {
      y: "venue", x: "share", text: d => `${d.share.toFixed(1)}%`,
      textAnchor: "start", dx: 6, fill: "var(--theme-foreground)", fontWeight: 600
    })
  ]
})
```

## Parlay share over time

<div class="instruction-line">Only venues with at least two weeks of history are drawn; a three-day line reads as a trend when it is nothing of the kind.</div>

```js
const longEnough = new Set(headline.filter(d => d.days >= 14).map(d => d.venue));
const overTime = series.filter(d => longEnough.has(d.venue));
const shown = headline.filter(d => longEnough.has(d.venue)).map(d => d.venue);
```

```js
Plot.plot({
  width,
  height: 340,
  marginLeft: 56,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Parlay share of contracts (%)", grid: true, zero: true},
  color: {legend: true, domain: shown, range: shown.map(v => C[v])},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(overTime, {x: "date", y: "share", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(overTime, {
      x: "date", y: "share", fill: "venue", r: 2.5,
      title: d => `${d.venue}\n${iso(d.date)}\n${d.share.toFixed(2)}% parlays\n${fmtCount(d.parlay)} of ${fmtCount(d.tot)} contracts`,
      tip: true
    })
  ]
})
```

## How many legs

<div class="instruction-line">Share of each venue's <em>parlay</em> volume by leg count, so venues of very different size sit on one axis. Kalshi publishes leg counts in buckets, so ProphetX and Novig are mapped into the same buckets rather than the other way around &mdash; anything else would compare a bucket to a number.</div>

```js
// Kalshi's own bucket vocabulary. Everyone else is mapped INTO it.
const BUCKETS = ["2", "3", "4", "5-7", "8+"];
const toBucket = n => n <= 2 ? "2" : n === 3 ? "3" : n === 4 ? "4" : n <= 7 ? "5-7" : "8+";

function dist(venue, rows, legField, contractField) {
  const agg = new Map(BUCKETS.map(b => [b, 0]));
  let unknown = 0;
  for (const r of rows) {
    const legs = +r[legField];
    const c = +r[contractField] || 0;
    if (!Number.isFinite(legs) || legs < 2) { if (c && !Number.isFinite(legs)) unknown += c; continue; }
    agg.set(toBucket(legs), agg.get(toBucket(legs)) + c);
  }
  const tot = d3.sum(agg.values()) + unknown;
  return BUCKETS.map(b => ({venue, bucket: b, pct: tot > 0 ? 100 * agg.get(b) / tot : 0, contracts: agg.get(b)}));
}

// Kalshi arrives pre-bucketed. Its "unknown" band is the honest left-join miss bucket for
// tickers not yet classified, NOT a leg count -- it is excluded from the denominator here
// and reported separately below rather than silently folded into a bar.
const kAug = kParlay.filter(d => d.n_legs_bucket !== "unknown");
const kUnknown = d3.sum(kParlay.filter(d => d.n_legs_bucket === "unknown"), d => d.contracts);
const kKnown = d3.sum(kAug, d => d.contracts);
const kDist = (() => {
  const agg = d3.rollup(kAug, v => d3.sum(v, d => d.contracts), d => d.n_legs_bucket);
  const tot = d3.sum(agg.values());
  return BUCKETS.map(b => ({venue: "Kalshi", bucket: b, pct: tot > 0 ? 100 * (agg.get(b) ?? 0) / tot : 0, contracts: agg.get(b) ?? 0}));
})();

const legDist = [...kDist, ...dist("ProphetX", pxLegs, "legs", "contracts"),
                 ...dist("Novig", nvParlay.filter(d => d.legs > 1), "legs", "contracts")];
const legVenues = ["Kalshi", "ProphetX", "Novig"];
```

```js
Plot.plot({
  width,
  height: 360,
  marginLeft: 56,
  marginBottom: 44,
  marginTop: 30,
  // Grouped bars: leg bucket is the outer group, venue the inner series.
  fx: {domain: BUCKETS, label: "Legs"},
  x: {domain: legVenues, axis: null, padding: 0.18},
  y: {label: "Share of that venue's parlay volume (%)", grid: true, zero: true},
  color: {legend: true, domain: legVenues, range: legVenues.map(v => C[v])},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(legDist, {
      fx: "bucket", x: "venue", y: "pct", fill: "venue", ry2: 4,
      insetLeft: 1, insetRight: 1,
      title: d => `${d.venue}\n${d.bucket} legs\n${d.pct.toFixed(1)}% of its parlay volume\n${fmtCount(d.contracts)} contracts`,
      tip: true
    }),
    Plot.text(legDist.filter(d => d.pct >= 8), {
      fx: "bucket", x: "venue", y: "pct", text: d => `${d.pct.toFixed(0)}%`,
      dy: -8, fill: "var(--theme-foreground)", fontSize: 11
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Kalshi additionally carries <strong>${fmtCount(kUnknown)} contracts</strong> (${(100 * kUnknown / (kUnknown + kKnown)).toFixed(1)}% of its parlay volume) whose legs are not yet classified. That band is the honest left-join miss for tickers the classifier has not reached, not a leg count, so it is excluded from the percentages above rather than folded into a bar.</div>

## What parlays cost — still Kalshi only

<div class="instruction-line">The chart every venue should have and only one can. Cost per parlay needs a <strong>settled outcome</strong>, and of the venues here only Kalshi publishes one: Underdog, Novig and ProphetX all run parlays and none of them publish who won. Polymarket does settle, but its parlay product is six days old.</div>

```js
const edge = kEdge.filter(d => d.pnl_per_100 != null && d.n_parlays > 0)
  .map(d => ({...d, legsNum: +String(d.legs).replace(/\D/g, "") || 0}))
  .filter(d => d.legsNum > 0);
```

```js
Plot.plot({
  width,
  height: 340,
  marginLeft: 60,
  marginBottom: 44,
  x: {label: "Legs", type: "band"},
  y: {label: "P&L per $100 staked", grid: true, tickFormat: d => `$${d.toFixed(0)}`},
  color: {legend: true, domain: ["multi-game(independent)", "same-game(correlated)"], range: ["#00C2A8", "#F97316"]},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(edge, {
      x: "legs", y: "pnl_per_100", fill: "kind", ry1: 4,
      insetLeft: 1, insetRight: 1,
      title: d => `${d.legs} legs, ${d.kind}\n$${d.pnl_per_100.toFixed(2)} per $100 staked\nwin rate ${d.win_rate_pct}%\n${d3.format(",")(d.n_parlays)} parlays`,
      tip: true
    })
  ]
})
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Coverage differs enormously and the bars do not correct for it.</strong> Kalshi has close to a year of history here, ProphetX about two months, Novig and Polymarket a matter of days. Each headline bar is volume-weighted over that venue's own window and states it on hover. A venue whose product launched last week is not being compared like-for-like with one that has run all year, and no amount of weighting fixes that &mdash; only time will.</p>
  <p><strong>Share is volume-weighted, not an average of daily percentages.</strong> Averaging daily shares lets a venue's quietest day count as much as its busiest, which flatters days with almost no volume. Every headline figure is total parlay contracts over total contracts across the window.</p>
  <p><strong>Leg counts are mapped into Kalshi's buckets, not the reverse.</strong> Kalshi publishes 2 / 3 / 4 / 5&ndash;7 / 8+; ProphetX and Novig publish exact integers. Mapping the exact numbers into the buckets loses detail but keeps the comparison honest; doing it the other way round would invent precision Kalshi never published. ProphetX's own exact distribution, out to twelve legs, is on <a href="./prophetx">its venue page</a>.</p>
  <p><strong>Kalshi's unclassified band is excluded, not hidden.</strong> A material share of Kalshi parlay volume sits in an "unclassified (pending legs)" bucket &mdash; the left-join miss for tickers the leg classifier has not yet reached. It is a processing state, not a leg count. Including it as a bar would imply a leg count nobody measured; excluding it silently would misstate the denominator. It is excluded from the percentages and reported underneath them.</p>
  <p><strong>Underdog's window is shorter than its data.</strong> Its parlay column begins on 2026-07-30 &mdash; before that, nine consecutive days record exactly zero parlay contracts and every day after records real ones. That shape is a tracking cutover, not nine parlay-free days, so those days are excluded rather than averaged in as zeros, which would have understated the venue by roughly three points.</p>
  <p><strong>Why the cost chart has one venue.</strong> Parlay P&amp;L needs a settled outcome per contract. Underdog runs parlays as the large majority of its volume and publishes no outcome; Novig publishes the aggressor on every trade and no outcome; ProphetX records that a contract resolved but not which side won. Polymarket US does settle and its parlay P&amp;L is on the <a href="./pnl-venues">cross-venue P&amp;L page</a>, but the product launched on 2026-08-06 and six days cannot carry a per-leg breakdown. This is a data-availability limit, not an editorial choice.</p>
</details>

## Every venue, side by side

```js
Inputs.table(headline, {
  columns: ["venue", "share", "parlay", "tot", "days", "from", "to"],
  header: {venue: "Venue", share: "Parlay share", parlay: "Parlay contracts", tot: "All contracts", days: "Days", from: "From", to: "To"},
  format: {
    share: d => fmtPct(d),
    parlay: d => fmtCount(d),
    tot: d => fmtCount(d),
    from: d => iso(d),
    to: d => iso(d)
  },
  align: {share: "right", parlay: "right", tot: "right", days: "right"},
  rows: 8
})
```
