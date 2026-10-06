import test from "node:test";
import assert from "node:assert/strict";
import {nonSportsFeesByCategory, crypto15MinuteFees, NONSPORTS_FEE_CATEGORIES} from "../src/components/fee-embeds.js";
const date = new Date("2026-01-01");

test("category bars reconcile in cents and keep sports mention fees out of non-sports", () => {
  const rows = [{date, BTC: 0.1, POLITICS: 0.2, SPORTSMENTION: 999, UNKNOWN: 12}];
  const metadata = [
    {report_ticker: "BTC", is_sports: "FALSE", cat: "Crypto"},
    {report_ticker: "POLITICS", is_sports: false, cat: "Politics"},
    {report_ticker: "SPORTSMENTION", is_sports: "TRUE", cat: "Mention"}
  ];
  const classify = ticker => metadata.find(d => d.report_ticker === ticker)?.cat;
  const [result] = nonSportsFeesByCategory(rows, [{date, fees_nonsports: 12.3}], metadata, classify);
  assert.equal(result.Crypto, 0.1);
  assert.equal(result.Politics, 0.2);
  assert.equal(result.Mention, 0);
  assert.equal(result.Other, 12);
  assert.equal(NONSPORTS_FEE_CATEGORIES.reduce((n, c) => n + Math.round(result[c] * 100), 0), 1230);
});

test("category dates without a reported broad total stay missing", () => {
  assert.deepEqual(nonSportsFeesByCategory([{date}], [], [], () => null), []);
});

test("category over-allocation fails visibly rather than inflating a daily bar", () => {
  assert.throws(() => nonSportsFeesByCategory([{date, BTC: 20}], [{date, fees_nonsports: 10}],
    [{report_ticker: "BTC", is_sports: false}], () => "Crypto"), /exceed/);
});

test("15-minute crypto includes ZEC, NEAR and Coin Race, excluding metals, FX and daily crypto", () => {
  const [result] = crypto15MinuteFees([{date, KXBTC15M: 1, KXZEC15M: 2, KXNEAR15M: 3,
    KXCRYPTOLEAD15M: 4, KXGOLD15M: 100, KXEURUSD15M: 200, KXBTCD: 300}], []).rows;
  assert.equal(result.fees, 10);
});

test("new 15M crypto series in source metadata are included automatically", () => {
  const result = crypto15MinuteFees([{date, KXNEWCOIN15M: 8, KXWTI15M: 999}],
    [{report_ticker: "KXNEWCOIN15M", cat: "Crypto"}, {report_ticker: "KXWTI15M", cat: "Finance"}]);
  assert.deepEqual(result.tickers, ["KXNEWCOIN15M"]);
  assert.equal(result.rows[0].fees, 8);
});

test("missing crypto fees are not presented as zero", () => {
  assert.throws(() => crypto15MinuteFees([{date, KXBTC15M: null}], []), /Missing/);
});
