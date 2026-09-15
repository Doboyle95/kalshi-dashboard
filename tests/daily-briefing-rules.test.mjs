import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFaults,
  kalshiCategoryFaults,
  kalshiDepthEvidenceFaults,
  kalshiRecordDayFaults,
  otherVenueBulletCount,
  withoutExcludedPreviousInsights,
  wordingFaults
} from "../scripts/daily-briefing-rules.mjs";

test("rejects internal lottery-ticket and parlay-lottery wording", () => {
  const text = "- **Bettors shifted toward longer odds:** Lottery-parlay contracts rose while total stakes fell.";
  const faults = wordingFaults(text, "select sum(stakes) / sum(volume) from parlay_lottery_daily");

  assert.ok(faults.some((fault) => fault.includes("internal lottery-ticket")));
});

test("allows reader-facing extremely long-odds parlay wording", () => {
  const text = "- **Extremely long-odds parlays accelerated:** Parlays with at least eight legs trading below 2 cents ran above their monthly norm.";

  assert.deepEqual(
    wordingFaults(text, "select avg(volume) from parlay_lottery_daily"),
    []
  );
});

test("requires subset wording when the long-odds table is used", () => {
  const text = "- **Kalshi's parlays accelerated:** Parlay activity ran above its monthly norm.";
  const faults = wordingFaults(text, "select avg(volume) from parlay_lottery_daily");

  assert.ok(faults.some((fault) => fault.includes("must identify the subset plainly")));
});

test("removes excluded angles from yesterday's briefing context", () => {
  const previous = [
    "- **Kalshi's parlay share rose:** Parlays reached 44% of activity.",
    "- **Bettors shifted toward longer odds:** Lottery-parlay volume increased.",
    "- **Fees accelerated:** Revenue ran above its monthly average."
  ].join("\n");

  assert.equal(
    withoutExcludedPreviousInsights(previous),
    "- **Kalshi's parlay share rose:** Parlays reached 44% of activity.\n- **Fees accelerated:** Revenue ran above its monthly average."
  );
});

test("allows ordinary parlay-share context", () => {
  const text = "- **Kalshi's product mix shifted:** Parlays reached 44% of activity.";

  assert.deepEqual(wordingFaults(text, "select share_parlay from daily_sports_vs_nonsports"), []);
});

test("requires actual Kalshi depth SQL and a recent comparison", () => {
  assert.equal(kalshiDepthEvidenceFaults("select * from daily_overall").length, 1);
  assert.equal(kalshiDepthEvidenceFaults("select volume from taker_pnl_daily").length, 1);
  assert.deepEqual(
    kalshiDepthEvidenceFaults("select avg(pnl) from taker_pnl_daily where date >= max_date - interval 30 day"),
    []
  );
  assert.deepEqual(
    kalshiDepthEvidenceFaults("select avg(volume) from parlay_lottery_daily"),
    []
  );
});

const SEPT_12_STANDING = {volume: 2_426_117_598, rank: 1, earlierDay: "2026-09-05", earlierContracts: 2_293_019_261};

test("a record Kalshi day must lead with the record and say what carried it", () => {
  // The Kalshi bullet published for Sept. 12, 2026, verbatim.
  const text = [
    "- **Kalshi cleared another two-billion-contract day:** It traded 2.43B contracts on Sept. 12, 40.4% above its seven-day average; Economics reached 4.8M contracts on Sept. 10, up 104.7%, with fees rising 183.0% to $63,763.",
    "- **DKeX's surge became material:** DraftKings' exchange handled 108.0M contracts on Sept. 12."
  ].join("\n\n");
  const faults = kalshiRecordDayFaults(text, SEPT_12_STANDING);

  assert.equal(faults.length, 2);
  assert.ok(faults[0].includes("biggest on record"));
  assert.ok(faults[1].includes("which part of the market carried"));
});

test("a record Kalshi bullet that leads with the record and explains it passes", () => {
  const text = "- **Kalshi set a single-day record:** It traded 2.43B contracts on Sept. 12, topping Sept. 5's 2.29B, and sports carried 2.17B contracts of it.";

  assert.deepEqual(kalshiRecordDayFaults(text, SEPT_12_STANDING), []);
});

test("the record-day checks stay out of ordinary days and failed lookups", () => {
  const text = "- **Kalshi's weekend ran hot:** It traded 2.29B contracts; Economics reached 4.8M contracts.";

  assert.deepEqual(kalshiRecordDayFaults(text, {...SEPT_12_STANDING, rank: 2}), []);
  assert.deepEqual(kalshiRecordDayFaults(text, null), []);
});

const SEPT_13_STANDING = {volume: 2_460_211_509, rank: 1, earlierDay: "2026-09-12", earlierContracts: 2_426_117_598};

test("a small figure beside the explanation is fine on a record day", () => {
  // Verbatim: the card published for Sept. 13 (a comma-written figure explains it) and two
  // test drafts on 2026-09-15 -- one with a parlay aside Daniel judged relevant, one whose
  // "at least 50,000 contracts" is a size cutoff rather than a figure.
  const published = "- **Kalshi set a daily record:** It traded 2,460,211,509 contracts on Sept. 13, 40.85% above its seven-day average and above the previous high of 2,426,117,598; Sports supplied 2,188,554,985 contracts, versus 1,229,285,435 over the prior 30 reported days.";
  const aside = "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, up from a daily average of 1.75B over the past week and beating Sept. 12's 2.43B; sports supplied 2.19B of the total, while the biggest parlay in the week drew 35.9M YES contracts and missed.";
  const cutoff = "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, beating Sept. 12's 2.43B; sports supplied 2.19B, while 142.0M contracts came in trades of at least 50,000 contracts.";
  const share = "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, beating Sept. 12's 2.43B, with parlays making up 61% of the day.";

  for (const text of [published, aside, cutoff, share]) {
    assert.deepEqual(kalshiRecordDayFaults(text, SEPT_13_STANDING), []);
  }
});

test("a record bullet whose figures are only the headline, a baseline, the old high and a sliver fails", () => {
  const text = "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, up from a daily average of 1.75B over the past week and beating Sept. 12's 2.43B contracts; Economics rose to 4.3M contracts and fees hit $16.0M.";
  const faults = kalshiRecordDayFaults(text, SEPT_13_STANDING);

  assert.equal(faults.length, 1);
  assert.ok(faults[0].includes("2.46B contracts"));
});

test("a small category is not news on growth alone", () => {
  // The Kalshi bullet published for Sept. 12, 2026, verbatim: Economics was 0.2% of the day.
  const sept12 = "- **Kalshi cleared another two-billion-contract day:** It traded 2.43B contracts on Sept. 12, 40.4% above its seven-day average; Economics reached 4.8M contracts on Sept. 10, up 104.7%, with fees rising 183.0% to $63,763.";
  const faults = kalshiCategoryFaults(sept12, 2_426_117_598);

  assert.equal(faults.length, 1);
  assert.ok(faults[0].includes('"Economics" is a whole category at 4.8M contracts'));
  assert.equal(kalshiCategoryFaults("- **Kalshi's elections markets doubled:** Elections contracts rose 104% to 7.6M on Sept. 9, while Kalshi traded 1.90B overall.", 1_900_757_552).length, 1);
});

test("a single market can be named at a volume no category could", () => {
  const volume = 2_460_211_509;
  const texts = [
    // Daniel, 2026-09-15: the biggest market within the biggest category is worth naming.
    "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, beating Sept. 12's 2.43B; sports supplied 2.19B, and its biggest single market, the Bills-Ravens game, drew 41.2M contracts.",
    "- **Kalshi's Fed market stood out:** The biggest economics market, the September rate decision, drew 3.1M contracts on Sept. 13.",
    "- **Kalshi's politics trading:** The top market in politics drew 1.2M contracts on Sept. 13.",
    "- **Kalshi's crypto trade cooled:** crypto fell to 214.4M contracts on Sept. 13, against a daily average of 259.9M over the past month.",
    // Other venues' categories are not Kalshi's to judge.
    "- **Novig's weekend jumped:** Novig traded 69.1M contracts, with economics at 0.2M contracts."
  ];

  for (const text of texts) {
    assert.deepEqual(kalshiCategoryFaults(text, volume), [], text);
  }
  assert.deepEqual(kalshiCategoryFaults("- **Kalshi slipped:** Economics reached 4.8M contracts.", null), []);
});

test("the card is bullets only", () => {
  const bullets = [
    "- **Kalshi set a new daily record:** It traded 2.46B contracts on Sept. 13, beating Sept. 12's 2.43B; parlays supplied 1.49B, or 61% of the day.",
    "- **OG/Crypto.com pushed into nine figures:** It reached 99.0M contracts on Sept. 13."
  ].join("\n\n");
  // The closing paragraph from a test draft on 2026-09-15, verbatim.
  const withParagraph = `${bullets}\n\nKalshi's record was broad-based rather than a narrow category spike: parlays alone accounted for more than half of all contracts.`;

  assert.deepEqual(formatFaults(bullets), []);
  assert.equal(formatFaults(withParagraph).length, 1);
});

test("counts reader-facing venue aliases as non-Kalshi bullets", () => {
  const text = [
    "- **Underdog's parlay share climbed:** Volume fell while its parlay mix rose.",
    "- **Crypto.com cooled:** Its volume fell below the weekly average.",
    "- **OG slowed:** Its parlay volume fell for a third day.",
    "- **Kalshi's game props rose:** Game-prop volume beat its recent norm."
  ].join("\n\n");

  assert.equal(otherVenueBulletCount(text), 3);
});

test("rejects routine venue rank as the bold finding", () => {
  const text = "- **Polymarket US led the challengers:** Volume ran 25% above its weekly average.";
  const faults = wordingFaults(text, "select volume from competitor_daily");

  assert.ok(faults.some((fault) => fault.includes("routine rank")));
});

test("allows a bold opener that states the notable venue change", () => {
  const text = "- **Polymarket US ran ahead of its recent pace:** Volume was 25% above its weekly average.";

  assert.deepEqual(wordingFaults(text, "select volume from competitor_daily"), []);
});

test("rejects report-count averages lifted from query columns", () => {
  const faults = (text) => wordingFaults(text, "select volume from competitor_daily");

  assert.equal(faults("- **DKeX surged:** 108.0M contracts, 645.8% above its prior 30-report average.").length, 1);
  assert.equal(faults("- **DKeX surged:** 108.0M contracts, up 160.78% from its recent seven-report average.").length, 1);
  assert.equal(faults("- **DKeX surged:** 139.8M contracts, 674.46% above its previous 30 reported-day average.").length, 1);
  assert.equal(faults("- **DKeX broke far above its normal range:** 139.8M contracts, versus an 18.1M average over its past 30 reports.").length, 1);
  assert.deepEqual(faults("- **DKeX surged:** 108.0M contracts, 160.8% above its average over the past week."), []);
});

test("rejects unrounded figures and a window figure that does not say it is an average", () => {
  // The Kalshi bullet published for Sept. 13, 2026, verbatim.
  const text = "- **Kalshi set a daily record:** It traded 2,460,211,509 contracts on Sept. 13, 40.85% above its seven-day average and above the previous high of 2,426,117,598; Sports supplied 2,188,554,985 contracts, versus 1,229,285,435 over the prior 30 reported days.";
  const faults = wordingFaults(text, "select avg(contracts) from category_daily");

  assert.equal(faults.length, 3);
  assert.ok(faults[0].includes("not 2,460,211,509"));
  assert.ok(faults[1].includes("does not say what that figure is"));
  assert.ok(faults[2].includes("counting reports"));
});

test("rejects a comparison figure with no name at all", () => {
  const sql = "select avg(fees) from competitor_daily";

  // From a test draft on 2026-09-15.
  assert.equal(wordingFaults("- **DKeX's surge widened:** 139.8M contracts on Sept. 13, with $2.64M in fees versus $383,700.", sql).length, 1);
  assert.deepEqual(wordingFaults("- **DKeX's surge widened:** $2.64M in fees, compared with 2.43B on Sept. 12 and a 4.3% share versus 3.6%.", sql), []);
});

test("allows rounded figures and a comparison that names its average", () => {
  const text = [
    "- **Kalshi set a daily record:** It traded 2.46B contracts on Sept. 13, above Sept. 12's previous high of 2.43B; sports supplied 2.19B, against a daily average of 1.23B over the past month.",
    "- **OG/Crypto.com jumped:** 99.0M contracts, up from its 36.7M seven-day average, with $1.6M in fees; ForecastEx traded 371,143 contracts."
  ].join("\n\n");

  assert.deepEqual(wordingFaults(text, "select avg(contracts) from category_daily"), []);
});

test("preserves the existing measured-volume, notional, and settlement checks", () => {
  assert.equal(wordingFaults("Measured venue volume used notional dollars.", "select volume").length, 2);
  assert.equal(wordingFaults("Settled contracts rose.", "select volume").length, 1);
  assert.equal(wordingFaults("Settled contracts rose.", "select resolved from outcomes").length, 0);
});
