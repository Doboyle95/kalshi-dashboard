---
title: Briefing
---

```js
import {safeMarkdown} from "./components/safe-markdown.js";
const {marked: dailyMarked} = await import("npm:marked");
dailyMarked.setOptions({mangle: false, headerIds: false});
const dailyBriefing = await FileAttachment("daily-briefing.json").json();
const dailyBriefingReady = dailyBriefing?.status === "ready";
const dailyBriefingBody = html`<div class="daily-intel-body"></div>`;
dailyBriefingBody.innerHTML = safeMarkdown(dailyMarked, dailyBriefing?.insights || "The daily briefing is not available yet.");
const fmtBriefingStamp = value => value
  ? new Date(value).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"})
  : "pending";
```

<div class="page-hero briefing-hero">
  <div class="briefing-hero-copy">
    <div class="page-eyebrow">Industry briefing</div>
    <h1>US prediction markets, at a glance</h1>
    <p class="page-lead">Current scale, recent reported volume, product mix, fees, and the best outcome evidence the public data supports.</p>
  </div>
  <aside class="daily-intel">
    <div class="daily-intel-topline"><span>Daily intelligence</span><span>${dailyBriefingReady ? `Data through ${fmtBriefingStamp(dailyBriefing.data_through)}` : "First run pending"}</span></div>
    <h2>${dailyBriefing?.title || "What changed in prediction markets"}</h2>
    ${dailyBriefingBody}
    <div class="daily-intel-actions">
      <a href="./chat" data-ask-prefill data-question="Go deeper on today's prediction-market briefing. Verify the most interesting claims, add relevant context, and tell me what else changed." data-context="Daily Predict Charts briefing on the homepage.">Ask a follow-up</a>
      <span>${dailyBriefingReady ? `Generated ${fmtBriefingStamp(dailyBriefing.generated_at)}` : "Generated once daily after source files settle"}</span>
    </div>
  </aside>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, VENUE_ORDER, buildPlatformSeries, buildVenueScoreboard, recentCalendarDates, valueLookup} from "./components/venue-data.js";
import {renderDateBrush} from "./components/date-brush.js";
import {TAKER_GENERAL_MAP, buildReportTickerToCat} from "./components/taker-categories.js";
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
// Kalshi publishes one undivided "Sports" in category_daily, so the sport-level
// split comes from the same per-report_ticker join the categories/volume pages use.
const kTickerDaily = await DataAttachment("data/daily_top_categories.csv").csv({typed: true});
const kCatLeaderboard = await DataAttachment("data/category_leaderboard.csv").csv({typed: true});
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
// Week over week, on its own scoreboard: the `scoreboard` const above stays on the
// 30-day window because the Venue scoreboard table below is labelled "Last 30 reported
// days" / "vs prior 30". Changing the shared one would silently move that table too.
// This also puts the KPI on the same basis as the three cards beside it, which are all
// 7-day. Both sides of the comparison must be full weeks -- keeping the old
// `recentDays >= 14` guard against a 7-day window disqualifies EVERY venue and renders
// the card as "—", since recentDays now tops out at 7.
// Sparse venues are excluded the same way the aligned cards above exclude them: CME
// reports by hand-collected bulletin, so its seven most recent REPORTED days currently
// span twelve calendar days against a prior window of eight. That is not a week over a
// week, and the row-based slice cannot make it one.
const growthBoard = buildVenueScoreboard(platformRows.filter(row => !row.sparse), {windowDays: 7});
const fastestGrowth = growthBoard
  .filter(row => row.change != null && row.recentDays >= 7 && row.previousDays >= 7)
  .sort((a, b) => b.change - a.change)[0];
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
const scalePlot = Plot.plot({
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
});
display(scalePlot);
```

</div>

<div class="chart-inspect-hint">Click a date in the chart to open its industry snapshot. Exact recent dates are also available in the tape below.</div>

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
  color: "var(--accent-kalshi)",
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
    <div class="kpi-meta">${fmtPct(fastestGrowth?.change)} vs prior reported 7 days</div>
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
    ${sparkline(feeByDate.slice(-45), row => row.value, "var(--accent-cme)")}
  </a>
  <a class="pulse-card" href="./taker#daily-taker-side-volume">
    <div class="pulse-topline"><span>Taker-side volume</span><span class="coverage-badge is-limited">Kalshi only</span></div>
    <strong>${fmtUSD(latestTakerSideVolume?.notional_total ?? 0)}</strong>
    <small>${fmtDay(latestTakerSideVolume?.date)} · aggressor dollars</small>
    ${sparkline(takerSideVolumeSorted.slice(-45), row => row.notional_total, "var(--accent-kalshi)")}
  </a>
  <a class="pulse-card" href="./taker-pnl#cumulative-taker-p-and-l">
    <div class="pulse-topline"><span>Taker P&amp;L</span><span class="coverage-badge is-limited">Kalshi only</span></div>
    <strong class="${takerPnl30Value < 0 ? "is-negative" : "is-positive"}">${fmtUSD(takerPnl30Value)}</strong>
    <small>last ${takerPnl30.length} sufficiently settled report days</small>
    ${sparkline(takerPnl30, row => row.pnl_net, "var(--accent-negative)")}
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
    ${tapeDates.map(date => html`<th><button type="button" class="inspector-inline-button" onclick=${event => openIndustryDay(date, event.currentTarget)} aria-label=${`Inspect all venues on ${fmtDayLong(date)}`}>${fmtDayLong(date)}</button></th>`)}
  </tr></thead>
  <tbody>${tapeVenues.map(venue => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[venue]}"></span><strong>${venue}</strong></td>
    ${tapeDates.map(date => {
      const value = tapeLookup.get(venue)?.get(+date);
      const row = rowLookup.get(`${venue}|${+date}`);
      return html`<td class="${value == null ? "is-missing" : row?.partial ? "is-partial" : ""}" title="${value == null ? "No published figure" : Math.round(value).toLocaleString() + " contracts" + (row?.partial ? " · partial" : "")}">${value == null ? "—" : html`<button type="button" class="inspector-data-cell" onclick=${event => openVenueDay(date, venue, event.currentTarget)} aria-label=${`Inspect ${venue} on ${fmtDayLong(date)}`}>${row?.partial ? "~" : ""}${fmtCount(value)}</button>`}</td>`;
    })}
  </tr>`)}</tbody>
</table>`);
```

</div>

## What the industry trades

<p class="section-intro">The current mix, and how the sports share has moved.</p>

```js
// Same broad buckets the Kalshi category charts use (components/taker-categories.js),
// extended to the competitor feeds. Sport buckets + Parlay share one cool colour
// family; Non-sports is the single warm one.
const PRODUCT_BUCKETS = ["Non-sports", "Other sports", "Baseball", "Soccer", "Basketball", "Football", "Parlay", "Unclassified"];
const SPORTS_BUCKETS = new Set(["Other sports", "Baseball", "Soccer", "Basketball", "Football", "Parlay"]);
const PRODUCT_COLORS = {
  "Non-sports": "var(--pc-nonsports)",
  "Other sports": "var(--pc-othersport)",
  Baseball: "var(--pc-baseball)",
  Soccer: "var(--pc-soccer)",
  Basketball: "var(--pc-basketball)",
  Football: "var(--pc-football)",
  Parlay: "var(--pc-parlay)",
  Unclassified: "var(--pc-unclassified)"
};

// Competitor feeds name the sport; Kalshi does not (handled separately below).
const VENUE_BUCKET = {
  Baseball: "Baseball", Soccer: "Soccer", Football: "Football",
  Basketball: "Basketball", "Basketball (pro)": "Basketball", "Basketball (college)": "Basketball",
  Tennis: "Other sports", Golf: "Other sports", Hockey: "Other sports", Motorsport: "Other sports",
  "Combat sports": "Other sports", MMA: "Other sports", Boxing: "Other sports", Cricket: "Other sports",
  Rugby: "Other sports", "Table tennis": "Other sports", Esports: "Other sports",
  "Aussie Rules": "Other sports", Sports: "Other sports",
  Politics: "Non-sports", Elections: "Non-sports", Economics: "Non-sports", Financials: "Non-sports",
  Commodities: "Non-sports", Companies: "Non-sports", Crypto: "Non-sports", Weather: "Non-sports",
  "Climate and Weather": "Non-sports", "Science and Technology": "Non-sports",
  Entertainment: "Non-sports", Mentions: "Non-sports", Mention: "Non-sports", Social: "Non-sports",
  Health: "Non-sports", World: "Non-sports", Transportation: "Non-sports"
};
// "Other" means a different thing at each venue, so it is never mapped globally:
// Underdog's "Other" is its combo/parlay bucket (verified against
// underdog_daily.contracts_parlay), while at Nadex and DKeX it is a real residual.
const VENUE_OVERRIDE = {
  "Crypto.com/Nadex": {Parlays: "Parlay"},
  ProphetX: {"Parlay (multi-event)": "Parlay"},
  "Underdog Exchange": {Other: "Parlay"}
};

function productBucket(venue, raw) {
  return (VENUE_OVERRIDE[venue] ?? {})[raw] ?? VENUE_BUCKET[raw] ?? "Unclassified";
}

function normalizeProduct(venue, rows, categoryColumn, valueColumn = "contracts") {
  return rows.flatMap(row => {
    const value = +row[valueColumn] || 0;
    if (!(value > 0) || !row.date) return [];
    const raw = String(row[categoryColumn] ?? "").trim();
    return [{date: row.date, venue, bucket: productBucket(venue, raw), contracts: value}];
  });
}

const competitorProductRows = [
  ...normalizeProduct("Polymarket US", pmCat, "category"),
  ...normalizeProduct("Crypto.com/Nadex", nadexCat, "category"),
  ...normalizeProduct("Rothera", rotheraCat, "category"),
  ...normalizeProduct("DKeX", dkexCat, "category"),
  ...normalizeProduct("ProphetX", pxCat, "category"),
  ...normalizeProduct("Underdog Exchange", underdogCat, "category"),
  ...normalizeProduct("ForecastEx", fxCat, "category")
];

// Kalshi sport split: daily per-report_ticker volume joined to the ticker->category
// map, then collapsed with the same TAKER_GENERAL_MAP the category pages use.
// Reproduces the authoritative totals closely on recent dates (parlay volume to
// 100.3% of parlay_volume_by_type_daily, sports/non-sports split to 0.03pp), but
// the frozen ticker header diverges before ~2025, so it is used only for the
// trailing-30-day mix. The multi-year trend below stays on category_daily.
const kalshiTickerToCat = buildReportTickerToCat(kCatLeaderboard);
const kalshiColumns = Object.keys(kTickerDaily[0] ?? {}).filter(key => key !== "date");
const kalshiColumnBucket = new Map(kalshiColumns.map(column => {
  // TAKER_GENERAL_MAP has its own "Uncategorized" catch-all, and a report_ticker
  // newer than the leaderboard maps to nothing at all; both land in Unclassified
  // so every bucket here is one the stack and legend actually carry.
  const bucket = TAKER_GENERAL_MAP[kalshiTickerToCat.get(column)];
  return [column, PRODUCT_BUCKETS.includes(bucket) ? bucket : "Unclassified"];
}));
const kalshiProductRows = kTickerDaily.flatMap(row => {
  if (!row.date) return [];
  const sums = new Map();
  for (const column of kalshiColumns) {
    const value = +row[column] || 0;
    if (!(value > 0)) continue;
    const bucket = kalshiColumnBucket.get(column);
    sums.set(bucket, (sums.get(bucket) ?? 0) + value);
  }
  return Array.from(sums, ([bucket, contracts]) => ({date: row.date, venue: "Kalshi", bucket, contracts}));
});

const productRows = [...kalshiProductRows, ...competitorProductRows];
const latestProductDate = d3.max(productRows, row => row.date);
const productStart = d3.utcDay.offset(latestProductDate, -29);
const productRecent = productRows.filter(row => row.date >= productStart && row.date <= latestProductDate);
const productByVenue = Array.from(d3.rollup(productRecent, rows => d3.sum(rows, row => row.contracts), row => row.venue, row => row.bucket), ([venue, buckets]) => {
  const total = d3.sum(buckets.values());
  return PRODUCT_BUCKETS.map(bucket => ({venue, bucket, contracts: buckets.get(bucket) ?? 0, share: total ? (buckets.get(bucket) ?? 0) / total : 0}));
}).flat();
const productVenueOrder = VENUE_ORDER.filter(venue => productByVenue.some(row => row.venue === venue));
// Drop a bucket from the legend entirely when no venue reports it in the window.
const productBucketsShown = PRODUCT_BUCKETS.filter(bucket => productByVenue.some(row => row.bucket === bucket && row.contracts > 0));

// The trend needs years of history, so Kalshi comes from category_daily here —
// its undivided "Sports" is all the sports share needs, and it is authoritative.
const trendRows = [...normalizeProduct("Kalshi", kCat, "kalshi_category"), ...competitorProductRows];
const monthlySports = Array.from(d3.rollup(trendRows, rows => {
  const total = d3.sum(rows, row => row.contracts);
  const sports = d3.sum(rows.filter(row => SPORTS_BUCKETS.has(row.bucket)), row => row.contracts);
  return {date: d3.utcMonth.floor(rows[0].date), share: total ? sports / total : null, contracts: total};
}, row => row.venue, row => +d3.utcMonth.floor(row.date)), ([venue, months]) => Array.from(months, ([, value]) => ({venue, ...value}))).flat().filter(row => row.share != null).sort((a, b) => a.date - b.date);
```

```js
const INSPECTOR = window.PredictChartsInspector;
const VENUE_ROUTES = new Map([
  ["Kalshi", "./volume"], ["Polymarket US", "./polymarket"], ["ForecastEx", "./forecastex"],
  ["DKeX", "./dkex"], ["Underdog Exchange", "./underdog"], ["Crypto.com/Nadex", "./nadex"],
  ["ProphetX", "./prophetx"], ["Novig", "./novig"], ["Rothera", "./rothera"], ["CME", "./cme"]
]);
const isoDay = date => new Date(date).toISOString().slice(0, 10);
const stateDay = value => new Date(`${value}T00:00:00Z`);
const sameDay = (left, right) => +d3.utcDay.floor(left) === +d3.utcDay.floor(right);

function productMixFor(venue, selectedDate) {
  const available = productRows.filter(row => row.venue === venue && row.date <= selectedDate);
  const mixDate = d3.max(available, row => row.date);
  if (!mixDate || d3.utcDay.count(mixDate, selectedDate) > 14) return {date: null, rows: []};
  const rows = available.filter(row => sameDay(row.date, mixDate));
  return {date: mixDate, rows: Array.from(d3.rollup(rows, values => d3.sum(values, row => row.contracts), row => row.bucket), ([bucket, contracts]) => ({bucket, contracts})).sort((a, b) => b.contracts - a.contracts)};
}

function categoryDayDetail(selectedDate, venue, category) {
  const mix = productMixFor(venue, selectedDate);
  const selected = mix.rows.find(row => row.bucket === category);
  const mixTotal = d3.sum(mix.rows, row => row.contracts);
  const recentStart = d3.utcDay.offset(selectedDate, -29);
  const recent = productRows.filter(row => row.venue === venue && row.bucket === category && row.date >= recentStart && row.date <= selectedDate);
  const previousStart = d3.utcDay.offset(recentStart, -30);
  const previous = productRows.filter(row => row.venue === venue && row.bucket === category && row.date >= previousStart && row.date < recentStart);
  const recentTotal = d3.sum(recent, row => row.contracts);
  const previousTotal = d3.sum(previous, row => row.contracts);
  const change = previousTotal ? recentTotal / previousTotal - 1 : null;
  return {
    crumb: category,
    eyebrow: `${venue} · ${fmtDayLong(selectedDate)}`,
    title: category,
    subtitle: mix.date ? `Product mix reported for ${fmtDayLong(mix.date)}` : "No nearby category file is available",
    value: selected ? `${fmtCount(selected.contracts)} contracts` : "No published figure",
    delta: change == null ? "Thirty-day comparison unavailable" : `${fmtPct(change)} versus the previous 30 calendar days`,
    deltaTone: change == null ? null : change >= 0 ? "positive" : "negative",
    facts: [
      {label: "Venue share", value: selected && mixTotal ? fmtShare(selected.contracts / mixTotal) : "—"},
      {label: "30-day volume", value: fmtCount(recentTotal)},
      {label: "Reported days", value: String(new Set(recent.map(row => +row.date)).size)},
      {label: "Data level", value: "Category aggregate"}
    ],
    sections: [{title: "Continue exploring", items: [
      {label: `Open ${venue}`, description: "Venue overview and available modules", value: "→", href: VENUE_ROUTES.get(venue) || "./venues"},
      {label: "Compare product mix", description: "Every venue and supported bucket", value: "→", href: "./categories-venues"}
    ]}],
    coverage: "This selection stops at category level because the current daily category files do not identify the individual markets inside each bucket.",
    state: {kind: "venue-category-day", source: "briefing", date: isoDay(selectedDate), venue, category},
    ask: {
      question: `Explain ${venue}'s ${category} activity around ${isoDay(selectedDate)}. Compare it with its recent trend and be explicit about the category-level data limit.`,
      context: `Predict Charts homepage Data Inspector: ${venue} → ${category} on ${isoDay(selectedDate)}.`
    }
  };
}

function venueDayDetail(selectedDate, venue) {
  const row = scaleRows.find(value => value.venue === venue && sameDay(value.date, selectedDate));
  if (!row) return null;
  const dayRows = scaleRows.filter(value => sameDay(value.date, selectedDate));
  const dayTotal = d3.sum(dayRows, value => value.contracts);
  const history = scaleRows.filter(value => value.venue === venue && value.date <= selectedDate).sort((a, b) => a.date - b.date);
  const previous = history.filter(value => value.date < selectedDate && !value.partial).at(-1);
  const recent = history.filter(value => !value.partial).slice(-7);
  const average7 = d3.mean(recent, value => value.contracts);
  const change = previous?.contracts ? row.contracts / previous.contracts - 1 : null;
  const mix = productMixFor(venue, selectedDate);
  const mixTotal = d3.sum(mix.rows, value => value.contracts);
  const sportVolume = d3.sum(mix.rows.filter(value => SPORTS_BUCKETS.has(value.bucket)), value => value.contracts);
  return {
    crumb: venue,
    eyebrow: `Venue day · ${fmtDayLong(selectedDate)}`,
    title: venue,
    subtitle: row.partial ? "Latest report is still filling" : "Reported daily venue activity",
    value: `${fmtCount(row.contracts)} contracts`,
    delta: change == null ? "Previous comparable report unavailable" : `${fmtPct(change)} versus the previous complete report`,
    deltaTone: change == null ? null : change >= 0 ? "positive" : "negative",
    facts: [
      {label: "Shown share", value: dayTotal ? fmtShare(row.contracts / dayTotal) : "—"},
      {label: "7-report average", value: average7 == null ? "—" : fmtCount(average7)},
      {label: "Sports share", value: mixTotal ? fmtShare(sportVolume / mixTotal) : "—"},
      {label: "Coverage", value: row.partial ? "Partial day" : row.sparse ? "Sparse bulletin" : "Daily total"}
    ],
    sections: [
      {title: mix.date ? `Product mix · ${fmtDayLong(mix.date)}` : "Product mix", items: mix.rows.map(item => ({
        label: item.bucket,
        description: `${fmtShare(mixTotal ? item.contracts / mixTotal : null)} of available venue mix`,
        value: fmtCount(item.contracts),
        meta: "contracts",
        detail: () => categoryDayDetail(selectedDate, venue, item.bucket)
      }))},
      {title: "Continue exploring", items: [{label: `Open ${venue}`, description: "Venue overview and available modules", value: "→", href: VENUE_ROUTES.get(venue) || "./venues"}]}
    ],
    coverage: mix.date && !sameDay(mix.date, selectedDate)
      ? `The volume total is for ${fmtDayLong(selectedDate)}; the latest nearby product mix is ${fmtDayLong(mix.date)}.`
      : "Product detail appears only when the venue publishes a compatible category file. Trade-level fields are not inferred.",
    state: {kind: "venue-day", source: "briefing", date: isoDay(selectedDate), venue},
    ask: {
      question: `What was most important about ${venue}'s activity on ${isoDay(selectedDate)}? Compare it with the venue's recent history and explain the coverage limits.`,
      context: `Predict Charts homepage Data Inspector: ${venue} on ${isoDay(selectedDate)}.`
    }
  };
}

function industryDayDetail(selectedDate) {
  const rows = scaleRows.filter(row => sameDay(row.date, selectedDate)).sort((a, b) => b.contracts - a.contracts);
  if (!rows.length) return null;
  const total = d3.sum(rows, row => row.contracts);
  const priorDate = d3.max(scaleRows.filter(row => row.date < selectedDate), row => row.date);
  const prior = priorDate ? scaleRows.filter(row => sameDay(row.date, priorDate)) : [];
  const priorByVenue = new Map(prior.map(row => [row.venue, row.contracts]));
  const comparable = rows.filter(row => priorByVenue.has(row.venue));
  const comparableNow = d3.sum(comparable, row => row.contracts);
  const comparablePrior = d3.sum(comparable, row => priorByVenue.get(row.venue));
  const change = comparablePrior ? comparableNow / comparablePrior - 1 : null;
  const dayProducts = productRows.filter(row => sameDay(row.date, selectedDate));
  const productTotal = d3.sum(dayProducts, row => row.contracts);
  const sports = d3.sum(dayProducts.filter(row => SPORTS_BUCKETS.has(row.bucket)), row => row.contracts);
  return {
    crumb: fmtDay(selectedDate),
    eyebrow: "Industry day",
    title: fmtDayLong(selectedDate),
    subtitle: "Reported US prediction-market activity",
    value: `${fmtCount(total)} contracts`,
    delta: change == null ? "Prior comparable date unavailable" : `${fmtPct(change)} versus ${fmtDay(priorDate)} across ${comparable.length} common venues`,
    deltaTone: change == null ? null : change >= 0 ? "positive" : "negative",
    facts: [
      {label: "Reporting venues", value: String(rows.length)},
      {label: "Largest venue", value: rows[0]?.venue || "—"},
      {label: "Sports share", value: productTotal ? fmtShare(sports / productTotal) : "—"},
      {label: "Partial reports", value: String(rows.filter(row => row.partial).length)}
    ],
    sections: [{title: "Volume by exchange", items: rows.map(row => ({
      label: row.venue,
      description: `${fmtShare(total ? row.contracts / total : null)} of volume shown${row.partial ? " · partial" : ""}`,
      value: fmtCount(row.contracts),
      meta: "contracts",
      detail: () => venueDayDetail(selectedDate, row.venue)
    }))}],
    coverage: "This total covers the non-sparse venue series plotted in the chart. Each exchange keeps its own reported contract unit, and missing reports are not treated as zero.",
    state: {kind: "industry-day", source: "briefing", date: isoDay(selectedDate)},
    ask: {
      question: `What happened across US prediction markets on ${isoDay(selectedDate)}? Identify the important venue and product changes without overstating incomplete coverage.`,
      context: `Predict Charts homepage Data Inspector: industry day ${isoDay(selectedDate)}.`
    }
  };
}

function openIndustryDay(date, source) {
  INSPECTOR.open(industryDayDetail(date), {replace: true, source});
}

function openVenueDay(date, venue, source) {
  const day = industryDayDetail(date);
  const venueDetail = venueDayDetail(date, venue);
  if (!day || !venueDetail) return;
  INSPECTOR.open(day, {replace: true, source});
  INSPECTOR.open(venueDetail, {source});
}

const scaleInspectorBinding = INSPECTOR.bindTimeSeries(scalePlot, {
  data: scaleRowsBrushed,
  dateAccessor: row => row.date,
  marginLeft: 72,
  marginRight: 20,
  getDetail: industryDayDetail
});

INSPECTOR.restore("briefing", state => {
  if (state.source !== "briefing" || !state.date) return null;
  const date = stateDay(state.date);
  if (state.kind === "venue-category-day" && state.venue && state.category) return [industryDayDetail(date), venueDayDetail(date, state.venue), categoryDayDetail(date, state.venue, state.category)];
  if (state.kind === "venue-day" && state.venue) return [industryDayDetail(date), venueDayDetail(date, state.venue)];
  if (state.kind === "industry-day") return industryDayDetail(date);
  return null;
});

const inspectorCurrentDate = INSPECTOR.current()?.state?.source === "briefing" && INSPECTOR.current()?.state?.date
  ? stateDay(INSPECTOR.current().state.date)
  : null;
if (inspectorCurrentDate && inspectorCurrentDate >= scaleBrushFrom && inspectorCurrentDate <= scaleBrushTo) {
  scaleInspectorBinding.select(inspectorCurrentDate);
}

invalidation.then(() => scaleInspectorBinding.destroy());
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
    color: {legend: true, domain: productBucketsShown, range: productBucketsShown.map(bucket => PRODUCT_COLORS[bucket])},
    marks: [
      Plot.barX(productByVenue, {x: "share", y: "venue", fill: "bucket", order: PRODUCT_BUCKETS, insetRight: 1, tip: true, title: row => `${row.venue}\n${row.bucket}: ${(100 * row.share).toFixed(1)}%\n${Math.round(row.contracts).toLocaleString()} contracts`}),
      // Label only the segments wide enough to hold one; the halo keeps them
      // legible on both the light and the dark fills in either theme.
      Plot.text(productByVenue, Plot.stackX({
        // z is explicit here: the bars get it free from fill, but this mark has a
        // constant fill, and the array form of order needs a z channel to sort on.
        x: "share", y: "venue", z: "bucket", order: PRODUCT_BUCKETS,
        text: row => row.share >= 0.1 ? `${Math.round(100 * row.share)}%` : "",
        fill: "#fff", stroke: "rgba(0,0,0,.55)", strokeWidth: 2.5, paintOrder: "stroke",
        fontSize: 11, fontWeight: 600
      })),
      Plot.ruleX([0])
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
  <a href="./parlay-venues">Compare parlay adoption →</a>
</div>

## Go deeper

<div class="destination-grid">
  <a class="destination-card" href="./compare"><strong>Compare venues</strong><span>Start with the strongest common measure, with coverage limits visible.</span></a>
  <a class="destination-card" href="./volume"><strong>Kalshi deep dive</strong><span>Activity, products, economics, outcomes, and parlays from the richest tape.</span></a>
  <a class="destination-card" href="./market-explorer"><strong>Explore markets</strong><span>Venue leaders, top markets, and one searchable finder.</span></a>
  <a class="destination-card" href="./methodology"><strong>Data &amp; methodology</strong><span>Coverage, definitions, mappings, and the limits of every comparison.</span></a>
</div>
