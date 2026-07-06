---
title: Overview
---

<div class="page-hero">
  <div class="page-eyebrow">Market Structure</div>
  <h1>US Prediction Market Dashboard</h1>
  <p class="page-lead">A side-by-side look at the United States' regulated prediction markets. Kalshi runs away with the volume; ForecastEx, Polymarket US, DKeX, and Crypto.com/Nadex remain a small fraction of its scale.</p>
</div>

```js
const kalshi = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
const hourly = await FileAttachment("data/trades_by_hour.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Kalshi aggregates", date: latestDate(kalshi), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Local pipeline can refresh within minutes when the collector is running"},
    {label: "Trades by hour", date: latestDate(hourly), updatedAt: fileUpdatedAt(freshness, "trades_by_hour.csv"), meta: "Refreshes on the same near-live cycle as the aggregates above"},
    {label: "Competitor comparison", date: latestDate(competitor), updatedAt: fileUpdatedAt(freshness, "competitor_daily.csv"), meta: "Public competitor sources + Kalshi API rows", tone: "competitor"}
  ],
  note: "This static page is current as of the CSV snapshot committed or synced into the dashboard. Local refresh scripts can be fresher than the public GitHub Pages build."
}));
display(askPageLink({
  question: "Summarize the latest platform comparison and identify what changed most recently.",
  context: "Overview page with daily_overall.csv and competitor_daily.csv."
}));
```

```js
const fmtCount    = n => n >= 1e9 ? (n/1e9).toFixed(2)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
const fmtUSD      = n => "$" + fmtCount(n);
const fmtUSDWhole = n => "$" + (n >= 1e9 ? (n/1e9).toFixed(2)+"B" : Math.round(n/1e6)+"M");
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const totalContracts = d3.sum(kalshi, d => d.contracts_total);
const totalFees = d3.sum(kalshi, d => d.fees_total);
const peakDay = kalshi.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, kalshi[0]);
// "Run rate" should reflect *current* pace, not all-time average. Use the trailing
// 30 days of fee data (excluding today if it is partial, since today understates).
// All-time average (the old calc) drags this down by ~10x because of sparse pre-2024 days.
const isPartialIdx = d => d.is_partial === true || d.is_partial === "TRUE";
const completedKalshi = kalshi.filter(d => !isPartialIdx(d));
const recent30 = completedKalshi.slice(-30);
const recentDailyFees = recent30.length > 0 ? d3.mean(recent30, d => d.fees_total) : 0;
const annualizedFees = Math.round(recentDailyFees * 365 / 1e6) * 1e6;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Kalshi all-time volume</div>
    <div class="kpi-value" title="${totalContracts.toLocaleString()} contracts">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Kalshi all-time fee revenue</div>
    <div class="kpi-value" title="$${totalFees.toLocaleString()}">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Kalshi annualized revenue run rate</div>
    <div class="kpi-value" title="$${annualizedFees.toLocaleString()}/yr">${fmtUSDWhole(annualizedFees)}/yr</div>
    <div class="kpi-meta">based on trailing 30 days</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Kalshi peak single day volume</div>
    <div class="kpi-value" title="${(peakDay?.contracts_total ?? 0).toLocaleString()} contracts">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)} · contracts</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Volume here means contracts traded, not dollars: one contract is one yes/no bet. Kalshi's figures come from its own trade records; competitor lines come from public sources, including CFTC daily bulletins and platform reports, so they update less often. Crypto.com/Nadex data begins in December 2024; DKeX data begins with its public DraftKings/Railbird reports in June 2026.</p>
  <p>Kalshi is so far ahead that the smaller platforms can disappear on a normal axis. Start on linear scale for market size, then switch to log scale to see the smaller lines more clearly.</p>
</details>

## Platform comparison

<p class="section-intro">Daily trading volume by platform. Drag the brush to zoom into a stretch; switch to log scale when the smaller platforms vanish against Kalshi.</p>

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

  const brushG = svg.append("g");


  brushG.call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
})());
```

<div class="plot-shell">

```js
{
  const [s, e] = indexBrush;
  const fmt = d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k");
  const pColors = {
    Kalshi: "#00C2A8", "Polymarket US": "#3B7DD8",
    ForecastEx: "#E53535", DKeX: "#F97316", "Crypto.com/Nadex": "#9c27b0"
  };

  const byPlatform = {
    Kalshi:             kalshiTidy,
    "Polymarket US":    competitorTidy.filter(d => d.platform === "Polymarket US"),
    ForecastEx:         competitorTidy.filter(d => d.platform === "ForecastEx"),
    DKeX:               competitorTidy.filter(d => d.platform === "DKeX"),
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
    marginLeft: 70,
    marginRight: 16,
    x: {type: "utc", label: null, domain: [s, e]},
    y: {type: indexLogScale === "Log" ? "log" : "linear", label: "Daily volume (contracts)", grid: true, tickFormat: fmt},
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
        title: d => [fmtDate(d.date), ...Object.keys(pColors).map(p => d[p] != null ? `${p}: ${fmt(d[p])} (${d[p].toLocaleString()})` : null).filter(Boolean)].join("\n")
      })),
      ...(indexLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

</div>

<div class="control-strip">

```js
const indexLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

</div>

## Recent daily volume

<p class="section-intro">Exact daily volume (contracts traded) by platform for the last two weeks — for when you want the number, not the trend. The newest row (bold) is a partial, in-progress day, and the competitor sources lag 1–3 days behind Kalshi.</p>

<div class="surface-card" style="overflow-x:auto">

```js
display((() => {
  const platforms = [
    {key: "Kalshi", color: "#00C2A8"},
    {key: "Polymarket US", color: "#3B7DD8"},
    {key: "ForecastEx", color: "#E53535"},
    {key: "DKeX", color: "#F97316"},
    {key: "Crypto.com/Nadex", color: "#9c27b0"}
  ];
  // platform -> (epoch-date -> contracts), from the same tidy data the chart uses
  const lookup = new Map(platforms.map(p => [p.key, new Map()]));
  for (const r of allPlatforms) {
    if (r.contracts != null && lookup.has(r.platform)) lookup.get(r.platform).set(+r.date, r.contracts);
  }
  // last 14 calendar days, newest first (Kalshi is the most complete date axis)
  const dates = Array.from(new Set(kalshiTidy.map(d => +d.date))).sort((a, b) => b - a).slice(0, 14);
  const fmtDay = dk => new Date(dk).toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric", timeZone: "UTC"});
  const cell = n => n == null ? html`<span style="color:var(--theme-foreground-muted)">—</span>` : html`<span title="${n.toLocaleString()}">${fmtCount(n)}</span>`;
  return html`<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:0.92rem">
    <thead><tr style="border-bottom:2px solid var(--card-border)">
      <th style="text-align:left;padding:0.45rem 0.7rem">Date</th>
      ${platforms.map(p => html`<th style="text-align:right;padding:0.45rem 0.7rem;color:${p.color}">${p.key}</th>`)}
    </tr></thead>
    <tbody>
      ${dates.map((dk, i) => html`<tr style="border-bottom:1px solid var(--theme-background-alt)${i === 0 ? ";font-weight:600" : ""}">
        <td style="text-align:left;padding:0.38rem 0.7rem;white-space:nowrap">${fmtDay(dk)}</td>
        ${platforms.map(p => html`<td style="text-align:right;padding:0.38rem 0.7rem">${cell(lookup.get(p.key).get(dk))}</td>`)}
      </tr>`)}
    </tbody>
  </table>`;
})());
```

</div>

<p class="section-intro" style="font-size:0.8rem;opacity:0.7">Volume is contracts traded (one contract = one yes/no bet), not dollars. "—" means that platform has no figure for that day yet.</p>

## Trading activity today

<p class="section-intro">Kalshi trades by hour (Eastern Time) for the current day, split into sports (parlays counted as sports) and non-sports. This also works as a quick pulse check on the data pipeline: the newest bar is still filling in, and if it — or the "Trades by hour" freshness badge above — stops advancing for a long stretch, the trade collector has likely stopped running.</p>

```js
const isPartialHour = d => d.is_partial === true || d.is_partial === "TRUE";

// The CSV keeps full history so this chart can grow to cover other days later,
// but today's request is specifically "the current day" — filter to the latest
// date present and reserve all 24 hour slots (band domain) so the axis doesn't
// keep resizing as the day goes on.
const hourlyToday = (() => {
  const latest = d3.max(hourly, d => d.date);
  return hourly.filter(d => +d.date === +latest).sort((a, b) => a.hour_et - b.hour_et);
})();

// Long format for the stacked bars — one row per hour x group. Plot's barY
// stacks automatically when several rows share an x and a fill channel.
const hourlyLong = hourlyToday.flatMap(d => [
  {hour_et: d.hour_et, group: "Sports", trades: d.trades_sports, partial: isPartialHour(d)},
  {hour_et: d.hour_et, group: "Non-sports", trades: d.trades_nonsports, partial: isPartialHour(d)}
]);

const fmtHour12 = h => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
const groupColors = {Sports: "#1a9641", "Non-sports": "#5b8def"};
```

<div class="plot-shell">

```js
if (!hourlyToday.length) {
  display(html`<p class="section-intro">No trades recorded yet today.</p>`);
} else {
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 320,
    marginLeft: 60,
    marginRight: 16,
    x: {type: "band", domain: d3.range(24), tickFormat: fmtHour12, label: "Hour (Eastern Time)"},
    y: {grid: true, label: "Trades", tickFormat: fmtCount},
    color: {legend: true, domain: Object.keys(groupColors), range: Object.values(groupColors)},
    marks: [
      Plot.barY(hourlyLong, {
        x: "hour_et", y: "trades", fill: "group",
        fillOpacity: d => d.partial ? 0.45 : 1,
        rx: 2
      }),
      Plot.text(hourlyToday.filter(isPartialHour), {
        x: "hour_et", y: d => d.trades_sports + d.trades_nonsports, dy: -10,
        text: () => "still counting",
        fontSize: 11,
        fill: "currentColor"
      }),
      Plot.tip(hourlyToday, Plot.pointerX({
        x: "hour_et", y: d => d.trades_sports + d.trades_nonsports,
        title: d => [
          fmtHour12(d.hour_et),
          `Sports: ${d.trades_sports.toLocaleString()} trades, ${d.contracts_sports.toLocaleString()} contracts, $${d.taker_side_notional_sports.toLocaleString()} taker-side volume`,
          `Non-sports: ${d.trades_nonsports.toLocaleString()} trades, ${d.contracts_nonsports.toLocaleString()} contracts, $${d.taker_side_notional_nonsports.toLocaleString()} taker-side volume`,
          isPartialHour(d) ? "(hour still in progress)" : null
        ].filter(Boolean).join("\n")
      })),
      Plot.ruleY([0])
    ]
  }));
}
```

</div>
