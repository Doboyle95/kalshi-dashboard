// The parlay activity chart, shared by every venue that sells parlays.
//
// WHY THIS EXISTS
// The site could only ever show parlay activity in CONTRACTS. A contract is face value,
// not money: a ten-leg ticket bought at half a cent and a two-leg ticket bought at forty
// cents count the same. Every producer that can now emits the dollar figure on the same
// grain, so each of these charts carries two toggles — daily/monthly and contracts/stakes
// — and one builder draws them all rather than six pages drifting apart.
//
// Plot and d3 are implicit globals in a page's markdown cells ONLY. This is an imported
// module, so it must import them itself — otherwise every call throws "ReferenceError:
// Plot is not defined" at call time, which the build cannot see.
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

// ── Wording, declared once ──────────────────────────────────────────────────
// The toggles themselves have to be built on the page (Framework's `view` is a cell
// builtin, not importable), so the labels live here instead and every page spells them
// the same way.
export const GRANULARITIES = ["Monthly", "Daily"];
export const METRICS = ["volume", "stakes"];
export const metricLabel = m => (m === "volume" ? "Volume (contracts)" : "Taker stakes ($)");

export const fmtCount = n => {
  const a = Math.abs(n ?? 0), s = (n ?? 0) < 0 ? "−" : "";
  return s + (a >= 1e9 ? `${(a / 1e9).toFixed(2)}bn`
    : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M`
    : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k`
    : d3.format(",.0f")(a));
};
export const fmtUSD = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));

const asDate = v => (v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00Z`));
const dayKey = v => d3.utcFormat("%Y-%m-%d")(asDate(v));
const monthStart = v => {
  const d = asDate(v);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

/**
 * Normalise one venue's rows into the shape the chart wants.
 *
 * Several producers publish more than one row per day (Kalshi splits by class and leg
 * bucket, Novig by leg count), so this sums to one row per day rather than assuming the
 * caller pre-aggregated — summing a per-leg file straight into a bar chart is how a day
 * ends up drawn several times over.
 *
 * `complete` is optional and defaults to complete. A row that says it is incomplete
 * marks its whole period partial, because a partial day inside a month makes the month
 * partial too.
 */
export function toDailyParlay(rows, {date, contracts, stake = null, complete = null, venue = null, keep = null} = {}) {
  const get = (acc, r) => (typeof acc === "function" ? acc(r) : r[acc]);
  const by = new Map();
  for (const r of rows ?? []) {
    const raw = date == null ? null : get(date, r);
    if (raw == null || raw === "") continue;
    const k = dayKey(raw);
    const c = +get(contracts, r) || 0;
    const s = stake == null ? null : +get(stake, r) || 0;
    const done = complete == null ? true : Boolean(+get(complete, r));
    const cur = by.get(k) ?? {
      date: asDate(raw), day: k, contracts: 0,
      stake: stake == null ? null : 0,
      venue: venue == null ? null : 0,
      complete: true
    };
    cur.contracts += c;
    if (s != null) cur.stake += s;
    // The venue's own all-markets total for the day, so the tooltip can say what share of
    // the exchange this was. A file that repeats the same day total on every one of its
    // rows (one row per leg count, say) must pass it via a Map lookup, not the column, or
    // the denominator gets counted once per row and the share reads far too small.
    if (venue != null) cur.venue += +get(venue, r) || 0;
    cur.complete = cur.complete && done;
    if (keep) keep(cur, r);
    by.set(k, cur);
  }
  return [...by.values()].sort((a, b) => a.date - b.date);
}

/**
 * Daily rows -> the bars actually drawn. Monthly sums the days it holds; it does NOT
 * come from a second file, so the two granularities can never disagree about a venue's
 * total the way two producers on two bases would.
 *
 * x1/x2 are set explicitly rather than with Plot's `interval` mark option: on a mark,
 * `interval` applies to the mark's VALUE dimension, and getting that wrong renders every
 * bar identical and full-height with a dead tooltip — silently.
 */
const RESERVED = new Set(["date", "day", "label", "x1", "x2", "days", "complete", "contracts", "stake", "venue"]);

export function rollupParlay(daily, granularity) {
  // Anything else a page attached with `keep` (trade counts, fees) is carried into the
  // monthly bars by summing it, so a tooltip line does not silently vanish on one of the
  // two granularities.
  const extraKeys = daily?.length
    ? Object.keys(daily[0]).filter(k => !RESERVED.has(k) && typeof daily[0][k] === "number")
    : [];
  if (granularity !== "Monthly") {
    return daily.map(d => ({
      ...d,
      x1: d.date,
      x2: d3.utcDay.offset(d.date, 1),
      label: d3.utcFormat("%b %-d, %Y")(d.date),
      days: 1
    }));
  }
  const by = new Map();
  for (const d of daily) {
    const k = +monthStart(d.date);
    const cur = by.get(k) ?? {
      date: new Date(k), contracts: 0,
      stake: d.stake == null ? null : 0,
      venue: d.venue == null ? null : 0,
      complete: true, days: 0
    };
    cur.contracts += d.contracts;
    if (cur.stake != null) cur.stake += d.stake ?? 0;
    if (cur.venue != null) cur.venue += d.venue ?? 0;
    for (const key of extraKeys) cur[key] = (cur[key] ?? 0) + (+d[key] || 0);
    cur.complete = cur.complete && d.complete;
    cur.days += 1;
    by.set(k, cur);
  }
  const out = [...by.values()].sort((a, b) => a.date - b.date);
  // A month is also partial when it simply has not finished yet — the last bar of a
  // monthly series is a part-month on every venue, every month, and drawn flat it reads
  // as a collapse in volume rather than as today.
  const now = new Date();
  const thisMonth = +new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (const m of out) {
    if (+m.date === thisMonth) m.complete = false;
    m.x1 = m.date;
    m.x2 = d3.utcMonth.offset(m.date, 1);
    m.label = d3.utcFormat("%B %Y")(m.date);
  }
  return out;
}

/**
 * The chart. `metric` picks the height; the tooltip always shows BOTH numbers, so
 * flipping the toggle never hides the one the reader was reading.
 *
 * `volumeUnit: "dollars"` is for the venues whose contracts are $1 claims (Polymarket
 * US, Crypto.com/Nadex): there the contract count IS a dollar figure and labelling it as
 * a bare count understates what the axis means.
 */
export function parlayChart({
  daily,
  granularity = "Monthly",
  metric = "volume",
  color = "var(--accent-kalshi)",
  width = 640,
  height = 300,
  volumeUnit = "contracts",
  extraTip = null,
  marginLeft = 76
} = {}) {
  const rows = rollupParlay(daily ?? [], granularity);
  const stakes = metric === "stakes";
  const volIsUSD = volumeUnit === "dollars";
  const fmtVol = volIsUSD ? fmtUSD : fmtCount;
  const value = d => (stakes ? d.stake ?? 0 : d.contracts);
  const period = granularity === "Monthly" ? "Monthly" : "Daily";
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height,
    marginLeft,
    x: {type: "utc", label: null},
    y: {
      label: stakes ? `${period} parlay stakes ($)`
        : `${period} parlay volume (${volIsUSD ? "$ of contracts" : "contracts"})`,
      grid: true,
      tickFormat: d => (stakes || volIsUSD ? fmtUSD(d) : fmtCount(d))
    },
    marks: [
      Plot.rectY(rows, {
        x1: "x1", x2: "x2", y: value, fill: color,
        // The final period is always still filling. Fading it says so without dropping
        // it, which is the alternative that makes a live series look like it stopped.
        fillOpacity: d => (d.complete ? 0.9 : 0.42),
        tip: true,
        title: d => [
          d.label,
          `Volume: ${fmtVol(d.contracts)}${volIsUSD ? "" : " contracts"}`,
          d.stake == null ? null : `Taker stakes: ${fmtUSD(d.stake)}`,
          d.stake == null || !d.contracts ? null
            : `Average price paid: ${(100 * d.stake / d.contracts).toFixed(1)}¢`,
          d.venue ? `${(100 * d.contracts / d.venue).toFixed(2)}% of the venue's contracts` : null,
          extraTip ? extraTip(d) : null,
          d.complete ? null : granularity === "Monthly" ? "Month still in progress" : "Day still in progress"
        ].filter(Boolean).join("\n")
      }),
      Plot.ruleY([0])
    ]
  });
}

/** Headline totals for a one-line caption under the chart. */
export function parlayTotals(daily) {
  const rows = daily ?? [];
  const contracts = d3.sum(rows, d => d.contracts);
  const hasStake = rows.some(d => d.stake != null);
  const stake = hasStake ? d3.sum(rows, d => d.stake ?? 0) : null;
  return {
    contracts,
    stake,
    hasStake,
    avgPrice: hasStake && contracts ? stake / contracts : null,
    from: rows.length ? rows[0].date : null,
    to: rows.length ? rows[rows.length - 1].date : null
  };
}
