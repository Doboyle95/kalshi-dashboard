(() => {
  const PREFILL_KEY = "kalshi_chat_prefill";
  const ROOT_SELECTOR = "#observablehq-main";
  const SKIP_SELECTOR = [
    ".pulse-card",
    ".date-brush",
    ".freshness-panel",
    ".chart-tools",
    ".chart-focus-overlay",
    ".theme-toggle"
  ].join(",");
  const VENUE_OVERVIEWS = {
    volume: {depth: "Deepest", best: "Market structure and participant economics", available: "Activity · Products · Behavior · Economics · Outcomes · Parlays", limit: "The depth is not yet available for most competitors."},
    polymarket: {depth: "Moderate", best: "Sports mix, products, and settled outcomes", available: "Activity · Products · Top markets · Calibration", limit: "Daily totals cannot support trade-by-trade analysis."},
    forecastex: {depth: "Moderate", best: "Concentration and category evolution", available: "Activity · Categories · Top products", limit: "Public files are better for mix than microstructure."},
    dkex: {depth: "Moderate", best: "A young exchange with public trade prints", available: "Activity · Products · Open interest · Settlements", limit: "Short history and very small scale make trends noisy."},
    underdog: {depth: "Moderate", best: "Sports products, parlays, and bet types", available: "Activity · Product mix · Bet types · Top markets", limit: "Outcome and participant-identity evidence is limited."},
    nadex: {depth: "Moderate", best: "Crypto.com/Nadex products and parlay outcomes", available: "Activity · Products · Parlay P&L · Top events", limit: "The source does not expose every market-structure field."},
    prophetx: {depth: "Trade-level", best: "Trade size, prices, parlays, and calibration", available: "Activity · Price distribution · Parlays · Outcomes", limit: "History and scale are narrower than Kalshi's."},
    novig: {depth: "Trade-level, short", best: "Fee regimes, parlays, and leading markets", available: "Activity · Fees · Parlays · Outcomes", limit: "The regulated-exchange history begins in August 2026."},
    rothera: {depth: "Moderate", best: "Robinhood's own exchange and product mix", available: "Activity · Products · Top markets", limit: "End-of-day files do not provide trade-level behavior."},
    // No `best`: this series is a partial view of two sportsbooks that clear only some
    // of their contracts through CME, so there is nothing it is genuinely best for.
    // The renderer below drops any row whose value is absent.
    cme: {depth: "Sparse bulletin", available: "Collected-day activity · Calls and puts", limit: "Missing bulletin days are unknown, not zero."}
  };
  let focusState = null;

  function text(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function currentHeading(root) {
    const main = document.querySelector(ROOT_SELECTOR);
    if (!main) return null;
    const top = root.getBoundingClientRect().top + window.scrollY + 8;
    return Array.from(main.querySelectorAll("h2, h3"))
      .filter((heading) => heading.getBoundingClientRect().top + window.scrollY <= top)
      .at(-1) ?? null;
  }

  function contextFor(root) {
    const pageTitle = text(document.querySelector("h1")?.textContent || document.title);
    const heading = currentHeading(root);
    const section = text(heading?.textContent || "this chart");
    return {
      pageTitle,
      section,
      heading,
      question: `Using the underlying data, explain the ${section} chart on the ${pageTitle} page. What is most important, what changed recently, and what data limitations should I keep in mind?`,
      context: `${pageTitle} — ${section}. Source page: ${location.href}`
    };
  }

  function saveAskPrefill(question, context) {
    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify({question, context, ts: Date.now()}));
    } catch {}
  }

  function askHref() {
    const link = document.querySelector('.masthead-ask[href]');
    return link?.href || new URL("chat", location.href).href;
  }

  function slug(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "predict-chart";
  }

  function setButtonStatus(button, label) {
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = label;
    window.setTimeout(() => { button.textContent = original; }, 1400);
  }

  async function copyLink(root, button) {
    const {heading} = contextFor(root);
    const url = new URL(location.href);
    if (heading?.id) url.hash = heading.id;
    try {
      await navigator.clipboard.writeText(url.href);
      setButtonStatus(button, "Copied");
    } catch {
      window.prompt("Copy this chart link", url.href);
    }
  }

  function restoreFocus() {
    if (!focusState) return;
    const {root, placeholder, overlay, button} = focusState;
    placeholder.parentNode?.insertBefore(root, placeholder);
    placeholder.remove();
    overlay.remove();
    root.classList.remove("is-focused");
    document.documentElement.classList.remove("chart-focus-open");
    button.textContent = "Focus";
    button.setAttribute("aria-label", "Open chart in focus mode");
    focusState = null;
  }

  function toggleFocus(root, button) {
    if (focusState?.root === root) {
      restoreFocus();
      return;
    }
    restoreFocus();
    const placeholder = document.createComment("chart focus placeholder");
    root.parentNode.insertBefore(placeholder, root);
    const overlay = document.createElement("div");
    overlay.className = "chart-focus-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", `${contextFor(root).section} chart`);
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) restoreFocus();
    });
    root.classList.add("is-focused");
    overlay.append(root);
    document.body.append(overlay);
    document.documentElement.classList.add("chart-focus-open");
    button.textContent = "Exit focus";
    button.setAttribute("aria-label", "Exit chart focus mode");
    focusState = {root, placeholder, overlay, button};
    button.focus();
  }

  // Every custom property the stylesheet declares, read once from the author rules
  // rather than kept as a hand-written list.
  //
  // Plot paints constant colours as SVG *presentation attributes* — <g fill="var(--x)"> —
  // and a token the clone does not carry is not merely absent: the attribute is invalid
  // at computed-value time, so a stroke falls back to `none` and vanishes while a fill
  // falls back to black. Measured against a hand-kept list of 13: the 7-day average line
  // (--accent-warning) and every grid line (--theme-foreground-fainter) exported fully
  // transparent, and --cat-basketball exported as #000. Enumerating cannot go stale when
  // a new token is added.
  let tokenNames = null;
  function themeTokenNames() {
    if (tokenNames) return tokenNames;
    tokenNames = new Set();
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.style) for (const name of rule.style) if (name.startsWith("--")) tokenNames.add(name);
        if (rule.cssRules) walk(rule.cssRules); // @media and friends
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch { /* cross-origin sheet (Inter); nothing to read */ }
    }
    return tokenNames;
  }

  // The theme paints the page background on <html>, not <body>, so body computes to
  // "rgba(0, 0, 0, 0)" — a truthy string, so a `|| "#fff"` fallback never fired and the
  // export got no background at all. Harmless-looking in light mode; in dark mode it
  // writes light text onto transparency, unreadable wherever the PNG is opened on white.
  function pageBackground() {
    for (const el of [document.body, document.documentElement]) {
      const value = getComputedStyle(el).backgroundColor;
      if (value && value !== "transparent" && !/,\s*0\s*\)$/.test(value)) return value;
    }
    return "#fff";
  }

  async function downloadPng(root, button) {
    const svg = root.matches("svg") ? root : root.querySelector("svg");
    if (!svg) return setButtonStatus(button, "Unavailable");
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return setButtonStatus(button, "Unavailable");
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(box.width));
    clone.setAttribute("height", String(box.height));
    const computedRoot = getComputedStyle(document.documentElement);
    for (const name of themeTokenNames()) {
      const value = computedRoot.getPropertyValue(name);
      if (value) clone.style.setProperty(name, value);
    }
    const css = document.createElementNS("http://www.w3.org/2000/svg", "style");
    css.textContent = "text{font-family:'Inter Tight',Arial,sans-serif} .domain{stroke:currentColor}";
    clone.prepend(css);
    const source = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([source], {type: "image/svg+xml;charset=utf-8"}));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(box.width * scale);
      canvas.height = Math.round(box.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = pageBackground();
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.drawImage(image, 0, 0, box.width, box.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG encoding failed");
      const link = document.createElement("a");
      link.download = `${slug(contextFor(root).section)}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setButtonStatus(button, "Saved");
    } catch {
      setButtonStatus(button, "Unavailable");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function actionButton(label, title, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", handler);
    return button;
  }

  function enhance(root) {
    if (!root || root.dataset.chartActions === "true" || root.closest(SKIP_SELECTOR)) return;
    const svg = root.matches("svg") ? root : root.querySelector("svg");
    if (!svg) return;
    const height = +(svg.getAttribute("height") || 0) || svg.getBoundingClientRect().height;
    if (height < 180) return;
    root.dataset.chartActions = "true";
    root.classList.add("chart-action-host");

    const tools = document.createElement("div");
    tools.className = "chart-tools";
    tools.setAttribute("role", "toolbar");
    tools.setAttribute("aria-label", "Chart options");
    const focus = actionButton("Focus", "Open chart in focus mode", () => toggleFocus(root, focus));
    const png = actionButton("PNG", "Download chart as PNG", () => downloadPng(root, png));
    const link = actionButton("Link", "Copy a link to this chart", () => copyLink(root, link));
    const ask = actionButton("Ask", "Ask Predict Charts about this chart", () => {
      const context = contextFor(root);
      saveAskPrefill(context.question, context.context);
      location.assign(askHref());
    });
    tools.append(focus, png, link, ask);
    root.prepend(tools);
  }

  function scan() {
    const main = document.querySelector(ROOT_SELECTOR);
    if (!main) return;
    main.querySelectorAll(".plot-shell").forEach(enhance);
    main.querySelectorAll("figure").forEach((figure) => {
      if (!figure.closest(".plot-shell")) enhance(figure);
    });
    main.querySelectorAll("svg").forEach((svg) => {
      if (svg.closest(".plot-shell, figure, [data-chart-actions=true]")) return;
      const parent = svg.parentElement;
      if (parent && parent !== main) enhance(parent);
    });
  }

  function addPageAsk() {
    if (location.pathname.endsWith("/chat") || location.pathname.endsWith("/chat.html")) return;
    const hero = document.querySelector(".page-hero:not(.briefing-hero)");
    if (!hero || hero.querySelector(".page-hero-actions")) return;
    const title = text(hero.querySelector("h1")?.textContent || document.title);
    const lead = text(hero.querySelector(".page-lead")?.textContent);
    const actions = document.createElement("div");
    actions.className = "page-hero-actions";
    const link = document.createElement("a");
    link.className = "page-hero-ask";
    link.href = askHref();
    link.textContent = "Ask about this page";
    link.addEventListener("click", () => saveAskPrefill(
      `What are the most important findings on the ${title} page, and what has changed recently?`,
      `${title}. ${lead} Source page: ${location.href}`
    ));
    actions.append(link);
    hero.append(actions);
  }

  function addVenueOverview() {
    const key = location.pathname.split("/").filter(Boolean).at(-1)?.replace(/\.html$/, "") || "";
    const data = VENUE_OVERVIEWS[key];
    const hero = document.querySelector(".page-hero");
    if (!data || !hero || document.querySelector(".venue-overview-grid")) return;
    const overview = document.createElement("section");
    overview.className = "venue-overview-grid";
    const accent = {
      volume: "var(--accent-kalshi)", polymarket: "var(--accent-polymarket)",
      forecastex: "var(--accent-forecastex)", dkex: "var(--accent-dkex)",
      underdog: "var(--accent-underdog)", nadex: "var(--accent-nadex)",
      prophetx: "var(--accent-secondary)", novig: "#6366F1",
      rothera: "var(--accent-rothera)", cme: "var(--accent-cme)"
    }[key];
    if (accent) overview.style.setProperty("--overview-accent", accent);
    overview.setAttribute("aria-label", "Venue coverage overview");
    [
      ["Data depth", data.depth],
      ["Best for", data.best],
      ["Available evidence", data.available],
      ["Main limitation", data.limit]
    ].filter(([, value]) => value).forEach(([label, value]) => {
      const item = document.createElement("div");
      const labelEl = document.createElement("span");
      const valueEl = document.createElement("strong");
      labelEl.textContent = label;
      valueEl.textContent = value;
      item.append(labelEl, valueEl);
      overview.append(item);
    });
    hero.after(overview);
  }

  function wireAskLinks() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-ask-prefill]");
      if (!link) return;
      saveAskPrefill(link.dataset.question || "What changed in prediction markets?", link.dataset.context || "Predict Charts");
    });
  }

  function start() {
    wireAskLinks();
    addPageAsk();
    addVenueOverview();
    scan();
    const main = document.querySelector(ROOT_SELECTOR);
    if (main) new MutationObserver(() => requestAnimationFrame(scan)).observe(main, {childList: true, subtree: true});
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && focusState) restoreFocus();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once: true});
  else start();
})();
