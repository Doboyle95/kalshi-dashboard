const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const GENERATION = /^[0-9a-f]{20}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15000;
// Timeouts are counted by a repeating tick, not by one setTimeout. Each tick adds the time since
// the previous tick, but at most TIMEOUT_TICK_CAP_MS, so a main-thread long task costs a request
// at most one cap of its budget. One setTimeout counted the whole stall: on /categories a
// 15-19 s parse-and-compute task after daily_top_categories_fees.csv arrived (measured
// 2026-09-30) expired the 15 s timer of a fetch whose bytes had already arrived, and the page
// logged "The user aborted a request" after an HTTP 200 in 3 of 6 loads. With no stalls this
// is wall-clock time to within a tick, so a dead endpoint still fails in bounded time. A
// throttled background tab ticks less often, which can only make a timeout later.
const TIMEOUT_TICK_MS = 1000;
const TIMEOUT_TICK_CAP_MS = 2000;
// Browsers may queue a burst of same-origin requests behind their own connection
// limit. Keep the queue here so a data file's abort clock starts only when that file
// actually receives a transfer slot. Manifest requests deliberately bypass this
// semaphore: they are tiny and every data load needs one before it can be scheduled.
const MAX_CONCURRENT_DATA_FETCHES = 4;
let activeDataFetches = 0;
const dataFetchQueue = [];
// Floor throughput assumed for a DATA file, used to scale its timeout by size.
// 15s flat was fine for the manifest and for small CSVs, but daily_top_categories_fees.csv
// is 10.4MB -- clearing that in 15s demands a sustained ~5.5 Mbit/s, so every slower
// visitor got "signal is aborted without reason" and a blank chart. Measured on the
// Categories route 2026-08-16: 20 console errors, all aborts on the largest files, with
// every HTTP response a 200. At 250 KB/s the 16MB MAX_FILE_BYTES ceiling caps this at 64s,
// so a genuinely dead endpoint still fails in bounded time -- and the manifest fetch below
// deliberately keeps the short timeout so that failure stays fast.
const MIN_DATA_BYTES_PER_SEC = 250 * 1024;

function dataTimeoutMs(sizeBytes, baseTimeoutMs) {
  const needed = Math.ceil((sizeBytes / MIN_DATA_BYTES_PER_SEC) * 1000);
  return Math.max(baseTimeoutMs, needed);
}
const manifestPromises = new Map();
const ISO_DATE = /^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/;

// Equivalent to d3-dsv's autoType. Keeping this local matters because
// Framework tree-shakes the page-level d3 bundle and cannot see d3.autoType
// when d3 is passed through this adapter.
function autoTypeRow(object) {
  for (const key in object) {
    let value = object[key].trim();
    let number;
    if (!value) value = null;
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value === "NaN") value = NaN;
    else if (!Number.isNaN(number = +value)) value = number;
    else if (ISO_DATE.test(value)) value = new Date(value);
    else continue;
    object[key] = value;
  }
  return object;
}

// Typed CSV parse that yields exactly what d3.csvParse(text, autoTypeRow) yields -- the same
// rows, keys in the same order, and Object.is-equal values (Dates by getTime) -- checked
// field by field on every published CSV (2026-10-08). It is faster because each field is typed
// once while its row object is built, instead of d3 building the row with string values and
// autoTypeRow then walking it with for...in and rewriting every field; that walk, on rows too
// wide for V8's fast objects (the 1,979-column category files), cost more than the parse.
// Text with no double quote and no CR is cut at "\n" and "," directly, which gives exactly
// d3-dsv's fields in that case; anything else goes through csvRows, a port of d3-dsv 3.0.1's
// parseRows.
const NEWLINE = 10;
const RETURN = 13;
const QUOTE = 34;
const COMMA = 44;
// Above this many columns V8 keeps a row object in dictionary mode whichever way it is built,
// and filling an empty object key by key is faster than d3-dsv's compiled object literal.
const WIDE_ROW_COLUMNS = 1020;

// autoTypeRow's rule for one field. ToNumber skips the same surrounding whitespace that
// trim() removes, so +raw equals +raw.trim(); a blank field is the only one that reads as 0
// and must become null. A field starting with a letter other than t, f, N or I can be
// neither a number, a boolean, NaN nor an ISO date, so it is returned as is. Each distinct
// date string is parsed once per file; every field still gets its own Date.
function autoTyper() {
  const dateTimes = new Map();
  return raw => {
    const number = +raw;
    if (number === number) return number === 0 && !raw.trim() ? null : number;
    const c = raw.charCodeAt(0);
    if (c >= 97 ? c <= 122 && c !== 102 && c !== 116 : c >= 65 && c <= 90 && c !== 73 && c !== 78) return raw;
    const time = dateTimes.get(raw);
    if (time !== undefined) return new Date(time);
    const value = raw.trim();
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "NaN") return NaN;
    if (ISO_DATE.test(value)) {
      const date = new Date(value);
      dateTimes.set(raw, date.getTime());
      return date;
    }
    return raw;
  };
}

// Builds row objects with the keys d3-dsv's compiled object literal gives (same order, a
// repeated name keeps its first position and its last value), typing each field as it is
// placed. A "__proto__" column is skipped: in d3's literal it only tried to set the row's
// prototype to a string, which does nothing, so it never became a key. The site's CSP allows
// new Function ('unsafe-eval'); d3.csvParse already depends on it.
function rowKeys(columns) {
  const names = [];
  const indexes = [];
  columns.forEach((name, i) => {
    if (name !== "__proto__") names.push(name), indexes.push(i);
  });
  return {names, indexes};
}

// fields array -> row
function typedRowConverter(columns) {
  const {names, indexes} = rowKeys(columns);
  if (columns.length > WIDE_ROW_COLUMNS) {
    const n = names.length;
    return (d, t) => {
      const row = {};
      for (let k = 0; k < n; ++k) row[names[k]] = t(d[indexes[k]] || "");
      return row;
    };
  }
  return new Function("d", "t", "return {" + names.map((name, k) =>
    JSON.stringify(name) + ": t(d[" + indexes[k] + "] || \"\")"
  ).join(",") + "}");
}

// line with no double quote or CR -> row, for files up to WIDE_ROW_COLUMNS wide. Slices the
// same fields line.split(",") gives (a missing field is "", extra fields are ignored) straight
// from the line, without building an array per row: about half the cost of split on the
// long narrow files.
function typedLineConverter(columns) {
  const {names, indexes} = rowKeys(columns);
  let body = "const n = line.length;\nlet i = 0, j;\n";
  columns.forEach((_, k) => {
    body += `let f${k} = "";\nif (i <= n) { j = line.indexOf(",", i); if (j < 0) j = n; f${k} = line.slice(i, j); i = j + 1; }\n`;
  });
  body += "return {" + names.map((name, k) => JSON.stringify(name) + ": t(f" + indexes[k] + ")").join(",") + "};";
  return new Function("line", "t", body);
}

function csvRows(text, convert) {
  const EOL = {};
  const EOF = {};
  const rows = [];
  let N = text.length;
  let I = 0;
  let n = 0;
  let t;
  let eof = N <= 0;
  let eol = false;
  if (text.charCodeAt(N - 1) === NEWLINE) --N;
  if (text.charCodeAt(N - 1) === RETURN) --N;
  function token() {
    if (eof) return EOF;
    if (eol) return (eol = false), EOL;
    let i;
    let c;
    const j = I;
    if (text.charCodeAt(j) === QUOTE) {
      while ((I++ < N && text.charCodeAt(I) !== QUOTE) || text.charCodeAt(++I) === QUOTE);
      if ((i = I) >= N) eof = true;
      else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
      else if (c === RETURN) {
        eol = true;
        if (text.charCodeAt(I) === NEWLINE) ++I;
      }
      return text.slice(j + 1, i - 1).replace(/""/g, "\"");
    }
    while (I < N) {
      if ((c = text.charCodeAt((i = I++))) === NEWLINE) eol = true;
      else if (c === RETURN) {
        eol = true;
        if (text.charCodeAt(I) === NEWLINE) ++I;
      } else if (c !== COMMA) continue;
      return text.slice(j, i);
    }
    return (eof = true), text.slice(j, N);
  }
  while ((t = token()) !== EOF) {
    let row = [];
    while (t !== EOL && t !== EOF) row.push(t), (t = token());
    if ((row = convert(row, n++)) == null) continue;
    rows.push(row);
  }
  return rows;
}

export function parseTypedCsv(text) {
  let columns = [];
  let convert = null;
  const autoTypeValue = autoTyper();
  const typedRow = fields => {
    if (convert) return convert(fields, autoTypeValue);
    columns = fields;
    convert = typedRowConverter(fields);
    return null;
  };
  let rows;
  if (text.indexOf("\"") < 0 && text.indexOf("\r") < 0) {
    rows = [];
    if (text.length) {
      let end = text.length;
      if (text.charCodeAt(end - 1) === NEWLINE) --end;
      let stop = text.indexOf("\n");
      if (stop < 0 || stop > end) stop = end;
      columns = text.slice(0, stop).split(",");
      const convertFields = typedRowConverter(columns);
      const convertLine = columns.length > WIDE_ROW_COLUMNS ? null : typedLineConverter(columns);
      for (let start = stop + 1; start <= end;) {
        stop = text.indexOf("\n", start);
        if (stop < 0 || stop > end) stop = end;
        const line = text.slice(start, stop);
        rows.push(convertLine ? convertLine(line, autoTypeValue) : convertFields(line.split(","), autoTypeValue));
        start = stop + 1;
      }
    }
  } else {
    rows = csvRows(text, typedRow);
  }
  rows.columns = columns;
  return rows;
}

function browserEndpoint() {
  const raw = globalThis.window?.__CHAT_API__;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("dashboard data endpoint is unavailable");
  }
  const url = new URL(raw);
  const localHttp = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password) {
    throw new Error("dashboard data endpoint is unsafe");
  }
  return url.origin;
}

// Aborts `controller` once `timeoutMs` has been counted (see TIMEOUT_TICK_MS) and returns the
// function that stops the clock. `clock` overrides the tick and cap; the tests shorten them.
function startTimeoutClock(controller, timeoutMs, clock = {}) {
  const tickMs = clock.tickMs ?? TIMEOUT_TICK_MS;
  const capMs = clock.capMs ?? TIMEOUT_TICK_CAP_MS;
  const now = () => (globalThis.performance ? performance.now() : Date.now());
  let counted = 0;
  let last = now();
  const timer = setInterval(() => {
    const at = now();
    counted += Math.min(at - last, capMs);
    last = at;
    if (counted >= timeoutMs) {
      clearInterval(timer);
      const message = `dashboard data request timed out (${timeoutMs} ms)`;
      controller.abort(typeof DOMException === "function" ? new DOMException(message, "TimeoutError") : new Error(message));
    }
  }, tickMs);
  return () => clearInterval(timer);
}

async function fetchBounded(fetchImpl, url, options, timeoutMs, clock) {
  const controller = new AbortController();
  const stopClock = startTimeoutClock(controller, timeoutMs, clock);
  try {
    return await fetchImpl(url, {...options, signal: controller.signal});
  } finally {
    stopClock();
  }
}

function acquireDataFetchSlot() {
  if (activeDataFetches < MAX_CONCURRENT_DATA_FETCHES) {
    activeDataFetches += 1;
    return Promise.resolve();
  }
  return new Promise(resolve => dataFetchQueue.push(resolve));
}

function releaseDataFetchSlot() {
  const next = dataFetchQueue.shift();
  if (next) next();
  else activeDataFetches -= 1;
}

async function withDataFetchSlot(task) {
  await acquireDataFetchSlot();
  try {
    return await task();
  } finally {
    releaseDataFetchSlot();
  }
}

// Hold the slot, signal and timeout through body consumption. Releasing at response
// headers would let the next queued request start while the prior CSV still occupies
// the connection, recreating the same browser-side queue one layer lower.
async function fetchDataBytesBounded(fetchImpl, url, options, timeoutMs, clock) {
  const controller = new AbortController();
  const stopClock = startTimeoutClock(controller, timeoutMs, clock);
  try {
    const response = await fetchImpl(url, {...options, signal: controller.signal});
    return {
      response,
      bytes: response.ok ? await response.arrayBuffer() : null
    };
  } finally {
    stopClock();
  }
}

function validateManifest(value) {
  if (!value || value.schema_version !== 1 || !GENERATION.test(value.generation ?? "")) {
    throw new Error("dashboard data manifest identity is invalid");
  }
  if (!value.files || typeof value.files !== "object" || Array.isArray(value.files)) {
    throw new Error("dashboard data manifest file map is invalid");
  }
  const names = Object.keys(value.files);
  if (value.file_count !== names.length || names.some(name => !SAFE_FILENAME.test(name))) {
    throw new Error("dashboard data manifest file set is invalid");
  }
  return value;
}

function manifestFor(endpoint, fetchImpl, timeoutMs, clock) {
  const cacheKey = `${endpoint}|${timeoutMs}`;
  if (!manifestPromises.has(cacheKey)) {
    const promise = (async () => {
      const response = await fetchBounded(
        fetchImpl,
        `${endpoint}/dashboard-data/current.json`,
        {cache: "no-store", credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer"},
        timeoutMs,
        clock
      );
      if (!response.ok) throw new Error(`dashboard data manifest returned ${response.status}`);
      return validateManifest(await response.json());
    })();
    manifestPromises.set(cacheKey, promise);
    promise.catch(() => manifestPromises.delete(cacheKey));
  }
  return manifestPromises.get(cacheKey);
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error("browser SHA-256 is unavailable");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifiedRemoteText(filename, options = {}) {
  if (!SAFE_FILENAME.test(filename)) throw new Error("unsafe dashboard data filename");
  const endpoint = options.endpoint ?? browserEndpoint();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const clock = {tickMs: options.timeoutTickMs, capMs: options.timeoutTickCapMs};
  if (typeof fetchImpl !== "function") throw new Error("browser fetch is unavailable");

  const manifest = await manifestFor(endpoint, fetchImpl, timeoutMs, clock);
  const record = manifest.files[filename];
  if (
    !record ||
    !Number.isInteger(record.size_bytes) ||
    record.size_bytes < 0 ||
    record.size_bytes > MAX_FILE_BYTES ||
    !SHA256.test(record.sha256 ?? "")
  ) {
    throw new Error(`dashboard data manifest has no valid record for ${filename}`);
  }

  const url = `${endpoint}/dashboard-data/generations/${manifest.generation}/${encodeURIComponent(filename)}`;
  const {response, bytes} = await withDataFetchSlot(() => fetchDataBytesBounded(
    fetchImpl,
    url,
    {cache: "default", credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer"},
    dataTimeoutMs(record.size_bytes, timeoutMs),
    clock
  ));
  if (!response.ok) throw new Error(`dashboard data file returned ${response.status}`);
  if (bytes.byteLength !== record.size_bytes) throw new Error(`dashboard data size mismatch for ${filename}`);
  if ((await sha256Hex(bytes)) !== record.sha256) throw new Error(`dashboard data hash mismatch for ${filename}`);
  const text = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
  return {text, generation: manifest.generation, publishedAt: manifest.published_at ?? null};
}

async function withFallback(filename, fallback, decode, options = {}) {
  if ((fallback !== undefined && typeof fallback !== "function") || typeof decode !== "function") {
    throw new TypeError("remote data loaders require a decode function and an optional fallback function");
  }
  try {
    const remote = await verifiedRemoteText(filename, options);
    const decoded = decode(remote.text);
    return {
      value: decoded,
      source: "remote",
      generation: remote.generation,
      publishedAt: remote.publishedAt,
      error: null
    };
  } catch (error) {
    const detail = String(error?.message ?? error).slice(0, 240);
    if (fallback === undefined) {
      throw new Error(`Remote dashboard data unavailable for ${filename}: ${detail}`);
    }
    console.warn(`Remote dashboard data fallback for ${filename}: ${detail}`);
    return {
      value: await fallback(),
      source: "fallback",
      generation: null,
      publishedAt: null,
      error: detail
    };
  }
}

export function loadRemoteCsv(filename, {fallback, parse, ...options}) {
  return withFallback(filename, fallback, parse, options);
}

export function loadRemoteJson(filename, {fallback, ...options}) {
  return withFallback(filename, fallback, JSON.parse, options);
}

function createRemoteAttachment(fileAttachment, d3, options = {}) {
  if ((fileAttachment !== null && typeof fileAttachment !== "function") || !d3) {
    throw new TypeError("remote data attachment requires d3 and an optional Framework attachment");
  }
  const {documentImpl: providedDocument, ...loadOptions} = options;
  const documentImpl = providedDocument ?? globalThis.document;
  if (!documentImpl?.createElement) throw new Error("browser document is unavailable");
  const marker = documentImpl.createElement("span");
  marker.hidden = true;
  const results = new Map();

  function updateMarker() {
    const values = [...results.values()];
    const sources = values.map(value => value.source);
    marker.dataset.dashboardDataSource = !values.length
      ? "pending"
      : sources.includes("error")
        ? "error"
      : sources.every(source => source === "remote")
        ? "remote"
        : sources.every(source => source === "fallback")
          ? "fallback"
          : "mixed";
    const generations = new Set(
      values.filter(value => value.source === "remote").map(value => value.generation)
    );
    marker.dataset.dashboardDataGeneration = generations.size === 1
      ? [...generations][0]
      : "";
    marker.dataset.dashboardDataFiles = [...results.keys()].sort().join(",");
  }

  async function track(filename, promise) {
    try {
      const result = await promise;
      results.set(filename, result);
      updateMarker();
      return result.value;
    } catch (error) {
      results.set(filename, {source: "error", generation: null});
      updateMarker();
      throw error;
    }
  }

  function RemoteFileAttachment(path, legacyAttachment = null) {
    if (typeof path !== "string" || !path.startsWith("data/")) {
      if (legacyAttachment) return legacyAttachment;
      if (fileAttachment) return fileAttachment(path);
      throw new TypeError("remote-only data attachment accepts only data/ paths");
    }
    const filename = path.slice("data/".length);
    if (!legacyAttachment && fileAttachment) {
      throw new TypeError(`remote attachment ${filename} requires an explicit FileAttachment fallback`);
    }
    const csvFallback = legacyAttachment
      ? csvOptions => () => legacyAttachment.csv(csvOptions)
      : () => undefined;
    const jsonFallback = legacyAttachment
      ? () => () => legacyAttachment.json()
      : () => undefined;
    return {
      csv(csvOptions = {}) {
        return track(
          filename,
          loadRemoteCsv(filename, {
            fallback: csvFallback(csvOptions),
            parse: text => csvOptions.typed ? parseTypedCsv(text) : d3.csvParse(text),
            ...loadOptions,
          })
        );
      },
      json() {
        return track(
          filename,
          loadRemoteJson(filename, {
            fallback: jsonFallback(),
            ...loadOptions,
          })
        );
      },
    };
  }

  updateMarker();
  RemoteFileAttachment.marker = marker;
  return RemoteFileAttachment;
}

// Compatibility adapter retained during the staged migration. Callers must
// provide an explicit build-visible FileAttachment fallback for every data file.
export function createRemoteFileAttachment(fileAttachment, d3, options = {}) {
  return createRemoteAttachment(fileAttachment, d3, options);
}

// Final data-plane adapter. It has no repository fallback: transport failure is
// visible as a page error and to the browser canary instead of serving stale data.
export function createRemoteDataAttachment(d3, options = {}) {
  return createRemoteAttachment(null, d3, options);
}
