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
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const monthly = await DataAttachment("data/rh_monthly_estimates.csv").csv({typed: true});
const weekly  = await DataAttachment("data/rh_weekly_estimates.csv").csv({typed: true});
import {renderDateBrush} from "./components/date-brush.js";
import {freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
// 2026-08-07: this page had NO freshness panel -- the only page besides chat.md without one.
// That matters more here than anywhere else on the site, because both feeds are REWRITTEN on
// every sync while their CONTENT has not advanced since April:
//     rh_monthly_estimates.csv   max month      2026-04      mtime 2026-08-06 23:17
//     rh_weekly_estimates.csv    max week_start 2026-04-20   mtime 2026-08-06 23:17
// So an mtime-based signal reports "fresh, written minutes ago" over ~108-day-old data, and the
// page looked current. Hence: driven by latestDate() over the DATA, and deliberately passing NO
// updatedAt -- fileUpdatedAt() would actively mislead on this page.
//
// Root cause is upstream and unfixed: R/export_rh_estimates.R:39-42 quits 0 when
// KALSHI_RH_FCM_CSV is absent, and that path points at a lost-laptop location. Until the CFTC
// filing feed is re-established these numbers cannot advance, so say so rather than render
// April figures as though they were current.
const rhMonthlyLatest = latestDate(monthlyParsed, d => d.month_date);
const rhWeeklyLatest  = latestDate(weekly, d => d.week_start);
const rhStaleDays = rhWeeklyLatest ? Math.floor((Date.now() - +rhWeeklyLatest) / 86400000) : null;

display(freshnessPanel({
  title: rhStaleDays != null && rhStaleDays > 14
    ? `Data freshness — these estimates stopped updating ${rhStaleDays} days ago`
    : "Data freshness",
  items: [
    {label: "Monthly estimates", date: rhMonthlyLatest,
     meta: "Latest complete month present in the data", tone: "settlement"},
    {label: "Weekly estimates", date: rhWeeklyLatest,
     meta: "Latest week present in the data", tone: "settlement"}
  ],
  note: rhStaleDays != null && rhStaleDays > 14
    ? `Every figure on this page is as of ${fmtWeek(rhWeeklyLatest)} and will not move until the `
      + `CFTC filing feed that drives it is restored. The underlying files are rewritten on every `
      + `sync, so their timestamps look current — the data inside them is not. Treat the numbers `
      + `below as a historical snapshot, not as the present state.`
    : "Estimates derived from daily CFTC filings; see the methodology note above."
}));
```

```js
const fmtB    = n => (n ?? 0).toFixed(2) + "B";
const fmtPct  = n => (n ?? 0).toFixed(1) + "%";
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", year: "numeric", timeZone: "UTC"}) ?? "";
// Weeks need the day — "Week of Apr 2026" is ambiguous across 4-5 weeks.
const fmtWeek = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";

// `month` is "2025-04" in the file, but the transport's autoType has ALREADY turned it
// into a Date -- remote-data.js's ISO_DATE matches a bare year-month. So `d.month + "-01"`
// did not append a day to a string; it stringified a Date to its LOCAL form and appended
// "-01", which V8 then read as a UTC offset. Measured: "2025-04" came back as
// 2025-03-31T21:00Z for an Eastern viewer, so every bar was labelled one month early.
// That is the real cause of the off-by-one the tickFormat comment below was chasing.
// Rebuild the UTC month start from the parts, and still accept a plain string in case
// the transport's typing ever changes.
const monthStart = (v) => v instanceof Date
  ? new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), 1))
  : new Date(String(v) + "-01T00:00:00Z");
const monthlyParsed = monthly.map(d => ({...d, month_date: monthStart(d.month)}));

// Summary stats
const peakMonthly = monthlyParsed.reduce((best, d) => d.rh_est_billions > best.rh_est_billions ? d : best, monthlyParsed[0]);
const latestMonthly = monthlyParsed[monthlyParsed.length - 1];
const peakShare  = weekly.reduce((best, d) => d.rh_share_pct > best.rh_share_pct ? d : best, weekly[0]);
const latestShare = weekly[weekly.length - 1];
```

## Robinhood distribution estimate

```js
const robinhoodMetric = view(Inputs.radio(
  ["Estimated volume", "Share of Kalshi"],
  {label: "View", value: "Estimated volume"}
));
```

<p class="section-intro">${robinhoodMetric === "Estimated volume"
  ? "Estimated monthly contracts distributed through Robinhood, calibrated from CFTC filings. April 2025 and April 2026 are partial months."
  : "Robinhood's estimated weekly share of Kalshi volume. Use the range selector to inspect a shorter period."}</p>

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">${robinhoodMetric === "Estimated volume" ? "Peak month" : "Peak weekly share"} (estimated)</div>
    <div class="kpi-value">${robinhoodMetric === "Estimated volume" ? fmtB(peakMonthly?.rh_est_billions) : fmtPct(peakShare?.rh_share_pct)}</div>
    <div class="kpi-meta">${robinhoodMetric === "Estimated volume" ? `${fmtDate(peakMonthly?.month_date)} — ${fmtPct(peakMonthly?.rh_share_pct)} of Kalshi` : `Week of ${fmtWeek(peakShare?.week_start)}`}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">${robinhoodMetric === "Estimated volume" ? "Latest month" : "Latest weekly share"} (estimated)</div>
    <div class="kpi-value">${robinhoodMetric === "Estimated volume" ? fmtB(latestMonthly?.rh_est_billions) : fmtPct(latestShare?.rh_share_pct)}</div>
    <div class="kpi-meta">${robinhoodMetric === "Estimated volume" ? `${fmtDate(latestMonthly?.month_date)} — ${fmtPct(latestMonthly?.rh_share_pct)} of Kalshi` : `Week of ${fmtWeek(latestShare?.week_start)}`}</div>
  </div>
</div>

```js
const rhMonthFrom = d3.min(monthlyParsed, d => d.month_date);
const rhMonthTo = d3.max(monthlyParsed, d => d.month_date);
const rhMonthSel = Mutable([rhMonthFrom, rhMonthTo]);
display(robinhoodMetric === "Estimated volume"
  ? renderDateBrush({
      data: monthlyParsed.map(d => ({date: d.month_date, value: d.rh_est_billions})),
      initialRange: [rhMonthFrom, rhMonthTo],
      onSelect: range => { rhMonthSel.value = range; },
      color: "var(--accent-robinhood)",
      width
    })
  : html``);
```

```js
const [rhBrushFrom, rhBrushTo] = rhMonthSel;
const monthlyBrushed = monthlyParsed.filter(d => d.month_date >= rhBrushFrom && d.month_date <= rhBrushTo);
```

```js
robinhoodMetric === "Estimated volume" ? Plot.plot({
  marginLeft: 55, marginBottom: 50,
  height: 320,
  x: {
    // A band scale over one row per month. `interval` belongs HERE, on the scale, not
    // on the barY mark: as a mark option Plot applies it to the mark's VALUE dimension,
    // which for barY is y. That is what broke this chart -- every y was expanded into a
    // month-long span in milliseconds, so all 13 bars became identical and full-height
    // and the y axis read "2678400000.0B" (31 days in ms) instead of billions.
    interval: d3.utcMonth,
    label: null,
    // utcFormat, not timeFormat: the ticks are UTC month boundaries. (The "Mar '25 under
    // the April bar" this was written for was actually the date-parsing bug fixed above.)
    tickFormat: d => d3.utcFormat("%b '%y")(d),
    tickRotate: -35
  },
  y: {
    label: "Estimated contracts (billions)",
    grid: true,
    tickFormat: d => (+d).toFixed(1) + "B"
  },
  marks: [
    Plot.barY(monthlyBrushed, {
      x: "month_date",
      y: "rh_est_billions",
      fill: "var(--accent-robinhood)",
      fillOpacity: 0.85,
      // Named channels rather than formatting x/y directly: Plot labels a tip row with
      // the channel's own name, and with `label: null` on the x scale that fell back to
      // the raw field, so the tip read "month_date" and "rh_share_pct". Suppressing x/y
      // and declaring three named channels gives three clean rows instead.
      channels: {
        Month: (d) => fmtDate(d.month_date),
        Estimated: (d) => fmtB(d.rh_est_billions) + " contracts",
        "Share of Kalshi": (d) => fmtPct(d.rh_share_pct)
      },
      tip: {format: {x: false, y: false, fill: false}}
    }),
    Plot.ruleY([0])
  ]
}) : null
```

```js
const brushWeekly = robinhoodMetric === "Share of Kalshi"
  ? view(makeBrush())
  : d3.extent(weekly, d => d.week_start);
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
  svg.selectAll(".handle").style("fill", "var(--accent-robinhood)").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

```js
const weeklyFiltered = weekly.filter(d => d.week_start >= brushWeekly[0] && d.week_start <= brushWeekly[1]);
```

```js
robinhoodMetric === "Share of Kalshi" ? Plot.plot({
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
}) : null
```
