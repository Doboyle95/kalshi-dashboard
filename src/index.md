---
title: Overview
---

# US Prediction Market Dashboard

_Comparing regulated prediction markets in the United States. Kalshi is the dominant market leader; ForecastEx, Polymarket US, and Crypto.com/Nadex operate at significantly smaller scale. Data updated nightly._

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const fmtCount = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(kalshi, d => d.contracts_total);
const totalFees = d3.sum(kalshi, d => d.fees_total);
const peakDay = kalshi.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, kalshi[0]);
const annualizedFees = Math.round(totalFees / kalshi.length * 365 / 1e6) * 1e6;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Kalshi all-time volume</div>
    <div class="kpi-value">${fmtUSD(totalContracts)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Kalshi all-time fee revenue</div>
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Kalshi annualized revenue run rate</div>
    <div class="kpi-value">${fmtUSD(annualizedFees)}/yr</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Kalshi peak single day volume</div>
    <div class="kpi-value">${fmtUSD(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)}</div>
  </div>
</div>

## Platform comparison

```js
const kalshiTidy = kalshi.map(d => ({
  date: d.date,
  platform: "Kalshi",
  contracts: d.contracts_total,
  fees: d.fees_total
}));

const competitorTidy = competitor
  .filter(d => d.platform !== "Kalshi")
  .map(d => ({
    date: new Date(d.date),
    platform: d.platform === "Polymarket_US" ? "Polymarket US" : d.platform,
    contracts: +d.contracts || 0,
    fees: +d.fees || 0
  }));

const allPlatforms = [...kalshiTidy, ...competitorTidy];
```

```js
const indexLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

```js
const indexBrush = view((() => {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(kalshi, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(kalshi, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path").datum(kalshi)
    .attr("fill", "#00C2A8").attr("fill-opacity", 0.2)
    .attr("d", d3.area().x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total)).curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultStart = new Date("2025-01-01");
  const defaultEnd   = d3.max(kalshi, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
})());
```

```js
{
  const [s, e] = indexBrush;
  const fmt = d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k");
  const pColors = {
    Kalshi: "#00C2A8", "Polymarket US": "#3B7DD8",
    ForecastEx: "#E53535", "Crypto.com/Nadex": "#9c27b0"
  };

  const byPlatform = {
    Kalshi:             kalshiTidy,
    "Polymarket US":    competitorTidy.filter(d => d.platform === "Polymarket US"),
    ForecastEx:         competitorTidy.filter(d => d.platform === "ForecastEx"),
    "Crypto.com/Nadex": competitorTidy.filter(d => d.platform === "Crypto.com/Nadex"),
  };

  // Per-date pivot for single combined tooltip
  const tipPivot = Array.from(
    d3.rollup(
      allPlatforms.filter(d => d.contracts > 0 && d.date >= s && d.date <= e),
      rs => { const o = {date: rs[0].date}; for (const r of rs) o[r.platform] = r.contracts; return o; },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date);

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 420,
    marginRight: 16,
    x: {type: "utc", label: null, domain: [s, e]},
    y: {type: indexLogScale === "Log" ? "log" : "linear", label: "Daily volume ($)", grid: true, tickFormat: fmt},
    color: {legend: true, domain: Object.keys(pColors), range: Object.values(pColors)},
    marks: [
      Plot.areaY(kalshiTidy.filter(d => d.date >= s && d.date <= e), {
        x: "date", y: "contracts",
        fill: pColors.Kalshi, fillOpacity: 0.08, curve: "monotone-x"
      }),
      ...Object.entries(byPlatform).map(([name, data]) =>
        Plot.lineY(data.filter(d => d.contracts > 0 && d.date >= s && d.date <= e), {
          x: "date", y: "contracts",
          stroke: pColors[name],
          strokeWidth: name === "Kalshi" ? 2.5 : 1.75,
          curve: "monotone-x"
        })
      ),
      Plot.ruleX(tipPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(tipPivot, Plot.pointerX({
        x: "date",
        title: d => [fmtDate(d.date), ...Object.keys(pColors).map(p => d[p] != null ? `${p}: ${fmt(d[p])}` : null).filter(Boolean)].join("\n")
      })),
      ...(indexLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#888">Shared Y-axis — the scale gap is real. Kalshi data from trade records. Competitors from public sources. Crypto.com/Nadex from CFTC daily bulletins (starts Dec 2024).</p>
