import assert from "node:assert/strict";
import {createHash, webcrypto} from "node:crypto";
import test from "node:test";

import {
  createRemoteDataAttachment,
  createRemoteFileAttachment,
  loadRemoteCsv,
  loadRemoteJson,
  parseTypedCsv
} from "../src/components/remote-data.js";

globalThis.crypto ??= webcrypto;


const encoded = value => new TextEncoder().encode(value);
const record = value => ({
  size_bytes: encoded(value).byteLength,
  sha256: createHash("sha256").update(value).digest("hex")
});

function transport(endpoint, files, {corrupt = null} = {}) {
  const generation = createHash("sha256").update(endpoint).digest("hex").slice(0, 20);
  const manifest = {
    schema_version: 1,
    generation,
    published_at: "2026-08-09T19:00:00+00:00",
    file_count: Object.keys(files).length,
    files: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, record(value)]))
  };
  const requests = [];
  const fetchImpl = async url => {
    requests.push(url);
    if (url.endsWith("/dashboard-data/current.json")) {
      return new Response(JSON.stringify(manifest), {status: 200, headers: {"content-type": "application/json"}});
    }
    const name = decodeURIComponent(url.split("/").at(-1));
    if (!(name in files)) return new Response("missing", {status: 404});
    return new Response(corrupt === name ? `${files[name]}x` : files[name], {status: 200});
  };
  return {fetchImpl, generation, requests};
}

test("loads and verifies two files from one immutable generation", async () => {
  const endpoint = "https://canary-one.example";
  const files = {
    "tiny.csv": "date,value\n2026-08-09,7\n",
    "freshness_manifest.json": "{\"files\":{}}\n"
  };
  const mock = transport(endpoint, files);
  const csv = await loadRemoteCsv("tiny.csv", {
    endpoint,
    fetchImpl: mock.fetchImpl,
    parse: text => text.trim().split("\n"),
    fallback: async () => ["fallback"]
  });
  const json = await loadRemoteJson("freshness_manifest.json", {
    endpoint,
    fetchImpl: mock.fetchImpl,
    fallback: async () => ({fallback: true})
  });
  assert.equal(csv.source, "remote");
  assert.equal(json.source, "remote");
  assert.equal(csv.generation, mock.generation);
  assert.equal(json.generation, mock.generation);
  assert.deepEqual(json.value, {files: {}});
  assert.equal(mock.requests.filter(url => url.endsWith("current.json")).length, 1);
});

test("queues data transfers before starting each file timeout", async () => {
  // 5x the original 30ms/45ms pair. A tight margin here is what let real VM scheduling
  // jitter -- not a queue bug -- abort file-4 and fail two consecutive production
  // deploys on 2026-08-25. This test exists to prove the queue orders transfers
  // correctly, not to double as a load-testing tool, so give it slack instead.
  const MOCK_FETCH_MS = 150;
  const TEST_TIMEOUT_MS = 600;
  const endpoint = "https://bounded-data-queue.example";
  const files = Object.fromEntries(
    Array.from({length: 5}, (_, index) => [`file-${index}.csv`, `value\n${index}\n`])
  );
  const mock = transport(endpoint, files);
  let active = 0;
  let maxActive = 0;
  const startedAt = new Map();
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/dashboard-data/current.json")) return mock.fetchImpl(url, options);
    const name = decodeURIComponent(url.split("/").at(-1));
    active += 1;
    maxActive = Math.max(maxActive, active);
    startedAt.set(name, performance.now());
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, MOCK_FETCH_MS);
        options.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(options.signal.reason ?? new Error("aborted"));
        }, {once: true});
      });
      return new Response(files[name], {status: 200});
    } finally {
      active -= 1;
    }
  };

  const began = performance.now();
  const results = await Promise.all(Object.keys(files).map(filename => loadRemoteCsv(filename, {
    endpoint,
    fetchImpl,
    timeoutMs: TEST_TIMEOUT_MS,
    parse: text => text.trim()
  })));

  assert.ok(results.every(result => result.source === "remote"));
  assert.equal(maxActive, 4);
  // Both thresholds sit well inside MOCK_FETCH_MS so a slow CI host cannot make a
  // correct queue implementation look broken -- measured 2026-08-25: the real 30ms/45ms
  // pair aborted file-4 on a production VM under a load average of 18 (a sibling
  // 20GB/323%-CPU job), failing two consecutive deploys though the queue logic was
  // sound. The fix widens the margin, not the assertions' meaning.
  assert.ok(startedAt.get("file-4.csv") - began >= MOCK_FETCH_MS * 0.5, "the fifth transfer should wait for a slot");
  assert.ok(performance.now() - began >= MOCK_FETCH_MS * 1.5, "wall time should exceed one file timeout without aborting the queued file");
});

test("manifest requests bypass a saturated data-transfer queue", async () => {
  const blockerEndpoint = "https://manifest-bypass-blockers.example";
  const blockerFiles = Object.fromEntries(
    Array.from({length: 4}, (_, index) => [`block-${index}.csv`, `value\n${index}\n`])
  );
  const blockerMock = transport(blockerEndpoint, blockerFiles);
  let dataStarted = 0;
  let signalFilled;
  const filled = new Promise(resolve => { signalFilled = resolve; });
  let releaseData;
  const released = new Promise(resolve => { releaseData = resolve; });
  const blockerFetch = async (url, options = {}) => {
    if (url.endsWith("/dashboard-data/current.json")) return blockerMock.fetchImpl(url, options);
    dataStarted += 1;
    if (dataStarted === 4) signalFilled();
    await released;
    return blockerMock.fetchImpl(url, options);
  };
  const blockers = Object.keys(blockerFiles).map(filename => loadRemoteCsv(filename, {
    endpoint: blockerEndpoint,
    fetchImpl: blockerFetch,
    timeoutMs: 500,
    parse: text => text
  }));
  await filled;

  const probeEndpoint = "https://manifest-bypass-probe.example";
  const probeMock = transport(probeEndpoint, {"probe.csv": "value\n1\n"});
  let signalManifest;
  const manifestSeen = new Promise(resolve => { signalManifest = resolve; });
  const probeFetch = async (url, options = {}) => {
    if (url.endsWith("/dashboard-data/current.json")) signalManifest();
    return probeMock.fetchImpl(url, options);
  };
  const probe = loadRemoteCsv("probe.csv", {
    endpoint: probeEndpoint,
    fetchImpl: probeFetch,
    timeoutMs: 500,
    parse: text => text
  });

  try {
    await Promise.race([
      manifestSeen,
      new Promise((_, reject) => setTimeout(() => reject(new Error("manifest waited behind data queue")), 100))
    ]);
  } finally {
    releaseData();
  }
  await Promise.all([...blockers, probe]);
});

// Blocks the event loop, as a long task blocks a page's main thread.
const stallFor = ms => {
  const end = performance.now() + ms;
  while (performance.now() < end);
};

// fetchImpl whose requests matching `matches` finish while the event loop is stalled for stallMs:
// the stall starts 10 ms in, the response is ready 50 ms in, and it is handed over by setImmediate,
// which runs after every timer that expired during the stall. A browser can likewise deliver a
// transfer that finished during a long task after a timer that expired in it.
function stalledFetch(mock, matches, stallMs) {
  return async (url, options = {}) => {
    if (!matches(url)) return mock.fetchImpl(url, options);
    setTimeout(() => stallFor(stallMs), 10);
    return new Promise((resolve, reject) => {
      setTimeout(() => setImmediate(() => resolve(mock.fetchImpl(url, options))), 50);
      options.signal?.addEventListener("abort", () => {
        reject(options.signal.reason ?? new Error("aborted"));
      }, {once: true});
    });
  };
}

const SHORT_CLOCK = {timeoutMs: 300, timeoutTickMs: 20, timeoutTickCapMs: 40};

test("a main-thread stall does not use up a data file's timeout", async () => {
  // The stall is twice the timeout and the bytes arrive during it. A single setTimeout(abort)
  // fires first and fails this load, as it did on /categories on 2026-09-30.
  const endpoint = "https://stalled-data.example";
  const mock = transport(endpoint, {"stalled.csv": "value\n1\n"});
  const result = await loadRemoteCsv("stalled.csv", {
    endpoint,
    fetchImpl: stalledFetch(mock, url => url.endsWith("/stalled.csv"), 600),
    ...SHORT_CLOCK,
    parse: text => text.trim()
  });
  assert.equal(result.source, "remote");
  assert.equal(result.value, "value\n1");
});

test("a main-thread stall does not use up the manifest's timeout", async () => {
  const endpoint = "https://stalled-manifest.example";
  const mock = transport(endpoint, {"after.csv": "value\n2\n"});
  const result = await loadRemoteCsv("after.csv", {
    endpoint,
    fetchImpl: stalledFetch(mock, url => url.endsWith("/dashboard-data/current.json"), 600),
    ...SHORT_CLOCK,
    parse: text => text.trim()
  });
  assert.equal(result.source, "remote");
  assert.equal(result.value, "value\n2");
});

test("a request that never answers still times out, with or without stalls", async () => {
  const endpoint = "https://never-answers.example";
  const mock = transport(endpoint, {"dead.csv": "value\n3\n"});
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith("/dashboard-data/current.json")) return mock.fetchImpl(url, options);
    return new Promise((_, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal.reason), {once: true});
    });
  };
  const load = () => loadRemoteCsv("dead.csv", {endpoint, fetchImpl, ...SHORT_CLOCK, parse: text => text});

  let began = performance.now();
  await assert.rejects(load(), /timed out \(300 ms\)/);
  const idleMs = performance.now() - began;
  assert.ok(idleMs >= 300 && idleMs < 3000, `idle timeout took ${idleMs} ms`);

  // A 100 ms stall on every turn of the event loop: each tick counts at most its 40 ms cap, so
  // the timeout takes longer in wall-clock time but still fires.
  const stalls = setInterval(() => stallFor(100), 1);
  began = performance.now();
  try {
    await assert.rejects(load(), /timed out \(300 ms\)/);
  } finally {
    clearInterval(stalls);
  }
  const stalledMs = performance.now() - began;
  assert.ok(stalledMs >= 300 && stalledMs < 20000, `stalled timeout took ${stalledMs} ms`);
});

test("hash or size mismatch falls back without returning corrupt data", async () => {
  const endpoint = "https://canary-two.example";
  const mock = transport(endpoint, {"tiny.csv": "a,b\n1,2\n"}, {corrupt: "tiny.csv"});
  const priorWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await loadRemoteCsv("tiny.csv", {
      endpoint,
      fetchImpl: mock.fetchImpl,
      parse: text => text,
      fallback: async () => "known-good-fallback"
    });
    assert.equal(result.source, "fallback");
    assert.equal(result.value, "known-good-fallback");
    assert.match(result.error, /size mismatch/);
  } finally {
    console.warn = priorWarn;
  }
});

test("unsafe endpoint falls back before making a request", async () => {
  const priorWindow = globalThis.window;
  const priorWarn = console.warn;
  globalThis.window = {__CHAT_API__: "http://untrusted.example"};
  console.warn = () => {};
  try {
    let fetched = false;
    const result = await loadRemoteJson("freshness_manifest.json", {
      fetchImpl: async () => {
        fetched = true;
        throw new Error("should not fetch");
      },
      fallback: async () => ({safe: true})
    });
    assert.equal(result.source, "fallback");
    assert.deepEqual(result.value, {safe: true});
    assert.equal(fetched, false);
  } finally {
    globalThis.window = priorWindow;
    console.warn = priorWarn;
  }
});

test("FileAttachment adapter tracks one generation and every remote file", async () => {
  const endpoint = "https://canary-adapter.example";
  const files = {
    "tiny.csv": "date,value\n2026-08-09,7\n",
    "freshness_manifest.json": "{\"files\":{}}\n"
  };
  const mock = transport(endpoint, files);
  const fallbacks = [];
  const fileAttachment = path => ({
    csv: async () => {
      fallbacks.push(path);
      return ["fallback"];
    },
    json: async () => {
      fallbacks.push(path);
      return {fallback: true};
    }
  });
  const d3 = {
    autoType: value => value,
    csvParse: (_text, row) => {
      const value = {date: "2026-08-09", value: "7"};
      return [row ? row(value) : value];
    }
  };
  const documentImpl = {createElement: () => ({dataset: {}, hidden: false})};
  const DataAttachment = createRemoteFileAttachment(fileAttachment, d3, {
    endpoint,
    fetchImpl: mock.fetchImpl,
    documentImpl
  });
  assert.equal(DataAttachment.marker.dataset.dashboardDataSource, "pending");
  const typedRows = await DataAttachment(
    "data/tiny.csv",
    fileAttachment("data/tiny.csv")
  ).csv({typed: true});
  await DataAttachment(
    "data/freshness_manifest.json",
    fileAttachment("data/freshness_manifest.json")
  ).json();
  assert.equal(DataAttachment.marker.hidden, true);
  assert.equal(DataAttachment.marker.dataset.dashboardDataSource, "remote");
  assert.equal(DataAttachment.marker.dataset.dashboardDataGeneration, mock.generation);
  assert.equal(
    DataAttachment.marker.dataset.dashboardDataFiles,
    "freshness_manifest.json,tiny.csv"
  );
  assert.ok(typedRows[0].date instanceof Date);
  assert.equal(typedRows[0].value, 7);
  assert.deepEqual(fallbacks, []);
});

test("FileAttachment adapter rejects a data path without an explicit build-visible fallback", () => {
  const DataAttachment = createRemoteFileAttachment(
    () => ({csv: async () => []}),
    {csvParse: () => []},
    {documentImpl: {createElement: () => ({dataset: {}, hidden: false})}}
  );
  assert.throws(
    () => DataAttachment("data/tiny.csv"),
    /requires an explicit FileAttachment fallback/
  );
});

test("remote-only adapter loads data without a repository attachment", async () => {
  const endpoint = "https://remote-only.example";
  const mock = transport(endpoint, {"tiny.csv": "date,value\n2026-08-09,7\n"});
  const d3 = {
    csvParse: (_text, row) => {
      const value = {date: "2026-08-09", value: "7"};
      return [row ? row(value) : value];
    }
  };
  const DataAttachment = createRemoteDataAttachment(d3, {
    endpoint,
    fetchImpl: mock.fetchImpl,
    documentImpl: {createElement: () => ({dataset: {}, hidden: false})}
  });

  const rows = await DataAttachment("data/tiny.csv").csv({typed: true});
  assert.ok(rows[0].date instanceof Date);
  assert.equal(rows[0].value, 7);
  assert.equal(DataAttachment.marker.dataset.dashboardDataSource, "remote");
  assert.equal(DataAttachment.marker.dataset.dashboardDataGeneration, mock.generation);
});

test("remote-only adapter fails visibly instead of returning stale data", async () => {
  const endpoint = "https://remote-only-failure.example";
  const mock = transport(endpoint, {"tiny.csv": "a,b\n1,2\n"}, {corrupt: "tiny.csv"});
  const DataAttachment = createRemoteDataAttachment(
    {csvParse: text => text},
    {
      endpoint,
      fetchImpl: mock.fetchImpl,
      documentImpl: {createElement: () => ({dataset: {}, hidden: false})}
    }
  );

  await assert.rejects(
    DataAttachment("data/tiny.csv").csv(),
    /Remote dashboard data unavailable.*size mismatch/
  );
  assert.equal(DataAttachment.marker.dataset.dashboardDataSource, "error");
  assert.equal(DataAttachment.marker.dataset.dashboardDataGeneration, "");
});

test("typed CSV parse keeps d3.csvParse + autoTypeRow values, keys and row count", () => {
  const rows = parseTypedCsv("a,b,c\n 12 ,,x \ntrue,NaN,2024-01-05\n\"q,1\",\"he said \"\"hi\"\"\",0x1F\n\n7\n");
  assert.deepEqual(rows.columns, ["a", "b", "c"]);
  assert.equal(rows.length, 5);
  assert.deepEqual(Object.keys(rows[0]), ["a", "b", "c"]);
  assert.equal(rows[0].a, 12);
  assert.equal(rows[0].b, null);
  assert.equal(rows[0].c, "x ");
  assert.equal(rows[1].a, true);
  assert.ok(Number.isNaN(rows[1].b));
  assert.equal(rows[1].c.getTime(), new Date("2024-01-05").getTime());
  assert.notEqual(rows[1].c, parseTypedCsv("c\n2024-01-05\n")[0].c);
  assert.equal(rows[2].a, "q,1");
  assert.equal(rows[2].b, "he said \"hi\"");
  assert.equal(rows[2].c, 31);
  assert.deepEqual(rows[3], {a: null, b: null, c: null});
  assert.deepEqual(rows[4], {a: 7, b: null, c: null});
  assert.deepEqual(parseTypedCsv("a,b\r\n1,2\r\n").map(r => ({...r})), [{a: 1, b: 2}]);
  assert.deepEqual(parseTypedCsv("").columns, []);
  assert.deepEqual(parseTypedCsv("\n").columns, [""]);
  const dup = parseTypedCsv("a,__proto__,a\n1,,3\n")[0];
  assert.deepEqual(Object.keys(dup), ["a"]);
  assert.equal(dup.a, 3);
  assert.equal(Object.getPrototypeOf(dup), Object.prototype);
  // rows wider than V8's fast-object limit take the key-by-key path
  const names = Array.from({length: 1500}, (_, i) => "c" + i);
  const wide = parseTypedCsv(`date,${names.join(",")}\n2024-01-05,${names.map((_, i) => (i % 2 ? i : "")).join(",")}\n`);
  assert.deepEqual(Object.keys(wide[0]), ["date", ...names]);
  assert.equal(wide[0].c3, 3);
  assert.equal(wide[0].c4, null);
  assert.ok(wide[0].date instanceof Date);
});
