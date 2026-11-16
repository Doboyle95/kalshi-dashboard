import assert from "node:assert/strict";
import {createHash, webcrypto} from "node:crypto";
import {gzipSync} from "node:zlib";
import test from "node:test";

import {loadRemoteCsv} from "../src/components/remote-data.js";

globalThis.crypto ??= webcrypto;

const csvText = "date,report_ticker,pnl_net\n2026-11-16,KXTEST,1.5\n";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const lines = text => text.trim().split("\n");

// Each call gets its own endpoint and generation, so the loader's per-generation caches cannot leak between tests.
let transportCount = 0;
function transport(name, bytes, {corrupt = false} = {}) {
  transportCount += 1;
  const endpoint = `https://data${transportCount}.example.test`;
  const manifest = {
    schema_version: 1,
    generation: createHash("sha256").update(endpoint).digest("hex").slice(0, 20),
    published_at: "2026-11-16T20:50:00+00:00",
    file_count: 1,
    files: {[name]: {size_bytes: bytes.byteLength, sha256: sha(bytes)}}
  };
  const served = corrupt ? Uint8Array.from(bytes, (b, i) => (i === Math.floor(bytes.length / 2) ? b ^ 0xff : b)) : bytes;
  const fetchImpl = async url => {
    if (url.endsWith("/dashboard-data/current.json")) {
      return new Response(JSON.stringify(manifest), {status: 200, headers: {"content-type": "application/json"}});
    }
    if (url.endsWith(`/${name}`)) return new Response(served, {status: 200});
    return new Response("missing", {status: 404});
  };
  return {endpoint, fetchImpl};
}

test("a .csv.gz file is verified as compressed bytes and then decoded", async () => {
  const gz = new Uint8Array(gzipSync(csvText));
  const result = await loadRemoteCsv("taker.csv.gz", {
    ...transport("taker.csv.gz", gz),
    fallback: async () => ["fallback"],
    parse: lines
  });
  assert.equal(result.source, "remote");
  assert.deepEqual(result.value, ["date,report_ticker,pnl_net", "2026-11-16,KXTEST,1.5"]);
});

test("a plain .csv file still decodes without gzip", async () => {
  const bytes = new TextEncoder().encode(csvText);
  const result = await loadRemoteCsv("taker.csv", {
    ...transport("taker.csv", bytes),
    fallback: async () => ["fallback"],
    parse: lines
  });
  assert.equal(result.source, "remote");
  assert.equal(result.value.length, 2);
});

test("a gzip file that fails its hash is not decoded", async () => {
  const gz = new Uint8Array(gzipSync(csvText));
  const result = await loadRemoteCsv("taker.csv.gz", {
    ...transport("taker.csv.gz", gz, {corrupt: true}),
    fallback: async () => ["fallback"],
    parse: lines
  });
  assert.notEqual(result.source, "remote");
  assert.deepEqual(result.value, ["fallback"]);
});

test("bytes that match the hash but are not gzip fall back instead of rendering", async () => {
  const bytes = new TextEncoder().encode("not gzip at all");
  const result = await loadRemoteCsv("taker.csv.gz", {
    ...transport("taker.csv.gz", bytes),
    fallback: async () => ["fallback"],
    parse: lines
  });
  assert.notEqual(result.source, "remote");
  assert.deepEqual(result.value, ["fallback"]);
});
