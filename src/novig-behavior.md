---
title: Novig · Trading behavior
---

<div class="page-hero">
  <div class="page-eyebrow">Novig</div>
  <h1>How it trades</h1>
  <p class="page-lead">Trade sizes, where on the probability axis the volume sits, and the biggest individual prints Novig has published.</p>
</div>

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
import {tradeSizeMix, volumeAtPrice, metricsFor, fmtCount, fmtUSD, fmtPct, fmtPrice, fmtDate} from "./components/venue-modules.js";
import {attachTradeInspector, venueTradeRows} from "./components/inspect-tables.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const sizeAll = await DataAttachment("data/trade_size_daily.csv").csv({typed: true});
const ltAll = await DataAttachment("data/competitor_large_trades.csv").csv({typed: true});

```

```js
const ACCENT = "#6366F1";
const VENUE = "Novig";
// trade_size_daily holds three cuts in segment_type: "All" (venue-wide), "Sports
// split" and "Category". They OVERLAP, so summing across them double-counts the
// venue several times over. segment_type is the discriminator -- segment happens to
// read "All" on those rows too, but keying on it would be relying on a coincidence.
const size = sizeAll.filter(d => d.platform === "Novig" && d.segment_type === "All");
const lt = ltAll.filter(d => d.venue === VENUE);

// Clicking a market name opens the same inspector drawer /trade-size opens for the very
// same rows. `source` is this page's own key because the pc_* selection namespace is
// global -- a link copied from another venue's page must not resolve against these rows.
// The handler is given every table x metric combination, not just the visible one, so a
// shared link still finds its trade after the reader switches the ranking.
const openTrade = attachTradeInspector({source: "novig-trades", venue: VENUE, largeTrades: lt, metrics: metricsFor(lt, VENUE)});
// index is into the ORIGINAL array, not the sorted view, so data[index] stays correct
// after the reader sorts a column.
const tradeCell = (value, index, data) => html`<button type="button" class="inspector-inline-button" onclick=${event => openTrade(data[index], event.currentTarget)} aria-label=${`Inspect trade in ${value}`}>${value}</button>`;
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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Share of contracts, not of trade count — a book can be almost all small trades by count and still be majority block-traded by volume.</div>


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
const smallMetric = view(Inputs.radio(metricsFor(lt, VENUE), {label: "Rank by", value: metricsFor(lt, VENUE).includes("Taker stake") ? "Taker stake" : "Contracts"}));
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

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">Trades that were large <em>for the market they happened in</em>, not just large in isolation.</div>

<details class="surface-card compact-details">
  <summary>How this is measured</summary>
  <p><strong>Market names are whatever the venue publishes.</strong> ProphetX and Novig name their fixtures; DKeX, Polymarket US and Underdog publish an opaque contract id. Nothing is renamed here.</p>
  <p><strong>Taker stake appears only where there is a taker.</strong> Novig is the only competitor publishing an aggressor flag, so on every other venue that ranking is absent rather than blank.</p>
  <p><strong>&ldquo;% of market&rdquo; is share of a window, not of a lifetime.</strong> These tapes run only as far back as collection does, so a market that was already busy before collection started reads as more concentrated than it truly was. A market must also have traded at least 20 separate times to appear, which stops the table degenerating on venues whose market id is close to one-per-trade.</p>
</details>

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">See also: <a href="./novig">Novig &middot; Activity</a>, and <a href="./trade-size">Trading behavior across venues</a> for the comparison.</div>
