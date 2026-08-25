// Click-to-inspect for the per-venue tables.
//
// WHY THIS EXISTS
// /market-explorer and /trade-size let a reader click a market or a trade and get a
// drawer explaining it. The SAME rows, drawn by the SAME components, were dead on every
// venue's own page: six "Top markets" tables render `marketLeaderboard()` without passing
// its `onMarketSelect` hook, and six "Trading behavior" pages draw the biggest-trade
// tables with no click at all. A reader who clicked a ProphetX trade on /trade-size and
// then clicked the same trade on /prophetx-behavior got nothing, which reads as a broken
// page rather than a deliberate difference.
//
// The two detail builders here are the cross-venue ones from those pages, lifted so the
// venue view and the comparison view cannot drift apart. The comparison pages keep their
// own copies for now: they carry Kalshi-only fields (category, outcome, aggressor side,
// block-trade flag) that no competitor file publishes, and folding those in would mean
// one builder full of venue conditionals.
import {LB_VENUES, fmtLbCount} from "./market-leaderboard.js";
import {largeTradeRows, fmtCount, fmtUSD, fmtPct, fmtPrice} from "./venue-modules.js";

const inspector = () => (typeof window === "undefined" ? null : window.PredictChartsInspector) || null;

const fmtDay = value => (value == null || value === ""
  ? "—"
  : (value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
      .toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}));

// Where "Open <venue>" goes from a market drawer. Keyed on the leaderboard's own venue
// key, the same one LB_VENUES uses.
const VENUE_ROUTES = {
  kalshi: "./volume", polymarket: "./polymarket", forecastex: "./forecastex",
  nadex: "./nadex", rothera: "./rothera", dkex: "./dkex", underdog: "./underdog"
};

// ── Markets ─────────────────────────────────────────────────────────────────

export function marketDetail(row, source) {
  if (!row) return null;
  const spec = LB_VENUES[row.venue];
  const unitLong = row.unit === "pairs" ? "matched pairs" : "contracts";
  const evidence = [
    row.winner ? {label: "Winner", description: "Published or decoded settled outcome", value: row.winner} : null,
    row.top && spec?.topHeader ? {label: spec.topHeader, description: "Highest-volume contract or outcome", value: row.top} : null,
    row.fees != null ? {label: "Fees", description: "One-side fees in the published market file", value: `$${fmtLbCount(row.fees)}`} : null
  ].filter(Boolean);
  return {
    crumb: row.name || row.marketKey,
    eyebrow: `${row.venueLabel} market`,
    title: row.name || row.marketKey,
    subtitle: row.name ? row.marketKey : "The venue publishes no readable market name",
    value: `${fmtLbCount(row.contracts)} ${unitLong}`,
    delta: row.period && row.period !== "all"
      ? `Published period: ${row.period}`
      : "All available published history for this venue file",
    facts: [
      {label: "Venue", value: row.venueLabel},
      {label: "Published volume", value: `${fmtLbCount(row.contracts)} ${row.unit === "pairs" ? "pairs" : "contracts"}`},
      {label: "Rank on this venue", value: row.rank == null ? "—" : `#${row.rank}`},
      {label: "Last trade", value: fmtDay(row.lastTrade)},
      {label: "Category", value: row.category || "Not published"},
      {label: "Outcomes", value: row.outcomes == null ? "Not published" : Math.round(row.outcomes).toLocaleString()},
      {label: "Name source", value: row.label || "Code only"}
    ],
    sections: [
      {title: "Available market evidence", items: evidence},
      {title: "Continue exploring", items: [
        {label: "Open Market Explorer", description: "The same market beside every other venue's", value: "→", href: "./market-explorer"},
        {label: `Open ${row.venueLabel}`, description: "Venue overview and available modules", value: "→", href: VENUE_ROUTES[row.venue] || "./venues"}
      ]}
    ],
    coverage: `This is a within-${row.venueLabel} market record, not a cross-venue rank. ${row.unit === "pairs"
      ? "ForecastEx reports matched pairs; that unit is not converted to contracts."
      : "The collection window and name quality remain the venue file's own."}`,
    state: {kind: "market", source, venue: row.venue, market: row.marketKey},
    ask: {
      question: `Explain the ${row.name || row.marketKey} market on ${row.venueLabel}. Put its volume and outcome evidence in context without treating unlike venue windows or units as comparable.`,
      context: `Predict Charts ${row.venueLabel} leaderboard selection: ${row.marketKey}.`
    }
  };
}

/**
 * Wire a venue page's leaderboard. Returns the `onMarketSelect` handler to hand to
 * `marketLeaderboard()`, or undefined when the inspector script is absent — in which case
 * the component falls back to a plain, non-interactive cell rather than throwing.
 *
 * ⚠ `source` MUST be unique per page. Selection state lives in the GLOBAL `pc_*` query
 * namespace, and `restore`'s key only guards against running twice within one page — so a
 * link copied from another page would otherwise resolve against these rows and open the
 * wrong market. The resolver below refuses anything that is not its own `source`.
 */
export function attachMarketInspector({source, rows}) {
  const api = inspector();
  if (!api || !source) return undefined;
  const find = state => (rows ?? []).find(row => row.venue === state.venue && row.marketKey === state.market);
  api.restore(source, state =>
    state.source === source && state.kind === "market" && state.market
      ? marketDetail(find(state), source)
      : null);
  return (row, element) => api.open(marketDetail(row, source), {replace: true, source: element});
}

// ── Trades ──────────────────────────────────────────────────────────────────

// Value-derived, never rank-derived. These leaderboards rebuild every ~4h and the
// small-market denominator keeps moving while a market is live, so a link keyed on "#3"
// reopens a different trade a day later.
export const tradeIdentity = row => [
  row.table, row.metric,
  row.date ? String(row.date).slice(0, 10) : "unknown-date",
  row.market, row.contracts, row.price
].join("~");

export function tradeDetail(row, source) {
  if (!row) return null;
  const ranking = row.table === "small_market" ? "large relative to its market" : "largest individual prints";
  const publishesAggressor = row.venue === "Novig";
  const fieldNote = publishesAggressor
    ? "Novig publishes an aggressor flag, so taker-side rankings use the side identified by the venue."
    : `This record contains only fields ${row.venue}'s collected trade tape publishes. The venue does not publish an aggressor flag, so a taker is never inferred.`;
  return {
    crumb: `${fmtCount(row.contracts)} trade`,
    eyebrow: `Individual trade · ${row.venue}`,
    title: `${fmtCount(row.contracts)} contracts at ${fmtPrice(row.price)}`,
    subtitle: row.market || "Unnamed venue market",
    value: row.metric === "Contracts" ? `${fmtCount(row.metric_value)} contracts` : fmtUSD(row.metric_value),
    delta: `#${row.rank ?? "—"} by ${String(row.metric || "").toLowerCase()} among ${ranking}`,
    facts: [
      {label: "Venue", value: row.venue},
      {label: "Date", value: fmtDay(row.date)},
      {label: "Contracts", value: fmtCount(row.contracts)},
      {label: "Price", value: fmtPrice(row.price)},
      {label: "Ranked by", value: row.metric},
      {label: "% of market", value: row.pct_of_market == null ? "Not in this ranking" : fmtPct(row.pct_of_market)}
    ],
    sections: [
      {title: "Continue exploring", items: [
        {label: "Compare across venues", description: "The same tables with a venue picker", value: "→", href: "./trade-size"},
        {label: "Open Market Explorer", description: "Find this or related markets", value: "→", href: "./market-explorer"}
      ]}
    ],
    // Two separate caveats, and which one applies is a property of the row, not of the
    // venue: window_left_censored is set per trade by the producer.
    coverage: `${row.window_left_censored
      ? `The ${row.venue} collection window is left-censored: this trade is real, but the file does not cover the venue's full prior history. `
      : ""}${fieldNote}`,
    state: {kind: "trade", source, venue: row.venue, trade: tradeIdentity(row)},
    ask: {
      question: `Explain why this ${fmtCount(row.contracts)}-contract trade on ${row.venue} is notable. Use its price, market share and collection-window limits, and ${publishesAggressor ? "use the venue's published aggressor flag when discussing the taker" : "do not infer an aggressor because the venue does not publish one"}.`,
      context: `Predict Charts ${row.venue} trading-behavior selection: ${row.market} · ${row.date ? String(row.date).slice(0, 10) : "unknown date"} · ${fmtPrice(row.price)}.`
    }
  };
}

/**
 * `largeTradeRows` plus the three fields the drawer needs and the table does not show.
 * Without them the identity cannot be built, and a link would reopen whichever table and
 * metric happened to be selected rather than the one that was shared.
 */
export function venueTradeRows(largeTrades, {venue, table, metricLabel}) {
  return largeTradeRows(largeTrades, {venue, table, metricLabel})
    .map(row => ({...row, venue, table, metric: metricLabel}));
}

/**
 * Wire a venue's Trading-behavior page. `metrics` is that venue's available ranking
 * metrics (`metricsFor`), so restore can find a shared row whichever metric it was ranked
 * by — the visible table only ever holds one of them.
 */
export function attachTradeInspector({source, venue, largeTrades, metrics}) {
  const api = inspector();
  if (!api || !source) return () => {};
  const all = ["overall", "small_market"].flatMap(table =>
    (metrics ?? []).flatMap(metricLabel => venueTradeRows(largeTrades, {venue, table, metricLabel})));
  api.restore(source, state =>
    state.source === source && state.kind === "trade" && state.trade
      ? tradeDetail(all.find(row => tradeIdentity(row) === state.trade), source)
      : null);
  return (row, element) => api.open(tradeDetail(row, source), {replace: true, source: element});
}
