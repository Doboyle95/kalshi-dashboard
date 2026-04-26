---
title: Competitors
---

# Platform Comparison

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Kalshi comes from cleaned internal daily aggregates; competitor series come from public daily platform reports normalized into <code>competitor_daily.csv</code>. The metric toggle switches between contracts and fees where available. The brush changes the visible window, not the underlying all-time source data.</p>
</details>

<details class="surface-card compact-details">
  <summary>How to use this page</summary>
  <p>Use contracts to compare market activity and fees to compare monetization. Start with log scale if you care about smaller platforms, then return to linear scale to see how much Kalshi dominates absolute volume.</p>
</details>

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
```

```js
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const platforms = [
  {
    name: "Kalshi", color: "#00C2A8",
    data: kalshi.map(d => ({date: d.date, contracts: d.contracts_total, fees: d.fees_total}))
  },
  {
    name: "Polymarket US", color: "#3B7DD8",
    data: competitor.filter(d => d.platform === "Polymarket_US")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  },
  {
    name: "ForecastEx", color: "#E53535",
    data: competitor.filter(d => d.platform === "ForecastEx")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  },
  {
    name: "Crypto.com/Nadex", color: "#9c27b0",
    data: competitor.filter(d => d.platform === "Crypto.com/Nadex")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  }
];

const colorDomain = platforms.map(p => p.name);
const colorRange  = platforms.map(p => p.color);
const all = platforms.flatMap(p => p.data.map(d => ({...d, platform: p.name})));
```

```js
// Date brush — uses Kalshi daily as background sparkline
function makeDateBrush(defaultStart) {
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

  svg.append("path")
    .datum(kalshi)
    .attr("fill", "#00C2A8").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultEnd = d3.max(kalshi, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

```js
const metric       = view(Inputs.radio(["contracts", "fees"], {value: "contracts", label: "Metric", format: x => x === "contracts" ? "Volume" : "Fees"}));
const compLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

```js
const dr_abs = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_abs;
  const fmt = metric === "contracts"
    ? d => "$"+(d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));

  const filteredAll = all.filter(d => d.date >= s && d.date <= e);

  const tipPivot = Array.from(
    d3.rollup(
      filteredAll.filter(d => d[metric] != null),
      rs => { const o = {date: rs[0].date}; for (const r of rs) o[r.platform] = r[metric]; return o; },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date);

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 380,
    marginLeft: 55,
    marginRight: 16,
    x: {type: "utc", label: null},
    y: {
      type: compLogScale === "Log" ? "log" : "linear",
      label: metric === "contracts" ? "Daily volume ($)" : "Daily fees ($)",
      grid: true,
      tickFormat: fmt
    },
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      Plot.areaY(platforms[0].data.filter(d => d.date >= s && d.date <= e), {
        x: "date", y: metric,
        fill: platforms[0].color, fillOpacity: 0.08,
        curve: "monotone-x"
      }),
      ...platforms.map(p =>
        Plot.lineY(p.data.filter(d => d.date >= s && d.date <= e && d[metric] != null), {
          x: "date", y: metric,
          stroke: p.color,
          strokeWidth: p.name === "Kalshi" ? 2.5 : 1.75,
          curve: "monotone-x"
        })
      ),
      Plot.ruleX(tipPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(tipPivot, Plot.pointerX({
        x: "date",
        title: d => [fmtDate(d.date), ...colorDomain.map(p => d[p] != null ? `${p}: ${fmt(d[p])}` : null).filter(Boolean)].join("\n")
      })),
      ...(compLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Shared Y-axis — the scale gap is real. Kalshi = US exchange trade records. Polymarket US = US-accessible volume only (separate from global Polymarket). ForecastEx = full exchange volume. Crypto.com/Nadex = event binary contracts only (from CFTC daily bulletins, starts Dec 2024); fees computed at $0.02/contract (exchange fee for $1 contracts; settlement fees waived).</p>

## Market share

```js
const dr_share = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_share;

  const shareTidy = platforms.flatMap(p =>
    p.data
      .filter(d => d.date >= s && d.date <= e && d.contracts != null && d.contracts > 0)
      .map(d => ({date: d.date, platform: p.name, contracts: d.contracts}))
  );

  const shareByDate = Array.from(
    d3.rollup(
      shareTidy,
      rs => {
        const o = {date: rs[0].date, total: d3.sum(rs, r => r.contracts)};
        for (const r of rs) o[r.platform] = r.contracts;
        return o;
      },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date).filter(d => d.total > 0);

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 300,
    marginLeft: 55,
    x: {type: "utc", label: null},
    y: {label: "Market share", grid: true, tickFormat: d => (d * 100).toFixed(0) + "%"},
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      Plot.areaY(shareTidy, {
        x: "date",
        y: "contracts",
        fill: "platform",
        offset: "expand",
        order: ["Crypto.com/Nadex", "ForecastEx", "Polymarket US", "Kalshi"],
        curve: "monotone-x",
        fillOpacity: 0.85
      }),
      Plot.ruleX(shareByDate, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(shareByDate, Plot.pointerX({
        x: "date",
        title: d => [
          fmtDate(d.date),
          ...colorDomain
            .filter(p => d[p] != null)
            .map(p => `${p}: ${((d[p] / d.total) * 100).toFixed(1)}%`)
        ].join("\n")
      }))
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Share of total reported US prediction market contracts. Kalshi dominates; growing slivers at the bottom show ForecastEx and Polymarket US gaining ground.</p>
