---
title: Parlay Anatomy
---

# Parlay Anatomy

How Kalshi parlays are built and priced: the house edge by parlay length, the
rise of multi-leg betting over time, which real games draw the most parlay
money, and whether the implied odds match what actually happens — split by
**same-game (correlated)** vs **multi-game (independent)** tickets.

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
const pnlRaw  = await FileAttachment("data/parlay_pnl_daily_by_corr.csv").csv({typed: true});
const mixRaw  = await FileAttachment("data/parlay_sportsmix_monthly.csv").csv({typed: true});
const popDailyRaw = await FileAttachment("data/parlay_popular_daily.csv").csv({typed: true});
const popMetaRaw  = await FileAttachment("data/parlay_popular_meta.csv").csv({typed: true});
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
    Plot.ruleY([0], {stroke: "#999"}),
    Plot.ruleX(pnlCum, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.18})),
    Plot.tip(pnlCum, Plot.pointer({x: "date", y: "cum_pnl",
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
simply multiplying the individual win probabilities. Kalshi labels correlated
parlays as <em>SGP</em> (same-game parlay); we use <em>correlated</em> /
<em>non-correlated</em> as the editorial framing because Kalshi has launched
new SGP-style series under varying ticker prefixes, and the correlation-based
classification is what determines the pricing math.
</div>

## Mixed and non-sports parlays over time

_Every chart above is dominated by all-sports parlays — they're 99.81% of all parlay volume. The remaining 0.19% (all-non-sports + cross-category mixed) sits below. Mixed parlays only appeared in March 2026, when Kalshi enabled cross-category combos._

```js
const mixMonthly = mixRaw
  .filter(d => d.sportmix !== "all-sports")
  .map(d => ({
    date: d3.utcParse("%Y-%m")(String(d.month)),
    month: String(d.month),
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

## The most popular parlays

_The 30 most-**traded** parlay tickets (by number of trades, not contracts) in the window you pick below. **Avg price** is the volume-weighted yes-side entry price — parlays are longshots, so most sit at a few cents or less (a 1¢ ticket ≈ a 1% implied chance). **Result** is the settled outcome. Covers parlays with ≥100 lifetime trades; recent tickets may still be **pending**._

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
         yn: d3.sum(v, d => d.yes_notional)}),
  d => d.pid);
const popTop = Array.from(popAgg, ([pid, a]) => {
  const m = popMetaById.get(pid) ?? {};
  return {trades: a.trades,
          avg_c: a.yc > 0 ? 100 * a.yn / a.yc : null,
          n_legs: m.n_legs, result: m.result, family: m.family,
          label: String(m.label ?? "").trim(), ticker: String(m.ticker ?? "")};
}).sort((a, b) => b.trades - a.trades).slice(0, 30).map((d, i) => ({...d, rank: i + 1}));
```

```js
const popFmtPrice = c => c == null ? "—" : c >= 1 ? c.toFixed(1) + "¢" : c >= 0.1 ? c.toFixed(2) + "¢" : c.toFixed(3) + "¢";
const popResult = r => r === "hit" ? html`<span style="color:#1a9641;font-weight:600;">✓ hit</span>`
  : r === "miss" ? html`<span style="color:#d7191c;">✗ miss</span>`
  : html`<span style="color:#999;">pending</span>`;
const popLabel = d => {
  let s = d.label;
  if (!s) s = (d.family ? d.family + " · " : "") + d.ticker.split("-").slice(1).join("-");
  return s.length > 90 ? s.slice(0, 90) + "…" : s;
};
const popLegs = d => Number.isFinite(d.n_legs) ? d.n_legs : "—";
```

```js
html`<div style="font-size:13px;color:#666;margin:2px 0 8px;">Top ${popTop.length} of ${popAgg.size.toLocaleString()} parlays traded in range</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead><tr style="text-align:left;border-bottom:2px solid #ccc;">
    <th style="padding:5px 6px;width:26px;">#</th>
    <th style="padding:5px 6px;">Parlay</th>
    <th style="padding:5px 6px;text-align:right;width:46px;">Legs</th>
    <th style="padding:5px 6px;text-align:right;width:66px;">Trades</th>
    <th style="padding:5px 6px;text-align:right;width:74px;">Avg price</th>
    <th style="padding:5px 6px;width:72px;">Result</th>
  </tr></thead>
  <tbody>${popTop.map(d => html`<tr style="border-bottom:1px solid #eee;">
    <td style="padding:5px 6px;color:#999;">${d.rank}</td>
    <td style="padding:5px 6px;" title=${d.label}><span style="display:inline-block;font-size:11px;color:#3b82a0;background:rgba(59,130,160,0.12);border-radius:3px;padding:0 5px;margin-right:6px;white-space:nowrap;">${d.family}</span>${popLabel(d)}</td>
    <td style="padding:5px 6px;text-align:right;">${popLegs(d)}</td>
    <td style="padding:5px 6px;text-align:right;font-variant-numeric:tabular-nums;">${d.trades.toLocaleString()}</td>
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
</details>
