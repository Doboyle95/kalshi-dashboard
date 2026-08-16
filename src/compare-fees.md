---
title: Fees & Economics
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Fees & Economics</h1>
  <p class="page-lead">What one side pays to trade, how that cost changes with price, and which realized fee series can be measured from public venue files.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, normalizeVenueName} from "./components/venue-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

## Published fee schedules

<p class="section-intro">Fee per contract for one side of a $1 binary at each price, before order-level rounding and broker commissions.</p>

```js
const feeCurves = [
  {name: "Kalshi", f: p => 7 * p * (1 - p)},
  {name: "Underdog Exchange", f: p => 7 * p * (1 - p), dash: "5,4"},
  {name: "Polymarket US", f: p => 6 * p * (1 - p)},
  {name: "Novig · parlay", f: p => 10 * p * (1 - p), color: "#6366F1"},
  {name: "Novig · live straight", f: p => 3 * p * (1 - p), color: "#A5B4FC", dash: "5,4"},
  {name: "Rothera", f: p => 2 * p * (1 - p)},
  {name: "DKeX", f: p => { const c = Math.round(p * 100); return (c === 1 || c === 99) ? 0.5 : c === 2 ? 0.85 : 1; }, curve: "step"},
  {name: "Crypto.com/Nadex", f: () => 2},
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
  y: {label: "Fee per contract, one side (¢)", domain: [0, 2.6], grid: true},
  color: {legend: true, domain: feeNames, range: feeColors},
  marks: feeCurves.map(curve => Plot.lineY(
    feePrices.map(d => ({...d, fee: curve.f(d.p), venue: curve.name})),
    {x: "cents", y: "fee", stroke: "venue", strokeWidth: 2, strokeDasharray: curve.dash, curve: curve.curve ?? "monotone-x", tip: true}
  ))
})
```

<p class="chart-note">Kalshi and Underdog have the same one-side curve, but Underdog charges both sides. ProphetX is absent because its published charge is based on a trader's net gains per market, not contract price. Novig pre-game straight trades are free and are stated here rather than drawn as a zero line.</p>

## Realized fee per contract

<p class="section-intro">Reported one-side fees divided by reported contracts. This changes with the venue's actual price mix; venues without a defensible daily numerator are absent, not zero.</p>

```js
const realizedFees = daily
  .map(d => ({
    date: d.date,
    venue: normalizeVenueName(d.platform),
    contracts: +d.contracts || 0,
    fees: d.fees == null || d.fees === "" ? null : +d.fees
  }))
  .filter(d => d.date && d.contracts > 0 && d.fees != null && d.fees > 0)
  .map(d => ({...d, centsPerContract: 100 * d.fees / d.contracts}));
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
  color: "#9A6D1F",
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
  y: {label: "Reported fee per contract (¢)", grid: true},
  color: {legend: true, domain: realizedNames, range: realizedNames.map(d => VENUE_COLORS[d] ?? "#64748B")},
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(realizedBrushed, {x: "date", y: "centsPerContract", stroke: "venue", strokeWidth: 1.8, curve: "monotone-x"}),
    Plot.tip(realizedBrushed, Plot.pointerX({
      x: "date", y: "centsPerContract",
      title: d => `${d.venue}\n${fmtDate(d.date)}\n${d.centsPerContract.toFixed(3)}¢ per contract`
    }))
  ]
})
```

<div class="destination-grid">
  <a class="destination-card" href="./fees"><strong>Kalshi fee revenue</strong><span>Daily and cumulative exchange revenue, including maker charges.</span></a>
  <a class="destination-card" href="./parlay"><strong>Parlay economics</strong><span>Realized bettor outcomes and cash-outs where supported.</span></a>
</div>
