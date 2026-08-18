import {readFileSync} from "node:fs";

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
const CHAT_API = publishedChatEndpoint.api || process.env.CHAT_API_URL || "";
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
  // orphaned. SEVEN orphans remain and are deliberately NOT wired up:
  // calibration-venues and competitors are "has moved" tombstones; bet-types,
  // calibration, parlay-venues, pnl-venues and robinhood are a pending
  // keep-or-cut decision. (An earlier version of this comment listed five and
  // then said "two are tombstones" -- the two were the ones it had omitted.)
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

function venueNavHeader({path}) {
  // NOTE /chat: it falls through this lookup and so gets no header, but only by
  // accident of not being a venue. It is the page with three separate silent-
  // failure incidents behind it, so if this ever grows a non-venue branch (a
  // filter bar on compare pages, say), exclude /chat BY NAME rather than
  // relying on it falling through again.
  const current = VENUES.find((v) => v.tabs.some(([, p]) => p === path));
  if (!current) return null; // every non-venue page gets no header at all

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

export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],
  style: "styles.css",
  header: venueNavHeader,
  head: [
    // 2026-08-13: keep the site out of search engines while it's not meant to be
    // freely discoverable -- direct links still work fine, this only affects crawlers.
    '<meta name="robots" content="noindex, nofollow">',
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
  pages: [
    {name: "Briefing", path: "/"},
    {name: "Ask Data", path: "/chat"},
    {name: "Compare", open: true, pages: [
      {name: "Scale & Liquidity", path: "/compare-scale"},
      {name: "Products", path: "/categories-venues"},
      {name: "Trading Behavior", path: "/trade-size"},
      {name: "Fees & Economics", path: "/compare-fees"},
      {name: "Accuracy & Outcomes", path: "/compare-accuracy"}
    ]},
    // One row per venue, pointing at that venue's first module. The remaining
    // modules are reachable from the in-page tab strip `header` renders, because
    // the sidebar cannot express a third level (see VENUES above).
    // Pages dropped from this list still BUILD and stay URL-reachable — Framework
    // builds every src/*.md regardless of `pages` — they only leave the sidebar.
    {name: "Venue Deep Dives", pages: [
      {name: "Venue directory", path: "/venues"},
      ...VENUES.map((v) => ({name: v.name, path: v.tabs[0][1]}))
    ]},
    {name: "Market Explorer", path: "/market-explorer"},
    {name: "Data & Tools", pages: [
      {name: "Methodology & coverage", path: "/methodology"}
    ]}
  ],
  footer: "Data: Kalshi trade records and public competitor sources via Daniel O'Boyle. Freshness varies by page; see each page's data status panel.",
};
