---
title: Accuracy & Outcomes
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Accuracy & Outcomes</h1>
  <p class="page-lead">Whether traded prices match eventual outcomes, using the strongest settled sample each venue can support.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS} from "./components/venue-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const kCurve = await DataAttachment("data/calibration_three_way.csv").csv({typed: true});
const kClusters = await DataAttachment("data/calibration_three_way_clusters.csv").csv({typed: true});
const pm = await DataAttachment("data/calibration_polymarket.csv").csv({typed: true});
const fx = await DataAttachment("data/forecastex_calibration.csv").csv({typed: true});
const dk = await DataAttachment("data/dkex_calibration.csv").csv({typed: true});
const px = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
// THE WHOLE CONTRACT SUITE, not just parlays. Calibration asks whether a contract
// trading at price p resolves that way p% of the time, which needs no aggressor flag --
// so crypto strikes, sports events and combos all qualify. (P&L is the opposite case and
// stays parlays-only: buyer-equals-taker holds only for a house-quoted combo.)
const nd = await DataAttachment("data/nadex_calibration.csv").csv({typed: true});

const number = value => value == null || value === "" || Number.isNaN(+value) ? null : +value;
const kClusterMap = new Map(kClusters.map(d => [`${d.group}|${d.price_bin}`, d]));
const normalized = [
  ...kCurve.filter(d => d.group === "ALL").map(d => {
    const cluster = kClusterMap.get(`${d.group}|${d.price_bin}`);
    return {venue: "Kalshi", bin: +d.price_bin, implied: number(d.implied_prob), actual: number(d.actual_win_rate_wt), error: number(d.calib_error), se: number(cluster?.se_calib_error_mid), events: number(cluster?.n_effective ?? cluster?.n_events), contracts: number(d.n_contracts)};
  }),
  ...pm.filter(d => d.group === "ALL_DEEP").map(d => ({venue: "Polymarket US", bin: +d.price_bin, implied: number(d.implied_prob), actual: number(d.actual_win_rate_wt), error: number(d.calib_error), se: number(d.se_wt), events: number(d.n_events_eff ?? d.n_events), contracts: number(d.n_contracts)})),
  ...fx.filter(d => d.group === "ALL_EX_ELECTION").map(d => {
    const implied = (+d.price_bin + 2.5) / 100, actual = number(d.actual_win_rate_wt);
    return {venue: "ForecastEx", bin: +d.price_bin, implied, actual, error: actual == null ? null : actual - implied, se: number(d.se_event_cents_qty) / 100, events: number(d.g_eff ?? d.n_events), contracts: number(d.n_contracts)};
  }),
  ...dk.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => ({venue: "DKeX", bin: +d.price_bin, implied: number(d.implied_prob), actual: number(d.actual_win_rate_wt), error: number(d.calib_error), se: number(d.se_clustered), events: number(d.n_events), contracts: number(d.n_contracts)})),
  ...px.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => {
    const contracts = number(d.n_contracts), sumPrice = number(d.sum_price_contracts), actual = number(d.actual_win_rate_wt);
    const implied = contracts > 0 && sumPrice != null ? sumPrice / contracts / 100 : null;
    return {venue: "ProphetX", bin: +d.price_bin, implied, actual, error: implied == null || actual == null ? null : actual - implied, se: number(d.se_clustered), events: number(d.n_events), contracts};
  }),
  // x is the CONTRACT-WEIGHTED PRICE ACTUALLY PAID off Nadex's own tape, not a bin
  // midpoint, and n_eff counts effective CONTRACTS rather than prints -- one contract can
  // print dozens of times and every print shares a single settlement.
  ...nd.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => ({venue: "Crypto.com/Nadex", bin: +d.price_bin, implied: number(d.implied), actual: number(d.actual), error: number(d.calib_error), se: number(d.se_calib_error), events: number(d.n_eff), contracts: number(d.contracts)}))
].filter(d => Number.isFinite(d.bin) && d.implied != null && d.actual != null && d.error != null && d.se != null);

const venues = Array.from(new Set(normalized.map(d => d.venue)));
const colorOf = venue => VENUE_COLORS[venue];
```

<div class="control-strip">

```js
const selectedAccuracyVenues = view(Inputs.checkbox(venues, {label: "Venues", value: venues}));
```

</div>

```js
const accuracyRows = normalized.filter(d => selectedAccuracyVenues.includes(d.venue));
```

<p class="chart-note">Coverage: ${venues.join(" · ")}. Crypto.com/Nadex is its whole contract suite — strikes, events and combos — of which 64.45% of traded contracts join a settled outcome; most of the remainder expire after the collection window, so no settlement file can hold them. Excluded, never imputed. Underdog, Rothera, Novig, and CME do not currently publish enough outcome-linked price data for this comparison.</p>

## Actual vs implied win rate

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: Math.max(360, Math.min(520, width * 0.8)),
  marginLeft: 58, marginRight: 20, marginBottom: 50,
  x: {label: "Implied probability", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  y: {label: "Actual win rate", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  color: {legend: true, domain: venues, range: venues.map(colorOf)},
  marks: [
    Plot.line([{implied: 0, actual: 0}, {implied: 1, actual: 1}], {x: "implied", y: "actual", stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1.5}),
    Plot.dot(accuracyRows, {x: "implied", y: "actual", fill: "venue", r: 3.5, fillOpacity: 0.78, stroke: "var(--theme-background)", strokeWidth: 0.6, tip: true, title: d => `${d.venue}\n${Math.round(100*d.implied)}¢ implied · ${(100*d.actual).toFixed(1)}% actual\n${Math.round(d.events ?? 0).toLocaleString()} effective/independent events`})
  ]
})
```

## Calibration error by price

<p class="section-intro">Actual minus implied probability. Intervals are ±2 event-clustered standard errors; an interval crossing zero is not distinguishable from calibration.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 90 + 125 * selectedAccuracyVenues.length,
  marginLeft: 60, marginRight: 150,
  facet: {data: accuracyRows, y: "venue"}, fy: {label: null, domain: selectedAccuracyVenues},
  x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
  y: {label: "Actual − implied (percentage points)", grid: true},
  color: {domain: venues, range: venues.map(colorOf)},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-muted)"}),
    Plot.ruleY(accuracyRows, {x: d => 100*d.implied, y1: d => 100*(d.error - 2*d.se), y2: d => 100*(d.error + 2*d.se), stroke: "venue", strokeOpacity: 0.55}),
    Plot.dot(accuracyRows, {x: d => 100*d.implied, y: d => 100*d.error, fill: "venue", r: 4, tip: true, title: d => `${d.venue}\n${d.bin}–${d.bin+5}¢\nError ${(100*d.error).toFixed(2)} pp ± ${(200*d.se).toFixed(2)} pp`})
  ]
})
```

## Favourite–longshot summary

```js
function weightedBand(rows, test) {
  const selected = rows.filter(test).filter(d => d.contracts > 0);
  const weight = d3.sum(selected, d => d.contracts);
  return weight ? d3.sum(selected, d => d.error * d.contracts) / weight : null;
}
const tailSummary = venues.map(venue => {
  const rows = normalized.filter(d => d.venue === venue);
  const longshots = weightedBand(rows, d => d.implied < .30);
  const favorites = weightedBand(rows, d => d.implied >= .70);
  return {venue, longshots, favorites, spread: longshots == null || favorites == null ? null : favorites - longshots};
});
display(Inputs.table(tailSummary, {
  columns: ["venue", "longshots", "favorites", "spread"],
  header: {venue: "Venue", longshots: "Longshots <30¢", favorites: "Favorites ≥70¢", spread: "Favorite − longshot"},
  format: {
    longshots: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`,
    favorites: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`,
    spread: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`
  },
  rows: venues.length
}));
```

<details class="surface-card compact-details">
  <summary>Definitions and interval method</summary>
  <p>All curves are contract-weighted and use the strongest venue-wide settled group in each producer. Error bars cluster prints on the underlying event. Price-side conventions differ by venue and are documented in <a href="./methodology">Methodology &amp; coverage</a>.</p>
</details>
