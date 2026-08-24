// Venue calibration charts, shared by the per-venue Outcomes pages.
//
// WHY THIS EXISTS
// Six venues publish a calibration file and no two of them agree on a schema:
// column names differ (n_contracts vs contracts, se_clustered vs se_wt vs
// se_calib_error), bin widths differ (5c everywhere, plus a 10c cut on DKeX and
// ProphetX), and -- the part that actually changes answers -- they disagree on
// what the x-axis MEANS. So the normalisation stays on each page, where the
// venue's own caveat is written next to it, and only the drawing is shared.
//
// ⚠ THE X-AXIS IS THE WHOLE BALLGAME
// A 0-5c bin is not "2.5c". On every venue measured, the contract-weighted price
// actually PAID in that bin sits well below the midpoint, because the bin is
// mostly longshots trading at one and two cents. Measuring the win rate against
// the midpoint therefore books the difference between the midpoint and the real
// price as "mispricing" that nobody ever paid for. Measured on Polymarket US
// ALL_DEEP the day this was written: bin 0 reads -0.64c against the midpoint and
// -0.28c against the price paid -- 2.3x overstated, in the single biggest bin on
// the venue. Every page here passes the price PAID.
//
// This is also the live defect the 2026-08-21 data audit ranked first, on
// /compare-accuracy, which still mixes the two bases across venues. These pages
// do not; do not "make them consistent" with that page by reverting them.

// Plot is an implicit global in a page's markdown cells ONLY. This is an imported
// module, so it must import Plot itself -- otherwise every chart below throws
// "ReferenceError: Plot is not defined" at call time, which the build cannot see.
import * as Plot from "npm:@observablehq/plot";

// Build a normalized row set from one venue's rows via accessors, so each page
// names its own columns once and everything downstream is uniform.
//
// Accessors are functions of the raw row. `implied` MUST return the mean price
// actually paid, as a probability in [0,1] -- not the bin midpoint.
export function normalizeCalibration(rows, {bin, width, implied, actual, se, contracts, trades, events}) {
  const num = v => (v == null || v === "" || Number.isNaN(+v) ? null : +v);
  return rows
    .map(d => {
      const b = num(bin(d));
      const w = num(width(d)) ?? 5;
      const imp = num(implied(d));
      const act = num(actual(d));
      // An absent SE types to null and would coerce to 0 -- a zero-length whisker
      // reads as PERFECT precision, the opposite of what a missing SE means. Keep
      // it null so the interval mark is suppressed instead of drawn at zero.
      const s = num(se(d));
      if (b == null || imp == null || act == null) return null;
      const err = act - imp;
      return {
        bin: b,
        width: w,
        band: `${b}–${b + w}¢`,
        implied: imp,
        actual: act,
        error: err,
        se: s,
        // |t| against the price paid. Null SE means unmeasurable, NOT significant.
        t: s != null && s > 0 ? Math.abs(err) / s : null,
        clears: s != null && s > 0 ? Math.abs(err) > 2 * s : false,
        contracts: num(contracts?.(d)),
        trades: num(trades?.(d)),
        events: num(events?.(d))
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.bin - b.bin);
}

const pct = (v, dp = 1) => `${(100 * v).toFixed(dp)}%`;
const cents = (v, dp = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(100 * v).toFixed(dp)}¢`;
const count = n => (n == null ? "—" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}bn` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : Math.round(n).toLocaleString());

export function calibrationTip(d, {eventNoun = "events"} = {}) {
  const lines = [
    `${d.band} band`,
    `Paid ${(100 * d.implied).toFixed(2)}¢ · won ${pct(d.actual, 2)} of contracts`,
    `Error: ${cents(d.error)}${d.t != null ? `  (|t| = ${d.t.toFixed(2)})` : ""}`
  ];
  if (d.se != null) lines.push(`Clustered SE: ${(100 * d.se).toFixed(2)}¢`);
  else lines.push("No clustered SE — not measurable");
  const tail = [];
  if (d.events != null) tail.push(`${Math.round(d.events).toLocaleString()} ${eventNoun}`);
  if (d.contracts != null) tail.push(`${count(d.contracts)} contracts`);
  if (d.trades != null) tail.push(`${count(d.trades)} trades`);
  if (tail.length) lines.push(tail.join("  ·  "));
  return lines.join("\n");
}

// Actual vs implied, on a square 0-100% frame with the 45-degree diagonal.
//
// r is the RAW event count through an explicit sqrt scale. Passing an
// already-square-rooted value renders radius proportional to n^0.25, because
// Plot's r scale is itself sqrt by default -- which silently falsifies the
// "circle area is proportional to events" claim in the legend.
export function actualVsImplied({rows, color, width, height, eventNoun = "events", xLabel = "Price paid", yLabel = "Actual win rate"}) {
  const sized = rows.some(d => d.events != null);
  const maxEvents = sized ? Math.max(...rows.map(d => d.events ?? 0)) : 0;
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: height ?? Math.max(360, Math.min(520, width * 0.72)),
    marginLeft: 58,
    marginBottom: 46,
    x: {label: xLabel, domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}¢`, grid: true},
    y: {label: yLabel, domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
    ...(sized && maxEvents > 0 ? {r: {type: "sqrt", domain: [0, maxEvents], range: [0, 12]}} : {}),
    marks: [
      Plot.line([{x: 0, y: 0}, {x: 1, y: 1}], {
        x: "x", y: "y",
        stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1.5
      }),
      Plot.ruleX(rows.filter(d => d.se != null), {
        x: "implied",
        y1: d => d.actual - 2 * d.se,
        y2: d => d.actual + 2 * d.se,
        stroke: color, strokeOpacity: 0.45, strokeWidth: 1.4
      }),
      Plot.dot(rows, {
        x: "implied", y: "actual",
        ...(sized && maxEvents > 0 ? {r: d => d.events ?? 0} : {r: 5}),
        fill: color, fillOpacity: 0.82,
        stroke: "var(--theme-background)", strokeWidth: 1,
        tip: true, title: d => calibrationTip(d, {eventNoun})
      })
    ]
  });
}

// Calibration error by price band. Colour carries DIRECTION only -- these are the
// sign-branching semantic tokens, not a categorical palette, so --accent-positive
// / --accent-negative are the right names here (they have real dark variants).
//
// Opacity deliberately does NOT encode confidence: a band whose interval crosses
// zero is still a measurement, and fading it reads as "discarded". The whiskers
// already say how precisely each band is pinned down.
export function errorByPrice({rows, width, height, eventNoun = "events", xLabel = "Price paid (¢)", yLabel = "Calibration error (actual − paid, ¢)"}) {
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: height ?? 320,
    marginLeft: 62,
    marginBottom: 44,
    x: {label: xLabel, domain: [0, 100], grid: true},
    y: {label: yLabel, grid: true, tickFormat: d => (100 * d).toFixed(1)},
    marks: [
      Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.2}),
      Plot.rectY(rows, {
        x1: d => d.bin,
        x2: d => d.bin + d.width,
        y: "error",
        fill: d => (d.error > 0 ? "var(--accent-positive)" : "var(--accent-negative)"),
        fillOpacity: 0.9,
        stroke: "var(--theme-background)", strokeWidth: 1
      }),
      Plot.ruleX(rows.filter(d => d.se != null), {
        x: d => d.bin + d.width / 2,
        y1: d => d.error - 2 * d.se,
        y2: d => d.error + 2 * d.se,
        stroke: "var(--theme-foreground-muted)", strokeWidth: 1.3
      }),
      Plot.dot(rows, {
        x: d => d.bin + d.width / 2, y: "error",
        r: 9, fill: "transparent",
        tip: true, title: d => calibrationTip(d, {eventNoun})
      })
    ]
  });
}

// One line under each pair of charts, built from the data rather than typed in,
// so it cannot go stale the way a hand-written count does.
export function calibrationVerdict(rows, {eventNoun = "events"} = {}) {
  const measurable = rows.filter(d => d.se != null);
  const clearing = measurable.filter(d => d.clears);
  const totalContracts = rows.reduce((a, d) => a + (d.contracts ?? 0), 0);
  const weighted = totalContracts > 0
    ? {
        paid: rows.reduce((a, d) => a + (d.implied * (d.contracts ?? 0)), 0) / totalContracts,
        won: rows.reduce((a, d) => a + (d.actual * (d.contracts ?? 0)), 0) / totalContracts
      }
    : null;
  return {
    bands: rows.length,
    measurable: measurable.length,
    clearing: clearing.length,
    clearingBands: clearing.map(d => d.band),
    totalContracts,
    eventNoun,
    ...(weighted ? {meanPaid: weighted.paid, meanWon: weighted.won, tilt: weighted.won - weighted.paid} : {})
  };
}

export {pct as fmtPct, cents as fmtCents, count as fmtCount};
