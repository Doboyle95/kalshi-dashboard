// Fortnightly tripwire for public prose whose truth moves with the data.
//
// The dashboard states a lot of things that were true when they were written --
// "volume is still tiny next to Kalshi", "most calendar days so far report zero
// trades" -- and nothing notices when they stop being true. The second of those was
// wrong by a wide margin before anyone looked: Underdog had 33 reported days and not
// one of them was a zero.
//
// Two halves, deliberately different in kind:
//   REGISTERED  scripts/prose-claims.json, each with a metric/op/value, checked
//               against the current published generation. Mechanical and reliable.
//   DISCOVERED  a scan of every src/*.md for sentences that pair a venue with a
//               scale or state word. This does not judge them; it lists the ones
//               the registry has never seen, so the registry cannot quietly rot.
//
// This never gates anything. It exits 0 on a flipped claim as well as a clean run --
// per the standing rule, a check that can withhold is a check that becomes an outage.
// The workflow reads the report and opens an issue; nothing here blocks a deploy or
// edits a page.

import {readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const published = JSON.parse(await readFile(new URL("src/chat-endpoint.json", root), "utf8"));
const api = String(process.env.CHAT_API_URL || published.api || "").replace(/\/$/, "");
const registry = JSON.parse(await readFile(new URL("scripts/prose-claims.json", root), "utf8"));

// ── data ─────────────────────────────────────────────────────────────────────
async function fetchText(path) {
  const response = await fetch(`${api}${path}`, {redirect: "error"});
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.text();
}
function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const row = {};
    columns.forEach((name, i) => { row[name] = cells[i]; });
    return row;
  });
}
const manifest = JSON.parse(await fetchText("/dashboard-data/current.json"));
const gen = manifest.generation;
async function dataset(name) {
  return parseCsv(await fetchText(`/dashboard-data/generations/${gen}/${name}`));
}
const [competitor, kalshi] = await Promise.all([
  dataset("competitor_daily.csv"),
  dataset("daily_overall.csv")
]);

// Rows for one venue, oldest first. `complete` is populated for Polymarket_US only and
// NULL elsewhere, where NULL means complete -- the same convention components/venue-data.js
// uses, and the one that cost the daily briefing three days when a query assumed otherwise.
const ALIAS = {"Polymarket US": "Polymarket_US"};
function venueRows(venue) {
  const name = ALIAS[venue] || venue;
  return competitor
    .filter((row) => row.platform === name && String(row.complete) !== "0")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
const kalshiByDate = new Map(kalshi
  .filter((row) => String(row.is_partial).toUpperCase() !== "TRUE")
  .map((row) => [row.date, +row.contracts_total || 0]));

// ── metrics ──────────────────────────────────────────────────────────────────
// Each returns {value, detail}. `detail` is what makes the report readable, so a
// flipped claim can be acted on without re-deriving anything.
const metrics = {
  // A venue's contracts over its last N reported days, against Kalshi on those same dates.
  shareOfKalshi({venue, days = 30}) {
    const rows = venueRows(venue).slice(-days);
    const venueTotal = rows.reduce((sum, row) => sum + (+row.contracts || 0), 0);
    const kalshiTotal = rows.reduce((sum, row) => sum + (kalshiByDate.get(row.date) || 0), 0);
    const value = kalshiTotal > 0 ? venueTotal / kalshiTotal : null;
    return {
      value,
      detail: `${venue} ${Math.round(venueTotal).toLocaleString()} vs Kalshi ${Math.round(kalshiTotal).toLocaleString()} contracts over ${rows.length} reported days`
    };
  },
  reportedDays({venue}) {
    const rows = venueRows(venue);
    return {
      value: rows.length,
      detail: rows.length ? `${rows.length} reported days, ${rows[0].date} to ${rows.at(-1).date}` : "no rows"
    };
  },
  zeroTradeDayShare({venue}) {
    const rows = venueRows(venue);
    const zero = rows.filter((row) => !(+row.contracts > 0)).length;
    return {
      value: rows.length ? zero / rows.length : null,
      detail: `${zero} zero-contract rows of ${rows.length} reported days`
    };
  },
  // How far Kalshi's fees sit above the next venue's -- the multiple the prose states.
  kalshiFeeLeadOverNextVenue({days = 30}) {
    const dates = new Set(venueRows("Polymarket US").slice(-days).map((row) => row.date));
    const totals = new Map();
    for (const row of competitor) {
      if (!dates.has(row.date)) continue;
      const fees = +row.fees || 0;
      totals.set(row.platform, (totals.get(row.platform) || 0) + fees);
    }
    const kalshiFees = totals.get("Kalshi") || 0;
    const others = [...totals.entries()].filter(([name]) => name !== "Kalshi").sort((a, b) => b[1] - a[1]);
    const next = others[0];
    const value = next && next[1] > 0 ? kalshiFees / next[1] : null;
    return {
      value,
      detail: next ? `Kalshi $${Math.round(kalshiFees).toLocaleString()} vs ${next[0]} $${Math.round(next[1]).toLocaleString()} over ${dates.size} days` : "no competitor fees"
    };
  }
};

const compare = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b
};

// ── registered claims ────────────────────────────────────────────────────────
const sources = new Map();
async function pageText(file) {
  if (!sources.has(file)) {
    sources.set(file, await readFile(new URL(file, root), "utf8").catch(() => null));
  }
  return sources.get(file);
}

const flipped = [];
const detached = [];
const okCount = [];
const review = [];

for (const claim of registry.claims) {
  const text = await pageText(claim.file);
  // If the quote is gone the prose was rewritten and the entry is describing nothing.
  // That is worth saying: a registry pointing at deleted text is worse than no registry.
  if (text == null) { detached.push({...claim, reason: `${claim.file} not found`}); continue; }
  if (claim.quote && !text.includes(claim.quote)) {
    detached.push({...claim, reason: "quoted text is no longer on the page"});
    continue;
  }
  if (claim.kind === "review") { review.push(claim); continue; }
  const metric = metrics[claim.metric];
  if (!metric) { detached.push({...claim, reason: `unknown metric ${claim.metric}`}); continue; }
  let result;
  try {
    result = metric(claim.args || {});
  } catch (error) {
    detached.push({...claim, reason: `metric threw: ${error.message}`});
    continue;
  }
  if (result.value == null) { detached.push({...claim, reason: "metric had no data"}); continue; }
  const holds = compare[claim.op](result.value, claim.value);
  const line = {...claim, actual: result.value, detail: result.detail};
  if (holds) okCount.push(line); else flipped.push(line);
}

// ── discovery ────────────────────────────────────────────────────────────────
// Finds venue-scale sentences the registry has never seen. Regex, not judgement: it
// says "look at this", never "this is wrong".
const VENUE = /(Kalshi|Polymarket|ForecastEx|DKeX|Underdog|Nadex|Crypto\.com|ProphetX|Novig|Rothera|CME|DraftKings|FanDuel|Robinhood)/i;
const SCALE = /(tiny|smallest|largest|biggest|dominant|dominates|order of magnitude|only venue|only competitor|no other venue|early-stage|young|still|not yet|so far|to date|barely|nearly all|almost all|majority)/i;
const METHOD = /(is shown|are shown|we show|not drawn|excluded|appears only where|allowlist|cannot be split)/i;

const {readdir} = await import("node:fs/promises");
const pages = (await readdir(new URL("src/", root))).filter((name) => name.endsWith(".md"));
const registered = registry.claims.map((claim) => claim.quote).filter(Boolean);
const candidates = [];
for (const name of pages) {
  const raw = await readFile(new URL(`src/${name}`, root), "utf8");
  const visible = raw.replace(/```js[\s\S]*?\n```/g, "").split("<div hidden")[0];
  for (const rawLine of visible.split("\n")) {
    const line = rawLine.trim();
    if (!/class="(page-lead|section-intro|instruction-line|chart-note|page-meta)"|note:\s*"|<p>/.test(line)) continue;
    const plain = line.replace(/<[^>]*>/g, "").replace(/\$\{[^}]*\}/g, "«N»");
    for (const sentence of plain.match(/[^.!?]*[.!?]/g) || []) {
      const text = sentence.trim();
      if (text.length < 30) continue;
      if (!VENUE.test(text) || !SCALE.test(text) || METHOD.test(text)) continue;
      if (registered.some((quote) => text.includes(quote))) continue;
      candidates.push({file: `src/${name}`, text: text.slice(0, 200)});
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const stamp = manifest.published_at || "unknown";
const out = [];
out.push(`# Prose claim check`, ``, `Data generation \`${gen}\`, published ${stamp}.`, ``);
out.push(`${flipped.length} flipped · ${okCount.length} still hold · ${detached.length} detached · ${review.length} need a human · ${candidates.length} unregistered candidates`, ``);

if (flipped.length) {
  out.push(`## Claims that no longer hold`, ``);
  for (const claim of flipped) {
    out.push(`- **${claim.file}** — "${claim.quote}"`);
    out.push(`  - measured \`${claim.metric}\` = ${claim.actual}, needs \`${claim.op} ${claim.value}\``);
    out.push(`  - ${claim.detail}`);
    out.push(`  - ${claim.why}`);
  }
  out.push(``);
}
if (detached.length) {
  out.push(`## Registry entries that no longer match the page`, ``);
  for (const claim of detached) out.push(`- **${claim.file}** — "${claim.quote ?? ""}" — ${claim.reason}`);
  out.push(``);
}
if (review.length) {
  out.push(`## Claims with no mechanical test — read these`, ``);
  for (const claim of review) out.push(`- **${claim.file}** — "${claim.quote}" — ${claim.why}`);
  out.push(``);
}
if (candidates.length) {
  out.push(`## Unregistered venue-scale sentences`, ``, `Candidates only. Register the ones that can actually go stale; ignore the rest.`, ``);
  for (const item of candidates) out.push(`- \`${item.file}\` — ${item.text}`);
  out.push(``);
}
if (okCount.length) {
  out.push(`## Still true`, ``);
  for (const claim of okCount) out.push(`- \`${claim.file}\` — "${claim.quote}" — ${claim.metric} = ${typeof claim.actual === "number" ? claim.actual.toPrecision(3) : claim.actual} (${claim.detail})`);
  out.push(``);
}

const report = out.join("\n");
console.log(report);
// Only writes a file when asked. Defaulting to a path in the repo root leaves an
// untracked report lying next to the source, which is how it eventually gets committed.
if (process.env.PROSE_REPORT_PATH) {
  await writeFile(process.env.PROSE_REPORT_PATH, `${report}\n`, "utf8");
}

if (process.env.GITHUB_OUTPUT) {
  const {appendFile} = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `flipped=${flipped.length}\ndetached=${detached.length}\n`);
}
// Always 0. Reporting job, not a gate.
