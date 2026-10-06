import test from "node:test";
import assert from "node:assert/strict";
import {splitFinanceCategory, splitCategoryRows} from "../src/components/non-sports-categories.js";
import {buildReportTickerToCat, TAKER_GENERAL_MAP} from "../src/components/taker-categories.js";
import {bucketOf, BUCKETS, BUCKET_COLORS} from "../src/components/venue-category-taxonomy.js";

test("shared classification separates macro releases and policy from asset prices, including market keys", () => {
  for (const ticker of ["KXCPI", "KXU3", "KXFEDDECISION", "KXPAYROLLS", "KXCPI-26OCT-T3.0"]) {
    assert.equal(splitFinanceCategory(ticker, "Finance"), "Economics");
  }
  for (const ticker of ["KXGOLD15M", "KXINXU", "KXAAAGASM", "KXEURUSD15M", "KX10YRRATE15M"]) {
    assert.equal(splitFinanceCategory(ticker, "Other Non-sports"), "Finance");
  }
  assert.equal(splitFinanceCategory("KXMVEUNKNOWN", "Parlay"), "Parlay");
  assert.equal(splitFinanceCategory("UNLISTED", "Financials"), "Finance");
  assert.equal(splitFinanceCategory("UNLISTED", "Economics"), "Economics");
});

test("metadata split preserves numbers and sports/parlay scope while updating detailed and wide categories", () => {
  const source = [{report_ticker:"KXCPI", cat:"Finance", wide_cat:"Finance", grp:"Non-sports", fees:1.25},
    {report_ticker:"KXU3", cat:"Other Sports", grp:"Sports", fees:2},
    {report_ticker:"KXMVEUNKNOWN", cat:"Parlay", grp:"Non-sports", fees:3}];
  const output = splitCategoryRows(source);
  assert.equal(output[0].cat, "Economics");
  assert.equal(output[0].wide_cat, "Economics");
  assert.deepEqual(output.map(d=>d.fees), source.map(d=>d.fees));
  assert.equal(output[1], source[1]);
  assert.equal(output[2], source[2]);
  assert.equal(source[0].cat, "Finance");
});

test("taker lookup and General views preserve the category split", () => {
  const mapping = buildReportTickerToCat([{report_ticker:"KXCPI",cat:"Finance"}, {report_ticker:"KXINXU",cat:"Finance"}]);
  assert.equal(mapping.get("KXCPI"), "Economics");
  assert.equal(mapping.get("KXINXU"), "Finance");
  assert.equal(TAKER_GENERAL_MAP.Economics, "Non-sports");
  assert.equal(TAKER_GENERAL_MAP.Finance, "Non-sports");
});

test("cross-venue products retain separate macro and financial buckets and preserve parlay mappings", () => {
  assert.equal(bucketOf("Kalshi", "Economics"), "Economics");
  for (const raw of ["Financials","Commodities","Companies"]) assert.equal(bucketOf("Kalshi",raw),"Finance");
  assert.equal(bucketOf("Underdog","Other"),"Sports · parlays");
  assert.equal(bucketOf("Nadex","Other"),"Other");
  assert.equal(bucketOf("Novig","Parlay"),"Sports · parlays");
  assert.ok(BUCKETS.includes("Economics") && BUCKETS.includes("Finance"));
  assert.notEqual(BUCKET_COLORS.Economics, BUCKET_COLORS.Finance);
});
