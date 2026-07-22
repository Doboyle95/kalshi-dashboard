---
title: Competitors
---

<div class="page-hero" data-accent="kalshi">
  <div class="page-eyebrow">Comparison</div>
  <h1>Platform Comparison</h1>
  <p class="page-lead">Every US regulated prediction-market venue on one chart — Kalshi, Polymarket US, ForecastEx, Crypto.com/Nadex, CME (where FanDuel and DraftKings clear), and Rothera (Robinhood's own exchange). Kalshi is the story; switch to log scale to see the rest underneath it. CME is collected by hand from daily bulletins, so its line is sparse.</p>
  <p class="page-lead">DKeX (DraftKings, formerly Railbird) is included as the orange line from its public daily reports.</p>
  <p class="page-lead">Underdog Exchange (Underdog Fantasy's own exchange) is included as the yellow line from its public daily reports — it's a brand-new, very low-volume venue, so expect a mostly-flat line with the occasional spike.</p>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Kalshi comes from cleaned internal daily aggregates; competitor series come from public daily platform reports normalized into <code>competitor_daily.csv</code>. The metric toggle switches between contracts and fees where available. The brush changes the visible window, not the underlying all-time source data.</p>
  <p>On a linear scale, Kalshi turns every other platform into a flat line. Log scale is where the smaller-platform race becomes visible.</p>
</details>

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
const cme        = await FileAttachment("data/cme_daily_distributed.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Kalshi", date: latestDate(kalshi), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Can be within 15 minutes locally when the collector is running"},
    {label: "Competitors", date: latestDate(competitor.filter(d => d.platform !== "Kalshi")), updatedAt: fileUpdatedAt(freshness, "competitor_daily.csv"), meta: "Public platform files/scrapes", tone: "competitor"}
  ],
  note: "Kalshi rows can be fresher than competitor rows. Polymarket, ForecastEx, DKeX, Underdog Exchange, Crypto.com/Nadex, and Rothera update when their external files are downloaded and rebuilt."
}));
display(askPageLink({
  question: "Compare the latest Kalshi volume with Polymarket US, ForecastEx, DKeX, Underdog Exchange, Crypto.com/Nadex, and Rothera, noting any freshness caveats.",
  context: "Platform Comparison page using daily_overall.csv and competitor_daily.csv."
}));
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
    name: "DKeX", color: "#F97316",
    data: competitor.filter(d => d.platform === "DKeX")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: d.fees === "" || d.fees == null ? null : +d.fees}))
  },
  {
    name: "Underdog Exchange", color: "#EAB308",
    data: competitor.filter(d => d.platform === "Underdog Exchange")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: d.fees === "" || d.fees == null ? null : +d.fees}))
  },
  {
    name: "Crypto.com/Nadex", color: "#9c27b0",
    data: competitor.filter(d => d.platform === "Crypto.com/Nadex")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: +d.fees}))
  },
  {
    name: "CME (FanDuel + DraftKings)", color: "#9A6D1F",
    data: cme.filter(d => d.cme_total_vol > 0)
      .map(d => ({date: d.date, contracts: +d.cme_total_vol, fees: null}))
  },
  {
    // Robinhood brand green (Rothera = Robinhood's exchange); orange is DKeX's now.
    name: "Rothera", color: "#00C805",
    data: competitor.filter(d => d.platform === "Rothera")
      .map(d => ({date: d.date, contracts: +d.contracts, fees: d.fees === "" || d.fees == null ? null : +d.fees}))
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
      if (!event.selection) {
        // Clearing the brush (a bare click) now means "show everything": reset to
        // the full domain and redraw the selection so the visuals match the filter.
        svg.property("value", x.domain());
        brushG.call(brush.move, x.domain().map(x));   // programmatic move — guarded above, no re-fire
        svg.dispatch("input");
        return;
      }
      svg.property("value", event.selection.map(x.invert)); svg.dispatch("input");
    });

  const brushG = svg.append("g").attr("class", "brush");


  brushG.call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

<p class="section-intro">Platform volume, day by day. Flip to Fees when the question is who's actually getting paid.</p>

```js
const dr_abs = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_abs;
  // Axis ticks stay coarse (.toFixed(1) billions)
  const fmt = metric === "contracts"
    ? d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));
  // #94: finer billions for the hover tip (.toFixed(2) → "2.91B" not "2.9B")
  const fmtFine = metric === "contracts"
    ? d => (d >= 1e9 ? (d/1e9).toFixed(2)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(2)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));

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
    marginLeft: 70,
    marginRight: 16,
    x: {type: "utc", label: null},
    y: {
      type: compLogScale === "Log" ? "log" : "linear",
      label: metric === "contracts" ? "Daily volume (contracts)" : "Daily fees ($)",
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
        title: d => [fmtDate(d.date), ...colorDomain.map(p => d[p] != null ? `${p}: ${fmtFine(d[p])} (${d[p].toLocaleString()})` : null).filter(Boolean)].join("\n")
      })),
      ...(compLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Shared Y-axis — the scale gap is real. Kalshi = US exchange trade records. Polymarket US = US-accessible volume only (separate from global Polymarket). ForecastEx = full exchange volume. Crypto.com/Nadex = event binary contracts only (from CFTC daily bulletins, starts Dec 2024); fees computed at $0.02/contract (exchange fee for $1 contracts; settlement fees waived). CME = FanDuel + DraftKings combined event-contract volume (both clear through CME), hand-collected from daily bulletins so it's sparse. CME lumps each weekend's volume into the following Monday's bulletin, so here we spread Monday (and holiday-weekend) volume back across the days it actually traded, so the line reflects when activity happened rather than spiking every Monday. No fee series. (The CME page itself shows the raw bulletin numbers.)</p>

<div class="control-strip">

```js
const metric       = view(Inputs.radio(["contracts", "fees"], {value: "contracts", label: "Metric", format: x => x === "contracts" ? "Volume" : "Fees"}));
const compLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

</div>

## Market share

<p class="section-intro">The US market split over time — and how little of it belongs to anyone but Kalshi.</p>

```js
const dr_share = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_share;

  // A3 fix: exclude CME from the 100%-stacked share denominator. CME is sparse (~57 days) and is
  // omitted from the legend `order` + caption, so including it normalized every other platform's
  // share downward on CME's days only (inconsistent denominator). Share chart only; tooltips derive.
  const shareTidy = platforms.filter(p => !p.name.includes("CME")).flatMap(p =>
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
    marginLeft: 70,
    x: {type: "utc", label: null},
    y: {label: "Market share", grid: true, tickFormat: d => (d * 100).toFixed(0) + "%"},
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      Plot.areaY(shareTidy, {
        x: "date",
        y: "contracts",
        fill: "platform",
        offset: "expand",
        order: ["Underdog Exchange", "DKeX", "Rothera", "Crypto.com/Nadex", "ForecastEx", "Polymarket US", "Kalshi"],
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
