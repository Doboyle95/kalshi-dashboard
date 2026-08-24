// Per-venue Products / Economics / Trading-behavior charts.
//
// WHY THIS EXISTS
// These charts already existed, but only as CROSS-VENUE comparisons on
// categories-venues.md, compare-fees.md and trade-size.md. A reader looking at one
// exchange had to leave its page, find the comparison, and filter back down to the
// venue they started on. The builders here are lifted from those three pages so the
// single-venue view and the comparison cannot drift apart; the comparison pages keep
// their own multi-venue framing and are unchanged.
//
// Each venue page supplies a config and calls these. Text on those pages is
// deliberately short -- one line per chart. The caveats live in the page's own
// details block, not in the caption.

// Plot and d3 are implicit globals in a page's markdown cells ONLY. This is an
// imported module, so it must import them itself -- otherwise every builder below
// throws "ReferenceError: Plot is not defined" at call time, which the build cannot see.
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export const fmtCount = n => {
  const a = Math.abs(n ?? 0), s = (n ?? 0) < 0 ? "−" : "";
  return s + (a >= 1e9 ? `${(a / 1e9).toFixed(2)}bn` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k` : String(Math.round(a)));
};
export const fmtUSD = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
export const fmtPct = n => `${((n ?? 0) * 100).toFixed(Math.abs(n ?? 0) >= 0.1 ? 1 : 2)}%`;
export const fmtPrice = p => (p == null || p === "" ? "—" : `${Number(p) % 1 === 0 ? Number(p).toFixed(0) : Number(p).toFixed(2)}¢`);
export const fmtDate = d => {
  const v = d instanceof Date ? d : d == null ? null : new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
  return v && !Number.isNaN(+v) ? v.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) : "";
};
export const asDate = d => (d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00Z`));

// ── The shared category taxonomy ────────────────────────────────────────────
// Moved here from categories-venues.md, which now imports it. It was inline there,
// and a per-venue Products page re-declaring its own copy is exactly how the venue
// view and the comparison view start disagreeing about what "Sports" means.
//
// The taxonomy is BROAD because the broadest venue sets the ceiling: Kalshi
// publishes one "Sports" value while seven others name the sport. Rolling the sports
// up is lossy and the pages say so; inventing a sport split for Kalshi would be
// worse, because it would be fabricated.
const SPORT = new Set(["Baseball", "Soccer", "Tennis", "Golf", "Basketball", "Basketball (pro)",
  "Basketball (college)", "Football", "Combat sports", "MMA", "Boxing", "Motorsport", "Hockey",
  "Cricket", "Rugby", "Table tennis", "Esports", "Aussie Rules", "Sports",
  // Novig's residual for a sport it did not name. It is still a SPORT -- letting it fall
  // through to "Other" put a grey legend swatch on a band 173 contracts tall.
  "Other sport"]);
const ECON = new Set(["Economics", "Financials", "Commodities", "Companies"]);
const POL = new Set(["Politics", "Elections"]);
const WX = new Set(["Weather", "Climate and Weather"]);
const CRYPTO = new Set(["Crypto"]);

// ⚠ "Other" is NOT one thing. At Underdog it is the combo/parlay bucket -- verified
// to three decimals against underdog_daily.contracts_parlay. At Nadex and DKeX it is
// a genuine residual, and Nadex carries a SEPARATE explicit "Parlays" value. Mapping
// "Other" globally would move a third of Underdog's book into the wrong bucket.
//
// ⚠ And the parlay VALUE itself is spelled differently on every venue that has one --
// "Parlays" at Nadex, "Parlay" at Novig, "Parlay (multi-event)" at ProphetX, "Other"
// at Underdog. A shared string match would have to guess; each venue naming its own
// value is what keeps a rename on one feed from silently re-bucketing another's book.
// Novig was missing here until 2026-08-24 and 34.6% of its contracts -- every parlay
// it has ever published -- were being drawn as grey unclassified "Other".
const PARLAY_VALUE = {
  "Nadex": new Set(["Parlays"]),
  "Novig": new Set(["Parlay"]),
  "ProphetX": new Set(["Parlay (multi-event)"]),
  "Underdog": new Set(["Other"])
};

export function bucketOf(venue, raw) {
  if ((PARLAY_VALUE[venue] ?? new Set()).has(raw)) return "Sports · parlays";
  if (SPORT.has(raw)) return "Sports";
  if (CRYPTO.has(raw)) return "Crypto";
  if (POL.has(raw)) return "Politics & elections";
  if (ECON.has(raw)) return "Economics & financials";
  if (WX.has(raw)) return "Weather & climate";
  return "Other";
}

export const BUCKETS = ["Sports", "Sports · parlays", "Crypto", "Politics & elections",
                        "Economics & financials", "Weather & climate", "Other"];

// Parlays are a lighter shade of the Sports colour so the two read as one block.
export const BUCKET_COLORS = {
  "Sports": "#0E7C6B",
  "Sports · parlays": "#7FD4C6",
  "Crypto": "var(--accent-dkex)",
  "Politics & elections": "var(--accent-polymarket)",
  "Economics & financials": "var(--accent-cme)",
  "Weather & climate": "#6366F1",
  "Other": "var(--pc-unclassified)"
};

export const bucketColor = b => BUCKET_COLORS[b] ?? "var(--pc-unclassified)";

// ── Products ────────────────────────────────────────────────────────────────

// ⚠ THE DAY KEY. `date` arrives as a Date on every page that loads {typed: true} --
// which is all of them -- and as a string anywhere that does not, so a key expression
// has to survive both. `String(d.date).slice(0, 10)` does NOT: on a Date it yields
// "Mon Aug 03", weekday-first, year-less, and a day early west of UTC. It still groups
// correctly by accident (weekday+month+day is unique inside a two-year window), which
// is exactly why it survived -- the damage shows up only when something tries to read
// the key back. Keying on the UTC-midnight timestamp round-trips exactly instead.
//
// Number, not ISO string, on purpose: toISOString() THROWS on an unparseable date and
// the page-side filter admits any truthy value, so one bad row would take the whole
// PAGE down rather than one chart. Date.UTC() returns NaN, NaN is a valid Map key under
// SameValueZero so bad rows collapse into one discardable group, and d3.min/d3.max skip
// NaN so First/Last stay right.
const utcDay = d => {
  const v = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(+v) ? NaN : Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
};
const isoDay = ms => (Number.isNaN(+ms) || ms == null ? "" : new Date(ms).toISOString().slice(0, 10));

// Category mix over time. `measure` is "Share" or "Contracts": share answers "what
// is this venue FOR", contracts answers "how big is it" -- and on a venue whose
// volume grew by orders of magnitude the two look nothing alike, which is why the
// toggle exists rather than a default.
export function categoryMix({rows, width, measure = "Share", categories, colorOf, height = 340}) {
  const byDate = d3.rollup(rows, rs => d3.sum(rs, d => +d.contracts || 0), d => utcDay(d.date));
  const share = measure === "Share";
  // ⚠ ROLL UP TO ONE ROW PER DAY PER BUCKET BEFORE PLOTTING. Every venue except Kalshi
  // publishes its categories per SPORT -- Novig sends Baseball/Tennis/Basketball/... and
  // bucketOf() folds all of them into "Sports", so a single day arrives as six or seven
  // rows that share an x AND a fill. Plot's stack transform gives each of those its own
  // sub-band at the same x and the area path is drawn through all of them in array order,
  // which is what produced the "sails" (sparse venues) and "rain" (dense ones) rendering.
  // categories-venues.md, which these builders were lifted from, has always summed into
  // the bucket the same way; the per-day version of that step was what got dropped.
  const perDay = d3.rollup(
    rows.filter(d => categories.includes(d.category)),
    rs => d3.sum(rs, d => +d.contracts || 0),
    d => utcDay(d.date),
    d => d.category
  );
  const stacked = [];
  for (const [day, byCategory] of perDay) {
    const total = byDate.get(day) || 0;
    // A day the venue did not trade has no MIX -- 0% for every bucket is a false reading,
    // not a small one, and on DKeX it punched 12 full-height holes through the band. The
    // Contracts measure keeps those days, where zero is the honest value.
    if (share && !(total > 0)) continue;
    for (const [category, contracts] of byCategory) {
      stacked.push({date: new Date(day), category, contracts, share: total > 0 ? contracts / total : 0});
    }
  }
  const points = stacked
    .filter(d => !Number.isNaN(+d.date))
    .sort((a, b) => a.date - b.date);
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 62, marginBottom: 34,
    x: {label: null, type: "utc"},
    y: share
      ? {label: "Share of contracts", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true}
      : {label: "Contracts", grid: true, tickFormat: d => fmtCount(d)},
    color: {legend: true, domain: categories, range: categories.map(colorOf)},
    marks: [
      Plot.areaY(points, {
        x: "date", y: share ? "share" : "contracts", fill: "category",
        order: categories, curve: "monotone-x", fillOpacity: 0.9,
        tip: true,
        title: d => `${d.category}\n${fmtDate(d.date)}\n${fmtCount(d.contracts)} contracts · ${fmtPct(d.share)} of the day`
      }),
      Plot.ruleY([0])
    ]
  });
}

// All-time totals behind the chart above, so a thin category is legible as a number
// even when its band is one pixel tall.
//
// ⚠ These three fields keyed on String(d.date).slice(0, 10) until 2026-08-24, which on
// the Date objects {typed: true} hands them read "Mon Aug 03". `days` came out right by
// luck, but d3.min/d3.max over those strings compare WEEKDAY NAMES alphabetically, so
// every venue's First/Last was nonsense -- Novig showed "Fri Aug 07" to "Wed Aug 19"
// for a file spanning 2026-08-04 to 2026-08-23. Same key helper as the chart above.
export function categoryTotals(rows) {
  const total = d3.sum(rows, d => +d.contracts || 0);
  return Array.from(
    d3.rollup(rows, rs => ({
      contracts: d3.sum(rs, d => +d.contracts || 0),
      days: new Set(rs.map(d => utcDay(d.date)).filter(k => !Number.isNaN(k))).size,
      firstSeen: isoDay(d3.min(rs, d => utcDay(d.date))),
      lastSeen: isoDay(d3.max(rs, d => utcDay(d.date)))
    }), d => d.category),
    ([category, v]) => ({category, ...v, share: total > 0 ? v.contracts / total : 0})
  ).sort((a, b) => b.contracts - a.contracts);
}

// Sports vs everything else. Kept separate from the category chart because on most
// of these venues it is THE structural fact and a 2-band chart states it directly.
export function sportsSplit({rows, width, color, height = 300, measure = "Share"}) {
  const data = rows
    .map(d => {
      const s = +d.contracts_sports || 0, n = +d.contracts_nonsports || 0, t = +d.contracts_total || (s + n);
      return {date: asDate(d.date), sports: s, nonsports: n, total: t, share: t > 0 ? s / t : null};
    })
    .filter(d => !Number.isNaN(+d.date) && d.total > 0)
    .sort((a, b) => a.date - b.date);
  const share = measure === "Share";
  const long = data.flatMap(d => [
    {date: d.date, kind: "Sports", value: share ? (d.share ?? 0) : d.sports, total: d.total, share: d.share},
    {date: d.date, kind: "Everything else", value: share ? 1 - (d.share ?? 0) : d.nonsports, total: d.total, share: d.share}
  ]);
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 62, marginBottom: 34,
    x: {label: null, type: "utc"},
    y: share
      ? {label: "Share of contracts", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true}
      : {label: "Contracts", grid: true, tickFormat: d => fmtCount(d)},
    color: {legend: true, domain: ["Sports", "Everything else"], range: [color, "var(--theme-foreground-muted)"]},
    marks: [
      Plot.areaY(long, {
        x: "date", y: "value", fill: "kind", order: ["Sports", "Everything else"],
        curve: "monotone-x", fillOpacity: 0.88, tip: true,
        title: d => `${fmtDate(d.date)}\n${d.kind}\n${d.share == null ? "" : `sports ${fmtPct(d.share)} of ${fmtCount(d.total)} contracts`}`
      }),
      Plot.ruleY([0])
    ]
  });
}

// ── Trading behavior ────────────────────────────────────────────────────────

// Share of daily contracts by trade-size bucket. Share of CONTRACTS, not of trade
// count -- a venue can be 99% small trades by count and still be majority
// block-traded by volume, and the second is the one that describes the book.
export function tradeSizeMix({rows, width, height = 340, measure = "Share"}) {
  const clean = rows
    .map(d => ({
      date: asDate(d.date),
      bucket: d.size_bucket,
      order: +d.bucket_order,
      contracts: +d.contracts || 0,
      trades: +d.trade_count || 0
    }))
    .filter(d => !Number.isNaN(+d.date) && d.bucket);
  const buckets = Array.from(new Set(clean.map(d => d.bucket)))
    .map(b => ({bucket: b, order: d3.min(clean.filter(d => d.bucket === b), d => d.order)}))
    .sort((a, b) => a.order - b.order)
    .map(d => d.bucket);
  const byDate = d3.rollup(clean, rs => d3.sum(rs, d => d.contracts), d => +d.date);
  const data = clean.map(d => {
    const total = byDate.get(+d.date) || 0;
    return {...d, share: total > 0 ? d.contracts / total : 0};
  });
  const share = measure === "Share";
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 62, marginBottom: 34,
    x: {label: null, type: "utc"},
    y: share
      ? {label: "Share of contracts", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true}
      : {label: "Contracts", grid: true, tickFormat: d => fmtCount(d)},
    // Size buckets are ORDERED, so this needs a sequential ramp, not a categorical
    // palette. It is Plot's own ordinal scheme rather than a var() token ramp on
    // purpose: building one would mean interpolating between two custom properties,
    // and d3.interpolate cannot resolve a var() string -- the precondition that
    // makes every other token on this site safe is that no colour MATH exists.
    color: {legend: true, domain: buckets, type: "ordinal", scheme: "YlOrBr"},
    marks: [
      Plot.areaY(data, {
        x: "date", y: share ? "share" : "contracts", fill: "bucket", order: buckets,
        curve: "monotone-x", fillOpacity: 0.92, tip: true,
        title: d => `${fmtDate(d.date)}\n${d.bucket} contracts\n${fmtCount(d.contracts)} contracts in ${fmtCount(d.trades)} trades · ${fmtPct(d.share)} of the day`
      }),
      Plot.ruleY([0])
    ]
  });
}

// Where a venue's volume sits on the 0-100c probability axis. This is BEHAVIOUR --
// what price people choose to trade at -- and is not calibration; it says nothing
// about whether those prices were right.
export function volumeAtPrice({bins, width, color, height = 330, measure = "Contracts"}) {
  const total = d3.sum(bins, d => (measure === "Dollars" ? d.dollars : d.contracts) || 0);
  const data = bins
    .map(d => {
      const v = (measure === "Dollars" ? d.dollars : d.contracts) || 0;
      return {...d, midpoint: d.price_bin + (d.width ?? 5) / 2, value: total > 0 ? 100 * v / total : 0, raw: v};
    })
    .sort((a, b) => a.price_bin - b.price_bin);
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 62, marginBottom: 44,
    x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
    y: {label: `Share of ${measure.toLowerCase()} (%)`, grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.rectY(data, {
        x1: d => d.price_bin, x2: d => d.price_bin + (d.width ?? 5),
        y: "value", fill: color, fillOpacity: 0.85,
        stroke: "var(--theme-background)", strokeWidth: 1
      }),
      Plot.dot(data, {
        x: "midpoint", y: "value", r: 8, fill: "transparent", tip: true,
        title: d => `${d.price_bin}–${d.price_bin + (d.width ?? 5)}¢\n${d.value.toFixed(2)}% of ${measure.toLowerCase()}\n${measure === "Dollars" ? fmtUSD(d.raw) : `${fmtCount(d.raw)} contracts`}`
      })
    ]
  });
}

// ── Large trades ────────────────────────────────────────────────────────────
// Lifted from trade-size.md so the venue page and the comparison rank identically.

export const RANK_METRICS = {"Contracts": "contracts", "One-party stake": "one_party_stake", "Taker stake": "taker_stake"};

// ⚠ TAKER STAKE IS NOT UNIVERSAL. Novig is the only competitor publishing an
// aggressor flag. On every other venue there is no taker to attribute a stake to,
// so the option is ABSENT rather than shown blank.
export function metricsFor(largeTrades, venue) {
  const hasTaker = largeTrades.some(d => d.venue === venue && d.metric === "taker_stake");
  return hasTaker ? ["Contracts", "One-party stake", "Taker stake"] : ["Contracts", "One-party stake"];
}

export function largeTradeRows(largeTrades, {venue, table, metricLabel}) {
  const metricKey = RANK_METRICS[metricLabel];
  return largeTrades
    .filter(d => d.venue === venue && d.table === table && d.metric === metricKey)
    .sort((a, b) => +a.rank - +b.rank)
    .map(d => ({
      rank: +d.rank,
      date: d.date,
      market: d.market_name || d.ticker_name,
      contracts: +d.contracts_traded || 0,
      price: d.price,
      // "contracts" is the metric NAME, not a column: the count lives in contracts_traded.
      // Indexing the row by the metric name resolves for the two stake metrics and yields
      // undefined -> 0 for this one, so the ranking column read 0 on every row.
      metric_value: metricKey === "contracts" ? +d.contracts_traded || 0 : +d[metricKey] || 0,
      pct_of_market: d.pct_of_market === "" || d.pct_of_market == null ? null : +d.pct_of_market,
      window_left_censored: String(d.window_left_censored) === "true" || +d.window_left_censored === 1
    }));
}

// ── Economics ───────────────────────────────────────────────────────────────

// ⚠ Crypto.com/Nadex REDENOMINATED TWICE ($100 -> $10 -> $1) and competitor_daily.csv
// counts one of each as one contract. Without this restatement its first 141 days
// draw at 100c per contract against Kalshi's 0.84c -- a 119x cost gap that never
// existed, since $1.00 on a $100 contract is the same ~1%.
export const contractDollars = (venue, date) => {
  if (venue !== "Crypto.com/Nadex") return 1;
  const t = +asDate(date);
  return t < Date.UTC(2025, 4, 13) ? 100 : t < Date.UTC(2025, 7, 5) ? 10 : 1;
};

export function feeRows(rows, venue) {
  return rows
    .map(d => ({
      date: asDate(d.date),
      contracts: +d.contracts || 0,
      fees: d.fees == null || d.fees === "" ? null : +d.fees
    }))
    .filter(d => !Number.isNaN(+d.date) && d.contracts > 0 && d.fees != null && d.fees > 0)
    .map(d => ({...d, centsPerContract: 100 * d.fees / (d.contracts * contractDollars(venue, d.date))}))
    .sort((a, b) => a.date - b.date);
}

export function feesDaily({rows, width, color, height = 300, cumulative = false}) {
  let run = 0;
  const data = rows.map(d => ({...d, cum: (run += d.fees)}));
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 72, marginBottom: 34,
    x: {label: null, type: "utc"},
    y: {label: cumulative ? "Cumulative fees ($)" : "Fees ($)", grid: true, tickFormat: d => fmtUSD(d)},
    marks: [
      Plot.ruleY([0]),
      cumulative
        ? Plot.areaY(data, {x: "date", y: "cum", fill: color, fillOpacity: 0.2, curve: "monotone-x"})
        : Plot.rectY(data, {x: "date", y: "fees", fill: color, fillOpacity: 0.85, interval: "day"}),
      cumulative ? Plot.line(data, {x: "date", y: "cum", stroke: color, strokeWidth: 2, curve: "monotone-x"}) : null,
      Plot.tip(data, Plot.pointerX({
        x: "date", y: cumulative ? "cum" : "fees",
        title: d => `${fmtDate(d.date)}\n${fmtUSD(cumulative ? d.cum : d.fees)}${cumulative ? " cumulative" : ""}\n${fmtCount(d.contracts)} contracts · ${d.centsPerContract.toFixed(3)}¢ per $1`
      }))
    ].filter(Boolean)
  });
}

// The effective rate. On a venue charging a flat fee this is a FLAT LINE, and that
// is the finding -- the page says so rather than implying a discovered pattern.
export function realizedRate({rows, width, color, height = 300}) {
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width, height, marginLeft: 72, marginBottom: 34,
    x: {label: null, type: "utc"},
    y: {label: "Fee per $1 of contract (¢)", grid: true, zero: true},
    marks: [
      Plot.ruleY([0]),
      Plot.line(rows, {x: "date", y: "centsPerContract", stroke: color, strokeWidth: 1.8, curve: "monotone-x"}),
      Plot.tip(rows, Plot.pointerX({
        x: "date", y: "centsPerContract",
        title: d => `${fmtDate(d.date)}\n${d.centsPerContract.toFixed(3)}¢ per $1 of contract\n${fmtUSD(d.fees)} on ${fmtCount(d.contracts)} contracts`
      }))
    ]
  });
}

// Does the effective rate MOVE, or is it a posted number the venue changed once?
//
// ⚠ Counting distinct values answers this wrongly. ForecastEx has 98 distinct rates
// and looks like it varies -- but they are rounding noise around exactly two levels,
// 0.50c on 564 days and 1.00c on 112, which is a fee-schedule change and not a
// response to what traded. So cluster at 0.05c first and judge on the clusters.
//
// Measured 2026-08-21: ForecastEx 2 clusters / 100% covered, Crypto.com/Nadex 2 / 100%,
// DKeX 1 / 100%; against Polymarket US 19 clusters with the top two covering only 48%
// and Underdog 14 covering 36%. The two groups are not close, so the threshold is not
// delicate.
export function rateShape(rows) {
  const rates = rows.map(d => d.centsPerContract);
  const lo = Math.min(...rates), hi = Math.max(...rates);
  const clusters = new Map();
  for (const v of rates) {
    const k = (Math.round(v / 0.05) * 0.05).toFixed(2);
    clusters.set(k, (clusters.get(k) ?? 0) + 1);
  }
  const ranked = Array.from(clusters, ([cents, days]) => ({cents: +cents, days})).sort((a, b) => b.days - a.days);
  const covered = ranked.slice(0, 3).reduce((a, d) => a + d.days, 0) / Math.max(1, rates.length);
  const posted = ranked.length <= 3 && covered >= 0.95;
  return {
    lo, hi,
    spread: lo > 0 ? hi / lo : null,
    clusters: ranked.length,
    // Levels in price order, so a caption reads them low-to-high rather than by
    // however many days each happened to run for.
    levels: ranked.filter(d => d.days / rates.length >= 0.02).map(d => d.cents).sort((a, b) => a - b),
    posted,
    flat: posted && ranked.length === 1
  };
}
