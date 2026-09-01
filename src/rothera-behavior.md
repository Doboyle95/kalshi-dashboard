---
title: Rothera · Trading behavior
---

<div class="page-hero" data-accent="rothera">
  <div class="page-eyebrow">Rothera</div>
  <h1>How it trades</h1>
  <p class="page-lead">Trade sizes, where on the probability axis the volume sits, what hour of the day it arrives, and the biggest individual prints Rothera has published.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {tradeSizeMix, volumeAtPrice, metricsFor, fmtCount, fmtUSD, fmtPct, fmtPrice, fmtDate} from "./components/venue-modules.js";
import {attachTradeInspector, venueTradeRows} from "./components/inspect-tables.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const sizeAll = await DataAttachment("data/trade_size_daily.csv").csv({typed: true});
const ltAll = await DataAttachment("data/competitor_large_trades.csv").csv({typed: true});
const vapRaw = await DataAttachment("data/rothera_volume_at_price.csv").csv({typed: true});
const hourly = await DataAttachment("data/rothera_intraday_hourly.csv").csv({typed: true});
```

```js
const ACCENT = "var(--accent-rothera)";
const VENUE = "Rothera";
// trade_size_daily holds three cuts in segment_type: "All" (venue-wide), "Sports
// split" and "Category". They OVERLAP, so summing across them double-counts the
// venue several times over. segment_type is the discriminator -- segment happens to
// read "All" on those rows too, but keying on it would be relying on a coincidence.
const size = sizeAll.filter(d => d.platform === VENUE && d.segment_type === "All");
const lt = ltAll.filter(d => d.venue === VENUE);

// Clicking a market name opens the same inspector drawer /trade-size opens for the very
// same rows. `source` is this page's own key because the pc_* selection namespace is
// global -- a link copied from another venue's page must not resolve against these rows.
const openTrade = attachTradeInspector({source: "rothera-trades", venue: VENUE, largeTrades: lt, metrics: metricsFor(lt, VENUE)});
// index is into the ORIGINAL array, not the sorted view, so data[index] stays correct
// after the reader sorts a column.
const tradeCell = (value, index, data) => html`<button type="button" class="inspector-inline-button" onclick=${event => openTrade(data[index], event.currentTarget)} aria-label=${`Inspect trade in ${value}`}>${value}</button>`;
```

```js
// Everything on this page comes from the fill-level tape, which starts long after the
// venue did. Stating that span once, from the data, keeps every chart below honest
// about what window it describes -- and it is a much shorter window than the Activity
// and Products pages, which read end-of-day market data back to 2026-05-21.
const tapeDays = Array.from(new Set(size.map(d => String(d.date).slice(0, 10)))).sort();
const tapeFirst = tapeDays[0];
const tapeLast = tapeDays[tapeDays.length - 1];
const tapePrints = d3.sum(size, d => +d.trade_count || 0);
const tapeContracts = d3.sum(size, d => +d.contracts || 0);
```

```js
display(html`<div class="instruction-line" style="border-left-color:var(--accent-warning)"><strong>This page reads a different, shorter feed than the rest of the venue.</strong> ${fmtCount(tapePrints)} prints and ${fmtCount(tapeContracts)} contracts across ${tapeDays.length} sessions, ${fmtDate(new Date(`${tapeFirst}T00:00:00Z`))} to ${fmtDate(new Date(`${tapeLast}T00:00:00Z`))}. <a href="./rothera">Activity</a> and <a href="./rothera-products">Products</a> run back to May on end-of-day market data; anything before the tape starts is permanently unavailable, which includes the whole 2026 World Cup.</div>`);
```

## Trade size mix

<div class="control-strip">

```js
const sizeMeasure = view(Inputs.radio(["Share", "Contracts"], {label: "Measure", value: "Share"}));
```

</div>

```js
display(size.length
  ? tradeSizeMix({rows: size, width, measure: sizeMeasure})
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The trade-size series is not being served for this venue.</div>`);
```

```js
// Read from the data rather than typed in, so the sentence cannot drift from the chart.
const bigShare = (() => {
  const total = d3.sum(size, d => +d.contracts || 0);
  const big = d3.sum(size.filter(d => +d.bucket_order >= 4), d => +d.contracts || 0);
  const bigPrints = d3.sum(size.filter(d => +d.bucket_order >= 4), d => +d.trade_count || 0);
  const prints = d3.sum(size, d => +d.trade_count || 0);
  return {contracts: total > 0 ? big / total : 0, prints: prints > 0 ? bigPrints / prints : 0};
})();
display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Share of contracts, not of trade count — a book can be almost all small trades by count and still be majority block-traded by volume, and this one is: prints of 1,000 contracts and up are ${fmtPct(bigShare.prints)} of trades but ${fmtPct(bigShare.contracts)} of contracts.</div>`);
```

## Volume by probability

<div class="control-strip">

```js
const vapMeasure = view(Inputs.radio(["Contracts", "Dollars"], {label: "Measure", value: "Contracts"}));
```

</div>

```js
const vapBins = Array.from(
  d3.rollup(
    vapRaw.filter(d => (d.bin_width == null || +d.bin_width === 5) && (d.group == null || d.group === "ALL")),
    rs => ({contracts: d3.sum(rs, d => +d.n_contracts || 0), dollars: d3.sum(rs, d => +d.dollars || 0)}),
    d => +d.price_bin
  ),
  ([price_bin, v]) => ({price_bin, width: 5, ...v})
).filter(d => Number.isFinite(d.price_bin));
display(vapBins.length
  ? volumeAtPrice({bins: vapBins, width, color: ACCENT, measure: vapMeasure})
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The volume-at-price series is not being served for this venue.</div>`);
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Where traders choose to put money on the probability axis. This is behaviour, not accuracy — <a href="./rothera">Activity</a> explains why this venue carries no calibration curve.</div>

## When it trades

<p class="section-intro">Prints by hour of the Eastern day, summed across every session on the tape. This is the one venue here whose feed carries a timestamp, so it is the only place on the site outside Kalshi where an intraday shape can be drawn at all.</p>

<div class="control-strip">

```js
const hourMeasure = view(Inputs.radio(["Contracts", "Prints"], {label: "Measure", value: "Contracts"}));
```

</div>

```js
const hourRows = (() => {
  const sessions = new Set(hourly.map(d => String(d.date).slice(0, 10))).size || 1;
  const byHour = d3.rollup(hourly,
    rs => ({contracts: d3.sum(rs, d => +d.contracts || 0), prints: d3.sum(rs, d => +d.prints || 0), dollars: d3.sum(rs, d => +d.dollars || 0)}),
    d => +d.hour_et);
  const totalC = d3.sum(hourly, d => +d.contracts || 0);
  const totalP = d3.sum(hourly, d => +d.prints || 0);
  // Every hour of the clock is emitted, including quiet ones, so the bar chart has no
  // gap that reads as missing data where the honest answer is "almost nothing traded".
  return d3.range(24).map(h => {
    const v = byHour.get(h) ?? {contracts: 0, prints: 0, dollars: 0};
    return {
      hour_et: h, ...v, sessions,
      value: hourMeasure === "Prints" ? v.prints : v.contracts,
      share: (hourMeasure === "Prints" ? (totalP > 0 ? v.prints / totalP : 0) : (totalC > 0 ? v.contracts / totalC : 0))
    };
  });
})();
const fmtHour12 = h => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
```

```js
display(hourly.length
  ? Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width, height: 320, marginLeft: 62, marginBottom: 40,
      x: {type: "band", domain: d3.range(24), tickFormat: fmtHour12, label: "Hour (Eastern Time)"},
      y: {grid: true, label: hourMeasure, tickFormat: d => fmtCount(d)},
      marks: [
        Plot.ruleY([0]),
        Plot.barY(hourRows, {x: "hour_et", y: "value", fill: ACCENT, fillOpacity: 0.85, rx: 2}),
        Plot.tip(hourRows, Plot.pointerX({
          x: "hour_et", y: "value",
          title: d => [
            fmtHour12(d.hour_et),
            `${fmtCount(d.contracts)} contracts · ${fmtCount(d.prints)} prints · ${fmtUSD(d.dollars)}`,
            `${fmtPct(d.share)} of all ${hourMeasure.toLowerCase()}`,
            `${fmtCount(Math.round(d.contracts / d.sessions))} contracts in an average session`
          ].join("\n")
        }))
      ]
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">The intraday series is not being served for this venue.</div>`);
```

```js
const peakBlock = (() => {
  // The busiest three consecutive clock hours, rather than a single peak hour, because
  // one hour is noise on 35 sessions and the shape being described is an evening block.
  const by = new Map(hourRows.map(d => [d.hour_et, d.contracts]));
  const total = d3.sum(hourRows, d => d.contracts) || 1;
  let best = {start: 0, sum: -1};
  for (let h = 0; h < 24; h++) {
    const sum = d3.sum([0, 1, 2].map(k => by.get((h + k) % 24) ?? 0));
    if (sum > best.sum) best = {start: h, sum};
  }
  return {...best, share: best.sum / total};
})();
display(html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Its busiest three hours are ${fmtHour12(peakBlock.start)}–${fmtHour12((peakBlock.start + 3) % 24)} Eastern, carrying ${fmtPct(peakBlock.share)} of all contracts — a US evening book, which is what a sports-led venue looks like.</div>`);
```

## Largest individual trades

<div class="control-strip">

```js
const overallMetric = view(Inputs.radio(metricsFor(lt, VENUE), {label: "Rank by", value: "Contracts"}));
```

</div>

```js
const overallRows = venueTradeRows(lt, {venue: VENUE, table: "overall", metricLabel: overallMetric});
display(overallRows.length
  ? Inputs.table(overallRows, {
      columns: ["date", "market", "contracts", "price", "metric_value"],
      header: {date: "Date", market: "Market", contracts: "Contracts", price: "Price", metric_value: overallMetric},
      format: {date: fmtDate, market: tradeCell, contracts: d => fmtCount(d), price: fmtPrice, metric_value: d => overallMetric === "Contracts" ? fmtCount(d) : fmtUSD(d)},
      align: {contracts: "right", metric_value: "right"},
      width: {market: 260}, rows: 15
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">No large-trade rows are served for this venue.</div>`);
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Switch to one-party stake to surface trades at extreme prices, where one side risks nearly the full dollar and the other almost nothing.</div>

## Largest trades in small markets

<div class="control-strip">

```js
const smallMetric = view(Inputs.radio(metricsFor(lt, VENUE), {label: "Rank by", value: "Contracts"}));
```

</div>

```js
const smallRows = venueTradeRows(lt, {venue: VENUE, table: "small_market", metricLabel: smallMetric});
display(smallRows.length
  ? Inputs.table(smallRows, {
      columns: ["date", "market", "contracts", "price", "metric_value", "pct_of_market"],
      header: {date: "Date", market: "Market", contracts: "Contracts", price: "Price", metric_value: smallMetric, pct_of_market: "% of market"},
      format: {date: fmtDate, market: tradeCell, contracts: d => fmtCount(d), price: fmtPrice, metric_value: d => smallMetric === "Contracts" ? fmtCount(d) : fmtUSD(d), pct_of_market: d => d == null ? "—" : fmtPct(d)},
      align: {contracts: "right", metric_value: "right", pct_of_market: "right"},
      width: {market: 260}, rows: 15
    })
  : html`<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">No small-market rows are served for this venue.</div>`);
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Trades that were large <em>for the market they happened in</em>, not just large in isolation — here, mostly thin long-dated futures rather than the games that carry the volume.</div>

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Everything here is a real print.</strong> Rothera publishes a fill-level tape &mdash; timestamp, contract, price, quantity &mdash; and this page reads it directly. Nothing on it is inferred from end-of-day bars, which is what the rest of the venue's pages are built on.</p>
  <p><strong>There is no aggressor flag,</strong> so no trade can be attributed to a taker and the &ldquo;Taker stake&rdquo; ranking is absent rather than shown blank. Novig is the only competitor on this site that publishes one.</p>
  <p><strong>There is no English market name.</strong> Rothera publishes a product code and an outcome code and nothing else descriptive, so the tables show the code. Expanding <code>MLBGAME-26AUG30SEATOR-TOR</code> into a fixture would be a hand-written guess presented as venue data.</p>
  <p><strong>The trading day starts at 5 PM Eastern,</strong> not midnight: Rothera runs a 21:00Z-to-20:59Z session, so a session dated the 7th holds prints stamped from the evening of the 6th. Daily figures are keyed to the session, which is what makes them reconcile exactly against the venue's own end-of-day volume. The intraday chart is wall-clock time and is unaffected &mdash; it sums each hour of the day across every session.</p>
  <p><strong>Trade-size buckets are shared across venues,</strong> copied from the Kalshi producer, so a 100-lot is bucketed the same way everywhere and <a href="./trade-size">the comparison</a> means something.</p>
  <p><strong>&ldquo;% of market&rdquo; is share of a window, not of a lifetime.</strong> The tape starts long after the venue did, so a market already busy before it began reads as more concentrated than it truly was. A market must also have traded at least 20 separate times to appear.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./rothera">Rothera &middot; Activity</a>, <a href="./rothera-economics">Rothera &middot; Economics</a>, and <a href="./trade-size">Trading behavior across venues</a> for the comparison.</div>
