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
import {ESTABLISHED_VOLUME_EVENTS, positionedVolumeEvents, volumeEventMarks} from "./components/volume-events.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily  = await DataAttachment("data/rothera_categories_daily.csv").csv({typed: true});
const split     = await DataAttachment("data/rothera_sports_split_daily.csv").csv({typed: true});
// Open interest is published in the shared competitor file, not in Rothera's own
// exports -- it is the same series /compare-scale draws this venue's line from.
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category data", date: latestDate(catDaily), updatedAt: fileUpdatedAt(freshness, "rothera_categories_daily.csv"), meta: "Rothera daily clearing files", tone: "competitor"},
    {label: "Sports split", date: latestDate(split), updatedAt: fileUpdatedAt(freshness, "rothera_sports_split_daily.csv"), meta: "Derived from mapped product prefixes", tone: "competitor"},
    {label: "Open interest", date: latestDate(oiRows), updatedAt: fileUpdatedAt(freshness, "competitor_daily.csv"), meta: "Contracts outstanding at each day's close", tone: "competitor"}
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
// OPEN INTEREST IS A STOCK, NOT A FLOW -- the contracts outstanding at a day's
// close. It is never summed over a range anywhere on this site; the KPI below
// reads the LAST value, and the chart draws the path.
const oiRows = competitorDaily
  .filter(d => d.platform === "Rothera" && d.open_interest != null && d.open_interest !== "" && +d.open_interest > 0)
  .map(d => ({date: d.date instanceof Date ? d.date : new Date(`${String(d.date).slice(0, 10)}T00:00:00Z`), oi: +d.open_interest}))
  .sort((a, b) => a.date - b.date);
const latestOi = oiRows[oiRows.length - 1];
const peakOi = oiRows.reduce((best, d) => (best && best.oi >= d.oi ? best : d), oiRows[0]);
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
  <div class="kpi-card" data-accent="positive">
    <div class="kpi-label">Latest open interest</div>
    <div class="kpi-value">${fmtCount(latestOi?.oi)}</div>
    <div class="kpi-meta">${fmtDate(latestOi?.date)} · contracts outstanding</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Rothera is Robinhood's own regulated event-contract exchange — distinct from the Robinhood brokerage business covered on the <a href="./robinhood">Robinhood (FCM)</a> page, which estimates how much Robinhood trades <em>on Kalshi</em>. This page reads Rothera's daily clearing exports directly.</p>
  <p>Volume is contract count (one settled contract per unit), summed by day. Categories come from each market's product prefix (e.g. <code>MWC*</code> = World Cup soccer, <code>MLB*</code> = baseball, <code>EC*</code> = economics); the sports split sums sport prefixes against everything else. The exports carry no fee field, so fees are computed per fill from Rothera's trade tape against its published schedule &mdash; see <a href="./rothera-economics">Economics</a>, which is why that series starts later than this one. Because <em>this</em> page is end-of-day market data rather than trade prints, it is best for scale and category mix; <a href="./rothera-behavior">Trading behavior</a> covers microstructure over the shorter window the tape reaches.</p>
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
const volumeEvents = positionedVolumeEvents(ESTABLISHED_VOLUME_EVENTS, sV, eV, d3.max(splitFVolume, d => d.contracts_total) || 1);
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
    ...volumeEventMarks(Plot, volumeEvents),
    Plot.ruleY([0])
  ]
})
```

## Open interest

<p class="section-intro">Contracts still outstanding at each day's close — the standing capital on the book, as opposed to the volume that passed through it.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 260,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Open interest (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.areaY(oiRows, {x: "date", y: "oi", fill: "var(--accent-rothera)", fillOpacity: 0.2, curve: "monotone-x"}),
    Plot.line(oiRows, {x: "date", y: "oi", stroke: "var(--accent-rothera)", strokeWidth: 1.8, curve: "monotone-x"}),
    Plot.tip(oiRows, Plot.pointerX({
      x: "date", y: "oi",
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.oi)} contracts outstanding`
    })),
    Plot.ruleY([0])
  ]
})
```

```js
display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Peaked at ${fmtCount(peakOi?.oi)} on ${fmtDate(peakOi?.date)}. This is a <strong>stock, not a flow</strong> — it is never summed over a date range, unlike the volume above it. <a href="./compare-scale">Scale across venues</a> puts the same series beside every other exchange.</div>`);
```

## Why there is no calibration curve on this page

<p class="section-intro"><a href="./compare-accuracy">Accuracy &amp; Outcomes</a> asks the sharpest question available: do prices actually predict outcomes? Rothera carries <code>settlement_price</code> and <code>contracts_delivered</code>, and since 2026-07-28 a tape of the prices actually paid, so it looks like it should support the same chart. It is closer than it was, and still not there &mdash; for a different reason than before. The measurement is published here so the gap is a documented result rather than a silent omission.</p>

<details class="surface-card compact-details">
  <summary>What was measured, and what it ruled out</summary>
  <p><strong>The outcome side is fine.</strong> 3,063 contracts carry a clean binary settlement (a delivery row with <code>settlement_price</code> of exactly 0 or 1), spanning 2026-05-23 to 2026-08-31.</p>
  <p><strong>The price side used to be the problem and no longer is.</strong> <code>mkt_eod</code> is end-of-day market data with no trade prints, so a full-history axis would have to be an OHLC-derived proxy. But the <code>trades_eod</code> tape now runs from 2026-07-28 to the present, and <strong>92.3% of its 1,657,858 prints land on a contract that has since settled</strong> — over that window the x-axis is the price actually paid, not a proxy.</p>
  <p><strong>The event count no longer blocks it either — this is what changed.</strong> Measured at ten sessions of tape, the prints were <strong>71 independent events</strong> and 22–51 per 5-cent bin, with 94.4% of the weight on a single World Cup. Re-measured on 35 sessions: <strong>409 independent settled events, 361–405 in every one of the 20 bins, and the three largest events are only 4.6% of settled contracts.</strong> The concentration that made the old curve incoherent is gone, and a curve rebuilt on real prints comes out monotone — 2.16% realised at the bottom band against 95.73% at the top, with a volume-weighted mean error of −1.36¢ and only two bins beyond two standard errors.</p>
  <p><strong>What still blocks it is breadth, not size.</strong> 399 of those 409 events are MLB games; the rest are three PGA Tour events, three unemployment-claims releases, two inflation releases and two tennis tournaments. A curve drawn on that would be a one-league, one-month measurement wearing a venue's name, and it would say nothing about the soccer that is most of what Rothera has ever traded. The prerequisite is unchanged: continuous tape collection across more leagues, months of it. The counting argument that used to sit here is retired; the breadth argument is what the page now rests on.</p>
  <p><strong>One trap survives regardless.</strong> On the delivery day the daily close is 0.01 or 0.99 — the outcome itself. Any proxy curve built without excluding settlement-day bars measures its own leakage and will look beautifully calibrated at both ends.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Measured 2026-09-01. The numbers above move every week the tape grows; re-run before citing them.</div>

## Individual markets

<p class="section-intro">Rothera's individual markets, ranked by volume. <strong>Rothera publishes no market names</strong> — the feed carries a mnemonic code and nothing else — so this table shows codes and does not dress them up as titles.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/rothera_market_leaderboard.csv").csv();
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
const lbMarkets = normalizeLeaderboard("rothera", lbRows);
display(marketLeaderboard({
  hashPrefix: "rolb",
  venues: [{spec: LB_VENUES.rothera, rows: lbMarkets}],
  onMarketSelect: attachMarketInspector({source: "rothera-markets", rows: lbMarkets})
}));
```
