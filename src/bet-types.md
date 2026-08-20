---
title: Bet Types
---

# What bet types actually trade, by venue

<p class="page-lead">The moneyline, spread, total, prop and parlay split of contracts traded at five venues over the same 30 days. This is what customers bet on, not what a venue is: season, listings and liquidity move the mix as much as product design does.</p>

<div class="instruction-line"><strong>The five venues do not share a vocabulary, so the mapping comes first.</strong> Kalshi says <em>Over/Under</em> where DraftKings and Underdog say <em>Total</em>; Underdog mints a fresh <code>Combo-&lt;hash&gt;</code> label for every parlay it books; Novig publishes no bet-type field at all and has to be decoded from its ticker. Every one of those decisions is set out in <a href="#what-each-bucket-is-made-of">what each bucket is made of</a>, with the venue's own label carried through so any of them can be undone.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const raw = await DataAttachment("data/bet_type_daily.csv").csv({typed: true});
```

```js
// ONE window for every venue on this page, and it is the same window
// /categories-venues uses. Nothing here is all-time, and that is not a formality:
// over all time Kalshi reads as a 45.3% moneyline venue, against 33.2% inside this
// window, because its parlay book grew across the period. Comparing one venue's
// all-time mix against another's recent weeks would be wrong about the largest
// bucket at the largest venue.
const WIN_LO = "2026-07-15", WIN_HI = "2026-08-13";
const iso = d => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
const inWin = d => { const s = iso(d); return s >= WIN_LO && s <= WIN_HI; };

// Drawing order, and the order of the stack. "Other" is LAST and is a real residual:
// what a venue trades that is none of the five shapes. It is never renormalised away.
const BUCKETS = ["Moneyline", "Spread", "Total", "Prop", "Parlay", "Other"];

// Same colours the Kalshi-only market-type chart on /categories already uses for the
// same buckets, so a reader moving between the two pages sees one scheme, not two.
const BC = {
  "Moneyline": "#4E79A7",
  "Spread": "#F28E2B",
  "Total": "#E15759",
  "Prop": "#59A14F",
  "Parlay": "#B07AA1",
  "Other": "#BAB0AC"
};

// Venue colours follow the ENTITY, site-wide.
const VC = {"Kalshi": "var(--accent-kalshi)", "Polymarket US": "var(--accent-polymarket)", "DKeX": "var(--accent-dkex)", "Underdog": "var(--accent-underdog)", "Novig": "#6366F1"};
const VENUE_ORDER = ["Kalshi", "Polymarket US", "DKeX", "Underdog", "Novig"];
const VENUE_LONG = {
  "Kalshi": "Kalshi",
  "Polymarket US": "Polymarket US",
  "DKeX": "DKeX (DraftKings)",
  "Underdog": "Underdog Exchange",
  "Novig": "Novig"
};

const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;
```

```js
const win = raw.filter(r => inWin(r.date) && (+r.contracts || 0) > 0);

// Per venue: total, share by bucket, and the dates it actually covers INSIDE the
// window. The coverage count is carried through to every caption rather than being
// assumed, because two of these five venues do not span the window.
const perVenue = VENUE_ORDER.map(venue => {
  const rows = win.filter(r => r.venue === venue);
  const tot = d3.sum(rows, r => +r.contracts || 0);
  const byBucket = d3.rollup(rows, v => d3.sum(v, r => +r.contracts || 0), r => r.bet_type);
  const dates = Array.from(new Set(rows.map(r => iso(r.date)))).sort();
  return {
    venue, tot, dates,
    days: dates.length, first: dates[0], last: dates[dates.length - 1],
    shares: BUCKETS.map(b => ({
      bucket: b,
      contracts: byBucket.get(b) ?? 0,
      pct: tot ? 100 * (byBucket.get(b) ?? 0) / tot : 0
    }))
  };
}).filter(d => d.tot > 0);

const share = (venue, bucket) =>
  perVenue.find(d => d.venue === venue)?.shares.find(s => s.bucket === bucket)?.pct ?? 0;
const biggest = venue => {
  const v = perVenue.find(d => d.venue === venue);
  return v ? v.shares.slice().sort((a, b) => b.pct - a.pct)[0] : {bucket: "—", pct: 0};
};
const ratio = (bucket) => share("DKeX", bucket) / (share("Kalshi", bucket) || NaN);
const total = venue => perVenue.find(d => d.venue === venue)?.tot ?? 0;
const cover = (venue, field) => perVenue.find(d => d.venue === venue)?.[field] ?? "—";

const stacked = perVenue.flatMap(d => d.shares.map(s => ({venue: d.venue, ...s, tot: d.tot})));
const winDays = Math.round((Date.parse(`${WIN_HI}T00:00:00Z`) - Date.parse(`${WIN_LO}T00:00:00Z`)) / 864e5) + 1;
```

<div class="grid grid-cols-4">
  <div class="card"><h2>Spreads</h2><span class="big">${ratio("Spread").toFixed(1)}&times;</span><span class="muted">${share("DKeX", "Spread").toFixed(2)}% at DKeX vs ${share("Kalshi", "Spread").toFixed(2)}% at Kalshi</span></div>
  <div class="card"><h2>Totals</h2><span class="big">${ratio("Total").toFixed(1)}&times;</span><span class="muted">${share("DKeX", "Total").toFixed(2)}% at DKeX vs ${share("Kalshi", "Total").toFixed(2)}% at Kalshi</span></div>
  <div class="card"><h2>Kalshi's biggest bucket</h2><span class="big">${biggest("Kalshi").pct.toFixed(1)}%</span><span class="muted">${biggest("Kalshi").bucket.toLowerCase()} — DKeX's is ${biggest("DKeX").bucket.toLowerCase()}</span></div>
  <div class="card"><h2>Venues drawn</h2><span class="big">${perVenue.length} of 10</span><span class="muted">the other six publish no bet type</span></div>
</div>

## The mix, venue by venue

<div class="instruction-line">Share of each venue's contracts over ${WIN_LO} to ${WIN_HI}. Bars are shares of that venue's own book, so they say nothing about relative size &mdash; Kalshi trades roughly ${total("DKeX") ? d3.format(",.0f")(total("Kalshi") / total("DKeX")) : "—"}&times; DKeX's contracts in this window and that is deliberately invisible here.</div>

```js
Plot.plot({
  width,
  height: 78 + perVenue.length * 48,
  marginLeft: 116,
  marginRight: 20,
  x: {label: "Share of venue contracts (%)", domain: [0, 100], grid: true},
  y: {label: null, domain: perVenue.map(d => d.venue)},
  color: {legend: true, domain: BUCKETS, range: BUCKETS.map(b => BC[b])},
  marks: [
    Plot.barX(stacked, {
      y: "venue", x: "pct", fill: "bucket",
      order: BUCKETS, insetTop: 3, insetBottom: 3,
      // ~2px surface gap between stacked segments
      inset: 0.5,
      title: d => `${VENUE_LONG[d.venue]}\n${d.bucket}\n${d.pct.toFixed(2)}% of its contracts\n${fmtCount(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5})
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Read the bars, not the ranking. <strong>Kalshi is parlay-led at ${share("Kalshi", "Parlay").toFixed(1)}%</strong>; DKeX is total-led at ${share("DKeX", "Total").toFixed(1)}%; Underdog and Novig are both moneyline-led. Underdog's top two are ${Math.abs(share("Underdog", "Moneyline") - share("Underdog", "Parlay")).toFixed(1)} points apart (moneyline ${share("Underdog", "Moneyline").toFixed(1)}%, combos ${share("Underdog", "Parlay").toFixed(1)}%) and the ordering turns entirely on counting its tennis <code>Matchwin</code> markets as moneylines. They are moneylines &mdash; but do not lean on the ordering, lean on the size of the buckets.</div>

## The two shapes a sportsbook runs on

<div class="instruction-line">Spreads and totals are the staples of a conventional book, and they are where Kalshi's shape diverges most. This is the same data as above, isolated: no stacking, no rounding to a leader, just the two buckets side by side.</div>

```js
const staples = perVenue.flatMap(d =>
  ["Spread", "Total"].map(b => ({
    venue: d.venue, bucket: b,
    pct: d.shares.find(s => s.bucket === b).pct,
    contracts: d.shares.find(s => s.bucket === b).contracts,
    days: d.days
  })));
```

```js
Plot.plot({
  width,
  height: 320,
  marginLeft: 56,
  marginBottom: 52,
  fx: {label: null, domain: ["Spread", "Total"]},
  x: {label: null, domain: VENUE_ORDER.filter(v => perVenue.some(d => d.venue === v)), tickRotate: -22},
  y: {label: "Share of venue contracts (%)", grid: true, tickFormat: d => `${d}%`},
  color: {legend: true, domain: VENUE_ORDER, range: VENUE_ORDER.map(v => VC[v])},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(staples, {
      fx: "bucket", x: "venue", y: "pct", fill: "venue",
      ry2: 4, insetLeft: 3, insetRight: 3,
      title: d => `${VENUE_LONG[d.venue]}\n${d.bucket}s: ${d.pct.toFixed(2)}% of its contracts\n${fmtCount(d.contracts)} contracts over ${d.days} days`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Spreads and totals together are <strong>${(share("DKeX", "Spread") + share("DKeX", "Total")).toFixed(1)}% of DKeX's book and ${(share("Kalshi", "Spread") + share("Kalshi", "Total")).toFixed(1)}% of Kalshi's</strong>. Kalshi lists these markets &mdash; this is not an absence of product &mdash; but on this window they draw a small fraction of the volume share they draw at the venue run by an actual sportsbook. Where that volume goes instead is the parlay bar above.</div>

## Does it hold day to day?

<div class="instruction-line">The same mix, per day, so a single unusual session cannot be doing the work. Gaps are real: Underdog's feed begins ${cover("Underdog", "first")} and Novig's ${cover("Novig", "first")}, and neither is padded.</div>

```js
const dailyShare = (() => {
  const out = [];
  const byVenueDate = d3.group(win, r => r.venue, r => iso(r.date));
  for (const [venue, byDate] of byVenueDate) {
    for (const [date, rows] of byDate) {
      const tot = d3.sum(rows, r => +r.contracts || 0);
      if (!tot) continue;
      const agg = d3.rollup(rows, v => d3.sum(v, r => +r.contracts || 0), r => r.bet_type);
      for (const b of BUCKETS) {
        const c = agg.get(b) ?? 0;
        if (c > 0) out.push({venue, date: new Date(`${date}T00:00:00Z`), bucket: b, pct: 100 * c / tot, contracts: c});
      }
    }
  }
  return out;
})();
const betTypeBrushSeries = Array.from(d3.rollup(dailyShare, group => d3.sum(group, d => d.contracts), d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const betTypeDateSel = Mutable([d3.min(betTypeBrushSeries, d => d.date), d3.max(betTypeBrushSeries, d => d.date)]);
display(renderDateBrush({
  data: betTypeBrushSeries,
  initialRange: [d3.min(betTypeBrushSeries, d => d.date), d3.max(betTypeBrushSeries, d => d.date)],
  onSelect: range => { betTypeDateSel.value = range; },
  color: "var(--accent-kalshi)",
  width
}));
```

```js
const [betTypeBrushFrom, betTypeBrushTo] = betTypeDateSel;
const dailyShareBrushed = dailyShare.filter(d => d.date >= betTypeBrushFrom && d.date <= betTypeBrushTo);
```

```js
Plot.plot({
  width,
  height: 130 * perVenue.length,
  marginLeft: 56,
  marginRight: 96,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Share of day (%)", domain: [0, 100], grid: true, ticks: 4},
  fy: {label: null, domain: perVenue.map(d => d.venue)},
  color: {legend: true, domain: BUCKETS, range: BUCKETS.map(b => BC[b])},
  marks: [
    Plot.rectY(dailyShareBrushed, {
      x: "date", y: "pct", fill: "bucket", fy: "venue",
      order: BUCKETS, interval: "day", inset: 0.5,
      title: d => `${VENUE_LONG[d.venue]} — ${fmtDate(d.date)}\n${d.bucket}: ${d.pct.toFixed(1)}% of the day\n${fmtCount(d.contracts)} contracts`,
      tip: true
    }),
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1})
  ]
})
```

## Window coverage

<div class="instruction-line">Two of the five venues do not span the window, and their bars above are therefore a shorter reading with a 30-day label. Nothing is extrapolated to fill the gap.</div>

```js
Inputs.table(
  perVenue.map(d => ({
    venue: VENUE_LONG[d.venue],
    days: `${d.days} of ${winDays}`,
    covered: `${d.first} → ${d.last}`,
    contracts: d.tot,
    top: `${biggest(d.venue).bucket} ${biggest(d.venue).pct.toFixed(1)}%`
  })),
  {
    columns: ["venue", "days", "covered", "contracts", "top"],
    header: {venue: "Venue", days: "Days with volume", covered: "Dates covered", contracts: "Contracts in window", top: "Largest bucket"},
    format: {contracts: d => fmtCount(d)},
    align: {contracts: "right"},
    rows: 6
  }
)
```

## What each bucket is made of

<div class="instruction-line">Every row is a label the venue itself publishes, and the bucket this page put it in. This is the whole mapping &mdash; there is nothing behind it. Sort by share to see what is actually driving a bar, or by venue to audit one venue's mapping end to end.</div>

```js
const mapping = Array.from(
  d3.rollup(win, v => d3.sum(v, r => +r.contracts || 0), r => r.venue, r => r.bet_type, r => r.source_type),
  ([venue, byBucket]) => Array.from(byBucket, ([bucket, bySrc]) =>
    Array.from(bySrc, ([source_type, contracts]) => {
      const tot = perVenue.find(d => d.venue === venue)?.tot ?? 0;
      return {venue, bucket, source_type, contracts, pct: tot ? 100 * contracts / tot : 0};
    })).flat()
).flat().filter(d => d.contracts > 0)
 .sort((a, b) => VENUE_ORDER.indexOf(a.venue) - VENUE_ORDER.indexOf(b.venue) || b.pct - a.pct);
```

```js
Inputs.table(mapping, {
  columns: ["venue", "source_type", "bucket", "pct", "contracts"],
  header: {venue: "Venue", source_type: "The venue's own label", bucket: "Bucket here", pct: "Share of venue", contracts: "Contracts"},
  format: {pct: d => `${d.toFixed(3)}%`, contracts: d => fmtCount(d)},
  align: {pct: "right", contracts: "right"},
  rows: 18
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The judgement calls are all visible in that table. DKeX's <code>Draw/Win</code>, Novig's <code>MONEYLINE_3_WAY_WIN</code> and Polymarket US's <code>drawable_outcome</code> are three-way soccer match results and are counted as moneylines; Underdog's <code>Matchwin</code> is a tennis match winner and is counted the same way. Kalshi's <code>Futures/Award</code> and Polymarket US's <code>futures</code> are <em>not</em> moneylines &mdash; a season champion is an outright, not a game result &mdash; and sit in Other alongside Novig's <code>SUPER_BOWL_WINNER</code> and <code>WORLD_SERIES_WINNER</code>.</div>

## What this page cannot show

<div class="instruction-line"><strong>Five of the site's ten venues are absent, and none of them is absent by accident.</strong> A venue appears here only if it publishes a bet type per market <em>and</em> a date to window it by. Listing them is the point: a five-venue chart that quietly implied it was the whole market would be worse than no chart.</div>

<div class="surface-card compact-details" style="padding:0.9rem 1.1rem">
<p style="margin:0 0 .5rem"><strong>ProphetX</strong> &mdash; the near miss, and the best candidate for the next version. Its per-market file stamps <code>market_type</code> as the constant string <code>market</code>, so the field is unusable. The bet type <em>is</em> recoverable by decoding its fixture-key grammar (<code>·S/-1.5</code> is a spread, <code>·T/O/8.5</code> a total, <code>ML3</code> a three-way moneyline), but only from a leaderboard that is all-time and capped at its top 1,000 markets &mdash; it cannot be windowed, and an all-time bar next to five windowed ones is the exact false comparison this page is built to avoid. Its <em>parlay</em> share alone is windowed and daily, on <a href="./parlay-venues">Cross-Venue Parlays</a>.</p>
<p style="margin:0 0 .5rem"><strong>ForecastEx, Crypto.com/Nadex, Rothera</strong> &mdash; no bet-type field exists anywhere in these three feeds. They publish a category and a market title; nothing distinguishes a spread from a total from a moneyline without parsing English question text, which would be a guess dressed as data.</p>
<p style="margin:0"><strong>CME (FanDuel/DraftKings)</strong> &mdash; the feed is a daily aggregate of call and put volume and open interest. There is no per-market row of any kind, so no split of any kind is possible.</p>
</div>

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>One window, everywhere: ${WIN_LO} to ${WIN_HI}</strong>, the same window <a href="./categories-venues">Cross-Venue Categories</a> uses. Nothing on this page is all-time and the difference is large: measured 2026-08-14, Kalshi's all-time mix is 45.25% moneyline and 31.21% parlay, against ${share("Kalshi", "Moneyline").toFixed(2)}% and ${share("Kalshi", "Parlay").toFixed(2)}% inside this window. Its parlay book grew across the period. An all-time Kalshi bar beside a two-month DKeX bar would be wrong about the largest bucket at the largest venue, so no all-time view is offered here at all.</p>
  <p><strong>Two venues do not span the window and are drawn short, not padded.</strong> Underdog's feed starts ${cover("Underdog", "first")} (${cover("Underdog", "days")} of ${winDays} days) and Novig launched in early August (${cover("Novig", "days")} of ${winDays} days). <strong>Novig's bar is a ten-day reading with a thirty-day label</strong> and should be treated as indicative. Both venues are also on a launch ramp, so their mix is weighted towards their most recent sessions.</p>
  <p><strong>These are shares of contracts, not dollars, and not comparable in level across venues.</strong> Each venue's <code>contracts</code> is its own one-side convention, carried through unchanged: Kalshi's contract count, DKeX's and Underdog's daily market-report volume, and Novig's one-side daily volume (its tape prints every trade twice, once as taker and once as maker, and the maker copy is excluded). Only the within-venue shares this page draws are comparable. Contract share also overweights cheap longshot markets, which flatters parlay and prop buckets at every venue that has them.</p>
  <p><strong>Polymarket US spans all ${winDays} days, but its parlay bar does not.</strong> The venue launched parlays on 2026-08-12, so only the last two days of the window contain any &mdash; its ${share("Polymarket US", "Parlay").toFixed(3)}% is a launch artifact, not a settled level. Its bucket comes from the venue's own <code>market_type</code> field, joined to the daily market report on a symbol key that matches byte for byte, and its window total sits 0.018% above the venue's published headline volume &mdash; the same order as the DKeX and Underdog gaps described next, and for the same reason.</p>
  <p><strong>The DKeX and Underdog numbers come from those venues' daily <em>market</em> reports, not their time-and-sales tapes.</strong> The market report is the only one of the two that carries a market type at all. It disagrees with the tape by a small margin — over the dates in common, +0.018% at DKeX and +0.011% at Underdog — so totals here will not tie exactly to the headline volume on <a href="./dkex">DKeX</a> or <a href="./underdog">Underdog</a>. Every date reconciles to the <code>market_report_volume</code> column on those venues' own daily files exactly, and Kalshi and Novig reconcile exactly to <code>sports_market_type_daily.csv</code> and <code>novig_daily.csv</code> respectively.</p>
  <p><strong>"Other" is a residual, not a rounding.</strong> Nothing is renormalised: every contract of input volume lands in exactly one of the six buckets, and what does not fit the five sportsbook shapes is shown rather than removed. It is ${share("Kalshi", "Other").toFixed(2)}% at Kalshi &mdash; season futures, awards, esports, cricket, motorsport, and the venue's own "Other" &mdash; ${share("Novig", "Other").toFixed(2)}% at Novig, and exactly zero at DKeX and Underdog, whose published taxonomies have six and five labels and map completely. <strong>The two zeros in the Parlay and Prop columns are also real, not missing data:</strong> DKeX's daily market report contains no parlay contract at all, and Underdog's contains no player-prop contract under its own label.</p>
  <p><strong>Underdog's combo bucket is a black box, and it is ${share("Underdog", "Parlay").toFixed(1)}% of that venue.</strong> Underdog mints one ticker per parlay (<code>UDXCOMBO-&lt;hash&gt;</code>) carrying no sport code and no bet-type code, so the legs inside cannot be read. Underdog Fantasy's core product is player pick'em, so a large but unmeasurable share of that bucket is very likely prop-shaped &mdash; which means <strong>Underdog's 0% prop bar understates its real prop exposure</strong> and its combo bar is not like-for-like with Kalshi's parlay bar, whose legs <em>are</em> classified. The collapse rule that produces the bucket is the one <a href="./underdog">Underdog</a> already uses and verifies.</p>
  <p><strong>Novig has no published bet-type field; its bucket is decoded from the ticker.</strong> <code>MLB-MONEY</code>, <code>ATP-SET_SPREAD</code>, <code>WNBA-TOTAL</code>, the bare <code>COMBO</code>. Its <code>market_type</code> column is a constant placeholder and is never read. Two decodings are worth knowing: <code>MLB-TOTAL_BASES</code> is a batter's total bases and is counted as a prop, not a total, while <code>MLB-TOTAL_HOME_RUNS</code> and <code>MLS-TOTAL_CORNERS</code> are game totals; and every Novig outright ends in <code>WINNER</code>, which is what separates them from its moneylines. Any ticker the decoder does not recognise falls into Other under its own name, so it appears in the mapping table above rather than being absorbed into a bucket it may not belong in.</p>
  <p><strong>A "day" is not the same day at every venue.</strong> Kalshi, DKeX and Underdog date by calendar day; Novig's file is dated by its own reporting day. Over a thirty-day window this shifts boundaries rather than totals, but it means the window is not literally identical across the four.</p>
</details>
