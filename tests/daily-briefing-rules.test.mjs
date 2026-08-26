import assert from "node:assert/strict";
import test from "node:test";

import {
  kalshiDepthEvidenceFaults,
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

test("rejects routine venue rank as the bold finding", () => {
  const text = "- **Polymarket US led the challengers:** Volume ran 25% above its weekly average.";
  const faults = wordingFaults(text, "select volume from competitor_daily");

  assert.ok(faults.some((fault) => fault.includes("routine rank")));
});

test("allows a bold opener that states the notable venue change", () => {
  const text = "- **Polymarket US ran ahead of its recent pace:** Volume was 25% above its weekly average.";

  assert.deepEqual(wordingFaults(text, "select volume from competitor_daily"), []);
});

test("preserves the existing measured-volume, notional, and settlement checks", () => {
  assert.equal(wordingFaults("Measured venue volume used notional dollars.", "select volume").length, 2);
  assert.equal(wordingFaults("Settled contracts rose.", "select volume").length, 1);
  assert.equal(wordingFaults("Settled contracts rose.", "select resolved from outcomes").length, 0);
});
