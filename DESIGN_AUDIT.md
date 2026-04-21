# Design Audit — US Prediction Markets Dashboard

_Audited: 2026-04-20. Covers styles.css, observablehq.config.js, index.md, volume.md, competitors.md, categories.md, parlay.md._

---

## Executive Summary

The CSS design system is well-structured — design tokens, semantic accents, a real `.kpi-card` component, and dark-mode support are all present. The problem is that **the .md pages haven't migrated to use them**. Every page except (partially) parlay.md uses raw inline `style="..."` blocks for KPI cards, hardcoded hex colors that don't match the token palette, and repeated D3 brush boilerplate. The visual result is a two-tier dashboard: a thoughtful CSS file that the actual content largely ignores. The charts themselves are functional but use default Observable/D3 grid and axis styling throughout, which reads as unfinished. The nav has 10 items with inconsistent naming conventions and no visual grouping. Typography is declared in CSS but font loading is implicit — Inter likely falls back to system fonts in many browsers. Fixing the inline-style cards and adding a Google Fonts `@import` for Inter would alone make the dashboard look substantially more intentional.

---

## Quick Wins
_High impact, low effort — most are single-line or find-and-replace changes._

### 1. Actually load Inter from Google Fonts

`styles.css` declares `--font-sans: "Inter", -apple-system, ...` but never loads Inter. Observable Framework's default CSS `@import` does not include Inter. Add this **before** the `@import url("observablehq:default.css")` line:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
```

Or, for self-hosting (recommended for a static GH Pages site — avoids CORS and latency):
- Download `Inter` as a variable font from `rsms.me/inter/`
- Place it in `src/assets/inter/`
- Add a `@font-face` block in `styles.css`

Without this, the entire `font-feature-settings: "cv02", "cv03"...` block in `body {}` is operating on whatever system font the browser chose. On Windows this is Segoe UI; on Mac it is San Francisco — both fine, but the careful weight hierarchy declared (`font-weight: 650` on h2 etc.) won't resolve correctly without Inter's full variable axis.

### 2. Replace all inline KPI card blocks with `.kpi-card` / `.kpi-grid`

This is the single highest-leverage change. The CSS already has the full component. It is used in **zero** pages. Every page has a copy-pasted block like:

```html
<!-- index.md and volume.md (identical pattern) -->
<div style="display:flex;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
  <div style="background:#f4f8ff;border-left:4px solid #2c7bb6;padding:0.8rem 1.2rem;flex:1;min-width:150px">
    <div style="font-size:0.75em;color:#666;text-transform:uppercase;letter-spacing:0.05em">...</div>
    <div style="font-size:1.6em;font-weight:700;color:#2c7bb6">...</div>
  </div>
```

Replace every one of these with:

```html
<div class="kpi-grid">
  <div class="kpi-card" data-accent="kalshi">
    <div class="kpi-label">Kalshi all-time contracts</div>
    <div class="kpi-value">${fmtCount(totalContracts)}</div>
  </div>
  <div class="kpi-card" data-accent="secondary">
    <div class="kpi-label">Kalshi all-time fee revenue</div>
    <div class="kpi-value">${fmtUSD(totalFees)}</div>
  </div>
  ...
</div>
```

The CSS already handles: left accent bar color, hover lift, dark-mode, tabular numerals, `kpi-label` / `kpi-value` / `kpi-meta` hierarchy, and responsive grid. **Parlay.md** is the worst offender — its cards use `background:#f8f8f8` which is invisible in dark mode (gray on near-black) and a value color of `#333` (also invisible in dark mode). Migrating it fixes the dark-mode bug automatically.

### 3. Reconcile the Kalshi blue — pick one hex and stick with it

The CSS tokens define `--accent-kalshi: #2563eb`. The .md files universally use `#2c7bb6`. These are noticeably different blues (the token is vivid Bootstrap-blue; the charts are a softer steel-blue). The chart usage is arguably more readable as a data color. Pick one:
- **Option A**: Change the CSS token to `#2c7bb6` to match the charts.
- **Option B**: Update all chart hardcodes (`fill: "#2c7bb6"`, `stroke: "#2c7bb6"`, `border-left: 4px solid #2c7bb6`) to use the token.

Option A is faster. The token is only used for the `.kpi-card` accent bar and theme-toggle active state — two occurrences in the CSS, zero in the .md files.

### 4. Add a single shared `chartDefaults` object and stop repeating `marginRight: 16`, `height: 380`, etc.

Each chart block independently specifies margins and heights. Create one shared JS block (e.g., in a `src/components/chart-defaults.js` file or a shared cell near the top of each page) like:

```js
const chartDefaults = {
  marginRight: 24,
  marginLeft: 60,
  style: { fontSize: "12px", fontFamily: "var(--font-sans)" }
};
```

Then each `Plot.plot({...chartDefaults, width, height: 380, ...})` call gains consistent margins. The bigger benefit is `style: { fontFamily: "var(--font-sans)" }` — **Observable Plot does not inherit CSS font-family by default**. The axis tick labels, legend text, and tooltip text are all rendering in Observable's default sans-serif unless you pass this. This is a visible difference once Inter loads.

### 5. Darken the chart grid lines and soften the axis domain line

Current grids use `grid: true` (Observable default), which renders as `#e0e0e0` light gray. This reads as fine on white but disappears in dark mode. Replace with explicit grid styling:

In each `Plot.plot()` call, change:
```js
y: { grid: true }
```
to:
```js
y: { grid: true, tickColor: "var(--theme-foreground-faintest)", labelColor: "var(--theme-foreground-muted)" }
```

Or globally, add to `styles.css`:
```css
/* Observable Plot grid lines */
.plot [aria-label="grid"] line {
  stroke: var(--theme-foreground-faintest);
}
.plot [aria-label="y-axis"] .domain,
.plot [aria-label="x-axis"] .domain {
  display: none;
}
```

Removing the axis domain line (the solid border at y=0 and x=left-edge) is a standard data-viz best practice that immediately makes charts look cleaner.

### 6. Replace the plain-text chart legends with styled HTML

Current legends are ad-hoc HTML like:
```html
<span style="color:#2c7bb6">&#9632; Daily</span> &nbsp; <span style="color:#e15759">&#8212; 7-day average</span>
```
These use raw Unicode glyphs (■ ─) which render inconsistently across OS. Observable Plot has built-in `color: {legend: true}` which most charts already use — but the override legends (volume.md line 197, categories.md line 86) should either be removed (if Plot already shows one) or rebuilt as:
```html
<div class="caption" style="display:flex;gap:1rem;margin-top:0.5rem">
  <span><span style="display:inline-block;width:12px;height:12px;background:#2c7bb6;border-radius:2px;vertical-align:middle"></span> Daily</span>
  <span><span style="display:inline-block;width:24px;height:2px;background:#e15759;vertical-align:middle"></span> 7-day avg</span>
</div>
```

### 7. Fix the footnote/caption styling — use `.caption` class instead of repeated inline styles

There are 6+ instances of `<p style="font-size:0.82em;color:#888">` or `<p style="font-size:0.82em;color:#999">`. The CSS already defines `.caption { font-size: var(--text-caption); color: var(--text-muted); }`. Replace all with `<p class="caption">`. The color `#888` / `#999` is hardcoded and won't adapt in dark mode — the `.caption` class uses `--text-muted` which flips correctly.

### 8. Fix the date brush mini-charts — they use hardcoded light-mode colors

Every page has a brush sparkline with `.style("background", "#fafafa")` and `.style("border", "1px solid #e8e8e8")`. In dark mode these render as pale gray boxes against a dark background. Fix by using CSS variables:

```js
.style("background", "var(--theme-background-alt)")
.style("border", "1px solid var(--card-border)")
```

This requires the SVG to be placed in the DOM before the CSS variable resolves, which it is (D3 `.create` + `display()`). Same fix applies to tick label `attr("fill", "#888")` → `attr("fill", "var(--theme-foreground-muted)")` and domain line `attr("stroke", "#ccc")` → `attr("stroke", "var(--card-border)")`.

---

## Medium Effort Improvements

### 9. Rename and reorganize the nav

Current nav (observablehq.config.js):
```
Overview | Kalshi Volume | Fee Revenue | Categories | Parlay P&L | Calibration | Platform Comparison | Polymarket US | ForecastEx | Crypto.com/Nadex
```

Problems:
- **10 items is too many** for a flat nav — it wraps on medium screens.
- "Platform Comparison" and "Polymarket US" / "ForecastEx" / "Crypto.com/Nadex" are redundant if the Comparison page covers all platforms.
- Name inconsistency: "Kalshi Volume" is the only page with a platform prefix; others are topics.
- Observable Framework supports `pages` grouping with `{ section: "Kalshi", pages: [...] }`. Use it:

```js
pages: [
  { name: "Overview", path: "/" },
  {
    name: "Kalshi",
    pages: [
      { name: "Volume", path: "/volume" },
      { name: "Fee Revenue", path: "/fees" },
      { name: "Categories", path: "/categories" },
      { name: "Parlay P&L", path: "/parlay" },
      { name: "Calibration", path: "/calibration" },
    ]
  },
  {
    name: "Competition",
    pages: [
      { name: "Platform Comparison", path: "/competitors" },
      { name: "Polymarket US", path: "/polymarket" },
      { name: "ForecastEx", path: "/forecastex" },
      { name: "Crypto.com/Nadex", path: "/nadex" },
    ]
  }
]
```

This reduces the visible top-level items from 10 to 3 and adds logical grouping.

### 10. Add `x: {label: null}` and clean up axis labels consistently

Most x-axes have `label: null` (correct — dates don't need a label). But y-axis labels are inconsistent:
- `label: "Daily contracts"` — good
- `label: "Contracts"` — ambiguous (missing "Daily" vs cumulative)
- `label: "Cumulative P&L (USD)"` — good
- `label: "Market share"` — lowercase, others are title-case

Standardize y-axis labels to: brief, title-case where possible, include "(USD)" for money and "(contracts)" for count axes. Use consistent capitalization: `"Daily Contracts"`, `"Cumulative Taker P&L (USD)"`, `"Market Share"`.

### 11. Add `marginTop` to all charts and increase default `marginLeft`

Current charts use default `marginLeft` (~40px), which clips long Y-axis tick labels like `"1.0B"` or `"$500M"`. Increase to `marginLeft: 60` for charts with USD labels, `marginLeft: 52` for contract counts. Add `marginTop: 8` to prevent the top of tall bars or lines from being clipped.

### 12. Consolidate the duplicated `fmtCount` / `fmtDate` / `fmtUSD` helpers

These three functions are copy-pasted identically into every `.md` file (index.md, volume.md, competitors.md, categories.md, parlay.md). Move them to `src/components/fmt.js`:

```js
export const fmtCount = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"k" : String(n ?? 0);
export const fmtUSD   = n => "$" + fmtCount(n);
export const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) ?? "";
```

Then each page uses `import {fmtCount, fmtUSD, fmtDate} from "./components/fmt.js"`. This is a codebase quality win — a future format change (e.g., using `Intl.NumberFormat`) happens in one place.

### 13. Add a visible "last updated" date to the Overview page

The footer says "Updated nightly" but there's no timestamp visible on the page itself. Readers can't tell if the data is stale. Add a line below the intro paragraph:

```js
const lastDate = d3.max(kalshi, d => d.date);
```

```html
<p class="caption">Last data point: <strong>${fmtDate(lastDate)}</strong>. Updated nightly via Kalshi trade records.</p>
```

### 14. Set consistent chart heights and reduce visual fragmentation on volume.md

volume.md has charts at heights 380, 280, 260, and 300px within the same page. The visual rhythm is choppy. Standardize to two heights: `340` for primary charts and `240` for secondary/supporting charts. The `height: 280` sports chart and `height: 260` daily return chart read as slightly too short for the data density they contain.

### 15. Add `strokeLinejoin: "round"` and `strokeLinecap: "round"` to all line charts

Every `Plot.lineY(...)` call currently uses default square line joins, which produces visible "knees" at sharp angle changes in the data. Adding:
```js
Plot.lineY(data, { ..., strokeLinejoin: "round", strokeLinecap: "round" })
```
gives the lines a more polished, modern appearance with no perceptual cost.

### 16. The parlay.md dark-mode color bug is severe — fix first among the KPI cards

The fourth parlay KPI card uses `color:#333` for its value:
```html
<div style="font-size:1.8em;font-weight:700;color:#333">${fmtUSD(totalStakes)}</div>
```
In dark mode (dark background ~`#161616`, text `#dfdfd6`), `#333` renders as nearly invisible dark gray text. This is the single worst rendering bug visible to dark-mode users. Fix by migrating to `.kpi-card` (see Quick Win #2) or at minimum changing `color:#333` to `color:var(--theme-foreground)`.

---

## Bigger Structural Changes

### 17. Create a `src/components/date-brush.js` shared component

The date-brush mini-chart is copy-pasted verbatim into volume.md, competitors.md, categories.md, and parlay.md — approximately 35 lines of D3 each time, ~140 total duplicate lines. Each copy has the same dark-mode bug (hardcoded `#fafafa` background). Extract to:

```js
// src/components/date-brush.js
export function makeDateBrush({data, xAcc, yAcc, color, defaultStart, defaultEnd, mutable}) {
  // ... single canonical implementation
}
```

With the dark-mode fixes applied once. This is the largest single source of code duplication in the project.

### 18. Add a site-wide header/hero treatment to the Overview page

Currently the Overview page starts directly with an `h1` and immediately hits KPI cards. There is no visual hierarchy cue that this is a journalistic data product. Consider adding a brief "About this dashboard" callout box using the existing card styles:

```html
<div class="kpi-card" style="margin-bottom: var(--space-5); border-left-width: 0; border-top: 3px solid var(--accent-kalshi)">
  <p style="margin:0">Tracking regulated US prediction markets — Kalshi, Polymarket US, ForecastEx, and Crypto.com/Nadex. 
  Kalshi data from exchange trade records (Daniel O'Boyle, InGame.com). 
  Competitors from public filings and CFTC bulletins. <a href="/volume">Explore Kalshi volume →</a></p>
</div>
```

This adds journalistic context and a clear call-to-action without being heavy-handed.

### 19. Consider Observable Plot's built-in `tip` mark instead of custom `title` functions

Throughout the codebase, tooltips are built using `Plot.tip(pivotData, Plot.pointerX({title: d => [...].join("\n")}))` with hand-rolled pivot tables. Observable Plot 0.6+ has a richer `tip` mark that renders HTML, supports `format` per channel, and handles multi-series automatically. Migrating would:
- Remove the `tipPivot` / `cumPivot` / `shareByDate` rollup boilerplate (~15-20 lines per chart)
- Enable styled tooltips (the current `\n`-joined string tooltip uses a fixed monospace-style box)
- Allow using `Plot.crosshair` for the vertical tracking line, which replaces `Plot.ruleX(data, Plot.pointerX(...))` with a single, better-behaved mark

This is a larger rewrite but the resulting code is substantially shorter and the tooltips look more polished.

### 20. Unify the platform color palette across the entire codebase

There are three separate color maps in use:

| Location | Kalshi | Polymarket | ForecastEx | Nadex |
|---|---|---|---|---|
| `styles.css` tokens | `#2563eb` | `#e66101` | `#1a9641` | `#9c27b0` |
| `index.md` chart `pColors` | `#2c7bb6` | `#e66101` | `#1a9641` | `#9c27b0` |
| `competitors.md` `platforms` array | `#2c7bb6` | `#e66101` | `#1a9641` | `#9c27b0` |

Polymarket, ForecastEx, and Nadex are consistent but Kalshi is split between `#2563eb` (CSS token) and `#2c7bb6` (charts, cards). Fix: unify to `#2c7bb6` in both CSS and chart code, then reference the CSS variable in charts via Observable's `Plot.plot({ style: { ... } })` theme injection or a JS constant pulled from `getComputedStyle`.

Better long-term: export platform colors from a single JS module (`src/components/platform-colors.js`) that both the chart pages and any future components import. The CSS custom properties can reference these via `@property` or a small inline script that reads the JS module at build time — or simply duplicate the final agreed values in both places with a comment indicating they're in sync.

### 21. Add page-level introductory text to every page

Currently most pages drop directly from `h1` to controls (radio buttons, date pickers) with no explanatory sentence. First-time visitors — especially journalists or potential sources — won't understand what they're looking at. Add 1-2 sentence leads on each page:

- **volume.md**: "Total contracts traded on Kalshi by day, from launch in June 2021 through today. A contract is a binary bet on a yes/no outcome, priced 1¢–99¢."
- **competitors.md**: "How Kalshi's scale compares to other regulated US prediction markets. Note: the Y-axis is shared — the gap is real."
- **categories.md**: "What Kalshi users bet on. Football and basketball dominate; parlays (multi-game combos) are a growing share."
- **parlay.md**: "Taker profit/loss on parlay markets. Negative means bettors collectively lost that amount net of fees. Kalshi keeps the house edge."

These sentences already exist in some form (footnotes, subtitles) but are buried in small gray text after the charts. Move them above the controls.

---

## Specific Config/Code Suggestions

### observablehq.config.js — add `theme` and `style`

```js
export default {
  title: "US Prediction Markets",
  base: "/kalshi-dashboard/",
  root: "src",
  theme: ["air", "near-midnight"],  // explicit light+dark — don't rely on auto-detection
  style: "styles.css",              // explicitly declare (may already be implicit)
  // ... pages
};
```

### Shared chart style injection (add to each Plot.plot call until a shared component exists)

```js
const PLOT_STYLE = {
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  overflow: "visible"  // prevents tick label clipping at chart edges
};

// Usage:
Plot.plot({ style: PLOT_STYLE, width, height: 340, ... })
```

### CSS addition for Plot axis cleanup (add to styles.css)

```css
/* ============================================================
   Observable Plot overrides
   ============================================================ */

/* Remove heavy axis border lines */
.plot [aria-label$="-axis"] .domain { display: none; }

/* Soften grid lines */
.plot [aria-label="grid"] line {
  stroke: var(--divider);
  stroke-opacity: 0.8;
}

/* Legend items — match body font */
.plot [aria-label="color legend"] text,
.plot [aria-label="opacity legend"] text {
  font-family: var(--font-sans);
  font-size: 0.78rem;
  fill: var(--text-muted);
}
```

### CSS addition for the brush area (replace in styles.css or add as new component rules)

```css
/* Date brush mini-chart wrapper */
.date-brush-svg {
  background: var(--theme-background-alt);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  margin-bottom: 1.5rem;
  display: block;
}
```

---

_Audit complete. Priority order: Quick Wins 1–3 (font loading, KPI migration, color unification) have the most visual impact. Quick Win 8 (brush dark-mode fix) and the parlay dark-mode bug (#16) are active rendering failures that should be fixed before any promotional linking._
