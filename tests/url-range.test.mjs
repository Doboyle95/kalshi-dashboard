import assert from "node:assert/strict";
import test from "node:test";
import {dateBrushFromUrl, formatDay, rangeParams, readRangeParams, urlDateRange} from "../src/components/url-range.js";

const day = (s) => new Date(`${s}T00:00:00Z`);
const domain = [day("2025-01-01"), day("2026-09-19")];
const fallback = [day("2025-06-01"), day("2026-09-19")];
const pick = (search) => urlDateRange(fallback, domain, readRangeParams(search));

test("no date parameter hands back the page default itself", () => {
  assert.equal(pick(""), fallback);
  assert.equal(pick("?embed=daily-volume&theme=dark"), fallback);
});

test("from/to select an inclusive window", () => {
  assert.deepEqual(pick("?from=2026-06-01&to=2026-08-31").map(formatDay), ["2026-06-01", "2026-08-31"]);
});

test("from alone runs to the newest data; to alone keeps the page's start", () => {
  assert.deepEqual(pick("?from=2026-03-01").map(formatDay), ["2026-03-01", "2026-09-19"]);
  assert.deepEqual(pick("?to=2026-03-01").map(formatDay), ["2025-06-01", "2026-03-01"]);
});

test("days=N is the last N days of the chart's own data and wins over from/to", () => {
  assert.deepEqual(pick("?days=30&from=2025-02-01").map(formatDay), ["2026-08-21", "2026-09-19"]);
});

test("windows clamp to the chart's data; one that clamps to nothing falls back", () => {
  assert.deepEqual(pick("?from=2020-01-01&to=2030-01-01").map(formatDay), ["2025-01-01", "2026-09-19"]);
  assert.equal(pick("?from=2027-01-01"), fallback);
  assert.equal(pick("?from=2026-05-01&to=2026-04-01"), fallback);
});

test("malformed values are ignored", () => {
  for (const q of ["?from=2026-02-31", "?from=06/01/2026", "?days=0", "?days=-5", "?days=1.5", "?days=abc", "?to="]) {
    assert.equal(pick(q), fallback, q);
  }
});

test("rangeParams: a window left at the page default emits nothing", () => {
  assert.deepEqual(rangeParams({range: fallback, domain, defaultRange: fallback}), {});
});

test("rangeParams: a window running to the newest data keeps a rolling end", () => {
  assert.deepEqual(rangeParams({range: [day("2026-03-01"), day("2026-09-19")], domain, defaultRange: fallback}), {from: "2026-03-01"});
});

test("rangeParams: a window stopping earlier is fixed", () => {
  assert.deepEqual(
    rangeParams({range: [day("2026-03-01"), day("2026-05-31")], domain, defaultRange: fallback}),
    {from: "2026-03-01", to: "2026-05-31"}
  );
});

test("rangeParams: quick ranges stay relative", () => {
  assert.deepEqual(rangeParams({range: [day("2026-08-21"), day("2026-09-19")], domain, defaultRange: fallback, quickDays: 30}), {days: "30"});
  assert.deepEqual(rangeParams({range: domain, domain, defaultRange: fallback, quickDays: Infinity}), {from: "2025-01-01"});
});

test("round trip: the parameters reopen the same window", () => {
  const range = [day("2026-03-01"), day("2026-05-31")];
  const search = "?" + new URLSearchParams(rangeParams({range, domain, defaultRange: fallback}));
  assert.deepEqual(pick(search).map(formatDay), range.map(formatDay));
});

test("dateBrushFromUrl moves a page-local brush to the URL window and tags it", () => {
  const x = Object.assign((d) => +d, {domain: () => domain});
  const moves = [];
  const brushG = {call: (fn, arg) => moves.push([fn, arg])};
  const brush = {move: "move"};
  const attrs = {};
  const node = {value: fallback, setAttribute: (k, v) => { attrs[k] = v; }};
  const saved = globalThis.location;
  globalThis.location = {search: "?from=2026-06-01&to=2026-08-31"};
  try {
    assert.equal(dateBrushFromUrl(node, {x, brush, brushG}), node);
  } finally {
    globalThis.location = saved;
  }
  assert.deepEqual(node.value.map(formatDay), ["2026-06-01", "2026-08-31"]);
  assert.deepEqual(moves, [["move", [+day("2026-06-01"), +day("2026-08-31")]]]);
  assert.equal("data-date-brush" in attrs, true);
  assert.deepEqual(node.dateBrushParams(), {from: "2026-06-01", to: "2026-08-31"});
});

test("dateBrushFromUrl leaves a brush alone when the URL carries no window", () => {
  const x = Object.assign((d) => +d, {domain: () => domain});
  const moves = [];
  const node = {value: fallback, setAttribute: () => {}};
  dateBrushFromUrl(node, {x, brush: {move: "move"}, brushG: {call: (...a) => moves.push(a)}});
  assert.equal(node.value, fallback);
  assert.equal(moves.length, 0);
  assert.deepEqual(node.dateBrushParams(), {});
});
