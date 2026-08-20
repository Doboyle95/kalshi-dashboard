---
title: Cross-Venue Parlays
---

# Who sells parlays, and how long are they?

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kParlay = await DataAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const kOverall = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const px = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const pxLegs = await DataAttachment("data/prophetx_parlay_legs.csv").csv({typed: true});
const nvParlay = await DataAttachment("data/novig_parlay_daily.csv").csv({typed: true});
const pmParlay = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
const udDaily = await DataAttachment("data/underdog_daily.csv").csv({typed: true});
const nadexCats = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
```

```js
// Venue colour is the site-wide mapping and follows the entity, never the rank.
const C = {
  "Kalshi": "var(--accent-kalshi)", "ProphetX": "#DB2777", "Novig": "#6366F1",
  "Polymarket US": "var(--accent-polymarket)", "Underdog": "var(--accent-underdog)", "Crypto.com/Nadex": "var(--accent-nadex)"
};
const fmtPct = d => `${d.toFixed(1)}%`;
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const iso = d => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

// Kalshi's parlay volume is spread across classes and leg buckets; total it per day and
// divide by the venue's own ALL-MARKETS total from daily_overall.
//
// NOT LIKE FOR LIKE, and the page now says so. Every other venue here is a sportsbook, so
// its denominator is sports by construction; Kalshi's includes politics, economics and
// crypto, which understates its parlay share against the venues it sits beside.
// daily_overall carries no sports-only column (contracts_total and fees_total only), so a
// comparable denominator cannot be built here without a new producer -- disclosed rather
// than silently compared, and rather than guessed at.
const kByDay = d3.rollup(kParlay, v => d3.sum(v, d => d.contracts), d => iso(d.date));
const kTotalByDay = new Map(kOverall.map(d => [iso(d.date), d.contracts_total]));
const kShare = Array.from(kByDay, ([date, parlay]) => {
  const tot = kTotalByDay.get(date);
  return tot > 0 ? {venue: "Kalshi", date: new Date(date), share: 100 * parlay / tot, parlay, tot} : null;
}).filter(Boolean).sort((a, b) => a.date - b.date);

// Novig publishes contracts per leg-count per day, PARLAYS ONLY -- the singles were
// removed from that file at the producer, because a one-leg parlay is not a thing.
// So `tot` must NOT be the file's own row sum: that is parlay volume, and the share
// renders a flat 100% (it did, live, against a true 34.1%). pct_of_day is each row's
// share of ALL taker volume that day, singles included, so the day total comes back as
// sum(pct) = 100*sum(v)/total. The fallback keeps the old behaviour if the column ever
// disappears, rather than dividing by zero.
const nvByDay = d3.rollup(nvParlay, v => {
  const parlay = d3.sum(v.filter(x => x.legs > 1), x => x.contracts);
  const pct = d3.sum(v, x => +x.pct_of_day);
  return {parlay, tot: pct > 0 ? 100 * d3.sum(v, x => x.contracts) / pct : d3.sum(v, x => x.contracts)};
}, d => iso(d.date));
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

// Crypto.com/Nadex publishes a daily category bulletin rather than trade-level prints; its
// parlay product is the single "Parlays" (COMBOS) category line. Share is that line over the
// whole day's bulletin, on the same definition as every other venue here.
//
// The thirteen months 2024-12 through 2025-12 are EXACTLY 0.00% on real and rising volume
// (2025-12 alone is 365,754,942 contracts). Unlike Underdog's nine-day block below, this is
// NOT a tracking cutover to be excluded: the venue was open, busy, and selling no parlays.
// The first Parlays contracts appear on 2026-01-05. Dropping those months would delete the
// only pre-launch baseline any venue on this page has, which is the whole reason it is here.
const ndByDay = d3.rollup(nadexCats, v => ({
  parlay: d3.sum(v.filter(x => x.category === "Parlays"), x => x.contracts),
  tot: d3.sum(v, x => x.contracts)
}), d => iso(d.date));
const ndShare = Array.from(ndByDay, ([date, o]) => o.tot > 0
  ? {venue: "Crypto.com/Nadex", date: new Date(date), share: 100 * o.parlay / o.tot,
     parlay: o.parlay, tot: o.tot} : null)
  .filter(Boolean).sort((a, b) => a.date - b.date);
const ndLaunch = (ndShare.find(d => d.parlay > 0) ?? {}).date ?? null;

const series = [...kShare, ...pxShare, ...nvShare, ...pmShare, ...udShare, ...ndShare];

// Headline is volume-weighted over each venue's own coverage, not a mean of daily shares:
// a mean of percentages lets a near-zero day count as much as the venue's busiest.
const RECENT_DAYS = 30;
const headline = Array.from(d3.group(series, d => d.venue), ([venue, v]) => {
  const parlay = d3.sum(v, d => d.parlay), tot = d3.sum(v, d => d.tot);
  const dates = v.map(d => d.date).sort((a, b) => a - b);
  const to = dates[dates.length - 1];
  // Second, like-for-like number: the venue's OWN last 30 days. A venue whose window spans a
  // product launch has a lifetime share far below its current one -- Nadex is 18% over its
  // file and 36% over the last month -- and a lifetime bar on its own would read as a
  // contradiction of the same venue's figure on the categories page, which uses a 30-day
  // window. Both are correct; the difference is entirely the window, so both are drawn.
  const cut = d3.utcDay.offset(to, -(RECENT_DAYS - 1));
  const w = v.filter(d => d.date >= cut);
  const rParlay = d3.sum(w, d => d.parlay), rTot = d3.sum(w, d => d.tot);
  return {venue, share: tot > 0 ? 100 * parlay / tot : 0, parlay, tot, days: v.length,
          from: dates[0], to,
          share30: rTot > 0 ? 100 * rParlay / rTot : null, from30: cut, days30: w.length};
}).filter(d => d.tot > 0).sort((a, b) => b.share - a.share);
const fmtWin = (a, b) => `${d3.utcFormat("%b %Y")(a)}–${d3.utcFormat("%b %Y")(b)}`;
```

## Coverage and current share

```js
Inputs.table(headline, {
  columns: ["venue", "share30", "share", "parlay", "days", "from", "to"],
  header: {venue: "Venue", share30: `Latest ${RECENT_DAYS} days`, share: "Whole window",
           parlay: "Parlay contracts", days: "Days", from: "From", to: "To"},
  format: {
    share30: d => d == null ? "—" : fmtPct(d),
    share: fmtPct,
    parlay: fmtCount,
    from: iso,
    to: iso
  },
  align: {share30: "right", share: "right", parlay: "right", days: "right"},
  rows: 8
})
```

## How much of each venue is parlays

<div class="instruction-line">Volume-weighted over each venue’s own window, shown beside the bar; the tick is its last ${RECENT_DAYS} days.</div>

```js
Plot.plot({
  width,
  height: 60 + headline.length * 46,
  marginLeft: 134,
  marginRight: 196,
  x: {label: "Parlay share of contracts (%)", grid: true, nice: true},
  y: {label: null, domain: headline.map(d => d.venue)},
  color: {domain: Object.keys(C), range: Object.values(C)},
  marks: [
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barX(headline, {
      y: "venue", x: "share", fill: "venue", rx1: 4, insetTop: 3, insetBottom: 3,
      title: d => `${d.venue}\n${d.share.toFixed(2)}% of contracts are parlays over its whole window\n${fmtCount(d.parlay)} of ${fmtCount(d.tot)}\n${d.days} days, ${iso(d.from)} to ${iso(d.to)}`
        + (d.days > RECENT_DAYS ? `\nlast ${RECENT_DAYS} days: ${d.share30.toFixed(2)}% (${iso(d.from30)} to ${iso(d.to)})` : `\nwindow is shorter than ${RECENT_DAYS} days, so there is no separate recent figure`),
      tip: true
    }),
    // Black tick = the same venue's last 30 days. Drawn ONLY where the venue has more than 30
    // days: anywhere else it would sit on the end of its own bar and assert a comparison that
    // does not exist.
    Plot.tickX(headline.filter(d => d.days > RECENT_DAYS && d.share30 != null), {
      y: "venue", x: "share30", stroke: "var(--theme-foreground)", strokeWidth: 2.5, inset: 7,
      title: d => `${d.venue}\nlast ${RECENT_DAYS} days: ${d.share30.toFixed(2)}%\n${iso(d.from30)} to ${iso(d.to)}\nwhole window: ${d.share.toFixed(2)}%`,
      tip: true
    }),
    Plot.text(headline, {
      y: "venue", x: "share", text: d => `${d.share.toFixed(1)}%`,
      textAnchor: "start", dx: 6, fill: "var(--theme-foreground)", fontWeight: 600
    }),
    Plot.text(headline, {
      y: "venue", x: "share", text: d => fmtWin(d.from, d.to),
      textAnchor: "start", dx: 52, fontSize: 11, fill: "var(--theme-foreground-muted)"
    })
  ]
})
```

## Parlay share over time

<div class="instruction-line">Kalshi’s share is of its whole book, not just sport &mdash; every other venue here is a sportsbook.</div>

```js
const longEnough = new Set(headline.filter(d => d.days >= 14).map(d => d.venue));
const overTime = series.filter(d => longEnough.has(d.venue));
const shown = headline.filter(d => longEnough.has(d.venue)).map(d => d.venue);
const parlayBrushSeries = Array.from(d3.rollup(overTime, group => d3.max(group, d => d.share) ?? 0, d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const parlayDateSel = Mutable([d3.min(overTime, d => d.date), d3.max(overTime, d => d.date)]);
display(renderDateBrush({
  data: parlayBrushSeries,
  initialRange: [d3.min(overTime, d => d.date), d3.max(overTime, d => d.date)],
  onSelect: range => { parlayDateSel.value = range; },
  color: "var(--accent-nadex)",
  width
}));
```

```js
const [parlayBrushFrom, parlayBrushTo] = parlayDateSel;
const overTimeBrushed = overTime.filter(d => d.date >= parlayBrushFrom && d.date <= parlayBrushTo);
```

```js
Plot.plot({
  width,
  height: 360,
  marginLeft: 56,
  marginRight: 18,
  marginBottom: 40,
  // The domain now spans twenty months rather than eleven, so the tick format drops the day.
  x: {label: null, type: "utc", tickFormat: "%b %y"},
  y: {label: "Parlay share of contracts (%)", grid: true, zero: true},
  color: {legend: true, domain: shown, range: shown.map(v => C[v])},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    ndLaunch ? Plot.ruleX([ndLaunch], {stroke: "var(--theme-foreground-muted)", strokeDasharray: "3,3"}) : null,
    ndLaunch ? Plot.text([ndLaunch], {
      x: d => d, frameAnchor: "top", textAnchor: "start", dx: 5, dy: 4, fontSize: 11,
      fill: "var(--theme-foreground-muted)",
      text: () => `Nadex parlays begin ${iso(ndLaunch)}`
    }) : null,
    Plot.line(overTimeBrushed, {x: "date", y: "share", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(overTimeBrushed, {
      x: "date", y: "share", fill: "venue", r: 2.5,
      title: d => `${d.venue}\n${iso(d.date)}\n${d.share.toFixed(2)}% parlays\n${fmtCount(d.parlay)} of ${fmtCount(d.tot)} contracts`,
      tip: true
    })
  ].filter(Boolean)
})
```

## How many legs

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
const kAug = kParlay.filter(d => String(d.n_legs_bucket) !== "unknown");
const kUnknown = d3.sum(kParlay.filter(d => String(d.n_legs_bucket) === "unknown"), d => d.contracts);
const kKnown = d3.sum(kAug, d => d.contracts);
const kDist = (() => {
  // csv({typed:true}) coerces the bucket LABELS "2","3","4" to NUMBERS while "5-7" and
  // "8+" stay strings, so a string-keyed lookup missed exactly the numeric buckets and
  // drew Kalshi at zero for 2, 3 and 4 legs -- which is 34.8% of its parlay volume.
  // Coerce the key to String on both sides.
  const agg = d3.rollup(kAug, v => d3.sum(v, d => d.contracts), d => String(d.n_legs_bucket));
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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Crypto.com/Nadex, Underdog and Polymarket US publish no leg breakdown &mdash; absent here, not zero.</div>
