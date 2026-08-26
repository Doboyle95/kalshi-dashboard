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
const RIGHT_EDGE_THRESHOLD = 0.84;

function asDate(value) {
  const date = value instanceof Date ? new Date(+value) : new Date(value);
  return Number.isNaN(+date) ? null : date;
}

// Select events in the visible window, place them at staggered heights, and
// point labels toward the plot interior when they are close to the right edge.
// The latter matters because Plot clips text to the chart area: a rotated
// textAnchor="start" at the final event can lose the end of its label.
export function positionedVolumeEvents(events, start, end, maxValue) {
  const startDate = asDate(start);
  const endDate = asDate(end);
  if (!startDate || !endDate) return [];

  const lo = Math.min(+startDate, +endDate);
  const hi = Math.max(+startDate, +endDate);
  const span = Math.max(1, hi - lo);
  const top = Number.isFinite(+maxValue) && +maxValue > 0 ? +maxValue : 1;

  return (events ?? [])
    .map(event => ({...event, date: asDate(event.date)}))
    .filter(event => event.date && +event.date >= lo && +event.date <= hi)
    .map(event => {
      const position = (+event.date - lo) / span;
      const textAnchor = position >= RIGHT_EDGE_THRESHOLD ? "end" : "start";
      return {
        ...event,
        y: top * (TIER_HEIGHTS[event.tier] ?? TIER_HEIGHTS[1]),
        textAnchor,
        labelDx: textAnchor === "end" ? -3 : 3
      };
    });
}

// The caller passes its page-level Plot binding so this helper stays a pure
// module and works with Observable's page-scoped Plot import.
export function volumeEventMarks(Plot, events) {
  if (!events?.length) return [];
  const marks = [Plot.ruleX(events, {
    x: "date",
    stroke: "var(--annotation-stroke)",
    strokeDasharray: "3,3",
    strokeWidth: 1
  })];
  const textOptions = {
    x: "date", y: "y", text: "label",
    lineAnchor: "bottom",
    rotate: -42,
    fontSize: 10,
    fill: "var(--annotation-text)",
    dy: -2
  };
  const startLabels = events.filter(event => event.textAnchor === "start");
  const endLabels = events.filter(event => event.textAnchor === "end");
  if (startLabels.length) marks.push(Plot.text(startLabels, {...textOptions, textAnchor: "start", dx: 3}));
  if (endLabels.length) marks.push(Plot.text(endLabels, {...textOptions, textAnchor: "end", dx: -3}));
  return marks;
}
