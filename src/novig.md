---
title: Novig
---

<div class="page-hero">
  <div class="page-eyebrow">Competitor</div>
  <h1>Novig</h1>
  <p class="page-lead">Daily activity, published fees, parlay length, and leading markets on Novig.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const daily = await DataAttachment("data/novig_daily.csv").csv({typed: true});
const parlay = await DataAttachment("data/novig_parlay_daily.csv").csv({typed: true});
const board = await DataAttachment("data/novig_market_leaderboard.csv").csv({typed: true});
// Categories are loaded defensively because this file is the newest of the set and
// the deployed allowlist -- not the repository one -- decides what is actually
// served. If it is ever absent the section below says so and the rest of the page
// is unaffected.
const category = await (async () => {
  try {
    return await DataAttachment("data/novig_category_daily.csv").csv({typed: true});
  } catch (error) {
    console.warn(`novig categories: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
// The named-game board. Built by build_novig_game_leaderboard.py, which resolves Novig's
// bare market UUIDs to real fixtures through the public GraphQL event descriptions.
const gameBoard = await (async () => {
  try {
    return await DataAttachment("data/novig_game_leaderboard.csv").csv({typed: true});
  } catch (error) {
    console.warn(`novig games: series unavailable -- ${String(error?.message ?? error).slice(0, 200)}`);
    return [];
  }
})();
```

```js
const NV = "#6366F1";
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d >= 1e3 ? `${(d / 1e3).toFixed(0)}k` : d3.format(",.0f")(d);
const fmtDate = d => d instanceof Date ? d.toLocaleDateString("en-US", {timeZone: "UTC", month: "short", day: "numeric"}) : d;

const totalContracts = d3.sum(daily, d => d.contracts);
// What Novig actually takes: the fee, from its published schedule.
// Open interest replaces a mean-fee KPI that could never carry a number. Novig
// publishes its straight-book fee as a BOUNDED RANGE rather than a point estimate,
// so the per-contract mean was empty by construction, not by accident. Open interest
// is published outright, is a stock rather than a third flow measure, and until now
// appeared only in a tooltip on the volume chart.
const novigOi = daily.filter(d => Number.isFinite(+d.open_interest) && +d.open_interest > 0);
const novigOiLatest = novigOi.length ? +novigOi[novigOi.length - 1].open_interest : null;
const novigOiPeak = novigOi.length ? d3.max(novigOi, d => +d.open_interest) : null;
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
// Dollars parlay takers paid, on the same rows as parlayTotal above.
const parlayStakeTotal = d3.sum(parlay.filter(d => d.legs > 1), d => +d.taker_value || 0);
const novigDateSel = Mutable([d3.min(daily, d => d.date), d3.max(daily, d => d.date)]);
display(renderDateBrush({
  data: daily.map(d => ({date: d.date, value: d.contracts})),
  initialRange: [d3.min(daily, d => d.date), d3.max(daily, d => d.date)],
  onSelect: range => { novigDateSel.value = range; },
  color: NV,
  width
}));
```

```js
const [novigBrushFrom, novigBrushTo] = novigDateSel;
const dailyBrushed = daily.filter(d => d.date >= novigBrushFrom && d.date <= novigBrushTo);
```

<div class="grid grid-cols-4">
  <div class="card"><h2>Contracts traded</h2><span class="big">${fmtCount(totalContracts)}</span><span class="muted">${daily.length} days</span></div>
  <div class="card"><h2>Open interest</h2><span class="big">${novigOiLatest == null ? "—" : fmtCount(novigOiLatest)}</span><span class="muted">latest day &middot; peak ${novigOiPeak == null ? "—" : fmtCount(novigOiPeak)}</span></div>
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
    Plot.rectY(dailyBrushed, {
      x: "date", y: "contracts", fill: NV, interval: "day",
      ry2: 4, insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\n${d3.format(",.0f")(d.contracts)} contracts\n${d3.format(",")(d.markets_traded)} of ${d3.format(",")(d.markets_listed)} listed markets traded\nopen interest ${d3.format(",.0f")(d.open_interest)}`,
      tip: true
    })
  ]
})
```

## Categories by day

```js
// Novig's `league` column is a LEAGUE (MLB, ATP, WNBA), not a sport, and it is
// EMPTY on every parlay print -- 268,852 COMBO taker rows on the 2026-08-04..17
// tape, all blank, against 1,083,489 straight rows all named, zero exceptions.
// A parlay therefore carries no sport and CANNOT be filed inside one, so it gets
// its own band. That is a property of the feed, not a presentational choice.
//
// Bottom-to-top, parlay last, matching how categories-venues.md stacks the same
// idea. Anything the producer emits that is not named here is stacked at the
// bottom rather than dropped, so a new sport can never vanish from the chart.
const CAT_ORDER = ["Other sport", "Motorsport", "Hockey", "Soccer", "Golf",
                   "Combat sports", "Football", "Basketball", "Tennis",
                   "Baseball", "Parlay"];
const CAT_COLORS = {
  "Other sport": "#c8e6c9", "Motorsport": "#e65100", "Hockey": "#006064",
  "Soccer": "#827717", "Golf": "#33691e", "Combat sports": "#6d4c41",
  "Football": "var(--cat-football)", "Basketball": "var(--cat-basketball)", "Tennis": "#4a148c",
  "Baseball": "#880e4f", "Parlay": NV
};
const catUnknown = Array.from(new Set(category.map(d => d.category)))
  .filter(c => !CAT_ORDER.includes(c));
// Seasonal: a sport out of season carries no volume and drops out of the legend
// on its own rather than showing an empty swatch.
const catPresent = [...catUnknown, ...CAT_ORDER]
  .filter(c => category.some(d => d.category === c && d.contracts > 0));
const categoryBrushed = category.filter(d => d.date >= novigBrushFrom && d.date <= novigBrushTo);
```

```js
display(catPresent.length
  ? Plot.plot({
      width,
      height: 340,
      marginLeft: 64,
      marginBottom: 40,
      color: {legend: true, domain: catPresent, range: catPresent.map(c => CAT_COLORS[c] || "#9e9e9e")},
      x: {label: null, type: "utc", tickFormat: "%b %d"},
      y: {label: "Contracts", grid: true, tickFormat: fmtCount},
      marks: [
        Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
        Plot.rectY(categoryBrushed, {
          x: "date", y: "contracts", fill: "category", order: catPresent,
          interval: "day", insetLeft: 1, insetRight: 1,
          title: d => `${fmtDate(d.date)}
${d.category}
${d3.format(",.0f")(d.contracts)} contracts · ${(+d.pct_of_day).toFixed(1)}% of day`,
          tip: true
        })
      ]
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The category series is not being served yet, so this chart is empty; nothing else on the page depends on it.</div>`);
```

<div class="instruction-line">Parlays carry no league in Novig's feed, so they stack as their own band rather than inside a sport.</div>

## Biggest games by volume

<div class="instruction-line">Every straight market on the fixture &mdash; moneyline, totals, spreads and props &mdash; because moneyline alone is barely half of Novig's straight book.</div>

```js
// contracts_all is the whole straight book on the game; contracts is the moneyline
// subset the P&L columns are computed on. Ranking on the moneyline alone reorders the
// board -- the busiest fixture in the window is only ~46% moneyline -- so volume ranks
// on contracts_all and the moneyline is shown beside it rather than instead of it.
const gameVol = gameBoard
  .filter(d => d.game && +d.contracts_all > 0)
  .sort((a, b) => +b.contracts_all - +a.contracts_all);
```

```js
const gameVolSearch = view(Inputs.search(gameVol, {placeholder: "Search team or league…"}));
```

```js
display(gameVol.length
  ? Inputs.table(gameVolSearch, {
      columns: ["game", "game_date", "league", "contracts_all", "contracts"],
      header: {game: "Game", game_date: "Date", league: "League", contracts_all: "Contracts", contracts: "of which moneyline"},
      format: {game_date: d => fmtDate(d), contracts_all: d => fmtCount(+d), contracts: d => fmtCount(+d)},
      align: {contracts_all: "right", contracts: "right"},
      width: {game: 240}, rows: 14
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The named-game series is not being served yet, so this table is empty; nothing else on the page depends on it.</div>`);
```

<div id="what-novig-charges"></div>

## What Novig charges

<div class="instruction-line">The published schedule charges the taker a price-dependent fee on live straight bets and parlays. Pre-game straight trades are free.</div>

| Trade type | Maker | Taker |
|---|---|---|
| Pre-game straight | No fee | **No fee** |
| Live (in-game) straight | No fee | 0.03 &times; P &times; (1 &minus; P) per contract |
| Parlay | N/A on app/web; no fee via API | **0.10 &times; P &times; (1 &minus; P) per contract**, already inside the quoted price |

```js
// ---------------------------------------------------------------------------
// FEES -- deliberately loaded through a SECOND attachment instance.
//
// novig_fees_daily.csv is registered in sync_dashboard_data.py and in the repo
// copy of files.json, and, since 2026-08-15, in the deployed /opt allowlist too, and /opt is the
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

```js
const novigFeeDateSel = Mutable(feeT ? [feeT.from, feeT.to] : [new Date("2000-01-01T00:00:00Z"), new Date("2000-01-02T00:00:00Z")]);
display(feeT
  ? renderDateBrush({
      data: fees.map(d => ({date: d.date, value: d.parlay_fees_taker + d.straight_fees_taker_max})),
      initialRange: [feeT.from, feeT.to],
      onSelect: range => { novigFeeDateSel.value = range; },
      color: NV,
      width
    })
  : html``);
```

```js
const [novigFeeBrushFrom, novigFeeBrushTo] = novigFeeDateSel;
const feesBrushed = fees.filter(d => d.date >= novigFeeBrushFrom && d.date <= novigFeeBrushTo);

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
    Plot.rectY(feesBrushed, {
      x: "date", y1: d => d.parlay_fees_taker, y2: d => d.parlay_fees_taker + d.straight_fees_taker_max,
      fill: NV, fillOpacity: 0.22, interval: "day", insetLeft: 1, insetRight: 1,
      title: d => `${fmtDate(d.date)}\nstraight book: $0 to ${fmtUSD(d.straight_fees_taker_max)}\nthe range is real uncertainty, not an error bar\n${fmtCount(d.straight_contracts)} straight contracts`,
      tip: true
    }),
    Plot.rectY(feesBrushed, {
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

## Parlay volume and stakes

```js
import {GRANULARITIES, METRICS, metricLabel, parlayChart, toDailyParlay} from "./components/parlay-series.js";
const nvParlayGranularity = view(Inputs.radio(GRANULARITIES, {value: "Daily", label: "View"}));
const nvParlayMetric = view(Inputs.radio(METRICS, {value: "volume", label: "Metric", format: metricLabel}));
```

```js
// The venue denominator is attached AFTER the daily rollup, never as a column. This file
// has one row per leg count, and every one of them carries the same day total, so reading
// it as a per-row field adds the denominator once per leg bucket and the share lands about
// eight times too small. Same derivation as the KPI above: sum(pct_of_day) = 100*sum(v)/total.
const nvDayTotal = d3.rollup(
  parlay.filter(d => +d.pct_of_day > 0),
  v => 100 * d3.sum(v, d => d.contracts) / d3.sum(v, d => +d.pct_of_day),
  d => String(d.date)
);
const nvParlayDaily = toDailyParlay(
  parlay.filter(d => d.legs > 1 && d.date >= novigBrushFrom && d.date <= novigBrushTo),
  {date: "date", contracts: "contracts", stake: "taker_value"}
).map(d => ({...d, venue: nvDayTotal.get(String(d.date)) ?? null}));
display(parlayChart({
  daily: nvParlayDaily, granularity: nvParlayGranularity, metric: nvParlayMetric,
  color: NV, width, height: 280
}));
```

<div class="instruction-line">Parlays are ${parlayAll ? `${(100 * parlayTotal / parlayAll).toFixed(1)}%` : "—"} of Novig's contracts, bought at ${(100 * parlayStakeTotal / parlayTotal).toFixed(1)}&cent; each &mdash; a price quoted all-in, so the parlay fee is already inside it.</div>

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
