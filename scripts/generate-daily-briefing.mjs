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

// ── Publishing policy ────────────────────────────────────────────────────────
// This job PUBLISHES. It does not withhold a briefing because something about it
// was less than perfect. Every check below records a note and carries on; the only
// thing that stops a publish is having no prose at all to publish, because there is
// then literally nothing to write.
//
// It used to be the other way round, and the cost was three days of nothing: a
// ten-venue hard gate turned one wrong SQL filter into a silent outage on 08-20,
// 08-21 and 08-22. A four-venue briefing that says it covers four venues is worth
// more than a blank card, and a great deal more than a card still showing Tuesday.
const notes = [];

// Not fatal in either direction. /health is a summary, not a gate: if the service can
// still answer /ask and /insights, a briefing built on a degraded service and labelled
// as such beats no briefing. And a health endpoint that is itself down must not be the
// thing that stops the day -- it only supplies the model name and the through-date.
let health = {};
try {
  health = await request("/health", {method: "GET"}, 30_000);
  if (!health.ok) notes.push(`data service reported unhealthy: ${health.error || "unknown error"}`);
} catch (error) {
  health = {};
  notes.push(`health check failed: ${error.message}`);
}

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
  // Venues report on different cadences and some are routinely a day or more behind the
  // newest date on the board. A single global MAX(date) filter silently deletes exactly
  // those venues, which is not the same thing as their having no data.
  "Resolve the latest complete reported day SEPARATELY FOR EACH VENUE. Do not filter the whole result to one shared calendar date, and do not require a venue to have a row on the newest date any venue reported: a venue whose most recent complete day is a few days old is reporting normally and still belongs in the table, on its own date. Each venue's prior-seven-day baseline is its own prior seven REPORTED days, which for an irregular reporter spans more than seven calendar days.",
  `Every one of these ten venues must appear in the result: ${requiredVenues.join(", ")}.`
].join(" ");

// The anchor SQL is model-written, so it varies run to run: the same prompt produced
// working SQL on 08-20 and a six-venue-short result on the three scheduled runs after it.
// One corrective retry that names what went missing turns that class of drift from a
// failed day into a second attempt, which is the difference between this publishing
// daily and publishing when the model happens to agree with itself.
// Returns whatever the anchor produced plus a description of what is missing from it.
// It never rejects: the caller decides, and the caller's answer is always "publish".
async function fetchAnchor(correction) {
  let anchor;
  try {
    anchor = await request("/ask", {
      method: "POST",
      body: JSON.stringify({question: correction ? `${anchorQuestion} ${correction}` : anchorQuestion})
    });
  } catch (error) {
    return {rows: [], missing: requiredVenues, fault: `anchor query failed: ${error.message}`};
  }
  const rows = (Array.isArray(anchor.rows) ? anchor.rows : []).map((row) => ({
    ...row,
    venue: row.venue === "Polymarket_US" ? "Polymarket US" : row.venue,
    reporting_density: row.venue === "CME" ? "sparse bulletin" : "regular"
  }));
  const returned = new Set(rows.map((row) => row.venue));
  const missing = requiredVenues.filter((venue) => !returned.has(venue));
  const omittedSources = ["daily_overall", "competitor_daily", "prophetx_daily", "cme_daily"]
    .filter((table) => !String(anchor.sql || "").toLowerCase().includes(table));
  return {anchor, rows, missing, omittedSources};
}

// Two attempts, and we keep the BETTER of the two rather than the later one — a
// correction that makes things worse should not cost us the good first answer.
let attempt = await fetchAnchor();
if (attempt.missing.length) {
  console.warn(`Daily briefing: first anchor attempt missing ${attempt.missing.join(", ")}; retrying with a correction.`);
  const correction = attempt.rows.length
    ? `Your previous attempt omitted ${attempt.missing.join(", ")}. Those platforms are present in competitor_daily; the usual cause is filtering on complete = TRUE when their flag is NULL. Return a row for all ten venues.`
    : "Your previous attempt did not return a usable table. Return one row per venue for all ten venues, and read from daily_overall, competitor_daily, prophetx_daily and cme_daily.";
  const second = await fetchAnchor(correction);
  if (second.rows.length > attempt.rows.length) attempt = second;
}

const anchor = attempt.anchor || {};

// How far behind the newest reported day each venue is, computed here rather than left
// for the model to work out from a column of dates. Venues do not all report on the same
// cadence -- measured over the last 60 days, Novig has 18 reported days and Underdog 34,
// against Kalshi's 60, and CME is a bulletin. A venue whose latest complete day is a few
// days old is reporting normally, not missing, and must stay eligible for a bullet; the
// briefing just has to say which day it is talking about. Handing the model the lag as a
// number is what lets it say that instead of quietly dropping the venue.
const anchorTimes = attempt.rows
  .map((row) => +new Date(row.report_date))
  .filter((value) => Number.isFinite(value));
const newestAnchorTime = anchorTimes.length ? Math.max(...anchorTimes) : null;
const normalizedAnchorRows = attempt.rows.map((row) => {
  const time = +new Date(row.report_date);
  const daysBehind = newestAnchorTime != null && Number.isFinite(time)
    ? Math.round((newestAnchorTime - time) / 86_400_000)
    : null;
  return {
    ...row,
    days_behind_newest_venue: daysBehind,
    reporting_recency: daysBehind == null ? "unknown"
      : daysBehind === 0 ? "current"
      : daysBehind <= 3 ? `${daysBehind} day${daysBehind === 1 ? "" : "s"} behind — normal reporting lag`
      : `${daysBehind} days behind — state this date explicitly`
  };
});
// anchor.columns describes the model-written SELECT, so the fields added here are absent
// from it and would be dropped from the row summary /insights builds.
const anchorColumns = [
  ...(Array.isArray(anchor.columns) ? anchor.columns : []),
  ...["reporting_density", "days_behind_newest_venue", "reporting_recency"]
].filter((name, index, all) => all.indexOf(name) === index);
if (attempt.fault) notes.push(attempt.fault);
if (attempt.omittedSources?.length) notes.push(`anchor SQL did not read ${attempt.omittedSources.join(", ")}`);
if (attempt.missing.length) notes.push(`anchor covered ${normalizedAnchorRows.length} of ${requiredVenues.length} venues; missing ${attempt.missing.join(", ")}`);

const editorialQuestion = [
  "Write the daily Predict Charts briefing for readers who follow prediction markets and their overlap with sports betting.",
  `The broad data service is currently updated through ${health.aggregate_through || health.raw_trades_through || "the latest available date"}.`,
  attempt.missing.length
    ? `Use the supplied venue-volume table as the anchor. It carries a seven-day baseline for each venue it covers, but this run it covers only ${normalizedAnchorRows.length} of ${requiredVenues.length} venues -- ${attempt.missing.join(", ")} are absent from it. Write the briefing from what is there, and say plainly in the coverage note which venues are not covered today. Do not describe a partial field as the whole industry, and do not guess at the missing venues.`
    : "Use the supplied venue-volume table as the anchor. It already covers all ten venues with a seven-day baseline for each, so venue-versus-venue movement, share shifts and relative momentum are available to you without running any further query.",
  "Then run only the supporting context queries needed to find genuinely interesting changes. Cross-venue evidence to prefer: competitor_daily contracts and fees for the non-Kalshi platforms, prophetx_daily, cme_daily, Novig, parlay adoption at venues that identify multi-leg products, and settled-outcome accuracy where a venue has enough settled contracts. Kalshi-only depth, to use sparingly rather than by default: product mix, sports versus non-sports, fee revenue, taker-side volume or P&L, and unusually large individual trades.",
  "At least two of the bullets must be about a venue other than Kalshi, or must compare venues against each other. Kalshi is the deepest tape here, not the subject of the briefing: one that is entirely about Kalshi has failed even if every number in it is correct. The anchor table alone always supports a cross-venue bullet, so this never requires inventing significance.",
  "Supporting datasets often lag the volume anchor by a day or two: query each supporting table's own latest complete date and state that date, rather than requiring it to have a row on the newest Kalshi date. If an anchor-date query is empty, retry against that table's MAX(date).",
  // Daniel, 2026-08-22: a venue must not become ineligible simply because its newest row
  // is not from yesterday. Novig reports about 18 days in 60 and Underdog about 34, so
  // treating "not current" as "not reportable" would quietly reduce this to the venues
  // that happen to publish daily.
  "Every anchor row carries days_behind_newest_venue and reporting_recency. A venue that is a few days behind is reporting normally, NOT missing or stale: it stays fully eligible for a bullet whenever its trend is the interesting one, and you simply name the date you are describing. Do not silently drop a venue, and do not downgrade a genuinely interesting move to a lesser one, merely because a different venue has a newer row. Only when a venue is far behind the rest should its lag itself be the point, and then say so plainly rather than omitting the venue.",
  "For Kalshi supporting tables, never use a date later than Kalshi's report_date in the supplied anchor table; later category, mix, fee, P&L, or trade rows may be intraday partials even when they lack an is_partial column.",
  "Do not treat category_daily's broad Sports category as the same measure as the three-way sports/non-sports/parlay split. Use daily_sports_vs_nonsports for sports and parlay shares, and use category_daily only for narrower named categories such as elections or commodities.",
  "Return three to five concise bullets, no more than 160 words total. Lead each bullet with a bold factual phrase and quantify changes against a sensible recent baseline. Do not force a TOPIC when nothing notable happened there -- but that is not licence to drop back to Kalshi for every bullet, since the anchor table always carries cross-venue movement worth reporting.",
  "Do not imply a cause, mechanism, or relationship unless a supporting query directly measures it. If the evidence only establishes two simultaneous changes, describe them separately rather than saying one explains the other.",
  "Explicitly mark evidence that is Kalshi-only, distinguish a venue's latest reported day from a common calendar day, and finish with one short coverage note. Do not add a headline or generic methodology explanation."
].join(" ");

async function fetchInsights() {
  try {
    const deeper = await request("/insights", {
      method: "POST",
      body: JSON.stringify({
        question: editorialQuestion,
        sql: anchor.sql,
        rows: normalizedAnchorRows,
        columns: anchorColumns
      })
    }, 180_000);
    return {deeper, insights: String(deeper.insights || "").trim()};
  } catch (error) {
    return {deeper: {}, insights: "", fault: `insights request failed: ${error.message}`};
  }
}

let written = await fetchInsights();
// One retry on an empty or stub answer, then take what we have. The old floor was 120
// characters and it THREW -- a short answer became no answer, which is the worse of the
// two outcomes for a card that states its own age. The floor now decides whether to try
// again, not whether to publish.
if (written.insights.length < 120) {
  console.warn(`Daily briefing: first insights attempt returned ${written.insights.length} chars; retrying once.`);
  const retry = await fetchInsights();
  if (retry.insights.length > written.insights.length) written = retry;
}
const deeper = written.deeper;
const insights = written.insights;
if (written.fault) notes.push(written.fault);
else if (insights.length < 120) notes.push(`briefing prose came back unusually short (${insights.length} characters)`);

// The ONE condition that stops a publish: nothing to publish. Leaving the previous file
// in place keeps the last real briefing on the page, which renders its own date and its
// own age, rather than blanking the card.
if (!insights) {
  console.error(`Daily briefing: no prose returned; leaving the previous briefing in place. Notes: ${notes.join("; ") || "none"}`);
  process.exit(1);
}
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
  // What this run actually managed, so the card can say so instead of the reader
  // having to infer it. `notes` is for the build log and for anyone reading the JSON;
  // the page only surfaces the venue count.
  coverage: {
    venues_expected: requiredVenues.length,
    venues_covered: normalizedAnchorRows.length,
    venues_missing: attempt.missing,
    degraded: attempt.missing.length > 0 || notes.length > 0
  },
  notes,
  evidence: Array.isArray(deeper.evidence) ? deeper.evidence : [],
  anchor: {
    question: anchorQuestion,
    sql: anchor.sql,
    rows: normalizedAnchorRows,
    columns: anchorColumns
  },
  model: health.model || null
};

await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Daily briefing written through ${result.data_through || "latest data"}: ${result.coverage.venues_covered}/${result.coverage.venues_expected} venues, ${insights.length} characters.`);
if (notes.length) console.warn(`Daily briefing published WITH NOTES: ${notes.join("; ")}`);
