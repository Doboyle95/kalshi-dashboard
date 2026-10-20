// Time of day and time of week for one venue, in Eastern time.
//
// WHY THIS EXISTS
// Kalshi's activity page shows when the market trades: an hour-of-day profile and a day-by-hour
// grid. The other venues had no equivalent, although their tapes carry a timestamp on every
// print. competitor_trades_by_hour.csv (KalshiData python/build_competitor_hourly.py) counts each
// venue's prints per ET date and hour, so one builder can draw all of them.
//
// Only COMPLETE ET dates are used. A date is complete once the venue's raw files run past it,
// which the producer records in the `complete` column; the newest date is still trading.
//
// Plot and d3 are implicit globals in a page's markdown cells ONLY. This is an imported module,
// so it imports them itself (see parlay-series.js).
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export const HOUR_WINDOWS = ["30 days", "90 days", "All"];
export const HOUR_METRICS = ["Contracts", "Trades"];

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fmt = n => {
  const a = Math.abs(n ?? 0);
  return a >= 1e9 ? `${(a / 1e9).toFixed(2)}bn`
    : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M`
    : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k`
    : d3.format(",.0f")(a);
};

// Monday = 0. The CSV's dates are read as UTC midnight, so getUTCDay is the calendar weekday.
const dowOf = t => (new Date(t).getUTCDay() + 6) % 7;

const keyOf = metric => (metric === "Trades" ? "trades" : "contracts");

/**
 * The newest `window` complete dates for one venue's rows. "All" keeps every complete date.
 * Returns the rows plus the count and span of the dates kept, so captions can say what they cover.
 */
export function windowRows(rows, window) {
  const done = (rows ?? []).filter(d => +d.complete === 1 && d.date instanceof Date);
  const dates = [...new Set(done.map(d => +d.date))].sort((a, b) => b - a);
  const keep = window === "All" ? dates : dates.slice(0, parseInt(window, 10));
  const kept = new Set(keep);
  return {
    rows: done.filter(d => kept.has(+d.date)),
    nDays: keep.length,
    from: keep.length ? new Date(Math.min(...keep)) : null,
    to: keep.length ? new Date(Math.max(...keep)) : null
  };
}

/** Total of the chosen measure for each hour of day, across the window. */
export function hourOfDay(rows, metric) {
  const key = keyOf(metric);
  const byHour = d3.rollup(rows, v => d3.sum(v, d => +d[key]), d => +d.hour_et);
  return d3.range(24).map(hour => ({hour, value: byHour.get(hour) ?? 0}));
}

/**
 * Average of the chosen measure per (weekday, hour). Each cell divides by the number of dates in
 * the window that fall on that weekday, so a Monday is not diluted by the Sundays around it.
 */
export function weekHourGrid(rows, metric) {
  const key = keyOf(metric);
  const dates = [...new Set(rows.map(d => +d.date))];
  const perDow = d3.range(7).map(dow => dates.filter(t => dowOf(t) === dow).length);
  const sums = d3.rollup(rows, v => d3.sum(v, d => +d[key]), d => dowOf(+d.date), d => +d.hour_et);
  const cells = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const total = sums.get(dow)?.get(hour) ?? 0;
      cells.push({dow, dowName: DOW[dow], hour, value: perDow[dow] ? total / perDow[dow] : 0});
    }
  }
  return cells;
}

/** Average per hour on an ordinary day in the window, as bars. */
export function hourBars({profile, nDays, color, metric, width, height = 260}) {
  const unit = metric.toLowerCase();
  const data = profile.map(d => ({...d, avg: nDays ? d.value / nDays : 0}));
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height,
    marginLeft: 64,
    marginBottom: 40,
    x: {label: "Hour of day, Eastern time", domain: [0, 24], ticks: 12, tickFormat: h => `${h}:00`},
    y: {label: `Average ${unit} per hour`, grid: true, tickFormat: fmt},
    marks: [
      Plot.rectY(data, {
        x1: "hour", x2: d => d.hour + 1, y: "avg", fill: color, fillOpacity: 0.9, tip: true,
        title: d => `${d.hour}:00 to ${d.hour + 1}:00 ET\n${fmt(d.avg)} ${unit} on an average day`
      }),
      Plot.ruleY([0])
    ]
  });
}

/** Day of week by hour of day, coloured by the average per such hour. */
export function weekGrid({cells, color, metric, width, height = 240}) {
  const unit = metric.toLowerCase();
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height,
    marginLeft: 48,
    marginBottom: 40,
    x: {label: "Hour of day, Eastern time", domain: d3.range(24), tickFormat: h => (h % 3 === 0 ? `${h}` : "")},
    y: {label: null, domain: DOW},
    color: {scheme: "YlGnBu", legend: true, label: `Average ${unit} per hour`, tickFormat: fmt},
    marks: [
      Plot.cell(cells, {
        x: "hour", y: "dowName", fill: "value", inset: 0.5, tip: true,
        title: d => `${d.dowName} ${d.hour}:00 to ${d.hour + 1}:00 ET\n${fmt(d.value)} ${unit} on an average ${d.dowName}`
      })
    ]
  });
}
