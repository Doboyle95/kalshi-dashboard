// -----------------------------------------------------------------------------
// URL hash state helpers
// -----------------------------------------------------------------------------
// Tiny zero-dependency store that syncs filter values to `location.hash`. Lets
// users deep-link or reload a filtered view without losing state.
//
// Format: `#key1=value1&key2=value2` (URLSearchParams under the hood).
//
// Typical use with Observable Inputs:
//
//     import {hashGet, hashInput} from "./components/hash-state.js";
//     const metric = view(hashInput("metric",
//       Inputs.select(["contracts","fees"], {value: hashGet("metric","contracts")})
//     ));
// -----------------------------------------------------------------------------

function params() {
  return new URLSearchParams(location.hash.replace(/^#/, ""));
}

function write(p) {
  const s = p.toString();
  const url = s ? "#" + s : location.pathname + location.search;
  history.replaceState(null, "", url);
}

/** Read a hash value (string) or fall back. */
export function hashGet(key, fallback) {
  const p = params();
  return p.has(key) ? p.get(key) : fallback;
}

/** Read a hash value as a number, or fall back. */
export function hashGetNum(key, fallback) {
  const v = hashGet(key, null);
  if (v == null || v === "") return fallback;
  const n = +v;
  return Number.isFinite(n) ? n : fallback;
}

/** Write (or clear) a single key in the hash. */
export function hashSet(key, val) {
  const p = params();
  if (val == null || val === "" || (typeof val === "number" && !Number.isFinite(val))) {
    p.delete(key);
  } else {
    p.set(key, String(val));
  }
  write(p);
}

/**
 * Decorate an Observable Inputs element so that changes to its `value`
 * propagate into the hash automatically. Returns the same element so it can
 * be passed directly to `view(...)`.
 *
 * For inputs whose value isn't a primitive (e.g. Inputs.search returns the
 * filtered array), prefer wrapping the inner <input> with a bespoke listener.
 */
export function hashInput(key, el) {
  const push = () => hashSet(key, el.value);
  el.addEventListener("input", push);
  // Some Observable inputs only dispatch "input" inside a form; guard on change too.
  el.addEventListener("change", push);
  return el;
}

/** Subscribe to hash changes (back/forward navigation). */
export function onHashChange(fn) {
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
}
