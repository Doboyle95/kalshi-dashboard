import assert from "node:assert/strict";
import test from "node:test";

import {wordingFaults} from "../scripts/daily-briefing-rules.mjs";

test("rejects aggregate lottery-parlay data described as tickets getting cheaper", () => {
  const text = "- **Lottery-ticket parlays got cheaper:** Contract volume rose while total stakes fell.";
  const faults = wordingFaults(text, "select sum(stakes) / sum(volume) from parlay_lottery_daily");

  assert.ok(faults.some((fault) => fault.includes("do not show that tickets got cheaper")));
});

test("allows aggregate lottery-parlay data described as a shift toward longer odds", () => {
  const text = "- **Bettors shifted toward longer odds:** Lottery-parlay contracts rose while total stakes fell.";

  assert.deepEqual(wordingFaults(text, "select sum(stakes), sum(volume) from parlay_lottery_daily"), []);
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
