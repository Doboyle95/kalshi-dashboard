---
title: CME (FanDuel + DraftKings)
---

<div class="page-hero" data-accent="cme">
  <div class="page-eyebrow">CME · FanDuel + DraftKings</div>
  <h1>CME Event Contracts</h1>
  <p class="page-lead">FanDuel and DraftKings clear their event contracts through CME as swap-based products. CME publishes daily call/put volume in its Daily Bulletins — these have to be collected by hand within a 24-hour window, so the series is sparse and starts in early 2026, but it's the only public window into the two big sportsbooks' prediction-market volume.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const cme = await DataAttachment("data/cme_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Daily volume", date: latestDate(cme), updatedAt: fileUpdatedAt(freshness, "cme_daily.csv"), meta: "CME Daily Bulletin (manual collection)", tone: "competitor"}
  ],
  note: "CME event-contract volume is collected by hand from daily bulletins within a 24-hour availability window, so days are missing. Figures are FanDuel + DraftKings combined (both clear through CME); they are not trade-level prints."
}));
display(askPageLink({
  question: "Summarize FanDuel + DraftKings (CME) event-contract volume and how it compares to Kalshi.",
  context: "CME page using cme_daily.csv (daily call/put/total contract volume, FanDuel+DraftKings combined, sparse manual collection)."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtDate = d => (d instanceof Date ? d : new Date(d))?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const CME_COLORS = {Calls: "#9A6D1F", Puts: "#D9B36A"};
```

```js
const rows = cme.filter(d => d.date && d.cme_total_vol > 0)
  .map(d => ({date: d.date instanceof Date ? d.date : new Date(d.date),
              calls: +d.cme_call_vol, puts: +d.cme_put_vol, total: +d.cme_total_vol}))
  .sort((a, b) => a.date - b.date);
const peakDay = rows.reduce((b, d) => d.total > b.total ? d : b, rows[0]);
const totalAll = d3.sum(rows, d => d.total);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="cme">
    <div class="kpi-label">Days collected</div>
    <div class="kpi-value">${rows.length}</div>
    <div class="kpi-meta">${fmtDate(rows[0]?.date)} – ${fmtDate(rows[rows.length-1]?.date)}</div>
  </div>
  <div class="kpi-card" data-accent="cme">
    <div class="kpi-label">Most recent day</div>
    <div class="kpi-value">${fmtCount(rows[rows.length-1]?.total)}</div>
    <div class="kpi-meta">${fmtDate(rows[rows.length-1]?.date)} · contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak collected day</div>
    <div class="kpi-value">${fmtCount(peakDay?.total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
</div>

```js
// A5 fix: guard against an empty/header-only cme_daily.csv -- rows[0].date would throw and take
// down the brush + both Plot blocks below. Behaviour unchanged for the normal populated case.
const cmeDateSel = Mutable(rows.length ? [rows[0].date, rows[rows.length - 1].date] : [new Date(), new Date()]);
display(rows.length ? renderDateBrush({
  data: rows, dateAccessor: d => d.date, valueAccessor: d => d.total,
  initialRange: [rows[0].date, rows[rows.length - 1].date],
  onSelect: r => { cmeDateSel.value = r; }, width
}) : html`<p>No CME data available.</p>`);
```

## Daily volume

<p class="section-intro">Each bar is one CME Daily Bulletin (FanDuel + DraftKings combined), shown exactly as CME publishes it. <strong>Mondays look huge because CME reports the whole weekend in the Monday bulletin</strong> — Saturday, Sunday and Monday volume all land on Monday (holiday weekends like Good Friday bundle in even more). Gaps are days we couldn't collect, not zero-volume days. On the <a href="./competitors">Platform Comparison</a> chart we spread those weekend lumps back across the days they actually traded; here we keep the raw bulletin figures.</p>

```js
const inRange = rows.filter(d => d.date >= cmeDateSel[0] && d.date <= cmeDateSel[1]);
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 64,
  x: {type: "utc", label: null},
  y: {label: "Contracts / day", grid: true, tickFormat: d => fmtCount(d)},
  marks: [
    Plot.rectY(inRange, {x: "date", interval: d3.utcDay, y: "total", fill: "#9A6D1F"}),
    Plot.ruleY([0]),
    Plot.tip(inRange, Plot.pointerX({x: "date", y: "total",
      title: d => `${fmtDate(d.date)}\nTotal: ${fmtCount(d.total)} contracts\nCalls: ${fmtCount(d.calls)}\nPuts: ${fmtCount(d.puts)}`}))
  ]
}))
```

<p class="chart-note">Across the <strong>${inRange.length}</strong> days shown, FanDuel + DraftKings cleared <strong>${fmtCount(d3.sum(inRange, d => d.total))}</strong> contracts on CME.</p>

## Calls vs puts

<p class="section-intro">The same days split into call and put volume. Calls run roughly 2–3× puts — the usual favorite-heavy tilt of sports betting.</p>

```js
const tidy = inRange.flatMap(d => [
  {date: d.date, side: "Calls", vol: d.calls},
  {date: d.date, side: "Puts",  vol: d.puts}
]);
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 280, marginLeft: 64,
  x: {type: "utc", label: null},
  y: {label: "Contracts / day", grid: true, tickFormat: d => fmtCount(d)},
  color: {legend: true, domain: ["Calls", "Puts"], range: [CME_COLORS.Calls, CME_COLORS.Puts]},
  marks: [
    Plot.rectY(tidy, {x: "date", interval: d3.utcDay, y: "vol", fill: "side", order: ["Calls", "Puts"]}),
    Plot.ruleY([0])
  ]
}))
```

<details class="surface-card compact-details">
  <summary>About this data</summary>
  <p>CME publishes a "Event Contracts – Swap-based" section in its Daily Bulletin showing total call and put volume (and open interest). FanDuel and DraftKings both list their prediction-market contracts as CME swaps, so these figures are the <strong>two sportsbooks combined</strong> — they can't be split apart from the public bulletin alone.</p>
  <p>Each bulletin is only available for about 24 hours, so collection is manual and days are missing — especially before April. We show every day we have rather than interpolating. Volume is contract count for the CME regular-trading-hours session; it is not a trade-level feed, so use it for scale and trend, not microstructure.</p>
</details>
