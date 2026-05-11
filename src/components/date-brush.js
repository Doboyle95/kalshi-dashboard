// Shared date-range brush. A small sparkline of `data` with a draggable d3 brush
// on top. The component updates the passed-in `selection` Mutable on brush move,
// so consumer JS blocks reactively re-filter.
//
// Usage:
//   const dateSel = Mutable([new Date("2025-01-01"), latestDate]);
//   display(renderDateBrush({data, dateAccessor, valueAccessor, selection: dateSel, width}));
//   // ... in another block:
//   const [start, end] = dateSel;
//
// d3 v7 default-hides the brush resize handles via display:none. styles.css
// override (.kd-brush .handle) restores visibility so users can grab the edges.

import * as d3 from "npm:d3";

export function renderDateBrush({
  data,
  dateAccessor = d => d.date,
  valueAccessor = d => d.value,
  selection,                  // Mutable<[Date, Date]>
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

  // Initial selection clamped to data domain
  const [domainStart, domainEnd] = xDomain;
  let [defStart, defEnd] = selection.value || xDomain;
  if (!(defStart instanceof Date)) defStart = new Date(defStart);
  if (!(defEnd instanceof Date)) defEnd = new Date(defEnd);
  if (defStart < domainStart) defStart = domainStart;
  if (defEnd > domainEnd) defEnd = domainEnd;
  if (defStart >= defEnd) { defStart = domainStart; defEnd = domainEnd; }

  const brush = d3.brushX()
    .extent([[marginLeft, marginTop], [w - marginRight, height - marginBottom]])
    .on("brush end", (event) => {
      if (!event.sourceEvent) return;
      const sel = event.selection;
      if (sel) {
        const [a, b] = sel.map(x.invert);
        selection.value = [a, b];
      }
    });

  const brushG = svg.append("g").attr("class", "kd-brush-g").call(brush);
  brushG.call(brush.move, [defStart, defEnd].map(x));

  return svg.node();
}
