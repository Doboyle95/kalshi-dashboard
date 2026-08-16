---
title: Cross-Venue Parlays
---

# Who sells parlays, and how long are they?

<p class="page-lead">Compare parlay adoption, share of venue volume, and leg distribution. Bettor outcomes stay in the venue analyses because coverage is not comparable.</p>

<div class="instruction-line"><strong>The headline contrast:</strong> parlays are a similar share of volume at several venues, but they are not the same product. Kalshi's are <em>long</em> &mdash; the largest single band is eight legs or more. ProphetX's are <em>short</em> &mdash; two-leg tickets dominate. A venue can look identical on share and be selling something quite different.</div>

<div class="instruction-line" style="border-left-color:#9c27b0"><strong>New here:</strong> Crypto.com/Nadex, the only venue on this page whose file starts <em>before</em> its own parlay product did. Every other venue either always had parlays or arrived with them already running, so none of them can say whether a one-third share is a mature level or an early one. Nadex can: thirteen months at exactly zero, then a launch, then eight months that take it from 3.8% to 37.1% of the book. Its leg counts are <strong>not</strong> available and it is absent from the leg chart for that reason, which is stated there rather than left to be noticed.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
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
const nadexCats = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
```

```js
// Venue colour is the site-wide mapping and follows the entity, never the rank.
const C = {
  "Kalshi": "#00C2A8", "ProphetX": "#DB2777", "Novig": "#6366F1",
  "Polymarket US": "#3B7DD8", "Underdog": "#EAB308", "Crypto.com/Nadex": "#9c27b0"
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
const ndAllParlay = d3.sum(ndShare, d => d.parlay);

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
const hv = n => headline.find(d => d.venue === n) ?? {share: 0, share30: 0, parlay: 0, days: 0};
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

<div class="instruction-line">Volume-weighted over each venue's own coverage, which differs a lot &mdash; Crypto.com/Nadex has twenty months, Kalshi close to a year, ProphetX two months, Novig and Polymarket days. <strong>Each bar carries its own window in grey beside the number</strong>, because these are not a like-for-like time comparison and the windows are the reason. Where a venue has more than ${RECENT_DAYS} days, a black tick marks the same venue's <strong>last ${RECENT_DAYS} days</strong>: for a venue that spans a product launch the two are very different numbers, and the gap between bar and tick is the point rather than an error. Share is not size: Crypto.com/Nadex's ${fmtCount(hv("Crypto.com/Nadex").parlay)} parlay contracts are the largest parlay book on this page outside Kalshi, ${(hv("Crypto.com/Nadex").parlay / d3.max(headline.filter(d => !["Kalshi", "Crypto.com/Nadex"].includes(d.venue)), d => d.parlay)).toFixed(0)}&times; the next venue's, and it still sits mid-table here because share and size are different questions.</div>

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

<div class="instruction-line"><strong>Kalshi's bar is measured against a different base.</strong> Every other venue here is a sportsbook, so its denominator is sport by construction. Kalshi's is its whole book &mdash; politics, economics and crypto included &mdash; which understates its parlay share against the venues beside it. Read Kalshi's bar as a share of ALL Kalshi volume, not of its sports volume. Only venues with at least two weeks of history are drawn; a three-day line reads as a trend when it is nothing of the kind. Crypto.com/Nadex enters at the far left and runs flat along zero for thirteen months before anything else on this page starts: that flat line is real trading with no parlay product, not missing data. The dashed rule is the first day its bulletin reports any parlay volume.</div>

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
  color: "#9c27b0",
  width
}));
```

```js
const [parlayBrushFrom, parlayBrushTo] = parlayDateSel;
const overTimeBrushed = overTime.filter(d => d.date >= parlayBrushFrom && d.date <= parlayBrushTo);

// Nadex monthly, for the launch chart below. Volume-weighted inside the month, same as
// everywhere else on this page -- a mean of daily shares would let a quiet day count as much
// as a busy one. The final month is partial and says so on hover.
const ndMonthly = Array.from(
  d3.rollup(ndShare, v => ({parlay: d3.sum(v, d => d.parlay), tot: d3.sum(v, d => d.tot), days: v.length}),
            d => d3.utcFormat("%Y-%m")(d.date)),
  ([key, o]) => ({key, month: new Date(`${key}-01T00:00:00Z`),
                  share: o.tot > 0 ? 100 * o.parlay / o.tot : 0, ...o})
).sort((a, b) => a.month - b.month);
if (ndMonthly.length) ndMonthly[ndMonthly.length - 1].partial = true;
const ndZeros = ndMonthly.filter(d => d.parlay === 0);
const ndZeroMid = ndZeros.length ? ndZeros[Math.floor(ndZeros.length / 2)] : null;
const ndLast = ndMonthly[ndMonthly.length - 1] ?? {days: 0, share: 0};
const ndFirstDate = ndShare.length ? iso(ndShare[0].date) : "—";
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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>Three venues are on the share charts above and cannot be on this one. That is an absence, not a zero.</strong> <strong>Crypto.com/Nadex</strong> reports parlays as a single undifferentiated <code>COMBOS</code> bulletin line &mdash; ${fmtCount(ndAllParlay)} contracts with no leg breakdown anywhere in the file, so it joins the share charts and stops here. <strong>Underdog</strong> publishes a daily parlay contract total and no legs. <strong>Polymarket US</strong> publishes daily parlay contracts, trades and stake, and no legs. None of the three can be given a bar here without inventing a number its venue never published.</div>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Kalshi additionally carries <strong>${fmtCount(kUnknown)} contracts</strong> (${(100 * kUnknown / (kUnknown + kKnown)).toFixed(1)}% of its parlay volume) whose legs are not yet classified. That band is the honest left-join miss for tickers the classifier has not reached, not a leg count, so it is excluded from the percentages above rather than folded into a bar.</div>

<div hidden aria-hidden="true">

## What parlays cost — still Kalshi only

<div class="instruction-line">The chart every venue should have and only one can. Cost per parlay needs a settled outcome <strong>for the parlay itself</strong>, and of the venues here only Kalshi publishes one: Underdog, Novig and Crypto.com/Nadex all run parlays and none of them publish who won. <strong>ProphetX is the near miss.</strong> Its <em>single-market</em> outcomes turned out to be recoverable, and a calibration is now published from them &mdash; but not one of its 80,543 distinct parlay contracts carries a parseable event date, so the maturity test that recovers a single market's outcome cannot be applied to a parlay at all. Polymarket does settle, but its parlay product is days old.</div>

```js
const KINDS = ["multi-game(independent)", "same-game(correlated)"];
const LEGS_DOMAIN = ["2", "3", "4", "5", "6", "7", "8", "9", "10+"];
const legLab = v => String(v) === "A_10+" ? "10+" : String(+String(v).replace(/\D/g, "") || "");
// The two kinds used to be drawn as one stacked bar per leg count, which added two rates
// together: -3.10 and -6.81 per $100 became a -9.91 bar that is not a price of anything.
// Grouped, in the same fx idiom as the leg-count chart above, so each price reads on its own.
const edge = kEdge.filter(d => d.pnl_per_100 != null && d.n_parlays > 0 && d.taker_stake > 0)
  .map(d => ({...d, lab: legLab(d.legs)}))
  .filter(d => LEGS_DOMAIN.includes(d.lab));
const edgeTotC = d3.sum(edge, d => d.total_vol);      // contracts
const edgeTotD = d3.sum(edge, d => d.taker_stake);    // dollars staked by the taker
const shareC = rows => 100 * d3.sum(rows, d => d.total_vol) / edgeTotC;
const shareD = rows => 100 * d3.sum(rows, d => d.taker_stake) / edgeTotD;
const tenPlus = edge.filter(d => d.lab === "10+");
const twoLeg = edge.filter(d => d.lab === "2");
```

<div class="instruction-line"><strong>Contracts and dollars are different questions, and this file answers both.</strong> The ten-or-more-leg buckets are the largest in the table by contracts &mdash; ${fmtCount(d3.sum(tenPlus, d => d.total_vol))} of ${fmtCount(edgeTotC)}, ${shareC(tenPlus).toFixed(2)}% of Kalshi's settled parlay book &mdash; and they carry the two worst prices in it. Read on contracts alone, that says roughly a third of the parlay book is sold at the worst price on the board and invites the reader to treat it as a third of the harm. The same file says those buckets hold $${d3.format(",.1f")(d3.sum(tenPlus, d => d.taker_stake) / 1e6)}M of $${d3.format(",.1f")(edgeTotD / 1e6)}M staked, or ${shareD(tenPlus).toFixed(2)}% of the money, because a ten-leg ticket is a stack of cents. Hover any bar for the stake behind it: contracts and dollars disagree sharply at the long end.</div>

```js
// Bars are the price: P&L per $100 staked is a rate, and a rate has no unit to switch. Dot
// area is how much of the settled parlay book sits in that bucket, measured in CONTRACTS.
// The dollar reading is disclosed in each bar's tooltip rather than by a control that
// redraws the chart -- the two measures disagree hard at the long end, and a reader should
// be able to see both without the picture moving underneath them. No dual axis; size is
// not a second y.
const costSize = d => 100 * d.total_vol / edgeTotC;
// Radius ceiling spans BOTH measures' maxima, so the dot scale does not depend on which
// measure is drawn and the dollar percentages quoted in the tooltip can be read against the
// same scale. Derived rather than hard-coded so it cannot be outgrown by the file.
const costRMax = d3.max(edge, d => Math.max(100 * d.total_vol / edgeTotC,
                                            100 * d.taker_stake / edgeTotD));
```

```js
false ? Plot.plot({
  width,
  height: 380,
  marginLeft: 62,
  marginBottom: 46,
  marginTop: 30,
  fx: {domain: LEGS_DOMAIN, label: "Legs"},
  x: {domain: KINDS, axis: null, padding: 0.18},
  y: {label: "P&L per $100 staked", grid: true, tickFormat: d => `$${d.toFixed(0)}`},
  r: {domain: [0, costRMax], range: [0, 13]},
  color: {legend: true, domain: KINDS, range: ["#00C2A8", "#F97316"]},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(edge, {
      fx: "lab", x: "kind", y: "pnl_per_100", fill: "kind", ry1: 4,
      insetLeft: 1, insetRight: 1,
      title: d => `${d.lab} legs, ${d.kind}\n$${d.pnl_per_100.toFixed(2)} per $100 staked\nwin rate ${d.win_rate_pct}%\n${d3.format(",")(d.n_parlays)} parlays\n${fmtCount(d.total_vol)} contracts = ${(100 * d.total_vol / edgeTotC).toFixed(2)}% of the settled parlay book\n$${d3.format(",.0f")(d.taker_stake)} staked = ${(100 * d.taker_stake / edgeTotD).toFixed(2)}% of the money`,
      tip: true
    }),
    Plot.dot(edge, {
      fx: "lab", x: "kind", y: "pnl_per_100", r: costSize, fill: "kind",
      stroke: "var(--theme-background)", strokeWidth: 1
    })
  ]
}) : null
```

```js
false ? display(html`<div class="chart-note"><strong>Dot area is how big the bucket is, measured in
contracts traded.</strong> On that measure the two ten-plus buckets are
<strong>${shareC(tenPlus).toFixed(2)}%</strong> of the settled parlay book and the two two-leg
buckets are <strong>${shareC(twoLeg).toFixed(2)}%</strong>. In dollars staked they change places:
ten-plus is ${shareD(tenPlus).toFixed(2)}% of the money and two-leg is
${shareD(twoLeg).toFixed(2)}%. That second reading is on every bar's tooltip &mdash; the stake
behind the bar and its share of the money &mdash; rather than behind a control, because how big
a bucket looks should not depend on which measure a reader last picked. Part of the gap is
arithmetic &mdash; a cheap contract is a small stake &mdash; and part is not: the bar heights say
the cheap end is also the worst-priced end, the worst bucket losing
$${Math.abs(d3.min(edge, d => d.pnl_per_100)).toFixed(2)} per $100 staked against
$${Math.abs(100 * d3.sum(edge, d => d.taker_pnl) / edgeTotD).toFixed(2)} across the whole book. Neither
reading is the true one, and quoting either without the other is the thing to avoid.</div>`) : null
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Coverage differs enormously and the bars do not correct for it.</strong> Crypto.com/Nadex has twenty months of history here, Kalshi close to a year, ProphetX about two months, Novig and Polymarket a matter of days. Each headline bar is volume-weighted over that venue's own window and now states that window beside it. A venue whose product launched last week is still not being compared like-for-like with one that has run all year.</p>
  <p><strong>That used to end &ldquo;only time will fix this&rdquo;. It is now partly fixed, by one venue.</strong> Every venue on this page either always had parlays or arrived with them already running &mdash; except Crypto.com/Nadex, whose bulletin starts thirteen months before it sold a single parlay. Its share was <em>exactly</em> 0.00% for those thirteen months on real and growing volume, then ${ndMonthly.filter(d => d.parlay > 0).map(d => d.share.toFixed(1) + "%").join(", ")} month by month since, the last of those a part-month. So the page can now say something it could not before: a parlay book at a third of venue volume is not necessarily at rest, because the one book here that can be watched from launch was still climbing eight months in. That is one venue's launch curve, not a law, and it is the only one anybody has.</p>
  <p><strong>Nadex is 18% here and 36% on the categories page, and neither is wrong.</strong> This page's headline bar is volume-weighted over a venue's whole file; <a href="./categories-venues">the category-mix page</a> uses a rolling 30-day window. For a venue that spans its own product launch those are very different questions: ${hv("Crypto.com/Nadex").share.toFixed(2)}% over ${hv("Crypto.com/Nadex").days} days, ${hv("Crypto.com/Nadex").share30.toFixed(2)}% over the last ${RECENT_DAYS}. The black tick on the headline chart is that 30-day figure, drawn for every venue with more than ${RECENT_DAYS} days precisely so the two pages can be reconciled by eye instead of looking broken.</p>
  <p><strong>Crypto.com/Nadex has no leg counts at all.</strong> Its daily bulletin reports parlays as one undifferentiated <code>COMBOS</code> category line. There is no leg dimension in the file, so the venue appears on both share charts and is deliberately absent from the leg chart. Absent is not zero, and it is named on the chart rather than left to be inferred from a missing bar. Its parlay volume is also not directly comparable in construction to the others here: it is a daily bulletin category total, not a sum over trade-level prints.</p>
  <p><strong>Share is volume-weighted, not an average of daily percentages.</strong> Averaging daily shares lets a venue's quietest day count as much as its busiest, which flatters days with almost no volume. Every headline figure is total parlay contracts over total contracts across the window.</p>
  <p><strong>Leg counts are mapped into Kalshi's buckets, not the reverse.</strong> Kalshi publishes 2 / 3 / 4 / 5&ndash;7 / 8+; ProphetX and Novig publish exact integers. Mapping the exact numbers into the buckets loses detail but keeps the comparison honest; doing it the other way round would invent precision Kalshi never published. ProphetX's own exact distribution, out to twelve legs, is on <a href="./prophetx">its venue page</a>.</p>
  <p><strong>Kalshi's unclassified band is excluded, not hidden.</strong> About 1.3% of Kalshi parlay volume sits in an "unclassified (pending legs)" bucket &mdash; the left-join miss for tickers the leg classifier has not yet reached. It is a processing state, not a leg count. Including it as a bar would imply a leg count nobody measured; excluding it silently would misstate the denominator. It is excluded from the percentages and reported underneath them.</p>
  <p><strong>Underdog's window is shorter than its data.</strong> Its parlay column begins on 2026-07-30 &mdash; before that, nine consecutive days record exactly zero parlay contracts and every day after records real ones. That shape is a tracking cutover, not nine parlay-free days, so those days are excluded rather than averaged in as zeros, which would have understated the venue by roughly three points.</p>
  <p><strong>Why the cost chart has one venue.</strong> Parlay P&amp;L needs a settled outcome per contract. Underdog runs parlays as the large majority of its volume and publishes no outcome; Novig publishes the aggressor on every trade and no outcome; ProphetX publishes recoverable outcomes on its <em>single</em> markets, and a calibration built from them is now published, but its parlays are a different matter &mdash; not one of the 80,543 distinct parlay contracts listed in its bulletin carries a parseable event date, so the maturity test that makes a single market's outcome readable cannot be applied to a parlay at all, and 94.92% of those that do reach a terminal mark of 0 or 1 mark to 1, which cannot be a multi-leg win rate; Crypto.com/Nadex publishes a daily category bulletin with no outcome and no legs. Polymarket US does settle and its parlay P&amp;L is on the <a href="./pnl-venues">cross-venue P&amp;L page</a>, but the product launched on 2026-08-06 and a handful of days cannot carry a per-leg breakdown. This is a data-availability limit, not an editorial choice.</p>
  <p><strong>The cost chart's dots are contracts; the dollars are in the tooltip.</strong> Bar height is P&amp;L per $100 staked, which is a rate: it has no unit to switch. Dot area is how much of the settled parlay book sits in that bucket, measured in contracts traded, on a radius scale with headroom for either measure. The dollar reading &mdash; the stake behind each bar and its share of all stake &mdash; is disclosed on hover instead of through a control that redraws the chart, so the picture is the same for every reader. Both are needed: quoting the contracts figure alone lets a third of the contracts stand for a third of the money, which it is not; quoting the dollars figure alone implies the deep buckets barely matter, which is not true either &mdash; they are ${(100 * d3.sum(tenPlus, d => d.taker_pnl) / d3.sum(edge, d => d.taker_pnl)).toFixed(1)}% of everything the taker side lost. Note also that the two kinds are drawn side by side rather than stacked &mdash; the previous stack added two per-$100 rates together, which is not a price of anything.</p>
  <p><strong>The cost chart is settled parlays only.</strong> Its ${fmtCount(edgeTotC)} contracts are the settled subset of Kalshi's parlay volume, so it is smaller than the ${fmtCount(hv("Kalshi").parlay)} contracts behind Kalshi's bar above. The two are not meant to reconcile.</p>
</details>

## Every venue, side by side

```js
false ? Inputs.table(headline, {
  columns: ["venue", "share", "share30", "parlay", "tot", "days", "from", "to"],
  header: {venue: "Venue", share: "Parlay share (whole window)", share30: `Last ${RECENT_DAYS} days`,
           parlay: "Parlay contracts", tot: "All contracts", days: "Days", from: "From", to: "To"},
  format: {
    share: d => fmtPct(d),
    share30: d => d == null ? "—" : fmtPct(d),
    parlay: d => fmtCount(d),
    tot: d => fmtCount(d),
    from: d => iso(d),
    to: d => iso(d)
  },
  align: {share: "right", share30: "right", parlay: "right", tot: "right", days: "right"},
  rows: 8
}) : null
```

</div>
