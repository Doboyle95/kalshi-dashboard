---
title: Data & Methodology
---

<div class="page-hero">
  <div class="page-eyebrow">Reference</div>
  <h1>Data, coverage, and definitions</h1>
  <p class="page-lead">The short version of what can be compared, what cannot, and which data capabilities unlock each analytical module.</p>
</div>

## Comparison rules

<div class="method-rule-grid">
  <div class="surface-card"><strong>Unavailable is not zero</strong><span>A missing fee, outcome, or open-interest series is omitted and named—not plotted on the axis.</span></div>
  <div class="surface-card"><strong>Aligned windows by default</strong><span>Comparison views use a common recent window; each venue's full history is an explicit alternate view.</span></div>
  <div class="surface-card"><strong>Shares and levels are different</strong><span>Absolute volume answers scale. Within-venue share answers shape. They are separate controls.</span></div>
  <div class="surface-card"><strong>Participant P&amp;L requires identity</strong><span>Anonymous buyer-price bias is not labeled taker P&amp;L when aggressor or buyer identity is unknown.</span></div>
</div>

## Capability registry

<div class="surface-card table-scroll">
  <table class="briefing-table">
    <thead><tr><th>Module</th><th>Required data</th><th>What becomes possible</th></tr></thead>
    <tbody>
      <tr><td><strong>Activity</strong></td><td>Date + normalized quantity</td><td>Volume, growth, market share</td></tr>
      <tr><td><strong>Trade size</strong></td><td>Trade-level prints</td><td>Size composition, block share, largest trades</td></tr>
      <tr><td><strong>Taker behavior</strong></td><td>Price + quantity + aggressor side</td><td>Taker dollars, yes/no preference</td></tr>
      <tr><td><strong>Open interest</strong></td><td>Comparable daily snapshot</td><td>Standing positions and carefully defined turnover</td></tr>
      <tr><td><strong>Fee economics</strong></td><td>Price/quantity + computable schedule</td><td>Effective fee rate and exchange revenue</td></tr>
      <tr><td><strong>Calibration</strong></td><td>Price + outcome + event clustering key</td><td>Actual-vs-implied and honest intervals</td></tr>
      <tr><td><strong>Participant P&amp;L</strong></td><td>Price + outcome + buyer/aggressor identity</td><td>Taker/maker results and market-level P&amp;L</td></tr>
      <tr><td><strong>Parlay structure</strong></td><td>Parlay identity + leg count</td><td>Adoption, length, correlation</td></tr>
      <tr><td><strong>Parlay economics</strong></td><td>Price + parlay outcome + buyer identity</td><td>House edge, realized P&amp;L, cash-outs</td></tr>
    </tbody>
  </table>
</div>

## Core definitions

- **Volume** is the venue's reported trading quantity. ForecastEx reports matched pairs; most other venues report contracts. Mixed-unit tables never total them.
- **Taker-side volume** is the dollars paid by the aggressor, not contract face value.
- **Fee cost** is what one trader pays to execute. **Exchange revenue** is what the venue retains across charged sides after published rebates.
- **Open interest** is an end-of-day stock. **Turnover** is a secondary diagnostic defined literally as reported volume divided by prior reported open interest over the stated window.
- **Calibration error** is actual win rate minus implied probability. Error intervals cluster related prints at the event level where the data supports it.
- **Taker P&amp;L** is used only where aggressor identity is observed. Otherwise the dashboard says buyer result or price bias.

## Taxonomy and chart-level notes

The detailed source-label mappings stay next to the canonical comparison that uses them:

- [Cross-venue product categories](./categories-venues)
- [Cross-venue product taxonomy](./categories-venues)
- [Parlay coverage and definitions](./parlay-venues)
- [Calibration coverage](./compare-accuracy)
- [Market-name and unit coverage](./market-explorer#market-finder)

Each chart keeps only one useful sentence in the reading path. Sampling, joins, mappings, and uncertainty details belong in a collapsed chart note or on this reference page—not in a wall of defensive prose before the result.
