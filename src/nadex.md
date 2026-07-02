---
title: Crypto.com/Nadex
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com · Nadex</div>
  <h1>Crypto.com/Nadex</h1>
  <p class="page-lead">Crypto.com's Nadex exchange is small — $1 event binaries that show up in CFTC daily bulletins. One event towers over the whole page: Super Bowl LX.</p>
</div>

```js
const catDaily  = await FileAttachment("data/nadex_categories_daily.csv").csv({typed: true});
const split     = await FileAttachment("data/nadex_sports_split_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
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
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(split, d => d.contracts_total);
const peakDay = split.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, split[0]);
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
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Crypto.com/Nadex views use daily event/category exports rather than trade-level prints. Volume is normalized contract count by day; sports and category splits come from local classification of event names and categories in the Nadex export.</p>
  <p>Built from daily bulletin totals, not trade-level prints, so this is a read on scale and category mix rather than microstructure.</p>
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

<p class="section-intro">Daily event-contract volume since Nadex started appearing in CFTC bulletins.</p>

```js
const brushVolume = view(makeBrush(split, "#9c27b0"));
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
      fill: "#9c27b0", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Event binary contracts only (from CFTC daily bulletins). $1 per contract denomination. Data starts Dec 23, 2024 when CFTC bulletins began including Nadex event contract volumes.</p>

## Sports vs. non-sports

<p class="section-intro">Sports against everything else — and sports usually carries the day here too.</p>

```js
const brushSports = view(makeBrush(split, "#9c27b0"));
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
  color: {legend: true, domain: ["Sports", "Non-sports"], range: ["#1a9641", "#00C2A8"]},
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

<p class="section-intro">Where the action concentrates, category by category, over time.</p>

```js
const brushCats = view(makeBrush(split, "#9c27b0"));
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
      fill: "#9c27b0", fillOpacity: 0.7,
      tip: true,
      title: d => `${d.category}: ${fmtCount(d.contracts)}`
    }),
    Plot.ruleX([0])
  ]
})
```

## Top sport events (all time)

_The biggest individual sports events on Nadex by contract volume. Pulled from the daily Nadex bulletin events feed — Super Bowl LX dominates, with championship NFL/CFB games and the Masters following. Non-sport entries like financial indices and combo contracts are excluded for clarity._

```js
const nadexEvents = await FileAttachment("data/nadex_events_daily.csv").csv({typed: true});
```

```js
const SPORT_PREFIX_LABELS = {
  NFL: "NFL", NBA: "NBA", NHL: "NHL", MLB: "MLB", WNBA: "WNBA",
  CFB: "College football", CBB: "College basketball", WBB: "Women's basketball",
  GOLF: "Golf", UFC: "UFC", PGA: "PGA", LPGA: "LPGA"
};
const SPORT_COLORS = {
  "NFL":"#A30000","NBA":"#1F4E96","NHL":"#3b6ea5","MLB":"#2E7D32","WNBA":"#42A5F5",
  "College football":"#FF7043","College basketball":"#42A5F5","Women's basketball":"#7CB342",
  "Golf":"#FFB300","UFC":"#9C27B0","PGA":"#FFB300","LPGA":"#FFB300"
};
const sportRe = /^(NFL|NBA|NHL|MLB|WNBA|CFB|CBB|WBB|GOLF|UFC|PGA|LPGA)-/;

const eventTotals = d3.rollup(
  nadexEvents.filter(d => sportRe.test(d.resource_description)),
  v => ({volume: d3.sum(v, x => +x.volume), days: v.length}),
  d => d.resource_description
);

const topEvents = [...eventTotals.entries()]
  .sort((a,b) => b[1].volume - a[1].volume)
  .slice(0, 20)
  .map(([event, agg]) => {
    const m = event.match(/^([A-Z]+)-\d+-(\d{6})/);
    const sport = SPORT_PREFIX_LABELS[m?.[1]] || m?.[1] || "Other";
    let dateStr = "";
    if (m?.[2]) {
      const dt = m[2];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      dateStr = `${months[+dt.slice(2,4) - 1]} ${+dt.slice(4,6)}, '${dt.slice(0,2)}`;
    } else {
      // GOLF-NNNN-YYYY format (Masters, etc.)
      const m2 = event.match(/^([A-Z]+)-\d+-(\d{4})$/);
      if (m2?.[2]) dateStr = m2[2];
    }
    return {event, sport, label: `${sport} · ${dateStr || "season"}`, volume: agg.volume, days: agg.days};
  });
const sportDomain = [...new Set(topEvents.map(d => d.sport))];
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: topEvents.length * 26 + 60,
  marginLeft: 170,
  x: {label: "Contracts (all time)", grid: true, tickFormat: d => d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k"},
  y: {label: null, domain: topEvents.map(d => d.label)},
  color: {legend: true, domain: sportDomain, range: sportDomain.map(s => SPORT_COLORS[s] || "#9c27b0")},
  marks: [
    Plot.barX(topEvents, {
      x: "volume", y: "label", fill: "sport", fillOpacity: 0.85,
      tip: true,
      title: d => `${d.label}\n${d.event}\nVolume: ${fmtCount(d.volume)}\nTrading days: ${d.days}`
    }),
    Plot.ruleX([0])
  ]
})
```
