---
title: Cross-Venue P&L
---

# What did the bettors actually make?

<p class="page-lead">A calibration curve says a market is mispriced. It does not say how much that cost anyone. This page multiplies the gap by the contracts standing behind it, at every venue whose data can answer, on one shared axis &mdash; and keeps the two questions apart that are easiest to conflate: <strong>what these bettors realised</strong>, which is arithmetic, and <strong>what a bettor should expect</strong>, which needs far more data than some of these venues have.</p>

<div class="instruction-line"><strong>Per contract, not percent.</strong> A loss expressed as a share of stake flatters cheap contracts: the same 2&cent; is 2% of a 100&cent; favourite and 20% of a 10&cent; longshot. Every headline here is <strong>cents per contract</strong>, which is comparable across venues and across price. Percent-of-stake is in the table for anyone who wants it.</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {renderDateBrush} from "./components/date-brush.js";
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
  "DKeX": "#F97316",
  "ProphetX": "#DB2777",
  // Novig, added 2026-08-17 -- the site-wide Novig accent (--accent-novig), matching
  // venue-data.js. Its single-market bar is a TRUE taker series (aggressor flag + settled
  // outcome), so it draws solid alongside Kalshi rather than hollow.
  "Novig": "#6366F1",
  // Without this entry the bar still occupied a row and printed its label, but the
  // colour scale had no value for it so Plot rendered it with NO FILL -- a venue that
  // looked present and measured nothing. #9c27b0 is the accent this site already uses
  // for Crypto.com/Nadex (--accent-nadex in styles.css).
  "Crypto.com": "#9c27b0"
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
// same contracts in one bar chart, so the aggregate is held out of the comparison and
// reported on its own below.
const headline = rolled.filter(d => !(d.venue === "Kalshi" && d.group === "ALL"));
const kalshiAll = rolled.find(d => d.venue === "Kalshi" && d.group === "ALL");
const parlayRows = rolled.filter(d => d.group === "PARLAY");

// The old callout hardcoded "Two venues ... they agree ... to within a fraction of a
// cent" and the verb "lose", then interpolated two numbers underneath. Both facts moved:
// a third parlay venue was added and Polymarket's sign went POSITIVE, so the page read
// "Polymarket US's lose +6.63c" and called an 8.45c opposite-sign gap agreement. Every
// word that can go stale is now derived.
// Magnitude only. The verb ("lose"/"make") carries the direction, and fmtCents would
// prefix a sign on top of it, rendering "bettors lose +1.82c".
const fmtCentsMag = d => `${Math.abs(d * 100).toFixed(2)}¢`;
const parlayBig = parlayRows.filter(d => d.contracts > 1e8);
const parlaySpread = parlayBig.length > 1
  ? Math.abs(Math.max(...parlayBig.map(d => d.perContract)) - Math.min(...parlayBig.map(d => d.perContract)))
  : null;
const parlaySentence = [
  `${parlayRows.length} venues' parlays can be priced.`,
  parlayRows.slice().sort((a, b) => b.contracts - a.contracts).map(d =>
    `${d.venue} ${d.perContract < 0 ? "bettors lose" : "bettors make"} ${fmtCentsMag(d.perContract)} per contract on ${fmtCount(d.contracts)} contracts`
  ).join("; ") + ".",
  parlaySpread == null ? "" :
    `The ${parlayBig.length} large books agree in direction and to within ${fmtCentsMag(parlaySpread)} per contract, across separate venues, separate pipelines and separate settlement sources — which is the strongest evidence on this page that the method measures what it claims to.`
].filter(Boolean).join(" ");
// Named explicitly rather than inferred: a venue days into its parlay pilot does not
// belong in a claim about cross-venue agreement, in either direction.
const parlaySmall = parlayRows.filter(d => d.contracts < 1e6);
const parlayCaveat = parlaySmall.length === 0 ? "" :
  parlaySmall.map(d =>
    `${d.venue} is NOT part of that agreement: it carries only ${fmtCount(d.contracts)} parlay contracts, so its ${fmtCents(d.perContract)} is a pilot-sized reading and should not be ranked against the others.`
  ).join(" ");
const detail0 = parlayDetail[0] ?? {};
```

<div class="instruction-line" style="border-left-color:#3B7DD8">
${parlaySentence} ${parlayCaveat}
</div>

<details class="surface-card compact-details">
  <summary>About this page — read before quoting any number</summary>
  <p><strong>Realised, not expected.</strong> Every figure here is what happened: contracts bought, stake paid, payout received, difference taken. That is arithmetic and needs no significance test, which is why nothing on this page is suppressed for having a small sample. It is also why no figure here may be read as an <em>edge</em> without checking how much data stands behind it. Polymarket's parlay series is the sharp case: it is <strong>${(+detail0.pct_resolved || 0).toFixed(0)}% resolved</strong> across a product that launched on 2026-08-06, with an effective sample size of <strong>${(+detail0.eff_n || 0).toFixed(1)}</strong> and a 95% interval of <strong>${(+detail0.ci_lo_pct || 0).toFixed(0)}% to ${(+detail0.ci_hi_pct || 0).toFixed(0)}%</strong> of stake. Those bettors really did lose that money. Nobody should conclude from six days what parlays cost on Polymarket in general.</p>
  <p><strong>Whose P&amp;L.</strong> Kalshi and Novig are the two venues publishing an aggressor flag, so their single-market numbers are the only <em>true taker</em> P&amp;L here — and Novig's is the more precise, every contract priced at what was actually paid rather than a 5&cent; bin midpoint. DKeX, Polymarket US and ForecastEx publish one price per print against a symbol naming a leg, with no flag, so theirs is the P&amp;L of whoever bought <em>that leg</em> — labelled <code>named</code> and never called taker. <strong>ProphetX is a third case, and it needed a third label.</strong> Its prints are two-sided exchange trades with a willing counterparty on each side and no aggressor flag anywhere in the feed, and the single price it publishes belongs to one nominated side &mdash; the second-named, home side of the fixture. That series is labelled <code>priced_home</code>: the away side’s P&amp;L is the exact mirror of it, sign for sign, and calling either side the taker would invent a fact the venue does not record. The request-for-quote argument set out next, which makes Polymarket’s parlays genuinely taker P&amp;L, does not carry over &mdash; nobody is lifting a venue’s quote here. <strong>Parlays are the exception:</strong> they are priced by request-for-quote, so the customer lifts a quote the venue makes and the taker is almost always the YES buyer. Polymarket's own feed carries that out exactly — <code>Strike Price</code> is <code>YES</code> on all 347 parlay rows, with no NO side listed — so its parlay series is genuinely taker P&amp;L. The producer asserts that property on every run and fails rather than mislabel it.</p>
  <p><strong>Two of five venues are priced exactly.</strong> P&amp;L is contract-weighted, so it wants a contract-weighted sum of prices paid. <strong>DKeX and ProphetX have one</strong> &mdash; DKeX publishes it, ProphetX’s is summed print by print off the raw tape &mdash; so every contract in those two series is priced at what was actually paid for it. Kalshi, ForecastEx and Polymarket US fall back to the 5&cent; bin midpoint, which is a real and measurable approximation and not a rounding detail. <strong>ProphetX is the proof of how much it can matter:</strong> scored against bin midpoints, 2 of its 10 deciles appear to clear two standard errors; scored against the price actually paid in each bin, <strong>none of them do</strong>. Publishing the midpoint version would have asserted an edge the tape does not support. Every row carries its <code>basis</code> and the table below shows it. Making the remaining three exact needs one column added to three producers — a known, costed gap, not an unknown.</p>
  <p><strong>What validates the method.</strong> Each exactly-priced venue is aggregated a second way and the two answers are compared on every build. DKeX’s folded series and a payout-minus-cost sum over the same calibration file agree to <strong>one cent on 21,485,019 contracts</strong>; ProphetX’s two published files, built by different aggregation paths, agree to <strong>$6 on $2.28M</strong>, or 0.0003%. Those are checks on the arithmetic, not confirmation of the resolution rules the two paths share — ProphetX’s rule is checked on its own terms instead, and its producer refuses to write anything at all if settlement polarity ever flips. Separately, Polymarket's parlay volume reconciles between its daily report and its trade tape to <strong>0 contracts of 59,472</strong>, and the two sources' volume-weighted prices agree to four decimal places.</p>
  <p><strong>Kalshi's aggregate is held out of the chart.</strong> Kalshi publishes an all-markets series as well as its parlay and single-market halves; drawing all three would count the same contracts twice in one comparison. The aggregate is ${kalshiAll ? html`<strong>${fmtCents(kalshiAll.perContract)}</strong> per contract over ${fmtCount(kalshiAll.contracts)} contracts` : "not currently available"}, and is quoted here rather than plotted.</p>
  <p><strong>Four venues were removed from this page on 2026-08-15, and this is why.</strong>
  A P&amp;L answers &ldquo;what did the bettors make&rdquo;. Answering it requires knowing <em>who
  traded</em> &mdash; which side was the aggressor. Only Kalshi and Novig publish that flag per
  trade, and parlays are the one exception, because they are priced by request-for-quote: the
  customer lifts a quote the venue makes, so the taker is the buyer by construction.
  Without an aggressor flag a P&amp;L is not what anyone made. It is a measurement of
  <strong>price bias</strong>, and its mirror side is its exact negation &mdash; if the priced
  side lost 1.19&cent; per contract, the other side gained 1.19&cent;. That is a real and
  interesting quantity, but it belongs on the <a href="./calibration-venues">calibration page</a>,
  where all four removed venues are drawn.</p>
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
  <p><strong>Which venues are absent, and why.</strong> Underdog runs parlays — its <code>UDXCOMBO</code> is the large majority of its records — and publishes no settlement outcome, so no P&amp;L is constructible for it and none is guessed. Novig's <em>parlays</em> are absent for the same reason (0 of its COMBO markets resolve), but its single markets settle and are the taker bar on the chart above. DKeX lists no parlay product at all: its 19 contract types are single-leg throughout. <strong>ProphetX runs parlays too, and they are absent for a third reason:</strong> not one of the 80,543 distinct <code>MULTI-EVENT-</code> contracts in its bulletin carries a parseable event date, so the maturity test that makes its single markets safe cannot be applied to a parlay at all &mdash; <strong>31,899,248 contracts left out, not estimated</strong>. Their terminal marks are no help either: of the 79,279 ProphetX parlays that settle to exactly 0 or 1, <strong>94.92% mark to 1</strong>, which cannot be a multi-leg win rate, so those marks are not outcomes.</p>
  <p><strong>ProphetX: built, and no measurable edge.</strong> ProphetX has been described as a venue that records <em>that</em> a contract resolved but not <em>which side won</em>. That holds only for its <strong>parlays</strong>. On single markets the outcome is recoverable &mdash; a contract that has been delisted, whose last bulletin session falls on or after its event date, and whose terminal mark is exactly 0 or 1 &mdash; and a P&amp;L series built on that rule is now <strong>on the chart above</strong>, covering 918,445 prints and 191,575,583 contracts across 3,450 distinct fixtures over the 60 sessions from 2026-06-16 to 2026-08-14. <strong>It finds no measurable edge.</strong> The priced side paid 44.15&cent; on average and won 42.96% of the time, and that gap stands at <strong>t&nbsp;=&nbsp;1.50</strong> against a fixture-clustered standard error of 0.79&cent; &mdash; it does not clear two &mdash; while <strong>zero of the 20 price bins</strong> clear two either, once each bin is measured against the price actually paid in it rather than against its midpoint. The money did change hands, and that part is arithmetic; what is missing is any way to tell ProphetX’s quoted side apart from a fair one. Its bar is drawn hollow for exactly that reason, and no per-contract figure on this page should be quoted as a ProphetX edge or ranked against the venues whose figures are measurable.</p>
  <p><strong>What ProphetX still cannot show.</strong> The series covers <strong>80.13% of ProphetX’s single-market contracts</strong> (191,575,583 of 239,095,073). The other 19.87% sits behind 194,030 prints that could not be joined to an outcome &mdash; 193,271 on contracts still unresolved at the end of the window, 657 on contracts never listed in the bulletin, 102 priced off-scale &mdash; and is excluded, not imputed. Its <strong>parlays are absent entirely</strong>: 31,899,248 contracts with no derivable outcome, for the reason set out above. So ProphetX appears on this page for <strong>single markets only</strong>, and its bar is labelled that way rather than &ldquo;all markets&rdquo;.</p>
</details>

## What a contract costs its buyer

<div class="instruction-line">Bars run left from zero: further left is a worse deal for the bettor. <strong>Kalshi and Crypto.com are both NET of fees.</strong> Crypto.com/CDNA charges $0.02 per contract per side with no settlement fee, and on a house-quoted combo the customer is the taker, so that is 2.00&cent; a contract. It is the larger part of what a Crypto.com parlay bettor loses: 1.15&cent; gross becomes <strong>3.15&cent; net</strong>. This chart previously showed the gross figure and therefore ranked Crypto.com ahead of Kalshi, which was backwards. Polymarket's bar is still gross &mdash; its taker parabola (&theta;=0.06) is about 0.5&cent; a contract at parlay prices and has not yet been applied here. <strong>Novig's single-market bar is straight-only and gross</strong>; its live-straight fee is a range, shown on the <a href="./novig-outcomes">Novig &middot; Outcomes</a> page. Every bar here is a venue whose <em>aggressor</em> is known, so the figure really is what the taker paid: Kalshi and Novig publish an aggressor flag outright, and a parlay quoted by the house on request has the customer as the buyer by construction. The DKeX and ProphetX bars this caption used to describe have been <strong>removed entirely</strong>, not redrawn &mdash; without an aggressor flag their numbers measured price bias rather than taker P&amp;L. Why each absent venue is absent is set out below.</div>

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
  .map(d => ({...d, label: seriesLabel(d.venue, d.group)}));
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
    leg: d => html`<span title=${LEG_NOTE[d] ?? ""}>${LEG_LABEL[d] ?? d}</span>`,
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
const parlayPilotFrom = d3.min(parlayDaily, d => d.date);
const parlayPilotTo = d3.max(parlayDaily, d => d.date);
const parlayPilotSel = Mutable([parlayPilotFrom, parlayPilotTo]);
display(renderDateBrush({
  data: parlayDaily.map(d => ({date: d.date, value: d.contracts})),
  initialRange: [parlayPilotFrom, parlayPilotTo],
  onSelect: range => { parlayPilotSel.value = range; },
  color: VENUE_COLOR["Polymarket US"],
  width
}));
```

```js
const [parlayPilotBrushFrom, parlayPilotBrushTo] = parlayPilotSel;
const parlayDailyBrushed = parlayDaily.filter(d => d.date >= parlayPilotBrushFrom && d.date <= parlayPilotBrushTo);
```

```js
Plot.plot({
  width,
  height: 240,
  marginLeft: 64,
  // csv({typed: true}) parses the ISO date column into a Date, so d is a Date object and
  // d.slice does not exist -- this threw "d.slice is not a function" and killed the chart
  // at runtime while the build passed, because a build never executes the page.
  x: {label: null, type: "band",
      tickFormat: d => d instanceof Date ? d.toISOString().slice(5, 10) : String(d).slice(5)},
  y: {label: "Contracts traded", grid: true, tickFormat: fmtCount},
  marks: [
    Plot.ruleY([0], {stroke: "var(--theme-foreground)", strokeWidth: 1.5}),
    Plot.barY(parlayDailyBrushed, {
      x: "date", y: "contracts", fill: VENUE_COLOR["Polymarket US"],
      rx2: 4, insetLeft: 2, insetRight: 2,
      title: d => `${d.date}\n${fmtCount(d.contracts)} contracts across ${d.trades} trades\nmean price ${(d.mean_price * 100).toFixed(1)}¢\n${(+d.pct_of_venue).toFixed(4)}% of Polymarket's volume that day`,
      tip: true
    })
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Across the whole window this product is <strong>${(d3.sum(parlayDaily, d => d.contracts) / d3.sum(parlayDaily, d => d.venue_contracts) * 100).toFixed(4)}%</strong> of Polymarket US's traded contracts, over ${d3.sum(parlayDaily, d => d.trades)} trades. Read it as a pilot.</div>
