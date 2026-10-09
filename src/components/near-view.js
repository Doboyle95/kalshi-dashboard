// nearView(ids, {margin, settleMs}) -> Promise that resolves once a reader nears the section whose
// heading (or element) id is in `ids`. Use it to start a below-the-fold section's data fetch only
// when it is wanted:
//
//   const near = nearView("the-most-popular-parlays");
//   const rows = near.then(() => DataAttachment("data/big.csv").csv({typed: true}));
//
// A cell that reads `rows` waits for it (Framework awaits a promise-valued top-level name).
//
// "Near" is decided on SETTLED layout only. While the page loads, every chart cell is 0 px tall,
// so headings sit far higher than they will: an observer started at once reports a lower section as
// near and the fetch it was meant to hold back goes out with the first screen (measured on
// /taker-pnl, 2026-10-08). So the observer is armed by the first scroll, or settleMs (2.5 s) after
// the call, whichever is first; a URL hash naming one of `ids` resolves at once. If the layout is
// still unsettled when the timer fires the worst case is an early fetch -- bandwidth, never a blank chart.
//
// In an embed (?embed=, components/embed-mode.js) nearView behaves like embedNeeds below: no
// observer at all, because inside a cross-origin iframe an IntersectionObserver measures against the
// HOST page's viewport (rootMargin ignored), so a section already scrolled past would never load.
//
// Fails OPEN: no IntersectionObserver, or none of the ids on the page -> resolves immediately,
// so a renamed heading costs bandwidth, never a blank chart. (scripts/postprocess-site.mjs also
// fails the build when a page gates on an id it does not have.)
//
// Why not Framework's visibility(): the runtime observes a cell's PARENT node, which for a
// top-level cell is <main> -- always visible -- so it resolves at once.
export function nearView(ids, {margin = "0px 0px 1200px 0px", settleMs = 2500} = {}) {
  if (isEmbed()) return embedNeeds(ids);
  const list = (Array.isArray(ids) ? ids : [ids]).map(String);
  return new Promise((resolve) => {
    const els = list.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver !== "function") { resolve(); return; }
    let hash = "";
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed hash */ }
    if (list.includes(hash)) { resolve(); return; }
    let observer = null;
    let timer = null;
    const arm = () => {
      if (observer) return;
      removeEventListener("scroll", arm);
      clearTimeout(timer);
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); resolve(); }
      }, {rootMargin: margin});
      for (const el of els) observer.observe(el);
    };
    if (settleMs <= 0) { arm(); return; }
    addEventListener("scroll", arm, {passive: true});
    timer = setTimeout(arm, settleMs);
  });
}

// embedNeeds(ids) -> Promise. On a full page it resolves at once (no change to what loads).
// In an embed it resolves at once when the embedded content overlaps the section of one of `ids`,
// and never otherwise -- so an embed of one chart stops downloading the rest of the page. The
// decision is made from the page's structure (headings and ids are in the HTML before any cell
// runs), using embed-mode.js's own section rule, so it does not wait on layout or visibility.
export function embedNeeds(ids) {
  if (!isEmbed()) return Promise.resolve();
  const main = document.getElementById("observablehq-main");
  let targetId = null;
  try { targetId = new URLSearchParams(location.search).get("embed"); } catch { /* no target */ }
  const target = main && targetId ? byId(main, targetId) : null;
  const els = main ? (Array.isArray(ids) ? ids : [ids]).map((id) => byId(main, String(id))).filter(Boolean) : [];
  if (!target || !els.length) return Promise.resolve(); // fail open: load, as a full page would
  const shown = extent(main, target);
  return els.some((el) => overlaps(extent(main, el), shown)) ? Promise.resolve() : new Promise(() => {});
}

function isEmbed() {
  return document.documentElement.classList.contains("pc-embed");
}

// The element an id names, preferring a heading: novig.md puts an empty <div id> anchor right
// before the heading of the same id. Same rule as embed-mode.js findTarget().
function byId(main, id) {
  let found;
  try { found = Array.from(main.querySelectorAll("#" + CSS.escape(id))); } catch { return null; }
  return found.find((el) => /^H[1-6]$/.test(el.tagName)) || found[0] || null;
}

// What an element stands for, as embed-mode.js cuts it: a heading runs to the next heading WITH an
// id at its level or above (h3 at most); any other element is just itself.
function extent(main, el) {
  const level = /^H([1-6])$/.exec(el.tagName)?.[1];
  if (!level) return {start: el, end: null, single: true};
  const max = Math.max(3, +level);
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const l = /^H([1-6])$/.exec(node.tagName)?.[1];
      return l && +l <= max && node.id ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  walker.currentNode = el;
  return {start: el, end: walker.nextNode(), single: false};
}

function inside(node, {start, end, single}) {
  if (node === start || start.contains(node)) return true;
  if (single) return false;
  if (!(start.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
  return !end || !!(node.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function overlaps(a, b) {
  return inside(a.start, b) || inside(b.start, a);
}
