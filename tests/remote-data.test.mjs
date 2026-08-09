import assert from "node:assert/strict";
import {createHash, webcrypto} from "node:crypto";
import test from "node:test";

import {loadRemoteCsv, loadRemoteJson} from "../src/components/remote-data.js";

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
