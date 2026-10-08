import assert from "node:assert/strict";
import test from "node:test";
import {fileUpdatedDay} from "../src/components/freshness.js";

const manifest = at => ({files: {"f.csv": {last_write_time: at}}});
const dayOf = at => fileUpdatedDay(manifest(at), "f.csv")?.toISOString();

test("fileUpdatedDay is the New York date of the write", () => {
  // The manifest's own format, microseconds included.
  assert.equal(dayOf("2026-10-08T07:21:47.580355-04:00"), "2026-10-08T00:00:00.000Z");
  // Still the evening before in New York, in summer (EDT) and winter (EST).
  assert.equal(dayOf("2026-10-08T03:59:59.999999+00:00"), "2026-10-07T00:00:00.000Z");
  assert.equal(dayOf("2026-01-15T04:59:59+00:00"), "2026-01-14T00:00:00.000Z");
  assert.equal(dayOf("2026-01-15T05:00:00+00:00"), "2026-01-15T00:00:00.000Z");
});

test("fileUpdatedDay is null without a usable manifest entry", () => {
  assert.equal(fileUpdatedDay(null, "f.csv"), null);
  assert.equal(fileUpdatedDay({files: {}}, "f.csv"), null);
  assert.equal(fileUpdatedDay(manifest("not a time"), "f.csv"), null);
});
