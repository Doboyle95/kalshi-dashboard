export const NONSPORTS_FEE_CATEGORIES = ["Crypto", "Politics", "Finance", "Weather", "Mention", "Entertainment", "Other"];
// Match the volume map's non-sports palette.
export const NONSPORTS_FEE_COLORS = ["var(--cat-basketball)", "#1A237E", "#1E88E5", "#4FC3F7", "#546E7A", "#0097A7", "#7986CB"];

export function nonSportsFeesByCategory(feesRows, sportsRows, metadataRows, categoryForTicker) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const totals = new Map(sportsRows.map(d => [+d.date, d.fees_nonsports]));
  const columns = Object.keys(feesRows[0] ?? {}).filter(ticker => {
    const m = metadata.get(ticker);
    // The broad source split uses is_sports. Some sports mention series have a
    // display category of Mention, so their display category alone is insufficient.
    return m && (m.is_sports === false || m.is_sports === "FALSE") &&
      NONSPORTS_FEE_CATEGORIES.slice(0, -1).includes(categoryForTicker(ticker));
  }).map(ticker => [ticker, categoryForTicker(ticker)]);
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
// also a 15-minute crypto series. Commodity and FX 15M tickers are excluded.
const VERIFIED_CRYPTO_15M = new Set([
  "KXBNB15M", "KXBTC15M", "KXDOGE15M", "KXETH15M", "KXHYPE15M",
  "KXSOL15M", "KXXRP15M", "KXZEC15M", "KXNEAR15M", "KXCRYPTOLEAD15M"
]);
export function crypto15MinuteFees(feesRows, metadataRows) {
  const metadata = new Map(metadataRows.map(d => [d.report_ticker, d]));
  const tickers = Object.keys(feesRows[0] ?? {}).filter(ticker =>
    VERIFIED_CRYPTO_15M.has(ticker) || (/15M$/.test(ticker) && metadata.get(ticker)?.cat === "Crypto")
  );
  if (!tickers.length) throw new Error("15-minute crypto fee data is unavailable");
  const rows = feesRows.map(d => {
    let cents = 0;
    for (const ticker of tickers) {
      if (!Number.isFinite(d[ticker])) throw new Error(`Missing crypto fees for ${ticker}`);
      cents += Math.round(d[ticker] * 100);
    }
    return {date: d.date, fees: cents / 100};
  });
  return {rows, tickers};
}
