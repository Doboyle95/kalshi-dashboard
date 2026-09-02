---
title: Fees & Economics
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Fees & Economics</h1>
  <p class="page-lead">What one side pays to trade, including a broker charge where public data can support it, how that cost changes with price, and which realized fee series can be measured from public venue files.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, VENUE_ORDER, normalizeVenueName} from "./components/venue-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
// Only for is_partial. Every fee number on this page comes from competitor_daily.csv so
// that all venues sit on ONE lineage -- see the note under the daily chart.
const overall = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const fmtUsd = d => d == null ? "—"
  : Math.abs(d) >= 1e9 ? "$" + (d / 1e9).toFixed(2) + "bn"
  : Math.abs(d) >= 1e6 ? "$" + (d / 1e6).toFixed(1) + "M"
  : Math.abs(d) >= 1e3 ? "$" + (d / 1e3).toFixed(0) + "k"
  : "$" + d.toFixed(0);
```

## Fees by day

<p class="section-intro">Modeled one-side customer cost or exchange revenue, in dollars, day by day. Use the measure toggle to keep those two questions separate.</p>

```js
// PARTIAL DAYS. Kalshi's newest row is a still-filling day and prints far below a real
// one -- $2.5M against $10.4M the session before on 2026-08-16. Faded in the daily
// chart, and kept out of the cumulative entirely so a half day cannot flatten the run.
const partialDates = new Set(
  overall.filter(d => d.is_partial === true || String(d.is_partial).toUpperCase() === "TRUE").map(d => +d.date)
);
const feeRows = daily
  .map(d => {
    const venue = normalizeVenueName(d.platform);
    const num = value => value == null || value === "" || Number.isNaN(+value) ? null : +value;
    return {
      date: d.date,
      venue,
      cost: num(d.fees),
      revenue: num(d.fees_exchange_revenue),
      provisional: venue === "Kalshi" && partialDates.has(+d.date)
    };
  })
  .filter(d => d.date instanceof Date && ((d.cost ?? 0) > 0 || (d.revenue ?? 0) > 0));
const feeVenues = VENUE_ORDER.filter(venue => feeRows.some(d => d.venue === venue));
// ROTHERA HAS NO FEE ESTIMATE before late July. Those rows are dropped as zero-fee
// here and again in the cumulative below, so most of the venue leaves no visible
// gap and its line reads as a lifetime total. Measured, not hardcoded, because the
// covered share grows every day the estimate keeps running.
const rotheraRows = daily.filter(d => normalizeVenueName(d.platform) === "Rothera" && +d.contracts > 0);
const rotheraFeeStart = d3.min(rotheraRows.filter(d => +d.fees > 0), d => d.date);
const rotheraUncovered = d3.sum(rotheraRows.filter(d => d.date < rotheraFeeStart), d => +d.contracts)
  / d3.sum(rotheraRows, d => +d.contracts) || 0;
```

<div class="control-strip">

```js
// Customer cost and exchange revenue are DIFFERENT QUESTIONS and the ratio between them
// is not a constant: some exchanges charge both sides, Polymarket rebates makers,
// and DraftKings' introducing-broker commission is customer cost but not DKeX
// exchange revenue. Switching measures genuinely reorders the field.
const feeMeasure = view(Inputs.radio(["Fee cost (one side)", "Exchange revenue (all charged sides)"], {
  label: "Measure",
  value: "Fee cost (one side)"
}));
```

```js
const selectedFeeVenues = view(Inputs.checkbox(feeVenues, {label: "Venues", value: feeVenues}));
```

</div>

```js
const feeValue = d => feeMeasure.startsWith("Fee cost") ? d.cost : d.revenue;
const feeShown = feeRows.filter(d => selectedFeeVenues.includes(d.venue) && (feeValue(d) ?? 0) > 0);
const feeTotalsByDate = Array.from(
  d3.rollup(feeShown, rows => d3.sum(rows, feeValue), d => +d.date),
  ([date, value]) => ({date: new Date(date), value})
).sort((a, b) => a.date - b.date);
const feeDomainStart = d3.min(feeRows, d => d.date);
const feeDomainEnd = d3.max(feeRows, d => d.date);
const feeDateSel = Mutable([d3.utcDay.offset(feeDomainEnd, -364), feeDomainEnd]);
display(renderDateBrush({
  data: feeTotalsByDate,
  initialRange: [d3.utcDay.offset(feeDomainEnd, -364), feeDomainEnd],
  quickRanges: [
    {label: "90d", days: 90, title: "Last 90 days"},
    {label: "365d", days: 365, title: "Last 365 days"},
    {label: "All", days: Infinity, title: "All available history"}
  ],
  onSelect: range => { feeDateSel.value = range; },
  color: "var(--accent-cme)",
  width
}));
```

```js
const [feeFrom, feeTo] = feeDateSel;
const feeBrushed = feeShown.filter(d => d.date >= feeFrom && d.date <= feeTo);
const feeSolid = feeBrushed.filter(d => !d.provisional);
const feeMeasureLabel = feeMeasure.startsWith("Fee cost") ? "fee cost" : "exchange revenue";
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 320,
  marginLeft: 78,
  x: {type: "utc", label: null},
  y: {label: `Daily ${feeMeasureLabel} (USD)`, grid: true, tickFormat: fmtUsd},
  color: {legend: true, domain: feeVenues, range: feeVenues.map(v => VENUE_COLORS[v])},
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(feeSolid, {x: "date", y: feeValue, stroke: "venue", strokeWidth: 1.8, curve: "monotone-x"}),
    // Provisional days stay VISIBLE but never join the line -- a hollow dot reads as
    // "not final yet", where a line segment would read as a collapse in revenue.
    Plot.dot(feeBrushed.filter(d => d.provisional), {x: "date", y: feeValue, stroke: "venue", fill: "var(--theme-background)", r: 3.5, strokeWidth: 1.5}),
    Plot.ruleX(feeBrushed, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(feeBrushed, Plot.pointerX({
      x: "date", y: feeValue,
      title: d => `${d.venue}\n${fmtDate(d.date)}\n${fmtUsd(feeValue(d))}${d.provisional ? "\nStill-filling day" : ""}`
    }))
  ]
})
```

</div>

<p class="chart-note">Every venue here is read from one file on one lineage. For DKeX, "fee cost" adds DraftKings Predictions' introducing-broker commission to the DKeX taker fee from the retail launch on June 26, 2026; "exchange revenue" remains DKeX's filed taker-plus-maker charge and excludes the broker. Before that launch, the public DKeX tape carries exchange fees only. Crypto.com/Nadex remains the standard direct-member exchange benchmark: Crypto.com's app changed to a 1–1.75¢ taker range on June 30, but the daily bulletin has neither prices nor member roles needed to reconstruct a retail point. <strong>Two venues are absent rather than zero, and a third is mostly absent.</strong> Novig publishes its straight-book fee as a bounded range rather than a point estimate, so it has no single defensible daily number to rank against the others. ProphetX charges on a trader's net gains per market rather than per contract, so a daily fee cannot be derived from its tape at all. Rothera's fee estimate only starts ${fmtDate(rotheraFeeStart)}, so the ${(100 * rotheraUncovered).toFixed(0)}% of its contracts traded before that carry no fee and are not drawn.</p>

## Cumulative fees

<p class="section-intro">The same series, accumulated over the window you pick below. Kalshi is roughly an order of magnitude above the field, so untick it — or switch to a log scale — to read the competitors against each other.</p>

<div class="control-strip">

```js
// Deliberately independent of the daily chart above. Sharing one control strip meant
// this caption told the reader to untick Kalshi while the checkbox sat in a different
// section, off screen -- the same mistake as the Platform control on Trading Behavior.
const cumScale = view(Inputs.radio(["Linear", "Log"], {label: "Scale", value: "Linear"}));
```

```js
const cumVenues = view(Inputs.checkbox(feeVenues, {label: "Venues", value: feeVenues}));
```

</div>

```js
// Its own window too, so the cumulative view can be read over a different span from
// the daily one without the two fighting over a single brush.
const cumRows = feeSolid.filter(d => cumVenues.includes(d.venue));
const cumTotalsByDate = Array.from(
  d3.rollup(cumRows, rows => d3.sum(rows, feeValue), d => +d.date),
  ([date, value]) => ({date: new Date(date), value})
).sort((a, b) => a.date - b.date);
const cumDomainEnd = d3.max(feeRows, d => d.date);
const cumDateSel = Mutable([d3.utcDay.offset(cumDomainEnd, -364), cumDomainEnd]);
display(renderDateBrush({
  data: cumTotalsByDate.length ? cumTotalsByDate : [{date: cumDomainEnd, value: 0}],
  initialRange: [d3.utcDay.offset(cumDomainEnd, -364), cumDomainEnd],
  quickRanges: [{label: "90d", days: 90}, {label: "365d", days: 365}, {label: "All", days: Infinity}],
  onSelect: range => { cumDateSel.value = range; },
  color: "var(--accent-cme)",
  width
}));
```

```js
const [cumFrom, cumTo] = cumDateSel;
const cumWindow = cumRows.filter(d => d.date >= cumFrom && d.date <= cumTo);
// Rothera's line begins where its fee estimate begins, not where the venue does.
// Dropping the uncovered days silently left a full-looking line, so mark the start.
const rotheraStartMark = cumVenues.includes("Rothera") && rotheraFeeStart >= cumFrom && rotheraFeeStart <= cumTo
  ? [rotheraFeeStart] : [];
const feeCumulative = cumVenues.flatMap(venue => {
  let running = 0;
  return cumWindow
    .filter(d => d.venue === venue)
    .sort((a, b) => a.date - b.date)
    .map(d => ({venue, date: d.date, cumulative: (running += feeValue(d) ?? 0)}));
// A LOG AXIS CANNOT PLOT THE FIRST POINT of a cumulative series, which is whatever the
// venue collected on day one measured from zero -- and drops anything still at zero.
// Filtering here rather than letting the scale silently discard points keeps the line
// starting where the data does.
}).filter(d => cumScale === "Linear" || d.cumulative > 0);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 340,
  marginLeft: 78,
  x: {type: "utc", label: null},
  y: cumScale === "Log"
    ? {type: "log", label: `Cumulative ${feeMeasureLabel} (USD, log)`, grid: true, tickFormat: fmtUsd}
    : {label: `Cumulative ${feeMeasureLabel} since ${fmtDate(cumFrom)} (USD)`, grid: true, tickFormat: fmtUsd},
  color: {legend: true, domain: feeVenues, range: feeVenues.map(v => VENUE_COLORS[v])},
  marks: [
    ...(cumScale === "Linear" ? [Plot.ruleY([0])] : []),
    // y1/y2 EXPLICITLY, because Plot.areaY with a bare `y` applies the stackY
    // transform by default while Plot.lineY does not. Stacked areas under unstacked
    // lines drew every competitor piled on top of Kalshi, so pale bands floated above
    // the Kalshi line -- read as a mystery second series when they were just
    // Crypto.com/Nadex and Rothera stacked on it.
    ...(cumScale === "Linear" ? [Plot.areaY(feeCumulative, {x: "date", y1: 0, y2: "cumulative", fill: "venue", fillOpacity: 0.1})] : []),
    Plot.lineY(feeCumulative, {x: "date", y: "cumulative", stroke: "venue", strokeWidth: 2}),
    Plot.ruleX(rotheraStartMark, {stroke: VENUE_COLORS["Rothera"], strokeDasharray: "4,3", strokeOpacity: 0.8}),
    // Keep the annotation inside the plot when the start date is near the right edge.
    Plot.text(rotheraStartMark, {x: d => d, text: () => "Rothera fee data starts", frameAnchor: "top", textAnchor: "end", dx: -6, dy: 4, fill: VENUE_COLORS["Rothera"], fontSize: 11}),
    Plot.ruleX(feeCumulative, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(feeCumulative, Plot.pointerX({
      x: "date", y: "cumulative",
      title: d => `${d.venue}\n${fmtDate(d.date)}\n${fmtUsd(d.cumulative)} cumulative`
    }))
  ]
})
```

</div>

<div class="chart-note">Accumulated from the start of the window set just above, not from each venue’s first day, so the lines answer "who collected more over this window". Still-filling days are excluded. Window totals: ${cumVenues.map(v => `${v} ${fmtUsd(d3.sum(cumWindow.filter(d => d.venue === v), feeValue))}`).join(" · ")}.</div>

## Published fee schedules

<p class="section-intro">Published fee per contract for one side of a $1 binary at each price, before order-level rounding. The current DraftKings-on-DKeX line includes both its broker commission and DKeX's exchange fee.</p>

```js
const dkBrokerFeeCents = p => {
  const c = Math.round(p * 100);
  if (c === 1) return 0.08;
  if (c === 2) return 0.16;
  if (c === 3) return 0.24;
  if (c === 4) return 0.31;
  if (c === 5) return 0.39;
  if (c === 6) return 0.47;
  if (c === 7) return 0.54;
  if (c === 8) return 0.61;
  if (c === 9) return 0.69;
  if (c === 10) return 0.76;
  if (c <= 13) return 0.90;
  if (c <= 16) return 1.10;
  if (c <= 19) return 1.30;
  if (c <= 22) return 1.49;
  if (c <= 25) return 1.67;
  if (c <= 29) return 1.86;
  if (c <= 94) return 2.00;
  if (c <= 96) return 1.50;
  if (c <= 98) return 0.88;
  return 0.50;
};
const dkexExchangeFeeCents = p => {
  const c = Math.round(p * 100);
  return (c === 1 || c === 99) ? 0.50 : c === 2 ? 0.85 : 1.00;
};
const feeCurves = [
  {name: "Kalshi", f: p => 7 * p * (1 - p)},
  {name: "Underdog Exchange", f: p => 7 * p * (1 - p), dash: "5,4"},
  {name: "Polymarket US", f: p => 6 * p * (1 - p)},
  {name: "Novig · parlay", f: p => 10 * p * (1 - p), color: "#6366F1"},
  {name: "Novig · live straight", f: p => 3 * p * (1 - p), color: "#A5B4FC", dash: "5,4"},
  {name: "Rothera", f: p => 2 * p * (1 - p)},
  {name: "DraftKings on DKeX", f: p => dkBrokerFeeCents(p) + dkexExchangeFeeCents(p), color: VENUE_COLORS["DKeX"], curve: "step"},
  {name: "DKeX exchange only", f: dkexExchangeFeeCents, color: "#9CA3AF", dash: "5,4", curve: "step"},
  {name: "Nadex direct member", f: () => 2, color: VENUE_COLORS["Crypto.com/Nadex"]},
  {name: "Crypto.com app · max", f: () => 1.75, color: "#38BDF8", dash: "5,4"},
  {name: "Crypto.com app · min", f: () => 1.00, color: "#7DD3FC", dash: "2,3"},
  {name: "ForecastEx", f: () => 1},
  {name: "CME", f: () => 1, dash: "2,3"}
];
const feePrices = d3.range(1, 100).map(cents => ({cents, p: cents / 100}));
const feeNames = feeCurves.map(d => d.name);
const feeColors = feeCurves.map(d => d.color ?? VENUE_COLORS[d.name] ?? "#64748B");
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 340,
  marginLeft: 70,
  x: {label: "Contract price (¢)", domain: [1, 99], grid: true},
  y: {label: "Fee per contract, one side (¢)", domain: [0, 3.25], grid: true},
  color: {legend: true, domain: feeNames, range: feeColors},
  marks: feeCurves.map(curve => Plot.lineY(
    feePrices.map(d => ({...d, fee: curve.f(d.p), venue: curve.name})),
    {x: "cents", y: "fee", stroke: "venue", strokeWidth: 2, strokeDasharray: curve.dash, curve: curve.curve ?? "monotone-x", tip: true}
  ))
})
```

<p class="chart-note"><a href="https://www.draftkings.com/predictions-terms">DraftKings Predictions</a> is an introducing broker, not an FCM. Its current DKeX customer line is the broker's <a href="https://myaccount.draftkings.com/documents/fee-disclosure?product=predict">disclosed price ladder</a> plus DKeX's <a href="https://www.cftc.gov/filings/orgrules/rules0515263470.pdf">separately filed exchange fee</a>; DKeX exchange revenue is still the gray exchange-only line. The DraftKings HTML currently prints 8.80¢ at 97–98¢, a tenfold break in an otherwise descending tail that would make a winning 98¢ contract cost more than its $1 payout. This chart treats it as the evident missing-zero typo, 0.88¢, until DraftKings corrects or confirms it. <a href="https://help.crypto.com/en/articles/11373970-prediction-trading">Crypto.com's app</a> publishes only a 1–1.75¢ range, so both bounds are drawn rather than an invented curve; the separate 2¢ line is <a href="https://www.nadex.com/pricing/">Nadex's standard direct-member exchange fee</a>. Kalshi and Underdog have the same one-side curve, but Underdog charges both sides. ProphetX is absent because its published charge is based on a trader's net gains per market, not contract price. Novig pre-game straight trades are free and are stated here rather than drawn as a zero line.</p>

## Realized fee per contract

<p class="section-intro">Modeled one-side fees divided by reported contracts, with Crypto.com/Nadex restated per $1 of contract because it redenominated twice. DKeX includes the DraftKings broker charge from the retail launch; Crypto.com/Nadex is the direct-member exchange benchmark, not the app's newer retail range. Venues without a defensible daily numerator are absent, not zero.</p>

```js
// Crypto.com/Nadex REDENOMINATED TWICE ($100 -> $10 -> $1) and competitor_daily.csv
// counts one of each as one contract, so the raw ratio draws its first 141 days at
// 100c against Kalshi's 0.84c -- a 119x cost gap that never existed, since $1.00 on
// a $100 contract is the same ~1% -- and the shared auto-scaled axis then flattens
// every other venue onto the baseline. Restated per $1 of contract rather than
// withheld the way CME once was, so the 225 days before Aug 5, 2025 stay readable.
const contractDollars = (venue, date) => venue !== "Crypto.com/Nadex" ? 1
  : +date < Date.UTC(2025, 4, 13) ? 100
  : +date < Date.UTC(2025, 7, 5) ? 10
  : 1;
const realizedFees = daily
  .map(d => ({
    date: d.date,
    venue: normalizeVenueName(d.platform),
    contracts: +d.contracts || 0,
    fees: d.fees == null || d.fees === "" ? null : +d.fees
  }))
  .filter(d => d.date && d.contracts > 0 && d.fees != null && d.fees > 0)
  .map(d => ({...d, centsPerContract: 100 * d.fees / (d.contracts * contractDollars(d.venue, d.date))}));
const realizedNames = Array.from(new Set(realizedFees.map(d => d.venue)));
const realizedWindow = view(Inputs.radio(["90 days", "All history"], {label: "Window", value: "90 days"}));
const realizedEnd = d3.max(realizedFees, d => d.date);
const realizedShown = realizedFees.filter(d => realizedWindow === "All history" || d.date >= d3.utcDay.offset(realizedEnd, -89));
const realizedBrushSeries = Array.from(d3.rollup(realizedShown, group => d3.sum(group, d => d.centsPerContract) / group.length, d => +d.date), ([date, value]) => ({date: new Date(+date), value}))
  .sort((a, b) => a.date - b.date);
const realizedStart = d3.min(realizedShown, d => d.date);
const realizedDateSel = Mutable([realizedStart, realizedEnd]);
display(renderDateBrush({
  data: realizedBrushSeries,
  initialRange: [realizedStart, realizedEnd],
  onSelect: range => { realizedDateSel.value = range; },
  color: "var(--accent-cme)",
  width
}));
```

```js
const [realizedBrushFrom, realizedBrushTo] = realizedDateSel;
const realizedBrushed = realizedShown.filter(d => d.date >= realizedBrushFrom && d.date <= realizedBrushTo);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 320,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Reported fee per $1 of contract (¢)", grid: true},
  color: {legend: true, domain: realizedNames, range: realizedNames.map(d => VENUE_COLORS[d] ?? "#64748B")},
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(realizedBrushed, {x: "date", y: "centsPerContract", stroke: "venue", strokeWidth: 1.8, curve: "monotone-x"}),
    Plot.tip(realizedBrushed, Plot.pointerX({
      x: "date", y: "centsPerContract",
      title: d => `${d.venue}\n${fmtDate(d.date)}\n${d.centsPerContract.toFixed(3)}¢ per $1 of contract`
    }))
  ]
})
```

<div class="destination-grid">
  <a class="destination-card" href="./fees"><strong>Kalshi fee revenue</strong><span>Daily and cumulative exchange revenue, including maker charges.</span></a>
  <a class="destination-card" href="./parlay"><strong>Parlay economics</strong><span>Realized bettor outcomes and cash-outs where supported.</span></a>
</div>
