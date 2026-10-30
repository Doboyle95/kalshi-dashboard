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
    dkex: {depth: "Moderate", best: "A young exchange with public trade prints", available: "Activity · Products · Parlays · Open interest · Settlements", limit: "Short history and very small scale make trends noisy."},
    underdog: {depth: "Moderate", best: "Sports products, parlays, and bet types", available: "Activity · Product mix · Bet types · Top markets", limit: "Outcome and participant-identity evidence is limited."},
    nadex: {depth: "Moderate", best: "OG/Crypto.com products and parlay outcomes", available: "Activity · Products · Parlay P&L · Top events", limit: "The source does not expose every market-structure field."},
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

  // The section a Link or Embed points at: the last h2/h3 WITH an id before the chart,
  // in document order. currentHeading() is positional, and a Plot `title` is an id-less
  // <h2> INSIDE the figure, level with its top edge -- it would win and give no anchor.
  function anchorHeading(root) {
    const main = document.querySelector(ROOT_SELECTOR);
    if (!main) return null;
    return Array.from(main.querySelectorAll("h2[id], h3[id]"))
      .filter((h) => !root.contains(h) && (h.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING))
      .at(-1) ?? null;
  }

  // The chart's own <svg>: the tallest one. A Plot figure with a legend puts 15px swatch
  // <svg>s BEFORE the chart, so "the first svg" was a swatch: enhance() judged the whole
  // chart too small and skipped it (93 charts site-wide had no toolbar at all), and a
  // PNG taken from such a root would have exported the swatch.
  function mainSvg(root) {
    if (root.matches("svg")) return root;
    let best = null, bestHeight = 0;
    for (const svg of root.querySelectorAll("svg")) {
      const height = +(svg.getAttribute("height") || 0) || svg.getBoundingClientRect().height;
      if (height > bestHeight) { best = svg; bestHeight = height; }
    }
    return best;
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
    const heading = anchorHeading(root);
    const url = new URL(location.href);
    if (heading) url.hash = heading.id;
    try {
      await navigator.clipboard.writeText(url.href);
      setButtonStatus(button, "Copied");
    } catch {
      window.prompt("Copy this chart link", url.href);
    }
  }

  // ── Embed ───────────────────────────────────────────────────────────────────
  // Copies an <iframe> of this chart's section -- components/embed-mode.js renders
  // <page>?embed=<heading id> as that section alone -- plus a small script that lets the
  // host page size the iframe to fit. A window the reader has brushed rides along as
  // from/to/days (components/url-range.js); #key=value controls from
  // components/hash-state.js ride along in the hash.

  // Where the embed view's section ends: the next h1-h3 WITH an id after the heading
  // (an id-less one is a chart's own title, not a section).
  function sectionEnd(heading) {
    const main = document.querySelector(ROOT_SELECTOR);
    if (!main) return null;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => /^H[1-3]$/.test(node.tagName) && node.id ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    });
    walker.currentNode = heading;
    return walker.nextNode();
  }

  // The date brush driving this chart: the last one between its heading and the chart,
  // else the first one after the chart within the same section.
  function sectionDateBrush(root, heading, end) {
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const brushes = Array.from(document.querySelectorAll("[data-date-brush]"))
      .filter((el) => follows(heading, el) && (!end || follows(el, end)));
    return brushes.filter((el) => follows(el, root) || root.contains(el)).at(-1) ||
      brushes.find((el) => follows(root, el)) || null;
  }

  function escapeAttr(value) {
    return String(value).replace(/[&"<>]/g, (c) => ({"&": "&amp;", "\"": "&quot;", "<": "&lt;", ">": "&gt;"})[c]);
  }

  function embedCode(root) {
    const heading = anchorHeading(root);
    if (!heading) return null;
    const section = text(heading.textContent);
    const end = sectionEnd(heading);
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(canonical || location.pathname, location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("embed", heading.id);
    const brush = sectionDateBrush(root, heading, end);
    const range = typeof brush?.dateBrushParams === "function" ? brush.dateBrushParams() : {};
    for (const [key, value] of Object.entries(range)) url.searchParams.set(key, value);
    const state = new URLSearchParams(location.hash.replace(/^#/, ""));
    for (const [key, value] of Array.from(state)) if (!value) state.delete(key);
    if (String(state)) url.hash = String(state);
    // The section's height as drawn here, plus the credit line: a close first guess for
    // a host page that strips the resize script.
    const main = document.querySelector(ROOT_SELECTOR);
    const bottom = end ? end.getBoundingClientRect().top : main.getBoundingClientRect().bottom;
    const height = Math.round(Math.min(2400, Math.max(320, bottom - heading.getBoundingClientRect().top + 70)));
    const resize = "(function(w){if(w.__pcEmbedResize)return;w.__pcEmbedResize=1;" +
      "w.addEventListener(\"message\",function(e){var d=e.data;" +
      "if(e.origin!==" + JSON.stringify(url.origin) + "||!d||d.type!==\"predict-charts:embed-height\")return;" +
      "var f=document.getElementsByTagName(\"iframe\");for(var i=0;i<f.length;i++)if(f[i].contentWindow===e.source){" +
      "var h=Math.ceil(+d.height);if(h>=100&&h<=8000)f[i].style.height=h+\"px\";}});})(window);";
    return `<iframe src="${escapeAttr(url.href)}" title="${escapeAttr(`${section} | Predict Charts`)}" ` +
      `width="100%" height="${height}" style="border:0;width:100%;max-width:100%" loading="lazy"></iframe>` +
      `<script>${resize}<\/script>`;
  }

  async function copyEmbed(root, button) {
    const code = embedCode(root);
    if (!code) return setButtonStatus(button, "Unavailable");
    try {
      await navigator.clipboard.writeText(code);
      setButtonStatus(button, "Copied");
    } catch {
      window.prompt("Copy this embed code", code);
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

  // ── PNG ─────────────────────────────────────────────────────────────────────
  // The download is the section as a reader sees it: its heading, the chart card where it
  // stands on the page (legend, any title or caption, the svg), then the credit line the embed
  // carries. Each svg is drawn as an image. The HTML around it is painted from its on-screen
  // boxes and text, so a legend's labels land beside their swatches.

  const PNG_MARGIN = 24;
  const PNG_SKIP = `style, script, input, select, textarea, form, .data-inspector-ask, ${SKIP_SELECTOR}`;

  // The canvas font, colour and line height of an element's computed style.
  function inkOf(style) {
    return {
      font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
      spacing: style.letterSpacing === "normal" ? "0px" : style.letterSpacing,
      color: style.color,
      lineHeight: parseFloat(style.lineHeight) || 1.2 * parseFloat(style.fontSize)
    };
  }

  // Sets an ink on a context and returns the font's ascent and descent in CSS px.
  function useInk(ctx, ink) {
    ctx.font = ink.font;
    if ("letterSpacing" in ctx) ctx.letterSpacing = ink.spacing;
    const metrics = ctx.measureText("Mg");
    return {
      ascent: metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent,
      descent: metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent
    };
  }

  function widthOf(ctx, ink, line) {
    useInk(ctx, ink);
    return ctx.measureText(line).width;
  }

  // Greedy word wrap to `width`, measured in the font the context has set.
  function wrapWords(ctx, line, width) {
    const lines = [];
    for (const word of line.split(" ")) {
      const last = lines.at(-1);
      if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= width) {
        lines[lines.length - 1] = `${last} ${word}`;
      } else {
        lines.push(word);
      }
    }
    return lines;
  }

  // A border drawn the same width on all four sides; anything else is left off.
  function uniformBorder(style) {
    const width = parseFloat(style.borderTopWidth);
    const same = ["Right", "Bottom", "Left"].every((side) => parseFloat(style[`border${side}Width`]) === width);
    if (!width || style.borderTopStyle === "none" || !same) return null;
    return {width, color: style.borderTopColor};
  }

  // The box an element paints for its background and border, or null when it paints neither.
  function boxPart(style, rect, at) {
    const fill = style.backgroundColor === "rgba(0, 0, 0, 0)" ? null : style.backgroundColor;
    const border = uniformBorder(style);
    if (!(fill || border) || !rect.width || !rect.height) return null;
    return {kind: "box", ...at(rect), w: rect.width, h: rect.height, fill, border, radius: parseFloat(style.borderTopLeftRadius) || 0};
  }

  // The parts of a chart in paint order: its boxes, its text and its svgs, each placed by `at`,
  // which maps a viewport rect to canvas px. Toolbars, brushes, forms and scripts are left out.
  function chartParts(node, at, ctx, parts) {
    if (node.nodeType === Node.TEXT_NODE) return textParts(node, at, ctx, parts);
    if (node instanceof SVGSVGElement) {
      const rect = node.getBoundingClientRect();
      if (rect.width && rect.height) parts.push({kind: "svg", el: node, ...at(rect), w: rect.width, h: rect.height});
      return;
    }
    if (!(node instanceof HTMLElement) || node.matches(PNG_SKIP)) return;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;
    const box = boxPart(style, node.getBoundingClientRect(), at);
    if (box) parts.push(box);
    for (const child of node.childNodes) chartParts(child, at, ctx, parts);
  }

  // A text node's lines, each placed where its first character sits. Characters are measured one
  // at a time, so a wrapped label keeps the breaks the page gives it.
  function textParts(node, at, ctx, parts) {
    const el = node.parentElement;
    if (!el || !node.data.trim()) return;
    const style = getComputedStyle(el);
    const ink = inkOf(style);
    const {ascent} = useInk(ctx, ink);
    const range = document.createRange();
    const lines = [];
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue; // collapsed white space takes no room
      const char = style.textTransform === "uppercase" ? node.data[i].toUpperCase() : node.data[i];
      const last = lines.at(-1);
      if (last && Math.abs(rect.top - last.top) <= 1) last.text += char;
      else lines.push({top: rect.top, left: rect.left, text: char});
    }
    for (const line of lines) {
      const {x, y} = at({left: line.left, top: line.top});
      parts.push({kind: "text", text: line.text.trimEnd(), x, baseline: y + ascent, ...ink});
    }
  }

  // An svg as an image, with the theme's tokens inlined and sized to the box it is painted in.
  async function svgImage(part) {
    const clone = part.el.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(part.w));
    clone.setAttribute("height", String(part.h));
    const computedRoot = getComputedStyle(document.documentElement);
    for (const name of themeTokenNames()) {
      const value = computedRoot.getPropertyValue(name);
      if (value) clone.style.setProperty(name, value);
    }
    // currentColor (axis labels, most text) inherits from the page, which an image does not have.
    clone.style.setProperty("color", getComputedStyle(part.el).color);
    const css = document.createElementNS("http://www.w3.org/2000/svg", "style");
    css.textContent = "text{font-family:'Inter Tight',Arial,sans-serif} .domain{stroke:currentColor}";
    clone.prepend(css);
    const source = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([source], {type: "image/svg+xml;charset=utf-8"}));
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    return {image, url};
  }

  // A box's outline as a path, with its corners rounded where the page rounds them.
  function boxPath(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    if (radius && ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
  }

  function paintPart(ctx, part) {
    if (part.kind === "svg") return ctx.drawImage(part.image, part.x, part.y, part.w, part.h);
    if (part.kind === "box") {
      if (part.fill) {
        ctx.fillStyle = part.fill;
        boxPath(ctx, part.x, part.y, part.w, part.h, part.radius);
        ctx.fill();
      }
      if (part.border) {
        const half = part.border.width / 2;
        ctx.strokeStyle = part.border.color;
        ctx.lineWidth = part.border.width;
        boxPath(ctx, part.x + half, part.y + half, part.w - 2 * half, part.h - 2 * half, Math.max(0, part.radius - half));
        ctx.stroke();
      }
      return;
    }
    ctx.font = part.font;
    if ("letterSpacing" in ctx) ctx.letterSpacing = part.spacing;
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, part.x, part.baseline);
  }

  // The chart's address on the public host, as the embed's "Full chart" link names it.
  function chartAddress(root) {
    const url = new URL(document.querySelector('link[rel="canonical"]')?.href || location.href);
    url.search = "";
    url.hash = anchorHeading(root)?.id || "";
    return `${url.host}${url.pathname}${url.hash}`;
  }

  // The image in CSS px, top to bottom: the section heading, the chart card where it stands on
  // the page, then the credit line. Returns the parts in paint order and the size of the image.
  function pngLayout(root, ctx) {
    const block = root.getBoundingClientRect();
    const width = block.width;
    const parts = [];
    let y = PNG_MARGIN;
    const heading = anchorHeading(root);
    const title = heading ? text(heading.textContent) : "";
    if (title) {
      const ink = inkOf(getComputedStyle(heading));
      const {ascent, descent} = useInk(ctx, ink);
      for (const line of wrapWords(ctx, title, width)) {
        const baseline = y + (ink.lineHeight - ascent - descent) / 2 + ascent;
        parts.push({kind: "text", text: line, x: PNG_MARGIN, baseline, ...ink});
        y += ink.lineHeight;
      }
      y += 14;
    }
    // The toolbar is not in the picture, so the space it holds above the chart goes with it.
    const top = y;
    const content = [...root.children].find((el) => !el.matches(".chart-tools"));
    const padTop = parseFloat(getComputedStyle(root).paddingTop) || 0;
    const cut = Math.max(0, (content ? content.getBoundingClientRect().top : block.top) - block.top - padTop);
    const height = block.height - cut;
    const card = boxPart(getComputedStyle(root), {width, height}, () => ({x: PNG_MARGIN, y: top}));
    if (card) parts.push(card);
    const at = (rect) => ({x: rect.left - block.left + PNG_MARGIN, y: rect.top - block.top - cut + top});
    for (const child of root.childNodes) chartParts(child, at, ctx, parts);

    // The credit line, in the embed's type: "Predict Charts · <page>", the address on the right.
    const tokens = getComputedStyle(document.documentElement);
    const token = (name, fallback) => tokens.getPropertyValue(name).trim() || fallback;
    const base = {fontStyle: "normal", fontSize: "12px", fontFamily: getComputedStyle(document.body).fontFamily, letterSpacing: "normal", lineHeight: "17px"};
    const brand = inkOf({...base, fontWeight: "650", color: token("--theme-foreground", "#111")});
    const credit = inkOf({...base, fontWeight: "500", color: token("--theme-foreground-muted", "#666")});
    const ruleY = top + height + 16;
    parts.push({kind: "box", x: PNG_MARGIN, y: ruleY, w: width, h: 1, fill: token("--theme-foreground-faintest", "#ddd"), border: null, radius: 0});
    const baseline = ruleY + 12 + useInk(ctx, brand).ascent;
    const page = contextFor(root).pageTitle.replace(/\s*\|\s*Predict Charts\s*$/i, "");
    const pageText = page ? ` · ${page}` : "";
    const address = chartAddress(root);
    const brandWidth = widthOf(ctx, brand, "Predict Charts");
    const pageWidth = widthOf(ctx, credit, pageText);
    const addressWidth = widthOf(ctx, credit, address);
    parts.push({kind: "text", text: "Predict Charts", x: PNG_MARGIN, baseline, ...brand});
    parts.push({kind: "text", text: pageText, x: PNG_MARGIN + brandWidth, baseline, ...credit});
    let bottom = ruleY + 12 + brand.lineHeight;
    if (brandWidth + pageWidth + addressWidth + 16 <= width) {
      parts.push({kind: "text", text: address, x: PNG_MARGIN + width - addressWidth, baseline, ...credit});
    } else {
      parts.push({kind: "text", text: address, x: PNG_MARGIN, baseline: baseline + brand.lineHeight, ...credit});
      bottom += brand.lineHeight;
    }
    return {parts, width: width + 2 * PNG_MARGIN, height: bottom + PNG_MARGIN};
  }

  async function downloadPng(root, button) {
    const svg = mainSvg(root);
    if (!svg) return setButtonStatus(button, "Unavailable");
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return setButtonStatus(button, "Unavailable");
    let images = [];
    try {
      const layout = pngLayout(root, document.createElement("canvas").getContext("2d"));
      images = layout.parts.filter((part) => part.kind === "svg");
      await Promise.all(images.map(async (part) => Object.assign(part, await svgImage(part))));
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(layout.width * scale);
      canvas.height = Math.round(layout.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = pageBackground();
      ctx.fillRect(0, 0, layout.width, layout.height);
      for (const part of layout.parts) paintPart(ctx, part);
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
      for (const part of images) if (part.url) URL.revokeObjectURL(part.url);
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
    const svg = mainSvg(root);
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
    const embed = actionButton("Embed", "Copy code to embed this chart on another site", () => copyEmbed(root, embed));
    const ask = actionButton("Ask", "Ask Predict Charts about this chart", () => {
      const context = contextFor(root);
      saveAskPrefill(context.question, context.context);
      location.assign(askHref());
    });
    tools.append(focus, png, link, embed, ask);
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
    // The embed view (components/embed-mode.js) is one section with no chrome.
    if (document.documentElement.classList.contains("pc-embed")) return;
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
