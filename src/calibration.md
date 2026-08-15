---
title: Calibration
---

# Market Calibration

How accurately do Kalshi contract prices predict outcomes? A perfectly calibrated market has contracts priced at X¢ winning X% of the time.

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Settled contracts are grouped into 5-cent price bins. The x-axis is implied probability from contract price; the y-axis is the realized win rate for contracts in that bin using the contract-weighted outcome rate (yes contracts divided by total contracts). Bins below 5 cents and above 95 cents are excluded to keep sparse tails from dominating the visual.</p>
  <p>On the scatter, points above the diagonal mean outcomes happened more often than the price implied; points below mean less often. The error chart shows where that gap is widest by price band.</p>
  <p><strong>Read the error bars, not the dots.</strong> Every interval is clustered on the underlying event ticker, because thousands of prints on one event share a single outcome and are therefore one observation, not thousands. Dot area is proportional to the independent events behind a bin, never to its trade count &mdash; sizing by trades would make the busiest bin look like the most certain one, which is backwards. Hollow dots are bins that do not clear two clustered standard errors: read them as <em>no measurable bias</em>, never as a small one.</p>
</details>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calibCurve = await DataAttachment("data/calibration_three_way.csv").csv({typed: true});
// The event-clustered standard errors and per-bin independent-event counts ship in
// their own file, keyed (group, price_bin) exactly like the curve. Two files rather
// than one wider one because they have two producers: R/calibration_three_way.R writes
// the curve, python/kalshi_calibration_clusters.py writes this, sequenced immediately
// after it in the same weekly flow (refresh_calibration_clusters runs wait_for=[calib])
// so the pair always describes one date set.
const calibClusters = await DataAttachment("data/calibration_three_way_clusters.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel} from "./components/freshness.js";

// JOIN, by name and only the five decoration columns. A blanket spread would drag the
// sidecar's *_chk reconciliation columns across too, and n_trades_chk /
// actual_win_rate_chk are one rename away from shadowing the curve's own published
// n_trades / actual_win_rate_wt / calib_error, which must stay the curve's.
//
// A bin with no match keeps se_calib_error_mid and n_effective UNDEFINED, so the
// fail-closed guard below reads it as unmeasurable and draws it as a cross rather than
// as a finding. That is the right direction to fail: a bin whose standard error did not
// arrive has not been shown to be calibrated OR mispriced.
const clusterByBin = new Map(calibClusters.map(d => [`${d.group}|${d.price_bin}`, d]));
const calib = calibCurve.map(d => {
  const c = clusterByBin.get(`${d.group}|${d.price_bin}`);
  return c == null ? d : {
    ...d,
    n_events: c.n_events,
    n_effective: c.n_effective,
    se_calib_error_mid: c.se_calib_error_mid,
    se_calib_error: c.se_calib_error,
    calib_error_mean: c.calib_error_mean
  };
});
// Counted, not assumed: if the curve and the sidecar ever rebuild against different
// bin sets this is the number that says so, and it is surfaced on the page below.
const calibUnjoined = calib.filter(d => d.se_calib_error_mid === undefined).length;
```

```js
display(freshnessPanel({
  items: [
    {label: "Calibration sample", value: `${d3.sum(calib.filter(d => d.group === "ALL"), d => +d.n_trades || 0).toLocaleString()} prints`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way.csv"), meta: "Prints — not independent observations; thousands on one event share one outcome", tone: "settlement"},
    {label: "Price bins", value: `${new Set(calib.map(d => d.price_bin)).size}`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way.csv"), meta: "5-cent bins from raw API trades"},
    // Dated against the SIDECAR, not the curve: the two are separate files on separate
    // producers, and this is the one that decides whether the page has error bars at all.
    {label: "Independent events", value: `${d3.sum(calib.filter(d => d.group === "ALL"), d => +d.n_events || 0).toLocaleString()} settlements`, updatedAt: fileUpdatedAt(freshness, "calibration_three_way_clusters.csv"), meta: "The actual sample size — one event ticker is one observation, however many prints it carried", tone: "settlement"}
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
// These banners are fail-closed notices, not roadmap notices: the clustered standard
// errors ship, so neither should ever render. The first fires if the sidecar cannot be
// read at all, the second if it loads but no longer agrees with the curve about which
// price bins exist -- the silent-divergence case that a plain exists() check waves through.
if (!hasClustered) display(html`<p class="chart-note"><strong>Error bars unavailable.</strong>
  <code>calibration_three_way_clusters.csv</code> did not load, so no bin below can be marked
  measurably mispriced or not, and every point is a point estimate of unknown precision.
  This is a data-plumbing failure, not a property of the market.</p>`);
else if (calibUnjoined > 0) display(html`<p class="chart-note"><strong>${calibUnjoined} of
  ${calib.length} bins carry no clustered standard error.</strong> The calibration curve and its
  clustered-error sidecar disagree about which price bins exist, which is what happens when one
  rebuilds without the other. Those bins are drawn as &#10005; and nothing is claimed from them.</p>`);
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
        // Order matters. An unjoined bin has BOTH se == null and reliable == false, and
        // calling that "too few independent events" would assert a measurement of the
        // sample that was never taken. Missing-measurement is reported first.
        d.se == null ? "NO CLUSTERED STANDARD ERROR for this bin — nothing claimed"
          : !d.reliable ? "TOO FEW INDEPENDENT EVENTS — standard error unreliable"
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
      // SOLID, same sign colour as a measurable bin, at reduced opacity. Hollow read as a
      // gap in the data rather than as a weaker finding, which is the opposite of the point.
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.42,
      stroke: "var(--theme-background)", strokeWidth: 1
    }),
    // Third state: the standard error itself is untrustworthy here. Dashed grey
    // outline plus a cross, so the bar cannot be read as a finding.
    Plot.rectY(dataUnmeasurable, {
      x1: d => +d.price_bin,
      x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      // Third state kept visually distinct, but SOLID: a neutral grey that belongs to no
      // sign, so it cannot be read as a direction. The cross below still marks it.
      fill: "var(--theme-foreground-muted)", fillOpacity: 0.28,
      stroke: "var(--theme-foreground-muted)", strokeOpacity: 0.55, strokeWidth: 1
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
// The nominal -> effective (Kish) event collapse, computed live rather than quoted.
// It is the single number that explains why every bar on this page is as wide as it is,
// and a hardcoded version of it would stop reproducing the first week the corpus grows.
const effCollapse = d3.median(
  data.filter(d => d.n_eff > 0 && +d.n_events > 0),
  d => +d.n_events / d.n_eff
);
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

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Contract-weighted win rates using settled taker-side contracts (void filter applied) &mdash; <code>yes_contracts / n_contracts</code>, which is what this chart has always plotted whatever the axis said. The price bin is the price paid for the side the taker bought and the actual win rate is whether that side won; implied probability is the bin midpoint, so the half-cent by which the average traded price sits below that midpoint is booked here as mispricing. Parlay markets = KXMVE* and PREPACK* series. <strong>Bubble area is proportional to the independent settlement events behind a bin, never to its trade count</strong>, and the error bars are cluster-robust with the Kalshi event ticker as the cluster: thousands of prints on one event share one outcome, so they are one observation, and a trade-level interval would be one to two orders of magnitude too narrow. On the bins drawn here the nominal event count collapses to an effective (Kish) count by a median factor of about ${effCollapse ? Math.round(effCollapse).toLocaleString() : "\u2014"}&times;, because contract weighting concentrates a bin on its busiest events &mdash; that collapse, not the print count, is what sets the width of every bar above. A bin whose effective count falls below ${MIN_EFF_CLUSTERS} is drawn as &#10005; and claims nothing in either direction. See the <a href="./calibration-venues">cross-venue page</a> for the same measurement at Polymarket US, ForecastEx and DKeX.</p>
