import test from "node:test";
import assert from "node:assert/strict";
import {
  ESTABLISHED_VOLUME_EVENTS,
  positionedVolumeEvents,
  volumeEventMarks
} from "../src/components/volume-events.js";

test("events near the right edge remain visible", () => {
  const events = positionedVolumeEvents(
    [{date: new Date("2026-06-11"), label: "World Cup '26", tier: 0}],
    new Date("2025-01-01"),
    new Date("2026-08-26"),
    100
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].label, "World Cup '26");
  assert.equal(events[0].y, 100);
});

test("event rows stay within the selected window and use tier heights", () => {
  const events = positionedVolumeEvents(
    ESTABLISHED_VOLUME_EVENTS,
    new Date("2026-02-01"),
    new Date("2026-06-30"),
    200
  );

  assert.deepEqual(events.map(d => d.label), [
    "Super Bowl LX",
    "March Madness '26",
    "World Cup '26"
  ]);
  assert.deepEqual(events.map(d => d.y), [150, 96, 200]);
});

test("event marks expose their label and date in a hover tip", () => {
  const calls = [];
  const Plot = {
    ruleX: (data, options) => { calls.push(["ruleX", data, options]); return "rule"; },
    dot: (data, options) => { calls.push(["dot", data, options]); return "dot"; }
  };
  const events = positionedVolumeEvents(
    [{date: new Date("2026-08-01"), label: "Near edge", tier: 1}],
    new Date("2026-01-01"),
    new Date("2026-08-31"),
    10
  );

  assert.deepEqual(volumeEventMarks(Plot, events), ["rule", "dot"]);
  assert.equal(calls[1][2].tip, true);
  assert.match(calls[1][2].title(events[0]), /Near edge · Aug 1, 2026/);
});
