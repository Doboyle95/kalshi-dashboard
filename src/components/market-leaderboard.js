// -----------------------------------------------------------------------------
// Shared per-market leaderboard
// -----------------------------------------------------------------------------
// One searchable, ranked table of individual markets, used by the Platform
// Comparison page (all venues at once) and by each venue page (that venue only).
//
// SAME IDIOM AS THE KALSHI MARKET LEADERBOARD (categories.md, C10) -- deliberately.
// Inputs.search over the rows, Inputs.table for the grid, accent-coloured chips
// driving a hidden Inputs.select, sticky sortable headers with the same arrows,
// hash-persisted filter state. Consistency across pages beats a second table
// style, and it means a reader who has learned one table has learned all of them.
//
// -----------------------------------------------------------------------------
// WHY THE COLUMN SET CHANGES BY VENUE, AND WHY THAT IS THE FEATURE
// -----------------------------------------------------------------------------
// These seven venues do not publish the same things, and the honest response is
// to show fewer columns, not to fill the gaps. Measured 2026-08-08:
//
//   venue         market name                       outcomes  winner  fees
//   Kalshi        none published -- ticker parsed    yes       yes     yes
//   Polymarket    published English question         yes       yes     yes (95%)
//   ForecastEx    published product_name             NO*       NO*     yes
//   Rothera       NONE AT ALL -- code only           yes       yes     12% of rows
//   DKeX          composed from published outcomes   yes       47%     yes
//   Underdog      decoded from the ticker            yes       NO      yes
//   Nadex         decoded from the ticker            NO        NO      yes
//
//   * ForecastEx strikes are THRESHOLD contracts, not exclusive outcomes: across
//     21,506 multi-contract events, the number settling YES is commonly 2-11, so
//     "the winner" is not a well-formed question and there is no outcome count to
//     report. What it does have is a count of CONTRACTS LISTED (2,140 for a daily
//     weather product), which is a different statistic and gets a different header.
//
// A column a venue cannot fill is ABSENT, or renders as an em dash. Nothing here
// ever invents a value, and no venue's rate, taxonomy or naming is applied to
// another venue's rows.
//
// -----------------------------------------------------------------------------
// NAME PROVENANCE IS A FIRST-CLASS COLUMN
// -----------------------------------------------------------------------------
// Four levels, and the table shows which one every row is:
//
//   published   the venue published this exact string as the market's name.
//               ForecastEx product_name; Polymarket Descriptions used verbatim.
//   composed    built from the venue's OWN published text, not invented.
//               Polymarket's factored question ("Will ... win the 2026 FIFA World
//               Cup" -- the shared wording of two published outcome descriptions);
//               DKeX's "NPB <club> vs <club> - Moneyline (date)", which is two
//               published outcome names plus a market-type label plus the
//               published settlement date.
//   derived     decoded from the ticker. The venue published no English anywhere.
//               Underdog, Nadex, and -- note -- KALSHI, whose market_leaderboard.csv
//               repeats the ticker in market_name on 1,000 of 1,000 rows, so every
//               Kalshi title on this site is produced by ticker-names.js.
//   code only   the venue publishes no name and none can be honestly decoded.
//               The cell shows the raw market code in monospace and is NEVER
//               dressed up as a name. All of Rothera; 15 Polymarket markets whose
//               outcomes are bare tokens ("Rodri", "6 Goals"); 18 ForecastEx
//               products that predate the first summary file.
//
// The column is HIDDEN when every visible row shares one value -- a column of
// identical cells is noise -- and the caption states it instead. In the
// all-venues view it always carries information, so it is always shown.
//
// -----------------------------------------------------------------------------
// WHY THERE IS NO CROSS-VENUE RANK
// -----------------------------------------------------------------------------
// `rank` is always the market's rank WITHIN ITS OWN VENUE. A blended ranking
// would be wrong three separate ways at once:
//   1. UNITS. ForecastEx counts matched PAIRS, everyone else counts contracts.
//      Its rows would read half-size against every other venue's.
//   2. WINDOWS. Underdog's file starts 2026-07-17 (22 days); ForecastEx's starts
//      2024-08-01 (737 days). An all-time ranking mostly ranks collection age.
//   3. SCALE. Kalshi's top market is 1.51bn contracts, 4.9x Polymarket's, and
//      Kalshi would simply own the first screen of any combined sort.
// So the all-venues view is a market FINDER -- one search box across every venue,
// answering "who else listed this event?" -- and it says so on the page. Sorting
// by volume is still possible, and the caption warns what that sort means.
// -----------------------------------------------------------------------------

import * as Inputs from "npm:@observablehq/inputs";
import {html} from "npm:htl";
import {hashGet, hashInput} from "./hash-state.js";

// -- coercion -----------------------------------------------------------------
// These files are read UNTYPED on purpose. d3.autoType turns the string "2026-05"
// in the `period` column into a Date, which would break every period comparison,
// and it would coerce some market codes as well. Everything is coerced here,
// explicitly, and an empty cell becomes null -- never 0, which would draw a
// missing fee as a free market.
const num = v => (v == null || v === "" || Number.isNaN(+v)) ? null : +v;
const str = v => (v == null ? "" : String(v).trim());

// A published per-side fee of exactly $0 against real volume is not a real zero:
// every venue here charges the aggressor something on every print, so a 0 means
// the number is unavailable for that market, not that trading was free. Same rule
// as competitors.md's perSideFee(), and the same rendering the Kalshi market
// leaderboard already uses (it prints "N/A" for a zero fee).
const feeOf = (v, contracts) => {
  const f = num(v);
  return (f === 0 && (contracts ?? 0) > 0) ? null : f;
};
const dateOf = v => {
  if (v instanceof Date) return Number.isNaN(+v) ? null : v;
  const s = str(v);
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00Z" : s);
  return Number.isNaN(+d) ? null : d;
};

/** Compact count: 1.23B / 45.6M / 789k. Matches categories.md C10's fmtC. */
export function fmtLbCount(n) {
  if (n == null || !Number.isFinite(+n)) return "—";
  const v = +n, a = Math.abs(v), s = v < 0 ? "-" : "";
  return s + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B"
            : a >= 1e6 ? (a / 1e6).toFixed(1) + "M"
            : a >= 1e3 ? (a / 1e3).toFixed(0) + "k"
            : String(Math.round(a)));
}

const fmtInt = n => (n == null || !Number.isFinite(+n)) ? "—" : (+n).toLocaleString("en-US");

const fmtUTCDate = d => {
  if (!d) return "—";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}/${mo}/${da}`;
};

const LABEL_TEXT = {
  published: "published",
  composed:  "composed",
  derived:   "derived",
  code:      "code only"
};

const LABEL_TITLE = {
  published: "The venue published this exact string as the market's name.",
  composed:  "Built from the venue's own published text — its outcome names and market type — not invented here.",
  derived:   "Decoded from the ticker, or taken from this site's own name table — the venue publishes no English name for this market.",
  code:      "The venue publishes no name and none can be honestly decoded. This is the raw market code, shown as a code."
};

// -----------------------------------------------------------------------------
// Venue specifications
// -----------------------------------------------------------------------------
// `map` turns one raw CSV row into the shared row shape. Every venue's quirks are
// confined to its own map function; nothing downstream branches on venue.
export const LB_VENUES = {
  kalshi: {
    key: "kalshi",
    label: "Kalshi",
    file: "market_leaderboard.csv",
    accent: "var(--accent-kalshi)",
    unit: "contracts",
    hasPeriod: false,
    outcomesHeader: "Outcomes",
    topHeader: "Busiest outcome",
    topIsCode: false,
    winnerIsCode: false,
    coverage: "All time.",
    // market_leaderboard.csv HAS a market_name column and it is the ticker
    // repeated -- 0 of 1,000 rows carry anything else (measured 2026-08-08). The
    // caller passes in bestName/fmtWinner/fmtStrike from ticker-names.js rather
    // than this module importing them, so the six venue pages that never show
    // Kalshi do not pay for a 48 KB naming table.
    nameNote: "Kalshi publishes no market title in this file — the ticker is repeated in the name column on every row — so these names are decoded from the ticker by <code>components/ticker-names.js</code>, the same parser the Categories page uses. The two tables cannot disagree.",
    map: (r, o) => ({
      marketKey: str(r.market_key),
      name: o.nameFn ? str(o.nameFn(r)) : "",
      label: "derived",
      category: str(r.kalshi_category),
      marketType: "",
      contracts: num(r.contracts),
      fees: feeOf(r.fees_total, num(r.contracts)),
      outcomes: num(r.n_outcomes),
      winner: o.winnerFn ? str(o.winnerFn(r)) : str(r.winner),
      top: o.topFn ? str(o.topFn(str(r.top_outcome), str(r.market_key))) : str(r.top_outcome),
      lastTrade: dateOf(r.last_trade_date),
      period: "all"
    })
  },

  polymarket: {
    key: "polymarket",
    label: "Polymarket US",
    file: "polymarket_market_leaderboard.csv",
    accent: "var(--accent-polymarket)",
    unit: "contracts",
    hasPeriod: false,
    outcomesHeader: "Outcomes",
    topHeader: "Busiest outcome",
    topIsCode: false,
    winnerIsCode: false,
    coverage: "Since 2025-10-29.",
    nameNote: "Names are Polymarket's own published question text. Where a market's outcomes share one question, the shared wording is shown with the outcome factored out — <em>Will … win the 2026 FIFA World Cup</em> — and that row is marked <strong>composed</strong>. 15 markets describe their outcomes with bare tokens (<em>Rodri</em>, <em>6 Goals</em>) and were never given a question by the venue; those show their market code, not a name.",
    map: r => {
      const nm = str(r.market_name);
      return {
        marketKey: str(r.market_key),
        name: nm,
        label: !nm ? "code" : (nm.includes(" ... ") ? "composed" : "published"),
        category: str(r.category),
        marketType: "",
        contracts: num(r.contracts),
        fees: feeOf(r.fees_total, num(r.contracts)),
        outcomes: num(r.n_outcomes),
        winner: str(r.winner),
        top: str(r.top_outcome),
        lastTrade: dateOf(r.last_trade_date),
        period: "all"
      };
    }
  },

  nadex: {
    key: "nadex",
    label: "Crypto.com/Nadex",
    shortLabel: "Nadex",
    file: "nadex_market_leaderboard.csv",
    accent: "var(--accent-nadex)",
    unit: "contracts",
    hasPeriod: false,
    outcomesHeader: null,      // the bulletin has no outcome grain at all
    topHeader: null,
    coverage: "Since 2024-12-23.",
    nameNote: "Nadex publishes no market name — only a ticker such as <code>NFL-00001-260208-M</code>, in which the five-digit number is a within-day counter, not a fixture id. Every name here is decoded from that ticker and carries no team, player or event identity, because none is published. This is the least readable venue on the site and the table does not pretend otherwise.",
    map: r => {
      const nm = str(r.market_name);
      return {
        marketKey: str(r.market_key),
        name: nm,
        label: nm ? "derived" : "code",
        category: str(r.category),
        marketType: "",
        contracts: num(r.contracts),
        fees: feeOf(r.fees_total, num(r.contracts)),
        outcomes: null,
        winner: "",
        top: "",
        lastTrade: dateOf(r.last_trade_date),
        period: "all"
      };
    }
  },

  forecastex: {
    key: "forecastex",
    label: "ForecastEx",
    file: "forecastex_market_leaderboard.csv",
    accent: "var(--accent-forecastex)",
    // NOT contracts. ForecastEx reports matched PAIRS, and this file follows the
    // same convention as forecastex_categories_daily.csv and competitor_daily.csv
    // so the leaderboard agrees with every other ForecastEx number on the site.
    unit: "pairs",
    hasPeriod: true,
    outcomesHeader: "Contracts listed",
    topHeader: "Busiest contract",
    topIsCode: true,
    winnerIsCode: false,
    coverage: "Since 2024-08-01. Volume is matched PAIRS, not contracts — the same convention as every other ForecastEx figure on this site.",
    nameNote: "Names are ForecastEx's own published <code>product_name</code>. 18 products traded before the venue's first summary file (2025-01-01) and were never named anywhere; those show their product code. <strong>Contracts listed</strong> is not an outcome count — ForecastEx strikes are thresholds, and several commonly settle YES together, so this venue has no single winner and none is shown.",
    map: r => {
      const nm = str(r.market_name);
      return {
        marketKey: str(r.market_key),
        name: nm,
        label: nm ? "published" : "code",
        category: str(r.category),
        marketType: str(r.venue_category),
        contracts: num(r.contracts),
        fees: feeOf(r.fees_total, num(r.contracts)),
        outcomes: num(r.n_contracts),
        winner: "",
        top: str(r.top_outcome),
        lastTrade: dateOf(r.last_trade_date),
        period: str(r.period) || "all"
      };
    }
  },

  rothera: {
    key: "rothera",
    label: "Rothera",
    file: "rothera_market_leaderboard.csv",
    accent: "var(--accent-rothera)",
    unit: "contracts",
    hasPeriod: true,
    outcomesHeader: "Outcomes",
    topHeader: "Busiest outcome",
    topIsCode: true,
    winnerIsCode: true,
    coverage: "Since 2026-05-21 only — 78 days. \"All time\" means far less here than on any other venue.",
    nameNote: "<strong>Rothera publishes no market name at all.</strong> <code>product</code> is a mnemonic code (<code>MWCADVNCE-26RO16ARGEGY</code>) and there is no English anywhere in the feed, so this table shows the code and stops. Filling the column would mean shipping about a thousand hand-written guesses as if they were venue data. Outcome and winner columns are the venue's own symbols, for the same reason.",
    map: r => ({
      marketKey: str(r.market_key),
      name: "",                       // there is nothing to put here. See above.
      label: "code",
      category: str(r.category),
      marketType: "",
      contracts: num(r.contracts),
      fees: feeOf(r.fees_total, num(r.contracts)),
      outcomes: num(r.n_outcomes),
      winner: str(r.winner),
      top: str(r.top_outcome),
      lastTrade: dateOf(r.last_trade_date),
      period: str(r.period) || "all"
    })
  },

  dkex: {
    key: "dkex",
    label: "DKeX",
    file: "dkex_market_leaderboard.csv",
    accent: "var(--accent-dkex)",
    unit: "contracts",
    hasPeriod: false,
    outcomesHeader: "Outcomes",
    topHeader: "Busiest outcome",
    topIsCode: false,
    winnerIsCode: false,
    coverage: "Since 2026-06-11.",
    nameNote: "DKeX publishes an English name per <em>outcome</em> in its daily settlement report, never per market. Each name here is <strong>composed</strong> from that published text: the two clubs' own published outcome names, the market type, and the published settlement date — which is not the same as the report's maturity, since DKeX stamps a placeholder maturity on races. Five race markets have no club pair to compose from and fall back to a ticker decode.",
    map: r => {
      const nm = str(r.market_name);
      const src = str(r.name_source);
      return {
        marketKey: str(r.market_key),
        name: nm,
        label: !nm ? "code" : (src === "derived_from_published_outcomes" ? "composed" : "derived"),
        category: str(r.category),
        marketType: str(r.market_type),
        contracts: num(r.contracts),
        fees: feeOf(r.fees_total, num(r.contracts)),
        outcomes: num(r.n_outcomes),
        winner: str(r.winner),
        top: str(r.top_outcome),
        lastTrade: dateOf(r.last_trade_date),
        period: "all"
      };
    }
  },

  underdog: {
    key: "underdog",
    label: "Underdog",
    file: "underdog_market_leaderboard.csv",
    accent: "var(--accent-underdog)",
    unit: "contracts",
    hasPeriod: false,
    outcomesHeader: "Outcomes",
    topHeader: "Busiest outcome",
    topIsCode: false,
    winnerIsCode: false,
    coverage: "Since 2026-07-17 only — 22 days. Parlay tickets are excluded (8.45% of the venue's contracts): a bespoke basket keyed by a 19-digit hash cannot be ranked or searched against a repeatedly-traded game line.",
    nameNote: "Underdog publishes no English name — the raw feed carries a ticker and nothing else — so every name here is decoded from that ticker. Club codes are left as the venue's own two-to-four letter codes (<code>BOS</code>, <code>LAD</code>); expanding them to team names would need a hand-built lookup, which would be invention. Three of 732 markets could not be split into a club pair and keep the raw code. Underdog publishes no settlement price either, so there is no winner column.",
    map: r => {
      const nm = str(r.market_name);
      return {
        marketKey: str(r.market_key),
        name: nm,
        label: nm ? "derived" : "code",
        category: str(r.category),
        marketType: str(r.market_type),
        contracts: num(r.contracts),
        fees: feeOf(r.fees_total, num(r.contracts)),
        outcomes: num(r.n_outcomes),
        winner: "",
        top: str(r.top_outcome),
        lastTrade: dateOf(r.last_trade_date),
        period: "all"
      };
    }
  }
};

/** Page order: the order the Platform Comparison hero introduces the venues. */
export const LB_VENUE_ORDER = ["kalshi", "polymarket", "forecastex", "nadex", "rothera", "dkex", "underdog"];

// -----------------------------------------------------------------------------
// normalizeLeaderboard(venueKey, rows, opts)
// -----------------------------------------------------------------------------
// Returns [] for a missing, empty or header-only file rather than throwing, so a
// page renders its explanatory placeholder instead of failing the build for
// everyone. Ranks are assigned WITHIN (venue, period) by contracts descending.
export function normalizeLeaderboard(venueKey, rows, opts = {}) {
  const spec = LB_VENUES[venueKey];
  if (!spec) throw new Error(`market-leaderboard: unknown venue "${venueKey}"`);
  const out = [];
  for (const r of rows ?? []) {
    if (!r) continue;
    let m;
    try {
      m = spec.map(r, opts);
    } catch {
      continue;                       // one malformed row never takes the page down
    }
    if (!m.marketKey) continue;
    if (m.contracts == null) continue; // a row with no volume cannot be ranked
    out.push({
      ...m,
      venue: spec.key,
      venueLabel: spec.shortLabel ?? spec.label,
      unit: spec.unit
    });
  }
  // Rank within (venue, period).
  const byPeriod = new Map();
  for (const d of out) {
    if (!byPeriod.has(d.period)) byPeriod.set(d.period, []);
    byPeriod.get(d.period).push(d);
  }
  for (const group of byPeriod.values()) {
    group.sort((a, b) => b.contracts - a.contracts);
    group.forEach((d, i) => { d.rank = i + 1; });
  }
  return out;
}

// -- one-time stylesheet ------------------------------------------------------
// Mirrors the .mkt-table rules on categories.md, but written against
// `thead th:not(:empty)` instead of fixed nth-child positions, because this table
// drops columns a venue cannot fill and the positions therefore move.
function lbStyles() {
  return html`<style>
  .lb-table table { font-size: 14px; border-collapse: collapse; width: 100%; }
  .lb-table td, .lb-table th { padding: 0.6em 0.7em; }
  .lb-table tr { height: 2.6em; }
  /* Inputs.table renders an empty leading th/td when select:false; collapse it. */
  .lb-table th:first-child, .lb-table td:first-child { padding: 0 !important; width: 0; }
  .lb-table thead th:not(:empty) {
    cursor: pointer; user-select: none;
    position: sticky; top: 0;
    background: var(--theme-background, #fff);
    z-index: 1;
  }
  .lb-table thead th:not(:empty):hover { color: var(--accent-kalshi, #00C2A8); }
  /* Literal ↕ ↑ ↓ rather than the CSS numeric escapes categories.md uses. Inside a
     tagged template the backslash form is one transcription slip away from
     shipping a visible backslash — the exact class of bug that put a literal
     an escaped newline in a chart tooltip on 2026-08-05. The characters render identically. */
  .lb-table thead th:not(:empty)::after { content: " ↕"; opacity: 0.35; font-size: 0.85em; }
  .lb-table thead th[aria-sort="ascending"]::after  { content: " ↑"; opacity: 1; color: var(--accent-kalshi, #00C2A8); }
  .lb-table thead th[aria-sort="descending"]::after { content: " ↓"; opacity: 1; color: var(--accent-kalshi, #00C2A8); }
  /* Inputs.table draws its own sort caret in a leading <span>; hide it so it
     does not double up with the arrows above (same fix as .mkt-table). */
  .lb-table thead th > span:first-child { display: none; }
  .lb-table td.lb-market-cell { white-space: normal !important; vertical-align: middle; }
  .lb-name {
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; line-height: 1.2; max-height: 2.4em;
  }
  .lb-code {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.82em;
    color: var(--text-muted, #777);
    word-break: break-all;
  }
  .lb-venue-pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.78em; white-space: nowrap;
  }
  .lb-venue-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .lb-src {
    font-size: 0.72em; letter-spacing: 0.02em; text-transform: uppercase;
    color: var(--text-muted, #777); white-space: nowrap; cursor: help;
    border-bottom: 1px dotted currentColor;
  }
  .lb-src[data-src="code"] { color: var(--accent-warning, #b45309); }
  .lb-meta { font-size: 0.82em; color: var(--text-faint, #888); margin: 0.3rem 0 0.6rem; }
  .lb-empty { margin: 0.6rem 0; }
</style>`;
}

let stylesInstalled = false;

// The venue captions below are author-written HTML held in this module (never a
// value out of a CSV), so they are set with innerHTML rather than pushed through
// htl, which would escape the markup. Interpolated DATA never goes through here.
function richNote(markup, {cls = "chart-note", tag = "p"} = {}) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = markup;
  return el;
}

// -----------------------------------------------------------------------------
// marketLeaderboard({venues, ...}) -> HTMLElement
// -----------------------------------------------------------------------------
// Self-contained: it builds its own Inputs and wires them, so a page adds one
// display() call rather than five cells. Pass ONE venue for a venue page, or
// several for the cross-venue finder.
//
//   venues        [{spec, rows}] -- rows already through normalizeLeaderboard
//   hashPrefix    prefix for the URL-hash keys, so two tables on one site do not
//                 fight over the same key
//   rowsPerPage   default 50, same as the Kalshi table
//   emptyNote     HTML string shown when nothing has been published yet
export function marketLeaderboard({
  venues = [],
  hashPrefix = "lb",
  rowsPerPage = 50,
  emptyNote = null
} = {}) {
  const root = document.createElement("div");
  root.className = "lb-wrap";
  if (!stylesInstalled) { root.append(lbStyles()); stylesInstalled = true; }

  // GRACEFUL DEGRADATION. A venue whose file is present but empty (producer has
  // not run yet, or is mid-backfill) is dropped from the picker entirely rather
  // than rendering as a broken empty tab.
  const live = venues.filter(v => v && v.rows && v.rows.length);
  const missing = venues.filter(v => !live.includes(v)).map(v => v?.spec?.label).filter(Boolean);

  if (!live.length) {
    root.append(richNote(
      emptyNote ??
      "The per-market leaderboard has not been published yet — the file is present but has no rows. It fills in on the next competitor rebuild; nothing else on this page is affected.",
      {cls: "chart-note lb-empty"}
    ));
    return root;
  }
  if (missing.length) {
    root.append(html`<p class="chart-note"><strong>${missing.join(", ")}</strong>
      ${missing.length === 1 ? "has" : "have"} no rows yet, so ${missing.length === 1 ? "it is" : "they are"}
      not offered below. This is what a not-yet-backfilled venue looks like, not an error.</p>`);
  }

  const multi = live.length > 1;
  const allRows = live.flatMap(v => v.rows);

  // -- controls ---------------------------------------------------------------
  // Search is built ONCE over every row of every venue and every period, and the
  // venue/period/category filters are applied to its OUTPUT. Rebuilding the
  // search input whenever the venue changes would drop the user's query and the
  // caret with it.
  const search = Inputs.search(allRows, {
    placeholder: multi ? "Search every venue's markets…" : "Search markets…",
    columns: ["venueLabel", "marketKey", "name", "category", "marketType", "winner", "top"]
  });

  const venueKeys = live.map(v => v.spec.key);
  const venueInput = multi
    ? hashInput(`${hashPrefix}_venue`, Inputs.select(
        ["all", ...venueKeys],
        {
          label: "Venue",
          value: venueKeys.includes(hashGet(`${hashPrefix}_venue`, "all")) ? hashGet(`${hashPrefix}_venue`, "all") : "all",
          format: k => k === "all" ? "All venues" : LB_VENUES[k].label
        }
      ))
    : null;

  const periodInput = document.createElement("div");   // replaced per venue below
  const categoryInput = document.createElement("div");
  const controls = html`<div class="control-strip lb-controls"></div>`;
  const tableBox = document.createElement("div");
  const captionBox = document.createElement("div");

  const specOf = k => live.find(v => v.spec.key === k)?.spec ?? null;
  const rowsOf = k => live.find(v => v.spec.key === k)?.rows ?? [];

  let selectedVenue = venueInput ? venueInput.value : venueKeys[0];
  let selectedPeriod = "all";
  let selectedCategory = "All";

  // Period / category selects are rebuilt when the venue changes, because their
  // option lists come from that venue's own data. A venue's taxonomy is its own:
  // Kalshi says "Sports", Polymarket says "Soccer", Rothera says "Basketball"
  // where everyone else says "Basketball (pro)". They are never merged.
  let periodSelect = null, categorySelect = null;

  function rebuildScopedControls() {
    const single = selectedVenue !== "all";
    const spec = single ? specOf(selectedVenue) : null;

    periodInput.replaceChildren();
    periodSelect = null;
    if (single && spec?.hasPeriod) {
      const periods = [...new Set(rowsOf(selectedVenue).map(d => d.period))]
        .filter(p => p !== "all").sort().reverse();
      if (periods.length) {
        const want = hashGet(`${hashPrefix}_period`, "all");
        selectedPeriod = (want === "all" || periods.includes(want)) ? want : "all";
        periodSelect = hashInput(`${hashPrefix}_period`, Inputs.select(["all", ...periods], {
          label: "Period",
          value: selectedPeriod,
          format: p => p === "all" ? "All time" : p
        }));
        periodSelect.addEventListener("input", () => { selectedPeriod = periodSelect.value; rebuildCategoryControl(); render(); });
        periodInput.append(periodSelect);
      }
    } else {
      // With several venues in view a month filter would silently do nothing to
      // the four venues that have no period column, so it is not offered.
      selectedPeriod = "all";
    }

    rebuildCategoryControl();
  }

  // Category options are scoped to the selected venue AND the selected period,
  // so a period change has to rebuild them too -- see the period listener above.
  // Kept separate from rebuildScopedControls() deliberately: calling that from
  // the period listener would replaceChildren() the very select whose input
  // event is being handled, and re-read the period back out of the hash.
  function rebuildCategoryControl() {
    const single = selectedVenue !== "all";
    categoryInput.replaceChildren();
    categorySelect = null;
    if (single) {
      const cats = [...new Set(rowsOf(selectedVenue).filter(d => d.period === selectedPeriod).map(d => d.category).filter(Boolean))].sort();
      if (cats.length > 1) {
        selectedCategory = cats.includes(selectedCategory) ? selectedCategory : "All";
        categorySelect = Inputs.select(["All", ...cats], {label: "Category", value: selectedCategory});
        categorySelect.addEventListener("input", () => { selectedCategory = categorySelect.value; render(); });
        categoryInput.append(categorySelect);
      } else {
        selectedCategory = "All";
      }
    } else {
      selectedCategory = "All";
    }
  }

  // -- venue chips (the categories.md legend idiom, one chip per venue) --------
  const chipBar = html`<div class="mkt-legend" role="tablist" aria-label="Filter by venue"></div>`;
  function renderChips() {
    if (!multi) return;
    const chips = [["all", null], ...live.map(v => [v.spec.key, v.spec.accent])];
    chipBar.replaceChildren(...chips.map(([key, accent]) => {
      const active = selectedVenue === key;
      const label = key === "all" ? "All venues" : LB_VENUES[key].label;
      const style = accent
        ? `border-color:${accent};background:color-mix(in srgb, ${accent} ${active ? "26%" : "10%"}, transparent);font-weight:${active ? "600" : "400"};color:inherit;`
        : "";
      return html`<button type="button" class="mkt-legend-chip" style="${style}"
        aria-pressed="${active}" data-venue="${key}">
        <span class="lb-venue-dot" style="background:${accent || "linear-gradient(135deg,#00C2A8,#3B7DD8,#F97316)"}"></span>
        <span>${label}</span>
      </button>`;
    }));
    chipBar.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        if (venueInput.value === b.dataset.venue) return;
        venueInput.value = b.dataset.venue;
        venueInput.dispatchEvent(new Event("input", {bubbles: true}));
      });
    });
  }

  if (venueInput) {
    venueInput.addEventListener("input", () => {
      selectedVenue = venueInput.value;
      rebuildScopedControls();
      renderChips();
      render();
    });
  }

  // -- the table --------------------------------------------------------------
  function render() {
    const single = selectedVenue !== "all";
    const spec = single ? specOf(selectedVenue) : null;

    const view = (search.value ?? allRows).filter(d =>
      (!single || d.venue === selectedVenue) &&
      d.period === (single && spec?.hasPeriod ? selectedPeriod : "all") &&
      (selectedCategory === "All" || d.category === selectedCategory)
    );

    // Which columns carry information in THIS view? A column no visible row can
    // fill is dropped, not shown as a stripe of em dashes.
    //
    // NOTE FOR FUTURE EDITORS: Inputs.table SKIPS a cell whose value is null or
    // undefined -- `if (!defined(value)) continue;` in its appendRow -- so the
    // format function is never called for one, and a `v == null ? "—" : ...`
    // branch below is unreachable for genuinely absent data. An absent number
    // therefore renders as a BLANK cell, which is why the captions say in words
    // that a blank means unpublished rather than zero. Do not "fix" this by
    // substituting a string for the null: the column would then sort as text.
    const any = f => view.some(f);
    const labelValues = new Set(view.map(d => d.label));
    const cols = [];
    const header = {}, format = {}, align = {}, widths = {};

    cols.push("rank");
    header.rank = "#"; align.rank = "right"; widths.rank = 46;
    format.rank = d => d;

    if (!single) {
      cols.push("venueLabel");
      header.venueLabel = "Venue"; widths.venueLabel = 116;
      format.venueLabel = (v, i, data) => {
        const accent = LB_VENUES[data[i].venue]?.accent ?? "currentColor";
        return html`<span class="lb-venue-pill"><span class="lb-venue-dot" style="background:${accent}"></span>${v}</span>`;
      };
    }

    cols.push("name");
    header.name = view.every(d => !d.name) ? "Market code" : "Market";
    widths.name = single ? 380 : 320;
    format.name = (v, i, data) => {
      const d = data[i];
      const provenance = LABEL_TITLE[d.label];
      // Tooltip: real newlines via join("\n"), the same construction every Plot
      // tip on this site uses. Never the double-escaped form, which shipped on
      // 2026-08-05 and rendered a visible backslash-n in the tip.
      const title = [d.name || d.marketKey, d.marketKey, provenance].filter(Boolean).join("\n");
      const cell = d.name
        ? html`<div class="lb-name" title=${title}>${d.name}</div>`
        : html`<code class="lb-code" title=${title}>${d.marketKey}</code>`;
      cell.classList.add("lb-market-cell");
      return cell;
    };

    // The provenance column earns its place only when the view mixes levels.
    if (labelValues.size > 1) {
      cols.push("label");
      header.label = "Label"; widths.label = 96;
      format.label = v => html`<span class="lb-src" data-src=${v} title=${LABEL_TITLE[v] ?? ""}>${LABEL_TEXT[v] ?? v}</span>`;
    }

    if (single && any(d => d.marketType)) {
      cols.push("marketType");
      header.marketType = spec.key === "forecastex" ? "Venue category" : "Type";
      widths.marketType = 130;
    }

    if (!single || any(d => d.category)) {
      cols.push("category");
      header.category = "Category"; widths.category = 132;
      format.category = v => v || "—";
    }

    cols.push("lastTrade");
    header.lastTrade = "Last trade"; widths.lastTrade = 96;
    format.lastTrade = fmtUTCDate;

    cols.push("contracts");
    // Kalshi bills contracts; ForecastEx reports matched pairs. In the all-venues
    // view the two share a column, so the unit is stamped on the pair rows
    // themselves -- there is no honest single header for a mixed column.
    header.contracts = single
      ? (spec.unit === "pairs" ? "Volume (matched pairs)" : "Volume (contracts)")
      : "Volume";
    align.contracts = "right"; widths.contracts = 128;
    format.contracts = (v, i, data) =>
      fmtLbCount(v) + (!single && data[i].unit === "pairs" ? " pairs" : "");

    if (any(d => d.fees != null)) {
      cols.push("fees");
      header.fees = "Fees (one side)"; align.fees = "right"; widths.fees = 120;
      format.fees = v => v == null ? "—" : "$" + fmtLbCount(v);
    }

    if (any(d => d.outcomes != null)) {
      cols.push("outcomes");
      // ForecastEx's count is CONTRACTS LISTED, not outcomes, and must never be
      // relabelled as outcomes or shared an axis with Kalshi's. In the mixed view
      // it is therefore left blank rather than folded into an "Outcomes" column.
      header.outcomes = single ? (spec.outcomesHeader ?? "Outcomes") : "Outcomes";
      align.outcomes = "right"; widths.outcomes = 92;
      format.outcomes = (v, i, data) =>
        (!single && data[i].venue === "forecastex") ? "—" : fmtInt(v);
    }

    if (any(d => d.winner)) {
      cols.push("winner");
      header.winner = "Winner"; widths.winner = 168;
      format.winner = (v, i, data) => {
        if (!v) return "—";
        const isCode = LB_VENUES[data[i].venue]?.winnerIsCode;
        return isCode ? html`<code class="lb-code">${v}</code>` : html`<span title=${v}>${v}</span>`;
      };
    }

    if (any(d => d.top)) {
      cols.push("top");
      header.top = single ? (spec.topHeader ?? "Busiest outcome") : "Busiest outcome";
      widths.top = 168;
      format.top = (v, i, data) => {
        if (!v) return "—";
        const isCode = LB_VENUES[data[i].venue]?.topIsCode;
        return isCode ? html`<code class="lb-code">${v}</code>` : html`<span title=${v}>${v}</span>`;
      };
    }

    tableBox.replaceChildren();
    captionBox.replaceChildren();

    if (!view.length) {
      tableBox.append(html`<p class="chart-note">No markets match that search in this view. Clear the search box, or switch venue.</p>`);
      return;
    }

    const tbl = Inputs.table(view, {
      columns: cols, header, format, align, width: widths,
      sort: "rank", reverse: false, rows: rowsPerPage, select: false
    });
    tbl.classList.add("lb-table");
    tableBox.append(tbl);

    // -- computed captions ----------------------------------------------------
    // Concentration is measured on what is actually on screen, so switching the
    // period control changes the sentence. Nothing here is a hardcoded claim that
    // can go stale.
    const total = view.reduce((s, d) => s + (d.contracts ?? 0), 0);
    const byCat = new Map();
    for (const d of view) byCat.set(d.category || "—", (byCat.get(d.category || "—") ?? 0) + (d.contracts ?? 0));
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const topRow = view.reduce((b, d) => (d.contracts ?? 0) > (b.contracts ?? 0) ? d : b, view[0]);

    const bits = [];
    if (single) {
      bits.push(html`<span>${fmtInt(view.length)} market${view.length === 1 ? "" : "s"} shown ·
        ${fmtLbCount(total)} ${spec.unit === "pairs" ? "matched pairs" : "contracts"} in this view</span>`);
    } else {
      // Deliberately NO summed volume here. Adding ForecastEx's matched pairs to
      // everyone else's contracts would produce a number with no unit, which is
      // the mistake this whole view is built to avoid.
      const venuesShown = new Set(view.map(d => d.venue)).size;
      bits.push(html`<span>${fmtInt(view.length)} market${view.length === 1 ? "" : "s"} shown across
        ${venuesShown} venue${venuesShown === 1 ? "" : "s"} — not totalled, because these venues do not share a unit</span>`);
    }
    if (single && topCat && total > 0 && topCat[1] / total >= 0.4) {
      bits.push(html`<span><strong>${topCat[0]}</strong> is ${(100 * topCat[1] / total).toFixed(0)}% of it${
        spec.hasPeriod && selectedPeriod === "all" ? " — use the period control above to see a month without it" : ""}</span>`);
    }
    if (single && topRow && total > 0 && (topRow.contracts ?? 0) / total >= 0.15) {
      bits.push(html`<span>and one market, <strong>${topRow.name || topRow.marketKey}</strong>, is ${(100 * topRow.contracts / total).toFixed(0)}% on its own</span>`);
    }
    if (!single) {
      // C6: the per-venue coverage note is emitted only in single-venue mode, so
      // without this the mixed view never says it is a top slice, and a reader who
      // cannot find a mid-sized market concludes the venue never listed it.
      bits.push(html`<span>Each venue contributes its largest markets only (top 1,000 for Kalshi, Polymarket US, Crypto.com/Nadex and DKeX; all markets for ForecastEx, Rothera and Underdog Exchange), so an absent market may simply be below that cut.</span>`);
      bits.push(html`<span><strong>#</strong> is the market's rank <em>within its own venue</em>, so the default order interleaves the venues and the first screen is each venue's biggest market side by side. There is deliberately no cross-venue ranking: ForecastEx counts matched pairs where the others count contracts, these files start anywhere from 2024-08 to 2026-07, and Kalshi's largest market is 4.9× Polymarket US's. Sorting by volume here compares venues of different ages in different units.</span>`);
      bits.push(html`<span>An empty fee or outcome cell means the venue does not publish that number for that market — never that it is zero.</span>`);
    }
    // flatMap, not map: htl renders a FLAT array of nodes and strings, but a
    // nested array stringifies to "[object HTMLSpanElement]".
    captionBox.append(html`<div class="lb-meta">${bits.flatMap((b, i) => i ? [" · ", b] : [b])}</div>`);

    if (single) {
      captionBox.append(richNote(
        `${spec.nameNote}<br><strong>Coverage.</strong> ${spec.coverage} ` +
        "This is a ranked top slice, not the whole venue — any venue total belongs to that venue's own daily file, never to a sum of this table."
      ));
    }
  }

  // -- assemble ---------------------------------------------------------------
  rebuildScopedControls();
  renderChips();
  if (venueInput) controls.append(venueInput);
  controls.append(periodInput, categoryInput);
  search.addEventListener("input", render);

  if (multi) root.append(chipBar);
  root.append(search, controls, html`<div class="lb-meta">Tip: click any column header to sort. Click again to reverse.</div>`, tableBox, captionBox);
  render();
  return root;
}
