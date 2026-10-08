import test from "node:test";
import assert from "node:assert/strict";
import {nonSportsFeeBander, nonSportsFeeBands, NONSPORTS_VIEWS, NONSPORTS_COLORS} from "../src/components/fee-embeds.js";
const date = new Date("2026-01-01");
const nonSports = (ticker, cat) => ({report_ticker: ticker, is_sports: "FALSE", cat});
const ALL = NONSPORTS_VIEWS.get("All non-sports");
const centsOf = (row, bands) => bands.reduce((sum, band) => sum + Math.round(row[band] * 100), 0);

test("every band of every view has a colour, distinct within its view", () => {
  for (const [view, bands] of NONSPORTS_VIEWS) {
    for (const band of bands) assert.ok(NONSPORTS_COLORS[band], `${view}: ${band} has no colour`);
    assert.equal(new Set(bands.map(b => NONSPORTS_COLORS[b])).size, bands.length, view);
  }
});

test("15-minute series form their own band; macro releases stay apart from asset prices", () => {
  const row = {date, KXCPI: 1, KXU3: 2, KXFEDDECISION: 3, KXGOLD15M: 4,
    KXINXU: 5, KXEURUSD15M: 6, KXAAAGASM: 7, KX10YRRATE15M: 8};
  const metadata = Object.keys(row).filter(t => t !== "date").map(t => nonSports(t, "Finance"));
  const [result] = nonSportsFeeBands([row], [{date, fees_nonsports: 38}], metadata, () => "Finance");
  assert.equal(result["15-minute markets"], 18);
  assert.equal(result["15-minute commodities"], 4);
  assert.equal(result["15-minute finance"], 14);
  assert.equal(result.Finance, 12);
  assert.equal(result.Economics, 6);
  assert.equal(result["Everything else"], 2);
  assert.equal(result.total, 38);
  assert.equal(centsOf(result, ALL), 3800);
});

test("the 15-minute band takes verified, test and newly listed 15M series, never sports or longer ones", () => {
  const row = {date, KXBTC15M: 1, KXZEC15M: 2, KXGOLD15M: 3, KXEURUSD15M: 4, KXNEWCOIN15M: 5,
    KXGBPUSD15MTEST: 6, KXBTCD: 7, KXBTC30M: 8, SPORTS15M: 999, KXMYSTERY15M: 0.25};
  const metadata = [nonSports("KXBTC15M", "Crypto"), nonSports("KXZEC15M", "Other"), nonSports("KXNEWCOIN15M", "Crypto"),
    nonSports("KXBTCD", "Crypto"), nonSports("KXBTC30M", "Crypto"), {report_ticker: "SPORTS15M", is_sports: "TRUE", cat: "Sports"}];
  const [result] = nonSportsFeeBands([row], [{date, fees_nonsports: 36.5}], metadata,
    ticker => /BTC|COIN/.test(ticker) ? "Crypto" : "Other");
  assert.equal(result["15-minute markets"], 21);
  assert.equal(result["15-minute crypto"], 8);
  assert.equal(result["15-minute commodities"], 3);
  assert.equal(result["15-minute finance"], 10);
  assert.equal(result["Other crypto"], 15);
  // A 15M id the metadata does not know is not assumed to be a 15-minute market.
  assert.equal(result["Everything else"], 0.5);
  assert.equal(centsOf(result, ALL), 3650);
  assert.equal(centsOf(result, NONSPORTS_VIEWS.get("15-minute markets only")), 2100);
});

test("everything else is weather, mention, entertainment and the residual; sports mentions stay out", () => {
  const rows = [{date, BTC: 0.1, POLITICS: 0.2, SPORTSMENTION: 999, WEATHER: 1.5, SHOW: 0.75, UNKNOWN: 12}];
  const metadata = [nonSports("BTC", "Crypto"), {report_ticker: "POLITICS", is_sports: false, cat: "Politics"},
    {report_ticker: "SPORTSMENTION", is_sports: "TRUE", cat: "Mention"}, nonSports("WEATHER", "Weather"),
    nonSports("SHOW", "Entertainment")];
  const classify = ticker => metadata.find(d => d.report_ticker === ticker)?.cat;
  const [result] = nonSportsFeeBands(rows, [{date, fees_nonsports: 14.55}], metadata, classify);
  assert.equal(result["Other crypto"], 0.1);
  assert.equal(result.Politics, 0.2);
  assert.equal(result.Weather, 1.5);
  assert.equal(result.Entertainment, 0.75);
  assert.equal(result.Mention, 0);
  assert.equal(result.Other, 12);
  assert.equal(result["Everything else"], 14.25);
  assert.equal(centsOf(result, ALL), 1455);
});

test("new Economics source labels count as Economics", () => {
  const [result] = nonSportsFeeBands([{date, NEWMACRO: 1, KXCPI: 999}], [{date, fees_nonsports: 1}],
    [{report_ticker: "NEWMACRO", cat: "Economics", is_sports: false}, {report_ticker: "KXCPI", is_sports: true}], () => "Other");
  assert.equal(result.Economics, 1);
  assert.equal(result.total, 1);
});

test("dates without a reported non-sports total stay missing; a row is worked out once", () => {
  assert.deepEqual(nonSportsFeeBands([{date}], [], [], () => null), []);
  const row = {date, KXBTC15M: 1};
  const band = nonSportsFeeBander([row], [{date, fees_nonsports: 2}], [], () => null);
  assert.equal(band(row), band(row));
  assert.equal(band(row)["Everything else"], 1);
});

test("over-allocation and missing fees fail visibly instead of drawing a wrong bar", () => {
  assert.throws(() => nonSportsFeeBands([{date, BTC: 20}], [{date, fees_nonsports: 10}],
    [nonSports("BTC", "Crypto")], () => "Crypto"), /exceed/);
  assert.throws(() => nonSportsFeeBands([{date, KXBTC15M: 2}], [{date, fees_nonsports: 1}], [], () => "Crypto"), /exceed/);
  assert.throws(() => nonSportsFeeBands([{date, KXBTC15M: null}], [{date, fees_nonsports: 1}], [], () => "Crypto"), /Missing/);
});
