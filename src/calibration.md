---
title: Calibration
---

# Market Calibration

How accurately do Kalshi contract prices predict outcomes? A perfectly calibrated market has contracts priced at X¢ winning X% of the time.

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Settled contracts are grouped into 5-cent price bins. The x-axis is implied probability from contract price; the y-axis is the realized win rate for contracts in that bin using the contract-weighted outcome rate (yes contracts divided by total contracts). Bins below 5 cents and above 95 cents are excluded to keep sparse tails from dominating the visual.</p>
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
    {label: "Calibration sample", value: `${d3.sum(calib.filter(d => d.group === "ALL"), d => +d.n_trades || 0).toLocaleString()} prints`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way.csv"), meta: "Prints — not independent observations; thousands on one event share one outcome", tone: "settlement"},
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
// Event-clustered standard errors and the per-bin event count are new columns.
// Until the producer emits them this page must not pretend to precision it does
// not have, so BOTH the error bars and the significance encoding are switched off
// together rather than degrading to something that merely looks confident.
//
// Which SE goes with which gap matters. se_calib_error_mid is the standard error
// of the MIDPOINT gap -- calib_error, the series this page plots. se_calib_error
// (no suffix) belongs to calib_error_mean, the gap against the contract-weighted
// mean traded price, and pairing it here would understate or overstate the bars.
const hasClustered = calib.some(d => +d.se_calib_error_mid > 0);
const hasEvents = calib.some(d => +d.n_events > 0);

// A bin whose effective (Kish) cluster count is this low has a cluster-robust
// standard error that is not itself trustworthy, so it is drawn as "cannot say"
// rather than as a measurement. Same threshold the cross-venue page applies to
// every competitor: holding Kalshi to a looser bar than Polymarket US or
// ForecastEx would be indefensible.
const MIN_EFF_CLUSTERS = 30;
// FAIL CLOSED. n_effective is not emitted yet, so today this filters nothing.
// The moment the producer starts emitting it, a bin that returns null must count
// as unmeasurable rather than sail through as reliable -- a dropped or renamed
// column is exactly how a guard like this dies silently.
const declaresEff = calib.some(d => d.n_effective !== undefined);

const data = calib
  .filter(d => d.group === group && +d.price_bin >= 5 && +d.price_bin <= 95)
  .map(d => {
    const se = +d.se_calib_error_mid;
    const nEff = (d.n_effective === undefined || d.n_effective === null || d.n_effective === "")
      ? null : +d.n_effective;
    const reliable = !declaresEff || (Number.isFinite(nEff) && nEff >= MIN_EFF_CLUSTERS);
    return {
      ...d,
      se: hasClustered && se > 0 ? se : null,
      n_eff: nEff,
      reliable,
      // A bin only counts as measurably mispriced if its error clears TWO
      // event-clustered standard errors. Prints are not independent -- thousands
      // on one event share a single outcome -- so the trade-level error bar this
      // page used to imply was too narrow by one to two orders of magnitude.
      clears: reliable && hasClustered && se > 0 && Math.abs(+d.calib_error) > 2 * se
    };
  });

// Dot area is proportional to the number of independent EVENTS in the bin, never
// to the trade count: sizing by trades makes the busiest bin look like the most
// certain one, which is the opposite of true. Falls back to a constant radius
// rather than to trade count when the event column has not landed.
const evMax = d3.max(data, d => +d.n_events) || 1;
const dotR = d => hasEvents ? 10 * Math.sqrt((+d.n_events || 0) / evMax) : 5;

const dataClear = data.filter(d => d.clears);
const dataNoise = data.filter(d => !d.clears && d.reliable);
// Third state: too few effective independent events for the bin's own standard
// error to be trustworthy, so no claim is made from it at all, however large its
// error looks. Drawn as a grey cross, never as a dot.
const dataUnmeasurable = data.filter(d => !d.reliable);
```

```js
if (!hasClustered) display(html`<p class="chart-note"><strong>No error bars yet.</strong>
  This page's producer does not yet publish a per-bin event count or an event-clustered
  standard error, so nothing below can be marked as measurably mispriced or not. Read every
  point as a point estimate of unknown precision until it does. The
  <a href="./calibration-venues">cross-venue page</a> shows what the same chart looks like
  with the intervals attached.</p>`);
```

## Taker-side actual vs. implied win rate

Each point is a price bin (5¢ increments). The diagonal is perfect calibration. Points above the line = contracts underpriced (market overestimates difficulty). Points below = contracts overpriced.

```js
Plot.plot({
  width,
  height: 420,
  x: {label: "Implied probability (contract price)", domain: [0, 1], tickFormat: "%"},
  // actual_win_rate_wt is yes_contracts / n_contracts, i.e. CONTRACT-weighted.
  // The label read "trade-weighted" for a long time; the series behind it never was.
  y: {label: "Actual win rate (contract-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  // Radii are computed above and passed through untouched, so the r scale has to
  // be identity: Plot's default r scale is itself sqrt and would square-root the
  // already-square-rooted values.
  r: {type: "identity"},
  marks: [
    // Perfect calibration diagonal
    Plot.line([{x:0,y:0},{x:1,y:1}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeDasharray: "4,3", strokeWidth: 1.5
    }),
    // +/-2 event-clustered SE. Split into two marks rather than one with a variable
    // opacity, because a strokeOpacity channel is pushed through Plot's opacity
    // SCALE and would be silently remapped.
    ...(hasClustered ? [
      Plot.ruleX(dataNoise.concat(dataUnmeasurable), {
        x: d => +d.implied_prob,
        y1: d => Math.max(0, +d.actual_win_rate_wt - 2 * d.se),
        y2: d => Math.min(1, +d.actual_win_rate_wt + 2 * d.se),
        stroke: "var(--theme-foreground-muted)", strokeOpacity: 0.45, strokeWidth: 1.1
      }),
      Plot.ruleX(dataClear, {
        x: d => +d.implied_prob,
        y1: d => Math.max(0, +d.actual_win_rate_wt - 2 * d.se),
        y2: d => Math.min(1, +d.actual_win_rate_wt + 2 * d.se),
        stroke: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
        strokeOpacity: 0.9, strokeWidth: 2.2
      })
    ] : []),
    // Colour still says WHICH WAY the bin misses. Fill says whether the miss is
    // measurable at all: hollow means the error does not clear two clustered
    // standard errors, and must be read as no measurable bias rather than a small
    // one. With no clustered SEs published, nothing is claimed and everything is
    // drawn hollow.
    Plot.dot(dataNoise, {
      x: d => +d.implied_prob,
      y: d => +d.actual_win_rate_wt,
      r: dotR,
      fill: "none",
      stroke: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      strokeWidth: 1.4, strokeOpacity: 0.85
    }),
    Plot.dot(dataClear, {
      x: d => +d.implied_prob,
      y: d => +d.actual_win_rate_wt,
      r: dotR,
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.75,
      stroke: "var(--theme-background)", strokeWidth: 1
    }),
    // Too few effective independent events for the standard error itself to be
    // trustworthy: no claim is made from these bins in either direction.
    Plot.dot(dataUnmeasurable, {
      x: d => +d.implied_prob,
      y: d => +d.actual_win_rate_wt,
      r: 4.5, symbol: "times",
      stroke: "var(--theme-foreground-muted)", strokeWidth: 1.8
    }),
    // Transparent hit area so a small dot stays hoverable.
    Plot.dot(data, {
      x: d => +d.implied_prob,
      y: d => +d.actual_win_rate_wt,
      r: 9, fill: "transparent",
      tip: true,
      title: d => [
        `${d.price_bin}¢ contracts`,
        `Actual: ${(+d.actual_win_rate_wt*100).toFixed(2)}%`,
        `Implied: ${(+d.implied_prob*100).toFixed(1)}%`,
        `Error: ${(+d.calib_error*100).toFixed(2)}¢` + (d.se != null ? ` ± ${(200*d.se).toFixed(2)}¢ (2 event-clustered SE)` : ""),
        d.n_events != null ? `Events: ${(+d.n_events).toLocaleString()}`
          + (d.n_eff != null ? ` (effective ${Math.round(d.n_eff).toLocaleString()})` : "") : null,
        `Trades: ${(+d.n_trades).toLocaleString()} (NOT the sample size)`,
        !d.reliable ? "TOO FEW INDEPENDENT EVENTS — standard error unreliable"
          : d.se == null ? "No clustered standard error published yet"
          : d.clears ? "Clears 2 event-clustered SE"
                     : "NOT distinguishable from perfectly calibrated"
      ].filter(Boolean).join("\n")
    })
  ]
})
```

<span style="color:#1a9641">● Above diagonal</span> (actual > implied — contracts underpriced) &nbsp; <span style="color:#d7191c">● Below diagonal</span> (actual < implied — contracts overpriced) &nbsp; <span style="color:var(--theme-foreground-muted)">○ hollow = does not clear 2 event-clustered SE — no measurable bias</span> &nbsp; <span style="color:var(--theme-foreground-muted)">✕ too few independent events to say</span> &nbsp; Circle area ∝ independent events in the bin

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
    // Solid bar = the miss clears two event-clustered standard errors. Hollow bar
    // = it does not, and its whisker crosses zero, so it is not evidence of
    // mispricing in either direction however tall it looks.
    Plot.rectY(dataClear, {
      x1: d => +d.price_bin,
      x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.8
    }),
    Plot.rectY(dataNoise, {
      x1: d => +d.price_bin,
      x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      fill: hasClustered ? "none" : "var(--theme-foreground-fainter)",
      fillOpacity: hasClustered ? 1 : 0.5,
      stroke: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      strokeOpacity: 0.7, strokeWidth: 1.1
    }),
    // Third state: the standard error itself is untrustworthy here. Dashed grey
    // outline plus a cross, so the bar cannot be read as a finding.
    Plot.rectY(dataUnmeasurable, {
      x1: d => +d.price_bin,
      x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      fill: "none",
      stroke: "var(--theme-foreground-muted)", strokeOpacity: 0.6,
      strokeWidth: 1, strokeDasharray: "3,2"
    }),
    Plot.dot(dataUnmeasurable, {
      x: d => +d.price_bin + 2.5,
      y: d => +d.calib_error,
      r: 4.5, symbol: "times",
      stroke: "var(--theme-foreground-muted)", strokeWidth: 1.8
    }),
    ...(hasClustered ? [Plot.ruleX(data, {
      x: d => +d.price_bin + 2.5,
      y1: d => +d.calib_error - 2 * d.se,
      y2: d => +d.calib_error + 2 * d.se,
      stroke: "var(--theme-foreground)", strokeOpacity: 0.7, strokeWidth: 1.3
    })] : []),
    Plot.dot(data, {
      x: d => +d.price_bin + 2.5,
      y: d => +d.calib_error,
      r: 9, fill: "transparent",
      tip: true,
      title: d => [
        `${d.price_bin}¢`,
        `Error: ${(+d.calib_error*100).toFixed(2)}¢` + (d.se != null ? ` ± ${(200*d.se).toFixed(2)}¢ (2 event-clustered SE)` : ""),
        `Actual: ${(+d.actual_win_rate_wt*100).toFixed(2)}%`,
        d.n_events != null ? `Events: ${(+d.n_events).toLocaleString()}` : null
      ].filter(Boolean).join("\n")
    })
  ]
})
```

```js
// Summary stats. The two extreme-bin cards are drawn from the MEASURABLE bins
// only: the largest raw miss on this page is regularly a bin whose interval
// comfortably covers zero, and headlining it would be the exact false-precision
// failure the error bars exist to prevent. With no clustered SEs published there
// is no measurable subset, so every bin is eligible and the cards say so.
const mae = d3.mean(data, d => Math.abs(+d.calib_error));
const eligible = hasClustered ? dataClear : data;
const maxPos = eligible.length
  ? eligible.reduce((best, d) => +d.calib_error > +best.calib_error ? d : best, eligible[0]) : null;
const maxNeg = eligible.length
  ? eligible.reduce((worst, d) => +d.calib_error < +worst.calib_error ? d : worst, eligible[0]) : null;
const extremeQualifier = hasClustered
  ? `${dataClear.length} of ${data.length} bins clear 2 SE`
  : "no clustered standard errors published yet";
```

<div style="display:flex;gap:2rem;margin-top:1rem;flex-wrap:wrap">
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Mean absolute error</div>
    <div style="font-size:1.5em;font-weight:700">${(mae*100).toFixed(2)}%</div>
  </div>
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Most underpriced measurable bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#1a9641">${maxPos && +maxPos.calib_error > 0 ? `${maxPos.price_bin}¢ (+${(+maxPos.calib_error*100).toFixed(2)}¢)` : "none"}</div>
    <div style="font-size:0.75em;color:var(--theme-foreground-muted)">${extremeQualifier}</div>
  </div>
  <div style="background:var(--theme-background-alt);border:1px solid var(--card-border, var(--theme-foreground-faint));border-radius:8px;padding:0.8rem 1.2rem">
    <div style="font-size:0.78em;color:var(--theme-foreground-muted);text-transform:uppercase">Most overpriced measurable bin</div>
    <div style="font-size:1.5em;font-weight:700;color:#d7191c">${maxNeg && +maxNeg.calib_error < 0 ? `${maxNeg.price_bin}¢ (${(+maxNeg.calib_error*100).toFixed(2)}¢)` : "none"}</div>
    <div style="font-size:0.75em;color:var(--theme-foreground-muted)">${extremeQualifier}</div>
  </div>
</div>

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Contract-weighted win rates using settled taker-side contracts (void filter applied) &mdash; <code>yes_contracts / n_contracts</code>, which is what this chart has always plotted whatever the axis said. The price bin is the price paid for the side the taker bought and the actual win rate is whether that side won; implied probability is the bin midpoint, so the half-cent by which the average traded price sits below that midpoint is booked here as mispricing. Parlay markets = KXMVE* and PREPACK* series. <strong>Bubble area on this page is <em>not</em> yet event-scaled: this producer publishes no per-bin event count, so every dot is drawn at a constant radius and no error bars are shown (see the note above the chart). The competitor pages, whose producers do publish event counts, scale bubble area by independent settlement events rather than trade count</strong>, and the error bars are cluster-robust with the event as the cluster: thousands of prints on one event share one outcome, so they are one observation, and a trade-level interval would be one to two orders of magnitude too narrow. See the <a href="./calibration-venues">cross-venue page</a> for the same measurement at Polymarket US, ForecastEx and DKeX.</p>
