import {fifteenMinuteFees} from "./fee-embeds.js";

export const FEE_MIX_CATEGORIES = [
  {key: "straightSports", label: "Straight sports", color: "#1b9e77"},
  {key: "parlays", label: "Parlays", color: "#8963b3"},
  {key: "fifteenMinute", label: "15-minute crypto / finance / commodities", color: "#0072B2"},
  {key: "otherNonSports", label: "Other non-sports", color: "#74746f"}
];

// Inclusive six-month window, matching the daily non-sports embed. Clamp the
// target day for month ends rather than allowing February to overflow into March.
export function sixMonthFeeStart(end) {
  const exclusiveEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  const targetMonth = new Date(Date.UTC(exclusiveEnd.getUTCFullYear(), exclusiveEnd.getUTCMonth() - 6, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonth.setUTCDate(Math.min(exclusiveEnd.getUTCDate(), lastDay));
  return targetMonth;
}

export function buildFeeRevenueMix(daily, sports, tickerFees, metadata) {
  const latest = rows => Math.max(...rows.map(d => +d.date).filter(Number.isFinite));
  const end = new Date(Math.min(latest(daily), latest(sports), latest(tickerFees)));
  if (!Number.isFinite(+end)) throw new Error("Six-month fee data is unavailable");
  const start = sixMonthFeeStart(end);
  const inWindow = d => d.date >= start && d.date <= end;
  const totals = daily.filter(inWindow);
  const sportsByDay = new Map(sports.filter(inWindow).map(d => [+d.date, d]));
  const fifteenByDay = new Map(fifteenMinuteFees(tickerFees.filter(inWindow), metadata).rows.map(d => [+d.date, d]));
  const cents = Object.fromEntries(FEE_MIX_CATEGORIES.map(d => [d.key, 0]));
  const toCents = value => {
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid fee revenue value");
    return Math.round(value * 100);
  };
  let totalCents = 0;
  for (const day of totals) {
    const split = sportsByDay.get(+day.date), fifteen = fifteenByDay.get(+day.date);
    if (!split || !fifteen) throw new Error("Six-month fee data has a missing day");
    const total = toCents(day.fees_total), straight = toCents(split.fees_sports_nonparlay);
    const nonsports = toCents(split.fees_nonsports), fast = toCents(fifteen.fees);
    const parlay = total - straight - nonsports, other = nonsports - fast;
    if (parlay < 0 || other < 0) throw new Error("Fee mix components exceed their reported totals");
    cents.straightSports += straight;
    cents.parlays += parlay;
    cents.fifteenMinute += fast;
    cents.otherNonSports += other;
    totalCents += total;
  }
  if (!totalCents) throw new Error("No fee revenue in the six-month window");
  return {
    start, end, totalFees: totalCents / 100, dayCount: totals.length,
    isPartial: totals.some(d => +d.date === +end && (d.is_partial === true || d.is_partial === "TRUE")),
    slices: FEE_MIX_CATEGORIES.map(d => ({...d, fees: cents[d.key] / 100, share: cents[d.key] / totalCents}))
  };
}

export function feeRevenueMixPie(mix, {d3, document = globalThis.document}) {
  const root = document.createElement("div");
  root.className = "fee-mix-chart";
  const money = n => n.toLocaleString("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 2});
  const percent = n => (n * 100).toFixed(1) + "%";
  const summary = document.createElement("div");
  summary.className = "fee-mix-total";
  summary.textContent = `${money(mix.totalFees)} total fee revenue`;
  root.append(summary);
  const grid = document.createElement("div");
  grid.className = "fee-mix-grid";
  root.append(grid);
  const svg = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
    .attr("viewBox", "0 0 360 360").attr("width", 360).attr("height", 360)
    .attr("role", "img").attr("aria-label", "Kalshi fee revenue by category over the past six months");
  svg.append("title").text("Kalshi fee revenue over the past six months");
  const arcs = d3.pie().sort(null).value(d => d.fees)(mix.slices);
  const arc = d3.arc().innerRadius(0).outerRadius(155);
  const group = svg.append("g").attr("transform", "translate(180,180)");
  const paths = group.selectAll("path").data(arcs).join("path")
    .attr("d", arc).attr("fill", d => d.data.color).attr("stroke", "var(--theme-background, #fff)")
    .attr("stroke-width", 2).attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", d => `${d.data.label}: ${money(d.data.fees)}, ${percent(d.data.share)}`);
  paths.append("title").text(d => `${d.data.label}\n${money(d.data.fees)} (${percent(d.data.share)})`);
  group.selectAll("text").data(arcs.filter(d => d.data.share >= 0.05)).join("text")
    .attr("transform", d => `translate(${d3.arc().innerRadius(102).outerRadius(102).centroid(d)})`)
    .attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white")
    .attr("font-size", 19).attr("font-weight", 700).attr("pointer-events", "none")
    .text(d => percent(d.data.share));
  grid.append(svg.node());
  const legend = document.createElement("div");
  legend.className = "fee-mix-legend";
  legend.setAttribute("aria-label", "Fee revenue categories");
  grid.append(legend);
  const detail = document.createElement("div");
  detail.className = "fee-mix-detail";
  detail.setAttribute("role", "status");
  detail.setAttribute("aria-live", "polite");
  const reset = () => {
    paths.attr("opacity", 1);
    legend.querySelectorAll("button").forEach(b => b.removeAttribute("data-active"));
    detail.textContent = "Hover, focus or tap a slice to see its fee revenue and share.";
  };
  const show = key => {
    const slice = mix.slices.find(d => d.key === key);
    paths.attr("opacity", d => d.data.key === key ? 1 : 0.35);
    legend.querySelectorAll("button").forEach(b => b.toggleAttribute("data-active", b.dataset.key === key));
    detail.textContent = `${slice.label}: ${money(slice.fees)} · ${percent(slice.share)} of total fees`;
  };
  for (const slice of mix.slices) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.key = slice.key;
    const swatch = document.createElement("span");
    swatch.className = "fee-mix-swatch";
    swatch.style.background = slice.color;
    const label = document.createElement("span");
    label.className = "fee-mix-label";
    label.textContent = slice.label;
    const value = document.createElement("span");
    value.className = "fee-mix-value";
    value.textContent = `${money(slice.fees)} · ${percent(slice.share)}`;
    button.append(swatch, label, value);
    button.addEventListener("pointerenter", () => show(slice.key));
    button.addEventListener("pointerleave", reset);
    button.addEventListener("focus", () => show(slice.key));
    button.addEventListener("blur", reset);
    button.addEventListener("click", () => show(slice.key));
    legend.append(button);
  }
  paths.on("pointerenter focus click", (_event, d) => show(d.data.key))
    .on("pointerleave blur", reset)
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); show(d.data.key); }
      if (event.key === "Escape") reset();
    });
  root.append(detail);
  reset();
  return root;
}
