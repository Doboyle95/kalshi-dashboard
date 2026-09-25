// Shared event annotations for venue volume charts.
//
// Keep these as chart context, not as data: an event marker may land on a day
// with no published row (especially on sparse bulletin feeds), and that is
// still useful context for reading a nearby volume move.
export const ESTABLISHED_VOLUME_EVENTS = Object.freeze([
  {date: new Date("2026-02-08"), label: "Super Bowl LX", tier: 1},
  {date: new Date("2026-03-19"), label: "March Madness '26", tier: 2},
  {date: new Date("2026-06-11"), label: "World Cup '26", tier: 0},
  {date: new Date("2026-07-19"), label: "World Cup final", tier: 2}
]);

const TIER_HEIGHTS = {0: 1, 1: 0.75, 2: 0.48};

function asDate(value) {
  const date = value instanceof Date ? new Date(+value) : new Date(value);
  return Number.isNaN(+date) ? null : date;
}

// Select events in the visible window and place their hoverable markers at
// staggered heights so nearby dates remain distinguishable.
export function positionedVolumeEvents(events, start, end, maxValue) {
  const startDate = asDate(start);
  const endDate = asDate(end);
  if (!startDate || !endDate) return [];

  const lo = Math.min(+startDate, +endDate);
  const hi = Math.max(+startDate, +endDate);
  const top = Number.isFinite(+maxValue) && +maxValue > 0 ? +maxValue : 1;

  return (events ?? [])
    .map(event => ({...event, date: asDate(event.date)}))
    .filter(event => event.date && +event.date >= lo && +event.date <= hi)
    .map(event => ({
      ...event,
      y: top * (TIER_HEIGHTS[event.tier] ?? TIER_HEIGHTS[1])
    }));
}

// The caller passes its page-level Plot binding so this helper stays a pure
// module and works with Observable's page-scoped Plot import.
export function volumeEventMarks(Plot, events) {
  if (!events?.length) return [];
  return [Plot.ruleX(events, {
    x: "date",
    stroke: "var(--annotation-stroke)",
    strokeDasharray: "4,4",
    strokeOpacity: 0.6,
    strokeWidth: 1
  }), Plot.dot(events, {
    x: "date", y: "y", symbol: "diamond", r: 4,
    fill: "var(--annotation-stroke)", stroke: "var(--editorial-paper)",
    title: event => `${event.label} · ${event.date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"})}`,
    tip: true
  })];
}
