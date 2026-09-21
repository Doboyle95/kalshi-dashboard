// Date windows carried in the page URL: ?from=YYYY-MM-DD&to=YYYY-MM-DD, or ?days=N.
//
// Embed links (?embed=<section id>, see components/embed-mode.js) and shared links need
// to open a chart on a chosen window. Every date brush on the site -- the shared
// renderDateBrush() and the page-local makeBrush()/makeDateBrush() copies -- takes its
// STARTING window from urlDateRange(), so one URL format drives all of them. With no
// such parameter every function here hands its input straight back, so a page loaded
// without one behaves exactly as it did before this file existed.
//
//   days=N   the last N days of THIS chart's data; rolling, and wins over from/to
//   from=D   first day, inclusive; with no `to` the window runs to the newest data
//   to=D     last day, inclusive; with no `from` the page's own start is kept
//
// Days are UTC, matching the dates {typed: true} CSV loading produces. A window is
// clamped to each chart's own data, and one that clamps to nothing falls back to the
// page default -- a stale link should show the usual chart, never an empty one.
//
// No d3 and no Framework globals: this is imported by page cells AND by date-brush.js,
// and a free `d3` in a module is a ReferenceError at runtime (check-module-globals.mjs).

const DAY_MS = 86400000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_DAYS = 36600;

function parseDay(value) {
  const match = ISO_DAY.exec(String(value ?? "").trim());
  if (!match) return null;
  const [year, month, day] = [+match[1], +match[2], +match[3]];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-31 over into March; a mistyped day should not.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function formatDay(date) {
  return new Date(+date).toISOString().slice(0, 10);
}

export function sameDay(a, b) {
  return a != null && b != null && formatDay(a) === formatDay(b);
}

export function readRangeParams(search = globalThis.location?.search ?? "") {
  const params = new URLSearchParams(search);
  const days = Number(params.get("days"));
  return {
    from: parseDay(params.get("from")),
    to: parseDay(params.get("to")),
    days: Number.isInteger(days) && days > 0 && days <= MAX_DAYS ? days : null
  };
}

// fallback: the [start, end] the page would show; domain: this chart's data extent.
// Returns `fallback` itself (same array) when the URL does not change anything, so a
// caller can test `result !== fallback`.
export function urlDateRange(fallback, domain, params = readRangeParams()) {
  if (!(params.from || params.to || params.days)) return fallback;
  if (!fallback?.[0] || !fallback?.[1] || !domain?.[0] || !domain?.[1]) return fallback;
  const low = +domain[0], high = +domain[1];
  let start, end;
  if (params.days) {
    end = high;
    start = high - (params.days - 1) * DAY_MS;
  } else {
    start = params.from ? +params.from : +fallback[0];
    end = params.to ? +params.to : params.from ? high : +fallback[1];
  }
  start = Math.max(start, low);
  end = Math.min(end, high);
  if (!(start < end)) return fallback;
  if (start === +fallback[0] && end === +fallback[1]) return fallback;
  return [new Date(start), new Date(end)];
}

// The URL parameters that reopen a brush's CURRENT window, for the Embed button.
// Unchanged from the page default -> none, so the embed keeps following the page's own
// window as new data lands. A quick-range button ("30d") stays rolling (days=30). A
// window that runs to the newest data keeps a rolling end (from only); one that stops
// earlier is fixed (from + to).
export function rangeParams({range, domain, defaultRange, quickDays = null}) {
  if (!range?.[0] || !range?.[1] || !domain?.[0] || !domain?.[1]) return {};
  if (defaultRange && sameDay(range[0], defaultRange[0]) && sameDay(range[1], defaultRange[1])) return {};
  if (quickDays != null && Number(quickDays) > 0) {
    return Number.isFinite(Number(quickDays)) ? {days: String(quickDays)} : {from: formatDay(domain[0])};
  }
  const params = {from: formatDay(range[0])};
  if (!sameDay(range[1], domain[1])) params.to = formatDay(range[1]);
  return params;
}

// components/chart-actions.js is an inline script, not a module, so it cannot import
// rangeParams. It finds brushes by this attribute and asks each for its parameters.
export function tagDateBrush(node, getState) {
  node.setAttribute("data-date-brush", "");
  node.dateBrushParams = () => rangeParams(getState());
  return node;
}

// Hand a URL window to a page's onSelect before any chart has read the page default.
// Synchronous on purpose: when the page's Mutable is declared in the same cell as the
// brush (the usual pattern), it has not yielded its first value yet, so the charts
// compute ONCE, with the URL window. A throw -- say the callback closes over a const not
// initialised yet -- is retried once on a microtask instead of surfacing as an error.
export function pushInitialRange(onSelect, range) {
  if (typeof onSelect !== "function") return;
  try {
    onSelect(range);
  } catch {
    queueMicrotask(() => { try { onSelect(range); } catch { /* keep the page default */ } });
  }
}

// For the page-local brushes: an <svg> whose .value is [start, end], driven by a
// d3.brushX on `brushG`. Call as the function's last step, in place of `svg.node()`:
//   return dateBrushFromUrl(svg.node(), {x, brush, brushG});
// view() reads .value when the cell resolves, so the charts start on the URL window.
export function dateBrushFromUrl(node, {x, brush, brushG}) {
  const initial = node.value;
  const domain = x.domain();
  const range = urlDateRange(initial, domain);
  if (range !== initial) {
    brushG.call(brush.move, range.map(x));   // programmatic: the brush handlers ignore it
    node.value = range;
  }
  return tagDateBrush(node, () => ({range: node.value, domain, defaultRange: initial}));
}
