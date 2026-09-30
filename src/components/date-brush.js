// Shared date-range control: a draggable d3 brush over a sparkline of `data`,
// with a compact "Brush | Dates" toggle. Brush is the default; toggling to
// "Dates" reveals two <input type="date"> boxes for setting exact cutoffs.
// Both modes drive the same `onSelect([start, end])` callback and stay in sync,
// so a user can switch freely without losing the current window.
//
// Why an onSelect callback instead of a Mutable parameter?
// Passing a Mutable across the module boundary was a dead-end — Observable
// Framework auto-unwraps Mutables to their current value when referenced
// outside the defining cell, so by the time the wrapper reaches an imported
// function it's just the array, and `selection.value = X` silently does
// nothing. Defining the setter inside the consuming cell (where the cell can
// drive the Mutable's setter directly) is the reliable path.
//
// Usage -- one brush per chart, placed directly above it (Daniel, 2026-09-30: a brush
// shared by a section or a group of charts is not enough):
//   const volRange = view(dateBrush({
//     data: rows, dateAccessor: d => d.date, valueAccessor: d => d.contracts,
//     color: "var(--accent-kalshi)", width
//   }));
//   const shown = rows.filter(inDateRange(volRange));
// dateBrush() sums rows that share a UTC day for the sparkline, so a long table (one row
// per day per category) can be handed over as is. A chart that sums daily rows into
// months passes snap: "month", so it never opens on a partial first month.
//
// A time-series brush opens on the newest 365 days of its own data (defaultWindow() in
// url-range.js); pass no initialRange. Only the non-time-series windows (categories
// treemap, All-time leaderboard) still pass one. The Mutable + onSelect form, for a
// window that several cells must share:
//   const tmDateSel = Mutable([start, end]);
//   display(renderDateBrush({
//     data, dateAccessor: d => d.date, valueAccessor: d => d.value,
//     initialRange: [start, end], onSelect: r => { tmDateSel.value = r; }, width
//   }));
//
// The brush only writes on `end` (mouseup), not continuously during drag —
// per-mousemove Mutable writes triggered cascading cell re-runs on expensive
// pages (treemap) and broke the drag. Date inputs apply on `change` (commit),
// not per keystroke, for the same reason.

import * as d3 from "npm:d3";
import {defaultWindow, pushInitialRange, tagDateBrush, urlDateRange} from "./url-range.js";

let dateRangeControlId = 0;

const fmtDay = d3.utcFormat("%Y-%m-%d");
const toUTCDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

// Inject the date-range control styles once per document.
function ensureBrushStyles() {
  if (document.getElementById("kd-daterange-styles")) return;
  const css = `
.kd-daterange { margin: .65rem 0 1.4rem; }
.kd-dr-bar { display:flex; align-items:center; gap:12px; margin-bottom:8px; flex-wrap:wrap; }
.kd-seg { display:inline-flex; gap:2px; padding:2px; border-radius:5px;
  background:var(--editorial-paper); border:1px solid var(--card-border, var(--theme-foreground-faint)); }
.kd-seg button { appearance:none; border:0; background:transparent; cursor:pointer;
  display:inline-flex; align-items:center; gap:5px; padding:4px 9px; border-radius:3px;
  font:550 12px/1.5 var(--font-sans, sans-serif); letter-spacing:0;
  color:var(--theme-foreground-muted); transition:background .15s ease, color .15s ease; }
.kd-seg button svg { opacity:.75; }
.kd-seg button:hover { color:var(--theme-foreground); background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 6%,transparent); }
.kd-seg button.active { color:var(--theme-foreground); background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 10%,var(--editorial-paper)); box-shadow:none; }
.kd-seg button.active:hover { background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 6%,transparent); }
.kd-quick { display:inline-flex; gap:1px; padding:2px; border-radius:5px;
  background:var(--editorial-paper); border:1px solid var(--card-border, var(--theme-foreground-faint)); }
.kd-quick button { appearance:none; border:0; background:transparent; cursor:pointer;
  padding:4px 8px; border-radius:3px; font:550 12px/1.5 var(--font-sans, sans-serif);
  letter-spacing:0; color:var(--theme-foreground-muted); transition:background .15s ease, color .15s ease; }
.kd-quick button:hover { color:var(--theme-foreground); background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 6%,transparent); }
.kd-quick button.active { color:var(--theme-foreground); background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 10%,var(--editorial-paper)); box-shadow:none; }
.kd-quick button.active:hover { background:color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 6%,transparent); }
.kd-dr-inputs { display:none; align-items:center; gap:7px;
  font:12px/1.4 var(--font-sans, sans-serif); color:var(--theme-foreground-muted); }
.kd-dr-lbl { letter-spacing:.3px; text-transform:uppercase; font-size:10.5px; opacity:.75; }
.kd-dr-dash { opacity:.6; }
.kd-dr-inputs input[type=date] { font:inherit; padding:3px 7px; color:var(--theme-foreground);
  background:var(--editorial-paper,var(--theme-background)); border:1px solid var(--card-border, var(--theme-foreground-faint));
  border-radius:1px; transition:border-color .15s, box-shadow .15s; }
.kd-dr-inputs input[type=date]:hover { border-color:var(--theme-foreground-muted); }
.kd-dr-inputs input[type=date]:focus { outline:none; border-color:var(--editorial-accent,var(--accent-primary)); box-shadow:0 0 0 2px color-mix(in srgb,var(--editorial-accent,var(--accent-primary)) 20%,transparent); }
`;
  const s = document.createElement("style");
  s.id = "kd-daterange-styles"; s.textContent = css;
  document.head.appendChild(s);
}

export function renderDateBrush({
  data,
  dateAccessor = d => d.date,
  valueAccessor = d => d.value,
  initialRange,               // [Date, Date] — omit for time series: defaults to defaultWindow() (newest 365 days)
  quickRanges = [],           // [{label, days}] — optional compact range presets
  snap = null,                // "month": open on whole months (a chart summing daily rows by month)
  onSelect,                   // (range: [Date, Date]) => void
  width,
  height = 60,
  color = "var(--accent-primary)",
  fillOpacity = 0.3,
  marginTop = 4,
  marginBottom = 22,
  marginLeft = 8,
  marginRight = 8
} = {}) {
  const w = Math.max(200, width || 600);
  const xDomain = d3.extent(data, dateAccessor);
  const x = d3.scaleUtc().domain(xDomain).range([marginLeft, w - marginRight]);
  const yMax = d3.max(data, valueAccessor) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([height - marginBottom, marginTop]);
  const [domainStart, domainEnd] = xDomain;

  const svg = d3.create("svg")
    .attr("class", "kd-brush")
    .attr("width", w).attr("height", height)
    .style("display", "block")
    .style("background", "var(--editorial-paper, var(--theme-background-alt))")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "5px");

  // Sparkline
  svg.append("path").datum(data)
    .attr("fill", color).attr("fill-opacity", fillOpacity)
    .attr("d", d3.area()
      .defined(d => Number.isFinite(valueAccessor(d)))
      .x(d => x(dateAccessor(d)))
      .y0(height - marginBottom)
      .y1(d => y(valueAccessor(d)))
      .curve(d3.curveBasis));

  // x-axis
  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(Math.max(4, Math.round(w / 100))).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "var(--card-border)"))
    .call(g => g.selectAll("text").style("font-size", "11px").attr("fill", "currentColor").attr("fill-opacity", 0.7));

  // Open on initialRange if the page gives one (only the non-time-series views do: the
  // categories treemap and All-time leaderboard), else on the site default -- the newest
  // 365 days of this chart's data. Clamped to the data domain.
  let [defStart, defEnd] = initialRange || defaultWindow(xDomain, {snap});
  if (!(defStart instanceof Date)) defStart = new Date(defStart);
  if (!(defEnd instanceof Date)) defEnd = new Date(defEnd);
  if (defStart < domainStart) defStart = domainStart;
  if (defEnd > domainEnd) defEnd = domainEnd;
  if (!(defStart < defEnd)) { defStart = domainStart; defEnd = domainEnd; }

  // A from/to/days window in the page URL (embed and shared links; see
  // components/url-range.js) replaces the page default. The page's own Mutable still
  // holds that default, so the URL window is pushed through onSelect once, below.
  const pageDefault = [defStart, defEnd];
  const urlRange = urlDateRange(pageDefault, xDomain);
  [defStart, defEnd] = urlRange;

  // Shared current range; both modes read/write through applyRange().
  let curStart = defStart, curEnd = defEnd;

  const brush = d3.brushX()
    .extent([[marginLeft, marginTop], [w - marginRight, height - marginBottom]])
    .on("end", (event) => {
      if (!event.sourceEvent) return;          // ignore programmatic brush.move
      const sel = event.selection;
      if (!sel) {
        // Clearing the brush (a bare click outside the selection) now means
        // "show everything" — previously the rectangle vanished while the charts
        // silently kept the old range. applyRange redraws the selection too.
        applyRange(domainStart, domainEnd, {moveBrush: true, fire: true});
        return;
      }
      const [a, b] = sel.map(x.invert);
      applyRange(a, b, {moveBrush: false, fire: true});
    });
  const brushG = svg.append("g").attr("class", "kd-brush-g").call(brush);
  brushG.call(brush.move, [defStart, defEnd].map(x));

  // ── Compact toggle + date inputs ────────────────────────────────────────────
  ensureBrushStyles();
  const container = document.createElement("div");
  container.className = "kd-daterange";

  const bar = document.createElement("div");
  bar.className = "kd-dr-bar";

  // segmented pill toggle with icons
  const ICON_BRUSH = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="8" x2="14" y2="8"/><rect x="4" y="4.5" width="2.6" height="7" rx="1.1" fill="currentColor" stroke="none"/><rect x="9.4" y="4.5" width="2.6" height="7" rx="1.1" fill="currentColor" stroke="none"/></svg>`;
  const ICON_CAL = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2.5" y="3.6" width="11" height="9.9" rx="1.6"/><line x1="2.5" y1="6.6" x2="13.5" y2="6.6"/><line x1="5.4" y1="2.2" x2="5.4" y2="4.4"/><line x1="10.6" y1="2.2" x2="10.6" y2="4.4"/></svg>`;
  const seg = document.createElement("div");
  seg.className = "kd-seg";
  const mkBtn = (icon, label) => {
    const b = document.createElement("button");
    b.type = "button"; b.innerHTML = `${icon}<span>${label}</span>`;
    return b;
  };
  const btnBrush = mkBtn(ICON_BRUSH, "Brush"), btnDates = mkBtn(ICON_CAL, "Dates");
  seg.append(btnBrush, btnDates);

  // Optional quick ranges live beside the mode toggle instead of in a second
  // full-width control strip. They select the same range as dragging the brush;
  // the brush's sparkline still always shows the complete data domain.
  const quick = document.createElement("div");
  quick.className = "kd-quick";
  const quickButtons = [];
  const quickBounds = item => {
    const days = Number(item?.days);
    if (!Number.isFinite(days) || days <= 0) return [domainStart, domainEnd];
    return [d3.utcDay.offset(domainEnd, -(days - 1)), domainEnd];
  };
  for (const item of quickRanges ?? []) {
    if (!item?.label) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = item.label;
    b.title = item.title || `Show ${item.label}`;
    quick.append(b);
    quickButtons.push({button: b, item});
  }

  // date inputs (hidden until "Dates" mode)
  const inputs = document.createElement("div");
  inputs.className = "kd-dr-inputs";
  const mkDate = () => {
    const i = document.createElement("input");
    i.type = "date"; i.min = fmtDay(domainStart); i.max = fmtDay(domainEnd);
    return i;
  };
  const inFrom = mkDate(), inTo = mkDate();
  const controlId = ++dateRangeControlId;
  inFrom.id = `kd-date-from-${controlId}`;
  inTo.id = `kd-date-to-${controlId}`;
  const lblFrom = document.createElement("label");
  lblFrom.className = "kd-dr-lbl";
  lblFrom.htmlFor = inFrom.id;
  lblFrom.textContent = "From";
  const lblTo = document.createElement("label");
  lblTo.className = "kd-dr-lbl";
  lblTo.htmlFor = inTo.id;
  lblTo.textContent = "To";
  inputs.append(lblFrom, inFrom, lblTo, inTo);

  bar.append(seg);
  if (quickButtons.length) bar.append(quick);
  bar.append(inputs);
  container.append(bar, svg.node());

  const dayKey = date => fmtDay(date);
  function syncInputs() { inFrom.value = fmtDay(curStart); inTo.value = fmtDay(curEnd); }
  function syncQuickButtons() {
    for (const {button, item} of quickButtons) {
      const [a, b] = quickBounds(item);
      const selectedStart = a < domainStart ? domainStart : a;
      const selectedEnd = b > domainEnd ? domainEnd : b;
      button.classList.toggle("active", dayKey(selectedStart) === dayKey(curStart) && dayKey(selectedEnd) === dayKey(curEnd));
    }
  }
  function setMode(mode) {
    const dates = mode === "dates";
    btnBrush.classList.toggle("active", !dates);
    btnDates.classList.toggle("active", dates);
    inputs.style.display = dates ? "inline-flex" : "none";
    svg.style("display", dates ? "none" : "block");
    if (dates) syncInputs();
  }

  // Apply a range from either source; clamp, move brush, sync inputs, fire callback.
  function applyRange(a, b, {moveBrush = true, fire = true} = {}) {
    if (!(a instanceof Date)) a = new Date(a);
    if (!(b instanceof Date)) b = new Date(b);
    if (a > b) [a, b] = [b, a];
    if (a < domainStart) a = domainStart;
    if (b > domainEnd) b = domainEnd;
    if (a >= b) return;
    curStart = a; curEnd = b;
    if (moveBrush) brushG.call(brush.move, [a, b].map(x));   // programmatic → won't refire onSelect
    syncInputs();
    syncQuickButtons();
    if (!fire) return;
    container.value = [a, b];
    container.dispatchEvent(new Event("input"));   // for view(dateBrush(...))
    if (typeof onSelect === "function") onSelect([a, b]);
  }

  btnBrush.addEventListener("click", () => setMode("brush"));
  btnDates.addEventListener("click", () => setMode("dates"));
  for (const {button, item} of quickButtons) {
    button.addEventListener("click", () => {
      const [a, b] = quickBounds(item);
      applyRange(a, b, {moveBrush: true, fire: true});
    });
  }
  const onInput = () => {
    if (!inFrom.value || !inTo.value) return;
    applyRange(toUTCDate(inFrom.value), toUTCDate(inTo.value), {moveBrush: true, fire: true});
  };
  inFrom.addEventListener("change", onInput);
  inTo.addEventListener("change", onInput);

  setMode("brush");
  syncQuickButtons();
  tagDateBrush(container, () => ({
    range: [curStart, curEnd],
    domain: xDomain,
    defaultRange: pageDefault,
    quickDays: quickButtons.find(({button}) => button.classList.contains("active"))?.item.days ?? null
  }));
  // view() reads .value when the cell resolves, so a view(dateBrush(...)) chart starts
  // on the opening window; a Mutable-driven page gets it through onSelect.
  container.value = [defStart, defEnd];
  if (urlRange !== pageDefault) pushInitialRange(onSelect, urlRange);
  return container;
}

const toTime = raw => (raw instanceof Date || typeof raw === "number" ? +raw : Date.parse(raw));

// Rows -> one {date, value} per UTC day (value summed), sorted, dates as UTC midnights.
function dailySeries(data, dateAccessor, valueAccessor) {
  const byDay = new Map();
  for (const d of data ?? []) {
    const t = toTime(dateAccessor(d));
    if (!Number.isFinite(t)) continue;
    const day = Math.floor(t / 864e5) * 864e5;
    const v = +valueAccessor(d);
    byDay.set(day, (byDay.get(day) ?? 0) + (Number.isFinite(v) ? v : 0));
  }
  return Array.from(byDay, ([t, value]) => ({date: new Date(t), value})).sort((a, b) => a.date - b.date);
}

// A brush for ONE chart, usable with view(): its value is the selected [start, end]
// (UTC-midnight Dates, both ends inclusive -- filter with inDateRange()). It opens on the
// newest 365 days of the data it is given, honours ?from/?to/?days, and feeds the Embed
// button like every other brush. With no dated rows it renders nothing and its window
// admits everything, so a chart with no data still draws its own empty state.
export function dateBrush({data, dateAccessor = d => d.date, valueAccessor = d => d.value, ...options} = {}) {
  const series = dailySeries(data, dateAccessor, valueAccessor);
  if (!series.length) {
    const empty = document.createElement("div");
    empty.value = [new Date(-8.64e15), new Date(8.64e15)];
    return empty;
  }
  return renderDateBrush({...options, data: series, dateAccessor: d => d.date, valueAccessor: d => d.value});
}

// Row filter for a brush window: inDateRange(range) keeps rows dated start <= date <= end,
// the same test the older pages write out by hand. Accepts Dates or ISO strings on the row.
export function inDateRange([start, end], dateAccessor = d => d.date) {
  const lo = +start, hi = +end;
  return d => {
    const t = toTime(dateAccessor(d));
    return t >= lo && t <= hi;
  };
}
