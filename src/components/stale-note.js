// "May be out of date" note for a series whose source has stopped updating (added 2026-10-08 for
// Novig's settled-outcome files, frozen since Novig changed its data feed on 2026-09-20). It is
// shown only while the data really is old, so it disappears on its own once the feed is current.
import {fmtFreshDate} from "./freshness.js";

const DAY_MS = 86400000;

// Pure part, so it can be tested without a DOM. `latest` is the newest date in the data (or the
// file's last update); `maxAgeDays` is how old it may be before the note shows.
export function staleInfo(latest, {maxAgeDays = 7, now = new Date(), subject = "This data", verb = "ends on", reason = ""} = {}) {
  const d = latest instanceof Date ? latest : latest ? new Date(latest) : null;
  if (!d || Number.isNaN(+d)) return {stale: false, text: ""};
  if ((now - d) / DAY_MS <= maxAgeDays) return {stale: false, text: ""};
  return {stale: true, text: `${subject} ${verb} ${fmtFreshDate(d)}${reason ? `; ${reason}` : ""}.`};
}

// The note itself: the site's muted instruction line, or null when the data is fresh (or absent,
// which the pages already explain with their own "not being served yet" notice).
export function staleNote(latest, options = {}) {
  const {stale, text} = staleInfo(latest, options);
  if (!stale) return null;
  const node = document.createElement("div");
  node.className = "instruction-line stale-note";
  node.style.borderLeftColor = "var(--theme-foreground-muted)";
  const lead = document.createElement("strong");
  lead.textContent = "May be out of date. ";
  node.append(lead, text);
  return node;
}
