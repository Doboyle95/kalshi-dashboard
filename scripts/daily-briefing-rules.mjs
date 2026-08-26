// Mechanical backstops for recurring editorial mistakes in the generated briefing.
// The prompt carries the full explanation; these checks catch a draft that ignores it
// and feed a concrete correction into the existing retry loop.
const EXCLUDED_LOTTERY_PARLAY_ANGLE = /\b(?:lottery(?:-ticket)?|parlay[- ]lottery|longshots?|longer[- ]odds)\b/i;

export function withoutExcludedPreviousInsights(text) {
  return String(text || "")
    .split(/\n(?=\s*[-*])/)
    .filter((bullet) => !EXCLUDED_LOTTERY_PARLAY_ANGLE.test(bullet))
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
  if (/\bnotional\b/i.test(text)) {
    faults.push('the word "notional" must never appear in the prose -- say taker-side volume or yes-side volume');
  }

  // "51% of settled contracts" was a share of contracts TRADED. Naming the wrong measure
  // reads as a different statistic entirely, while the figure itself looks perfectly fine.
  if (/\bsettle(d|ment)\b/i.test(text) && !/(settle|realized|calibration|resolved|result)/.test(sqls)) {
    faults.push('the prose says settled or settlement but no query measured settlement -- name what was actually counted, which is normally contracts traded');
  }

  if (EXCLUDED_LOTTERY_PARLAY_ANGLE.test(text)) {
    faults.push("internally defined lottery-ticket and longshot parlay classifications are outside this briefing's scope -- replace that bullet with a different Kalshi depth angle");
  }

  // A routine rank hides the actual finding from anyone scanning the bold openers. Rank
  // can still appear in the body when useful; it should not masquerade as the change.
  const openers = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => match[1]);
  if (openers.some((opener) => /\b(?:led\s+the\s+(?:challengers|competitors)|(?:was|remained|stayed|held)\s+(?:the\s+)?(?:largest\s+competitor|runner-up|second\s+place|no\.?\s*2))\b/i.test(opener))) {
    faults.push('a bold opener must name the notable change, not a routine rank such as leading the challengers or holding second place -- put the unusual growth, slowdown, share shift, or other finding in the opener');
  }

  return faults;
}
