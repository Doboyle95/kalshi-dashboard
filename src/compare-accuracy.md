---
title: Accuracy & Outcomes
---

<div class="page-hero">
  <div class="page-eyebrow">Compare</div>
  <h1>Accuracy & Outcomes</h1>
  <p class="page-lead">Whether traded prices match eventual outcomes, using the strongest settled sample each venue can support.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {VENUE_COLORS} from "./components/venue-data.js";
import {fileUpdatedAt, freshnessPanel} from "./components/freshness.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const freshness = await DataAttachment("data/freshness_manifest.json").json();
const kCurve = await DataAttachment("data/calibration_three_way.csv").csv({typed: true});
const kClusters = await DataAttachment("data/calibration_three_way_clusters.csv").csv({typed: true});
const pm = await DataAttachment("data/calibration_polymarket.csv").csv({typed: true});
const fx = await DataAttachment("data/forecastex_calibration.csv").csv({typed: true});
const dk = await DataAttachment("data/dkex_calibration.csv").csv({typed: true});
const px = await DataAttachment("data/prophetx_calibration.csv").csv({typed: true});
// THE WHOLE CONTRACT SUITE, not just parlays. Calibration asks whether a contract
// trading at price p resolves that way p% of the time, which needs no aggressor flag --
// so crypto strikes, sports events and combos all qualify. (P&L is the opposite case and
// stays parlays-only: buyer-equals-taker holds only for a house-quoted combo.)
const nd = await DataAttachment("data/nadex_calibration.csv").csv({typed: true});
// Novig STRAIGHT contracts, added 2026-08-17. Loaded on a SECOND attachment instance with a
// try/catch so that until novig_calibration.csv reaches the transport allowlist this page
// renders every other venue instead of erroring outright. Same pattern, same reasoning as
// novig.md's fee section.
const NovigCal = createRemoteDataAttachment(d3);
const nv = await (async () => {
  try { return await NovigCal("data/novig_calibration.csv").csv({typed: true}); }
  catch (error) { console.warn(`novig calibration unavailable — ${String(error?.message ?? error).slice(0, 160)}`); return []; }
})();

// Cross-venue P&L, rehomed here 2026-08-24. /pnl-venues was DELETED on 2026-08-20 and its
// charts were not moved anywhere, so competitor_pnl_by_bin.csv has been published to no
// reader since. A calibration curve says a market was mispriced; these say what the
// mispricing cost the people on the other side of it. Same venues, same price axis, so they
// belong under the curve rather than on a page of their own.
// Reuses the DataAttachment above -- declaring a second one collides.
const pnl = await DataAttachment("data/competitor_pnl_by_bin.csv").csv({typed: true});
// Parlay detail carries the disclosure fields the shared schema drops: resolved share,
// effective sample size, interval.
const parlayDetail = await DataAttachment("data/polymarket_parlay_pnl.csv").csv({typed: true});

const number = value => value == null || value === "" || Number.isNaN(+value) ? null : +value;
const kClusterMap = new Map(kClusters.map(d => [`${d.group}|${d.price_bin}`, d]));
// ONE BASIS FOR EVERY VENUE: x is the contract-weighted price ACTUALLY PAID inside the bin,
// never the bin midpoint. Mixing the two is not a like-for-like comparison -- on Kalshi the
// midpoint sits ~1.3c above the paid price in the 0-5c bin alone, which manufactures a
// longshot bias that is not there. As of 2026-08-21 EVERY venue here can do this: the
// Polymarket producer now publishes sum_price_contracts too, so the "(midpoint)" label
// this page used to carry for it is retired rather than merely hidden.
const PM_MIDPOINT = "Polymarket US (midpoint)";
const normalized = [
  ...kCurve.filter(d => d.group === "ALL").map(d => {
    // mean_price_chk (cents) and calib_error_mean are the clusters file's paid-price pair;
    // se_calib_error is the SE that matches it (se_calib_error_mid belongs to the midpoint).
    const cluster = kClusterMap.get(`${d.group}|${d.price_bin}`);
    const meanPrice = number(cluster?.mean_price_chk);
    return {venue: "Kalshi", bin: +d.price_bin, implied: meanPrice == null ? null : meanPrice / 100, actual: number(cluster?.actual_win_rate_chk ?? d.actual_win_rate_wt), error: number(cluster?.calib_error_mean), se: number(cluster?.se_calib_error), events: number(cluster?.n_effective ?? cluster?.n_events), contracts: number(cluster?.n_contracts_chk ?? d.n_contracts)};
  }),
  // calibration_polymarket.csv sums sum_price_MIDPOINT -- there is no paid-price column to
  // switch to, so this venue is labelled rather than silently compared against the others.
  // calibration_polymarket.csv gained sum_price_contracts on 2026-08-21; before that it
  // summed the MIDPOINT only, which is why this venue was previously labelled apart.
  // Fall back to implied_prob if an older generation is being served, and say so.
  ...pm.filter(d => d.group === "ALL_DEEP").map(d => {
    const contracts = number(d.n_contracts), sumPrice = number(d.sum_price_contracts), actual = number(d.actual_win_rate_wt);
    const paid = contracts > 0 && sumPrice != null ? sumPrice / contracts / 100 : null;
    const implied = paid ?? number(d.implied_prob);
    return {venue: paid == null ? PM_MIDPOINT : "Polymarket US", bin: +d.price_bin, implied, actual, error: implied == null || actual == null ? null : actual - implied, se: number(d.se_wt), events: number(d.n_events_eff ?? d.n_events), contracts};
  }),
  ...fx.filter(d => d.group === "ALL_EX_ELECTION").map(d => {
    // calib_error_qty is ForecastEx's own CONTRACT-weighted error; adding it back to the
    // contract-weighted win rate recovers the paid price. Its implied_prob column is
    // TRADE-weighted, which would put x and y on different weightings.
    const actual = number(d.actual_win_rate_wt), error = number(d.calib_error_qty), seCents = number(d.se_event_cents_qty);
    return {venue: "ForecastEx", bin: +d.price_bin, implied: actual == null || error == null ? null : actual - error, actual, error, se: seCents == null ? null : seCents / 100, events: number(d.g_eff ?? d.n_events), contracts: number(d.n_contracts)};
  }),
  // DKeX is STRAIGHTS ONLY here, and by construction rather than by filter:
  // calibration_event_key needs four dash-fields and a COMBO- symbol has two, so
  // every combo print is dropped before dkex_calibration.csv is written. The
  // group "ALL" therefore means all SINGLE markets. Combo outcomes live in
  // dkex_parlay_pnl.csv and on /dkex-parlays.
  ...dk.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => {
    const contracts = number(d.n_contracts), sumPrice = number(d.sum_price_contracts), actual = number(d.actual_win_rate_wt);
    const implied = contracts > 0 && sumPrice != null ? sumPrice / contracts / 100 : null;
    return {venue: "DKeX", bin: +d.price_bin, implied, actual, error: implied == null || actual == null ? null : actual - implied, se: number(d.se_clustered), events: number(d.n_events), contracts};
  }),
  ...px.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => {
    const contracts = number(d.n_contracts), sumPrice = number(d.sum_price_contracts), actual = number(d.actual_win_rate_wt);
    const implied = contracts > 0 && sumPrice != null ? sumPrice / contracts / 100 : null;
    return {venue: "ProphetX", bin: +d.price_bin, implied, actual, error: implied == null || actual == null ? null : actual - implied, se: number(d.se_clustered), events: number(d.n_events), contracts};
  }),
  // x is the CONTRACT-WEIGHTED PRICE ACTUALLY PAID off Nadex's own tape, not a bin
  // midpoint, and n_eff counts effective CONTRACTS rather than prints -- one contract can
  // print dozens of times and every print shares a single settlement.
  // COVERAGE: only ~64% of Nadex contracts reach a matched settlement in this file, and the
  // missing third is mostly COMBOS (parlays) -- flagged in the intro under the first chart.
  ...nd.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => ({venue: "Crypto.com/Nadex", bin: +d.price_bin, implied: number(d.implied), actual: number(d.actual), error: number(d.calib_error), se: number(d.se_calib_error), events: number(d.n_eff), contracts: number(d.contracts)})),
  // Novig STRAIGHT contracts only -- parlays never resolve in this feed. As on DKeX and
  // ProphetX, x is the CONTRACT-WEIGHTED PRICE ACTUALLY PAID (sum_price_contracts / contracts),
  // not the bin midpoint, so the error is the true miscalibration and not a midpoint artefact.
  // The cluster is the fixture (eventId); se_clustered is the same sandwich as DKeX/ProphetX.
  ...nv.filter(d => d.group === "ALL" && (d.bin_width == null || +d.bin_width === 5)).map(d => {
    const contracts = number(d.n_contracts), sumPrice = number(d.sum_price_contracts), actual = number(d.actual_win_rate_wt);
    const implied = contracts > 0 && sumPrice != null ? sumPrice / contracts / 100 : null;
    return {venue: "Novig", bin: +d.price_bin, implied, actual, error: implied == null || actual == null ? null : actual - implied, se: number(d.se_clustered), events: number(d.n_events), contracts};
  })
].filter(d => Number.isFinite(d.bin) && d.implied != null && d.actual != null && d.error != null && d.se != null);

const venues = Array.from(new Set(normalized.map(d => d.venue)));
const colorOf = venue => VENUE_COLORS[venue === PM_MIDPOINT ? "Polymarket US" : venue];
```

```js
display(freshnessPanel({
  items: [
    {label: "Kalshi", value: "Settlement cycle", updatedAt: fileUpdatedAt(freshness, "calibration_three_way_clusters.csv"), tone: "settlement"},
    {label: "DKeX", value: "Daily", updatedAt: fileUpdatedAt(freshness, "dkex_calibration.csv"), tone: "competitor"},
    {label: "ProphetX", value: "Daily", updatedAt: fileUpdatedAt(freshness, "prophetx_calibration.csv"), tone: "competitor"},
    {label: "Novig", value: "Daily", updatedAt: fileUpdatedAt(freshness, "novig_calibration.csv"), tone: "competitor"},
    // nadex_calibration.csv is served but is NOT a key in freshness_manifest.json, so this
    // card shows no timestamp until the producer adds it; do not substitute a sibling file.
    {label: "Crypto.com/Nadex", value: "Bulletin rebuild", updatedAt: fileUpdatedAt(freshness, "nadex_calibration.csv"), tone: "competitor"},
    {label: "Polymarket US", value: "Hand-built", updatedAt: fileUpdatedAt(freshness, "calibration_polymarket.csv"), tone: "local"},
    {label: "ForecastEx", value: "Hand-built", updatedAt: fileUpdatedAt(freshness, "forecastex_calibration.csv"), tone: "local"}
  ],
  note: "Polymarket US and ForecastEx are rebuilt by hand and lag the daily venues."
}));
```

<div class="control-strip">

```js
const selectedAccuracyVenues = view(Inputs.checkbox(venues, {label: "Venues", value: venues}));
```

</div>

```js
const accuracyRows = normalized.filter(d => selectedAccuracyVenues.includes(d.venue));
```

## Actual vs implied win rate

<p class="section-intro">Every venue sits at the contract-weighted price actually paid; Crypto.com/Nadex covers the ~64% of its contracts that match a settlement here, the missing third mostly combos, and the DKeX bar is single markets only &mdash; its combos carry no event key and are excluded by construction.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: Math.max(360, Math.min(520, width * 0.8)),
  marginLeft: 58, marginRight: 20, marginBottom: 50,
  x: {label: "Implied probability", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  y: {label: "Actual win rate", domain: [0, 1], tickFormat: d => `${Math.round(100 * d)}%`, grid: true},
  color: {legend: true, domain: venues, range: venues.map(colorOf)},
  marks: [
    Plot.line([{implied: 0, actual: 0}, {implied: 1, actual: 1}], {x: "implied", y: "actual", stroke: "var(--theme-foreground-muted)", strokeDasharray: "4,3", strokeWidth: 1.5}),
    Plot.dot(accuracyRows, {x: "implied", y: "actual", fill: "venue", r: 5, fillOpacity: 0.78, stroke: "var(--theme-background)", strokeWidth: 0.9, tip: true, title: d => `${d.venue}\n${Math.round(100*d.implied)}¢ implied · ${(100*d.actual).toFixed(1)}% actual\n${Math.round(d.events ?? 0).toLocaleString()} effective/independent events`})
  ]
})
```

<div class="instruction-line"><strong>Per contract, not percent.</strong> A loss expressed as a share of stake flatters cheap contracts: the same 2&cent; is 2% of a 100&cent; favourite and 20% of a 10&cent; longshot. Every headline below is <strong>cents per contract</strong>, which is comparable across venues and across price. Percent-of-stake is in the table.</div>

```js
// Colour follows the venue, everywhere on this site and never the rank, so a filter that
// drops a venue cannot repaint the survivors.
const VENUE_COLOR = {
  "Kalshi": "var(--accent-kalshi)",
  "Polymarket US": "var(--accent-polymarket)",
  "ForecastEx": "var(--accent-forecastex)",
  "DKeX": "var(--accent-dkex)",
  "ProphetX": "#DB2777",
  // Novig, added 2026-08-17 -- the site-wide Novig accent (--accent-novig), matching
  // venue-data.js. Its single-market bar is a TRUE taker series (aggressor flag + settled
  // outcome), so it draws solid alongside Kalshi rather than hollow.
  "Novig": "#6366F1",
  // Without this entry the bar still occupied a row and printed its label, but the
  // colour scale had no value for it so Plot rendered it with NO FILL -- a venue that
  // looked present and measured nothing. var(--accent-nadex) is the accent this site already uses
  // for Crypto.com/Nadex (--accent-nadex in styles.css).
  "Crypto.com": "var(--accent-nadex)"
};

// How each row was priced. This is the single most important thing to disclose, because
// only one of these is exact and the differences are worth real cents.
const BASIS_NOTE = {
  exact_contract_weighted: "exact — every contract is priced at what was actually paid for it, contract-weighted, never at a bin midpoint",
  bin_midpoint: "approximate — priced at the 5¢ bin midpoint, because the venue publishes no contract-weighted price sum",
  venue_price_range_midpoint: "approximate — priced at the midpoint of the venue's own daily traded range"
};

// Whose side of the trade the number describes. Getting this wrong has had to be corrected
// twice on this dashboard, so it is carried on the row rather than inferred in a caption.
const LEG_NOTE = {
  taker: "the aggressor who crossed the spread",
  named: "whoever bought the leg the venue names — NOT necessarily the taker",
  // ProphetX publishes no aggressor flag at all, and its prints are two-sided exchange
  // trades, so there is no taker to name. The venue quotes one nominated side and this
  // is that side's P&L -- a convention, not a fact about who initiated anything.
  priced_home: "the priced side — ProphetX publishes no aggressor flag, so this is the second-named/home side by convention, and the away side's P&L is its exact mirror. NOT taker P&L"
};

// Kept beside LEG_NOTE so a new leg value cannot be rendered under an older one's name:
// the previous ternary silently labelled anything that was not "taker" as "Named leg".
const LEG_LABEL = {taker: "Taker", named: "Named leg", priced_home: "Priced side"};

const GROUP_LABEL = {
  ALL: "All markets",
  PARLAY: "Parlays",
  NON_PARLAY: "Single markets",
  ALL_DEEP: "All markets",
  ALL_EX_ELECTION: "All markets (ex-election)"
};

// GROUP_LABEL is keyed by group alone, which is wrong for exactly one series: ProphetX's
// producer emits group='ALL', but its parlays are excluded by construction, so "All
// markets" would be a false label on the one venue whose missing half is the point.
const SERIES_LABEL = {"ProphetX||ALL": "Single markets"};
const seriesLabel = (venue, group) =>
  `${venue} · ${SERIES_LABEL[`${venue}||${group}`] ?? GROUP_LABEL[group] ?? group}`;

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
      label: seriesLabel(venue, group),
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
// same contracts in one chart, so the aggregate is held out of the comparison and
// reported on its own below. DERIVED, not hardcoded to Kalshi, because both charts on this
// page need this rule and a hardcoded one drifted: the line chart below never got it and
// plotted Kalshi's aggregate on top of its own single-markets series, in the same venue
// colour, for as long as the chart has existed. Derived NARROWLY, too -- ProphetX's producer
// also emits group='ALL', but as its ONLY group, so a blanket "drop every ALL row" would
// delete the one venue whose missing half is the point. Only an aggregate that its own
// halves reconstruct is held out.
const aggregateVenues = new Set(
  Array.from(d3.group(pnl, d => d.venue))
    .filter(([, rows]) => new Set(rows.map(d => d.group)).size > 1)
    .map(([venue]) => venue)
);
const isDoubleCounted = d => d.group === "ALL" && aggregateVenues.has(d.venue);
const headline = rolled.filter(d => !isDoubleCounted(d));
const kalshiAll = rolled.find(d => d.venue === "Kalshi" && d.group === "ALL");

// Derive the prose from the same rows as the table. This used to be a hardcoded
// "two of five" claim long after both the venue set and its price bases changed.
const basisByVenue = d3.rollup(headline, rows => new Set(rows.map(d => d.basis)), d => d.venue);
const exactPnlVenues = Array.from(basisByVenue, ([venue, bases]) => ({venue, bases}))
  .filter(d => d.bases.size === 1 && d.bases.has("exact_contract_weighted"))
  .map(d => d.venue)
  .sort(d3.ascending);
const approximatePnlVenues = Array.from(basisByVenue.keys())
  .filter(venue => !exactPnlVenues.includes(venue))
  .sort(d3.ascending);
const pricingBasisClaim = approximatePnlVenues.length === 0
  ? `All ${basisByVenue.size} venues in the served P&L comparison are priced exactly: every contract is priced at what was actually paid, contract-weighted rather than at a bin midpoint.`
  : `${exactPnlVenues.length} of ${basisByVenue.size} venues in the served P&L comparison are priced exactly (${exactPnlVenues.join(", ")}); the remaining ${approximatePnlVenues.length} (${approximatePnlVenues.join(", ")}) use the approximation disclosed on their rows.`;
const detail0 = parlayDetail[0] ?? {};
```

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Realised, not expected.</strong> Every figure here is what happened: contracts bought, stake paid, payout received, difference taken. That is arithmetic and needs no significance test, which is why nothing on this page is suppressed for having a small sample. It is also why no figure here may be read as an <em>edge</em> without checking how much data stands behind it. Polymarket's parlay series is the sharp case: it is <strong>${(+detail0.pct_resolved || 0).toFixed(0)}% resolved</strong> across a product that launched on 2026-08-06, with an effective sample size of <strong>${(+detail0.eff_n || 0).toFixed(1)}</strong> and a 95% interval of <strong>${(+detail0.ci_lo_pct || 0).toFixed(0)}% to ${(+detail0.ci_hi_pct || 0).toFixed(0)}%</strong> of stake. Those bettors really did lose that money. Nobody should conclude from six days what parlays cost on Polymarket in general.</p>
  <p><strong>Whose P&amp;L.</strong> Kalshi and Novig are the two venues publishing an aggressor flag, so their single-market numbers are the only <em>true taker</em> P&amp;L here. DKeX, Polymarket US and ForecastEx publish one price per print against a symbol naming a leg, with no flag, so theirs is the P&amp;L of whoever bought <em>that leg</em> — labelled <code>named</code> and never called taker. <strong>ProphetX is a third case, and it needed a third label.</strong> Its prints are two-sided exchange trades with a willing counterparty on each side and no aggressor flag anywhere in the feed, and the single price it publishes belongs to one nominated side &mdash; the second-named, home side of the fixture. That series is labelled <code>priced_home</code>: the away side’s P&amp;L is the exact mirror of it, sign for sign, and calling either side the taker would invent a fact the venue does not record. The request-for-quote argument set out next, which makes Polymarket’s parlays genuinely taker P&amp;L, does not carry over &mdash; nobody is lifting a venue’s quote here. <strong>Parlays are the exception:</strong> they are priced by request-for-quote, so the customer lifts a quote the venue makes and the taker is almost always the YES buyer. Polymarket's own feed carries that out exactly — <code>Strike Price</code> is <code>YES</code> on every parlay row, with no NO side listed — so its parlay series is genuinely taker P&amp;L. The producer asserts that property on every run and fails rather than mislabel it.</p>
  <p><strong>Pricing basis.</strong> ${pricingBasisClaim} Every row carries its <code>basis</code>, and the table below renders that field directly.</p>
  <p><strong>What validates the method.</strong> Each exactly-priced venue is aggregated a second way and the two answers are compared on every build. DKeX’s folded series and a payout-minus-cost sum over the same calibration file agree to <strong>one cent on 21,485,019 contracts</strong>; ProphetX’s two published files, built by different aggregation paths, agree to <strong>$6 on $2.28M</strong>, or 0.0003%. Those are checks on the arithmetic, not confirmation of the resolution rules the two paths share — ProphetX’s rule is checked on its own terms instead, and its producer refuses to write anything at all if settlement polarity ever flips. Separately, Polymarket's parlay producer reconciles report and trade-tape volume on every run. The two sources use different date bases, so their price and resolution ratios are not presented as a like-for-like validation.</p>
  <p><strong>Kalshi's aggregate is held out of the chart.</strong> Kalshi publishes an all-markets series as well as its parlay and single-market halves; drawing all three would count the same contracts twice in one comparison. The aggregate is ${kalshiAll ? html`<strong>${fmtCents(kalshiAll.perContract)}</strong> per contract over ${fmtCount(kalshiAll.contracts)} contracts` : "not currently available"}, and is quoted here rather than plotted.</p>
  <p><strong>Four venues were removed from this page on 2026-08-15, and this is why.</strong>
  A P&amp;L answers &ldquo;what did the bettors make&rdquo;. Answering it requires knowing <em>who
  traded</em> &mdash; which side was the aggressor. Only Kalshi and Novig publish that flag per
  trade, and parlays are the one exception, because they are priced by request-for-quote: the
  customer lifts a quote the venue makes, so the taker is the buyer by construction.
  Without an aggressor flag a P&amp;L is not what anyone made. It is a measurement of
  <strong>price bias</strong>, and its mirror side is its exact negation &mdash; if the priced
  side lost 1.19&cent; per contract, the other side gained 1.19&cent;. That is a real and
  interesting quantity, but it belongs to the calibration curve above, where all four removed
  venues are drawn.</p>
  <p><strong>DKeX</strong> &mdash; no aggressor flag (its tape is date, symbol, timestamp, price,
  quantity), and fees reversed the sign outright: +$104,461 gross against roughly $226,986 of
  fees at a cent per contract per side, so those traders were down $122,525. The published
  figure stated the opposite of what a trader experienced.
  <strong>ProphetX</strong> &mdash; no aggressor flag; its single-market number was the priced
  home side against its own settled outcome, which is price bias by another name.
  <strong>Polymarket US single markets</strong> and <strong>ForecastEx</strong> &mdash; neither
  publishes an aggressor field at all; ForecastEx matches a YES buyer against a NO buyer with no
  taker concept. Both were carried as <code>named</code>, which is the pipeline stating in its
  own schema that it does not know who traded.</p>
  <p><strong>Why the venues with big parlay books are still only partly here.</strong> Underdog, Novig,
  Crypto.com/Nadex and ProphetX all run substantial parlay volume, and request-for-quote pricing
  would settle who paid. For most of them the missing half is <em>what happened</em>. Underdog
  gives a closing price and a status that only ever reads &ldquo;Finalized&rdquo; &mdash;
  across 4,972 tickers not one ends at a settled 0 or 1, and of 282 two-sided game-win
  pairs, where exactly one side must win, none shows one winner and one loser. ProphetX carries
  no event date on any of its parlay contracts, so the maturity rule that makes its single
  markets safe cannot be applied. Nadex publishes a daily bulletin with no traded price and no
  per-contract settlement. <strong>Novig is the exception:</strong> its single markets now settle
  to WIN/LOSS in the public GraphQL snapshot and are the taker bar on the chart above; only its
  parlays stay out, because 0 of its COMBO markets ever resolve.</p>
  <p><strong>Which venues are absent, and why.</strong> Underdog runs parlays — its <code>UDXCOMBO</code> is the large majority of its records — and publishes no settlement outcome, so no P&amp;L is constructible for it and none is guessed. Novig's <em>parlays</em> are absent for the same reason (0 of its COMBO markets resolve), but its single markets settle and are the taker bar on the chart above. DKeX <em>did</em> list no parlay product until <strong>2026-08-26</strong>, when it launched multi-leg combos; they are RFQ-quoted, so the buyer is the taker, and their P&amp;L is on the chart above and broken out on <a href="./dkex-parlays">DKeX &middot; Parlays</a>. <strong>ProphetX runs parlays too, and they are absent for a third reason:</strong> not one of the 80,543 distinct <code>MULTI-EVENT-</code> contracts in its bulletin carries a parseable event date, so the maturity test that makes its single markets safe cannot be applied to a parlay at all &mdash; <strong>31,899,248 contracts left out, not estimated</strong>. Their terminal marks are no help either: of the 79,279 ProphetX parlays that settle to exactly 0 or 1, <strong>94.92% mark to 1</strong>, which cannot be a multi-leg win rate, so those marks are not outcomes.</p>
  <p><strong>ProphetX: built, and no measurable edge.</strong> ProphetX has been described as a venue that records <em>that</em> a contract resolved but not <em>which side won</em>. That holds only for its <strong>parlays</strong>. On single markets the outcome is recoverable &mdash; a contract that has been delisted, whose last bulletin session falls on or after its event date, and whose terminal mark is exactly 0 or 1 &mdash; and a P&amp;L series built on that rule is now <strong>on the chart above</strong>, covering 918,445 prints and 191,575,583 contracts across 3,450 distinct fixtures over the 60 sessions from 2026-06-16 to 2026-08-14. <strong>It finds no measurable edge.</strong> The priced side paid 44.15&cent; on average and won 42.96% of the time, and that gap stands at <strong>t&nbsp;=&nbsp;1.50</strong> against a fixture-clustered standard error of 0.79&cent; &mdash; it does not clear two &mdash; while <strong>zero of the 20 price bins</strong> clear two either, once each bin is measured against the price actually paid in it rather than against its midpoint. The money did change hands, and that part is arithmetic; what is missing is any way to tell ProphetX’s quoted side apart from a fair one. Its bar is drawn hollow for exactly that reason, and no per-contract figure on this page should be quoted as a ProphetX edge or ranked against the venues whose figures are measurable.</p>
  <p><strong>What ProphetX still cannot show.</strong> The series covers <strong>80.13% of ProphetX’s single-market contracts</strong> (191,575,583 of 239,095,073). The other 19.87% sits behind 194,030 prints that could not be joined to an outcome &mdash; 193,271 on contracts still unresolved at the end of the window, 657 on contracts never listed in the bulletin, 102 priced off-scale &mdash; and is excluded, not imputed. Its <strong>parlays are absent entirely</strong>: 31,899,248 contracts with no derivable outcome, for the reason set out above. So ProphetX appears on this page for <strong>single markets only</strong>, and its bar is labelled that way rather than &ldquo;all markets&rdquo;.</p>
</details>

## What a contract costs its buyer

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
${fmtUSD(d.pnl)} over ${fmtCount(d.contracts)} contracts
${d.binsClearing} of ${d.binsTested} bins clear 2 clustered SE
${LEG_LABEL[d.leg] ?? d.leg} · ${BASIS_NOTE[d.basis]?.split(" — ")[0] ?? d.basis}
realised, but not an edge`,
      tip: true
    }),
    Plot.barX(headline.filter(d => d.measurable !== 0), {
      y: "label", x: "perContract", fill: "venue",
      // 4px rounded data-end anchored to the zero baseline; a 2px gap to the surface.
      rx1: 4, insetTop: 2, insetBottom: 2,
      title: d => `${d.label}\n${fmtCents(d.perContract)} per contract\n${fmtUSD(d.pnl)} total\n${fmtCount(d.contracts)} contracts\n${LEG_LABEL[d.leg] ?? d.leg} · ${BASIS_NOTE[d.basis]?.split(" — ")[0] ?? d.basis}`,
      tip: true
    }),
    // Direct-label every bar: there are few enough that a value axis alone would be
    // harder to read than the numbers themselves.
    // SPLIT ON THE SIGN, and it has to be split. textAnchor and dx are CONSTANT mark
    // options in Plot, never channels: a function is written verbatim into the attribute
    // (text-anchor="d => ...") and dx is coerced with +dx, giving transform="translate(NaN,20)".
    // Chrome rejects the whole transform, so the labels lost the half-row band centring AND
    // the 6px gap -- every value printed 20px high and centred on its own bar end. The two
    // predicates are exact complements so no row can fall through and lose its label.
    Plot.text(headline.filter(d => d.perContract < 0), {
      y: "label", x: "perContract", text: d => fmtCents(d.perContract),
      textAnchor: "end", dx: -6,
      fill: "var(--theme-foreground)", fontWeight: 600
    }),
    Plot.text(headline.filter(d => !(d.perContract < 0)), {
      y: "label", x: "perContract", text: d => fmtCents(d.perContract),
      textAnchor: "start", dx: 6,
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
// Hold the double-counted aggregate out FIRST, on the same rule the bar chart uses, then
// count `dropped` against what survives it. The caption below attributes every omitted row
// to thin volume, so folding the aggregate's bins into that count would print a false
// reason for them.
const comparableBins = pnl.filter(d => !isDoubleCounted(d));
const byBin = comparableBins
  .filter(d => d.contracts >= MIN_BIN_CONTRACTS)
  .map(d => ({...d, label: seriesLabel(d.venue, d.group)}));
const dropped = comparableBins.length - byBin.length;
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
    // Same constant-vs-channel rule as the labels above, and this one failed SILENTLY:
    // strokeDasharray as a function landed on the <g> as text, so NOTHING drew dashed while
    // the caption below promised "Dashed lines are parlays" -- and a venue's parlay and
    // single-market series share one colour, so the two were indistinguishable.
    Plot.line(byBin.filter(d => d.group === "PARLAY"), {
      x: "price_bin", y: "pnl_per_contract", stroke: "venue",
      strokeWidth: 2, strokeDasharray: "4,3",
      z: "label", curve: "monotone-x"
    }),
    Plot.line(byBin.filter(d => d.group !== "PARLAY"), {
      x: "price_bin", y: "pnl_per_contract", stroke: "venue",
      strokeWidth: 2,
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
    leg: d => html`<span title=${LEG_NOTE[d] ?? ""}>${LEG_LABEL[d] ?? d}</span>`,
    basis: d => html`<span title=${BASIS_NOTE[d] ?? ""}>${d === "exact_contract_weighted" ? "Exact" : "Approximate"}</span>`
  },
  align: {perContract: "right", pnl: "right", pctOfStake: "right", contracts: "right"},
  width: {label: 240},
  rows: 12
})
```

## Calibration error by price

<p class="section-intro">Actual minus implied probability. Intervals are ±2 event-clustered standard errors; an interval crossing zero is not distinguishable from calibration.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 90 + 125 * selectedAccuracyVenues.length,
  marginLeft: 60, marginRight: 150,
  facet: {data: accuracyRows, y: "venue"}, fy: {label: null, domain: selectedAccuracyVenues},
  x: {label: "Contract price (¢)", domain: [0, 100], grid: true},
  y: {label: "Actual − implied (percentage points)", grid: true},
  color: {domain: venues, range: venues.map(colorOf)},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground-muted)"}),
    Plot.ruleY(accuracyRows, {x: d => 100*d.implied, y1: d => 100*(d.error - 2*d.se), y2: d => 100*(d.error + 2*d.se), stroke: "venue", strokeOpacity: 0.55}),
    Plot.dot(accuracyRows, {x: d => 100*d.implied, y: d => 100*d.error, fill: "venue", r: 4, tip: true, title: d => `${d.venue}\n${d.bin}–${d.bin+5}¢\nError ${(100*d.error).toFixed(2)} pp ± ${(200*d.se).toFixed(2)} pp`})
  ]
})
```

## Favourite–longshot summary

```js
function weightedBand(rows, test) {
  const selected = rows.filter(test).filter(d => d.contracts > 0);
  const weight = d3.sum(selected, d => d.contracts);
  return weight ? d3.sum(selected, d => d.error * d.contracts) / weight : null;
}
const tailSummary = venues.map(venue => {
  const rows = normalized.filter(d => d.venue === venue);
  const longshots = weightedBand(rows, d => d.implied < .30);
  const favorites = weightedBand(rows, d => d.implied >= .70);
  return {venue, longshots, favorites, spread: longshots == null || favorites == null ? null : favorites - longshots};
});
display(Inputs.table(tailSummary, {
  columns: ["venue", "longshots", "favorites", "spread"],
  header: {venue: "Venue", longshots: "Longshots <30¢", favorites: "Favorites ≥70¢", spread: "Favorite − longshot"},
  format: {
    longshots: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`,
    favorites: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`,
    spread: d => d == null ? "—" : `${d >= 0 ? "+" : ""}${(100*d).toFixed(2)} pp`
  },
  rows: venues.length
}));
```

<details class="surface-card compact-details">
  <summary>Definitions and interval method</summary>
  <p>All curves are contract-weighted and use the strongest venue-wide settled group in each producer. Error bars cluster prints on the underlying event. Price-side conventions differ by venue and are documented in <a href="./methodology">Methodology &amp; coverage</a>.</p>
</details>
