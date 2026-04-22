---
title: Parlay P&L
---

# Parlay P&L

Taker profit/loss on parlay contracts (KXMVE\* and PREPACK\* series). Negative values mean takers (bettors) lost money.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const raw = await FileAttachment("data/parlay_pnl_net.csv").csv({typed: true});
```

```js
// Build per-day series with cumulative P&L
let grossRunning = 0, netRunning = 0;
const pnl = raw
  .filter(d => d.row_label && d.row_label !== "TOTAL")
  .map(d => {
    const dailyNet   = +d.net_pnl_ALL_PARLAYS || 0;
    const dailyFees  = +d.fees_ALL_PARLAYS || 0;
    const dailyGross = dailyNet + dailyFees;
    const stakes     = +d.ALL_PARLAYS || 0;       // notional (USD at stake)
    const pct        = +d.net_pnl_pct_ALL_PARLAYS || null; // P&L as % of stakes
    grossRunning += dailyGross;
    netRunning   += dailyNet;
    return {
      date: new Date(d.row_label),
      gross_cumul: grossRunning,
      net_cumul:   netRunning,
      daily_net:   dailyNet,
      daily_gross: dailyGross,
      daily_fees:  dailyFees,
      stakes,
      pct
    };
  })
  .filter(d => !isNaN(d.date.getTime()));
```

```js
// All-time KPIs (unaffected by date range)
const lastRow   = pnl[pnl.length - 1];
const totalNet  = lastRow?.net_cumul  ?? 0;
const totalGross = lastRow?.gross_cumul ?? 0;
const totalFees = totalGross - totalNet;
const totalStakes = d3.sum(pnl, d => d.stakes);
const overallPct = totalNet / totalStakes * 100;
```

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Cumulative taker P&L (net)</div>
    <div class="kpi-value">${fmtUSD(totalNet)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">All-time fees paid</div>
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Overall taker ROI</div>
    <div class="kpi-value">${overallPct.toFixed(1)}%</div>
    <div class="kpi-meta">of total notional staked</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Total notional staked</div>
    <div class="kpi-value">${fmtUSD(totalStakes)}</div>
  </div>
</div>

```js
// Date range — Mutable updated by brush
const parlayDateSel = Mutable([new Date("2023-01-01"), d3.max(pnl, d => d.date)]);
```

```js
// Brush mini chart (sparkline of daily stakes)
{
  const h = 60, mt = 4, mb = 22, ml = 8, mr = 8, w = width;

  const x = d3.scaleUtc().domain(d3.extent(pnl, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(pnl, d => d.stakes);
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(pnl)
    .attr("fill", "#f4a736").attr("fill-opacity", 0.3)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(d.stakes))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const [defStart, defEnd] = parlayDateSel;
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", (event) => {
      if (!event.sourceEvent) return;
      if (event.selection) parlayDateSel.value = event.selection.map(x.invert);
    });

  svg.append("g").call(brush).call(brush.move, [defStart, defEnd].map(x));
  display(svg.node());
}
```

```js
const [pStart, pEnd] = parlayDateSel;
const pnlFiltered = pnl.filter(d => d.date >= pStart && d.date <= pEnd);

// Recompute cumulative from filtered window start
let gr = 0, nr = 0;
const pnlCumul = pnlFiltered.map(d => {
  gr += d.daily_gross; nr += d.daily_net;
  return {...d, gross_cumul_w: gr, net_cumul_w: nr};
});

const tidyCumul = [
  ...pnlCumul.map(d => ({date: d.date, value: d.gross_cumul_w, series: "Before fees (gross)"})),
  ...pnlCumul.map(d => ({date: d.date, value: d.net_cumul_w,   series: "After fees (net)"}))
];

// Pivot for single combined tooltip
const cumPivot = pnlCumul.map(d => ({date: d.date, gross: d.gross_cumul_w, net: d.net_cumul_w}));
```

## Cumulative taker P&L

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 340,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Cumulative P&L (USD)", grid: true,
      tickFormat: d => "$" + (Math.abs(d) >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {legend: true, domain: ["Before fees (gross)", "After fees (net)"], range: ["#f4a736", "#d7191c"]},
  marks: [
    Plot.lineY(tidyCumul, {
      x: "date", y: "value", stroke: "series", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(cumPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(cumPivot, Plot.pointerX({
      x: "date",
      title: d => `${fmtDate(d.date)}\nBefore fees: $${d.gross.toLocaleString(undefined,{maximumFractionDigits:0})}\nAfter fees: $${d.net.toLocaleString(undefined,{maximumFractionDigits:0})}`
    })),
    Plot.ruleY([0], {stroke: "#ccc"})
  ]
})
```

## Daily stakes & return

_Bar height = daily notional staked by takers. Color = taker return that day (green = takers won, red = takers lost). Darker = more extreme. Days with under $1,000 notional hidden (early market, statistically meaningless)._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Daily notional staked (USD)", grid: true,
      tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {
    type: "diverging",
    scheme: "RdYlGn",
    domain: [-50, 50],
    label: "Taker return %",
    legend: true
  },
  marks: [
    Plot.rectY(pnlFiltered.filter(d => d.stakes >= 1000), {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.stakes,
      fill: d => d.pct != null ? Math.max(-50, Math.min(50, d.pct)) : 0,
      tip: true,
      title: d => `${fmtDate(d.date)}\nStakes: $${d.stakes.toLocaleString(undefined,{maximumFractionDigits:0})}\nTaker return: ${d.pct != null ? d.pct.toFixed(1)+"%" : "n/a"}\nNet P&L: $${d.daily_net.toLocaleString(undefined,{maximumFractionDigits:0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Daily taker return (% of stakes)

_Days with under $25,000 notional hidden (early low-volume days had outsized variance). Returns below −100% reflect fees on top of a total loss (mathematically expected). Axis capped at ±150%; hover bars to see exact values._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 260,
  marginLeft: 55,
  x: {type: "utc", label: null},
  y: {label: "Taker return (% of notional)", domain: [-110, 150], grid: true, tickFormat: d => d + "%"},
  marks: [
    Plot.rectY(pnlFiltered.filter(d => d.pct != null && d.stakes >= 25000), {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => Math.max(-110, Math.min(150, d.pct)),
      fill: d => d.pct >= 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.75,
      tip: true,
      title: d => `${fmtDate(d.date)}\nReturn: ${d.pct.toFixed(1)}%\nStakes: $${d.stakes.toLocaleString(undefined,{maximumFractionDigits:0})}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Taker return = (settlement received − price paid − fees) ÷ notional. How it's calculated: a winning contract bought at price <em>p</em>¢ returns (100−p)¢ profit; a losing contract loses the full <em>p</em>¢ paid. Sum across all contracts for the day, subtract Kalshi's fee, divide by total notional. A −100% day means every parlay expired worthless; fees push it to −102% to −107%. A +100%+ day means many low-probability parlays hit — a 5¢ parlay pays back 19× if it wins.</p>
