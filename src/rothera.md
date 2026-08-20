---
title: Rothera (Robinhood)
---

<div class="page-hero" data-accent="rothera">
  <div class="page-eyebrow">Robinhood · Exchange</div>
  <h1>Rothera (Robinhood)</h1>
  <p class="page-lead">Rothera is Robinhood's <em>own</em> CFTC-regulated event-contract exchange — a venue where contracts are listed and cleared, not a brokerage routing flow elsewhere. That makes it a different animal from the <a href="./robinhood">Robinhood (FCM)</a> page, which estimates Robinhood's brokerage business <em>on Kalshi</em>. Here the volume is Rothera's own book, and right now it's almost all sports — World Cup soccer above all.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily  = await DataAttachment("data/rothera_categories_daily.csv").csv({typed: true});
const split     = await DataAttachment("data/rothera_sports_split_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category data", date: latestDate(catDaily), updatedAt: fileUpdatedAt(freshness, "rothera_categories_daily.csv"), meta: "Rothera daily clearing files", tone: "competitor"},
    {label: "Sports split", date: latestDate(split), updatedAt: fileUpdatedAt(freshness, "rothera_sports_split_daily.csv"), meta: "Derived from mapped product prefixes", tone: "competitor"}
  ],
  note: "Rothera updates when the daily clearing CSVs are downloaded and rebuilt; this is end-of-day market data, not a trade-level feed."
}));
display(askPageLink({
  question: "Summarize recent Rothera (Robinhood) event-contract activity and whether sports or non-sports categories are driving it.",
  context: "Rothera (Robinhood) page using rothera_categories_daily.csv and rothera_sports_split_daily.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="rothera">
    <div class="kpi-label">Volume (all time)</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)} · contracts</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Rothera is Robinhood's own regulated event-contract exchange — distinct from the Robinhood brokerage business covered on the <a href="./robinhood">Robinhood (FCM)</a> page, which estimates how much Robinhood trades <em>on Kalshi</em>. This page reads Rothera's daily clearing exports directly.</p>
  <p>Volume is contract count (one settled contract per unit), summed by day. Categories come from each market's product prefix (e.g. <code>MWC*</code> = World Cup soccer, <code>MLB*</code> = baseball, <code>EC*</code> = economics); the sports split sums sport prefixes against everything else. The exports carry no fee field, so no fee series is shown here; the Comparison page instead derives Rothera's exchange fee from the venue's published schedule, which depends on price, so it must stand a daily price in for each trade's price and assume a mix of retail and professional participants (professionals pay six times retail). Because this is end-of-day market data rather than trade prints, the page is best for scale and category mix rather than microstructure.</p>
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
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0))
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

<p class="section-intro">Daily event-contract volume on Rothera since the clearing files began.</p>

```js
const brushVolume = view(makeBrush(split, "var(--accent-rothera)"));
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
      fill: "var(--accent-rothera)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Daily contract volume from Rothera's clearing exports (sum of per-market volume). No fee field is published in the source, so no fee is shown on this page. Any Rothera fee on the Comparison page is derived from the venue's published schedule, not reported by the venue, and rests on a daily price proxy and an assumed participant mix — read its caption before quoting it.</p>

## Sports vs. non-sports

<p class="section-intro">Sports against everything else — and on Rothera, sports carries the day overwhelmingly.</p>

```js
const brushSports = view(makeBrush(split, "var(--accent-rothera)"));
```

```js
const [sS, eS] = brushSports;
const splitFSports = split.filter(d => d.date >= sS && d.date <= eS);
const tidySplit = splitFSports.flatMap(d => [
  {date: d.date, category: "Sports",     value: d.contracts_sports    || 0},
  {date: d.date, category: "Non-sports", value: d.contracts_nonsports || 0}
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
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "var(--accent-kalshi)"]},
  marks: [
    Plot.areaY(tidySplit, {
      x: "date", y: "value", fill: "category",
      order: ["Non-sports", "Sports"],
      curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(splitFSports, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(splitFSports, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nSports: ${fmtCount(d.contracts_sports||0)}\nNon-sports: ${fmtCount(d.contracts_nonsports||0)}`
    })),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Non-sports is Economics (<code>EC*</code> — CPI, unemployment) plus any non-sport product; everything with a sport prefix counts as sports.</p>

## Volume by category

<p class="section-intro">Where the action concentrates, category by category, over time.</p>

```js
const brushCats = view(makeBrush(split, "var(--accent-rothera)"));
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

## Why there is no calibration curve on this page

<p class="section-intro"><a href="./compare-accuracy">Accuracy &amp; Outcomes</a> asks the sharpest question available: do prices actually predict outcomes? Rothera carries <code>settlement_price</code> and <code>contracts_delivered</code>, so it looks like it should support the same chart. It does not. The measurement is published here so the gap is a documented result rather than a silent omission.</p>

<details class="surface-card compact-details">
  <summary>What was measured, and what it ruled out</summary>
  <p><strong>The outcome side is fine.</strong> 2,229 contracts carry a clean binary settlement (a delivery row with <code>settlement_price</code> of exactly 0 or 1), spanning 2026-05-23 to 2026-08-06.</p>
  <p><strong>The price side is not.</strong> <code>mkt_eod</code> is end-of-day market data with no trade prints. The <code>trades_eod</code> tape starts 2026-07-27 — anything earlier is permanently 403 — so a full-history x-axis would have to be a daily OHLC-derived proxy rather than a traded price.</p>
  <p><strong>The proxy turns out to be the smaller problem.</strong> Against the 10 sessions where real prints and daily bars overlap (3,494 contract-days, with the tape's quantity matching the bar's volume on all 3,494), the best proxy — OHLC/4 — sits 0.46¢ from the true volume-weighted traded price on average and drops 6.8% of observations into the wrong 5-cent bin. The daily close and the daily settlement mark are worse: 1.50¢ and 1.56¢, about 10% misbinned. Usable, if that were the only obstacle.</p>
  <p><strong>The binding constraint is independent events, and it is not close.</strong> Trades cluster on games: thousands of prints on one match share one outcome, so they are one observation. Counting events instead of prints:</p>
  <ul>
    <li><strong>Real prints:</strong> 298,529 prints land on a settled contract, but they are <strong>70 baseball games plus one inflation release — 71 independent events</strong>. Soccer is about 92% of Rothera's all-time volume and that World Cup settled before the tape begins, so it contributes zero usable prints. Per 5-cent bin the effective event count is 22–51 — an order of magnitude short of what the comparable DKeX measurement rests on (424–654 independent games per decile), and the one large block is a single tournament.</li>
    <li><strong>Daily proxy:</strong> 307 events across 77 days, but <strong>94.4% of the weight is the one World Cup and 25.8% of all weight is a single cluster</strong> — the tournament-winner market, where 48 team contracts resolve off one tournament. The curve that falls out is incoherent (−25.9¢ at 40¢, +20.3¢ at 45¢, +24.6¢ at 70¢, −13.2¢ at 90¢), and about half its bins would be flagged "significant" because the distortion is systematic rather than random. Clustering cannot rescue a biased axis.</li>
  </ul>
  <p><strong>One more trap.</strong> On the delivery day the daily close is 0.01 or 0.99 — the outcome itself. Any proxy curve built without excluding settlement-day bars measures its own leakage and will look beautifully calibrated at both ends.</p>
  <p><strong>What would change the answer.</strong> The comparable DKeX measurement rests on 424–654 independent games per decile. Rothera currently offers 22–51 effective events per 5-cent bin, an order of magnitude short, and its one large block is a single tournament. Continuous <code>trades_eod</code> collection across a broader set of leagues — months of it, not weeks — is the prerequisite. Until then a curve here would imply precision the sample cannot carry.</p>
</details>

## Category breakdown (all time)

<p class="section-intro">Every category ranked by all-time volume.</p>

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
      fill: "var(--accent-rothera)", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
})
```

## Individual markets

<p class="section-intro">Rothera's individual markets, ranked by volume. <strong>Rothera publishes no market names</strong> — the feed carries a mnemonic code and nothing else — so this table shows codes and does not dress them up as titles.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/rothera_market_leaderboard.csv").csv();
import {LB_VENUES, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
```

```js
display(marketLeaderboard({
  hashPrefix: "rolb",
  venues: [{spec: LB_VENUES.rothera, rows: normalizeLeaderboard("rothera", lbRows)}]
}));
```
