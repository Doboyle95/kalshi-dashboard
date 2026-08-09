import assert from "node:assert/strict";
import {createHash, webcrypto} from "node:crypto";
import test from "node:test";

import {
  createRemoteDataAttachment,
  createRemoteFileAttachment,
  loadRemoteCsv,
  loadRemoteJson
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
