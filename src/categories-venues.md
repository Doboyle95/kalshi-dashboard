---
title: Products
---

# Products

<p class="page-lead">What each venue sells, from broad category mix to sports contract types and parlay adoption.</p>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {bucketOf, BUCKETS, BUCKET_COLORS} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kCat = await DataAttachment("data/category_daily.csv").csv({typed: true});
const kParlay = await DataAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const dkex = await DataAttachment("data/dkex_categories_daily.csv").csv({typed: true});
const fx = await DataAttachment("data/forecastex_categories_daily.csv").csv({typed: true});
const nadex = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
const pm = await DataAttachment("data/polymarket_categories_daily.csv").csv({typed: true});
const px = await DataAttachment("data/prophetx_categories_daily.csv").csv({typed: true});
const roth = await DataAttachment("data/rothera_categories_daily.csv").csv({typed: true});
const ud = await DataAttachment("data/underdog_categories_daily.csv").csv({typed: true});
```

```js
// One window for all eight venues. Every figure on this page is inside it; nothing is
// all-time. That matters more than it sounds: over all time ForecastEx reads as a 36%
// football venue, and it has listed no sport since February.
//
// The window is DERIVED, never pinned -- a literal here froze the page on the day it was
// written and quietly dropped the newest week of every venue. WIN_HI is the last day EVERY
// loaded file has reported, which is also the last day none of them is still half-collecting;
// a per-venue max would compare eight different windows and read as a venue difference.
const iso = d => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
const WIN_HI = d3.min([kCat, kParlay, dkex, fx, nadex, pm, px, roth, ud],
  rows => d3.max(rows ?? [], r => r.date ? iso(r.date) : null)) ?? iso(new Date());
const WIN_LO = iso(d3.utcDay.offset(new Date(WIN_HI), -29));
const inWin = d => { const s = iso(d); return s >= WIN_LO && s <= WIN_HI; };

// The taxonomy, bucket order and bucket colours moved to components/venue-modules.js
// when the per-venue Products pages were added, so this comparison and those pages
// cannot drift apart on what "Sports" means. BC stays as a local alias so the marks
// below read exactly as before.
const BC = BUCKET_COLORS;

function roll(venue, rows, catCol, volCol) {
  const agg = new Map();
  for (const r of rows) {
    if (!inWin(r.date)) continue;
    const v = +r[volCol] || 0;
    if (v <= 0) continue;
    const b = bucketOf(venue, String(r[catCol] ?? "").trim());
    agg.set(b, (agg.get(b) ?? 0) + v);
  }
  return agg;
}

const RAW = [
  ["Kalshi", kCat, "kalshi_category", "contracts"],
  ["Polymarket US", pm, "category", "contracts"],
  ["Nadex", nadex, "category", "contracts"],
  ["Rothera", roth, "category", "contracts"],
  ["DKeX", dkex, "category", "contracts"],
  ["ProphetX", px, "category", "contracts"],
  ["Underdog", ud, "category", "contracts"],
  ["ForecastEx", fx, "category", "contracts"]
];

const perVenue = RAW.map(([venue, rows, c, v]) => {
  const agg = roll(venue, rows, c, v);
  // Kalshi books parlays INSIDE Sports, so its band is carved out rather than mapped.
  // Every other venue publishes the parlay bucket separately and needs no adjustment.
  if (venue === "Kalshi") {
    const p = d3.sum(kParlay.filter(r => inWin(r.date)), r => +r.contracts || 0);
    const sports = agg.get("Sports") ?? 0;
    agg.set("Sports", Math.max(0, sports - p));
    agg.set("Sports · parlays", p);
  }
  const tot = d3.sum(agg.values());
  return {venue, tot, shares: BUCKETS.map(b => ({bucket: b, pct: tot ? 100 * (agg.get(b) ?? 0) / tot : 0, contracts: agg.get(b) ?? 0}))};
}).filter(d => d.tot > 0);

// Order venues by how much of the book is NOT sport -- that is the axis the page is about.
const order = perVenue.slice().sort((a, b) => {
  const ns = v => 100 - v.shares.filter(s => s.bucket.startsWith("Sports")).reduce((x, s) => x + s.pct, 0);
  return ns(a) - ns(b);
}).map(d => d.venue);

const stacked = perVenue.flatMap(d => d.shares.map(s => ({venue: d.venue, ...s, tot: d.tot})));
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const nonSport = v => 100 - (perVenue.find(d => d.venue === v)?.shares.filter(s => s.bucket.startsWith("Sports")).reduce((x, s) => x + s.pct, 0) ?? 0);
// Computed, not asserted: the window moves, so a hard-coded "under 2% at five of the eight"
// goes wrong the week a venue lists its first non-sport market.
const restVenues = perVenue.map(d => d.venue).filter(v => v !== "Kalshi" && v !== "ForecastEx");
const restNonSportMax = d3.max(restVenues, nonSport) ?? 0;
```

## The mix, venue by venue

<div class="control-strip">

```js
const categoryScope = view(Inputs.radio(["All products", "Excluding sports"], {label: "Scope", value: "All products"}));
```

</div>

```js
const categoryRows = categoryScope === "Excluding sports"
  ? stacked.filter(d => !d.bucket.startsWith("Sports") && d.pct > 0)
  : stacked;
const categoryBuckets = categoryScope === "Excluding sports"
  ? BUCKETS.filter(d => !d.startsWith("Sports"))
  : BUCKETS;
```

<div class="instruction-line">Share of each venue's contracts over ${WIN_LO} to ${WIN_HI} &mdash; a rolling 30 days ending on the last day every venue reported. The pale green band is parlay volume inside sports. Use the scope control to inspect smaller non-sports categories without a second duplicate chart.</div>

```js
Plot.plot({
  width,
  height: 70 + order.length * 46,
  marginLeft: 116,
  marginRight: 20,
  x: {label: "Share of venue contracts (%)", domain: categoryScope === "All products" ? [0, 100] : undefined, grid: true},
  y: {label: null, domain: order},
  color: {legend: true, domain: categoryBuckets, range: categoryBuckets.map(b => BC[b])},
  marks: [
    Plot.barX(categoryRows, {
      y: "venue", x: "pct", fill: "bucket",
      order: BUCKETS, insetTop: 3, insetBottom: 3,
      // 2px surface gap between stacked segments
      inset: 0.5,
      title: d => `${d.venue}\n${d.bucket}\n${d.pct.toFixed(2)}% of its contracts\n${fmtCount(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5})
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Kalshi is the only sports-led venue with a materially non-sport book: <strong>${nonSport("Kalshi").toFixed(1)}%</strong> of its contracts are not sport, against <strong>${nonSport("ForecastEx").toFixed(1)}%</strong> at ForecastEx &mdash; which trades no sport at all &mdash; and at most <strong>${restNonSportMax.toFixed(1)}%</strong> at the other ${restVenues.length}.</div>

<div class="module-links">
  <a href="./parlay-venues">Compare parlay adoption →</a>
</div>

## Every venue and bucket

```js
Inputs.table(
  perVenue.flatMap(d => d.shares.filter(s => s.pct > 0).map(s => ({
    venue: d.venue, bucket: s.bucket, pct: s.pct, contracts: s.contracts
  }))).sort((a, b) => a.venue.localeCompare(b.venue) || b.pct - a.pct),
  {
    columns: ["venue", "bucket", "pct", "contracts"],
    header: {venue: "Venue", bucket: "Bucket", pct: "Share", contracts: "Contracts"},
    format: {pct: d => `${d.toFixed(3)}%`, contracts: d => fmtCount(d)},
    align: {pct: "right", contracts: "right"},
    rows: 16
  }
)
```
