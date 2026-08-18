---
title: Products
---

# Products

<p class="page-lead">What each venue sells, from broad category mix to sports contract types and parlay adoption.</p>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
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
const WIN_LO = "2026-07-15", WIN_HI = "2026-08-13";
const iso = d => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
const inWin = d => { const s = iso(d); return s >= WIN_LO && s <= WIN_HI; };

// The shared taxonomy is BROAD, because the broadest venue sets the ceiling: Kalshi
// publishes one "Sports" value while seven others name the sport. Rolling the sports up is
// lossy and the loss is stated on the page; inventing a sport split for Kalshi would be
// worse, because it would be fabricated.
const SPORT = new Set(["Baseball", "Soccer", "Tennis", "Golf", "Basketball", "Basketball (pro)",
  "Basketball (college)", "Football", "Combat sports", "MMA", "Boxing", "Motorsport", "Hockey",
  "Cricket", "Rugby", "Table tennis", "Esports", "Aussie Rules", "Sports"]);
const ECON = new Set(["Economics", "Financials", "Commodities", "Companies"]);
const POL = new Set(["Politics", "Elections"]);
const WX = new Set(["Weather", "Climate and Weather"]);
const CRYPTO = new Set(["Crypto"]);

// ⚠ "Other" is NOT one thing. At Underdog it is the combo/parlay bucket -- verified to three
// decimals against underdog_daily.contracts_parlay (36.575% vs 36.575%). At Nadex and DKeX it
// is a genuine residual, and Nadex carries a SEPARATE explicit "Parlays" value. Mapping
// "Other" globally would move a third of Underdog's book into the wrong bucket.
const PARLAY_VALUE = {
  "Nadex": new Set(["Parlays"]),
  "ProphetX": new Set(["Parlay (multi-event)"]),
  "Underdog": new Set(["Other"])
};

function bucketOf(venue, raw) {
  if ((PARLAY_VALUE[venue] ?? new Set()).has(raw)) return "Sports · parlays";
  if (SPORT.has(raw)) return "Sports";
  if (CRYPTO.has(raw)) return "Crypto";
  if (POL.has(raw)) return "Politics & elections";
  if (ECON.has(raw)) return "Economics & financials";
  if (WX.has(raw)) return "Weather & climate";
  return "Other";
}

const BUCKETS = ["Sports", "Sports · parlays", "Crypto", "Politics & elections",
                 "Economics & financials", "Weather & climate", "Other"];

// Parlays are a lighter shade of the Sports colour so the two read as one block.
const BC = {
  "Sports": "#0E7C6B",
  "Sports · parlays": "#7FD4C6",
  "Crypto": "#F97316",
  "Politics & elections": "#3B7DD8",
  "Economics & financials": "#9A6D1F",
  "Weather & climate": "#6366F1",
  "Other": "#9AA3AE"
};

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

<div class="instruction-line">Share of each venue's contracts over ${WIN_LO} to ${WIN_HI}. The pale green band is parlay volume inside sports. Use the scope control to inspect smaller non-sports categories without a second duplicate chart.</div>

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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Kalshi is the only sports-led venue with a materially non-sport book: <strong>${nonSport("Kalshi").toFixed(1)}%</strong> of its contracts are not sport, against <strong>${nonSport("ForecastEx").toFixed(1)}%</strong> at ForecastEx &mdash; which trades no sport at all &mdash; and under 2% at five of the eight.</div>

<div hidden aria-hidden="true">

## The same thing, without the sport

<div class="instruction-line">Sport dominates almost everywhere, which flattens everything else. Dropping it shows what each venue trades <em>besides</em> games &mdash; and how few of them trade anything else at all.</div>

```js
const nonSportRows = stacked.filter(d => !d.bucket.startsWith("Sports") && d.pct > 0);
```

```js
categoryScope === "__legacy" ? Plot.plot({
  width,
  height: 70 + order.length * 46,
  marginLeft: 116,
  marginRight: 20,
  x: {label: "Share of venue contracts (%)", grid: true},
  y: {label: null, domain: order},
  color: {legend: true, domain: BUCKETS.filter(b => !b.startsWith("Sports")), range: BUCKETS.filter(b => !b.startsWith("Sports")).map(b => BC[b])},
  marks: [
    Plot.barX(nonSportRows, {
      y: "venue", x: "pct", fill: "bucket", order: BUCKETS, insetTop: 3, insetBottom: 3, inset: 0.5,
      title: d => `${d.venue}\n${d.bucket}\n${d.pct.toFixed(3)}% of its contracts\n${fmtCount(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5})
  ]
}) : null
```

</div>

<div class="destination-grid">
  <a class="destination-card" href="./bet-types"><strong>Sports contract types</strong><span>Moneylines, spreads, totals, props, and how the mix changes.</span></a>
  <a class="destination-card" href="./parlay-venues"><strong>Parlays</strong><span>Venue share, adoption over time, and leg distribution.</span></a>
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
