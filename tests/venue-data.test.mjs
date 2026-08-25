import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlatformSeries,
  buildVenueScoreboard,
  completeProphetxRows,
  recentCalendarDates,
  valueLookup
} from "../src/components/venue-data.js";

const day = value => new Date(`${value}T00:00:00Z`);

test("platform series normalizes venue names and preserves missing economics", () => {
  const rows = buildPlatformSeries({
    kalshi: [{date: day("2026-08-10"), contracts_total: 100, fees_total: 7, is_partial: false}],
    competitor: [
      {date: day("2026-08-10"), platform: "Polymarket_US", contracts: 40, fees: 2, fees_exchange_revenue: 1},
      {date: day("2026-08-10"), platform: "Underdog", contracts: 25, fees: "", fees_exchange_revenue: ""}
    ]
  });

  assert.deepEqual(rows.map(row => row.venue), ["Kalshi", "Polymarket US", "Underdog Exchange"]);
  assert.equal(rows.at(-1).revenue, null);
});

test("partial reports do not enter the scoreboard", () => {
  const rows = [
    {date: day("2026-08-09"), venue: "Kalshi", contracts: 100, complete: true, partial: false},
    {date: day("2026-08-10"), venue: "Kalshi", contracts: 999, complete: false, partial: true}
  ];
  const [score] = buildVenueScoreboard(rows);
  assert.equal(+score.latest, +day("2026-08-09"));
  assert.equal(score.latestVolume, 100);
});

test("venue change compares two complete seven-report periods only", () => {
  const rows = Array.from({length: 14}, (_, index) => ({
    date: day(`2026-08-${String(index + 1).padStart(2, "0")}`),
    venue: "Kalshi",
    contracts: index < 7 ? 10 : 20,
    complete: true,
    partial: false
  }));
  const [complete] = buildVenueScoreboard(rows);
  assert.equal(complete.recentDays, 7);
  assert.equal(complete.previousDays, 7);
  assert.equal(complete.recentTotal, 140);
  assert.equal(complete.change, 1);

  const [thinHistory] = buildVenueScoreboard(rows.slice(1));
  assert.equal(thinHistory.recentDays, 7);
  assert.equal(thinHistory.previousDays, 6);
  assert.equal(thinHistory.change, null);
});

test("ProphetX falls back to excluding the newest date when completeness is absent", () => {
  const rows = [
    {date: day("2026-08-08"), contracts: 10},
    {date: day("2026-08-09"), contracts: 20},
    {date: day("2026-08-10"), contracts: 30}
  ];
  assert.deepEqual(completeProphetxRows(rows).map(row => +row.date), [+day("2026-08-08"), +day("2026-08-09")]);
});

test("recent date tape uses Kalshi calendar dates and leaves unavailable venue cells missing", () => {
  const rows = [
    {date: day("2026-08-09"), venue: "Kalshi", contracts: 100},
    {date: day("2026-08-10"), venue: "Kalshi", contracts: 120},
    {date: day("2026-08-09"), venue: "DKeX", contracts: 25}
  ];
  assert.deepEqual(recentCalendarDates(rows, 2).map(Number), [+day("2026-08-10"), +day("2026-08-09")]);
  const lookup = valueLookup(rows);
  assert.equal(lookup.get("DKeX").get(+day("2026-08-09")), 25);
  assert.equal(lookup.get("DKeX").get(+day("2026-08-10")), undefined);
});

test("a competitor's explicitly incomplete day is marked partial, blanks are not", () => {
  // competitor_daily.csv sets `complete` only for the venues that publish it: measured on
  // generation 2f9a29c4e22a76cee97a, 3,464 rows are blank, 298 are "1", and exactly one is
  // "0" — Polymarket US's current day. This branch used to hardcode complete:true, so that
  // partial day was counted in every homepage total and drew a cliff at the chart's edge.
  const rows = buildPlatformSeries({
    competitor: [
      {date: day("2026-08-22"), platform: "Polymarket_US", contracts: 30, complete: "1"},
      {date: day("2026-08-23"), platform: "Polymarket_US", contracts: 10, complete: "0"},
      {date: day("2026-08-23"), platform: "Underdog", contracts: 25, complete: ""}
    ]
  });

  assert.deepEqual(rows.map(row => row.partial), [false, true, false]);
  assert.deepEqual(rows.map(row => row.complete), [true, false, true]);

  // ...and the partial day must not become the venue's headline figure.
  const [poly] = buildVenueScoreboard(rows.filter(row => row.venue === "Polymarket US"));
  assert.equal(+poly.latest, +day("2026-08-22"));
  assert.equal(poly.latestVolume, 30);
});

test("an unexpected completeness value keeps the day rather than dropping it", () => {
  // Only explicit falsehood marks a day partial. A value the producer never documented must
  // not silently remove a venue's newest day from every total on the site.
  const rows = buildPlatformSeries({
    competitor: [{date: day("2026-08-23"), platform: "Novig", contracts: 5, complete: "2"}]
  });
  assert.equal(rows[0].partial, false);
  assert.equal(rows[0].complete, true);
});

test("a venue whose two windows span unequal calendar periods gets no change figure", () => {
  // Row-based slices mean "7 reported days" is not a week on a venue that skips days.
  // CME reports by hand-collected bulletin: measured 2026-08-25, its last 7 reported days
  // spanned 7 calendar days against a prior 7 spanning 12. Publishing a percentage across
  // that is a precise-looking artefact of the reporting calendar, not a change in trading.
  const daily = Array.from({length: 14}, (_, i) => ({
    date: day(`2026-08-${String(i + 1).padStart(2, "0")}`),
    venue: "Kalshi", contracts: 10, complete: true, partial: false
  }));
  assert.notEqual(buildVenueScoreboard(daily)[0].change, null);

  // Same 14 rows, but the older week is stretched across twelve calendar days.
  const stretched = [
    ...[1, 3, 5, 7, 9, 11, 12].map(d => ({
      date: day(`2026-08-${String(d).padStart(2, "0")}`),
      venue: "Kalshi", contracts: 10, complete: true, partial: false
    })),
    ...[13, 14, 15, 16, 17, 18, 19].map(d => ({
      date: day(`2026-08-${String(d).padStart(2, "0")}`),
      venue: "Kalshi", contracts: 20, complete: true, partial: false
    }))
  ];
  const [row] = buildVenueScoreboard(stretched);
  assert.equal(row.recentDays, 7);        // seven reported days...
  assert.equal(row.previousDays, 7);      // ...on both sides
  assert.equal(row.previousSpanDays, 12); // ...but twelve calendar days behind
  assert.equal(row.change, null);         // so no figure is published
});
