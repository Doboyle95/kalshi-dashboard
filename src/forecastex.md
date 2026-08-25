---
title: ForecastEx
---

<div class="page-hero" data-accent="forecastex">
  <div class="page-eyebrow">ForecastEx</div>
  <h1>ForecastEx</h1>
  <p class="page-lead">ForecastEx briefly ran huge on the 2024 election. Today its core product is daily city-temperature contracts.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const catDaily  = await DataAttachment("data/forecastex_categories_daily.csv").csv({typed: true});
const split     = await DataAttachment("data/forecastex_sports_split_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category data", date: latestDate(catDaily), updatedAt: fileUpdatedAt(freshness, "forecastex_categories_daily.csv"), meta: "Public ForecastEx files", tone: "competitor"},
    {label: "Sports split", date: latestDate(split), updatedAt: fileUpdatedAt(freshness, "forecastex_sports_split_daily.csv"), meta: "Derived from mapped categories", tone: "competitor"}
  ],
  note: "ForecastEx updates when its public daily files are downloaded and rebuilt; fees come from the pairs-file fee convention."
}));
display(askPageLink({
  question: "Summarize recent ForecastEx activity and the category mix behind it.",
  context: "ForecastEx page using forecastex_categories_daily.csv and forecastex_sports_split_daily.csv."
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
  <div class="kpi-card" data-accent="forecastex">
    <div class="kpi-label">All-time volume</div>
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
  <p>ForecastEx volume comes from public daily price/pair files normalized into category and sports-split aggregates. Volume is pair quantity or contract count, depending on the source field. Category and sports views use the local market classification rules applied during export.</p>
  <p>Use it as a concentration check: whether ForecastEx is riding one theme or several. The 2025-onward breakdown shows the mix that remains after a noisy stretch is brushed out.</p>
</details>

```js
// Short axis format: "400M" instead of "400,000,000"
const fmtAxisNum = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? Math.round(a/1e6)+"M" : a >= 1e3 ? Math.round(a/1e3)+"k" : String(a)); };

function makeBrush(data, color, defaultStart) {
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

  // Default brush start: clamp to available data
  const dataMin = d3.min(data, d => d.date);
  const dataMax = d3.max(data, d => d.date);
  const start = defaultStart && +defaultStart > +dataMin ? defaultStart : dataMin;
  const end = dataMax;

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
  svg.selectAll(".handle")
    .style("display", "block")
    .style("fill", color).style("fill-opacity", 0.9);
  svg.selectAll(".selection")
    .style("stroke", color).style("stroke-width", "2px")
    .style("fill", color).style("fill-opacity", 0.15);
  svg.property("value", [start, end]);
  return svg.node();
}
```

## Daily volume

<p class="section-intro">ForecastEx full exchange volume. Defaults to 2025+ since 2024's election days otherwise compress the view.</p>

```js
const brushVolume = view(makeBrush(split, "var(--accent-forecastex)", new Date("2025-01-01")));
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
      fill: "var(--accent-forecastex)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">ForecastEx full exchange volume from the exchange's own daily bulletins. Contract denominations vary by product; counts reflect individual contracts traded, not dollar value.</p>

## Sports vs. non-sports

<p class="section-intro">How much of ForecastEx is sports versus everything else — once a thin slice, now mostly gone.</p>

```js
const brushSports = view(makeBrush(split, "var(--accent-forecastex)", new Date("2025-01-01")));
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
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["var(--accent-forecastex)", "var(--accent-kalshi)"]},
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

## Volume by category

<p class="section-intro">The themes carrying ForecastEx's volume, and the shift from politics toward weather.</p>

```js
const brushCats = view(makeBrush(split, "var(--accent-forecastex)", new Date("2025-01-01")));
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

## Category breakdown (2025 onward)

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
  x: {label: "Contracts (2025 onward)", grid: true, tickFormat: d => fmtAxisNum(d)},
  y: {label: null},
  marks: [
    Plot.barX(catBar, {
      x: "contracts", y: "category",
      sort: {y: "x", reverse: true},
      fill: "var(--accent-forecastex)", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Politics dominated 2024 volume (presidential election contracts). Weather contracts (city high-temperature markets) are now ForecastEx's primary product. Football = NFL game-winner contracts (NFLGW). Basketball = NBA game-winner contracts (NBAGW).</p>

## Individual markets

<p class="section-intro">Every ForecastEx product ranked by volume, with the venue's own published product names. Volume here is matched <em>pairs</em>, the same convention as the charts above and as <code>competitor_daily.csv</code>.</p>

<p class="chart-note"><strong>All-time is dominated by one election.</strong> The two 2024 US presidential contracts are 47% of everything ForecastEx has traded since 2024-08-01, and Politics is over half the ranked volume. That is a real fact about the venue rather than a defect, but it hides everything that has happened since — so use the <strong>Period</strong> control above the table to read a single month, where weather products and the S&amp;P future move to the top. The line under the table restates the concentration for whichever period is selected.</p>
<p class="chart-note">There is no winner column and no outcome count, and neither is an omission. ForecastEx strikes are threshold contracts, not exclusive outcomes: across the 21,506 multi-contract events measured here, the number settling YES is most commonly two to eleven, so &ldquo;the winner&rdquo; is not a well-formed question. What the venue does support is a count of contracts ever listed under a product — 2,140 for a daily temperature product — which is a different statistic and is headed as one.</p>

```js
// Untyped on purpose — see the note in components/market-leaderboard.js: reading
// this file with {typed: true} turns the period column's "2026-05" into a Date
// and coerces market codes. Every column is coerced explicitly there instead.
const lbRows = await DataAttachment("data/forecastex_market_leaderboard.csv").csv();
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
const lbMarkets = normalizeLeaderboard("forecastex", lbRows);
display(marketLeaderboard({
  hashPrefix: "fxlb",
  venues: [{spec: LB_VENUES.forecastex, rows: lbMarkets}],
  onMarketSelect: attachMarketInspector({source: "forecastex-markets", rows: lbMarkets})
}));
```
