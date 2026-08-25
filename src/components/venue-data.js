// One source of truth for venue colour: the CSS tokens in styles.css.
//
// These were literal hexes copied from the tokens, which silently drifted apart the
// moment either side moved. Editorial Desk (648b33f) restyled --accent-kalshi to
// #087c70, so the homepage drew Kalshi as #00C2A8 in the exchange-volume chart and
// #087c70 in the brush directly beneath it. In dark mode SEVEN venues drifted, because
// every token has a designed dark variant and a frozen hex cannot follow the theme.
//
// var() is safe in every consumer here, all of which were checked: Plot resolves it in
// mark presentation attributes AND in legend swatches (verified against plot@0.6.17 --
// swatch rects computed rgb(80,199,183) from var(--accent-kalshi)), the .venue-dot uses
// are inline CSS, and venue-data.js's own use is a truthiness test. There is no colour
// MATH anywhere in src/*.md or src/components/*.js -- no d3.color, interpolate or
// chroma -- which is the thing that would break on a var() string.
//
// Three venues stay literal on purpose:
//   ProphetX, Novig  -- no --accent-* token exists; inventing one would mean choosing
//                       new dark-mode colours, which is a design call, not a unification.
//   CME              -- --accent-cme is #9A6D1F, a genuinely different colour from the
//                       #64748B used here, and it has no dark variant. Pointing at the
//                       token would change how CME looks rather than unify anything.
// All three are theme-blind today and stay exactly as they render now.
export const VENUE_COLORS = Object.freeze({
  Kalshi: "var(--accent-kalshi)",
  "Polymarket US": "var(--accent-polymarket)",
  ForecastEx: "var(--accent-forecastex)",
  DKeX: "var(--accent-dkex)",
  "Underdog Exchange": "var(--accent-underdog)",
  ProphetX: "#DB2777",
  Novig: "#6366F1",
  Rothera: "var(--accent-rothera)",
  "Crypto.com/Nadex": "var(--accent-nadex)",
  CME: "#64748B"
});

export const VENUE_ORDER = Object.freeze(Object.keys(VENUE_COLORS));

export function normalizeVenueName(value) {
  if (value === "Polymarket_US") return "Polymarket US";
  if (value === "Underdog") return "Underdog Exchange";
  if (value === "Nadex") return "Crypto.com/Nadex";
  return value;
}

export function isPartialFlag(value) {
  return value === true || String(value).toUpperCase() === "TRUE" || value === 1 || value === "1";
}

// The competitor file carries `complete` (1 = settled day) where the Kalshi file carries
// `is_partial` — OPPOSITE polarity, and mostly blank. Measured on generation
// 2f9a29c4e22a76cee97a: 3,464 rows blank, 298 "1", and exactly ONE "0" — Polymarket US's
// current day, the venue that actually publishes the flag.
//
// Blank therefore cannot mean partial: it means the producer never said, which is the case
// for every venue that omits the column, and those days are real settled days. Only an
// EXPLICIT falsehood marks a day partial. Tested against the literal string, not via
// !isPartialFlag, so an unexpected value like "2" stays complete rather than silently
// dropping a venue's newest day out of every total on the site.
export function isIncompleteFlag(value) {
  if (value == null || value === "") return false;
  const flag = String(value).trim().toUpperCase();
  return flag === "0" || flag === "FALSE" || flag === "NO";
}

function numberOrNull(value) {
  return value == null || value === "" || Number.isNaN(+value) ? null : +value;
}

function dateValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(+date) ? null : date;
}

export function completeProphetxRows(rows) {
  const valid = (rows ?? []).filter(row => dateValue(row.date));
  const hasFlag = valid.some(row => row.complete != null && row.complete !== "");
  const newest = Math.max(...valid.map(row => +dateValue(row.date)));
  return valid.filter(row => hasFlag ? isPartialFlag(row.complete) : +dateValue(row.date) < newest);
}

export function buildPlatformSeries({kalshi = [], competitor = [], prophetx = [], cme = []} = {}) {
  const rows = [];
  for (const row of kalshi) {
    const date = dateValue(row.date);
    if (!date) continue;
    rows.push({
      date,
      venue: "Kalshi",
      contracts: numberOrNull(row.contracts_total),
      fees: numberOrNull(row.fees_total),
      revenue: numberOrNull(row.fees_total),
      partial: isPartialFlag(row.is_partial),
      complete: !isPartialFlag(row.is_partial)
    });
  }
  for (const row of competitor) {
    const venue = normalizeVenueName(row.platform);
    if (!VENUE_COLORS[venue] || venue === "Kalshi") continue;
    const date = dateValue(row.date);
    if (!date) continue;
    rows.push({
      date,
      venue,
      contracts: numberOrNull(row.contracts),
      fees: numberOrNull(row.fees),
      revenue: numberOrNull(row.fees_exchange_revenue),
      // Was hardcoded false/true, which threw away the one flag the file actually sets.
      // Polymarket US marks its current day complete=0; the homepage counted it anyway, so
      // the lead chart drew a phantom cliff at the right edge and the fee KPI ran light.
      partial: isIncompleteFlag(row.complete),
      complete: !isIncompleteFlag(row.complete)
    });
  }
  for (const row of completeProphetxRows(prophetx)) {
    rows.push({
      date: dateValue(row.date),
      venue: "ProphetX",
      contracts: numberOrNull(row.contracts),
      fees: null,
      revenue: null,
      partial: false,
      complete: true
    });
  }
  for (const row of cme) {
    const date = dateValue(row.date);
    if (!date) continue;
    rows.push({
      date,
      venue: "CME",
      // cme_daily_distributed.csv calls this column cme_total_vol. None of the three
      // generic names tried below has ever existed in that file, so every CME row got a
      // null here and was dropped by the contracts filter at the end of this function --
      // silently, because buildVenueScoreboard simply returns nothing for a venue with no
      // rows. cme_total_vol is a contract count (the producer bills it at CME's flat
      // $0.01 per contract per side), and equals cme_call_vol + cme_put_vol by construction.
      contracts: numberOrNull(row.cme_total_vol ?? row.contracts ?? row.volume ?? row.contracts_total),
      fees: numberOrNull(row.fees),
      revenue: numberOrNull(row.revenue),
      partial: false,
      complete: true,
      sparse: true
    });
  }
  return rows.filter(row => row.contracts != null).sort((a, b) => +a.date - +b.date || VENUE_ORDER.indexOf(a.venue) - VENUE_ORDER.indexOf(b.venue));
}

export function latestCompleteDate(rows) {
  const dates = (rows ?? []).filter(row => row.complete !== false && !row.partial).map(row => +dateValue(row.date)).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)) : null;
}

// Calendar days a row-based slice actually covers, inclusive of both ends.
const spanDays = slice =>
  slice.length ? Math.round((+slice.at(-1).date - +slice[0].date) / 86400000) + 1 : 0;

export function buildVenueScoreboard(rows, {windowDays = 7} = {}) {
  const grouped = new Map();
  for (const row of rows ?? []) {
    if (!grouped.has(row.venue)) grouped.set(row.venue, []);
    grouped.get(row.venue).push(row);
  }
  return VENUE_ORDER.flatMap(venue => {
    const venueRows = (grouped.get(venue) ?? []).filter(row => row.complete !== false && !row.partial && row.contracts != null).sort((a, b) => +a.date - +b.date);
    if (!venueRows.length) return [];
    const latest = venueRows.at(-1).date;
    const recent = venueRows.slice(-windowDays);
    const previous = venueRows.slice(-(windowDays * 2), -windowDays);
    const recentTotal = recent.reduce((sum, row) => sum + row.contracts, 0);
    const previousTotal = previous.reduce((sum, row) => sum + row.contracts, 0);
    const avg7Rows = venueRows.slice(-7);
    const average7 = avg7Rows.length ? avg7Rows.reduce((sum, row) => sum + row.contracts, 0) / avg7Rows.length : null;
    return [{
      venue,
      latest,
      latestVolume: venueRows.at(-1).contracts,
      average7,
      recentTotal,
      recentDays: recent.length,
      // Exposed for coverage labels and downstream validation. The comparison itself
      // is blank unless BOTH sides contain a full window; comparing seven days with a
      // thin one- or two-day base produces a precise-looking but meaningless change.
      previousDays: previous.length,
      // ...and unless both windows span the same number of CALENDAR days. The slices are
      // row-based, so on a venue that does not report daily "7 reported days" is not a
      // week. CME reports by hand-collected bulletin: measured 2026-08-25, its last 7
      // reported days spanned 7 calendar days against a prior 7 spanning 12, which
      // rendered as +2.8% where the per-calendar-day rate was +76.3% -- a table saying
      // "flat" about a venue that nearly doubled. The 30-day window this replaced hid the
      // problem (41 vs 39 days) rather than solving it; the columns say "vs prior 7", so
      // the honest move is to publish nothing when the two periods are not comparable.
      // Every other venue is 7-vs-7 today, so this costs one blank cell, and it reopens
      // by itself if CME ever reports daily.
      previousSpanDays: spanDays(previous),
      change: recent.length === windowDays && previous.length === windowDays
        && spanDays(recent) === spanDays(previous) && previousTotal > 0
        ? recentTotal / previousTotal - 1
        : null,
      coverage: `${venueRows.length.toLocaleString()} reported day${venueRows.length === 1 ? "" : "s"}`,
      sparse: venueRows.some(row => row.sparse)
    }];
  });
}

export function recentCalendarDates(rows, count = 10) {
  return [...new Set((rows ?? []).filter(row => row.venue === "Kalshi").map(row => +dateValue(row.date)))]
    .filter(Number.isFinite)
    .sort((a, b) => b - a)
    .slice(0, count)
    .map(value => new Date(value));
}

export function valueLookup(rows, field = "contracts") {
  const lookup = new Map();
  for (const row of rows ?? []) {
    if (!lookup.has(row.venue)) lookup.set(row.venue, new Map());
    lookup.get(row.venue).set(+dateValue(row.date), row[field]);
  }
  return lookup;
}
