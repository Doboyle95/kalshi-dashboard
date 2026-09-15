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

// On Kalshi's biggest day on record, the record is the headline and the bullet has to say
// which part of the market carried it. The Sept. 12, 2026 card did neither: it opened
// "Kalshi cleared another two-billion-contract day" on a record 2.43B contracts, and the only
// figure after it was Economics at 4.8M contracts -- 0.2% of the day, explaining nothing.
// A small figure BESIDE an explanation is fine. A draft that gave sports' 2.19B and added
// "the biggest parlay in the week drew 35.9M YES contracts" is a reasonable bullet (Daniel,
// 2026-09-15), and an earlier version of this check, which faulted every figure under 2% of
// the day, stamped it out. So this asks for one figure that sizes a real part of the day and
// says nothing about what else rides along. `standing` comes from the generator's ranking
// lookup ({volume, rank, earlierDay, earlierContracts}) and is null when it failed.
const RECORD_WORDING = /\b(?:records?|biggest|largest|busiest|most active|all-time|ever|new high|single-day high)\b/i;
// A count: a number with a unit (2.19B, 35.9M), or any number followed by "contracts",
// allowing one word between (35.9M YES contracts; 2,188,554,985 contracts).
const MAGNITUDE = /(\$)?\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(billion|million|thousand|[bmk])\b|(?=\s+(?:[a-z-]+\s+)?contracts\b))/gi;
const MAGNITUDE_SCALE = {billion: 1e9, b: 1e9, million: 1e6, m: 1e6, thousand: 1e3, k: 1e3};
// Figures that size nothing: a cutoff ("trades of at least 50,000 contracts"), or a baseline
// ("a daily average of 1.75B", "its 185.7M seven-day average").
const THRESHOLD_BEFORE = /(?:at least|more than|fewer than|less than|over|above|under|below|up to)\s*$/i;
const AVERAGE_BEFORE = /\baverage\s+(?:of\s+)?$/i;
const AVERAGE_AFTER = /^\s*(?:[a-z0-9-]+\s+)?average\b/i;
// A share of the day also sizes a part of it: "parlays made up 61% of the day".
const SHARE_OF_DAY = /\b(\d{1,2}(?:\.\d+)?)%\s+of\s+(?:the\s+day|the\s+total|all\s+(?:volume|contracts|trading)|its\s+(?:volume|total)|kalshi['’]s\s+(?:volume|total|day))/gi;

function roughContracts(value) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

// The counts in a bullet that size something, with their positions. Money, cutoffs and
// baselines are dropped.
function countsIn(bullet) {
  const counts = [];
  for (const match of bullet.matchAll(MAGNITUDE)) {
    const [whole, money, number, unit] = match;
    const start = match.index;
    const end = start + whole.length;
    const before = bullet.slice(Math.max(0, start - 20), start);
    if (money || THRESHOLD_BEFORE.test(before) || AVERAGE_BEFORE.test(before) || AVERAGE_AFTER.test(bullet.slice(end, end + 30))) continue;
    counts.push({start, end, value: Number(number.replace(/,/g, "")) * (unit ? MAGNITUDE_SCALE[unit.toLowerCase()] : 1)});
  }
  return counts;
}

// True when the bullet sizes some part of the record day between 2% and 97% of it. The
// headline itself (at or near the day's total) and the old record it beat do not count.
function sizesPartOfRecordDay(bullet, standing) {
  const sized = countsIn(bullet).some(({value}) =>
    Math.abs(value - standing.earlierContracts) > standing.earlierContracts * 0.015
    && value / standing.volume >= 0.02
    && value / standing.volume < 0.97);
  return sized || [...bullet.matchAll(SHARE_OF_DAY)].some(([, percent]) => Number(percent) >= 2 && Number(percent) < 97);
}

// The bar for naming a slice of Kalshi depends on what the slice is (Daniel, 2026-09-15). A
// CATEGORY is judged by size: "it doesn't make much sense to flag a tiny category that may
// have had some decent growth" -- the Sept. 12 card's "Economics reached 4.8M contracts", 0.2%
// of the day. A SINGLE market or trade is judged by standing out: "very reasonable to flag the
// biggest market within the biggest category", like a draft's 35.9M-contract parlay. Over the
// 60 days to Sept. 13, sports and crypto held at least 1% of Kalshi's day on every day,
// commodities on 23, elections on 5, economics and mentions on one each, and every other
// category on none. So a category named with a count under 1% of the day is sent back, and
// anything phrased as one market, event, game, trade or parlay is left alone. Plural names
// only: "elections" is the category, "the mayoral election" is one event.
const KALSHI_CATEGORY = /\b(?:economics|elections|politics|financials|crypto|entertainment|commodities|mentions|companies|climate and weather|weather|science and technology|transportation)\b/gi;
const SINGLE_ITEM_AFTER = /^\s*(?:[a-z-]+\s+)?(?:market|event|game|trade|parlay|bet)\b/i;
const SINGLE_ITEM_BEFORE = /\b(?:market|event|game|trade|parlay|bet)\s+(?:in|within|among)\s+(?:the\s+)?$/i;
const SINGLE_ITEM = /\b(?:market|event|game|trade|parlay|bet)\b/gi;
const CATEGORY_SHARE_FLOOR = 0.01;

export function kalshiCategoryFaults(text, kalshiVolume) {
  if (!(kalshiVolume > 0)) return [];
  const faults = [];
  const kalshiBullets = String(text || "")
    .split(/\n(?=\s*[-*])/)
    .map((item) => item.trim())
    .filter((item) => item && !OTHER_VENUE_MENTION.test(item));
  for (const bullet of kalshiBullets) {
    const counts = countsIn(bullet);
    const names = [...bullet.matchAll(KALSHI_CATEGORY)];
    const singles = [...bullet.matchAll(SINGLE_ITEM)].map((item) => item.index);
    for (const [position, match] of names.entries()) {
      const start = match.index;
      const end = start + match[0].length;
      if (SINGLE_ITEM_AFTER.test(bullet.slice(end, end + 20)) || SINGLE_ITEM_BEFORE.test(bullet.slice(Math.max(0, start - 20), start))) continue;
      // Its count is the first one after the name, before the clause ends and before the next
      // category or single market takes over the sentence ("**Kalshi's politics trading:** The
      // top market in politics drew 1.2M" -- that 1.2M is the market's). Else one right before it.
      const stop = Math.min(
        end + 45,
        ...[bullet.indexOf(";", end), names[position + 1]?.index ?? -1, singles.find((index) => index >= end) ?? -1]
          .filter((index) => index >= end)
      );
      const count = counts.find((item) => item.start >= end && item.start <= stop)
        ?? counts.find((item) => item.end <= start && /^\s{1,3}$/.test(bullet.slice(item.end, start)));
      if (count && count.value < kalshiVolume * CATEGORY_SHARE_FLOOR) {
        faults.push(`"${match[0]}" is a whole category at ${roughContracts(count.value)} contracts, under 1% of Kalshi's ${roughContracts(kalshiVolume)}-contract day -- growth in a category that small is not news; leave it out, or name a single market or trade that stood out instead`);
      }
    }
  }
  return faults;
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
    faults.push(`Kalshi's latest day was its biggest on record, above the previous high of ${roughContracts(standing.earlierContracts)} contracts on ${standing.earlierDay} -- say so plainly in the Kalshi bullet's bold opening phrase`);
  }
  if (!sizesPartOfRecordDay(bullet, standing)) {
    faults.push(`on Kalshi's record day its bullet never says which part of the market carried the ${roughContracts(standing.volume)} contracts -- add sports, parlays or whichever segment did, from that same day, sized against the day's total`);
  }
  return faults;
}

// The card is bullets and nothing else. A test draft on 2026-09-15 closed with a paragraph
// ("Kalshi's record was broad-based rather than a narrow category spike: ...") that the page
// would have rendered under the list.
export function formatFaults(text) {
  const stray = String(text || "").split("\n").find((line) => line.trim() && !/^\s*[-*]\s/.test(line));
  return stray
    ? [`return only the bullets -- no paragraph before, between or after them (found: "${stray.trim().slice(0, 60)}...")`]
    : [];
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
  // A figure the reader has to count digits in. The Sept. 13 card printed "2,460,211,509
  // contracts" and "the previous high of 2,426,117,598" while its other bullets wrote 346.8M:
  // the exact values arrive in the rows, and the model sometimes copies them.
  const unrounded = text.match(/\$?\b\d{1,3}(?:,\d{3}){2,}(?:\.\d+)?\b/);
  if (unrounded) {
    faults.push(`round large figures the way the rest of the card does -- 2.46B contracts, 346.8M, $16.0M -- not ${unrounded[0]}`);
  }

  // The same card set one day against "1,229,285,435 over the prior 30 reported days": a DAILY
  // AVERAGE that reads as a 30-day total. A figure compared over a window must say which it is.
  // A comparison figure with no name at all is the same fault: a draft wrote "$2.64M in fees
  // versus $383,700." and left the reader to guess what the second number was.
  const bareWindow = text.match(/\b(?:versus|vs\.?|against|compared (?:with|to)|from)\s+\$?\d(?:[\d,.]*\d)?\s*(?:billion|million|thousand|[bmk])?\s+(?:contracts\s+)?(?:over|across|in|during)\s+the\s+(?:prior|past|previous|last)\s+(?:\d+|seven|thirty|week|month)\b/i)
    || text.match(/\b(?:versus|vs\.?|against|compared (?:with|to))\s+\$?\d(?:[\d,.]*\d)?\s*(?:billion|million|thousand|[bmk])?(?=\s*(?:[;,)]|\.(?:\s|$)|$)|\s+(?:and|while|with)\b)/im);
  if (bareWindow) {
    faults.push(`"${bareWindow[0]}" does not say what that figure is -- name it, as in "a daily average of 1.23B over the past month", or call it a total`);
  }

  // Lifted from the model's own supporting-query columns (prior_30_report_average_contracts):
  // the Sept. 12 card said "645.8% above its prior 30-report average".
  // Same source, other spellings: "its previous 30 reported-day average", "the prior 30 reported
  // days", "an 18.1M average over its past 30 reports".
  if (/\b(?:\d+|seven|thirty)[- ]report(?:s|ed)?\b/i.test(text)) {
    faults.push('counting reports ("30-report average", "30 reported days") is internal wording -- say its recent average, or its average over the past week or month');
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
