export const CHAT_PREFILL_KEY = "kalshi_chat_prefill";

export function fmtFreshDate(date) {
  if (!date) return "n/a";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(+d)) return "n/a";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function fmtFreshDateTime(date) {
  if (!date) return "n/a";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(+d)) return "n/a";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

export function fileUpdatedAt(manifest, filename) {
  return manifest?.files?.[filename]?.last_write_time ?? null;
}

export function latestDate(rows, accessor = d => d.date) {
  let latest = null;
  for (const row of rows ?? []) {
    const raw = accessor(row);
    if (raw == null || raw === "") continue;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(+d)) continue;
    if (latest == null || d > latest) latest = d;
  }
  return latest;
}

export function earliestDate(rows, accessor = d => d.date) {
  let earliest = null;
  for (const row of rows ?? []) {
    const raw = accessor(row);
    if (raw == null || raw === "") continue;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(+d)) continue;
    if (earliest == null || d < earliest) earliest = d;
  }
  return earliest;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function freshnessPanel({
  title = "Data freshness",
  items = [],
  note = ""
} = {}) {
  const visibleItems = items.filter(Boolean);
  const latestUpdate = latestDate(visibleItems, d => d.updatedAt);
  const panel = el("details", "freshness-panel surface-card compact-details");
  const summary = el("summary", "freshness-summary");
  summary.append(el("span", "freshness-title", title));
  if (latestUpdate) {
    summary.append(el("span", "freshness-summary-updated", `Updated ${fmtFreshDateTime(latestUpdate)}`));
  }
  panel.append(summary);

  const grid = el("div", "freshness-grid");
  for (const item of visibleItems) {
    const card = el("div", "freshness-item");
    if (item.tone) card.dataset.tone = item.tone;
    card.append(el("div", "freshness-label", item.label));
    card.append(el("div", "freshness-value", item.value ?? fmtFreshDate(item.date)));
    if (item.updatedAt) card.append(el("div", "freshness-updated", `Updated ${fmtFreshDateTime(item.updatedAt)}`));
    if (item.meta) card.append(el("div", "freshness-meta", item.meta));
    grid.append(card);
  }
  panel.append(grid);

  if (note) panel.append(el("p", "freshness-note", note));
  return panel;
}

export function askPageLink({
  question,
  context = "",
  label = "Ask Predict Charts about this page"
} = {}) {
  const link = el("a", "page-ask-link", label);
  link.href = "chat";
  link.addEventListener("click", () => {
    if (!question) return;
    try {
      localStorage.setItem(CHAT_PREFILL_KEY, JSON.stringify({
        question,
        context,
        ts: Date.now()
      }));
    } catch {}
  });
  return link;
}
