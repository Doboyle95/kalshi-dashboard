---
title: Parlay Anatomy
---

# Parlay Anatomy

How Kalshi parlays are built and priced: the house edge by parlay length, the
rise of multi-leg betting over time, which real games draw the most parlay
money, and whether the implied odds match what actually happens — split by
**same-game (correlated)** vs **multi-game (independent)** tickets.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(2)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k"
  // Under 1,000 this used to fall through to String(a), so a fractional dollar value
  // printed its full float expansion -- $41.769999999999996 in the Taker stakes column.
  : (Number.isInteger(a) ? String(a) : a.toFixed(2))); };
const fmtUSD   = n => "$" + fmtCount(n);
const pct1     = n => (n == null ? "n/a" : n.toFixed(1) + "%");
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
// Only the toggle wording, so this chart and the five venue parlay charts that DO use the
// shared builder cannot end up calling the same thing two different names. The chart itself
// stays here: it is the one parlay chart fed by two producers on two bases, and it carries
// leg-count fields in its tooltip that no venue file has.
import {metricLabel} from "./components/parlay-series.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const heRaw   = await DataAttachment("data/parlay_house_edge_by_legs.csv").csv({typed: true});
const timeRaw = await DataAttachment("data/parlay_legs_over_time.csv").csv({typed: true});
const gamesRaw= await DataAttachment("data/parlay_top_games_by_volume.csv").csv({typed: true});
const mispRaw = await DataAttachment("data/parlay_mispricing_by_correlation.csv").csv({typed: true});
const pnlRaw  = await DataAttachment("data/parlay_pnl_daily_by_corr_v2.csv").csv({typed: true});
const mixRaw  = await DataAttachment("data/parlay_sportsmix_v2.csv").csv({typed: true});
const popDailyRaw = await DataAttachment("data/parlay_popular_daily.csv").csv({typed: true});
const popMetaRaw  = await DataAttachment("data/parlay_popular_meta.csv").csv({typed: true});
const volTypeRaw  = await DataAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const lotteryRaw  = await DataAttachment("data/parlay_lottery_daily.csv").csv({typed: true});
const lotterySummaryRaw = await DataAttachment("data/parlay_lottery_summary.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, fmtFreshDate, freshnessPanel, latestDate} from "./components/freshness.js";
```

```js
// Games / house-edge / legs-mix / mispricing are built by build_parlay_anatomy_csvs.py from
// the modern trade-level facts (parlay_leg_facts/parlay_trade_facts/parlay_ticker_game), NOT
// the old frozen R-sample -- that legacy path was retired. game_key encodes the actual game
// date (e.g. "26JUL03ARGCPV" -> 2026-07-03).
//
// 2026-07-23: "most recent game" alone is NOT a reliable staleness signal for this file --
// parlay_top_games_by_volume.csv is a top-40-BY-VOLUME ranking, not a recency feed, so it will
// always look "old" during any quiet stretch between major single-day sporting spectacles
// (nothing has to be wrong for weeks to pass with no new game crossing the ~500M+ bar a World
// Cup final sets). Confirmed empirically: the file is rebuilt on schedule and the true most-
// recent game (by trade date) genuinely doesn't crack the top 40 during a lull. Only treat
// this as a real pipeline freeze if the FILE ITSELF also hasn't been rebuilt recently --
// that's the one signal a frozen pipeline can't fake (a live one keeps re-touching its output
// even when the ranking's top-40 membership doesn't change).
const GAME_KEY_MONTHS = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
const gameKeyDate = k => {
  const m = /^(\d{2})([A-Z]{3})(\d{2})/.exec(String(k));
  const mo = m && GAME_KEY_MONTHS[m[2]];
  return m && mo != null ? new Date(Date.UTC(2000 + (+m[1]), mo, +m[3])) : null;
};
const gamesMaxDate = latestDate(gamesRaw, d => gameKeyDate(d.game_key));
const gamesStaleDays = gamesMaxDate ? Math.round((Date.now() - gamesMaxDate) / 86400000) : null;
const gamesFileUpdatedAt = fileUpdatedAt(freshness, "parlay_top_games_by_volume.csv");
const gamesFileAgeHours = gamesFileUpdatedAt ? (Date.now() - new Date(gamesFileUpdatedAt)) / 3600000 : null;
// Anatomy cadence rebuilds twice daily (~12h); 36h tolerates one missed cycle before flagging.
const gamesFileStale = gamesFileAgeHours == null || gamesFileAgeHours > 36;
const gamesPipelineStuck = gamesStaleDays > 3 && gamesFileStale;
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L (by correlation)", date: latestDate(pnlRaw), updatedAt: fileUpdatedAt(freshness, "parlay_pnl_daily_by_corr_v2.csv"), meta: "Settlement-dependent — a parlay only counts once its markets settle", tone: "settlement"},
    {label: "Parlay volume by type", date: latestDate(volTypeRaw), updatedAt: fileUpdatedAt(freshness, "parlay_volume_by_type_daily.csv"), meta: "Classified from actual legs; very recent tickers can show as \"unclassified\" until leg-mapping catches up"},
    {label: "Games / house edge / legs-mix / mispricing", value: gamesMaxDate ? `Most recent game: ${fmtFreshDate(gamesMaxDate)}` + (gamesStaleDays > 3 ? ` — ${gamesStaleDays}d behind today` : "") : "n/a", updatedAt: gamesFileUpdatedAt, meta: gamesPipelineStuck ? "Shared source (trade-level facts) for the 4 charts below. The file itself hasn't rebuilt recently either — that combination means the pipeline is genuinely stuck, not just a quiet stretch." : "Shared source (trade-level facts) for the 4 charts below. \"Most recent game\" ranks by all-time VOLUME, not recency — it can sit behind today for weeks with no new game topping the bar a big event set, even though the pipeline is rebuilding on schedule (see its own \"Updated\" timestamp above).", tone: "local"},
    {label: "Lottery ticket parlays", date: latestDate(lotteryRaw, d => d.date), updatedAt: fileUpdatedAt(freshness, "parlay_lottery_daily.csv"), meta: "Refreshes every ~30min alongside the most-popular-parlays table above"},
    {label: "Parlay price vs its legs", date: latestDate(pvlDailyRaw, d => d.date), updatedAt: fileUpdatedAt(freshness, "parlay_vs_legs_daily.csv"), meta: "Complete trading days only, so the newest row is yesterday by design"}
  ],
  note: "Recent days are still filling in for the P&L and volume-by-type figures above — a parlay only counts once its markets settle, and brand-new tickers may briefly show as \"unclassified\" until leg-mapping catches up (normal lag, clears within a day or two). The games/house-edge/mispricing group ranks by all-time volume, so its \"most recent game\" naturally lags during quiet periods — check its card above (both the game date AND the file's own rebuild time) before assuming it's stuck."
}));
display(askPageLink({
  question: "Explain parlay anatomy: house edge by leg count, correlated vs independent P&L, and how much recent volume is still unclassified pending leg-mapping.",
  context: "Parlay Anatomy page (parlay-analytics.md)."
}));
```

<a class="destination-card" href="./parlay"><strong>Parlay bettor P&amp;L and cash-outs</strong><span>Realized results, held-to-settlement counterfactual, cash-out effect, stakes, and return rate.</span></a>

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
  // total_vol is round(sum(taker_contracts),0) -- a CONTRACT COUNT, not dollars.
  // Across this file that is 43.2bn contracts against $3.05bn actually staked (14.1x).
  // taker_stake is the dollar column; never format total_vol with a $.
  total_vol: d.total_vol,
  taker_stake: d.taker_stake,
  taker_pnl: d.taker_pnl
})).sort((a,b) => a.legsN - b.legsN);
```

## House edge climbs with parlay length

_Cost to the bettor per \$100 staked (taker P&L, before fees — real cost is worse). Each added leg compounds the margin on same-game tickets; the multi-game series is noisier and dips at 7 legs before climbing again at 10+._

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
    Plot.tip(he, Plot.pointerX({x: "legsLabel", y: "house_edge", stroke: "kind",
      title: d => `${d.legsLabel}-leg · ${kindShort(d.kind)}\nHouse edge: ${pct1(d.house_edge)}\nWin rate: ${pct1(d.win_rate)}\nParlays: ${d.n_parlays.toLocaleString()}\nVolume: ${fmtCount(d.total_vol)} contracts\nTaker stakes: ${fmtUSD(d.taker_stake)}`})),
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
    Plot.tip(he, Plot.pointerX({x: "legsLabel", y: "win_rate", stroke: "kind",
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
      total_vol: +d.total_vol,
      // Dollars the buyer put up, taker-YES only, on the same entry-cohort month as
      // total_vol beside it. Both attribute a parlay's whole life to the month it FIRST
      // traded, so neither is a calendar-month cash figure.
      taker_stake: +d.taker_stake
    };
  })
  .sort((a,b) => a.date - b.date);

// Sample size for the method box, derived from the loaded file rather than hardcoded --
// the old literals ("~15.9M parlays, ~99.7M legs") had gone stale by 2.7x. Legs are
// n_parlays x mean_legs, so mean_legs' 2dp rounding costs <0.1%.
const anatomySample = {
  parlays: d3.sum(tline, d => d.n_parlays),
  legs: d3.sum(tline, d => d.n_parlays * d.mean_legs)
};

// Same staleness class: the mean-legs caption carried a hardcoded "7.2" that the
// series had already passed. Read the newest month off the file instead.
const latestMeanLegs = tline.length ? tline[tline.length - 1].mean_legs : null;
```

```js
// Daily series for "The rise of multi-leg betting": sum parlay_volume_by_type_daily
// (already loaded above) across ALL classes per date, INCLUDING "unclassified
// (pending legs)". Unlike the monthly series (classified-only trade_facts), recent
// days never vanish while leg-mapping catches up. NOTE: pending volume does NOT
// account for the monthly/daily gap — the two series come from different producers
// on different bases, and since ~Feb 2026 pending has been worth only ~0-2pp of a
// gap running 4-9%. pct_pending in the tooltip surfaces that share per day.
const dayStr = d => d instanceof Date ? d3.utcFormat("%Y-%m-%d")(d) : String(d);
const volDay = (() => {
  const by = new Map();
  for (const r of volTypeRaw) {
    if (!r.date) continue;
    const k = dayStr(r.date);
    const cur = by.get(k) || {vol: 0, pending: 0, stake: 0};
    cur.vol += +r.contracts || 0;
    // taker_yes_stake is the dollars the buyer paid, taker-YES only. Its denominator is
    // NOT contracts': 12.6% of parlay contracts carry a taker-side value of exactly zero
    // (the 'na' side, plus yes prints at price 0), so dividing the two columns into each
    // other does not give an average price for the whole book.
    cur.stake += +r.taker_yes_stake || 0;
    if (+r.unmapped_flag === 1) cur.pending += +r.contracts || 0;
    by.set(k, cur);
  }
  return [...by.entries()]
    .map(([k, v]) => ({date: d3.utcParse("%Y-%m-%d")(k), day: k, total_vol: v.vol,
                       taker_stake: v.stake,
                       pct_pending: v.vol ? 100 * v.pending / v.vol : 0}))
    .sort((a, b) => a.date - b.date);
})();

// Measured monthly-vs-daily gap for the caption, on the last COMPLETE month (the
// current month is partial in both series). Derived, not hardcoded: the old caption
// blamed pending-classification volume, which now explains almost none of it.
// Takes the metric because the two columns have their own gaps: the monthly file is an
// INNER join on leg_facts, so the unclassified tail it drops is a different share of the
// dollars than it is of the contracts.
const riseBasisNote = metric => {
  const key = metric === "stakes" ? "taker_stake" : "total_vol";
  const by = d3.rollup(volDay, v => d3.sum(v, d => d[key]), d => d.day.slice(0, 7));
  const rows = tline.filter(d => d[key] > 0 && by.has(d.month));
  const last = rows[rows.length - 2] ?? rows[rows.length - 1];
  if (!last) return "";
  const gap = 100 * (by.get(last.month) / last[key] - 1);
  return ` — different bases, so in ${last.month} the daily view ran ${gap.toFixed(0)}% above the monthly bar`;
};
```

<div class="instruction-line"><strong>Shared time window:</strong> drag the brush once to update every time-series chart on this page. The underlying tables and cross-sectional charts stay on their full available sample.</div>

```js
const parlayBrushSeries = volDay.map(d => ({date: d.date, value: d.total_vol}));
const parlayDateSel = Mutable([d3.min(parlayBrushSeries, d => d.date), d3.max(parlayBrushSeries, d => d.date)]);
display(renderDateBrush({
  data: parlayBrushSeries,
  initialRange: [d3.min(parlayBrushSeries, d => d.date), d3.max(parlayBrushSeries, d => d.date)],
  onSelect: range => { parlayDateSel.value = range; },
  color: "#f4a736",
  width
}));
```

```js
const [parlayBrushFrom, parlayBrushTo] = parlayDateSel;
const inParlayRange = row => row.date >= parlayBrushFrom && row.date <= parlayBrushTo;
```

## The rise of multi-leg betting

_From a standing start in late 2025 to billions of contracts a month. **Stakes** is the money bettors actually paid, and a long-shot ticket is a lot of contracts and very little of it${riseBasisNote(riseMetric)}._

```js
const riseGranularity = view(Inputs.radio(["Monthly", "Daily"], {value: "Monthly", label: "View"}));
const riseMetric = view(Inputs.radio(["volume", "stakes"], {value: "volume", label: "Metric", format: metricLabel}));
```

```js
const riseDaily = riseGranularity === "Daily";
const riseStakes = riseMetric === "stakes";
// One key, read off both sources, so the toggle cannot show contracts on one granularity
// and dollars on the other.
const riseKey = riseStakes ? "taker_stake" : "total_vol";
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 72,
  x: {type: "utc", label: null},
  y: {label: `${riseDaily ? "Daily" : "Monthly"} parlay ${riseStakes ? "stakes (USD)" : "volume (contracts)"}`, grid: true,
      tickFormat: riseStakes ? (d => fmtUSD(d)) : (d => d>=1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")},
  marks: [
    // Both numbers are in the tooltip on both settings, so flipping the toggle never hides
    // the one the reader was looking at.
    riseDaily
      ? Plot.rectY(volDay.filter(inParlayRange), {x: "date", interval: d3.utcDay, y: riseKey, fill: "#f4a736",
          tip: true, title: d => `${d.day}\nVolume: ${fmtCount(d.total_vol)} contracts (${d.total_vol.toLocaleString()})\nTaker stakes: ${fmtUSD(d.taker_stake)}\nPending classification: ${pct1(d.pct_pending)}`})
      : Plot.rectY(tline.filter(inParlayRange), {x: "date", interval: d3.utcMonth, y: riseKey, fill: "#f4a736",
          tip: true, title: d => `${d.month}\nVolume: ${fmtCount(d.total_vol)} contracts (${d.total_vol.toLocaleString()})\nTaker stakes: ${fmtUSD(d.taker_stake)}\nParlays: ${d.n_parlays.toLocaleString()}\nMean legs: ${d.mean_legs}\nMedian legs: ${d.median_legs}`}),
    Plot.ruleY([0])
  ]
}))
```

_Mean legs per parlay crept up past 6 and is still rising &mdash; ${latestMeanLegs ?? "—"} in the latest month._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 240, marginLeft: 56,
  x: {type: "utc", label: null},
  y: {label: "Mean legs / parlay", grid: true, domain: [0, d3.max(tline, d=>d.mean_legs)*1.15]},
  marks: [
    Plot.line(tline.filter(inParlayRange), {x: "date", y: "mean_legs", stroke: "#7048e8", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(tline.filter(inParlayRange), {x: "date", y: "mean_legs", fill: "#7048e8", r: 3}),
    Plot.tip(tline.filter(inParlayRange), Plot.pointerX({x: "date", y: "mean_legs",
      title: d => `${d.month}\nMean legs: ${d.mean_legs}\nMedian legs: ${d.median_legs}`}))
  ]
})
```

_Composition on two different bases: share of **volume** in 4+-leg parlays, and share of **tickets** that are same-game (correlated). The same-game ticket share dipped sharply in Feb–Mar 2026._

```js
// pct_correlated is TICKET-based, not volume-weighted — the served file carries no
// correlated-volume column, and the two bases differ by up to ~13pp (and swap
// direction in Sep 2025), so the series is labelled by its real basis.
const compTidy = [
  ...tline.map(d => ({date: d.date, month: d.month, value: d.pct_vol_4plus,   series: "% volume in 4+-leg"})),
  ...tline.map(d => ({date: d.date, month: d.month, value: d.pct_correlated,  series: "% tickets same-game (correlated)"}))
];
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 260, marginLeft: 56,
  x: {type: "utc", label: null},
  y: {label: "Share", grid: true, domain: [0, 100], tickFormat: d => d + "%"},
  color: {legend: true, domain: ["% volume in 4+-leg", "% tickets same-game (correlated)"], range: ["#f4a736", "#e4572e"]},
  marks: [
    Plot.line(compTidy.filter(inParlayRange), {x: "date", y: "value", stroke: "series", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.dot(compTidy.filter(inParlayRange), {x: "date", y: "value", fill: "series", r: 3}),
    Plot.tip(compTidy.filter(inParlayRange), Plot.pointerX({x: "date", y: "value", stroke: "series",
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
    Plot.rectY(vtMonthly.filter(inParlayRange), {x: "date", interval: d3.utcMonth, y: "contracts", fill: "parlay_class",
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
    Plot.line(pnlCum.filter(inParlayRange), {x: "date", y: "cum_pnl", stroke: "kind", strokeWidth: 2.5, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
    Plot.ruleX(pnlCum.filter(inParlayRange), Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(pnlCum.filter(inParlayRange), Plot.pointerX({x: "date", y: "cum_pnl", stroke: "kind",
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

<p class="section-intro">Almost every parlay contract is a pure-sports parlay. Each month's bar is split by mix — the green is all-sports, and the thin slivers on top are cross-category "mixed" and all-non-sports parlays.</p>

```js
// All three sport-mix categories, monthly, for the 100%-stacked dominance view.
// total_vol here is round(sum(contracts_traded),0) over taker-yes trades -- a CONTRACT
// COUNT (44.75bn), not dollars. taker_stake is the dollar column ($3.29bn), 13.6x smaller.
const mixAll = mixRaw
  .map(d => ({date: d3.utcParse("%Y-%m")(monthStr(d.month)), month: monthStr(d.month),
              sportmix: String(d.sportmix), total_vol: +d.total_vol, taker_stake: +d.taker_stake}))
  .filter(d => d.date).sort((a, b) => a.date - b.date);
const SHARE_DOMAIN = ["all-sports", "mixed", "all-nonsports"];
const SHARE_COLORS = ["#1a9641", "#7048e8", "var(--accent-kalshi)"];
const shareLabel = k => k === "all-sports" ? "All-sports" : k === "mixed" ? "Mixed" : "All non-sports";
const sportsShareAll = (() => {
  const tot = d3.sum(mixAll, d => d.total_vol);
  const sports = d3.sum(mixAll.filter(d => d.sportmix === "all-sports"), d => d.total_vol);
  return tot ? sports / tot * 100 : 0;
})();
// Same share measured on money rather than contracts -- the two answer different questions.
const sportsShareStake = (() => {
  const tot = d3.sum(mixAll, d => d.taker_stake);
  const sports = d3.sum(mixAll.filter(d => d.sportmix === "all-sports"), d => d.taker_stake);
  return tot ? sports / tot * 100 : 0;
})();
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 240, marginLeft: 60,
  x: {type: "utc", label: null},
  y: {label: "Share of monthly volume (contracts)", percent: true, grid: true},
  color: {legend: true, domain: SHARE_DOMAIN, range: SHARE_COLORS, tickFormat: shareLabel},
  marks: [
    Plot.rectY(mixAll.filter(inParlayRange), {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "sportmix",
                        offset: "expand", order: SHARE_DOMAIN}),
    Plot.ruleY([0, 1])
  ]
})
```

<p class="chart-note">All-sports parlays are <strong>${sportsShareAll.toFixed(1)}%</strong> of all parlay contracts, and <strong>${sportsShareStake.toFixed(1)}%</strong> of the money staked. The chart below zooms into the rest — the cross-category and all-non-sports sliver.</p>

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
    total_vol: +d.total_vol,      // contracts
    taker_stake: +d.taker_stake   // dollars
  }))
  .sort((a, b) => a.date - b.date);

const mixTipData = (() => {
  const m = new Map();
  for (const r of mixMonthly) {
    const k = +r.date;
    if (!m.has(k)) m.set(k, {date: r.date, month: r.month});
    m.get(k)[r.sportmix] = r.total_vol;
    m.get(k)[r.sportmix + "_n"] = r.n_parlays;
    m.get(k)[r.sportmix + "_s"] = r.taker_stake;
  }
  return [...m.values()].sort((a, b) => +a.date - +b.date);
})();
const MIX_DOMAIN = ["mixed", "all-nonsports"];
const MIX_COLORS = ["#7048e8", "var(--accent-kalshi)"];
const mixLabel = k => k === "mixed" ? "Mixed (sports + non-sports legs)" : "All non-sports legs";
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 280, marginLeft: 80,
  x: {type: "utc", label: null},
  y: {label: "Monthly parlay volume (contracts)", grid: true, tickFormat: d => d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k"},
  color: {legend: true, domain: MIX_DOMAIN, range: MIX_COLORS, tickFormat: mixLabel},
  marks: [
    Plot.rectY(mixMonthly.filter(inParlayRange), {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "sportmix", order: MIX_DOMAIN}),
    Plot.ruleX(mixTipData.filter(inParlayRange), Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(mixTipData.filter(inParlayRange), Plot.pointerX({
      x: "date",
      title: d => [
        d.month,
        ...MIX_DOMAIN.map(k => d[k] > 0 ? `${mixLabel(k)}: ${fmtCount(d[k])} contracts, ${fmtUSD(d[k+"_s"])} staked (${d[k+"_n"].toLocaleString()} parlays)` : null).filter(Boolean)
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
  gamesPipelineStuck
    ? html`<div class="chart-note" style="color:var(--accent-warning);font-weight:650;">⚠ Stuck: the most recent game in this ranking is ${fmtFreshDate(gamesMaxDate)} — ${gamesStaleDays} days behind today, AND the file itself hasn't rebuilt in over 36h. Both signals stale together means the pipeline is genuinely stuck (see the freshness panel above), not just a quiet stretch.</div>`
    : gamesStaleDays > 3
    ? html`<div class="chart-note">Most recent game in this ranking: ${fmtFreshDate(gamesMaxDate)} (${gamesStaleDays}d ago). This is a top-40-by-volume ranking, not a recency feed — no game since has topped the volume bar a big event set, though the pipeline itself is rebuilding on schedule.</div>`
    : html`<div class="chart-note">Most recent game in this ranking: ${fmtFreshDate(gamesMaxDate)}.</div>`
);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 560, marginLeft: 150,
  x: {label: "Parlay volume touching game (contracts)", grid: true, tickFormat: d => d>=1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k"},
  y: {label: null, domain: games.map(d=>d.label)},
  marks: [
    Plot.barX(games, {x: "parlay_vol", y: "label", fill: "#3b82a0",
      tip: true, title: d => `${d.label}\n(${d.game_key})\nParlay volume: ${fmtCount(d.parlay_vol)} contracts (${d.parlay_vol.toLocaleString()})\nParlays touching: ${d.n_parlays.toLocaleString()}`}),
    Plot.ruleX([0])
  ]
})
```

## The most popular parlays

_The 30 most-**traded** parlay tickets in the window you pick below, ranked by number of trades. The colored chip is the **audited leg-level correlation** (same classifier as the charts above) — not Kalshi's product family. **Taker stakes** is the money yes-takers actually put in (taker-yes dollars). **Avg price** is the stake-weighted price bettors paid to get in — parlays are longshots, so most sit at a few cents or less (a 1¢ ticket ≈ a 1% implied chance). **Result** is the settled outcome. Covers parlays with ≥100 lifetime trades; recent tickets may still be **pending**._

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
          n_legs: m.n_legs, result: m.result, kind: m.kind,
          label: String(m.label ?? "").trim(), pid};
}).sort((a, b) => b.trades - a.trades).slice(0, 30).map((d, i) => ({...d, rank: i + 1}));
```

```js
const popFmtPrice = c => c == null ? "—" : c >= 1 ? c.toFixed(1) + "¢" : c >= 0.1 ? c.toFixed(2) + "¢" : c.toFixed(3) + "¢";
const popResult = r => r === "hit" ? html`<span style="color:var(--accent-positive);font-weight:600;">✓ hit</span>`
  : r === "miss" ? html`<span style="color:var(--accent-negative);">✗ miss</span>`
  : html`<span style="color:var(--theme-foreground-muted, #999);">pending</span>`;
const popLabel = d => {
  let s = d.label;
  if (!s) s = `Parlay ${d.pid}`;
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
    <th style="padding:5px 6px;text-align:right;width:118px;">Volume (contracts)</th>
    <th style="padding:5px 6px;text-align:right;width:88px;">Taker stakes</th>
    <th style="padding:5px 6px;text-align:right;width:74px;">Avg price</th>
    <th style="padding:5px 6px;width:72px;">Result</th>
  </tr></thead>
  <tbody>${popTop.map(d => html`<tr style="border-bottom:1px solid var(--theme-background-alt, #eee);">
    <td style="padding:5px 6px;color:var(--theme-foreground-muted, #999);">${d.rank}</td>
    <td style="padding:5px 6px;" title=${d.label}>${popKindChip(d)}${popLabel(d)}</td>
    <td style="padding:5px 6px;text-align:right;">${popLegs(d)}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${d.trades.toLocaleString()}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${d.ct > 0 ? d.ct.toLocaleString() : "—"}</td>
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
  total_vol: +d.total_vol   // contracts (sum of taker_contracts), NOT dollars -- currently unrendered
})).sort((a,b) => a.bucketOrder - b.bucketOrder);
const bucketDomain = [...new Set(misp.map(d => d.bucket))];
```

## The "lottery ticket" parlays

_Trading on parlays with **8 or more legs**, priced under **2¢** to win — true longshots, not just "unlikely." A ticket only counts on the days it actually traded at that price, so the same parlay can appear here on one day and not another as its odds move; this is a snapshot of longshot trading activity, not a fixed list of tickets. **Taker stakes** (the money yes-takers put in) is shown starting **June 7, 2026**. **Volume** isn't affected and covers the full history back to Jan 2026._

```js
const lotteryDaily = lotteryRaw.map(d => ({date: d.date, volume: d.volume, stakes: d.stakes, trades: d.trades, n_tickers: d.n_tickers}));
const lotteryFloor = new Date("2026-06-07");
```

<div class="control-strip">

```js
const lotteryMetric = view(Inputs.radio(["volume", "stakes"], {value: "volume", label: "Metric", format: metricLabel}));
```

</div>

```js
const lotteryFmt = lotteryMetric === "volume" ? fmtCount : fmtUSD;
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 64,
  x: {type: "utc", label: null},
  y: {label: lotteryMetric === "volume" ? "Daily volume (contracts)" : "Daily taker stakes ($)", grid: true, tickFormat: lotteryFmt},
  marks: [
    Plot.rectY(lotteryDaily.filter(d => d[lotteryMetric] != null && inParlayRange(d)), {
      x: "date", interval: d3.utcDay, y: lotteryMetric, fill: "#9b59b6",
      tip: true,
      title: d => `${d.date.toISOString().slice(0, 10)}\n`
        + `${lotteryMetric === "volume" ? "Volume" : "Taker stakes"}: ${lotteryFmt(d[lotteryMetric])}\n`
        + `Trades: ${d.trades.toLocaleString()}\n`
        + `Distinct tickets: ${d.n_tickers.toLocaleString()}`
    }),
    lotteryMetric === "volume" ? Plot.ruleX([lotteryFloor], {stroke: "var(--theme-foreground-fainter)", strokeDasharray: "3,3"}) : null,
    lotteryMetric === "volume" ? Plot.text([{date: lotteryFloor, y: 0}], {x: "date", y: () => 0, dy: -8, text: () => "Stakes data starts here", fontSize: 10, fill: "var(--theme-foreground-muted, #888)", frameAnchor: "bottom", textAnchor: "start", dx: 4}) : null,
    Plot.ruleY([0])
  ]
}))
```

```js
const lotterySummary = lotterySummaryRaw[0];
display(html`<div class="surface-card compact-details" style="font-size:13px;padding:12px 16px;margin:6px 0 18px 0;">
<strong>How often do they hit?</strong> Of ${lotterySummary.n_qualifying.toLocaleString()} qualifying
tickets, ${lotterySummary.n_settled.toLocaleString()} (${lotterySummary.pct_settled}%) have settled so
far — <strong>${lotterySummary.n_hit.toLocaleString()} hit, ${lotterySummary.n_miss.toLocaleString()} missed</strong>,
a <strong>${lotterySummary.hit_rate_pct}% win rate</strong>. That's well below the ~roughly 11% win rate for
parlays generally — these are, in fact, lottery tickets.
</div>`);
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
  // r is PRE-SQRT-ED below, so the scale must be identity. Plot's default r scale is
    // itself sqrt, and feeding it an already-square-rooted value squares the root
    // twice -- area then grows as sqrt(n), not n, and every large bubble is
    // understated. calibration.md solves it the same way.
    r: {type: "identity"},
    marks: [
    Plot.line([[0,0],[100,100]], {stroke: "var(--theme-foreground-faint)", strokeDasharray: "4 4"}),
    Plot.dot(misp, {x: "implied", y: "actual", fill: "kind", r: d => Math.sqrt(d.n_parlays)/120 + 4, fillOpacity: 0.75, stroke: "var(--theme-background)",
      tip: true, title: d => `${kindShort(d.kind)} · ${d.bucket}\nImplied: ${pct1(d.implied)}\nActual: ${pct1(d.actual)}\nGap: ${d.gap > 0 ? "+" : ""}${pct1(d.gap)}\nParlays: ${d.n_parlays.toLocaleString()}`})
  ]
})
```

_Calibration gap by price band (actual − implied). Negative bars = embedded margin the bettor pays. Same-game tickets carry a wider gap in every band, and the spread widens toward the favourites._

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

<!-- Raw HTML so the id stays the one the original title produced: ?embed= links address
     this section by it, and a retitle must not break them. -->
<h2 id="what-a-parlay-costs-vs-multiplying-its-legs" tabindex="-1"><a class="observablehq-header-anchor" href="#what-a-parlay-costs-vs-multiplying-its-legs">What a non-correlated parlay costs vs. multiplying its legs</a></h2>

_A non-correlated parlay is worth exactly the product of its legs: three independent
legs at 77¢, 66¢ and 74¢ are worth 37.6¢ together. These charts price **every leg at the
instant its parlay traded** — the leg market's last print at or before that moment — and
compare that product with what the parlay actually cost. The difference is the markup a
bettor pays over the legs' combined value, before fees. Same-game parlays are left out:
their legs move together, so multiplying them is not the right price._

```js
const pvlDailyRaw   = await DataAttachment("data/parlay_vs_legs_daily.csv").csv({typed: true});
const pvlProfileRaw = await DataAttachment("data/parlay_vs_legs_profile.csv").csv({typed: true});
```

```js
// Non-correlated tickets only. A same-game parlay's legs are linked, so the product of their
// prices is not its fair price and the gap is not a markup; the producer still publishes
// kind='correlated', but this section does not draw it.
const PVL_COLOR = KIND_COLORS[0];   // the page's non-correlated blue
// Every figure here leaves out trades whose legs multiply out below this price bin (log10 of
// cents): under ~0.1¢ a parlay trades at the lowest price sellers quote whatever its legs are
// worth, so its "markup" measures that floor, not a margin (method card below). The same cut
// as FLOOR_BIN_LOG10C in KalshiData python/build_parlay_vs_legs.py, which publishes the
// *_above_floor measures read here.
const PVL_FLOOR_BIN = -0.75;
const pvlIndepProfile = pvlProfileRaw.filter(d => d.kind === "independent");
const pvlLegsAll = pvlIndepProfile.filter(d => d.dim === "legs");
const pvlLegs = pvlIndepProfile
  .filter(d => d.dim === "legs_above_floor" && d.n_trades >= 500)
  .map(d => ({...d, label: String(d.bucket_label)}))   // typed parsing makes "10" a number
  .sort((a, b) => a.bucket_num - b.bucket_num);
const pvlCentsLabel = v => v >= 1 ? Math.round(v) + "¢" : v.toFixed(1) + "¢";
const pvlCentsTip = v => v >= 1 ? v.toFixed(1) + "¢" : v.toFixed(2) + "¢";
// Price bands above the floor, favourites first, so the markup climbs left to right as it
// does by leg count. bucket_num identifies a band; its label is what the legs in it were
// actually worth on average (avg_indep_cents), not the band's nominal midpoint.
const pvlPrice = pvlIndepProfile
  .filter(d => d.dim === "price" && d.n_trades >= 500 && Math.log10(d.bucket_num) >= PVL_FLOOR_BIN - 1e-9)
  .sort((a, b) => b.bucket_num - a.bucket_num)
  .map(d => ({...d, label: pvlCentsLabel(d.avg_indep_cents)}));
const pvlPriceLabel = new Map(pvlPrice.map(d => [d.bucket_num, d.label]));
// Markup of a set of rows as a ratio of sums, never an average of markups.
const pvlRatio = (rows, paid, fair) => {
  const p = d3.sum(rows, d => d[paid]), f = d3.sum(rows, d => d[fair]);
  return f > 0 ? 100 * (p / f - 1) : null;
};
const pvlLegsMarkup = rows => pvlRatio(rows, "stake_usd", "indep_stake_usd");
const pvlDayMarkup  = rows => pvlRatio(rows, "stake_usd_above_floor", "indep_stake_usd_above_floor");
const pvlAt = n => pvlLegs.filter(d => d.bucket_num === n);
const pvlLegsShare = rows => 100 * d3.sum(rows, d => d.stake_usd) / d3.sum(pvlLegs, d => d.stake_usd);
const pvlDays = pvlDailyRaw.filter(d => d.kind === "independent");
const pvlPaid = d3.sum(pvlDays, d => d.stake_usd_above_floor);
const pvlFair = d3.sum(pvlDays, d => d.indep_stake_usd_above_floor);
const pvlMarkup = pvlDayMarkup(pvlDays);
const pvlFrom = d3.min(pvlDays, d => d.date), pvlTo = d3.max(pvlDays, d => d.date);
// What the floor cut leaves out: of all priced non-correlated money, and of the 13+-leg money.
const pvlFloorShare = 100 * (1 - pvlPaid / d3.sum(pvlDays, d => d.stake_usd));
const pvlLongFloorShare = 100 * (1 - d3.sum(pvlLegs.filter(d => d.bucket_num >= 13), d => d.stake_usd)
  / d3.sum(pvlLegsAll.filter(d => d.bucket_num >= 13), d => d.stake_usd));
// One row per date (coverage is a per-date property, repeated on each kind's row).
const pvlCovDays = Array.from(d3.group(pvlDailyRaw, d => +d.date), ([, rows]) => rows[0]);
// Priced, but not drawn: the ticket's correlation class is not mapped yet.
const pvlPendingShare = 100 * d3.sum(pvlDailyRaw.filter(d => d.kind === "pending"), d => d.stake_usd)
  / d3.sum(pvlDailyRaw, d => d.stake_usd);
const pvlFmt = v => v == null ? "–" : (v >= 0.05 ? "+" : v <= -0.05 ? "−" : "")
  + (Math.abs(v) >= 10 ? Math.abs(v).toFixed(0) : Math.abs(v).toFixed(1)) + "%";
const pvlAxisFmt = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "%";
// The band whose legs were worth closest to a price, for the captions and bar labels.
const pvlNearest = cents => d3.least(pvlPrice, d => Math.abs(Math.log(d.avg_indep_cents / cents)));
// Bars that carry a direct label; every bar has a hover tip. A label sits above the bar, or
// just above the zero line when the bar is negative, so it never lands on the axis labels.
const pvlLegLabelled = pvlLegs.filter(d => ["2", "5", "10", "15", pvlLegs.at(-1)?.label].includes(d.label));
const pvlPriceLabelled = [...new Set([pvlPrice[0], pvlNearest(10), pvlNearest(1), pvlPrice.at(-1)])].filter(Boolean);
const pvlBarLabel = (data, x) => Plot.text(data, {x, y: d => Math.max(0, d.markup_pct),
  text: d => pvlFmt(d.markup_pct), dy: -7, lineAnchor: "bottom",
  fontSize: 11, fontWeight: 600, fill: "var(--theme-foreground)"});
// On a narrow screen, every other tick label, always keeping the last one (21+, the cheapest
// band) and dropping its neighbour so the two cannot collide.
const pvlSparseTick = (i, n, w) => w >= 600 || i === n - 1 || (i % 2 === 0 && i !== n - 2);
// Kalshi began charging a maker fee on combos at 05:00 ET on 2026-08-20 — double its
// standard maker rate — and exempted combos made entirely of independent NFL legs, which
// are created under their own series. fee_group carries that split.
const PVL_COMBO_MAKER_START = new Date("2026-08-20");
const PVL_FEE_GROUPS = new Map([
  ["All parlays", null],
  ["Maker-fee combo series", "combo_maker"],
  ["Fee-exempt NFL combos", "nfl_no_maker"]
]);
```

```js
// Narrower minimum than the shared kpi-grid so the four cards sit two-by-two on a phone.
display(html`<div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
  <div class="kpi-card">
    <div class="kpi-label">All non-correlated</div>
    <div class="kpi-value">${pvlFmt(pvlMarkup)}</div>
    <div class="kpi-meta">${fmtUSD(pvlPaid)} paid for legs worth ${fmtUSD(pvlFair)}</div>
  </div>
  ${[["Two legs", pvlAt(2)], ["Five legs", pvlAt(5)], ["Ten or more legs", pvlLegs.filter(d => d.bucket_num >= 10)]]
    .map(([label, rows]) => html`<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${pvlFmt(pvlLegsMarkup(rows))}</div>
    <div class="kpi-meta">${pvlLegsShare(rows).toFixed(0)}% of the money</div>
  </div>`)}
</div>`);
```

_Markup over the legs' combined value, ${fmtFreshDate(pvlFrom)} – ${fmtFreshDate(pvlTo)}.
These figures and the next two charts cover that whole window; only the daily chart at the
end follows the date selector above._

_**More legs, bigger markup.** A two-leg ticket is priced almost exactly at its legs. Each
leg added puts a little more on top: about ${pvlFmt(pvlLegsMarkup(pvlAt(10)))} at ten legs
and ${pvlFmt(pvlLegsMarkup(pvlAt(15)))} at fifteen._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)", fontSize: "12px"},
  width, height: 300, marginLeft: 52, marginTop: 28, marginBottom: 42,
  x: {label: "Legs in the parlay", domain: pvlLegs.map(d => d.label), padding: 0.22, tickSize: 0,
      tickFormat: (d, i) => pvlSparseTick(i, pvlLegs.length, width) ? d : ""},
  y: {label: "Paid above the legs' value", grid: true, ticks: 5, tickFormat: pvlAxisFmt},
  marks: [
    Plot.barY(pvlLegs, {x: "label", y: "markup_pct", fill: PVL_COLOR, ry2: 3}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
    pvlBarLabel(pvlLegLabelled, "label"),
    Plot.tip(pvlLegs, Plot.pointerX({x: "label", y: "markup_pct",
      title: d => `${d.label} legs\n`
        + `Legs worth ${pvlCentsTip(d.avg_indep_cents)} · paid ${pvlCentsTip(d.avg_traded_cents)}\n`
        + `Markup ${pvlFmt(d.markup_pct)}\n`
        + `${fmtCount(d.n_trades)} trades · ${fmtUSD(d.stake_usd)} staked`}))
  ]
})
```

_**Longer odds, bigger markup.** The same measure by what the legs are worth together:
${pvlFmt(pvlNearest(50)?.markup_pct)} on a coin-flip ticket, ${pvlFmt(pvlNearest(10)?.markup_pct)}
around 10¢ and ${pvlFmt(pvlNearest(1)?.markup_pct)} around 1¢. The chart stops near 0.2¢:
below that, a parlay trades at a floor price whatever its legs are worth._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)", fontSize: "12px"},
  width, height: 280, marginLeft: 52, marginTop: 28, marginBottom: 42,
  x: {label: "What the legs are worth together", domain: pvlPrice.map(d => d.bucket_num),
      padding: 0.22, tickSize: 0,
      tickFormat: (n, i) => pvlSparseTick(i, pvlPrice.length, width) ? pvlPriceLabel.get(n) : ""},
  y: {label: "Paid above the legs' value", grid: true, ticks: 5, tickFormat: pvlAxisFmt},
  marks: [
    Plot.barY(pvlPrice, {x: "bucket_num", y: "markup_pct", fill: PVL_COLOR, ry2: 3}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
    pvlBarLabel(pvlPriceLabelled, "bucket_num"),
    Plot.tip(pvlPrice, Plot.pointerX({x: "bucket_num", y: "markup_pct",
      title: d => `Legs worth ${pvlCentsTip(d.avg_indep_cents)} together\n`
        + `Paid ${pvlCentsTip(d.avg_traded_cents)} · markup ${pvlFmt(d.markup_pct)}\n`
        + `${fmtCount(d.n_trades)} trades · ${fmtUSD(d.stake_usd)} staked`}))
  ]
})
```

_**Before and after the combo maker fee.** Daily markup, money-weighted across every priced
trade that day — the one chart in this section that follows the date selector above. The
dashed lines are the average on each side of **20 August 2026, when Kalshi started charging
a maker fee on combos**, at double its standard maker rate. It exempted combos built entirely
of independent NFL legs, which trade under their own series; switching to those below is a
sanity check rather than a controlled experiment, because the exempt bucket carries well under
1% of the money and its daily figure is volatile. What does hold up is that the step survives
holding the ticket mix fixed — most of it is a repricing of 2-to-6-leg tickets, not a shift
in what people were buying._

<div class="control-strip">

```js
const pvlFeeChoice = view(Inputs.radio([...PVL_FEE_GROUPS.keys()], {value: "All parlays", label: "Series"}));
```

</div>

```js
// The daily file is one row per date x kind x fee_group; markup is a ratio of sums, so a
// group is dropped by filtering rows and re-dividing — never by averaging its markups.
const pvlFeeRows = PVL_FEE_GROUPS.get(pvlFeeChoice) == null
  ? pvlDays
  : pvlDays.filter(d => d.fee_group === PVL_FEE_GROUPS.get(pvlFeeChoice));
const pvlShownRows = pvlFeeRows.filter(inParlayRange);
const pvlSeries = Array.from(d3.group(pvlShownRows, d => +d.date), ([, g]) => ({
    date: g[0].date, markup_pct: pvlDayMarkup(g),
    stake_usd: d3.sum(g, d => d.stake_usd_above_floor),
    n_trades: d3.sum(g, d => d.n_trades_above_floor),
    leg_coverage_pct: g[0].leg_coverage_pct}))
  .filter(d => d.markup_pct != null)
  .sort((a, b) => a.date - b.date);
// Average on each side of the fee start, over what is on screen (again a ratio of sums).
const pvlSides = [
  {side: "before", rows: pvlShownRows.filter(d => d.date < PVL_COMBO_MAKER_START)},
  {side: "after",  rows: pvlShownRows.filter(d => d.date >= PVL_COMBO_MAKER_START)}
].map(s => ({side: s.side, from: d3.min(s.rows, d => d.date), to: d3.max(s.rows, d => d.date),
             markup: s.rows.length ? pvlDayMarkup(s.rows) : null}))
 .filter(s => s.markup != null);
const pvlFeeInView = pvlSeries.length > 0
  && PVL_COMBO_MAKER_START >= pvlSeries[0].date && PVL_COMBO_MAKER_START <= pvlSeries.at(-1).date;
```

```js
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)", fontSize: "12px"},
  width, height: 300, marginLeft: 52, marginTop: 28,
  x: {type: "utc", label: null},
  y: {label: "Paid above the legs' value", grid: true, ticks: 5, tickFormat: pvlAxisFmt},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
    pvlFeeInView ? Plot.ruleX([PVL_COMBO_MAKER_START], {stroke: "var(--theme-foreground-fainter)", strokeDasharray: "3,3"}) : null,
    pvlFeeInView ? Plot.text([PVL_COMBO_MAKER_START], {x: d => d, frameAnchor: "top", lineAnchor: "top",
      text: () => width < 600 ? "Maker fee starts" : "Combo maker fee starts", textAnchor: "start", dx: 5, dy: 2,
      fontSize: 11, fill: "var(--theme-foreground-muted)",
      stroke: "var(--theme-background)", strokeWidth: 4, paintOrder: "stroke"}) : null,
    Plot.ruleY(pvlSides, {y: "markup", x1: "from", x2: "to",
      stroke: "var(--theme-foreground-muted)", strokeDasharray: "5,4", strokeWidth: 1.5}),
    Plot.line(pvlSeries, {x: "date", y: "markup_pct", stroke: PVL_COLOR, strokeWidth: 2, curve: "monotone-x"}),
    Plot.text(pvlSides, {x: "from", y: "markup", text: d => `Average ${d.side}: ${pvlFmt(d.markup)}`,
      textAnchor: "start", lineAnchor: "bottom", dx: 2, dy: -6, fontSize: 11, fontWeight: 600,
      fill: "var(--theme-foreground)", stroke: "var(--theme-background)", strokeWidth: 4, paintOrder: "stroke"}),
    Plot.ruleX(pvlSeries, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(pvlSeries, Plot.pointerX({x: "date", y: "markup_pct",
      title: d => `${d.date.toISOString().slice(0, 10)}\n`
        + `Markup ${pvlFmt(d.markup_pct)}\n`
        + `${fmtCount(d.n_trades)} priced trades · ${fmtUSD(d.stake_usd)} staked\n`
        + `Legs priced at trade time: ${d.leg_coverage_pct}%`}))
  ]
}))
```

<details class="surface-card compact-details">
  <summary>How this is measured, and what it misses</summary>
  <p><strong>Leg prices are taken at the instant the parlay traded</strong> — the last
  print in that leg's own market at or before the parlay's timestamp. Both trade in the
  same tape, so the two are directly comparable. This is not a detail: pricing the same
  legs at their <em>daily average</em> instead makes parlays look <em>cheaper</em> than
  their own legs, because a leg's daily average absorbs moves that happened after the
  parlay printed, and the error compounds with every leg.</p>
  <p><strong>Checked against other leg prices.</strong> Re-pricing a sample of days with
  each leg's <em>next</em> print after the parlay, or the average of the prints either
  side of it, moves the markup by under half a point up to eight legs and by about two
  points on the longest tickets, nowhere near enough to change the picture.</p>
  <p><strong>The cheapest tickets are left out.</strong> Below about 0.1¢ a parlay's price
  stops following its legs: whether they multiply out to 0.05¢ or a billionth of a cent, it
  trades at around 0.08–0.1¢, the lowest price sellers will quote (Kalshi's own price grid
  goes down to 0.01¢). Measured as a markup, those tickets run to hundreds or thousands of
  percent, which says more about that floor than about the odds. So every figure above leaves
  out tickets whose legs multiply out to less than about 0.13¢. That is
  ${pvlFloorShare.toFixed(1)}% of the money, but ${pvlLongFloorShare.toFixed(0)}% of it on
  tickets of 13 legs or more, where counting them would push the markup far higher.</p>
  <p><strong>A trade counts only if every one of its legs had traded that day</strong>
  before it — ${d3.mean(pvlCovDays, d => d.leg_coverage_pct).toFixed(0)}% of them do. A leg
  priced in an earlier session is deliberately <em>not</em> carried forward: yesterday's
  price is not a quote for today. Separately, we hold the leg list for
  ${d3.mean(pvlCovDays, d => d.legs_known_pct).toFixed(0)}% of parlay trades; the remainder
  are mostly PREPACK/COMBO tickets, whose legs Kalshi does not publish in the feed that
  carries them. And ${pvlPendingShare.toFixed(1)}% of the money that IS priced sits on
  tickets whose correlation class has not been mapped yet, so it is left out of the charts
  above — that backlog normally clears within a day or two.</p>
  <p><strong>Markup is money-weighted</strong>: total paid ÷ total value of the legs
  multiplied together − 1, over the trades in the bar. It is not an average of per-trade
  ratios — a fifteen-leg ticket's legs multiply out to a number so small that individual
  ratios run into the millions and any average of them is meaningless.</p>
  <p><strong>Window.</strong> From June 25, 2026 — the first day our leg snapshot covers
  the tickets that traded, and safely after the June 7 switch to sub-cent price collection,
  before which a cheap parlay's price was rounded to whole cents and this comparison would
  be noise. Prices are yes-side taker trades only, which for parlays is nearly all of the
  flow: they are quoted on request, so the customer is the yes buyer.</p>
</details>

<details class="surface-card compact-details">
  <summary>About this page &amp; method</summary>
  <p><strong>Source.</strong> The parlay market collector — every Kalshi parlay
  market (<code>KXMVE*</code> series) that has traded, from launch (Sep 2025)
  through the latest collected day. ~${fmtCount(anatomySample.parlays)} traded
  parlays, ~${fmtCount(anatomySample.legs)} legs.</p>
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
  <p><strong>"Lottery ticket" parlays.</strong> Qualifies per ticket <em>per
  day</em> (8+ legs and that day's own volume-weighted yes price under 2¢) —
  the same ticket can qualify on one day and not another as its price moves,
  so this is longshot trading activity over time, not a fixed watchlist.
  <strong>Taker stakes</strong> starts June 7, 2026: before that date our own
  price data was rounded to whole cents at collection, which would badly
  understate stakes for exactly this cheapest slice (a true 0.3¢ leg would
  show as an exact $0 stake) — Kalshi's own market has always supported
  sub-cent pricing, this is our data catching up, not a market change.
  <strong>Volume</strong> isn't price-derived so it's shown for the full
  history, and includes contracts on both sides of the market (yes and no)
  plus a small share (~9%) with no attributed taker side, matching how
  "Volume" is defined elsewhere on this page. Because the qualifying-day
  price check itself uses whatever precision was available that day, a small
  number of tickets right at the 2¢ edge in the pre-June-7 volume figures may
  be mis-bucketed by rounding — a minor effect on the edge cases, not the
  same understatement that affects stakes broadly.</p>
</details>
