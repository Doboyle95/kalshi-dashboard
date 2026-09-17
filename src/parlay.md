---
title: Parlay P&L
---

# Parlay P&L

How parlay bettors on Kalshi actually do. A parlay needs every leg to hit — the payouts are big, but most expire worthless. These are the real dollars won and lost by the people buying them.

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtUSD   = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
import {createRemoteDataAttachment} from "./components/remote-data.js";
const DataAttachment = createRemoteDataAttachment(d3);
display(DataAttachment.marker);
const uni = await DataAttachment("data/parlay_pnl_unified_daily.csv").csv({typed: true});
const cashoutDaily = await DataAttachment("data/parlay_cashout_daily.csv").csv({typed: true});
const freshness = await DataAttachment("data/freshness_manifest.json").json();
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Parlay P&L", date: latestDate(uni), updatedAt: fileUpdatedAt(freshness, "parlay_pnl_unified_daily.csv"), meta: "Settlement-dependent parlay export", tone: "settlement"}
  ],
  note: "Recent days are still filling in — a parlay only counts here once its markets settle, so today's numbers will keep moving."
}));
display(askPageLink({
  question: "Analyze parlay taker P&L and fee drag, noting whether recent dates may be settlement-incomplete.",
  context: "Parlay P&L page using parlay_pnl_unified_daily.csv and parlay_cashout_daily.csv."
}));
```

```js
// All-time KPIs from the unified trade-level engine (realized = after cash-outs).
const totalNet       = d3.sum(uni, d => d.realized_net);
const totalHoldNet   = d3.sum(uni, d => d.hold_to_settlement_net);
const totalFees      = d3.sum(uni, d => d.fees_total);
const totalHandle    = d3.sum(uni, d => d.handle_yes);
const overallPct     = totalNet / totalHandle * 100;
// What inferred cashing-out bettors actually received: YES value sold back (c * p).
// Do not use cashout_notional here: that is the complementary NO buyer's cost
// (c * (1-p)), which approaches $1 as the seller's proceeds approach $0.
const totalCashoutProceedsKpi = d3.sum(cashoutDaily, d => d.proceeds);
const cashReturnedPctKpi = totalCashoutProceedsKpi / totalHandle * 100;

// Retain the old statistic under its accurate market-flow meaning. It measures
// no-side taker money associated with inferred cash-outs, not cash returned.
const totalCashoutValueKpi = d3.sum(cashoutDaily, d => d.cashout_notional);
// No-side money the cash-out engine classified as ordinary trades rather than sell-backs.
// It stays in the DENOMINATOR — it is still taker money, just not cash-out money — so the
// rate can't rise merely because the numerator was filtered. Absent on data published before
// the classifier shipped, in which case this is 0 and the rate is the old one.
const totalNoncashoutKpi = d3.sum(cashoutDaily, d => d.noncashout_taker_value || 0);
const cashoutFlowShareKpi = totalCashoutValueKpi / (totalHandle + totalCashoutValueKpi + totalNoncashoutKpi) * 100;
```

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Realized P&L (after cash-outs)</div>
    <div class="kpi-value">${fmtUSD(totalNet)}</div>
    <div class="kpi-meta">net of fees</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">If held to settlement</div>
    <div class="kpi-value">${fmtUSD(totalHoldNet)}</div>
    <div class="kpi-meta">no cash-outs</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Return on stakes</div>
    <div class="kpi-value">${overallPct.toFixed(1)}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Total staked</div>
    <div class="kpi-value">${fmtUSD(totalHandle)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Cash returned via cash-outs (est.)</div>
    <div class="kpi-value">${cashReturnedPctKpi.toFixed(1)}%</div>
    <div class="kpi-meta">of opening stakes</div>
  </div>
</div>


<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Parlays pay out only if every leg hits, so most expire worthless — the same dynamic as sportsbook parlays. This page totals what parlay bettors actually won and lost, settled parlays only, computed trade by trade.</p>
  <p>The headline is <em>realized</em> P&L — net of fees and after cash-outs (parlay positions sold back before settlement). The second chart shows the counterfactual where everyone held to the end; the gap between them is what cashing out did to bettors. "Staked" counts only the money bettors put in to <em>open</em> parlays — cashing out isn't counted as a new stake.</p>
  <p>Cash-outs are <strong>inferred, not labelled</strong>. Nothing in the data says "this trade was a cash-out", so we use the shape of the market: parlays are priced on request, so the buyer takes the yes side and a no-side taker is usually someone selling a position back. Two checks remove the sales that can't be — one bigger than everything ever bought on that parlay, and one that would have to pool twenty or more separate earlier buys spread over six hours or longer. What's left is still an estimate.</p>
</details>

```js
// d3.autoType leaves "true"/"false" as strings — coerce robustly.
const isProv = d => d.is_provisional === true || String(d.is_provisional).toLowerCase() === "true";
// Cumulative realized (after cash-outs) and hold-to-settlement (if everyone held).
const uniSorted = uni.slice().sort((a, b) => a.date - b.date);
let _r = 0, _h = 0, _e = 0, _rg = 0;
const cumU = uniSorted.map(d => { _r += d.realized_net; _h += d.hold_to_settlement_net; _rg += d.realized_net + d.fees_total; return {date: d.date, realized: _r, realized_gross: _rg, hold: _h, prov: isProv(d)}; });
const coSorted = cashoutDaily.slice().sort((a, b) => a.date - b.date);
const cumCo = coSorted.map(d => { _e += d.cashout_edge_net; return {date: d.date, edge: _e, prov: isProv(d)}; });
// Provisional (unsealed) days — settlements still arriving; shown distinctly.
const provDays = cumU.filter(d => d.prov);
const provSpan = provDays.length === 1
  ? fmtDate(provDays[0].date)
  : (provDays.length ? `${fmtDate(provDays[0].date)}–${fmtDate(provDays[provDays.length-1].date)}` : "");
const provNote = provDays.length
  ? html`<p class="chart-note">○ The most recent ${provDays.length === 1 ? "day" : provDays.length + " days"} (<strong>${provSpan}</strong>) ${provDays.length === 1 ? "is" : "are"} <strong>provisional</strong> — covering only the parlays that have settled so far. Numerator and denominator move together, so the win rate stays honest; the figures fill in as the rest resolve.</p>`
  : html``;
const parlayPnlDateSel = Mutable([d3.min(uniSorted, d => d.date), d3.max(uniSorted, d => d.date)]);
display(renderDateBrush({
  data: uniSorted.map(d => ({date: d.date, value: Math.abs(d.realized_net) || 0})),
  initialRange: [d3.min(uniSorted, d => d.date), d3.max(uniSorted, d => d.date)],
  onSelect: range => { parlayPnlDateSel.value = range; },
  color: "#0A7B6C",
  width
}));
```

```js
const [parlayPnlFrom, parlayPnlTo] = parlayPnlDateSel;
const inParlayPnlRange = row => row.date >= parlayPnlFrom && row.date <= parlayPnlTo;
```

## What parlay bettors actually lost (after cash-outs)

_Realized P&L for parlay bettors — and **after** accounting for everyone who cashed out early. This is the real money won and lost, including positions sold back before settlement. The two lines show it **before** Kalshi's fees and **after** fees; the gap between them is the fee drag. Settled parlays only; recent days fill in as their markets resolve._

```js
const cumRealized = cumU.flatMap(d => [
  {date: d.date, v: d.realized_gross, s: "Before fees", prov: d.prov},
  {date: d.date, v: d.realized,       s: "After fees",  prov: d.prov}
]);
display(Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative realized P&L (USD)", grid: true, tickFormat: fmtUSD},
  color: {legend: true, domain: ["Before fees", "After fees"], range: ["#5FD0C2", "#0A7B6C"]},
  marks: [
    Plot.areaY(cumU.filter(inParlayPnlRange), {x: "date", y: "realized", fill: "#0A7B6C", fillOpacity: 0.1, curve: "monotone-x"}),
    Plot.lineY(cumRealized.filter(inParlayPnlRange), {x: "date", y: "v", stroke: "s", strokeWidth: 2, curve: "monotone-x"}),
    // Provisional (unsealed) tail: hollow markers so it reads as "not final yet".
    Plot.dot(provDays.filter(inParlayPnlRange), {x: "date", y: "realized_gross", r: 4, fill: "var(--theme-background)", stroke: "#5FD0C2", strokeWidth: 2}),
    Plot.dot(provDays.filter(inParlayPnlRange), {x: "date", y: "realized", r: 4, fill: "var(--theme-background)", stroke: "#0A7B6C", strokeWidth: 2}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumU.filter(inParlayPnlRange), Plot.pointerX({x: "date", y: "realized", title: d => `${fmtDate(d.date)}\nBefore fees: ${fmtUSD(d.realized_gross)}\nAfter fees: ${fmtUSD(d.realized)}${d.prov ? "\n(provisional — settlements still arriving)" : ""}`}))
  ]
}))
```

```js
display(provNote);
```

## If every parlay were held to settlement

_The same bettors' P&L in the counterfactual where **nobody cashed out** — every yes-side position held to the end. The gap between this line and the one above is the net effect of cashing out._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative P&L (USD)", grid: true, tickFormat: fmtUSD},
  color: {legend: true, domain: ["Realized (after cash-outs)", "Held to settlement"], range: ["#0A7B6C", "#5FD0C2"]},
  marks: [
    Plot.lineY(cumU.filter(inParlayPnlRange).flatMap(d => [{date: d.date, v: d.realized, s: "Realized (after cash-outs)"}, {date: d.date, v: d.hold, s: "Held to settlement"}]),
      {x: "date", y: "v", stroke: "s", strokeWidth: 2, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumU.filter(inParlayPnlRange), Plot.pointerX({x: "date", y: "realized", title: d => `${fmtDate(d.date)}\nRealized (after cash-outs): ${fmtUSD(d.realized)}\nHeld to settlement: ${fmtUSD(d.hold)}\nCash-out effect: ${fmtUSD(d.realized - d.hold)}${d.prov ? "\n(provisional — settlements still arriving)" : ""}`}))
  ]
})
```

## The other side of the trade

```js
// Loaded inside this section's own block on purpose: build_chart_catalog.py credits a series
// to the nearest ## heading PRECEDING the DataAttachment call, not to the chart that renders
// it, so a load parked in the page's shared loader block gets filed under the wrong section.
const pmk = await DataAttachment("data/parlay_maker_pnl_daily.csv").csv({typed: true});
```

```js
// Cumulative maker P&L, before and after maker fees. Maker gross is -(taker gross) by
// construction upstream, so before fees this is the exact mirror of the bettor line above.
const pmkSorted = pmk.slice().sort((a, b) => a.date - b.date);
let _mkG = 0, _mkN = 0;
const cumMaker = pmkSorted.map(d => {
  _mkG += d.maker_gross_pnl; _mkN += d.maker_net_pnl;
  return {date: d.date, gross: _mkG, net: _mkN, fees: d.fees_maker, takerNet: d.taker_net_pnl};
});
// Kalshi started charging parlay makers at 05:00 ET on 2026-08-20. Read the date OFF THE DATA
// rather than hardcoding it, so the annotation follows any later restatement of the fee model.
const makerFeeStart = d3.min(pmkSorted.filter(d => d.fees_maker > 0), d => d.date);
const mkFrom     = d3.min(pmkSorted, d => d.date);
const mkGrossTot = d3.sum(pmkSorted, d => d.maker_gross_pnl);
const mkFeesTot  = d3.sum(pmkSorted, d => d.fees_maker);
const mkNetTot   = d3.sum(pmkSorted, d => d.maker_net_pnl);
const tkNetTot   = d3.sum(pmkSorted, d => d.taker_net_pnl);
// Both sides pay, so the two no longer cancel: this gap IS the exchange's total fee take.
const mkFeeWedge = -(mkNetTot + tkNetTot);
```

_The same parlays seen from the other side of the trade — the market makers who sold them. **Before fees** this is the exact mirror of what bettors made: every dollar a bettor loses is a dollar the counterparty wins, so the two lines below are a single line until **${fmtDate(makerFeeStart)}**, when Kalshi began charging parlay makers. **After fees** it stops being a mirror. The exchange bills both sides, so bettors' losses and makers' gains no longer cancel._

<div class="instruction-line"><strong>Why this isn't just the bettor chart flipped.</strong> Over this window makers made <strong>${fmtUSD(mkGrossTot)}</strong> before fees and <strong>${fmtUSD(mkNetTot)}</strong> after, while bettors lost <strong>${fmtUSD(tkNetTot)}</strong> on the same settled parlays. Those two figures no longer sum to zero — the <strong>${fmtUSD(mkFeeWedge)}</strong> difference is what Kalshi took from both sides together.</div>

<p class="chart-note">Settled parlays on a trade-date basis, from ${fmtDate(mkFrom)} — a shorter window than the bettor charts above, which run on the trade-level cash-out engine and reach back further. Maker fees are ${fmtUSD(mkFeesTot)} of the gap; the rest is the takers' own fees.</p>

```js
const cumMakerVis = cumMaker.filter(inParlayPnlRange);
const mkLast = cumMakerVis[cumMakerVis.length - 1];
display(cumMakerVis.length ? Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 320, marginLeft: 76, marginRight: 96,
  x: {type: "utc", label: null},
  y: {label: "Cumulative maker P&L (USD)", grid: true, tickFormat: fmtUSD},
  color: {legend: true, domain: ["Before fees", "After fees"], range: ["#5FD0C2", "#0A7B6C"]},
  marks: [
    Plot.lineY(cumMakerVis.flatMap(d => [
      {date: d.date, v: d.gross, s: "Before fees"},
      {date: d.date, v: d.net,   s: "After fees"}
    ]), {x: "date", y: "v", stroke: "s", strokeWidth: 2, curve: "monotone-x"}),
    // The instant the two series stop being one line.
    Plot.ruleX(makerFeeStart && inParlayPnlRange({date: makerFeeStart}) ? [makerFeeStart] : [],
      {stroke: "var(--theme-foreground-faint)", strokeDasharray: "3,3"}),
    Plot.text(makerFeeStart && inParlayPnlRange({date: makerFeeStart}) ? [makerFeeStart] : [],
      // Bottom-left of the rule: the series climb into the TOP-right corner by this date,
      // so a top-anchored label collides with both lines (seen in the render probe).
      {x: d => d, frameAnchor: "bottom", dy: -8, dx: -6, textAnchor: "end",
       text: () => `maker fees start ${fmtDate(makerFeeStart)}`,
       fill: "var(--theme-foreground-muted)", fontSize: 11}),
    // Direct labels: the pale "Before fees" stroke is under 3:1 against a white page, so the
    // series must stay identifiable without relying on its colour alone. Text keeps text ink.
    Plot.text(mkLast ? [{date: mkLast.date, v: mkLast.gross, s: "Before fees"},
                        {date: mkLast.date, v: mkLast.net,   s: "After fees"}] : [],
      {x: "date", y: "v", text: "s", dx: 7, textAnchor: "start",
       fill: "var(--theme-foreground-muted)", fontSize: 11}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumMakerVis, Plot.pointerX({x: "date", y: "net", title: d =>
      `${fmtDate(d.date)}\nMakers before fees: ${fmtUSD(d.gross)}\nMakers after fees: ${fmtUSD(d.net)}\nMaker fees that day: ${fmtUSD(d.fees)}\nBettors after fees: ${fmtUSD(d.takerNet)}`}))
  ]
}) : html`<p class="chart-note">No settled parlay days in the selected range — this series starts ${fmtDate(mkFrom)}.</p>`);
```

## Cash-outs

<p class="section-intro">Inferred cash-outs returned <strong>${cashReturnedPctKpi.toFixed(1)}¢ per dollar staked</strong> to parlay bettors. The trades account for ${cashoutFlowShareKpi.toFixed(1)}% of taker-side trading flow, but that flow share uses the complementary no buyer's cost — not the cash the exiting bettor received. This chart tracks whether cashing out beat holding to settlement.</p>

<div class="instruction-line"><strong>How we identify a cash-out.</strong> Parlays are priced on request, so the buyer is almost always on the yes side; we count no-side takers as selling back. We exclude sales larger than everything ever bought on that parlay, and sales that would have to pool twenty or more separate earlier buys spread over six hours or longer — neither can be one person cashing out. Treat what remains as an estimate.</div>

_Cumulative cash-out edge: how much bettors gained or lost by cashing out versus holding to the end. Below zero means they left money on the table — selling winners back too cheaply outweighs the busts they dodged._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 280, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Cumulative cash-out edge (USD)", grid: true, tickFormat: fmtUSD},
  marks: [
    Plot.areaY(cumCo.filter(inParlayPnlRange), {x: "date", y: "edge", fill: "var(--accent-negative)", fillOpacity: 0.1, curve: "monotone-x"}),
    Plot.lineY(cumCo.filter(inParlayPnlRange), {x: "date", y: "edge", stroke: "var(--accent-negative)", strokeWidth: 2, curve: "monotone-x"}),
    Plot.ruleY([0], {stroke: "var(--theme-foreground-fainter)"}),
    Plot.tip(cumCo.filter(inParlayPnlRange), Plot.pointerX({x: "date", y: "edge", title: d => `${fmtDate(d.date)}\nCash-out edge: ${fmtUSD(d.edge)}`}))
  ]
})
```

```js
// Daily + cumulative series for the detail charts below (realized basis, net of fees).
let _g = 0, _n = 0;
const dailyDetail = uniSorted.map(d => {
  const stakes = d.handle_yes, net = d.realized_net, gross = d.realized_net + d.fees_total;
  _g += gross; _n += net;
  return {date: d.date, stakes, net, gross, gross_cumul: _g, net_cumul: _n,
          ret: stakes ? net / stakes * 100 : 0, prov: isProv(d)};
});
```

## Daily stakes & return

_Each bar is the money staked on parlays that day; its colour is how the day turned out for bettors — green for a win, red for a loss. The tallest bars are the heavy-action days around big games._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 300, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Daily stakes (USD)", grid: true, tickFormat: fmtUSD},
  color: {type: "diverging", scheme: "RdYlGn", domain: [-50, 50], label: "Return %", legend: true},
  marks: [
    Plot.rectY(dailyDetail.filter(d => d.stakes >= 1000 && inParlayPnlRange(d)), {
      x1: d => d.date, x2: d => new Date(d.date.getTime() + 864e5), y: "stakes",
      fill: d => Math.max(-50, Math.min(50, d.ret)),
      fillOpacity: d => d.prov ? 0.45 : 1,           // provisional day reads as faded
      // NOTE: do NOT add a string-valued `stroke` channel here — a per-datum stroke that
      // returns CSS strings collides with the continuous diverging `color` scale that `fill`
      // uses (continuous vs ordinal) and silently blanks the WHOLE chart. The provisional day
      // stays distinguished by the faded fillOpacity above. (This is exactly what broke it.)
      tip: true,
      title: d => `${fmtDate(d.date)}\nStakes: ${fmtUSD(d.stakes)}\nReturn: ${d.ret.toFixed(1)}%\nNet P&L: ${fmtUSD(d.net)}${d.prov ? "\n(provisional — settlements still arriving)" : ""}`
    }),
    Plot.ruleY([0])
  ]
})
```

## Daily return (% of stakes)

_Each day's parlay return for bettors. Mostly red — long-shot parlays usually miss — with the occasional big green day when enough of them cash._

```js
Plot.plot({
  style: {fontFamily: "var(--font-sans)"}, width, height: 260, marginLeft: 76,
  x: {type: "utc", label: null},
  y: {label: "Return (% of stakes)", domain: [-110, 150], grid: true, tickFormat: d => d + "%"},
  marks: [
    Plot.rectY(dailyDetail.filter(d => d.stakes >= 25000 && inParlayPnlRange(d)), {
      x1: d => d.date, x2: d => new Date(d.date.getTime() + 864e5),
      y: d => Math.max(-110, Math.min(150, d.ret)),
      fill: d => d.ret >= 0 ? "var(--accent-positive)" : "var(--accent-negative)", fillOpacity: 0.75,
      tip: true,
      title: d => `${fmtDate(d.date)}\nReturn: ${d.ret.toFixed(1)}%\nStakes: ${fmtUSD(d.stakes)}`
    }),
    Plot.ruleY([0])
  ]
})
```

<p style="font-size:0.82em;color:#888">Return compares what bettors got back to what they staked, after fees. A 5¢ parlay that hits pays back about 19×, which is why one lucky day can send the line far past +100%.</p>
