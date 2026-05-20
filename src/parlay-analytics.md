---
title: Parlay Anatomy
---

# Parlay Anatomy

How Kalshi parlays are built and priced: the house edge by parlay length, the
rise of multi-leg betting over time, which real games draw the most parlay
money, and whether the implied odds match what actually happens — split by
**same-game (correlated)** vs **multi-game (independent)** tickets.

<div class="surface-card" style="border-left:4px solid #1a9641;background:rgba(26,150,65,0.06);padding:12px 16px;margin:14px 0;">
<strong>Verified 2026-05-19.</strong> Source: parlay market collector
(~15M traded parlays, ~100M legs); combined classifier with locked rules
(Option X game-key, league-winner pooling, per-competition granularity,
crypto pooled, award shows each their own). Numbers reconciled against the
source parquet by an independent recompute — PASS for all seven CSVs
(see <code>output/parlay_analytics_verification_report.md</code>).
The same-game / multi-game classifier was hand-audited on a stratified
worksheet of 154 parlays.
</div>

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => "$" + fmtCount(n);
const pct1     = n => (n == null ? "n/a" : n.toFixed(1) + "%");
```

```js
const heRaw   = await FileAttachment("data/parlay_house_edge_by_legs.csv").csv({typed: true});
const timeRaw = await FileAttachment("data/parlay_legs_over_time.csv").csv({typed: true});
const gamesRaw= await FileAttachment("data/parlay_top_games_by_volume.csv").csv({typed: true});
const mispRaw = await FileAttachment("data/parlay_mispricing_by_correlation.csv").csv({typed: true});
```

```js
const KIND_DOMAIN = ["multi-game(independent)", "same-game(correlated)"];
const KIND_COLORS = ["#5b8def", "#e4572e"];
const kindShort = k => k.startsWith("same") ? "Same-game (correlated)" : "Multi-game (independent)";

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
      title: d => `${d.legsLabel}-leg · ${kindShort(d.kind)}\nHouse edge: ${pct1(d.house_edge)}\nWin rate: ${pct1(d.win_rate)}\nParlays: ${d.n_parlays.toLocaleString()}\nVolume: ${fmtUSD(d.total_vol)}`})),
    Plot.ruleY([0], {stroke: "#ccc"})
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
    Plot.ruleY([0], {stroke: "#ccc"})
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

## The rise of multi-leg betting

_Monthly parlay volume — from a standing start in late 2025 to billions per month._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 72,
  x: {type: "utc", label: null},
  y: {label: "Monthly parlay volume", grid: true, tickFormat: d => "$" + (d>=1e9 ? (d/1e9).toFixed(1)+"B" : (d/1e6).toFixed(0)+"M")},
  marks: [
    Plot.rectY(tline, {x: "date", interval: d3.utcMonth, y: "total_vol", fill: "#f4a736",
      tip: true, title: d => `${d.month}\nVolume: ${fmtUSD(d.total_vol)}\nParlays: ${d.n_parlays.toLocaleString()}\nMean legs: ${d.mean_legs}\nMedian legs: ${d.median_legs}`}),
    Plot.ruleY([0])
  ]
})
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
Plot.plot({
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
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 560, marginLeft: 150,
  x: {label: "Parlay volume touching game", grid: true, tickFormat: d => "$" + (d>=1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null, domain: games.map(d=>d.label)},
  marks: [
    Plot.barX(games, {x: "parlay_vol", y: "label", fill: "#3b82a0",
      tip: true, title: d => `${d.label}\n(${d.game_key})\nParlay volume: ${fmtUSD(d.parlay_vol)}\nParlays touching: ${d.n_parlays.toLocaleString()}`}),
    Plot.ruleX([0])
  ]
})
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
    Plot.line([[0,0],[100,100]], {stroke: "#999", strokeDasharray: "4 4"}),
    Plot.dot(misp, {x: "implied", y: "actual", fill: "kind", r: d => Math.sqrt(d.n_parlays)/120 + 4, fillOpacity: 0.75, stroke: "white",
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
  <p><strong>Status.</strong> Preliminary and unverified — see the banner at
  the top. Numbers may shift after verification and unit confirmation.</p>
</details>
