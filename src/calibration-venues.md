---
title: Cross-Venue Calibration
---

# Do these markets predict outcomes?

<p class="page-lead">A perfectly calibrated market prices a contract at X&cent; when it wins X% of the time. <a href="./calibration">Kalshi's own calibration page</a> asks that question of Kalshi. This page asks it of every venue whose data can answer it, on one shared axis &mdash; and, more importantly, shows how much of each answer is real.</p>

<div class="instruction-line"><strong>Read the error bars, not the dots.</strong> Thousands of prints on one ball game share a single outcome, so a game is <em>one</em> observation, not thousands. Every interval here is clustered on the event; treating prints as independent would shrink these bars by tens of times and manufacture significance the sample does not contain. <strong>Hollow dots and pale bars are bins that do not clear two clustered standard errors. Read them as &ldquo;no measurable bias&rdquo;, never as a small one.</strong></div>

<details class="surface-card compact-details">
  <summary>About this page &mdash; read before quoting any number</summary>
  <p><strong>Weighting: contract-weighted, everywhere.</strong> Of every contract bought near 25&cent;, what share paid out. This is the series Kalshi's own calibration page plots (<code>yes_contracts / n_contracts</code>) and it is the only weighting for which all four venues publish a matching event-clustered standard error, so it is the only one on which a cross-venue comparison is defined. The ForecastEx producer leads with the <em>trade</em>-weighted series measured against the mean traded price instead, and on that venue the two conventions disagree by several cents and in sign in a number of bins, so the ForecastEx curve here will not match figures quoted from its own file. The divergence is counted from the file, with the bins driving it, above the favourite&ndash;longshot table below. It is a weighting difference, not a disagreement about the data.</p>
  <p><strong>Implied probability is the bin midpoint</strong> at every venue, not the average price actually paid, because Polymarket US publishes no traded-price sum &mdash; its <code>sum_price</code> column is derived from the midpoint &mdash; so a mean-price axis is not available for all four venues and the midpoint is the only shared choice. That is not free. Contracts trade a little below their bin midpoint: on Kalshi the contract-weighted mean price sits about 0.47&cent; below it across bins and 1.27&cent; below it in the cheapest bin, and this convention books that gap as mispricing rather than as a binning artefact. On the one-month Kalshi fixture this page was built against it accounted for <strong>0.94&cent; of a &minus;2.17&cent; longshot reading, about 43% of it</strong>; the direction survived on a mean-price axis (&minus;1.23&cent;, still clearing) but the level did not. Those Kalshi figures come from that fixture rather than from Kalshi's live history, and no Kalshi curve is drawn here. The convention is applied identically to everyone, so the <em>comparison</em> is clean even though the level carries that bias.</p>
  <p><strong>Whose price.</strong> A binary has two legs and the venues do not all bin the same one. Kalshi bins the <strong>taker's</strong> own side. DKeX and Polymarket US publish one price per print against a symbol naming a specific leg, and neither publishes an aggressor flag, so those are <strong>leg</strong>-price curves. ForecastEx matches a YES buyer against a NO buyer with no taker flag at all, so it is the <strong>YES leg</strong> and its NO-leg curve is the mirror. Small level differences between venues should not be over-read.</p>
  <p><strong>Significance is recomputed here, not copied.</strong> All four producers publish a significance flag and they do not all mean the same thing &mdash; Kalshi's is computed against mean price, ForecastEx's against its trade-weighted series. This page ignores all four and applies one rule to every bin: <em>does the contract-weighted error exceed twice its own event-clustered standard error</em>. Nothing else counts as measurable.</p>
  <p><strong>Twenty bins per venue is twenty tests.</strong> About one bin in twenty crosses two standard errors by chance alone, so a single isolated solid dot is not evidence. The counts below are there to be read against that expectation, and the crossings that survive a Bonferroni correction at twenty bins per venue (|t| &ge; 2.96) are counted under the panels below &mdash; computed from the venues actually drawn, not asserted here.</p>
  <p><strong>Dot area is proportional to the number of independent events</strong> in the bin, never to trade count. The scale is set separately for each venue, because an &ldquo;event&rdquo; is not the same object at every venue &mdash; a Kalshi event ticker, a DKeX ball game, a Polymarket contest, a ForecastEx city-day settlement. Compare dot sizes <em>within</em> a venue, never across them.</p>
</details>

```js
import {createRemoteFileAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteFileAttachment(FileAttachment, d3);
display(DataAttachment.marker);
// Each venue publishes its own calibration file with its own schema. They are
// loaded separately and normalised below rather than merged upstream, so a
// producer change at one venue cannot silently reshape another venue's series.
//
// ORDERING NOTE for whoever adds the next venue: Observable fails the BUILD on a
// missing FileAttachment, so a venue's CSV has to exist in src/data before its
// line appears here. Every file below is already read by that venue's own page.
const calKalshi     = await DataAttachment("data/calibration_three_way.csv", FileAttachment("data/calibration_three_way.csv")).csv({typed: true});
const calDkex       = await DataAttachment("data/dkex_calibration.csv", FileAttachment("data/dkex_calibration.csv")).csv({typed: true});
const calPolymarket = await DataAttachment("data/calibration_polymarket.csv", FileAttachment("data/calibration_polymarket.csv")).csv({typed: true});
const calForecastex = await DataAttachment("data/forecastex_calibration.csv", FileAttachment("data/forecastex_calibration.csv")).csv({typed: true});
const freshness     = await DataAttachment("data/freshness_manifest.json", FileAttachment("data/freshness_manifest.json")).json();
import {askPageLink, fileUpdatedAt, freshnessPanel} from "./components/freshness.js";
```

```js
// d3.autoType turns a missing column into undefined and an empty cell into null,
// and `+null` is 0 -- which would draw a column that has not been backfilled yet
// as a real zero. Same helper competitors.md uses. null means "no number".
const num = v => (v == null || v === "" || Number.isNaN(+v)) ? null : +v;

// A bin whose effective (Kish) cluster count is this low has a cluster-robust
// standard error that is not itself trustworthy, so it is drawn as "cannot say"
// rather than as a measurement. Conventional rule of thumb, and the same
// threshold the Polymarket producer applies in its own se_reliable column.
const MIN_EFF_CLUSTERS = 30;

const fmtCents = c => (c >= 0 ? "+" : "") + c.toFixed(2) + "¢";
const fmtInt = n => (n == null || Number.isNaN(n)) ? "n/a" : Math.round(n).toLocaleString();
```

```js
// Sample choice. "Everything each venue reports" is not a cosmetic toggle, it is
// the demonstration: Polymarket US and ForecastEx each have a venue-wide series
// dominated by one thin product, and switching to it should visibly blow the
// error bars out rather than quietly change the story.
const sample = view(Inputs.radio(["headline", "reported"], {
  label: "Sample",
  value: "headline",
  format: k => k === "headline"
    ? "Measurable series (default)"
    : "Everything each venue reports"
}));
```

```js
// ---------------------------------------------------------------------------
// VENUE REGISTRY
//
// Each entry turns one venue's rows into the SAME shape:
//   {price_bin, implied, actual, err, se, n_events, n_eff, n_trades, n_contracts}
// where every field is CONTRACT-weighted and `implied` is the bin MIDPOINT.
// Everything venue-specific lives in `rows`; nothing after this block knows
// which venue it is looking at.
//
// Colours and names are competitors.md's, so a venue looks the same on both pages.
// ---------------------------------------------------------------------------
const VENUES = [
  {
    name: "Kalshi", color: "#00C2A8", accent: "kalshi", src: calKalshi,
    file: "calibration_three_way.csv",
    leg: "taker's own side",
    // Effective-cluster column, read centrally. null means the venue
    // publishes none at all; a NAME here is a promise that is enforced.
    effCol: "n_effective",
    // ALL is the venue-wide series. The parlay and sports splits live on
    // /calibration and are deliberately not offered here.
    groups: {headline: "ALL", reported: "ALL"},
    // se_calib_error_mid is the event-clustered SE of the MIDPOINT gap, which is
    // the gap this page plots. se_calib_error (no suffix) belongs to the
    // mean-price gap and would be the wrong pairing. Both columns are absent
    // until the clustered-SE producer change lands, hence num() -- until then
    // Kalshi has no error bars and is held back rather than drawn without them.
    rows: r => ({
      price_bin: +r.price_bin,
      implied: num(r.implied_prob),
      actual: num(r.actual_win_rate_wt),
      err: num(r.calib_error),
      se: num(r.se_calib_error_mid),
      n_events: num(r.n_events),
      n_trades: num(r.n_trades),
      n_contracts: num(r.n_contracts)
    })
  },
  {
    name: "Polymarket US", color: "#3B7DD8", accent: "polymarket", src: calPolymarket,
    file: "calibration_polymarket.csv",
    leg: "leg named by the symbol",
    // Effective-cluster column, read centrally. null means the venue
    // publishes none at all; a NAME here is a promise that is enforced.
    effCol: "n_events_eff",
    // ALL_DEEP is the producer's headline: products with >=1,000 distinct events
    // only. Pooled ALL lets "to advance" -- 3.2M trades on 32 World Cup matches --
    // swing the 50c bin from -1.4c (nothing) to -3.6c ("significant").
    groups: {headline: "ALL_DEEP", reported: "ALL"},
    rows: r => ({
      price_bin: +r.price_bin,
      implied: num(r.implied_prob),
      actual: num(r.actual_win_rate_wt),
      err: num(r.calib_error),
      se: num(r.se_wt),
      n_events: num(r.n_events),
      n_trades: num(r.n_trades),
      n_contracts: num(r.n_contracts)
    })
  },
  {
    name: "ForecastEx", color: "#E53535", accent: "forecastex", src: calForecastex,
    file: "forecastex_calibration.csv",
    leg: "YES leg",
    // Effective-cluster column, read centrally. null means the venue
    // publishes none at all; a NAME here is a promise that is enforced.
    effCol: "g_eff",
    // ALL is 19.2% one event -- the two mirror legs of the 2024 US election carry
    // 1.19M prints and ONE outcome between them -- which collapses the effective
    // cluster count in the middle bins to single digits. ALL_EX_ELECTION is the
    // venue-wide series that can actually carry a standard error.
    groups: {headline: "ALL_EX_ELECTION", reported: "ALL"},
    // The one venue needing conversion. Its producer leads TRADE-weighted and
    // measures the gap against the MEAN traded price, so neither its calib_error
    // nor its implied_prob can be used as published. Both are rebuilt here from
    // the contract-weighted win rate against the bin midpoint, and the SE comes
    // from se_event_cents_qty -- the contract-weighted event-clustered one, in
    // CENTS. Pairing a mean-price SE with a midpoint gap is an approximation;
    // measured on Kalshi, where both are published, the two differ by under 6%.
    rows: r => {
      const implied = (+r.price_bin + 2.5) / 100;
      const actual = num(r.actual_win_rate_wt);
      const seCents = num(r.se_event_cents_qty);
      return {
        price_bin: +r.price_bin,
        implied,
        actual,
        err: actual == null ? null : actual - implied,
        se: seCents == null ? null : seCents / 100,
        n_events: num(r.n_events),
        n_trades: num(r.n_trades),
        n_contracts: num(r.n_contracts)
      };
    }
  },
  {
    name: "DKeX", color: "#F97316", accent: "dkex", src: calDkex,
    file: "dkex_calibration.csv",
    leg: "leg named by the symbol",
    // Effective-cluster column, read centrally. null means the venue
    // publishes none at all; a NAME here is a promise that is enforced.
    effCol: null,
    groups: {headline: "ALL", reported: "ALL"},
    // DKeX ships BOTH 10c deciles and 5c bins in one file, tagged by bin_width.
    // Only the 5c rows share Kalshi's axis, so the decile rows are dropped here;
    // /dkex offers both. A file without the column at all is treated as 5c.
    binFilter: r => num(r.bin_width) == null || +r.bin_width === 5,
    rows: r => ({
      price_bin: +r.price_bin,
      implied: num(r.implied_prob),
      actual: num(r.actual_win_rate_wt),
      err: num(r.calib_error),
      se: num(r.se_clustered),
      n_events: num(r.n_events),
      n_trades: num(r.n_trades),
      n_contracts: num(r.n_contracts)
    })
  }
];

// Venues that cannot answer the question, named with the reason. A venue that
// silently drops out of a comparison reads as "fine" rather than "not measured",
// which is the failure this page exists to avoid -- the same rule the effective
// fee-rate chart on /competitors follows.
//
// Rothera was measured and ruled out on the result. The other three fail earlier
// than that: the question needs a traded price per print AND a settled outcome
// per contract, and the feeds collected for them do not carry both. Columns
// re-checked against the live files on 2026-08-07.
const OMITTED = [
  ["Rothera (Robinhood)", "measured and ruled out on the sample, not on the inputs. Its settlements are clean and a daily-price proxy is accurate to within about half a cent, but only 71 independent events sit behind its trade tape: 70 baseball games and one inflation release. Its World Cup, roughly 92% of all-time volume, settled before the tape begins on 2026-07-27, and everything earlier is permanently unavailable. The comparable DKeX measurement rests on 424–654 independent games per decile; Rothera offers 22–51 effective events per 5-cent bin, an order of magnitude short, with its one large block being a single tournament."],
  ["Underdog Exchange", "the trade tape does carry a price on every print, but the market file's status column has exactly one value, \"Finalized\", and no win/loss field appears anywhere in the feed, so there is no outcome to score those prices against. The collection window is also only 40 days."],
  ["Crypto.com/Nadex", "what is collected is a daily bulletin: one volume number per market description, with no traded price and no settlement."],
  ["CME (FanDuel + DraftKings)", "hand-collected daily bulletins carrying call, put and total volume only, with no trade prices and no per-contract settlements."]
];
```

```js
// ---------------------------------------------------------------------------
// NORMALISE + GUARD
//
// Three failure modes are handled separately, because they mean different things:
//   1. the venue's file carries no rows we can read       -> venue deferred
//   2. it has rows but no event-clustered standard error  -> venue deferred
//   3. one bin's effective cluster count is too low       -> that bin unmeasurable
// (1) and (2) remove the venue from every chart and put it in a named list.
// Drawing a venue with no error bars alongside venues that have them would be
// exactly the false-precision failure this page exists to prevent.
// ---------------------------------------------------------------------------
const built = VENUES.map(v => {
  const raw = (v.src ?? []).filter(v.binFilter ?? (() => true));
  const present = new Set(raw.map(d => d.group));
  const wanted = v.groups[sample];
  // Fall back through the venue's preferred group, then the venue-wide ALL, then
  // whatever the file does carry, so a renamed group degrades to a labelled
  // substitution rather than an empty panel.
  const group = present.has(wanted) ? wanted
              : present.has(v.groups.headline) ? v.groups.headline
              : present.has("ALL") ? "ALL"
              : (raw[0]?.group ?? null);

  const rows = (group == null ? [] : raw.filter(d => d.group === group))
    // n_eff comes from the registry's effCol, never from the per-venue accessor,
    // so that a renamed or dropped column trips the fail-closed guard below
    // instead of reading as "this venue publishes no effective count".
    .map(r => ({...v.rows(r), n_eff: v.effCol == null ? null : num(r[v.effCol])}))
    .filter(r => Number.isFinite(r.price_bin) && r.price_bin >= 0 && r.price_bin <= 95
                 && r.implied != null && r.actual != null && r.err != null)
    .map(r => {
      const hasSe = r.se != null && r.se > 0 && Number.isFinite(r.se);
      // FAIL CLOSED. A DKeX-shaped file declares no effective-cluster column at
      // all (effCol null) and is not punished for shipping fewer diagnostics than
      // its neighbours. But a venue that DECLARES one and then returns null --
      // a dropped or renamed column -- must NOT sail through as reliable.
      // Measured on ForecastEx ALL: with g_eff present, 7 bins are unreliable;
      // with g_eff absent every bin reads reliable, including the bins where one
      // election is a single effective cluster.
      const reliable = hasSe && (v.effCol == null
        ? true
        : (r.n_eff != null && Number.isFinite(r.n_eff) && r.n_eff >= MIN_EFF_CLUSTERS));
      return {
        ...r,
        venue: v.name, color: v.color,
        hasSe, reliable,
        clears: reliable && Math.abs(r.err) > 2 * r.se,
        // The standard error a chart treating every print as independent would
        // have drawn: the binomial error over prints at this bin's win rate.
        // Computed the same way for all four venues rather than read from four
        // differently-defined "naive SE" columns.
        seNaive: r.n_trades > 0
          ? Math.sqrt(Math.max(r.actual * (1 - r.actual), 1e-12) / r.n_trades)
          : null
      };
    })
    .sort((a, b) => a.price_bin - b.price_bin);

  const usable = rows.length > 0 && rows.some(d => d.hasSe);
  const reason = rows.length === 0
    ? "its calibration file has not landed yet"
    : "its calibration file carries no event-clustered standard error yet, so its bins cannot be marked measurable or not";
  return {...v, group, groupFellBack: group !== wanted, rows, usable, reason};
});

const ready    = built.filter(v => v.usable);
const deferred = built.filter(v => !v.usable);
const readyNames = ready.map(v => v.name);
```

```js
display(freshnessPanel({
  items: ready.map(v => ({
    label: v.name,
    value: `${v.rows.length} price bins`,
    updatedAt: fileUpdatedAt(freshness, v.file),
    meta: `${fmtInt(d3.max(v.rows, d => d.n_events))} events in the largest bin · x-axis is the ${v.leg}`,
    tone: v.name === "Kalshi" ? undefined : "competitor"
  })),
  note: "Calibration is settlement-dependent: an all-history diagnostic over settled markets, not a live metric. Each venue's file rebuilds on its own cadence, so two venues here are not necessarily measured to the same date."
}));
display(askPageLink({
  question: "Across the prediction-market venues, which price bands are measurably mispriced once standard errors are clustered on events, and which are NOT distinguishable from perfectly calibrated? Say plainly where the answer is that nothing is measurable.",
  context: "Cross-venue calibration page: contract-weighted win rates, bin-midpoint implied probability, event-clustered standard errors."
}));
```

```js
// Name what is absent, and why. Two lists, because they are different claims: a
// venue that cannot support the measurement at all, and a venue whose producer
// has simply not shipped the clustered standard errors yet.
display(html`<div class="chart-note">
  <p><strong>Not on this page.</strong> ${OMITTED.map(([n, why]) => html`<span><strong>${n}</strong> &mdash; ${why} </span>`)}</p>
  ${deferred.length ? html`<p><strong>Waiting on its pipeline:</strong>
    ${deferred.map(v => html`<span><strong>${v.name}</strong> &mdash; ${v.reason}. </span>`)}
    A venue is held back rather than drawn without error bars, because a curve with no
    intervals sitting next to curves that have them reads as the most confident line on
    the chart.</p>` : ""}
  ${built.filter(v => v.usable && v.groupFellBack).length ? html`<p><strong>Substituted series:</strong>
    ${built.filter(v => v.usable && v.groupFellBack).map(v => html`<span>${v.name} is drawn on <code>${v.group}</code>, not the requested group. </span>`)}</p>` : ""}
</div>`);
```

<div class="control-strip">

```js
const venueSel = view(Inputs.checkbox(readyNames, {label: "Venues", value: readyNames}));
```

</div>

```js
const shown = ready.filter(v => venueSel.includes(v.name));
const rowsAll = shown.flatMap(v => {
  // Dot area is proportional to the number of independent events IN THIS VENUE.
  // The scale constant is per venue on purpose: Kalshi counts event tickers in
  // the millions while DKeX counts ball games in the hundreds, so one shared
  // scale would render every DKeX bin at a fraction of a pixel AND imply the two
  // counts are the same kind of thing. Within a venue the radius stays exactly
  // proportional to sqrt(n_events) -- the property that matters. It must never be
  // sqrt(n_trades), which is what makes a busy bin look precise.
  const evMax = d3.max(v.rows, d => d.n_events) || 1;
  return v.rows.map(d => ({...d, radius: 10 * Math.sqrt((d.n_events ?? 0) / evMax)}));
});
const domainNames  = shown.map(v => v.name);
const domainColors = shown.map(v => v.color);

const clearRows  = rowsAll.filter(d => d.clears);
const noiseRows  = rowsAll.filter(d => !d.clears && d.reliable);
const unmeasRows = rowsAll.filter(d => !d.reliable);

function tipText(d) {
  return [
    `${d.venue} — ${d.price_bin}–${d.price_bin + 5}¢`,
    `Actual ${(100 * d.actual).toFixed(2)}%  vs implied ${(100 * d.implied).toFixed(1)}%`,
    `Error ${fmtCents(100 * d.err)} ± ${(200 * d.se).toFixed(2)}¢ (2 event-clustered SE)`,
    `Events ${fmtInt(d.n_events)}${d.n_eff != null ? ` · effective ${fmtInt(d.n_eff)}` : ""}`,
    `Prints ${fmtInt(d.n_trades)} · contracts ${fmtInt(d.n_contracts)} (NOT the sample size)`,
    !d.reliable ? "TOO FEW INDEPENDENT EVENTS — standard error unreliable"
      : d.clears ? "Clears 2 event-clustered SE"
                 : "NOT distinguishable from perfectly calibrated"
  ].join("\n");
}
```

## Actual vs. implied win rate

<p class="section-intro">Each dot is one 5-cent price bin at one venue. The dashed diagonal is perfect calibration. Vertical bars are &plusmn;2 event-clustered standard errors &mdash; a bar that reaches the diagonal is a bin with no measurable bias. There are deliberately <strong>no connecting lines</strong>: a line through these points would assert a smooth curve that none of these samples supports.</p>

```js
shown.length === 0 ? html`<p class="chart-note">No venue selected.</p>` : Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 470,
  marginLeft: 62,
  marginRight: 16,
  x: {label: "Implied probability (bin midpoint)", domain: [0, 1], tickFormat: "%", grid: true},
  y: {label: "Actual win rate (contract-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  // Radii are computed above and passed through untouched. An identity scale is
  // required: Plot's default r scale is itself sqrt, which would square-root the
  // already-square-rooted values.
  r: {type: "identity"},
  color: {legend: true, domain: domainNames, range: domainColors},
  marks: [
    Plot.line([{x: 0, y: 0}, {x: 1, y: 1}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeDasharray: "4,3", strokeWidth: 1.5
    }),
    // +/-2 event-clustered SE, split into two marks rather than one mark with a
    // variable opacity: a strokeOpacity channel would be pushed through Plot's
    // opacity SCALE and silently remapped.
    Plot.ruleX(noiseRows.concat(unmeasRows), {
      x: "implied",
      y1: d => Math.max(0, d.actual - 2 * d.se),
      y2: d => Math.min(1, d.actual + 2 * d.se),
      stroke: "venue", strokeOpacity: 0.3, strokeWidth: 1.1, strokeLinecap: "round"
    }),
    Plot.ruleX(clearRows, {
      x: "implied",
      y1: d => Math.max(0, d.actual - 2 * d.se),
      y2: d => Math.min(1, d.actual + 2 * d.se),
      stroke: "venue", strokeOpacity: 0.95, strokeWidth: 2.2, strokeLinecap: "round"
    }),
    // NOT distinguishable from calibrated: hollow.
    Plot.dot(noiseRows, {
      x: "implied", y: "actual", r: "radius",
      fill: "none", stroke: "venue", strokeWidth: 1.3, strokeOpacity: 0.85
    }),
    // Clears 2 clustered SE: solid.
    Plot.dot(clearRows, {
      x: "implied", y: "actual", r: "radius",
      fill: "venue", fillOpacity: 0.85, stroke: "var(--theme-background)", strokeWidth: 1
    }),
    // Standard error itself untrustworthy (too few effective clusters).
    Plot.dot(unmeasRows, {
      x: "implied", y: "actual", r: 4.5, symbol: "times",
      stroke: "var(--theme-foreground-muted)", strokeWidth: 1.8
    }),
    // Transparent hit area, so a small dot is still hoverable.
    Plot.dot(rowsAll, {
      x: "implied", y: "actual", r: 9, fill: "transparent",
      tip: true, title: tipText
    })
  ]
})
```

<span style="font-weight:600">&#9679; Clears 2 event-clustered SE</span> &nbsp; <span style="color:var(--theme-foreground-muted)">&#9675; Not distinguishable from calibrated</span> &nbsp; <span style="color:var(--theme-foreground-muted)">&#10005; Too few independent events to say</span> &nbsp; Bars are &plusmn;2 event-clustered SE &nbsp; Dot area &prop; events in the bin, scaled within each venue.

## Calibration error by price bin

<p class="section-intro">The same numbers as a signed miss, in cents, one panel per venue on a shared axis. This is the chart that shows where a venue is and is not mispriced. A bin whose whisker crosses zero is not evidence of mispricing in either direction, whichever way its dot happens to lean.</p>

```js
{
  if (shown.length === 0) {
    display(html`<p class="chart-note">No venue selected.</p>`);
  } else {
    const span = d3.max(rowsAll, d => Math.abs(100 * d.err) + 200 * d.se) ?? 5;
    const lim = Math.max(5, Math.ceil(span));
    // Per-panel caption. The "expected by chance" figure is not decoration: at 20
    // bins one crossing IS the null result, so a count of 1 or 2 is not a finding.
    const caps = shown.map(v => {
      const rs = rowsAll.filter(d => d.venue === v.name);
      const k = rs.filter(d => d.clears).length;
      const infl = d3.median(rs, d => (d.seNaive > 0 ? d.se / d.seNaive : null));
      return {
        venue: v.name,
        text: `${v.name} · ${v.group} — ${k} of ${rs.length} bins clear 2 clustered SE`
              + ` (about 1 in 20 crosses by chance)`
              + (infl ? ` · clustering widens the bar ${infl.toFixed(0)}×` : "")
      };
    });

    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width,
      height: 40 + 170 * shown.length,
      marginLeft: 62,
      marginRight: 16,
      marginTop: 10,
      x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
      y: {label: "Calibration error, actual − implied (¢)", domain: [-lim, lim], grid: true},
      fy: {label: null, domain: domainNames},
      color: {domain: domainNames, range: domainColors},
      marks: [
        Plot.frame({stroke: "var(--theme-foreground-fainter)"}),
        Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeOpacity: 0.55, strokeWidth: 1}),
        Plot.ruleX(noiseRows.concat(unmeasRows), {
          fy: "venue",
          x: d => d.price_bin + 2.5,
          y1: d => 100 * d.err - 200 * d.se,
          y2: d => 100 * d.err + 200 * d.se,
          stroke: "venue", strokeOpacity: 0.32, strokeWidth: 1.1, strokeLinecap: "round"
        }),
        Plot.ruleX(clearRows, {
          fy: "venue",
          x: d => d.price_bin + 2.5,
          y1: d => 100 * d.err - 200 * d.se,
          y2: d => 100 * d.err + 200 * d.se,
          stroke: "venue", strokeOpacity: 0.95, strokeWidth: 2.2, strokeLinecap: "round"
        }),
        Plot.dot(noiseRows, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 3.6, fill: "none", stroke: "venue", strokeWidth: 1.3
        }),
        Plot.dot(clearRows, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 4.2, fill: "venue", stroke: "var(--theme-background)", strokeWidth: 1
        }),
        Plot.dot(unmeasRows, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 4.5, symbol: "times", stroke: "var(--theme-foreground-muted)", strokeWidth: 1.8
        }),
        Plot.text(caps, {
          fy: "venue", text: "text", frameAnchor: "top-left",
          dx: 6, dy: 8, fontSize: 11, fill: "currentColor", fillOpacity: 0.75
        }),
        Plot.dot(rowsAll, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 8, fill: "transparent", tip: true, title: tipText
        })
      ]
    }));
  }
}
```

```js
// C1 -- multiplicity, counted from the venues actually drawn rather than
// asserted. Twenty bins per venue is twenty tests, so a crossing count has to be
// read against a correction, not against zero. Bonferroni at 20 bins two-sided
// is |t| >= 2.96. Deriving it means the number cannot rot when a corpus grows:
// an earlier hardcoded count was already wrong by the time it was reviewed.
if (shown.length === 0) display(html`<p class="chart-note">No venue selected.</p>`);
else {
  const BONF_T = 2.96;
  const tOf = d => Math.abs(d.err) / d.se;
  const cross = rowsAll.filter(d => d.clears);
  const survive = cross.filter(d => tOf(d) >= BONF_T);
  const per = shown.map(v => {
    const rs = rowsAll.filter(d => d.venue === v.name && d.reliable);
    return {
      name: v.name,
      c: rs.filter(d => d.clears).length,
      s: rs.filter(d => d.clears && tOf(d) >= BONF_T).length,
      maxT: d3.max(rs, tOf)
    };
  });
  display(html`<p class="chart-note"><strong>Multiplicity.</strong> Twenty bins per venue is twenty tests, and
    about one bin in twenty crosses two standard errors by chance alone, so a single isolated solid dot is not
    evidence. Under a Bonferroni correction at twenty bins per venue (|t| &ge; ${BONF_T}),
    <strong>${survive.length} of the ${cross.length} crossing${cross.length === 1 ? "" : "s"} drawn above
    survive</strong>. Per venue: ${per.map(p => html`<span>${p.name} ${p.s} of ${p.c}${
      p.c > 0 && p.s === 0 && p.maxT ? html` (largest |t| ${p.maxT.toFixed(2)})` : ""}; </span>`)}
    Counted live from the venues currently selected.</p>`);
}
```

## Favourite&ndash;longshot summary

<p class="section-intro">The one-number version, and the reason most of it is blank. Longshots are every bin under 30&cent;, favourites every bin from 70&cent; up, each averaged over contracts. <strong>A venue gets a headline number only when the tail clears two standard errors.</strong> Where it does not, the interval is shown and no number is claimed.</p>

```js
// C8 -- ForecastEx is the one venue whose producer leads with a different
// weighting, so the divergence is published with numbers rather than as a
// category. Counted live for whichever group is drawn: a fixed "N of 20" is
// exactly the kind of figure that stops reproducing when the corpus grows.
{
  const fx = shown.find(v => v.name === "ForecastEx");
  if (fx) {
    const pair = calForecastex
      .filter(d => d.group === fx.group)
      .map(d => {
        const mid = (+d.price_bin + 2.5) / 100;
        const aw = num(d.actual_win_rate_wt);
        return {
          bin: +d.price_bin,
          qty: aw == null ? null : 100 * (aw - mid),   // contract-weighted vs bin midpoint
          trd: num(d.calib_error) == null ? null : 100 * num(d.calib_error), // producer: trade-weighted vs mean price
          seQ: num(d.se_event_cents_qty),
          seT: num(d.se_event_cents)
        };
      })
      .filter(d => d.qty != null && d.trd != null);
    const flips = pair.filter(d => d.qty * d.trd < 0).length;
    const at = b => pair.find(d => d.bin === b);
    const t = (e, se) => (se > 0 ? `|t| = ${Math.abs(e / se).toFixed(2)}` : "no estimable t");
    const lo = at(5), hi = at(90);
    display(html`<p class="chart-note"><strong>ForecastEx appears here contract-weighted, matching every other
      venue.</strong> Its producer leads with the <em>trade</em>-weighted series measured against the mean traded
      price, and on <code>${fx.group}</code> the two conventions disagree <strong>in sign in ${flips} of
      ${pair.length} bins</strong>.${lo ? html` The 5&cent; bin reads ${fmtCents(lo.qty)} (${t(lo.qty, lo.seQ)})
      contract-weighted against ${fmtCents(lo.trd)} (${t(lo.trd, lo.seT)}) trade-weighted.` : ""}${hi ? html`
      The 90&cent; bin reads ${fmtCents(hi.qty)} against ${fmtCents(hi.trd)}.` : ""} Read the ForecastEx longshot
      cell below on its producer's own convention and there is no measurable longshot effect at all. This is a
      weighting difference, not a disagreement about the data.</p>`);
  }
}
```

```js
if (shown.length === 0) display(html`<p class="chart-note">No venue selected.</p>`);
else {
  // Bins SHARE events -- one ball game contributes prints to many bins -- so the
  // per-bin clustered standard errors are NOT independent and must not be pooled
  // in quadrature. What is valid whatever the correlation between bins is the
  // triangle inequality: the standard deviation of a weighted average is at most
  // the same weighted average of the standard deviations. That upper bound is
  // what is used here, so a tail that clears really clears. It is conservative by
  // construction, which is the correct direction to be wrong in.
  const tailStat = (rs, pred) => {
    const sel = rs.filter(d => pred(d.price_bin) && d.reliable && d.n_contracts > 0);
    const w = d3.sum(sel, d => d.n_contracts);
    if (!sel.length || !(w > 0)) return null;
    const err = 100 * d3.sum(sel, d => d.err * d.n_contracts) / w;
    const se  = 100 * d3.sum(sel, d => d.se  * d.n_contracts) / w;
    return {err, se, bins: sel.length, clears: Math.abs(err) > 2 * se};
  };

  const cell = t => t == null
    ? html`<span style="color:var(--theme-foreground-muted)">not measurable</span>`
    : t.clears
      ? html`<strong style="font-size:1.05em">${fmtCents(t.err)}</strong><span
             style="color:var(--theme-foreground-muted)"> &plusmn;${(2 * t.se).toFixed(2)}&cent;</span>`
      : html`<span style="color:var(--theme-foreground-muted)">no measurable bias <span
             style="opacity:0.7">(${fmtCents(t.err)} &plusmn;${(2 * t.se).toFixed(2)}&cent;)</span></span>`;

  const rowsFor = shown.map(v => {
    const rs = rowsAll.filter(d => d.venue === v.name);
    const lo = tailStat(rs, b => b < 30);
    const hi = tailStat(rs, b => b >= 70);
    // Difference of two averages: the same triangle-inequality bound applies, so
    // the conservative standard error of the spread is the SUM of the two.
    const spread = (lo && hi)
      ? {err: hi.err - lo.err, se: hi.se + lo.se,
         clears: Math.abs(hi.err - lo.err) > 2 * (hi.se + lo.se)}
      : null;
    return {v, lo, hi, spread};
  });

  display(html`<table style="width:100%;border-collapse:collapse;font-size:0.92em">
    <thead><tr style="text-align:left;border-bottom:1px solid var(--theme-foreground-faint)">
      <th style="padding:0.45rem 0.6rem 0.45rem 0">Venue</th>
      <th style="padding:0.45rem 0.6rem">Longshots &lt; 30&cent;</th>
      <th style="padding:0.45rem 0.6rem">Favourites &ge; 70&cent;</th>
      <th style="padding:0.45rem 0.6rem">Favourite &minus; longshot</th>
    </tr></thead>
    <tbody>${rowsFor.map(({v, lo, hi, spread}) => html`<tr style="border-bottom:1px solid var(--theme-foreground-faint)">
      <td style="padding:0.45rem 0.6rem 0.45rem 0"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${v.color};margin-right:6px"></span>${v.name}</td>
      <td style="padding:0.45rem 0.6rem">${cell(lo)}</td>
      <td style="padding:0.45rem 0.6rem">${cell(hi)}</td>
      <td style="padding:0.45rem 0.6rem">${cell(spread)}</td>
    </tr>`)}</tbody>
  </table>`);

  const withBias = rowsFor.filter(r => r.spread && r.spread.clears);
  display(html`<p class="chart-note">${withBias.length === 0
    ? html`<strong>No venue on this page shows a favourite&ndash;longshot bias this sample can measure.</strong>
           The textbook pattern &mdash; longshots dear, favourites cheap &mdash; is not established at either end
           of the book, at any venue, once prints are clustered on the events they belong to. The point
           estimates lean various ways; none of them clears its own interval.`
    : html`Measurable at ${withBias.map(r => r.v.name).join(", ")}. Every other venue's tails sit inside their
           own intervals and get no number. These intervals are deliberately the widest defensible ones:
           because bins share events, the standard errors are combined by the bound that holds under any
           correlation rather than the one that assumes none.`}</p>`);
}
```

## Why the intervals are this wide

<p class="section-intro">The methodological point, per venue. A trade-level standard error treats every print as an independent observation. The multiplier below is how much wider the honest interval is than that &mdash; equivalently, the factor by which a naive calibration chart overstates its own confidence.</p>

```js
if (shown.length === 0) display(html`<p class="chart-note">No venue selected.</p>`);
else {
  const cards = shown.map(v => {
    const rs = rowsAll.filter(d => d.venue === v.name);
    const withEff = rs.filter(d => d.n_eff != null);
    return {
      v,
      infl: d3.median(rs, d => (d.seNaive > 0 ? d.se / d.seNaive : null)),
      events: d3.max(rs, d => d.n_events),
      eff: withEff.length ? d3.min(withEff, d => d.n_eff) : null,
      trades: d3.sum(rs, d => d.n_trades || 0),
      clears: rs.filter(d => d.clears).length,
      bins: rs.length
    };
  });
  display(html`<div class="kpi-grid">${cards.map(c => html`<div class="kpi-card" data-accent="${c.v.accent}">
    <div class="kpi-label">${c.v.name}</div>
    <div class="kpi-value">${c.infl ? c.infl.toFixed(0) + "×" : "—"}</div>
    <div class="kpi-meta">wider than a trade-level error bar &middot; ${c.clears} of ${c.bins} bins clear 2 SE</div>
    <div class="kpi-meta">${fmtInt(c.events)} events in the largest bin${c.eff != null ? `, effective floor ${fmtInt(c.eff)}` : ""} &middot; ${fmtInt(c.trades)} prints</div>
  </div>`)}</div>`);
}
```

<div class="instruction-line"><strong>Effective events, where a venue publishes them, are the number to believe.</strong> Contract weighting concentrates a bin's weight on its busiest games, so a bin holding tens of thousands of nominal events can carry the independent information of a few hundred. Where that effective count falls below ${MIN_EFF_CLUSTERS} the bin is drawn as &#10005; and no claim is made from it, however large its error looks.</div>

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Contract-weighted win rates over settled binary contracts, binned in 5-cent floors on an integer-cent axis so every venue shares one x-axis. Implied probability is the bin midpoint. Standard errors are cluster-robust with the underlying event as the cluster &mdash; a Kalshi event ticker, a DKeX game or race, a Polymarket contest, a ForecastEx settlement event &mdash; computed by each venue's own producer and re-tested here against one common rule. Voids and refunded events are excluded by each producer before binning, because a refunded event has no outcome, and the size of that exclusion is worth stating. DKeX drops 3,941 void prints, 1,366 pro-rated partials and 557 prints on markets that had not settled &mdash; 0.43% of its tape as of 2026-08-07 &mdash; and scoring those voids as wins instead moved its 10&ndash;20&cent; band from &minus;0.67&cent; to +4.01&cent;. Polymarket US reaches a resolved, unambiguously attributable market on 89.8% of prints and 89.4% of traded value: 2.11% is dropped because the symbol names more than one contract, and the 1.46% delisted before maturity is reported as its own band rather than counted as losses. ForecastEx counts a contract as settled only where its mark on or after expiry is exactly 0.00 or 1.00 &mdash; 168,912 of 203,776 expired contracts &mdash; which removes whole crypto and metals families but touches only 3.5% of the weather book. The naive comparison figure is the binomial error over prints at each bin's win rate, computed identically for every venue rather than read from four differently-defined columns. Traded value and per-side fee comparisons live on the <a href="./competitors">Platform Comparison</a> page; this page uses no fee number at all.</p>
