---
title: Crypto.com/Nadex
---

<div class="page-hero" data-accent="nadex">
  <div class="page-eyebrow">Crypto.com · Nadex</div>
  <h1>Crypto.com/Nadex</h1>
  <p class="page-lead">Crypto.com's Nadex exchange trades event binaries whose only public record is the exchange's daily bulletin. No single game dominates it: the multi-leg <strong>COMBOS</strong> parlay line is the largest product here, and it is what the busiest days are mostly made of.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
import {ESTABLISHED_VOLUME_EVENTS, positionedVolumeEvents, volumeEventMarks} from "./components/volume-events.js";
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
      fill: "var(--accent-nadex)", fillOpacity: 0.85,
      tip: true,
      title: d => `${fmtDate(d.date)}\n${fmtCount(d.contracts_total||0)}`
    }),
    ...volumeEventMarks(Plot, volumeEvents),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Event binary contracts only, read out of Nadex's own daily bulletins. Nadex redenominated twice — contracts were $100 through May 12, 2025, $10 through Aug 4, 2025 and $1 since — so a contract count is not comparable across those dates. Data starts Dec 23, 2024, the first bulletin carrying event-contract rows.</p>

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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./nadex-products">Products</a> for category mix, <a href="./nadex-parlays">Parlays</a> for adoption and volume, <a href="./nadex-parlay-outcomes">Parlay outcomes</a> for the P&amp;L, and <a href="./nadex-economics">Economics</a> for fees.</div>
