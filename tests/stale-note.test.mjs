import assert from "node:assert/strict";
import test from "node:test";

import {staleInfo} from "../src/components/stale-note.js";

const NOW = new Date("2026-10-08T03:00:00Z");

test("old data gets a dated note that names the subject and the reason", () => {
  const info = staleInfo(new Date("2026-09-19T00:00:00Z"), {
    now: NOW, subject: "This Novig data", reason: "updates stopped when Novig changed its data feed"
  });
  assert.equal(info.stale, true);
  assert.equal(info.text, "This Novig data ends on Sep 19, 2026; updates stopped when Novig changed its data feed.");
});

test("fresh data gets no note, so it disappears once the feed is current again", () => {
  assert.equal(staleInfo(new Date("2026-10-06T00:00:00Z"), {now: NOW}).stale, false);
  assert.equal(staleInfo(new Date("2026-10-01T03:00:00Z"), {now: NOW}).stale, false); // exactly 7 days
  assert.equal(staleInfo(new Date("2026-09-30T00:00:00Z"), {now: NOW}).stale, true);
});

test("missing or unreadable dates get no note (the pages explain absent data themselves)", () => {
  for (const v of [null, undefined, "", "not a date"]) assert.equal(staleInfo(v, {now: NOW}).stale, false);
});

test("a string date and a custom verb work", () => {
  const info = staleInfo("2026-09-20T05:00:00Z", {now: NOW, maxAgeDays: 3, subject: "Novig's points", verb: "were last updated on"});
  assert.equal(info.text, "Novig's points were last updated on Sep 20, 2026.");
});
