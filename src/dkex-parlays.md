---
title: DKeX Parlays
---

# DKeX Parlays

What DKeX's combo book costs the people buying it.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const pct = (n, dp = 1) => `${(100 * (n ?? 0)).toFixed(dp)}%`;
const DKEX = "var(--accent-dkex)";
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const rows = await DataAttachment("data/dkex_parlay_daily.csv").csv({typed: true});
const pnlBins = await DataAttachment("data/dkex_parlay_pnl.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {dateBrush, inDateRange} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay series", date: latestDate(rows), updatedAt: fileUpdatedAt(freshness, "dkex_parlay_daily.csv"), meta: "Public DKeX reports", tone: "competitor"}
  ],
  note: "Dated by TRADE date. A combo resolves after it is bought, so the newest days are the least settled and their P&L keeps moving."
}));
display(askPageLink({
  question: "How do DKeX parlay buyers do, by leg count and by whether the legs span one sport or several?",
  context: "DKeX parlays page using dkex_parlay_daily.csv (date x leg count x sport set) and competitor_parlay_pnl_by_price_daily.csv (buyer P&L by the price paid, venue = DKeX)."
}));
```

```js
// ── Aggregation helpers ─────────────────────────────────────────────────────
// The file's grain is date x legs x sport set, so EVERY view here is a rollup.
// Nothing may be handed to Plot.areaY un-aggregated: it does not sum rows that
// share an (x, fill) and duplicates render as sails.
const SUMCOLS = ["contracts", "trades", "stake_usd", "settled_contracts",
                 "settled_stake_usd", "returned_usd", "won_contracts",
                 "void_contracts", "partial_contracts"];
const zero = () => Object.fromEntries(SUMCOLS.map(c => [c, 0]));
const add = (acc, r) => { for (const c of SUMCOLS) acc[c] += +r[c] || 0; return acc; };
const total = rs => rs.reduce(add, zero());

// Derived measures, defined once so the KPI row and every chart agree.
const withRates = o => ({
  ...o,
  // Price actually PAID, never a bin midpoint -- the rule every outcomes page here follows.
  price: o.settled_contracts ? o.settled_stake_usd / o.settled_contracts : null,
  winRate: o.settled_contracts ? o.won_contracts / o.settled_contracts : null,
  pnl: o.returned_usd - o.settled_stake_usd,
  pnlPctStake: o.settled_stake_usd ? (o.returned_usd - o.settled_stake_usd) / o.settled_stake_usd : null,
  pnlPerContract: o.settled_contracts ? (o.returned_usd - o.settled_stake_usd) / o.settled_contracts : null
});

const ALL = withRates(total(rows));
// NET of DKeX's taker fee plus DraftKings Predictions' applicable introducing-
// broker commission, and the clustered CI, both from dkex_parlay_pnl.csv.
// The gross figure alone is NOT comparable to the numbers other venues publish:
// Kalshi's and Polymarket's comparison rows are both NET as well.
const netPnl = d3.sum(pnlBins, d => +d.pnl || 0);
const netContracts = d3.sum(pnlBins, d => +d.contracts || 0);
const netPerContract = netContracts ? netPnl / netContracts : null;
const ciLo = pnlBins.length ? +pnlBins[0].ci_lo_pct : null;
const ciHi = pnlBins.length ? +pnlBins[0].ci_hi_pct : null;
// ⚠ r.date is a Date OBJECT (remote-data.js autotypes ISO columns), so it is
// keyed on epoch ms and rebuilt with new Date(t). String(date).slice(0,10) gives
// "Wed Aug 26" here, which survives being used as a key and then silently fails
// the moment anything parses it back.
const days = [...new Set(rows.map(r => +r.date))].sort((a, b) => a - b);
const settledShare = ALL.contracts ? ALL.settled_contracts / ALL.contracts : 0;
```

<div class="kpi-grid">
  <div class="kpi-card" data-accent="dkex">
    <div class="kpi-label">Staked on parlays</div>
    <div class="kpi-value" title="${ALL.stake_usd.toLocaleString(undefined, {style: "currency", currency: "USD"})}">${fmtUSD(ALL.stake_usd)}</div>
    <div class="kpi-meta">${fmtCount(ALL.contracts)} contracts, ${days.length} days</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Average price paid</div>
    <div class="kpi-value">${ALL.price ? ALL.price.toFixed(3) : "—"}</div>
    <div class="kpi-meta">implied ${pct(ALL.price)} chance</div>
  </div>
  <div class="kpi-card" data-accent="warning">
    <div class="kpi-label">Actually won</div>
    <div class="kpi-value">${pct(ALL.winRate, 2)}</div>
    <div class="kpi-meta">${fmtCount(ALL.won_contracts)} of ${fmtCount(ALL.settled_contracts)} resolved</div>
  </div>
  <div class="kpi-card" data-accent="negative">
    <div class="kpi-label">Buyer P&amp;L</div>
    <div class="kpi-value" title="${ALL.pnl.toFixed(2)}">${fmtUSD(ALL.pnl)}</div>
    <div class="kpi-meta">${pct(ALL.pnlPctStake, 2)} of stake gross · ${netPerContract != null ? netPerContract.toFixed(5) : "—"}/contract after fees</div>
  </div>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>DKeX launched multi-leg combos on <strong>2026-08-26</strong>. It is the third venue here that can carry real parlay P&amp;L, because it publishes both a parlay marker and a settled outcome &mdash; Kalshi and Polymarket US are the other two. Underdog and Novig mark parlays but never publish an outcome; ForecastEx and Rothera publish outcomes but sell no parlay.</p>
  <p><strong>Stake is taker-YES.</strong> A parlay is quoted by RFQ, so the buyer lifts the quote and is the taker; taker-NO flow is a cash-out counterparty exiting rather than a new stake. Same basis as every other venue's parlay series here.</p>
  <p><strong>Legs and sports come from the settlement report's market name</strong>, which spells the whole combo out &mdash; <em>"Yes - DET Tigers -0.5 - Spread - 1st 5 Innings / Yes - Over 3.5 - Total Runs - 1st 5 Innings"</em>. Each leg is matched back to the single-leg market of the same name to recover its sport, which resolves <strong>99.0%</strong> of legs; a combo with any unresolved leg is counted but left out of the sport split rather than guessed.</p>
  <p><strong>Everything is dated by TRADE date, not settlement date.</strong> A row says how much of the stake placed that day has resolved so far, so the newest days are the least settled. ${pct(settledShare, 1)} of all parlay contracts have resolved. Voided ($0.50) and pro-rated settlements are excluded from P&amp;L and reported separately, so the drop is auditable.</p>
  <p><strong>Two figures, and the fee one is the comparable.</strong> Buyers are down ${fmtUSD(ALL.pnl)} before fees and ${fmtUSD(netPnl)} after the DKeX taker charge plus DraftKings Predictions&rsquo; applicable introducing-broker commission &mdash; ${netPerContract != null ? netPerContract.toFixed(5) : "—"} per contract, the same net basis used for the comparable Kalshi and Polymarket US rows. The clustered 95% interval on the gross return per contract runs ${ciLo != null ? ciLo.toFixed(2) : "—"}% to ${ciHi != null ? ciHi.toFixed(2) : "—"}% &mdash; ${ciLo != null && ciHi != null && ciLo < 0 && ciHi > 0 ? "it <strong>includes zero</strong>, so the gross edge is a point estimate rather than a distinguishable one" : "it <strong>excludes zero</strong>, so the gross edge is distinguishable from noise at that level"}. The interval is clustered on the combo, because every print of one combo shares a single settlement.</p>
  <p>⚠ <strong>This page covers the combos in the trade records, which is about two thirds of them.</strong> DKeX&rsquo;s daily market report accounts for 16,594,228 combo contracts; its time-and-sales report carries 11,304,853 of them, and 26,558 settled combos with report volume appear in no time-and-sales file at all. That is DKeX&rsquo;s own publication, not a gap in collection &mdash; the files were re-downloaded from the source and match. P&amp;L needs an executed price and only the time-and-sales records include one, so every level on this page (stake, contracts) is a floor rather than the venue total. The rates &mdash; price paid, win rate, return on stake &mdash; are measured on 11.2M contracts and are not affected by the missing third unless it trades differently, which cannot be checked.</p>
  <p><strong>The breakdown by price paid</strong> scores every combo trade against its settlement, after DKeX&rsquo;s taker charge plus DraftKings Predictions&rsquo; commission &mdash; on a 1&cent; parlay those come to nearly 60% of the stake. DKeX prices combos in whole cents, so nothing trades below 1&cent;. Its records don&rsquo;t say whether a trade was a buy or a sell, so a parlay sold back before settlement can&rsquo;t be separated out the way Kalshi&rsquo;s cash-outs are: every trade counts as a bet held to the end.</p>
  <p><strong>The parlay-versus-legs chart</strong> prices each leg at the last trade in its own single-leg market within the hour before the parlay traded, and counts only parlays whose legs are all in different games, as Kalshi&rsquo;s chart does. That covers ${dkPvlCoverage == null ? "–" : Math.round(100 * dkPvlCoverage) + "%"} of DKeX&rsquo;s settled parlay money: a parlay with a totals leg such as &ldquo;Over 3.5 runs&rdquo;, which doesn&rsquo;t say which game, two legs in the same game, or a leg with no recent trade is left out.</p>
  <p><strong>The settlement-as-mark trap does not apply here, and it was checked.</strong> On Polymarket a settlement price is a running mark until the contract matured on a prior day, and treating same-day rows as final reports parlay buyers <em>profiting</em>. Every one of DKeX's combo tickers appears in the settlement reports exactly once, so no price ever moves, and 99.6% land on $0.00 or $1.00.</p>
</details>

## Where the money goes

<p class="section-intro">Stake per day, split by how many legs the combo carried.</p>

```js
const byDayLegs = d3.rollup(rows, total, d => +d.date, d => +d.legs);
const legStack = [...byDayLegs].flatMap(([t, m]) => [...m].map(([legs, o]) => ({
  date: new Date(t), legs, label: `${legs} legs`, ...o
})));
const legLabels = [...new Set(legStack.map(d => d.legs))].sort((a, b) => a - b).map(l => `${l} legs`);
// One row per (date, label) by construction of the rollup — asserted, not assumed,
// because a duplicate here is the sails bug and it is silent.
const dupes = legStack.length - new Set(legStack.map(d => `${+d.date}|${d.label}`)).size;
const legRamp = d3.scaleSequential(d3.interpolateViridis).domain([legLabels.length + 1, 0]);
const legColors = legLabels.map((_, i) => legRamp(i));
const wideLegs = [...byDayLegs].map(([t, m]) => {
  const o = {date: new Date(t)};
  for (const l of legLabels) o[l] = 0;
  for (const [legs, v] of m) o[`${legs} legs`] = v.stake_usd;
  o.total = d3.sum(legLabels, l => o[l]);
  return o;
}).sort((a, b) => a.date - b.date);
```

```js
const legStakeRange = view(dateBrush({data: rows, valueAccessor: d => d.stake_usd, color: DKEX, width}));
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 74,
  x: {type: "utc", label: null},
  y: {label: "Staked (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  color: {legend: true, columns: 4, domain: legLabels, range: legColors},
  marks: [
    Plot.areaY(legStack.filter(inDateRange(legStakeRange)), {x: "date", y: "stake_usd", fill: "label",
      order: legLabels.slice().reverse(), curve: "monotone-x", fillOpacity: 0.9}),
    Plot.ruleX(wideLegs.filter(inDateRange(legStakeRange)), Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
    Plot.tip(wideLegs.filter(inDateRange(legStakeRange)), Plot.pointerX({x: "date", title: d =>
      [`${fmtDate(d.date)}  ${fmtUSD(d.total)} staked`]
        .concat(legLabels.filter(l => d[l] > 0).sort((a, b) => d[b] - d[a])
          .map(l => `${l}: ${fmtUSD(d[l])}  (${pct(d[l] / d.total)})`)).join("\n")})),
    Plot.ruleY([0])
  ]
})
```

<div class="instruction-line">${dupes === 0 ? `${days.length} days, ${fmtUSD(ALL.stake_usd)} staked in total.` : `⚠ ${dupes} duplicate (date, leg) rows — this chart is drawing sails; the producer is not aggregating.`}</div>

## What a leg costs

<p class="section-intro">Buyers pay the light bar and win the dark one; the gap between them is the house edge.</p>

```js
const byLegs = [...d3.rollup(rows, total, d => +d.legs)]
  .map(([legs, o]) => ({legs, ...withRates(o)}))
  .filter(d => d.settled_contracts > 0)
  .sort((a, b) => a.legs - b.legs);
const legPairs = byLegs.flatMap(d => [
  {legs: d.legs, kind: "Price paid (implied chance)", value: d.price},
  {legs: d.legs, kind: "Actually won", value: d.winRate}
]);
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 300, marginLeft: 60, marginBottom: 42,
  x: {label: "Legs in the combo", tickFormat: d => `${d}`},
  // NOT percent:true with a [0,1] domain -- that pair renders 100x off and looks
  // exactly like a data bug. Format the ticks instead.
  y: {label: "Chance", grid: true, domain: [0, d3.max(legPairs, d => d.value) * 1.1],
      tickFormat: d => pct(d, 0)},
  color: {legend: true, domain: ["Price paid (implied chance)", "Actually won"],
          range: ["var(--accent-dkex)", "#7b1fa2"]},
  marks: [
    // y1/y2, not a bare y: with two rows per x (price paid, actually won) a bare y makes
    // Plot stack the dark bar on top of the light one and overflow the frame. Both bars
    // must start at zero for the caption ("buyers pay the light bar and win the dark one")
    // to be true.
    Plot.barY(legPairs, {x: "legs", y1: 0, y2: "value", fill: "kind", fx: null,
      dx: 0, insetLeft: 1, insetRight: 1, opacity: d => d.kind === "Actually won" ? 1 : 0.45,
      tip: true, title: d => `${d.legs} legs\n${d.kind}: ${pct(d.value, 2)}`}),
    Plot.ruleY([0])
  ]
})
```

<div class="instruction-line">Priced chance falls from ${pct(byLegs[0].price, 1)} at ${byLegs[0].legs} legs to ${pct(byLegs.at(-1).price, 1)} at ${byLegs.at(-1).legs}; the win rate falls faster, from ${pct(byLegs[0].winRate, 1)} to ${pct(byLegs.at(-1).winRate, 1)}.</div>

## Buyer P&amp;L by leg count

<p class="section-intro">The same gap expressed as a return on stake.</p>

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: 260, marginLeft: 60, marginBottom: 42,
  x: {label: "Legs in the combo", tickFormat: d => `${d}`},
  y: {label: "Buyer P&L (% of stake)", grid: true, tickFormat: d => pct(d, 0)},
  marks: [
    Plot.barY(byLegs, {x: "legs", y: "pnlPctStake",
      fill: d => d.pnlPctStake >= 0 ? "var(--accent-positive)" : "var(--accent-negative)",
      tip: true, title: d => `${d.legs} legs\n${fmtUSD(d.pnl)} on ${fmtUSD(d.settled_stake_usd)} staked`
        + `\n${pct(d.pnlPctStake, 2)} of stake\n${fmtCount(d.settled_contracts)} contracts resolved`}),
    Plot.ruleY([0])
  ]
})
```

<div class="instruction-line" style="border-left-color:var(--theme-foreground-muted)">⚠ ${days.length} days of trading. The aggregate is a large sample in contracts &mdash; ${fmtCount(ALL.settled_contracts)} resolved &mdash; but the per-leg-count bars are not stable yet, and the buckets showing buyers ahead are far more likely to be noise than a real edge. Read the shape, not the individual bars.</div>

## What bettors lost, by the price they paid

```js
// Loaded inside this section on purpose: build_chart_catalog.py credits a series to the nearest
// ## heading PRECEDING its DataAttachment call. A failed load shows the empty-state note instead.
const lossRows = await DataAttachment("data/competitor_parlay_pnl_by_price_daily.csv").csv({typed: true}).catch(() => []);
```

_Share of stakes lost at each price after fees, with the dollars under each bar — ${dkLoss.span}. DKeX never prices a parlay below 1¢._

```js
import {lossByPrice, lossByPriceChart} from "./components/parlay-loss-by-price.js";
const dkLoss = lossByPrice(lossRows, "DKeX");
display(lossByPriceChart(dkLoss, {width}));
```

## What a multi-game parlay costs vs. multiplying its legs

_A multi-game parlay is fairly priced at its legs' prices multiplied together, each taken at the
moment the parlay traded. Over ${fmtDate(dkPvlFrom)} – ${fmtDate(dkPvlTo)} DKeX bettors paid
**${dkPvlFmt(dkPvlMarkup)} more** than that: ${fmtUSD(dkPvlPaid)} for legs worth ${fmtUSD(dkPvlFair)}._

```js
// Loaded inside this section on purpose: build_chart_catalog.py credits a series to the nearest
// ## heading PRECEDING its DataAttachment call. A failed load leaves the empty-state note below.
const dkPvlRaw = await DataAttachment("data/dkex_parlay_vs_legs_profile.csv").csv({typed: true}).catch(() => []);
```

```js
// python/build_dkex_parlay_vs_legs.py: each leg priced at its own single-leg market's last trade
// within the hour before the parlay, legs in different games only -- the same reading as the Kalshi
// diagonal on /parlay-analytics. One dot per quarter-decade band of what the legs are worth.
const dkPvlPrice = dkPvlRaw.filter(d => d.dim === "price");
const dkPvlPoints = dkPvlPrice.filter(d => d.n_trades >= 500).sort((a, b) => a.avg_indep_cents - b.avg_indep_cents);
const dkPvlPaid = d3.sum(dkPvlPrice, d => d.stake_usd), dkPvlFair = d3.sum(dkPvlPrice, d => d.indep_stake_usd);
const dkPvlMarkup = dkPvlFair > 0 ? 100 * (dkPvlPaid / dkPvlFair - 1) : null;
const dkPvlFrom = dkPvlRaw[0]?.first_date, dkPvlTo = dkPvlRaw[0]?.last_date;
const dkPvlCoverage = dkPvlRaw.length ? dkPvlRaw[0].covered_stake_usd / dkPvlRaw[0].settled_stake_usd : null;
// The square domain keeps "priced exactly at its legs" at 45°; it starts a decade below the
// cheapest band drawn, so the 1¢ floor shows with room to its left.
const DKPVL_MAX = 100;
const DKPVL_MIN = 10 ** Math.floor(Math.log10(d3.min(dkPvlPoints, d => d.avg_indep_cents) ?? 0.01));
const dkPvlTicks = d3.range(Math.round(Math.log10(DKPVL_MIN)), 3).map(e => 10 ** e);
const dkPvlFmt = v => v == null ? "–" : (v >= 0.05 ? "+" : v <= -0.05 ? "−" : "")
  + (Math.abs(v) >= 10 ? Math.abs(v).toFixed(0) : Math.abs(v).toFixed(1)) + "%";
const dkPvlTimes = x => x >= 1000 ? `${(+x.toPrecision(2)).toLocaleString("en-US")}×` : x >= 10 ? `${Math.round(x)}×` : `${x.toFixed(1)}×`;
const dkPvlCents = v => v >= 1 ? v.toFixed(1) + "¢" : v >= 0.1 ? v.toFixed(2) + "¢" : v.toFixed(3) + "¢";
const dkPvlAxis = v => v >= 100 ? "$1" : v + "¢";
const dkPvlNearest = cents => d3.least(dkPvlPoints, d => Math.abs(Math.log(d.avg_indep_cents / cents)));
```

_Each dot is a group of tickets with similar odds: across is what their legs are worth
multiplied together, up is what bettors paid, and the shaded gap above the dashed line is the
markup._

```js
{
  if (!dkPvlPoints.length) {
    display(html`<p class="chart-note">This chart's data did not load — try reloading the page.</p>`);
  } else {
    const H = Math.round(Math.min(500, Math.max(340, width * 0.66)));
    const m = {left: 56, right: 24, top: 24, bottom: 44};
    // Screen angle of the corner-to-corner diagonal, so its label runs along it.
    const diagAngle = -Math.atan2(H - m.top - m.bottom, width - m.left - m.right) * 180 / Math.PI;
    // Direct labels: the markup near 10¢ and 1¢, and how far above its legs the cheapest band sits.
    const labelled = [...new Set(width >= 600 ? [dkPvlNearest(10), dkPvlNearest(1)] : [dkPvlNearest(10)])].filter(Boolean);
    const floorDot = dkPvlPoints[0];
    const ticks = width >= 600 ? dkPvlTicks : dkPvlTicks.filter((t, i) => i % 2 === (dkPvlTicks.length - 1) % 2);
    const halo = {stroke: "var(--theme-background)", strokeWidth: 4, paintOrder: "stroke"};
    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)", fontSize: "12px"},
      width, height: H, marginLeft: m.left, marginRight: m.right, marginTop: m.top, marginBottom: m.bottom,
      x: {type: "log", domain: [DKPVL_MIN, DKPVL_MAX], ticks, tickFormat: dkPvlAxis, tickSize: 0, grid: true,
          label: "What the legs are worth together"},
      y: {type: "log", domain: [DKPVL_MIN, DKPVL_MAX], ticks, tickFormat: dkPvlAxis, tickSize: 0, grid: true,
          label: "What the parlay cost"},
      marks: [
        Plot.areaY(dkPvlPoints, {x: "avg_indep_cents", y1: "avg_indep_cents", y2: "avg_traded_cents",
          fill: DKEX, fillOpacity: 0.18, curve: "monotone-x"}),
        Plot.line([[DKPVL_MIN, DKPVL_MIN], [DKPVL_MAX, DKPVL_MAX]],
          {stroke: "var(--theme-foreground-faint)", strokeDasharray: "4 4"}),
        Plot.text([[DKPVL_MIN * 10, DKPVL_MIN * 10]], {x: d => d[0], y: d => d[1], text: () => "Priced exactly at its legs",
          rotate: diagAngle, dy: 14, fontSize: 11, fill: "var(--theme-foreground-muted)"}),
        Plot.line(dkPvlPoints, {x: "avg_indep_cents", y: "avg_traded_cents", stroke: DKEX, strokeWidth: 2, curve: "monotone-x"}),
        Plot.dot(dkPvlPoints, {x: "avg_indep_cents", y: "avg_traded_cents", r: 3.5, fill: DKEX,
          stroke: "var(--theme-background)", strokeWidth: 1.5}),
        Plot.text(labelled, {x: "avg_indep_cents", y: "avg_traded_cents", text: d => dkPvlFmt(d.markup_pct),
          textAnchor: "end", dx: -8, dy: -9, fontSize: 11, fontWeight: 600, fill: "var(--theme-foreground)", ...halo}),
        Plot.text([floorDot], {x: "avg_indep_cents", y: "avg_traded_cents",
          text: d => `${(+(1 + d.markup_pct / 100).toPrecision(1)).toLocaleString("en-US")}× its legs`,
          textAnchor: "start", dx: 2, dy: -12, fontSize: 11, fontWeight: 600, fill: "var(--theme-foreground)", ...halo}),
        Plot.text([[DKPVL_MIN * 1.3, 4]], {x: d => d[0], y: d => d[1],
          text: () => width >= 600 ? "Prices stop falling at 1¢,\nhowever little the legs are worth" : "Prices stop\nfalling at 1¢",
          textAnchor: "start", lineAnchor: "bottom", fontSize: 11, fill: "var(--theme-foreground-muted)"}),
        Plot.tip(dkPvlPoints, Plot.pointer({x: "avg_indep_cents", y: "avg_traded_cents",
          title: d => `Legs worth ${dkPvlCents(d.avg_indep_cents)} together\n`
            + `Paid ${dkPvlCents(d.avg_traded_cents)} · `
            + (d.markup_pct >= 100 ? `${dkPvlTimes(1 + d.markup_pct / 100)} its legs` : `markup ${dkPvlFmt(d.markup_pct)}`) + `\n`
            + `${fmtCount(d.n_trades)} trades · ${fmtUSD(d.stake_usd)} staked`}))
      ]
    }));
  }
}
```

## One sport or several

<p class="section-intro">Whether a combo's legs sit in a single sport, and which sports get combined.</p>

```js
const byMix = [...d3.rollup(rows, total, d => d.sport_mix)]
  .map(([mix, o]) => ({mix, ...withRates(o)}))
  .sort((a, b) => b.stake_usd - a.stake_usd);
const bySports = [...d3.rollup(rows.filter(r => r.sports), total, d => d.sports)]
  .map(([sports, o]) => ({sports, ...withRates(o)}))
  .sort((a, b) => b.stake_usd - a.stake_usd)
  .slice(0, 10);
const known = d3.sum(byMix.filter(d => d.mix !== "unknown"), d => d.stake_usd);
const cross = byMix.find(d => d.mix === "cross-sport")?.stake_usd ?? 0;
```

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"},
  width, height: Math.max(140, bySports.length * 30 + 46), marginLeft: 190, marginBottom: 40,
  x: {label: "Staked (USD)", grid: true, tickFormat: d => fmtUSD(d)},
  y: {label: null},
  marks: [
    Plot.barX(bySports, {x: "stake_usd", y: "sports", sort: {y: "x", reverse: true},
      fill: d => d.sports.includes(" + ") ? "#7b1fa2" : DKEX, fillOpacity: 0.8,
      tip: true, title: d => `${d.sports}\n${fmtUSD(d.stake_usd)} staked`
        + `\n${fmtCount(d.contracts)} contracts`
        + (d.winRate != null ? `\nwon ${pct(d.winRate, 2)} against ${pct(d.price, 2)} priced` : "")}),
    Plot.ruleX([0])
  ]
})
```

<div class="instruction-line">${pct(cross / known, 1)} of the stake whose legs all resolved to a sport crosses more than one sport (purple).</div>
