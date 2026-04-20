---
title: Calibration
---

# Market Calibration

How accurately do Kalshi contract prices predict outcomes? A perfectly calibrated market has contracts priced at X¢ winning X% of the time.

```js
const calib = await FileAttachment("data/calibration_three_way.csv").csv({typed: true});
```

```js
const group = view(Inputs.select(["ALL", "SPORTS_NON_PARLAY", "NON_SPORTS", "PARLAY", "NON_PARLAY"], {
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

## Actual vs. implied win rate

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
      stroke: "#ccc", strokeDasharray: "4,3", strokeWidth: 1.5
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
    }),
    Plot.ruleX(data, Plot.pointerX({x: d => +d.implied_prob, stroke: "currentColor", strokeOpacity: 0.25})),
    Plot.ruleY(data, Plot.pointerX({y: d => +d.actual_win_rate_wt, stroke: "currentColor", strokeOpacity: 0.25}))
  ]
})
```

<span style="color:#1a9641">● Above diagonal</span> (actual > implied — contracts underpriced) &nbsp; <span style="color:#d7191c">● Below diagonal</span> (actual < implied — contracts overpriced) &nbsp; Circle size ∝ trade count

## Calibration error by price bin

```js
Plot.plot({
  width,
  height: 320,
  x: {label: "Contract price (¢)", domain: [0, 100]},
  y: {label: "Calibration error (actual − implied)", grid: true, tickFormat: d => (d*100).toFixed(1) + "%"},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.rectY(data, {
      x1: d => +d.price_bin - 2.5,
      x2: d => +d.price_bin + 2.5,
      y: d => +d.calib_error,
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.75,
      tip: true,
      title: d => `${d.price_bin}¢\nError: ${(+d.calib_error*100).toFixed(2)}%\nActual: ${(+d.actual_win_rate_wt*100).toFixed(1)}%`
    }),
    Plot.ruleX(data, Plot.pointerX({x: d => +d.price_bin, stroke: "currentColor", strokeOpacity: 0.25}))
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
  <div style="background:#f8f8f8;border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:#666;text-transform:uppercase">Mean absolute error</div>
    <div style="font-size:1.5em;font-weight:700">${(mae*100).toFixed(2)}%</div>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:#666;text-transform:uppercase">Most underpriced bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#1a9641">${maxPos?.price_bin}¢ (+${(+maxPos?.calib_error*100).toFixed(2)}%)</div>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:#666;text-transform:uppercase">Most overpriced bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#d7191c">${maxNeg?.price_bin}¢ (${(+maxNeg?.calib_error*100).toFixed(2)}%)</div>
  </div>
</div>

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Trade-weighted win rates using settled contracts (void filter applied). Data covers Kalshi's full history through April 2026. Parlay markets = KXMVE* and PREPACK* series. Bubble size proportional to trade count.</p>
