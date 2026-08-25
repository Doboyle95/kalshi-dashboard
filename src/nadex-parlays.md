---
title: Crypto.com/Nadex · Parlays
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com/Nadex</div>
  <h1>How big is the parlay book?</h1>
  <p class="page-lead">COMBOS &mdash; Crypto.com/Nadex's multi-leg parlay product &mdash; is the exchange's largest single product line. Adoption over time and volume in contracts; the win/loss question lives on <a href="./nadex-parlay-outcomes">Parlay outcomes</a>.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
import {GRANULARITIES, parlayChart, toDailyParlay} from "./components/parlay-series.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
```

## Parlay adoption history

<p class="section-intro">Monthly share shows the launch without placing a one-venue case study in the cross-venue comparison.</p>

```js
const nadexParlayByDay = Array.from(
  d3.rollup(catDaily, rows => ({
    parlays: d3.sum(rows.filter(d => d.category === "Parlays"), d => +d.contracts || 0),
    total: d3.sum(rows, d => +d.contracts || 0)
  }), d => d3.utcFormat("%Y-%m-%d")(d.date)),
  ([date, values]) => ({date: new Date(`${date}T00:00:00Z`), ...values})
);
const parlayAdoptionMonthly = Array.from(
  d3.rollup(nadexParlayByDay, rows => ({
    parlays: d3.sum(rows, d => d.parlays),
    total: d3.sum(rows, d => d.total),
    days: rows.length
  }), d => d3.utcFormat("%Y-%m")(d.date)),
  ([key, values]) => ({
    key,
    month: new Date(`${key}-01T00:00:00Z`),
    share: values.total ? 100 * values.parlays / values.total : 0,
    ...values
  })
).sort((a, b) => a.month - b.month);
const firstParlayMonth = parlayAdoptionMonthly.find(d => d.parlays > 0)?.month;
const nadexParlayDateSel = Mutable([d3.min(parlayAdoptionMonthly, d => d.month), d3.max(parlayAdoptionMonthly, d => d.month)]);
display(renderDateBrush({
  data: parlayAdoptionMonthly.map(d => ({date: d.month, value: d.share})),
  initialRange: [d3.min(parlayAdoptionMonthly, d => d.month), d3.max(parlayAdoptionMonthly, d => d.month)],
  onSelect: range => { nadexParlayDateSel.value = range; },
  color: "var(--accent-nadex)",
  width
}));
```

```js
const [nadexParlayFrom, nadexParlayTo] = nadexParlayDateSel;
const parlayAdoptionMonthlyBrushed = parlayAdoptionMonthly.filter(d => d.month >= nadexParlayFrom && d.month <= nadexParlayTo);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 58,
  x: {type: "utc", label: null, tickFormat: "%b %y"},
  y: {label: "Parlay share of contracts (%)", grid: true, zero: true},
  marks: [
    Plot.ruleY([0]),
    firstParlayMonth ? Plot.ruleX([firstParlayMonth], {strokeDasharray: "4,3", stroke: "var(--theme-foreground-muted)"}) : null,
    Plot.lineY(parlayAdoptionMonthlyBrushed, {x: "month", y: "share", stroke: "var(--accent-nadex)", strokeWidth: 2.2, curve: "monotone-x"}),
    Plot.dot(parlayAdoptionMonthlyBrushed, {
      x: "month", y: "share", fill: "var(--accent-nadex)", r: 3,
      tip: true,
      title: d => `${d.key}\n${d.share.toFixed(2)}% parlays\n${fmtCount(d.parlays)} of ${fmtCount(d.total)} contracts\n${d.days} reporting days`
    })
  ].filter(Boolean)
})
```

## Parlay volume

<p class="section-intro">The same product in contracts rather than as a share, so a busy month is visible as a busy month.</p>

```js
const ndParlayGranularity = view(Inputs.radio(GRANULARITIES, {value: "Monthly", label: "View"}));
```

```js
// Volume only, and there is no metric toggle here on purpose. The one Nadex stake series
// is keyed on the SETTLEMENT session, not the trading day, and it starts eight months after
// parlays did — putting it behind the same toggle as this chart would offer two bars that
// look comparable and count different populations. The money question lives on Parlay outcomes.
//
// The denominator is attached after the rollup rather than read off a column: catDaily has
// one row per category per day, so a per-row venue field would be counted once per category.
const ndVenueByDay = d3.rollup(
  catDaily, v => d3.sum(v, d => +d.contracts || 0), d => d3.utcFormat("%Y-%m-%d")(d.date)
);
const ndParlayDaily = toDailyParlay(
  catDaily.filter(d => d.category === "Parlays"),
  {date: "date", contracts: "contracts"}
).map(d => ({...d, venue: ndVenueByDay.get(d.day) ?? null}));
display(parlayChart({
  daily: ndParlayDaily, granularity: ndParlayGranularity, metric: "volume",
  color: "var(--accent-nadex)", width, height: 280
}));
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./nadex-parlay-outcomes">Parlay outcomes</a> for the win/loss P&amp;L, <a href="./nadex">Crypto.com/Nadex &middot; Activity</a> for overall volume, and <a href="./parlay-venues">Parlays across venues</a> for the comparison.</div>
