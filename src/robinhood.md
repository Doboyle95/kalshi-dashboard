---
title: Robinhood on Kalshi
---

<div class="page-hero" data-accent="robinhood">
  <div class="page-eyebrow">Robinhood</div>
  <h1>Robinhood on Kalshi</h1>
  <p class="page-lead">How big is Robinhood's event-contract business? Using daily CFTC filings and Kalshi open interest data, we estimate monthly volume and track Robinhood's declining share of a fast-growing platform.</p>
  <div class="page-meta">All figures on this page are estimates. See the methodology note below for how they are derived and what the uncertainty is.</div>
</div>

<details class="surface-card compact-details" open>
  <summary>⚠ Methodology — these are estimates</summary>
  <p>Robinhood Derivatives LLC files daily financial reports with the CFTC. These filings include <em>swap_open_long</em> — the dollar value of Robinhood's open long positions at Kalshi each day. We use this as a proxy for Robinhood's proportional share of Kalshi's market activity.</p>
  <p><strong>Monthly estimates</strong> are calibrated using 11 months (May 2025–Mar 2026) where both CFTC filings and full Kalshi volume data overlap. A single coefficient (cross-validated MAPE ~8%) converts the open-interest ratio into a volume estimate.</p>
  <p><strong>Weekly estimates</strong> apply the same coefficient to daily Kalshi open interest snapshots, then aggregate to weeks. Weeks with anomalous OI snapshots (off-hours reads caught between market cycles) are excluded from the ratio calculation.</p>
  <p>Robinhood does not file on weekends; weekly estimates use the weekday average OI ratio applied to the full 7-day Kalshi volume.</p>
</details>

```js
const monthly = await FileAttachment("data/rh_monthly_estimates.csv").csv({typed: true});
const weekly  = await FileAttachment("data/rh_weekly_estimates.csv").csv({typed: true});
```

```js
const fmtB    = n => (n ?? 0).toFixed(2) + "B";
const fmtPct  = n => (n ?? 0).toFixed(1) + "%";
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", year: "numeric", timeZone: "UTC"}) ?? "";
// Weeks need the day — "Week of Apr 2026" is ambiguous across 4-5 weeks.
const fmtWeek = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";

// Parse month strings ("2025-04") into Date objects
const monthlyParsed = monthly.map(d => ({
  ...d,
  month_date: new Date(d.month + "-01")
}));

// Summary stats
const peakMonthly = monthlyParsed.reduce((best, d) => d.rh_est_billions > best.rh_est_billions ? d : best, monthlyParsed[0]);
const latestMonthly = monthlyParsed[monthlyParsed.length - 1];
const peakShare  = weekly.reduce((best, d) => d.rh_share_pct > best.rh_share_pct ? d : best, weekly[0]);
const latestShare = weekly[weekly.length - 1];
```

## Monthly estimated volume

<p class="section-intro">Robinhood's estimated contracts traded on Kalshi each month, calibrated directly from CFTC filings. April 2025 is partial (filings begin April 7). April 2026 is a partial month.</p>

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Peak month (estimated)</div>
    <div class="kpi-value">${fmtB(peakMonthly?.rh_est_billions)}</div>
    <div class="kpi-meta">${fmtDate(peakMonthly?.month_date)} — ${fmtPct(peakMonthly?.rh_share_pct)} of Kalshi</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Latest month (estimated)</div>
    <div class="kpi-value">${fmtB(latestMonthly?.rh_est_billions)}</div>
    <div class="kpi-meta">${fmtDate(latestMonthly?.month_date)} — ${fmtPct(latestMonthly?.rh_share_pct)} of Kalshi</div>
  </div>
</div>

```js
Plot.plot({
  marginLeft: 55, marginBottom: 50,
  height: 320,
  x: {
    label: null,
    // utcFormat, not timeFormat: the ticks are UTC month boundaries, and formatting
    // them in local time shifts every label one month early for US viewers
    // ("Mar '25" under the April bar) while the tooltips (UTC) say the right month.
    tickFormat: d => d3.utcFormat("%b '%y")(d),
    tickRotate: -35
  },
  y: {
    label: "Estimated contracts (billions)",
    grid: true,
    tickFormat: d => d.toFixed(1) + "B"
  },
  marks: [
    Plot.barY(monthlyParsed, {
      x: "month_date",
      y: "rh_est_billions",
      fill: "var(--accent-robinhood)",
      fillOpacity: 0.85,
      interval: d3.utcMonth,
      tip: {
        format: {
          x: d => fmtDate(d),
          y: d => fmtB(d) + " contracts"
        }
      }
    }),
    Plot.ruleY([0])
  ]
})
```

---

## Robinhood's share of Kalshi volume (weekly)

<p class="section-intro">Week-by-week, Robinhood's estimated share of all Kalshi event contracts traded. The decline from ~55% during NFL season peak (Sep–Nov 2025) to ~20% by spring 2026 reflects a platform that grew faster than any single participant could keep up with.</p>

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Peak weekly share (estimated)</div>
    <div class="kpi-value">${fmtPct(peakShare?.rh_share_pct)}</div>
    <div class="kpi-meta">Week of ${fmtWeek(peakShare?.week_start)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Latest weekly share (estimated)</div>
    <div class="kpi-value">${fmtPct(latestShare?.rh_share_pct)}</div>
    <div class="kpi-meta">Week of ${fmtWeek(latestShare?.week_start)}</div>
  </div>
</div>

```js
const brushWeekly = view(makeBrush());
```

```js
function makeBrush() {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(weekly, d => d.week_start)).range([ml, w - mr]);
  const yMax = d3.max(weekly, d => d.rh_share_pct) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(weekly)
    .attr("fill", "var(--accent-robinhood)").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.week_start)).y0(h - mb).y1(d => y(d.rh_share_pct))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultStart = d3.min(weekly, d => d.week_start);
  const defaultEnd   = d3.max(weekly, d => d.week_start);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "var(--accent-robinhood)").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

```js
const weeklyFiltered = weekly.filter(d => d.week_start >= brushWeekly[0] && d.week_start <= brushWeekly[1]);
```

```js
Plot.plot({
  marginLeft: 50,
  height: 340,
  x: { label: null },
  y: {
    label: "Estimated RH share (%)",
    grid: true,
    domain: [0, Math.min(70, d3.max(weeklyFiltered, d => d.rh_share_pct) * 1.15 || 70)],
    tickFormat: d => d + "%"
  },
  marks: [
    Plot.ruleY([0]),
    Plot.line(weeklyFiltered, {
      x: "week_start", y: "rh_share_pct",
      stroke: "var(--accent-robinhood)", strokeWidth: 2,
      curve: "monotone-x"
    }),
    Plot.dot(weeklyFiltered, {
      x: "week_start", y: "rh_share_pct",
      fill: "var(--accent-robinhood)", r: 3,
      tip: {
        format: {
          x: d => "Week of " + fmtWeek(d),
          y: d => fmtPct(d) + " of Kalshi"
        }
      }
    })
  ]
})
```
