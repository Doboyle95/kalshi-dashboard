import {readFileSync, readdirSync} from "node:fs";

// 2026-08-07 SELF-HEAL: prefer src/chat-endpoint.json, which the VM rewrites and pushes
// whenever the Cloudflare Quick Tunnel is assigned a new hostname (KalshiData
// scripts/publish_chat_endpoint.py, on a 5-min timer). Without this, the endpoint came
// only from a GitHub secret and a human had to re-paste it after every tunnel restart --
// in practice the chat page just stayed broken.
//
// Read HERE, in Node at build time -- NOT in the browser. The first attempt did this in
// chat.md with a top-level `await FileAttachment("chat-endpoint.json").json()`; the cell
// never resolved and the Ask Data panel rendered as an empty placeholder. That is the
// same class of failure as the process.env incident this file already warns about below.
// There was never anything to gain from the runtime read: Framework content-hashes the
// file into its own name, so a changed endpoint needs a rebuild either way. The Quick
// Tunnel publisher performs that endpoint-only rebuild today; the named tunnel makes
// the endpoint stable and removes that recurring Git dependency.
//
// Precedence: published file -> env var -> "" (chat.md then falls back to localhost, so
// local dev is unchanged). try/catch so a missing or malformed file can never fail the
// build -- it just degrades to the previous env-var behaviour.
const publishedChatEndpoint = (() => {
  try {
    const parsed = JSON.parse(
      readFileSync(new URL("./src/chat-endpoint.json", import.meta.url), "utf-8")
    );
    return {api: parsed.api ?? "", token: parsed.token ?? ""};
  } catch {
    return {api: "", token: ""};
  }
})();
// KALSHI_SITE_ORIGIN is set ONLY by the VM-side build (deploy/dashboard-site), which
// serves the site same-origin with the data and chat endpoints. Unset in Actions, so
// the GitHub Pages build is bit-for-bit unchanged.
//
// ⚠ Do NOT reorder the rest: the published file must keep winning over CHAT_API_URL.
// ⚠ This single value moves the DATA endpoint and the CHAT endpoint together --
// components/remote-data.js browserEndpoint() reads the same window.__CHAT_API__ that
// chat.md uses. You cannot have same-origin data with cross-origin chat.
const CHAT_API = process.env.KALSHI_SITE_ORIGIN || publishedChatEndpoint.api || process.env.CHAT_API_URL || "";
const CHAT_TOKEN = publishedChatEndpoint.token || process.env.CHAT_TOKEN || "";

// ── Venue deep dives: one sidebar row per venue, modules in-page ─────────────
// Framework's `pages` supports exactly ONE level of nesting — normalizeSection()
// gives every section leaf pages, never sub-sections — so "Venue Deep Dives →
// Kalshi → Activity" cannot be expressed in the sidebar at all. Before this the
// section carried 18 flat rows, 7 of them Kalshi's, with nothing to show which
// rows belonged together.
//
// The third level lives in the page header instead. `header` accepts a FUNCTION
// of {title, data, path} (see markdown.js getHtml) which Framework calls in NODE
// at BUILD TIME, once per page. That matters twice over:
//   * it emits plain <a> links, so it is NOT an Observable cell and cannot fail
//     silently the way a cell with an unresolved input does (cf. the chat.md
//     localStorage incident) — a bad map here fails the build, loudly;
//   * it keeps the config read in Node, per the rule this file already documents.
// A page can override or suppress it with `header:` in its own front matter,
// which getHtml checks before calling this.
//
// hrefs are written ROOT-RELATIVE on purpose: getHtml runs rewriteHtmlPaths() to
// make them page-relative, then renderHeader runs rewriteHtml() → resolveLink()
// to apply `base`. Keeping them base-agnostic here is what lets one build serve
// from both /kalshi-dashboard/ and a domain root.
const VENUES = [
  {name: "Kalshi", accent: "kalshi", tabs: [
    ["Activity", "/volume"],
    ["Products", "/categories"],
    ["Trading behavior", "/taker"],
    ["Economics", "/fees"],
    ["Outcomes", "/taker-pnl"],
    ["Parlays", "/parlay-analytics"],
    ["Parlay outcomes", "/parlay"]
  ]},
  // /polymarket-calibration was built and URL-reachable but absent from every nav.
  // It is a live page, so it becomes Polymarket's Outcomes tab rather than staying
  // orphaned. Every page now has a home in SITE_MAP below; SIX sit in its "Unfiled"
  // group pending a keep-or-cut decision -- calibration-venues and competitors are
  // "has moved" tombstones, and bet-types, calibration, pnl-venues and robinhood are
  // undecided. (An earlier version of this comment listed five and then said "two are
  // tombstones" -- the two were the ones it had omitted.)
  {name: "Polymarket US", accent: "polymarket", tabs: [
    ["Activity", "/polymarket"],
    ["Outcomes", "/polymarket-calibration"]
  ]},
  {name: "ForecastEx", accent: "forecastex", tabs: [["Activity", "/forecastex"]]},
  {name: "DKeX", accent: "dkex", tabs: [["Activity", "/dkex"]]},
  {name: "Underdog Exchange", accent: "underdog", tabs: [["Activity", "/underdog"]]},
  {name: "Crypto.com/Nadex", accent: "nadex", tabs: [["Activity", "/nadex"]]},
  {name: "ProphetX", accent: null, tabs: [["Activity", "/prophetx"]]},
  {name: "Novig", accent: null, tabs: [
    ["Activity", "/novig"],
    ["Outcomes", "/novig-outcomes"]
  ]},
  {name: "Rothera", accent: "rothera", tabs: [["Activity", "/rothera"]]},
  {name: "CME", accent: "cme", tabs: [["Activity", "/cme"]]}
];

const escapeHtml = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Fail the BUILD on a duplicate path: two venues claiming one page would make the
// active-tab lookup order-dependent and silently mislabel a page.
{
  const seen = new Map();
  for (const v of VENUES) {
    for (const [label, path] of v.tabs) {
      if (seen.has(path)) {
        throw new Error("venue nav: " + path + " claimed by both " + seen.get(path) + " and " + v.name + " (" + label + ")");
      }
      seen.set(path, v.name);
    }
  }
}

// ── The site map ────────────────────────────────────────────────────────────
// Framework's own sidebar is OFF (`sidebar: false` below) because it allows
// exactly one level of nesting, which left 15 of the 35 built pages with no menu
// entry AND no pager link — Products, Economics, Trading behavior, Outcomes and
// Parlays among them. This map is the replacement, rendered as a left rail by
// `railHeader`, and it carries all three levels.
//
// Venue modules are NOT repeated here; they are read from VENUES above, so a
// venue's tabs are declared once and the rail and the in-page strip cannot drift.
const SITE_MAP = [
  {label: "Overview", links: [["Briefing", "/"], ["Ask Data", "/chat"]]},
  {label: "Compare venues", links: [
    ["Scale & liquidity", "/compare-scale"],
    ["Products", "/categories-venues"],
    // Sits next to Products because it answers the same question -- what is being traded
    // -- rather than at the end as an appendix. Promoted out of Unfiled 2026-08-19.
    ["Parlays", "/parlay-venues"],
    ["Trading behavior", "/trade-size"],
    ["Fees & economics", "/compare-fees"],
    ["Accuracy & outcomes", "/compare-accuracy"]
  ]},
  {label: "Venues", links: [["All venues", "/venues"]], venues: true},
  {label: "Tools", links: [
    ["Market Explorer", "/market-explorer"],
    ["Methodology & coverage", "/methodology"]
  ]},
  // What is left of the orphans: built and URL-reachable, absent from every nav before
  // the rail. Listing them is deliberate and is not an endorsement of keeping them —
  // /competitors and /calibration-venues are "has moved" tombstones and the other four
  // are a pending keep-or-cut. They are here so the decision is visible rather than
  // lost, and so the completeness check below can be exhaustive.
  // /parlay-venues left this group on 2026-08-19 and is now a Compare venues page.
  {label: "Unfiled", note: "keep or cut", links: [
    ["Bet types", "/bet-types"],
    ["Calibration", "/calibration"],
    ["Calibration by venue", "/calibration-venues"],
    ["Competitors", "/competitors"],
    ["P&L by venue", "/pnl-venues"],
    ["Robinhood", "/robinhood"]
  ]}
];

// Fail the BUILD if the map and the built pages disagree in either direction.
// With the sidebar off, the rail is the ONLY site-wide navigation, so a page
// missing from it is unreachable except by URL — which is exactly the condition
// this whole change exists to remove. A dangling entry is a 404 in the menu.
// Both were silent before; neither can be now.
{
  const built = new Set(
    readdirSync(new URL("./src", import.meta.url))
      .filter((f) => f.endsWith(".md"))
      .map((f) => (f === "index.md" ? "/" : "/" + f.slice(0, -".md".length)))
  );
  const mapped = new Set();
  const claim = (p) => {
    if (mapped.has(p)) throw new Error("site map: " + p + " appears in the menu twice");
    mapped.add(p);
  };
  for (const g of SITE_MAP) {
    for (const [, p] of g.links) claim(p);
    if (g.venues) for (const v of VENUES) for (const [, p] of v.tabs) claim(p);
  }
  const missing = [...built].filter((p) => !mapped.has(p)).sort();
  const dangling = [...mapped].filter((p) => !built.has(p)).sort();
  if (missing.length) {
    throw new Error("site map: " + missing.length + " built page(s) have no menu entry: " + missing.join(", "));
  }
  if (dangling.length) {
    throw new Error("site map: " + dangling.length + " menu entr(ies) point at no page: " + dangling.join(", "));
  }
}

// The in-page venue strip. Below 1008px the rail collapses to a drawer and this
// is what stays visible for switching modules without opening it; above 1008px
// the rail already shows the same links expanded, so CSS hides this.
function venueStrip(path, current) {
  const entry = (v) => v.tabs[0][1];
  const picker = VENUES.map((v) => {
    const mark = v === current ? ' aria-current="true"' : "";
    return '<a href="' + entry(v) + '"' + mark + ">" + escapeHtml(v.name) + "</a>";
  }).join("");

  // A lone tab is noise — the picker already says where you are.
  const tabs = current.tabs.length > 1
    ? '<nav class="venue-tabs" aria-label="' + escapeHtml(current.name) + ' sections">' +
      current.tabs.map(([label, p]) => {
        const mark = p === path ? ' aria-current="page"' : "";
        return '<a href="' + p + '"' + mark + ">" + escapeHtml(label) + "</a>";
      }).join("") + "</nav>" +
      // Below 640px the strip is ONE horizontally scrolling row (it used to wrap to
      // four, which made a pinned bar 212px tall on a phone). That introduced a real
      // defect: on /parlay at 375px the active tab is 7th of 7 and sat 419px
      // off-screen, so the strip looked like nothing was selected. Nudge it into view.
      //
      // Inline <script> in build-time HTML, NOT an Observable cell, so it cannot fail
      // silently the way an unresolved cell input does -- the same reason the theme
      // toggle and the FOUC guard in head[] are written this way. Sets scrollLeft
      // directly instead of scrollIntoView(), which can also move the PAGE vertically.
      // Unquoted [aria-current=page] is valid CSS and avoids nested-quote escaping.
      // With JS off the strip simply starts at 0, exactly as it does today.
      "<script>(function(){try{var a=document.querySelector('.venue-tabs a[aria-current=page]');if(!a)return;var s=a.parentElement;if(s.scrollWidth>s.clientWidth)s.scrollLeft=a.offsetLeft-(s.clientWidth-a.offsetWidth)/2;}catch(e){}})();</script>"
    : "";

  return '<div class="venue-nav"' + (current.accent ? ' data-accent="' + current.accent + '"' : "") + ">" +
    '<div class="venue-nav-bar">' +
      '<span class="venue-nav-label">Venue</span>' +
      '<details class="venue-picker"><summary>' + escapeHtml(current.name) + "</summary>" +
      '<div class="venue-picker-menu">' + picker + "</div></details>" +
      '<a class="venue-nav-index" href="/venues">All venues</a>' +
    "</div>" + tabs + "</div>";
}

// The rail. Emitted for EVERY page, without exception: with `sidebar: false`
// there is no other site-wide navigation, so a path that fell through this the
// way /chat used to fall through the old venue lookup would have no menu at all.
// Runs in NODE at build time, like the strip it replaces, so it is plain HTML and
// not an Observable cell — a bad entry fails the build rather than rendering an
// empty placeholder. Venue expansion is a native <details>, so it needs no
// JavaScript and is keyboard-accessible for free.
function railHeader({path}) {
  // Framework names the home page "/index" (readPages: join("/", dirname, name)),
  // so a "/" entry never matches it and the Briefing row silently failed to mark
  // itself current. Normalise before comparing.
  const here = path === "/index" ? "/" : path;
  const current = VENUES.find((v) => v.tabs.some(([, p]) => p === here));
  const link = (label, p) =>
    '<a href="' + p + '"' + (p === here ? ' aria-current="page"' : "") + ">" + escapeHtml(label) + "</a>";

  const groups = SITE_MAP.map((g) => {
    let body = g.links.map(([label, p]) => link(label, p)).join("");
    if (g.venues) {
      body += VENUES.map((v) => {
        // Only the current venue is open. Ten venues expanded at once is a wall
        // of 19 links; one is the shape the sidebar could never express.
        const count = v.tabs.length > 1
          ? '<span class="rail-count">' + v.tabs.length + "</span>"
          : "";
        return '<details class="rail-venue"' + (v === current ? " open" : "") +
          (v.accent ? ' data-accent="' + v.accent + '"' : "") + ">" +
          '<summary><span class="rail-dot"></span>' + escapeHtml(v.name) + count + "</summary>" +
          '<div class="rail-sub">' + v.tabs.map(([label, p]) => link(label, p)).join("") + "</div>" +
        "</details>";
      }).join("");
    }
    return '<div class="rail-group"><h2 class="rail-h">' + escapeHtml(g.label) +
      (g.note ? '<span class="rail-note">' + escapeHtml(g.note) + "</span>" : "") +
      "</h2>" + body + "</div>";
  }).join("");

  // Checkbox toggle rather than a script: the same zero-JS pattern Framework uses
  // for its own sidebar, and it works with JavaScript disabled. CSS hides both the
  // input and the label above 1008px, where the rail is always open.
  return '<input id="rail-toggle" type="checkbox">' +
    '<label id="rail-toggle-label" for="rail-toggle"><span class="rail-bars"></span>Menu</label>' +
    '<nav class="site-rail" aria-label="Site sections">' +
      '<a class="rail-brand" href="/">US Prediction Markets</a>' +
      groups +
    "</nav>" +
    (current ? venueStrip(here, current) : "");
}

export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],
  style: "styles.css",
  // OFF deliberately: normalizePages() gives a section leaf pages and never
  // sub-sections, so the sidebar could hold "Venues -> Kalshi" but never
  // "Venues -> Kalshi -> Economics". railHeader carries all three levels instead.
  // Turning this off removes the toggle, the backdrop and the nav element
  // entirely (render.js), which is why railHeader must emit for every path.
  sidebar: false,
  header: railHeader,
  head: [
    // 2026-08-13: keep the site out of search engines while it's not meant to be
    // freely discoverable -- direct links still work fine, this only affects crawlers.
    '<meta name="robots" content="noindex, nofollow">',
    // Build stamp: the commit this page was built from. A wedged deploy is then
    // detectable from anywhere by comparing this against `git ls-remote origin main`
    // -- no GitHub token needed, and it works on both hosts. Falls back to "unstamped"
    // for a local build so `npm run build` on a laptop still works unchanged.
    '<meta name="x-site-build" content="' + (process.env.KALSHI_BUILD_STAMP || "unstamped") + '">',
    '<link rel="preconnect" href="https://rsms.me/">',
    // 2026-08-01: build-time injection of the chat API endpoint.
    // This config file runs in NODE at build time, so process.env is available HERE.
    // It is NOT available in a page's browser js block -- referencing it there is what
    // crashed the whole Ask Data panel on load and forced commit 96c25f32f to hardcode
    // localhost (see the NOTE in src/chat.md). Emitting the values as window globals
    // keeps the browser side free of Node globals. JSON.stringify handles quoting/escaping
    // and yields "" when the env var is unset, so chat.md falls back to localhost and
    // local development is unchanged. CHAT_API_URL/CHAT_TOKEN are already passed to the
    // build by .github/workflows/deploy.yml.
    `<script>window.__CHAT_API__=${JSON.stringify(CHAT_API)};window.__CHAT_TOKEN__=${JSON.stringify(CHAT_TOKEN)};</script>`,
    '<link rel="stylesheet" href="https://rsms.me/inter/inter.css">',
    // Apply saved theme before first paint to avoid FOUC
    `<script>(function(){try{var t=localStorage.getItem("kalshi-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>`,
    // Inject the light/dark/system toggle after load
    `<script>document.addEventListener("DOMContentLoaded",function(){
      var KEY="kalshi-theme";
      var cur=localStorage.getItem(KEY)||"system";
      var wrap=document.createElement("div");
      wrap.className="theme-toggle";
      wrap.setAttribute("role","group");
      wrap.setAttribute("aria-label","Theme");
      var opts=[["light","☀","Light"],["dark","☾","Dark"],["system","⚙","System"]];
      opts.forEach(function(o){
        var b=document.createElement("button");
        b.type="button";
        b.textContent=o[1];
        b.title=o[2];
        b.setAttribute("aria-label",o[2]);
        b.dataset.theme=o[0];
        b.addEventListener("click",function(){apply(o[0],true);});
        wrap.appendChild(b);
      });
      document.body.appendChild(wrap);
      function apply(v,persist){
        cur=v;
        if(persist){try{localStorage.setItem(KEY,v);}catch(e){}}
        if(v==="system")document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme",v);
        Array.prototype.forEach.call(wrap.children,function(b){
          b.setAttribute("aria-pressed",b.dataset.theme===v?"true":"false");
        });
      }
      apply(cur,false);
    });</script>`
  ].join("\n"),
  // With the sidebar off, `pages` has exactly one consumer left: the footer pager
  // (render.js -> findLink). Deriving it from SITE_MAP means prev/next walks the
  // same order the rail shows, and every page gets one — before this it was built
  // from a shorter, hand-maintained list and 15 of 35 pages were dead ends.
  // Venue modules are flattened into the Venues section because normalizePages()
  // does not recurse; the names are pager labels only, never rendered as a tree.
  pages: SITE_MAP.map((g) => ({
    name: g.label,
    pages: [
      ...g.links.map(([name, path]) => ({name, path})),
      ...(g.venues
        ? VENUES.flatMap((v) =>
            v.tabs.map(([label, path]) => ({
              name: v.tabs.length > 1 ? v.name + " · " + label : v.name,
              path
            }))
          )
        : [])
    ]
  })),
  footer: "Data: Kalshi trade records and public competitor sources via Daniel O'Boyle. Freshness varies by page; see each page's data status panel.",
};
