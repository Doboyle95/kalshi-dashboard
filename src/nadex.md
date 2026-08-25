---
title: Crypto.com/Nadex
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com · Nadex</div>
  <h1>Crypto.com/Nadex</h1>
  <p class="page-lead">Crypto.com's Nadex exchange is small — event binaries whose only public record is the exchange's daily bulletin. No single game dominates it: the multi-leg <strong>COMBOS</strong> parlay line is the largest product here, and it is what the busiest days are mostly made of.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily  = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
// nadex_sports_split_daily.csv's upstream builder has appended a second,
// out-of-chronological-order block of rows (backfilled weekends + the most
// recent days) rather than merging them in sorted - without this sort, the
// area chart and brush sparkline (which connect points in array order, not
// x order) draw a line that zigzags backward through time.
const split     = (await DataAttachment("data/nadex_sports_split_daily.csv").csv({typed: true}))
  .sort((a, b) => a.date - b.date);
const parlayDaily = await DataAttachment("data/nadex_parlay_pnl_daily.csv").csv({typed: true});
// The Kalshi comparators below the P&L chart come from the SAME file /compare-accuracy
// derives every venue from, so the two pages cannot drift apart. They used to be two
// hardcoded numbers (1.82c and 1.21c) that had gone stale and, worse, inverted: parlay
// takers were quoted as losing more per contract than single-market takers, which the
// current data reverses.
const kalshiPnlBins = await DataAttachment("data/competitor_pnl_by_bin.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category data", date: latestDate(catDaily), updatedAt: fileUpdatedAt(freshness, "nadex_categories_daily.csv"), meta: "CFTC/Nadex bulletin scrape", tone: "competitor"},
    {label: "Sports split", date: latestDate(split), updatedAt: fileUpdatedAt(freshness, "nadex_sports_split_daily.csv"), meta: "Derived from mapped bulletin categories", tone: "competitor"}
  ],
  note: "Crypto.com/Nadex updates when daily bulletins are scraped and rebuilt; this is not a trade-level feed."
}));
display(askPageLink({
  question: "Summarize recent Crypto.com/Nadex event-contract activity and category mix.",
  context: "Crypto.com/Nadex page using nadex_categories_daily.csv and nadex_sports_split_daily.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtPct   = x => (100 * (x ?? 0)).toFixed(1) + "%";
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
// COMBOS is the exchange's largest single product line; surfaced as a KPI so the
// page never has to hardcode a claim about which event or category leads.
const parlayTotal = d3.sum(catDaily.filter(d => d.category === "Parlays"), d => d.contracts);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="nadex">
    <div class="kpi-label">Volume (since Dec 2024)</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)} · contracts</div>
  </div>
  <div class="kpi-card" data-accent="nadex">
    <div class="kpi-label">Parlays (COMBOS)</div>
    <div class="kpi-value">${fmtCount(parlayTotal)}</div>
    <div class="kpi-meta">${fmtPct(parlayTotal / totalContracts)} of all contracts</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Crypto.com/Nadex views use daily event/category exports rather than trade-level prints. Volume is normalized contract count by day; sports and category splits come from local classification of event names and categories in the Nadex export.</p>
  <p>Built from daily bulletin totals, not trade-level prints, so this is a read on scale and category mix rather than microstructure.</p>
  <p>Rows whose bulletin line was a venue name containing "Events Center" (a scraper artifact — the volume column on those lines holds an expiry date, not a contract count) are excluded from every number on this page. Before 2026-08-06 they were counted as college basketball and added 322,088,514 phantom contracts.</p>
</details>

```js
const fmtAxisNum = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? Math.round(a/1e6)+"M" : a >= 1e3 ? Math.round(a/1e3)+"k" : String(a)); };

function makeBrush(data, color) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(data, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(data, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block").style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)").style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(data)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total)).curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const start = d3.min(data, d => d.date);
  const end   = d3.max(data, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (!event.selection) {
        // Clearing the brush (a bare click) now means "show everything": reset to
        // the full domain and redraw the selection so the visuals match the filter.
        svg.property("value", x.domain());
        brushG.call(brush.move, x.domain().map(x));   // programmatic move — guarded above, no re-fire
        svg.dispatch("input");
        return;
      }
      svg.property("value", event.selection.map(x.invert)); svg.dispatch("input");
    });

  const brushG = svg.append("g");


  brushG.call(brush).call(brush.move, [start, end].map(x));
  svg.selectAll(".handle").style("display", "block").style("fill", color).style("fill-opacity", 0.9);
  svg.selectAll(".selection").style("stroke", color).style("stroke-width", "2px").style("fill", color).style("fill-opacity", 0.15);
  svg.property("value", [start, end]);
  return svg.node();
}
```

## Daily volume

<p class="section-intro">Daily event-contract volume since Nadex event contracts started appearing in the exchange's daily bulletins.</p>

```js
const brushVolume = view(makeBrush(split, "var(--accent-nadex)"));
```

```js
const [sV, eV] = brushVolume;
const splitFVolume = split.filter(d => d.date >= sV && d.date <= eV);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 300,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.rectY(splitFVolume, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: "var(--accent-nadex)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Event binary contracts only, read out of Nadex's own daily bulletins. Nadex redenominated twice — contracts were $100 through May 12, 2025, $10 through Aug 4, 2025 and $1 since — so a contract count is not comparable across those dates. Data starts Dec 23, 2024, the first bulletin carrying event-contract rows.</p>

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
import {GRANULARITIES, parlayChart, toDailyParlay} from "./components/parlay-series.js";
const ndParlayGranularity = view(Inputs.radio(GRANULARITIES, {value: "Monthly", label: "View"}));
```

```js
// Volume only, and there is no metric toggle here on purpose. The one Nadex stake series
// is keyed on the SETTLEMENT session, not the trading day, and it starts eight months after
// parlays did — putting it behind the same toggle as this chart would offer two bars that
// look comparable and count different populations. The money is in Parlay P&L below.
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

## Parlay P&L

```js
const pdSorted = parlayDaily
  .map(d => ({
    ...d,
    // typed:true turns the date column into a Date; everything below wants one.
    date: d.date instanceof Date ? d.date : new Date(String(d.date)),
    prov: String(d.is_provisional) === "true"
  }))
  .sort((a, b) => a.date - b.date);

// Cumulative is built here rather than in the producer so the two charts can never
// disagree about which days they include.
let _c = 0;
const pdCumul = pdSorted.map(d => {
  _c += +d.gross_pnl;
  return {...d, cumul: _c};
});

const pdTotal = _c;
const pdContracts = d3.sum(pdSorted, d => +d.contracts_settled);

// Kalshi's per-contract comparators, contract-weighted over competitor_pnl_by_bin.csv.
// GROSS, matching pdTotal/pdContracts above (which sums gross_pnl), so the three figures in
// the callout are finally on ONE basis — the old sentence compared a gross Nadex number
// against two net Kalshi ones and asked the reader to hold that difference in their head.
const kalshiPerContract = group => {
  const rows = kalshiPnlBins.filter(d => d.venue === "Kalshi" && d.group === group);
  const c = d3.sum(rows, d => +d.contracts || 0);
  return c ? d3.sum(rows, d => +d.pnl || 0) / c : null;
};
const kalshiParlayPer = kalshiPerContract("PARLAY");
const kalshiSinglePer = kalshiPerContract("NON_PARLAY");
// Magnitude only — the verb carries the direction, and a signed format would render
// "lose +0.63c". Same rule, and the same reason, as compare-accuracy.md's fmtCentsMag.
const fmtCentsMag = d => `${Math.abs(d * 100).toFixed(2)}¢`;
const pdParlays = d3.sum(pdSorted, d => +d.parlays_settled);
const pdProv = pdSorted.filter(d => d.prov).length;
const fmtM = d => "$" + (Math.abs(d) >= 1e6 ? (d / 1e6).toFixed(2) + "M"
                       : Math.abs(d) >= 1e3 ? (d / 1e3).toFixed(0) + "k"
                       : d.toFixed(0));
const nadexPnlDateSel = Mutable([d3.min(pdSorted, d => d.date), d3.max(pdSorted, d => d.date)]);
display(renderDateBrush({
  data: pdSorted.map(d => ({date: d.date, value: Math.abs(+d.gross_pnl) || 0})),
  initialRange: [d3.min(pdSorted, d => d.date), d3.max(pdSorted, d => d.date)],
  onSelect: range => { nadexPnlDateSel.value = range; },
  color: "var(--accent-nadex)",
  width
}));
```

```js
const [nadexPnlFrom, nadexPnlTo] = nadexPnlDateSel;
const pdSortedBrushed = pdSorted.filter(d => d.date >= nadexPnlFrom && d.date <= nadexPnlTo);
const pdCumulBrushed = pdCumul.filter(d => d.date >= nadexPnlFrom && d.date <= nadexPnlTo);
```

<div class="instruction-line">Over ${pdSorted.length} sessions, <strong>${pdParlays.toLocaleString()} settled parlays</strong> carrying ${(pdContracts / 1e6).toFixed(1)}M contracts lost their buyers <strong>${fmtM(pdTotal)}</strong> gross &mdash; ${(100 * pdTotal / pdContracts).toFixed(3)}&cent; per contract. <strong>The first ${pdProv} days are drawn faded and are provisional.</strong> A parlay is only counted when the window contains every print it ever traded, and a parlay settling in the opening days was often created before collection began, so those days hold less than their true volume. 80% of parlays settle within a day of being created and 99.9% within a fortnight, so the shortfall does not reach past it.</div>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 78,
  x: {type: "utc", label: null},
  y: {label: "Daily parlay P&L, gross (USD)", grid: true,
      tickFormat: d => "$" + (Math.abs(d) >= 1e6 ? (d / 1e6).toFixed(1) + "M" : (d / 1e3).toFixed(0) + "k")},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.2}),
    // Colour carries DIRECTION (did the bettor win that day), opacity carries how much
    // of the day the window can actually account for. Solid throughout: a faded bar is
    // a weaker reading, never a missing one.
    Plot.rectY(pdSortedBrushed, {
      x: "date", interval: "day", y: "gross_pnl",
      fill: d => +d.gross_pnl > 0 ? "var(--accent-positive)" : "var(--accent-negative)",
      fillOpacity: d => d.prov ? 0.4 : 0.92,
      title: d => `${d.date.toISOString().slice(0, 10)}${d.prov ? " — PROVISIONAL" : ""}
Gross P&L: ${fmtM(+d.gross_pnl)}
Staked: ${fmtM(+d.stake_usd)}
${(+d.contracts_settled).toLocaleString()} contracts on ${(+d.parlays_settled).toLocaleString()} parlays
${(+d.gross_pnl_cents_per_contract).toFixed(2)}¢ per contract
Coverage: ${(+d.coverage_pct).toFixed(1)}%`,
      tip: true
    })
  ]
})
```

_Green days are days the parlay bettors came out ahead; red days they did not. Because a parlay is settled as one contract, a single large winning combo can turn a day green on its own._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 78,
  x: {type: "utc", label: null},
  y: {label: "Cumulative parlay P&L, gross (USD)", grid: true,
      tickFormat: d => "$" + (Math.abs(d) >= 1e6 ? (d / 1e6).toFixed(1) + "M" : (d / 1e3).toFixed(0) + "k")},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.areaY(pdCumulBrushed, {x: "date", y: "cumul", fill: "var(--accent-nadex)", fillOpacity: 0.12}),
    Plot.line(pdCumulBrushed, {x: "date", y: "cumul", stroke: "var(--accent-nadex)", strokeWidth: 2}),
    Plot.dot(pdCumulBrushed, {
      x: "date", y: "cumul", r: 9, fill: "transparent",
      title: d => `${d.date.toISOString().slice(0, 10)}
Cumulative: ${fmtM(d.cumul)}
That day: ${fmtM(+d.gross_pnl)}`,
      tip: true
    })
  ]
})
```

<div class="instruction-line">The line goes one way, but not smoothly, and the bumps are the interesting part. <strong>The cumulative total did climb above zero on five separate days, peaking at &plus;&dollar;701k</strong> &mdash; every one of them inside the provisional opening fortnight, and driven by single days like 23 June that returned &plus;&dollar;2.0M against a typical daily swing nearer &plusmn;&dollar;300k. That is one or two large combos landing, and it is exactly the variance a parlay book is built on. Once coverage is complete the line never crosses back above zero. The shape matches Kalshi's parlay book and is the expected one: a parlay's price is the product of its legs plus the house's margin on each, so the edge compounds with every leg added. Crypto.com's buyers lose <strong>${fmtCentsMag(pdTotal / pdContracts)} per contract</strong>${kalshiParlayPer == null || kalshiSinglePer == null ? "" : ` against Kalshi parlay takers' ${fmtCentsMag(kalshiParlayPer)} and Kalshi single-market takers' ${fmtCentsMag(kalshiSinglePer)} — all three gross and contract-weighted, so they compare directly`}.</div>

## Sports vs. non-sports

<p class="section-intro">Sports against everything else — sports carries all but a handful of days. Almost everything on the other side is the COMBOS parlay line, split out here so the rest is actually visible.</p>

```js
const brushSports = view(makeBrush(split, "var(--accent-nadex)"));
```

```js
const [sS, eS] = brushSports;
const splitFSports = split.filter(d => d.date >= sS && d.date <= eS);
// COMBOS (the "Parlays" category) is the great majority of the non-sports side,
// so a single "Non-sports" band buried the exchange's largest product inside a
// residual. Pull it out as its own series and show what is left over.
const parlayByDate = new Map(catDaily.filter(d => d.category === "Parlays").map(d => [+d.date, d.contracts || 0]));
const otherNonSports = d => Math.max(0, (d.contracts_nonsports || 0) - (parlayByDate.get(+d.date) || 0));
const tidySplit = splitFSports.flatMap(d => [
  {date: d.date, category: "Sports",           value: d.contracts_sports || 0},
  {date: d.date, category: "Parlays (COMBOS)", value: parlayByDate.get(+d.date) || 0},
  {date: d.date, category: "Other non-sports", value: otherNonSports(d)}
]);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, domain: ["Sports", "Parlays (COMBOS)", "Other non-sports"], range: ["#1a9641", "var(--accent-nadex)", "var(--accent-kalshi)"]},
  marks: [
    Plot.areaY(tidySplit, {
      x: "date", y: "value", fill: "category",
      order: ["Other non-sports", "Parlays (COMBOS)", "Sports"],
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(splitFSports, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFSports, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSports: ${fmtCount(d.contracts_sports||0)}\nParlays (COMBOS): ${fmtCount(parlayByDate.get(+d.date) || 0)}\nOther non-sports: ${fmtCount(otherNonSports(d))}`
    })),
    Plot.ruleY([0])
  ]
})
```

## Volume by category

<p class="section-intro">Where the action concentrates, category by category, over time.</p>

```js
const brushCats = view(makeBrush(split, "var(--accent-nadex)"));
```

```js
const [sC, eC] = brushCats;
const catDailyFCats = catDaily.filter(d => d.date >= sC && d.date <= eC);
const catTotals = d3.rollup(catDaily, v => d3.sum(v, d => d.contracts), d => d.category);
const topCats = [...catTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8).map(d => d[0]);
const catFiltered = catDailyFCats.filter(d => topCats.includes(d.category));
```

```js
// Per-date pivot for single combined tooltip (avoids overlapping bubbles)
const catTipData = Array.from(
  d3.rollup(catFiltered, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.category] = r.contracts || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: {legend: true, columns: 4, scheme: "tableau10", domain: topCats},
  marks: [
    Plot.areaY(catFiltered, {
      x: "date", y: "contracts", fill: "category",
      order: topCats.slice().reverse(),
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(catTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(catTipData, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...topCats.map(c => d[c] > 0 ? `${c}: ${fmtCount(d[c])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

## Category breakdown (all time)

<p class="section-intro">Every category ranked by all-time volume. "Unparsed" is bulletin rows whose product column came through blank — real volume, unknown product.</p>

```js
const catBar = [...catTotals.entries()]
  .sort((a,b) => b[1] - a[1])
  .map(([category, contracts]) => ({category, contracts}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: catBar.length * 28 + 40,
  marginLeft: 160,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => fmtAxisNum(d)},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "var(--accent-nadex)", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
})
```

## Top sport events (all time)

_The biggest individual sports events on Nadex by all-time contract volume, from the daily bulletin events feed._

```js
// Bulletin lines whose venue name contains "Events Center" survive the scraper's
// line regex as descriptions starting with "Center", carrying an expiry date in
// the volume column. Same drop rule as R/nadex_categories_daily.R.
const TICKER_RE = /^[A-Z0-9]+(-[A-Za-z0-9.]+)*$/;
const nadexEvents = (await DataAttachment("data/nadex_events_daily.csv").csv({typed: true}))
  .filter(d => TICKER_RE.test(d.resource_description) || d.resource_description === "NO DESCRIPTION");
```

```js
const SPORT_PREFIX_LABELS = {
  NFL: "NFL", NBA: "NBA", NHL: "NHL", MLB: "MLB", WNBA: "WNBA", MLS: "MLS",
  CFB: "College football", FLAGB: "Flag football",
  CBB: "College basketball", CBBM: "College basketball", CBBW: "College basketball (W)",
  CWBB: "College basketball (W)", WBB: "Women's basketball",
  ARP: "Baseball", TENNIS: "Tennis",
  GOLF: "Golf", PGA: "PGA", LPGA: "LPGA", WOLY: "Golf (WOLY)",
  UFC: "UFC", MMA: "MMA", BOX: "Boxing", BOXING: "Boxing", WBC: "Boxing (WBC)",
  FIFA: "Soccer (FIFA)", FIFAF: "Soccer (FIFAF)", EPL: "Soccer (EPL)",
  UCL: "Soccer (UCL)", UEL: "Soccer (UEL)", ESP: "Soccer (ESP)",
  ITSA: "Soccer (ITSA)", FRL1: "Soccer (FRL1)", LMX: "Soccer (LMX)",
  SOCCER: "Soccer",
  F1: "Formula 1", INDYC: "IndyCar", NSCAR: "NASCAR",
  BRSA: "Rugby (BRSA)", IPL: "Cricket (IPL)", SAIL: "Sailing",
  LOL: "Esports (LoL)", DOTA2: "Esports (Dota 2)", CS2: "Esports (CS2)"
};
const SPORT_COLORS = {
  "NFL":"#A30000","NBA":"#1F4E96","NHL":"#3b6ea5","MLB":"#2E7D32","WNBA":"#42A5F5",
  "College football":"#FF7043","College basketball":"#5E35B1","Women's basketball":"#7CB342",
  "Golf":"#FFB300","UFC":"var(--accent-nadex)","PGA":"#FFB300","LPGA":"#FFB300",
  "Soccer (FIFA)":"#00897B","Tennis":"#C2185B","MLS":"#26A69A","Boxing":"#6D4C41"
};
// Widened 2026-08-06. The previous list (NFL|NBA|NHL|MLB|WNBA|CFB|CBB|WBB|GOLF|
// UFC|PGA|LPGA) saw only 61.4% of bulletin volume, which hid every FIFA market —
// including FIFA-00001-260719-M, the second-largest event on the exchange.
const sportRe = /^(NFL|CFB|FLAGB|NBA|WNBA|CBB|CBBM|CBBW|CWBB|WBB|MLB|ARP|NHL|TENNIS|GOLF|PGA|LPGA|WOLY|UFC|MMA|BOX|BOXING|WBC|FIFA|FIFAF|EPL|UCL|UEL|ELC|EWQ|ESP|ITSA|FRL1|LMX|MLS|UCOL|CUL|SOCCER|F1|INDYC|NSCAR|BRSA|IPL|SAIL|LOL|DOTA2|CS2)-/;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function eventLabel(event) {
  const prefix = event.split("-")[0];
  const sport  = SPORT_PREFIX_LABELS[prefix] || prefix;
  // Settlement date is the trailing YYMMDD block (NFL-00001-260208-M,
  // CBB-W1G1-251103-M); season-long markets carry a trailing year (GOLF-00006-2026).
  const dm = event.match(/-(\d{2})(\d{2})(\d{2})(?:-[A-Z0-9]+)?$/);
  const ym = event.match(/-(\d{4})$/);
  let dateStr = "";
  if (dm && +dm[2] >= 1 && +dm[2] <= 12) dateStr = `${MONTHS[+dm[2] - 1]} ${+dm[3]}, '${dm[1]}`;
  else if (ym) dateStr = ym[1];
  return {sport, label: `${sport} · ${dateStr || "season"}`};
}

const eventTotals = d3.rollup(
  nadexEvents.filter(d => sportRe.test(d.resource_description)),
  v => ({volume: d3.sum(v, x => +x.volume), days: v.length}),
  d => d.resource_description
);

const ranked = [...eventTotals.entries()]
  .sort((a,b) => b[1].volume - a[1].volume)
  .slice(0, 20)
  .map(([event, agg]) => ({event, ...eventLabel(event), volume: agg.volume, days: agg.days}));
// Two markets can share a league and a settlement date (FIFA-00001-260707-M and
// FIFA-00002-260707-M) and three golf markets share a season, so append the
// bulletin's market number where the label would otherwise repeat.
const labelCounts = d3.rollup(ranked, v => v.length, d => d.label);
const topEvents = ranked.map(d => {
  if (labelCounts.get(d.label) === 1) return d;
  const n = d.event.match(/^[A-Z0-9]+-0*(\d+)(?:-|$)/);
  return {...d, label: n ? `${d.label} · #${n[1]}` : `${d.label} · ${d.event}`};
});
// The y domain is the ticker, not the label: identical band keys would collapse
// two events into one bar, which is what the old label-keyed domain did.
const labelByEvent = new Map(topEvents.map(d => [d.event, d.label]));
const sportDomain = [...new Set(topEvents.map(d => d.sport))];
const sportRange  = sportDomain.map((s, i) => SPORT_COLORS[s] || d3.schemeTableau10[i % 10]);

const nadexTotal    = d3.sum(nadexEvents, d => +d.volume);
const sportCovered  = d3.sum(nadexEvents.filter(d => sportRe.test(d.resource_description)), d => +d.volume);
const topEventsVol  = d3.sum(topEvents, d => d.volume);
```

<p class="section-intro">Sports lines the chart can see: ${fmtPct(sportCovered / nadexTotal)} of all bulletin volume. The 20 events below are ${fmtPct(topEventsVol / nadexTotal)} of it. COMBOS on its own is ${fmtCount(parlayTotal)} contracts — ${(parlayTotal / topEventsVol).toFixed(1)}× these twenty put together.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: topEvents.length * 26 + 60,
  marginLeft: 170,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k"},
  y: {label: null, domain: topEvents.map(d => d.event), tickFormat: t => labelByEvent.get(t) ?? t},
  color: {legend: true, domain: sportDomain, range: sportRange},
  marks: [
    Plot.barX(topEvents, {
      x: "volume", y: "event", fill: "sport", fillOpacity: 0.85,
      tip: true,
      title: d => `${d.label}\n${d.event}\nVolume: ${fmtCount(d.volume)}\nTrading days: ${d.days}`
    }),
    Plot.ruleX([0])
  ]
})
```

## Top markets

<p class="section-intro">Crypto.com/Nadex's individual markets, ranked by volume — the daily bulletin publishes a ticker and a volume, and nothing that identifies a fixture.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/nadex_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
import {attachMarketInspector} from "./components/inspect-tables.js";
```

```js
// Clicking a market name opens the same inspector drawer /market-explorer uses. The rows
// are held in a const because the click handler and the shared-link resolver both read them.
//
// `source` is this page's own key, and that matters: selection state lives in the GLOBAL
// pc_* query namespace, so a link copied from another venue's leaderboard would otherwise
// resolve against these rows and open the wrong market.
const lbMarkets = normalizeLeaderboard("nadex", lbRows);
display(marketLeaderboard({
  hashPrefix: "ndlb",
  rowsPerPage: 20,
  venues: [{spec: LB_VENUES.nadex, rows: lbMarkets}],
  onMarketSelect: attachMarketInspector({source: "nadex-markets", rows: lbMarkets})
}));
```
