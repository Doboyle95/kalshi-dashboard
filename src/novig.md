---
title: Novig
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>Novig</h1>
  <p class="page-lead">A peer-to-peer sports exchange that launched in early August 2026 and trades on Ludlow Exchange, a CFTC-designated contract market. This page covers what trades there, how it splits between takers and makers, and how much of it is parlays &mdash; plus the two numbers that only mean anything read together: <strong>Novig's spread measures at zero, and Novig still charges a commission</strong>. A venue that takes nothing in the price is not thereby free, and this page is built so that neither half can be quoted without the other.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/novig_daily.csv").csv({typed: true});
const tm = await DataAttachment("data/novig_taker_maker_daily.csv").csv({typed: true});
const parlay = await DataAttachment("data/novig_parlay_daily.csv").csv({typed: true});
const board = await DataAttachment("data/novig_market_leaderboard.csv").csv({typed: true});
```

```js
const NV = "#6366F1";
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;

const totalContracts = d3.sum(daily, d => d.contracts);
const meanEdge = tm.length ? d3.mean(tm, d => d.implied_edge) : null;
// Parlay share, and the denominator is the subtle part. This file USED to carry the
// singles as rows with legs=1, so summing every row gave all taker volume. It no longer
// does -- a one-leg parlay is not a thing and those rows were removed at the producer --
// so summing every row now gives PARLAY volume and the share would read a flat 100%.
//
// pct_of_day is each row's share of ALL taker volume that day, singles included, so the
// day's true total is recoverable: sum(pct) = 100*sum(v)/total, hence
// total = 100*sum(v)/sum(pct). Recomputed per day and summed, because the mix of parlay
// to single volume moves day to day and a single blended ratio would smear it.
const parlayTotal = d3.sum(parlay.filter(d => d.legs > 1), d => d.contracts);
const parlayAll = d3.sum(
  d3.rollup(
    parlay.filter(d => +d.pct_of_day > 0),
    v => 100 * d3.sum(v, d => d.contracts) / d3.sum(v, d => +d.pct_of_day),
    d => String(d.date)
  ).values()
);
const maxLegs = d3.max(parlay, d => d.legs);
```

<div class="grid grid-cols-4">
  <div class="card"><h2>Contracts traded</h2><span class="big">${fmtCount(totalContracts)}</span><span class="muted">${daily.length} days</span></div>
  <div class="card"><h2>Implied spread</h2><span class="big">${meanEdge == null ? "—" : `${(100 * meanEdge).toFixed(2)}%`}</span><span class="muted">measured &mdash; the fee is separate</span></div>
  <div class="card"><h2>Parlays</h2><span class="big">${parlayAll ? `${(100 * parlayTotal / parlayAll).toFixed(1)}%` : "—"}</span><span class="muted">of volume, up to ${maxLegs} legs</span></div>
  <div class="card"><h2>Markets traded</h2><span class="big">${fmtCount(d3.max(daily, d => d.markets_traded) ?? 0)}</span><span class="muted">busiest day</span></div>
</div>

## Daily volume

```js
Plot.plot({
  width,
  height: 320,
  marginLeft: 64,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.rectY(daily, {
      x: "date", y: "contracts", fill: NV, interval: "day",
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.markets_traded)} of ${d3.format(",")(d.markets_listed)} listed markets traded\nopen interest ${d3.format(",.0f")(d.open_interest)}`,
      tip: true
    })
  ]
})
```

## The spread, measured at zero

<div class="instruction-line"><strong>This measures the spread, and nothing else.</strong> One way an exchange can take money is in the price: the two sides sum to more than 1.00 and the venue keeps the difference. That is what is computed here &mdash; mean taker price plus mean maker price, minus one, <strong>recomputed from the tape every run rather than hardcoded</strong> &mdash; and it comes out at zero. <strong>A separate per-contract commission cannot appear in this test at all</strong>, and Novig charges one: see <a href="#what-novig-charges">what Novig charges</a> below. If Novig ever starts taking a spread as well, this line moves on its own instead of continuing to publish a zero.</div>

```js
Plot.plot({
  width,
  height: 260,
  marginLeft: 64,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Implied spread (%)", grid: true, tickFormat: d => `${(100 * d).toFixed(2)}%`},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(tm, {x: "date", y: "implied_edge", stroke: NV, strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(tm, {
      x: "date", y: "implied_edge", fill: NV, r: 4,
      stroke: "var(--theme-background)", strokeWidth: 2,
      title: d => `${fmtDate(d.date)}\nimplied spread ${(100 * d.implied_edge).toFixed(4)}%\nmean taker price ${d.mean_taker_price.toFixed(4)}\nmean maker price ${d.mean_maker_price.toFixed(4)}\n${d3.format(",")(d.taker_trades)} taker / ${d3.format(",")(d.maker_trades)} maker prints`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>Flat on zero &mdash; which is not the same as free.</strong> The zero is a real result about the book: across the paired tape the two sides sum to 1.00, so Novig takes nothing out of the price. It charges a per-contract commission instead, and a spread test cannot see one by construction. Both facts are below, and neither corrects the other.</div>

<div id="what-novig-charges"></div>

## What Novig charges

<div class="instruction-line"><strong>Novig is not commission-free, and this page said that it was until 2026-08-15.</strong> Its published schedule charges the <em>taker</em> a price-dependent fee per contract on two of its three trade types. The zero-spread measurement above is unchanged and unretracted &mdash; it measures the price, and on straight contracts the commission is not in the price. What is being corrected is the inference from one to the other: a venue that takes nothing in the spread can still charge for the trade.</div>

| Trade type | Maker | Taker |
|---|---|---|
| Pre-game straight | No fee | **No fee** |
| Live (in-game) straight | No fee | 0.03 &times; P &times; (1 &minus; P) per contract |
| Parlay | N/A on app/web; no fee via API | **0.10 &times; P &times; (1 &minus; P) per contract**, already inside the quoted price |

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>Three things in that table are routinely got wrong.</strong> <em>A parlay costs more than three times a straight</em> &mdash; the coefficient is 0.10, not 0.03. <em>Pre-game straights are free outright</em>, so the 0.03 bites only once a game is under way. And <em>the parlay fee is quoted all-in</em>: Novig's own worked example prices a parlay at 10.9&cent;, being a fair price of 10.0&cent; plus 0.10 &times; 0.10 &times; 0.90 = 0.9&cent; of fee. The maker side is never charged on any trade type, and a maker credit pays back <em>up to</em> half the taker fee on qualifying live straights &mdash; not on parlays, and not to exchange affiliates or holders of a market-maker agreement. There is no settlement fee: a winning contract pays the full $1.00.</div>

```js
// ---------------------------------------------------------------------------
// FEES -- deliberately loaded through a SECOND attachment instance.
//
// novig_fees_daily.csv is registered in sync_dashboard_data.py and in the repo
// copy of files.json, but NOT in the deployed /opt allowlist, and /opt is the
// list that decides what is actually served. Until it is added there, this
// fetch 404s. Two consequences, both handled here:
//   1. the page's main DataAttachment must not carry this load. A failure on it
//      sets data-dashboard-data-source="error" for the WHOLE page, which would
//      raise the transport's health signal over four files that are fine; and
//   2. the section has to degrade to the published schedule rather than vanish,
//      because the schedule is true whether or not the series is being served.
// A second instance carries its own marker, which is deliberately never
// displayed. The manifest promise is cached at module scope, so the second
// instance costs no extra request. Same pattern, and the same reasoning, as
// calibration-venues.md.
// ---------------------------------------------------------------------------
const FeeData = createRemoteDataAttachment(d3);
const fees = await (async () => {
  try {
    return await FeeData("data/novig_fees_daily.csv").csv({typed: true});
  } catch (error) {
    console.warn(`novig fees: computed series unavailable — ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
```

```js
// The coefficients are read from the file when it is being served, so a rate
// change picked up by the producer redraws these curves with no page edit. The
// constants are the published rates and are used only while the file is not
// being served -- they are the same two numbers the file carries in its
// k_straight_live and k_parlay columns.
const kStraightLive = fees.length && fees[0].k_straight_live != null ? fees[0].k_straight_live : 0.03;
const kParlay = fees.length && fees[0].k_parlay != null ? fees[0].k_parlay : 0.10;

const fmtUSD = d3.format("$,.0f");
const fmtUSDshort = d => d >= 1e6 ? `$${(d / 1e6).toFixed(2)}M` : d >= 1e3 ? `$${(d / 1e3).toFixed(0)}k` : fmtUSD(d);

const feeT = fees.length ? {
  days: fees.length,
  from: d3.min(fees, d => d.date),
  to: d3.max(fees, d => d.date),
  parlayFees: d3.sum(fees, d => d.parlay_fees_taker),
  parlayContracts: d3.sum(fees, d => d.parlay_contracts),
  parlayValue: d3.sum(fees, d => d.parlay_taker_value),
  straightCeil: d3.sum(fees, d => d.straight_fees_taker_max),
  straightContracts: d3.sum(fees, d => d.straight_contracts),
  straightValue: d3.sum(fees, d => d.straight_taker_value)
} : null;

// Ties the series back to the curve: where each half of the book sits on its
// own parabola, and what that is as a take rate. Built here rather than
// interpolated into the markdown so it stays one flat template literal.
const takeRateNote = !feeT ? "" : (() => {
  const parlayPerC = 100 * feeT.parlayFees / feeT.parlayContracts;
  const straightPerC = 100 * feeT.straightCeil / feeT.straightContracts;
  const parlayPeak = 100 * kParlay * 0.25;
  const straightPeak = 100 * kStraightLive * 0.25;
  return html`<p><strong>What that works out to, and why each half sits where it does on the curve above.</strong>
    Parlays are charged ${parlayPerC.toFixed(4)}&cent; per contract, only ${(100 * parlayPerC / parlayPeak).toFixed(0)}% of
    the ${parlayPeak.toFixed(2)}&cent; peak, because parlay prices sit far out in the long-shot tail where the parabola
    is shallow. The straight ceiling is ${straightPerC.toFixed(4)}&cent; per contract, ${(100 * straightPerC / straightPeak).toFixed(0)}%
    of its ${straightPeak.toFixed(2)}&cent; peak, because moneylines, spreads and totals cluster near 50&cent; where the
    fee is at its worst. As a share of taker-side value that is ${d3.format(",.0f")(10000 * feeT.parlayFees / feeT.parlayValue)}
    basis points on parlays against at most ${d3.format(",.0f")(10000 * feeT.straightCeil / feeT.straightValue)} on
    straights &mdash; parlays are the dearer of the two <em>as a rate</em> despite the smaller per-contract figure,
    because a parlay contract is cheap.</p>`;
})();
```

```js
display(feeT
  ? html`<div class="grid grid-cols-3">
      <div class="card"><h2>Parlay fees, exact</h2><span class="big">${fmtUSD(feeT.parlayFees)}</span><span class="muted">${feeT.days} days &middot; ${fmtCount(feeT.parlayContracts)} contracts</span></div>
      <div class="card"><h2>Straight fees, at most</h2><span class="big">${fmtUSD(feeT.straightCeil)}</span><span class="muted">could be as little as $0</span></div>
      <div class="card"><h2>Total, as a band</h2><span class="big">${fmtUSDshort(feeT.parlayFees)}&ndash;${fmtUSDshort(feeT.parlayFees + feeT.straightCeil)}</span><span class="muted">${fmtDate(feeT.from)} to ${fmtDate(feeT.to)}</span></div>
    </div>`
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>The computed series is not being served yet, so there are no daily fee numbers on this page.</strong> The file is built and is registered both in the sync list and in the repository allowlist, but the deployed allowlist that decides what is actually published does not carry it yet. Nothing above or below this line depends on it: the schedule and the curve are Novig's published rates, and they are correct either way.</div>`);
```

```js
// The fee curve is drawn from the formula, not from the tape, so it renders
// whether or not the daily series is being served. Drawing it matters because
// the shape is the thing that is misreported: aggregators quote the value at
// the peak as though it were a cap that binds across the book.
const feePrices = d3.range(1, 100).map(c => c / 100);
const feeCurveLong = feePrices.flatMap(p => [
  {cents: Math.round(p * 100), series: "Parlay", fee: 100 * kParlay * p * (1 - p)},
  {cents: Math.round(p * 100), series: "Live straight", fee: 100 * kStraightLive * p * (1 - p)},
  {cents: Math.round(p * 100), series: "Pre-game straight", fee: 0}
]);
const feeVertices = [
  {cents: 50, series: "Parlay", fee: 100 * kParlay * 0.25},
  {cents: 50, series: "Live straight", fee: 100 * kStraightLive * 0.25}
];
const feeWide = feePrices.map(p => ({
  cents: Math.round(p * 100),
  parlay: 100 * kParlay * p * (1 - p),
  straight: 100 * kStraightLive * p * (1 - p)
}));

display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 70,
  marginRight: 16,
  marginBottom: 42,
  x: {label: "Contract price (cents)", domain: [1, 99], grid: true, tickFormat: d => `${d}c`},
  y: {label: "Taker fee per contract (cents)", grid: true, domain: [0, 100 * kParlay * 0.25 * 1.25], tickFormat: d => `${d.toFixed(2)}c`},
  color: {legend: true, domain: ["Parlay", "Live straight", "Pre-game straight"], range: [NV, "#A5B4FC", "var(--theme-foreground-muted)"]},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(feeCurveLong, {x: "cents", y: "fee", stroke: "series", strokeWidth: 2}),
    Plot.dot(feeVertices, {x: "cents", y: "fee", fill: "series", r: 4, stroke: "var(--theme-background)", strokeWidth: 2}),
    Plot.text(feeVertices, {
      x: "cents", y: "fee", dy: -12,
      text: d => `${d.fee.toFixed(2)}c at 50c`,
      fill: "var(--theme-foreground-muted)", fontSize: 11
    }),
    Plot.ruleX(feeWide, Plot.pointerX({x: "cents", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(feeWide, Plot.pointerX({
      x: "cents",
      title: d => [
        `Contract price: ${d.cents}c`,
        `Parlay: ${d.parlay.toFixed(3)}c per contract`,
        `Live straight: ${d.straight.toFixed(3)}c per contract`,
        `Pre-game straight: 0c`
      ].join("\n")
    }))
  ]
}));
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem"><strong>The peak is not a cap.</strong> The taker fee is a parabola in the contract price, so it is largest in the middle of the book and falls to nothing at both ends. The widely quoted figure of $0.0075 per contract is <em>this curve's value at 50&cent;</em> &mdash; its vertex &mdash; and not a ceiling that binds anywhere else; at 10&cent; or 90&cent; the live-straight fee is 0.27&cent;, roughly a third of it. Implementing that number as a cap would overstate the fee across most of the book. The parlay curve has the same shape with a vertex of 2.5&cent;. Pre-game straights sit on zero, which is a real zero and not a missing series. Rounding is to the nearest 1/100,000 of a dollar, midpoint up, and is omitted here.</p>

```js
if (feeT) display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 320,
  marginLeft: 76,
  marginBottom: 40,
  x: {label: null, type: "utc", tickFormat: "%b %d"},
  y: {label: "Taker fees ($)", grid: true, tickFormat: d => fmtUSD(d)},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    // The uncertain remainder is drawn ON TOP of the exact floor and the two
    // rects do not overlap, so the tips cannot double-fire.
    Plot.rectY(fees, {
      x: "date", y1: d => d.parlay_fees_taker, y2: d => d.parlay_fees_taker + d.straight_fees_taker_max,
      fill: NV, fillOpacity: 0.22, interval: "day", insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\nstraight book: $0 to ${fmtUSD(d.straight_fees_taker_max)}\nthe range is real uncertainty, not an error bar\n${fmtCount(d.straight_contracts)} straight contracts`,
      tip: true
    }),
    Plot.rectY(fees, {
      x: "date", y: "parlay_fees_taker", fill: NV, interval: "day",
      insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\nparlay fees: ${fmtUSD(d.parlay_fees_taker)} exactly\n${fmtCount(d.parlay_contracts)} parlay contracts\ntaker-side value ${fmtUSD(d.parlay_taker_value)}`,
      tip: true
    })
  ]
}));
```

```js
if (feeT) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)"><strong>Solid is charged for certain; pale is the most the straight book could have been charged.</strong> The parlay floor of ${fmtUSD(feeT.parlayFees)} is exact. The straight ceiling of ${fmtUSD(feeT.straightCeil)} assumes every straight trade was placed in-game; the true figure is somewhere between that and zero, and the reason we cannot narrow it is set out below. Do not add the two into a single headline number without the word "up to".</div>`);
```

<details class="surface-card compact-details">
  <summary>How these fees are computed &mdash; and why one half is a range</summary>
  <p><strong>The parlay half is exact, and it is exact because the fee is inside the price.</strong> Novig quotes parlays all-in, so the price on our tape already contains the fee. The fee is recovered by inverting the venue's own formula rather than by applying it: if the quoted price is Q and the fair price is F, then Q = F + 0.10 &times; F &times; (1 &minus; F), which solves to F = (1.1 &minus; &radic;(1.21 &minus; 0.4Q)) / 0.2. Applying 0.10 &times; P &times; (1 &minus; P) to the <em>observed</em> price instead would overstate the fee, because the observed price is not the P the schedule refers to. The inversion is checked against Novig's published worked example on every run and the build fails if it stops reproducing it.</p>
  <p><strong>The straight half is a range because our feed cannot tell a pre-game trade from a live one.</strong> The schedule charges nothing before a game starts and 0.03 &times; P &times; (1 &minus; P) once it has, and that distinction turns on whether the event had commenced &mdash; a fact the trade file does not carry and the market file cannot supply, because it has no event start time. So the honest published figure is a bound: zero if every straight trade was pre-game, ${feeT ? "the ceiling drawn above" : "the ceiling"} if every one was live. Both ends are wrong and the truth is inside. This page publishes the band rather than picking a point, and it will keep publishing a band until the feed carries a live flag or an event start time.</p>
  <p><strong>The maker credit is not computed here, and on the measurable half it is zero anyway.</strong> Makers are charged nothing on every trade type, and a credit pays back <em>up to</em> half the taker fee &mdash; "up to" being the venue's own wording, a cap rather than a rate. The operative section of the exchange's filing is redacted, so the exact percentage is not available from a primary source and is not guessed at here. It does not affect the parlay figure regardless: the credit excludes parlays outright, and the parlay maker side is not charged, so parlay fees are also exactly what the exchange keeps. Any credit paid on live straights would reduce the pale band, never the solid bar.</p>
  <p><strong>The split is exhaustive, which is the check that matters.</strong> Parlay contracts plus straight contracts equal this page's own daily volume on every date, to the cent, so the fee calculation neither double-counts a trade nor drops one. Fees are counted on the taker side only, consistent with every other number on this page.</p>
  ${takeRateNote}
</details>

## Parlays by leg count

```js
const legAgg = Array.from(d3.rollup(parlay, v => d3.sum(v, d => d.contracts), d => d.legs), ([legs, contracts]) => ({legs, contracts})).sort((a, b) => a.legs - b.legs);
```

```js
Plot.plot({
  width,
  height: 280,
  marginLeft: 64,
  marginBottom: 44,
  x: {label: "Legs", type: "band"},
  y: {label: "Contracts", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(legAgg, {
      x: "legs", y: "contracts", fill: NV, ry2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.legs}-leg parlays\n${d3.format(",.0f")(d.contracts)} contracts`,
      tip: true
    })
  ]
})
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>The zero spread is measured, not taken from a press release &mdash; and it was never evidence that Novig is free.</strong> Across 92,087 paired trade groups the mean of taker price plus maker price came to 1.0000, with no group outside 0.98&ndash;1.05 &mdash; an implied venue cut of 0.00% <em>in the price</em>. That measurement stands unaltered. What changed on 2026-08-15 is what this page infers from it: Novig was widely reported as commission-free and this page repeated it, but the venue publishes a taker fee schedule charged per contract on top of the price, and a per-contract commission is invisible to a spread test by construction. The two findings are about different things and both are true. The producer recomputes the spread daily rather than writing a constant, so if Novig ever adds a spread on top of the commission, the chart moves on its own.</p>
  <p><strong>Every trade appears twice</strong> in Novig's feed, once as the taker and once as the maker. Volume, trade sizes and leaderboard totals here are <strong>taker-side only</strong>; summing both would double the venue. The one place both sides are used deliberately is the spread above, which is about the two sides by definition. The daily volume is verified against Novig's own <code>dailyVolume</code> figure on every date and the build fails if they ever diverge.</p>
  <p><strong>No calibration or P&amp;L, and this will not change without a feed change.</strong> Novig publishes no settlement outcome anywhere. Markets carry a status and a closing price, but on finalised markets that price spreads across the whole range &mdash; thousands of rows sit in the 0&ndash;9 band and hundreds in the 90&ndash;99 band, with only a handful at either extreme. That is a last traded price, not a resolution, and it must not be dressed up as one. Novig is the frustrating inverse of most venues here: it publishes who was the aggressor on every trade, which almost nobody does, but never publishes who won.</p>
  <p><strong>The leaderboard is keyed on contract type, not on individual markets.</strong> Novig's market identifiers are bare UUIDs and the feed carries no per-event name &mdash; no teams, no fixture, no description. The only published label is a series ticker covering many markets at once, so a per-market board would have produced a thousand rows sharing about 126 repeating names. Keyed on the contract type instead, every label is meaningful and the chart answers a real question: what does Novig actually trade?</p>
</details>

## What trades there

```js
Inputs.table(board.slice(0, 40), {
  columns: ["market_name", "category", "n_outcomes", "contracts", "last_trade_date"],
  header: {market_name: "Contract type", category: "League", n_outcomes: "Markets", contracts: "Contracts", last_trade_date: "Last trade"},
  format: {
    contracts: d => d3.format(",.0f")(d),
    n_outcomes: d => d3.format(",")(d),
    last_trade_date: d => fmtDate(d)
  },
  align: {contracts: "right", n_outcomes: "right"},
  width: {market_name: 240},
  rows: 12
})
```
