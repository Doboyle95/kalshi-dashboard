// Mechanical backstops for recurring editorial mistakes in the generated briefing.
// The prompt carries the full explanation; these checks catch a draft that ignores it
// and feed a concrete correction into the existing retry loop.
const INTERNAL_LONG_ODDS_LABEL = /\b(?:lottery(?:-ticket)?|parlay[- ]lottery|lottery[- ]parlay|longshots?|longer[- ]odds)\b/i;
const APPROVED_LONG_ODDS_DESCRIPTION = /\b(?:extremely long[- ]odds parlays?|parlays? with at least eight legs (?:trading|priced) below 2 cents)\b/i;
const OTHER_VENUE_MENTION = /\b(?:Polymarket(?: US)?|ForecastEx|DKeX|Underdog(?: Exchange)?|OG(?:\/Crypto\.com)?|Crypto\.com(?:\/Nadex)?|Nadex|ProphetX|Novig|Rothera|CME)\b/i;

// A word such as "parlays" in the prose is not evidence that the model used Kalshi's
// deeper tables. The Aug. 26 briefing passed the old word-only gate with a monthly parlay
// share even though its returned evidence contained only a Novig category query. Require
// both a purpose-built Kalshi table and a real recent comparison in the supporting SQL.
const KALSHI_DEPTH_TABLE = /\b(?:taker_pnl_daily|parlay_pnl_unified_daily|parlay_pnl_daily_by_corr_v2|parlay_top_games_by_volume|parlay_popular_daily|extreme_trades_daily|trade_size_daily|parlay_trade_size_daily|daily_sports_vs_nonsports|sports_market_type_daily|taker_notional_daily|category_daily|parlay_house_edge_by_legs|parlay_lottery_daily|calibration_[a-z0-9_]+)\b/i;
const RECENT_COMPARISON_SQL = /\b(?:avg|median|quantile|percent_rank|rank|lag)\s*\(|\binterval\b|\bbetween\b/i;

export function kalshiDepthEvidenceFaults(sqls) {
  const source = String(sqls || "");
  if (!KALSHI_DEPTH_TABLE.test(source)) {
    return ["the Kalshi bullet is not backed by a query over a Kalshi depth table -- run one instead of satisfying the requirement with a general parlay, sports, or monthly-share phrase"];
  }
  if (!RECENT_COMPARISON_SQL.test(source)) {
    return ["the Kalshi depth query does not compare the latest day or week with a recent norm -- add an average, rank, lag, or equivalent recent comparison"];
  }
  return [];
}

// On Kalshi's biggest day on record, the record is the headline and the figure after it has
// to explain that day. The Sept. 12, 2026 card opened "Kalshi cleared another
// two-billion-contract day" on a record 2.43B contracts, then spent its second half on
// Economics at 4.8M contracts -- 0.2% of the day. `standing` comes from the generator's
// ranking lookup ({volume, rank, earlierDay, earlierContracts}) and is null when it failed.
const RECORD_WORDING = /\b(?:records?|biggest|largest|busiest|most active|all-time|ever|new high|single-day high)\b/i;
const CONTRACT_FIGURE = /(\d[\d,]*(?:\.\d+)?)\s*(billion|million|thousand|[bmk])?\s+contracts\b/gi;
const CONTRACT_SCALE = {billion: 1e9, b: 1e9, million: 1e6, m: 1e6, thousand: 1e3, k: 1e3};
const SLIVER_OF_RECORD_DAY = 0.02;

export function contractFigures(text) {
  return [...String(text || "").matchAll(CONTRACT_FIGURE)]
    .map(([, number, unit]) => Math.round(Number(number.replace(/,/g, "")) * (unit ? CONTRACT_SCALE[unit.toLowerCase()] : 1)))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function kalshiRecordDayFaults(text, standing) {
  if (standing?.rank !== 1 || !(standing.volume > 0)) return [];
  const bullet = String(text || "")
    .split(/\n(?=\s*[-*])/)
    .map((item) => item.trim())
    .find((item) => /kalshi/i.test(item) && !OTHER_VENUE_MENTION.test(item));
  if (!bullet) return [];

  const faults = [];
  const opener = bullet.match(/\*\*([^*]+)\*\*/)?.[1] ?? bullet;
  if (!RECORD_WORDING.test(opener)) {
    faults.push(`Kalshi's latest day was its biggest on record, above the previous high of ${standing.earlierContracts.toLocaleString("en-US")} contracts on ${standing.earlierDay} -- say so plainly in the Kalshi bullet's bold opening phrase`);
  }
  const sliver = contractFigures(bullet).find((value) => value < standing.volume * SLIVER_OF_RECORD_DAY);
  if (sliver != null) {
    faults.push(`on Kalshi's record day its bullet spends a figure on ${sliver.toLocaleString("en-US")} contracts, under 2% of the day's ${standing.volume.toLocaleString("en-US")} -- replace it with the part of the market that carried the record, from that same day, sized against the day's total`);
  }
  return faults;
}

export function otherVenueBulletCount(text) {
  return String(text || "")
    .split(/\n(?=\s*[-*])/)
    .map((bullet) => bullet.trim())
    .filter((bullet) => bullet && OTHER_VENUE_MENTION.test(bullet))
    .length;
}

export function withoutExcludedPreviousInsights(text) {
  return String(text || "")
    .split(/\n(?=\s*[-*])/)
    .filter((bullet) => !INTERNAL_LONG_ODDS_LABEL.test(bullet))
    .join("\n")
    .trim();
}

export function wordingFaults(text, sqls) {
  const faults = [];

  // Daniel's standing rule across the whole site. The token survives in column names
  // (notional_total, cashout_notional), which is exactly where the model picks it up.
  // "about 1.3% of measured volume" tells a reader nothing about what was measured.
  // The site calls this market share everywhere else.
  if (/measured\s+(venue\s+)?volume/i.test(text)) {
    faults.push('the phrase "measured volume" says nothing about what was measured -- call it market share, the term the rest of the site uses');
  }
  // Lifted from the model's own supporting-query columns (prior_30_report_average_contracts):
  // the Sept. 12 card said "645.8% above its prior 30-report average".
  if (/\b(?:\d+|seven|thirty)[- ]report\b/i.test(text)) {
    faults.push('"N-report average" is internal wording -- say its recent average, or its average over the past week or month');
  }
  if (/\bnotional\b/i.test(text)) {
    faults.push('the word "notional" must never appear in the prose -- say taker-side volume or yes-side volume');
  }

  // "51% of settled contracts" was a share of contracts TRADED. Naming the wrong measure
  // reads as a different statistic entirely, while the figure itself looks perfectly fine.
  if (/\bsettle(d|ment)\b/i.test(text) && !/(settle|realized|calibration|resolved|result)/.test(sqls)) {
    faults.push('the prose says settled or settlement but no query measured settlement -- name what was actually counted, which is normally contracts traded');
  }

  if (INTERNAL_LONG_ODDS_LABEL.test(text)) {
    faults.push("keep the internal lottery-ticket/parlay-lottery/longshot label out of the briefing -- say extremely long-odds parlays, or parlays with at least eight legs trading below 2 cents");
  }
  if (/parlay_lottery_(?:daily|summary)/i.test(sqls) && !APPROVED_LONG_ODDS_DESCRIPTION.test(text)) {
    faults.push("a query used the internal long-odds parlay classification, so the prose must identify the subset plainly as extremely long-odds parlays or parlays with at least eight legs trading below 2 cents -- never as parlays generally");
  }

  // A routine rank hides the actual finding from anyone scanning the bold openers. Rank
  // can still appear in the body when useful; it should not masquerade as the change.
  const openers = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => match[1]);
  if (openers.some((opener) => /\b(?:led\s+the\s+(?:challengers|competitors)|(?:was|remained|stayed|held)\s+(?:the\s+)?(?:largest\s+competitor|runner-up|second\s+place|no\.?\s*2))\b/i.test(opener))) {
    faults.push('a bold opener must name the notable change, not a routine rank such as leading the challengers or holding second place -- put the unusual growth, slowdown, share shift, or other finding in the opener');
  }

  return faults;
}
