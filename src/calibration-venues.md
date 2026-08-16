---
title: Cross-Venue Calibration
---

# Do these markets predict outcomes?

<p class="page-lead">A perfectly calibrated market prices a contract at X&cent; when it wins X% of the time. <a href="./calibration">Kalshi's own calibration page</a> asks that question of Kalshi. This page asks it of every venue whose data can answer it, on one shared axis &mdash; and, more importantly, shows how much of each answer is real. It then asks the question a calibration curve cannot: <strong>where the traded volume actually sits on that same axis</strong>, in contracts and in dollars, so a measurable bias can be read against the money standing behind it.</p>

<div class="instruction-line"><strong>Read the error bars, not the dots.</strong> Thousands of prints on one ball game share a single outcome, so a game is <em>one</em> observation, not thousands. Every interval here is clustered on the event; treating prints as independent would shrink these bars by tens of times and manufacture significance the sample does not contain. <strong>Pale, thin bars are bins whose interval includes zero. Read them as &ldquo;imprecisely measured&rdquo;, never as a small one.</strong></div>

<details class="surface-card compact-details">
  <summary>About this page &mdash; read before quoting any number</summary>
  <p><strong>Weighting: contract-weighted, everywhere.</strong> Of every contract bought near 25&cent;, what share paid out. This is the series Kalshi's own calibration page plots (<code>yes_contracts / n_contracts</code>) and it is the only weighting for which the calibrated venues publish a matching event-clustered standard error, so it is the only one on which a cross-venue comparison is defined. The ForecastEx producer leads with the <em>trade</em>-weighted series measured against the mean traded price instead, and on that venue the two conventions disagree by several cents and in sign in a number of bins, so the ForecastEx curve here will not match figures quoted from its own file. The divergence is counted from the file, with the bins driving it, above the favourite&ndash;longshot table below. It is a weighting difference, not a disagreement about the data.</p>
  <p><strong>Implied probability is the bin midpoint at four of the six venues</strong>, not the average price actually paid, because Polymarket US publishes no traded-price sum &mdash; its <code>sum_price</code> column is derived from the midpoint &mdash; so a mean-price axis is not available for all of them and the midpoint is the only shared choice. That is not free. Contracts trade a little below their bin midpoint: over Kalshi's full settled history the contract-weighted mean price sits 0.47&cent; below the midpoint averaged across the 5&ndash;95&cent; bins, and 1.23&cent; below it in the cheapest bin, and this convention books that gap as mispricing rather than as a binning artefact. Kalshi is now drawn here from its live history, and because it is the one venue publishing both axes the size of that bias can be measured instead of assumed: on the longshot band it accounts for <strong>${midpointCost ? `${fmtCents(midpointCost.gap)} of a ${fmtCents(midpointCost.mid)} reading, about ${Math.abs(midpointCost.share)}% of it` : "a share this page cannot currently compute"}</strong>${midpointCost ? html`, and the direction ${midpointCost.clearsMean ? html`survives on a mean-price axis (${fmtCents(midpointCost.mean)}, still clearing two clustered standard errors)` : html`does <em>not</em> survive on a mean-price axis (${fmtCents(midpointCost.mean)}, inside its own interval)`}` : ""}. The convention is applied identically to the four venues drawn on it, so the <em>comparison</em> is clean even though the level carries that bias. <strong>ProphetX is the exception, and it is drawn on the price actually paid.</strong> It is the venue where the two conventions do not merely differ in level &mdash; they disagree about whether there is anything to report. On its own 10-cent deciles, 2 of 10 bins clear two clustered standard errors against the midpoint and <strong>0 of 10</strong> against the price paid; on the 5-cent bins this page draws, 4 of 20 against 1 of 20. Its cheapest decile is the reason: recounted on 2026-08-14, those contracts were bought at a mean of 2.44&cent;, not at the 5&cent; midpoint, which alone converts a &minus;0.57&cent; miss into a &minus;3.13&cent; one. Applying the shared convention there would have this page assert a mispricing the venue's tape does not support, which is the failure it exists to prevent. The cost of the exception is stated rather than hidden: ProphetX's dots sit on a slightly different x-axis from the other four, and the axis label says so.</p>
  <p><strong>Whose price.</strong> A binary has two legs and the venues do not all bin the same one. Kalshi bins the <strong>taker's</strong> own side. DKeX and Polymarket US publish one price per print against a symbol naming a specific leg, and neither publishes an aggressor flag, so those are <strong>leg</strong>-price curves. ForecastEx matches a YES buyer against a NO buyer with no taker flag at all, so it is the <strong>YES leg</strong> and its NO-leg curve is the mirror. ProphetX is a fourth construction and the furthest from Kalshi's: it publishes no aggressor flag either, and it prints <em>one</em> price per market that describes both sides at once, so there is no leg to pick at all. On a head-to-head moneyline that number is the probability of the second-named &mdash; <strong>home</strong> &mdash; side, with the away side at one minus it, so what its curve scores is the <strong>priced side</strong>. Nothing in the measurement depends on naming that side: price and settlement are the same series on the same side, so a contract's outcome is simply its own priced side winning. It is one definitional step from Kalshi's taker curve and it is never a taker curve. Small level differences between venues should not be over-read.</p>
  <p><strong>One venue appears only on the volume panel at the foot of this page.</strong> Underdog Exchange publishes a traded price but no settled outcome, so it can be counted but not scored, and it is named with its reason in the omitted list under the calibration charts. <strong>ProphetX used to be the second, and is not any more.</strong> Its curve is drawn from 2026-08-14, and the reason this page gave for excluding it &mdash; that its settlement column could not separate winners from losers &mdash; was refuted rather than revised: the claim was true of the venue's parlays and was never true of its single markets. Recounted from the raw tape on 2026-08-14 across the 60 sessions from 2026-06-16, on a basis stated rather than assumed &mdash; the unit is the <em>contract id</em>, each id priced at its own contract-weighted mean traded price, and &ldquo;cheap&rdquo; means that mean is 5&cent; or below &mdash; the contracts that claim was built on do carry a final mark of exactly 1.00 on 83.9% of the 16,375 such ids the bulletin marks, when singles and parlays are pooled; but that is 0.5% of the 1,171 singles against 90.3% of the 15,204 parlays. Among single markets that reached a 0-or-1 resolution, those bought below 10&cent; won 4.2% of the time (2,397 ids; 1.2% if the same group is weighted by contracts instead of ids) and those bought at 90&cent; or above won 94.8% (249 ids, the thinnest group quoted here; 98.7% contract-weighted). Rates are given to one decimal and with their recount date because they drift as the tape grows: they are a measurement of this corpus, not a fixed property of the venue. What is still absent is the parlay half, and it is absent permanently rather than pending: none of the 80,543 parlay contract ids in this venue's bulletin carries a parseable event date, so the maturity rule that makes the single markets scoreable cannot even be applied to them. Those parlays are 31,899,248 contracts, 11.77% of the venue. They are <em>in</em> the volume panel, at their combination price, and <em>out</em> of every calibration chart above &mdash; the one place on this page where a venue's two populations differ by construction rather than by sampling, and it is called out again under the overlay. Two further cautions belong with any ProphetX number quoted from these charts. Its curve is one side's view: the venue publishes a <em>single</em> price per market describing both sides at once, which on a head-to-head moneyline is the probability of the second-named, <strong>home</strong> side, so the away half is not on the axis. And what the curve is drawn <em>over</em> is a specific product mix &mdash; oddsmaker-set spreads and totals sit near a coin flip by construction, and golf outrights sit in the cheap tail by construction &mdash; which is sized from the venue's own tape under the volume chart below and should be read before the shape of the curve is interpreted.</p>
  <p><strong>Significance is recomputed here, not copied.</strong> The producers do not agree on what significance means, and one of them does not publish a verdict at all: ForecastEx flags its <em>trade</em>-weighted series, and Kalshi publishes no flag but two different standard errors &mdash; one against the bin midpoint, one against the mean traded price &mdash; which differ by a median 0.50&cent; and by as much as 1.54&cent;, so pairing the wrong one with this page's gap would misdraw every Kalshi bar. This page ignores every published verdict and applies one rule to every bin: <em>does the contract-weighted error exceed twice its own event-clustered standard error, measured on the same axis as the gap</em>. Nothing else counts as measurable.</p>
  <p><strong>Twenty bins per venue is twenty tests.</strong> About one bin in twenty crosses two standard errors by chance alone, so a single isolated solid dot is not evidence. The counts below are there to be read against that expectation, and the crossings that survive a Bonferroni correction at twenty bins per venue (|t| &ge; 2.96) are counted under the panels below &mdash; computed from the venues actually drawn, not asserted here.</p>
  <p><strong>Dots are a constant size on the calibration charts.</strong> They used to be scaled by the independent events behind each bin, and that channel was removed when every bin was made to draw identically &mdash; so size no longer encodes anything here. The evidence behind a bin is in its interval and in its tooltip. The volume overlay further down IS still size-scaled, and says so in its own caption.</p>
</details>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
// Each venue publishes its own calibration file with its own schema. They are
// loaded separately and normalised below rather than merged upstream, so a
// producer change at one venue cannot silently reshape another venue's series.
//
// ORDERING NOTE for whoever adds the next venue: the immutable transport's exact
// allowlist and current generation must contain the CSV before its line appears
// here. Every file below is already read by that venue's own page.
const calKalshiCurve = await DataAttachment("data/calibration_three_way.csv").csv({typed: true});
// Kalshi ships its clustered standard errors and event counts BESIDE the curve rather
// than inside it, because the two have different producers sequenced in one weekly flow.
// Joined below so the registry entry can read Kalshi exactly like any other venue.
const calKalshiClusters = await DataAttachment("data/calibration_three_way_clusters.csv").csv({typed: true});
const calDkex       = await DataAttachment("data/dkex_calibration.csv").csv({typed: true});
const calPolymarket = await DataAttachment("data/calibration_polymarket.csv").csv({typed: true});
const calForecastex = await DataAttachment("data/forecastex_calibration.csv").csv({typed: true});
// ProphetX joined these charts on 2026-08-14. Its file is schema-identical to
// dkex_calibration.csv, which is why it needs no new normalisation path -- only a
// different REFERENCE PRICE, for the reason set out on its registry entry below.
const calProphetx   = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
const calNadex      = await DataAttachment("data/nadex_calibration.csv").csv({typed: true});
const freshness     = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel} from "./components/freshness.js";

// JOIN on (group, price_bin), copying only the clustered-error and event-count columns
// by name. A blanket spread would also drag across the sidecar's *_chk reconciliation
// columns, which are one rename away from shadowing the curve's published n_trades /
// n_contracts / actual_win_rate_wt / calib_error. A bin with no match keeps se and
// n_effective undefined, so the fail-closed guard below treats it as unmeasurable rather
// than letting it through as reliable -- the same rule applied to every other venue.
const kalshiClusterByBin = new Map(calKalshiClusters.map(d => [`${d.group}|${d.price_bin}`, d]));
const calKalshi = calKalshiCurve.map(d => {
  const c = kalshiClusterByBin.get(`${d.group}|${d.price_bin}`);
  return c == null ? d : {
    ...d,
    n_events: c.n_events,
    n_effective: c.n_effective,
    se_calib_error_mid: c.se_calib_error_mid,
    se_calib_error: c.se_calib_error,
    calib_error_mean: c.calib_error_mean
  };
});
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

// What the shared bin-midpoint convention COSTS, measured rather than asserted.
// Kalshi is the venue that publishes both axes -- calib_error against the bin midpoint
// (what every venue is plotted on here) and calib_error_mean against the contract-
// weighted mean traded price -- so the difference between them IS the binning artefact.
// Contract-weighted over the same <30c longshot band the summary table below uses, and
// with the same conservative triangle-inequality bound on the standard error, so the
// two are directly comparable. Computed live: the fixture figure this paragraph used to
// quote had already stopped reproducing against the live history.
const midpointCost = (() => {
  const rows = calKalshi.filter(d => d.group === "ALL" && +d.price_bin < 30
    && num(d.calib_error) != null && num(d.calib_error_mean) != null && num(d.n_contracts) > 0);
  if (!rows.length) return null;
  const w = d3.sum(rows, d => +d.n_contracts);
  const wavg = f => 100 * d3.sum(rows, d => f(d) * +d.n_contracts) / w;
  const mid = wavg(d => +d.calib_error);
  const mean = wavg(d => +d.calib_error_mean);
  const seMid = wavg(d => num(d.se_calib_error_mid) ?? 0);
  const seMean = wavg(d => num(d.se_calib_error) ?? 0);
  if (!(mid < 0 || mid > 0)) return null;
  return {
    mid, mean, gap: mid - mean,
    share: Math.round(100 * (mid - mean) / mid),
    clearsMid: Math.abs(mid) > 2 * seMid,
    clearsMean: seMean > 0 && Math.abs(mean) > 2 * seMean
  };
})();

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
// where every field is CONTRACT-weighted. `implied` is the bin MIDPOINT at four of
// the five venues; ProphetX is drawn on the price actually PAID and declares that
// with impliedBasis, so nothing downstream has to guess which axis it is reading.
// That entry explains why the choice changes the answer there and only there.
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
    // se_calib_error_mid is the event-clustered SE of the MIDPOINT gap, which is the
    // gap this page plots. se_calib_error (no suffix) belongs to the mean-price gap and
    // would be the wrong pairing -- across this file the two axes differ by a median
    // 0.51c and up to 1.54c, so the choice is not cosmetic. Both, plus n_effective, are
    // joined in from calibration_three_way_clusters.csv above; num() still guards them,
    // so a failed join defers Kalshi to the "waiting on its pipeline" list rather than
    // drawing it without intervals.
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
    // Crypto.com COMBOS. PARLAYS ONLY, and that is not a limitation of the data --
    // it is the whole reason this venue can appear here at all. Nadex publishes no
    // aggressor flag, so a single-market curve could not say who paid the spread;
    // a combo is quoted by the house on request, so the customer is the buyer.
    name: "Crypto.com", color: "#9c27b0", accent: "nadex", src: calNadex,
    file: "nadex_calibration.csv",
    // THE WHOLE CONTRACT SUITE, not just parlays. Calibration asks whether a contract
    // trading at price p resolves that way p% of the time, which needs no aggressor
    // flag -- so crypto strikes, sports events and combos all qualify here. (P&L is
    // the opposite case and stays parlays-only: buyer-equals-taker holds only for a
    // combo quoted by the house on request.)
    leg: "the long side, whose price the tape publishes and whose outcome the settlement file gives",
    // Effective CONTRACTS, not prints. One contract can print dozens of times and every
    // print shares a single settlement, so prints are not independent draws. An earlier
    // build set this to the raw contract count and produced standard errors around
    // 1e-5; clustering gives an effective count roughly 60,000x smaller in the busiest
    // bin, and intervals 244x wider.
    effCol: "n_eff",
    groups: {headline: "ALL", reported: "ALL"},
    // COVERAGE, stated because it is not near 100%. 64.45% of traded contracts join an
    // outcome. The join key is sound -- 32.62% of the remainder EXPIRE AFTER the
    // collection window so no settlement file can contain them, and only 2.93% are
    // in-window with no outcome. Excluded, never imputed.
    coverageNote: "64.45% of traded contracts join a settled outcome; most of the rest expire after the collection window",
    // The x axis is the CONTRACT-WEIGHTED PRICE ACTUALLY PAID, off Nadex's own
    // time-and-sales tape -- not a bin midpoint. This venue carries no midpoint
    // approximation anywhere, which is why its dots sit at true prices.
    impliedBasis: "paid",
    binFilter: r => num(r.bin_width) == null || +r.bin_width === 5,
    rows: r => ({
      price_bin: +r.price_bin,
      implied: num(r.implied),
      actual: num(r.actual),
      err: num(r.calib_error),
      se: num(r.se_calib_error),
      n_eff: num(r.n_eff),
      n_events: num(r.n_eff),
      n_trades: num(r.n_trades),
      n_contracts: num(r.contracts)
    })
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
  },
  {
    name: "ProphetX", color: "#DB2777", accent: "prophetx", src: calProphetx,
    file: "prophetx_calibration.csv",
    // ProphetX publishes NO aggressor flag, so "whose calibration" is a convention
    // here, not a measurement. It prints ONE price per market describing both sides
    // at once; on a head-to-head moneyline that number is the probability of the
    // second-named -- HOME -- side, and the away side is one minus it. What is
    // scored is therefore the PRICED side. Nothing in the measurement depends on
    // naming it: price and settlement are the same series on the same side, so a
    // contract's outcome is its own priced side winning. It is one definitional
    // step from Kalshi's taker curve and must never be labelled a taker curve.
    leg: "priced side \u2014 the second-named, home side (this venue publishes no aggressor flag)",
    // Schema-identical to dkex_calibration.csv, and like it the file publishes no
    // effective-cluster column. null, so the fail-closed guard below does not
    // punish it for shipping fewer diagnostics than its neighbours.
    effCol: null,
    groups: {headline: "ALL", reported: "ALL"},
    // Both 10c deciles and 5c bins ship in one file, tagged by bin_width, exactly
    // as DKeX does. Only the 5c rows share this page's axis.
    binFilter: r => num(r.bin_width) == null || +r.bin_width === 5,
    // THE ONE VENUE NOT DRAWN ON THE BIN MIDPOINT.
    //
    // The file's published implied_prob and calib_error ARE the midpoint, kept for
    // schema compatibility with dkex. They are deliberately not used. At every
    // other venue the midpoint convention shifts a LEVEL; here it changes the
    // VERDICT. Measured against the midpoint 4 of these 20 bins clear two clustered
    // standard errors; measured against the price contracts were actually bought
    // at, 1 does -- and on the venue's own 10c deciles it is 2 of 10 against 0 of
    // 10. The cheapest decile is why: its contracts were bought at a mean of 2.44c,
    // not at the 5c midpoint, which alone turns a -0.57c miss into a -3.13c one.
    // Drawing this venue on the shared convention would have the page assert a
    // mispricing its own tape does not support. The producer prints both readings
    // and warns on every run for the same reason.
    impliedBasis: "paid",
    rows: r => {
      const nc = num(r.n_contracts);
      const sp = num(r.sum_price_contracts);
      // Guarded rather than assumed: a bin with no contracts, or a file that ever
      // drops sum_price_contracts, yields null and is filtered out below instead
      // of dividing by zero into a plausible-looking number.
      const implied = (nc != null && nc > 0 && sp != null) ? sp / nc / 100 : null;
      const actual = num(r.actual_win_rate_wt);
      return {
        price_bin: +r.price_bin,
        implied,
        actual,
        err: (implied == null || actual == null) ? null : actual - implied,
        // se_clustered is clustered on the FIXTURE -- the game, tournament or bout
        // named in the contract description, so a game's player props cluster with
        // its own moneyline. It is a standard error of the win rate, so it applies
        // unchanged whichever reference price the gap is measured against.
        se: num(r.se_clustered),
        n_events: num(r.n_events),
        // Distinct fixtures in the WHOLE eligible sample, constant across this
        // venue's rows by construction: bins share fixtures, so summing n_events
        // would multiple-count badly. Carried only by this venue, and read only by
        // the note under the error panel, which needs the honest sample size and
        // must not be left quoting a frozen one.
        n_events_total: num(r.n_events_total),
        n_trades: num(r.n_trades),
        n_contracts: nc
      };
    }
  }
];

// Venues that cannot answer the question, named with the reason. A venue that
// silently drops out of a comparison reads as "fine" rather than "not measured",
// which is the failure this page exists to avoid -- the same rule the effective
// fee-rate chart on /competitors follows.
//
// Rothera was measured and ruled out on the result. Three of the others fail
// earlier than that: the question needs a traded price per print AND a settled
// outcome per contract, and the feeds collected for them do not carry both.
// Columns re-checked against the live files on 2026-08-07.
//
// The ProphetX row is a fourth kind of entry and is deliberately NOT a venue: the
// venue itself moved onto these charts on 2026-08-14. What is named there is the
// half of it that still cannot appear, because a venue whose parlays silently drop
// out of a curve reads as a venue with no parlays. Do not delete that row when
// tidying this list -- it is the anti-silence contract, not a leftover.
const OMITTED = [
  ["Rothera (Robinhood)", "measured and ruled out on the sample, not on the inputs. Its settlements are clean and a daily-price proxy is accurate to within about half a cent, but only 71 independent events sit behind its trade tape: 70 baseball games and one inflation release. Its World Cup, roughly 92% of all-time volume, settled before the tape begins on 2026-07-27, and everything earlier is permanently unavailable. The comparable DKeX measurement rests on 424–654 independent games per decile; Rothera offers 22–51 effective events per 5-cent bin, an order of magnitude short, with its one large block being a single tournament."],
  ["Underdog Exchange", "the trade tape does carry a price on every print, but the market file's status column has exactly one value, \"Finalized\", and no win/loss field appears anywhere in the feed, so there is no outcome to score those prices against. The collection window is also only 40 days."],
  ["ProphetX parlays — the venue itself is now drawn", "ProphetX's single markets ARE on these charts from 2026-08-14, and the reason this page previously gave for keeping the whole venue off them was refuted rather than revised. That reason was that cheap contracts carry a final settlement_price of 1.00 on the overwhelming majority of their resolutions, so the column could not tell winners from losers. Recounted from the raw tape on 2026-08-14 the pooled figure holds. STATE THE BASIS with any of these numbers, because they differ by basis and that is how the earlier mess arose: the unit here is the CONTRACT ID, each id is priced at its own contract-weighted mean traded price, a final mark is settlement_price on the last bulletin session listing that id, and the window is the 60 sessions 2026-06-16 to 2026-08-14. On that basis, of the 16,375 traded contract ids the bulletin marks whose mean traded price was 5¢ or below, 83.9% carry a final mark of exactly 1.00 — and the conclusion does not follow, because it is a PARLAY artefact. Split that same sample and the single markets mark to 1.00 on 0.5% of 1,171 against 90.3% of 15,204 parlays. All 80,543 parlay contract ids in this venue's bulletin lack a parseable event date, so the maturity rule that makes the single markets scoreable cannot even be applied to them, and 93.43% of them carry a final mark of exactly 1.00 — an impossible outcome rate for multi-leg combinations, which is how you know those marks are not outcomes at all. On single markets the same column separates cleanly: among contracts that reached a 0-or-1 resolution, those bought below 10¢ won 4.2% of the time (2,397 contract ids; 1.2% if the same group is weighted by contracts instead of ids) and those bought at 90¢ or above won 94.8% (249 ids, the thinnest group quoted on this page, so read it as “nearly all” rather than as a decimal; 98.7% contract-weighted). So what remains omitted is the parlay half, and it is a large half: 31,899,248 contracts, 11.77% of everything this venue traded. Parlays are IN the volume panel at the foot of this page, at their combination price, and OUT of every calibration chart above."],

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
        // "midpoint" or "paid" -- WHAT `implied` is on this row, carried through so
        // a tooltip or an axis label can NAME the reference instead of assuming the
        // shared one. A venue that declares nothing is on the midpoint, as before.
        basis: v.impliedBasis ?? "midpoint",
        hasSe, reliable,
        clears: reliable && Math.abs(r.err) > 2 * r.se,
        // The standard error a chart treating every print as independent would
        // have drawn: the binomial error over prints at this bin's win rate.
        // Computed the same way for all five venues rather than read from five
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
  context: "Cross-venue calibration page: contract-weighted win rates and event-clustered standard errors. Implied probability is the bin midpoint at Kalshi, Polymarket US, ForecastEx and DKeX, but at ProphetX it is the contract-weighted mean price actually paid in the bin, not the midpoint -- ProphetX is the one venue where the choice changes the verdict rather than the level."
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
  // No radius channel. It used to be 10*sqrt(n_events/evMax) with evMax recomputed
  // PER VENUE -- necessary, because Kalshi counts event tickers in the millions and
  // DKeX ball games in the hundreds, but it meant a big dot meant a different absolute
  // thing in each colour, which a reader cannot help but compare. Precision is already
  // shown by the error-bar length, which IS comparable across venues (same probability
  // units for everyone), and the exact event count is in the tooltip.
  return v.rows.map(d => ({...d}));
});
const domainNames  = shown.map(v => v.name);
const domainColors = shown.map(v => v.color);

const clearRows  = rowsAll.filter(d => d.clears);
const noiseRows  = rowsAll.filter(d => !d.clears && d.reliable);
const unmeasRows = rowsAll.filter(d => !d.reliable);

function tipText(d) {
  return [
    `${d.venue} — ${d.price_bin}–${d.price_bin + 5}¢`,
    `Actual ${(100 * d.actual).toFixed(2)}%  vs ${d.basis === "paid"
        ? `mean price PAID ${(100 * d.implied).toFixed(2)}¢`
        : `implied ${(100 * d.implied).toFixed(1)}% (bin midpoint)`}`,
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

<p class="section-intro">Each dot is one 5-cent price bin at one venue. The dashed diagonal is perfect calibration. Every bin is drawn the same way &mdash; a dot is a measurement, and how precisely it is pinned down is shown by its interval in the next chart rather than by withholding the dot. Intervals are deliberately <strong>not</strong> drawn here &mdash; a hundred of them across six venues obscure the very line they sit on, and they are shown at a readable scale in the next chart. There are also <strong>no connecting lines</strong>: a line through these points would assert a smooth curve none of these samples supports.</p>

```js
shown.length === 0 ? html`<p class="chart-note">No venue selected.</p>` : Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width,
  height: 470,
  marginLeft: 62,
  marginRight: 16,
  // The label is derived, not written: a venue drawn on the price actually paid
  // sits on a different x than one drawn on the bin midpoint, and an axis that
  // says "midpoint" over both would be the quiet kind of wrong.
  x: {label: shown.some(v => v.impliedBasis === "paid")
        ? `Implied probability \u2014 bin midpoint (${shown.filter(v => v.impliedBasis === "paid").map(v => v.name).join(", ")}: mean price actually paid)`
        : "Implied probability (bin midpoint)",
      domain: [0, 1], tickFormat: "%", grid: true},
  y: {label: "Actual win rate (contract-weighted)", domain: [0, 1], tickFormat: "%", grid: true},
  // Radii are computed above and passed through untouched. An identity scale is
  // required: Plot's default r scale is itself sqrt, which would square-root the
  // already-square-rooted values.
  r: {type: "identity"},
  color: {legend: true, domain: domainNames, range: domainColors},
  marks: [
    Plot.line([{x: 0, y: 0}, {x: 1, y: 1}], {
      x: "x", y: "y",
      stroke: "var(--theme-foreground-fainter)", strokeWidth: 1
    }),
    // NO error bars here, deliberately. Four venues x 20 bins put 80 vertical rules
    // through a 45-degree line, and at this scale a few cents of interval is ink
    // rather than information. The intervals are shown at a readable scale in
    // "Calibration error by price bin" below; this chart answers only "where does
    // each venue sit". Significance still reads from the mark: solid clears 2 SE,
    // (all bins drawn identically since the significance encoding was removed).
    // ALL DOTS ARE SOLID. Hollow-versus-filled was the old significance encoding and it
    // failed at this density: a hundred small rings across five venues read as noise, and
    // the eye cannot separate an unfilled dot from a gap. Significance now rides on a
    // DARK RING plus full opacity, which stays legible at r=4 because it changes the dot's
    // outline rather than its interior. Colour still means venue and nothing else.
    //
    // ONE MARK FOR EVERY BIN. There is no longer a significant / not-significant /
    // unmeasurable split in how a point is DRAWN. Each bin is a measurement, and the
    // uncertainty around it belongs in its interval and its tooltip, not in whether the
    // reader is allowed to see it. The previous three-state encoding said "this bin does
    // not count", which no amount of noise actually justifies.
    Plot.dot(rowsAll, {
      x: "implied", y: "actual", r: 6.5,
      fill: "venue", fillOpacity: 0.92,
      stroke: "var(--theme-background)", strokeWidth: 1.4
    }),
    // Transparent hit area, so a small dot is still hoverable.
    Plot.dot(rowsAll, {
      x: "implied", y: "actual", r: 11, fill: "transparent",
      tip: true, title: tipText
    })
  ]
})
```

<span style="font-weight:600">&#9679; One 5-cent price bin at one venue</span> &nbsp; All dots are the same size &mdash; nothing is encoded in area here &nbsp; Intervals are deliberately not drawn on this chart; they are in the next one &nbsp; Dot area &prop; events in the bin, scaled within each venue.

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
      marginTop: 28,
      x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
      y: {label: "Calibration error, actual − implied (¢)", domain: [-lim, lim], grid: true},
      // Each panel already carries its venue name in its own title, so the right-hand
      // facet axis only repeated it -- and truncated it to "K" / "P" / "F" against a
      // 16px right margin. Dropped rather than widened.
      fy: {label: null, domain: domainNames, axis: null},
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
        // One mark. The interval drawn behind each point already says how precisely it
        // is pinned down; splitting the dots by whether that interval happens to exclude
        // zero told the reader some bins were not results.
        Plot.dot(rowsAll, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 4.2, fill: "venue", fillOpacity: 0.92,
          stroke: "var(--theme-background)", strokeWidth: 1.2
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

```js
// ProphetX's reading, placed with the significance rule because this is the venue
// where the shared convention and the honest one disagree about whether there is a
// finding at all. Every figure here is computed from the rows on screen; the two
// that CANNOT be computed from a binned file are labelled as measured off-page and
// dated, rather than quietly presented as live.
{
  const px = shown.find(v => v.name === "ProphetX");
  const rs = px ? rowsAll.filter(d => d.venue === "ProphetX" && d.n_contracts > 0) : [];
  if (px && rs.length) {
    const w = d3.sum(rs, d => d.n_contracts);
    const paid = d3.sum(rs, d => d.implied * d.n_contracts) / w;
    const win  = d3.sum(rs, d => d.actual  * d.n_contracts) / w;
    const gap  = 100 * (win - paid);
    // The same conservative triangle-inequality bound the favourite-longshot table
    // uses: bins SHARE fixtures, so their clustered standard errors cannot be pooled
    // in quadrature, and the weighted average of the standard errors is the bound
    // that holds under any correlation between them.
    const seBound = 100 * d3.sum(rs, d => d.se * d.n_contracts) / w;
    // Recomputed here rather than read from the file's calib_error column, so the
    // two readings are compared on exactly the rows being drawn.
    const kPaid = rs.filter(d => Math.abs(d.err) > 2 * d.se).length;
    const kMid  = rs.filter(d => Math.abs(d.actual - (d.price_bin + 2.5) / 100) > 2 * d.se).length;
    // The honest sample size, from the file's own column rather than frozen here.
    const fixtures = d3.max(rs, d => d.n_events_total);
    // The cheapest decile's mean price paid, rebuilt from the two cheapest 5c bins
    // on screen -- the single number that carries the whole midpoint argument, so
    // it is the last one that should be a quotation.
    const cheap = rs.filter(d => d.price_bin < 10);
    const cheapW = d3.sum(cheap, d => d.n_contracts);
    const cheapPaid = cheapW > 0 ? d3.sum(cheap, d => d.implied * d.n_contracts) / cheapW : null;
    const cheapWin = cheapW > 0 ? d3.sum(cheap, d => d.actual * d.n_contracts) / cheapW : null;
    display(html`<p class="chart-note"><strong>ProphetX: no measurable bias &mdash; and the reference price is
      why that has to be said carefully.</strong> Across ${fmtInt(d3.sum(rs, d => d.n_trades))} prints and
      ${fmtInt(w)} contracts, the contract-weighted mean price paid was
      <strong>${(100 * paid).toFixed(2)}&cent;</strong> and <strong>${(100 * win).toFixed(2)}%</strong> of those
      contracts won: a tilt of ${fmtCents(gap)} against the priced side. That is not a finding.
      On this page's own conservative bound the tilt is ${fmtCents(gap)} &plusmn;${(2 * seBound).toFixed(2)}&cent;;
      clustered on the fixture over the whole sample at once its standard error is <strong>0.79&cent;</strong>,
      giving <strong>|t| = 1.50</strong> on the ${fmtInt(fixtures)} independent fixtures this venue's file
      counts. Measured either way it does not clear two standard errors, so the honest headline is
      <em>no measurable bias</em>, not the cent figure. That whole-sample standard error is the one figure
      here not computed live: bins share fixtures, so a file binned by price cannot carry it, and it was
      measured directly from the venue's fixture-level residuals on 2026-08-14.
      <strong>This is also the venue where the choice of reference price changes the verdict.</strong>
      Against the bin midpoint, ${kMid} of its ${rs.length} bins clear two clustered standard errors; against
      the price contracts were actually bought at, ${kPaid} ${kPaid === 1 ? "does" : "do"}. The difference is
      the binning convention and not the venue${cheapPaid == null ? "" : html`: everything under 10&cent; here
      was bought at a mean of <strong>${(100 * cheapPaid).toFixed(2)}&cent;</strong>, not at the 5&cent;
      midpoint the shared convention would score it against, and ${(100 * cheapWin).toFixed(2)}% of it won
      &mdash; a miss of ${fmtCents(100 * (cheapWin - cheapPaid))} against what was paid and
      ${fmtCents(100 * (cheapWin - 0.05))} against the midpoint`}. This page draws the first of those two
      readings, and its x-axis says so.</p>`);
  }
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

## Where the volume actually sits

<p class="section-intro">Everything above says <em>where</em> a venue is mispriced. It cannot say <strong>how much money is standing there</strong>. This is the same twenty bins and the same bin edges, drawn for every venue that publishes a traded price &mdash; a slightly different venue set from the calibration charts above &mdash; Underdog Exchange appears here and not there, Crypto.com there and not here, because counting volume needs only a price where scoring calibration also needs an outcome. It shows how each venue's traded volume is distributed across the price axis, counted in contracts and counted in dollars, because those are not the same picture and the difference between them is the point. Read it against the <a href="./competitors">fee schedules</a>, which are drawn on this axis too: together the three answer a question none of them answers alone &mdash; <em>is the mispricing where the money is, and is it expensive there?</em></p>

<div class="instruction-line"><strong>Contracts and dollars are different questions.</strong> A contract bought at 3&cent; costs 3&cent;; one bought at 97&cent; costs 97&cent;. So a cheap bin holding a large share of a venue's <em>contracts</em> will always hold a much smaller share of its <em>dollars</em> &mdash; that part is arithmetic, not a discovery. What is <em>not</em> arithmetic is the level: how many contracts pile into the cheap tail in the first place, and therefore how little of a venue's money sits in the bins where its pricing is measurably off. Switch the toggle and watch which end of the book moves.</div>

```js
// ---------------------------------------------------------------------------
// VOLUME AT PRICE — the third layer on this page's axis.
//
// Every file below is OPTIONAL, and none of them is loaded through the page's
// main DataAttachment. Two reasons, and the second is the one that matters:
//   1. these producers land on their own cadence, so a venue has to be able to
//      be absent without taking the page down with it; and
//   2. a failed load on the shared attachment sets that attachment's marker to
//      data-dashboard-data-source="error" for the WHOLE page. That marker is the
//      transport's health signal for the five calibration files, and a file that
//      has simply not shipped yet must not be able to raise it. A second
//      attachment instance carries its own marker, which is deliberately never
//      displayed. The transport manifest promise is cached at module scope, so
//      the second instance costs no extra request.
// ---------------------------------------------------------------------------
const VolumeData = createRemoteDataAttachment(d3);
const volSrc = await (async () => {
  const load = async name => {
    try {
      return await VolumeData(`data/${name}`).csv({typed: true});
    } catch (error) {
      // Expected before the producer lands. The venue is NAMED in the deferred
      // list below rather than quietly dropping out of the comparison.
      console.warn(`volume-at-price: ${name} unavailable — ${String(error?.message ?? error).slice(0, 200)}`);
      return [];
    }
  };
  const [kalshi, forecastex, polymarket, dkex, underdog, prophetx] = await Promise.all([
    load("volume_at_price_kalshi.csv"),
    load("volume_at_price_forecastex.csv"),
    load("polymarket_price_distribution.csv"),
    load("dkex_volume_at_price.csv"),
    load("underdog_volume_at_price.csv"),
    load("prophetx_volume_at_price.csv")
  ]);
  return {kalshi, forecastex, polymarket, dkex, underdog, prophetx};
})();
```

```js
const VOL_BINS = d3.range(0, 100, 5);

// The population string is the PRODUCER's, not this page's; only the gloss is
// added. The settled case is shouted because a settled-only volume curve drawn
// beside a settled-only calibration curve is fine, while a settled-only volume
// curve captioned as "the venue's volume" is not — settled markets are a biased
// sample of a live book. Whatever a producer ships in that column is repeated
// verbatim in the freshness card below, so this caption cannot rot into a claim
// the file no longer supports.
const volPopulation = raw => {
  if (raw == null || raw === "") return null;
  const words = String(raw).replace(/_/g, " ").trim();
  if (words.toLowerCase().includes("settl")) {
    return `${words} — SETTLED TRADES ONLY, not this venue's whole tape`;
  }
  // Only the "settled or not" clause is added, and only to a population the
  // producer itself called "all", so this can never describe a file as wider
  // than its own column claims.
  return /^all\b/i.test(words) ? `${words}, settled or not` : words;
};

// ---------------------------------------------------------------------------
// VOLUME REGISTRY — deliberately a SEPARATE registry from VENUES above, because
// the two questions do not have the same answer set. A venue needs a traded
// price AND a settled outcome to be calibrated; it needs only the price to be
// counted here. Underdog Exchange is the case in point: it is omitted from every
// chart above for want of outcomes and appears in every chart below.
//
// Names, colours and accents are VENUES', which are competitors.md's, so one
// venue looks the same on all three pages.
// ---------------------------------------------------------------------------
const VOLUME_VENUES = [
  {
    name: "Kalshi", color: "#00C2A8", accent: "kalshi",
    file: "volume_at_price_kalshi.csv", src: volSrc.kalshi,
    // The x-axis is the TAKER's own side, the same convention as this page's
    // Kalshi calibration curve, so the two compose bin for bin.
    leg: "taker's own side",
    popCol: "population", popFallback: "population not stated by the producer",
    groupCol: "leg", prefer: ["taker"],
    rows: r => ({contracts: num(r.contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts), coverage: null})
  },
  {
    name: "Polymarket US", color: "#3B7DD8", accent: "polymarket",
    file: "polymarket_price_distribution.csv", src: volSrc.polymarket,
    leg: "leg named by the symbol",
    popCol: null, popFallback: "all prints, settled or not",
    // period="all" is the all-time distribution. The monthly rows in the same
    // file are BUSINESS months — Polymarket's raw files run 17:00–17:00 ET — so
    // they are a different calendar from every other date series on this site.
    // Filtered out here rather than offered.
    pick: r => r.period === "all",
    // LEG_PRICE counts each print once at its printed price. SYMMETRIZED counts
    // both counterparties and is NOT a taker view: on Kalshi, the one venue here
    // that publishes an aggressor flag, takers sit 77% on the named side, nowhere
    // near the 50/50 that group implies. It is never drawn.
    groupCol: "group", prefer: ["LEG_PRICE"],
    // calib_group is the calibration group the producer computed its coverage
    // column OVER. It is carried through so the overlay can LABEL the number with
    // its group and SUPPRESS it when the page is drawing a different one. The
    // producer computes over ALL; this page's default sample draws ALL_DEEP, whose
    // real coverage in the 0-5c bin is 35.0% against ALL's 64.0% -- printing one
    // as the other would be wrong by 29 points in the bin this section is built on.
    rows: r => ({contracts: num(r.contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts),
                 coverage: num(r.calib_pop_coverage_pct),
                 covGroup: r.calib_group == null || r.calib_group === "" ? null : String(r.calib_group)})
  },
  {
    name: "ForecastEx", color: "#E53535", accent: "forecastex",
    file: "volume_at_price_forecastex.csv", src: volSrc.forecastex,
    leg: "YES leg",
    popCol: "population", popFallback: "all pair prints",
    // leg=yes is the series the ForecastEx calibration curve above is built on:
    // the venue matches a YES buyer against a NO buyer with no aggressor flag, so
    // there is no taker leg to pick and the NO curve is its mirror. leg=both is
    // the venue-level total — every contract created, each at its own side's
    // price — which answers "where is this venue's money" but is not comparable
    // with a taker curve. It is a fallback only, and the substitution is named.
    groupCol: "leg", prefer: ["yes", "both"],
    rows: r => ({contracts: num(r.contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts), coverage: null})
  },
  {
    name: "DKeX", color: "#F97316", accent: "dkex",
    file: "dkex_volume_at_price.csv", src: volSrc.dkex,
    leg: "leg named by the symbol",
    popCol: "population", popFallback: "all prints, settled or not",
    // Same rule as the DKeX calibration entry above: only 5-cent rows share this
    // axis. A file without the column at all is treated as 5c.
    pick: r => num(r.bin_width) == null || +r.bin_width === 5,
    groupCol: "group", prefer: ["ALL"],
    rows: r => ({contracts: num(r.n_contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts), coverage: null})
  },
  {
    name: "Underdog Exchange", color: "#EAB308", accent: "underdog",
    file: "underdog_volume_at_price.csv", src: volSrc.underdog,
    leg: "leg named by the ticker",
    // popCol resolves to null -- underdog_volume_at_price.csv has no population
    // column -- so this fallback IS what the card renders. It previously read
    // "all prints, settled or not", which is false: the chart draws SINGLE.
    // Parlays are 15,551,285 contracts, 28.1% of the venue, and excluding them
    // roughly triples the cheap-tail share this section is about
    // (under 10c: 19.3% of contracts on ALL vs 5.8% on SINGLE).
    popCol: "population", popFallback: "single-market prints only -- parlays excluded, which is a large exclusion: 15,551,285 contracts, 28.1% of this venue. Including them roughly triples the cheap-tail share (under 10c goes from 5.8% to 19.3% of contracts)",
    // SINGLE, not ALL. A UDXCOMBO price is the price of a COMBINATION, not of a
    // single-market probability, so it does not belong on a probability axis —
    // and it is much too large to leave silently mixed in: parlays are about a
    // quarter of this venue's contracts all-time, they were under 0.5% a day
    // until early August 2026, and they are over half of the venue's own sub-10c
    // volume. Drawing ALL would overstate its cheap tail by roughly 3x. What
    // SINGLE removes is stated under the chart, not hidden.
    groupCol: "group", prefer: ["SINGLE", "ALL"],
    // No calibration curve exists for this venue, so it cannot appear in the
    // overlay. Stated there rather than left as an unexplained gap.
    noCalibration: "it publishes a price on every print but no outcome to score it against — its market file's status column has exactly one value",
    rows: r => ({contracts: num(r.n_contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts), coverage: null})
  },
  {
    name: "ProphetX", color: "#DB2777", accent: "prophetx",
    file: "prophetx_volume_at_price.csv", src: volSrc.prophetx,
    // ProphetX publishes ONE price per market and that price describes BOTH
    // sides at once, so unlike every other venue here there is no leg to pick.
    // On a head-to-head moneyline it is P(second-named side) -- the HOME team or
    // player, the one after the "@" -- and the away side is 1 minus it. That is
    // solved rather than assumed: the producer's control group is tennis, played
    // at neutral venues, which averages 0.5026, while soccer, the sport with the
    // largest home advantage, averages 0.5922, with baseball, basketball and MMA
    // ordered correctly in between. The per-trade selection label is NOT the
    // priced side and must never be read as one -- both labels on a market carry
    // the same number.
    //
    // The consequence for THIS chart, stated under it as well: the away half of
    // every ProphetX market is not drawn, so the curve is one side's view.
    leg: "home side — the second-named team or player, on the markets that have one",
    // NOTE ON accent: styles.css still defines no --accent-prophetx and no
    // .kpi-card[data-accent="prophetx"] rule -- re-checked 2026-08-14, and that
    // half of this note stands. The rest of it went stale when ProphetX joined
    // the calibration charts: that KPI grid DOES paint a ProphetX accent now,
    // from an inline --kpi-accent fallback the grid supplies for any venue the
    // stylesheet has no variable for. This field is still inert, but for a
    // different reason than the one that used to be written here, and the new
    // reason is the durable one: data-accent is emitted in exactly ONE place on
    // this page, the calibration KPI grid, and that grid reads the CALIBRATION
    // registry's accent (the ProphetX entry near the top of this file), never
    // this volume-side copy. Nothing reads this one. If a volume-side accent is
    // ever wired up, either add the variable to the stylesheet FIRST or copy the
    // KPI grid's inline fallback, or the card silently falls back to the Kalshi
    // primary.
    //
    // popCol resolves to null -- prophetx_volume_at_price.csv carries no
    // population column -- so this fallback IS what the card renders, and it has
    // to carry the parlay exclusion that this page cannot make. Underdog's file
    // offers a SINGLE group to filter on; ProphetX's does not, so its parlays
    // are IN the numbers and the only honest move is to say so and size it.
    popCol: "population", popFallback: "all prints, settled or not — and parlays are NOT separable here: 31,899,248 contracts, 11.77% of this venue, are multi-event combinations binned at their combination price, because this file carries no single/parlay split to filter on. A combination price is not a single-market probability, and 49.1% of those contracts sit under 10¢, so they are most of what this venue shows in the cheap tail",
    // Only 5-cent rows share this axis, the same rule as DKeX above. A file
    // without the column at all is treated as 5c.
    pick: r => num(r.bin_width) == null || +r.bin_width === 5,
    // HOME is the only group the producer writes today. Naming it means a future
    // second group cannot silently change which series this page draws.
    groupCol: "group", prefer: ["HOME"],
    // A calibration curve DOES exist for this venue from 2026-08-14, so in normal
    // operation ProphetX is in the overlay and this string is never rendered. It is
    // kept, and kept accurate, because it is still reachable: if
    // prophetx_calibration.csv arrives without an event-clustered standard error
    // the venue is deferred above and lands here. It must not go on asserting the
    // refuted claim in that case.
    noCalibration: "its calibration curve is drawn on this page from prophetx_calibration.csv, so if it is missing from this overlay that file did not land or arrived without event-clustered standard errors — not because the venue cannot be scored. It can: the old claim that its settlement column could not separate winners from losers was true of its parlays and never of its single markets, where resolved single-market contract ids, each priced at its own contract-weighted mean traded price, won 4.2% of the time when bought below 10¢ (n=2,397 ids) and 94.8% when bought at 90¢ or above (n=249 ids), recounted from the raw tape on 2026-08-14",
    rows: r => ({contracts: num(r.n_contracts),
                 dollars: num(r.dollars), pubPct: num(r.pct_contracts), coverage: null})
  }
];

// Venues that cannot answer THIS question, named with the reason. Absent from a
// chart must never read as "no volume there"; it means unmeasured. This list is
// not the same as OMITTED above, and the differences are informative: Underdog
// moves onto the chart (it has prices, just no outcomes) and Rothera stays off
// for a different reason than it is off the calibration charts.
const VOL_OMITTED = [
  ["Rothera (Robinhood)", "no usable per-trade price. What is collected is end-of-day market data; the real trade tape is about ten days long and earlier dates are permanently unavailable upstream. Every daily price proxy was tested against the real prints and every one failed badly enough to invert the shape of a distribution — settlement price understates traded volume-weighted price by 80.5%, closing price by 75.7%, the bid–offer midpoint overstates by 30.0% and OHLC/4 by 23.9%. A proxy-based distribution here would be a drawing, not a measurement."],
  ["Crypto.com/Nadex", "publishes no per-trade price at all. What is collected is a daily bulletin: one volume number per market description, with no price to bin it by."],
  ["CME (FanDuel + DraftKings)", "hand-collected daily bulletins carrying call, put and total volume only, with no trade prices."]
];
```

```js
// ---------------------------------------------------------------------------
// NORMALISE + GUARD. Same discipline as the calibration registry above: a venue
// that cannot be drawn honestly is held back and NAMED, never drawn thin.
// ---------------------------------------------------------------------------
const volBuilt = VOLUME_VENUES.map(v => {
  const raw = (v.src ?? []).filter(v.pick ?? (() => true));
  const groups = new Set(raw.map(r => r[v.groupCol]));
  const group = (v.prefer ?? []).find(g => groups.has(g)) ?? [...groups][0] ?? null;
  const sel = group == null ? raw : raw.filter(r => r[v.groupCol] === group);

  // KEY UNIQUENESS, CHECKED BEFORE ANY NUMBER IS TRUSTED. count(*) against
  // count(distinct price_bin) on the rows actually selected. Two rows on one bin
  // means the file carries a split this page does not know about — a new group,
  // leg or period value — and both available answers are wrong: summing them
  // double-counts, and a Map lookup silently keeps whichever row happens to be
  // last. This is the same check the series_categories fan-out on /competitors
  // went months without, and it is why that chart overstated contracts by 3.6%.
  const keys = sel.map(r => +r.price_bin).filter(Number.isFinite);
  const nDup = keys.length - new Set(keys).size;

  const parsed = sel
    .map(r => ({price_bin: +r.price_bin, ...v.rows(r)}))
    .filter(r => Number.isFinite(r.price_bin) && r.price_bin >= 0 && r.price_bin <= 95
                 && r.contracts != null && r.contracts >= 0
                 && r.dollars != null && r.dollars >= 0);
  const byBin = new Map(parsed.map(r => [r.price_bin, r]));

  // Zero-fill the full 20-bin grid. Here an unpopulated bin IS a real zero — no
  // volume traded at that price — unlike the charts above, where a missing bin
  // means "not measured". A line that skipped it would say the opposite.
  const grid = VOL_BINS.map(b => {
    const r = byBin.get(b);
    return {price_bin: b, contracts: r?.contracts ?? 0,
            dollars: r?.dollars ?? 0, coverage: r?.coverage ?? null,
            covGroup: r?.covGroup ?? null, pubPct: r?.pubPct ?? null};
  });
  const totC = d3.sum(grid, d => d.contracts);
  const totD = d3.sum(grid, d => d.dollars);

  // Shares are computed HERE, from the rows actually drawn — never read from the
  // producer's own pct columns. Selecting a different subset than the producer
  // normalised over is exactly how a chart ends up with shares that do not sum
  // to 100 (Polymarket's SYMMETRIZED group has a different dollar denominator
  // from its LEG_PRICE group by construction). The published column is then used
  // as a CHECK: a disagreement means this page is drawing a different population
  // than the producer intended, and it is surfaced rather than swallowed.
  const rows = grid.map(d => ({
    ...d, venue: v.name, color: v.color,
    pctContracts: totC > 0 ? 100 * d.contracts / totC : null,
    pctDollars: totD > 0 ? 100 * d.dollars / totD : null
  }));
  const pubGap = d3.max(rows, d => (d.pubPct == null || d.pctContracts == null)
    ? null : Math.abs(d.pubPct - d.pctContracts));

  const usable = nDup === 0 && parsed.length >= 10 && totC > 0 && totD > 0;
  const reason = parsed.length === 0
      ? "its volume-at-price file has not landed yet"
    : nDup > 0
      ? `its file carries ${nDup} price bin${nDup === 1 ? "" : "s"} more than once on the series this page selects, which means an unrecognised split — this page will not guess which rows to draw`
    : parsed.length < 10
      ? `only ${parsed.length} of 20 price bins carry a number`
    : totD <= 0
      ? "its file carries contracts but no dollars, and the divergence between the two is what this section is about"
      : "it carries no contracts";

  return {
    ...v, group, rows, totC, totD, nDup, pubGap, usable, reason,
    // null means the file carries no group column at all, which is not a
    // substitution — only a DIFFERENT named series is.
    groupFellBack: v.prefer != null && group != null && group !== v.prefer[0],
    population: volPopulation(v.popCol ? sel[0]?.[v.popCol] : null) ?? v.popFallback
  };
});

const volReady = volBuilt.filter(v => v.usable);
const volReadyNames = volReady.map(v => v.name);
const volMoney = n => n == null ? "n/a"
  : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}bn`
  : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}m`
  : `$${fmtInt(n)}`;

// OBSERVATION WINDOW per venue. These are not six samples of one period -- they
// are six different "all times", and a footnote reading "all-time distributions
// only" actively invites reading them as one. Each string is the population its
// own producer states, checked 2026-08-11; they are spans, not live values, so
// they are labelled as a snapshot rather than presented as computed. A venue-level
// shape read off sixty days is a description of sixty days.
const VOL_WINDOW = new Map([
  ["Kalshi", "about 4 years of prints (from Aug 2022)"],
  ["ForecastEx", "about 2 years (from Aug 2024)"],
  ["Polymarket US", "about 10 months (from Oct 2025)"],
  ["DKeX", "about 60 days (from Jun 2026)"],
  ["Underdog Exchange", "about 20 active days (from Jul 2026)"],
  ["ProphetX", "60 trading days, 16 Jun – 14 Aug 2026, the last of them partial. /competitors and the front page quote 268,659,386 contracts over the 59 COMPLETE days: the same tape, less that day's 2,334,935"]
]);
```

```js
display(html`<div class="chart-note">
  <p><strong>Not on this chart.</strong> ${VOL_OMITTED.map(([n, why]) => html`<span><strong>${n}</strong> &mdash; ${why} </span>`)}
  Absent means unmeasured, not zero &mdash; each of these venues trades, and none of them publishes a price this axis could use.</p>
  ${volBuilt.filter(v => !v.usable).length ? html`<p><strong>Waiting on its pipeline:</strong>
    ${volBuilt.filter(v => !v.usable).map(v => html`<span><strong>${v.name}</strong> &mdash; ${v.reason}. </span>`)}</p>` : ""}
  <p><strong>Whose price is on the x-axis differs by venue, and only one of them is a taker price.</strong>
    Kalshi bins the taker's own side. Polymarket US, DKeX and Underdog Exchange bin the leg their symbol
    names, because none of them publishes an aggressor flag at all. ForecastEx has no aggressor to publish
    &mdash; it matches a YES buyer against a NO buyer and both pay &mdash; so it is drawn on its YES leg.
    ProphetX is a fourth construction: it publishes <em>one</em> price per market that describes both sides
    at once, so there is no leg to pick at all. On a head-to-head moneyline that number is the probability of
    the <strong>second-named &mdash; home &mdash; side</strong>, and the away side is one minus it. That is a
    solved convention rather than an inference: tennis, played at neutral venues, averages 0.5026 while
    soccer, the sport with the largest home advantage, averages 0.5922, with baseball, basketball and MMA
    ordered correctly in between. The consequence is worth stating plainly &mdash; <strong>the away half of
    every ProphetX market is not on this chart</strong>, so its curve is one side's view of the book and not
    a two-sided distribution.
    These are one definitional step apart and the levels should not be read as identical constructions. There is a second difference, and it is not the same one: DKeX lists <em>both</em> complementary legs of a two-outcome market as separately tradeable symbols &mdash; 1,769 of its 1,775 settled two-leg roots have settlement prices summing to exactly 1.00, and 42.6% of its traded contracts sit in such markets &mdash; while Polymarket US publishes one symbol per head-to-head event. So a DKeX market can contribute to both a cheap bin and its mirrored dear bin, and a Polymarket one cannot. That is a difference in what the two curves are, not in the data behind them; on
    Kalshi, the one venue that publishes an aggressor, the two conventions differ by 3.0 percentage points
    across the twenty bins and move the cheapest bin by 0.29 points. The published Polymarket file also
    carries a second series, <code>SYMMETRIZED</code>, which books both counterparties at half weight. It is
    never drawn here and it is <strong>a bracket, not an estimate, and not a taker view</strong>: it assumes
    a 50/50 aggressor split, and on Kalshi the measured split is 75.4% of contracts on the named side (67.7% of prints, 63.8% of taker dollars - the three differ by over 11 points, so the basis matters), so the true
    taker-side distribution sits much nearer the leg-price curve than the midpoint between them.</p>
  ${volReady.filter(v => v.groupFellBack).length ? html`<p><strong>Substituted series:</strong>
    ${volReady.filter(v => v.groupFellBack).map(v => html`<span>${v.name} is drawn on <code>${v.group}</code>, not the series this page asked for. </span>`)}</p>` : ""}
  ${volReady.filter(v => v.pubGap != null && v.pubGap > 0.05).length ? html`<p><strong>Share check:</strong>
    ${volReady.filter(v => v.pubGap != null && v.pubGap > 0.05).map(v => html`<span>${v.name}'s own
    <code>pct_contracts</code> column differs from the share computed here by up to
    ${v.pubGap.toFixed(2)} percentage points, which means this page is drawing a different
    population than its producer normalised over. </span>`)}</p>` : ""}
</div>`);
```

```js
if (volReady.length > 0) display(freshnessPanel({
  title: "Volume-at-price freshness",
  items: volReady.map(v => ({
    label: v.name,
    value: `${fmtInt(v.totC)} contracts · ${volMoney(v.totD)}`,
    updatedAt: fileUpdatedAt(freshness, v.file),
    meta: `${v.population} · ${VOL_WINDOW.get(v.name) ?? "observation window not stated"}`
        + ` · x-axis is the ${v.leg}${v.group ? ` · series ${v.group}` : ""}`,
    tone: v.name === "Kalshi" ? undefined : "competitor"
  })),
  note: "These are six different \u201call times\u201d, and the observation window on each card is the one to read before comparing levels: Kalshi covers about four years, ForecastEx two, Polymarket US ten months, DKeX and ProphetX about sixty days each, and Underdog Exchange twenty active days. A venue-level shape read off sixty days is a description of sixty days. Population is quoted from each producer's own column, not asserted here \u2014 the calibration curves above are settled-only at every venue by construction, and these are not necessarily the same population. A card showing no update time means the file is not yet listed in freshness_manifest.json; the numbers are still current, only the timestamp is missing."
}));
```

<div class="control-strip">

```js
const volMeasure = view(Inputs.radio(["Contracts", "Dollars"], {
  label: "Measure", value: "Contracts",
  format: k => k === "Contracts" ? "Contracts traded" : "Dollars paid"
}));
const volVenueSel = view(Inputs.checkbox(volReadyNames, {label: "Venues", value: volReadyNames}));
```

</div>

```js
const volValue = d => volMeasure === "Dollars" ? d.pctDollars : d.pctContracts;
const volShown = volReady.filter(v => volVenueSel.includes(v.name));
const volDomainNames  = volShown.map(v => v.name);
const volDomainColors = volShown.map(v => v.color);
```

```js
{
  if (volReady.length === 0) {
    display(html`<p class="chart-note">No venue has published a volume-at-price file yet, so there is
      nothing to draw. This section fills in venue by venue as each producer lands; nothing above it
      depends on these files.</p>`);
  } else if (volShown.length === 0) {
    display(html`<p class="chart-note">No venue selected.</p>`);
  } else {
    const flat = volShown.flatMap(v => v.rows.map(d => ({...d, value: volValue(d)})));
    // One row per bin carrying every selected venue, so a single hover compares
    // them — the comparison this chart exists for. Keyed on the bin, which is
    // unique per venue by the check above, so no venue can overwrite another.
    const pivot = VOL_BINS.map(b => {
      const o = {mid: b + 2.5, bin: b};
      for (const v of volShown) {
        const r = v.rows.find(d => d.price_bin === b);
        if (r) o[v.name] = volValue(r);
      }
      return o;
    });
    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width,
      height: 380,
      marginLeft: 62,
      marginRight: 16,
      x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
      y: {label: `Share of the venue's ${volMeasure.toLowerCase()} (%)`, grid: true,
          tickFormat: d => d + "%"},
      color: {legend: true, domain: volDomainNames, range: volDomainColors},
      marks: [
        Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
        // There ARE connecting lines here and there are deliberately none on the
        // charts above, and the reason is not stylistic: those are estimates with
        // sampling error, so a line would assert a smooth curve the sample cannot
        // support. These are censuses — every print the venue published — so the
        // only uncertainty is which bin a price falls in, and the line is honest.
        Plot.line(flat, {
          x: d => d.price_bin + 2.5, y: "value",
          stroke: "venue", strokeWidth: 1.9, curve: "monotone-x"
        }),
        Plot.dot(flat, {x: d => d.price_bin + 2.5, y: "value", fill: "venue", r: 2.6}),
        Plot.ruleX(pivot, Plot.pointerX({x: "mid", stroke: "currentColor", strokeOpacity: 0.2})),
        Plot.tip(pivot, Plot.pointerX({
          x: "mid",
          title: d => [
            `${d.bin}–${d.bin + 5}¢`,
            ...volDomainNames.map(n => d[n] == null ? null
              : `${n}: ${d[n].toFixed(2)}% of ${volMeasure.toLowerCase()}`)
          ].filter(Boolean).join("\n")
        }))
      ]
    }));
  }
}
```

```js
// The headline in one live sentence, per venue, computed rather than quoted —
// a fixed figure here would stop reproducing the first time a corpus grew.
if (volShown.length > 0) {
  const band = (v, lo, hi) => ({
    c: d3.sum(v.rows.filter(d => d.price_bin >= lo && d.price_bin < hi), d => d.pctContracts),
    d: d3.sum(v.rows.filter(d => d.price_bin >= lo && d.price_bin < hi), d => d.pctDollars)
  });
  const rows = volShown.map(v => ({v, lo: band(v, 0, 10), mid: band(v, 40, 60), hi: band(v, 90, 100)}));
  const worst = rows.filter(r => r.lo.d > 0).sort((a, b) => (b.lo.c / b.lo.d) - (a.lo.c / a.lo.d))[0];
  const pc = x => `${x.toFixed(1)}%`;
  display(html`<table style="width:100%;border-collapse:collapse;font-size:0.92em;margin-top:0.4rem">
    <thead><tr style="text-align:left;border-bottom:1px solid var(--theme-foreground-faint)">
      <th style="padding:0.45rem 0.6rem 0.45rem 0">Venue</th>
      <th style="padding:0.45rem 0.6rem">Cheap tail &lt; 10&cent;</th>
      <th style="padding:0.45rem 0.6rem">Middle 40&ndash;60&cent;</th>
      <th style="padding:0.45rem 0.6rem">Dear tail &ge; 90&cent;</th>
    </tr>
    <tr style="text-align:left;font-size:0.85em;color:var(--theme-foreground-muted);border-bottom:1px solid var(--theme-foreground-faint)">
      <th style="padding:0.2rem 0.6rem 0.35rem 0"></th>
      <th style="padding:0.2rem 0.6rem 0.35rem">contracts / dollars</th>
      <th style="padding:0.2rem 0.6rem 0.35rem">contracts / dollars</th>
      <th style="padding:0.2rem 0.6rem 0.35rem">contracts / dollars</th>
    </tr></thead>
    <tbody>${rows.map(({v, lo, mid, hi}) => html`<tr style="border-bottom:1px solid var(--theme-foreground-faint)">
      <td style="padding:0.45rem 0.6rem 0.45rem 0"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${v.color};margin-right:6px"></span>${v.name}</td>
      <td style="padding:0.45rem 0.6rem">${pc(lo.c)} <span style="color:var(--theme-foreground-muted)">/ ${pc(lo.d)}</span></td>
      <td style="padding:0.45rem 0.6rem">${pc(mid.c)} <span style="color:var(--theme-foreground-muted)">/ ${pc(mid.d)}</span></td>
      <td style="padding:0.45rem 0.6rem">${pc(hi.c)} <span style="color:var(--theme-foreground-muted)">/ ${pc(hi.d)}</span></td>
    </tr>`)}</tbody>
  </table>`);
  display(html`<p class="chart-note">${worst ? html`The widest gap on the chart is <strong>${worst.v.name}</strong>:
    the whole book below 10&cent; is <strong>${pc(worst.lo.c)} of its contracts and ${pc(worst.lo.d)} of its
    dollars</strong>, a ${(worst.lo.c / worst.lo.d).toFixed(0)}-fold difference between the two ways of
    counting the same trades. ` : ""}Most of that ratio is arithmetic — cheap contracts cost little — so the
    number to read is not the ratio but the <em>level</em>: how much of a venue's money is in the cheap tail
    at all. In every venue drawn here it is a low single-digit percentage, which is what makes the overlay
    below worth looking at.</p>`);

  // ProphetX's distinctive result on this panel, computed live rather than
  // frozen so it cannot rot as the tape grows -- the same rule as the table
  // above. Two things are said together, deliberately: the DEAR tail is the
  // finding, and the middle-heaviness is NOT one. A reader shown only "half its
  // volume sits at even odds" will conclude this book is better balanced than
  // its peers, and the venue's own market mix is a sufficient explanation, so
  // publishing the first number without the second would be misleading.
  const px = volShown.find(v => v.name === "ProphetX");
  if (px) {
    const pxHi = band(px, 90, 100), pxMid = band(px, 40, 60);
    const rivals = rows.filter(r => r.v.name !== "ProphetX");
    const nextThin = rivals.slice().sort((a, b) => a.hi.c - b.hi.c)[0];
    const kalshiRow = rivals.find(r => r.v.name === "Kalshi");
    // Named live, so the claim degrades to silence rather than to a falsehood if
    // another venue ever sits further into the middle than this one does.
    const fatterMid = rivals.filter(r => r.mid.c > pxMid.c).map(r => r.v.name);
    const p2 = x => `${x.toFixed(2)}%`;
    display(html`<p class="chart-note"><strong>ProphetX has the thinnest dear tail on this chart.</strong>
      Just ${p2(pxHi.c)} of its contracts trade at 90&cent; or above${kalshiRow ? html`, against
      ${p2(kalshiRow.hi.c)} at Kalshi` : ""}${nextThin && (!kalshiRow || nextThin.v.name !== "Kalshi") ? html`
      and ${p2(nextThin.hi.c)} at ${nextThin.v.name}, the next thinnest venue drawn` : ""} &mdash; and
      ${pc(pxMid.c)} of them sit in the 40&ndash;60&cent; middle.
      <strong>Read the middle as a product mix, not as a verdict on its pricing.</strong> Recounted from the
      venue's own trade tape on 2026-08-14, game spreads and totals &mdash; lines an oddsmaker sets so that
      both sides sit near a coin flip &mdash; are 32.3% of the contracts binned here, and they fall 67.0% and
      76.7% inside the 40&ndash;60&cent; band by construction. Head-to-head moneylines, the only markets where
      the home-side reading above applies at all, are 30.8% of the volume, or 34.0% counting three-way
      moneylines. This sentence previously read 42.9% and 32.2%, and neither figure reproduced: the 42.9%
      came from classifying on the contract-id token, which sweeps every player over/under into the same bucket
      as a game line. Those are props, not lines set to sit at a coin flip, and they are counted on their own
      here &mdash; 11.6% of contracts, 53.6% of them in the middle band.
      ${fatterMid.length ? html`${fatterMid.join(" and ")} ${fatterMid.length === 1 ? "sits" : "sit"} further
      into the middle still, so this is not the most even-odds book on the chart. ` : ""}The cheap tail is
      the same fact seen from the other end: multi-event parlays (11.8% of contracts, 49.1% of them under
      10&cent;) and outright markets, almost all of them golf tournament winners (9.5% of contracts, 94.1%
      of them under 10&cent;) are very nearly all of it. Neither can be filtered out here &mdash; the
      published volume file carries no split to filter on, although the raw tape does &mdash; which is why
      they are named instead.</p>`);
  }
}
```

### Is the mispricing where the money is?

<p class="section-intro">The payoff for having built both. Same signed calibration error as the panel chart above, in cents, with every dot <strong>sized by how much of that venue's volume sits in the bin</strong>. A large solid dot far from zero is a bin that is both measurably mispriced and worth money. A large dot <em>on</em> zero is a venue that is priced correctly where it trades. The common case &mdash; and the finding &mdash; is a small dot a long way from zero: a real bias in a corner of the book that barely anyone's money is in.</p>

```js
// The overlay JOIN. Left: this section's volume rows. Right: the calibration rows
// already normalised at the top of this page, taken from `built` rather than from
// `rowsAll` so the venue checkboxes up there cannot silently empty this chart —
// it still follows the Sample toggle, which is a real methodological choice.
//
// count(*) vs count(distinct venue|price_bin) on the RIGHT side, before the Map is
// built. A Map cannot fan out, but it also cannot warn: a duplicated key would
// simply keep the last row and this chart would draw a curve nobody chose. So the
// duplicate count decides whether the chart is drawn at all.
const volCalibRows = built.filter(v => v.usable).flatMap(v => v.rows);
const volCalibDup = volCalibRows.length
  - new Set(volCalibRows.map(d => `${d.venue}|${d.price_bin}`)).size;
const volCalibByKey = volCalibDup === 0
  ? new Map(volCalibRows.map(d => [`${d.venue}|${d.price_bin}`, d]))
  : null;

// Which calibration group each venue's CURVE is actually drawn on, taken from
// `built` so it follows the Sample toggle. The coverage number a producer ships
// was computed over ONE named group; if the page is drawing a different one the
// number does not describe what is on screen and must not be shown.
const volCalibGroupByVenue = new Map(built.filter(v => v.usable).map(v => [v.name, v.group]));
```

```js
{
  const noCal = volShown.filter(v => !volCalibRows.some(d => d.venue === v.name));
  const overlay = volCalibByKey == null ? [] : volShown.flatMap(v => v.rows
    .map(r => {
      const c = volCalibByKey.get(`${v.name}|${r.price_bin}`);
      return c == null ? null : {...r, err: c.err, se: c.se, n_events: c.n_events,
                                 n_eff: c.n_eff, reliable: c.reliable, clears: c.clears};
    })
    .filter(Boolean));
  const names = volShown.map(v => v.name).filter(n => overlay.some(d => d.venue === n));

  if (volCalibByKey == null) {
    display(html`<p class="chart-note">The calibration series carries ${volCalibDup} duplicated
      venue-and-bin key${volCalibDup === 1 ? "" : "s"}, so this overlay is not drawn: pairing volume
      against a curve with two rows on one bin would quietly pick whichever came last.</p>`);
  } else if (names.length === 0) {
    display(html`<p class="chart-note">Nothing to overlay yet — no venue currently has both a
      calibration curve and a volume-at-price file.</p>`);
  } else {
    // Dot area is proportional to the venue's share of the selected measure in
    // that bin. radius = R * sqrt(share / maxShare) and the r scale is IDENTITY.
    // Passing an already-square-rooted value into Plot's DEFAULT r scale — which
    // is itself a sqrt scale — renders radius proportional to the fourth root of
    // the quantity and makes an "area proportional to" legend simply false. That
    // has shipped on this site once already.
    //
    // Unlike the event-count dots above, ONE scale is shared across all panels
    // here, and that is correct: these are shares of each venue's own total, so
    // 6% at one venue is the same object as 6% at another. Event counts are not.
    // The largest dot's diameter has to stay inside one bin's width or the panels
    // turn into overlapping blobs on a phone: bins are 5c apart, which is width/20
    // pixels, so cap the radius at about width/60 and never exceed 15.
    const R = Math.max(6, Math.min(15, width / 60));
    const maxShare = d3.max(overlay, volValue) || 1;
    const sized = overlay.map(d => ({...d, radius: R * Math.sqrt(Math.max(volValue(d), 0) / maxShare)}));
    const clearsRows = sized.filter(d => d.clears);
    const noiseRows2 = sized.filter(d => !d.clears && d.reliable);
    const unmeasRows2 = sized.filter(d => !d.reliable);
    const span = d3.max(sized, d => Math.abs(100 * d.err)) ?? 5;
    const lim = Math.max(5, Math.ceil(span + 1));
    const unit = volMeasure.toLowerCase();

    const caps = names.map(n => {
      const rs = sized.filter(d => d.venue === n);
      const covered = d3.sum(rs, volValue);
      const hit = d3.sum(rs.filter(d => d.clears), volValue);
      const k = rs.filter(d => d.clears).length;
      return {
        venue: n,
        text: k === 0
          ? `${n} — no bin clears 2 clustered SE, so no share of its ${unit} is measurably mispriced`
          : `${n} — the ${k} bin${k === 1 ? "" : "s"} clearing 2 clustered SE `
            + `${k === 1 ? "holds" : "hold"} ${hit.toFixed(1)}% of its ${unit}`
            + (covered < 99.5 ? ` (of the ${covered.toFixed(1)}% this overlay can cover)` : "")
      };
    });

    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width,
      height: 40 + 165 * names.length,
      marginLeft: 62,
      marginRight: 16,
      marginTop: 10,
      x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
      y: {label: "Calibration error, actual − implied (¢)", domain: [-lim, lim], grid: true},
      fy: {label: null, domain: names},
      r: {type: "identity"},
      color: {domain: volDomainNames, range: volDomainColors},
      marks: [
        Plot.frame({stroke: "var(--theme-foreground-fainter)"}),
        Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeOpacity: 0.55, strokeWidth: 1}),
        Plot.dot(sized, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err, r: "radius",
          fill: "venue", fillOpacity: 0.92,
          stroke: "var(--theme-background)", strokeWidth: 1.2
        }),
        Plot.text(caps, {
          fy: "venue", text: "text", frameAnchor: "top-left",
          dx: 6, dy: 8, fontSize: 11, fill: "currentColor", fillOpacity: 0.75
        }),
        Plot.dot(sized, {
          fy: "venue", x: d => d.price_bin + 2.5, y: d => 100 * d.err,
          r: 9, fill: "transparent", tip: true,
          title: d => [
            `${d.venue} — ${d.price_bin}–${d.price_bin + 5}¢`,
            `Volume: ${d.pctContracts.toFixed(2)}% of contracts · ${d.pctDollars.toFixed(2)}% of dollars`,
            `${fmtInt(d.contracts)} contracts · ${volMoney(d.dollars)}`,
            `Calibration error ${fmtCents(100 * d.err)} ± ${(200 * d.se).toFixed(2)}¢ (2 event-clustered SE)`,
            // Shown ONLY when the producer's coverage was computed over the same
            // calibration group this page is drawing, and always labelled with it.
            d.coverage != null && d.covGroup != null
              && d.covGroup === volCalibGroupByVenue.get(d.venue)
              ? `Calibration group ${d.covGroup} draws ${d.coverage.toFixed(1)}% of this bin's contracts`
              : null,
            !d.reliable ? "TOO FEW INDEPENDENT EVENTS — standard error unreliable"
              : d.clears ? "Clears 2 event-clustered SE"
                         : "NOT distinguishable from perfectly calibrated"
          ].filter(Boolean).join("\n")
        })
      ]
    }));

    display(html`<p class="chart-note"><strong>Dot area &prop; share of the venue's ${unit} in that bin</strong>
      &mdash; not events, as in the charts higher up the page. Every bin is drawn the same way,
      as everywhere else on this page: how precisely one is pinned down is carried by its interval,
      not by withholding or hollowing the mark. One radius scale is shared across all panels,
      because a share of a venue's own volume means the same thing at every venue.
      ${noCal.length ? html`<strong>Not in this overlay:</strong> ${noCal.map(v => html`<span>${v.name} &mdash;
      ${v.noCalibration ?? "it has no calibration curve on this page"}. </span>`)}It is still drawn on the
      volume chart above; only the vertical axis here is unavailable to it.` : ""}</p>`);

    display(html`<p class="chart-note"><strong>The populations are not the same, and the gap is widest exactly
      where this section is pointing.</strong> A dot's height comes from settled, attributable contracts; its
      size comes from the whole tape. Every calibration curve on this page is settlement-dependent by
      construction, and the contracts it can score are not a random sample of the contracts that traded &mdash;
      multi-outcome longshot fields are the first thing an outcome join drops, and they are the bulk of the
      cheap tail. On the series drawn here the Polymarket curve scores <strong>73.8%</strong> of that venue's
      contracts overall but only <strong>35.0% in the 0&ndash;5&cent; bin</strong>, and the ForecastEx curve
      scores just <strong>49.9%</strong> of its venue's contracts, falling to 26.7% in one bin, because a
      single large election event is excluded from it. ProphetX is the sharpest case of all, and its gap is
      structural rather than statistical: its dot <em>sizes</em> include 31,899,248 multi-event parlay
      contracts, 11.77% of the venue, that no calibration curve can ever score &mdash; none of the 80,543
      parlay contract ids in its bulletin carries a parseable event date &mdash; while its dot
      <em>heights</em> come from a curve covering <strong>80.1%</strong> of the venue's single-market
      contracts and none of its parlays at all. That last one matters for the reading above: ForecastEx
      is the venue whose measurable bins carry as much money as they do volume, and that curve is built from
      half its traded volume. Per-bin coverage appears in the tooltip only where a producer publishes it
      <em>for the same calibration group this page is drawing</em>; otherwise it is withheld rather than
      quoted against the wrong population. Read a large dot as "this much volume traded in this price band",
      not as "this much volume was scored".</p>`);
  }
}
```

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Volume by 5-cent price bin, on the same integer-cent bin edges as every other chart on this page, so the three layers &mdash; where volume is, whether the price was right, and what it cost to trade there &mdash; compose on one axis. Shares are computed on this page from the contract and dollar columns of the rows drawn, and cross-checked against each producer's own percentage columns; a disagreement is reported above rather than smoothed over. <strong>Dollars are premium paid</strong> &mdash; price &times; quantity, in USD, at venues whose contracts settle at $1.00 &mdash; and they are not fee-adjusted; ForecastEx's pre-May-2026 pair prices have the exchange's penny baked into the traded price rather than charged separately (yes + no = $1.01), so its dollars are premium-plus-fee over most of its history &mdash; and that wedge moves <strong>bin placement, not only dollars</strong>: 77.0% of its prints sit up to a cent high relative to the probability they represent, which pushes mass toward the dear tail, which is exactly where this venue's distinctive result lives. Quantities are genuinely fractional at Polymarket US, Underdog Exchange and ProphetX and are never rounded to whole contracts. <strong>Whose price is on the x-axis differs by venue</strong> and is stated per venue in the freshness panel: Kalshi bins the taker's own side, Polymarket US, DKeX and Underdog Exchange bin the leg their symbol names because none of them publishes an aggressor flag, ForecastEx has no aggressor at all &mdash; it matches a YES buyer against a NO buyer and both pay &mdash; so it is drawn on its YES leg, and ProphetX publishes a single price per market describing both sides, which on a head-to-head moneyline is the probability of the second-named (home) side with the away side at one minus it, so only the home half of that venue is drawn. These are one definitional step apart and the levels should not be compared as though they were identical constructions. All-time distributions only: no date filter is offered, deliberately, because two of these venues publish 17:00&ndash;17:00 ET business-day files in which a large minority of rows traded on the previous calendar day, which is harmless for an all-time distribution and wrong for a date-sliced one.</p>

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
  // styles.css defines --accent-kalshi/polymarket/forecastex/dkex/underdog and a
  // .kpi-card[data-accent="..."] rule for each, but NOTHING for prophetx: that card
  // would fall through to var(--accent-primary) and render in Kalshi teal, which is
  // worse than no colour. The stylesheet is not this page's to edit, so the missing
  // variable is supplied inline and ONLY for a venue that has none -- setting it for
  // every card would override the stylesheet's dark-mode accent overrides for the
  // four venues that do have them.
  const KPI_ACCENT_IN_CSS = new Set(["kalshi", "polymarket", "forecastex", "dkex", "underdog"]);
  display(html`<div class="kpi-grid">${cards.map(c => html`<div class="kpi-card" data-accent="${c.v.accent}" style="${KPI_ACCENT_IN_CSS.has(c.v.accent) ? "" : `--kpi-accent:${c.v.color}`}">
    <div class="kpi-label">${c.v.name}</div>
    <div class="kpi-value">${c.infl ? c.infl.toFixed(0) + "×" : "—"}</div>
    <div class="kpi-meta">wider than a trade-level error bar &middot; ${c.clears} of ${c.bins} bins clear 2 SE</div>
    <div class="kpi-meta">${fmtInt(c.events)} events in the largest bin${c.eff != null ? `, effective floor ${fmtInt(c.eff)}` : ""} &middot; ${fmtInt(c.trades)} prints</div>
  </div>`)}</div>`);
}
```

<div class="instruction-line"><strong>Effective events, where a venue publishes them, are the number to believe.</strong> Contract weighting concentrates a bin's weight on its busiest games, so a bin holding tens of thousands of nominal events can carry the independent information of a few hundred. Where that effective count falls below ${MIN_EFF_CLUSTERS} the bin is flagged in its tooltip as resting on too few independent events. It is still drawn, and still the best estimate of that bin &mdash; a wide interval is not a disqualification.</div>

<p style="font-size:0.82em;color:#888;margin-top:1.5rem">Contract-weighted win rates over settled binary contracts, binned in 5-cent floors on an integer-cent axis so every venue shares one x-axis. Implied probability is the bin midpoint at Kalshi, Polymarket US, ForecastEx and DKeX; <strong>ProphetX and Crypto.com is drawn on the contract-weighted mean price actually paid</strong> in each bin (its file's <code>sum_price_contracts / n_contracts</code>), because that is the one venue where the two conventions disagree about whether there is anything to report at all &mdash; the reason is set out in full at the top of this page, and the x-axis label names the exception too. Standard errors are cluster-robust with the underlying event as the cluster &mdash; a Kalshi event ticker, a DKeX game or race, a Polymarket contest, a ForecastEx settlement event, a ProphetX fixture (the game, tournament or bout named in the contract description, so a game's player props cluster with its own moneyline rather than forming their own pseudo-events) &mdash; computed by each venue's own producer and re-tested here against one common rule. Voids and refunded events are excluded by each producer before binning, because a refunded event has no outcome, and the size of that exclusion is worth stating. DKeX drops 3,941 void prints, 1,366 pro-rated partials and 557 prints on markets that had not settled &mdash; 0.43% of its tape as of 2026-08-07 &mdash; and scoring those voids as wins instead moved its 10&ndash;20&cent; band from &minus;0.67&cent; to +4.01&cent;. Polymarket US reaches a resolved, unambiguously attributable market on 89.8% of prints and 89.4% of traded value: 2.11% is dropped because the symbol names more than one contract, and the 1.46% delisted before maturity is reported as its own band rather than counted as losses. ForecastEx counts a contract as settled only where its mark on or after expiry is exactly 0.00 or 1.00 &mdash; 168,912 of 203,776 expired contracts &mdash; which removes whole crypto and metals families but touches only 3.5% of the weather book. ProphetX resolves 63,915 of its listed single-market contracts and excludes 11,536 void or pushed and 2,742 still listed, plus 657 prints on contracts never seen in a bulletin and 102 off-scale, and that exclusion is not evenly spread: void or pushed contracts are 24.5% of the contracts traded in the 0&ndash;10&cent; band and 22.9% of those in the 90&ndash;100&cent; band, against 9.8&ndash;19.9% across the middle of the book. The two ends are conditioned by different products &mdash; 93.0% of the voided volume in the cheap band is golf-outright fields, where a withdrawal voids the contract, while 57.2% of it in the dear band is moneylines &mdash; and the dear end is also the thinnest place on the venue, 655,132 contracts in the 95&ndash;100&cent; bin against 36,675,101 at 50&ndash;55&cent;. Read both ProphetX tails as the most conditioned bins it has. The naive comparison figure is the binomial error over prints at each bin's win rate, computed identically for every venue rather than read from four differently-defined columns. Traded value and per-side fee comparisons live on the <a href="./competitors">Platform Comparison</a> page; this page uses no fee number at all.</p>
