import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateHistoricalTakerCategoryRows,
  reconcileTakerCategoryRows
} from "../src/components/taker-categories.js";

test("reconciles a partial category day to the authoritative taker total", () => {
  const date = new Date("2026-08-20T00:00:00Z");
  const rows = [
    {date, category: "Soccer", value: 30},
    {date, category: "Baseball", value: 20}
  ];

  const reconciled = reconcileTakerCategoryRows(rows, [
    {date, notional_total: 100}
  ]);

  assert.deepEqual(reconciled.map(d => d.value), [60, 40]);
});

test("leaves rows unchanged when no daily total is available", () => {
  const date = new Date("2026-04-15T00:00:00Z");
  const rows = [{date, category: "Soccer", value: 12.5}];

  assert.deepEqual(
    reconcileTakerCategoryRows(rows, []).map(d => d.value),
    [12.5]
  );
});

test("estimates pre-cutoff taker categories from the historical contract mix", () => {
  const historicalDate = new Date("2025-01-01T00:00:00Z");
  const cutoffDate = new Date("2026-04-15T00:00:00Z");
  const rows = [
    {date: historicalDate, KXSOCCER: 30, KXBASEBALL: 70},
    {date: cutoffDate, KXSOCCER: 100, KXBASEBALL: 0}
  ];
  const categories = new Map([
    ["KXSOCCER", "Soccer"],
    ["KXBASEBALL", "Baseball"]
  ]);

  const estimated = estimateHistoricalTakerCategoryRows(rows, categories, [
    {date: historicalDate, notional_total: 200},
    {date: cutoffDate, notional_total: 500}
  ], cutoffDate);

  assert.deepEqual(estimated, [
    {date: historicalDate, category: "Soccer", value: 60, estimated: true},
    {date: historicalDate, category: "Baseball", value: 140, estimated: true}
  ]);
});
