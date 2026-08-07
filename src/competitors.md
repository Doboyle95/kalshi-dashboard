---
title: Competitors
---

<div class="page-hero" data-accent="kalshi">
  <div class="page-eyebrow">Comparison</div>
  <h1>Platform Comparison</h1>
  <p class="page-lead">Every US regulated prediction-market venue on one chart — Kalshi, Polymarket US, ForecastEx, Crypto.com/Nadex, CME (where FanDuel and DraftKings clear), and Rothera (Robinhood's own exchange). Kalshi is the story; switch to log scale to see the rest underneath it. CME is collected by hand from daily bulletins, so its line is sparse.</p>
  <p class="page-lead">DKeX (DraftKings, formerly Railbird) is included as the orange line from its public daily reports.</p>
  <p class="page-lead">Underdog Exchange (Underdog Fantasy's own exchange) is included as the yellow line from its public daily reports — it's a brand-new, very low-volume venue, so expect a mostly-flat line with the occasional spike.</p>
</div>

<details class="surface-card compact-details">
  <summary>About this page</summary>
  <p>Kalshi comes from cleaned internal daily aggregates; competitor series come from public daily platform reports normalized into <code>competitor_daily.csv</code>. The brush changes the visible window, not the underlying all-time source data.</p>
  <p><strong>Fee convention.</strong> Kalshi bills the taker on almost every market — it also charges the resting side on a named subset (soccer, tennis, rate and inflation markets), about 12% of its 2026 fee revenue. Every other venue on this page bills both sides on everything. The metric toggle therefore never mixes the two: <em>Fees</em> is the <strong>per-side</strong> cost &mdash; what one trader pays to execute &mdash; which is the number that stays comparable to Kalshi, and <em>Exchange revenue</em> is everything the venue collects from all sides less any maker rebate it pays out. Plotting raw fee numbers side by side would draw every competitor as roughly twice as expensive as it really is.</p>
  <p>On a linear scale, Kalshi turns every other platform into a flat line. Log scale is where the smaller-platform race becomes visible.</p>
</details>

```js
const kalshi     = await FileAttachment("data/daily_overall.csv").csv({typed: true});
const competitor = await FileAttachment("data/competitor_daily.csv").csv({typed: true});
const cme        = await FileAttachment("data/cme_daily_distributed.csv").csv({typed: true});
// Traded value per venue-day. competitor_daily.csv carries contracts and fees but
// no traded value, so the effective-rate chart reads it from each venue's own
// published daily file where one exists. If competitor_daily.csv ever grows a
// traded_value column that one wins (see fromCompetitor below), and these two
// become redundant rather than wrong.
const dkexDaily     = await FileAttachment("data/dkex_daily.csv").csv({typed: true});
const underdogDaily = await FileAttachment("data/underdog_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
// Kalshi's end-of-day open-interest snapshot. It has to come from its own file rather
// than from the open_interest column of competitor_daily.csv, for the same reason the
// Kalshi volume line does (see platforms[0] below): this page never reads Kalshi out of
// competitor_daily. This is also the exact series the Volume page charts, so the two
// pages cannot disagree. kalshi_taker_oi_daily.csv is NOT a substitute -- it ends
// 2026-04-14.
const kalshiOi = await FileAttachment("data/kalshi_oi_daily.csv").csv({typed: true});
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
// One shared turnover definition, mirrored in the pipeline's R/competitor_oi_helpers.R:
// volume over the PRIOR day's open interest, smoothed as a 7-day ratio of sums, with a
// missing or zero denominator producing a gap rather than a number.
import {buildTurnover, kalshiOiRows, TURNOVER_WINDOW_DAYS} from "./components/turnover.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Kalshi", date: latestDate(kalshi), updatedAt: fileUpdatedAt(freshness, "daily_overall.csv"), meta: "Can be within 15 minutes locally when the collector is running"},
    {label: "Competitors", date: latestDate(competitor.filter(d => d.platform !== "Kalshi")), updatedAt: fileUpdatedAt(freshness, "competitor_daily.csv"), meta: "Public platform files/scrapes", tone: "competitor"},
    {label: "Open interest (Kalshi)", date: latestDate(kalshiOi), updatedAt: fileUpdatedAt(freshness, "kalshi_oi_daily.csv"), meta: "End-of-day snapshot written for the PREVIOUS day at about 04:00 ET, so it always trails the volume rows by a day"}
  ],
  note: "Kalshi rows can be fresher than competitor rows. Polymarket, ForecastEx, DKeX, Underdog Exchange, Crypto.com/Nadex, and Rothera update when their external files are downloaded and rebuilt."
}));
display(askPageLink({
  question: "Compare the latest Kalshi volume with Polymarket US, ForecastEx, DKeX, Underdog Exchange, Crypto.com/Nadex, and Rothera, noting any freshness caveats.",
  context: "Platform Comparison page using daily_overall.csv and competitor_daily.csv."
}));
```

```js
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
// is_partial in daily_overall.csv is the string "TRUE"/"FALSE" (uppercase) which
// d3.autoType does not coerce to boolean, so naive truthiness fails. Use explicit
// check. Same helper volume.md uses -- keep the two in sync.
const isPartial = d => d.is_partial === true || d.is_partial === "TRUE";

// -- Fee convention -----------------------------------------------------------
// Kalshi bills the TAKER ONLY; every other venue on this page bills BOTH sides.
// Each venue therefore carries two fee numbers and they never share an axis:
//   fees    -- per-side cost: what ONE trader pays to execute. For a both-sides
//              venue this is the ONE-side amount, NOT the sum. This is what stays
//              comparable to Kalshi, so it is what the chart shows by default.
//   revenue -- what the exchange keeps: every side's fee MINUS any maker rebate
//              paid out. Polymarket US rebates its makers, so its revenue sits
//              BELOW its taker fee rather than above it.
// d3.autoType turns a missing column into undefined and an empty cell into null,
// and `+null` is 0 -- which would silently draw a column that has not been
// backfilled yet as a flat zero line. num() collapses all three to null so the
// line breaks instead of lying.
const num = v => (v == null || v === "" || Number.isNaN(+v)) ? null : +v;

// A published per-side fee of exactly $0 on a day with real volume is not a real
// zero -- every venue here charges the aggressor something on every print. It
// means the upstream file lost its fee column: Polymarket US 2026-06-15 and
// 2026-06-18 are exactly that, 337.8M contracts between them, currently drawn at
// $0. Show a gap, not a crash to zero. Per-side series ONLY: exchange REVENUE can
// legitimately net to about zero (Polymarket's Mar-2026 10bp-taker / 10bp-maker-
// rebate regime did precisely that), so a zero there is kept.
const perSideFee = (fee, contracts) => {
  const f = num(fee);
  return (f === 0 && num(contracts) > 0) ? null : f;
};

// open_interest is a SNAPSHOT of the contracts standing at a date's close -- a stock,
// not a flow. It is never summed across dates anywhere on this page.
// A reported 0 is not a real zero here. None of the venues that publish open interest
// has ever genuinely held none while trading, so a 0 means the upstream row lost its
// value; left as 0 it would draw a crash to the axis on the chart and, worse, become a
// divide-by-zero denominator in turnover. Collapse it to null so the line breaks.
const snapshotOi = v => { const n = num(v); return n > 0 ? n : null; };
```

```js
// One row shape for every venue: {date, contracts, fees, revenue, tradedValue}.
// fees/revenue are the per-side and all-sides-less-rebates numbers described above;
// tradedValue is the denominator of the effective-rate chart. Any of the three can
// be null and every chart treats null as "no line here", never as zero.
const tvByDate = rows => new Map((rows ?? []).map(d => [+d.date, num(d.yes_side_notional)]));
const dkexTradedValue     = tvByDate(dkexDaily);
const underdogTradedValue = tvByDate(underdogDaily);

const fromCompetitor = (key, tvMap) => competitor.filter(d => d.platform === key)
  .map(d => ({
    date: d.date,
    contracts: num(d.contracts),
    fees: perSideFee(d.fees, d.contracts),
    revenue: num(d.fees_exchange_revenue),
    tradedValue: num(d.traded_value) ?? (tvMap ? (tvMap.get(+d.date) ?? null) : null),
    // Both of these are new pipeline columns. num()/snapshotOi() turn a column that does
    // not exist yet into null rather than 0, so a chart that reads them degrades to "no
    // line" instead of "flat zero line".
    openInterest: snapshotOi(d.open_interest),
    oiBearingContracts: num(d.contracts_oi_bearing)
  }));

// CME publishes a flat $0.01 per contract PER SIDE for every membership category,
// effective 2025-12-08 (SER 9587RR), with a $0.00 cash-settlement fee. That is a
// published rate rather than an estimate, so the page applies it directly -- but
// ONLY inside its regime. Before 2025-12-08 CME was tiered ($0.15/$0.03 Globex plus
// a settlement fee) AND the same notice redenominated the contract from $0.00-$100.00
// to $0.00-$1.00, a 100x change, so older bulletin volume is not even the same unit
// and gets no fee number at all. If the pipeline ever publishes a CME fee column it
// takes precedence over this.
const CME_FLAT_FROM      = new Date("2025-12-08T00:00:00Z");
const CME_RATE_PER_SIDE  = 0.01;

const platforms = [
  {
    name: "Kalshi", color: "#00C2A8",
    // Kalshi MUST come from daily_overall.csv (loaded above), never from the Kalshi
    // rows in competitor_daily.csv: near_live_update.R recomputes daily_overall every
    // ~7 min but only *copies* competitor_daily, so the latter's current-day row lags
    // by hours -- 106,790,077 vs 232,872,916 contracts on 2026-08-06.
    // `partial` rides along so the charts can mark today's still-filling value.
    // revenue === fees: Kalshi pays no maker rebate, so it keeps everything it
    // charges. Note this is fees_total (taker + maker); Kalshi does bill the
    // resting side on soccer, tennis, rate and inflation markets, so its line is
    // ~14% above a pure per-side number. See R/utils.R:957.
    data: kalshi.map(d => ({
      date: d.date,
      contracts: d.contracts_total,
      fees: num(d.fees_total),
      revenue: num(d.fees_total),
      tradedValue: num(d.yes_side_notional),
      partial: isPartial(d)
    }))
  },
  {
    name: "Polymarket US", color: "#3B7DD8",
    data: fromCompetitor("Polymarket_US")
  },
  {
    name: "ForecastEx", color: "#E53535",
    data: fromCompetitor("ForecastEx")
  },
  {
    name: "DKeX", color: "#F97316",
    data: fromCompetitor("DKeX", dkexTradedValue)
  },
  {
    name: "Underdog Exchange", color: "#EAB308",
    data: fromCompetitor("Underdog Exchange", underdogTradedValue)
  },
  {
    name: "Crypto.com/Nadex", color: "#9c27b0",
    data: fromCompetitor("Crypto.com/Nadex")
  },
  {
    name: "CME (FanDuel + DraftKings)", color: "#9A6D1F",
    data: cme.filter(d => d.cme_total_vol > 0).map(d => {
      const vol = +d.cme_total_vol;
      const inRegime = d.date >= CME_FLAT_FROM;
      return {
        date: d.date,
        contracts: vol,
        fees:    num(d.fees) ?? (inRegime ? CME_RATE_PER_SIDE * vol : null),
        revenue: num(d.fees_exchange_revenue) ?? (inRegime ? 2 * CME_RATE_PER_SIDE * vol : null),
        tradedValue: num(d.traded_value)
      };
    })
  },
  {
    // Robinhood brand green (Rothera = Robinhood's exchange); orange is DKeX's now.
    name: "Rothera", color: "#00C805",
    data: fromCompetitor("Rothera")
  }
];

const colorDomain = platforms.map(p => p.name);
const colorRange  = platforms.map(p => p.color);
const all = platforms.flatMap(p => p.data.map(d => ({...d, platform: p.name})));

// -- Availability guards ------------------------------------------------------
// `fees_exchange_revenue` and `traded_value` are pipeline columns that do not exist
// yet for every venue. Nothing here assumes they do. A metric is OFFERED only once
// enough real numbers back it, so the window between shipping this page and the
// pipeline backfilling cannot produce an all-zero or one-line chart -- the option
// simply is not there. Kalshi is excluded from the count because its revenue is
// derived on this page (taker-only, so revenue === fees) and would make the guard
// pass on its own; two venues is the minimum that makes a comparison a comparison.
// `> 0` rather than `!= null` on purpose: it rejects a column that exists but is
// empty AND a column that exists but backfilled to all zeros, which is the shape a
// half-finished pipeline change takes.
const venuesWith = key =>
  platforms.filter(p => p.name !== "Kalshi" && p.data.some(d => d[key] > 0)).map(p => p.name);
const revenueVenues = venuesWith("revenue");
const hasRevenue    = revenueVenues.length >= 2;
const metricOptions = hasRevenue ? ["contracts", "fees", "revenue"] : ["contracts", "fees"];
const metricLabels  = {contracts: "Volume", fees: "Fees (one side)", revenue: "Exchange revenue"};

// Basis points of traded value needs BOTH a fee and a traded-value denominator.
// Offered only when at least two venues can produce it -- a comparison chart with a
// single line is not a comparison. Falls back to cents per contract, which needs
// only contracts and fees and is therefore available for every venue that has a fee.
const bpsCapable  = platforms.filter(p => p.data.some(d => d.fees > 0 && d.tradedValue > 0));
const rateUnitOptions = bpsCapable.length >= 2 ? ["cents", "bps"] : ["cents"];
const rateUnitLabels  = {cents: "Cents per contract", bps: "Basis points of traded value"};
```

```js
// Date brush — uses Kalshi daily as background sparkline
function makeDateBrush(defaultStart) {
  const h = 60, mt = 4, mb = 20, ml = 8, mr = 8;
  const w = width;
  const x = d3.scaleUtc().domain(d3.extent(kalshi, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(kalshi, d => d.contracts_total) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg")
    .attr("width", w).attr("height", h)
    .style("display", "block")
    .style("background", "var(--theme-background-alt)")
    .style("border", "1px solid var(--card-border)")
    .style("border-radius", "4px")
    .style("margin-bottom", "1.5rem");

  svg.append("path")
    .datum(kalshi)
    .attr("fill", "#00C2A8").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(d.contracts_total))
      .curve(d3.curveBasis));

  svg.append("g")
    .attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const defaultEnd = d3.max(kalshi, d => d.date);
  const brush = d3.brushX()
    .extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;
      if (!event.selection) {
        // Clearing the brush (a bare click) now means "show everything": reset to
        // the full domain and redraw the selection so the visuals match the filter.
        svg.property("value", x.domain());
        brushG.call(brush.move, x.domain().map(x));   // programmatic move — guarded above, no re-fire
        svg.dispatch("input");
        return;
      }
      svg.property("value", event.selection.map(x.invert)); svg.dispatch("input");
    });

  const brushG = svg.append("g").attr("class", "brush");


  brushG.call(brush).call(brush.move, [defaultStart, defaultEnd].map(x));
  svg.selectAll(".handle").style("fill", "#00C2A8").style("fill-opacity", 0.8);
  svg.property("value", [defaultStart, defaultEnd]);
  return svg.node();
}
```

<p class="section-intro">Platform volume, day by day. Flip to Fees when the question is who's actually getting paid.</p>

```js
const dr_abs = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_abs;
  // Axis ticks stay coarse (.toFixed(1) billions)
  const fmt = metric === "contracts"
    ? d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(1)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));
  // #94: finer billions for the hover tip (.toFixed(2) → "2.91B" not "2.9B")
  const fmtFine = metric === "contracts"
    ? d => (d >= 1e9 ? (d/1e9).toFixed(2)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
    : d => "$"+(d >= 1e6 ? (d/1e6).toFixed(2)+"M" : d >= 1e3 ? (d/1e3).toFixed(0)+"k" : d.toFixed(0));

  const filteredAll = all.filter(d => d.date >= s && d.date <= e);

  const tipPivot = Array.from(
    d3.rollup(
      filteredAll.filter(d => d[metric] != null),
      rs => {
        const o = {date: rs[0].date};
        for (const r of rs) o[r.platform] = r[metric];
        o.partial = rs.some(r => r.platform === "Kalshi" && r.partial);
        return o;
      },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date);

  // Partial-day treatment, copied from volume.md V1 so the two pages read the same:
  // solid line/fill over complete days, a dashed bridge into today, and a distinct
  // orange marker on today's still-filling point. Without this the Kalshi line dives
  // to whatever has been collected so far and reads as a crash -- 1,276,366,440 on
  // 2026-08-05 to 232,872,916 on 2026-08-06 (-81.8%), every single day.
  const kWindow   = platforms[0].data.filter(d => d.date >= s && d.date <= e && d[metric] != null);
  const kComplete = kWindow.filter(d => !d.partial);
  const kPartial  = kWindow.filter(d =>  d.partial);
  const kBridge   = kComplete.length && kPartial.length ? [kComplete.at(-1), kPartial[0]] : [];

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 380,
    marginLeft: 70,
    marginRight: 16,
    x: {type: "utc", label: null},
    y: {
      type: compLogScale === "Log" ? "log" : "linear",
      label: metric === "contracts" ? "Daily volume (contracts)"
           : metric === "revenue"   ? "Daily exchange revenue, all sides ($)"
           : "Daily fees, one side ($)",
      grid: true,
      tickFormat: fmt
    },
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      Plot.areaY(kComplete, {
        x: "date", y: metric,
        fill: platforms[0].color, fillOpacity: 0.08,
        curve: "monotone-x"
      }),
      Plot.areaY(kBridge, {
        x: "date", y: metric,
        fill: platforms[0].color, fillOpacity: 0.04,
        curve: "monotone-x"
      }),
      Plot.lineY(kComplete, {
        x: "date", y: metric,
        stroke: platforms[0].color, strokeWidth: 2.5,
        curve: "monotone-x"
      }),
      Plot.lineY(kBridge, {
        x: "date", y: metric,
        stroke: platforms[0].color, strokeWidth: 2.5,
        strokeDasharray: "5,3", curve: "monotone-x"
      }),
      Plot.dot(kPartial, {
        x: "date", y: metric,
        fill: "#ff8c00", r: 4, stroke: "var(--theme-background)", strokeWidth: 1.5
      }),
      ...platforms.slice(1).map(p =>
        Plot.lineY(p.data.filter(d => d.date >= s && d.date <= e && d[metric] != null), {
          x: "date", y: metric,
          stroke: p.color,
          strokeWidth: 1.75,
          curve: "monotone-x"
        })
      ),
      Plot.ruleX(tipPivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(tipPivot, Plot.pointerX({
        x: "date",
        title: d => [
          fmtDate(d.date),
          d.partial ? "Kalshi partial day — still filling" : null,
          ...colorDomain.map(p => d[p] != null ? `${p}: ${fmtFine(d[p])} (${d[p].toLocaleString()})` : null)
        ].filter(Boolean).join("\n")
      })),
      ...(compLogScale === "Log" ? [] : [Plot.ruleY([0])])
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem"><strong>Fees here means what ONE trader pays to execute.</strong> Kalshi bills the taker on almost every market (it also charges the resting side on soccer, tennis, rate and inflation markets, about 12% of its 2026 fee revenue); Polymarket US, ForecastEx, Crypto.com/Nadex, DKeX, Underdog Exchange, Rothera and CME all bill both sides. This series is the per-side amount at every venue, so a both-sides venue is not drawn as twice as expensive as it is; <em>Exchange revenue</em>, where offered, is the other question — everything the venue collects from all sides, less any maker rebate it pays out. Underdog Exchange charges Kalshi's exact 0.07 coefficient but to both sides, so its per-side line is comparable to Kalshi's while it collects about twice as much per matched trade. Polymarket US pays its makers a rebate, so its revenue is <em>below</em> its taker fee.</p>
<p style="font-size:0.82em;color:#999;margin-top:0.5rem"><strong>Approximations you are looking at.</strong> <em>Rothera is the softest number on the chart, twice over:</em> its published file is end-of-day market data rather than a trade tape, so a daily price per market stands in for each trade's price, and the fee curve is bowed enough that collapsing a day's price path to a single point does not average out; and it charges professional trading firms six times retail while publishing no participant type at all, so the split between them is assumed, not measured. <em>Polymarket US</em> has changed fee schedule six times since launch and only two of those boundary dates are confirmed from a filing index — the rest are inferred from the standard "one business day following certification" language, so earlier fees carry date risk; its 2026-06-15 and 2026-06-18 fee columns are missing upstream and are drawn as gaps rather than zeros. <em>CME</em> has no upstream fee series: its line is computed on this page from the published flat $0.01 per contract per side effective 2025-12-08, and no fee is shown for any earlier CME date because the rate was tiered and the contract was 100x larger. <em>Crypto.com/Nadex</em> is the published $0.02 per contract per side for $1 contracts, but the last five weeks of it rest on a help-centre article rather than a filed schedule. <strong>Its fees before August 2025 are not a published rate at all</strong> — that era traded $100-denominated contracts at a higher per-contract fee, and the tier drawn here is inferred from a partially-reproduced extraction of the bulletin PDFs plus the traded price scale in the venue's own time-and-sales. Part of that window was still $100-denominated, so the figure is a floor rather than a measurement. And its "per side" wording has not been settled between buyer-and-seller and open-and-close — if it means the latter, its exchange-revenue line is up to twice what it should be. <strong>Every venue's number is an upper bound</strong> — volume-tier rebates and confidential market-maker programs are real, are granted in perpetuity at several venues, and are unobservable to us. Exchange fees only: FanDuel, DraftKings, Robinhood and Underdog's app charge their own commissions on top (Robinhood's is several times Rothera's exchange fee), except DraftKings on DKeX, whose retail fee is inclusive of it.</p>
<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Shared Y-axis — the scale gap is real. Kalshi = US exchange trade records. Polymarket US = US-accessible volume only (separate from global Polymarket). ForecastEx = full exchange volume; its quantity counts matched pairs, not single contracts. Crypto.com/Nadex = event binary contracts only (from the exchange's own daily bulletins, starts Dec 2024). CME = FanDuel + DraftKings combined event-contract volume (both clear through CME), hand-collected from daily bulletins so it's sparse. CME lumps each weekend's volume into the following Monday's bulletin, so here we spread Monday (and holiday-weekend) volume back across the days it actually traded, so the line reflects when activity happened rather than spiking every Monday. (The CME page itself shows the raw bulletin numbers.) DraftKings no longer routes exclusively to CME — it owns DKeX — so the CME line may not capture all DraftKings activity after May 2026. Today's Kalshi point is still filling, so it is drawn as a dashed segment ending in an orange dot instead of a solid line — the dip into it is how much has been collected so far, not a real fall in trading.</p>

<div class="control-strip">

```js
// metricOptions omits "revenue" until fees_exchange_revenue actually carries
// numbers, so the option can never be selected into an empty chart.
const metric       = view(Inputs.radio(metricOptions, {value: "contracts", label: "Metric", format: x => metricLabels[x]}));
const compLogScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

</div>

## Effective fee rate

<p class="section-intro">Absolute fees mostly just track volume — the venue with the most contracts wins, and you learn nothing about price. This is the chart that answers who is actually expensive: what one trader pays per contract traded.</p>

<div class="instruction-line"><strong>How to read it:</strong> a flat horizontal line is a venue that charges a fixed amount per contract, so its rate carries no information beyond the published number. A line that wanders is a venue whose fee depends on price — Kalshi, Underdog Exchange, Polymarket US and Rothera all charge a parabola that peaks at 50c and vanishes at the tails, so their realized rate rises whenever the day's trading sits nearer a coin flip.</div>

```js
const dr_rate = view(makeDateBrush(new Date("2026-01-01")));
```

```js
{
  const [s, e] = dr_rate;

  // Per-side fee only. "Exchange revenue per contract" answers a different question
  // and mixing the two on one axis is exactly the defect this page had before.
  // Kalshi's partial day is dropped: its price mix is only whatever has been
  // collected so far, so its ratio is not yet a day's rate.
  const usable = d => d.fees != null && d.contracts > 0 && !d.partial &&
    (rateUnit === "cents" || (d.tradedValue != null && d.tradedValue > 0));
  const rateOf = d => rateUnit === "cents"
    ? d.fees / d.contracts * 100      // cents per contract
    : d.fees / d.tradedValue * 1e4;   // basis points of traded value

  const rateSeries = platforms
    .map(p => ({
      name: p.name,
      values: p.data
        .filter(d => d.date >= s && d.date <= e && usable(d))
        .map(d => ({date: d.date, platform: p.name, rate: rateOf(d)}))
    }))
    .filter(sr => sr.values.length > 0);

  // Name what is absent. A venue that silently drops out of a comparison reads as
  // "cheap" rather than "not measured", which is the failure mode this page exists
  // to avoid.
  const shown   = new Set(rateSeries.map(sr => sr.name));
  const missing = platforms.map(p => p.name).filter(n => !shown.has(n));
  const flat    = rateSeries.flatMap(sr => sr.values);

  if (flat.length === 0) {
    display(html`<p class="chart-note">No venue in this window has both a fee and a
      denominator yet, so there is nothing to rate. Widen the brush, or switch the unit.</p>`);
  } else {
    const pivot = Array.from(
      d3.rollup(flat, rs => {
        const o = {date: rs[0].date};
        for (const r of rs) o[r.platform] = r.rate;
        return o;
      }, d => +d.date)
    ).map(([, v]) => v).sort((a, b) => a.date - b.date);

    const fmtRate = rateUnit === "cents"
      ? v => v.toFixed(3) + "c"
      : v => v.toFixed(1) + " bp";

    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width,
      height: 300,
      marginLeft: 70,
      marginRight: 16,
      x: {type: "utc", label: null},
      y: {
        label: rateUnit === "cents"
          ? "Fee per contract, one side (cents)"
          : "Fee as a share of traded value, one side (bp)",
        grid: true,
        tickFormat: d => rateUnit === "cents" ? d.toFixed(2) + "c" : d.toFixed(0)
      },
      color: {legend: true, domain: colorDomain, range: colorRange},
      marks: [
        ...rateSeries.map(sr =>
          Plot.lineY(sr.values, {
            x: "date", y: "rate",
            stroke: "platform", strokeWidth: 1.75, curve: "monotone-x"
          })
        ),
        Plot.ruleX(pivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
        Plot.tip(pivot, Plot.pointerX({
          x: "date",
          title: d => [
            fmtDate(d.date),
            ...colorDomain.map(p => d[p] != null ? `${p}: ${fmtRate(d[p])}` : null)
          ].filter(Boolean).join("\n")
        })),
        Plot.ruleY([0])
      ]
    }));

    if (missing.length) {
      display(html`<p class="chart-note"><strong>Not shown:</strong> ${missing.join(", ")}
        — no fee number${rateUnit === "bps" ? ", or no traded value to divide by," : ""} for this
        venue in this window. Absent from the chart means unmeasured, not cheap.</p>`);
    }
  }
}
```

<div class="control-strip">

```js
// rateUnitOptions collapses to cents-per-contract alone until at least two venues
// have both a fee and a traded-value denominator, so the bp view can never render
// as a single lonely line or an empty frame.
const rateUnit = view(Inputs.radio(rateUnitOptions, {value: "cents", label: "Rate unit", format: x => rateUnitLabels[x]}));
```

</div>

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Per-side fee divided by the day's contracts (or by the day's traded value, in basis points). This is the realized rate a venue actually collected, not its posted schedule, so it moves with the venue's price mix. <strong>Cents per contract is the honest cross-venue unit here.</strong> Basis points of traded value flatters flat-rate venues at high prices and punishes them at low ones — DKeX's published $0.01 per contract works out at about 260bp of traded value purely because its average traded price is near 47c, which is arithmetic about price mix, not a pricing difference in spirit. Basis points also need a traded-value denominator, which we hold for only some venues; the note under the chart names the ones that cannot appear. All the caveats under the volume chart apply here too — Rothera's daily-price proxy and assumed participant mix, Polymarket US's inferred regime dates, and the fact that unobservable volume-tier rebates make every one of these an upper bound. ForecastEx's count is matched pairs, which is one contract per side, so its per-contract rate is on the same footing as the rest.</p>

## Fee schedules side by side

<p class="section-intro">Not data — the published schedules themselves, drawn as fee per contract against price. It is the quickest way to see that "cheaper than Kalshi" is a question with a different answer at each end of the book.</p>

```js
{
  // Static: computed from the published schedules, not from our data, so it has no
  // freshness and no backfill dependency. Per-side rates, before each venue's
  // per-execution rounding (Kalshi, Underdog and DKeX round up to the cent, Rothera
  // rounds half up, Polymarket US uses banker's rounding) -- at realistic order
  // sizes rounding is a fraction of a cent and would only add steps to a shape
  // question. Rothera is drawn at the retail k=0.02 tier; a professional trading
  // firm pays 6x that, which would peak above every other line on this chart.
  const curves = [
    {name: "Kalshi",                    f: p => 7 * p * (1 - p), curve: "monotone-x", dash: null},
    {name: "Underdog Exchange",         f: p => 7 * p * (1 - p), curve: "monotone-x", dash: "5,4"},
    {name: "Polymarket US",             f: p => 6 * p * (1 - p), curve: "monotone-x", dash: null},
    {name: "Rothera",                   f: p => 2 * p * (1 - p), curve: "monotone-x", dash: null},
    {name: "DKeX",                      f: p => { const c = Math.round(p * 100);
                                                  return (c === 1 || c === 99) ? 0.50 : c === 2 ? 0.85 : 1.00; },
                                        curve: "step", dash: null},
    {name: "Crypto.com/Nadex",          f: () => 2.00, curve: "linear", dash: null},
    {name: "ForecastEx",                f: () => 1.00, curve: "linear", dash: null},
    {name: "CME (FanDuel + DraftKings)",f: () => 1.00, curve: "linear", dash: "2,3"}
  ];
  const prices = d3.range(1, 100).map(c => c / 100);
  const pivot = prices.map(p => {
    const o = {cents: Math.round(p * 100)};
    for (const c of curves) o[c.name] = c.f(p);
    return o;
  });

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 300,
    marginLeft: 70,
    marginRight: 16,
    x: {label: "Contract price (cents)", domain: [1, 99], grid: true, tickFormat: d => d + "c"},
    y: {label: "Fee per contract, one side (cents)", grid: true, domain: [0, 2.2], tickFormat: d => d.toFixed(1) + "c"},
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      ...curves.map(c =>
        Plot.line(prices.map(p => ({x: Math.round(p * 100), y: c.f(p), platform: c.name})), {
          x: "x", y: "y", stroke: "platform", strokeWidth: 2,
          strokeDasharray: c.dash, curve: c.curve
        })
      ),
      Plot.ruleX(pivot, Plot.pointerX({x: "cents", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(pivot, Plot.pointerX({
        x: "cents",
        title: d => [
          `Contract price: ${d.cents}c`,
          ...curves.map(c => `${c.name}: ${d[c.name].toFixed(2)}c`)
        ].join("\n")
      }))
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Per-side exchange fee per contract at each price, from each venue's published schedule. Five venues charge the same parabola with a different coefficient: Kalshi and Underdog Exchange both use 0.07 (the lines coincide exactly — Underdog is dashed so both are visible — but Underdog charges it to <em>both</em> sides, so it collects roughly twice per matched trade), Polymarket US 0.06 on the taker with a 0.0125 rebate back to the maker, Rothera 0.02 for retail. Three are flat: Crypto.com/Nadex $0.02, ForecastEx $0.01 (per side since 2026-05-01; before that a single penny per matched pair), CME $0.01. DKeX is a step, $0.01 across almost the whole book and half that only at 1c and 99c. <strong>The crossings are the point:</strong> CME and DKeX are cheaper than Kalshi through the middle of the book and dearer at the tails, so no single ranking holds everywhere. Rounding is omitted; Rothera's professional tier is 6x the retail line drawn here and its participant mix is unobservable; broker commissions are excluded throughout.</p>

## Market share

<p class="section-intro">The US market split over time — and how little of it belongs to anyone but Kalshi.</p>

```js
const dr_share = view(makeDateBrush(new Date("2025-01-01")));
```

```js
{
  const [s, e] = dr_share;

  // A3 fix: exclude CME from the 100%-stacked share denominator. CME is sparse (~57 days) and is
  // omitted from the legend `order` + caption, so including it normalized every other platform's
  // share downward on CME's days only (inconsistent denominator). Share chart only; tooltips derive.
  const sharePlatforms = platforms.filter(p => !p.name.includes("CME"));

  // Keep reported ZEROS. A venue that reported 0 contracts is dead, not absent --
  // the old `d.contracts > 0` filter deleted the row, which made Plot interpolate
  // that venue's band straight across the dead span and made it vanish from the
  // tooltip entirely. DKeX reported 0 on 12 days (2026-06-12..2026-06-28) and
  // Rothera on 2 (2026-05-25..26); all 14 rows were being discarded. Only drop
  // Kalshi's partial row, which is a different problem (handled below).
  const shareRaw = sharePlatforms.flatMap(p =>
    p.data
      .filter(d => d.date >= s && d.date <= e && d.contracts != null && !d.partial)
      .map(d => ({date: d.date, platform: p.name, contracts: d.contracts}))
  );

  // Leading-edge guard. The newest date normally carries ONLY Kalshi, because
  // daily_overall.csv refreshes every ~7 min while competitor_daily.csv is just
  // copied on a slower cadence. With offset:"expand" that renders Kalshi at exactly
  // 100% share -- 87.17% on 2026-08-05 jumping to 100.00% on 2026-08-06. Stop the
  // stack at the last date where more than one venue actually reported.
  const venuesPerDay   = d3.rollup(shareRaw, rs => new Set(rs.map(r => r.platform)).size, d => +d.date);
  const lastStackable  = d3.max(Array.from(venuesPerDay).filter(([, n]) => n > 1).map(([k]) => k));
  const shareTidy      = shareRaw.filter(d => +d.date <= lastStackable);

  // Hatch the trailing span where at least one venue has not reported yet, so a
  // silent feed reads as "no report" rather than "zero share". A per-venue hatch is
  // not representable in a 100%-stacked chart (there is no band to hatch where the
  // venue has no row), so this marks the union span and names the laggards.
  const lastReport = d3.rollup(shareTidy, rs => d3.max(rs, r => r.date), d => d.platform);
  const staleFrom  = d3.min(Array.from(lastReport.values()));
  const laggards   = Array.from(lastReport).filter(([, d]) => +d <= +staleFrom).map(([n]) => n);
  const hatchMarks = (staleFrom != null && +staleFrom < lastStackable)
    ? d3.utcHour.range(staleFrom, d3.utcHour.offset(new Date(lastStackable), 1), 4)
    : [];

  const shareByDate = Array.from(
    d3.rollup(
      shareTidy,
      rs => {
        const o = {date: rs[0].date, total: d3.sum(rs, r => r.contracts)};
        for (const r of rs) o[r.platform] = r.contracts;
        return o;
      },
      d => +d.date
    )
  ).map(([, v]) => v).sort((a, b) => a.date - b.date).filter(d => d.total > 0);

  display(Plot.plot({
    style: {fontFamily: "var(--font-sans)"},
    width,
    height: 300,
    marginLeft: 70,
    x: {type: "utc", label: null},
    y: {label: "Market share", grid: true, tickFormat: d => (d * 100).toFixed(0) + "%"},
    color: {legend: true, domain: colorDomain, range: colorRange},
    marks: [
      Plot.areaY(shareTidy, {
        x: "date",
        y: "contracts",
        fill: "platform",
        offset: "expand",
        order: ["Underdog Exchange", "DKeX", "Rothera", "Crypto.com/Nadex", "ForecastEx", "Polymarket US", "Kalshi"],
        curve: "monotone-x",
        fillOpacity: 0.85
      }),
      ...(hatchMarks.length ? [
        Plot.ruleX(hatchMarks, {x: d => d, stroke: "currentColor", strokeOpacity: 0.16, strokeWidth: 3}),
        Plot.text([{d: staleFrom}], {
          x: "d", y: 0.5, text: [`no report yet: ${laggards.join(", ")}`],
          textAnchor: "start", dx: 4, fontSize: 10,
          fill: "currentColor", fillOpacity: 0.7
        })
      ] : []),
      Plot.ruleX(shareByDate, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(shareByDate, Plot.pointerX({
        x: "date",
        title: d => [
          fmtDate(d.date),
          ...colorDomain
            .filter(p => d[p] != null)
            .map(p => `${p}: ${((d[p] / d.total) * 100).toFixed(1)}%`)
        ].join("\n")
      }))
    ]
  }));
}
```

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Share of total reported US prediction market contracts. Kalshi dominates; growing slivers at the bottom show ForecastEx and Polymarket US gaining ground. A venue that reported zero for a day is drawn at zero rather than dropped, so a dead feed reads as dead. The stack stops at the last day on which more than one venue reported, so Kalshi is never shown at 100% merely because the competitor files have not landed yet; when a venue has not reported for the most recent days, those days are hatched and labelled with its name.</p>

## Open interest

<p class="section-intro">Everything above this measures <em>flow</em> — contracts changing hands. This measures <em>stock</em>: how many contracts are still open at the end of each day. It is the capital parked at a venue rather than the capital passing through it, and it is the only number on this page that says how much is currently riding on a venue's book.</p>

<div class="instruction-line"><strong>Open interest is a snapshot, not a running total.</strong> Every point is the whole book on that day, so it must never be added up across days — a "total open interest for July" would not mean anything. The brush picks a window; the figures under the chart are that window's <em>latest</em> value and its <em>peak</em>, and there is deliberately no total. The default view is about <em>growth</em> and spans eight orders of magnitude, because Polymarket US and Rothera each spent months holding four- and five-figure books; brush into the last few weeks to compare <em>current</em> levels, which collapses the axis to about two and a half decades.</div>

```js
// ---- Open interest -----------------------------------------------------------
// OPEN INTEREST IS A SNAPSHOT, NOT A FLOW. Each point is the entire book standing at
// that date's close. NOTHING on this page may sum it across dates: the brush changes
// the visible window only, and the figures under the chart are the window's LAST value
// and its PEAK. (Audited before this shipped -- the only reducer on this page that sums
// anything is the market-share stack, and it sums `contracts` WITHIN one date, so it
// cannot reach this column. If a "total over the selected range" tile is ever added,
// open interest has to be excluded from it by name.)
//
// Kalshi's snapshot comes from kalshi_oi_daily.csv, NOT from the open_interest column
// of competitor_daily.csv. This page never reads Kalshi out of competitor_daily (see
// platforms[0] above for why), and kalshi_oi_daily.csv is the same series the Volume
// page charts, so the two pages cannot quietly disagree. kalshi_taker_oi_daily.csv is
// not a substitute: it ends 2026-04-14.
const kalshiOiSeries = kalshiOiRows(kalshiOi);
const kalshiOiByDay  = new Map(kalshiOiSeries.map(d => [+d.date, d.open_interest]));

// Why a venue is not on this chart. Absent means NOT PUBLISHED or NOT MEASURABLE --
// never zero. Drawing any of these on the zero line would say something false about the
// venue, which is the specific failure this page exists to avoid.
const OI_ABSENT = new Map([
  ["Crypto.com/Nadex",           "publishes no open interest at all"],
  ["CME (FanDuel + DraftKings)", "publishes no open interest at all"],
  ["DKeX",                       "reports open interest as zero on 78% of its market rows (12,198 of 15,642) and on 15 of its 57 days, and its latest book is 33,100 contracts against Kalshi's 760,650,224, so what it publishes is overnight carry on a handful of markets rather than the venue's standing book"],
  ["Underdog Exchange",          "reports zero open interest across every market row on four of its sixteen dates, including one carrying 911,855 contracts of volume, and its book has never exceeded 366,538 contracts. The field is returned and non-null on 100% of rows on every date, so those zeros are what the venue reported, not a missing feed — but whatever the figure measures, it is not an end-of-day venue book comparable to the others here. It is charted on Underdog's own page instead"]
]);

const oiRowsOf = p => p.name === "Kalshi"
  ? kalshiOiSeries.map(d => ({date: d.date, openInterest: d.open_interest}))
  : p.data.map(d => ({date: d.date, openInterest: d.openInterest}));

// Rows whose snapshot is missing are KEPT, carrying null, so the line BREAKS at the
// gap. Filtering them is the bug: an `open_interest > 0` filter deletes the row and
// lets the line interpolate straight across a venue's no-report days. Polymarket US
// has no daily market report for 2026-06-15 or 2026-06-18 -- 337.8M contracts traded
// between those two days -- and they have to read as holes, not as a dip to zero.
const oiPlatforms = platforms
  .filter(p => !OI_ABSENT.has(p.name))
  .map(p => ({name: p.name, color: p.color, rows: oiRowsOf(p)}))
  .filter(p => p.rows.some(d => d.openInterest > 0));

// Degradation guard. `open_interest` is a brand-new pipeline column; until it is
// backfilled the competitor rows carry nothing, and this section must render an
// explanation rather than a chart. `> 0` rather than `!= null` on purpose: it rejects a
// column that exists but is empty AND one that exists but backfilled to all zeros,
// which is the shape a half-finished pipeline change takes.
// ONE competitor here, against the TWO the revenue guard above demands. That guard
// excludes Kalshi because Kalshi's revenue is derived on this page and would satisfy it
// with no pipeline work at all; Kalshi's open interest is produced independently
// upstream and has been live since April 2025, so it is real evidence, and Kalshi
// against one measured venue is a real comparison.
const oiCompetitors = oiPlatforms.filter(p => p.name !== "Kalshi");
const hasOi = oiPlatforms.some(p => p.name === "Kalshi") && oiCompetitors.length >= 1;

// The step in Kalshi's line on 2026-07-19: 1,205,283,803 -> 688,884,859 contracts,
// -42.84%, and the level stays about a third lower afterwards (median 1.12B across the
// 30 days before, 726M across the 18 days after). Annotated because a fall that size
// reads as a broken feed, and because it lifts Kalshi's turnover below.
//
// It is a SETTLEMENT, not a change in how open interest is reported, and the caption
// says so. Measured from kalshi_oi_daily.csv itself: it is only the SIXTH largest
// single-day fall in the 490 days of that series, and five larger ones -- -76.4% on
// 2025-05-09, -55.3% on 2025-06-22, -46.1% on 2025-12-15, -45.3% on 2025-12-12 and
// -43.5% on 2025-04-07 -- predate it by up to fifteen months, so no single July 2026
// methodology change can produce the shape. 20 of those 490 days fall by 20% or more,
// and the median Sunday falls 8.15%, because event books settle on a weekly sports
// rhythm. Across this particular boundary the number of markets in the source file GREW
// (5,204,715 -> 5,427,588) while the number holding open positions roughly halved
// (90,574 -> 47,584): markets settled, the file did not change shape.
const KALSHI_OI_BREAK = {
  date: new Date("2026-07-19T00:00:00Z"),
  label: "-42.8%: large event books settle"
};
```

```js
const dr_oi = view(makeDateBrush(new Date("2025-04-01")));
```

```js
{
  const [s, e] = dr_oi;
  const fmtOi = n => { const a = Math.abs(n ?? 0);
    return a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M"
         : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : String(Math.round(a)); };

  if (!hasOi) {
    display(html`<p class="chart-note"><strong>Not available yet.</strong> This chart needs
      Kalshi's open-interest snapshot and at least one competitor's, and one of them has
      not arrived: the <code>open_interest</code> column of <code>competitor_daily.csv</code>
      is a new pipeline field and may not be backfilled yet. The chart appears once real
      values land, so the window between shipping this page and backfilling the pipeline
      cannot render as a flat zero line.</p>`);
  } else {
    // Rows keep their nulls so the line breaks at a gap; only the tooltip and the stat
    // line filter down to real values.
    const series = oiPlatforms
      .map(p => ({name: p.name, color: p.color,
                  win: p.rows.filter(d => d.date >= s && d.date <= e)
                             .map(d => ({...d, platform: p.name}))}))
      .filter(p => p.win.some(d => d.openInterest > 0));

    const pivot = Array.from(d3.rollup(
      series.flatMap(p => p.win.filter(d => d.openInterest > 0)),
      rs => { const o = {date: rs[0].date};
              for (const r of rs) o[r.platform] = r.openInterest; return o; },
      d => +d.date
    )).map(([, v]) => v).sort((a, b) => a.date - b.date);

    const names    = series.map(p => p.name);
    const showBreak = +KALSHI_OI_BREAK.date >= +s && +KALSHI_OI_BREAK.date <= +e
                      && names.includes("Kalshi");

    display(Plot.plot({
      style: {fontFamily: "var(--font-sans)"},
      width,
      height: 380,
      marginLeft: 70,
      marginRight: 16,
      x: {type: "utc", label: null},
      y: {
        type: oiScale === "Log" ? "log" : "linear",
        label: "Contracts of open interest (end of day)",
        grid: true,
        tickFormat: d => fmtOi(d)
      },
      color: {legend: true, domain: names, range: series.map(p => p.color)},
      marks: [
        // The area is linear-only: an area needs a zero baseline and a log axis has no
        // zero. On log every venue is a line, which is all the comparison needs.
        ...(oiScale === "Log" ? [] : series.filter(p => p.name === "Kalshi").map(p =>
          Plot.areaY(p.win, {x: "date", y: "openInterest", fill: p.color,
                             fillOpacity: 0.08, curve: "monotone-x"}))),
        ...series.map(p =>
          Plot.lineY(p.win, {x: "date", y: "openInterest", stroke: "platform",
                             strokeWidth: p.name === "Kalshi" ? 2.5 : 1.75,
                             curve: "monotone-x"})),
        ...(showBreak ? [
          Plot.ruleX([KALSHI_OI_BREAK.date], {stroke: "currentColor", strokeOpacity: 0.4,
                                              strokeDasharray: "3,3"}),
          Plot.text([KALSHI_OI_BREAK], {x: "date", text: [KALSHI_OI_BREAK.label],
                                        frameAnchor: "top", textAnchor: "start",
                                        dx: 5, dy: 9, fontSize: 10,
                                        fill: "currentColor", fillOpacity: 0.75})
        ] : []),
        Plot.ruleX(pivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
        Plot.tip(pivot, Plot.pointerX({
          x: "date",
          title: d => [
            fmtDate(d.date),
            "Open interest, end of day",
            ...names.map(n => d[n] != null
              ? `${n}: ${fmtOi(d[n])} contracts (${Math.round(d[n]).toLocaleString()})`
              : null)
          ].filter(Boolean).join("\n")
        })),
        ...(oiScale === "Log" ? [] : [Plot.ruleY([0])])
      ]
    }));

    // LATEST and PEAK inside the window. Never a sum -- see the note at the top of this
    // section. Same treatment as the Volume page's open-interest stat line.
    const stats = series.map(p => {
      const real = p.win.filter(d => d.openInterest > 0);
      return {
        name: p.name, color: p.color,
        last: real[real.length - 1],
        peak: real.reduce((a, b) => b.openInterest > a.openInterest ? b : a, real[0]),
        gaps: p.win.filter(d => !(d.openInterest > 0)).map(d => d.date)
      };
    });

    display(html`<div style="display:flex;gap:24px;flex-wrap:wrap;margin:8px 0 4px 0;font-size:13px;color:var(--theme-foreground-muted);">
      ${stats.map(t => html`<div title="${Math.round(t.last.openInterest).toLocaleString()} contracts on ${fmtDate(t.last.date)}">
        <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${t.color};margin-right:5px;"></span><strong>${t.name}</strong>
        · latest ${fmtOi(t.last.openInterest)} (${fmtDate(t.last.date)})
        · peak ${fmtOi(t.peak.openInterest)} (${fmtDate(t.peak.date)})</div>`)}
    </div>`);

    const gapped = stats.filter(t => t.gaps.length);
    if (gapped.length) {
      display(html`<p class="chart-note"><strong>A break in a line is a real gap.</strong>
        ${gapped.map(t => html`<span>${t.name} published no open interest on ${t.gaps.map(fmtDate).join(", ")}. </span>`)}
        Those rows are kept and drawn as holes rather than filtered out, because deleting
        them would let the line interpolate straight across the missing days.</p>`);
    }

    const notShown = platforms.map(p => p.name).filter(n => !names.includes(n));
    if (notShown.length) {
      display(html`<p class="chart-note"><strong>Not shown:</strong>
        ${notShown.map(n => html`<span>${n} — ${OI_ABSENT.get(n) ?? "no open-interest figure has reached the pipeline for this venue yet"}. </span>`)}
        Absent from this chart means unmeasured or unpublished. It does not mean zero.</p>`);
    }
  }
}
```

<div class="control-strip">

```js
// Log by default, which is the opposite of the volume chart above, and it is not a
// stylistic choice. Measured over the default window: on a linear axis Kalshi fills the
// frame while Polymarket US tops out at 10.9% of its height, Rothera at 9.4% and
// ForecastEx at 2.5% -- three of the four venues live inside the bottom tenth. The
// within-venue ranges are worse than the between-venue one: Polymarket US spans
// 4,977,341x from its first reported day to its peak and Rothera 16,679,133x, so even a
// single-venue linear axis hides most of that venue's own history.
// An INDEXED view (rebase every venue to 100 at the start of the window) was built and
// rejected on measurement: Polymarket US opens at 161 contracts and Rothera at 62, so
// their indices run to 95,836,999 and 215,214,615 -- it needs a log axis of its own, and
// it throws away the level comparison, which is the whole point here (Kalshi holds
// roughly 85x ForecastEx's standing capital and 10x Polymarket US's).
// The full-history log domain is wide -- 8.2 decades, which leaves today's four levels
// occupying about 28% of the axis -- and that is NOT launch dust that could be trimmed
// away: Polymarket US spent 109 of its 278 days below a million contracts, the last of
// them 2026-03-09, and ForecastEx 83 days inside this window. Those are months of real
// history, so the axis carries them and the caption tells the reader to brush in for a
// levels comparison, where the domain falls to 2.5 decades and 90% of the axis.
const oiScale = view(Inputs.radio(["Log", "Linear"], {value: "Log", label: "Scale"}));
```

</div>

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Contracts still open at the close of each day, summed across every market at the venue. <strong>Log scale by default</strong> — on a linear axis Kalshi fills the frame and the other three venues sit inside the bottom tenth of it, and each venue's own history spans six or seven orders of magnitude from launch to peak. The default window covers 8.2 decades, so today's four levels use only the top quarter of the axis; <strong>brush into the last few weeks</strong> and the axis narrows to two and a half decades, which is the view for comparing where the venues stand now. <strong>Kalshi's line steps down 42.8% on 2026-07-19</strong>, from 1.21B to 689M contracts, and stays about a third lower: large event books settled together. It is annotated because a fall that size reads as a broken feed, but it is only the sixth largest single-day fall in the series and five larger ones stretch back to May 2025, so it is the weekly settlement rhythm at its most extreme rather than a change in what is being counted — 20 of 490 days fall by 20% or more, and the median Sunday falls 8.2%. <strong>Four venues are missing and none of them is at zero.</strong> Crypto.com/Nadex and CME publish no open interest at all. DKeX reports it as zero on 78% of its market rows (12,198 of 15,642) and on 15 of its 57 days, and its latest book is 33,100 contracts against Kalshi's 760,650,224, so what it publishes is overnight carry on a handful of markets rather than a venue book. Underdog Exchange reports zero open interest across every market row on four of its sixteen dates, including one carrying 911,855 contracts of volume; the field is returned non-null on 100% of rows on every date, so those are reported zeros rather than a missing feed, but whatever it measures is not an end-of-day venue book comparable to the others here. Polymarket US has no daily market report for 2026-06-15 or 2026-06-18 and those two days are drawn as gaps. Kalshi's snapshot is written for the previous day at about 04:00 ET, so this chart always ends one day behind the volume charts above. ForecastEx counts matched pairs, one contract per side, which is the same unit as everyone else here.</p>

## Turnover

<p class="section-intro">Volume divided by open interest: how many times a venue turns its own book over in a day. This is the number that separates a <em>positioning</em> venue, where people buy a contract and hold it to resolution, from a <em>churn</em> venue, where the same capital is traded round and round. It is the one comparison on this page that neither volume nor fees can make.</p>

<div class="instruction-line"><strong>How to read it:</strong> 1.0 means the venue traded as many contracts today as were standing open last night. Above the line is churn, below it is positioning. The denominator is the <em>previous</em> day's close, because event contracts settle to zero open interest on the day they trade hardest — a same-day denominator collapses exactly when the numerator peaks and manufactures a spike. Lines are 7-day ratios of sums, because weekend settlement plus weekend sports gives the raw daily number a hard weekly sawtooth.</div>

```js
// ---- Turnover ----------------------------------------------------------------
// turnover(D) = contracts traded on D / open interest at the CLOSE OF D-1, smoothed as
// a 7-day ratio of sums. The definition, the prior-day denominator, the gaps-not-zeros
// rule and the smoothing all live in ./components/turnover.js, which is shared with the
// pipeline so no page can quietly pick a different convention.
//
// ForecastEx needs a RESTRICTED numerator or its ratio answers a different question:
// its snapshot is struck AFTER same-day settlement, so a contract that traded heavily
// and resolved the same day books its whole volume against a book that no longer holds
// it. The pipeline publishes contracts_oi_bearing -- that day's volume in contracts that
// still had open interest -- for exactly this.
// Measured on the shipped series: on raw daily numbers the gap is enormous (2026-01-04,
// an NFL playoff Sunday, reads 4.759 on full volume against 0.095 restricted), but the
// prior-day denominator and the 7-day window between them absorb most of it -- on the
// smoothed series the medians differ by 1.22x to 1.29x and the maxima by at most 2.26x.
// So when contracts_oi_bearing has not landed, fall back to full volume and SAY SO in
// the note rather than dropping the venue: ForecastEx reads about 0.12 instead of about
// 0.09, which is the same answer to the only question this chart asks.
const OI_RESTRICTED_NUMERATOR = new Set(["ForecastEx"]);
const numeratorOf = p => OI_RESTRICTED_NUMERATOR.has(p.name)
  ? d => d.oiBearingContracts ?? d.contracts
  : d => d.contracts;
const numeratorFellBack = platforms
  .filter(p => OI_RESTRICTED_NUMERATOR.has(p.name) && !p.data.some(d => d.oiBearingContracts > 0))
  .map(p => p.name);

const turnoverPlatforms = oiPlatforms.map(p => {
  const src = platforms.find(q => q.name === p.name);
  return {
    name: p.name, color: p.color,
    rows: buildTurnover(
      src.data,
      p.rows.map(d => ({date: d.date, open_interest: d.openInterest})),
      {contracts: numeratorOf(src)}
    )
  };
}).filter(p => p.rows.some(d => d.turnover7d != null));

// Same guard as the chart above, for the same reason.
const hasTurnover = turnoverPlatforms.some(p => p.name === "Kalshi")
  && turnoverPlatforms.some(p => p.name !== "Kalshi");
```

```js
// Defaults to mid-June 2026 rather than the whole history, and that is measured. Over
// 2026-06-15..today the four venues span 0.085 to 1.783 -- 21x, which reads cleanly on a
// linear axis with the 1.0 reference line in the middle of the frame. Widen the brush
// past 2026-05-21 and the span becomes 1,761x, because Rothera's ninth day of existence
// turned a 139,000-contract book over 133 times. That value is real rather than an
// artifact, which is why it is not filtered out -- switch the scale to Log to look at it.
const dr_turn = view(makeDateBrush(new Date("2026-06-15")));
```

```js
{
  const [s, e] = dr_turn;

  if (!hasTurnover) {
    display(html`<p class="chart-note"><strong>Not available yet.</strong> Turnover needs an
      open-interest denominator for Kalshi and for at least one competitor, and one of them
      has not arrived in <code>competitor_daily.csv</code> yet. The chart appears when it
      does, rather than rendering one lonely line against nothing.</p>`);
  } else {
    const series = turnoverPlatforms
      .map(p => ({name: p.name, color: p.color,
                  win: p.rows.filter(d => d.date >= s && d.date <= e)
                             .map(d => ({...d, platform: p.name}))}))
      .filter(p => p.win.some(d => d.turnover7d != null));
    const names = series.map(p => p.name);
    const flat  = series.flatMap(p => p.win.filter(d => d.turnover7d != null));

    if (!flat.length) {
      display(html`<p class="chart-note">No venue has a complete ${TURNOVER_WINDOW_DAYS}-day
        window inside this selection. Widen the brush.</p>`);
    } else {
      const pivot = Array.from(d3.rollup(
        flat,
        rs => { const o = {date: rs[0].date};
                for (const r of rs) o[r.platform] = r.turnover7d; return o; },
        d => +d.date
      )).map(([, v]) => v).sort((a, b) => a.date - b.date);

      const showBreak = +KALSHI_OI_BREAK.date >= +s && +KALSHI_OI_BREAK.date <= +e
                        && names.includes("Kalshi");

      display(Plot.plot({
        style: {fontFamily: "var(--font-sans)"},
        width,
        height: 320,
        marginLeft: 70,
        marginRight: 16,
        x: {type: "utc", label: null},
        y: {
          type: turnScale === "Log" ? "log" : "linear",
          label: "Contracts traded / prior day's open interest",
          grid: true,
          tickFormat: d => d >= 10 ? d.toFixed(0) : d.toFixed(2)
        },
        color: {legend: true, domain: names, range: series.map(p => p.color)},
        marks: [
          Plot.ruleY([1], {stroke: "currentColor", strokeOpacity: 0.35, strokeDasharray: "4,3"}),
          Plot.text([{v: 1}], {y: "v", text: ["book turns over once a day"],
                               frameAnchor: "right", textAnchor: "end", dx: -4, dy: -6,
                               fontSize: 10, fill: "currentColor", fillOpacity: 0.7}),
          ...series.map(p =>
            Plot.lineY(p.win, {x: "date", y: "turnover7d", stroke: "platform",
                               strokeWidth: p.name === "Kalshi" ? 2.5 : 1.75,
                               curve: "monotone-x"})),
          ...(showBreak ? [
            Plot.ruleX([KALSHI_OI_BREAK.date], {stroke: "currentColor", strokeOpacity: 0.4,
                                                strokeDasharray: "3,3"}),
            Plot.text([KALSHI_OI_BREAK], {x: "date", text: ["Kalshi denominator -42.8%"],
                                          frameAnchor: "top", textAnchor: "start",
                                          dx: 5, dy: 9, fontSize: 10,
                                          fill: "currentColor", fillOpacity: 0.75})
          ] : []),
          Plot.ruleX(pivot, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.2})),
          Plot.tip(pivot, Plot.pointerX({
            x: "date",
            title: d => [
              fmtDate(d.date),
              "Turnover, 7-day average (per day)",
              ...names.map(n => d[n] != null ? `${n}: ${d[n].toFixed(2)}x` : null)
            ].filter(Boolean).join("\n")
          }))
        ]
      }));

      const stats = series.map(p => {
        const real = p.win.filter(d => d.turnover7d != null);
        return {name: p.name, color: p.color, last: real[real.length - 1],
                med: d3.median(real, d => d.turnover7d)};
      });
      display(html`<div style="display:flex;gap:24px;flex-wrap:wrap;margin:8px 0 4px 0;font-size:13px;color:var(--theme-foreground-muted);">
        ${stats.map(t => html`<div>
          <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${t.color};margin-right:5px;"></span><strong>${t.name}</strong>
          · latest ${t.last.turnover7d.toFixed(2)}x (${fmtDate(t.last.date)})
          · median ${t.med.toFixed(2)}x</div>`)}
      </div>`);

      const vmax = d3.max(flat, d => d.turnover7d);
      if (turnScale === "Linear" && vmax > 5) {
        display(html`<p class="chart-note">This window reaches ${vmax.toFixed(0)}x, which
          flattens every venue's current level against the axis. That peak is real rather
          than a fault — it is a venue in its first weeks, when a book of a few thousand
          contracts was turned over many times a day — so it is not filtered out. Switch the
          scale to Log to read both eras at once.</p>`);
      }

      const missing = platforms.map(p => p.name).filter(n => !names.includes(n));
      if (missing.length) {
        display(html`<p class="chart-note"><strong>Not shown:</strong>
          ${missing.map(n => html`<span>${n} — ${OI_ABSENT.get(n) ?? "no open-interest denominator for this venue yet"}. </span>`)}
          A venue with no open interest cannot have a turnover, and a venue whose open
          interest is near zero would be dividing by almost nothing. Absent means
          unmeasured.</p>`);
      }
      if (numeratorFellBack.length) {
        display(html`<p class="chart-note"><strong>${numeratorFellBack.join(", ")}</strong> is
          drawn on full daily volume because its <code>contracts_oi_bearing</code> column has
          not landed yet. That reads about 25% high against the correct restricted numerator
          on the smoothed series, and much higher on individual settlement-heavy days, so
          treat its level as an upper bound until the column arrives.</p>`);
      }
    }
  }
}
```

<div class="control-strip">

```js
// Linear by default, unlike the open-interest chart above: over the default window the
// whole four-venue range is 0.085 to 1.783, a 21x span that reads cleanly on a linear
// axis and keeps the 1.0 reference line where the eye can use it. Log is here for
// brushing back into any venue's launch weeks, when turnover genuinely ran into the
// hundreds against a book of a few thousand contracts.
const turnScale = view(Inputs.radio(["Linear", "Log"], {value: "Linear", label: "Scale"}));
```

</div>

<p style="font-size:0.82em;color:#999;margin-top:0.5rem">Contracts traded divided by the <em>previous</em> day's open interest, as a trailing 7-day ratio of sums. Three conventions, all deliberate. <strong>The denominator is the prior close</strong>, because event contracts settle to zero open interest on the day they trade hardest, so a same-day denominator collapses exactly when the numerator peaks: on Kalshi that reads 2.76 against 1.58 on 2026-07-19, with untouched neighbours at 1.61 and 1.46. <strong>A missing or zero denominator is a gap, never a zero</strong> — no point is drawn, nothing is carried forward, and a 7-day window containing one missing day yields no point at all. <strong>The smoothing is a ratio of sums, not an average of ratios</strong>, which would overweight the lowest-open-interest days and reintroduce the distortion the prior-day rule removes. <strong>Kalshi's 2026-07-19 settlement cuts its own denominator</strong>, lifting its measured turnover from a 1.28 median across the preceding month to 1.43 across the weeks after — part of that step is the book shrinking, not trading speeding up. ForecastEx's numerator is restricted to volume in contracts that still had open interest at the snapshot, because its book is photographed after same-day settlement; every other venue uses full daily volume, so ForecastEx's line is the one that is not strictly like-for-like with the volume chart at the top of this page. Kalshi's still-filling current day is excluded rather than drawn as a fall. The fee caveats above do not apply here — this chart uses no fee number at all — but the volume caveats do, in particular that Polymarket US is US-accessible volume only and that ForecastEx counts matched pairs.</p>

<details class="surface-card compact-details">
<summary>Why there is no "revenue per unit of open interest" chart</summary>
<p>It was built and measured, and it is an identity rather than a finding. Revenue divided by open interest is exactly turnover multiplied by revenue per contract — the two charts either side of this note — and the two agree to machine precision on every venue on every day, the largest relative difference across the whole series being 2.5 × 10<sup>-16</sup>. A third chart would restate them while looking like independent evidence, and it would inherit both denominators' defects at once: the open-interest gaps described above plus the fee approximations, every one of which is already an upper bound because volume-tier rebates are unobservable to us.</p>
<p>There is also a units problem with the question as it is usually asked. "Earnings per dollar of standing capital" needs open interest marked to market, and no venue here publishes the value of its open book — only the contract count. The computable version is earnings per <em>contract</em> of open interest per day.</p>
<p>For anyone who wants it anyway, here it is without a chart. Per 1,000 contracts of open interest per day, median across the series and latest: Kalshi $7.50 and $14.55, Polymarket US $6.70 and $17.67, Rothera $2.80 and $6.65, ForecastEx $0.61 and $0.91. The ordering is the ordering of turnover times fee rate, because that is what it is. The genuine signal — that ForecastEx monetizes its standing capital about an order of magnitude less intensively than Kalshi does — is already visible as the gap between its turnover line and everyone else's.</p>
</details>
