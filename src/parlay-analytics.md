---
title: Parlay Anatomy
---

# Parlay Anatomy

How Kalshi parlays are built and priced: the house edge by parlay length, the
rise of multi-leg betting over time, which real games draw the most parlay
money, and whether the implied odds match what actually happens — split by
**same-game (correlated)** vs **multi-game (independent)** tickets.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const pct1     = n => (n == null ? "n/a" : n.toFixed(1) + "%");
```

```js
const heRaw   = await FileAttachment("data/parlay_house_edge_by_legs.csv").csv({typed: true});
const timeRaw = await FileAttachment("data/parlay_legs_over_time.csv").csv({typed: true});
const gamesRaw= await FileAttachment("data/parlay_top_games_by_volume.csv").csv({typed: true});
const mispRaw = await FileAttachment("data/parlay_mispricing_by_correlation.csv").csv({typed: true});
const pnlRaw  = await FileAttachment("data/parlay_pnl_daily_by_corr_v2.csv").csv({typed: true});
const mixRaw  = await FileAttachment("data/parlay_sportsmix_v2.csv").csv({typed: true});
const popDailyRaw = await FileAttachment("data/parlay_popular_daily.csv").csv({typed: true});
const popMetaRaw  = await FileAttachment("data/parlay_popular_meta.csv").csv({typed: true});
const volTypeRaw  = await FileAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, fmtFreshDate, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
// R/parlay_analytics.R (house edge / legs-over-time / games / mispricing) runs
// in "sample" mode on every cadence cycle (never --full), selecting files via
// plain head(list.files(),20) with no recency sort -- so it reads a FIXED
// slice of tickers, not recent trading, and does not self-correct over time.
// game_key encodes the actual game date (e.g. "26JUL03ARGCPV" -> 2026-07-03),
// so we can detect staleness directly from the data instead of trusting the
// file's own write time (the script can "succeed" every run while re-deriving
// the same stale answer from unchanging input).
const GAME_KEY_MONTHS = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
const gameKeyDate = k => {
  const m = /^(\d{2})([A-Z]{3})(\d{2})/.exec(String(k));
  const mo = m && GAME_KEY_MONTHS[m[2]];
  return m && mo != null ? new Date(Date.UTC(2000 + (+m[1]), mo, +m[3])) : null;
};
const gamesMaxDate = latestDate(gamesRaw, d => gameKeyDate(d.game_key));
const gamesStaleDays = gamesMaxDate ? Math.round((Date.now() - gamesMaxDate) / 86400000) : null;
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L (by correlation)", date: latestDate(pnlRaw), updatedAt: fileUpdatedAt(freshness, "parlay_pnl_daily_by_corr_v2.csv"), meta: "Settlement-dependent — a parlay only counts once its markets settle", tone: "settlement"},
    {label: "Parlay volume by type", date: latestDate(volTypeRaw), updatedAt: fileUpdatedAt(freshness, "parlay_volume_by_type_daily.csv"), meta: "Classified from actual legs; very recent tickers can show as \"unclassified\" until leg-mapping catches up"},
    {label: "Games / house edge / legs-mix / mispricing", value: gamesMaxDate ? `Most recent game: ${fmtFreshDate(gamesMaxDate)}` + (gamesStaleDays > 3 ? ` — ${gamesStaleDays}d behind today` : "") : "n/a", updatedAt: fileUpdatedAt(freshness, "parlay_top_games_by_volume.csv"), meta: "Shared source (R/parlay_analytics.R sample) for the 4 charts below. If “Most recent game” isn't within the last few days, the sample is stuck — that's a pipeline bug, not something that clears up on its own.", tone: "local"}
  ],
  note: "Recent days are still filling in for the P&L and volume-by-type figures above — a parlay only counts once its markets settle, and brand-new tickers may briefly show as \"unclassified\" until leg-mapping catches up (normal lag, clears within a day or two). The games/house-edge/mispricing group is a separate, fixed-sample pipeline that does NOT self-correct with time — check its card above and the note on \"The games that drive parlay money\" below."
}));
display(askPageLink({
  question: "Explain parlay anatomy: house edge by leg count, correlated vs independent P&L, and how much recent volume is still unclassified pending leg-mapping.",
  context: "Parlay Anatomy page (parlay-analytics.md)."
}));
```

```js
const KIND_DOMAIN = ["multi-game(independent)", "same-game(correlated)"];
const KIND_COLORS = ["#5b8def", "#e4572e"];
const kindShort = k => k.startsWith("same") ? "Correlated (SGP)" : "Non-correlated (multi)";

const legOrder = {"02":2,"03":3,"04":4,"05":5,"06":6,"07":7,"08":8,"09":9,"A_10+":10};
const he = heRaw.map(d => ({
  legsN: legOrder[d.legs] ?? +String(d.legs),
  legsLabel: (legOrder[d.legs] ?? +String(d.legs)) === 10 ? "10+" : String(legOrder[d.legs] ?? d.legs),
  kind: d.kind,
  house_edge: -d.pnl_per_100,        // positive = cost to the bettor
  win_rate: d.win_rate_pct,
  n_parlays: d.n_parlays,
  total_vol: d.total_vol
})).sort((a,b) => a.legsN - b.legsN);
```

## House edge climbs steeply with parlay length

_Cost to the bettor per \$100 staked (taker P&L, before fees — real cost is worse). Each added leg compounds the margin._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 360, marginLeft: 56,
  x: {label: "Number of legs", domain: he.map(d=>d.legsLabel).filter((v,i,a)=>a.indexOf(v)===i), type: "point"},
  y: {label: "House edge (% of stake)", grid: true, tickFormat: d => d + "%"},
  color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS, tickFormat: kindShort},
  marks: [
    Plot.line(he, {x: "legsLabel", y: "house_edge", stroke: "kind", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(he, {x: "legsLabel", y: "house_edge", fill: "kind", r: 4}),
    Plot.tip(he, Plot.pointer({x: "legsLabel", y: "house_edge",
      title: d => `${d.legsLabel}-leg · ${kindShort(d.kind)}\nHouse edge: ${pct1(d.house_edge)}\nWin rate: ${pct1(d.win_rate)}\nParlays: ${d.n_parlays.toLocaleString()}\nVolume: ${fmtUSD(d.total_vol)} ($${d.total_vol.toLocaleString()})`})),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"})
  ]
})
```

## Win rate collapses with length

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 280, marginLeft: 56,
  x: {label: "Number of legs", domain: he.map(d=>d.legsLabel).filter((v,i,a)=>a.indexOf(v)===i), type: "point"},
  y: {label: "Settled win rate", grid: true, tickFormat: d => d + "%"},
  color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS, tickFormat: kindShort},
  marks: [
    Plot.line(he, {x: "legsLabel", y: "win_rate", stroke: "kind", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(he, {x: "legsLabel", y: "win_rate", fill: "kind", r: 4}),
    Plot.tip(he, Plot.pointer({x: "legsLabel", y: "win_rate",
      title: d => `${d.legsLabel}-leg · ${kindShort(d.kind)}\nWin rate: ${pct1(d.win_rate)}\nParlays: ${d.n_parlays.toLocaleString()}`})),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"})
  ]
})
```

```js
// d3.autoType (csv {typed:true}) parses "YYYY-MM" into a Date, so coerce
// safely back to a YYYY-MM string before re-parsing as month start.
const monthStr = m => m instanceof Date ? d3.utcFormat("%Y-%m")(m) : String(m);
const tline = timeRaw
  .filter(d => d.month && monthStr(d.month) !== "unknown")
  .map(d => {
    const ms = monthStr(d.month);
    return {
      date: d3.utcParse("%Y-%m")(ms),
      month: ms,
      n_parlays: +d.n_parlays,
      mean_legs: +d.mean_legs,
      median_legs: +d.median_legs,
      pct_vol_4plus: +d.pct_vol_4plus,
      pct_correlated: +d.pct_correlated,
      total_vol: +d.total_vol
    };
  })
  .sort((a,b) => a.date - b.date);
```

```js
// Daily series for "The rise of multi-leg betting": sum parlay_volume_by_type_daily
// (already loaded above) across ALL classes per date, INCLUDING "unclassified
// (pending legs)". Unlike the monthly series (classified-only trade_facts), recent
// days never vanish while leg-mapping catches up — it can therefore run a few
// percent above the monthly bars. pct_pending in the tooltip surfaces that share
// per day (audit aid).
const dayStr = d => d instanceof Date ? d3.utcFormat("%Y-%m-%d")(d) : String(d);
const volDay = (() => {
  const by = new Map();
  for (const r of volTypeRaw) {
    if (!r.date) continue;
    const k = dayStr(r.date);
    const cur = by.get(k) || {vol: 0, pending: 0};
    cur.vol += +r.contracts || 0;
    if (+r.unmapped_flag === 1) cur.pending += +r.contracts || 0;
    by.set(k, cur);
  }
  return [...by.entries()]
    .map(([k, v]) => ({date: d3.utcParse("%Y-%m-%d")(k), day: k, total_vol: v.vol,
                       pct_pending: v.vol ? 100 * v.pending / v.vol : 0}))
    .sort((a, b) => a.date - b.date);
})();
```

## The rise of multi-leg betting

_Parlay volume — from a standing start in late 2025 to billions per month. The daily view counts all parlay volume including tickets still pending leg-classification, so recent days are always present (the tooltip shows the pending share)._

```js
const riseGranularity = view(Inputs.radio(["Monthly", "Daily"], {value: "Monthly", label: "View"}));
```

```js
const riseDaily = riseGranularity === "Daily";
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 72,
  x: {type: "utc", label: null},
  y: {label: riseDaily ? "Daily parlay volume" : "Monthly parlay volume", grid: true, tickFormat: d => "$" + (d>=1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")},
  marks: [
    riseDaily
      ? Plot.rectY(volDay, {x: "date", interval: d3.utcDay, y: "total_vol", fill: "#f4a736",
          tip: true, title: d => `${d.day}\nVolume: ${fmtUSD(d.total_vol)} ($${d.total_vol.toLocaleString()})\nPending classification: ${pct1(d.pct_pending)}`})
      : Plot.rectY(tline, {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "#f4a736",
          tip: true, title: d => `${d.month}\nVolume: ${fmtUSD(d.total_vol)} ($${d.total_vol.toLocaleString()})\nParlays: ${d.n_parlays.toLocaleString()}\nMean legs: ${d.mean_legs}\nMedian legs: ${d.median_legs}`}),
    Plot.ruleY([0])
  ]
}))
```

_Mean legs per parlay (left) crept up and stabilised near 6._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 240, marginLeft: 56,
  x: {type: "utc", label: null},
  y: {label: "Mean legs / parlay", grid: true, domain: [0, d3.max(tline, d=>d.mean_legs)*1.15]},
  marks: [
    Plot.line(tline, {x: "date", y: "mean_legs", stroke: "#7048e8", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(tline, {x: "date", y: "mean_legs", fill: "#7048e8", r: 3}),
    Plot.tip(tline, Plot.pointerX({x: "date", y: "mean_legs",
      title: d => `${d.month}\nMean legs: ${d.mean_legs}\nMedian legs: ${d.median_legs}`}))
  ]
})
```

_Composition: share of volume in 4+-leg parlays, and share that is same-game (correlated). The same-game share dipped sharply in Feb–Mar 2026._

```js
const compTidy = [
  ...tline.map(d => ({date: d.date, month: d.month, value: d.pct_vol_4plus,   series: "% volume in 4+-leg"})),
  ...tline.map(d => ({date: d.date, month: d.month, value: d.pct_correlated,  series: "% same-game (correlated)"}))
];
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 260, marginLeft: 56,
  x: {type: "utc", label: null},
  y: {label: "Share", grid: true, domain: [0, 100], tickFormat: d => d + "%"},
  color: {legend: true, domain: ["% volume in 4+-leg", "% same-game (correlated)"], range: ["#f4a736", "#e4572e"]},
  marks: [
    Plot.line(compTidy, {x: "date", y: "value", stroke: "series", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(compTidy, {x: "date", y: "value", fill: "series", r: 3}),
    Plot.tip(compTidy, Plot.pointer({x: "date", y: "value",
      title: d => `${d.month}\n${d.series}: ${pct1(d.value)}`}))
  ]
}))
```

```js
// Cumulative bettor P&L (net of fees), split by correlation kind.
// parlay_pnl_daily_by_corr.csv is daily, built by R/parlay_analytics.R's
// audited correlation classifier (corr_key with league-pooling). Sum to
// running totals per kind. Bridge kind values to the canonical domain so
// colors and tooltips match the rest of the page.
const KIND_FROM_CORR = {correlated: "same-game(correlated)", independent: "multi-game(independent)"};
const pnlCum = (() => {
  const sorted = pnlRaw.slice().sort((a, b) => a.date - b.date);
  const cum = {correlated: 0, independent: 0};
  return sorted.map(d => {
    cum[d.kind] += +d.net_pnl;
    return {
      date: d.date,
      kind_raw: d.kind,
      kind: KIND_FROM_CORR[d.kind] || d.kind,
      cum_pnl: cum[d.kind],
      daily_net_pnl: +d.net_pnl
    };
  });
})();
const pnlEnd = {
  correlated:  pnlCum.filter(d => d.kind_raw === "correlated").slice(-1)[0]?.cum_pnl ?? 0,
  independent: pnlCum.filter(d => d.kind_raw === "independent").slice(-1)[0]?.cum_pnl ?? 0
};
const pnlDataRange = {start: d3.min(pnlRaw, d => d.date), end: d3.max(pnlRaw, d => d.date)};
const fmtSignedUSD = n => n < 0 ? "-$" + fmtCount(-n) : "$" + fmtCount(n);
const fmtDay = d => (d instanceof Date ? d : new Date(d)).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});
```

## Parlay volume: correlated vs non-correlated over time

_Monthly parlay volume (contracts), split by **leg-level** correlation — **same-game (correlated)** tickets versus **multi-game (independent)** ones. Classified from the actual legs, not the ticker name; brand-new tickers still awaiting leg-mapping sit in a small "unclassified" band._

```js
const VT_DOMAIN = ["same-game (correlated)", "multi-game (independent)", "unclassified (pending legs)"];
const VT_COLORS = ["#e4572e", "#5b8def", "#adb5bd"];
const vtMonthly = (() => {
  const agg = d3.rollup(
    volTypeRaw,
    v => d3.sum(v, d => +d.contracts),
    d => d.date instanceof Date ? d3.utcFormat("%Y-%m")(d.date) : String(d.date).slice(0, 7),
    d => d.parlay_class
  );
  const rows = [];
  for (const [ms, byClass] of agg)
    for (const [cls, c] of byClass)
      rows.push({date: d3.utcParse("%Y-%m")(ms), month: ms, parlay_class: cls, contracts: c});
  return rows.sort((a, b) => a.date - b.date);
})();
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 320, marginLeft: 64,
  x: {type: "utc", label: null},
  y: {label: "Monthly parlay volume (contracts)", grid: true, tickFormat: fmtCount},
  color: {legend: true, domain: VT_DOMAIN, range: VT_COLORS},
  marks: [
    Plot.rectY(vtMonthly, {x: "date", interval: d3.utcMonth, y: "contracts", fill: "parlay_class",
      order: VT_DOMAIN, tip: true,
      title: d => `${d.month} · ${d.parlay_class}\nVolume: ${fmtCount(d.contracts)} contracts`}),
    Plot.ruleY([0])
  ]
}))
```

## Cumulative bettor P&L: correlated vs non-correlated

_How much money parlay bettors have transferred to Kalshi (and market-makers) over the period, net of fees. Classified using the same audited correlated/non-correlated split as the charts above._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 320, marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Cumulative bettor P&L (net of fees)", grid: true, tickFormat: fmtSignedUSD},
  color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS, tickFormat: kindShort},
  marks: [
    Plot.line(pnlCum, {x: "date", y: "cum_pnl", stroke: "kind", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
    Plot.ruleX(pnlCum, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(pnlCum, Plot.pointerX({x: "date", y: "cum_pnl",
      title: d => `${fmtDay(d.date)}\n${kindShort(d.kind)}: ${fmtSignedUSD(d.cum_pnl)} cumulative\nDay: ${fmtSignedUSD(d.daily_net_pnl)}`}))
  ]
})
```

<div style="display:flex;gap:24px;flex-wrap:wrap;margin:8px 0 16px 0;font-size:13px;color:var(--theme-foreground-muted);">
  <div><strong style="color:${KIND_COLORS[1]}">Correlated (SGP) total:</strong> ${fmtSignedUSD(pnlEnd.correlated)}</div>
  <div><strong style="color:${KIND_COLORS[0]}">Non-correlated (multi) total:</strong> ${fmtSignedUSD(pnlEnd.independent)}</div>
  <div>Data through ${fmtDay(pnlDataRange.end)}</div>
</div>

<div class="surface-card compact-details" style="font-size:13px;padding:12px 16px;margin:6px 0 18px 0;">
<strong>How we split parlays.</strong> A parlay is <em>correlated</em> if any two
of its legs touch the same underlying game (e.g. NFL spread + total + a player
prop, all in the same game), so the leg outcomes are not statistically
independent. A parlay is <em>non-correlated</em> if every leg is from a
different game (or different futures market) and the legs can be priced by
simply multiplying the individual win probabilities. Kalshi labels same-game
parlays as <em>SGP</em>, but we don't rely on that product label: we re-derive
correlation leg by leg from each leg's event ticker, pooling legs that touch the
same underlying game (and, for season / futures markets, the same competition or
league). We use
<em>correlated</em> / <em>non-correlated</em> as the editorial framing because
Kalshi has launched new SGP-style series under varying ticker prefixes, and the correlation-based
classification is what determines the pricing math.
</div>

## How much sports dominates parlays

<p class="section-intro">Almost every parlay dollar is a pure-sports parlay. Each month's bar is split by mix — the green is all-sports, and the thin slivers on top are cross-category "mixed" and all-non-sports parlays.</p>

```js
// All three sport-mix categories, monthly, for the 100%-stacked dominance view.
const mixAll = mixRaw
  .map(d => ({date: d3.utcParse("%Y-%m")(monthStr(d.month)), month: monthStr(d.month),
              sportmix: String(d.sportmix), total_vol: +d.total_vol}))
  .filter(d => d.date).sort((a, b) => a.date - b.date);
const SHARE_DOMAIN = ["all-sports", "mixed", "all-nonsports"];
const SHARE_COLORS = ["#1a9641", "#7048e8", "#00C2A8"];
const shareLabel = k => k === "all-sports" ? "All-sports" : k === "mixed" ? "Mixed" : "All non-sports";
const sportsShareAll = (() => {
  const tot = d3.sum(mixAll, d => d.total_vol);
  const sports = d3.sum(mixAll.filter(d => d.sportmix === "all-sports"), d => d.total_vol);
  return tot ? sports / tot * 100 : 0;
})();
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 240, marginLeft: 60,
  x: {type: "utc", label: null},
  y: {label: "Share of monthly volume", percent: true, grid: true},
  color: {legend: true, domain: SHARE_DOMAIN, range: SHARE_COLORS, tickFormat: shareLabel},
  marks: [
    Plot.rectY(mixAll, {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "sportmix",
                        offset: "expand", order: SHARE_DOMAIN}),
    Plot.ruleY([0, 1])
  ]
})
```

<p class="chart-note">All-sports parlays are <strong>${sportsShareAll.toFixed(1)}%</strong> of all parlay volume. The chart below zooms into the rest — the cross-category and all-non-sports sliver.</p>

## Mixed and non-sports parlays over time

<p class="section-intro">The slice that isn't pure sports: parlays mixing sports with non-sports legs, and all-non-sports parlays. These only really appeared once Kalshi enabled cross-category combos.</p>

```js
const mixMonthly = mixRaw
  .filter(d => d.sportmix !== "all-sports")
  .map(d => ({
    date: d3.utcParse("%Y-%m")(monthStr(d.month)),
    month: monthStr(d.month),
    sportmix: d.sportmix,
    n_parlays: +d.n_parlays,
    total_vol: +d.total_vol
  }))
  .sort((a, b) => a.date - b.date);

const mixTipData = (() => {
  const m = new Map();
  for (const r of mixMonthly) {
    const k = +r.date;
    if (!m.has(k)) m.set(k, {date: r.date, month: r.month});
    m.get(k)[r.sportmix] = r.total_vol;
    m.get(k)[r.sportmix + "_n"] = r.n_parlays;
  }
  return [...m.values()].sort((a, b) => +a.date - +b.date);
})();
const MIX_DOMAIN = ["mixed", "all-nonsports"];
const MIX_COLORS = ["#7048e8", "#00C2A8"];
const mixLabel = k => k === "mixed" ? "Mixed (sports + non-sports legs)" : "All non-sports legs";
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 280, marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Monthly parlay volume", grid: true, tickFormat: d => "$" + (d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k")},
  color: {legend: true, domain: MIX_DOMAIN, range: MIX_COLORS, tickFormat: mixLabel},
  marks: [
    Plot.rectY(mixMonthly, {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "sportmix", order: MIX_DOMAIN}),
    Plot.ruleX(mixTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(mixTipData, Plot.pointerX({
      x: "date",
      title: d => [
        d.month,
        ...MIX_DOMAIN.map(k => d[k] > 0 ? `${mixLabel(k)}: ${fmtUSD(d[k])} (${d[k+"_n"].toLocaleString()} parlays)` : null).filter(Boolean)
      ].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

```js
const prettyGame = k => {
  const m = /^(\d{2})([A-Z]{3})(\d{2})(\d{0,4})?([A-Z].*)?$/.exec(String(k));
  if (!m) return String(k); // futures / full event_ticker
  const mon = m[2][0] + m[2].slice(1).toLowerCase();
  return `${mon} ${+m[3]} '${m[1]}${m[5] ? " · " + m[5] : ""}`;
};
const games = gamesRaw
  .slice()
  .sort((a,b) => (+b.parlay_vol) - (+a.parlay_vol))
  .slice(0, 20)
  .map(d => ({...d, parlay_vol: +d.parlay_vol, n_parlays: +d.n_parlays, label: prettyGame(d.game_key)}));
```

## The games that drive parlay money

_Top 20 underlying games by parlay volume touching them. A parlay's volume is counted for every distinct game it includes, so totals are non-exclusive (a measure of how "parlayed" each game is). Raw game keys shown for non-dated/futures markets._

```js
display(
  gamesMaxDate == null ? html`` :
  gamesStaleDays > 3
    ? html`<div class="chart-note" style="color:var(--accent-warning);font-weight:650;">⚠ Stuck: the most recent game in this ranking is ${fmtFreshDate(gamesMaxDate)} — ${gamesStaleDays} days behind today. The underlying sample isn't advancing (see the freshness panel above); this chart won't show newer games until that's fixed.</div>`
    : html`<div class="chart-note">Most recent game in this ranking: ${fmtFreshDate(gamesMaxDate)}.</div>`
);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 560, marginLeft: 150,
  x: {label: "Parlay volume touching game", grid: true, tickFormat: d => "$" + (d>=1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null, domain: games.map(d=>d.label)},
  marks: [
    Plot.barX(games, {x: "parlay_vol", y: "label", fill: "#3b82a0",
      tip: true, title: d => `${d.label}\n(${d.game_key})\nParlay volume: ${fmtUSD(d.parlay_vol)} ($${d.parlay_vol.toLocaleString()})\nParlays touching: ${d.n_parlays.toLocaleString()}`}),
    Plot.ruleX([0])
  ]
})
```

## The most popular parlays

_The 30 most-**traded** parlay tickets in the window you pick below, ranked by number of trades. The colored chip is the **audited leg-level correlation** (same classifier as the charts above) — not Kalshi's product family. **Volume** is total contracts traded on the ticket, both sides — at Kalshi's \$1-per-contract convention the dollar figure is the same number. **Taker stakes** is the money yes-takers actually put in (taker-yes dollars). **Avg price** is the stake-weighted price bettors paid to get in — parlays are longshots, so most sit at a few cents or less (a 1¢ ticket ≈ a 1% implied chance). **Result** is the settled outcome. Covers parlays with ≥100 lifetime trades; recent tickets may still be **pending**._

```js
const popDmin = d3.min(popDailyRaw, d => d.date);
const popDmax = d3.max(popDailyRaw, d => d.date);
const popRange = view(Inputs.form({
  from: Inputs.date({label: "From", value: popDmin, min: popDmin, max: popDmax}),
  to:   Inputs.date({label: "To",   value: popDmax, min: popDmin, max: popDmax})
}));
```

```js
const popMetaById = new Map(popMetaRaw.map(d => [d.pid, d]));
const popFrom = popRange.from ?? popDmin;
const popTo   = popRange.to   ?? popDmax;
const popAgg = d3.rollup(
  popDailyRaw.filter(d => d.date >= popFrom && d.date <= popTo),
  v => ({trades: d3.sum(v, d => d.trades),
         yc: d3.sum(v, d => d.yes_contracts),
         yn: d3.sum(v, d => d.yes_notional),
         ct: d3.sum(v, d => d.contracts_total)}),
  d => d.pid);
const popTop = Array.from(popAgg, ([pid, a]) => {
  const m = popMetaById.get(pid) ?? {};
  return {trades: a.trades, ct: a.ct, yn: a.yn,
          avg_c: a.yc > 0 ? 100 * a.yn / a.yc : null,
          n_legs: m.n_legs, result: m.result, family: m.family, kind: m.kind,
          label: String(m.label ?? "").trim(), ticker: String(m.ticker ?? "")};
}).sort((a, b) => b.trades - a.trades).slice(0, 30).map((d, i) => ({...d, rank: i + 1}));
```

```js
const popFmtPrice = c => c == null ? "—" : c >= 1 ? c.toFixed(1) + "¢" : c >= 0.1 ? c.toFixed(2) + "¢" : c.toFixed(3) + "¢";
const popResult = r => r === "hit" ? html`<span style="color:#1a9641;font-weight:600;">✓ hit</span>`
  : r === "miss" ? html`<span style="color:#d7191c;">✗ miss</span>`
  : html`<span style="color:var(--theme-foreground-muted, #999);">pending</span>`;
const popLabel = d => {
  let s = d.label;
  if (!s) s = (d.family ? d.family + " · " : "") + d.ticker.split("-").slice(1).join("-");
  return s.length > 90 ? s.slice(0, 90) + "…" : s;
};
// Chip = the AUDITED leg-level correlation verdict (same classifier as every other
// parlay chart) — NOT Kalshi's product family, which misleads (a same-game
// futures+prop ticket can be issued under the "multi-game" product).
const popKindChip = d =>
  d.kind === "correlated"  ? html`<span style="display:inline-block;font-size:11px;color:#e4572e;background:rgba(228,87,46,0.12);border-radius:3px;padding:0 5px;margin-right:6px;white-space:nowrap;">same-game (correlated)</span>`
  : d.kind === "independent" ? html`<span style="display:inline-block;font-size:11px;color:#5b8def;background:rgba(91,141,239,0.12);border-radius:3px;padding:0 5px;margin-right:6px;white-space:nowrap;">multi-game (independent)</span>`
  : html`<span style="display:inline-block;font-size:11px;color:var(--theme-foreground-muted,#888);background:rgba(128,128,128,0.12);border-radius:3px;padding:0 5px;margin-right:6px;white-space:nowrap;">pending classification</span>`;
const popLegs = d => Number.isFinite(d.n_legs) ? d.n_legs : "—";
```

```js
html`<div style="font-size:13px;color:var(--theme-foreground-muted, #666);margin:2px 0 8px;">Top ${popTop.length} of ${popAgg.size.toLocaleString()} parlays traded in range</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead><tr style="text-align:left;border-bottom:2px solid var(--card-border, #ccc);">
    <th style="padding:5px 6px;width:26px;">#</th>
    <th style="padding:5px 6px;">Parlay</th>
    <th style="padding:5px 6px;text-align:right;width:46px;">Legs</th>
    <th style="padding:5px 6px;text-align:right;width:66px;">Trades</th>
    <th style="padding:5px 6px;text-align:right;width:118px;">Volume</th>
    <th style="padding:5px 6px;text-align:right;width:88px;">Taker stakes</th>
    <th style="padding:5px 6px;text-align:right;width:74px;">Avg price</th>
    <th style="padding:5px 6px;width:72px;">Result</th>
  </tr></thead>
  <tbody>${popTop.map(d => html`<tr style="border-bottom:1px solid var(--theme-background-alt, #eee);">
    <td style="padding:5px 6px;color:var(--theme-foreground-muted, #999);">${d.rank}</td>
    <td style="padding:5px 6px;" title=${d.label}>${popKindChip(d)}${popLabel(d)}</td>
    <td style="padding:5px 6px;text-align:right;">${popLegs(d)}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${d.trades.toLocaleString()}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${d.ct > 0 ? html`${d.ct.toLocaleString()} <span style="color:var(--theme-foreground-muted,#888);">($${fmtCount(d.ct)})</span>` : "—"}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${fmtUSD(d.yn)}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${popFmtPrice(d.avg_c)}</td>
    <td style="padding:5px 6px;">${popResult(d.result)}</td>
  </tr>`)}</tbody>
</table>`
```

```js
const bucketLabel = b => String(b).replace(/^\d:/, "");
const misp = mispRaw.map(d => ({
  kind: d.kind,
  bucket: bucketLabel(d.price_bucket),
  bucketOrder: +String(d.price_bucket).charAt(0),
  implied: +d.implied_pct,
  actual:  +d.actual_pct,
  gap:     +d.gap,
  n_parlays: +d.n_parlays,
  total_vol: +d.total_vol
})).sort((a,b) => a.bucketOrder - b.bucketOrder);
const bucketDomain = [...new Set(misp.map(d => d.bucket))];
```

## Are parlays priced fairly?

_Calibration: implied probability (entry price) vs the win rate that actually occurred. Points below the dashed line = bettors **over**paid (actual worse than implied). Bubble size = parlay count._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 380, marginLeft: 56,
  x: {label: "Implied win % (price)", domain: [0, 100], grid: true, tickFormat: d => d + "%"},
  y: {label: "Actual win %", domain: [0, 100], grid: true, tickFormat: d => d + "%"},
  color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS, tickFormat: kindShort},
  marks: [
    Plot.line([[0,0],[100,100]], {stroke: "var(--theme-foreground-faint)", strokeDasharray: "4 4"}),
    Plot.dot(misp, {x: "implied", y: "actual", fill: "kind", r: d => Math.sqrt(d.n_parlays)/120 + 4, fillOpacity: 0.75, stroke: "var(--theme-background)",
      tip: true, title: d => `${kindShort(d.kind)} · ${d.bucket}\nImplied: ${pct1(d.implied)}\nActual: ${pct1(d.actual)}\nGap: ${d.gap > 0 ? "+" : ""}${pct1(d.gap)}\nParlays: ${d.n_parlays.toLocaleString()}`})
  ]
})
```

_Calibration gap by price band (actual − implied). Negative bars = embedded margin the bettor pays. Same-game tickets carry a wider gap through the mid-range._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 320, marginLeft: 56,
  marginBottom: 64,
  x: {label: "Price band", domain: bucketDomain, tickRotate: -30},
  y: {label: "Actual − implied (pts)", grid: true, tickFormat: d => d + ""},
  color: {legend: true, domain: KIND_DOMAIN, range: KIND_COLORS, tickFormat: kindShort},
  fx: {label: null},
  marks: [
    Plot.barY(misp, {x: "bucket", y: "gap", fill: "kind", fx: "kind",
      tip: true, title: d => `${kindShort(d.kind)} · ${d.bucket}\nImplied: ${pct1(d.implied)}\nActual: ${pct1(d.actual)}\nGap: ${d.gap > 0 ? "+" : ""}${d.gap} pts\nParlays: ${d.n_parlays.toLocaleString()}`}),
    Plot.ruleY([0])
  ]
})
```

<details class="surface-card compact-details">
  <summary>About this page &amp; method</summary>
  <p><strong>Source.</strong> The parlay market collector — every Kalshi parlay
  market (<code>KXMVE*</code> series) that has traded, from launch (Sep 2025)
  through the latest collected day. ~15.9M traded parlays, ~99.7M legs.</p>
  <p><strong>Same-game vs multi-game.</strong> Each leg's underlying game is
  derived from its <code>event_ticker</code>. Legs of one game listed under
  different market types (moneyline / total / spread) collapse to one game, so
  a ticket is <em>same-game (correlated)</em> if any two legs share a game —
  meaning it cannot be priced by simply multiplying leg odds. Per-asset crypto
  windows and season-long futures are kept distinct (not false-merged).</p>
  <p><strong>House edge</strong> = −(taker P&amp;L ÷ stake), before Kalshi fees;
  the real cost to the bettor is somewhat larger. <strong>Calibration gap</strong>
  is actual minus implied win rate; the negative gap is the all-in cost the
  bettor pays (margin/vig), not pure forecast error.</p>
</details>
