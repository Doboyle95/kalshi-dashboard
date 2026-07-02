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
// Usage (unchanged):
//   const parlayDateSel = Mutable([new Date("2025-01-01"), latestDate]);
//   display(renderDateBrush({
//     data: pnl, dateAccessor: d => d.date, valueAccessor: d => d.stakes,
//     initialRange: [new Date("2025-01-01"), latestDate],
//     onSelect: r => { parlayDateSel.value = r; }, width
//   }));
//
// The brush only writes on `end` (mouseup), not continuously during drag —
// per-mousemove Mutable writes triggered cascading cell re-runs on expensive
// pages (treemap) and broke the drag. Date inputs apply on `change` (commit),
// not per keystroke, for the same reason.

import * as d3 from "npm:d3";

const fmtDay = d3.utcFormat("%Y-%m-%d");
const toUTCDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

// Inject the date-range control styles once per document.
function ensureBrushStyles() {
  if (document.getElementById("kd-daterange-styles")) return;
  const css = `
.kd-daterange { margin-bottom: 1.25rem; }
.kd-dr-bar { display:flex; align-items:center; gap:12px; margin-bottom:8px; flex-wrap:wrap; }
.kd-seg { display:inline-flex; gap:2px; padding:2px; border-radius:999px;
  background:var(--theme-background-alt); border:1px solid var(--card-border, var(--theme-foreground-faint)); }
.kd-seg button { appearance:none; border:0; background:transparent; cursor:pointer;
  display:inline-flex; align-items:center; gap:5px; padding:3px 11px; border-radius:999px;
  font:550 11.5px/1.5 var(--sans-serif, system-ui); letter-spacing:.2px;
  color:var(--theme-foreground-muted); transition:background .15s ease, color .15s ease; }
.kd-seg button svg { opacity:.9; }
.kd-seg button:hover { color:var(--theme-foreground); background:rgba(127,127,127,.12); }
.kd-seg button.active { color:#23170a; background:#f4a736; box-shadow:0 1px 2px rgba(0,0,0,.2); }
.kd-seg button.active:hover { background:#f3b357; }
.kd-dr-inputs { display:none; align-items:center; gap:7px;
  font:12px/1.4 var(--sans-serif, system-ui); color:var(--theme-foreground-muted); }
.kd-dr-lbl { letter-spacing:.3px; text-transform:uppercase; font-size:10.5px; opacity:.75; }
.kd-dr-dash { opacity:.6; }
.kd-dr-inputs input[type=date] { font:inherit; padding:3px 7px; color:var(--theme-foreground);
  background:var(--theme-background); border:1px solid var(--card-border, var(--theme-foreground-faint));
  border-radius:6px; transition:border-color .15s, box-shadow .15s; }
.kd-dr-inputs input[type=date]:hover { border-color:var(--theme-foreground-muted); }
.kd-dr-inputs input[type=date]:focus { outline:none; border-color:#f4a736; box-shadow:0 0 0 3px rgba(244,167,54,.22); }
`;
  const s = document.createElement("style");
  s.id = "kd-daterange-styles"; s.textContent = css;
  document.head.appendChild(s);
}

export function renderDateBrush({
  data,
  dateAccessor = d => d.date,
  valueAccessor = d => d.value,
  initialRange,               // [Date, Date] — defaults to data extent
  onSelect,                   // (range: [Date, Date]) => void
  width,
  height = 60,
  color = "#f4a736",
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
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px");

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
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "currentColor").attr("fill-opacity", 0.6));

  // Clamp the initial range to the data domain.
  let [defStart, defEnd] = initialRange || xDomain;
  if (!(defStart instanceof Date)) defStart = new Date(defStart);
  if (!(defEnd instanceof Date)) defEnd = new Date(defEnd);
  if (defStart < domainStart) defStart = domainStart;
  if (defEnd > domainEnd) defEnd = domainEnd;
  if (defStart >= defEnd) { defStart = domainStart; defEnd = domainEnd; }

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

  // date inputs (hidden until "Dates" mode)
  const inputs = document.createElement("div");
  inputs.className = "kd-dr-inputs";
  const mkDate = () => {
    const i = document.createElement("input");
    i.type = "date"; i.min = fmtDay(domainStart); i.max = fmtDay(domainEnd);
    return i;
  };
  const inFrom = mkDate(), inTo = mkDate();
  const lblFrom = document.createElement("span"); lblFrom.className = "kd-dr-lbl"; lblFrom.textContent = "From";
  const dash = document.createElement("span"); dash.className = "kd-dr-dash"; dash.textContent = "to";
  inputs.append(lblFrom, inFrom, dash, inTo);

  bar.append(seg, inputs);
  container.append(bar, svg.node());

  function syncInputs() { inFrom.value = fmtDay(curStart); inTo.value = fmtDay(curEnd); }
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
    if (fire && typeof onSelect === "function") onSelect([a, b]);
  }

  btnBrush.addEventListener("click", () => setMode("brush"));
  btnDates.addEventListener("click", () => setMode("dates"));
  const onInput = () => {
    if (!inFrom.value || !inTo.value) return;
    applyRange(toUTCDate(inFrom.value), toUTCDate(inTo.value), {moveBrush: true, fire: true});
  };
  inFrom.addEventListener("change", onInput);
  inTo.addEventListener("change", onInput);

  setMode("brush");
  return container;
}
