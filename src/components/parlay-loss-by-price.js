// "What bettors lost, by the price they paid" for a competitor's parlay page -- the twin of the
// inline Kalshi chart on src/parlay.md, drawn the same way so the venues read alike.
// Rows: competitor_parlay_pnl_by_price_daily.csv (python/build_competitor_parlay_pnl_by_price.py),
// one per venue x buy date x price band. DKeX and OG/Crypto.com have no buy/sell flag, so every
// print there is a bet held to settlement; Polymarket US's rows credit cash-outs (a later print of
// exactly the same size at a different price), so they are realized, like Kalshi's.
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

const TICK = {1: "10¢\nand up", 2: "3¢\nto 10¢", 3: "1¢\nto 3¢", 4: "0.5¢\nto 1¢", 5: "0.1¢\nto 0.5¢", 6: "Under\n0.1¢"};
const NAME = {1: "10¢ and up", 2: "3¢ to under 10¢", 3: "1¢ to under 3¢", 4: "0.5¢ to under 1¢",
              5: "0.1¢ to under 0.5¢", 6: "Under 0.1¢"};
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(Math.round(a))); };
const fmtUSD = n => ((n ?? 0) < 0 ? "−$" : "$") + fmtCount(Math.abs(n ?? 0));
const fmtDate = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
const pct = r => `${r < 0 ? "−" : "+"}${Math.abs(r).toFixed(0)}%`;

// One entry per band, summed over the venue's rows inside [from, to] (buy dates; either end may be
// omitted). `span` is the caption's date phrase. `minShare` leaves out bands holding less than that
// share of the window's stake: a band of a few dozen bets (Polymarket's under 0.1c, 0.02% of its
// money) can read +200% off one win and would set the scale every other bar is drawn on.
export function lossByPrice(rows, venue, [from, to] = [], {minShare = 0} = {}) {
  const rs = rows.filter(d => d.venue === venue && d.staked_usd > 0
    && (from == null || d.date >= from) && (to == null || d.date <= to));
  const first = d3.min(rs, d => d.date), last = d3.max(rs, d => d.date);
  const bands = d3.rollups(rs, g => ({
      staked: d3.sum(g, d => d.staked_usd), net: d3.sum(g, d => d.net_usd), gross: d3.sum(g, d => d.gross_usd),
      fees: d3.sum(g, d => d.fees_usd), buys: d3.sum(g, d => d.buys), won: d3.sum(g, d => d.buys_won),
      first: d3.min(g, d => d.date)
    }), d => d.band)
    .map(([band, v]) => ({band, ...v, ret: 100 * v.net / v.staked, grossRet: 100 * v.gross / v.staked}))
    .sort((a, b) => a.band - b.band);
  const total = d3.sum(bands, d => d.staked);
  const kept = minShare > 0 ? bands.filter(d => d.staked >= minShare * total) : bands;
  return {bands: kept, first, span: rs.length ? `parlays bought ${fmtDate(first)} to ${fmtDate(last)}` : "nothing in this date range"};
}

// The bar chart. `feeName` names the fee in the tooltip ("fees", "the 2¢ fee").
export function lossByPriceChart({bands, first}, {width, feeName = "fees"} = {}) {
  if (!bands.length) {
    const p = document.createElement("p");
    p.className = "chart-note";
    p.textContent = "No settled parlays in this date range — widen it to see the breakdown.";
    return p;
  }
  // A band that starts after the window does gets a "since" line, so it isn't read as the same period.
  const since = d => d.first > first ? `since ${d.first.toLocaleDateString("en-US", {month: "short", day: "numeric", timeZone: "UTC"})}` : "";
  // Room past each bar's end for its labels; no y axis, because every bar carries its own value.
  const lo = Math.min(-10, (d3.min(bands, d => d.ret) ?? 0) * 1.45);
  const hi = Math.max(0, (d3.max(bands, d => d.ret) ?? 0) * 1.45);
  // dy and lineAnchor are CONSTANTS in Plot, so losing and winning bands get separate label marks
  // (exact complements, so no band can fall through both).
  const loss = bands.filter(d => d.ret < 0), gain = bands.filter(d => !(d.ret < 0));
  const labels = (rows, anchor, dys) => [
    Plot.text(rows, {x: "band", y: "ret", text: d => pct(d.ret), lineAnchor: anchor, dy: dys[0],
                     fontSize: 13, fontWeight: 600, fill: "var(--theme-foreground)"}),
    Plot.text(rows, {x: "band", y: "ret", text: d => fmtUSD(d.net), lineAnchor: anchor, dy: dys[1],
                     fontSize: 11, fill: "var(--theme-foreground-muted)"}),
    Plot.text(rows, {x: "band", y: "ret", text: since, lineAnchor: anchor, dy: dys[2],
                     fontSize: 10, fill: "var(--theme-foreground-muted)"})
  ];
  return Plot.plot({
    style: {fontFamily: "var(--font-sans)", fontSize: "12px"}, width, height: 320, marginTop: 48, marginBottom: 0,
    x: {domain: bands.map(d => d.band), axis: "top", tickFormat: b => TICK[b], tickSize: 0, label: null, padding: 0.35},
    y: {domain: [lo, hi], axis: null},
    marks: [
      Plot.barY(bands, {x: "band", y: "ret", ry2: 4, fillOpacity: 0.85,
        fill: d => d.ret < 0 ? "var(--accent-negative)" : "var(--accent-positive)"}),
      Plot.ruleY([0], {stroke: "var(--theme-foreground-faint)"}),
      ...labels(loss, "top", [7, 25, 40]),
      ...labels(gain, "bottom", [-21, -7, -35]),
      Plot.tip(bands, Plot.pointerX({x: "band", y: "ret", lineWidth: 40, title: d => [
        NAME[d.band],
        `Staked: ${fmtUSD(d.staked)}`,
        `After ${feeName}: ${fmtUSD(d.net)} (${pct(d.ret)})`,
        `Before fees: ${fmtUSD(d.gross)} (${pct(d.grossRet)})`,
        `Bets: ${fmtCount(d.buys)}, of which ${fmtCount(d.won)} won`
      ].join("\n")}))
    ]
  });
}
