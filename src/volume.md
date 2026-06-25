---
title: Kalshi Volume
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Volume</h1>
  <p class="page-lead">How much trading runs through Kalshi and what's driving it — daily volume, how many trades it takes to get there, and the split between sports, non-sports, and parlays.</p>
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
// Short axis format (no $ prefix): "400M" instead of "400,000,000"
const fmtAxisNum = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? Math.round(a/1e6)+"M" : a >= 1e3 ? Math.round(a/1e3)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
// is_partial in daily_overall.csv is the string "TRUE"/"FALSE" (uppercase) which
// d3.autoType does not coerce to boolean, so naive truthiness fails. Use explicit check.
const isPartial = d => d.is_partial === true || d.is_partial === "TRUE";
```

```js
const daily = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const sports = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Daily volume", date: latestDate(daily), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Can be within 15 minutes locally when the collector is running"},
    {label: "Sports split", date: latestDate(sports), updatedAt: fileUpdatedAt(freshness, "daily_sports_vs_nonsports.csv"), meta: "Can be within 15 minutes locally after near-live refresh"},
    {label: "Tracked categories", date: latestDate(topDaily), updatedAt: fileUpdatedAt(freshness, "daily_top_categories.csv"), meta: "Can be within 15 minutes locally after near-live refresh"}
  ],
  note: "Today may be partial while the local raw API collector is still running. Public GitHub Pages only updates after synced CSVs are pushed."
}));
display(askPageLink({
  question: "Explain the latest Kalshi volume trend, including trade count, sports share, and any recent category mix changes.",
  context: "Kalshi Volume page using daily_overall.csv, daily_sports_vs_nonsports.csv, and daily_top_categories.csv."
}));
```

```js
// All-time KPIs (not filtered by date range)
const totalContracts = d3.sum(daily, d => d.contracts_total);
const peakDay = daily.reduce((best, d) => d.contracts_total > best.contracts_total ? d : best, daily[0]);
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">All-time volume</div>
    <div class="kpi-value" title="${(totalContracts ?? 0).toLocaleString()} contracts">${fmtCount(totalContracts)}</div>
    <div class="kpi-meta">contracts</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Peak single day</div>
    <div class="kpi-value" title="${(peakDay?.contracts_total ?? 0).toLocaleString()} contracts">${fmtCount(peakDay?.contracts_total)}</div>
    <div class="kpi-meta">${fmtDate(peakDay?.date)} · contracts</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>Volume and trade count are summed straight from Kalshi's trade records. The sports/non-sports/parlay split and the category views map each market to a bucket, with unmapped markets kept in "Other" so nothing gets double-counted. Trend lines are trailing 7-day averages.</p>
</details>

```js
// Reusable mini-brush factory. Returns an SVG node whose .value = [startDate, endDate].
// Each chart calls view(makeDateBrush(...)) independently.
function makeDateBrush(defaultStart, yAcc = d => d.contracts_total, color = "#00C2A8") {
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

  const defaultEnd = d3.max(daily, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (event.selection) { svg.property("value", event.selection.map(x.invert)); svg.dispatch("input"); }
    });

  svg.append("g").attr("class", "brush").call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", color).style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

```js
function rollingMean7By(rows, valueAcc) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  return sorted.map((d, i) => ({
    date: d.date,
    ma: d3.mean(sorted.slice(Math.max(0, i - 6), i + 1), valueAcc)
  })).filter((_, i) => i >= 6);
}
```

```js
const VOLUME_EVENTS = [
  {date: new Date("2024-11-05"), label: "Election Day '24", tier: 0},
  {date: new Date("2025-01-23"), label: "Sports launch", tier: 1},
  {date: new Date("2025-03-20"), label: "March Madness '25", tier: 2},
  {date: new Date("2025-09-07"), label: "NFL season '25", tier: 1},
  {date: new Date("2025-09-27"), label: "Parlays launch", tier: 2},
  {date: new Date("2026-02-08"), label: "Super Bowl LX", tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness '26", tier: 2},
  // Dates below are approximate / pending Daniel's confirmation.
  // NBA Finals Game 1 date is NOT officially fixed yet (~2026-06-04 estimate).
  {date: new Date("2026-06-04"), label: "NBA Finals '26", tier: 1},
  {date: new Date("2026-06-11"), label: "World Cup '26", tier: 0}
];

```

```js
// Shared wide-category mapping (no date dependency)
const volWideMap = {
  KXNFLGAME: "Football", KXNFLSPREAD: "Football", KXNFLTOTAL: "Football",
  KXNCAAFGAME: "Football", KXNCAAFSPREAD: "Football", KXNCAAFTOTAL: "Football",
  KXSB: "Football",
  KXNBAGAME: "Basketball", KXNBASPREAD: "Basketball", KXNBATOTAL: "Basketball", KXNBA: "Basketball",
  KXNCAAMBGAME: "Basketball", KXNCAAMBSPREAD: "Basketball", KXNCAAMBTOTAL: "Basketball",
  KXMARMAD: "Basketball", KXNCAAWBGAME: "Basketball",
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Other sports",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance",
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

const volWideDaily = topDaily.map(row => {
  const sp = sports.find(s => +s.date === +row.date) || {};
  const groups = {Football:0, Basketball:0, Baseball:0, Golf:0, Tennis:0, Soccer:0,
                  Crypto:0, Politics:0, Finance:0, Entertainment:0, Weather:0};
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = volWideMap[cat];
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports    = groups.Football + groups.Basketball + groups.Baseball + groups.Golf + groups.Tennis + groups.Soccer;
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date, ...groups, Parlay: parlay,
    "Other sports":     Math.max(0, totSports    - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});
```

## Daily volume

<p class="section-intro">Kalshi's daily trading volume, with a 7-day trend line. Flip on event markers to line the spikes up with the days that caused them.</p>

```js
const dr1 = view(makeDateBrush(new Date("2025-01-01")));
```

<div class="instruction-line"><strong>Useful trick:</strong> switch to <em>Log</em> scale when the early years look flat — it makes Kalshi's pre-2025 growth readable without burying the recent spike.</div>

```js
const [s1, e1] = dr1;
const fd1 = daily.filter(d => d.date >= s1 && d.date <= e1);

const maxContracts = d3.max(fd1, d => d.contracts_total) || 1;
const milestones = VOLUME_EVENTS
  .filter(m => m.date >= s1 && m.date <= e1)
  .map(m => ({...m, y: m.tier === 0 ? maxContracts : m.tier === 1 ? maxContracts * 0.75 : maxContracts * 0.48}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 380,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {type: yScaleType === "Log" ? "log" : "linear", label: "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.rectY(fd1, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.contracts_total || 0,
      fill: d => isPartial(d) ? "#7ed8cf" : "#00C2A8",
      fillOpacity: d => isPartial(d) ? 0.55 : 0.95
    }),
    Plot.lineY(fd1.filter(d => d.ma7_contracts != null && !isPartial(d)), {
      x: "date", y: "ma7_contracts",
      stroke: "#e15759", strokeWidth: 2, curve: "monotone-x"
    }),
    ...((() => {
      const lastComplete = fd1.filter(d => !isPartial(d) && d.ma7_contracts != null).at(-1);
      const todayRow = fd1.find(d => isPartial(d));
      if (!lastComplete || !todayRow || todayRow.ma7_contracts == null) return [];
      return [
        Plot.lineY([lastComplete, todayRow], {
          x: "date", y: "ma7_contracts",
          stroke: "#e15759", strokeWidth: 2, strokeDasharray: "5,3", curve: "monotone-x"
        }),
        Plot.dot([todayRow], {
          x: "date", y: d => d.contracts_total,
          fill: "#ff8c00", r: 4, stroke: "var(--theme-background)", strokeWidth: 1.5
        })
      ];
    })()),
    Plot.ruleX(fd1, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(fd1, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        isPartial(d) ? "Partial day — updating live" : null,
        `Daily: ${fmtCount(d.contracts_total||0)} contracts (${(d.contracts_total||0).toLocaleString()})`,
        `Fees: ${fmtUSD(d.fees_total||0)}`,
        d.ma7_contracts != null ? `7-day avg: ${fmtCount(Math.round(d.ma7_contracts))} contracts` : null
      ].filter(Boolean).join("\n")
    })),
    ...(volumeEventMode === "On" ? [
      Plot.ruleX(milestones, {x: "date", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
      Plot.text(milestones, {
        x: "date", y: "y", text: "label",
        textAnchor: "start", lineAnchor: "bottom",
        rotate: -42, fontSize: 10, fill: "var(--annotation-text)", dx: 3, dy: -2
      })
    ] : []),
    ...(yScaleType === "Log" ? [] : [Plot.ruleY([0])])
  ]
})
```

</div>

<div class="control-strip">

```js
const yScaleType = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#00C2A8"></span>Daily bars</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #e15759"></span>7-day average</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#ff8c00"></span>Today (partial)</span>
  <span class="legend-chip is-active annotation-key">Event overlay</span>
</div>

## Daily trade count

<p class="section-intro">How many individual trades it took — a read on whether the action is coming from a crowd or a few big players.</p>

<div class="instruction-line"><strong>Useful trick:</strong> compare the same date here and on the volume chart — if the dollars jumped more than the trades, that day was a few big tickets, not a crowd.</div>

```js
const drTrades = view(makeDateBrush(new Date("2025-01-01"), d => d.trades || 0, "#f28e2b"));
```

```js
const [sTrades, eTrades] = drTrades;
const tradeDaily = daily.filter(d => d.date >= sTrades && d.date <= eTrades);
const tradeMA = rollingMean7By(tradeDaily, d => d.trades || 0);
const maxTrades = d3.max(tradeDaily, d => d.trades || 0) || 1;
const tradeMilestones = VOLUME_EVENTS
  .filter(m => m.date >= sTrades && m.date <= eTrades)
  .map(m => ({...m, y: m.tier === 0 ? maxTrades : m.tier === 1 ? maxTrades * 0.75 : maxTrades * 0.48}));
```

<div class="plot-shell">

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 340,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: "Trades", grid: true, tickFormat: d => fmtCount(d)},
  marks: [
    Plot.rectY(tradeDaily, {
      x1: d => d.date,
      x2: d => new Date(d.date.getTime() + 864e5),
      y: d => d.trades || 0,
      fill: "#f28e2b", fillOpacity: 0.65
    }),
    Plot.lineY(tradeMA, {
      x: "date", y: "ma",
      stroke: "#8c564b", strokeWidth: 2, curve: "monotone-x"
    }),
    Plot.ruleX(tradeDaily, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(tradeDaily, Plot.pointerX({
      x: "date",
      title: d => [
        fmtDate(d.date),
        `Trades: ${(d.trades || 0).toLocaleString()}`,
        `Volume: ${fmtCount(d.contracts_total || 0)} contracts`,
        `Contracts per trade: ${((d.contracts_total || 0) / Math.max(1, d.trades || 0)).toFixed(1)}`
      ].join("\n")
    })),
    ...(volumeEventMode === "On" ? [
      Plot.ruleX(tradeMilestones, {x: "date", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
      Plot.text(tradeMilestones, {
        x: "date", y: "y", text: "label",
        textAnchor: "start", lineAnchor: "bottom",
        rotate: -42, fontSize: 10, fill: "var(--annotation-text)", dx: 3, dy: -2
      })
    ] : []),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="inline-legend">
  <span class="legend-chip is-active"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f28e2b"></span>Daily trades</span>
  <span class="legend-chip is-active"><span style="display:inline-block;width:16px;height:0;border-top:2px solid #8c564b"></span>7-day average</span>
  <span class="legend-chip is-active annotation-key">Event overlay</span>
</div>

<div class="control-strip">

```js
const volumeEventMode = view(Inputs.radio(["On", "Off"], {
  label: "Show event markers on time-series charts",
  value: "On"
}));
```

</div>

## Sports vs. non-sports volume

<p class="section-intro">What's driving the volume — sports, non-sports, and parlays. Switch to a sports-only or non-sports-only view to see the categories inside each.</p>

<div class="instruction-line"><strong>Useful trick:</strong> flip the metric to <em>Fees</em> after you spot a shift — sports and non-sports earn Kalshi very different amounts per contract.</div>

```js
const dr2 = view(makeDateBrush(new Date("2025-01-01")));
```

```js
const [s2, e2] = dr2;
const fd2 = daily.filter(d => d.date >= s2 && d.date <= e2);
const fs2 = sports.filter(d => d.date >= s2 && d.date <= e2);

const sportsOrder    = ["Other sports", "Soccer", "Golf", "Tennis", "Baseball", "Basketball", "Football", "Parlay"];
const nonSportsOrder = ["Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto"];

const tidySports =
  sportsView === "Sports only"
    ? fd2.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = fs2.find(r => +r.date === +d.date) || {};
        const totalContracts2 = sportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees2 = sp.fees_sports || 0;
        return sportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees" ? totalFees2 * ((w[g] || 0) / totalContracts2) : (w[g] || 0)
        }));
      })
  : sportsView === "Non-sports only"
    ? fd2.flatMap(d => {
        const w  = volWideDaily.find(r => +r.date === +d.date) || {};
        const sp = fs2.find(r => +r.date === +d.date) || {};
        const totalContracts2 = nonSportsOrder.reduce((s, g) => s + (w[g] || 0), 0) || 1;
        const totalFees2 = sp.fees_nonsports || 0;
        return nonSportsOrder.map(g => ({
          date: d.date, category: g,
          value: sportsMetric === "Fees" ? totalFees2 * ((w[g] || 0) / totalContracts2) : (w[g] || 0)
        }));
      })
  : fs2.flatMap(d => {
      // Data quirk: in older periods (pre-May 2026), contracts_parlay was counted
      // *inside* contracts_sports (so sports + nonsports = total). Starting around
      // May 2026, parlay became a disjoint third bucket (sports + nonsports + parlay
      // = total). Detect via share sum; subtract parlay from sports for the old
      // regime so the three stacks always reconcile to daily_overall.contracts_total.
      const shareSum = (+d.share_sports || 0) + (+d.share_nonsports || 0) + (+d.share_parlay || 0);
      const parlayDisjoint = shareSum <= 1.01;
      const sportsVal = parlayDisjoint
        ? (+d.contracts_sports || 0)
        : Math.max(0, (+d.contracts_sports || 0) - (+d.contracts_parlay || 0));
      return [
        {date: d.date, category: "Non-sports", value: sportsMetric === "Fees" ? (+d.fees_nonsports || 0) : (+d.contracts_nonsports || 0)},
        {date: d.date, category: "Sports",     value: sportsMetric === "Fees" ? (+d.fees_sports    || 0) : sportsVal},
        {date: d.date, category: "Parlay",     value: sportsMetric === "Fees" ? 0 : (+d.contracts_parlay || 0)}
      ];
    });

const subOrder =
  sportsView === "Sports only"    ? sportsOrder
  : sportsView === "Non-sports only" ? nonSportsOrder
  : ["Non-sports", "Sports", "Parlay"];

const useTableau = sportsView !== "Both (stacked)";

function rollingMean7(rows, valueKey) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  const byDate = d3.rollup(sorted, v => d3.sum(v, d => d[valueKey]), d => +d.date);
  const dates  = [...byDate.keys()].sort((a,b) => a-b);
  return dates.map((t, i) => {
    const slice = dates.slice(Math.max(0, i-6), i+1).map(k => byDate.get(k));
    return {date: new Date(t), ma: d3.mean(slice)};
  }).filter((_, i) => i >= 6);
}
const sportsMA = useTableau ? rollingMean7(tidySports, "value") : [];

// Wide-format tip data: one row per date carrying every stacked category's
// value. Plot.tip + Plot.pointerX on a stacked area needs this shape because
// the bare `title:` channel inside areaY renders one SVG <title> per area
// path and produces no usable tooltip on a stacked layout.
const sportsTipData = (() => {
  const m = new Map();
  for (const r of tidySports) {
    const k = +r.date;
    if (!m.has(k)) m.set(k, {date: r.date});
    m.get(k)[r.category] = r.value;
  }
  return [...m.values()].sort((a, b) => +a.date - +b.date);
})();
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 280,
  marginLeft: 70,
  x: {type: "utc", label: null},
  y: {label: sportsMetric === "Fees" ? "Fees ($)" : "Volume (contracts)", grid: true, tickFormat: d => fmtAxisNum(d)},
  color: useTableau
    ? {legend: true, columns: 4, scheme: "tableau10", domain: subOrder}
    : {legend: true, domain: ["Non-sports", "Sports", "Parlay"], range: ["#00C2A8", "#1a9641", "#ff8c00"]},
  marks: [
    Plot.areaY(tidySports, {
      x: "date", y: "value", fill: "category",
      order: subOrder, curve: "monotone-x", fillOpacity: 0.85
    }),
    Plot.ruleX(sportsTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(sportsTipData, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...subOrder.map(c => (d[c] || 0) > 0 ? `${c}: ${sportsMetric === "Fees" ? fmtUSD(d[c]) : fmtCount(d[c]) + " contracts (" + Math.round(d[c]).toLocaleString() + ")"}` : null).filter(Boolean)].join("\n")
    })),
    ...(useTableau ? [Plot.lineY(sportsMA, {
      x: "date", y: "ma",
      stroke: "#111", strokeWidth: 1.8, strokeDasharray: "4,2",
      curve: "monotone-x",
      tip: true,
      title: d => `7-day avg: $${Math.round(d.ma||0).toLocaleString()}`
    })] : []),
    Plot.ruleY([0])
  ]
})
```

<div class="control-strip">

```js
const sportsView = view(Inputs.radio(["Both (stacked)", "Sports only", "Non-sports only"], {
  value: "Both (stacked)",
  label: "View"
}));
const sportsMetric = view(Inputs.radio(["Volume", "Fees"], {value: "Volume", label: "Metric"}));
```

</div>

## Open interest

_Total contracts still open across Kalshi at the end of each day — bets placed but not yet settled. Volume is how much changes hands; open interest is how much money is currently riding on the exchange._

```js
const oiRaw = await FileAttachment("data/kalshi_oi_daily.csv").csv({typed: true});
const oi = oiRaw
  .map(d => ({
    date: d.date,
    total_oi_contracts: +d.total_oi_contracts,
    n_markets: +d.n_markets,
    n_with_oi: +d.n_with_oi
  }))
  .filter(d => d.date && d.total_oi_contracts > 0)
  .sort((a, b) => a.date - b.date);
// Guard against an empty/missing OI CSV (the OI snapshot producer can stall) — without
// this, the inline stats + prose below dereference undefined and throw on the page.
const oiPeak = oi.length ? oi.reduce((a, b) => (b.total_oi_contracts > a.total_oi_contracts ? b : a), oi[0]) : null;
const oiLast = oi.length ? oi[oi.length - 1] : null;
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 75,
  x: {type: "utc", label: null},
  y: {label: "Contracts of open interest", grid: true, tickFormat: d => fmtAxisNum(d)},
  marks: [
    Plot.areaY(oi, {x: "date", y: "total_oi_contracts", fill: "#7048e8", fillOpacity: 0.18, curve: "monotone-x"}),
    Plot.lineY(oi, {x: "date", y: "total_oi_contracts", stroke: "#7048e8", strokeWidth: 2, curve: "monotone-x"}),
    Plot.ruleY([0]),
    Plot.ruleX(oi, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(oi, Plot.pointerX({x: "date", y: "total_oi_contracts",
      title: d => `${fmtDate(d.date)}\nOpen interest: ${fmtCount(d.total_oi_contracts)} contracts (${(d.total_oi_contracts||0).toLocaleString()})\n${fmtCount(d.n_with_oi)} markets with open positions`}))
  ]
})
```

```js
display(oiPeak && oiLast
  ? html`<div style="display:flex;gap:24px;flex-wrap:wrap;margin:8px 0 18px 0;font-size:13px;color:var(--theme-foreground-muted);">
      <div title="${(oiPeak.total_oi_contracts ?? 0).toLocaleString()} contracts"><strong>Peak:</strong> ${fmtCount(oiPeak.total_oi_contracts)} contracts on ${fmtDate(oiPeak.date)}</div>
      <div title="${(oiLast.total_oi_contracts ?? 0).toLocaleString()} contracts"><strong>Latest:</strong> ${fmtCount(oiLast.total_oi_contracts)} contracts on ${fmtDate(oiLast.date)}</div>
      <div title="${(oiLast.n_with_oi ?? 0).toLocaleString()} markets"><strong>Markets with open positions (latest):</strong> ${fmtCount(oiLast.n_with_oi)}</div>
    </div>`
  : html`<p class="chart-note">Open-interest data is not currently available.</p>`);
```

<details class="surface-card compact-details">
<summary>What this measures</summary>
<p>Open interest is the number of contracts currently held — bought but not yet sold or settled — added up across every Kalshi market at day's end. Note: this snapshot updates on a periodic schedule rather than live, so the chart ends ${oiLast ? fmtDate(oiLast.date) : "—"} and may lag the other charts by a day or two.</p>
</details>
