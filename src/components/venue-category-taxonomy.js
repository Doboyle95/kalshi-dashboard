import {ECONOMICS_COLOR, FINANCE_COLOR} from "./non-sports-categories.js";

const SPORT = new Set(["Baseball", "Soccer", "Tennis", "Golf", "Basketball", "Basketball (pro)",
  "Basketball (college)", "Football", "Combat sports", "MMA", "Boxing", "Motorsport", "Hockey",
  "Cricket", "Rugby", "Table tennis", "Esports", "Aussie Rules", "Sports",
  // Novig's residual for a sport it did not name. It is still a SPORT -- letting it fall
  // through to "Other" put a grey legend swatch on a band 173 contracts tall.
  "Other sport"]);
const ECON = new Set(["Economics"]);
const FINANCE = new Set(["Finance", "Financials", "Commodities", "Companies"]);
const POL = new Set(["Politics", "Elections"]);
const WX = new Set(["Weather", "Climate and Weather"]);
const CRYPTO = new Set(["Crypto"]);

// ⚠ "Other" is NOT one thing. At Underdog it is the combo/parlay bucket -- verified
// to three decimals against underdog_daily.contracts_parlay. At Nadex it is a genuine
// residual, and Nadex carries a SEPARATE explicit "Parlays" value. Mapping "Other"
// globally would move a third of Underdog's book into the wrong bucket.
//
// ⚠ And the parlay VALUE itself is spelled differently on every venue that has one --
// "Parlays" at Nadex, "Parlay" at Novig, "Parlay (multi-event)" at ProphetX, "Other"
// at Underdog. A shared string match would have to guess; each venue naming its own
// value is what keeps a rename on one feed from silently re-bucketing another's book.
// Novig was missing here until 2026-08-24 and 34.6% of its contracts -- every parlay
// it has ever published -- were being drawn as grey unclassified "Other". DKeX was the
// same story a week later: it launched combos on 2026-08-26 and by 08-28 they were 44%
// of the day's contracts, all landing in the grey bucket until the feed learned the
// COMBO prefix on 08-31. When a venue ships a parlay book, it needs a line HERE too.
const PARLAY_VALUE = {
  "DKeX": new Set(["Parlays"]),
  "Nadex": new Set(["Parlays"]),
  "Novig": new Set(["Parlay"]),
  "ProphetX": new Set(["Parlay (multi-event)"]),
  "Underdog": new Set(["Other"])
};

export function bucketOf(venue, raw) {
  if ((PARLAY_VALUE[venue] ?? new Set()).has(raw)) return "Sports · parlays";
  if (SPORT.has(raw)) return "Sports";
  if (CRYPTO.has(raw)) return "Crypto";
  if (POL.has(raw)) return "Politics & elections";
  if (ECON.has(raw)) return "Economics";
  if (FINANCE.has(raw)) return "Finance";
  if (WX.has(raw)) return "Weather & climate";
  return "Other";
}

export const BUCKETS = ["Sports", "Sports · parlays", "Crypto", "Politics & elections",
                        "Economics", "Finance", "Weather & climate", "Other"];

// Parlays are a lighter shade of the Sports colour so the two read as one block.
export const BUCKET_COLORS = {
  "Sports": "#0E7C6B",
  "Sports · parlays": "#7FD4C6",
  "Crypto": "var(--accent-dkex)",
  "Politics & elections": "var(--accent-polymarket)",
  "Economics": ECONOMICS_COLOR,
  "Finance": FINANCE_COLOR,
  "Weather & climate": "#6366F1",
  "Other": "var(--pc-unclassified)"
};

export const bucketColor = b => BUCKET_COLORS[b] ?? "var(--pc-unclassified)";
