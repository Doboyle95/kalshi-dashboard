---
title: Calibration
---

# Market Calibration

How accurately do Kalshi contract prices predict outcomes? A perfectly calibrated market has contracts priced at X¢ winning X% of the time.

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Settled contracts are grouped into 5-cent price bins. The x-axis is implied probability from contract price; the y-axis is the realized win rate for contracts in that bin using the trade-weighted outcome rate. Bins below 5 cents and above 95 cents are excluded to keep sparse tails from dominating the visual.</p>
  <p>On the scatter, points above the diagonal mean outcomes happened more often than the price implied; points below mean less often. The error chart shows where that gap is widest by price band.</p>
</details>

```js
const calib = await FileAttachment("data/calibration_three_way.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel} from "./components/freshness.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Calibration sample", value: `${d3.sum(calib, d => +d.n_trades || 0).toLocaleString()} trades`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way.csv"), meta: "Settled binary contracts only", tone: "settlement"},
    {label: "Price bins", value: `${new Set(calib.map(d => d.price_bin)).size}`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way.csv"), meta: "5-cent bins from raw API trades"}
  ],
  note: "Calibration is settlement-dependent. It should be read as an all-history settled-market diagnostic, not a minute-live metric."
}));
display(askPageLink({
  question: "Summarize where Kalshi appears most underpriced or overpriced in the calibration data, with settlement caveats.",
  context: "Calibration page using calibration_three_way.csv."
}));
```

```js
// Defensively show only the market groups actually present in the CSV, so a
// partial producer run can never render an empty chart. R/calibration_three_way.R
// emits all five aggregates (ALL, NON_PARLAY, PARLAY, SPORTS_NON_PARLAY,
// NON_SPORTS) and the deployed CSV currently carries all five.
const calibGroups = Array.from(new Set(calib.map(d => d.group)));
const groupOrder = ["ALL", "NON_PARLAY", "PARLAY", "SPORTS_NON_PARLAY", "NON_SPORTS"];
const availableGroups = groupOrder.filter(g => calibGroups.includes(g));
const group = view(Inputs.select(availableGroups, {
  label: "Market group",
  value: "ALL",
  format: g => ({
    "ALL":               "All markets",
    "SPORTS_NON_PARLAY": "Sports (non-parlay)",
    "NON_SPORTS":        "Non-sports",
    "PARLAY":            "Parlay only",
    "NON_PARLAY":        "All non-parlay (sports + non-sports)"
  })[g] ?? g
}));
```

```js
const data = calib.filter(d => d.group === group && +d.price_bin >= 5 && +d.price_bin <= 95);
```

## Taker-side actual vs. implied win rate

Each point is a price bin (5¢ increments). The diagonal is perfect calibration. Points above the line = contracts underpriced (market overestimates difficulty). Points below = contracts overpriced.

```js
Plot.plot({
  width,
  height: 420,
  x: {label: "Implied probability (contract price)", domain: [0, 1], tickFormat: "%"},
  y: {label: "Actual win rate (trade-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  marks: [
    // Perfect calibration diagonal
    Plot.line([{x:0,y:0},{x:1,y:1}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeDasharray: "4,3", strokeWidth: 1.5
    }),
    // Data points
    Plot.dot(data, {
      x: d => +d.implied_prob,
      y: d => +d.actual_win_rate_wt,
      r: d => Math.sqrt(+d.n_trades / 100000) * 4,
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.7,
      tip: true,
      title: d => `${d.price_bin}¢ contracts\nActual: ${(+d.actual_win_rate_wt*100).toFixed(1)}%\nImplied: ${(+d.implied_prob*100).toFixed(1)}%\nError: ${(+d.calib_error*100).toFixed(2)}%\nTrades: ${(+d.n_trades).toLocaleString()}`
    })
  ]
})
```

<span style="color:#1a9641">● Above diagonal</span> (actual > implied — contracts underpriced) &nbsp; <span style="color:#d7191c">● Below diagonal</span> (actual < implied — contracts overpriced) &nbsp; Circle size ∝ trade count

<div class="instruction-line"><strong>Useful trick:</strong> switch the market group below to <em>Parlay only</em> — long-shot parlay legs are where the mispricing runs widest, since cheap contracts rarely win as often as their price implies.</div>

## Calibration error by price bin

<p class="section-intro">Where the market misses, broken out by price. Bars above zero are underpriced bands; below zero, overpriced.</p>

```js
Plot.plot({
  width,
  height: 320,
  x: {label: "Contract price (¢)", domain: [0, 100]},
  y: {label: "Calibration error (actual − implied)", grid: true, tickFormat: d => (d*100).toFixed(1) + "%"},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.rectY(data, {
      x1: d => +d.price_bin,
      x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.75,
      tip: true,
      title: d => `${d.price_bin}¢\nError: ${(+d.calib_error*100).toFixed(2)}%\nActual: ${(+d.actual_win_rate_wt*100).toFixed(1)}%`
    })
  ]
})
```

```js
// Summary stats
const mae = d3.mean(data, d => Math.abs(+d.calib_error));
const maxPos = data.reduce((best, d) => +d.calib_error > +best.calib_error ? d : best, data[0]);
const maxNeg = data.reduce((worst, d) => +d.calib_error < +worst.calib_error ? d : worst, data[0]);
```

<div style="display:flex;gap:2rem;margin-top:1rem;flex-wrap:wrap">
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Mean absolute error</div>
    <div style="font-size:1.5em;font-weight:700">${(mae*100).toFixed(2)}%</div>
  </div>
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Most underpriced bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#1a9641">${maxPos?.price_bin}¢ (+${(+maxPos?.calib_error*100).toFixed(2)}%)</div>
  </div>
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Most overpriced bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#d7191c">${maxNeg?.price_bin}¢ (${(+maxNeg?.calib_error*100).toFixed(2)}%)</div>
  </div>
</div>

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Trade-weighted win rates using settled taker-side contracts (void filter applied). The price bin is the price paid for the side the taker bought; actual win rate is whether that side won. Parlay markets = KXMVE* and PREPACK* series. Bubble size proportional to trade count.</p>
