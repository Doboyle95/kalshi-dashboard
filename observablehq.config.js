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

export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],
  style: "styles.css",
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
    {name: "Overview", path: "/"},
    {name: "Kalshi Volume", path: "/volume"},
    {name: "Taker Volume", path: "/taker"},
    {name: "Trade Size Mix", path: "/trade-size"},
    {name: "Fee Revenue", path: "/fees"},
    {name: "Categories", path: "/categories"},
    {name: "Ask Data", path: "/chat"},
    {name: "Taker P&L", path: "/taker-pnl"},
    {name: "Parlay P&L", path: "/parlay"},
    {name: "Parlay Anatomy", path: "/parlay-analytics"},
    {name: "Cross-Venue Parlays", path: "/parlay-venues"},
    {name: "Cross-Venue Categories", path: "/categories-venues"},
    {name: "Cross-Venue Bet Types", path: "/bet-types"},
    {name: "Calibration", path: "/calibration"},
    {name: "Cross-Venue Calibration", path: "/calibration-venues"},
    {name: "Cross-Venue P&L", path: "/pnl-venues"},
    {name: "Robinhood (FCM)", path: "/robinhood"},
    {name: "Rothera (Robinhood)", path: "/rothera"},
    {name: "Platform Comparison", path: "/competitors"},
    {name: "Polymarket US", path: "/polymarket"},
    {name: "ProphetX", path: "/prophetx"},
    {name: "Novig", path: "/novig"},
    {name: "Polymarket Calibration", path: "/polymarket-calibration"},
    {name: "ForecastEx", path: "/forecastex"},
    {name: "DKeX (DraftKings)", path: "/dkex"},
    {name: "Underdog Exchange", path: "/underdog"},
    {name: "Crypto.com/Nadex", path: "/nadex"},
    {name: "CME (FanDuel/DraftKings)", path: "/cme"},
  ],
  footer: "Data: Kalshi trade records and public competitor sources via Daniel O'Boyle. Freshness varies by page; see each page's data status panel.",
};
