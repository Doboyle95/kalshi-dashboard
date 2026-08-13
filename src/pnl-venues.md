---
title: Cross-Venue P&L
---

# What did the bettors actually make?

<p class="page-lead">A calibration curve says a market is mispriced. It does not say how much that cost anyone. This page multiplies the gap by the contracts standing behind it, at every venue whose data can answer, on one shared axis &mdash; and keeps the two questions apart that are easiest to conflate: <strong>what these bettors realised</strong>, which is arithmetic, and <strong>what a bettor should expect</strong>, which needs far more data than some of these venues have.</p>

<div class="instruction-line"><strong>Per contract, not percent.</strong> A loss expressed as a share of stake flatters cheap contracts: the same 2&cent; is 2% of a 100&cent; favourite and 20% of a 10&cent; longshot. Every headline here is <strong>cents per contract</strong>, which is comparable across venues and across price. Percent-of-stake is in the table for anyone who wants it.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);

// One file backs this page. build_competitor_pnl.py derives the per-venue series from each
// venue's calibration file and folds in build_polymarket_parlay.py's rows, which come from
// the raw tape instead. The parlay detail file is loaded separately for the disclosure
// numbers (resolved share, effective sample size, interval) that the shared schema drops.
const pnl = await DataAttachment("data/competitor_pnl_by_bin.csv").csv({typed: true});
const parlayDetail = await DataAttachment("data/polymarket_parlay_pnl.csv").csv({typed: true});
const parlayDaily = await DataAttachment("data/polymarket_parlay_daily.csv").csv({typed: true});
```

```js
// Colour follows the venue, everywhere on this site and never the rank, so a filter that
// drops a venue cannot repaint the survivors.
const VENUE_COLOR = {
  "Kalshi": "#00C2A8",
  "Polymarket US": "#3B7DD8",
  "ForecastEx": "#E53535",
  "DKeX": "#F97316"
};

// How each row was priced. This is the single most important thing to disclose, because
// only one of these is exact and the differences are worth real cents.
const BASIS_NOTE = {
  exact_contract_weighted: "exact — the venue publishes a contract-weighted sum of prices paid",
  bin_midpoint: "approximate — priced at the 5¢ bin midpoint, because the venue publishes no contract-weighted price sum",
  venue_price_range_midpoint: "approximate — priced at the midpoint of the venue's own daily traded range"
};

// Whose side of the trade the number describes. Getting this wrong has had to be corrected
// twice on this dashboard, so it is carried on the row rather than inferred in a caption.
const LEG_NOTE = {
  taker: "the aggressor who crossed the spread",
  named: "whoever bought the leg the venue names — NOT necessarily the taker"
};

const GROUP_LABEL = {
  ALL: "All markets",
  PARLAY: "Parlays",
  NON_PARLAY: "Single markets",
  ALL_DEEP: "All markets",
  ALL_EX_ELECTION: "All markets (ex-election)"
};

const fmtCents = d => `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(2)}¢`;
const fmtUSD = d => {
  const a = Math.abs(d);
  const s = d < 0 ? "−$" : "+$";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}bn`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}k`;
  return `${s}${a.toFixed(0)}`;
};
const fmtCount = d => d >= 1e9 ? `${(d / 1e9).toFixed(2)}bn` : d >= 1e6 ? `${(d / 1e6).toFixed(1)}M` : d3.format(",.0f")(d);
```

```js
// Roll the per-bin rows up to one row per venue+group. Everything below reads this.
const rolled = Array.from(
  d3.group(pnl, d => `${d.venue}||${d.group}`),
  ([key, rows]) => {
    const [venue, group] = key.split("||");
    const contracts = d3.sum(rows, d => d.contracts);
    const total = d3.sum(rows, d => d.pnl);
    const stake = d3.sum(rows, d => d.contracts * d.price_paid);
    return {
      venue, group,
      label: `${venue} · ${GROUP_LABEL[group] ?? group}`,
      leg: rows[0].leg,
      basis: rows[0].basis,
      contracts, pnl: total, stake,
      // "" means the venue publishes no directly comparable clustered SE -- unknown, which
      // is not the same as measurable. 0 means it does publish one and NOTHING clears it.
      measurable: rows[0].measurable,
      binsClearing: rows[0].bins_clearing_2se,
      binsTested: rows[0].bins_tested,
      perContract: total / contracts,
      pctOfStake: stake ? 100 * total / stake : null,
      bins: rows.length
    };
  }
).sort((a, b) => a.perContract - b.perContract);

// Kalshi publishes ALL as well as its two halves; showing all three double-counts the
// same contracts in one bar chart, so the aggregate is held out of the comparison and
// reported on its own below.
const headline = rolled.filter(d => !(d.venue === "Kalshi" && d.group === "ALL"));
const kalshiAll = rolled.find(d => d.venue === "Kalshi" && d.group === "ALL");
const parlayRows = rolled.filter(d => d.group === "PARLAY");
const detail0 = parlayDetail[0] ?? {};
```

<div class="instruction-line" style="border-left-color:#3B7DD8">
<strong>Two venues price parlays, and they agree.</strong> Kalshi's parlay bettors lose <strong>${fmtCents(parlayRows.find(d => d.venue === "Kalshi")?.perContract ?? 0)}</strong> per contract; Polymarket US's lose <strong>${fmtCents(parlayRows.find(d => d.venue === "Polymarket US")?.perContract ?? 0)}</strong>. Separate venues, separate pipelines, separate settlement sources &mdash; and the same answer to within a fraction of a cent. That agreement is the strongest evidence on this page that the method is measuring what it claims to.
</div>

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Realised, not expected.</strong> Every figure here is what happened: contracts bought, stake paid, payout received, difference taken. That is arithmetic and needs no significance test, which is why nothing on this page is suppressed for having a small sample. It is also why no figure here may be read as an <em>edge</em> without checking how much data stands behind it. Polymarket's parlay series is the sharp case: it is <strong>${(+detail0.pct_resolved || 0).toFixed(0)}% resolved</strong> across a product that launched on 2026-08-06, with an effective sample size of <strong>${(+detail0.eff_n || 0).toFixed(1)}</strong> and a 95% interval of <strong>${(+detail0.ci_lo_pct || 0).toFixed(0)}% to ${(+detail0.ci_hi_pct || 0).toFixed(0)}%</strong> of stake. Those bettors really did lose that money. Nobody should conclude from six days what parlays cost on Polymarket in general.</p>
  <p><strong>Whose P&amp;L.</strong> Kalshi is the only venue publishing an aggressor flag, so it is the only venue whose single-market number is <em>true taker</em> P&amp;L. DKeX, Polymarket US and ForecastEx publish one price per print against a symbol naming a leg, with no flag, so theirs is the P&amp;L of whoever bought <em>that leg</em> — labelled <code>named</code> and never called taker. <strong>Parlays are the exception:</strong> they are priced by request-for-quote, so the customer lifts a quote the venue makes and the taker is almost always the YES buyer. Polymarket's own feed carries that out exactly — <code>Strike Price</code> is <code>YES</code> on all 347 parlay rows, with no NO side listed — so its parlay series is genuinely taker P&amp;L. The producer asserts that property on every run and fails rather than mislabel it.</p>
  <p><strong>Only one venue is priced exactly.</strong> P&amp;L is contract-weighted, so it wants a contract-weighted sum of prices paid. <strong>DKeX is the only venue that publishes one.</strong> The rest fall back to the 5&cent; bin midpoint, which is a real and measurable approximation, not a rounding detail: on Kalshi's longshot band the midpoint convention accounts for about 0.94&cent; of a 2.17&cent; reading, roughly 43% of it. Every row carries its <code>basis</code> and the table below shows it. Making all four exact needs one column added to three producers — it is a known, costed gap, not an unknown.</p>
  <p><strong>What validates the method.</strong> For DKeX, the one venue where two independent routes are both available, the exact route gives +$201,267 and an independent payout-minus-cost check gives +$201,263 — agreement to 0.002%. Separately, Polymarket's parlay volume reconciles between its daily report and its trade tape to <strong>0 contracts of 59,472</strong>, and the two sources' volume-weighted prices agree to four decimal places.</p>
  <p><strong>Kalshi's aggregate is held out of the chart.</strong> Kalshi publishes an all-markets series as well as its parlay and single-market halves; drawing all three would count the same contracts twice in one comparison. The aggregate is ${kalshiAll ? html`<strong>${fmtCents(kalshiAll.perContract)}</strong> per contract over ${fmtCount(kalshiAll.contracts)} contracts` : "not currently available"}, and is quoted here rather than plotted.</p>
  <p><strong>Which venues are absent, and why.</strong> Underdog and Novig both run parlays — Underdog's <code>UDXCOMBO</code> is the large majority of its records — but neither publishes a settlement outcome, so no P&amp;L of any kind is constructible for them and none is guessed. DKeX lists no parlay product at all: its 19 contract types are single-leg throughout.</p>
</details>

## What a contract costs its buyer

<div class="instruction-line">Bars run left from zero: further left is a worse deal for the bettor. <strong>DKeX’s bar points right, and must not be read as traders profiting there</strong> — <strong>zero of its 30 price bins</strong> clear two event-clustered standard errors, and its aggregate miss is +0.11¢ against a ±3.80¢ interval. It is drawn hollow for that reason: the money really did change hands, but the edge is not distinguishable from zero. It also moved 24% between two builds hours apart, which a real edge on 41 million contracts would not do.</div>

```js
Plot.plot({
  width,
  height: 60 + headline.length * 42,
  marginLeft: 210,
  marginRight: 70,
  x: {label: "P&L per contract (cents)", tickFormat: d => `${(d * 100).toFixed(0)}¢`, grid: true, nice: true},
  y: {label: null, domain: headline.map(d => d.label)},
  color: {legend: true, domain: Object.keys(VENUE_COLOR), range: Object.values(VENUE_COLOR)},
  marks: [
    Plot.ruleX([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    // Bars whose venue publishes a clustered SE that NOTHING clears are drawn hollow, so a
    // reader cannot mistake an unmeasurable number for a finding. Venues publishing no
    // comparable SE stay solid: unknown is not the same as refuted.
    Plot.barX(headline.filter(d => d.measurable === 0), {
      y: "label", x: "perContract", fill: "none", stroke: "venue", strokeWidth: 2,
      strokeDasharray: "3,2", rx1: 4, insetTop: 2, insetBottom: 2,
      title: d => `${d.label}
${fmtCents(d.perContract)} per contract - NOT measurable
${d.binsClearing} of ${d.binsTested} bins clear 2 clustered SE
realised, but not an edge`,
      tip: true
    }),
    Plot.barX(headline.filter(d => d.measurable !== 0), {
      y: "label", x: "perContract", fill: "venue",
      // 4px rounded data-end anchored to the zero baseline; a 2px gap to the surface.
      rx1: 4, insetTop: 2, insetBottom: 2,
      title: d => `${d.label}\n${fmtCents(d.perContract)} per contract\n${fmtUSD(d.pnl)} total\n${fmtCount(d.contracts)} contracts\n${d.leg === "taker" ? "Taker" : "Named leg"} · ${BASIS_NOTE[d.basis]?.split(" — ")[0] ?? d.basis}`,
      tip: true
    }),
    // Direct-label every bar: there are few enough that a value axis alone would be
    // harder to read than the numbers themselves.
    Plot.text(headline, {
      y: "label", x: "perContract", text: d => fmtCents(d.perContract),
      textAnchor: d => d.perContract < 0 ? "end" : "start",
      dx: d => d.perContract < 0 ? -6 : 6,
      fill: "var(--theme-foreground)", fontWeight: 600
    })
  ]
})
```

## Where on the price axis the loss happens

<div class="instruction-line">The favourite&ndash;longshot effect, in money. Cheap contracts are where bettors lose most per contract at nearly every venue &mdash; the same shape the calibration curves show, weighted by the contracts actually standing behind each bin.</div>

```js
// Bins thinner than this carry too little volume to read as anything but noise on a
// per-contract axis, where a handful of contracts can swing a bin by whole cents.
const MIN_BIN_CONTRACTS = 1000;
const byBin = pnl
  .filter(d => d.contracts >= MIN_BIN_CONTRACTS)
  .map(d => ({...d, label: `${d.venue} · ${GROUP_LABEL[d.group] ?? d.group}`}));
const dropped = pnl.length - byBin.length;
```

```js
Plot.plot({
  width,
  height: 420,
  marginLeft: 60,
  marginBottom: 44,
  x: {label: "Price paid (¢)", domain: [0, 100], grid: true},
  y: {label: "P&L per contract (¢)", tickFormat: d => (d * 100).toFixed(0), grid: true},
  color: {legend: true, domain: Object.keys(VENUE_COLOR), range: Object.values(VENUE_COLOR)},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.line(byBin, {
      x: "price_bin", y: "pnl_per_contract", stroke: "venue",
      strokeWidth: 2, strokeDasharray: d => d.group === "PARLAY" ? "4,3" : null,
      z: "label", curve: "monotone-x"
    }),
    Plot.dot(byBin, {
      x: "price_bin", y: "pnl_per_contract", fill: "venue", z: "label",
      r: 4, stroke: "var(--theme-background)", strokeWidth: 2,
      title: d => `${d.label}\n${d.price_bin}–${d.price_bin + 5}¢\n${fmtCents(d.pnl_per_contract)} per contract\nwin rate ${(d.win_rate * 100).toFixed(1)}% at ${(d.price_paid * 100).toFixed(1)}¢\n${fmtCount(d.contracts)} contracts`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Dashed lines are parlays. ${dropped > 0 ? html`${dropped} bins holding under ${d3.format(",")(MIN_BIN_CONTRACTS)} contracts are omitted from this chart — on a per-contract axis a thin bin swings by whole cents and reads as signal.` : ""}</div>

## Every series, with its caveats attached

```js
Inputs.table(rolled, {
  columns: ["label", "leg", "perContract", "pnl", "pctOfStake", "contracts", "basis"],
  header: {
    label: "Venue · group",
    leg: "Whose P&L",
    perContract: "Per contract",
    pnl: "Total P&L",
    pctOfStake: "% of stake",
    contracts: "Contracts",
    basis: "How it was priced"
  },
  format: {
    perContract: d => fmtCents(d),
    pnl: d => fmtUSD(d),
    pctOfStake: d => d == null ? "—" : `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}%`,
    contracts: d => fmtCount(d),
    leg: d => html`<span title=${LEG_NOTE[d] ?? ""}>${d === "taker" ? "Taker" : "Named leg"}</span>`,
    basis: d => html`<span title=${BASIS_NOTE[d] ?? ""}>${d === "exact_contract_weighted" ? "Exact" : "Approximate"}</span>`
  },
  align: {perContract: "right", pnl: "right", pctOfStake: "right", contracts: "right"},
  width: {label: 240},
  rows: 12
})
```

## Polymarket's parlay pilot

<div class="instruction-line">Six days old and a rounding error in volume terms &mdash; but it settles, so it can be priced. Shown separately because its scale is not comparable to anything else on this page.</div>

```js
Plot.plot({
  width,
  height: 240,
  marginLeft: 64,
  x: {label: null, type: "band", tickFormat: d => d.slice(5)},
  y: {label: "Contracts traded", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(parlayDaily, {
      x: "date", y: "contracts", fill: VENUE_COLOR["Polymarket US"],
      rx2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.date}\n${fmtCount(d.contracts)} contracts across ${d.trades} trades\nmean price ${(d.mean_price * 100).toFixed(1)}¢\n${(+d.pct_of_venue).toFixed(4)}% of Polymarket's volume that day`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Across the whole window this product is <strong>${(d3.sum(parlayDaily, d => d.contracts) / d3.sum(parlayDaily, d => d.venue_contracts) * 100).toFixed(4)}%</strong> of Polymarket US's traded contracts, over ${d3.sum(parlayDaily, d => d.trades)} trades. Read it as a pilot.</div>
