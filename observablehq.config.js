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
const CHART_ACTIONS = readFileSync(
  new URL("./src/components/chart-actions.js", import.meta.url),
  "utf-8"
).replace(/<\/script/gi, "<\\/script");
const DATA_INSPECTOR = readFileSync(
  new URL("./src/components/data-inspector.js", import.meta.url),
  "utf-8"
).replace(/<\/script/gi, "<\\/script");

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
  // /polymarket-calibration is Polymarket's Outcomes module rather than an
  // orphaned page. Every built page has an intentional home in SITE_MAP below.
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
// Framework's own sidebar is OFF (`sidebar: false` below). This map drives the
// masthead, contextual module bars, mobile menu and footer pager from one source.
//
// Venue modules are NOT repeated here; they are read from VENUES above, so a
// venue's tabs are declared once and the desktop/mobile/context menus cannot drift.
const SITE_MAP = [
  {label: "Overview", links: [["Briefing", "/"], ["Ask Data", "/chat"]]},
  {label: "Compare venues", links: [
    ["Overview", "/compare"],
    ["Scale & liquidity", "/compare-scale"],
    ["Products", "/categories-venues"],
    // Sits next to Products because it answers the same question -- what is being traded
    // -- rather than at the end as an appendix.
    ["Parlays", "/parlay-venues"],
    ["Trading behavior", "/trade-size"],
    ["Fees & economics", "/compare-fees"],
    ["Accuracy & outcomes", "/compare-accuracy"]
  ]},
  {label: "Explore", links: [["Markets & trades", "/market-explorer"]]},
  {label: "Venues", links: [["All venues", "/venues"]], venues: true},
  {label: "Research", links: [
    ["Robinhood distribution estimate", "/robinhood"]
  ]},
  // Renamed from "Tools" when Market Explorer left it: a group called Tools holding only
  // a methodology page was describing the wrong thing.
  {label: "About", links: [
    ["Methodology & coverage", "/methodology"]
  ]}
];

// Fail the BUILD if the map and the built pages disagree in either direction.
// With the sidebar off, this map is the ONLY source of site-wide navigation, so a page
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

// Venue pages receive a contextual second row beneath the global masthead. The
// venue picker changes entity; the tabs change module without exposing the full
// site tree on every page.
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

  return '<div class="context-shell"><div class="venue-nav"' +
    (current.accent ? ' data-accent="' + current.accent + '"' : "") + ">" +
      '<div class="venue-nav-bar">' +
        '<span class="venue-nav-label">Venue</span>' +
        '<details class="venue-picker"><summary>' + escapeHtml(current.name) + "</summary>" +
        '<div class="venue-picker-menu">' + picker + "</div></details>" +
        '<a class="venue-nav-index" href="/venues">All venues</a>' +
      "</div>" + tabs + "</div></div>";
}

function compareStrip(path) {
  const links = SITE_MAP.find((g) => g.label === "Compare venues").links;
  return '<div class="context-shell"><nav class="compare-nav" aria-label="Compare modules">' +
    '<span class="compare-nav-label">Compare</span>' +
    links.map(([label, p]) =>
      '<a href="' + p + '"' + (p === path ? ' aria-current="page"' : "") + '>' + escapeHtml(label) + '</a>'
    ).join("") +
  '</nav></div>';
}

// The global masthead. It is emitted as build-time HTML on every page, so the
// complete first navigation frame works before any Observable cells or data load.
// Compare and venue pages receive a contextual second row beneath it.
function siteHeader({path}) {
  // Framework names the home page "/index" (readPages: join("/", dirname, name)),
  // so normalise it before computing active navigation state.
  const here = path === "/index" ? "/" : path;
  const current = VENUES.find((v) => v.tabs.some(([, p]) => p === here));
  const compareLinks = SITE_MAP.find((g) => g.label === "Compare venues").links;
  const comparePaths = new Set(compareLinks.map(([, p]) => p));
  const isCompare = comparePaths.has(here);
  const isVenue = here === "/venues" || Boolean(current);
  const isMore = here === "/robinhood" || here === "/methodology";
  const link = (label, p, active, className = "") =>
    '<a href="' + p + '"' + (className ? ' class="' + className + '"' : "") +
    (active ? ' aria-current="page"' : "") + '>' + escapeHtml(label) + '</a>';

  // Venues is a DROPDOWN, not a link. /venues is a directory page that loads no data at
  // all -- pointing the primary nav at it made every reader pay a page load before they
  // could reach any evidence, and Framework has no client-side router, so that reload is
  // the full cost of a navigation. The menu goes straight to a venue's first module.
  // "All venues" keeps the directory reachable for anyone who wants the overview, and
  // keeps the page's SITE_MAP entry honest rather than orphaned.
  //
  // It reuses .masthead-more wholesale so it inherits that dropdown's summary, caret,
  // marker-suppression, open and active styling -- including the Editorial Desk overrides
  // -- without touching nine selector lists. .masthead-venues only re-anchors the panel.
  // <details> means this still needs no JavaScript.
  const venueEntry = (v) =>
    '<a href="' + v.tabs[0][1] + '"' + (v === current ? ' aria-current="true"' : "") + ">" +
    escapeHtml(v.name) + "</a>";

  const venuesMenu =
    '<details class="masthead-more masthead-venues' + (isVenue ? " is-active" : "") + '">' +
      "<summary>Venues</summary>" +
      '<div class="masthead-menu masthead-venue-menu">' +
        VENUES.map(venueEntry).join("") +
        link("All venues", "/venues", here === "/venues", "masthead-venue-all") +
      "</div>" +
    "</details>";

  const primary = [
    link("Briefing", "/", here === "/"),
    venuesMenu,
    link("Compare", "/compare", isCompare),
    link("Markets & trades", "/market-explorer", here === "/market-explorer")
  ].join("");

  const compareMobile = compareLinks.map(([label, p]) => link(label, p, p === here)).join("");
  const venuesMobile =
    VENUES.map((v) => link(v.name, v.tabs[0][1], v === current)).join("") +
    link("All venues", "/venues", here === "/venues");
  const masthead = '<header class="masthead"><div class="masthead-inner">' +
    '<a class="masthead-brand" href="/">' +
      '<span class="masthead-brand-name">Predict Charts</span>' +
      '<span class="masthead-brand-subtitle">US Prediction Markets</span>' +
    '</a>' +
    '<nav class="masthead-primary" aria-label="Primary navigation">' + primary + '</nav>' +
    '<div class="masthead-actions">' +
      link("Ask Data", "/chat", here === "/chat", "masthead-ask") +
      '<details class="masthead-more' + (isMore ? ' is-active' : '') + '">' +
        '<summary>More</summary><div class="masthead-menu">' +
          link("Robinhood research", "/robinhood", here === "/robinhood") +
          link("Methodology & coverage", "/methodology", here === "/methodology") +
          '<div class="masthead-theme"><span>Theme</span><div class="theme-toggle" role="group" aria-label="Theme"></div></div>' +
        '</div>' +
      '</details>' +
    '</div>' +
    '<details class="masthead-mobile">' +
      '<summary><span class="masthead-menu-icon" aria-hidden="true"></span><span>Menu</span></summary>' +
      '<div class="masthead-mobile-panel">' +
        link("Briefing", "/", here === "/") +
        link("Markets & trades", "/market-explorer", here === "/market-explorer") +
        link("Ask Data", "/chat", here === "/chat", "masthead-mobile-ask") +
        '<div class="masthead-mobile-group"><span>Compare venues</span>' + compareMobile + '</div>' +
        // Same reasoning as the desktop dropdown: list the venues rather than sending the
        // reader to the empty directory page. The drawer already groups Compare this way.
        '<div class="masthead-mobile-group"><span>Venues</span>' + venuesMobile + '</div>' +
        '<div class="masthead-mobile-group"><span>Research & methodology</span>' +
          link("Robinhood distribution estimate", "/robinhood", here === "/robinhood") +
          link("Methodology & coverage", "/methodology", here === "/methodology") +
        '</div>' +
        '<div class="masthead-mobile-theme"><span>Theme</span><div class="theme-toggle" role="group" aria-label="Theme"></div></div>' +
      '</div>' +
    '</details>' +
  '</div></header>';

  const context = current ? venueStrip(here, current) : isCompare ? compareStrip(here) : "";
  return masthead + context;
}

export default {
  title: "Predict Charts",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],
  style: "styles.css",
  // OFF deliberately: the branded masthead and contextual module rows replace
  // Framework's documentation-style sidebar.
  sidebar: false,
  header: siteHeader,
  head: [
    // 2026-08-13: keep the site out of search engines while it's not meant to be
    // freely discoverable -- direct links still work fine, this only affects crawlers.
    '<meta name="robots" content="noindex, nofollow">',
    // Build stamp: the commit this page was built from. A wedged deploy is then
    // detectable from anywhere by comparing this against `git ls-remote origin main`
    // -- no GitHub token needed, and it works on both hosts. Falls back to "unstamped"
    // for a local build so `npm run build` on a laptop still works unchanged.
    '<meta name="x-site-build" content="' + (process.env.KALSHI_BUILD_STAMP || "unstamped") + '">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
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
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&amp;family=Inter+Tight:wght@400;500;600;700&amp;family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&amp;display=swap">',
    // Apply saved theme before first paint to avoid FOUC
    `<script>(function(){try{var t=localStorage.getItem("kalshi-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>`,
    // Wire the light/dark/system selectors rendered in both desktop and mobile
    // masthead menus. Keeping them in sync avoids one control displaying stale
    // state after the other changes the preference.
    `<script>document.addEventListener("DOMContentLoaded",function(){
      var KEY="kalshi-theme";
      var cur=localStorage.getItem(KEY)||"system";
      var wraps=Array.prototype.slice.call(document.querySelectorAll(".theme-toggle"));
      if(!wraps.length)return;
      var opts=[["light","☀","Light"],["dark","☾","Dark"],["system","⚙","System"]];
      wraps.forEach(function(wrap){
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
      });
      function apply(v,persist){
        cur=v;
        if(persist){try{localStorage.setItem(KEY,v);}catch(e){}}
        if(v==="system")document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme",v);
        wraps.forEach(function(wrap){
          Array.prototype.forEach.call(wrap.children,function(b){
            b.setAttribute("aria-pressed",b.dataset.theme===v?"true":"false");
          });
        });
      }
      apply(cur,false);
    });</script>`,
    // Chart focus/download/link/Ask controls are progressive enhancement. The
    // script observes Observable cells as they render, so a slow data source does
    // not leave later charts without controls.
    `<script>${CHART_ACTIONS}</script>`,
    // Reusable, data-aware detail drawer. Pages opt in explicitly and provide the
    // selected datum plus the next honest level of detail; the global shell owns
    // navigation history, deep links, Ask Data context and responsive behavior.
    `<script>${DATA_INSPECTOR}</script>`
  ].join("\n"),
  // With the sidebar off, `pages` has exactly one consumer left: the footer pager
  // (render.js -> findLink). Deriving it from SITE_MAP means prev/next walks the
  // same order the masthead menus show, and every page gets one — before this it was built
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
