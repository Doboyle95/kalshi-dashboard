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
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Soccer": "Other sports", "Combat Sports": "Other sports", "Other Sports": "Other sports",
  "Cricket": "Other sports", "Racing": "Other sports", "Esports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Mention": "Non-sports", "Weather": "Non-sports", "Other Non-sports": "Non-sports",
  "Uncategorized": "Uncategorized"
};

export const TAKER_GENERAL_ORDER = ["Non-sports", "Other sports", "Baseball", "Basketball", "Football", "Parlay", "Uncategorized"];

export const TAKER_GENERAL_COLORS = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2",
  "Uncategorized": "#9E9E9E"
};
