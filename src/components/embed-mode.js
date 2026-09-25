// Chart-only view for embedding one section in another site: <page>?embed=<section id>.
//
// Inlined into every page's <head> by observablehq.config.js, so it runs before first
// paint and before any cell. On a normal page it returns on the first check.
//
// The section is the heading whose id is `embed` plus everything after it up to the
// next h1-h3 that has an id -- the same unit the chart toolbar's Link button points at. The id may
// also name any other element, which is then shown alone. Everything else on the page
// still RUNS (Framework evaluates every cell, and the data loaders a section depends on
// usually sit in the page preamble); it is only hidden.
//
// Framing: the gateway relaxes X-Frame-Options / frame-ancestors ONLY for URLs that
// carry ?embed= (KalshiData deploy/dashboard-site/config/nginx.conf). Every other page
// still refuses to be framed.
//
// Parameters read here: embed=<id> (required), theme=light|dark|auto (default light).
// Date windows (from/to/days, components/url-range.js) and #key=value controls
// (components/hash-state.js) are read by the page's own cells, exactly as on a full page.
(() => {
  let params;
  try { params = new URLSearchParams(location.search); } catch { return; }
  const target = params.get("embed");
  if (!target) return;

  const root = document.documentElement;
  root.classList.add("pc-embed");
  // Light unless asked: most host pages are light, and a reader's saved preference lives
  // in this site's storage, which a third-party iframe usually cannot read anyway.
  const theme = params.get("theme");
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else if (theme === "auto" || theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", "light");

  const style = document.createElement("style");
  style.textContent = `
html.pc-embed { scrollbar-gutter: auto; }
html.pc-embed, html.pc-embed body { height: auto; min-height: 0; }
/* Sized by its host (see postHeight): never show a scrollbar of our own, or the page flickers. */
html.pc-embed.pc-embed-fitted, html.pc-embed.pc-embed-fitted body { overflow: hidden; }
html.pc-embed body { margin: 0; max-width: none; }
html.pc-embed #observablehq-header,
html.pc-embed #observablehq-footer,
html.pc-embed #observablehq-toc,
html.pc-embed .chart-tools,
html.pc-embed .data-inspector-ask,
html.pc-embed .pc-embed-out { display: none !important; }
html.pc-embed #observablehq-center { margin: 0 !important; padding: 0 !important; }
html.pc-embed #observablehq-main { margin: 0 !important; padding: 2px 16px 10px; min-height: 0; max-width: none; min-width: 240px; }
html.pc-embed:not(.pc-embed-ready) #observablehq-main { visibility: hidden; }
/* The page draws a chapter rule over each top-level h2; an embed has one chapter. */
html.pc-embed .pc-embed-target { margin-top: 0.4rem !important; padding-top: 0 !important; border-top: 0 !important; }
html.pc-embed .pc-embed-credit { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px;
  margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--theme-foreground-faintest, #ddd);
  font: 500 12px/1.45 var(--font-sans, system-ui, sans-serif); color: var(--theme-foreground-muted, #666); }
html.pc-embed .pc-embed-credit a { color: inherit; text-decoration: none; }
html.pc-embed .pc-embed-credit a:hover { text-decoration: underline; }
html.pc-embed .pc-embed-credit strong { color: var(--theme-foreground, #111); font-weight: 650; }
html.pc-embed .pc-embed-missing { padding: 20px 0 8px; font: 15px/1.5 var(--font-sans, system-ui, sans-serif); }
`;
  document.head.appendChild(style);

  function pageLink() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(canonical || location.pathname, location.href);
    for (const [key, value] of params) if (key !== "embed" && key !== "theme") url.searchParams.set(key, value);
    url.hash = target;
    return url.href;
  }

  function outLink(href, text, strongText) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    if (strongText) {
      const strong = document.createElement("strong");
      strong.textContent = strongText;
      link.append(strong, text);
    } else {
      link.textContent = text;
    }
    return link;
  }

  function start() {
    const main = document.getElementById("observablehq-main");
    if (!main) return;
    const href = pageLink();
    const pageTitle = (document.querySelector("#observablehq-main h1")?.textContent ||
      document.title.replace(/\s*\|\s*Predict Charts\s*$/i, "")).trim();

    const credit = document.createElement("div");
    credit.className = "pc-embed-credit";
    credit.append(
      outLink(href, pageTitle ? ` · ${pageTitle}` : "", "Predict Charts"),
      outLink(href, "Full chart ↗")
    );
    main.appendChild(credit);

    let found = false;
    let scheduled = false;
    let missing = null;

    // Next heading at or above `maxLevel` after `from`, in document order, inside main.
    // Only headings WITH an id count: an id-less one is a chart's own title (Plot draws
    // `title` as an <h2> inside its figure), and ending the section there hid the chart.
    function nextBoundary(from, maxLevel) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => {
          const level = /^H([1-6])$/.exec(node.tagName)?.[1];
          return level && +level <= maxLevel && node.id ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      walker.currentNode = from;
      return walker.nextNode();
    }

    // Hide every element wholly outside `range`; keep, and descend into, any element
    // that straddles one of its ends. Cells render late and anywhere, so this re-runs.
    function mark(parent, range) {
      for (const child of Array.from(parent.children)) {
        if (child === credit || child === missing) continue;
        if (!range.intersectsNode(child)) { child.classList.add("pc-embed-out"); continue; }
        const index = Array.prototype.indexOf.call(parent.childNodes, child);
        if (range.isPointInRange(parent, index) && range.isPointInRange(parent, index + 1)) continue;
        child.classList.add("pc-embed-path");
        mark(child, range);
      }
    }

    // An id can appear twice -- novig.md puts an empty <div id=...> anchor right before the
    // heading of the same id -- and getElementById returns the first, i.e. the empty div.
    function findTarget() {
      let found;
      try { found = Array.from(main.querySelectorAll("#" + CSS.escape(target))); } catch { return null; }
      found = found.filter((el) => el !== credit);
      return found.find((el) => /^H[1-6]$/.test(el.tagName)) || found[0] || null;
    }

    function classify() {
      scheduled = false;
      const el = findTarget();
      if (!el) return;
      const range = document.createRange();
      const level = /^H([1-6])$/.exec(el.tagName)?.[1];
      if (level) {
        const end = nextBoundary(el, Math.max(3, +level));
        range.setStartBefore(el);
        if (end) range.setEndBefore(end);
        else range.setEndBefore(credit);
      } else {
        range.selectNode(el);
      }
      for (const node of main.querySelectorAll(".pc-embed-out, .pc-embed-path")) {
        node.classList.remove("pc-embed-out", "pc-embed-path");
      }
      if (missing) { missing.remove(); missing = null; }
      mark(main, range);
      el.classList.add("pc-embed-target");
      for (let up = el.parentElement; up && up !== main; up = up.parentElement) {
        if (up.tagName === "DETAILS") up.open = true;
      }
      if (!found) {
        found = true;
        root.classList.add("pc-embed-ready");
      }
      postHeight();
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(classify);
    }

    // A heading drawn by a cell can arrive well after load; only then call it missing.
    function giveUp() {
      if (found || missing) return;
      for (const child of Array.from(main.children)) if (child !== credit) child.classList.add("pc-embed-out");
      missing = document.createElement("p");
      missing.className = "pc-embed-missing";
      missing.append("This chart has moved. ", outLink(href, "See it on Predict Charts ↗"));
      main.insertBefore(missing, credit);
      root.classList.add("pc-embed-ready");
      postHeight();
    }

    // Links leave the frame; in-page anchors and downloads stay put.
    document.addEventListener("click", (event) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.hasAttribute("download")) return;
      let url;
      try { url = new URL(link.href, location.href); } catch { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin === location.origin && url.pathname === location.pathname &&
          url.search === location.search && url.hash) return;
      link.target = "_blank";
      link.rel = "noopener";
    }, true);

    // Tell the host page how tall the section is, so the embed snippet's resize script
    // can size the iframe. Harmless when nothing is listening.
    let lastHeight = 0;
    function postHeight() {
      if (window.parent === window) return;
      const height = Math.ceil(document.body.getBoundingClientRect().height);
      if (!height || Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      try { window.parent.postMessage({type: "predict-charts:embed-height", embed: target, height}, "*"); } catch { /* detached */ }
    }

    classify();
    new MutationObserver(schedule).observe(main, {childList: true, subtree: true});
    if (typeof ResizeObserver === "function") new ResizeObserver(postHeight).observe(document.body);
    // Once the host has sized the frame to the height we posted, the frame can never need a
    // scrollbar of its own -- and must not show one. A scrollbar narrows the page; a chart whose
    // height follows its width then redraws shorter, the host shrinks the frame, the scrollbar
    // goes, the chart widens again, and round it goes (the parlay-vs-legs diagonal flickered
    // like this in 600-760px columns, 2026-09-25). A host WITHOUT the resize script never
    // matches our height, so it keeps the scrollbar and its readers can still scroll.
    window.addEventListener("resize", () => {
      if (lastHeight && Math.abs(window.innerHeight - lastHeight) <= 2) root.classList.add("pc-embed-fitted");
    });
    const armGiveUp = () => setTimeout(giveUp, 8000);
    if (document.readyState === "complete") armGiveUp();
    else window.addEventListener("load", armGiveUp, {once: true});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true});
  else start();
})();
