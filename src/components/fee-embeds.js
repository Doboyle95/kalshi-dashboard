import {splitFinanceCategory} from "./non-sports-categories.js";

// Kalshi's daily non-sports fees, split into the parts below and counted in whole cents; the
// parts add up to the day's reported non-sports total exactly. Two of the chart's bands are
// sums of parts: "15-minute markets" (the three 15-minute parts) and "Everything else"
// (weather, mention, entertainment and the residual "Other").
const FIFTEEN_PARTS = ["15-minute crypto", "15-minute commodities", "15-minute finance"];
const ELSE_PARTS = ["Weather", "Mention", "Entertainment", "Other"];
const PARTS = [...FIFTEEN_PARTS, "Other crypto", "Politics", "Finance", "Economics", ...ELSE_PARTS];

// The non-sports chart's views: each names the bands it stacks, bottom first.
export const NONSPORTS_VIEWS = new Map([
  ["All non-sports", ["15-minute markets", "Other crypto", "Politics", "Finance", "Economics", "Everything else"]],
  ["Without 15-minute markets", ["Other crypto", "Politics", "Finance", "Economics", "Everything else"]],
  ["Without crypto & finance", ["Politics", "Economics", "Everything else"]],
  ["15-minute markets only", FIFTEEN_PARTS]
]);
// One colour per band in every view, so switching views never repaints a band that stays. Each
// view's set passes the dataviz palette validator on the chart surface in both themes (#f3efe6
// light, #1b211d dark; 2026-10-07). Finance and Economics keep the category charts' colours
// (non-sports-categories.js) and 15-minute markets the fee-mix pie's; inside the 15-minute view
// its crypto part keeps that blue and its finance part the Finance green.
export const NONSPORTS_COLORS = {
  "15-minute markets": "#0072B2", "15-minute crypto": "#0072B2", "15-minute commodities": "#c98500",
  "15-minute finance": "#009E73", "Other crypto": "#D55E00", "Politics": "#7443AA", "Finance": "#009E73",
  "Economics": "#A65628", "Everything else": "#c2689a"
};

// Confirmed with Kalshi's public series metadata (category Crypto, frequency
// fifteen_min), 2026-10-06. ZEC and NEAR currently fall into Other in the site's
// broad display taxonomy, but are still crypto 15-minute products. Coin Race is
// also a 15-minute crypto series.
const VERIFIED_CRYPTO_15M = new Set([
  "KXBNB15M", "KXBTC15M", "KXDOGE15M", "KXETH15M", "KXHYPE15M",
  "KXSOL15M", "KXXRP15M", "KXZEC15M", "KXNEAR15M", "KXCRYPTOLEAD15M",
  "KXCRYPTOCOMP15M", "KXADA15M", "KXBCH15M", "KXTON15M"
]);
// API category Commodities and frequency fifteen_min. The dashboard's broad taxonomy places
// them in Finance or Other, so they are named here rather than found by category.
const VERIFIED_COMMODITY_15M = new Set([
  "KXGOLD15M", "KXSILVER15M", "KXWTI15M", "KXCOPPER15M", "KXNATGAS15M", "KXPALLADIUM15M", "KXPLATINUM15M"
]);
// API category Financials, frequency fifteen_min, verified 2026-10-06. Index and Treasury
// series were listed with no trades yet; they count as soon as their fee columns appear.
// KXGBPUSD15MTEST is Kalshi's test copy of a 15-minute FX series: counted as one, so it can
// never land in the residual.
const VERIFIED_FINANCE_15M = new Set([
  "KXINX15M", "KXNDQ15M", "KXDJIA15M", "KX2YRRATE15M", "KX5YRRATE15M",
  "KX10YRRATE15M", "KX30YRRATE15M", "KXEURUSD15M", "KXUSDJPY15M",
  "KXGBPUSD15M", "KXAUDUSD15M", "KXUSDCAD15M", "KXGBPUSD15MTEST"
]);

const isSports = m => m?.is_sports === true || m?.is_sports === "TRUE";
const isNonSports = m => m?.is_sports === false || m?.is_sports === "FALSE";
// Display categories summed column by column. Any other non-sports fee reaches "Other"
// through the residual, as do columns the metadata does not know.
const CATEGORY_PART = new Map([
  ["Crypto", "Other crypto"], ["Politics", "Politics"], ["Finance", "Finance"], ["Economics", "Economics"],
  ["Weather", "Weather"], ["Mention", "Mention"], ["Entertainment", "Entertainment"]
]);

// The part a fee column counts towards, or null when it only reaches the residual.
// categoryForTicker is the page's display mapping (fees.md wideCategoryForTicker).
function partOf(ticker, metadata, categoryForTicker) {
  const m = metadata.get(ticker);
  if (isSports(m)) return null;
  const verified = VERIFIED_CRYPTO_15M.has(ticker) || VERIFIED_COMMODITY_15M.has(ticker) || VERIFIED_FINANCE_15M.has(ticker);
  // A 15-minute market by Kalshi's series metadata, or any non-sports series whose id ends 15M.
  // Its finance part takes every 15-minute series that is not crypto or a commodity: today that
  // is the FX, index and yield series above.
  if (verified || (/15M$/.test(ticker) && isNonSports(m))) {
    if (VERIFIED_CRYPTO_15M.has(ticker) || m?.cat === "Crypto") return "15-minute crypto";
    if (VERIFIED_COMMODITY_15M.has(ticker) || m?.cat === "Commodities") return "15-minute commodities";
    return "15-minute finance";
  }
  if (!isNonSports(m)) return null;
  // The leaderboard's own label wins for Economics / Financials / Commodities, then
  // splitFinanceCategory's verified series lists separate Finance from Economics.
  const source = ["Economics", "Financials", "Commodities"].includes(m.cat) ? m.cat : categoryForTicker(ticker);
  return CATEGORY_PART.get(splitFinanceCategory(ticker, source)) ?? null;
}

// row => {date, total, ...every part, "15-minute markets", "Everything else"}, or null for a
// date with no reported non-sports total. Each column's part is worked out once, here, and each
// row only when first asked for: a chart that shows a year never pays for the whole history.
export function nonSportsFeeBander(feesRows, sportsRows, metadataRows, categoryForTicker) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const totals = new Map(sportsRows.map(d => [+d.date, d.fees_nonsports]));
  const columns = Object.keys(feesRows[0] ?? {})
    .filter(ticker => ticker !== "date")
    .map(ticker => [ticker, partOf(ticker, metadata, categoryForTicker)])
    .filter(([, part]) => part);
  const done = new WeakMap();
  const band = d => {
    if (!Number.isFinite(totals.get(+d.date))) return null;
    const cents = Object.fromEntries(PARTS.map(p => [p, 0]));
    for (const [ticker, part] of columns) {
      if (!Number.isFinite(d[ticker])) throw new Error(`Missing non-sports fees for ${ticker}`);
      cents[part] += Math.round(d[ticker] * 100);
    }
    const total = Math.round(totals.get(+d.date) * 100);
    const known = PARTS.reduce((sum, p) => sum + cents[p], 0);
    if (known > total) throw new Error("Category fees exceed the reported non-sports total");
    cents.Other += total - known;
    const sum = parts => parts.reduce((s, p) => s + cents[p], 0) / 100;
    return {date: d.date, total: total / 100, ...Object.fromEntries(PARTS.map(p => [p, cents[p] / 100])),
      "15-minute markets": sum(FIFTEEN_PARTS), "Everything else": sum(ELSE_PARTS)};
  };
  return d => {
    if (!done.has(d)) done.set(d, band(d));
    return done.get(d);
  };
}

// Every row at once: the dates with a reported non-sports total, in the order given.
export function nonSportsFeeBands(feesRows, sportsRows, metadataRows, categoryForTicker) {
  return feesRows.map(nonSportsFeeBander(feesRows, sportsRows, metadataRows, categoryForTicker)).filter(Boolean);
}
