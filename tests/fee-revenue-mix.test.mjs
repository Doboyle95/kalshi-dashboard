import test from "node:test";
import assert from "node:assert/strict";
import {buildFeeRevenueMix} from "../src/components/fee-revenue-mix.js";

const date = iso => new Date(iso + "T00:00:00Z");
const daily = (iso, fees_total, is_partial = false) => ({date: date(iso), fees_total, is_partial});
const sports = (iso, fees_sports_nonparlay, fees_nonsports) => ({date: date(iso), fees_sports_nonparlay, fees_nonsports});
const bands = (iso, fifteen) => ({date: date(iso), "15-minute markets": fifteen});
const all = [date("2000-01-01"), date("2100-01-01")];

test("four mutually exclusive slices reconcile in cents over the selected window", () => {
  const result = buildFeeRevenueMix(
    [daily("2026-04-06", 999), daily("2026-04-07", 100.01), daily("2026-10-06", 200, true)],
    [sports("2026-04-06", 999, 0), sports("2026-04-07", 50.01, 30), sports("2026-10-06", 100, 70)],
    [bands("2026-04-06", 0), bands("2026-04-07", 15), bands("2026-10-06", 30)],
    [date("2026-04-07"), date("2026-10-06")]);
  assert.equal(result.start.toISOString().slice(0, 10), "2026-04-07");
  assert.equal(result.end.toISOString().slice(0, 10), "2026-10-06");
  assert.equal(result.dayCount, 2);
  assert.equal(result.isPartial, true);
  assert.equal(result.totalFees, 300.01);
  assert.deepEqual(result.slices.map(d => d.fees), [150.01, 50, 45, 55]);
  assert.equal(result.slices.reduce((sum, d) => sum + Math.round(d.fees * 100), 0), 30001);
  assert.ok(Math.abs(result.slices.reduce((sum, d) => sum + d.share, 0) - 1) < 1e-12);
});

test("the window is cut to the dates every source covers", () => {
  const result = buildFeeRevenueMix([daily("2026-10-04", 999), daily("2026-10-05", 100), daily("2026-10-06", 200)],
    [sports("2026-10-05", 50, 30), sports("2026-10-06", 50, 30)], [bands("2026-10-04", 1), bands("2026-10-05", 10)], all);
  assert.equal(result.start.toISOString().slice(0, 10), "2026-10-05");
  assert.equal(result.end.toISOString().slice(0, 10), "2026-10-05");
  assert.equal(result.totalFees, 100);
});

test("a window with no covered day has no pie", () => {
  assert.equal(buildFeeRevenueMix([daily("2026-10-05", 100)], [sports("2026-10-05", 50, 30)], [bands("2026-10-05", 10)],
    [date("2025-01-01"), date("2025-12-31")]), null);
});

test("a source day missing inside the window fails visibly instead of being counted as zero", () => {
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-03", 100), daily("2026-10-04", 100), daily("2026-10-05", 100)],
    [sports("2026-10-03", 50, 30), sports("2026-10-05", 50, 30)],
    [bands("2026-10-03", 10), bands("2026-10-04", 10), bands("2026-10-05", 10)], all), /missing day/);
});

test("negative residuals and missing fee values cannot produce a misleading pie", () => {
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", 90, 20)], [bands("2026-10-05", 10)], all), /exceed/);
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", 50, 30)], [bands("2026-10-05", 31)], all), /exceed/);
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", null, 30)], [bands("2026-10-05", 10)], all), /Invalid/);
});
