import assert from "node:assert/strict";
import test from "node:test";

import {
  contractFigures,
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

test("a record Kalshi day must lead with the record and not spend its figure on a sliver", () => {
  // The Kalshi bullet published for Sept. 12, 2026, verbatim.
  const text = [
    "- **Kalshi cleared another two-billion-contract day:** It traded 2.43B contracts on Sept. 12, 40.4% above its seven-day average; Economics reached 4.8M contracts on Sept. 10, up 104.7%, with fees rising 183.0% to $63,763.",
    "- **DKeX's surge became material:** DraftKings' exchange handled 108.0M contracts on Sept. 12."
  ].join("\n\n");
  const faults = kalshiRecordDayFaults(text, SEPT_12_STANDING);

  assert.equal(faults.length, 2);
  assert.ok(faults[0].includes("biggest on record"));
  assert.ok(faults[1].includes("4,800,000 contracts"));
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

test("reads contract figures in the forms the briefing writes them", () => {
  assert.deepEqual(
    contractFigures("2.43B contracts, 4,784,044 contracts, 108.0M contracts, 2.1 billion contracts and 40.4% above"),
    [2_430_000_000, 4_784_044, 108_000_000, 2_100_000_000]
  );
});

test("counts reader-facing venue aliases as non-Kalshi bullets", () => {
  const text = [
    "- **Underdog's parlay share climbed:** Volume fell while its parlay mix rose.",
    "- **Crypto.com cooled:** Its volume fell below the weekly average.",
    "- **Kalshi's game props rose:** Game-prop volume beat its recent norm."
  ].join("\n\n");

  assert.equal(otherVenueBulletCount(text), 2);
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
  assert.deepEqual(faults("- **DKeX surged:** 108.0M contracts, 160.8% above its average over the past week."), []);
});

test("preserves the existing measured-volume, notional, and settlement checks", () => {
  assert.equal(wordingFaults("Measured venue volume used notional dollars.", "select volume").length, 2);
  assert.equal(wordingFaults("Settled contracts rose.", "select volume").length, 1);
  assert.equal(wordingFaults("Settled contracts rose.", "select resolved from outcomes").length, 0);
});
