import {readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const endpointFile = new URL("src/chat-endpoint.json", root);
const outputFile = new URL("src/daily-briefing.json", root);
const published = JSON.parse(await readFile(endpointFile, "utf8"));
const api = String(process.env.CHAT_API_URL || published.api || "").replace(/\/$/, "");
const token = process.env.CHAT_TOKEN || published.token || "";
if (!api) throw new Error("Daily briefing: no Ask Data API endpoint configured");

const headers = {
  "Content-Type": "application/json",
  ...(token ? {Authorization: `Bearer ${token}`} : {})
};

async function request(path, options = {}, timeoutMs = 120_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${api}${path}`, {...options, headers: {...headers, ...(options.headers || {})}, signal: controller.signal});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${body.error || "unknown error"}`);
    if (body.error) throw new Error(`${path}: ${body.error}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

const health = await request("/health", {method: "GET"}, 30_000);
if (!health.ok) throw new Error(`Daily briefing: data service unhealthy: ${health.error || "unknown error"}`);

const requiredVenues = ["Kalshi", "Polymarket US", "ForecastEx", "DKeX", "Underdog Exchange", "Crypto.com/Nadex", "ProphetX", "Novig", "Rothera", "CME"];

const anchorQuestion = [
  "Build the anchor table for today's Predict Charts industry briefing.",
  "For each prediction-market venue, use its latest complete reported day and return venue, report date, reported contract volume, the average of its prior seven complete reported days, and percent change versus that average.",
  "Use daily_overall for Kalshi and exclude rows where is_partial is true. Use competitor_daily only for platforms other than Kalshi, add ProphetX from prophetx_daily, and add CME from cme_daily. Never use competitor_daily's Kalshi row; it is not the authoritative Kalshi total.",
  // Added 2026-08-22 after three consecutive scheduled failures. competitor_daily.complete
  // is populated for Polymarket_US ONLY; it is NULL for ForecastEx, DKeX, Underdog Exchange,
  // Crypto.com/Nadex, Novig and Rothera. `complete = TRUE` therefore drops six of the ten
  // venues, because NULL = TRUE is NULL rather than false, and the ten-venue gate below
  // then fails. That is exactly what happened on 08-20, 08-21 and 08-22. The dashboard's
  // own convention (components/venue-data.js) is that a missing flag means complete, so
  // say so here rather than leaving the model to guess.
  "In competitor_daily the `complete` column is only populated for Polymarket_US and is NULL for every other platform, where NULL means the row IS complete. Filter it as COALESCE(complete, TRUE) or omit the filter entirely; never write `complete = TRUE`, which silently discards every platform whose flag is NULL.",
  "Exclude partial days. CME is the sparse bulletin series; a normal seven-day lookback spanning seven calendar days is regular, not sparse.",
  `Every one of these ten venues must appear in the result: ${requiredVenues.join(", ")}.`
].join(" ");

// The anchor SQL is model-written, so it varies run to run: the same prompt produced
// working SQL on 08-20 and a six-venue-short result on the three scheduled runs after it.
// One corrective retry that names what went missing turns that class of drift from a
// failed day into a second attempt, which is the difference between this publishing
// daily and publishing when the model happens to agree with itself.
async function fetchAnchor(correction) {
  const anchor = await request("/ask", {
    method: "POST",
    body: JSON.stringify({question: correction ? `${anchorQuestion} ${correction}` : anchorQuestion})
  });
  if (!Array.isArray(anchor.rows) || !anchor.rows.length || !anchor.sql) {
    return {error: "anchor query returned no usable rows"};
  }
  for (const table of ["daily_overall", "competitor_daily", "prophetx_daily", "cme_daily"]) {
    if (!anchor.sql.toLowerCase().includes(table)) {
      return {error: `anchor SQL omitted required source ${table}`};
    }
  }
  const rows = anchor.rows.map((row) => ({
    ...row,
    venue: row.venue === "Polymarket_US" ? "Polymarket US" : row.venue,
    reporting_density: row.venue === "CME" ? "sparse bulletin" : "regular"
  }));
  const returned = new Set(rows.map((row) => row.venue));
  const missing = requiredVenues.filter((venue) => !returned.has(venue));
  if (missing.length) return {error: `anchor query omitted ${missing.join(", ")}`, missing};
  return {anchor, rows};
}

let attempt = await fetchAnchor();
if (attempt.error) {
  console.warn(`Daily briefing: first anchor attempt failed (${attempt.error}); retrying with a correction.`);
  const correction = attempt.missing?.length
    ? `Your previous attempt omitted ${attempt.missing.join(", ")}. Those platforms are present in competitor_daily; the usual cause is filtering on complete = TRUE when their flag is NULL. Return a row for all ten venues.`
    : "Your previous attempt did not return a usable table. Return one row per venue for all ten venues, and read from daily_overall, competitor_daily, prophetx_daily and cme_daily.";
  attempt = await fetchAnchor(correction);
}
if (attempt.error) throw new Error(`Daily briefing: ${attempt.error}`);
const anchor = attempt.anchor;
const normalizedAnchorRows = attempt.rows;

const editorialQuestion = [
  "Write the daily Predict Charts briefing for readers who follow prediction markets and their overlap with sports betting.",
  `The broad data service is currently updated through ${health.aggregate_through || health.raw_trades_through || "the latest available date"}.`,
  "Use the supplied venue-volume table as the anchor. It already covers all ten venues with a seven-day baseline for each, so venue-versus-venue movement, share shifts and relative momentum are available to you without running any further query.",
  "Then run only the supporting context queries needed to find genuinely interesting changes. Cross-venue evidence to prefer: competitor_daily contracts and fees for the non-Kalshi platforms, prophetx_daily, cme_daily, Novig, parlay adoption at venues that identify multi-leg products, and settled-outcome accuracy where a venue has enough settled contracts. Kalshi-only depth, to use sparingly rather than by default: product mix, sports versus non-sports, fee revenue, taker-side volume or P&L, and unusually large individual trades.",
  "At least two of the bullets must be about a venue other than Kalshi, or must compare venues against each other. Kalshi is the deepest tape here, not the subject of the briefing: one that is entirely about Kalshi has failed even if every number in it is correct. The anchor table alone always supports a cross-venue bullet, so this never requires inventing significance.",
  "Supporting datasets often lag the volume anchor by a day or two: query each supporting table's own latest complete date and state that date, rather than requiring it to have a row on the newest Kalshi date. If an anchor-date query is empty, retry against that table's MAX(date).",
  "For Kalshi supporting tables, never use a date later than Kalshi's report_date in the supplied anchor table; later category, mix, fee, P&L, or trade rows may be intraday partials even when they lack an is_partial column.",
  "Do not treat category_daily's broad Sports category as the same measure as the three-way sports/non-sports/parlay split. Use daily_sports_vs_nonsports for sports and parlay shares, and use category_daily only for narrower named categories such as elections or commodities.",
  "Return three to five concise bullets, no more than 160 words total. Lead each bullet with a bold factual phrase and quantify changes against a sensible recent baseline. Do not force a TOPIC when nothing notable happened there -- but that is not licence to drop back to Kalshi for every bullet, since the anchor table always carries cross-venue movement worth reporting.",
  "Do not imply a cause, mechanism, or relationship unless a supporting query directly measures it. If the evidence only establishes two simultaneous changes, describe them separately rather than saying one explains the other.",
  "Explicitly mark evidence that is Kalshi-only, distinguish a venue's latest reported day from a common calendar day, and finish with one short coverage note. Do not add a headline or generic methodology explanation."
].join(" ");

const deeper = await request("/insights", {
  method: "POST",
  body: JSON.stringify({
    question: editorialQuestion,
    sql: anchor.sql,
    rows: normalizedAnchorRows,
    columns: anchor.columns
  })
}, 180_000);

const insights = String(deeper.insights || "").trim();
if (insights.length < 120) throw new Error("Daily briefing: deeper model returned an implausibly short briefing");
const anchorDates = normalizedAnchorRows
  .map((row) => new Date(row.report_date))
  .filter((date) => !Number.isNaN(+date));
const anchorThrough = anchorDates.length
  ? new Date(Math.max(...anchorDates.map(Number))).toISOString().slice(0, 10)
  : null;

const result = {
  status: "ready",
  generated_at: new Date().toISOString(),
  data_through: anchorThrough,
  service_through: health.aggregate_through || health.raw_trades_through || null,
  title: "What changed in prediction markets",
  insights,
  evidence: Array.isArray(deeper.evidence) ? deeper.evidence : [],
  anchor: {
    question: anchorQuestion,
    sql: anchor.sql,
    rows: normalizedAnchorRows,
    columns: anchor.columns
  },
  model: health.model || null
};

await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Daily briefing written through ${result.data_through || "latest data"}.`);
