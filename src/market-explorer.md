---
title: Market Explorer
---

<div class="page-hero">
  <div class="page-eyebrow">Explorer</div>
  <h1>Markets and venue leaders</h1>
  <p class="page-lead">Four different questions, kept separate: which venues are largest now, what leads each venue, where a particular event or contract is listed, and how much of the very same fixture two venues each traded.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS, buildPlatformSeries, buildVenueScoreboard} from "./components/venue-data.js";
import {LB_VENUES, fmtLbCount, marketLeaderboard, normalizeLeaderboard} from "./components/market-leaderboard.js";
import {bestName, fmtStrike, fmtWinner} from "./components/ticker-names.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

const kalshiDaily = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const prophetxDaily = await DataAttachment("data/prophetx_daily.csv").csv({typed: true});
const cmeDaily = await DataAttachment("data/cme_daily_distributed.csv").csv({typed: true});

const lbKalshi = await DataAttachment("data/market_leaderboard.csv").csv();
const lbPolymarket = await DataAttachment("data/polymarket_market_leaderboard.csv").csv();
const lbForecastex = await DataAttachment("data/forecastex_market_leaderboard.csv").csv();
const lbNadex = await DataAttachment("data/nadex_market_leaderboard.csv").csv();
const lbRothera = await DataAttachment("data/rothera_market_leaderboard.csv").csv();
const lbDkex = await DataAttachment("data/dkex_market_leaderboard.csv").csv();
const lbUnderdog = await DataAttachment("data/underdog_market_leaderboard.csv").csv();
```

```js
const normalizedVenues = [
  {spec: LB_VENUES.kalshi, rows: normalizeLeaderboard("kalshi", lbKalshi, {nameFn: bestName, winnerFn: fmtWinner, topFn: fmtStrike})},
  {spec: LB_VENUES.polymarket, rows: normalizeLeaderboard("polymarket", lbPolymarket)},
  {spec: LB_VENUES.forecastex, rows: normalizeLeaderboard("forecastex", lbForecastex)},
  {spec: LB_VENUES.nadex, rows: normalizeLeaderboard("nadex", lbNadex)},
  {spec: LB_VENUES.rothera, rows: normalizeLeaderboard("rothera", lbRothera)},
  {spec: LB_VENUES.dkex, rows: normalizeLeaderboard("dkex", lbDkex)},
  {spec: LB_VENUES.underdog, rows: normalizeLeaderboard("underdog", lbUnderdog)}
];
const platformRows = buildPlatformSeries({kalshi: kalshiDaily, competitor: competitorDaily, prophetx: prophetxDaily, cme: cmeDaily});
const venueBoard = buildVenueScoreboard(platformRows);
const fmtDate = value => value?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "—";
const fmtPct = value => value == null ? "—" : `${value >= 0 ? "+" : ""}${(100 * value).toFixed(1)}%`;
const marketInspector = window.PredictChartsInspector;
const allMarketRows = normalizedVenues.flatMap(({rows}) => rows);
const MARKET_VENUE_ROUTES = {
  kalshi: "./volume", polymarket: "./polymarket", forecastex: "./forecastex",
  nadex: "./nadex", rothera: "./rothera", dkex: "./dkex", underdog: "./underdog"
};

function marketDetail(row) {
  if (!row) return null;
  const spec = LB_VENUES[row.venue];
  const facts = [
    {label: "Venue", value: row.venueLabel},
    {label: "Published volume", value: `${fmtLbCount(row.contracts)} ${row.unit === "pairs" ? "pairs" : "contracts"}`},
    {label: "Last trade", value: fmtDate(row.lastTrade)},
    {label: "Category", value: row.category || "Not published"},
    {label: "Outcomes", value: row.outcomes == null ? "Not published" : Math.round(row.outcomes).toLocaleString()},
    {label: "Name source", value: row.label || "Code only"}
  ];
  const evidence = [
    row.winner ? {label: "Winner", description: "Published or decoded settled outcome", value: row.winner} : null,
    row.top ? {label: spec?.topHeader || "Busiest outcome", description: "Highest-volume contract or outcome", value: row.top} : null,
    row.fees != null ? {label: "Fees", description: "One-side fees in the published market file", value: `$${fmtLbCount(row.fees)}`} : null
  ].filter(Boolean);
  return {
    crumb: row.name || row.marketKey,
    eyebrow: `${row.venueLabel} market`,
    title: row.name || row.marketKey,
    subtitle: row.name ? row.marketKey : "The venue publishes no readable market name",
    value: `${fmtLbCount(row.contracts)} ${row.unit === "pairs" ? "matched pairs" : "contracts"}`,
    delta: row.period && row.period !== "all" ? `Published period: ${row.period}` : "All available published history for this venue file",
    facts,
    sections: [
      {title: "Available market evidence", items: evidence},
      {title: "Continue exploring", items: [
        {label: `Open ${row.venueLabel}`, description: "Venue overview and available modules", value: "→", href: MARKET_VENUE_ROUTES[row.venue] || "./venues"},
        {label: "Compare product mix", description: "Venue-by-venue category evidence", value: "→", href: "./categories-venues"}
      ]}
    ],
    coverage: `This is a within-${row.venueLabel} market record, not a cross-venue rank. ${row.unit === "pairs" ? "ForecastEx reports matched pairs; that unit is not converted to contracts." : "The collection window and name quality remain the venue file's own."}`,
    state: {kind: "market", source: "market-explorer", venue: row.venue, market: row.marketKey},
    ask: {
      question: `Explain the ${row.name || row.marketKey} market on ${row.venueLabel}. Put its volume and outcome evidence in context without treating unlike venue windows or units as comparable.`,
      context: `Predict Charts Market Explorer selection: ${row.venueLabel} · ${row.marketKey}.`
    }
  };
}

function openMarketDetail(row, source) {
  marketInspector.open(marketDetail(row), {replace: true, source});
}

marketInspector.restore("market-explorer", state => {
  if (state.source !== "market-explorer" || state.kind !== "market") return null;
  return marketDetail(allMarketRows.find(row => row.venue === state.venue && row.marketKey === state.market));
});
```

## Venue leaderboard

<p class="section-intro">Recent reported scale, not an all-time contest between differently aged datasets.</p>

<div class="surface-card table-scroll">

```js
display(html`<table class="briefing-table">
  <thead><tr><th>Venue</th><th>Reporting through</th><th>7-day average</th><th>Last 7 reported days</th><th>vs prior 7</th><th>Coverage</th></tr></thead>
  <tbody>${venueBoard.map(row => html`<tr>
    <td><span class="venue-dot" style="background:${VENUE_COLORS[row.venue]}"></span><strong>${row.venue}</strong></td>
    <td>${fmtDate(row.latest)}</td>
    <td title="${Math.round(row.average7 ?? 0).toLocaleString()}">${fmtLbCount(row.average7)}</td>
    <td title="${Math.round(row.recentTotal).toLocaleString()}">${fmtLbCount(row.recentTotal)} <span class="cell-note">${row.recentDays}d</span></td>
    <td class="${row.change == null ? "" : row.change >= 0 ? "is-positive" : "is-negative"}">${fmtPct(row.change)}</td>
    <td>${row.sparse ? html`<span class="coverage-badge is-limited">sparse bulletin</span>` : row.coverage}</td>
  </tr>`)}</tbody>
</table>`);
```

</div>

## Top markets by venue

<p class="section-intro">The five largest markets inside each venue's own published window and unit. These are separate lists by design; they are not a blended cross-venue ranking.</p>

```js
display(html`<div class="top-market-grid">${normalizedVenues.map(({spec, rows}) => {
  const top = rows.filter(row => row.period === "all").sort((a, b) => b.contracts - a.contracts).slice(0, 5);
  return html`<section class="top-market-card">
    <h3><span class="venue-dot" style="background:${spec.accent}"></span>${spec.label}</h3>
    <ol>${top.map(row => html`<li><button type="button" class="inspector-inline-button" title="${row.marketKey}" onclick=${event => openMarketDetail(row, event.currentTarget)}>${row.name || row.marketKey}</button><strong>${fmtLbCount(row.contracts)}${spec.unit === "pairs" ? " pairs" : ""}</strong></li>`)}</ol>
  </section>`;
})}</div>`);
```

## Market finder

<p class="section-intro">Search names, clubs, players, categories, outcomes, or ticker fragments across every supported venue. The default order is most recently traded. There is no meaningless all-venue rank and no separate “Label” column; name provenance is available in the Market-cell tooltip.</p>

```js
display(marketLeaderboard({
  hashPrefix: "finder",
  rowsPerPage: 25,
  venues: normalizedVenues,
  onMarketSelect: openMarketDetail
}));
```

<p class="chart-note"><strong>Current coverage gap:</strong> ProphetX and Novig publish per-market files but are not yet normalized into the shared finder. Their absence here is a finder limitation, not an absence of markets or trading.</p>

## The same game, on two venues

<p class="section-intro">Every fixture both Kalshi and Polymarket US listed, one dot each. Kalshi trades more of the same game in all six sports, but the gap runs from about ${xvGapText}.</p>

```js
const xvenue = await DataAttachment("data/polymarket_kalshi_same_fixture.csv").csv({typed: true});
```

```js
// One row per fixture both venues listed. The join is CONSTRUCTED, not an id lookup:
// Polymarket publishes sportradar_game_id but Kalshi publishes no fixture identifier at
// all, so the key is (league, date, unordered team pair) through a hand-checked 159-row
// team crosswalk. Alignment is by TEAM IDENTITY, never by position -- the two venues
// disagree about which team is named first on every IPL fixture and no other league.
const xvRows = xvenue
  .filter(d => (+d.kalshi_contracts || 0) > 0 && (+d.poly_contracts || 0) > 0)
  .map(d => ({
    league: String(d.league || "").toUpperCase(),
    date: d.game_date,
    kalshi: +d.kalshi_contracts,
    poly: +d.poly_contracts,
    ratio: +d.kalshi_contracts / +d.poly_contracts,
    fixture: `${d.kalshi_first}/${d.kalshi_second}`.toUpperCase()
  }));

const xvLeagues = Array.from(d3.rollup(xvRows, v => v.length, d => d.league))
  .sort((a, b) => b[1] - a[1]).map(d => d[0]);
const xvMedian = new Map(
  Array.from(d3.rollup(xvRows, v => d3.median(v, d => d.ratio), d => d.league))
);
const xvExtent = d3.extent([...xvRows.map(d => d.kalshi), ...xvRows.map(d => d.poly)]);
// Constant-ratio guides. 1x is parity; the others mark where Kalshi traded 10, 100 or
// 1000 times the same fixture -- the range the league medians actually span.
const xvGuides = [{mult: 1, label: "parity"}, {mult: 10, label: "10x"},
                  {mult: 100, label: "100x"}, {mult: 1000, label: "1000x"}];

// The prose above and in the notes below quotes the extreme league medians and the
// settled-winner check. Both are derived here, never typed, so they cannot drift.
const xvLeagueWord = l => ({MLB: "baseball", NHL: "hockey"})[l] ?? `the ${l}`;
const xvByMedian = Array.from(xvMedian).sort((a, b) => a[1] - b[1]);
const xvGapText = xvByMedian.length === 0 ? "—" : [xvByMedian[0], xvByMedian[xvByMedian.length - 1]]
  .map(([l, m]) => `${Math.round(m)}× in ${xvLeagueWord(l)}`).join(" to ");
const xvAgree = xvenue.filter(d => d.outcome_check === "agree").length;
const xvTestable = xvAgree + xvenue.filter(d => d.outcome_check === "disagree").length;

// LINEAR IS THE DEFAULT because log-log is hard to read at a glance, and in linear
// space the constant-ratio guides become straight rays from the origin, easier still.
// The cost is the tail: on FULL linear domains the median fixture sits at 4.6% of the
// width and 3.6% of the height, a blob in the corner. So linear clips to the 95th
// percentile of each axis, which hides the 63 largest of 817 fixtures -- hence the Log
// option one click away, and the count of what is off-panel in the note below.
const xvQuantile = (acc, q) => d3.quantile(xvRows.map(acc).sort(d3.ascending), q);
const xvLinMaxX = xvQuantile(d => d.kalshi, 0.95);
const xvLinMaxY = xvQuantile(d => d.poly, 0.95);
const xvOffPanel = xvRows.filter(d => d.kalshi > xvLinMaxX || d.poly > xvLinMaxY).length;
const fmtX = n => n >= 1e9 ? `${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n);
```

<div class="control-strip">

```js
const xvScale = view(Inputs.radio(["Linear", "Log"], {label: "Scale", value: "Linear"}));
```

</div>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 480,
  marginLeft: 76,
  grid: true,
  clip: true,
  // KALSHI ON X. Kalshi spans 2.27 decades (922k to 171.6M) against Polymarket's 6.20
  // (21 to 33.5M); the wide axis has the pixels to spread the narrow range out, and the
  // taller panel gives the six-decade series somewhere to go.
  x: xvScale === "Log"
    ? {type: "log", label: "Kalshi contracts on that fixture →", tickFormat: fmtX}
    : {type: "linear", domain: [0, xvLinMaxX], label: "Kalshi contracts on that fixture →", tickFormat: fmtX},
  y: xvScale === "Log"
    ? {type: "log", label: "↑ Polymarket US contracts on that fixture", tickFormat: fmtX}
    : {type: "linear", domain: [0, xvLinMaxY], label: "↑ Polymarket US contracts on that fixture", tickFormat: fmtX},
  color: {legend: true, domain: xvLeagues, scheme: "tableau10"},
  marks: [
    // PARITY ALONE SAYS ALMOST NOTHING HERE: 811 of 817 fixtures sit on one side of it.
    // These are constant-ratio guides, parallel to parity on a log-log panel, so where a
    // dot sits between them reads directly as "how many times more Kalshi traded".
    // Kalshi is on x now, so more-Kalshi means BELOW the line, not above.
    ...xvGuides.map(g => Plot.line(
      [[xvExtent[0], xvExtent[0] / g.mult], [xvExtent[1], xvExtent[1] / g.mult]],
      {stroke: "currentColor", strokeOpacity: g.mult === 1 ? 0.45 : 0.16,
       strokeDasharray: g.mult === 1 ? "4,4" : "2,5"})),
    Plot.text(xvGuides, {
      x: () => xvExtent[1], y: g => xvExtent[1] / g.mult, text: "label",
      textAnchor: "end", dy: -6, fill: "currentColor", fillOpacity: 0.5, fontSize: 10
    }),
    Plot.dot(xvRows, {
      x: "kalshi", y: "poly", fill: "league", r: 3, fillOpacity: 0.72,
      tip: true,
      title: d => `${d.league} ${d.fixture}\n${d.date}\nKalshi ${fmtX(d.kalshi)} · Polymarket ${fmtX(d.poly)}\n${d.ratio.toFixed(1)}× Kalshi`
    })
  ]
})
```

<p class="chart-note">The dashed line is parity and the fainter ones mark 10&times;, 100&times; and 1000&times;, so a dot between two guides traded that many times more on Kalshi. Only ${xvRows.filter(d => d.ratio < 1).length} of ${xvRows.length} fixtures sit <em>above</em> parity, where Polymarket US traded the larger book. ${xvScale === "Linear" ? `<strong>Linear clips to the 95th percentile of each axis</strong>, so ${xvOffPanel} of ${xvRows.length} fixtures — the largest on one venue or the other — sit beyond the panel; switch to Log to see every one. ` : `<strong>Log shows every fixture</strong>, including the Polymarket books that traded only a few dozen contracts. `}Median ratio by league: ${xvLeagues.map(l => `${l} ${xvMedian.get(l).toFixed(1)}×`).join(" · ")}.</p>

<details class="surface-card compact-details">
  <summary>About this comparison — read before quoting any number</summary>
  <p><strong>This is not a random sample of either book.</strong> Kalshi publishes no per-fixture file; the only per-market data it publishes is two all-time leaderboards capped at its top 1,000 and 2,000 markets. A fixture outside those caps cannot appear here at all, so the ${xvRows.length} shown are weighted towards big games — and towards games Kalshi traded heavily, which is the very quantity being compared. Read the ratios as "on the fixtures both venues listed and Kalshi traded a lot of", not as a market-share estimate.</p>
  <p><strong>The join is constructed, and it is checked.</strong> Polymarket US publishes a third-party <code>sportradar_game_id</code> on 92.5% of its events; Kalshi publishes no fixture identifier of any kind, so that id can only ever name one side and cannot be the key. Fixtures are matched on league, date and the unordered team pair through a 159-row crosswalk, with a one-day tolerance for games that cross midnight in one venue's timezone and not the other. Where both venues have settled, the two agree on the winner on <strong>${xvAgree} of ${xvTestable}</strong> fixtures; the producer refuses to publish if a single one disagrees, because a disagreement would mean the crosswalk had mapped two different teams onto each other.</p>
  <p><strong>The two venues disagree about team order, and only in one league.</strong> All 47 flipped fixtures are IPL, and every IPL fixture is flipped; no other league has one. That is a listing convention, not an error, and nothing here is aligned by position — but it is why a comparison built on "first team" rather than team identity would be silently wrong for an entire sport.</p>
  <p><strong>Soccer is absent by construction.</strong> Polymarket lists a soccer fixture as three separate binary markets (home, away, draw) where Kalshi lists one, so the two are not the same object and a join would compare a two-outcome market against one leg of a three-outcome one.</p>
  <p><strong>Contracts are each venue's own unit</strong> and are not adjusted. Polymarket US contract counts are fractional; Kalshi's are whole.</p>
</details>
