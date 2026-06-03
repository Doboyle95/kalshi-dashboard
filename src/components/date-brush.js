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
      if (!sel) return;
      const [a, b] = sel.map(x.invert);
      applyRange(a, b, {moveBrush: false, fire: true});
    });
  const brushG = svg.append("g").attr("class", "kd-brush-g").call(brush);
  brushG.call(brush.move, [defStart, defEnd].map(x));

  // ── Compact toggle + date inputs ────────────────────────────────────────────
  const container = document.createElement("div");
  container.className = "kd-daterange";
  container.style.marginBottom = "1.25rem";

  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:12px;";

  // segmented toggle
  const seg = document.createElement("div");
  seg.style.cssText = "display:inline-flex;border:1px solid var(--card-border);border-radius:4px;overflow:hidden;";
  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.style.cssText = "border:0;background:transparent;color:inherit;padding:2px 9px;font-size:12px;cursor:pointer;line-height:1.6;";
    return b;
  };
  const btnBrush = mkBtn("Brush"), btnDates = mkBtn("Dates");
  seg.append(btnBrush, btnDates);

  // date inputs (hidden until "Dates" mode)
  const inputs = document.createElement("div");
  inputs.style.cssText = "display:none;align-items:center;gap:6px;color:var(--theme-foreground-muted);";
  const mkDate = () => {
    const i = document.createElement("input");
    i.type = "date"; i.min = fmtDay(domainStart); i.max = fmtDay(domainEnd);
    i.style.cssText = "font:inherit;padding:1px 4px;border:1px solid var(--card-border);border-radius:3px;background:var(--theme-background);color:inherit;";
    return i;
  };
  const inFrom = mkDate(), inTo = mkDate();
  const dash = document.createElement("span"); dash.textContent = "–";
  inputs.append(document.createTextNode("From "), inFrom, dash, inTo);

  bar.append(seg, inputs);
  container.append(bar, svg.node());

  function syncInputs() { inFrom.value = fmtDay(curStart); inTo.value = fmtDay(curEnd); }
  function setMode(mode) {
    const dates = mode === "dates";
    btnBrush.style.background = dates ? "transparent" : "var(--theme-foreground-focus, #3b5bdb)";
    btnBrush.style.color = dates ? "inherit" : "#fff";
    btnDates.style.background = dates ? "var(--theme-foreground-focus, #3b5bdb)" : "transparent";
    btnDates.style.color = dates ? "#fff" : "inherit";
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
