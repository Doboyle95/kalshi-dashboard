---
title: Briefing
---

<div class="page-hero briefing-hero">
  <div class="page-eyebrow">Industry briefing</div>
  <h1>US prediction markets, at a glance</h1>
  <p class="page-lead">Current scale, recent reported volume, product mix, fees, and the best outcome evidence the public data supports. Kalshi has the deepest tape; every coverage-limited number says so directly.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, VENUE_ORDER, buildPlatformSeries, buildVenueScoreboard, recentCalendarDates, valueLookup} from "./components/venue-data.js";
import {renderDateBrush} from "./components/date-brush.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kalshi = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const prophetxDaily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const cmeDaily = await DataAttachment("data/cme_daily_distributed.csv").csv({typed: true});
const takerSideVolume = await DataAttachment("data/taker_notional_daily.csv").csv({typed: true});
const takerPnl = await DataAttachment("data/taker_pnl_daily.csv").csv({typed: true});
const parlayPnl = await DataAttachment("data/parlay_pnl_unified_daily.csv").csv({typed: true});

const kCat = await DataAttachment("data/category_daily.csv").csv({typed: true});
const kParlay = await DataAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const dkexCat = await DataAttachment("data/dkex_categories_daily.csv").csv({typed: true});
const fxCat = await DataAttachment("data/forecastex_categories_daily.csv").csv({typed: true});
const nadexCat = await DataAttachment("data/nadex_categories_daily.csv").csv({typed: true});
const pmCat = await DataAttachment("data/polymarket_categories_daily.csv").csv({typed: true});
const pxCat = await DataAttachment("data/prophetx_categories_daily.csv").csv({typed: true});
const rotheraCat = await DataAttachment("data/rothera_categories_daily.csv").csv({typed: true});
const underdogCat = await DataAttachment("data/underdog_categories_daily.csv").csv({typed: true});
```

```js
const fmtCount = value => {
  const n = +value || 0;
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  return sign + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : Math.round(a).toLocaleString());
};
const fmtUSD = value => `${value < 0 ? "−" : ""}$${fmtCount(Math.abs(value ?? 0))}`;
const fmtPct = value => value == null ? "—" : `${value >= 0 ? "+" : ""}${(100 * value).toFixed(1)}%`;
const fmtShare = value => value == null ? "—" : `${(100 * value).toFixed(1)}%`;
const fmtDay = value => value?.toLocaleDateString("en-US", {month: "short", day: "numeric", timeZone: "UTC"}) ?? "—";
const fmtDayLong = value => value?.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric", timeZone: "UTC"}) ?? "—";
const isProvParlay = row => row.is_provisional === true || String(row.is_provisional).toLowerCase() === "true";
```

```js
const platformRows = buildPlatformSeries({kalshi, competitor, prophetx: prophetxDaily, cme: cmeDaily});
const scoreboard = buildVenueScoreboard(platformRows);
const nonSparseScoreboard = scoreboard.filter(row => !row.sparse);
const commonThrough = nonSparseScoreboard.length ? new Date(d3.min(nonSparseScoreboard, row => +row.latest)) : null;
const commonStart = commonThrough ? d3.utcDay.offset(commonThrough, -6) : null;
const aligned7 = platformRows.filter(row => !row.partial && !row.sparse && row.date >= commonStart && row.date <= commonThrough);
const alignedByVenue = d3.rollup(aligned7, rows => d3.sum(rows, row => row.contracts), row => row.venue);
const alignedTotal = d3.sum(alignedByVenue.values());
const alignedKalshi = alignedByVenue.get("Kalshi") ?? 0;
const largestCompetitor = [...alignedByVenue.entries()].filter(([venue]) => venue !== "Kalshi").sort((a, b) => b[1] - a[1])[0];
const fastestGrowth = scoreboard.filter(row => row.change != null && row.recentDays >= 14).sort((a, b) => b.change - a.change)[0];
```

<h2 class="briefing-scale-title">Volume across exchanges</h2>

<p class="section-intro">Reported daily contracts across every venue with a usable series. Linear preserves the real scale gap; log makes smaller venues readable.</p>

<div class="control-strip briefing-scale-controls">

```js
const scaleType = view(Inputs.radio(["Linear", "Log"], {label: "Scale", value: "Linear"}));
```

</div>

```js
// Keep the brush's miniature history chart on the complete available series.
// Quick ranges below change the selection, not the brush's domain, so a user can
// drag directly from a 30-day view back into older data.
const scaleRows = platformRows.filter(row => !row.sparse && row.contracts > 0);
const scaleLatest = d3.max(scaleRows, row => row.date);
const scaleStart = d3.utcDay.offset(scaleLatest, -364);
const scaleVenues = VENUE_ORDER.filter(venue => scaleRows.some(row => row.venue === venue));
const scaleDateSel = Mutable([scaleStart, scaleLatest]);
const setScaleDate = range => { scaleDateSel.value = range; };
```

```js
const [scaleBrushFrom, scaleBrushTo] = scaleDateSel;
const scaleRowsBrushed = scaleRows.filter(row => row.date >= scaleBrushFrom && row.date <= scaleBrushTo);
```

<div class="plot-shell briefing-lead-chart">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 360,
  marginLeft: 72,
  x: {type: "utc", label: null},
  y: {type: scaleType === "Log" ? "log" : "linear", label: "Daily reported volume (contracts)", grid: true, tickFormat: fmtCount},
  color: {legend: true, domain: scaleVenues, range: scaleVenues.map(venue => VENUE_COLORS[venue])},
  marks: [
    Plot.lineY(scaleRowsBrushed.filter(row => !row.partial), {x: "date", y: "contracts", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
    Plot.dot(scaleRowsBrushed.filter(row => row.partial), {x: "date", y: "contracts", fill: "venue", r: 4, symbol: "diamond"}),
    Plot.ruleX(scaleRowsBrushed, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(scaleRowsBrushed, Plot.pointerX({x: "date", y: "contracts", title: row => `${fmtDayLong(row.date)}\n${row.venue}: ${Math.round(row.contracts).toLocaleString()} contracts${row.partial ? "\nPartial day" : ""}`})),
    ...(scaleType === "Linear" ? [Plot.ruleY([0])] : [])
  ]
})
```

</div>

```js
display(renderDateBrush({
  data: scaleRows,
  dateAccessor: row => row.date,
  valueAccessor: row => row.contracts,
  initialRange: [scaleStart, scaleLatest],
  quickRanges: [
    {label: "30d", days: 30, title: "Last 30 days"},
    {label: "90d", days: 90, title: "Last 90 days"},
    {label: "365d", days: 365, title: "Last 365 days"},
    {label: "All", days: Infinity, title: "All available history"}
  ],
  onSelect: setScaleDate,
  color: "#00C2A8",
  width
}));
```

<div class="briefing-kicker">Aligned through ${fmtDay(commonThrough)} · seven calendar days · reported contracts</div>

<div class="kpi-grid briefing-kpis">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Reported industry volume</div>
    <div class="kpi-value" title="${Math.round(alignedTotal).toLocaleString()} contracts">${fmtCount(alignedTotal)}</div>
    <div class="kpi-meta">aligned 7-day window</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Kalshi share</div>
    <div class="kpi-value">${fmtShare(alignedTotal ? alignedKalshi / alignedTotal : null)}</div>
    <div class="kpi-meta">of aligned reported volume</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Largest competitor</div>
    <div class="kpi-value">${largestCompetitor?.[0] ?? "—"}</div>
    <div class="kpi-meta">${fmtCount(largestCompetitor?.[1] ?? 0)} contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Fastest recent growth</div>
    <div class="kpi-value">${fastestGrowth?.venue ?? "—"}</div>
    <div class="kpi-meta">${fmtPct(fastestGrowth?.change)} vs prior reported 30 days</div>
  </div>
</div>

## Economics and outcomes pulse

<p class="section-intro">The important numbers should not require a venue-page expedition. Coverage badges are part of the measurement: a Kalshi-only result is useful evidence, not an industry total.</p>

```js
const feeRows = platformRows.filter(row => row.revenue != null && !row.partial);
const latestFeeByVenue = Array.from(d3.group(feeRows, row => row.venue), ([venue, rows]) => ({
  venue,
  ...rows.slice().sort((a, b) => a.date - b.date).at(-1)
}));
const latestFeeTotal = d3.sum(latestFeeByVenue, row => row.revenue);
const feeByDate = Array.from(d3.rollup(feeRows, rows => ({
  date: rows[0].date,
  value: d3.sum(rows, row => row.revenue),
  venues: new Set(rows.map(row => row.venue)).size
}), row => +row.date), ([, value]) => value).sort((a, b) => a.date - b.date);

const takerSideVolumeSorted = takerSideVolume.slice().sort((a, b) => a.date - b.date);
const latestTakerSideVolume = takerSideVolumeSorted.at(-1);
const matureTakerPnl = takerPnl.filter(row => row.pct_settled == null || row.pct_settled >= 40).sort((a, b) => a.date - b.date);
const takerPnl30 = matureTakerPnl.slice(-30);
const takerPnl30Value = d3.sum(takerPnl30, row => row.pnl_net || 0);
const matureParlayPnl = parlayPnl.filter(row => !isProvParlay(row)).sort((a, b) => a.date - b.date);
const parlayPnl30 = matureParlayPnl.slice(-30);
const parlayPnl30Value = d3.sum(parlayPnl30, row => row.realized_net || 0);

function sparkline(rows, value, color) {
  const clean = rows.filter(row => value(row) != null && Number.isFinite(+value(row)));
  return Plot.plot({
    width: 190,
    height: 46,
    margin: 2,
    x: {axis: null},
    y: {axis: null},
    marks: [
      Plot.ruleY([0], {stroke: "currentColor", strokeOpacity: 0.12}),
      Plot.lineY(clean, {x: "date", y: value, stroke: color, strokeWidth: 2, curve: "monotone-x"})
    ]
  });
}
```

<div class="pulse-grid">
  <a class="pulse-card" href="./compare-fees#realized-fee-per-contract">
    <div class="pulse-topline"><span>Latest reported fee revenue</span><span class="coverage-badge">${latestFeeByVenue.length} venues</span></div>
    <strong>${fmtUSD(latestFeeTotal)}</strong>
    <small>sum of each measured venue's latest available report</small>
    ${sparkline(feeByDate.slice(-45), row => row.value, "#9A6D1F")}
  </a>
  <a class="pulse-card" href="./taker#daily-taker-side-volume">
    <div class="pulse-topline"><span>Taker-side volume</span><span class="coverage-badge is-limited">Kalshi only</span></div>
    <strong>${fmtUSD(latestTakerSideVolume?.notional_total ?? 0)}</strong>
    <small>${fmtDay(latestTakerSideVolume?.date)} · aggressor dollars</small>
    ${sparkline(takerSideVolumeSorted.slice(-45), row => row.notional_total, "#00C2A8")}
  </a>
  <a class="pulse-card" href="./taker-pnl#cumulative-taker-p-and-l">
    <div class="pulse-topline"><span>Taker P&amp;L</span><span class="coverage-badge is-limited">Kalshi only</span></div>
    <strong class="${takerPnl30Value < 0 ? "is-negative" : "is-positive"}">${fmtUSD(takerPnl30Value)}</strong>
    <small>last ${takerPnl30.length} sufficiently settled report days</small>
    ${sparkline(takerPnl30, row => row.pnl_net, "#d7191c")}
  </a>
  <a class="pulse-card" href="./parlay#what-parlay-bettors-actually-lost-after-cash-outs">
    <div class="pulse-topline"><span>Realized parlay P&amp;L</span><span class="coverage-badge is-limited">Kalshi only</span></div>
    <strong class="${parlayPnl30Value < 0 ? "is-negative" : "is-positive"}">${fmtUSD(parlayPnl30Value)}</strong>
    <small>last ${parlayPnl30.length} non-provisional report days</small>
    ${sparkline(parlayPnl30, row => row.realized_net, "#9B59B6")}
  </a>
</div>

## Venue scoreboard

<p class="section-intro">A comparable recent view of scale and momentum. Each venue's latest reported day is stated; short histories are not padded into a 30-day claim.</p>

<div class="surface-card table-scroll">

```js
display(html`<table class="briefing-table scoreboard-table">
  <thead><tr>
    <th>Venue</th>
    <th>Reporting through</th>
    <th>Latest day</th>
    <th>7-day average</th>
    <th>Last 30 reported days</th>
    <th>vs prior 30</th>
    <th>Coverage</th>
  </tr></thead>
  <tbody>${scoreboard.map(row => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[row.venue]}"></span><strong>${row.venue}</strong></td>
    <td>${fmtDay(row.latest)}</td>
    <td title="${Math.round(row.latestVolume).toLocaleString()} contracts">${fmtCount(row.latestVolume)}</td>
    <td title="${Math.round(row.average7 ?? 0).toLocaleString()} contracts">${fmtCount(row.average7)}</td>
    <td title="${Math.round(row.recentTotal).toLocaleString()} contracts">${fmtCount(row.recentTotal)} <span class="cell-note">${row.recentDays}d</span></td>
    <td class="${row.change == null ? "" : row.change >= 0 ? "is-positive" : "is-negative"}">${fmtPct(row.change)}</td>
    <td>${row.sparse ? html`<span class="coverage-badge is-limited">sparse bulletin</span>` : row.coverage}</td>
  </tr>`)}</tbody>
</table>`);
```

</div>

## Recent daily volume tape

<p class="section-intro">Exact numbers for the most recent ten calendar dates. A tilde marks a still-filling report; an em dash means no figure was published for that venue and date, not zero trading.</p>

```js
const tapeDates = recentCalendarDates(platformRows, 10);
const tapeLookup = valueLookup(platformRows);
const rowLookup = new Map(platformRows.map(row => [`${row.venue}|${+row.date}`, row]));
const tapeVenues = VENUE_ORDER.filter(venue => scoreboard.some(row => row.venue === venue));
```

<div class="surface-card table-scroll daily-tape">

```js
display(html`<table class="briefing-table">
  <thead><tr>
    <th>Venue</th>
    ${tapeDates.map(date => html`<th>${fmtDayLong(date)}</th>`)}
  </tr></thead>
  <tbody>${tapeVenues.map(venue => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[venue]}"></span><strong>${venue}</strong></td>
    ${tapeDates.map(date => {
      const value = tapeLookup.get(venue)?.get(+date);
      const row = rowLookup.get(`${venue}|${+date}`);
      return html`<td class="${value == null ? "is-missing" : row?.partial ? "is-partial" : ""}" title="${value == null ? "No published figure" : Math.round(value).toLocaleString() + " contracts" + (row?.partial ? " · partial" : "")}">${value == null ? "—" : `${row?.partial ? "~" : ""}${fmtCount(value)}`}</td>`;
    })}
  </tr>`)}</tbody>
</table>`);
```

</div>

## What the industry trades

<p class="section-intro">The current mix and how the sports share has moved. Categories are harmonized only to the broadest level every selected venue can support.</p>

```js
const SPORT = new Set(["Baseball", "Soccer", "Tennis", "Golf", "Basketball", "Basketball (pro)", "Basketball (college)", "Football", "Combat sports", "MMA", "Boxing", "Motorsport", "Hockey", "Cricket", "Rugby", "Table tennis", "Esports", "Aussie Rules", "Sports"]);
const ECON = new Set(["Economics", "Financials", "Commodities", "Companies"]);
const POLITICS = new Set(["Politics", "Elections"]);
const WEATHER = new Set(["Weather", "Climate and Weather"]);
const PARLAY_VALUE = {"Crypto.com/Nadex": new Set(["Parlays"]), ProphetX: new Set(["Parlay (multi-event)"]), "Underdog Exchange": new Set(["Other"])};
const PRODUCT_BUCKETS = ["Sports", "Sports · parlays", "Crypto", "Politics & elections", "Economics & financials", "Weather & climate", "Other"];
const PRODUCT_COLORS = {Sports: "#0E7C6B", "Sports · parlays": "#7FD4C6", Crypto: "#F97316", "Politics & elections": "#3B7DD8", "Economics & financials": "#9A6D1F", "Weather & climate": "#6366F1", Other: "#9AA3AE"};

function productBucket(venue, raw) {
  if ((PARLAY_VALUE[venue] ?? new Set()).has(raw)) return "Sports · parlays";
  if (SPORT.has(raw)) return "Sports";
  if (raw === "Crypto") return "Crypto";
  if (POLITICS.has(raw)) return "Politics & elections";
  if (ECON.has(raw)) return "Economics & financials";
  if (WEATHER.has(raw)) return "Weather & climate";
  return "Other";
}

function normalizeProduct(venue, rows, categoryColumn, valueColumn = "contracts") {
  return rows.flatMap(row => {
    const value = +row[valueColumn] || 0;
    if (!(value > 0) || !row.date) return [];
    const raw = String(row[categoryColumn] ?? "").trim();
    return [{date: row.date, venue, bucket: productBucket(venue, raw), contracts: value}];
  });
}

const productRowsBase = [
  ...normalizeProduct("Kalshi", kCat, "kalshi_category"),
  ...normalizeProduct("Polymarket US", pmCat, "category"),
  ...normalizeProduct("Crypto.com/Nadex", nadexCat, "category"),
  ...normalizeProduct("Rothera", rotheraCat, "category"),
  ...normalizeProduct("DKeX", dkexCat, "category"),
  ...normalizeProduct("ProphetX", pxCat, "category"),
  ...normalizeProduct("Underdog Exchange", underdogCat, "category"),
  ...normalizeProduct("ForecastEx", fxCat, "category")
];
const kalshiParlayByDate = new Map(Array.from(d3.rollup(kParlay, rows => d3.sum(rows, row => +row.contracts || 0), row => +row.date)));
const productRows = productRowsBase.flatMap(row => {
  if (row.venue !== "Kalshi" || row.bucket !== "Sports") return [row];
  const parlay = Math.min(row.contracts, kalshiParlayByDate.get(+row.date) ?? 0);
  return [
    {...row, contracts: row.contracts - parlay},
    {...row, bucket: "Sports · parlays", contracts: parlay}
  ].filter(value => value.contracts > 0);
});
const latestProductDate = d3.max(productRows, row => row.date);
const productStart = d3.utcDay.offset(latestProductDate, -29);
const productRecent = productRows.filter(row => row.date >= productStart && row.date <= latestProductDate);
const productByVenue = Array.from(d3.rollup(productRecent, rows => d3.sum(rows, row => row.contracts), row => row.venue, row => row.bucket), ([venue, buckets]) => {
  const total = d3.sum(buckets.values());
  return PRODUCT_BUCKETS.map(bucket => ({venue, bucket, contracts: buckets.get(bucket) ?? 0, share: total ? (buckets.get(bucket) ?? 0) / total : 0}));
}).flat();
const productVenueOrder = VENUE_ORDER.filter(venue => productByVenue.some(row => row.venue === venue));

const monthlySports = Array.from(d3.rollup(productRows, rows => {
  const total = d3.sum(rows, row => row.contracts);
  const sports = d3.sum(rows.filter(row => row.bucket.startsWith("Sports")), row => row.contracts);
  return {date: d3.utcMonth.floor(rows[0].date), share: total ? sports / total : null, contracts: total};
}, row => row.venue, row => +d3.utcMonth.floor(row.date)), ([venue, months]) => Array.from(months, ([, value]) => ({venue, ...value}))).flat().filter(row => row.share != null).sort((a, b) => a.date - b.date);
```

<div class="control-strip">

```js
const productView = view(Inputs.radio(["Current mix", "Sports share trend"], {label: "View", value: "Current mix"}));
```

</div>

<div class="plot-shell">

```js
if (productView === "Current mix") {
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 65 + productVenueOrder.length * 38,
    marginLeft: 155,
    x: {label: "Share of reported contracts", percent: true, domain: [0, 100], grid: true},
    y: {label: null, domain: productVenueOrder},
    color: {legend: true, domain: PRODUCT_BUCKETS, range: PRODUCT_BUCKETS.map(bucket => PRODUCT_COLORS[bucket])},
    marks: [
      Plot.barX(productByVenue, {x: "share", y: "venue", fill: "bucket", order: PRODUCT_BUCKETS, tip: true, title: row => `${row.venue}\n${row.bucket}: ${(100 * row.share).toFixed(1)}%\n${Math.round(row.contracts).toLocaleString()} contracts`}),
      Plot.ruleX([0, 1])
    ]
  }));
} else {
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 380,
    marginLeft: 62,
    x: {type: "utc", label: null},
    y: {label: "Sports share of reported contracts", percent: true, domain: [0, 100], grid: true},
    color: {legend: true, domain: productVenueOrder, range: productVenueOrder.map(venue => VENUE_COLORS[venue])},
    marks: [
      Plot.lineY(monthlySports.filter(row => row.date >= scaleBrushFrom && row.date <= scaleBrushTo), {x: "date", y: "share", stroke: "venue", strokeWidth: 2, curve: "monotone-x"}),
      Plot.dot(monthlySports.filter(row => row.date >= scaleBrushFrom && row.date <= scaleBrushTo), {x: "date", y: "share", fill: "venue", r: 2.5, tip: true, title: row => `${row.venue} · ${row.date.toLocaleDateString("en-US", {month: "short", year: "numeric", timeZone: "UTC"})}\nSports share: ${(100 * row.share).toFixed(1)}%\n${Math.round(row.contracts).toLocaleString()} contracts`}),
      Plot.ruleY([0, 1])
    ]
  }));
}
```

</div>

<div class="module-links">
  <a href="./categories-venues">Compare product mix in detail →</a>
  <a href="./bet-types">Compare sports contract types →</a>
  <a href="./parlay-venues">Compare parlay adoption →</a>
</div>

## Go deeper

<div class="destination-grid">
  <a class="destination-card" href="./compare-scale"><strong>Compare venues</strong><span>Scale, liquidity, fees, products, trading behavior, and accuracy.</span></a>
  <a class="destination-card" href="./volume"><strong>Kalshi deep dive</strong><span>Activity, products, economics, outcomes, and parlays from the richest tape.</span></a>
  <a class="destination-card" href="./market-explorer"><strong>Explore markets</strong><span>Venue leaders, top markets, and one searchable finder.</span></a>
  <a class="destination-card" href="./methodology"><strong>Data &amp; methodology</strong><span>Coverage, definitions, mappings, and the limits of every comparison.</span></a>
</div>
