---
title: Kalshi Fee Revenue
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Fee Revenue</h1>
  <p class="page-lead">How much Kalshi actually makes from all that trading — fees collected day by day, who's contributed over time, and how many cents it keeps per contract.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const daily = await DataAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await DataAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {dateBrushFromUrl} from "./components/url-range.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Fee totals", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Can be within 15 minutes locally when the collector is running"},
    {label: "Sports fee split", date: latestDate(sports), updatedAt: fileUpdatedAt(freshness, "daily_sports_vs_nonsports.csv"), meta: "Can be within 15 minutes locally after near-live refresh"}
  ],
  note: "Fee-rate calculations update with the daily aggregate files; today can remain partial until the trading day closes."
}));
display(askPageLink({
  question: "Analyze the latest Kalshi fee revenue and whether sports or non-sports are driving recent fee-rate changes.",
  context: "Kalshi Fee Revenue page using daily_overall.csv, daily_sports_vs_nonsports.csv, daily_top_categories_fees.csv, daily_top_categories.csv, and category_leaderboard.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
// Fee KPIs
const totalFees      = d3.sum(daily, d => d.fees_total);
// "Run rate" reflects the *current* pace, not the all-time average. Use the trailing
// 30 COMPLETED days of fee data (excluding today if partial). Matches the calc on
// index.md; the old all-time-average method understated this ~10x because of the
// years of sparse, near-zero pre-2024 days dragging the mean down.
const isPartialFee    = d => d.is_partial === true || d.is_partial === "TRUE";
const completedDaily  = daily.filter(d => !isPartialFee(d));
const recent30Fees    = completedDaily.slice(-30);
const recentDailyFees = recent30Fees.length > 0 ? d3.mean(recent30Fees, d => d.fees_total) : 0;
const annualizedFees  = Math.round(recentDailyFees * 365 / 1e6) * 1e6;
const peakFeeDay     = daily.reduce((best, d) => (d.fees_total||0) > (best.fees_total||0) ? d : best, daily[0]);
const totalContracts = d3.sum(daily, d => d.contracts_total);
const avgFeeRate     = totalFees / totalContracts * 100; // cents per contract
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">All-time fee revenue</div>
    <div class="kpi-value" title="$${totalFees.toLocaleString()}">${fmtUSD(totalFees)}</div>
  </div>
  <div class="kpi-card" data-accent="tertiary">
    <div class="kpi-label">Annualized run rate</div>
    <div class="kpi-value" title="$${annualizedFees.toLocaleString()}/yr">${fmtUSD(annualizedFees)}/yr</div>
    <div class="kpi-meta">based on trailing 30 days</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak fee day</div>
    <div class="kpi-value" title="$${(peakFeeDay?.fees_total||0).toLocaleString()}">${fmtUSD(peakFeeDay?.fees_total||0)}</div>
    <div class="kpi-meta">${fmtDate(peakFeeDay?.date)}</div>
  </div>
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Avg fee per contract</div>
    <div class="kpi-value">${avgFeeRate.toFixed(3)} cents</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Fees are summed from Kalshi's trade records and totaled by day. Fee per contract divides daily fees by daily contracts, so it's the realized average rate Kalshi actually collected — not its posted fee schedule. If revenue climbs while cents-per-contract falls, growth is coming from more volume, not a richer take.</p>
</details>

```js
// snap "month": for a chart that sums daily rows into months (opens on whole months).
function makeDateBrush(yAcc = d => d.fees_total || 0, color = "var(--accent-secondary)", snap = null) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(daily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(daily, yAcc) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(daily)
    .attr("fill", color).attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(yAcc(d)))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

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
  brushG.call(brush);
  svg.selectAll(".handle").style("fill", color).style("fill-opacity", 0.8);
  // Opens on the newest 365 days (defaultWindow), or on the URL's window.
  return dateBrushFromUrl(svg.node(), {x, brush, brushG, snap});
}
```

## Daily fee revenue

<p class="section-intro">The fees Kalshi collected each day, from the same trading behind the volume charts.</p>

<div class="instruction-line"><strong>Useful trick:</strong> brush around a major volume spike, then check whether fees stayed elevated after volume cooled off.</div>

```js
const dr1 = view(makeDateBrush());
```

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.fees_total || 0,
      fill: "var(--accent-secondary)", fillOpacity: 0.8
    }),
    Plot.lineY(fd1.filter(d => d.ma7_fees != null), {
      x: "date", y: "ma7_fees",
      stroke: "var(--accent-tertiary)", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(fd1, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd1, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Daily: $${(d.fees_total||0).toLocaleString(undefined, {maximumFractionDigits: 0})}`,
        d.ma7_fees != null ? `7-day avg: $${d.ma7_fees.toLocaleString(undefined, {maximumFractionDigits: 0})}` : null
      ].filter(Boolean).join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:var(--accent-secondary)"></span>Daily fees</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid var(--accent-tertiary)"></span>7-day average</span>
</div>

## Taker vs maker fees

<p class="section-intro">Kalshi bills the aggressor on almost every market, but it also charges the <strong>resting</strong> side on a named subset — soccer, tennis, rate and inflation markets. This splits the daily total above into those two parts.</p>

<div class="instruction-line"><strong>Useful trick:</strong> switch to <em>Share of total</em> and brush across mid-2025 — the maker component changes level when the flat per-contract maker fee gave way to a price-dependent curve, which a dollar view hides behind the growth in volume.</div>

```js
const dr4 = view(makeDateBrush(d => d.fees_total || 0, "#e6550d"));
```

```js
const [s4, e4] = dr4;
const feeSplitShare = feeSplitView === "Share of total";

// A date with no split is DROPPED, not drawn at zero. Zero here would assert "no maker fees
// were charged that day", which is a different claim from "the split is not available".
const feeSplitRows = daily.filter(d =>
  d.date >= s4 && d.date <= e4 && d.fees_taker != null && d.fees_maker != null);

// The stack is built explicitly rather than left to Plot's stack transform: taker sits on the
// baseline, maker directly on top of it, so the top of every bar IS fees_total and the reader
// can check this decomposition against the headline chart above by eye.
const feeSplitStacked = feeSplitRows.flatMap(d => {
  const denom = feeSplitShare ? (d.fees_total || 1) : 1;
  const taker = (d.fees_taker || 0) / denom;
  const maker = (d.fees_maker || 0) / denom;
  return [
    {date: d.date, side: "Taker", y0: 0,     y1: taker},
    {date: d.date, side: "Maker", y0: taker, y1: taker + maker}
  ];
});

// One row per date so the tooltip shows both sides together instead of whichever band the
// pointer happens to be inside.
const feeSplitTip = feeSplitRows.map(d => ({
  date:  d.date,
  taker: d.fees_taker || 0,
  maker: d.fees_maker || 0,
  total: d.fees_total || 0
}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: feeSplitShare
    ? {label: "Share of daily fees", grid: true, domain: [0, 1], tickFormat: d => (d * 100).toFixed(0) + "%"}
    : {label: "Fees (USD)", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {legend: true, domain: ["Taker", "Maker"], range: ["var(--accent-secondary)", "#e6550d"]},
  marks: [
    Plot.rect(feeSplitStacked, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y1: "y0", y2: "y1",
      fill: "side", fillOpacity: 0.85
    }),
    Plot.ruleX(feeSplitTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(feeSplitTip, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Taker: $${d.taker.toLocaleString(undefined, {maximumFractionDigits: 0})} (${(100 * d.taker / (d.total || 1)).toFixed(1)}%)`,
        `Maker: $${d.maker.toLocaleString(undefined, {maximumFractionDigits: 0})} (${(100 * d.maker / (d.total || 1)).toFixed(1)}%)`,
        `Total: $${d.total.toLocaleString(undefined, {maximumFractionDigits: 0})}`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="control-strip">

```js
const feeSplitView = view(Inputs.radio(["Dollars", "Share of total"], {
  label: "View",
  value: "Dollars"
}));
```

</div>

```js
const splitRows      = daily.filter(d => d.fees_taker != null && d.fees_maker != null);
const makerAllTime   = d3.sum(splitRows, d => d.fees_maker);
const takerAllTime   = d3.sum(splitRows, d => d.fees_taker);
const splitTotal     = d3.sum(splitRows, d => d.fees_total);
const rows2026       = splitRows.filter(d => d.date >= new Date("2026-01-01"));
const makerShare2026 = d3.sum(rows2026, d => d.fees_total) > 0
  ? 100 * d3.sum(rows2026, d => d.fees_maker) / d3.sum(rows2026, d => d.fees_total)
  : 0;
```

<div class="chart-note"><strong>Maker fees are ${(100 * makerAllTime / (splitTotal || 1)).toFixed(2)}% of all-time fee revenue</strong> (${fmtUSD(makerAllTime)} of ${fmtUSD(splitTotal)}), and ${makerShare2026.toFixed(2)}% in 2026, spread across a small set of report tickers. The two bands add to the daily total on the chart above them, so this decomposes the headline rather than restating it.</div>

<div class="chart-note"><strong>This page reports total fee revenue — everything Kalshi collects, from both sides.</strong> The Kalshi series on <a href="./compare-fees">Fees &amp; Economics</a> answers a different question: what <em>one trader</em> pays to execute. That number is the taker band alone, ${fmtUSD(takerAllTime)} against ${fmtUSD(splitTotal)} here, because a like-for-like comparison against venues that bill both sides has to count one side at each of them. The gap between the two pages is this maker band, and both figures are correct.</div>

## Cumulative fee revenue

<p class="section-intro">Reported non-sports and sports fees, plus the parlay residual. The published components are mutually exclusive and add up to the headline fee total, so the bands are an exact decomposition of the chart above.</p>

<div class="instruction-line"><strong>Useful trick:</strong> watch the slope, not just the height — a steeper stretch means Kalshi was collecting fees faster in that period.</div>

```js
const dr2 = view(makeDateBrush(d => d.fees_total || 0, "#1a9641"));
```

```js
const [s2, e2] = dr2;
const fs2 = sports.filter(d => d.date >= s2 && d.date <= e2).slice().sort((a, b) => a.date - b.date);

// Parlay fees land in fees_total but in neither fees_sports nor fees_nonsports, so summing
// only those two ran ~10% under the all-time KPI. Take parlays as the residual against
// daily_overall.csv (exactly $0 before 2025, when parlays launched).
const feesTotalByDate = new Map(daily.map(d => [+d.date, d.fees_total || 0]));

// The stack is built explicitly rather than left to Plot's stack transform — areaY given a
// bare `y` stacks implicitly, which is what made this chart disagree with the KPI unnoticed.
// One source of truth for the three band names. The stack, the colour domain and the
// tooltip all read it, so a rename can no longer orphan one of them. That is exactly what
// happened when "Sports" became "Sports (excl. parlays)" in 98002ae: the tooltip kept
// asking for `d.Sports`, got undefined, and printed "Sports: $0" with a Total of $500.1M
// on a page whose own KPI reads $1.85B -- while the band beside it drew the real $1.36bn.
const FEE_BANDS = ["Non-sports", "Sports (excl. parlays)", "Parlays"];
// Keep parlays in the sports family while the lighter lime shade distinguishes
// them from straight sports fees; non-sports stays clearly blue.
const FEE_BAND_COLORS = ["#377eb8", "#1b9e77", "#a6d854"];
const [BAND_NONSPORT, BAND_SPORT, BAND_PARLAY] = FEE_BANDS;
let sCum = 0, nsCum = 0, pCum = 0;
const cumFeesSplit = fs2.flatMap(d => {
  const s  = d.fees_sports_nonparlay || 0;
  const ns = d.fees_nonsports || 0;
  nsCum += ns;
  sCum  += s;
  // Keep the residual non-negative as a guard only. Since the producer made the components
  // mutually exclusive (KalshiData f7063f0, 2026-08-24) they never exceed fees_total --
  // 0 of 1,890 dates on 2026-09-02 -- so this clamps nothing in practice.
  pCum  += Math.max(0, (feesTotalByDate.get(+d.date) ?? (s + ns)) - s - ns);
  return [
    {date: d.date, category: BAND_NONSPORT, cumul: nsCum, y0: 0,            y1: nsCum},
    {date: d.date, category: BAND_SPORT,    cumul: sCum,  y0: nsCum,        y1: nsCum + sCum},
    {date: d.date, category: BAND_PARLAY,   cumul: pCum,  y0: nsCum + sCum, y1: nsCum + sCum + pCum}
  ];
});
```

```js
// Per-date pivot for single combined tooltip
const cumFeesTipData = Array.from(
  d3.rollup(cumFeesSplit, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.category] = r.cumul || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {
    label: "Cumulative fees (USD)", grid: true,
    tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")
  },
  color: {legend: true, domain: FEE_BANDS, range: FEE_BAND_COLORS},
  marks: [
    Plot.areaY(cumFeesSplit, {
      x: "date", y1: "y0", y2: "y1", fill: "category",
      fillOpacity: 0.85, curve: "monotone-x"
    }),
    Plot.ruleX(cumFeesTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(cumFeesTipData, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        ...FEE_BANDS.map(b => `${b}: $${(d[b]||0).toLocaleString(undefined,{maximumFractionDigits:0})}`),
        `Bands shown: $${FEE_BANDS.reduce((t, b) => t + (d[b]||0), 0).toLocaleString(undefined,{maximumFractionDigits:0})}`
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

## Fee revenue mix

<p class="section-intro">Where Kalshi's fee revenue came from over the selected dates, taker and maker fees combined.</p>

```js
import {dateBrush, inDateRange} from "./components/date-brush.js";
// The quick ranges shared by the brushes below, as on the Compare pages.
const QUICK_RANGES = [{label: "90d", days: 90}, {label: "365d", days: 365}, {label: "All", days: Infinity}];
const feeMixRange = view(dateBrush({data: daily, valueAccessor: d => d.fees_total, color: "var(--accent-secondary)", width, quickRanges: QUICK_RANGES}));
```

```js
import {buildFeeRevenueMix, feeRevenueMixPie} from "./components/fee-revenue-mix.js";
const feeMix = buildFeeRevenueMix(daily, sports, nonSportsRowsIn(feeMixRange), feeMixRange);
```

<div class="plot-shell">

```js
feeMix ? feeRevenueMixPie(feeMix, {d3}) : html`<p>No fee data for these dates.</p>`
```

</div>

<div class="chart-note">${feeMix ? `${fmtDate(feeMix.start)} – ${fmtDate(feeMix.end)}. ` : ""}Straight sports excludes parlays. 15-minute markets are crypto, commodity and financial price markets that each run for 15 minutes.</div>

## Fee rate (cents per contract)

<p class="section-intro">The realized average fee Kalshi kept on each contract traded.</p>

<div class="instruction-line"><strong>Useful trick:</strong> after a volume spike, use this to tell whether revenue rose from more contracts or from each contract monetizing better.</div>

```js
const dr3 = view(makeDateBrush(d => d.fees_total / (d.contracts_total || 1) * 100, "var(--accent-secondary)"));
```

```js
const [s3, e3] = dr3;
const feeRate = (
  feeRateView === "Overall"
    ? daily.map(d => ({
        date: d.date,
        contracts: d.contracts_total || 0,
        fees: d.fees_total || 0
      }))
    : sports.map(d => ({
        date: d.date,
        contracts: feeRateView === "Sports (excl. parlays)" ? (d.contracts_sports_nonparlay || 0) : (d.contracts_nonsports || 0),
        fees: feeRateView === "Sports (excl. parlays)" ? (d.fees_sports_nonparlay || 0) : (d.fees_nonsports || 0)
      }))
)
  .filter(d => d.date >= s3 && d.date <= e3 && d.contracts > 0)
  .map(d => ({date: d.date, rate: d.fees / d.contracts * 100}));

const feeRateColor =
  feeRateView === "Sports (excl. parlays)" ? "#1a9641"
  : feeRateView === "Non-sports" ? "var(--accent-kalshi)"
  : "var(--accent-secondary)";
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 240,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Avg fee per contract (cents)", grid: true, tickFormat: d => d.toFixed(2) + "c"},
  marks: [
    Plot.lineY(feeRate, {
      x: "date", y: "rate",
      stroke: feeRateColor, strokeWidth: 1.5, curve: "monotone-x",
      tip: true,
      title: d => `${fmtDate(d.date)}\n${feeRateView} avg fee: ${d.rate.toFixed(3)} cents per contract`
    }),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="control-strip">

```js
const feeRateView = view(Inputs.radio(["Overall", "Sports (excl. parlays)", "Non-sports"], {
  label: "Segment",
  value: "Overall"
}));
```

</div>

## Fees by category over time

<p class="section-intro">The fees Kalshi <em>collected</em>, by category — on a trade-date basis (fees as charged when a trade executes, not when markets settle).</p>

```js
// Moved here from categories.md (2026-09-30) with its three charts. These three files are
// ~21 MB together against ~0.4 MB for everything above, so they load in their own cells and
// the charts above never wait for them (volume.md does the same with topDailyFees).
const topDailyFees = await DataAttachment("data/daily_top_categories_fees.csv").csv({typed: true});
```

```js
import {splitCategoryRows, splitFinanceCategory, ECONOMICS_COLOR, FINANCE_COLOR} from "./components/non-sports-categories.js";
const catLeaderboard = splitCategoryRows(await DataAttachment("data/category_leaderboard.csv").csv({typed: true}));
```

```js
// Report ticker -> display group. A copy of categories.md's wideCategoryForTicker (and its
// wideMap fallback), so a ticker lands in the same category on both pages -- change both.
const wideMap = {
  KXNFLGAME: "NFL", KXNFLSPREAD: "NFL", KXNFLTOTAL: "NFL", KXSB: "NFL",
  KXNCAAFGAME: "College football", KXNCAAFSPREAD: "College football", KXNCAAFTOTAL: "College football",
  KXNBAGAME: "NBA", KXNBASPREAD: "NBA", KXNBATOTAL: "NBA", KXNBA: "NBA",
  KXNCAAMBGAME: "College basketball", KXNCAAMBSPREAD: "College basketball",
  KXNCAAMBTOTAL: "College basketball", KXMARMAD: "College basketball", KXNCAAWBGAME: "College basketball",
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Hockey",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXUFCFIGHT: "Combat sports",
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance", KXCITRINI: "Finance",
  KXFIRSTSUPERBOWLSONG: "Entertainment", KXSUPERBOWLAD: "Entertainment",
  KXPERFORMSUPERBOWLB: "Entertainment", KXSBGUESTS: "Entertainment",
  KXSBADS: "Entertainment", KXHALFTIMESHOW: "Entertainment",
  KXSBPERFORM: "Entertainment", KXSUPERBOWLHEADLINE: "Entertainment",
  KXSBADAPPEARANCES: "Entertainment", KXSBVIEWER: "Entertainment",
  KXSBMENTION: "Entertainment", KXSBSETLISTS: "Entertainment",
  KXHIGHNY: "Weather", KXHIGHLAX: "Weather", KXHIGHMIA: "Weather",
  KXHIGHCHI: "Weather", KXHIGHAUS: "Weather",
  KXMVECROSSCATEGORY: "_skip", KXMVESPORTSMULTIGAMEEXTENDED: "_skip"
};
const CAT_TO_WIDE_GROUP_KEY = {
  "College Football": "College football",
  "College Basketball": "College basketball",
  "Combat Sports": "Combat sports"
};
// R/classify_market.R's per-report_ticker category, carried in the leaderboard CSV.
const classByReportTicker = new Map(
  catLeaderboard
    .filter(d => d.report_ticker && d.grp && d.cat)
    .map(d => [d.report_ticker, {cat: d.cat}])
);
function wideCategoryForTicker(ticker) {
  if (String(ticker || "").toUpperCase().includes("MENTION")) return "Mention";
  const fromR = classByReportTicker.get(ticker);
  if (fromR) return CAT_TO_WIDE_GROUP_KEY[fromR.cat] || fromR.cat;
  return splitFinanceCategory(ticker, wideMap[ticker]);
}
// A day's display groups, and [column, group] for every ticker column of a file that lands in
// one, worked out once per file. wideDailyFees and catVolumeDaily used to call
// wideCategoryForTicker on every cell of every day: ~2.4 s and ~2.9 s of main thread (CPU
// profile, 2026-10-01). The columns keep the rows' own key order, so each group adds its values
// in the same order as before and the totals are bit-identical.
const newWideGroups = () => ({
  NFL: 0, "College football": 0, NBA: 0, "College basketball": 0,
  Baseball: 0, Hockey: 0, Golf: 0, Tennis: 0, Soccer: 0, "Combat sports": 0,
  Crypto: 0, Politics: 0, Finance: 0, Economics: 0, Entertainment: 0, Mention: 0, Weather: 0
});
function wideColumnGroups(rows) {
  return Object.keys(rows[0] ?? {})
    .filter(cat => cat !== "date")
    .map(cat => [cat, wideCategoryForTicker(cat)])
    .filter(([, wg]) => wg && wg !== "_skip" && newWideGroups()[wg] !== undefined);
}
```

```js
// Detailed order/colors for fees — single "Parlay" bucket (no correlated/independent/pending split).
const feesWideOrder = [
  "Other non-sports", "Weather", "Mention", "Entertainment", "Economics", "Finance", "Politics", "Crypto",
  "Other sports", "Combat sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College football", "NFL", "College basketball", "NBA", "Parlay"
];
const feesWideColors = {
  "Other non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Mention": "#78909c", "Finance": FINANCE_COLOR, "Economics": ECONOMICS_COLOR, "Politics": "#455a64", "Crypto": "#263238",
  "Other sports": "#c8e6c9",
  "Combat sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  "College football": "#ffcc80", "NFL": "var(--cat-football)",
  "College basketball": "#90caf9", "NBA": "var(--cat-basketball)",
  "Parlay": "#7b1fa2"
};
// General grouping: the same seven buckets as the volume chart on the Categories page.
const generalMap = {
  "NFL": "Football", "College football": "Football",
  "NBA": "Basketball", "College basketball": "Basketball",
  "Baseball": "Baseball",
  "Soccer": "Soccer",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Combat sports": "Other sports", "Other sports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Economics": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Mention": "Non-sports", "Weather": "Non-sports", "Other non-sports": "Non-sports"
};
const generalOrder  = ["Non-sports", "Other sports", "Baseball", "Soccer", "Basketball", "Football", "Parlay"];
const generalColors = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Soccer": "#827717", "Basketball": "#1565c0", "Football": "var(--cat-football)", "Parlay": "#7b1fa2"
};
```

```js
// wideDailyFees — trade-date fees by display group.
// Parlay is a single bucket (no per-leg fee data), derived as the residual
// total_fees - sports_fees - nonsports_fees so the stack still sums to the day's fees.
const catFeesTotalByDate = new Map(daily.map(d => [+d.date, +d.fees_total || 0]));
// The FIRST sports row per day, which is what sports.find() returned; a NaN date never matched.
const sportsByDate = new Map();
for (const s of sports) if (!Number.isNaN(+s.date) && !sportsByDate.has(+s.date)) sportsByDate.set(+s.date, s);
const feeColumnGroups = wideColumnGroups(topDailyFees);
const wideDailyFees = topDailyFees.map(row => {
  const sp = sportsByDate.get(+row.date) || {};
  const groups = newWideGroups();
  for (const [cat, wg] of feeColumnGroups) groups[wg] += +row[cat] || 0;
  const feesSports    = +sp.fees_sports_nonparlay || 0;
  const feesNonSports = +sp.fees_nonsports || 0;
  const feesParlay    = Math.max(0, (catFeesTotalByDate.get(+row.date) || 0) - feesSports - feesNonSports);
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Economics + groups.Entertainment + groups.Mention + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: feesParlay,
    "Other sports":     Math.max(0, feesSports    - knownSports),
    "Other non-sports": Math.max(0, feesNonSports - knownNonSports)
  };
});
```

```js
const dr5 = view(makeDateBrush(d => d.fees_total || 0, "#1a9641", "month"));
```

<div class="control-strip">

```js
const feeScale  = view(Inputs.radio(["Absolute", "Normalized"], {value: "Absolute", label: "Scale"}));
const feeDetail = view(Inputs.radio(["General", "Detailed"],    {value: "General",  label: "Categories"}));
```

</div>

```js
// Everything here depends on the two controls only -- no brush -- so moving one chart's
// brush never redraws the other two charts in this section.
const feeActiveOrder    = feeDetail === "Detailed" ? feesWideOrder : generalOrder;
const feeActiveColorMap = feeDetail === "Detailed" ? feesWideColors : generalColors;

// Build tidy rows at a given period grain (month "YYYY-MM" or day Date) for the active detail.
function feeTidyRows(rows, periodOf, dateField) {
  const rolled = d3.rollup(
    rows,
    rs => { const o = {}; for (const g of feesWideOrder) o[g] = d3.sum(rs, d => d[g] || 0); return o; },
    periodOf
  );
  const sorted = [...rolled].sort(([a], [b]) => a < b ? -1 : 1);
  const tidy = sorted.flatMap(([p, vals]) => {
    if (feeDetail === "General") {
      const gen = Object.fromEntries(generalOrder.map(g => [g, 0]));
      for (const [det, gname] of Object.entries(generalMap)) gen[gname] += vals[det] || 0;
      return generalOrder.map(g => ({[dateField]: p, category: g, fees: gen[g]}));
    }
    return feesWideOrder.map(g => ({[dateField]: p, category: g, fees: vals[g] || 0}));
  });
  const totals = d3.rollup(tidy, rs => d3.sum(rs, r => r.fees), d => d[dateField]);
  const plot = tidy.map(d => ({...d, value: feeScale === "Normalized" ? d.fees / (totals.get(d[dateField]) || 1) : d.fees}));
  const tip = Array.from(d3.rollup(plot, rs => {
    const o = {[dateField]: rs[0][dateField]};
    for (const r of rs) o[r.category] = r.value;
    o.total = d3.sum(rs, r => r.fees);
    return o;
  }, d => d[dateField])).map(([, v]) => v);
  return {sorted, plot, tip};
}

const feeMonthOf = d => d.date.toISOString().slice(0, 7);
const feeMonthTickFmt = mo => { const [y, m] = mo.split("-"); const a = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]; return m === "01" ? `${a} '${y.slice(2)}` : a; };

const feeUSD = d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k");
const feeTipRows = (d, key) => {
  const rows = feeActiveOrder.filter(c => (d[c] || 0) > 0).sort((a, b) => (d[b] || 0) - (d[a] || 0));
  const shown = rows.slice(0, 12).map(c => feeScale === "Normalized" ? `${c}: ${((d[c]||0)*100).toFixed(1)}%` : `${c}: $${fmtCount(d[c]||0)}`);
  const hidden = rows.length - shown.length;
  return [key, feeScale === "Normalized" ? "Total: 100%" : `Total: $${fmtCount(d.total||0)}`, ...shown, ...(hidden > 0 ? [`+${hidden} more`] : [])].join("\n");
};
```

```js
const [feeStart, feeEnd] = dr5;
const feeMonthly = feeTidyRows(wideDailyFees.filter(d => d.date >= feeStart && d.date <= feeEnd), feeMonthOf, "month");
feeMonthly.tip.sort((a, b) => a.month < b.month ? -1 : 1);
const feeMonthLabels = feeMonthly.sorted.map(([mo]) => mo);
```

<div class="plot-shell">

```js
Plot.plot({
  width, height: 420, marginLeft: 70,
  marginBottom: feeMonthLabels.length > 18 ? 50 : 40,
  color: {legend: true, domain: feeActiveOrder, range: feeActiveOrder.map(g => feeActiveColorMap[g])},
  x: {type: "band", domain: feeMonthLabels, label: null, tickFormat: feeMonthTickFmt, tickRotate: feeMonthLabels.length > 18 ? -45 : 0},
  y: {label: feeScale === "Normalized" ? "Share of monthly fees" : "Monthly fees (USD)", grid: true,
      tickFormat: feeScale === "Normalized" ? (d => (d*100).toFixed(0)+"%") : feeUSD},
  marks: [
    Plot.barY(feeMonthly.plot, {x: "month", y: "value", fill: "category", order: feeActiveOrder, fillOpacity: 0.88}),
    Plot.ruleX(feeMonthly.tip, Plot.pointerX({x: "month", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(feeMonthly.tip, Plot.pointerX({x: "month", fontSize: 11, lineHeight: 1.1, title: d => feeTipRows(d, d.month)})),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> these are trade-date fees (charged when a trade executes), so they reconcile with the daily fee totals above. Parlay is one bucket — we don't have per-leg fee data to split it.</div>

### Daily view

```js
const dr6 = view(makeDateBrush(d => d.fees_total || 0, "#1a9641"));
```

```js
const [feeDayStart, feeDayEnd] = dr6;
const feeDaily = feeTidyRows(wideDailyFees.filter(d => d.date >= feeDayStart && d.date <= feeDayEnd), d => +d.date, "ms");
feeDaily.plot.forEach(d => d.date = new Date(d.ms));
feeDaily.tip.forEach(d => d.date = new Date(d.ms));
feeDaily.tip.sort((a, b) => a.ms - b.ms);
```

<div class="plot-shell">

```js
Plot.plot({
  width, height: 340, marginLeft: 70,
  color: {legend: true, domain: feeActiveOrder, range: feeActiveOrder.map(g => feeActiveColorMap[g])},
  x: {type: "utc", label: null},
  y: {label: feeScale === "Normalized" ? "Share of daily fees" : "Daily fees (USD)", grid: true,
      tickFormat: feeScale === "Normalized" ? (d => (d*100).toFixed(0)+"%") : feeUSD},
  marks: [
    Plot.areaY(feeDaily.plot, {x: "date", y: "value", fill: "category", order: feeActiveOrder, fillOpacity: 0.85, curve: "step"}),
    Plot.ruleX(feeDaily.tip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(feeDaily.tip, Plot.pointerX({x: "date", fontSize: 11, lineHeight: 1.1,
      title: d => feeTipRows(d, d.date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}))})),
    Plot.ruleY([0])
  ]
})
```

</div>

### Fee rate by category

<p class="section-intro">Effective fee rate (¢ per contract charged) by category — the same per-category split as the fees chart above, but as a rate instead of a dollar total, so a category can be flagged as expensive-per-contract even if its total fee dollars are small. Kalshi's fee formula peaks at the 50¢ strike and falls off toward 1¢/99¢, so this mostly reflects each category's typical contract price. Same toggle and colors as the fees charts above.</p>

```js
// The rate's denominator: contracts per ticker per day (~8.5 MB). Fetched only once
// wideDailyFees is built (the void line), so it never shares the link with the 12 MB fees
// file that the two charts above need first.
void wideDailyFees;
const topDailyVolume = await DataAttachment("data/daily_top_categories.csv").csv({typed: true});
```

```js
// Contracts by the same display groups as wideDailyFees. Built exactly as categories.md's
// wideDaily builds these keys; its leg-based parlay split is left out because the rate uses
// the single Parlay total.
const volumeColumnGroups = wideColumnGroups(topDailyVolume);
const catVolumeDaily = topDailyVolume.map(row => {
  const sp = sportsByDate.get(+row.date) || {};
  const groups = newWideGroups();
  for (const [cat, wg] of volumeColumnGroups) groups[wg] += +row[cat] || 0;
  const parlay       = +sp.contracts_parlay              || 0;
  const totSports    = +sp.contracts_sports_nonparlay    || 0;
  const totNonSports = +sp.contracts_nonsports           || 0;
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Economics + groups.Entertainment + groups.Mention + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Other sports":     Math.max(0, totSports - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});
```

```js
const dr7 = view(makeDateBrush(d => d.fees_total / (d.contracts_total || 1) * 100, "#1a9641", "month"));
```

```js
const [rateStart, rateEnd] = dr7;
const feeRateMonths = feeTidyRows(wideDailyFees.filter(d => d.date >= rateStart && d.date <= rateEnd), feeMonthOf, "month").sorted;
const feeRateMonthLabels = feeRateMonths.map(([mo]) => mo);
const volMonthlyForRate = d3.rollup(
  catVolumeDaily.filter(d => d.date >= rateStart && d.date <= rateEnd),
  rs => { const o = {}; for (const g of feesWideOrder) o[g] = d3.sum(rs, d => d[g] || 0); return o; },
  feeMonthOf
);

const feeRateTidy = feeRateMonths.flatMap(([mo, feeVals]) => {
  const volVals = volMonthlyForRate.get(mo) || {};
  if (feeDetail === "General") {
    const genFees = Object.fromEntries(generalOrder.map(g => [g, 0]));
    const genVol  = Object.fromEntries(generalOrder.map(g => [g, 0]));
    for (const [det, gname] of Object.entries(generalMap)) {
      genFees[gname] += feeVals[det] || 0;
      genVol[gname]  += volVals[det] || 0;
    }
    return generalOrder.map(g => ({month: mo, category: g, rate: genVol[g] > 0 ? genFees[g] / genVol[g] * 100 : null}));
  }
  return feesWideOrder.map(g => ({month: mo, category: g, rate: (volVals[g] || 0) > 0 ? (feeVals[g] || 0) / volVals[g] * 100 : null}));
});
const feeRateTip = Array.from(
  d3.rollup(feeRateTidy, rs => {
    const o = {month: rs[0].month};
    for (const r of rs) o[r.category] = r.rate;
    return o;
  }, d => d.month)
).map(([, v]) => v).sort((a, b) => a.month < b.month ? -1 : 1);
const feeRateTipRows = d => {
  const rows = feeActiveOrder.filter(c => d[c] != null).sort((a, b) => (d[b] ?? 0) - (d[a] ?? 0));
  const shown = rows.slice(0, 12).map(c => `${c}: ${d[c].toFixed(2)}¢`);
  const hidden = rows.length - shown.length;
  return [d.month, ...shown, ...(hidden > 0 ? [`+${hidden} more`] : [])].join("\n");
};
```

<div class="plot-shell">

```js
Plot.plot({
  width, height: 340, marginLeft: 60,
  marginBottom: feeRateMonthLabels.length > 18 ? 50 : 40,
  color: {legend: true, domain: feeActiveOrder, range: feeActiveOrder.map(g => feeActiveColorMap[g])},
  x: {type: "band", domain: feeRateMonthLabels, label: null, tickFormat: feeMonthTickFmt, tickRotate: feeRateMonthLabels.length > 18 ? -45 : 0},
  y: {label: "Fee rate (¢ / contract)", grid: true, tickFormat: d => d.toFixed(1) + "¢"},
  marks: [
    Plot.lineY(feeRateTidy, {x: "month", y: "rate", stroke: "category", z: "category",
      curve: "monotone-x", strokeWidth: 2, defined: d => d.rate != null}),
    Plot.ruleX(feeRateTip, Plot.pointerX({x: "month", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(feeRateTip, Plot.pointerX({x: "month", fontSize: 11, lineHeight: 1.1, title: feeRateTipRows})),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> a month with zero contracts for a category is left as a gap in that line rather than a misleading 0¢ rate. <em>General</em>/<em>Detailed</em> match the toggle above; this chart ignores the <em>Normalized</em> scale control (a rate is already normalized).</div>

## Non-sports fee revenue

<p class="section-intro">Kalshi's daily non-sports fees by category, with 15-minute markets shown on their own.</p>

```js
const nonSportsRange = view(dateBrush({data: sports, valueAccessor: d => d.fees_nonsports, color: "#0072B2", width, quickRanges: QUICK_RANGES}));
```

<div class="control-strip">

```js
import {NONSPORTS_VIEWS, NONSPORTS_COLORS, nonSportsFeeBander} from "./components/fee-embeds.js";
import {hashGet, hashInput} from "./components/hash-state.js";
// Kept in the URL (#nonsports=...), so a link or an embed can open on any view.
const nonSportsViewAsked = hashGet("nonsports", "All non-sports");
const nonSportsView = view(hashInput("nonsports", Inputs.radio([...NONSPORTS_VIEWS.keys()],
  {value: NONSPORTS_VIEWS.has(nonSportsViewAsked) ? nonSportsViewAsked : "All non-sports", label: "Show"})));
```

</div>

```js
// Each day is split into its bands only when a chart first shows it (the fee-mix pie above reads
// its 15-minute slice from the same rows), so a year's view never pays for the whole history.
// Complete days only: on the day still filling, the reported non-sports total runs ahead of the
// per-market file and the gap would land in Everything else (73% of 2026-10-07 at 23:00 ET, vs
// a 2.6% median on complete days). Built in a task of its own: the fees file's parse and the
// category charts above already make one long main-thread task, and these two charts added
// ~0.6 s to it (CPU profile, 2026-10-07).
const nonSportsBand = await new Promise(resolve => setTimeout(() =>
  resolve(nonSportsFeeBander(topDailyFees, sports, catLeaderboard, wideCategoryForTicker))));
const completeFeeDays = new Set(daily.filter(d => !isPartialFee(d)).map(d => +d.date));
const nonSportsRowsIn = range => {
  const inRange = inDateRange(range);
  return topDailyFees.filter(d => completeFeeDays.has(+d.date) && inRange(d)).map(nonSportsBand).filter(Boolean);
};
```

```js
const nonSportsBands = NONSPORTS_VIEWS.get(nonSportsView);
const nonSportsShown = nonSportsRowsIn(nonSportsRange);
const nonSportsBars = nonSportsShown.flatMap(d => {
  let top = 0;
  return nonSportsBands.map(band => {
    const y0 = top;
    top += d[band];
    return {date: d.date, band, y0, y1: top};
  });
});
// d3 formats: toLocaleString cost ~0.1 s here, since Plot builds every tip up front.
const usd = d3.format("$,.0f");
const tipDay = d3.utcFormat("%b %-d, %Y");
const nonSportsTip = d => [
  tipDay(d.date),
  ...nonSportsBands.map(b => `${b}: ${usd(d[b])}`),
  // Everything else is the biggest band once crypto and finance are out: itemise it.
  ...(nonSportsView === "Without crypto & finance" ? ["Weather", "Mention", "Entertainment", "Other"].map(p => `  ${p}: ${usd(d[p])}`) : []),
  nonSportsView === "All non-sports" ? `Total: ${usd(d.total)}` : `Shown: ${usd(d3.sum(nonSportsBands, b => d[b]))} of ${usd(d.total)}`
].join("\n");
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Fees (USD)", grid: true, tickFormat: d => d >= 1e6 ? "$" + (d/1e6).toFixed(1) + "M" : d >= 1e3 ? "$" + (d/1e3).toFixed(0) + "k" : "$" + d},
  color: {legend: true, domain: nonSportsBands, range: nonSportsBands.map(b => NONSPORTS_COLORS[b])},
  marks: [
    Plot.rectY(nonSportsBars, {
      x1: "date", x2: d => new Date(+d.date + 864e5), y1: "y0", y2: "y1",
      fill: "band", fillOpacity: 0.85
    }),
    Plot.ruleX(nonSportsShown, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(nonSportsShown, Plot.pointerX({x: "date", title: nonSportsTip})),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note">Everything else is weather, mention and entertainment markets plus smaller categories; 15-minute finance is currencies, stock indices and Treasury yields. The day still in progress is left out.</div>
