export const VENUE_COLORS = Object.freeze({
  Kalshi: "#00C2A8",
  "Polymarket US": "#3B7DD8",
  ForecastEx: "#E53535",
  DKeX: "#F97316",
  "Underdog Exchange": "#EAB308",
  ProphetX: "#DB2777",
  Novig: "#6366F1",
  Rothera: "#00C805",
  "Crypto.com/Nadex": "#9C27B0",
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
      partial: false,
      complete: true
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

export function buildVenueScoreboard(rows, {windowDays = 30} = {}) {
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
      // Exposed so a caller can require BOTH sides of the comparison to be full.
      // `change` alone only guarantees previousTotal > 0, so a venue with three
      // reported days behind it can post a huge percentage off a thin base --
      // harmless in a 30-day window, much easier to hit in a 7-day one.
      previousDays: previous.length,
      change: previousTotal > 0 ? recentTotal / previousTotal - 1 : null,
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
