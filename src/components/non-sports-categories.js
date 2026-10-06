import {ECONOMIC_FEE_SERIES, FINANCIAL_FEE_SERIES} from "./fee-sector-series.js";

export const ECONOMICS_COLOR = "#A65628";
export const FINANCE_COLOR = "#009E73";

// Series IDs also work for market keys. Verified identities distinguish, for
// example, CPI releases from gas prices despite the source's broad Finance label.
export function splitFinanceCategory(ticker, fallback) {
  const series = String(ticker ?? "").toUpperCase().split("-")[0];
  if (series.startsWith("KXMVE") || /parlay/i.test(fallback ?? "")) return fallback;
  if (FINANCIAL_FEE_SERIES.has(series)) return "Finance";
  if (ECONOMIC_FEE_SERIES.has(series)) return "Economics";
  if (/^economics$/i.test(fallback ?? "")) return "Economics";
  if (/^(financials|commodities)$/i.test(fallback ?? "")) return "Finance";
  return fallback;
}

export function splitCategoryRows(rows) {
  return rows.map(row => {
    // Retain the feed's sports/parlay scope; only subdivide its non-sports data.
    if (row.grp === "Sports" || /parlay/i.test(row.cat ?? "")) return row;
    const cat = splitFinanceCategory(row.report_ticker, row.cat);
    return cat === row.cat ? row : {...row, cat, wide_cat: cat};
  });
}
