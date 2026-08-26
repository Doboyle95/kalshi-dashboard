// Shared per-report_ticker category classification for taker charts (volume, P&L, yes/no skew).
// Sport-by-sport (report_ticker -> cat from category_leaderboard.csv) instead of Kalshi's own
// coarse kalshi_category, which dumps every sport into one "Sports" bucket that swamps the other
// ~13 categories down to a few percent combined.
//
// Detailed = 22 buckets matching categories.md's TM_CATEGORY_ORDER/TM_CATEGORY_COLORS, extended
// with an "Uncategorized" catch-all so a future report_ticker not yet in the leaderboard is still
// visible instead of silently dropped. General (default/broad) = categories.md's
// generalMap/generalOrder/generalColors 6-bucket collapse.

export function buildReportTickerToCat(categoryLeaderboard) {
  return new Map(
    categoryLeaderboard.filter(d => d.report_ticker && d.cat).map(d => [d.report_ticker, d.cat])
  );
}

// The per-ticker taker export is settlement-aware, so its newest days can cover only
// part of the all-trade daily taker total. Preserve the observed category mix while
// putting every day on the same dollar basis as taker_notional_daily.csv.
export function reconcileTakerCategoryRows(rows, dailyTotals) {
  const dailyByDate = new Map(
    dailyTotals.map(d => [+d.date, +d.notional_total || 0])
  );
  const sourceByDate = new Map();
  for (const row of rows) {
    const date = +row.date;
    sourceByDate.set(date, (sourceByDate.get(date) || 0) + (+row.value || 0));
  }

  return rows.map(row => {
    const sourceTotal = sourceByDate.get(+row.date) || 0;
    const dailyTotal = dailyByDate.get(+row.date) || 0;
    const scale = sourceTotal > 0 && dailyTotal > 0 ? dailyTotal / sourceTotal : 1;
    return {...row, value: (+row.value || 0) * scale};
  });
}

// Direct per-ticker taker dollars only begin on 2026-04-15. For earlier dates,
// use the complete all-trade report-ticker contract mix as a category-share
// proxy, then scale those shares to the authoritative daily taker-dollar total.
// Mark the generated rows so charts can disclose the estimate in copy/tooltips.
export function estimateHistoricalTakerCategoryRows(wideRows, reportTickerToCat, dailyTotals, beforeDate) {
  const dailyByDate = new Map(
    dailyTotals.map(d => [+d.date, +d.notional_total || 0])
  );
  const cutoff = +beforeDate;
  const estimatedRows = [];

  for (const row of wideRows) {
    const date = +row.date;
    const dailyTotal = dailyByDate.get(date) || 0;
    if (!Number.isFinite(date) || date >= cutoff || dailyTotal <= 0) continue;

    const byCategory = new Map();
    let sourceTotal = 0;
    for (const [reportTicker, rawValue] of Object.entries(row)) {
      if (reportTicker === "date") continue;
      const value = +rawValue || 0;
      if (value <= 0) continue;
      const category = reportTickerToCat.get(reportTicker) || "Uncategorized";
      byCategory.set(category, (byCategory.get(category) || 0) + value);
      sourceTotal += value;
    }

    if (sourceTotal <= 0) continue;
    for (const [category, value] of byCategory) {
      estimatedRows.push({
        date: row.date,
        category,
        value: dailyTotal * value / sourceTotal,
        estimated: true
      });
    }
  }

  return estimatedRows;
}

export const TAKER_DETAIL_ORDER = [
  "Other Non-sports", "Weather", "Mention", "Entertainment", "Finance", "Politics", "Crypto",
  "Other Sports", "Esports", "Racing", "Cricket", "Combat Sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College Football", "NFL", "College Basketball", "NBA", "Parlay", "Uncategorized"
];

export const TAKER_DETAIL_COLORS = {
  "Other Non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Mention": "#78909c", "Finance": "#6b8cae", "Politics": "#455a64", "Crypto": "#263238",
  "Other Sports": "#c8e6c9", "Esports": "#BCAAA4", "Racing": "#A1887F", "Cricket": "#FA8072",
  "Combat Sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  "College Football": "#ffcc80", "NFL": "#bf360c",
  "College Basketball": "#90caf9", "NBA": "#0d47a1",
  "Parlay": "#7b1fa2",
  "Uncategorized": "#9E9E9E"
};

export const TAKER_GENERAL_MAP = {
  "NFL": "Football", "College Football": "Football",
  "NBA": "Basketball", "College Basketball": "Basketball",
  "Baseball": "Baseball",
  "Soccer": "Soccer",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Combat Sports": "Other sports", "Other Sports": "Other sports",
  "Cricket": "Other sports", "Racing": "Other sports", "Esports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Mention": "Non-sports", "Weather": "Non-sports", "Other Non-sports": "Non-sports",
  "Uncategorized": "Uncategorized"
};

export const TAKER_GENERAL_ORDER = ["Non-sports", "Other sports", "Baseball", "Soccer", "Basketball", "Football", "Parlay", "Uncategorized"];

export const TAKER_GENERAL_COLORS = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Soccer": "#827717", "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2",
  "Uncategorized": "#9E9E9E"
};
