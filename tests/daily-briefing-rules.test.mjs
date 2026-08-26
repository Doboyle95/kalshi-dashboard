import assert from "node:assert/strict";
import test from "node:test";

import {
  withoutExcludedPreviousInsights,
  wordingFaults
} from "../scripts/daily-briefing-rules.mjs";

test("rejects lottery-ticket parlay angles entirely", () => {
  const text = "- **Bettors shifted toward longer odds:** Lottery-parlay contracts rose while total stakes fell.";
  const faults = wordingFaults(text, "select sum(stakes) / sum(volume) from parlay_lottery_daily");

  assert.ok(faults.some((fault) => fault.includes("outside this briefing's scope")));
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
