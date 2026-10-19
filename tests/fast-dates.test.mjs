import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";

// fast-dates.js replaces Date.prototype.toLocaleDateString on every page, and its comment claims the
// replacement is exactly the native call. This file checks that claim. The patch runs in its own VM
// realm, so this test process keeps its native method: the native method is read before the patch
// loads, and every case is called both ways on the same Date, locales and options.
const SOURCE = readFileSync(new URL("../src/components/fast-dates.js", import.meta.url), "utf8");

const LOCALES = ["en-US", "en-GB", "ja-JP", undefined, "en_US", "", ["en-US"]];

// Built inside the realm, so "a plain object" means the same to the patch as it does to this file.
const OPTIONS = `[
  undefined, null, {}, {timeZone: "UTC"}, {era: "short"}, {era: "long", timeZone: "America/New_York"},
  {weekday: "long"}, {weekday: "short", timeZone: "UTC"},
  {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"},
  {month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York"},
  {month: "short", day: "numeric", timeZone: "UTC"},
  {day: "numeric", month: "short", timeZone: "UTC"},
  {year: "numeric", month: "long"},
  {month: "2-digit", day: "2-digit", year: "2-digit", timeZone: "UTC"},
  {weekday: "short", month: "short", day: "numeric", timeZone: "UTC"},
  {weekday: "long", year: "numeric", month: "long", day: "numeric", era: "short", timeZone: "Asia/Kolkata"},
  {month: "numeric", day: "numeric", timeZone: "Asia/Kolkata"},
  {month: undefined, day: "numeric", timeZone: "UTC"},
  {month: "short", timeZone: "Not/AZone"},
  {hour: "numeric", day: "numeric", timeZone: "UTC"},
  {month: "long", day: "numeric", hour12: false, timeZone: "UTC"},
  {dateStyle: "medium", timeZone: "UTC"},
  {month: "short", day: "numeric", calendar: "japanese", timeZone: "UTC"},
  {year: 2026, month: "short", timeZone: "UTC"},
  Object.create({month: "short", day: "numeric", timeZone: "UTC"}),
  Object.defineProperty({day: "numeric", timeZone: "UTC"}, "month", {value: "short"}),
  Object.defineProperty({day: "numeric", timeZone: "UTC"}, "month", {get() { return "long"; }, enumerable: true}),
  Object.assign(Object.create(null), {month: "short", day: "numeric", timeZone: "UTC"})
]`;

// Edges of the day and of the calendar, an invalid Date, and a seeded spread of years 1900-2100,
// so every run checks the same cases.
function instants(RealmDate) {
  const times = [0, 1, -1, 86399999, RealmDate.UTC(2026, 9, 19, 2), RealmDate.UTC(2026, 9, 19, 23, 59, 59, 999), 8.64e15, -8.64e15, NaN];
  let seed = 7;
  for (let i = 0; i < 40; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    times.push(Math.floor(-2208988800000 + (seed / 4294967296) * 6311433600000));
  }
  return times.map(time => new RealmDate(time));
}

// Loads source into a fresh realm. Returns that realm's native method, read before the load, and
// the method the load leaves in place.
function patchRealm(source) {
  const realm = vm.createContext({});
  const native = vm.runInContext("Date.prototype.toLocaleDateString", realm);
  vm.runInContext(source, realm);
  return {realm, native, patched: vm.runInContext("Date.prototype.toLocaleDateString", realm)};
}

// The answer, or the error's name and message, so a throw has to match a throw.
function answer(method, receiver, locales, options) {
  try {
    return {value: method.call(receiver, locales, options)};
  } catch (error) {
    return {error: `${error.name}: ${error.message}`};
  }
}

// Runs every (date, locales, options) case through both methods, and two receivers that are not
// Dates. Returns the cases whose answers differ.
function differences(patched, native, realm) {
  const RealmDate = vm.runInContext("Date", realm);
  const options = vm.runInContext(OPTIONS, realm);
  const found = [];
  instants(RealmDate).forEach((date, d) => LOCALES.forEach((locales, l) => options.forEach((option, o) => {
    const want = JSON.stringify(answer(native, date, locales, option));
    const got = JSON.stringify(answer(patched, date, locales, option));
    if (want !== got) found.push({label: `date ${d}, locales ${l}, options ${o}`, want, got});
  })));
  // A non-Date receiver must throw a TypeError from both methods. Only the error's name is compared:
  // fast-dates.js checks the receiver with its own getTime call, and V8 words that message differently.
  const kind = result => (result.error ?? "value").split(":")[0];
  for (const receiver of [{}, 5]) LOCALES.forEach((locales, l) => options.forEach((option, o) => {
    const want = answer(native, receiver, locales, option);
    const got = answer(patched, receiver, locales, option);
    if (kind(want) !== kind(got)) found.push({label: `receiver ${String(receiver)}, locales ${l}, options ${o}`, want, got});
  }));
  return found;
}

test("fast-dates.js gives the native toLocaleDateString answer for every case", () => {
  const {realm, native, patched} = patchRealm(SOURCE);
  assert.notEqual(patched, native, "the patch did not install");
  assert.deepEqual(differences(patched, native, realm).slice(0, 5), []);
});

test("the same comparison catches a formatter cache that ignores the time zone", () => {
  const mutant = SOURCE.replace("JSON.stringify(values)", "JSON.stringify(values.slice(0, 6))");
  assert.notEqual(mutant, SOURCE);
  const {realm, native, patched} = patchRealm(mutant);
  assert.notEqual(differences(patched, native, realm).length, 0);
});

test("the patched method formats the same instant in the time zone it is given", () => {
  const {realm, patched} = patchRealm(SOURCE);
  const RealmDate = vm.runInContext("Date", realm);
  const at = new RealmDate(RealmDate.UTC(2026, 9, 19, 2));
  assert.equal(patched.call(at, "en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}), "Oct 19, 2026");
  assert.equal(patched.call(at, "en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York"}), "Oct 18, 2026");
});
