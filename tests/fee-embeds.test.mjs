import test from "node:test";
import assert from "node:assert/strict";
import {nonSportsFeesByCategory, cryptoCommodity15MinuteFees, NONSPORTS_FEE_CATEGORIES, filteredNonSportsFees, FILTERED_FEE_CATEGORIES} from "../src/components/fee-embeds.js";
const date = new Date("2026-01-01");

test("filtered chart retains Economics and fully excludes crypto, financials, commodities and sports", () => {
  const rows = Object.entries({Economics: 6, Crypto: 100, Financials: 200, Commodities: 300,
    Sports: 999, "Non-sport parlays": 999, Entertainment: 4, "Science and Technology": 5,
    Politics: 0.1, Elections: 0.2, Mentions: 2, "Climate and Weather": 3})
    .map(([kalshi_category, fees]) => ({date, kalshi_category, fees}));
  const [result] = filteredNonSportsFees(rows);
  assert.equal(result.Economics, 6);
  assert.equal(result.Entertainment, 4);
  assert.equal(result.Other, 5);
  assert.equal(result.Politics, 0.3);
  assert.equal(result.Mention, 2);
  assert.equal(result.Weather, 3);
  assert.equal(result.total, 20.3);
  assert.equal(FILTERED_FEE_CATEGORIES.reduce((sum, c) => sum + Math.round(result[c] * 100), 0), Math.round(result.total * 100));
});

test("filtered chart preserves zero-fee days and sorts by date", () => {
  const next = new Date("2026-01-02");
  const rows = filteredNonSportsFees([{date: next, kalshi_category: "Crypto", fees: 10},
    {date, kalshi_category: "Economics", fees: 1}]);
  assert.deepEqual(rows.map(d => [d.date, d.total]), [[date, 1], [next, 0]]);
});

test("filtered chart rejects missing source categories or fees", () => {
  assert.throws(() => filteredNonSportsFees([{date, kalshi_category: "Economics", fees: null}]), /Invalid/);
  assert.throws(() => filteredNonSportsFees([{date, kalshi_category: "", fees: 1}]), /Invalid/);
});

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

test("15-minute bars include crypto and seven commodities, excluding FX and daily crypto", () => {
  const [result] = cryptoCommodity15MinuteFees([{date, KXBTC15M: 1, KXZEC15M: 2, KXNEAR15M: 3,
    KXCRYPTOLEAD15M: 4, KXGOLD15M: 100, KXSILVER15M: 20, KXWTI15M: 6, KXCOPPER15M: 5,
    KXNATGAS15M: 7, KXPALLADIUM15M: 8, KXPLATINUM15M: 9, KXEURUSD15M: 200, KXBTCD: 300}], []).rows;
  assert.equal(result.cryptoFees, 10);
  assert.equal(result.commodityFees, 155);
  assert.equal(result.fees, 165);
});

test("new 15M crypto series in source metadata are included automatically", () => {
  const result = cryptoCommodity15MinuteFees([{date, KXNEWCOIN15M: 8, KXNEWMETAL15M: 9, KXEURUSD15M: 999}],
    [{report_ticker: "KXNEWCOIN15M", cat: "Crypto"}, {report_ticker: "KXNEWMETAL15M", cat: "Commodities"}]);
  assert.deepEqual(result.cryptoTickers, ["KXNEWCOIN15M"]);
  assert.deepEqual(result.commodityTickers, ["KXNEWMETAL15M"]);
  assert.equal(result.rows[0].fees, 17);
});

test("missing crypto fees are not presented as zero", () => {
  assert.throws(() => cryptoCommodity15MinuteFees([{date, KXBTC15M: null}], []), /Missing/);
});
