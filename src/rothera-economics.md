---
title: Rothera · Economics
---

<div class="page-hero" data-accent="rothera">
  <div class="page-eyebrow">Rothera</div>
  <h1>What it charges</h1>
  <p class="page-lead">Fees Rothera has collected, who pays them, and what that works out to per dollar of contract.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {feeRows, feesDaily, realizedRate, fmtCount, fmtUSD, fmtPct, fmtDate} from "./components/venue-modules.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const competitorDaily = await DataAttachment("data/competitor_daily.csv").csv({typed: true});
const feesFile = await DataAttachment("data/rothera_fees_daily.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-rothera)";
const COUNTERPARTY = "var(--accent-secondary)";
const VENUE = "Rothera";
// feeRows applies the Crypto.com/Nadex redenomination restatement; on every other
// venue contractDollars is 1 and this is a straight fees/contracts ratio.
const rows = feeRows(competitorDaily.filter(d => d.platform === VENUE), VENUE);
const totalFees = d3.sum(rows, d => d.fees);
const totalContracts = d3.sum(rows, d => d.contracts);
```

```js
if (!rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--accent-warning)"><strong>No fee data is published for this venue.</strong></div>`);
```

```js
// Rothera's fee days are a strict subset of its trading days: the fee is billed off the
// fill-level tape, which starts long after the venue did. Saying so from the data keeps
// the page from reading as though the venue only recently began charging.
const volumeDays = competitorDaily.filter(d => d.platform === VENUE && +d.contracts > 0).length;
if (rows.length && volumeDays > rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--accent-warning)"><strong>Fees exist only for the days the trade tape covers</strong> — ${rows.length} of this venue's ${volumeDays} trading days. Rothera's fee is a parabola in the price each trade actually printed at, and its end-of-day files carry no trade prices, so earlier days have no defensible fee and are absent rather than estimated. See <a href="./rothera-behavior">Trading behavior</a> for the same window.</div>`);
```

## Fees per day

```js
if (rows.length) display(feesDaily({rows, width, color: ACCENT}));
```

```js
if (rows.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${fmtUSD(totalFees)} across ${fmtCount(totalContracts)} contracts, on ${rows.length.toLocaleString()} days carrying a reported fee.</div>`);
```

## Who pays it

<p class="section-intro">Rothera bills <em>both</em> sides of a matched trade, at different rates. This splits the exchange's daily take into the retail leg and the market-maker leg opposite it.</p>

```js
// `fees` is what ONE retail trader pays; `fees_exchange_revenue` is what the exchange
// keeps, i.e. both sides. The counterparty leg is the difference, never a second
// independent figure -- deriving it any other way would let the two disagree.
const split = feesFile
  .map(d => {
    const side = +d.fees || 0;
    const total = +d.fees_exchange_revenue || 0;
    return {
      date: d.date instanceof Date ? d.date : new Date(`${String(d.date).slice(0, 10)}T00:00:00Z`),
      side, total, counterparty: Math.max(0, total - side),
      contracts: +d.contracts || 0, fills: +d.fills || 0, tradedValue: +d.traded_value || 0,
      kSide: +d.k_side, kCounterparty: +d.k_counterparty
    };
  })
  .filter(d => !Number.isNaN(+d.date) && d.total > 0)
  .sort((a, b) => a.date - b.date);
const splitLong = split.flatMap(d => [
  {date: d.date, leg: "Retail side", fees: d.side},
  {date: d.date, leg: "Counterparty", fees: d.counterparty}
]);
```

```js
display(split.length
  ? Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width, height: 300, marginLeft: 72, marginBottom: 34,
      x: {label: null, type: "utc"},
      y: {label: "Fees ($)", grid: true, tickFormat: d => fmtUSD(d)},
      color: {legend: true, domain: ["Retail side", "Counterparty"], range: [ACCENT, COUNTERPARTY]},
      marks: [
        Plot.ruleY([0]),
        Plot.rectY(splitLong, {x: "date", y: "fees", fill: "leg", fillOpacity: 0.85, interval: "day"}),
        Plot.tip(split, Plot.pointerX({
          x: "date", y: "total",
          title: d => [
            fmtDate(d.date),
            `${fmtUSD(d.total)} to the exchange`,
            `retail side ${fmtUSD(d.side)} · counterparty ${fmtUSD(d.counterparty)}`,
            `${fmtCount(d.fills)} fills · ${fmtCount(d.contracts)} contracts · ${fmtUSD(d.tradedValue)} staked`
          ].join("\n")
        }))
      ]
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The per-fill fee series is not being served for this venue.</div>`);
```

```js
// The coefficients are read out of the file rather than typed in, so a schedule change
// upstream changes this sentence instead of quietly contradicting it.
const ks = (() => {
  const side = Array.from(new Set(split.map(d => d.kSide).filter(Number.isFinite)));
  const cp = Array.from(new Set(split.map(d => d.kCounterparty).filter(Number.isFinite)));
  return side.length === 1 && cp.length === 1 ? {side: side[0], cp: cp[0]} : null;
})();
const staked = d3.sum(split, d => d.tradedValue);
const exchangeTake = d3.sum(split, d => d.total);
if (split.length) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">${
  ks ? html`Billed per fill as <strong>k × contracts × p × (1−p)</strong>, at k=${ks.side} to the retail side and k=${ks.cp} to the counterparty — so the exchange collects ${((ks.side + ks.cp) / ks.side).toFixed(1)}× what one retail trader pays. ` : ""
}Over this window it kept ${fmtUSD(exchangeTake)} on ${fmtUSD(staked)} staked, or ${fmtPct(staked > 0 ? exchangeTake / staked : 0)} of the money at risk.</div>`);
```

## Cumulative

```js
if (rows.length) display(feesDaily({rows, width, color: ACCENT, cumulative: true}));
```

## Effective rate

```js
if (rows.length) display(realizedRate({rows, width, color: ACCENT}));
```

```js
// ⚠ THIS PAGE DELIBERATELY DOES NOT USE rateShape(), and putting it back would be a
// regression. That helper decides whether an effective rate is a POSTED number or a
// market outcome by clustering at 0.05c, and it gets Rothera wrong in a way that is
// invisible on the other four Economics pages.
//
// Measured 2026-09-01 over 35 fee days: 35 DISTINCT rates spanning 0.294c to 0.392c,
// a 1.34x spread, which the 0.05c grid slices into exactly three adjacent cells
// (0.30 / 0.35 / 0.40). Three clusters covering 100% of days trips the `posted` test,
// so the shared caption would announce a rate "the venue changed ... it has only ever
// sat at 0.30c and 0.35c and 0.40c" -- asserting three fee-schedule changes that never
// happened. It is the exact mirror of the failure that helper's own comment warns
// about: ForecastEx has 98 distinct rates that are really two levels, and Rothera has
// three apparent levels that are really one continuous distribution too narrow for the
// grid to resolve. A contiguity guard fixes Rothera and breaks DKeX (0.95/1.00, also
// adjacent, genuinely a posted flat rate), so the helper is left alone.
//
// None of that heuristic is needed here anyway: this venue's fee is not reported, it is
// COMPUTED by us from a published schedule with a fixed coefficient. Whether the
// schedule changed is something we know rather than something to infer.
const rateSpread = rows.length ? {
  lo: d3.min(rows, d => d.centsPerContract),
  hi: d3.max(rows, d => d.centsPerContract),
  distinct: new Set(rows.map(d => d.centsPerContract.toFixed(6))).size
} : null;
if (rateSpread) display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">From <strong>${rateSpread.lo.toFixed(3)}¢</strong> to <strong>${rateSpread.hi.toFixed(3)}¢</strong> per $1 of contract, and a different value on all ${rateSpread.distinct} of ${rows.length} days. <strong>The schedule never changed.</strong> The fee is a parabola in price, so the line tracks where on the probability axis the venue traded that day — compare it against <a href="./rothera-behavior">the volume-by-probability chart</a>, which is the thing moving it.</div>`);
```

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Fees here are computed, not reported.</strong> Rothera publishes no fee field. Every figure on this page is the venue's own published schedule applied to each individual fill on its trade tape &mdash; <code>max(k &times; contracts &times; p &times; (1&minus;p), $0.01)</code> per side, rounded to the cent. Because it is billed per fill at the price that fill printed at, it is exact rather than an estimate.</p>
  <p><strong>Which is why the series starts where it does.</strong> Days before the tape have no trade prices, and every daily price proxy tested against them came out biased by &minus;80% to +30%. Those days are left blank rather than filled in.</p>
  <p><strong>The two columns mean different things.</strong> &ldquo;Fees per day&rdquo;, &ldquo;Cumulative&rdquo; and &ldquo;Effective rate&rdquo; all plot what <em>one retail trader</em> pays to execute, which is the number comparable to Kalshi's. &ldquo;Who pays it&rdquo; plots what the <em>exchange</em> keeps, which is larger because Rothera bills both sides.</p>
  <p><strong>Why a fee rate moves at all.</strong> The schedule is a parabola in price, peaking at 50&cent; and falling to nearly nothing in the tails, so an effective rate tracks <em>where on the probability axis the venue traded</em> rather than any change in what it charges.</p>
  <p><strong>Who is on each side is assumed, not observed.</strong> The tape carries no aggressor flag and no participant type, so the split above is the schedule's own model &mdash; one retail leg against one market-maker leg &mdash; applied to every fill. Rothera posts a third coefficient for professionals at six times retail, and a professional-heavy mix would put the exchange's take well above what is drawn here. This is the largest single uncertainty on the page.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./rothera">Rothera &middot; Activity</a>, <a href="./rothera-behavior">Rothera &middot; Trading behavior</a>, and <a href="./compare-fees">Fees across venues</a> for the comparison.</div>
