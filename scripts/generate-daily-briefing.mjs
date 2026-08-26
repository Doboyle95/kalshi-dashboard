import {readFile, writeFile} from "node:fs/promises";

import {
  withoutExcludedPreviousInsights,
  wordingFaults
} from "./daily-briefing-rules.mjs";
import {
  MAX_INSIGHTS_QUESTION_CHARS,
  apiErrorMessage,
  assertInsightsQuestionLength
} from "./daily-briefing-request.mjs";

const root = new URL("../", import.meta.url);
const endpointFile = new URL("src/chat-endpoint.json", root);
const outputFile = new URL("src/daily-briefing.json", root);
const published = JSON.parse(await readFile(endpointFile, "utf8"));

// Yesterday's briefing, read before this run overwrites it. Without it the model has no
// memory between runs and re-derives the same favourite measure every morning -- which is
// how the Kalshi bullet became parlay taker losses more or less daily.
let previousInsights = "";
try {
  previousInsights = withoutExcludedPreviousInsights(
    JSON.parse(await readFile(outputFile, "utf8")).insights
  );
} catch {
  previousInsights = "";
}
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
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${apiErrorMessage(body)}`);
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
// Percentage change alone ranks a rounding-error venue above everything else. On
// Aug 21 ForecastEx's +37.37% was ~270k contracts at 0.16% of measured volume, and it
// took the lead bullet over Kalshi moving 83M. Share is free to derive from the rows we
// already have and is what lets the briefing size a move instead of implying every
// percentage means the same thing.
//
// It is APPROXIMATE on purpose: venues report on different dates (see the lag handling
// above), so this sums each venue's own latest complete day rather than one shared
// calendar day. Good enough to rank scale, not exact enough to quote to a decimal --
// the prompt says to round it.
function anchorVolume(row) {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (/average|avg|prior|percent|pct|change|rank|behind|share/i.test(key)) continue;
    if (/volume|contract/i.test(key)) return value;
  }
  return null;
}
const anchorVolumeTotal = attempt.rows.reduce((sum, row) => sum + (anchorVolume(row) || 0), 0);

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
      : `${daysBehind} days behind — state this date explicitly`,
    approx_market_share_pct: anchorVolumeTotal > 0 && anchorVolume(row) != null
      ? Number(((anchorVolume(row) / anchorVolumeTotal) * 100).toFixed(3))
      : null
  };
});
// anchor.columns describes the model-written SELECT, so the fields added here are absent
// from it and would be dropped from the row summary /insights builds.
const anchorColumns = [
  ...(Array.isArray(anchor.columns) ? anchor.columns : []),
  ...["reporting_density", "days_behind_newest_venue", "reporting_recency", "approx_market_share_pct"]
].filter((name, index, all) => all.indexOf(name) === index);
if (attempt.fault) notes.push(attempt.fault);
if (attempt.omittedSources?.length) notes.push(`anchor SQL did not read ${attempt.omittedSources.join(", ")}`);
if (attempt.missing.length) notes.push(`anchor covered ${normalizedAnchorRows.length} of ${requiredVenues.length} venues; missing ${attempt.missing.join(", ")}`);

const editorialQuestion = [
  "Write today's Predict Charts briefing: three to five short bullets on what actually moved in prediction markets, for readers who follow the space and its overlap with sports betting. The briefing has a required shape. One bullet is Kalshi's: it normally leads with the headline -- how much traded that day against a recent baseline -- and then carries a beyond-volume figure in the same bullet, where the money went and what it did. At least two are about a venue other than Kalshi, or compare venues against each other. Choose those two kinds of bullet first, then fill the rest.",
  `The broad data service is currently updated through ${health.aggregate_through || health.raw_trades_through || "the latest available date"}.`,
  attempt.missing.length
    ? `The venue-volume figures below carry a one-week average for each venue they cover, but this run covers only ${normalizedAnchorRows.length} of ${requiredVenues.length} venues -- ${attempt.missing.join(", ")} are absent. Write from what is there and do not guess at the rest. End with one plain sentence naming the venues missing today; that is the only closing sentence allowed. Never describe a partial field as the whole industry.`
    : "The venue-volume figures below already cover all ten venues with a one-week average for each, so venue-versus-venue movement and share shifts are available to you without running any further query.",
  "Then run only the supporting context queries needed to find genuinely interesting changes. Cross-venue evidence to prefer: competitor_daily contracts and fees for the non-Kalshi platforms, prophetx_daily, cme_daily, Novig, parlay adoption at venues that identify multi-leg products, and settled-outcome accuracy where a venue has enough settled contracts. Kalshi goes far deeper than volume, and that depth is the most valuable material here: product mix, sports versus non-sports, parlay share, fee revenue, taker-side volume, taker P&L, settlement accuracy, and unusually large individual trades.",
  "Two mix requirements, both binding. At least two bullets must be about a venue other than Kalshi or must compare venues against each other -- Kalshi is the deepest tape here, not the subject of the briefing, and the venue figures alone always support a cross-venue bullet, so this never requires inventing significance. And one bullet must carry Kalshi data from beyond plain volume. ROTATE THROUGH THESE rather than settling on one -- each names the table that answers it: overall taker P&L and how it splits against parlay P&L (taker_pnl_daily, parlay_pnl_unified_daily); which individual games or events pulled the parlay money (parlay_top_games_by_volume, parlay_popular_daily, with event_titles for readable names); an unusually large single trade or a shift in trade sizes (extreme_trades_daily, trade_size_daily, parlay_trade_size_daily); the sports, non-sports and parlay split (daily_sports_vs_nonsports); taker-side dollar volume against contract volume, i.e. whether the money moved with the count (taker_notional_daily); fee revenue and the blended fee rate (daily_overall, category_daily); or house edge by leg count (parlay_house_edge_by_legs). Do not use internally defined lottery-ticket or longshot parlay classifications in this briefing; they require methodology context this short format cannot carry accurately. Nothing else in this industry is measured to that depth. Normally it rides in the same bullet as the Kalshi headline volume, after the number -- lead with what traded, then say what the money did. Give it a bullet of its own only when that figure is genuinely notable on its own terms. That bullet must cover the same recent window as the rest of the briefing: a figure for the latest reported day or the past week, set against a recent baseline. Never reach for an all-time or months-old cumulative total -- this card reports what changed, not what has accumulated. A briefing that is entirely Kalshi has failed; so has one that only ever counts contracts.",
  "Other datasets often lag the venue volume figures by a day or two: query each one's own latest complete date and use it, rather than requiring a row on the newest Kalshi date. If a query for that date comes back empty, retry against that table's MAX(date).",
  // Daniel, 2026-08-22: a venue must not become ineligible simply because its newest row
  // is not from yesterday. Novig reports about 18 days in 60 and Underdog about 34, so
  // treating "not current" as "not reportable" would quietly reduce this to the venues
  // that happen to publish daily.
  "Every row in the venue figures below carries days_behind_newest_venue and reporting_recency. A venue that is a few days behind is reporting normally, NOT missing or stale: it stays fully eligible for a bullet whenever its trend is the interesting one, and you simply name the date you are describing. Do not silently drop a venue, and do not downgrade a genuinely interesting move to a lesser one, merely because a different venue has a newer row. Only when a venue is far behind the rest should its lag itself be the point, and then say so plainly rather than omitting the venue.",
  "For Kalshi supporting tables, never use a date later than Kalshi's report date in the venue figures below; later category, mix, fee, P&L, or trade rows may be intraday partials even when they lack an is_partial column. EARLIER is fine and expected. Kalshi own depth tables routinely trail its volume row by a day: when the category, mix, fee, P&L or trade table has no complete row on that date, fall back to the latest complete date in that table and name that date in the bullet. A missing row for the newest day is a reporting lag, never a reason to drop the Kalshi bullet, and never something to tell the reader about.",
  "Kalshi books parlays inside Sports, and a parlay IS a sports contract, so an unqualified sports figure means sports INCLUDING parlays -- category_daily's Sports total, which needs no caveat. The narrower figure is the one that needs naming: daily_sports_vs_nonsports reports sports with parlays STRIPPED OUT alongside a separate parlay figure, so it runs about two and a half times smaller for the same day, and whenever you use it you must say it excludes parlays. Never set the two against each other, or against a share derived from the other, in one comparison. Use category_daily for narrower named categories such as elections, crypto, commodities or weather, and name those categories exactly.",
  previousInsights
    ? `YESTERDAY'S BRIEFING IS BELOW. Do not reuse its Kalshi angle unless today's figure for that same measure is clearly the strongest story available -- pick a different one from the rotation instead. A reader seeing the same measure every morning learns nothing new, and parlay taker losses in particular have been over-used. Do not refer to yesterday, compare against it, or mention that you have seen it; it is here only so you can choose a different angle. YESTERDAY: ${previousInsights}`
    : "",
  "Return three to five bullets, no more than 150 words in total. One sentence per bullet, two at the very most. Lead each with a short bold phrase naming the finding, then give the numbers against a sensible recent baseline. Bold only that opening phrase -- leave the figures themselves unbolded. The bold phrase must say WHY the item is here: a reader scanning only those phrases should still know what changed or was surprising. An ordinary standing is not a finding. Do not write \"Polymarket led the challengers\", \"X was the largest competitor\", \"X held second place\" or similar unless the rank itself changed or the gap became genuinely remarkable; when growth is the story, put the growth in the opening phrase instead. Do not force a topic when nothing notable happened there. Kalshi's headline contract count is rarely the most interesting figure available to you; do not open with it unless the move is genuinely unusual. Before you finish, check the draft against the two mix requirements above and rewrite a bullet if either is unmet.",
  "SIGNIFICANCE IS NOT PERCENTAGE CHANGE, and ranking by percentage is the most common way this briefing goes wrong. Every row carries approx_market_share_pct, that venue's rough share of the ten venues together. Call it market share in plain words -- \"about a 1.3% market share\", \"roughly 7% of the market\" -- which is the term the rest of the site uses. Never write \"measured venue volume\", \"measured volume\", or any similar construction; it does not tell a reader what is being measured. The same percentage means very different things at different venues: the smaller and mid-sized ones routinely swing 30-40% in a day, while the largest rarely move more than 25%, so a big percentage is often an ordinary day. Weigh two separate things before calling any move notable -- whether it is unusual for THAT venue, judged against its own recent range, and whether it is large enough to matter at industry scale. One query over that venue's last thirty reported days settles the first. These rules decide which venue MOVES are worth reporting; they do not replace the required shape stated at the top. The Kalshi bullet from beyond plain volume is still required, and Kalshi's scale means it always clears the materiality bar -- but a bullet about Kalshi's SIZE or share is not that bullet, and does not satisfy it.",
  "The LEAD bullet must clear both bars. A venue holding well under 1% of measured volume does not open the briefing on a percentage alone -- at that size even a huge percentage is a few hundred thousand contracts against billions elsewhere. This is NOT licence to fall back on the two largest venues: a smaller venue whose move is genuinely unusual FOR IT is more interesting than an ordinary day at a big one, and it still earns a bullet further down the list. When you report a small venue, give the absolute figure and round its share so the reader can size it, and never call it the sharpest move in the industry without that context. That share is APPROXIMATE -- each venue contributes its own latest reported day, so the days do not all match -- and must be written as a rounded approximation, at most one decimal and always hedged: \"about 0.2%\", \"roughly a fifth\", \"under 1% of measured volume\". Never quote it to two or more decimals, and never present it as an exact or measured market share.",
  "A Kalshi depth figure has to be judged against what is NORMAL FOR THAT MEASURE, not against yesterday, or you will report the baseline as though it were news. Parlay bettors lose money on the large majority of days, so a losing day is the expected outcome and a PROFITABLE one is the story; taker P&L, fee rates, category mix and settlement accuracy all need the same treatment. One query over that measure's last thirty to sixty days gives you its normal range and tells you whether the latest value sits inside it. If it sits inside, that measure is not today's story -- pick a different one, or let the Kalshi bullet be volume plus a plainly-stated figure without claiming significance it does not have.",
  "YOUR VERB MUST MATCH THE DATA. Do not write returned, rebounded, reversed, resumed, snapped back or any other word implying a turn unless the series actually changed direction. If it did turn, cite the days that show the turn -- not adjacent days that merely continue the trend, which describes a reversal while proving the opposite.",
  "Do not imply a cause, mechanism, or relationship unless a supporting query directly measures it. If the evidence only establishes two simultaneous changes, describe them separately rather than saying one explains the other.",
  "PLAIN LANGUAGE, and this is the thing most often got wrong. Write for someone who follows prediction markets and has never seen our database. Keep our internal vocabulary out of the prose entirely: no anchor, baseline table, supporting dataset or query, coverage note, reporting density or recency, sparse bulletin, complete or partial flags, and never name a table or a column, nor quote the value of one. A venue that reports irregularly is described that way in ordinary words -- \"CME, which reports in irregular bulletins\" -- never by repeating an internal label. Write \"its average over the past week\", not \"its prior seven-day baseline\"; write \"on Aug. 21\", not \"its latest complete reported day\". Reach for the shorter, more ordinary word every time, and if a sentence only survives with another clause bolted on, cut the clause instead. A reader should know what happened after one pass. Never narrate the reporting process, and never tell the reader what you did or did not find in the data: no sentence about what a dataset does or does not provide, what could not be measured, or what any instruction here asked of you. If a bullet will not work, write a different bullet and say nothing about the one you dropped. Mark a figure as Kalshi-only where that matters, but in plain words and inside the sentence. No headline, no note about method or coverage, no further reading.",
  "EVERY BULLET REPORTS SOMETHING THAT HAPPENED. Never spend a bullet on a quirk of the data, on how two reporting dates line up, or on why a figure might be misread. A venue reporting on a lag still belongs, per the rule above -- name the date its figure covers and report the move. What must not happen is a bullet whose subject is the gap between reporting dates rather than anything that traded.",
  "RECENT INDUSTRY REPORTING appears in the context above. Drawing on it is optional, never required, and capped at one bullet. It earns that bullet when a development from the current or previous month lines up with a movement your own figures already show -- a venue launching or opening a product, a rule or fee change, a legal or regulatory turn. Describe that development in your own words, as something that happened in the market. Never name a publication, a writer, an article or a headline, never link, and never add a further-reading line. Reporting may never supply a number, and may never be given as the cause of a movement -- state the development and the figure plainly and let the reader connect them. Ignore anything older than the current or previous month. If nothing fits, leave news out; that is the normal outcome and costs the briefing nothing."
].filter(Boolean).join(" ");

// The mix requirements are stated in the prompt, and the model honours them about half
// the time: over five runs on 2026-08-22 two drafts carried no Kalshi depth at all and one
// mentioned Kalshi only as a volume clause. Same treatment as the ten-venue gate above --
// check mechanically, correct once, publish whatever we end up with. This is a floor and
// not a grader: a lenient pass costs nothing, a false fail costs one retry.
const OTHER_VENUES = requiredVenues.filter((venue) => venue !== "Kalshi");
const KALSHI_DEPTH = /\b(fees?|revenue|p&l|pnl|profit|loss(es)?|parlays?|sports|non-sports|settled?|settlement|accuracy|takers?|makers?|mix|categor(y|ies)|trade size|stakes?|house edge|fee rate)\b/i;
const KALSHI_DEPTH_FAULT = "one bullet must carry Kalshi data from beyond plain volume, normally alongside its headline volume -- taker P&L, fee revenue, settlement accuracy, parlay economics, sports versus non-sports mix, or an unusually large trade -- for the latest reported day or the past week against a recent baseline, never an all-time or months-old cumulative total";

function mixFaults(text) {
  const bullets = text.split(/\n(?=\s*[-*])/).map((b) => b.trim()).filter(Boolean);
  const crossVenue = bullets.filter((b) => OTHER_VENUES.some((venue) => b.includes(venue))).length;
  const faults = [];
  if (crossVenue < 2) {
    faults.push("at least two bullets must be about a venue other than Kalshi, or must compare venues against each other");
  }
  if (!bullets.some((b) => /kalshi/i.test(b) && KALSHI_DEPTH.test(b))) {
    faults.push(KALSHI_DEPTH_FAULT);
  }
  return faults;
}

// mixFaults judges the shape of the briefing; wordingFaults judges whether the prose is
// entitled to the claims it makes. Both feed the one corrective retry.
function draftFaults(result) {
  const text = result?.insights || "";
  if (!text) return [];
  const sqls = [
    ...(Array.isArray(result.deeper?.evidence) ? result.deeper.evidence.map((item) => item?.sql || "") : []),
    anchor.sql || ""
  ].join("\n").toLowerCase();
  return [...mixFaults(text), ...wordingFaults(text, sqls)];
}

// The SECOND correction is deliberately more concrete than the first. Restating the rule
// is enough when the model simply forgot it; by the time it has failed twice the usual
// cause is that it could not find an angle, and repeating the rule louder does not help --
// naming the tables and the comparison does.
const ESCALATION = " Be concrete this time. Pick one table from the rotation -- taker_pnl_daily, parlay_top_games_by_volume, extreme_trades_daily, daily_sports_vs_nonsports or taker_notional_daily -- query it for Kalshi's own latest complete date, compare that figure against its average over the prior thirty reported days, and put the result in the Kalshi bullet after the headline volume.";

async function fetchInsights(correction, attemptNo = 0) {
  try {
    const question = correction?.length
      ? `${editorialQuestion} Your previous draft missed a binding requirement: ${correction.join(" Also, ")}. Rewrite it so every requirement is met, keeping the same plain language. Do not mention the requirement, the retry, or any gap in the data to the reader -- if you cannot satisfy it from what you have, query for something you can and write that bullet instead.${attemptNo >= 2 ? ESCALATION : ""}`
      : editorialQuestion;
    assertInsightsQuestionLength(question);
    console.log(
      `Daily briefing: /insights question ${question.length.toLocaleString("en-US")}/` +
      `${MAX_INSIGHTS_QUESTION_CHARS.toLocaleString("en-US")} characters.`
    );
    const deeper = await request("/insights", {
      method: "POST",
      body: JSON.stringify({
        question,
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
let faults = draftFaults(written);
// One retry on a stub answer or an unmet mix, then take what we have. The old floor was
// 120 characters and it THREW -- a short answer became no answer, which is the worse of
// the two outcomes for a card that states its own age. Neither check decides whether to
// publish; they only decide whether to try again.
if (written.insights.length < 120 || faults.length) {
  const why = written.insights.length < 120 ? `${written.insights.length} characters` : faults.join("; ");
  console.warn(`Daily briefing: first insights attempt fell short (${why}); correcting.`);
  // Up to two corrective attempts. One was not enough: on 2026-08-23 a run failed the
  // Kalshi-depth requirement on the first draft AND its retry, publishing a card that was
  // pure volume. Each attempt is one model call, and only on a day that needs it.
  for (let attemptNo = 0; attemptNo < 2 && faults.length; attemptNo++) {
    const retry = await fetchInsights(faults, attemptNo + 1);
    const retryFaults = draftFaults(retry);
    // Fewer unmet requirements wins; a tie falls back to the longer answer, which is the
    // old behaviour and the right tiebreak when the retry only rephrased.
    const better = retryFaults.length < faults.length
      || (retryFaults.length === faults.length && retry.insights.length > written.insights.length);
    if (retry.insights && better) {
      written = retry;
      faults = retryFaults;
    }
  }
}
if (faults.length) notes.push(`briefing checks unmet after retry: ${faults.join("; ")}`);
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
