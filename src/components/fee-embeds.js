import {splitFinanceCategory} from "./non-sports-categories.js";
export const NONSPORTS_FEE_CATEGORIES = ["Crypto", "Politics", "Finance", "Economics", "Weather", "Mention", "Entertainment", "Other"];
// Distinct hues make small category bands easier to distinguish.
export const NONSPORTS_FEE_COLORS = ["#0072B2", "#D55E00", "#009E73", "#A65628", "#CC79A7", "#E69F00", "#7443AA", "#777777"];

export const FILTERED_FEE_CATEGORIES = ["Economics", "Politics", "Weather", "Mention", "Entertainment", "Other"];
export const FILTERED_FEE_COLORS = ["#A65628", "#D55E00", "#CC79A7", "#E69F00", "#7443AA", "#777777"];

// Filter the complete source-category aggregate, not the top-ticker fee file:
// its residual Other bucket can contain untracked crypto and financial fees.
export function filteredNonSportsFees(categoryRows) {
  const excluded = new Set(["Sports", "Non-sport parlays", "Crypto", "Financials", "Commodities"]);
  const categories = new Map([
    ["Economics", "Economics"], ["Politics", "Politics"], ["Elections", "Politics"],
    ["Climate and Weather", "Weather"], ["Mentions", "Mention"], ["Entertainment", "Entertainment"]
  ]);
  const days = new Map();
  for (const d of categoryRows) {
    if (!Number.isFinite(+d.date) || !d.kalshi_category || !Number.isFinite(d.fees)) {
      throw new Error("Invalid daily category fee data");
    }
    if (!days.has(+d.date)) days.set(+d.date, {
      date: d.date, ...Object.fromEntries(FILTERED_FEE_CATEGORIES.map(c => [c, 0]))
    });
    if (excluded.has(d.kalshi_category)) continue;
    days.get(+d.date)[categories.get(d.kalshi_category) ?? "Other"] += Math.round(d.fees * 100);
  }
  return [...days.values()].sort((a, b) => a.date - b.date).map(d => ({
    date: d.date,
    total: FILTERED_FEE_CATEGORIES.reduce((sum, c) => sum + d[c], 0) / 100,
    ...Object.fromEntries(FILTERED_FEE_CATEGORIES.map(c => [c, d[c] / 100]))
  }));
}

export function nonSportsFeesByCategory(feesRows, sportsRows, metadataRows, categoryForTicker) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const totals = new Map(sportsRows.map(d => [+d.date, d.fees_nonsports]));
  const feeCategory = ticker => {
    const source = metadata.get(ticker)?.cat;
    return splitFinanceCategory(ticker, ["Economics", "Financials", "Commodities"].includes(source) ? source : categoryForTicker(ticker));
  };
  const columns = Object.keys(feesRows[0] ?? {}).filter(ticker => {
    const m = metadata.get(ticker);
    // The broad source split uses is_sports. Some sports mention series have a
    // display category of Mention, so their display category alone is insufficient.
    return m && (m.is_sports === false || m.is_sports === "FALSE") &&
      NONSPORTS_FEE_CATEGORIES.slice(0, -1).includes(feeCategory(ticker));
  }).map(ticker => [ticker, feeCategory(ticker)]);
  return feesRows.filter(d => Number.isFinite(totals.get(+d.date))).map(d => {
    const cents = Object.fromEntries(NONSPORTS_FEE_CATEGORIES.map(c => [c, 0]));
    for (const [ticker, category] of columns) {
      if (!Number.isFinite(d[ticker])) throw new Error(`Missing category fees for ${ticker}`);
      cents[category] += Math.round(d[ticker] * 100);
    }
    const total = Math.round(totals.get(+d.date) * 100);
    const known = Object.values(cents).reduce((a, b) => a + b, 0);
    if (known > total) throw new Error("Category fees exceed the reported non-sports total");
    cents.Other = total - known;
    return {date: d.date, total: total / 100, ...Object.fromEntries(Object.entries(cents).map(([k, v]) => [k, v / 100]))};
  });
}

// Confirmed with Kalshi's public series metadata (category Crypto, frequency
// fifteen_min), 2026-10-06. ZEC and NEAR currently fall into Other in the site's
// broad display taxonomy, but are still crypto 15-minute products. Coin Race is
// also a 15-minute crypto series.
const VERIFIED_CRYPTO_15M = new Set([
  "KXBNB15M", "KXBTC15M", "KXDOGE15M", "KXETH15M", "KXHYPE15M",
  "KXSOL15M", "KXXRP15M", "KXZEC15M", "KXNEAR15M", "KXCRYPTOLEAD15M",
  "KXCRYPTOCOMP15M", "KXADA15M", "KXBCH15M", "KXTON15M"
]);
// These seven series also have API category Commodities and frequency fifteen_min.
// The dashboard's broad taxonomy places them in Finance or Other, so use their
// verified series identities rather than treating all Financials as commodities.
const VERIFIED_COMMODITY_15M = new Set([
  "KXGOLD15M", "KXSILVER15M", "KXWTI15M", "KXCOPPER15M", "KXNATGAS15M", "KXPALLADIUM15M", "KXPLATINUM15M"
]);
// API category Financials, frequency fifteen_min, verified 2026-10-06.
// Index and Treasury series are listed but currently have no trades; they enter
// the chart automatically when their fee columns appear. Exclude the TEST series.
const VERIFIED_FINANCE_15M = new Set([
  "KXINX15M", "KXNDQ15M", "KXDJIA15M", "KX2YRRATE15M", "KX5YRRATE15M",
  "KX10YRRATE15M", "KX30YRRATE15M", "KXEURUSD15M", "KXUSDJPY15M",
  "KXGBPUSD15M", "KXAUDUSD15M", "KXUSDCAD15M"
]);
// Remove series before category aggregation so 15-minute products classified as
// Other (such as ZEC and NEAR) cannot survive in the residual Other segment.
export function nonSportsFeesExcludingFifteenMinute(feesRows, sportsRows, metadataRows, categoryForTicker) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const verified = new Set([...VERIFIED_CRYPTO_15M, ...VERIFIED_COMMODITY_15M,
    ...VERIFIED_FINANCE_15M, "KXGBPUSD15MTEST"]);
  const tickers = Object.keys(feesRows[0] ?? {}).filter(ticker => {
    const m = metadata.get(ticker);
    if (m?.is_sports === true || m?.is_sports === "TRUE") return false;
    return verified.has(ticker) || (/15M$/.test(ticker) &&
      (m?.is_sports === false || m?.is_sports === "FALSE"));
  });
  if (!tickers.length) throw new Error("15-minute fee data is unavailable");
  const removedByDate = new Map();
  const remaining = feesRows.map(row => {
    const copy = {...row};
    let removed = 0;
    for (const ticker of tickers) {
      if (!Number.isFinite(row[ticker])) throw new Error(`Missing 15-minute fees for ${ticker}`);
      removed += Math.round(row[ticker] * 100);
      copy[ticker] = 0;
    }
    removedByDate.set(+row.date, removed);
    return copy;
  });
  const totals = sportsRows.map(row => {
    if (!removedByDate.has(+row.date)) return row;
    const cents = Math.round(row.fees_nonsports * 100) - removedByDate.get(+row.date);
    if (cents < 0) throw new Error("15-minute fees exceed the reported non-sports total");
    return {...row, fees_nonsports: cents / 100};
  });
  return {rows: nonSportsFeesByCategory(remaining, totals, metadataRows, categoryForTicker), tickers};
}

export function fifteenMinuteFees(feesRows, metadataRows) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const columns = Object.keys(feesRows[0] ?? {});
  const cryptoTickers = columns.filter(ticker =>
    VERIFIED_CRYPTO_15M.has(ticker) || (/15M$/.test(ticker) && metadata.get(ticker)?.cat === "Crypto")
  );
  const commodityTickers = columns.filter(ticker =>
    VERIFIED_COMMODITY_15M.has(ticker) || (/15M$/.test(ticker) && metadata.get(ticker)?.cat === "Commodities")
  );
  const financeTickers = columns.filter(ticker =>
    !cryptoTickers.includes(ticker) && !commodityTickers.includes(ticker) &&
    (VERIFIED_FINANCE_15M.has(ticker) || (/15M$/.test(ticker) && ["Financials", "Finance"].includes(metadata.get(ticker)?.cat)))
  );
  const tickers = [...cryptoTickers, ...commodityTickers, ...financeTickers];
  if (!tickers.length) throw new Error("15-minute fee data is unavailable");
  const rows = feesRows.map(d => {
    const sumCents = series => series.reduce((cents, ticker) => {
      if (!Number.isFinite(d[ticker])) throw new Error(`Missing 15-minute fees for ${ticker}`);
      return cents + Math.round(d[ticker] * 100);
    }, 0);
    const crypto = sumCents(cryptoTickers), commodities = sumCents(commodityTickers), finance = sumCents(financeTickers);
    return {date: d.date, cryptoFees: crypto / 100, commodityFees: commodities / 100,
      financeFees: finance / 100, fees: (crypto + commodities + finance) / 100};
  });
  return {rows, tickers, cryptoTickers, commodityTickers, financeTickers};
}
