import test from "node:test";
import assert from "node:assert/strict";
import {buildFeeRevenueMix, sixMonthFeeStart} from "../src/components/fee-revenue-mix.js";

const date = iso => new Date(iso + "T00:00:00Z");
const daily = (iso, fees_total, is_partial = false) => ({date: date(iso), fees_total, is_partial});
const sports = (iso, fees_sports_nonparlay, fees_nonsports) => ({date: date(iso), fees_sports_nonparlay, fees_nonsports});
const fees = (iso, KXBTC15M, KXGOLD15M = 0, KXEURUSD15M = 0) => ({date: date(iso), KXBTC15M, KXGOLD15M, KXEURUSD15M});

test("four mutually exclusive slices reconcile in cents over the six-month date window", () => {
  const result = buildFeeRevenueMix(
    [daily("2026-04-06", 999), daily("2026-04-07", 100.01), daily("2026-10-06", 200, true)],
    [sports("2026-04-06", 999, 0), sports("2026-04-07", 50.01, 30), sports("2026-10-06", 100, 70)],
    [fees("2026-04-06", 0), fees("2026-04-07", 10, 2, 3), fees("2026-10-06", 20, 3, 7)], []);
  assert.equal(result.start.toISOString().slice(0, 10), "2026-04-07");
  assert.equal(result.end.toISOString().slice(0, 10), "2026-10-06");
  assert.equal(result.dayCount, 2);
  assert.equal(result.isPartial, true);
  assert.equal(result.totalFees, 300.01);
  assert.deepEqual(result.slices.map(d => d.fees), [150.01, 50, 45, 55]);
  assert.equal(result.slices.reduce((sum, d) => sum + Math.round(d.fees * 100), 0), 30001);
  assert.ok(Math.abs(result.slices.reduce((sum, d) => sum + d.share, 0) - 1) < 1e-12);
});

test("the latest date is limited to common source coverage", () => {
  const result = buildFeeRevenueMix([daily("2026-10-05", 100), daily("2026-10-06", 200)],
    [sports("2026-10-05", 50, 30)], [fees("2026-10-05", 10)], []);
  assert.equal(result.end.toISOString().slice(0, 10), "2026-10-05");
  assert.equal(result.totalFees, 100);
});

test("new financial 15-minute series survive the site's normalized Finance category", () => {
  const result = buildFeeRevenueMix([daily("2026-10-05", 100)], [sports("2026-10-05", 50, 30)],
    [{date: date("2026-10-05"), KXNEWFX15M: 10}], [{report_ticker: "KXNEWFX15M", cat: "Finance"}]);
  assert.equal(result.slices.find(d => d.key === "fifteenMinute").fees, 10);
  assert.equal(result.slices.find(d => d.key === "otherNonSports").fees, 20);
});

test("six-month windows cross years and clamp short month ends", () => {
  assert.equal(sixMonthFeeStart(date("2027-02-05")).toISOString().slice(0, 10), "2026-08-06");
  assert.equal(sixMonthFeeStart(date("2026-08-30")).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(sixMonthFeeStart(date("2024-08-30")).toISOString().slice(0, 10), "2024-02-29");
});

test("missing source days fail visibly instead of being counted as zero", () => {
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-04", 100), daily("2026-10-05", 100)],
    [sports("2026-10-05", 50, 30)], [fees("2026-10-04", 10), fees("2026-10-05", 10)], []), /missing day/);
});

test("negative residuals and missing fee values cannot produce a misleading pie", () => {
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", 90, 20)], [fees("2026-10-05", 10)], []), /exceed/);
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", 50, 30)], [fees("2026-10-05", 31)], []), /exceed/);
  assert.throws(() => buildFeeRevenueMix([daily("2026-10-05", 100)],
    [sports("2026-10-05", null, 30)], [fees("2026-10-05", 10)], []), /Invalid/);
});
