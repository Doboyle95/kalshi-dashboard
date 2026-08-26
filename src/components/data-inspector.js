(() => {
  const PREFILL_KEY = "kalshi_chat_prefill";
  const PARAM_PREFIX = "pc_";
  const STATE_KEYS = ["inspect", "date", "venue", "category", "market", "trade", "source"];
  const restored = new Set();
  let panel = null;
  let stack = [];
  let sourceElement = null;

  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function askHref() {
    return document.querySelector('.masthead-ask[href]')?.href || new URL("chat", location.href).href;
  }

  function saveAsk(detail) {
    const question = detail.ask?.question || `Explain the ${detail.title || "selected data"}. What is important and what limitations should I keep in mind?`;
    const context = detail.ask?.context || `${detail.title || "Predict Charts selection"}. Source page: ${location.href}`;
    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify({question, context, ts: Date.now()}));
    } catch {}
    location.assign(askHref());
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    const kind = params.get(`${PARAM_PREFIX}inspect`);
    if (!kind) return null;
    const state = {kind};
    for (const key of STATE_KEYS.slice(1)) {
      const value = params.get(`${PARAM_PREFIX}${key}`);
      if (value != null && value !== "") state[key] = value;
    }
    return state;
  }

  function writeState(state) {
    const url = new URL(location.href);
    for (const key of STATE_KEYS) url.searchParams.delete(`${PARAM_PREFIX}${key}`);
    if (state?.kind) {
      url.searchParams.set(`${PARAM_PREFIX}inspect`, state.kind);
      for (const key of STATE_KEYS.slice(1)) {
        const value = state[key];
        if (value != null && value !== "") url.searchParams.set(`${PARAM_PREFIX}${key}`, String(value));
      }
    }
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function current() {
    return stack.at(-1) || null;
  }

  function ensurePanel() {
    if (panel?.isConnected) return panel;
    panel = element("aside", "data-inspector-panel");
    panel.hidden = true;
    panel.setAttribute("aria-label", "Data inspector");
    // role=dialog + aria-modal=false: a non-modal drawer. It has to be a dialog rather
    // than a bare landmark because open() moves focus into it -- the panel is appended
    // to the END of <body>, so without that a keyboard user who activated a chart or
    // table button landed on a drawer whose first control was 18 tab stops away
    // (measured on /). Focus returns to the trigger on close.
    //
    // Deliberately NOT aria-live: the panel now takes focus, so its contents are
    // announced on arrival. Leaving a live region on the container as well would
    // re-announce the whole drawer on every stack change. The transient
    // .data-inspector-status message keeps its own polite live region.
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.tabIndex = -1;

    const header = element("header", "data-inspector-header");
    const topline = element("div", "data-inspector-topline");
    topline.append(element("strong", "", "Data inspector"));
    const closeButton = element("button", "data-inspector-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close Data inspector");
    closeButton.addEventListener("click", close);
    topline.append(closeButton);
    const breadcrumbs = element("nav", "data-inspector-breadcrumbs");
    breadcrumbs.setAttribute("aria-label", "Inspector history");
    header.append(topline, breadcrumbs);

    const body = element("div", "data-inspector-body");
    const actions = element("footer", "data-inspector-actions");
    const ask = element("button", "data-inspector-ask", "Ask Predict Charts about this selection");
    ask.type = "button";
    ask.addEventListener("click", () => current() && saveAsk(current()));
    const copy = element("button", "data-inspector-copy", "Copy selection link");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        setStatus("Selection link copied");
      } catch {
        window.prompt("Copy this selection link", location.href);
      }
    });
    const status = element("div", "data-inspector-status");
    status.setAttribute("aria-live", "polite");
    actions.append(ask, copy, status);
    panel.append(header, body, actions);
    document.body.append(panel);
    return panel;
  }

  function setStatus(message) {
    const status = ensurePanel().querySelector(".data-inspector-status");
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => { status.textContent = ""; }, 1800);
  }

  function renderBreadcrumbs() {
    const nav = ensurePanel().querySelector(".data-inspector-breadcrumbs");
    nav.replaceChildren();
    if (stack.length > 1) {
      const back = element("button", "data-inspector-back", "← Back");
      back.type = "button";
      back.addEventListener("click", () => {
        stack.pop();
        writeState(current()?.state);
        render();
        document.dispatchEvent(new CustomEvent("predict-charts:inspector-open", {detail: current()}));
      });
      nav.append(back);
    }
    stack.forEach((detail, index) => {
      if (index) nav.append(document.createTextNode(" / "));
      const crumb = element("button", "data-inspector-crumb", detail.crumb || detail.title || "Detail");
      crumb.type = "button";
      if (index === stack.length - 1) crumb.setAttribute("aria-current", "page");
      crumb.addEventListener("click", () => {
        stack = stack.slice(0, index + 1);
        writeState(current()?.state);
        render();
        document.dispatchEvent(new CustomEvent("predict-charts:inspector-open", {detail: current()}));
      });
      nav.append(crumb);
    });
  }

  function renderFacts(body, facts = []) {
    if (!facts.length) return;
    const grid = element("dl", "data-inspector-facts");
    for (const fact of facts) {
      const item = element("div", "data-inspector-fact");
      item.append(element("dt", "", fact.label), element("dd", fact.tone ? `is-${fact.tone}` : "", fact.value));
      grid.append(item);
    }
    body.append(grid);
  }

  function itemDetail(item) {
    return typeof item.detail === "function" ? item.detail() : item.detail;
  }

  function renderSections(body, sections = []) {
    for (const section of sections) {
      if (!section?.items?.length) continue;
      const group = element("section", "data-inspector-section");
      if (section.title) group.append(element("h4", "", section.title));
      for (const item of section.items) {
        const interactive = item.detail || item.href;
        const row = element(interactive ? (item.href ? "a" : "button") : "div", "data-inspector-row");
        if (row.tagName === "BUTTON") row.type = "button";
        if (row.tagName === "A") row.href = item.href;
        const copy = element("span", "data-inspector-row-copy");
        copy.append(element("strong", "", item.label));
        if (item.description) copy.append(element("small", "", item.description));
        const value = element("span", "data-inspector-row-value", item.value ?? "");
        if (item.meta) value.append(element("small", "", item.meta));
        row.append(copy, value);
        if (item.detail) row.addEventListener("click", event => open(itemDetail(item), {source: event.currentTarget}));
        group.append(row);
      }
      body.append(group);
    }
  }

  function render() {
    const detail = current();
    if (!detail) return close();
    const root = ensurePanel();
    // Every re-render replaceChildren()s the body AND the breadcrumbs, which destroys
    // whatever the reader just activated -- a drill-down row, Back, or a crumb. Focus
    // would land on <body> and their place in the drawer would be gone. Catch it here
    // rather than in each handler so all three paths behave the same.
    const focusWasInside = root.contains(document.activeElement);
    const body = root.querySelector(".data-inspector-body");
    body.replaceChildren();
    renderBreadcrumbs();

    if (detail.eyebrow) body.append(element("div", "data-inspector-eyebrow", detail.eyebrow));
    body.append(element("h3", "", detail.title || "Selected data"));
    if (detail.subtitle) body.append(element("p", "data-inspector-subtitle", detail.subtitle));
    if (detail.value) body.append(element("div", "data-inspector-value", detail.value));
    if (detail.delta) body.append(element("p", detail.deltaTone ? `data-inspector-delta is-${detail.deltaTone}` : "data-inspector-delta", detail.delta));
    renderFacts(body, detail.facts);
    renderSections(body, detail.sections);
    if (detail.coverage) body.append(element("p", "data-inspector-coverage", detail.coverage));
    if (focusWasInside) root.focus({preventScroll: true});
  }

  function open(detail, options = {}) {
    if (!detail) return;
    const root = ensurePanel();
    if (options.replace || !stack.length) stack = [detail];
    else stack.push(detail);
    // Only remember a trigger from OUTSIDE the drawer. A drill-down row passes itself
    // as the source, but re-rendering destroys it, so close() would find an element
    // that is no longer connected and silently restore focus nowhere. The thing to
    // return to is whatever opened the drawer in the first place.
    if (options.source && !root.contains(options.source)) sourceElement = options.source;
    const wasHidden = root.hidden;
    root.hidden = false;
    document.documentElement.classList.add("data-inspector-open");
    writeState(detail.state);
    render();
    if (wasHidden) root.focus({preventScroll: true});
    document.dispatchEvent(new CustomEvent("predict-charts:inspector-open", {detail}));
  }

  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    stack = [];
    document.documentElement.classList.remove("data-inspector-open");
    writeState(null);
    document.dispatchEvent(new CustomEvent("predict-charts:inspector-close"));
    if (sourceElement?.isConnected) sourceElement.focus?.({preventScroll: true});
    sourceElement = null;
  }

  function restore(key, resolver) {
    if (restored.has(key)) return;
    restored.add(key);
    const state = readState();
    if (!state) return;
    const detail = resolver?.(state);
    if (Array.isArray(detail)) {
      detail.filter(Boolean).forEach((value, index) => open(value, {replace: index === 0}));
    } else if (detail) {
      open(detail, {replace: true});
    }
  }

  function bindTimeSeries(root, options) {
    const svg = root?.matches?.("svg") ? root : root?.querySelector?.("svg");
    if (!svg) return {destroy() {}, select() {}};
    const dateAccessor = options.dateAccessor || (value => value.date);
    const dates = Array.from(new Set((options.data || []).map(dateAccessor).filter(Boolean).map(value => +value)))
      .sort((a, b) => a - b);
    if (!dates.length) return {destroy() {}, select() {}};
    const marginLeft = options.marginLeft ?? 60;
    const marginRight = options.marginRight ?? 20;
    let selected = null;
    svg.classList.add("data-inspector-clickable-chart");

    function geometry() {
      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox?.baseVal;
      const width = viewBox?.width || +(svg.getAttribute("width") || rect.width);
      const height = viewBox?.height || +(svg.getAttribute("height") || rect.height);
      return {rect, width, height};
    }

    function nearestDate(clientX) {
      const {rect, width} = geometry();
      const svgX = (clientX - rect.left) / rect.width * width;
      const ratio = Math.max(0, Math.min(1, (svgX - marginLeft) / Math.max(1, width - marginLeft - marginRight)));
      const target = dates[0] + ratio * (dates.at(-1) - dates[0]);
      let lo = 0, hi = dates.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (dates[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      if (lo && Math.abs(dates[lo - 1] - target) < Math.abs(dates[lo] - target)) lo -= 1;
      return new Date(dates[lo]);
    }

    function drawSelection(date) {
      selected = date ? new Date(date) : null;
      svg.querySelector("[data-inspector-selection]")?.remove();
      if (!selected || !Number.isFinite(+selected)) return;
      const {width, height} = geometry();
      const ratio = dates.length === 1 ? 0.5 : (+selected - dates[0]) / (dates.at(-1) - dates[0]);
      const x = marginLeft + Math.max(0, Math.min(1, ratio)) * (width - marginLeft - marginRight);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.dataset.inspectorSelection = "true";
      line.setAttribute("x1", x);
      line.setAttribute("x2", x);
      line.setAttribute("y1", 6);
      line.setAttribute("y2", Math.max(8, height - 28));
      line.setAttribute("class", "data-inspector-selection-rule");
      line.setAttribute("pointer-events", "none");
      svg.append(line);
    }

    function click(event) {
      if (event.defaultPrevented || event.button !== 0 || event.target.closest("a, button")) return;
      const date = nearestDate(event.clientX);
      const detail = options.getDetail?.(date);
      if (!detail) return;
      drawSelection(date);
      open(detail, {replace: true, source: svg});
    }

    function closeSelection() {
      drawSelection(null);
    }

    svg.addEventListener("click", click);
    document.addEventListener("predict-charts:inspector-close", closeSelection);
    return {
      select: drawSelection,
      destroy() {
        svg.removeEventListener("click", click);
        document.removeEventListener("predict-charts:inspector-close", closeSelection);
        svg.querySelector("[data-inspector-selection]")?.remove();
      }
    };
  }

  document.addEventListener("predict-charts:inspect", event => open(event.detail, {source: event.target}));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel && !panel.hidden) close();
  });

  window.PredictChartsInspector = {open, close, current, readState, restore, bindTimeSeries};
})();
