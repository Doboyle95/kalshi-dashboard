const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const GENERATION = /^[0-9a-f]{20}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15000;
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

async function fetchBounded(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
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

function manifestFor(endpoint, fetchImpl, timeoutMs) {
  const cacheKey = `${endpoint}|${timeoutMs}`;
  if (!manifestPromises.has(cacheKey)) {
    const promise = (async () => {
      const response = await fetchBounded(
        fetchImpl,
        `${endpoint}/dashboard-data/current.json`,
        {cache: "no-store", credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer"},
        timeoutMs
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
  if (typeof fetchImpl !== "function") throw new Error("browser fetch is unavailable");

  const manifest = await manifestFor(endpoint, fetchImpl, timeoutMs);
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
  const response = await fetchBounded(
    fetchImpl,
    url,
    {cache: "default", credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer"},
    timeoutMs
  );
  if (!response.ok) throw new Error(`dashboard data file returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== record.size_bytes) throw new Error(`dashboard data size mismatch for ${filename}`);
  if ((await sha256Hex(bytes)) !== record.sha256) throw new Error(`dashboard data hash mismatch for ${filename}`);
  const text = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
  return {text, generation: manifest.generation, publishedAt: manifest.published_at ?? null};
}

async function withFallback(filename, fallback, decode, options = {}) {
  if (typeof fallback !== "function" || typeof decode !== "function") {
    throw new TypeError("remote data loaders require fallback and decode functions");
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

export function createRemoteFileAttachment(fileAttachment, d3, options = {}) {
  if (typeof fileAttachment !== "function" || !d3) {
    throw new TypeError("remote FileAttachment requires the Framework attachment and d3");
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
      return legacyAttachment ?? fileAttachment(path);
    }
    const filename = path.slice("data/".length);
    if (!legacyAttachment) {
      throw new TypeError(`remote attachment ${filename} requires an explicit FileAttachment fallback`);
    }
    const legacy = legacyAttachment;
    return {
      csv(csvOptions = {}) {
        return track(
          filename,
          loadRemoteCsv(filename, {
            fallback: () => legacy.csv(csvOptions),
            parse: text => d3.csvParse(text, csvOptions.typed ? autoTypeRow : undefined),
            ...loadOptions,
          })
        );
      },
      json() {
        return track(
          filename,
          loadRemoteJson(filename, {
            fallback: () => legacy.json(),
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
