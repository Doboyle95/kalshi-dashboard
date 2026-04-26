---
title: Categories
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Categories</h1>
  <p class="page-lead">Explore how Kalshi volume is distributed across sports, non-sports, and the subtypes inside each category. This page is built to be navigated, not just scanned.</p>
  <div class="page-meta">Click into categories to focus the rest of the page, pin comparisons, and use annotated event mode when you want more historical context.</div>
</div>

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>This page uses daily ticker/category aggregates rather than raw browser-side trades. The volume map starts from broad categories and can drill into the largest component markets inside the selected parent; smaller residual activity is grouped so the displayed pieces remain readable without implying the omitted tail is zero. Raw ticker prefixes are shortened in labels for readability.</p>
</details>

<details class="surface-card compact-details">
  <summary>How to use this page</summary>
  <p>Use the treemap as the navigation surface: hover to preview, click to drill in, and click the zoomed view again to return. Pinned comparisons are best for side-by-side trend reading; annotated event mode is best when you want to explain a category shift.</p>
</details>

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
const mktLeaderboard = await FileAttachment("data/market_leaderboard.csv").csv({typed: true});
import {hashGet, hashSet, hashInput} from "./components/hash-state.js";
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const TM_CATEGORY_ORDER = [
  "NFL", "College Football", "NBA", "College Basketball", "Baseball",
  "Hockey", "Golf", "Tennis", "Soccer", "Combat Sports", "Parlay",
  "Crypto", "Politics", "Finance", "Entertainment", "Weather",
  "Other Sports", "Other Non-sports"
];

const TM_CATEGORY_COLORS = {
  "NFL": "#C62828",
  "Combat Sports": "#8B1A1A",
  "College Football": "#E64A19",
  "Tennis": "#E53935",
  "NBA": "#F57F17",
  "Soccer": "#F9A825",
  "Golf": "#FBC02D",
  "Parlay": "#FDD835",
  "Baseball": "#F06292",
  "College Basketball": "#D81B60",
  "Hockey": "#4E342E",
  "Other Sports": "#8D6E63",
  "Crypto": "#0D47A1",
  "Politics": "#1A237E",
  "Finance": "#1E88E5",
  "Weather": "#4FC3F7",
  "Entertainment": "#0097A7",
  "Other Non-sports": "#7986CB"
};

const TM_TO_WIDE_CATEGORY = {
  "College Football": "College football",
  "College Basketball": "College basketball",
  "Combat Sports": "Combat sports",
  "Other Sports": "Other sports",
  "Other Non-sports": "Other non-sports"
};

const CATEGORY_EVENTS = [
  {date: new Date("2024-11-05"), label: "Election Day '24"},
  {date: new Date("2025-01-23"), label: "Sports launch"},
  {date: new Date("2025-09-27"), label: "Parlays launch"},
  {date: new Date("2026-02-08"), label: "Super Bowl LX"},
  {date: new Date("2026-03-19"), label: "March Madness '26"}
];

const topDailyCols = Object.keys(topDaily[0]).filter(k => k !== "date");

function normalizeTreemapCategory(cat) {
  return TM_TO_WIDE_CATEGORY[cat] || cat;
}

function classifyTreemapTicker(ticker, isSports) {
  const grp = isSports === "TRUE" ? "Sports" : "Non-sports";

  let cat;
  if      (ticker.startsWith("KXMVE"))                                           cat = "Parlay";
  else if (ticker.startsWith("KXNFL") || ticker === "KXSB")                     cat = "NFL";
  else if (ticker.startsWith("KXNCAAF"))                                         cat = "College Football";
  else if (ticker.startsWith("KXNBA"))                                           cat = "NBA";
  else if (ticker.startsWith("KXNCAAMB") || ticker.startsWith("KXNCAAWB") ||
           ticker.startsWith("KXMARMAD") || ticker.startsWith("KXWMARMAD"))     cat = "College Basketball";
  else if (ticker.startsWith("KXMLB"))                                           cat = "Baseball";
  else if (ticker.startsWith("KXNHL"))                                           cat = "Hockey";
  else if (ticker.startsWith("KXPGA"))                                           cat = "Golf";
  else if (ticker.startsWith("KXATP") || ticker.startsWith("KXWTA"))            cat = "Tennis";
  else if (ticker.startsWith("KXEPL") || ticker.startsWith("KXUCL") ||
           ticker.startsWith("KXLALIGA") || ticker.startsWith("KXSERIEA") ||
           ticker.startsWith("KXBUNDESLIGA") || ticker.startsWith("KXIPL") ||
           ticker.startsWith("KXEUROLEAGUE") || ticker.startsWith("KXT20"))     cat = "Soccer";
  else if (ticker.startsWith("KXUFC") || ticker.startsWith("KXBOXING"))         cat = "Combat Sports";
  else if (ticker.startsWith("KXBTC") || ticker.startsWith("KXETH") ||
           ticker.startsWith("KXSOL"))                                           cat = "Crypto";
  else if (ticker === "PRES" || ticker.startsWith("KXFEDCHAIR") ||
           ticker.startsWith("KXTRUMP") || ticker.startsWith("POPVOTE") ||
           ticker.startsWith("KXMAYOR") || ticker.startsWith("KXGOV"))          cat = "Politics";
  else if (ticker.startsWith("KXFED") || ticker.startsWith("KXINXU") ||
           ticker.startsWith("ECMOV"))                                           cat = "Finance";
  else if (ticker.startsWith("KXHIGH") || ticker.startsWith("KXLOW"))           cat = "Weather";
  else                                                                           cat = grp === "Sports" ? "Other Sports" : "Other Non-sports";

  let mtype;
  if (cat === "Other Sports" || cat === "Other Non-sports") {
    mtype = "Other";
  } else if (cat === "Parlay") {
    mtype = ticker.includes("SINGLEGAME") ? "Same-game" : "Multi-game";
  } else if (cat === "Crypto") {
    mtype = /15M$/.test(ticker) ? "15-minute" : /D$/.test(ticker) ? "Daily" : "Other";
  } else if (cat === "Politics") {
    mtype = (ticker === "PRES" || /POPVOTE|MAYOR|GOV|SENATE|HOUSE/.test(ticker)) ? "Election" : "Other";
  } else if (/GAME$/.test(ticker) || ticker === "KXSB") {
    mtype = "Game";
  } else if (/MATCH$|FIGHT$/.test(ticker)) {
    mtype = "Match/Fight";
  } else if (/SPREAD$/.test(ticker)) {
    mtype = "Spread";
  } else if (/TOTAL$/.test(ticker)) {
    mtype = "Total";
  } else if (/TOUR$|SERIES$|CHAMP$|MAD$/.test(ticker)) {
    mtype = "Futures";
  } else {
    mtype = "Other";
  }

  return {grp, cat, wideCat: normalizeTreemapCategory(cat), mtype};
}

function getTmRange(period) {
  const latest = d3.max(topDaily, d => d.date);
  const ranges = {
    "All time": [d3.min(topDaily, d => d.date), latest],
    "2025": [new Date("2025-01-01"), new Date("2025-12-31")],
    "2026": [new Date("2026-01-01"), latest],
    "Since sports launch (Jan 23)": [new Date("2025-01-23"), latest],
    "Last 90 days": [new Date(latest.getTime() - 90 * 864e5), latest]
  };
  return ranges[period];
}

const tmTrackedMeta = topDailyCols.map(report_ticker => {
  const meta = leaderboard.find(l => l.report_ticker === report_ticker) || {};
  return {
    report_ticker,
    fees: +meta.fees || 0,
    contracts: +meta.contracts || 0,
    is_sports: meta.is_sports ?? "FALSE",
    ...classifyTreemapTicker(report_ticker, meta.is_sports ?? "FALSE")
  };
});

const tmSelectedCategory = Mutable(null);
const tmHoveredCategory = Mutable(null);
const tmPinnedCategories = Mutable([]);

function setSelectedCategory(category) {
  tmSelectedCategory.value = tmSelectedCategory.value === category ? null : category;
}

function togglePinnedCategory(category) {
  const existing = tmPinnedCategories.value || [];
  tmPinnedCategories.value = existing.includes(category)
    ? existing.filter(d => d !== category)
    : [...existing.filter(Boolean), category].slice(-3);
}

function eventRowsForRange(start, end) {
  return CATEGORY_EVENTS.filter(d => d.date >= start && d.date <= end);
}
```

## Volume map

<p class="section-intro">Start here. The treemap gives the fastest read on which categories matter most in the selected period. Click a tile to zoom into the largest individual markets inside that category.</p>

```js
const tmMetric = view(Inputs.radio(["Volume", "Fees"], {value: "Volume", label: "Metric"}));
const tmPeriod = view(Inputs.select(
  ["All time", "2025", "2026", "Since sports launch (Jan 23)", "Last 90 days"],
  {label: "Period", value: "All time"}
));
```

```js
const tmData = (() => {
  const range = getTmRange(tmPeriod);

  if (!range) {
    // All time — use full leaderboard directly
    return leaderboard.map(d => ({
      report_ticker: d.report_ticker,
      is_sports: d.is_sports,
      value: tmMetric === "Volume" ? +d.contracts : +d.fees
    }));
  }

  // Date-filtered — aggregate topDaily (top ~15 tickers) and estimate fees proportionally
  const [s, e] = range;
  return topDailyCols.map(cat => {
    const total = topDaily
      .filter(d => d.date >= s && d.date <= e)
      .reduce((acc, r) => acc + (+r[cat] || 0), 0);
    if (!total) return null;
    const meta = leaderboard.find(l => l.report_ticker === cat) || {};
    const value = tmMetric === "Volume"
      ? total
      : (+meta.fees || 0) * (total / (+meta.contracts || 1));
    return {report_ticker: cat, is_sports: meta.is_sports ?? "FALSE", value};
  }).filter(d => d && d.value > 0);
})();
```

```js
const tmCategoryTotals = Array.from(
  d3.rollup(
    tmData,
    rows => d3.sum(rows, d => d.value || 0),
    d => classifyTreemapTicker(d.report_ticker, d.is_sports).cat
  ),
  ([category, value]) => ({category, value})
).sort((a, b) => b.value - a.value);

const tmActiveCategory = tmCategoryTotals.some(d => d.category === tmSelectedCategory)
  ? tmSelectedCategory
  : null;

const tmActiveGroup = tmActiveCategory
  ? tmTrackedMeta.find(d => d.cat === tmActiveCategory)?.grp
  : null;

const tmIsPinnedActive = tmActiveCategory ? tmPinnedCategories.includes(tmActiveCategory) : false;

const tmActiveReportTickers = new Set(
  tmData
    .filter(d => classifyTreemapTicker(d.report_ticker, d.is_sports).cat === tmActiveCategory)
    .map(d => d.report_ticker)
);

function marketMetricValue(row) {
  return tmMetric === "Fees"
    ? (+row.fees_total || +row["i.fees_total"] || 0)
    : (+row.contracts || 0);
}

function marketShortName(row) {
  const raw = row.market_name || row["i.market_name"] || row.market_key || row.report_ticker;
  const ticker = row.report_ticker ? String(row.report_ticker) : "";
  return String(raw)
    .replace(ticker ? new RegExp(`^${ticker}[-_ ]*`, "i") : /^$/, "")
    .replace(/^KX[A-Z0-9]+[-_ ]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function reportTickerLabel(ticker) {
  const clean = String(ticker || "").replace(/^KX/, "");
  const known = {
    KXNBAGAME: "Games",
    KXNBASPREAD: "Spreads",
    KXNBATOTAL: "Totals",
    KXNBA: "Futures",
    KXNFLGAME: "Games",
    KXNFLSPREAD: "Spreads",
    KXNFLTOTAL: "Totals",
    KXSB: "Super Bowl",
    KXNCAAMBGAME: "Games",
    KXNCAAMBSPREAD: "Spreads",
    KXNCAAMBTOTAL: "Totals",
    KXMARMAD: "March Madness",
    KXNCAAWBGAME: "Women's games",
    KXNCAAFGAME: "Games",
    KXNCAAFSPREAD: "Spreads",
    KXNCAAFTOTAL: "Totals",
    KXMLBGAME: "Games",
    KXMLBSPREAD: "Spreads",
    KXNHLGAME: "Games",
    KXPGATOUR: "Tournaments",
    KXATPMATCH: "ATP matches",
    KXATPCHALLENGERMATCH: "ATP challenger",
    KXWTAMATCH: "WTA matches",
    KXWTACHALLENGERMATCH: "WTA challenger",
    KXUFCFIGHT: "Fights",
    KXBTCD: "Daily BTC",
    KXBTC15M: "15-minute BTC",
    KXBTC: "BTC",
    KXETHD: "Daily ETH",
    KXFEDDECISION: "Fed decisions",
    KXFEDCHAIRNOM: "Fed chair",
    KXINXU: "Inflation",
    PRES: "Presidency"
  };
  if (known[ticker]) return known[ticker];
  return clean
    .replace(/GAME$/, " games")
    .replace(/SPREAD$/, " spreads")
    .replace(/TOTAL$/, " totals")
    .replace(/MATCH$/, " matches")
    .replace(/FIGHT$/, " fights")
    .replace(/TOUR$/, " tournaments")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

const tmActiveTickerRows = tmActiveCategory
  ? tmData
      .filter(d => classifyTreemapTicker(d.report_ticker, d.is_sports).cat === tmActiveCategory)
      .map(d => ({
        report_ticker: d.report_ticker,
        is_sports: d.is_sports,
        value: +d.value || 0,
        label: reportTickerLabel(d.report_ticker),
        mtype: classifyTreemapTicker(d.report_ticker, d.is_sports).mtype
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  : [];

const tmActiveMarketRowsByTicker = d3.group(
  mktLeaderboard
    .filter(d => tmActiveReportTickers.has(d.report_ticker))
    .map(d => ({
      ...d,
      rawValue: marketMetricValue(d),
      label: marketShortName(d)
    }))
    .filter(d => d.rawValue > 0)
    .sort((a, b) => b.rawValue - a.rawValue),
  d => d.report_ticker
);
```

```js
const categoryEventMode = view(Inputs.radio(["On", "Off"], {
  label: "Annotated event mode",
  value: "On"
}));
```

<div class="instruction-line"><strong>How to use this page:</strong> hover a category to preview emphasis, click to zoom in, then click the zoomed treemap again to return to the full map.</div>

```js
if (tmActiveCategory) {
  display(html`<a class="ui-button zoom-reset-link" href="${location.pathname}">Back to all categories from ${tmActiveCategory}</a>`);
}
```

```js
{
  const W = width;
  const H = Math.round(W * 0.58);

  // ── Classify each ticker into group / category / market-type ─────────────
  function classify(ticker, isSports) {
    const grp = isSports === "TRUE" ? "Sports" : "Non-sports";

    let cat;
    if      (ticker.startsWith("KXMVE"))                                           cat = "Parlay";
    else if (ticker.startsWith("KXNFL") || ticker === "KXSB")                     cat = "NFL";
    else if (ticker.startsWith("KXNCAAF"))                                         cat = "College Football";
    else if (ticker.startsWith("KXNBA"))                                           cat = "NBA";
    else if (ticker.startsWith("KXNCAAMB") || ticker.startsWith("KXNCAAWB") ||
             ticker.startsWith("KXMARMAD") || ticker.startsWith("KXWMARMAD"))     cat = "College Basketball";
    else if (ticker.startsWith("KXMLB"))                                           cat = "Baseball";
    else if (ticker.startsWith("KXNHL"))                                           cat = "Hockey";
    else if (ticker.startsWith("KXPGA"))                                           cat = "Golf";
    else if (ticker.startsWith("KXATP") || ticker.startsWith("KXWTA"))            cat = "Tennis";
    else if (ticker.startsWith("KXEPL")  || ticker.startsWith("KXUCL")  ||
             ticker.startsWith("KXLALIGA") || ticker.startsWith("KXSERIEA") ||
             ticker.startsWith("KXBUNDESLIGA") || ticker.startsWith("KXIPL") ||
             ticker.startsWith("KXEUROLEAGUE") || ticker.startsWith("KXT20"))     cat = "Soccer";
    else if (ticker.startsWith("KXUFC")  || ticker.startsWith("KXBOXING"))        cat = "Combat Sports";
    else if (ticker.startsWith("KXBTC")  || ticker.startsWith("KXETH")  ||
             ticker.startsWith("KXSOL"))                                           cat = "Crypto";
    else if (ticker === "PRES" || ticker.startsWith("KXFEDCHAIR") ||
             ticker.startsWith("KXTRUMP") || ticker.startsWith("POPVOTE") ||
             ticker.startsWith("KXMAYOR") || ticker.startsWith("KXGOV"))          cat = "Politics";
    else if (ticker.startsWith("KXFED")  || ticker.startsWith("KXINXU") ||
             ticker.startsWith("ECMOV"))                                           cat = "Finance";
    else if (ticker.startsWith("KXHIGH") || ticker.startsWith("KXLOW"))           cat = "Weather";
    else                                                                           cat = grp === "Sports" ? "Other Sports" : "Other Non-sports";

    let mtype;
    if (cat === "Other Sports" || cat === "Other Non-sports") {
      mtype = "Other";
    } else if (cat === "Parlay") {
      mtype = ticker.includes("SINGLEGAME") ? "Same-game" : "Multi-game";
    } else if (cat === "Crypto") {
      mtype = /15M$/.test(ticker) ? "15-minute" : /D$/.test(ticker) ? "Daily" : "Other";
    } else if (cat === "Politics") {
      mtype = (ticker === "PRES" || /POPVOTE|MAYOR|GOV|SENATE|HOUSE/.test(ticker)) ? "Election" : "Other";
    } else if (/GAME$/.test(ticker) || ticker === "KXSB") mtype = "Game";
    else if (/MATCH$|FIGHT$/.test(ticker))                mtype = "Match/Fight";
    else if (/SPREAD$/.test(ticker))                      mtype = "Spread";
    else if (/TOTAL$/.test(ticker))                       mtype = "Total";
    else if (/TOUR$|SERIES$|CHAMP$|MAD$/.test(ticker))   mtype = "Futures";
    else                                                  mtype = "Other";

    return {grp, cat, mtype};
  }

  // ── Build nested totals ───────────────────────────────────────────────────
  const isZoomed = !!tmActiveCategory && tmActiveTickerRows.length > 0;
  const nest = {};
  for (const row of tmData) {
    const v = row.value || 0;
    if (!v) continue;
    const {grp, cat, mtype} = classify(row.report_ticker, row.is_sports);
    if (!nest[grp])             nest[grp] = {};
    if (!nest[grp][cat])        nest[grp][cat] = {};
    if (!nest[grp][cat][mtype]) nest[grp][cat][mtype] = 0;
    nest[grp][cat][mtype] += v;
  }

  const marketChildren = tmActiveTickerRows.map(tickerRow => {
    const rawMarkets = tmActiveMarketRowsByTicker.get(tickerRow.report_ticker) || [];
    const rawTotal = d3.sum(rawMarkets, d => d.rawValue || 0);
    const topMarkets = rawMarkets.slice(0, Math.max(4, Math.min(10, Math.round(W / 90))));
    const children = rawTotal > 0
      ? topMarkets.map(row => ({
          name: row.label,
          value: tickerRow.value * ((row.rawValue || 0) / rawTotal),
          mtype: tickerRow.mtype,
          market_key: row.market_key,
          report_ticker: row.report_ticker
        }))
      : [];
    const shown = d3.sum(children, d => d.value || 0);
    const remainder = Math.max(0, tickerRow.value - shown);
    if (remainder > tickerRow.value * 0.01 || !children.length) {
      children.push({
        name: `Other ${tickerRow.label.toLowerCase()}`,
        value: remainder || tickerRow.value,
        mtype: tickerRow.mtype,
        report_ticker: tickerRow.report_ticker,
        isOther: true
      });
    }
    return {
      name: tickerRow.label,
      report_ticker: tickerRow.report_ticker,
      children
    };
  });

  const hierData = isZoomed
    ? {
        name: "root",
        children: [{
          name: tmActiveGroup || "Selected",
          children: marketChildren
        }]
      }
    : {
        name: "root",
        children: ["Sports", "Non-sports"].filter(g => nest[g]).map(grp => ({
          name: grp,
          children: Object.entries(nest[grp])
            .sort((a, b) => d3.sum(Object.values(b[1])) - d3.sum(Object.values(a[1])))
            .map(([cat, mtypes]) => ({
              name: cat,
              children: Object.entries(mtypes)
                .sort((a, b) => b[1] - a[1])
                .map(([mtype, value]) => ({name: mtype, value}))
            }))
        }))
      };

  // ── Treemap layout ────────────────────────────────────────────────────────
  const root = d3.hierarchy(hierData)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([W, H])
    .paddingInner(d => d.depth === 0 ? 14 : d.depth === 1 ? 3 : 1)
    .paddingTop(d => d.depth === 1 ? 18 : 0)
    .tile(d3.treemapBinary)
    (root);

  // ── Color palette: warm (sports) vs cool (non-sports) ────────────────────
  // Sports: red → orange → amber → olive → teal-green → brown spectrum
  // Non-sports: blues, purples, teals — clearly cool/opposite family
  const CAT_COLOR = {
    "NFL":                "#C62828",  // deep red
    "Combat Sports":      "#8B1A1A",  // dark brick red
    "College Football":   "#E64A19",  // burnt orange
    "Tennis":             "#E53935",  // vivid red
    "NBA":                "#F57F17",  // amber
    "Soccer":             "#F9A825",  // golden amber
    "Golf":               "#FBC02D",  // warm yellow
    "Parlay":             "#FDD835",  // bright yellow
    "Baseball":           "#F06292",  // medium pink
    "College Basketball": "#D81B60",  // deep pink
    "Hockey":             "#4E342E",  // dark brown
    "Other Sports":       "#8D6E63",  // warm tan
    "Crypto":             "#0D47A1",  // dark navy
    "Politics":           "#1A237E",  // very dark indigo
    "Finance":            "#1E88E5",  // bright medium blue
    "Weather":            "#4FC3F7",  // light sky blue
    "Entertainment":      "#0097A7",  // teal-blue
    "Other Non-sports":   "#7986CB",  // medium indigo-blue
  };

  const getFill = cat => CAT_COLOR[cat] || "#888";
  const activeCategory = tmHoveredCategory || tmActiveCategory;
  const pinnedSet = new Set(tmPinnedCategories);
  const shortLabel = (text, max = 34) => {
    const s = String(text ?? "");
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
  };

  // ── SVG ───────────────────────────────────────────────────────────────────
  const svg = d3.create("svg")
    .attr("width", W).attr("height", H)
    .style("display","block")
    .style("font-family","var(--font-sans)");

  if (isZoomed) {
    svg.append("rect")
      .attr("class", "zoom-reset-hit")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "transparent")
      .style("cursor", "zoom-out")
      .on("click", () => { setSelectedCategory(null); });
  }

  // ── Render leaf tiles (market-type level) ─────────────────────────────────
  const leaves = root.leaves();
  const leafSel = svg.selectAll("rect.leaf")
    .data(leaves)
    .join("rect")
    .attr("class","leaf")
    .attr("x", d => d.x0).attr("y", d => d.y0)
    .attr("width",  d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", d => getFill(isZoomed ? tmActiveCategory : d.parent.data.name))
    .attr("fill-opacity", d => !activeCategory || isZoomed || d.parent.data.name === activeCategory ? 0.96 : 0.24)
    .attr("stroke", d =>
      d.parent.data.name === tmActiveCategory ? "rgba(255,255,255,0.70)"
      : pinnedSet.has(d.parent.data.name) ? "rgba(255,255,255,0.56)"
      : "rgba(255,255,255,0.18)"
    )
    .attr("stroke-width", d => d.parent.data.name === tmActiveCategory ? 1.05 : pinnedSet.has(d.parent.data.name) ? 0.85 : 0.5)
    .style("cursor", isZoomed ? "zoom-out" : "default")
    .on("click", () => {
      if (isZoomed) setSelectedCategory(null);
    });
  leafSel.append("title")
    .text(d => `${d.parent.parent.data.name} › ${d.parent.data.name} › ${d.data.name}\n${tmMetric === "Fees" ? "Fees" : "Volume"}: $${fmtCount(d.value)}`);

  // ── Category labels + volume (depth 2) ───────────────────────────────────
  const cats2 = root.descendants().filter(d => d.depth === 2);

  // Category labels — shifted toward top so market-type labels have room below
  const hasVisibleChildren = d => d.children && d.children.some(c => (c.x1-c.x0) > 45 && (c.y1-c.y0) > 18);

  svg.selectAll("rect.category-outline")
    .data(cats2)
    .join("rect")
    .attr("class", "category-outline")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", "none")
    .attr("stroke", d =>
      d.data.name === tmActiveCategory ? "rgba(255,255,255,0.92)"
      : pinnedSet.has(d.data.name) ? "rgba(255,255,255,0.72)"
      : "none"
    )
    .attr("stroke-width", d => d.data.name === tmActiveCategory ? 2.2 : pinnedSet.has(d.data.name) ? 1.25 : 0)
    .attr("pointer-events", "none");

  svg.selectAll("text.cname")
    .data(cats2)
    .join("text")
    .attr("class","cname")
    .attr("x", d => (d.x0 + d.x1) / 2)
    .attr("y", d => {
      const mid = (d.y0 + d.y1) / 2;
      // nudge up when subdivisions will be labelled, to avoid collision
      return hasVisibleChildren(d) && (d.y1-d.y0) > 40 ? d.y0 + 14 : mid;
    })
    .attr("text-anchor","middle")
    .attr("dominant-baseline","middle")
    .attr("fill","rgba(255,255,255,0.95)")
    .attr("font-size", d => Math.max(7, Math.min(14, Math.sqrt((d.x1-d.x0)*(d.y1-d.y0)) / 9)) + "px")
    .attr("font-weight","600")
    .attr("paint-order","stroke")
    .attr("stroke","rgba(0,0,0,0.4)")
    .attr("stroke-width", 3)
    .attr("fill-opacity", d => !activeCategory || isZoomed || d.data.name === activeCategory ? 0.98 : 0.45)
    .attr("pointer-events", "none")
    .text(d => (d.x1-d.x0) > (isZoomed ? 58 : 40) && (d.y1-d.y0) > (isZoomed ? 26 : 18) ? d.data.name : "");

  svg.selectAll("text.cvol")
    .data(cats2)
    .join("text")
    .attr("class","cvol")
    .attr("x", d => (d.x0 + d.x1) / 2)
    .attr("y", d => {
      const nudged = hasVisibleChildren(d) && (d.y1-d.y0) > 40;
      return nudged ? d.y0 + 26 : (d.y0 + d.y1) / 2 + 9;
    })
    .attr("text-anchor","middle")
    .attr("dominant-baseline","middle")
    .attr("fill","rgba(255,255,255,0.65)")
    .attr("fill-opacity", d => !activeCategory || isZoomed || d.data.name === activeCategory ? 1 : 0.45)
    .attr("font-size","10px")
    .attr("pointer-events", "none")
    .text(d => (d.x1-d.x0) > (isZoomed ? 88 : 60) && (d.y1-d.y0) > (isZoomed ? 46 : 36) ? `$${fmtCount(d.value)}` : "");

  // ── Market-type labels on large enough leaf tiles ─────────────────────────
  const SKIP_LABEL = new Set(isZoomed ? [] : [
    "Other", "Parlay", "Match/Fight", "Game", "Games", "Multi-game", "Same-game",
    "Spread", "Spreads", "Total", "Totals", "Futures", "Election", "Daily", "15-minute"
  ]);
  svg.selectAll("text.mtype")
    .data(leaves)
    .join("text")
    .attr("class","mtype")
    .attr("x", d => (d.x0 + d.x1) / 2)
    .attr("y", d => d.y1 - 5)
    .attr("text-anchor","middle")
    .attr("dominant-baseline","auto")
    .attr("fill","rgba(255,255,255,0.75)")
    .attr("font-size","9px")
    .attr("font-style","italic")
    .attr("paint-order","stroke")
    .attr("stroke","rgba(0,0,0,0.3)")
    .attr("stroke-width", 2)
    .attr("fill-opacity", d => !activeCategory || isZoomed || d.parent.data.name === activeCategory ? 1 : 0.32)
    .attr("pointer-events", "none")
    .text(d => {
      const w = d.x1 - d.x0, h = d.y1 - d.y0;
      const label = d.data.name;
      if (w < (isZoomed ? 82 : 62) || h < (isZoomed ? 26 : 24)) return "";
      if (SKIP_LABEL.has(label)) return "";
      return isZoomed ? shortLabel(label, w > 150 ? 38 : 24) : label;
    });

  // ── Group labels (Sports / Non-sports) ────────────────────────────────────
  svg.selectAll("text.grp")
    .data(root.children || [])
    .join("text")
    .attr("class","grp")
    .attr("x", d => d.x0 + 7)
    .attr("y", d => d.y0 + 13)
    .attr("fill","rgba(255,255,255,0.88)")
    .attr("font-size","11px")
    .attr("font-weight","700")
    .attr("letter-spacing","0.06em")
    .attr("pointer-events", "none")
    .text(d => d.data.name.toUpperCase());

  svg.selectAll("rect.category-hit")
    .data(cats2)
    .join("rect")
    .attr("class", "category-hit")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", "transparent")
    .style("cursor", isZoomed ? "zoom-out" : "pointer")
    .on("mouseenter", (_, d) => { tmHoveredCategory.value = isZoomed ? null : d.data.name; })
    .on("mouseleave", () => { tmHoveredCategory.value = null; })
    .on("click", (_, d) => {
      if (isZoomed) setSelectedCategory(null);
      else setSelectedCategory(d.data.name);
    });

  if (tmActiveCategory) {
    const wrapper = html`<div></div>`;
    const bar = html`<div class="zoom-toolbar"></div>`;
    bar.append(html`<span>Viewing ${tmActiveCategory} markets. Click the map again to return to all categories.</span>`);
    wrapper.append(bar, svg.node());
    display(wrapper);
  } else {
    display(svg.node());
  }
}
```

<div class="chart-note"><strong>Reading note:</strong> area represents category weight in the selected window. Click a category to zoom into families that add to 100% of that category; each family shows readable top markets plus an explicit Other remainder. Date-filtered top-level views cover tracked top tickers; zoomed market detail uses all-time market mix to allocate the selected-period family total.</div>

```js
{
  if (!tmActiveCategory) {
    display(html`<div class="chart-note">No category is selected. Click a treemap tile to zoom in, or pin categories below for comparison.</div>`);
  } else {
    const shell = html`<details class="focus-card compact-details"></details>`;
    shell.append(html`<summary>${tmActiveCategory} focus controls</summary>`);
    const crumbs = html`<div class="breadcrumbs"></div>`;
    crumbs.append(html`<span class="crumb">Treemap</span>`);
    if (tmActiveGroup) crumbs.append(html`<span class="crumb">${tmActiveGroup}</span>`);
    crumbs.append(html`<span class="crumb is-active">${tmActiveCategory}</span>`);
    shell.append(crumbs);

    const header = html`<div class="focus-header"></div>`;
    const copy = html`<div>
      <div class="focus-title">Zoomed into ${tmActiveCategory}</div>
      <p class="focus-copy">The treemap is showing the largest available individual markets for this category. Open this panel when you want to pin it for comparison.</p>
    </div>`;
    const actions = html`<div class="focus-actions"></div>`;
    const pinBtn = html`<button type="button" class="ui-button">${tmIsPinnedActive ? "Unpin active" : "Pin active"}</button>`;
    pinBtn.addEventListener("click", () => { togglePinnedCategory(tmActiveCategory); });
    actions.append(pinBtn);
    header.append(copy, actions);
    shell.append(header);

    const row = html`<div class="chip-row"></div>`;
    for (const {category, value} of tmCategoryTotals) {
      const active = category === tmActiveCategory;
      const color = TM_CATEGORY_COLORS[category] || "#888";
      const btn = html`<button type="button" class="ui-chip ${active ? "is-active" : ""}" style="
        border-color:${color};
        background:${active ? color + "2e" : color + "14"};
        color:${active ? "var(--theme-foreground)" : "inherit"};
      ">${category} | $${fmtCount(value)}</button>`;
      btn.addEventListener("click", () => { setSelectedCategory(category); });
      row.append(btn);
    }
    shell.append(row);
    display(shell);
  }
}
```

## All-time leaderboard

<p class="section-intro">This leaderboard is the fastest way to see which report tickers dominate by volume, fees, or notional in the selected window.</p>

```js
const metric = view(hashInput("metric", Inputs.select(["contracts", "fees", "notional"], {
  label: "Metric", value: hashGet("metric", "contracts")
})));
const showSports = view(hashInput("sports", Inputs.select(["All", "Sports only", "Non-sports only"], {
  label: "Filter", value: hashGet("sports", "All")
})));
```

```js
const fromStr = view(hashInput("from", Inputs.text({label: "From", placeholder: "YYYY-MM-DD", value: hashGet("from", "2025-01-01"), width: 130})));
const toStr   = view(hashInput("to",   Inputs.text({label: "To",   placeholder: "YYYY-MM-DD (blank = latest)", value: hashGet("to", ""), width: 130})));
```

```js
const catCols = Object.keys(topDaily[0]).filter(k => k !== "date");

const cutoff  = fromStr && !isNaN(new Date(fromStr)) ? new Date(fromStr) : new Date("2021-01-01");
const cutoffTo = toStr && !isNaN(new Date(toStr)) ? new Date(toStr) : new Date();
const isAllTime = cutoff <= new Date("2021-07-01") && cutoffTo >= new Date();

// Aggregate contracts from daily data for the selected period (top 15 tickers)
const dailyAgg = catCols.map(cat => {
  const total = topDaily
    .filter(d => d.date >= cutoff && d.date <= cutoffTo)
    .reduce((s, r) => s + (+r[cat] || 0), 0);
  const meta = leaderboard.find(l => l.report_ticker === cat) || {};
  return {
    report_ticker: cat,
    contracts: total,
    fees: (meta.fees || 0) * (total / (meta.contracts || 1)),
    notional: (meta.notional || 0) * (total / (meta.contracts || 1)),
    is_sports: meta.is_sports ?? "FALSE"
  };
}).filter(d => d.contracts > 0);

// Full leaderboard for all-time span; aggregated daily for any date filter
const source = isAllTime ? leaderboard : dailyAgg;

const filtered = source
  .filter(d => showSports === "All" ? true : showSports === "Sports only" ? d.is_sports === "TRUE" : d.is_sports === "FALSE")
  .sort((a, b) => b[metric] - a[metric])
  .slice(0, 25);
```

```js
Plot.plot({
  width,
  height: filtered.length * 22 + 40,
  marginLeft: 220,
  x: {label: metric === "contracts" ? "Volume ($)" : metric === "fees" ? "Fees ($)" : "Notional ($)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(filtered, {
      x: metric,
      y: "report_ticker",
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#00C2A8",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.report_ticker}\n$${fmtCount(d[metric])}\nSports: ${d.is_sports}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">■ Sports</span> &nbsp; <span style="color:#00C2A8">■ Non-sports</span>

<div class="chart-note"><strong>Coverage note:</strong> date-filtered views cover the tracked top categories from the daily dataset; the full all-time leaderboard uses the broader summary table.</div>

## Volume by category over time

<p class="section-intro">This monthly view shows how Kalshi's category mix changes through time. When a category is selected in the treemap, the matching series is emphasized here.</p>

```js
const sportsSplit = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
// Map tickers to display groups — Football and Basketball split into pro/college subcategories
const wideMap = {
  // NFL (pro football) — dark warm
  KXNFLGAME: "NFL", KXNFLSPREAD: "NFL", KXNFLTOTAL: "NFL", KXSB: "NFL",
  // College football — lighter warm
  KXNCAAFGAME: "College football", KXNCAAFSPREAD: "College football", KXNCAAFTOTAL: "College football",
  // NBA (pro basketball) — dark blue
  KXNBAGAME: "NBA", KXNBASPREAD: "NBA", KXNBATOTAL: "NBA", KXNBA: "NBA",
  // College basketball — lighter blue (includes March Madness)
  KXNCAAMBGAME: "College basketball", KXNCAAMBSPREAD: "College basketball",
  KXNCAAMBTOTAL: "College basketball", KXMARMAD: "College basketball", KXNCAAWBGAME: "College basketball",
  // Other sports
  KXMLBGAME: "Baseball", KXMLBSPREAD: "Baseball",
  KXNHLGAME: "Hockey",
  KXPGATOUR: "Golf",
  KXATPMATCH: "Tennis", KXATPCHALLENGERMATCH: "Tennis", KXWTAMATCH: "Tennis", KXWTACHALLENGERMATCH: "Tennis",
  KXEPLGAME: "Soccer", KXUCLGAME: "Soccer", KXLALIGAGAME: "Soccer",
  KXUFCFIGHT: "Combat sports",
  // Non-sports
  KXBTCD: "Crypto", KXBTC15M: "Crypto",
  PRES: "Politics", KXFEDCHAIRNOM: "Politics", KXTRUMPMENTION: "Politics",
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance",
  KXFIRSTSUPERBOWLSONG: "Entertainment", KXSUPERBOWLAD: "Entertainment",
  KXPERFORMSUPERBOWLB: "Entertainment", KXSBGUESTS: "Entertainment",
  KXSBADS: "Entertainment", KXHALFTIMESHOW: "Entertainment",
  KXSBPERFORM: "Entertainment", KXSUPERBOWLHEADLINE: "Entertainment",
  KXSBADAPPEARANCES: "Entertainment", KXSBVIEWER: "Entertainment",
  KXSBMENTION: "Entertainment", KXSBSETLISTS: "Entertainment",
  KXHIGHNY: "Weather", KXHIGHLAX: "Weather", KXHIGHMIA: "Weather",
  KXHIGHCHI: "Weather", KXHIGHAUS: "Weather",
  KXMVECROSSCATEGORY: "_skip", KXMVESPORTSMULTIGAMEEXTENDED: "_skip"
};

// Build wide-category daily totals
const wideDaily = topDaily.map(row => {
  const sp = sportsSplit.find(s => +s.date === +row.date) || {};
  const groups = {
    NFL: 0, "College football": 0,
    NBA: 0, "College basketball": 0,
    Baseball: 0, Hockey: 0, Golf: 0, Tennis: 0,
    Soccer: 0, "Combat sports": 0,
    Crypto: 0, Politics: 0, Finance: 0, Entertainment: 0, Weather: 0
  };
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = wideMap[cat];
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Other sports":     Math.max(0, totSports    - parlay - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});

// Stacking order: non-sports bottom → sports → parlay top
// Football pair (warm): NFL dark, College football light
// Basketball pair (blue): NBA dark, College basketball light
const wideOrder = [
  "Other non-sports", "Weather", "Entertainment", "Finance", "Politics", "Crypto",
  "Other sports", "Combat sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College football", "NFL",
  "College basketball", "NBA",
  "Parlay"
];

// Color map — subcategory pairs share hue family
const wideColors = {
  "Other non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Finance": "#6b8cae", "Politics": "#455a64", "Crypto": "#263238",
  "Other sports": "#c8e6c9",
  "Combat sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  // Football family — warm orange pair
  "College football": "#ffcc80", "NFL": "#bf360c",
  // Basketball family — blue pair
  "College basketball": "#90caf9", "NBA": "#0d47a1",
  // Parlay — top, prominent
  "Parlay": "#7b1fa2"
};
```

```js
// Mutable date range — default to 2025 onwards (earlier has near-zero sports volume)
const catDateSel = Mutable([new Date("2025-01-01"), d3.max(topDaily, d => d.date)]);
```

```js
{
  const h = 60, mt = 4, mb = 22, ml = 8, mr = 8, w = width;
  const x = d3.scaleUtc().domain(d3.extent(topDaily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(wideDaily, d => wideOrder.reduce((s, g) => s + (d[g]||0), 0));
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg").attr("width", w).attr("height", h)
    .style("display","block").style("background","#fafafa")
    .style("border","1px solid #e8e8e8").style("border-radius","4px").style("margin-bottom","1.5rem");

  // Total volume sparkline
  svg.append("path").datum(wideDaily)
    .attr("fill","#1a9641").attr("fill-opacity",0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h-mb).y1(d => y(wideOrder.reduce((s,g) => s+(d[g]||0),0)))
      .curve(d3.curveBasis));

  svg.append("g").attr("transform",`translate(0,${h-mb})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke","#ccc"))
    .call(g => g.selectAll("text").style("font-size","10px").attr("fill","#888"));

  const [ds, de] = catDateSel;
  const brush = d3.brushX().extent([[ml,mt],[w-mr,h-mb]])
    .on("brush end", (event) => { if (!event.sourceEvent) return; if (event.selection) catDateSel.value = event.selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const chartScale  = view(hashInput("scale",  Inputs.radio(["Absolute", "Normalized"], {value: hashGet("scale",  "Absolute"), label: "Scale"})));
const chartDetail = view(hashInput("detail", Inputs.radio(["General", "Detailed"],    {value: hashGet("detail", "General"),  label: "Categories"})));
```

```js
// General (5-category) grouping
const generalMap = {
  "NFL": "Football", "College football": "Football",
  "NBA": "Basketball", "College basketball": "Basketball",
  "Baseball": "Baseball",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Soccer": "Other sports", "Combat sports": "Other sports", "Other sports": "Other sports",
  "Parlay": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Weather": "Non-sports", "Other non-sports": "Non-sports"
};
const generalOrder  = ["Non-sports", "Other sports", "Baseball", "Basketball", "Football", "Parlay"];
const generalColors = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2"
};

const activeOrder    = chartDetail === "Detailed" ? wideOrder    : generalOrder;
const activeColorMap = chartDetail === "Detailed" ? wideColors   : generalColors;
```

```js
const [chartStart, chartEnd] = catDateSel;

// Roll up to monthly totals within the brushed window
const monthRolled = d3.rollup(
  wideDaily.filter(d => d.date >= chartStart && d.date <= chartEnd),
  rs => {
    const obj = {};
    for (const g of wideOrder) obj[g] = d3.sum(rs, d => d[g] || 0);
    return obj;
  },
  d => d.date.toISOString().slice(0, 7)
);

const sortedMonths = [...monthRolled].sort(([a], [b]) => a < b ? -1 : 1);

// Build tidy rows for active detail level
const activeTidy = sortedMonths.flatMap(([mo, vals]) => {
  if (chartDetail === "General") {
    const gen = Object.fromEntries(generalOrder.map(g => [g, 0]));
    for (const [det, gname] of Object.entries(generalMap)) gen[gname] += vals[det] || 0;
    return generalOrder.map(g => ({month: mo, category: g, contracts: gen[g]}));
  } else {
    return wideOrder.map(g => ({month: mo, category: g, contracts: vals[g] || 0}));
  }
});

// For normalized: compute each row as a fraction of its month's total
const monthTotals = d3.rollup(activeTidy, rs => d3.sum(rs, r => r.contracts), d => d.month);
const plotTidy = activeTidy.map(d => ({
  ...d,
  value: chartScale === "Normalized"
    ? d.contracts / (monthTotals.get(d.month) || 1)
    : d.contracts
}));

const monthlyPrimaryFocus = tmActiveCategory
  ? (chartDetail === "Detailed"
      ? normalizeTreemapCategory(tmActiveCategory)
      : generalMap[normalizeTreemapCategory(tmActiveCategory)] || normalizeTreemapCategory(tmActiveCategory))
  : null;

const monthlyHoverFocus = tmHoveredCategory
  ? (chartDetail === "Detailed"
      ? normalizeTreemapCategory(tmHoveredCategory)
      : generalMap[normalizeTreemapCategory(tmHoveredCategory)] || normalizeTreemapCategory(tmHoveredCategory))
  : null;

const monthlyPinned = tmPinnedCategories.map(cat =>
  chartDetail === "Detailed"
    ? normalizeTreemapCategory(cat)
    : generalMap[normalizeTreemapCategory(cat)] || normalizeTreemapCategory(cat)
);

const mapCategoryForCurrentDetail = category => chartDetail === "Detailed"
  ? normalizeTreemapCategory(category)
  : generalMap[normalizeTreemapCategory(category)] || normalizeTreemapCategory(category);

const monthlyFocusSet = new Set([monthlyHoverFocus || monthlyPrimaryFocus, ...monthlyPinned].filter(Boolean));

const monthTipData = Array.from(
  d3.rollup(
    plotTidy,
    rows => {
      const out = {month: rows[0].month};
      for (const r of rows) out[r.category] = r.value;
      out.total = d3.sum(rows, r => r.contracts);
      return out;
    },
    d => d.month
  )
).map(([, v]) => v).sort((a, b) => a.month < b.month ? -1 : 1);

const monthLabels = sortedMonths.map(([mo]) => mo);
const monthTickFormat = mo => {
  const [y, m] = mo.split("-");
  const abbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1];
  return m === "01" ? `${abbr} '${y.slice(2)}` : abbr;
};

const monthPlotMax = chartScale === "Normalized"
  ? 1
  : d3.max(monthTipData, d => d.total || 0) || 1;

const monthEventRows = eventRowsForRange(chartStart, chartEnd)
  .map(d => ({...d, month: d.date.toISOString().slice(0, 7), y: monthPlotMax * 0.96}))
  .filter(d => monthLabels.includes(d.month));
```

<div class="instruction-line"><strong>How to use this:</strong> switch between <em>General</em> and <em>Detailed</em> to move from headline mix to more granular subcategory structure. Selecting a treemap category highlights the matching series.</div>

<div class="plot-shell">

```js
Plot.plot({
  width,
  height: 420,
  marginBottom: monthLabels.length > 18 ? 50 : 40,
  color: {
    legend: true,
    domain: activeOrder,
    range: activeOrder.map(g => activeColorMap[g])
  },
  x: {
    type: "band",
    domain: monthLabels,
    label: null,
    tickFormat: monthTickFormat,
    tickRotate: monthLabels.length > 18 ? -45 : 0
  },
  y: {
    label: chartScale === "Normalized" ? "Share of monthly volume" : "Monthly volume ($)",
    grid: true,
    tickFormat: chartScale === "Normalized"
      ? d => (d * 100).toFixed(0) + "%"
      : d => "$"+(d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
  },
  marks: [
    Plot.barY(plotTidy, {
      x: "month",
      y: "value",
      fill: "category",
      order: activeOrder,
      fillOpacity: d => !monthlyFocusSet.size || monthlyFocusSet.has(d.category) ? 0.88 : 0.18,
      stroke: d => monthlyPrimaryFocus && d.category === monthlyPrimaryFocus ? "#111" : "none",
      strokeWidth: d => monthlyPrimaryFocus && d.category === monthlyPrimaryFocus ? 1.1 : 0
    }),
    Plot.ruleX(monthTipData, Plot.pointerX({x: "month", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(monthTipData, Plot.pointerX({
      x: "month",
      title: d => [
        d.month,
        chartScale === "Normalized"
          ? "Total: 100% of month"
          : `Total: $${fmtCount(d.total || 0)}`,
        ...activeOrder
          .filter(cat => (d[cat] || 0) > 0)
          .sort((a, b) => (d[b] || 0) - (d[a] || 0))
          .map(cat => chartScale === "Normalized"
            ? `${cat}: ${((d[cat] || 0) * 100).toFixed(1)}%`
            : `${cat}: $${fmtCount(d[cat] || 0)}`)
      ].join("\n")
    })),
    ...(categoryEventMode === "On" ? [
      Plot.ruleX(monthEventRows, {x: "month", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
      Plot.text(monthEventRows, {
        x: "month", y: "y", text: "label",
        textAnchor: "start", lineAnchor: "bottom",
        rotate: -40, fontSize: 10, fill: "var(--annotation-text)", dx: 2, dy: -2
      })
    ] : []),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> <em>General</em> compresses the market into Football, Basketball, Baseball, Other sports, Parlay, and Non-sports. <em>Detailed</em> expands back into individual categories. <em>Normalized</em> shows share of monthly volume rather than dollars.</div>

## Pinned category comparison

<p class="section-intro">Use this section when you want to compare trajectories directly rather than infer them from stacked bars. The active category becomes the primary series, and the pinned chips give you a compact peer set.</p>

```js
{
  if (!tmActiveCategory) {
    display(html`<div class="chart-note">Select a treemap category to enable primary-series comparison controls.</div>`);
  } else {
    const shell = html`<details class="surface-card compact-details"></details>`;
    shell.append(html`<summary>${tmActiveCategory} comparison controls</summary>`);
    shell.append(html`<div class="focus-header">
      <div>
        <div class="focus-title">Primary series: ${tmActiveCategory}</div>
        <p class="focus-copy">Pin up to three comparison categories. The primary series stays thicker so you can read it first.</p>
      </div>
    </div>`);
    const row = html`<div class="chip-row"></div>`;
    for (const {category} of tmCategoryTotals) {
      const active = tmPinnedCategories.includes(category);
      const primary = category === tmActiveCategory;
      const color = TM_CATEGORY_COLORS[category] || "#888";
      const btn = html`<button type="button" class="ui-chip ${primary || active ? "is-active" : ""}" style="
        border-color:${color};
        background:${primary ? color + "30" : active ? color + "24" : "var(--card-bg)"};
        color:inherit;
        opacity:${primary ? 0.78 : 1};
      ">${primary ? "Primary" : active ? "Pinned" : "Pin"} | ${category}</button>`;
      if (!primary) btn.addEventListener("click", () => togglePinnedCategory(category));
      row.append(btn);
    }
    shell.append(row);
    display(shell);
  }
}
```

```js
const comparePrimary = tmActiveCategory ? mapCategoryForCurrentDetail(tmActiveCategory) : null;
const compareSeries = Array.from(new Set([
  comparePrimary,
  ...tmPinnedCategories.map(mapCategoryForCurrentDetail)
])).filter(Boolean);

const compareTidy = sortedMonths.flatMap(([month, vals]) =>
  compareSeries.map(category => ({
    month,
    category,
    contracts: vals[category] || 0,
    value: chartScale === "Normalized"
      ? (vals[category] || 0) / (monthTotals.get(month) || 1)
      : (vals[category] || 0)
  }))
);

const compareTipData = Array.from(
  d3.rollup(
    compareTidy,
    rows => {
      const out = {month: rows[0].month};
      for (const r of rows) out[r.category] = r.value || 0;
      return out;
    },
    d => d.month
  )
).map(([, v]) => v).sort((a, b) => a.month < b.month ? -1 : 1);

const compareEventRows = eventRowsForRange(chartStart, chartEnd)
  .map(d => ({...d, month: d.date.toISOString().slice(0, 7), y: chartScale === "Normalized" ? 1 : monthPlotMax * 0.96}))
  .filter(d => monthLabels.includes(d.month));

const comparePrimaryTidy = comparePrimary
  ? compareTidy.filter(d => d.category === comparePrimary)
  : [];

const compareSecondaryTidy = compareTidy.filter(d => d.category !== comparePrimary);
```

<div class="plot-shell">

```js
if (!compareSeries.length) {
  display(html`<div class="chart-note">Select a category in the treemap to start a comparison.</div>`);
} else {
  display(Plot.plot({
    width,
    height: 320,
    marginLeft: 55,
    style: {fontFamily: "var(--font-sans)"},
    color: {legend: true, domain: compareSeries, range: compareSeries.map(cat => wideColors[cat] || "#666")},
    x: {type: "band", domain: monthLabels, label: null, tickFormat: monthTickFormat},
    y: {
      label: chartScale === "Normalized" ? "Share of monthly volume" : "Monthly volume ($)",
      grid: true,
      tickFormat: chartScale === "Normalized" ? d => (d * 100).toFixed(0) + "%" : d => "$" + fmtCount(d)
    },
    marks: [
      Plot.lineY(compareSecondaryTidy, {
        x: "month",
        y: "value",
        stroke: "category",
        curve: "monotone-x",
        strokeWidth: 2
      }),
      Plot.dot(compareSecondaryTidy, {
        x: "month",
        y: "value",
        fill: "category",
        r: 2.3
      }),
      Plot.lineY(comparePrimaryTidy, {
        x: "month",
        y: "value",
        stroke: "category",
        curve: "monotone-x",
        strokeWidth: 3
      }),
      Plot.dot(comparePrimaryTidy, {
        x: "month",
        y: "value",
        fill: "category",
        r: 3
      }),
      Plot.ruleX(compareTipData, Plot.pointerX({x: "month", stroke: "currentColor", strokeOpacity: 0.2})),
      Plot.tip(compareTipData, Plot.pointerX({
        x: "month",
        title: d => [
          d.month,
          ...compareSeries.map(cat => chartScale === "Normalized"
            ? `${cat}: ${((d[cat] || 0) * 100).toFixed(1)}%`
            : `${cat}: $${fmtCount(d[cat] || 0)}`)
        ].join("\n")
      })),
      ...(categoryEventMode === "On" ? [
        Plot.ruleX(compareEventRows, {x: "month", stroke: "var(--annotation-stroke)", strokeDasharray: "3,3", strokeWidth: 1}),
        Plot.text(compareEventRows, {
          x: "month", y: "y", text: "label",
          textAnchor: "start", lineAnchor: "bottom",
          rotate: -40, fontSize: 10, fill: "var(--annotation-text)", dx: 2, dy: -2
        })
      ] : []),
      Plot.ruleY([0])
    ]
  }));
}
```

</div>

## Sports market type breakdown

_How sports volume is split between market types across all sports tickers. Moneylines = individual game winners. Futures/Award = season champions, conference winners, awards, tournament brackets. Parlay (multi-game) = cross-game combos. Parlay (single-game) = same-game parlays._

```js
const marketTypeRaw = await FileAttachment("data/sports_market_type_daily.csv").csv({typed: true});
```

```js
// Consolidate minor categories for cleaner display
const MT_REMAP = {
  "Parlay (multi-game)": "Parlay (multi-game)",
  "Parlay (single-game)": "Parlay (SGP)",
  "Moneyline": "Moneyline",
  "Spread": "Spread",
  "Over/Under": "Over/Under",
  "Futures/Award": "Futures/Award",
  "Player Prop": "Player Prop",
  "Game Prop": "Game Prop",
  "Cricket": "Other",
  "Esports": "Other",
  "Motorsport": "Other",
  "Mention": "Other",
  "Other": "Other"
};

const mtOrder = [
  "Moneyline", "Futures/Award", "Spread", "Over/Under",
  "Parlay (multi-game)", "Parlay (SGP)", "Player Prop", "Game Prop", "Other"
];
const mtColors = [
  "#4e79a7", "#76b7b2", "#f28e2b", "#e15759",
  "#b07aa1", "#d4a0c7", "#59a14f", "#8cd17d", "#bab0ac"
];

// Roll up tidy data to consolidated categories
// Use ISO string as rollup key (Date objects compare by reference, not value)
const mtRolled = d3.rollup(
  marketTypeRaw,
  rs => d3.sum(rs, r => r.contracts),
  r => (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date)),
  r => MT_REMAP[r.market_type] || "Other"
);

const mtDaily = Array.from(mtRolled, ([dateStr, byType]) => {
  const row = {date: new Date(dateStr)};
  for (const g of mtOrder) row[g] = byType.get(g) || 0;
  return row;
}).sort((a, b) => a.date - b.date);
```

```js
// Independent date brush for this chart
const mtEnd0 = d3.max(mtDaily, d => d.date);
const mtStart0 = new Date(mtEnd0);
mtStart0.setMonth(mtStart0.getMonth() - 6);
const mtDateSel = Mutable([mtStart0, mtEnd0]);
```

```js
{
  const h = 60, mt = 4, mb = 22, ml = 8, mr = 8, w = width;
  const x = d3.scaleUtc().domain(d3.extent(mtDaily, d => d.date)).range([ml, w - mr]);
  const yMax = d3.max(mtDaily, d => mtOrder.reduce((s, g) => s + (d[g] || 0), 0));
  const y = d3.scaleLinear().domain([0, yMax]).range([h - mb, mt]);

  const svg = d3.create("svg").attr("width", w).attr("height", h)
    .style("display", "block").style("background", "#fafafa")
    .style("border", "1px solid #e8e8e8").style("border-radius", "4px").style("margin-bottom", "1.5rem");

  // Total sports volume sparkline
  svg.append("path").datum(mtDaily)
    .attr("fill", "#4e79a7").attr("fill-opacity", 0.2)
    .attr("d", d3.area()
      .x(d => x(d.date)).y0(h - mb).y1(d => y(mtOrder.reduce((s, g) => s + (d[g] || 0), 0)))
      .curve(d3.curveBasis));

  svg.append("g").attr("transform", `translate(0,${h - mb})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("stroke", "#ccc"))
    .call(g => g.selectAll("text").style("font-size", "10px").attr("fill", "#888"));

  const [ds, de] = mtDateSel;
  const brush = d3.brushX().extent([[ml, mt], [w - mr, h - mb]])
    .on("brush end", (event) => { if (!event.sourceEvent) return; if (event.selection) mtDateSel.value = event.selection.map(x.invert); });
  svg.append("g").call(brush).call(brush.move, [ds, de].map(x));
  display(svg.node());
}
```

```js
const [mtStart, mtEnd] = mtDateSel;

const mtTidy = mtDaily
  .filter(d => d.date >= mtStart && d.date <= mtEnd)
  .flatMap(row => mtOrder.map(g => ({date: row.date, type: g, contracts: row[g] || 0})));

// Per-date pivot for single combined tooltip
const mtTipData = Array.from(
  d3.rollup(mtTidy, rs => {
    const o = {date: rs[0].date};
    for (const r of rs) o[r.type] = r.contracts || 0;
    return o;
  }, d => d.date.getTime())
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

```js
Plot.plot({
  width,
  height: 380,
  marginLeft: 55,
  color: {legend: true, domain: mtOrder, range: mtColors},
  x: {type: "utc", label: null},
  y: {label: "Volume ($)", grid: true},
  marks: [
    Plot.areaY(mtTidy, {
      x: "date",
      y: "contracts",
      fill: "type",
      order: mtOrder,
      curve: "monotone-x",
      fillOpacity: 0.85
    }),
    Plot.ruleX(mtTipData, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.25})),
    Plot.tip(mtTipData, Plot.pointerX({
      x: "date",
      title: d => [fmtDate(d.date), ...mtOrder.map(t => d[t] > 0 ? `${t}: $${fmtCount(d[t])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

---

## All-time individual market leaderboard

<p class="section-intro">This table is meant for exploration rather than drill-down. Use the legend chips to isolate a theme, the search box to jump to a market, and the sortable columns to compare market structure.</p>

<div class="instruction-line"><strong>Current scope:</strong> this leaderboard intentionally stays at the summary level for now. Detailed price-path or volume-arrival views should wait until a per-market time-series dataset is available.</div>

Ranked by total contracts across all outcomes. Each row is one market (e.g. "Super Bowl 2026 winner"), not an individual yes/no contract.

```js
// ── Category colors ──────────────────────────────────────────────────────────
// Sports is split into Football / Basketball / Other sport for legibility.
// Sports = warm family (reds → oranges → gold) so you can instantly tell sports vs non-sports.
// Non-sports = cool family (blues → purples → teal).
const CAT_COLORS = {
  "Football":        "#c0392b",  // deep red     ─┐
  "Basketball":      "#e67e22",  // orange        │ warm = sports
  "Other sport":     "#f0b429",  // amber/gold   ─┘
  "Politics":        "#1565c0",  // deep blue    ─┐
  "Economics":       "#0891b2",  // teal-blue     │ cool = non-sports
  "Entertainment":   "#6d28d9",  // purple        │
  "Other non-sport": "#047857",  // dark green   ─┘
};

// ── Team maps for game-ticker parsing ────────────────────────────────────────
const NFL_TEAMS = {
  // 3-letter first so longest-match wins
  ARI:"Cardinals", ATL:"Falcons", BAL:"Ravens", BUF:"Bills", CAR:"Panthers",
  CHI:"Bears", CIN:"Bengals", CLE:"Browns", DAL:"Cowboys", DEN:"Broncos",
  DET:"Lions", HOU:"Texans", IND:"Colts", JAC:"Jaguars", JAX:"Jaguars",
  LAC:"Chargers", MIN:"Vikings", NOR:"Saints", NYG:"Giants", NYJ:"Jets",
  PHI:"Eagles", PIT:"Steelers", SEA:"Seahawks", TEN:"Titans", WAS:"Commanders",
  // 2-letter
  GB:"Packers", KC:"Chiefs", LA:"Rams", LV:"Raiders", MIA:"Dolphins",
  NE:"Patriots", NO:"Saints", SF:"49ers", TB:"Buccaneers",
};
const NBA_TEAMS = {
  ATL:"Hawks", BKN:"Nets", BOS:"Celtics", CHA:"Hornets", CHI:"Bulls",
  CLE:"Cavaliers", DAL:"Mavericks", DEN:"Nuggets", DET:"Pistons",
  GSW:"Warriors", HOU:"Rockets", IND:"Pacers", LAC:"Clippers", LAL:"Lakers",
  MEM:"Grizzlies", MIA:"Heat", MIL:"Bucks", MIN:"Wolves", NOP:"Pelicans",
  NYK:"Knicks", OKC:"Thunder", ORL:"Magic", PHI:"76ers", PHX:"Suns",
  POR:"Blazers", SAC:"Kings", SAS:"Spurs", TOR:"Raptors", UTA:"Jazz",
  WAS:"Wizards",
};
const MLB_TEAMS = {
  ARI:"Diamondbacks", ATL:"Braves", BAL:"Orioles", BOS:"Red Sox", CHC:"Cubs",
  CWS:"White Sox", CIN:"Reds", CLE:"Guardians", COL:"Rockies", DET:"Tigers",
  HOU:"Astros", KC:"Royals", LAA:"Angels", LAD:"Dodgers", MIA:"Marlins",
  MIL:"Brewers", MIN:"Twins", NYM:"Mets", NYY:"Yankees", OAK:"Athletics",
  PHI:"Phillies", PIT:"Pirates", SD:"Padres", SEA:"Mariners", SF:"Giants",
  STL:"Cardinals", TB:"Rays", TEX:"Rangers", TOR:"Blue Jays", WSH:"Nationals",
  ATH:"Athletics",
};
const NHL_TEAMS = {
  ANA:"Ducks", ARI:"Coyotes", BOS:"Bruins", BUF:"Sabres", CAR:"Hurricanes",
  CBJ:"Blue Jackets", CGY:"Flames", CHI:"Blackhawks", COL:"Avalanche",
  DAL:"Stars", DET:"Red Wings", EDM:"Oilers", FLA:"Panthers", LA:"Kings",
  LAK:"Kings", MIN:"Wild", MTL:"Canadiens", NJ:"Devils", NJD:"Devils",
  NSH:"Predators", NYI:"Islanders", NYR:"Rangers", OTT:"Senators",
  PHI:"Flyers", PIT:"Penguins", SEA:"Kraken", SJ:"Sharks", SJS:"Sharks",
  STL:"Blues", TB:"Lightning", TBL:"Lightning", TOR:"Maple Leafs",
  UTA:"Utah HC", VAN:"Canucks", VGK:"Golden Knights", WPG:"Jets", WSH:"Capitals",
};
const SOCCER_TEAMS = {
  RMA:"Real Madrid", FCB:"Barcelona", BAR:"Barcelona", ATM:"Atlético Madrid",
  MCI:"Man City", MCFC:"Man City", MUN:"Man United", LIV:"Liverpool",
  ARS:"Arsenal", CHE:"Chelsea", TOT:"Tottenham", NEW:"Newcastle",
  BAY:"Bayern", BVB:"Dortmund", PSG:"PSG", JUV:"Juventus", INT:"Inter",
  ACM:"AC Milan", NAP:"Napoli", POR:"Porto", BEN:"Benfica", SPOR:"Sporting CP",
  AJAX:"Ajax",
};
const CRICKET_TEAMS = {
  // International teams (T20 World Cup, WBC, etc.)
  IND:"India", PAK:"Pakistan", AUS:"Australia", ENG:"England", SA:"South Africa",
  RSA:"South Africa", NZ:"New Zealand", SL:"Sri Lanka", BAN:"Bangladesh",
  WI:"West Indies", AFG:"Afghanistan", IRE:"Ireland", ZIM:"Zimbabwe",
  USA:"USA", CAN:"Canada", NED:"Netherlands", NAM:"Namibia", UAE:"UAE",
  NEP:"Nepal", OMN:"Oman", SCO:"Scotland",
  // Latin American / WBC flavor
  DOM:"Dominican Rep.", VE:"Venezuela", VEN:"Venezuela", MEX:"Mexico",
  PR:"Puerto Rico", CUB:"Cuba", COL:"Colombia", ISR:"Israel",
  JPN:"Japan", KOR:"South Korea", TPE:"Chinese Taipei", CHN:"China",
  ITA:"Italy", PAN:"Panama", NIC:"Nicaragua", BRA:"Brazil",
};
const IPL_TEAMS = {
  CSK:"Chennai Super Kings", DC:"Delhi Capitals", GT:"Gujarat Titans",
  KKR:"Kolkata Knight Riders", LSG:"Lucknow Super Giants",
  MI:"Mumbai Indians", PBKS:"Punjab Kings", RCB:"Royal Challengers",
  RR:"Rajasthan Royals", SRH:"Sunrisers Hyderabad",
};
const TENNIS_PLAYERS = {
  // 2-letter
  JS:"Sinner", CA:"Alcaraz", ND:"Djokovic", AZ:"Zverev", TF:"Fritz",
  HR:"Rune", SM:"Medvedev", AR:"Rublev", DM:"Medvedev", JR:"Ruud",
  // 3-letter
  ALC:"Alcaraz", SIN:"Sinner", DJO:"Djokovic", ZVE:"Zverev", MUS:"Musetti",
  RUN:"Rune", FRI:"Fritz", MED:"Medvedev", RUB:"Rublev", RUU:"Ruud",
  SHE:"Shelton", TIA:"Tiafoe", DIM:"Dimitrov",
  // Women
  CG:"Gauff", AS:"Sabalenka", IS:"Świątek", ES:"Świątek", JP:"Pegula",
  EA:"Andreeva", MK:"Keys", QZ:"Zheng", OJ:"Jabeur",
  SAB:"Sabalenka", SWI:"Świątek", GAU:"Gauff", PEG:"Pegula",
  // 4-letter disambiguation forms sometimes used by Kalshi
  CALC:"Alcaraz", NDJO:"Djokovic", JSIN:"Sinner",
};
const CFB_TEAMS = {
  // 4-letter first
  ARIZ:"Arizona", ARMY:"Army", CCAR:"Coastal Carolina", CLEM:"Clemson",
  COLO:"Colorado", CONN:"UConn", DUKE:"Duke", IOWA:"Iowa", MISS:"Ole Miss",
  MIZZ:"Missouri", MSST:"Miss. State", NAVY:"Navy", NCST:"NC State",
  OHIO:"Ohio", OKLA:"Oklahoma", OKST:"Oklahoma St.", ORST:"Oregon St.",
  RICE:"Rice", RUTG:"Rutgers", SCAR:"South Carolina", STAN:"Stanford",
  TENN:"Tennessee", TLSA:"Tulsa", TULN:"Tulane", TXAM:"Texas A&M",
  TXST:"Texas St.", UTAH:"Utah", UTSA:"UTSA", WAKE:"Wake Forest",
  WASH:"Washington", MINN:"Minnesota", UNLV:"UNLV",
  // 3-letter
  ALA:"Alabama", ARK:"Arkansas", ASU:"Arizona St.", AUB:"Auburn", BYU:"BYU",
  CAL:"California", CIN:"Cincinnati", CMU:"Central Mich.", ECU:"East Carolina",
  FIU:"FIU", FLA:"Florida", FSU:"Florida St.",
  HAW:"Hawai'i", HOU:"Houston", IND:"Indiana", ISU:"Iowa St.", JMU:"James Madison",
  LOU:"Louisville", LSU:"LSU", MEM:"Memphis", MIA:"Miami (FL)", MICH:"Michigan",
  MSU:"Michigan St.", NEB:"Nebraska", OSU:"Ohio State", UNM:"New Mexico",
  ORE:"Oregon", PSU:"Penn State", PUR:"Purdue", SMU:"SMU", SYR:"Syracuse",
  TCU:"TCU", TEX:"Texas", TTU:"Texas Tech", UGA:"Georgia", UNC:"UNC",
  USC:"USC", USM:"Southern Miss", UVA:"Virginia", VAN:"Vanderbilt",
  WKU:"Western Ky.", WVU:"W. Virginia",
  // 2-letter
  GT:"Georgia Tech", ND:"Notre Dame", NW:"Northwestern", VT:"Virginia Tech",
  LT:"Louisiana Tech", FL:"Florida",
};
const CBB_TEAMS = {
  ...CFB_TEAMS,
  // Basketball-specific overrides / additions
  GONZ:"Gonzaga", VILL:"Villanova", VCU:"VCU", UCLA:"UCLA",
  ILL:"Illinois", WIS:"Wisconsin", KU:"Kansas", UK:"Kentucky",
  SJU:"St. John's", USU:"Utah St.", KENN:"Kennesaw St.", HOF:"Hofstra",
  FUR:"Furman", HOW:"Howard", MOH:"Monmouth", PV:"Prairie View",
  WRST:"Wright St.", PARK:"Park", PENN:"Penn",
  HP:"High Point", SCU:"Santa Clara",
  SIE:"Siena",
};

// Combined team lookup for generic winner extraction (fallback only — sport-
// specific lookups should use getTeamsForMarket to avoid cross-sport collisions)
const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// PGA Tour player code → last name
const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
  RM:"McIlroy",     SS:"Scheffler",  CAME:"Cam Young",  LABE:"Åberg",
  JBRI:"Bradley",
};

// Route a market_key to the right sport-specific team dictionary so e.g. a
// Kalshi MLB "SEA" strike doesn't get labeled "Seahawks".
function getTeamsForMarket(mk) {
  if (!mk) return ALL_TEAMS;
  if (/^KXNFL/.test(mk))                       return NFL_TEAMS;
  if (/^KXSB-/.test(mk))                       return NFL_TEAMS;
  if (/^KXNCAAF/.test(mk))                     return CFB_TEAMS;
  if (/^KXNBA/.test(mk))                       return NBA_TEAMS;
  if (/^KXNCAAMB|^KXMARMAD|^KXWMARMAD/.test(mk)) return CBB_TEAMS;
  if (/^KXMLB/.test(mk))                       return MLB_TEAMS;
  if (/^KXNHL/.test(mk))                       return NHL_TEAMS;
  if (/^KXUCL|^KXEPL|^KXLALIGA/.test(mk))      return SOCCER_TEAMS;
  if (/^KXT20|^KXICC|^KXWBC/.test(mk))         return CRICKET_TEAMS;
  if (/^KXIPL/.test(mk))                       return IPL_TEAMS;
  if (/^KXATP|^KXWTA|^KXWMEN|^KXFOMEN|^KXUSOMEN|^KXAOMEN|^KXAUSOPEN/.test(mk)) return TENNIS_PLAYERS;
  if (/^KXPGATOUR|^KXMASTERS|^KXUSOPEN/.test(mk)) return GOLF_PLAYERS;
  return ALL_TEAMS;
}

function parseGame(code, teamMap) {
  const keys = Object.keys(teamMap).sort((a, b) => b.length - a.length);
  function go(s, acc) {
    if (acc.length === 2 && s.length === 0) return acc;
    if (acc.length >= 2) return null;
    for (const k of keys) {
      if (s.startsWith(k)) { const r = go(s.slice(k.length), [...acc, k]); if (r) return r; }
    }
    return null;
  }
  const t = go(code, []);
  return t ? `${teamMap[t[0]]} vs. ${teamMap[t[1]]}` : null;
}

function parseTicker(mk) {
  if (/^KXFEDCHAIRNOM/.test(mk))  return "Next Fed Chair";
  // Flip date before label so "Sep '25 Fed rate decision" reads well when truncated
  const fedM = mk.match(/^KXFEDDECISION-(\d{2})([A-Z]{3})$/);
  if (fedM) {
    const yy = fedM[1], mon = fedM[2];
    return `${mon[0]+mon.slice(1).toLowerCase()} '${yy} Fed rate decision`;
  }
  if (/^KXNFLNFCCHAMP/.test(mk))     return `NFC Championship`;
  if (/^KXNFLAFCCHAMP/.test(mk))     return `AFC Championship`;
  if (/^KXFIRSTSUPERBOWLSONG/.test(mk)) return "SB halftime: first song";
  if (/^KXSUPERBOWLAD/.test(mk))     return "Super Bowl ad";
  if (/^KXKHAMENEIOUT/.test(mk))     return "Khamenei out of power";
  if (/^KXBOXING/.test(mk))          return "Boxing match";
  // Kalshi parlays — all start with KXMVE (multi-game extended)
  if (/^KXMVE/.test(mk))             return "Parlay";
  // NFL / NCAAF spread and total markets
  const nflSpr = mk.match(/^KXNFLSPREAD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflSpr) { const g = parseGame(nflSpr[1], NFL_TEAMS); return g ? `${g} (spread)` : null; }
  const ncaafSpr = mk.match(/^KXNCAAFSPREAD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (ncaafSpr) { const g = parseGame(ncaafSpr[1], CFB_TEAMS); return g ? `${g} (spread)` : null; }
  // NBA series
  const nbaSer = mk.match(/^KXNBASERIES-\d{2}([A-Z]+)$/);
  if (nbaSer) { const g = parseGame(nbaSer[1], NBA_TEAMS); return g ? `${g} (series)` : null; }
  // NFL / college games
  const nflM   = mk.match(/^KXNFLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflM)   return parseGame(nflM[1],   NFL_TEAMS) ?? mk;
  const ncaafM = mk.match(/^KXNCAAFGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (ncaafM) return parseGame(ncaafM[1], CFB_TEAMS) ?? mk;
  const cbbM   = mk.match(/^KXNCAAMBGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (cbbM)   return parseGame(cbbM[1],   CBB_TEAMS) ?? mk;
  const nbaM   = mk.match(/^KXNBAGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nbaM)   return parseGame(nbaM[1],   NBA_TEAMS) ?? mk;
  // MLB / NHL / UCL / IPL / WBC games
  const mlbGame = mk.match(/^KXMLBGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (mlbGame) return parseGame(mlbGame[1], MLB_TEAMS) ?? mk;
  const mlbSer = mk.match(/^KXMLBSERIES-\d{2}([A-Z]+)$/);
  if (mlbSer) { const g = parseGame(mlbSer[1], MLB_TEAMS); return g ? `${g} (series)` : null; }
  const nhlGame = mk.match(/^KXNHLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nhlGame) return parseGame(nhlGame[1], NHL_TEAMS) ?? mk;
  const uclGame = mk.match(/^KXUCLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (uclGame) return parseGame(uclGame[1], SOCCER_TEAMS) ?? mk;
  const iplGame = mk.match(/^KXIPLGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (iplGame) return parseGame(iplGame[1], IPL_TEAMS) ?? mk;
  // WBC fixture format includes a 4-digit time code (e.g. ...152000USADOM)
  const wbcGame = mk.match(/^KXWBCGAME-\d{2}[A-Z]{3}\d{2}\d{4}([A-Z]+)$/);
  if (wbcGame) return parseGame(wbcGame[1], CRICKET_TEAMS) ?? mk;
  return null;
}

// ── Forced market-name overrides (take priority over Kalshi's market_name) ───
// Use when Kalshi's own label is misleading or missing context that matters.
const MKT_NAME_FORCE = {
  "PRES-2024":                  "Presidency 2024",
  "POPVOTE-24":                 "Popular vote 2024",
  "KXSB-26":                    "Super Bowl LX",
  "KXSB-25":                    "Super Bowl LIX",
  "KXMASTERS-25":               "2025 Masters Tournament",
  // World Series 2025: LAD vs TOR — games 3, 4, 5, 6, 7
  "KXMLBGAME-25OCT27TORLAD":    "World Series 2025 Game 3",
  "KXMLBGAME-25OCT28TORLAD":    "World Series 2025 Game 4",
  "KXMLBGAME-25OCT29TORLAD":    "World Series 2025 Game 5",
  "KXMLBGAME-25OCT31LADTOR":    "World Series 2025 Game 6",
  "KXMLBGAME-25NOV01LADTOR":    "World Series 2025 Game 7",
  "KXMLBGAME-25OCT24LADTOR":    "World Series 2025 Game 1",
  "KXMLBGAME-25OCT25LADTOR":    "World Series 2025 Game 2",
  "KXMLBGAME-25OCT15TORSEA":    "ALCS 2025 (Mariners vs Blue Jays)",
};

// ── Specific overrides (markets with no Kalshi title at all) ─────────────────
const MKT_NAME_OVERRIDES = {
  "POPVOTEMOV-24-R-B":      "Popular vote margin (R, wider)",
  "POPVOTEMOVSMALL-24-R":   "Popular vote margin (R, small range)",
  "POPVOTEMOVSMALLER-24-R": "Popular vote margin (R, narrow range)",
  "POPVOTEMOV-24-D":        "Popular vote margin (D)",
  "ECMOV-24-R-B35":         "Electoral college margin >35 (R)",
  "ECMOV-24-R-B65":         "Electoral college margin >65 (R)",
  // "Who wins Popular Vote + Electoral College?" — combined-outcome market.
  // -REC is the Republican-EC branch; outcome -RPV = Republican also wins PV.
  "PRESPARTYFULL-24-REC":   "Popular vote winner (if R wins EC)",
  "PRESPARTYFULL-24":       "Popular vote + Electoral College winner",
  "POWER-24-RH-RS":         "Republican House + Senate 2024",
  "KXGOVSHUT":              "Government shutdown",
  "KXGOVTSHUTDOWN":         "Government shutdown",
  "KXCITRINI":              "Citrini macro call",
  "KXALIENS":               "Alien/UAP disclosure",
  "KXBTCMAXY-25-DEC31":     "Bitcoin max price 2025",
  "KXBTCMINY-25-2-DEC31":   "Bitcoin min price 2025",
  // Added in cleanup
  "KXKHAMENEIOUT-AKHA":         "Khamenei out of power",
  "KXLAYOFFSYINFO-26":          "More tech layoffs in 2026 than in 2025?",
  "KXSBGUESTS-26":              "Super Bowl LX guests",
  "KXMLBWORLD-26":              "World Baseball Classic 2026",
  "KXNBACUP-25":                "NBA Cup 2025",
  "KXSECAG-26DEC31":            "US Attorney General by end of 2026",
  "KXSECDEF-26DEC31":           "US Secretary of Defense by end of 2026",
  "KXSECHHS-26DEC31":           "US Secretary of HHS by end of 2026",
  "KXTOPARTIST-25":             "Top Spotify Artist 2025",
  "KXMAYORNYCNOMD-25":          "NYC Mayor Democratic Primary 2025",
  "KXPERFORMSUPERBOWLB-26":     "Super Bowl LX halftime performers",
  "KXT20WORLDCUP-26":           "2026 ICC Men's T20 World Cup",
  "KXFEDCHAIRNOM-29":           "Next Fed Chair",
  "KXNFLNFCCHAMP-25":           "NFC Championship",
  "KXNFLAFCCHAMP-25":           "AFC Championship",
  "KXFIRSTSUPERBOWLSONG-26FEB09":"Super Bowl halftime: first song",
  "KXSUPERBOWLAD-SB2026":       "Most Super Bowl LX ads (by brand)",
  "KXRANKLISTGOOGLESEARCH-26JAN":"Top Google search (Jan 2026)",
};

// ── Shared winner-display logic ───────────────────────────────────────────────
// Hard overrides for winner display, keyed on winner_ticker.
const WINNER_OVERRIDES = {
  "PRES-2024-DJT":        "Trump",
  "POPVOTE-24-R":         "Trump",
  "ECMOV-24-R":           "Trump",
  "PRESPARTYGA-24-R":     "Trump",
  "PRESPARTYPA-24-R":     "Trump",
  "PRESPARTYMI-24-R":     "Trump",
  "PRESPARTYIA-24-R":     "Trump",
  "PRESPARTYFULL-24-R":   "Trump",
  "SENATEAZ-24-D":        "Gallego",
  "GOVPARTYNJ-25-D":      "Democratic",
  "KXMAYORNYCPARTY-25-D": "Mamdani",
  // Added in cleanup
  "KXWMENSINGLES-25-JS":                "Sinner",
  "KXMAYORNYCNOMD-25-ZM":               "Mamdani",
  "KXSBGUESTS-26-ROG":                  "Various",
  "KXMLBWORLD-26-VE":                   "Venezuela",
  "KXBOXING-25SEP13CALVTCRA-TCRA":      "Crawford",
  "KXUFCFIGHT-26MAR07HOLOLI-OLI":       "Oliveira",
  "KXNOBELPEACE-25-MARI":               "Machado",
  "KXFEDCHAIRNOM-29-KW":                "Warsh",
  "KXBOXING-25DEC19JPAUAJOS-AJOS":      "Joshua",
  "KXPERFORMSUPERBOWLB-26-LAD":         "Lady Gaga",
  "KXGOVSHUTLENGTH-26JAN01-42D":        "43 days",
  "KXGOVSHUTLENGTH-26FEB28-3D":         "4 days",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT":   "Tití Me Preguntó",
  "KXSUPERBOWLAD-SB2026-GEMI":           "Various",
  "KXTOPARTIST-25-BB":                   "Bad Bunny",
  "KXNFLNFCCHAMP-25-SEA":                "Seahawks",
  "KXNFLAFCCHAMP-25-NE":                 "Patriots",
};

// Winner lookup by market_key, used when winner_ticker is blank but the market
// has settled to a specific outcome.
const WINNER_BY_MARKET = {
  "KXPGATOUR-MAST26":    "McIlroy",
  "KXMARMAD-26":         "Michigan",
  "KXMASTERS-25":        "McIlroy",
  "KXKHAMENEIOUT-AKHA":  "it's complicated…",
  "KXSUPERBOWLAD-SB2026":"Various",
};

function fmtWinner(d) {
  const mk   = (d.market_key ?? "").trim();
  const rawW = (d.winner ?? "").trim();
  // Strip market-rule text (e.g. "If UConn wins the...") — not a name
  const w    = rawW.length > 50 ? "" : rawW;
  const wt   = (d.winner_ticker ?? "").trim();
  if (WINNER_OVERRIDES[wt]) return WINNER_OVERRIDES[wt];
  // Fix Kalshi metadata error: "Hike 0bps" = no rate change = hold
  if (/hike\s*0\s*bps/i.test(w)) return "Hold";
  if (w && !w.startsWith("::")) return w;
  if (w.startsWith("::")) { const a = w.replace(/^::\s*/, "").trim(); if (a) return a; }
  if (wt) {
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    const teamMap = getTeamsForMarket(mk);
    return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
  }
  if (WINNER_BY_MARKET[mk]) return WINNER_BY_MARKET[mk];
  return "—";
}

function bestName(d) {
  const mk = (d.market_key ?? "").trim();
  if (MKT_NAME_FORCE[mk]) return MKT_NAME_FORCE[mk];
  const mn = (d.market_name || "").trim();
  // Skip market_name if it's just echoing the ticker key (Kalshi leaves it blank)
  if (mn && mn !== mk) return mn;
  const imn = (d["i.market_name"] || "").trim();
  if (imn && imn !== mk) return imn;
  return MKT_NAME_OVERRIDES[mk] || parseTicker(mk) || mk;
}

const fmtC = n => n >= 1e9 ? (n/1e9).toFixed(2)+"B"
               : n >= 1e6 ? (n/1e6).toFixed(1)+"M"
               : n >= 1e3 ? (n/1e3).toFixed(0)+"k"
               : String(n);

// Human-readable overrides for top-outcome (keyed on full ticker for precision)
const TOP_OUTCOME_NAMES = {
  "PRES-2024-KH":                     "Harris",
  "POPVOTE-24-D":                     "Harris",
  "KXPGATOUR-MAST26-SSCH":            "Scheffler",
  "KXMARMAD-26-CONN":                 "UConn",
  "KXFEDCHAIRNOM-29-JS":              "Shelton",
  "KXMAYORNYCPARTY-25-AC":            "Cuomo",
  "KXNFLNFCCHAMP-25-LA":              "Rams",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT": "Tití Me Preguntó",
  "KXBOXING-25DEC19JPAUAJOS-JPAU":    "Jake Paul",
  "KXBOXING-25SEP13CALVTCRA-TCRA":    "Terrazas",
  // Added in cleanup
  "KXKHAMENEIOUT-AKHA-26MAR01":       "by March 1",
  "KXALIENS-27":                      "before 2027",
  "KXTOPARTIST-25-TS":                "Taylor Swift",
  "KXSECAG-26DEC31-MG":               "Matt Gaetz",
  "KXRANKLISTGOOGLESEARCH-26JAN-DON": "Trump",
  "KXRANKLISTGOOGLESEARCH-26JAN-D4D": "D4vd",
  "KXSBGUESTS-26-MWAH":               "Wahlberg",
  "SENATEAZ-24-R":                    "Lake",
  "KXSUPERBOWLAD-SB2026-ANTHROPIC":   "Anthropic",
  "KXMAYORNYCNOMD-25-ZM":             "Mamdani",
  "KXCITRINI-28JUL01":                "by July 2028",
  "KXGOVSHUT-26JAN31":                "by Jan 31, 2026",
  "KXGOVTSHUTDOWN-26FEB14":           "by Feb 14, 2026",
  "KXFEDCHAIRNOM-29-KW":              "Warsh",
  "KXLAYOFFSYINFO-26-494000":         "≥ 494,000 layoffs",
  "KXPERFORMSUPERBOWLB-26-CAR":       "Cardi B",
  "PRESPARTYFULL-24-REC-RPV":         "Republican",
  "PRESPARTYFULL-24-REC-DPV":         "Democratic",
  "PRESPARTYFULL-24-DEC-RPV":         "Republican",
  "PRESPARTYFULL-24-DEC-DPV":         "Democratic",
  "POWER-24-RH-RS-RP":                "Republican",
};

function fmtStrike(top_outcome, market_key) {
  if (!top_outcome) return "—";
  if (TOP_OUTCOME_NAMES[top_outcome]) return TOP_OUTCOME_NAMES[top_outcome];
  const mk = (market_key ?? "").trim();
  const short = mk
    ? top_outcome.replace(mk + "-", "")
    : top_outcome.split("-").pop();
  // Fed rate outcomes
  if (short === "H0") return "Hold";
  if (/^H(\d+)$/.test(short)) return `-${short.slice(1)}×25 bps`;
  if (/^C(\d+)$/.test(short)) return `-${short.slice(1)} bps (cut)`;
  // Shutdown length — e.g. "42D" → "42 days"
  const daysM = short.match(/^(\d+)D$/);
  if (daysM) return `${daysM[1]} days`;
  // Date-style strike like "26MAR01" → "by Mar 1"
  const dateM = short.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (dateM) {
    const mon = dateM[2];
    return `by ${mon[0]+mon.slice(1).toLowerCase()} ${parseInt(dateM[3],10)}`;
  }
  // Spread strike like "SEA4" / "IND7" when in a spread market
  if (/SPREAD/.test(mk)) {
    const spM = short.match(/^([A-Z]+)(\d+)$/);
    if (spM) {
      const teamMap = getTeamsForMarket(mk);
      const teamName = teamMap[spM[1]] ?? spM[1];
      return `${teamName} -${spM[2]}`;
    }
  }
  // Percentage-formatted strikes — only for popular-vote-margin markets.
  // Bitcoin and electoral-college-margin strikes are bare numbers that are NOT %.
  const isPctMarket = /^POPVOTEMOV/.test(mk);
  if (isPctMarket && /^[0-9]+(\.[0-9]+)?$/.test(short)) return short + "%";
  if (isPctMarket && /^B[0-9]/.test(short))             return short.slice(1) + "%";
  // Non-pct bare numbers: show as-is (formatted with comma thousands)
  if (/^[0-9]+(\.[0-9]+)?$/.test(short)) {
    const n = Number(short);
    if (Number.isFinite(n) && n >= 1000) return n.toLocaleString();
    return short;
  }
  if (/^B[0-9]/.test(short)) return short.slice(1);
  // Sport-aware team / player fallback
  const teamMap = getTeamsForMarket(mk);
  return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
}

// Map a row's Kalshi category to a display category used for row coloring:
// Sports is split into Football / Basketball / Other sport for legibility.
function getSportDisplayCategory(d) {
  const cat = (d.kalshi_category || "").trim();
  // Merge Elections into Politics — they're the same concept on Kalshi
  if (cat === "Elections") return "Politics";
  // Fold Crypto and niche categories into Other non-sport
  if (cat === "Crypto" || cat === "Science and Technology" || cat === "Companies") return "Other non-sport";
  // Anything not in CAT_COLORS falls through to Other non-sport too
  if (cat !== "Sports" && !CAT_COLORS[cat]) return "Other non-sport";
  if (cat !== "Sports") return cat;
  const mk = (d.market_key || "").trim();
  if (/^KXNFL|^KXSB-|^KXNCAAF/.test(mk)) return "Football";
  if (/^KXNBA|^KXNCAAMB|^KXMARMAD|^KXWMARMAD/.test(mk)) return "Basketball";
  return "Other sport";
}

// Sort all-time by contracts and assign rank
const mktRanked = [...mktLeaderboard]
  .sort((a, b) => b.contracts - a.contracts)
  .map((d, i) => {
    const mk  = (d.market_key  ?? "").trim();
    const top = (d.top_outcome ?? "").trim();
    return {
      ...d,
      rank:           i + 1,
      display_name:   bestName(d),
      winner_display: fmtWinner(d),
      top_short:      fmtStrike(top, mk),
      display_cat:    getSportDisplayCategory(d)
    };
  });

```

```js
// Top-20 bar chart — use fill:"display_cat" so Plot's color scale drives the legend
const mktTop20 = mktRanked.slice(0, 20);
const mktCatDomain = Object.keys(CAT_COLORS).filter(c => mktTop20.some(d => d.display_cat === c));
Plot.plot({
  width,
  height: mktTop20.length * 24 + 60,  // extra space for the color legend
  marginLeft: 240,
  color: {
    legend: true,
    domain: mktCatDomain,
    range: mktCatDomain.map(c => CAT_COLORS[c])
  },
  x: {label: "Volume ($)", grid: true, tickFormat: d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null},
  marks: [
    Plot.barX(mktTop20, {
      x: "contracts",
      y: d => `#${d.rank} ${d.display_name}`,
      fill: "display_cat",  // use the named color scale so legend renders
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.display_name}\n$${fmtC(d.contracts)} volume\nFees: $${fmtC(+d.fees_total||0)}\nWinner: ${d.winner_display}`
    }),
    Plot.ruleX([0])
  ]
})
```

```js
const mktSearch = view(Inputs.search(mktRanked, {placeholder: "Search markets..."}));
```

```js
// Expose the underlying input so the clickable legend below can drive it.
const mktCatInput = hashInput("mkt_cat", Inputs.select(
  ["All", ...Object.keys(CAT_COLORS)],
  {label: "Category", value: hashGet("mkt_cat", "All")}
));
const mktCatFilter = view(mktCatInput);
```

```js
const mktFiltered = mktSearch
  .filter(d => mktCatFilter === "All" || d.display_cat === mktCatFilter);

// Build per-category CSS using :has() so the full row is colored —
// no JS DOM timing issues; survives table sort/pagination automatically.
const catCss = Object.entries(CAT_COLORS).map(([cat, color]) =>
  `.mkt-table tr:has([data-mkt-cat="${cat}"]) { background: ${color}38 !important; }
.mkt-table tr:has([data-mkt-cat="${cat}"]): hover { background: ${color}55 !important; }`
).join("\n");

display(html`<style>
  .mkt-table table { font-size: 14px; border-collapse: collapse; width: 100%; }
  .mkt-table td, .mkt-table th { padding: 0.65em 0.8em; }
  .mkt-table tr { height: 2.7em; }
  /* Sortable headers — Observable Inputs.table sorts on click; surface the affordance.
     Column layout: 1=checkbox, 2=rank, 3=_c(hidden), 4=market, 5=volume, 6=fees, 7=winner, 8=strike */
  .mkt-table thead th:nth-child(n+2):not(:nth-child(3)) {
    cursor: pointer;
    user-select: none;
    position: sticky; top: 0;
    background: var(--theme-background, #fff);
    z-index: 1;
  }
  .mkt-table thead th:nth-child(n+4):hover { color: var(--accent-kalshi, #2563eb); }
  .mkt-table thead th:nth-child(n+4)::after {
    content: " \2195";
    opacity: 0.35;
    font-size: 0.85em;
  }
  .mkt-table thead th:nth-child(n+4)[aria-sort="ascending"]::after  { content: " \2191"; opacity: 1; color: var(--accent-kalshi, #2563eb); }
  .mkt-table thead th:nth-child(n+4)[aria-sort="descending"]::after { content: " \2193"; opacity: 1; color: var(--accent-kalshi, #2563eb); }
  /* Inputs.table already renders its own ▴/▾ in a leading <span> on the active column;
     hide it so it doesn't double up with our arrows. */
  .mkt-table thead th > span:first-child { display: none; }
  /* Collapse the hidden category-tag column (_c is 3rd child: checkbox, rank, _c, ...) */
  .mkt-table th:nth-child(3), .mkt-table td:nth-child(3) { padding: 0 !important; width: 0; max-width: 0; overflow: hidden; }
  ${catCss}
</style>`);

// Category legend — swatch rectangles matching row tint, click to cross-filter.
{
  const legend = html`<div class="mkt-legend" role="tablist" aria-label="Filter by category"></div>`;
  const chips = [["All", null], ...Object.entries(CAT_COLORS)];
  function render() {
    legend.replaceChildren(...chips.map(([cat, color]) => {
      const active = (cat === "All" ? mktCatFilter === "All" : mktCatFilter === cat);
      const chipStyle = color
        ? `border-color:${color};background:${color}${active ? "40" : "1a"};font-weight:${active ? "600" : "400"};color:inherit;`
        : "";
      return html`<button type="button" class="mkt-legend-chip" style="${chipStyle}" aria-pressed="${active}" data-cat="${cat}">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color || "linear-gradient(135deg,#c0392b,#1565c0,#047857)"};flex-shrink:0"></span>
        <span>${cat}</span>
      </button>`;
    }));
    legend.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        const v = b.dataset.cat;
        if (mktCatInput.value !== v) {
          mktCatInput.value = v;
          mktCatInput.dispatchEvent(new Event("input", {bubbles: true}));
        }
      });
    });
  }
  render();
  display(legend);
}

// Add _c column — an invisible carrier for the data-mkt-cat attribute used by :has() CSS above.
// Coerce fees_total to a real number (null for missing) so column-sort is numeric, not string.
const mktDisplay = mktFiltered.map(d => {
  const fees = d.fees_total;
  const feesNum = (fees == null || fees === "" || isNaN(+fees)) ? null : +fees;
  return {
    ...d,
    _c: d.display_cat || d.kalshi_category || "",
    fees_total: feesNum
  };
});

display(html`<div style="font-size:0.82em;color:var(--text-faint,#888);margin:0.3rem 0 0.6rem">Tip: click any column header to sort. Click again to reverse.</div>`);

const tbl = Inputs.table(mktDisplay, {
  columns: ["rank", "_c", "display_name", "contracts", "fees_total", "winner_display", "top_short"],
  header: {
    rank:          "#",
    _c:            "",
    display_name:  "Market",
    contracts:     "Volume",
    fees_total:    "Kalshi fees",
    winner_display:"Winner",
    top_short:     "Highest-vol. strike"
  },
  format: {
    rank: d => d,
    _c: cat => {
      const el = document.createElement("span");
      el.setAttribute("data-mkt-cat", cat);
      return el;
    },
    contracts:  d => "$" + fmtC(d),
    fees_total: d => (d == null || d === 0) ? "N/A" : "$" + fmtC(+d),
  },
  align: {
    rank: "right",
    contracts: "right",
    fees_total: "right"
  },
  width: {rank: 50, _c: 0},
  sort: "rank",
  reverse: false,
  rows: 50
});
tbl.classList.add("mkt-table");
display(tbl);
```
