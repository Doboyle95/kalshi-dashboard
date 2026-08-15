---
title: Polymarket Calibration
---

# Polymarket US — Market Calibration

Do Polymarket US contract prices predict outcomes? A perfectly calibrated market has contracts priced at X¢ winning X% of the time. This is the same question the [Kalshi calibration page](/calibration) asks, measured the same way — with one difference that changes every conclusion on the page: **the error bars are clustered on events, not trades.**

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Why event clustering.</strong> Thousands of prints on one football match share a single outcome. They are one observation, not thousands. Treating them as independent understates the standard error here by <strong>26× to 90×</strong>. Every error bar below is a cluster-robust standard error with the underlying contest as the cluster, and <strong>every dot is sized by √(number of events)</strong>, never by trade count. A dot that looks big has many independent outcomes behind it, not merely much traded value.</p>
  <p><strong>Whose price is on the x-axis.</strong> Each Polymarket US symbol is a single binary leg and the daily market report lists only that leg. The x-axis is the traded price of that leg; the y-axis is whether <em>that same leg</em> settled to 1. Time-and-sales carries no aggressor flag, so unlike Kalshi's page — which is taker-side — this is a leg-price curve. The two are not identical constructions and small level differences between the venues should not be over-read.</p>
  <p><strong>Weighting.</strong> Contract-weighted, matching the series the Kalshi page actually plots (<code>actual_win_rate_wt</code> = yes contracts ÷ total contracts) against an implied probability that is the bin midpoint. Trade-count-weighted rates are carried in the CSV for comparison but are not plotted.</p>
  <p><strong>What is excluded.</strong> Markets whose symbol names more than one contract (series tickers where one symbol carries a market per competitor) cannot be attributed to an outcome at all and are dropped, not guessed at. Markets that were delisted before reaching their event are reported as their own band and are never counted as losses. See the attribution table below.</p>
</details>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const calib = await DataAttachment("data/calibration_polymarket.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel} from "./components/freshness.js";
```

```js
const GROUP_LABEL = {
  ALL_DEEP: "All deep products (headline)",
  ALL:      "All products (incl. thin ones — see caveat)",
  AEC:      "Match winner (AEC)",
  ATC:      "Team total / moneyline variants (ATC)",
  ASTATC:   "Player stat over-under (ASTATC)",
  TSC:      "Game total (TSC)",
  ASC:      "Spread (ASC)",
  AADC:     "To advance (AADC) — 32 events only"
};
const present = Array.from(new Set(calib.map(d => d.group)));
const order = ["ALL_DEEP","ALL","AEC","ATC","ASTATC","TSC","ASC","AADC"];
const groups = order.filter(g => present.includes(g)).concat(present.filter(g => !order.includes(g)));
```

```js
const totalTrades = d3.sum(calib.filter(d => d.group === "ALL"), d => +d.n_trades || 0);
const deep = calib.filter(d => d.group === "ALL_DEEP");
const nSig = deep.filter(d => +d.significant === 1).length;
display(freshnessPanel({
  items: [
    {label: "Calibration sample", value: `${totalTrades.toLocaleString()} trades`, updatedAt: fileUpdatedAt(freshness, "calibration_polymarket.csv"), meta: "Resolved binary legs only", tone: "settlement"},
    {label: "Independent events, largest bin", value: `${d3.max(deep, d => +d.n_events).toLocaleString()}`, updatedAt: fileUpdatedAt(freshness, "calibration_polymarket.csv"), meta: "Contests, not trades. Bins share events, so this is the largest single bin — a floor on the real sample size, not a total"},
    {label: "Bins clearing 2 SE", value: `${nSig} of ${deep.length}`, updatedAt: fileUpdatedAt(freshness, "calibration_polymarket.csv"), meta: "Everything else is indistinguishable from calibrated"}
  ],
  note: "Calibration is settlement-dependent: it is an all-history diagnostic over resolved markets, not a live metric."
}));
display(askPageLink({
  question: "Summarize where Polymarket US is measurably mispriced, and say clearly which price bins are NOT statistically distinguishable from perfectly calibrated.",
  context: "Polymarket calibration page using calibration_polymarket.csv, event-clustered standard errors."
}));
```

## The headline, stated honestly

<p class="section-intro">Across the five products with enough independent contests to support a standard error, <strong>only the two cheapest price bins are measurably mispriced.</strong> Contracts below 10¢ are overpriced — they win less often than their price implies — by roughly 0.7 to 2.0 cents. From 10¢ all the way to 100¢, <strong>no bin is distinguishable from perfect calibration</strong> once prints are clustered on the contest they belong to.</p>

<p class="section-intro">There is no smooth favourite–longshot curve in this data. In particular there is <strong>no measurable favourite underpricing</strong> at the top of the book: the 85–95¢ bins read −1.6 and −1.3 cents with standard errors of about 1.5, which is noise.</p>

<p class="chart-note" style="font-size:0.85em">The figures quoted in prose on this page &mdash; the sub-10&cent; band above, the 85&ndash;95&cent; sentence, and the worked example further down &mdash; are from the producer run of <strong>2026-08-08</strong>. Every chart, KPI card and table on the page is read live from the CSV and will move before those sentences do.</p>

```js
const group = view(Inputs.select(groups, {
  label: "Product",
  value: groups.includes("ALL_DEEP") ? "ALL_DEEP" : groups[0],
  format: g => GROUP_LABEL[g] ?? g
}));
```

```js
const data = calib.filter(d => d.group === group);
const sig    = data.filter(d => +d.significant === 1);
const notsig = data.filter(d => +d.significant === 0 && +d.se_reliable === 1);
const unrel  = data.filter(d => +d.se_reliable === 0);
```

## Actual vs. implied win rate

Each point is a 5-cent price bin. The dashed diagonal is perfect calibration. **Vertical bars are ±2 event-clustered standard errors** — a point whose bar crosses the diagonal is not measurably mispriced.

```js
Plot.plot({
  width,
  height: 460,
  x: {label: "Implied probability (leg price)", domain: [0, 1], tickFormat: "%"},
  y: {label: "Actual win rate (contract-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  // Radius must be the SQUARE ROOT of the event count for the legend below to be
  // true. A function-valued r is a channel and Plot pushes it through the r
  // scale, which is itself sqrt by default -- so passing sqrt(n) already taken
  // renders radius proportional to n^0.25 and the "area proportional to events"
  // claim is false. Raw n through an explicit sqrt scale is the correct pairing.
  // Constant r values on the other marks are not channels and are not scaled.
  r: {type: "sqrt", range: [0, 12]},
  marks: [
    Plot.line([{x:0,y:0},{x:1,y:1}], {x:"x", y:"y", stroke:"var(--theme-foreground-fainter)", strokeDasharray:"4,3", strokeWidth:1.5}),
    // ±2 clustered SE
    Plot.ruleX(data, {
      x: d => +d.implied_prob,
      y1: d => +d.actual_win_rate_wt - 2*(+d.se_wt),
      y2: d => +d.actual_win_rate_wt + 2*(+d.se_wt),
      stroke: "#8c9196", strokeWidth: 1.4, strokeOpacity: 0.85
    }),
    // One mark for every bin, sized by independent events. The whiskers above carry the
    // precision; the dot itself no longer encodes whether that precision was enough to
    // exclude zero, because that was reading as a verdict on the bin's validity.
    Plot.dot(data, {
      x: d => +d.implied_prob, y: d => +d.actual_win_rate_wt,
      r: d => +d.n_events,
      fill: "#b2182b", fillOpacity: 0.9,
      stroke: "var(--theme-background)", strokeWidth: 1.4
    }),
    Plot.dot(data, {
      x: d => +d.implied_prob, y: d => +d.actual_win_rate_wt, r: 10, fill: "transparent",
      tip: true,
      title: d => [
        `${d.price_bin}–${+d.price_bin+5}¢`,
        `Implied: ${(+d.implied_prob*100).toFixed(1)}%`,
        `Actual:  ${(+d.actual_win_rate_wt*100).toFixed(1)}%`,
        `Error:   ${(+d.calib_error*100).toFixed(2)}¢ ± ${(2*(+d.se_wt)*100).toFixed(2)} (2 SE)`,
        `Events:  ${(+d.n_events).toLocaleString()}  (effective ${(+d.n_events_eff).toFixed(0)})`,
        `Trades:  ${(+d.n_trades).toLocaleString()}`,
        +d.se_reliable === 0
          ? "TOO FEW INDEPENDENT EVENTS — standard error unreliable"
          : (+d.significant === 1 ? "Error exceeds 2 clustered SE" : "Interval includes zero")
      ].join("\n")
    })
  ]
})
```

<span style="color:#b2182b">● One 5-cent price bin</span> &nbsp; Whiskers are &plusmn;2 event-clustered SE &mdash; a wide interval is an imprecise bin, not an invalid one &nbsp; **Circle area ∝ number of events**, not trades.

## Calibration error, with the honest error bars

<p class="section-intro">Bars are the measured error &mdash; <strong>green where the contract was underpriced, red where it was overpriced</strong>; whiskers are &plusmn;2 event-clustered standard errors. Every bin is drawn the same way: the whiskers say how precisely each one is pinned down, and a bar whose whiskers cross zero is a real measurement with a wide interval, not a discarded one.</p>

```js
Plot.plot({
  width,
  height: 340,
  x: {label: "Contract price (¢)", domain: [0, 100]},
  y: {label: "Calibration error, cents (actual − implied)", grid: true, tickFormat: d => (d*100).toFixed(0)},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.rectY(data, {
      x1: d => +d.price_bin, x2: d => +d.price_bin + 5,
      y: d => +d.calib_error,
      // Colour carries DIRECTION only. Opacity no longer encodes confidence: a bin whose
      // interval crosses zero is still a measurement, and the whiskers already say how
      // wide it is. Fading it implied the reading was invalid, which it is not.
      fill: d => +d.calib_error > 0 ? "#1a9641" : "#d7191c",
      fillOpacity: 0.92,
      stroke: "var(--theme-background)", strokeWidth: 1
    }),
    Plot.ruleX(data, {
      x: d => +d.price_bin + 2.5,
      y1: d => +d.calib_error - 2*(+d.se_wt),
      y2: d => +d.calib_error + 2*(+d.se_wt),
      stroke: "var(--theme-foreground-muted)", strokeWidth: 1.3
    }),
    Plot.dot(data, {
      x: d => +d.price_bin + 2.5, y: d => +d.calib_error, r: 8, fill: "transparent", tip: true,
      title: d => `${d.price_bin}–${+d.price_bin+5}¢\nError: ${(+d.calib_error*100).toFixed(2)}¢\n±2 SE: ${(2*(+d.se_wt)*100).toFixed(2)}¢\nEvents: ${(+d.n_events).toLocaleString()}`
    })
  ]
})
```

## Why the error bars are this wide

<p class="section-intro">This is the whole methodological point. A trade-level standard error treats every print as an independent observation. Below is the ratio of the correct event-clustered standard error to that naive one, per price bin — the factor by which a naive calibration chart would overstate its own confidence.</p>

```js
Plot.plot({
  width,
  height: 260,
  x: {label: "Contract price (¢)", domain: [0, 100]},
  y: {label: "Clustered SE ÷ naive trade-level SE", grid: true, tickFormat: d => d + "×"},
  marks: [
    Plot.ruleY([1], {stroke: "var(--theme-foreground-fainter)", strokeDasharray: "3,3"}),
    Plot.rectY(data, {
      x1: d => +d.price_bin, x2: d => +d.price_bin + 5,
      y: d => +d.se_inflation_vs_naive,
      fill: "#4a5568", fillOpacity: 0.7, tip: true,
      title: d => `${d.price_bin}¢\nClustered SE is ${(+d.se_inflation_vs_naive).toFixed(0)}× the naive one\nTrades: ${(+d.n_trades).toLocaleString()}\nEvents: ${(+d.n_events).toLocaleString()}`
    })
  ]
})
```

<div class="instruction-line"><strong>Worked example.</strong> The <em>to advance</em> product (AADC) carries 3.2 million trades — and exactly <strong>32 contests</strong>. In its 50¢ bin a naive reading gives a −37 cent error with a trade-level standard error of 0.06 cents: a t-statistic near 585, which would look like the most decisive mispricing ever measured on this site. Clustered on events, that bin has <strong>four effective independent observations</strong>. It is marked ✕ above and no claim is made from it. Pooled into an all-products curve it was, on its own, enough to make the 50¢ bin read as "significant" (−3.6¢, t = −2.5); with it removed the same bin reads −1.4¢, t = −1.2, which is nothing. That is why the headline selector defaults to deep products only.</div>

## Contract type is the cut that matters

<p class="section-intro">Resolution quality and calibration both vary far more by product than by month. Player stat over-unders strand in the interior at several times the rate of match-winner contracts.</p>

```js
const byType = calib.filter(d => !["ALL","ALL_DEEP"].includes(d.group));
const typeAgg = Array.from(d3.group(byType, d => d.group), ([g, rows]) => {
  const nc = d3.sum(rows, d => +d.n_contracts);
  return {
    group: g,
    label: GROUP_LABEL[g] ?? g,
    n_trades: d3.sum(rows, d => +d.n_trades),
    n_events: d3.max(rows, d => +d.n_events),
    actual: d3.sum(rows, d => +d.actual_win_rate_wt * +d.n_contracts) / nc,
    implied: d3.sum(rows, d => +d.implied_prob * +d.n_contracts) / nc,
    nsig: rows.filter(d => +d.significant === 1).length,
    nbins: rows.length
  };
}).sort((a, b) => b.n_trades - a.n_trades);
```

```js
Inputs.table(typeAgg, {
  columns: ["label", "n_trades", "n_events", "implied", "actual", "nsig"],
  header: {label: "Product", n_trades: "Trades", n_events: "Events (largest bin)", implied: "Mean implied", actual: "Mean actual", nsig: "Bins clearing 2 SE"},
  format: {
    n_trades: d => d.toLocaleString(),
    n_events: d => d.toLocaleString(),
    implied: d => (d*100).toFixed(1) + "%",
    actual: d => (d*100).toFixed(1) + "%",
    nsig: (d, i) => `${d} of ${typeAgg[i].nbins}`
  },
  width: {label: 260}
})
```

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">
Source: Polymarket US daily market report (settlement) joined to time-and-sales (trades) on Symbol. Contract-weighted win rates over resolved binary legs; implied probability is the bin midpoint; price bins are 5-cent floors in integer cents, matching the Kalshi calibration file. Standard errors are CR1 cluster-robust with the underlying contest as the cluster. "Events" counts distinct contests; "effective events" additionally accounts for how concentrated traded value is across them, and a bin with fewer than 30 effective events is marked as unmeasurable rather than plotted as a finding. Markets whose symbol names more than one contract — series tickers carrying one market per competitor, and league rollup rows — are excluded from attribution entirely (2.1% of trades, 3.0% of traded value) rather than joined to an arbitrary settlement row. In total 89.8% of trades and 89.4% of traded value reach a resolved, unambiguously attributable market.
</p>
