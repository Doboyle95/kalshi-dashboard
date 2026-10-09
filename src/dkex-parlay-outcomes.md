---
title: DKeX Parlay outcomes
---

# DKeX Parlay outcomes

How DKeX's parlay buyers actually do: what they staked, what came back, and what fees took.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD = n => { const a = Math.abs(n ?? 0); return ((n ?? 0) < 0 ? "−" : "") + (a > 0 && a < 0.5 ? "<$1" : "$" + fmtCount(a)); };
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const pct = (n, dp = 1) => `${(n ?? 0) < 0 ? "−" : ""}${Math.abs(100 * (n ?? 0)).toFixed(dp)}%`;
const DKEX = "var(--accent-dkex)";
// The same two colours Kalshi's own correlated / non-correlated chart uses (/parlay-analytics).
const KIND_DOMAIN = ["Non-correlated (multi-game)", "Correlated (same-game)"];
const KIND_COLORS = ["#5b8def", "#e4572e"];
const KIND_OF = {independent: KIND_DOMAIN[0], correlated: KIND_DOMAIN[1]};
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
// No await: each file is its own promise, which Framework awaits in every cell that reads it.
const rows = DataAttachment("data/dkex_parlay_outcomes_daily.csv").csv({typed: true});
const freshness = DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {dateBrush, inDateRange} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L", date: latestDate(rows), updatedAt: fileUpdatedAt(freshness, "dkex_parlay_outcomes_daily.csv"), meta: "Public DKeX reports", tone: "competitor"}
  ],
  note: "Dated by the day each parlay was bought. A parlay counts once it settles, so the newest days keep moving."
}));
display(askPageLink({
  question: "How do DKeX parlay buyers do over time, before and after fees, and do same-game parlays cost them more than multi-game ones?",
  context: "DKeX parlay outcomes page using dkex_parlay_outcomes_daily.csv (trade date x kind: independent / correlated / unclassified)."
}));
```

```js
// The file is one row per date x kind; every view below is a rollup of it.
const SUMS = ["trades", "stake_usd", "settled_stake_usd", "returned_usd", "gross_pnl_usd", "fees_usd",
              "net_pnl_usd", "void_stake_usd", "unsettled_stake_usd"];
const total = rs => Object.fromEntries(SUMS.map(c => [c, d3.sum(rs, d => +d[c] || 0)]));
// ⚠ r.date is a Date OBJECT (remote-data.js autotypes ISO columns): key on epoch ms, rebuild with new Date(t).
const byDate = d3.rollups(rows, total, d => +d.date)
  .map(([t, v]) => ({date: new Date(t), ...v}))
  .sort((a, b) => a.date - b.date)
  // Still settling: more than 1% of the day's stake has no result yet.
  .map(d => ({...d, prov: d.unsettled_stake_usd > 0.01 * d.stake_usd}));
let _g = 0, _n = 0;
const cum = byDate.map(d => { _g += d.gross_pnl_usd; _n += d.net_pnl_usd; return {...d, gross: _g, net: _n}; });
const ALL = total(rows);
const kindStake = k => d3.sum(rows.filter(d => d.kind === k), d => d.settled_stake_usd);
const unclassifiedShare = ALL.settled_stake_usd ? kindStake("unclassified") / ALL.settled_stake_usd : 0;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="negative">
    <div class="kpi-label">Buyer P&amp;L after fees</div>
    <div class="kpi-value">${fmtUSD(ALL.net_pnl_usd)}</div>
    <div class="kpi-meta">settled parlays only</div>
  </div>
  <div class="kpi-card" data-accent="dkex">
    <div class="kpi-label">Before fees</div>
    <div class="kpi-value">${fmtUSD(ALL.gross_pnl_usd)}</div>
    <div class="kpi-meta">fees: ${fmtUSD(ALL.fees_usd)}</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Return on stakes</div>
    <div class="kpi-value">${pct(ALL.net_pnl_usd / ALL.settled_stake_usd)}</div>
    <div class="kpi-meta">${pct(ALL.gross_pnl_usd / ALL.settled_stake_usd)} before fees</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Staked</div>
    <div class="kpi-value">${fmtUSD(ALL.settled_stake_usd)}</div>
    <div class="kpi-meta">settled so far · ${fmtUSD(ALL.unsettled_stake_usd)} still open</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Every DKeX combo trade is scored against its settlement and dated by the day it was bought, so a day's figures say how the parlays bought that day have done so far; the newest days are drawn hollow or faded while their games settle. Voided ($0.50) and pro-rated settlements are left out of P&amp;L.</p>
  <p><strong>Fees</strong> are DKeX&rsquo;s taker charge plus DraftKings Predictions&rsquo; commission on each trade. <strong>Stake is taker-YES</strong>: parlays are quoted on request, so the buyer is the taker. DKeX&rsquo;s records don&rsquo;t say whether a trade was a buy or a sell, so a parlay sold back before settlement can&rsquo;t be separated out the way Kalshi&rsquo;s cash-outs are &mdash; every trade counts as a bet held to the end.</p>
  <p><strong>Correlated or not.</strong> A parlay is <em>correlated</em> if two of its legs are in the same game, and <em>non-correlated</em> if every leg is in a different game &mdash; worked out leg by leg by matching each leg to DKeX&rsquo;s single-game market of the same name. A leg like &ldquo;Over 3.5 runs&rdquo; doesn&rsquo;t say which game it is, so ${pct(unclassifiedShare, 0)} of the settled money can&rsquo;t be split either way and is left out of that chart (it is in every other figure here).</p>
  <p>&#9888; DKeX&rsquo;s trade records carry about two thirds of its combos (see <a href="./dkex-parlays">Parlays</a>), so the dollar levels here are floors; the rates are measured on what is published.</p>
</details>

## What parlay buyers lost, before and after fees

_Running total of buyer P&L on DKeX parlays, by the day they were bought; the gap between the lines is fees._

```js
const cumRange = view(dateBrush({data: byDate, valueAccessor: d => Math.abs(d.net_pnl_usd), color: DKEX, width}));
```

```js
{
  const shown = cum.filter(inDateRange(cumRange));
  const lines = shown.flatMap(d => [{date: d.date, v: d.gross, s: "Before fees"}, {date: d.date, v: d.net, s: "After fees"}]);
  const prov = shown.filter(d => d.prov);
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76,
    x: {type: "utc", label: null},
    y: {label: "Cumulative buyer P&L (USD)", grid: true, tickFormat: fmtUSD},
    color: {legend: true, domain: ["Before fees", "After fees"], range: ["var(--theme-foreground-muted)", DKEX]},
    marks: [
      Plot.areaY(shown, {x: "date", y: "net", fill: DKEX, fillOpacity: 0.1, curve: "monotone-x"}),
      // Two marks so before-fees can be dashed (a dash pattern is a constant, not a channel); both
      // keep stroke on the series name so the legend names them.
      Plot.lineY(lines.filter(d => d.s === "Before fees"), {x: "date", y: "v", stroke: "s", strokeWidth: 2,
        strokeDasharray: "4,3", curve: "monotone-x"}),
      Plot.lineY(lines.filter(d => d.s === "After fees"), {x: "date", y: "v", stroke: "s", strokeWidth: 2, curve: "monotone-x"}),
      Plot.dot(prov, {x: "date", y: "net", r: 4, fill: "var(--theme-background)", stroke: DKEX, strokeWidth: 2}),
      Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
      Plot.tip(shown, Plot.pointerX({x: "date", y: "net", title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.gross)}\n`
        + `After fees: ${fmtUSD(d.net)}${d.prov ? "\n(still settling)" : ""}`}))
    ]
  }));
}
```

## Daily buyer P&L

_What buyers made or lost after fees on the parlays bought each day; faded bars are still settling._

```js
const dayRange = view(dateBrush({data: byDate, valueAccessor: d => Math.abs(d.net_pnl_usd), color: DKEX, width}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily buyer P&L, after fees (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.rectY(byDate.filter(inDateRange(dayRange)), {x: "date", interval: "day", y: "net_pnl_usd",
      fill: d => d.net_pnl_usd < 0 ? "var(--accent-negative)" : "var(--accent-positive)",
      fillOpacity: d => d.prov ? 0.4 : 0.9, insetLeft: 1, insetRight: 1,
      tip: true, title: d => `${fmtDate(d.date)}${d.prov ? " — still settling" : ""}\nAfter fees: ${fmtUSD(d.net_pnl_usd)}\n`
        + `Before fees: ${fmtUSD(d.gross_pnl_usd)}\nStaked: ${fmtUSD(d.settled_stake_usd)} settled`
        + (d.unsettled_stake_usd > 0 ? `, ${fmtUSD(d.unsettled_stake_usd)} open` : "")}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"})
  ]
})
```

## Buyer P&L: correlated vs non-correlated parlays

_Running total after fees, split by whether any two legs are in the same game; the ${pct(unclassifiedShare, 0)} of money whose legs can't be placed in a game is left out._

```js
const kindRange = view(dateBrush({data: byDate, valueAccessor: d => Math.abs(d.net_pnl_usd), color: KIND_COLORS[0], width}));
```

```js
{
  const kinds = ["independent", "correlated"];
  const days = [...new Set(rows.map(d => +d.date))].sort((a, b) => a - b);
  const kindCum = kinds.flatMap(k => {
    const per = new Map(rows.filter(d => d.kind === k).map(d => [+d.date, d]));
    let c = 0;
    return days.map(t => {
      const d = per.get(t);
      c += d ? +d.net_pnl_usd : 0;
      return {date: new Date(t), kind: KIND_OF[k], cum: c, day: d ? +d.net_pnl_usd : 0, staked: d ? +d.settled_stake_usd : 0};
    });
  });
  const shown = kindCum.filter(inDateRange(kindRange));
  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 80,
    x: {type: "utc", label: null},
    y: {label: "Cumulative buyer P&L, after fees (USD)", grid: true, tickFormat: fmtUSD},
    color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS},
    marks: [
      Plot.line(shown, {x: "date", y: "cum", stroke: "kind", strokeWidth: 2.5, curve: "monotone-x"}),
      Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
      Plot.ruleX(shown, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
      Plot.tip(shown, Plot.pointerX({x: "date", y: "cum", stroke: "kind",
        title: d => `${fmtDate(d.date)}\n${d.kind}: ${fmtUSD(d.cum)} cumulative\nThat day: ${fmtUSD(d.day)} on ${fmtUSD(d.staked)} settled`}))
    ]
  }));
}
```
