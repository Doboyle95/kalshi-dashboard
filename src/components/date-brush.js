// Shared date-range brush. A small sparkline of `data` with a draggable d3 brush
// on top.
//
// Why an onSelect callback instead of a Mutable parameter?
// Passing a Mutable across the module boundary was a dead-end — Observable
// Framework auto-unwraps Mutables to their current value when referenced
// outside the defining cell, so by the time the wrapper reaches an imported
// function it's just the array, and `selection.value = X` silently does
// nothing. Defining the setter inside the consuming cell (where the cell can
// drive the Mutable's setter directly) is the reliable path.
//
// Usage:
//   const parlayDateSel = Mutable([new Date("2025-01-01"), latestDate]);
//   display(renderDateBrush({
//     data: pnl,
//     dateAccessor: d => d.date,
//     valueAccessor: d => d.stakes,
//     initialRange: [new Date("2025-01-01"), latestDate],
//     onSelect: r => { parlayDateSel.value = r; },
//     width
//   }));
//
// The brush only writes on `end` (mouseup), not continuously during drag —
// per-mousemove Mutable writes triggered cascading cell re-runs on expensive
// pages (treemap) and broke the drag.

import * as d3 from "npm:d3";

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

  const svg = d3.create("svg")
    .attr("class", "kd-brush")
    .attr("width", w).attr("height", height)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.25rem");

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
  const [domainStart, domainEnd] = xDomain;
  let [defStart, defEnd] = initialRange || xDomain;
  if (!(defStart instanceof Date)) defStart = new Date(defStart);
  if (!(defEnd instanceof Date)) defEnd = new Date(defEnd);
  if (defStart < domainStart) defStart = domainStart;
  if (defEnd > domainEnd) defEnd = domainEnd;
  if (defStart >= defEnd) { defStart = domainStart; defEnd = domainEnd; }

  const brush = d3.brushX()
    .extent([[marginLeft, marginTop], [w - marginRight, height - marginBottom]])
    .on("end", (event) => {
      if (!event.sourceEvent) return;
      const sel = event.selection;
      if (sel && typeof onSelect === "function") {
        const [a, b] = sel.map(x.invert);
        onSelect([a, b]);
      }
    });

  const brushG = svg.append("g").attr("class", "kd-brush-g").call(brush);
  brushG.call(brush.move, [defStart, defEnd].map(x));

  return svg.node();
}
