import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  MAX_INSIGHTS_QUESTION_CHARS,
  apiErrorMessage,
  assertInsightsQuestionLength
} from "../scripts/daily-briefing-request.mjs";

test("FastAPI validation details survive into the workflow error", () => {
  const body = {
    detail: [{
      loc: ["body", "question"],
      msg: "String should have at most 2000 characters",
      type: "string_too_long"
    }]
  };
  assert.equal(
    apiErrorMessage(body),
    "body.question: String should have at most 2000 characters"
  );
});

test("insights question guard matches the API contract", () => {
  assert.doesNotThrow(() => assertInsightsQuestionLength("x".repeat(MAX_INSIGHTS_QUESTION_CHARS)));
  assert.throws(
    () => assertInsightsQuestionLength("x".repeat(MAX_INSIGHTS_QUESTION_CHARS + 1)),
    /API contract allows 32,000/
  );
});

test("the actual daily briefing prompt fits the insights contract", async () => {
  const generator = await readFile(new URL("../scripts/generate-daily-briefing.mjs", import.meta.url), "utf8");
  const previous = JSON.parse(await readFile(new URL("../src/daily-briefing.json", import.meta.url), "utf8"));
  const match = generator.match(
    /const editorialQuestion = (\[[\s\S]*?\])\.filter\(Boolean\)\.join\(" "\);/
  );
  assert.ok(match, "editorialQuestion array must remain discoverable for the contract test");

  const prompt = vm.runInNewContext(`(${match[1]}).filter(Boolean).join(" ")`, {
    health: {aggregate_through: "2026-08-25", raw_trades_through: "2026-08-25"},
    attempt: {missing: []},
    normalizedAnchorRows: Array.from({length: 10}),
    requiredVenues: Array.from({length: 10}),
    previousInsights: String(previous.insights || "").trim()
  });

  assert.ok(prompt.length > 2_000, "fixture must reproduce the limit regression");
  assert.ok(
    prompt.length <= MAX_INSIGHTS_QUESTION_CHARS,
    `briefing prompt is ${prompt.length} characters; contract allows ${MAX_INSIGHTS_QUESTION_CHARS}`
  );
});
