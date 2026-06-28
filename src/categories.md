---
title: Categories
---

<div class="page-hero">
  <div class="page-eyebrow">Kalshi</div>
  <h1>Kalshi Categories</h1>
  <p class="page-lead">How Kalshi's volume splits across sports, non-sports, and the categories inside each — from the broad picture down to the individual markets.</p>
</div>

<details class="surface-card compact-details">
  <summary>How this is calculated</summary>
  <p>This page uses daily ticker/category aggregates rather than raw browser-side trades. The volume map starts from broad categories and can drill into the largest component markets inside the selected parent; smaller residual activity is grouped so the displayed pieces remain readable without implying the omitted tail is zero. Raw ticker prefixes are shortened in labels for readability.</p>
</details>

```js
const leaderboard = await FileAttachment("data/category_leaderboard.csv").csv({typed: true});
const topDaily = await FileAttachment("data/daily_top_categories.csv").csv({typed: true});
const mktLeaderboard = await FileAttachment("data/market_leaderboard.csv").csv({typed: true});
// Leg-based parlay correlation by (date, report_ticker): lets the treemap split each
// parlay series' windowed volume into correlated / independent / pending by what the legs
// actually were, instead of the ticker-name-derived Same-game/Multi-game mtype (which is
// wrong — e.g. KXMVESPORTSMULTIGAMEEXTENDED is ~46% correlated / ~54% independent).
const parlayCorrByTicker = await FileAttachment("data/parlay_corr_by_ticker_daily.csv").csv({typed: true});
const freshness = await FileAttachment("data/freshness_manifest.json").json();
import {hashGet, hashSet, hashInput} from "./components/hash-state.js";
import {askPageLink, fileUpdatedAt, freshnessPanel, latestDate} from "./components/freshness.js";
import {renderDateBrush} from "./components/date-brush.js";
```

```js
display(freshnessPanel({
  items: [
    {label: "Category trends", date: latestDate(topDaily), updatedAt: fileUpdatedAt(freshness, "daily_top_categories.csv"), meta: "Can be within 15 minutes locally after near-live refresh"},
    {label: "Category leaderboard", value: `${leaderboard.length.toLocaleString()} series`, updatedAt: fileUpdatedAt(freshness, "category_leaderboard.csv"), meta: "All-time raw API rebuild", tone: "settlement"},
    {label: "Market leaderboard", value: `${mktLeaderboard.length.toLocaleString()} markets`, updatedAt: fileUpdatedAt(freshness, "market_leaderboard.csv"), meta: "All-time raw API + settlement metadata", tone: "settlement"}
  ],
  note: "Trend charts can be fresher than all-time leaderboards. Winner fields and settled outcomes depend on settlement metadata refreshes."
}));
display(askPageLink({
  question: "Find the most important recent category shifts and compare them with the all-time category leaderboard.",
  context: "Categories page using daily_top_categories.csv, category_leaderboard.csv, and market_leaderboard.csv."
}));
```

```js
const fmtCount = n => { const a = Math.abs(n ?? 0), s = n < 0 ? "-" : ""; return s + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"k" : String(a)); };
const fmtDate  = d => d?.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}) ?? "";
```

```js
const TM_CATEGORY_ORDER = [
  "NFL", "College Football", "NBA", "College Basketball", "Baseball",
  "Hockey", "Golf", "Tennis", "Soccer", "Cricket", "Combat Sports", "Racing", "Esports", "Parlay",
  "Crypto", "Politics", "Finance", "Entertainment", "Mention", "Weather",
  "Other Sports", "Other Non-sports"
];

const TM_CATEGORY_COLORS = {
  "NFL": "#C62828",
  "Combat Sports": "#8B1A1A",
  "College Football": "#E64A19",
  "Tennis": "#E53935",
  "NBA": "#F57F17",
  "Soccer": "#F9A825",
  "Cricket": "#FA8072",
  "Golf": "#FBC02D",
  "Parlay": "#FDD835",
  "Baseball": "#F06292",
  "College Basketball": "#D81B60",
  "Hockey": "#4E342E",
  "Racing": "#A1887F",
  "Esports": "#BCAAA4",
  "Other Sports": "#8D6E63",
  "Crypto": "#0D47A1",
  "Politics": "#1A237E",
  "Finance": "#1E88E5",
  "Weather": "#4FC3F7",
  "Entertainment": "#0097A7",
  "Mention": "#546E7A",
  "Other Non-sports": "#7986CB"
};

const TM_TO_WIDE_CATEGORY = {
  "College Football": "College football",
  "College Basketball": "College basketball",
  "Combat Sports": "Combat sports",
  "Mention": "Mention",
  "Other Sports": "Other sports",
  "Other Non-sports": "Other non-sports"
};

const topDailyCols = Object.keys(topDaily[0]).filter(k => k !== "date");

function normalizeTreemapCategory(cat) {
  return TM_TO_WIDE_CATEGORY[cat] || cat;
}

function classifyTreemapTicker(ticker, isSports) {
  // Phase 24 lookup-first: if R/classify_market.R produced a classification
  // for this report_ticker in the leaderboard, use it (single source of truth).
  // The JS rules below are kept as a defensive fallback for the rare ticker
  // that isn't in the leaderboard yet.
  const fromR = classByReportTicker.get(ticker);
  if (fromR) return fromR;
  const tickerUpper = String(ticker || "").toUpperCase();
  let grp = isSports === "TRUE" ? "Sports" : "Non-sports";

  let cat;
  if      (tickerUpper.includes("MENTION"))                                      cat = "Mention";
  else if (ticker.startsWith("KXMVE"))                                           cat = "Parlay";
  else if (ticker.startsWith("KXNFL") || ticker === "KXSB" ||
           ticker.startsWith("KXNEXTTEAMNFL") || ticker.startsWith("KXNEXTTEAMMICAH") ||
           ticker.startsWith("KXNEXTTEAMTYREEK") || ticker.startsWith("KXNEXTTEAMMCLAURIN") ||
           ticker.startsWith("KXNEWCOACH") || ticker.startsWith("KXNEXTCOACHOUTNFL") ||
           ticker.startsWith("KXTEAMSINSB") || ticker.startsWith("KXNEXTNFLCOACH") ||
           ticker === "KXAFC" || ticker === "KXNFC" ||
           ticker.startsWith("KXNFCAFCSB") || ticker.startsWith("KXNYGCOACH") ||
           ticker.startsWith("KXCOACHOUTNFL"))                                  cat = "NFL";
  else if (ticker.startsWith("KXNCAAF") || ticker.startsWith("KXHEISMAN") ||
           ticker.startsWith("KXLSUCOACH") || ticker.startsWith("KXMICHCOACH") ||
           ticker.startsWith("KXPSUCOACH") || ticker.startsWith("KXFLACOACH") ||
           ticker.startsWith("KXTENNCOACH") || ticker.startsWith("KXARKCOACH") ||
           ticker.startsWith("KXVTCOACH") || ticker.startsWith("KXAUBCOACH") ||
           ticker.startsWith("KXCOACHOUTOLEMISS") || ticker.startsWith("KXCFPSEED") ||
           ticker.startsWith("KXCFBMENTION"))                                   cat = "College Football";
  else if (ticker.startsWith("KXNBA") || ticker.startsWith("KXNEXTTEAMNBA") ||
           ticker.startsWith("KXNEXTTEAMGIANNIS") || ticker.startsWith("KXNEXTTEAMLEBRON") ||
           ticker.startsWith("KXNEXTTEAMWESTBROOK") || ticker.startsWith("KXNEXTCOACHOUTNBA") ||
           ticker.startsWith("KXWNBA") || ticker.startsWith("KXEUROLEAGUE") ||
           ticker.startsWith("KXEUROCUP") || ticker.startsWith("KXCBAGAME") ||
           ticker.startsWith("KXNBLGAME") || ticker.startsWith("KXKBLGAME") ||
           ticker.startsWith("KXFIBA") || ticker.startsWith("KXABAGAME") ||
           ticker.startsWith("KXBSLGAME") || ticker.startsWith("KXARGLNBGAME") ||
           ticker.startsWith("KXLNBELITEGAME") || ticker.startsWith("KXACBGAME") ||
           ticker.startsWith("KXBBSERIEA") || ticker.startsWith("KXVTBGAME") ||
           ticker.startsWith("KXTEAMSINNBAF"))                                  cat = "NBA";
  else if (ticker.startsWith("KXNCAAMB") || ticker.startsWith("KXNCAAWB") ||
           ticker.startsWith("KXMARMAD") || ticker.startsWith("KXWMARMAD") ||
           ticker.startsWith("KXNCAAB") || ticker.startsWith("KXMAKEMARMAD") ||
           ticker.startsWith("KXNCAAMACC") || ticker.startsWith("KXNCAAMENT") ||
           ticker.startsWith("KXNCAAMBNEXTCOACH"))                              cat = "College Basketball";
  else if (ticker.startsWith("KXMLB") || ticker.startsWith("KXWBC") ||
           ticker.startsWith("KXNCAABASEBALL") || ticker.startsWith("KXNEXTTEAMMLB") ||
           ticker.startsWith("KXNEXTTEAMSKUBAL") || ticker.startsWith("KXKBO") ||
           ticker.startsWith("KXNPB"))                                          cat = "Baseball";
  else if (ticker.startsWith("KXNHL") || ticker.startsWith("KXKHL") ||
           ticker.startsWith("KXAHL") || ticker.startsWith("KXSHL") ||
           ticker.startsWith("KXLIIGA") || ticker.startsWith("KXDEL") ||
           ticker.startsWith("KXIIHF") || ticker.startsWith("KXWOMHOCKEY") ||
           ticker.startsWith("KXWOHOCKEY") || ticker.startsWith("KXWOWHOCKEY") ||
           ticker.startsWith("KXNCAAHOCKEY"))                                   cat = "Hockey";
  else if (ticker.startsWith("KXPGA") || ticker.startsWith("KXMASTERS") ||
           ticker.startsWith("KXTHEOPEN") || ticker.startsWith("KXLIVTOUR") ||
           ticker.startsWith("KXDPWORLDTOUR") || ticker.startsWith("KXLPGA") ||
           ticker.startsWith("KXRYDER") || ticker.startsWith("KXTGL") ||
           ticker.startsWith("KXGENESISINVITATIONAL"))                          cat = "Golf";
  else if (ticker.startsWith("KXATP") || ticker.startsWith("KXWTA") ||
           ticker.startsWith("KXITF") || ticker.startsWith("KXUSO") ||
           ticker.startsWith("KXFOMEN") || ticker.startsWith("KXFOWOMEN") ||
           ticker.startsWith("KXWMENSINGLES") || ticker.startsWith("KXWWOMENSINGLES") ||
           ticker.startsWith("KXWMEN") || ticker.startsWith("KXWWOMEN") ||
           ticker.startsWith("KXIWMEN") || ticker.startsWith("KXIWWOMEN") ||
           ticker.startsWith("KXWIMBLEDON") || ticker.startsWith("KXAUSTRALIAN") ||
           ticker.startsWith("KXAOMEN") || ticker.startsWith("KXAOWOMEN") ||
           ticker.startsWith("KXDAVISCUP") || ticker.startsWith("KXUNITEDCUP") ||
           ticker.startsWith("KXTENNISEX") || ticker.startsWith("KXSIXKINGSSLAM") ||
           ticker.startsWith("KXMOMEN") || ticker.startsWith("KXMOWOMEN"))      cat = "Tennis";
  else if (ticker.startsWith("KXEPL") || ticker.startsWith("KXUCL") ||
           ticker.startsWith("KXUEL") || ticker.startsWith("KXUECL") ||
           ticker.startsWith("KXUEFA") || ticker.startsWith("KXLALIGA") ||
           ticker.startsWith("KXSERIEA") || ticker.startsWith("KXSERIEB") ||
           ticker.startsWith("KXBUNDESLIGA") || ticker.startsWith("KXLIGUE") ||
           ticker.startsWith("KXMLS") || ticker.startsWith("KXLIGAMX") ||
           ticker.startsWith("KXNWSL") || ticker.startsWith("KXSOCCER") ||
           ticker.startsWith("KXFIFA") || ticker.startsWith("KXMENWORLDCUP") ||
           ticker.startsWith("KXWORLDCUP") || ticker.startsWith("KXCLUBWC") ||
           ticker.startsWith("KXEWC") || ticker.startsWith("KXCOPA") ||
           ticker.startsWith("KXCOPADELREY") || ticker.startsWith("KXFACUP") ||
           ticker.startsWith("KXEFL") || ticker.startsWith("KXPREMIER") ||
           ticker.startsWith("KXESPSUPER") || ticker.startsWith("KXAFCON") ||
           ticker.startsWith("KXJLEAGUE") || ticker.startsWith("KXJBLEAGUE") ||
           ticker.startsWith("KXBRASILEIRO") || ticker.startsWith("KXSUPERLIG") ||
           ticker.startsWith("KXARGPREMDIV") || ticker.startsWith("KXLIGAPORTUGAL") ||
           ticker.startsWith("KXALEAGUE") || ticker.startsWith("KXSAUDIPLG") ||
           ticker.startsWith("KXEREDIVISIE") || ticker.startsWith("KXBELGIANPL") ||
           ticker.startsWith("KXSCOTTISHPREM") || ticker.startsWith("KXKLEAGUE") ||
           ticker.startsWith("KXBALLONDOR") || ticker.startsWith("KXMESSI") ||
           ticker.startsWith("KXINTLFRIENDLY") || ticker.startsWith("KXDFBPOKAL") ||
           ticker.startsWith("KXWPL") || ticker.startsWith("KXEWSL") ||
           ticker.startsWith("KXINTERCONCUP") || ticker.startsWith("KXITASUPERCUP") ||
           ticker.startsWith("KXCOPPAIT") || ticker.startsWith("KXCOUPEDEFRANCE") ||
           ticker.startsWith("KXKNVBCUP") || ticker.startsWith("KXSLGREECE") ||
           ticker.startsWith("KXDENSUPER") || ticker.startsWith("KXFRASUPERCUP") ||
           ticker.startsWith("KXTACAPORT") || ticker.startsWith("KXDIMAYOR") ||
           ticker.startsWith("KXSWISSLEAGUE") || ticker.startsWith("KXEKSTRAKLASA") ||
           ticker.startsWith("KXHNL") || ticker.startsWith("KXAFCCL") ||
           ticker.startsWith("KXTEAMSINUCL") || ticker.startsWith("KXCONCACAF") ||
           ticker.startsWith("KXCONMEBOL") || ticker.startsWith("KXEGYPLGAME") ||
           ticker.startsWith("KXCHNSLGAME") || ticker.startsWith("KXURYPDGAME") ||
           ticker.startsWith("KXECULPGAME"))                                    cat = "Soccer";
  else if (ticker.startsWith("KXIPL") || ticker.startsWith("KXT20") ||
           ticker.startsWith("KXCRICKET") || ticker.startsWith("KXBBL") ||
           ticker.startsWith("KXASIACUP") || ticker.startsWith("KXPSL"))        cat = "Cricket";
  else if (ticker.startsWith("KXUFC") || ticker.startsWith("KXBOXING") ||
           ticker.startsWith("KXMMA"))                                          cat = "Combat Sports";
  else if (ticker.startsWith("KXCS2") || ticker.startsWith("KXLOL") ||
           ticker.startsWith("KXVALORANT") || ticker.startsWith("KXDOTA2") ||
           ticker.startsWith("KXRL") || ticker.startsWith("KXCSGO") ||
           ticker.startsWith("KXCOD") || ticker.startsWith("KXR6") ||
           ticker.startsWith("KXMIDSEASONINVITATIONAL") || ticker.startsWith("KXLEAGUEWORLDS") ||
           ticker.startsWith("KXSTARLADDER"))                                   cat = "Esports";
  else if (ticker.startsWith("KXNASCAR") || ticker.startsWith("KXF1") ||
           ticker.startsWith("KXINDY500") || ticker.startsWith("KXINDY"))       cat = "Racing";
  else if (ticker.startsWith("KXWO") || ticker.startsWith("KXWINTEROLYMPICS") ||
           ticker.startsWith("KXOLYMPICS") || ticker.startsWith("KXCHESS") ||
           ticker.includes("CHESS") ||
           (ticker.startsWith("KXFIDE") && !ticker.startsWith("KXFIDESZ")) ||
           ticker.startsWith("KXRUGBY") ||
           ticker.startsWith("KXSIXNATIONS") || ticker.startsWith("KXNCAAMLAX") ||
           ticker.startsWith("KXNCAALAX") || ticker.startsWith("KXDARTS") ||
           ticker.startsWith("KXPREMDARTS") || ticker.startsWith("KXPICKLEBALL") ||
           ticker.startsWith("KXLAXTEWAARATON") || ticker.endsWith("GAME"))     cat = "Other Sports";
  else if (ticker.startsWith("KXNATHAN"))                                       cat = "Other Sports";
  else if (ticker.startsWith("KXBTC") || ticker.startsWith("BTC") ||
           ticker.startsWith("KXETH") || ticker.startsWith("ETH") ||
           ticker.startsWith("KXSOL") || ticker.startsWith("SOL") ||
           ticker.startsWith("KXXRP") || ticker.startsWith("XRP") ||
           ticker.startsWith("KXDOGE") || ticker.startsWith("DOGE") ||
           ticker.startsWith("KXHYPE") || ticker.startsWith("KXBNB") ||
           ticker.startsWith("KXSHIBA"))                                        cat = "Crypto";
  else if (ticker.startsWith("KXCITRINI"))                                      cat = "Finance";
  else if (ticker === "PRES" || ticker.startsWith("KXFEDCHAIR") ||
           ticker.startsWith("KXTRUMP") || ticker.startsWith("POPVOTE") ||
           ticker.startsWith("KXMAYOR") || ticker.startsWith("KXGOV") ||
           ticker.startsWith("KXPRES") || ticker.startsWith("PRES") ||
           ticker.startsWith("KXVPRES") || ticker.startsWith("VPRES") ||
           ticker.startsWith("SENATE") || ticker.startsWith("KXSENATE") ||
           ticker.startsWith("GOV") || ticker.startsWith("HOUSE") ||
           ticker.startsWith("CONTROL") || ticker.startsWith("CLOSESTSTATE") ||
           ticker.startsWith("KXELECTIONMOV") || ticker.startsWith("KXCANADAPM") ||
           ticker.startsWith("KXCABOUT") || ticker.startsWith("KXDJT") ||
           ticker.startsWith("KXSECAG") || ticker.startsWith("KXSECDEF") ||
           ticker.startsWith("KXSECHHS") || ticker.startsWith("KXBIDENPARDON") ||
           ticker.startsWith("KXEPSTEIN") ||
           ticker.startsWith("KXSWINGSTATE") ||
           ticker.startsWith("KXNEXTIRANLEADER") || ticker.startsWith("KXMADURO") ||
           ticker.startsWith("KXLEADERSOUT") || ticker.startsWith("KXKHAMENEI") ||
           ticker.startsWith("KXDHSFUND") || ticker.startsWith("KXHORMUZ") ||
           ticker.startsWith("KXCLOSEHORMUZ") || ticker.startsWith("KXSTARMER") ||
           ticker.startsWith("KXNJGOV") || ticker.startsWith("KXNYGOV") ||
           ticker.startsWith("PRESPARTY") || ticker.startsWith("KXFRENCH") ||
           ticker.startsWith("KXCUOMO") || ticker.startsWith("CUOMO") ||
           ticker.startsWith("KXEOWEEK") || ticker.startsWith("KXEOCOUNT") ||
           ticker.startsWith("KXUSAIRAN") || ticker.startsWith("KXGREENLAND") ||
           ticker.startsWith("KXLEADEROUT") || ticker.startsWith("KXLEAVEADMIN") ||
           ticker.startsWith("CABINET") || ticker.startsWith("KXVOTER") ||
           ticker.startsWith("RSENATE") || ticker.startsWith("KXSENMAJORITY") ||
           ticker.startsWith("KXSTATEDEEP") || ticker.startsWith("KXBONDIOUT") ||
           ticker.startsWith("KXNEXTAG") || ticker.startsWith("KXCANCOALITION") ||
           ticker.startsWith("KXSECTREASURY") || ticker.startsWith("KXDNI") ||
           ticker.startsWith("KXLEAVEWALZ") || ticker.startsWith("KXVIRGINIAREDISTRICTING") ||
           ticker.startsWith("KXINAUG") || ticker.startsWith("KXVOTEPERCENT") ||
           ticker.startsWith("KXTXSEND") || ticker.startsWith("RHOUSESEATS") ||
           ticker.startsWith("KXNYCMAYOR") || ticker.startsWith("KXVOTE") ||
           ticker.startsWith("KXHONDURASPRES") || ticker.startsWith("KXVENEZUELALEADER") ||
           ticker.startsWith("KXFIDESZ") ||
           ticker.startsWith("SHUTDOWN") || ticker.startsWith("KXTXSEN") ||
           ticker.startsWith("KXDOED") || ticker.startsWith("KXSAVEACT") ||
           ticker.startsWith("KXDEMSWEEP") || ticker.startsWith("KXGREENTERRITORY") ||
           ticker.startsWith("KXFBI") || ticker.startsWith("KXWLEADER") ||
           ticker.includes("REDISTRICT") || ticker.startsWith("TIKTOKBAN") ||
           ticker.startsWith("KXTARIFF") || ticker.startsWith("538APPROVE") ||
           ticker.startsWith("KXWISCOTUS") || ticker.startsWith("KXNEXTHUNGARYPM") ||
           ticker.startsWith("KXGA14S"))                                       cat = "Politics";
  else if (ticker.startsWith("KXFED") || ticker.startsWith("KXINXU") ||
           ticker.startsWith("ECMOV") || ticker.startsWith("KXNASDAQ") ||
           ticker.startsWith("NASDAQ") || ticker.startsWith("INX") ||
           ticker.startsWith("KXINX") || ticker.startsWith("KXWTI") ||
           ticker.startsWith("KXAAA") || ticker.startsWith("KXCPI") ||
           ticker.startsWith("CPI") || ticker.startsWith("KXPAYROLL") ||
           ticker.startsWith("KXGDP") || ticker.startsWith("GDP") ||
           ticker.startsWith("KXRATECUT") || ticker.startsWith("RATECUT") ||
           ticker.startsWith("FED") || ticker.startsWith("LEAVEPOWELL") ||
           ticker.startsWith("TNOTE") || ticker.startsWith("POWER") ||
           ticker.startsWith("KXIPO") || ticker.startsWith("USDJPY") ||
           ticker.startsWith("EURUSD") || ticker.startsWith("KXLAYOFF") ||
           ticker.startsWith("KXRT") || ticker.startsWith("KXU3") ||
           ticker.startsWith("KXFOREIGN") || ticker.startsWith("KXFOMC") ||
           ticker.startsWith("RECSSNBER") || ticker.startsWith("KXECONSTAT") ||
           ticker.startsWith("KXTESLA"))                                        cat = "Finance";
  else if (ticker.startsWith("KXHIGH") || ticker.startsWith("HIGH") ||
           ticker.startsWith("KXLOW") || ticker.startsWith("LOW") ||
           ticker.startsWith("KXRAIN") || ticker.startsWith("RAIN") ||
           ticker.startsWith("KXSNOW") || ticker.startsWith("SNOW") ||
           ticker.includes("SNOW") ||
           ticker.startsWith("KXTEMP") || ticker.startsWith("TEMP") ||
           ticker.startsWith("KXTROP"))                                         cat = "Weather";
  else if (ticker.startsWith("KXOSCAR") || ticker.startsWith("OSCAR") ||
           ticker.startsWith("KXGRAM") || ticker.startsWith("GRAM") ||
           ticker.startsWith("KXSURVIV") || ticker.startsWith("SURVIV") ||
           ticker.startsWith("KXSPOTIFY") || ticker.startsWith("SPOTIFY") ||
           ticker.startsWith("KXTOPMODEL") || ticker.startsWith("KXTOPARTIST") ||
           ticker.startsWith("KXNETFLIXRANK") || ticker.startsWith("KXALBUMSALES") ||
           ticker.startsWith("KXFIRSTSUPERBOWLSONG") || ticker.startsWith("KXSUPERBOWLAD") ||
           ticker.startsWith("KXPERFORMSUPERBOWL") || ticker.startsWith("KXSBGUESTS") ||
           ticker.startsWith("KXSBADS") || ticker.startsWith("KXSBSETLISTS") ||
           ticker.startsWith("KXSBPERFORM") || ticker.startsWith("KXSBADAPPEARANCES") ||
           ticker.startsWith("KXSBVIEWER") || ticker.startsWith("KXSBMENTION") ||
           ticker.startsWith("KXTIME") || ticker.startsWith("KXKIMMEL") ||
           ticker.startsWith("KXCOLBERT") || ticker.startsWith("KXSNL") ||
           ticker.startsWith("KX60MIN") ||
           ticker.startsWith("KXMRBEAST") ||
           ticker.startsWith("KXRANKLIST") ||
           ticker.startsWith("KXCODINGMODEL") || ticker.startsWith("GAMEAWARDS") ||
           ticker.startsWith("KXGAMEAWARDS") ||
           ticker.startsWith("GTA6") || ticker.startsWith("KXSONG") ||
           ticker.startsWith("SONG") || ticker.startsWith("KXDANCINGWITHTHESTARS") ||
           ticker.startsWith("DANCINGWITHTHESTARS") || ticker.startsWith("KXDANCING") ||
           ticker.startsWith("DANCING") || ticker.startsWith("KXEMMY") ||
           ticker.startsWith("EMMY") || ticker.startsWith("KXGOLDENGLOBE") ||
           ticker.startsWith("GOLDENGLOBE") || ticker.startsWith("KXBOXOFFICE") ||
           ticker.startsWith("BOXOFFICE") || ticker.startsWith("KXMOVIE") ||
           ticker.startsWith("MOVIE") || ticker.startsWith("KXSUPERBOWLHEADLINE") ||
           ticker.startsWith("KXTRAITORS") || ticker.startsWith("KXTOP10BILLBOARD") ||
           ticker.startsWith("KXTOPMONTHLY"))                                   cat = "Entertainment";
  else                                                                           cat = grp === "Sports" ? "Other Sports" : "Other Non-sports";

  const sportsCatsSet = new Set(["NFL", "College Football", "NBA", "College Basketball", "Baseball", "Hockey", "Golf", "Tennis", "Soccer", "Cricket", "Combat Sports", "Racing", "Esports", "Other Sports", "Parlay"]);
  if (sportsCatsSet.has(cat)) grp = "Sports";
  else if (cat !== "Other Sports" && cat !== "Other Non-sports") grp = "Non-sports";

  let mtype;
  if (cat === "Other Sports" || cat === "Other Non-sports") {
    mtype = ticker;
  } else if (cat === "Parlay") {
    mtype = ticker.includes("SINGLEGAME") ? "Same-game" : "Multi-game";
  } else if (cat === "Crypto") {
    mtype = /15M$/.test(ticker) ? "15-minute" : /D$/.test(ticker) ? "Daily" : "Other";
  } else if (cat === "Mention") {
    mtype = "Mention";
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

// Below this all-time contract threshold, trust R's is_sports flag directly
// rather than our manual JS prefix rules (exception: Parlays, which R misclassifies).
const FALLBACK_THRESHOLD = 5_000_000;
const FALLBACK_NOTIONAL_THRESHOLD = 15_000_000;
const allTimeContractsMap = new Map(leaderboard.map(d => [d.report_ticker, +d.contracts || 0]));
const allTimeNotionalMap = new Map(leaderboard.map(d => [d.report_ticker, +d.yes_side_notional_volume || 0]));
// Phase 24 — R-as-single-brain: authoritative classification per report_ticker,
// computed by R/classify_market.R (1:1 port of the JS rules below) and emitted
// by R/build_leaderboard_from_duckdb.R into the leaderboard CSV. Used as a
// lookup short-circuit at the top of classifyTreemapTicker / classifyWithFallback;
// the JS rules below stay as a defensive fallback for tickers not in the
// leaderboard (effectively all real volume is covered).
const classByReportTicker = new Map(
  leaderboard
    .filter(d => d.report_ticker && d.grp && d.cat)
    .map(d => [d.report_ticker, {
      grp: d.grp, cat: d.cat,
      wideCat: d.wide_cat || normalizeTreemapCategory(d.cat),
      mtype: d.mtype || d.report_ticker
    }])
);
const kalshiCategoryByReportTicker = new Map(
  d3.rollups(
    mktLeaderboard.filter(d => d.report_ticker && d.kalshi_category),
    rows => d3.rollups(
      rows,
      vals => d3.sum(vals, v => +v.contracts || 0),
      d => d.kalshi_category
    ).sort((a, b) => b[1] - a[1])[0]?.[0],
    d => d.report_ticker
  )
);

function categoryFromKalshiCategory(rawCategory) {
  const c = String(rawCategory || "").toLowerCase();
  if (!c) return null;
  if (c.includes("mention")) return "Mention";
  if (c.includes("election") || c.includes("politic")) return "Politics";
  // "commodit" added 2026-06-19: Kalshi tags KXBRENT/KXGOLD/KXNATGAS/etc. as "Commodities";
  // without it they fall to Other Non-sports. Mirrors R classify_market.R category_from_kalshi_category.
  if (c.includes("economic") || c.includes("financial") || c.includes("companie") || c.includes("commodit")) return "Finance";
  if (c.includes("entertainment")) return "Entertainment";
  if (c.includes("crypto")) return "Crypto";
  if (c.includes("weather") || c.includes("climate")) return "Weather";
  if (c.includes("sports")) return "Other Sports";
  return null;
}

function classifyWithFallback(ticker, isSports) {
  // Phase 24 lookup-first: same R-as-brain short-circuit. The R port already
  // applied the volume-gate Kalshi fallback, so the leaderboard's grp/cat is
  // the final answer.
  const fromR = classByReportTicker.get(ticker);
  if (fromR) return fromR;
  const cl = classifyTreemapTicker(ticker, isSports);
  if (cl.cat === "Parlay") return cl;
  if (cl.cat === "Other Sports") return cl;
  if (cl.cat !== "Other Sports" && cl.cat !== "Other Non-sports") return cl;
  const fallbackCat = categoryFromKalshiCategory(kalshiCategoryByReportTicker.get(ticker));
  const belowFallbackSize = (allTimeContractsMap.get(ticker) || 0) < FALLBACK_THRESHOLD ||
    (allTimeNotionalMap.get(ticker) || 0) < FALLBACK_NOTIONAL_THRESHOLD;
  if (fallbackCat && belowFallbackSize) {
    const grp = fallbackCat === "Other Sports" ? "Sports" : "Non-sports";
    return {grp, cat: fallbackCat, wideCat: normalizeTreemapCategory(fallbackCat), mtype: ticker};
  }
  if (belowFallbackSize) {
    const grp = isSports === "TRUE" ? "Sports" : "Non-sports";
    const cat = grp === "Sports" ? "Other Sports" : "Other Non-sports";
    return {grp, cat, wideCat: normalizeTreemapCategory(cat), mtype: ticker};
  }
  return cl;
}

const tmTrackedMeta = topDailyCols.map(report_ticker => {
  const meta = leaderboard.find(l => l.report_ticker === report_ticker) || {};
  return {
    report_ticker,
    fees: +meta.fees || 0,
    contracts: +meta.contracts || 0,
    is_sports: meta.is_sports ?? "FALSE",
    ...classifyWithFallback(report_ticker, meta.is_sports ?? "FALSE")
  };
});

const tmSelectedCategory = Mutable(null);
const tmHoveredCategory = Mutable(null);
const tmPinnedCategories = Mutable([]);

function setSelectedCategory(category) {
  if (!category || tmSelectedCategory.value === category) {
    tmSelectedCategory.value = null;
    tmPinnedCategories.value = [];
    return;
  }
  tmSelectedCategory.value = category;
  tmPinnedCategories.value = [category];
}

function togglePinnedCategory(category) {
  const existing = tmPinnedCategories.value || [];
  tmPinnedCategories.value = existing.includes(category)
    ? existing.filter(d => d !== category)
    : [...existing.filter(Boolean), category].slice(-3);
}

function clearPinnedCategories() {
  tmSelectedCategory.value = null;
  tmPinnedCategories.value = [];
}

```

## All-time leaderboard

<p class="section-intro">The quickest read on which markets dominate by volume or fees in the window you pick — the starting point before you drill into the map below.</p>

<div class="control-strip">

```js
// "notional" dropped — for a flow-style metric prefer taker-side volume,
// which has its own page. Sorting categories by gross notional is rarely
// the right comparison since it conflates volume with price level.
const metric = view(hashInput("metric", Inputs.radio(["contracts", "fees"], {
  label: "Metric",
  value: hashGet("metric", "contracts"),
  format: m => m === "contracts" ? "Volume" : "Fees"
})));
const showSports = view(hashInput("sports", Inputs.radio(["All", "Sports only", "Non-sports only"], {
  label: "Filter",
  value: hashGet("sports", "All")
})));
```

</div>

```js
// Date brush replaces the old From/To text inputs. Default Jan 1 2025 → latest.
// Mutable + brush in same cell so callback captures the wrapper (see notes
// in parlay.md / categories.md treemap brush).
const lbMinDate = d3.min(topDaily, d => d.date);
const lbMaxDate = d3.max(topDaily, d => d.date);
const lbDateSel = Mutable([
  new Date(Math.max(+new Date("2025-01-01"), +lbMinDate)),
  lbMaxDate
]);
const lbSparkData = topDaily.map(d => ({
  date: d.date,
  value: Object.keys(d).filter(k => k !== "date").reduce((a, k) => a + (+d[k] || 0), 0)
}));
display(renderDateBrush({
  data: lbSparkData,
  dateAccessor: d => d.date,
  valueAccessor: d => d.value,
  initialRange: [
    new Date(Math.max(+new Date("2025-01-01"), +lbMinDate)),
    lbMaxDate
  ],
  onSelect: r => { lbDateSel.value = r; },
  color: "var(--accent-kalshi)",
  width
}));
```

```js
const catCols = Object.keys(topDaily[0]).filter(k => k !== "date");

const [cutoff, cutoffTo] = lbDateSel;
// "All time" path uses the full leaderboard (every ticker, not just the
// top 15 in topDaily). Detect that the brush covers the full data span.
const isAllTime = +cutoff <= +lbMinDate && +cutoffTo >= +lbMaxDate;

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
  x: {label: metric === "contracts" ? "Volume (contracts)" : "Fees ($)", grid: true},
  y: {label: null},
  marks: [
    Plot.barX(filtered, {
      x: metric,
      y: "report_ticker",
      fill: d => d.is_sports === "TRUE" ? "#1a9641" : "#00C2A8",
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.report_ticker}\n${metric === "contracts" ? fmtCount(d[metric]) + " contracts" : "$" + fmtCount(d[metric])}\nSports: ${d.is_sports}`
    }),
    Plot.ruleX([0])
  ]
})
```

<span style="color:#1a9641">Sports</span> &nbsp; <span style="color:#00C2A8">Non-sports</span>

<div class="chart-note"><strong>Coverage note:</strong> date-filtered views cover the tracked top categories from the daily dataset; the full all-time leaderboard uses the broader summary table.</div>



## Volume map

<p class="section-intro">Start here. The treemap is the fastest read on which categories matter most in the window — click any tile to zoom into the biggest markets inside it.</p>

<div class="control-strip">

```js
const tmMetric = view(Inputs.radio(["Volume", "Fees"], {value: "Volume", label: "Metric"}));
```

</div>

```js
// Mutable + brush in the same cell so the brush callback closes over the
// Mutable wrapper. Observable Framework yields the unwrapped value (not the
// wrapper) to OTHER cells, so a setter defined in a different cell would
// receive the array and `.value = X` would no-op.
const tmDailyDates = topDaily.map(d => d.date).filter(Boolean);
const tmMinDate = d3.min(tmDailyDates);
const tmMaxDate = d3.max(tmDailyDates);
const tmDateSel = Mutable([
  new Date(Math.max(+new Date("2025-01-01"), +tmMinDate)),
  tmMaxDate
]);
const tmSparkData = topDaily.map(d => ({
  date: d.date,
  value: topDailyCols.reduce((a, c) => a + (+d[c] || 0), 0)
}));
display(renderDateBrush({
  data: tmSparkData,
  dateAccessor: d => d.date,
  valueAccessor: d => d.value,
  initialRange: [
    new Date(Math.max(+new Date("2025-01-01"), +tmMinDate)),
    tmMaxDate
  ],
  onSelect: r => { tmDateSel.value = r; },
  color: "var(--accent-kalshi)",
  width
}));
```

```js
const tmData = (() => {
  const [s, e] = tmDateSel;
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
    d => classifyWithFallback(d.report_ticker, d.is_sports).cat
  ),
  ([category, value]) => ({category, value})
).sort((a, b) => b.value - a.value);

const tmActiveCategory = tmCategoryTotals.some(d => d.category === tmSelectedCategory)
  ? tmSelectedCategory
  : null;

const displayTreemapCategory = cat => cat === "NBA" ? "Pro basketball" : cat;

const tmActiveGroup = tmActiveCategory
  ? tmTrackedMeta.find(d => d.cat === tmActiveCategory)?.grp
  : null;

const tmActiveReportTickers = new Set(
  tmData
    .filter(d => classifyWithFallback(d.report_ticker, d.is_sports).cat === tmActiveCategory)
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

function parseMarketDateFromKey(marketKey) {
  const match = String(marketKey || "").match(/-(\d{2})([A-Z]{3})(\d{2})/);
  if (!match) return null;
  const yy = 2000 + (+match[1] || 0);
  const month = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  }[match[2]];
  if (month == null) return null;
  const day = +match[3] || 1;
  return new Date(Date.UTC(yy, month, day));
}

// Drop markets whose market_key date falls outside the brushed range. Markets
// with no parseable date (season futures like KXNBA-25-LAL) are kept — they
// could be active across many days and we can't tell from the key alone, so
// the permissive behavior is safer. Without this filter, drill-down ratios
// (e.g. NFL games regular/playoff) come from all-time data and never change
// as the user moves the brush.
function filterMarketsByPeriod(rawMarkets, range) {
  if (!range) return rawMarkets;
  const [start, end] = range;
  return rawMarkets.filter(d => {
    const mdt = parseMarketDateFromKey(d.market_key);
    if (!mdt) return true;
    return mdt >= start && mdt <= end;
  });
}

function nbaGamePhaseFromKey(marketKey) {
  const dt = parseMarketDateFromKey(marketKey);
  if (!dt) return "Regular season";
  const playoffCutoff = Date.UTC(dt.getUTCFullYear(), 3, 15);
  return dt.getTime() >= playoffCutoff ? "Playoffs" : "Regular season";
}

function nflGamePhaseFromKey(marketKey) {
  const dt = parseMarketDateFromKey(marketKey);
  if (!dt) return "Regular season";
  const month = dt.getUTCMonth();
  const day = dt.getUTCDate();
  return (month === 1 || (month === 0 && day >= 10)) ? "Playoffs" : "Regular season";
}

function seasonPhaseLabel(phase, marketType) {
  const suffix = {
    Games: "games",
    Spreads: "spreads",
    Totals: "totals"
  }[marketType] || "markets";
  return `${phase} ${suffix}`;
}

const TENNIS_SLAM_WINDOWS_BY_YEAR = {
  2025: {
    "Australian Open": [Date.UTC(2025, 0, 5), Date.UTC(2025, 0, 26)],
    "French Open": [Date.UTC(2025, 4, 18), Date.UTC(2025, 5, 8)],
    "Wimbledon": [Date.UTC(2025, 5, 23), Date.UTC(2025, 6, 13)],
    "US Open": [Date.UTC(2025, 7, 17), Date.UTC(2025, 8, 7)]
  },
  2026: {
    "Australian Open": [Date.UTC(2026, 0, 11), Date.UTC(2026, 1, 1)],
    "French Open": [Date.UTC(2026, 4, 17), Date.UTC(2026, 5, 7)],
    "Wimbledon": [Date.UTC(2026, 5, 22), Date.UTC(2026, 6, 12)],
    "US Open": [Date.UTC(2026, 7, 23), Date.UTC(2026, 8, 13)]
  }
};

function tennisSlamFromDate(dt) {
  if (!dt) return null;
  const windows = TENNIS_SLAM_WINDOWS_BY_YEAR[dt.getUTCFullYear()];
  if (!windows) return null;
  for (const [slam, [startUtc, endUtc]] of Object.entries(windows)) {
    if (dt.getTime() >= startUtc && dt.getTime() <= endUtc) {
      return slam;
    }
  }
  return null;
}

function isTennisSlamEvent(event) {
  return event === "Australian Open" || event === "French Open" || event === "Wimbledon" || event === "US Open";
}

function tennisPhaseFromMarketKey(marketKey) {
  const key = String(marketKey || "");
  if (/^(KXATPGRANDSLAM|KXWTAGRANDSLAM|KXATPGRANDSLAMFIELD)/.test(key)) {
    return "Grand slam futures";
  }
  if (/^(KXUSOPEN|KXUSO|KXUSOMENSINGLES|KXUSOWOMENSINGLES|KXWIMBLEDON|KXAUSTRALIAN|KXFOMENSINGLES|KXFOWOMENSINGLES|KXWMENSINGLES|KXWWOMENSINGLES|KXWMEN|KXWWOMEN|KXAOMEN|KXAOWOMEN|KXTENNISEX|KXSIXKINGSSLAM)/.test(key)) {
    return "Grand slams";
  }
  const dt = parseMarketDateFromKey(key);
  if (!dt) return "ATP/WTA tour";
  return tennisSlamFromDate(dt) ? "Grand slams" : "ATP/WTA tour";
}

function tennisEventFromMarketKey(marketKey, sourceTicker) {
  const key = String(marketKey || "");
  const src = String(sourceTicker || "");
  if (/^KXATPMATCH|^KXWTAMATCH/.test(src)) {
    const dt = parseMarketDateFromKey(key);
    const slam = tennisSlamFromDate(dt);
    if (slam) return slam;
    return "ATP/WTA tour";
  }
  if (/^KXUSOPEN|^KXUSO/.test(src)) return "US Open";
  if (/^KXWIMBLEDON|^KXWMENSINGLES|^KXWWOMENSINGLES|^KXWMEN|^KXWWOMEN/.test(src)) return "Wimbledon";
  if (/^KXAUSTRALIAN|^KXAOMEN|^KXAOWOMEN/.test(src)) return "Australian Open";
  if (/^KXFOMENSINGLES|^KXFOWOMENSINGLES|^KXFOMEN|^KXFOWOMEN/.test(src)) return "French Open";
  if (/^KXATPGRANDSLAM|^KXWTAGRANDSLAM|^KXATPGRANDSLAMFIELD/.test(src)) return "Grand slam futures";
  return "ATP/WTA tour";
}

function tennisGenderFromTicker(sourceTicker, marketKey) {
  const src = String(sourceTicker || "");
  const key = String(marketKey || "");
  if (/WTA|WOMEN|WWOMEN|FOWOMEN|AOWOMEN/.test(src) || /WOMEN/.test(key)) return "Women";
  if (/ATP|MEN|WMEN|FOMEN|AOMEN/.test(src) || /MEN/.test(key)) return "Men";
  return "Open";
}

function tennisTourBucketFromTicker(sourceTicker) {
  const src = String(sourceTicker || "");
  if (/CHALLENGER/.test(src)) return "Challengers";
  if (/^KXWTA/.test(src)) return "WTA main tour";
  if (/^KXATP/.test(src)) return "ATP main tour";
  return "Other tennis";
}

const TENNIS_DAILY_SPLIT_TICKERS = new Set([
  "KXATPMATCH",
  "KXWTAMATCH",
  "KXATPCHALLENGERMATCH",
  "KXWTACHALLENGERMATCH",
  "KXATPSETWINNER",
  "KXWTASETWINNER",
  "KXATPDOUBLES",
  "KXATPEXACTMATCH",
  "KXATPTOTALSETS",
  "KXATPGSPREAD",
  "KXATPGAMETOTAL"
]);

function reportTickerLabel(ticker) {
  const clean = String(ticker || "").replace(/^KX/, "");
  const known = {
    KXNBAGAME: "NBA games",
    KXNBASPREAD: "Spreads",
    KXNBATOTAL: "Totals",
    KXNBA: "Futures",
    KXNBASERIES: "Playoff series",
    KXNBAMENTION: "NBA mentions",
    KXNBAPTS: "Player points",
    KXNBAEAST: "Eastern Conference",
    KXNBAMVP: "MVP",
    KXNBAWEST: "Western Conference",
    KXNBACUP: "NBA Cup",
    KXNBAFINALSMVP: "Finals MVP",
    KXNFLGAME: "NFL games",
    KXNFLSPREAD: "Spreads",
    KXNFLTOTAL: "Totals",
    KXSB: "Super Bowl",
    KXNFLANYTD: "Anytime TD",
    KXNFLNFCCHAMP: "NFC champion",
    KXNFLAFCCHAMP: "AFC champion",
    KXNFLPREPACKSGP: "Same-game parlays",
    KXNFLSBMVP: "Super Bowl MVP",
    KXNFLFIRSTTD: "First TD",
    KXNCAAMBGAME: "Games",
    KXNCAAMBSPREAD: "Spreads",
    KXNCAAMBTOTAL: "Totals",
    KXMARMAD: "March Madness",
    KXNCAAWBGAME: "Women's games",
    KXWMARMAD: "Women's March Madness",
    KXMARMADROUND: "March Madness rounds",
    KXNCAAFGAME: "Games",
    KXNCAAFSPREAD: "Spreads",
    KXNCAAFTOTAL: "Totals",
    KXNCAAF: "Futures",
    KXNCAAFPLAYOFF: "Playoff",
    KXNCAAFCS: "FCS futures",
    KXNCAAFCSGAME: "FCS games",
    KXMLBGAME: "Games",
    KXMLBSPREAD: "Spreads",
    KXMLBTOTAL: "Totals",
    KXMLB: "Futures",
    KXMLBSERIES: "Series",
    KXMLBSTGAME: "Season standings",
    KXMLBWORLD: "World Series",
    KXNHLGAME: "Games",
    KXNHLTOTAL: "Totals",
    KXNHLSPREAD: "Spreads",
    KXNHL: "Futures",
    KXNHLSERIES: "Series",
    KXNHLGOAL: "Goal props",
    KXNHLFIRSTGOAL: "First goal",
    KXNHLPLAYOFF: "Playoff",
    KXPGATOUR: "Tournaments",
    KXPGAR1LEAD: "Round 1 leader",
    KXPGA: "Golf futures",
    KXPGATOP20: "Top 20",
    KXPGARYDERMATCH: "Ryder Cup matches",
    KXPGAR2LEAD: "Round 2 leader",
    KXPGATOP10: "Top 10",
    KXPGATOP5: "Top 5",
    KXATPMATCH: "ATP/WTA tour",
    KXATPCHALLENGERMATCH: "ATP/WTA tour",
    KXWTAMATCH: "ATP/WTA tour",
    KXWTACHALLENGERMATCH: "ATP/WTA tour",
    KXATPSETWINNER: "ATP/WTA tour",
    KXATPDOUBLES: "ATP/WTA tour",
    KXATPEXACTMATCH: "ATP/WTA tour",
    KXATPTOTALSETS: "ATP/WTA tour",
    KXATPFINALS: "ATP/WTA tour",
    KXATPIT: "ATP/WTA tour",
    KXWTAIT: "ATP/WTA tour",
    KXATPMIA: "ATP/WTA tour",
    KXWTAFINALS: "ATP/WTA tour",
    KXWTAMIA: "ATP/WTA tour",
    KXATPGSPREAD: "ATP/WTA tour",
    KXATPGAMETOTAL: "ATP/WTA tour",
    KXATPGRANDSLAM: "Grand slams",
    KXWTAGRANDSLAM: "Grand slams",
    KXATPGRANDSLAMFIELD: "Grand slams",
    KXDAVISCUP: "Other tennis",
    KXUNITEDCUP: "Other tennis",
    KXUFCFIGHT: "Fights",
    KXBOXING: "Boxing",
    KXUFCMOV: "UFC method",
    KXBOXINGMOV: "Boxing method",
    KXUFCDISTANCE: "UFC distance",
    KXBOXINGVICROUND: "Boxing round",
    KXUFCVICROUND: "UFC round",
    KXBTCD: "Daily BTC",
    KXBTC15M: "15-minute BTC",
    KXBTC: "BTC",
    KXETHD: "Daily ETH",
    KXETH15M: "15-minute ETH",
    KXETH: "ETH",
    KXSOL15M: "15-minute SOL",
    KXBTCMAXY: "BTC yearly high",
    KXBTCMINY: "BTC yearly low",
    KXBTCY: "BTC year-end",
    KXETHMAXY: "ETH yearly high",
    KXETHY: "ETH year-end",
    KXEPLGAME: "EPL games",
    KXUCLGAME: "Champions League games",
    KXLALIGAGAME: "La Liga games",
    KXIPLGAME: "IPL games",
    KXSERIEAGAME: "Serie A games",
    KXT20MATCH: "T20 matches",
    KXBUNDESLIGAGAME: "Bundesliga games",
    KXEUROLEAGUEGAME: "EuroLeague games",
    KXEPLTOTAL: "EPL totals",
    KXUCLTOTAL: "Champions League totals",
    KXUCL: "Champions League futures",
    KXFEDDECISION: "Fed decisions",
    KXFEDCHAIRNOM: "Fed chair",
    KXINXU: "Inflation",
    KXFEDMENTION: "Fed mentions",
    KXFED: "Fed futures",
    KXFEDCOMBO: "Fed combos",
    KXFEDEMPLOYEES: "Fed employees",
    KXFEDMEET: "Fed meetings",
    KXFEDERALCHARGE: "Federal charges",
    KXFEDGOVNOM: "Fed governor",
    ECMOV: "Economic moves",
    POPVOTEMOV: "Popular vote margin",
    POPVOTEMOVSMALL: "Popular vote margin",
    POPVOTEMOVSMALLER: "Popular vote margin",
    POPVOTE: "Popular vote",
    KXTRUMPMENTION: "Trump mentions",
    KXTRUMPMENTIONB: "Trump mentions",
    KXTRUMPSAY: "Trump phrases",
    KXMAYORNYCPARTY: "NYC mayor party",
    KXMAYORNYCNOMD: "NYC Democratic mayor nominee",
    KXGOVSHUTLENGTH: "Shutdown length",
    KXGOVSHUT: "Shutdown",
    KXGOVTSHUTDOWN: "Shutdown",
    KXGOVCA: "California governor",
    KXMVESPORTSMULTIGAMEEXTENDED: "Sports multi-game parlays",
    KXMVECROSSCATEGORY: "Cross-category parlays",
    KXMVENFLSINGLEGAME: "NFL same-game parlays",
    KXMVENFLMULTIGAMEEXTENDED: "NFL multi-game parlays",
    KXMVENBASINGLEGAME: "NBA same-game parlays",
    KXMVECBCHAMPIONSHIP: "College basketball championship parlays",
    PRES: "Presidency"
  };
  const grandSlam = String(ticker || "").match(/^(KXATPGRANDSLAM|KXWTAGRANDSLAM|KXATPGRANDSLAMFIELD|KXUSOPEN|KXUSO|KXUSOMENSINGLES|KXUSOWOMENSINGLES|KXWIMBLEDON|KXAUSTRALIAN|KXFOMENSINGLES|KXFOWOMENSINGLES|KXWMENSINGLES|KXWWOMENSINGLES|KXWMEN|KXWWOMEN|KXIWMEN|KXIWWOMEN|KXAOMEN|KXAOWOMEN|KXTENNISEX|KXSIXKINGSSLAM)/);
  if (grandSlam) return "Grand slams";
  const tourEvent = String(ticker || "").match(/^(KXATPMATCH|KXATPCHALLENGERMATCH|KXWTAMATCH|KXWTACHALLENGERMATCH|KXATPSETWINNER|KXATPDOUBLES|KXATPEXACTMATCH|KXATPTOTALSETS|KXATPFINALS|KXATPIT|KXWTAIT|KXATPMIA|KXWTAFINALS|KXWTAMIA|KXATPGSPREAD|KXATPGAMETOTAL)/);
  if (tourEvent) return "ATP/WTA tour";
  if (known[ticker]) return known[ticker];
  const cityNames = {
    NY: "New York", NYC: "New York", LAX: "Los Angeles", CHI: "Chicago", MIA: "Miami",
    AUS: "Austin", DEN: "Denver", PHIL: "Philadelphia", DC: "Washington DC",
    SFO: "San Francisco", HOU: "Houston", BOS: "Boston", ATL: "Atlanta"
  };
  const weather = String(ticker || "").match(/^KX(HIGH|LOW)T?([A-Z]+)$/);
  if (weather) return `${cityNames[weather[2]] || weather[2]} ${weather[1] === "HIGH" ? "highs" : "lows"}`;
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
      .filter(d => classifyWithFallback(d.report_ticker, d.is_sports).cat === tmActiveCategory)
      .map(d => ({
        report_ticker: d.report_ticker,
        is_sports: d.is_sports,
        value: +d.value || 0,
        label: reportTickerLabel(d.report_ticker),
        mtype: classifyWithFallback(d.report_ticker, d.is_sports).mtype
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
  if (tmActiveCategory) {
    display(html`<a class="ui-button zoom-reset-link" href="${location.pathname}">Back to all categories from ${displayTreemapCategory(tmActiveCategory)}</a>`);
  }
```

```js
{
  const W = width;
  const H = Math.round(W * 0.58);

  // -- Classify each ticker into group / category / market-type -------------
  function classify(ticker, isSports) {
    return classifyWithFallback(ticker, isSports);
  }

  // -- Build nested totals ---------------------------------------------------
  const isZoomed = !!tmActiveCategory && tmActiveTickerRows.length > 0;
  // Windowed leg-kind split for parlays: sum parlay_corr_by_ticker over the SAME
  // brushed window as tmData, per report_ticker -> {correlated, independent, pending}.
  // Each parlay series' treemap volume is then divided by these shares (leg-truth)
  // instead of bucketed by its single ticker-name mtype (Same-game/Multi-game).
  const parlayKindShare = (() => {
    const [s, e] = tmDateSel;
    const m = new Map();
    for (const r of parlayCorrByTicker) {
      if (!(r.date >= s && r.date <= e)) continue;
      const c = +r.contracts || 0;
      if (!c) continue;
      let o = m.get(r.report_ticker);
      if (!o) { o = {correlated: 0, independent: 0, pending: 0, total: 0}; m.set(r.report_ticker, o); }
      if (r.kind === "correlated") o.correlated += c;
      else if (r.kind === "independent") o.independent += c;
      else o.pending += c;
      o.total += c;
    }
    return m;
  })();
  const nest = {};
  for (const row of tmData) {
    const v = row.value || 0;
    if (!v) continue;
    const {grp, cat, mtype} = classify(row.report_ticker, row.is_sports);
    if (!nest[grp])      nest[grp] = {};
    if (!nest[grp][cat]) nest[grp][cat] = {};
    if (cat === "Parlay") {
      // Split this series' windowed volume across leg-kind tiles by its in-window
      // shares; preserves the series total (shares sum to 1). No leg data for the
      // window -> all volume falls to "Pending" (honest + lossless, never dropped).
      const k = parlayKindShare.get(row.report_ticker);
      const addKind = (label, amt) => {
        if (amt <= 0) return;
        if (!nest[grp][cat][label]) nest[grp][cat][label] = 0;
        nest[grp][cat][label] += amt;
      };
      if (k && k.total > 0) {
        addKind("Correlated",  v * (k.correlated  / k.total));
        addKind("Independent", v * (k.independent / k.total));
        addKind("Pending",     v * (k.pending     / k.total));
      } else {
        addKind("Pending", v);
      }
      continue;
    }
    if (!nest[grp][cat][mtype]) nest[grp][cat][mtype] = 0;
    nest[grp][cat][mtype] += v;
  }

  const activeTickerTotal = d3.sum(tmActiveTickerRows, d => d.value || 0);
  const allTimeActiveCategoryRows = tmActiveCategory
    ? leaderboard
        .filter(d => classifyWithFallback(d.report_ticker, d.is_sports).cat === tmActiveCategory)
        .filter(d => (+d.contracts || 0) > 0)
    : [];
  const allTimeNamedTickerRows = tmActiveCategory && allTimeActiveCategoryRows.length
    ? allTimeActiveCategoryRows
        .sort((a, b) => (+b.contracts || 0) - (+a.contracts || 0))
        .filter((d, i) => {
          const total = d3.sum(allTimeActiveCategoryRows, r => +r.contracts || 0);
          const config = tmActiveCategory === "Other Sports"
            ? {keepRows: 14, share: 0.03}
            : tmActiveCategory === "Other Non-sports"
              ? {keepRows: 18, share: 0.02}
              : {keepRows: 26, share: 0.015};
          return i < config.keepRows || (+d.contracts || 0) >= total * config.share;
        })
    : [];
  const allTimeNamedTickerSet = new Set(allTimeNamedTickerRows.map(d => d.report_ticker));
  const allTimeTailCount = allTimeActiveCategoryRows.filter(d => !allTimeNamedTickerSet.has(d.report_ticker)).length;

  const tailCollapseConfig = tmActiveCategory === "Other Sports"
    ? {minRows: 12, keepRows: 14, share: 0.03}
    : tmActiveCategory === "Other Non-sports"
      ? {minRows: 12, keepRows: 18, share: 0.02}
      : {minRows: 30, keepRows: 26, share: 0.015};
  const collapseZoomTail = isZoomed && tmActiveTickerRows.length > tailCollapseConfig.minRows;
  const namedTickerRows = collapseZoomTail
    ? tmActiveTickerRows.filter((d, i) => i < tailCollapseConfig.keepRows || (d.value || 0) >= activeTickerTotal * tailCollapseConfig.share)
    : tmActiveTickerRows;
  const namedTickerSet = new Set(namedTickerRows.map(d => d.report_ticker));
  const tailTickerRows = collapseZoomTail
    ? tmActiveTickerRows.filter(d => !namedTickerSet.has(d.report_ticker))
    : [];
  const zoomTickerRows = collapseZoomTail && tailTickerRows.length
    ? [
        ...namedTickerRows,
        {
          report_ticker: `__${String(tmActiveCategory).replace(/[^A-Z0-9]+/gi, "_").toUpperCase()}_TAIL__`,
          is_sports: tmActiveGroup === "Sports" ? "TRUE" : "FALSE",
          value: d3.sum(tailTickerRows, d => d.value || 0),
          label: "Other",
          mtype: "Other",
          isCombinedTail: true,
          tailCount: tailTickerRows.length,
          allTimeTailCount
        }
      ].filter(d => (d.value || 0) > 0)
    : namedTickerRows;

  const tmActiveRange = tmDateSel;

  const displayZoomTickerRows = isZoomed && tmActiveCategory === "Tennis"
    ? zoomTickerRows.flatMap(tickerRow => {
        if (tickerRow.report_ticker !== "KXATPMATCH" && tickerRow.report_ticker !== "KXWTAMATCH") return [tickerRow];
        const rawMarkets = filterMarketsByPeriod(
          tmActiveMarketRowsByTicker.get(tickerRow.report_ticker) || [],
          tmActiveRange
        );
        const phaseRows = Array.from(
          d3.rollup(
            rawMarkets,
            rows => d3.sum(rows, d => d.rawValue || 0),
            d => tennisPhaseFromMarketKey(d.market_key)
          ),
          ([phase, value]) => ({
            ...tickerRow,
            report_ticker: `${tickerRow.report_ticker}__${phase.replace(/\W+/g, "_").toUpperCase()}`,
            source_report_tickers: [tickerRow.report_ticker],
            phase,
            label: phase,
            value,
            mtype: phase
          })
        ).sort((a, b) => b.value - a.value);
        return phaseRows.length ? phaseRows : [tickerRow];
      })
    : zoomTickerRows;

  const tennisPhaseRows = tmActiveCategory === "Tennis"
    ? Array.from(
        d3.rollup(
          displayZoomTickerRows.filter(d => d.phase),
          rows => {
            const first = rows[0];
            return {
              ...first,
              report_ticker: `TENNIS_${first.phase.replace(/\W+/g, "_").toUpperCase()}`,
              source_report_tickers: Array.from(new Set(rows.flatMap(r => r.source_report_tickers || [r.report_ticker]))),
              value: d3.sum(rows, d => d.value || 0),
              label: first.phase,
              mtype: first.phase
            };
          },
          d => d.phase
        ).values()
      )
    : [];

  const displayZoomRowsFinal = tmActiveCategory === "Tennis"
    ? [
        ...displayZoomTickerRows.filter(d => !d.phase),
        ...tennisPhaseRows.sort((a, b) => b.value - a.value)
      ]
    : displayZoomTickerRows;

  const phaseSplitNode = (tickerRow, rawMarkets, phaseFn, marketType) => {
    const phaseRows = Array.from(
      d3.rollup(
        rawMarkets,
        rows => d3.sum(rows, d => d.rawValue || 0),
        d => phaseFn(d.market_key)
      ),
      ([phase, value]) => ({phase, value})
    ).filter(d => d.value > 0);
    const rawTotal = d3.sum(phaseRows, d => d.value || 0);
    const scale = rawTotal > 0 && tickerRow.value > 0 ? tickerRow.value / rawTotal : 1;
    const children = phaseRows
      .sort((a, b) => b.value - a.value)
      .map(d => ({
        name: seasonPhaseLabel(d.phase, marketType),
        value: d.value * scale,
        mtype: marketType,
        report_ticker: tickerRow.report_ticker
      }));
    return {
      name: tickerRow.label,
      report_ticker: tickerRow.report_ticker,
      children: children.length ? children : [{
        name: `All ${String(tickerRow.label || marketType).toLowerCase()}`,
        value: tickerRow.value,
        mtype: marketType,
        report_ticker: tickerRow.report_ticker,
        isOther: true
      }]
    };
  };

  const marketChildren = tmActiveCategory === "Tennis"
    ? (() => {
        const eventBuckets = new Map();
        const addTennisValue = (event, gender, value, sourceTicker) => {
          if (!value || value <= 0) return;
          const eventName = event || "Other tennis";
          const genderName = gender || "Open";
          if (!eventBuckets.has(eventName)) eventBuckets.set(eventName, new Map());
          const genderMap = eventBuckets.get(eventName);
          genderMap.set(genderName, (genderMap.get(genderName) || 0) + value);
        };

        for (const tickerRow of zoomTickerRows.filter(d => !d.isCombinedTail)) {
          const sourceTicker = tickerRow.source_report_ticker || tickerRow.report_ticker;
          if (TENNIS_DAILY_SPLIT_TICKERS.has(sourceTicker)) {
            const tmActiveRange = tmDateSel;
            const dailyRows = tmActiveRange
              ? topDaily.filter(d => d.date >= tmActiveRange[0] && d.date <= tmActiveRange[1])
              : topDaily;
            const tourBucket = tennisTourBucketFromTicker(sourceTicker);
            const dailyTotals = Array.from(
              d3.rollup(
                dailyRows,
                rows => d3.sum(rows, d => +d[sourceTicker] || 0),
                d => tennisSlamFromDate(d.date) || tourBucket
              ),
              ([event, value]) => ({event, value})
            ).filter(d => d.value > 0);
            const dailyTotal = d3.sum(dailyTotals, d => d.value || 0);
            const scale = dailyTotal > 0 ? (tickerRow.value || 0) / dailyTotal : 0;
            for (const row of dailyTotals) {
              addTennisValue(
                isTennisSlamEvent(row.event) ? "Grand slams" : row.event,
                isTennisSlamEvent(row.event) ? row.event : tennisGenderFromTicker(sourceTicker),
                row.value * scale,
                sourceTicker
              );
            }
            if (!dailyTotals.length) {
              addTennisValue(tourBucket, tennisGenderFromTicker(sourceTicker), tickerRow.value || 0, sourceTicker);
            }
          } else if (/^KXATPCHALLENGERMATCH|^KXWTACHALLENGERMATCH|^KXATPSETWINNER|^KXATPDOUBLES|^KXATPEXACTMATCH|^KXATPTOTALSETS|^KXATPFINALS|^KXATPIT|^KXWTAIT|^KXATPMIA|^KXWTAFINALS|^KXWTAMAD|^KXWTAMIA|^KXATPGSPREAD|^KXATPGAMETOTAL|^KXATPMC|^KXATPIWO|^KXWTAIWO|^KXATPNEXTGEN|^KXATPAMT|^KXWTADDF|^KXATP1RANK|^KXATPMCO|^KXWTASETWINNER|^KXWTAATX|^KXWTAMOA|^KXWTASERENA|^KXATPMAD/.test(sourceTicker)) {
            addTennisValue(tennisTourBucketFromTicker(sourceTicker), tennisGenderFromTicker(sourceTicker), tickerRow.value || 0, sourceTicker);
          } else {
            const event = tennisEventFromMarketKey(null, sourceTicker);
            addTennisValue(
              isTennisSlamEvent(event) ? "Grand slams" : event,
              isTennisSlamEvent(event) ? event : tennisGenderFromTicker(sourceTicker),
              tickerRow.value || 0,
              sourceTicker
            );
          }
        }

        const eventNodes = Array.from(
          eventBuckets,
          ([event, genderMap]) => {
            const genderRows = Array.from(genderMap, ([gender, value]) => ({gender, value}))
              .filter(d => d.value > 0)
              .sort((a, b) => b.value - a.value);
            const total = d3.sum(genderRows, d => d.value || 0);
            const useGenderSplit = total >= 2.5e7 && genderRows.length > 1;
            const children = useGenderSplit
              ? genderRows.map(d => ({
                  name: d.gender,
                  value: d.value,
                  mtype: d.gender,
                  report_ticker: `TENNIS_${event.replace(/\W+/g, "_").toUpperCase()}_${d.gender.toUpperCase()}`
                }))
              : (() => {
                  const primary = genderRows[0];
                  return [{
                    name: primary?.gender || event,
                    value: total,
                    mtype: primary?.gender || "Open",
                    report_ticker: `TENNIS_${event.replace(/\W+/g, "_").toUpperCase()}_TOTAL`
                  }];
                })();
            return {
              name: event,
              report_ticker: `TENNIS_${event.replace(/\W+/g, "_").toUpperCase()}`,
              children
            };
          }
        ).sort((a, b) => d3.sum(b.children, d => d.value || 0) - d3.sum(a.children, d => d.value || 0));

        const otherRows = zoomTickerRows.filter(d => d.isCombinedTail).map(tickerRow => ({
          name: tickerRow.label,
          report_ticker: tickerRow.report_ticker,
          children: [{
            name: tickerRow.allTimeTailCount && tickerRow.allTimeTailCount > tickerRow.tailCount
              ? `${tickerRow.tailCount.toLocaleString()} active smaller tickers (${tickerRow.allTimeTailCount.toLocaleString()} all-time)`
              : `${tickerRow.tailCount.toLocaleString()} smaller tickers`,
            value: tickerRow.value,
            mtype: "Other",
            report_ticker: tickerRow.report_ticker,
            isOther: true
          }]
        }));
        return [...eventNodes, ...otherRows];
      })()
    : displayZoomRowsFinal.map(tickerRow => {
        if (tickerRow.isCombinedTail) {
          return {
            name: tickerRow.label,
            report_ticker: tickerRow.report_ticker,
            children: [{
              name: tickerRow.allTimeTailCount && tickerRow.allTimeTailCount > tickerRow.tailCount
                ? `${tickerRow.tailCount.toLocaleString()} active smaller tickers (${tickerRow.allTimeTailCount.toLocaleString()} all-time)`
                : `${tickerRow.tailCount.toLocaleString()} smaller tickers`,
              value: tickerRow.value,
              mtype: "Other",
              report_ticker: tickerRow.report_ticker,
              isOther: true
            }]
          };
        }
        const sourceTickers = tickerRow.source_report_tickers || [tickerRow.source_report_ticker || tickerRow.report_ticker];
        const rawMarkets = sourceTickers.flatMap(sourceTicker =>
          filterMarketsByPeriod(
            tmActiveMarketRowsByTicker.get(sourceTicker) || [],
            tmActiveRange
          ).filter(d =>
            tickerRow.phase ? tennisPhaseFromMarketKey(d.market_key) === tickerRow.phase : true
          )
        );
        const sourceTicker = sourceTickers[0];
        if (sourceTicker === "KXNBAGAME" || sourceTicker === "KXNBASPREAD" || sourceTicker === "KXNBATOTAL") {
          const marketType = sourceTicker === "KXNBAGAME" ? "Games" : sourceTicker === "KXNBASPREAD" ? "Spreads" : "Totals";
          return phaseSplitNode(tickerRow, rawMarkets, nbaGamePhaseFromKey, marketType);
        }
        if (sourceTicker === "KXNFLGAME" || sourceTicker === "KXNFLSPREAD" || sourceTicker === "KXNFLTOTAL") {
          const marketType = sourceTicker === "KXNFLGAME" ? "Games" : sourceTicker === "KXNFLSPREAD" ? "Spreads" : "Totals";
          return phaseSplitNode(tickerRow, rawMarkets, nflGamePhaseFromKey, marketType);
        }
        const rawTotal = d3.sum(rawMarkets, d => d.rawValue || 0);
        const topMarkets = rawMarkets.slice(0, Math.max(4, Math.min(10, Math.round(W / 90))));
        const marketScale = rawTotal > tickerRow.value && tickerRow.value > 0
          ? tickerRow.value / rawTotal
          : 1;
        const children = rawTotal > 0
          ? topMarkets.map(row => ({
              name: row.label,
              value: (row.rawValue || 0) * marketScale,
              mtype: tickerRow.mtype,
              market_key: row.market_key,
              report_ticker: row.report_ticker
            }))
          : [];
        const shown = d3.sum(children, d => d.value || 0);
        const remainder = Math.max(0, tickerRow.value - shown);
        if (remainder > 0 || !children.length) {
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

  // -- Treemap layout --------------------------------------------------------
  const root = d3.hierarchy(hierData)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([W, H])
    .paddingInner(d => d.depth === 0 ? 14 : d.depth === 1 ? 3 : 1)
    .paddingTop(d => d.depth === 1 ? 18 : 0)
    .tile(d3.treemapBinary)
    (root);

  // -- Color palette: warm (sports) vs cool (non-sports) --------------------
  // Sports: red ? orange ? amber ? olive ? teal-green ? brown spectrum
  // Non-sports: blues, purples, teals - clearly cool/opposite family
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
    "Racing":             "#A1887F",  // taupe
    "Esports":            "#BCAAA4",  // muted tan
    "Cricket":            "#FA8072",  // salmon
    "Other Sports":       "#8D6E63",  // warm tan
    "Crypto":             "#0D47A1",  // dark navy
    "Politics":           "#1A237E",  // very dark indigo
    "Finance":            "#1E88E5",  // bright medium blue
    "Weather":            "#4FC3F7",  // light sky blue
    "Entertainment":      "#0097A7",  // teal-blue
    "Mention":            "#546E7A",  // slate
    "Other Non-sports":   "#7986CB",  // medium indigo-blue
  };

  const getFill = cat => CAT_COLOR[cat] || "#888";
  const activeCategory = tmHoveredCategory || tmActiveCategory;
  const pinnedSet = new Set(tmPinnedCategories);
  const shortLabel = (text, max = 34) => {
    const s = String(text ?? "");
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
  };

  // -- SVG -------------------------------------------------------------------
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

  // -- Render leaf tiles (market-type level) ---------------------------------
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
    .style("cursor", isZoomed ? "zoom-out" : "pointer")
    .on("mouseenter.hover", (_, d) => { tmHoveredCategory.value = isZoomed ? null : d.parent.data.name; })
    .on("mouseleave.hover", () => { tmHoveredCategory.value = null; })
    .on("click", (_, d) => {
      if (isZoomed) setSelectedCategory(null);
      else setSelectedCategory(d.parent.data.name);
    });
  // Rich HTML tooltip on hover — replaces the native browser <title> tooltip
  // (kept as a fallback for screen readers / right-click info). Position is
  // pageX/pageY-driven; the tooltip is page-fixed and cleaned up when this
  // cell re-runs because it's appended to the same wrapper as the SVG.
  leafSel.append("title")
    .text(d => `${displayTreemapCategory(d.parent.parent.data.name)} - ${displayTreemapCategory(d.parent.data.name)} - ${d.data.name}\n${tmMetric === "Fees" ? "Fees: $" + fmtCount(d.value) : "Volume: " + fmtCount(d.value) + " contracts"}`);

  const tooltip = document.createElement("div");
  tooltip.className = "kd-treemap-tooltip";
  tooltip.style.opacity = "0";
  const rootTotal = root.value || 1;
  const metricLabel = tmMetric === "Fees" ? "Fees" : "Volume";
  const fmtTooltipBody = d => {
    const grp  = displayTreemapCategory(d.parent.parent.data.name);
    const cat  = displayTreemapCategory(d.parent.data.name);
    const leaf = d.data.name;
    const pct  = rootTotal ? (d.value / rootTotal * 100) : 0;
    const headline = `${cat}${leaf && leaf !== cat ? " — " + leaf : ""}`;
    return `
      <div class="kd-tt-title">${headline}</div>
      <div class="kd-tt-sub">${grp}</div>
      <div class="kd-tt-row"><span>${metricLabel}</span><span>${tmMetric === "Fees" ? "$" + fmtCount(d.value) : fmtCount(d.value) + " contracts"}</span></div>
      <div class="kd-tt-row"><span>Share of view</span><span>${pct.toFixed(2)}%</span></div>
    `;
  };
  leafSel
    .on("mouseenter.kdtt", function(event, d) {
      tooltip.innerHTML = fmtTooltipBody(d);
      tooltip.style.opacity = "1";
    })
    .on("mousemove.kdtt", function(event) {
      // pageX/pageY work whether the SVG is scrolled or transformed
      const x = event.pageX + 14;
      const y = event.pageY + 14;
      tooltip.style.left = x + "px";
      tooltip.style.top  = y + "px";
    })
    .on("mouseleave.kdtt", function() {
      tooltip.style.opacity = "0";
    });

  // -- Category labels + volume (depth 2) -----------------------------------
  const cats2 = root.descendants().filter(d => d.depth === 2);

  // Category labels - shifted toward top so market-type labels have room below
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
    .text(d => {
      const w = d.x1 - d.x0, h = d.y1 - d.y0;
      if (isZoomed && d.data.name === "Other" && w > 34 && h > 16) return "Other";
      return w > (isZoomed ? 58 : 40) && h > (isZoomed ? 26 : 18) ? displayTreemapCategory(d.data.name) : "";
    });

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
    .text(d => (d.x1-d.x0) > (isZoomed ? 88 : 60) && (d.y1-d.y0) > (isZoomed ? 46 : 36) ? (tmMetric === "Fees" ? `$${fmtCount(d.value)}` : `${fmtCount(d.value)}`) : "");

  // -- Market-type labels on large enough leaf tiles -------------------------
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

  // -- Group labels (Sports / Non-sports) ------------------------------------
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
    .text(d => displayTreemapCategory(d.data.name).toUpperCase());

  // category-hit USED to be a transparent overlay on top of the leaf rects
  // that captured hover + click and dispatched them to the category. It was
  // intercepting events meant for the leaf rects (tooltip mouseenter etc.)
  // so it's pointer-events: none now — equivalent hover/click are wired
  // directly on leafSel above via leaf.parent.data.name. The rect itself is
  // retained as a no-op stroke target for any future styling needs.
  svg.selectAll("rect.category-hit")
    .data(cats2)
    .join("rect")
    .attr("class", "category-hit")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", "transparent")
    .style("pointer-events", "none");

  // Mount the tooltip as a sibling of the SVG. Page-fixed positioning means
  // it can render outside the wrapper bounds; pointer-events:none keeps it
  // from blocking the rect hover.
  if (tmActiveCategory) {
    const wrapper = html`<div></div>`;
    const bar = html`<div class="zoom-toolbar"></div>`;
    bar.append(html`<span>Viewing ${displayTreemapCategory(tmActiveCategory)} markets. Click the map again to return to all categories.</span>`);
    wrapper.append(bar, svg.node(), tooltip);
    display(wrapper);
  } else {
    const wrapper = html`<div></div>`;
    wrapper.append(svg.node(), tooltip);
    display(wrapper);
  }
}
```

<div class="chart-note"><strong>Reading note:</strong> area represents category weight in the selected window. Click a category to zoom into pieces that add to 100% of that category. If the named tiles do not exhaust the category, the remainder is always shown as an explicit Other tile. Categories with many small report tickers combine the smallest tail into one Other tile for readability.</div>

```js
{
  if (!tmActiveCategory) {
    display(html`<div class="chart-note">No category is selected. Click a treemap tile to zoom in and open the focused comparison.</div>`);
  } else {
    const shell = html`<details class="focus-card compact-details"></details>`;
    shell.append(html`<summary>${displayTreemapCategory(tmActiveCategory)} focus controls</summary>`);
    const crumbs = html`<div class="breadcrumbs"></div>`;
    crumbs.append(html`<span class="crumb">Treemap</span>`);
    if (tmActiveGroup) crumbs.append(html`<span class="crumb">${tmActiveGroup}</span>`);
    crumbs.append(html`<span class="crumb is-active">${displayTreemapCategory(tmActiveCategory)}</span>`);
    shell.append(crumbs);

    const header = html`<div class="focus-header"></div>`;
    const copy = html`<div>
      <div class="focus-title">Zoomed into ${displayTreemapCategory(tmActiveCategory)}</div>
      <p class="focus-copy">The treemap is showing the largest available individual markets for this category. This category is also active in the focused comparison below.</p>
    </div>`;
    header.append(copy);
    shell.append(header);

    const row = html`<div class="chip-row"></div>`;
    for (const {category, value} of tmCategoryTotals) {
      const active = category === tmActiveCategory;
      const color = TM_CATEGORY_COLORS[category] || "#888";
      const btn = html`<button type="button" class="ui-chip ${active ? "is-active" : ""}" style="
        border-color:${color};
        background:${active ? color + "2e" : color + "14"};
        color:${active ? "var(--theme-foreground)" : "inherit"};
      ">${displayTreemapCategory(category)} | ${tmMetric === "Fees" ? "$" + fmtCount(value) : fmtCount(value)}</button>`;
      btn.addEventListener("click", () => { setSelectedCategory(category); });
      row.append(btn);
    }
    shell.append(row);
    display(shell);
  }
}
```
## Volume by category over time

<p class="section-intro">How Kalshi's category mix has shifted month to month. Pick a category in the treemap to break it out into its own line.</p>

```js
const sportsSplit = await FileAttachment("data/daily_sports_vs_nonsports.csv").csv({typed: true});
```

```js
// Map tickers to display groups - Football and Basketball split into pro/college subcategories
const wideMap = {
  // NFL (pro football) - dark warm
  KXNFLGAME: "NFL", KXNFLSPREAD: "NFL", KXNFLTOTAL: "NFL", KXSB: "NFL",
  // College football - lighter warm
  KXNCAAFGAME: "College football", KXNCAAFSPREAD: "College football", KXNCAAFTOTAL: "College football",
  // NBA (pro basketball) - dark blue
  KXNBAGAME: "NBA", KXNBASPREAD: "NBA", KXNBATOTAL: "NBA", KXNBA: "NBA",
  // College basketball - lighter blue (includes March Madness)
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
  KXFEDDECISION: "Finance", KXINXU: "Finance", ECMOV: "Finance", KXCITRINI: "Finance",
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

function wideCategoryForTicker(ticker) {
  if (String(ticker || "").toUpperCase().includes("MENTION")) return "Mention";
  return wideMap[ticker];
}

// Leg-based parlay split (correlated / independent / pending) for the Detailed view.
const parlayByType = await FileAttachment("data/parlay_volume_by_type_daily.csv").csv({typed: true});
const PARLAY_CLASS_TO_CAT = {
  "same-game (correlated)":      "Parlay (correlated)",
  "multi-game (independent)":    "Parlay (independent)",
  "unclassified (pending legs)": "Parlay (pending)"
};
// ISO day -> {Parlay (correlated/independent/pending), total} (summed over n_legs_bucket + sportmix).
const parlayTypeByDate = d3.rollup(
  parlayByType,
  rs => {
    const o = {"Parlay (correlated)": 0, "Parlay (independent)": 0, "Parlay (pending)": 0};
    for (const r of rs) o[PARLAY_CLASS_TO_CAT[r.parlay_class] || "Parlay (pending)"] += +r.contracts || 0;
    o.total = o["Parlay (correlated)"] + o["Parlay (independent)"] + o["Parlay (pending)"];
    return o;
  },
  r => (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date))
);

// Build wide-category daily totals
const wideDaily = topDaily.map(row => {
  const sp = sportsSplit.find(s => +s.date === +row.date) || {};
  const groups = {
    NFL: 0, "College football": 0,
    NBA: 0, "College basketball": 0,
    Baseball: 0, Hockey: 0, Golf: 0, Tennis: 0,
    Soccer: 0, "Combat sports": 0,
    Crypto: 0, Politics: 0, Finance: 0, Entertainment: 0, Mention: 0, Weather: 0
  };
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = wideCategoryForTicker(cat);
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const parlay       = +sp.contracts_parlay    || 0;
  const totSports    = +sp.contracts_sports    || 0;
  const totNonSports = +sp.contracts_nonsports || 0;
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Mention + groups.Weather;
  // Leg-based parlay split for this day, rescaled to the authoritative contracts_parlay total
  // so Detailed and General views stay the same height. Pre-2025-09 (no leg data): all -> pending.
  const dayKey = row.date.toISOString().slice(0, 10);
  const pt = parlayTypeByDate.get(dayKey);
  let pCorr = 0, pIndep = 0, pPend = 0;
  if (pt && pt.total > 0) {
    const k = parlay / pt.total;
    pCorr  = pt["Parlay (correlated)"]  * k;
    pIndep = pt["Parlay (independent)"] * k;
    pPend  = pt["Parlay (pending)"]     * k;
  } else {
    pPend = parlay;
  }
  return {
    date: row.date,
    ...groups,
    Parlay: parlay,
    "Parlay (correlated)":  pCorr,
    "Parlay (independent)": pIndep,
    "Parlay (pending)":     pPend,
    "Other sports":     Math.max(0, totSports    - knownSports),
    "Other non-sports": Math.max(0, totNonSports - knownNonSports)
  };
});

// Stacking order: non-sports bottom ? sports ? parlay top
// Football pair (warm): NFL dark, College football light
// Basketball pair (blue): NBA dark, College basketball light
const wideOrder = [
  "Other non-sports", "Weather", "Mention", "Entertainment", "Finance", "Politics", "Crypto",
  "Other sports", "Combat sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College football", "NFL",
  "College basketball", "NBA",
  "Parlay (correlated)", "Parlay (independent)", "Parlay (pending)"
];

// Color map - subcategory pairs share hue family
const wideColors = {
  "Other non-sports": "#e8eaf0", "Weather": "#b0bec5", "Entertainment": "#90a4ae",
  "Mention": "#78909c", "Finance": "#6b8cae", "Politics": "#455a64", "Crypto": "#263238",
  "Other sports": "#c8e6c9",
  "Combat sports": "#6d4c41", "Soccer": "#827717", "Hockey": "#006064",
  "Tennis": "#4a148c", "Golf": "#33691e", "Baseball": "#880e4f",
  // Football family - warm orange pair
  "College football": "#ffcc80", "NFL": "#bf360c",
  // Basketball family - blue pair
  "College basketball": "#90caf9", "NBA": "#0d47a1",
  // Parlay family - top, prominent (leg-based: correlated / independent / pending)
  "Parlay (correlated)": "#7b1fa2", "Parlay (independent)": "#b07aa1", "Parlay (pending)": "#e8d0e0"
};
```

```js
// Date range - default to 2025 onwards (earlier has near-zero sports volume).
// The Mutable AND the renderDateBrush() call live in the SAME cell so the
// onSelect callback closes over the actual Mutable wrapper. The previous inline
// d3.brushX lived in a separate cell from `const catDateSel = Mutable(...)`, so
// Observable Framework auto-unwrapped the Mutable to its array value before the
// brush handler ran — `catDateSel.value = ...` then assigned `.value` onto a
// plain array and silently no-opped, so dragging never updated the chart.
// renderDateBrush also provides the Brush<->Dates toggle (the date-dropdown).
const catChartMaxDate = d3.max(topDaily, d => d.date);
const catDateSel = Mutable([new Date("2025-01-01"), catChartMaxDate]);
const catSparkData = wideDaily.map(d => ({
  date: d.date,
  value: wideOrder.reduce((s, g) => s + (d[g] || 0), 0)
}));
display(renderDateBrush({
  data: catSparkData,
  dateAccessor: d => d.date,
  valueAccessor: d => d.value,
  initialRange: [new Date("2025-01-01"), catChartMaxDate],
  onSelect: r => { catDateSel.value = r; },
  color: "#1a9641",
  width
}));
```

<div class="control-strip">

```js
const chartScale  = view(hashInput("scale",  Inputs.radio(["Absolute", "Normalized"], {value: hashGet("scale",  "Absolute"), label: "Scale"})));
const chartDetail = view(hashInput("detail", Inputs.radio(["General", "Detailed"],    {value: hashGet("detail", "General"),  label: "Categories"})));
```

</div>

```js
// General (5-category) grouping
const generalMap = {
  "NFL": "Football", "College football": "Football",
  "NBA": "Basketball", "College basketball": "Basketball",
  "Baseball": "Baseball",
  "Hockey": "Other sports", "Golf": "Other sports", "Tennis": "Other sports",
  "Soccer": "Other sports", "Combat sports": "Other sports", "Other sports": "Other sports",
  "Parlay": "Parlay",
  "Parlay (correlated)": "Parlay", "Parlay (independent)": "Parlay", "Parlay (pending)": "Parlay",
  "Crypto": "Non-sports", "Finance": "Non-sports", "Politics": "Non-sports",
  "Entertainment": "Non-sports", "Mention": "Non-sports", "Weather": "Non-sports", "Other non-sports": "Non-sports"
};
const generalOrder  = ["Non-sports", "Other sports", "Baseball", "Basketball", "Football", "Parlay"];
const generalColors = {
  "Non-sports": "#78909c", "Other sports": "#a5d6a7", "Baseball": "#880e4f",
  "Basketball": "#1565c0", "Football": "#bf360c", "Parlay": "#7b1fa2"
};

const hasCategoryFocus = !!(tmActiveCategory || tmHoveredCategory || tmPinnedCategories.length);
const effectiveChartDetail = hasCategoryFocus ? "Detailed" : chartDetail;

const activeOrder    = effectiveChartDetail === "Detailed" ? wideOrder    : generalOrder;
const activeColorMap = effectiveChartDetail === "Detailed" ? wideColors   : generalColors;
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
  if (effectiveChartDetail === "General") {
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

const mapCategoryForCurrentDetail = category => effectiveChartDetail === "Detailed"
  ? normalizeTreemapCategory(category)
  : generalMap[normalizeTreemapCategory(category)] || normalizeTreemapCategory(category);

const mapCategoryForComparison = category => normalizeTreemapCategory(category);

const monthlyPrimaryFocus = tmActiveCategory ? mapCategoryForCurrentDetail(tmActiveCategory) : null;
const monthlyHoverFocus = tmHoveredCategory ? mapCategoryForCurrentDetail(tmHoveredCategory) : null;
const monthlyPinned = tmPinnedCategories.map(mapCategoryForCurrentDetail);

const monthlyFocusSet = new Set([monthlyHoverFocus || monthlyPrimaryFocus, ...monthlyPinned].filter(Boolean));
// Detailed view splits "Parlay" into three leg-based buckets; expand a treemap "Parlay" focus to all three.
if (monthlyFocusSet.has("Parlay")) {
  monthlyFocusSet.add("Parlay (correlated)");
  monthlyFocusSet.add("Parlay (independent)");
  monthlyFocusSet.add("Parlay (pending)");
}

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

```


<div class="plot-shell">

```js
Plot.plot({
  width,
  height: 420,
  marginLeft: 70,
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
    label: chartScale === "Normalized" ? "Share of monthly volume" : "Monthly volume (contracts)",
    grid: true,
    tickFormat: chartScale === "Normalized"
      ? d => (d * 100).toFixed(0) + "%"
      : d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
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
      fontSize: 11,
      lineHeight: 1.1,
      // Detailed mode has up to ~21 categories; listing every nonzero one made
      // the tip taller than the chart. Plot text tips can't scroll, so cap the
      // rows to the top contributors and fold the rest into a "+N more" line.
      // Presentation only — bars and underlying data are unchanged.
      title: d => {
        const TIP_MAX_ROWS = 12;
        const rows = activeOrder
          .filter(cat => (d[cat] || 0) > 0)
          .sort((a, b) => (d[b] || 0) - (d[a] || 0));
        const shown = rows.slice(0, TIP_MAX_ROWS).map(cat => chartScale === "Normalized"
          ? `${cat}: ${((d[cat] || 0) * 100).toFixed(1)}%`
          : `${cat}: ${fmtCount(d[cat] || 0)}`);
        const hidden = rows.length - shown.length;
        return [
          d.month,
          chartScale === "Normalized"
            ? "Total: 100% of month"
            : `Total: ${fmtCount(d.total || 0)} contracts`,
          ...shown,
          ...(hidden > 0 ? [`+${hidden} more categories`] : [])
        ].join("\n");
      }
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> <em>General</em> compresses the market into Football, Basketball, Baseball, Other sports, Parlay, and Non-sports. <em>Detailed</em> expands back into individual categories. <em>Normalized</em> shows share of monthly volume rather than dollars.</div>

### Daily view

<p class="section-intro">The same category mix, day by day instead of month by month. Uses the date window, category detail, and scale controls above. Brush to a tighter window to read individual days.</p>

```js
// Daily volume by category — reuses wideDaily (already per-day) + the same
// category mapping, colors, brush window (catDateSel) and controls
// (effectiveChartDetail / chartScale) as the monthly chart above.
const [dayStart, dayEnd] = catDateSel;
const dailyWindow = wideDaily.filter(d => d.date >= dayStart && d.date <= dayEnd);

const dailyTidy = dailyWindow.flatMap(d => {
  if (effectiveChartDetail === "General") {
    const gen = Object.fromEntries(generalOrder.map(g => [g, 0]));
    // wideDaily carries BOTH the "Parlay" total AND its 3 leg-splits (correlated/independent/
    // pending), which already sum to that total. generalMap maps all four to "Parlay", so summing
    // the raw row would double-count parlays. Skip the total — the monthly chart avoids this
    // because monthRolled only sums wideOrder, which omits the "Parlay" total.
    for (const [det, gname] of Object.entries(generalMap)) {
      if (det === "Parlay") continue;
      gen[gname] += d[det] || 0;
    }
    return generalOrder.map(g => ({date: d.date, category: g, contracts: gen[g]}));
  } else {
    return wideOrder.map(g => ({date: d.date, category: g, contracts: d[g] || 0}));
  }
});

const dailyTotals = d3.rollup(dailyTidy, rs => d3.sum(rs, r => r.contracts), d => +d.date);
const dailyPlot = dailyTidy.map(d => ({
  ...d,
  value: chartScale === "Normalized" ? d.contracts / (dailyTotals.get(+d.date) || 1) : d.contracts
}));

const dailyTip = Array.from(
  d3.rollup(dailyPlot, rows => {
    const out = {date: rows[0].date};
    for (const r of rows) out[r.category] = r.value;
    out.total = d3.sum(rows, r => r.contracts);
    return out;
  }, d => +d.date)
).map(([, v]) => v).sort((a, b) => a.date - b.date);
```

<div class="plot-shell">

```js
Plot.plot({
  width,
  height: 360,
  marginLeft: 70,
  color: {legend: true, domain: activeOrder, range: activeOrder.map(g => activeColorMap[g])},
  x: {type: "utc", label: null},
  y: {
    label: chartScale === "Normalized" ? "Share of daily volume" : "Daily volume (contracts)",
    grid: true,
    tickFormat: chartScale === "Normalized"
      ? d => (d * 100).toFixed(0) + "%"
      : d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")
  },
  marks: [
    Plot.areaY(dailyPlot, {
      x: "date", y: "value", fill: "category",
      order: activeOrder, fillOpacity: 0.85, curve: "step"
    }),
    Plot.ruleX(dailyTip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(dailyTip, Plot.pointerX({
      x: "date",
      fontSize: 11,
      lineHeight: 1.1,
      title: d => {
        const TIP_MAX_ROWS = 12;
        const rows = activeOrder.filter(cat => (d[cat] || 0) > 0).sort((a, b) => (d[b] || 0) - (d[a] || 0));
        const shown = rows.slice(0, TIP_MAX_ROWS).map(cat => chartScale === "Normalized"
          ? `${cat}: ${((d[cat] || 0) * 100).toFixed(1)}%`
          : `${cat}: ${fmtCount(d[cat] || 0)}`);
        const hidden = rows.length - shown.length;
        return [
          d.date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}),
          chartScale === "Normalized" ? "Total: 100% of day" : `Total: ${fmtCount(d.total || 0)} contracts`,
          ...shown,
          ...(hidden > 0 ? [`+${hidden} more categories`] : [])
        ].join("\n");
      }
    })),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> daily columns are noisier than the monthly bars — weekends, single big events, and settlement days all show up. Brush to a few months to read individual days clearly.</div>

## Fees by category over time

<p class="section-intro">The same category mix, but for the fees Kalshi <em>collected</em> — on a trade-date basis (fees as charged when a trade executes, not when markets settle). Uses the date window and category controls below; shares the brush with the volume charts above.</p>

```js
const topDailyFees = await FileAttachment("data/daily_top_categories_fees.csv").csv({typed: true});
const dailyOverallFees = await FileAttachment("data/daily_overall.csv").csv({typed: true});
```

```js
// wideDailyFees — parallel to wideDaily, but trade-date fees instead of contracts.
// Parlay is a single bucket (no per-leg fee data), derived as the residual
// total_fees - sports_fees - nonsports_fees so the stack still sums to the day's fees.
const feesTotalByDate = new Map(dailyOverallFees.map(d => [+d.date, +d.fees_total || 0]));
const wideDailyFees = topDailyFees.map(row => {
  const sp = sportsSplit.find(s => +s.date === +row.date) || {};
  const groups = {
    NFL: 0, "College football": 0, NBA: 0, "College basketball": 0,
    Baseball: 0, Hockey: 0, Golf: 0, Tennis: 0, Soccer: 0, "Combat sports": 0,
    Crypto: 0, Politics: 0, Finance: 0, Entertainment: 0, Mention: 0, Weather: 0
  };
  for (const [cat, v] of Object.entries(row)) {
    if (cat === "date") continue;
    const wg = wideCategoryForTicker(cat);
    if (wg && wg !== "_skip" && groups[wg] !== undefined) groups[wg] += +v || 0;
  }
  const feesSports    = +sp.fees_sports    || 0;
  const feesNonSports = +sp.fees_nonsports || 0;
  const feesParlay    = Math.max(0, (feesTotalByDate.get(+row.date) || 0) - feesSports - feesNonSports);
  const knownSports    = groups.NFL + groups["College football"] + groups.NBA + groups["College basketball"] +
    groups.Baseball + groups.Hockey + groups.Golf + groups.Tennis + groups.Soccer + groups["Combat sports"];
  const knownNonSports = groups.Crypto + groups.Politics + groups.Finance + groups.Entertainment + groups.Mention + groups.Weather;
  return {
    date: row.date,
    ...groups,
    Parlay: feesParlay,
    "Other sports":     Math.max(0, feesSports    - knownSports),
    "Other non-sports": Math.max(0, feesNonSports - knownNonSports)
  };
});

// Detailed order/colors for fees — single "Parlay" bucket (no correlated/independent/pending split).
const feesWideOrder = [
  "Other non-sports", "Weather", "Mention", "Entertainment", "Finance", "Politics", "Crypto",
  "Other sports", "Combat sports", "Soccer", "Hockey", "Tennis", "Golf", "Baseball",
  "College football", "NFL", "College basketball", "NBA", "Parlay"
];
const feesWideColors = {...wideColors, "Parlay": "#7b1fa2"};
```

<div class="control-strip">

```js
const feeScale  = view(Inputs.radio(["Absolute", "Normalized"], {value: "Absolute", label: "Scale"}));
const feeDetail = view(Inputs.radio(["General", "Detailed"],    {value: "General",  label: "Categories"}));
```

</div>

```js
const feeActiveOrder    = feeDetail === "Detailed" ? feesWideOrder : generalOrder;
const feeActiveColorMap = feeDetail === "Detailed" ? feesWideColors : generalColors;
const [feeStart, feeEnd] = catDateSel;

// Build tidy rows at a given period grain (month "YYYY-MM" or day Date) for the active detail.
function feeTidyRows(rows, periodOf, dateField) {
  const rolled = d3.rollup(
    rows,
    rs => { const o = {}; for (const g of feesWideOrder) o[g] = d3.sum(rs, d => d[g] || 0); return o; },
    periodOf
  );
  const sorted = [...rolled].sort(([a], [b]) => a < b ? -1 : 1);
  const tidy = sorted.flatMap(([p, vals]) => {
    if (feeDetail === "General") {
      const gen = Object.fromEntries(generalOrder.map(g => [g, 0]));
      for (const [det, gname] of Object.entries(generalMap)) gen[gname] += vals[det] || 0;
      return generalOrder.map(g => ({[dateField]: p, category: g, fees: gen[g]}));
    }
    return feesWideOrder.map(g => ({[dateField]: p, category: g, fees: vals[g] || 0}));
  });
  const totals = d3.rollup(tidy, rs => d3.sum(rs, r => r.fees), d => d[dateField]);
  const plot = tidy.map(d => ({...d, value: feeScale === "Normalized" ? d.fees / (totals.get(d[dateField]) || 1) : d.fees}));
  const tip = Array.from(d3.rollup(plot, rs => {
    const o = {[dateField]: rs[0][dateField]};
    for (const r of rs) o[r.category] = r.value;
    o.total = d3.sum(rs, r => r.fees);
    return o;
  }, d => d[dateField])).map(([, v]) => v);
  return {sorted, plot, tip};
}

const feeWindowRows = wideDailyFees.filter(d => d.date >= feeStart && d.date <= feeEnd);

const feeMonthly = feeTidyRows(feeWindowRows, d => d.date.toISOString().slice(0, 7), "month");
feeMonthly.tip.sort((a, b) => a.month < b.month ? -1 : 1);
const feeMonthLabels = feeMonthly.sorted.map(([mo]) => mo);
const feeMonthTickFmt = mo => { const [y, m] = mo.split("-"); const a = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]; return m === "01" ? `${a} '${y.slice(2)}` : a; };

const feeUSD = d => "$" + (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(1)+"M" : (d/1e3).toFixed(0)+"k");
const feeTipRows = (d, key) => {
  const rows = feeActiveOrder.filter(c => (d[c] || 0) > 0).sort((a, b) => (d[b] || 0) - (d[a] || 0));
  const shown = rows.slice(0, 12).map(c => feeScale === "Normalized" ? `${c}: ${((d[c]||0)*100).toFixed(1)}%` : `${c}: $${fmtCount(d[c]||0)}`);
  const hidden = rows.length - shown.length;
  return [key, feeScale === "Normalized" ? "Total: 100%" : `Total: $${fmtCount(d.total||0)}`, ...shown, ...(hidden > 0 ? [`+${hidden} more`] : [])].join("\n");
};
```

<div class="plot-shell">

```js
Plot.plot({
  width, height: 420, marginLeft: 70,
  marginBottom: feeMonthLabels.length > 18 ? 50 : 40,
  color: {legend: true, domain: feeActiveOrder, range: feeActiveOrder.map(g => feeActiveColorMap[g])},
  x: {type: "band", domain: feeMonthLabels, label: null, tickFormat: feeMonthTickFmt, tickRotate: feeMonthLabels.length > 18 ? -45 : 0},
  y: {label: feeScale === "Normalized" ? "Share of monthly fees" : "Monthly fees (USD)", grid: true,
      tickFormat: feeScale === "Normalized" ? (d => (d*100).toFixed(0)+"%") : feeUSD},
  marks: [
    Plot.barY(feeMonthly.plot, {x: "month", y: "value", fill: "category", order: feeActiveOrder, fillOpacity: 0.88}),
    Plot.ruleX(feeMonthly.tip, Plot.pointerX({x: "month", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(feeMonthly.tip, Plot.pointerX({x: "month", fontSize: 11, lineHeight: 1.1, title: d => feeTipRows(d, d.month)})),
    Plot.ruleY([0])
  ]
})
```

</div>

<div class="chart-note"><strong>Reading note:</strong> these are trade-date fees (charged when a trade executes), so they reconcile with the daily fee totals on the Fees page. Parlay is one bucket — we don't have per-leg fee data to split it. <em>General</em>/<em>Detailed</em>/<em>Normalized</em> behave as in the volume chart.</div>

### Daily view

```js
const feeDaily = feeTidyRows(feeWindowRows, d => +d.date, "ms");
feeDaily.plot.forEach(d => d.date = new Date(d.ms));
feeDaily.tip.forEach(d => d.date = new Date(d.ms));
feeDaily.tip.sort((a, b) => a.ms - b.ms);
```

<div class="plot-shell">

```js
Plot.plot({
  width, height: 340, marginLeft: 70,
  color: {legend: true, domain: feeActiveOrder, range: feeActiveOrder.map(g => feeActiveColorMap[g])},
  x: {type: "utc", label: null},
  y: {label: feeScale === "Normalized" ? "Share of daily fees" : "Daily fees (USD)", grid: true,
      tickFormat: feeScale === "Normalized" ? (d => (d*100).toFixed(0)+"%") : feeUSD},
  marks: [
    Plot.areaY(feeDaily.plot, {x: "date", y: "value", fill: "category", order: feeActiveOrder, fillOpacity: 0.85, curve: "step"}),
    Plot.ruleX(feeDaily.tip, Plot.pointerX({x: "date", stroke: "currentColor", strokeOpacity: 0.22})),
    Plot.tip(feeDaily.tip, Plot.pointerX({x: "date", fontSize: 11, lineHeight: 1.1,
      title: d => feeTipRows(d, d.date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}))})),
    Plot.ruleY([0])
  ]
})
```

</div>

```js
if (hasCategoryFocus) {
  const note = html`<div class="chart-note focus-mode-note">
    <div>
      <strong>Focus mode:</strong> a treemap category is selected or pinned, so this chart is using detailed category lines even if the control is set to General.
    </div>
  </div>`;
  const actions = html`<div class="focus-mode-actions"></div>`;
  if (tmPinnedCategories.length) {
    const clear = html`<button type="button" class="ui-button" onclick=${() => clearPinnedCategories()}>Exit pinned mode</button>`;
    actions.append(clear);
  }
  if (actions.childNodes.length) note.append(actions);
  display(note);
}
```

```js
{
  if (tmPinnedCategories.length) {
    display(html`<h2 id="focused-category-comparison" tabindex="-1"><a class="observablehq-header-anchor" href="#focused-category-comparison">Focused category comparison</a></h2>
      <p class="section-intro">Exact category trajectories, side by side — switch between market share, raw volume, and indexed growth to compare how categories have risen and fallen.</p>`);
  }
}
```

```js
{
  if (tmPinnedCategories.length) {
    const suggestedPeers = tmActiveCategory
      ? Array.from(new Set([
          ...({
            "NBA": ["College Basketball", "NFL", "Parlay"],
            "College Basketball": ["NBA", "College Football", "Parlay"],
            "NFL": ["College Football", "NBA", "Parlay"],
            "College Football": ["NFL", "College Basketball", "Parlay"],
            "Baseball": ["NBA", "NFL", "Golf"],
            "Parlay": ["NBA", "NFL", "College Basketball"]
          }[tmActiveCategory] || []),
          ...tmCategoryTotals.map(d => d.category)
        ])).filter(category => category !== tmActiveCategory && !tmPinnedCategories.includes(category)).slice(0, 4)
      : [];

    const shell = html`<details class="surface-card compact-details"></details>`;
    shell.append(html`<summary>${tmActiveCategory ? `${displayTreemapCategory(tmActiveCategory)} comparison controls` : "Pinned comparison controls"}</summary>`);
    shell.append(html`<div class="focus-header">
      <div>
        <div class="focus-title">${tmActiveCategory ? `Primary series: ${displayTreemapCategory(tmActiveCategory)}` : "Pinned comparison set"}</div>
        <p class="focus-copy">Pin up to three exact comparison categories. This comparison always stays detailed, so Pro basketball does not become all Basketball.</p>
      </div>
    </div>`);
    if (suggestedPeers.length) {
      const suggested = html`<div class="comparison-suggestions"></div>`;
      suggested.append(html`<span class="comparison-suggestion-label">Suggested peers</span>`);
      for (const category of suggestedPeers) {
        const color = TM_CATEGORY_COLORS[category] || "#888";
        const btn = html`<button type="button" class="ui-chip" style="
          border-color:${color};
          background:${color + "12"};
          color:inherit;
        ">${displayTreemapCategory(category)}</button>`;
        btn.addEventListener("click", () => togglePinnedCategory(category));
        suggested.append(btn);
      }
      shell.append(suggested);
    }
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
      ">${primary ? "Primary" : active ? "Pinned" : "Compare"} | ${displayTreemapCategory(category)}</button>`;
      if (!primary) btn.addEventListener("click", () => togglePinnedCategory(category));
      row.append(btn);
    }
    shell.append(row);
    display(shell);
  }
}
```

```js
const comparePrimary = tmActiveCategory ? mapCategoryForComparison(tmActiveCategory) : null;
const rawCompareSeries = tmPinnedCategories.length
  ? Array.from(new Set([
      comparePrimary,
      ...tmPinnedCategories.map(mapCategoryForComparison)
    ])).filter(Boolean)
  : [];

const compareMode = rawCompareSeries.length
  ? view(hashInput("compareMode", Inputs.radio(
      ["Market share", "Volume", "Indexed growth"],
      {value: hashGet("compareMode", "Market share"), label: "Comparison view"}
    )))
  : "Market share";

const compareSeries = rawCompareSeries.filter(category =>
  wideOrder.includes(category) &&
  sortedMonths.some(([, vals]) => (vals[category] || 0) > 0)
);

const missingCompareSeries = rawCompareSeries.filter(category => !compareSeries.includes(category));

const compareFirstNonzero = new Map(compareSeries.map(category => [
  category,
  sortedMonths.find(([, vals]) => (vals[category] || 0) > 0)?.[1]?.[category] || null
]));

const compareValue = (category, contracts, monthTotal) => {
  if (compareMode === "Market share") return contracts / (monthTotal || 1);
  if (compareMode === "Indexed growth") return compareFirstNonzero.get(category) ? contracts / compareFirstNonzero.get(category) * 100 : null;
  return contracts;
};

const compareTidy = sortedMonths.flatMap(([month, vals]) => {
  const monthTotal = monthTotals.get(month) || 0;
  return compareSeries.map(category => ({
    month,
    category,
    contracts: vals[category] || 0,
    value: compareValue(category, vals[category] || 0, monthTotal)
  }));
});

const compareTotals = new Map(compareSeries.map(category => [
  category,
  d3.sum(compareTidy.filter(d => d.category === category), d => d.contracts)
]));

const compareGrandTotal = d3.sum(compareTotals.values());

const compareSummary = compareSeries.map(category => {
  const rows = compareTidy.filter(d => d.category === category);
  const nonzero = rows.filter(d => d.contracts > 0);
  const peak = d3.greatest(rows, d => d.contracts) || rows[0];
  const latest = rows.at(-1);
  const first = nonzero[0];
  return {
    category,
    total: compareTotals.get(category) || 0,
    share: (compareTotals.get(category) || 0) / (compareGrandTotal || 1),
    peakMonth: peak?.month,
    peakContracts: peak?.contracts || 0,
    indexedLatest: first?.contracts ? (latest?.contracts || 0) / first.contracts * 100 : null
  };
});

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

const comparePrimaryTidy = comparePrimary
  ? compareTidy.filter(d => d.category === comparePrimary)
  : [];

const compareSecondaryTidy = compareTidy.filter(d => d.category !== comparePrimary);
```

```js
if (compareSummary.length) {
  display(html`<div class="comparison-card-grid">
    ${compareSummary.map(d => html`<div class="comparison-card" style="--series-color:${wideColors[d.category] || "#666"}">
      <div class="comparison-card-title">${d.category}</div>
      <div class="comparison-card-main">${fmtCount(d.total)} <span style="font-size:0.5em;font-weight:400;opacity:0.7">contracts</span></div>
      <div class="comparison-card-row"><span>Comparison share</span><strong>${(d.share * 100).toFixed(1)}%</strong></div>
      <div class="comparison-card-row"><span>Peak month</span><strong>${d.peakMonth || "-"} · ${fmtCount(d.peakContracts)}</strong></div>
      <div class="comparison-card-row"><span>Latest indexed</span><strong>${d.indexedLatest == null ? "-" : d.indexedLatest.toFixed(0) + "%"}</strong></div>
    </div>`)}
  </div>`);
}
```

<div class="plot-shell">

```js
if (!compareSeries.length) {
  display(html`<div class="chart-note">${rawCompareSeries.length ? "No selected comparison categories have volume in the current date window." : "Select a category in the treemap to start a comparison."}</div>`);
} else {
  if (missingCompareSeries.length) {
    display(html`<div class="chart-note">Hidden in this date window: ${missingCompareSeries.join(", ")}.</div>`);
  }
  display(Plot.plot({
    width,
    height: 320,
    marginLeft: 82,
    style: {fontFamily: "var(--font-sans)"},
    color: {legend: true, domain: compareSeries, range: compareSeries.map(cat => wideColors[cat] || "#666")},
    x: {type: "band", domain: monthLabels, label: null, tickFormat: monthTickFormat},
    y: {
      label: compareMode === "Market share" ? "Share of monthly volume" : compareMode === "Indexed growth" ? "Indexed to first nonzero month = 100" : "Monthly volume (contracts)",
      grid: true,
      tickFormat: compareMode === "Market share" ? d => (d * 100).toFixed(0) + "%" : compareMode === "Indexed growth" ? d => d.toFixed(0) : d => fmtCount(d)
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
          ...compareSeries.map(cat => compareMode === "Market share"
            ? `${cat}: ${((d[cat] || 0) * 100).toFixed(1)}%`
            : compareMode === "Indexed growth"
            ? `${cat}: ${(d[cat] || 0).toFixed(0)}`
            : `${cat}: ${fmtCount(d[cat] || 0)} contracts`)
        ].join("\n")
      })),
      Plot.ruleY([0])
    ]
  }));
}
```

</div>

## Sports market type breakdown

_How sports volume is split between market types across all sports tickers. Moneylines = individual game winners. Futures/Award = season champions, conference winners, awards, tournament brackets. **Parlay (correlated)** = at least two legs are in the same game, so the legs aren't independent and the odds aren't a simple product of the leg prices. **Parlay (independent)** = every leg is a different game. (Classified from the actual legs, not the ticker name.)_

```js
const marketTypeRaw = await FileAttachment("data/sports_market_type_daily.csv").csv({typed: true});
```

```js
// Consolidate minor categories for cleaner display
const MT_REMAP = {
  "Parlay (correlated)": "Parlay (correlated)",
  "Parlay (independent)": "Parlay (independent)",
  "Parlay (pending)": "Parlay (pending)",
  // Defensive: the near-live updater may emit the legacy multi/single labels for the
  // current in-flight day before the full rebuild reclassifies it by leg correlation.
  // Route them to "pending" so today's parlays never fall into "Other".
  "Parlay (multi-game)": "Parlay (pending)",
  "Parlay (single-game)": "Parlay (pending)",
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
  "Parlay (correlated)", "Parlay (independent)", "Parlay (pending)", "Player Prop", "Game Prop", "Other"
];
const mtColors = [
  "#4e79a7", "#76b7b2", "#f28e2b", "#e15759",
  "#b07aa1", "#d4a0c7", "#e8d0e0", "#59a14f", "#8cd17d", "#bab0ac"
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
// Mutable + brush in the SAME cell so the callback closes over the wrapper.
// Default window: last 6 months. Drag the edges to widen or narrow.
const mtEnd0 = d3.max(mtDaily, d => d.date);
const mtStart0 = new Date(mtEnd0);
mtStart0.setMonth(mtStart0.getMonth() - 6);
const mtDateSel = Mutable([mtStart0, mtEnd0]);
const mtSparkData = mtDaily.map(row => ({
  date: row.date,
  value: mtOrder.reduce((s, g) => s + (row[g] || 0), 0)
}));
display(renderDateBrush({
  data: mtSparkData,
  dateAccessor: d => d.date,
  valueAccessor: d => d.value,
  initialRange: [mtStart0, mtEnd0],
  onSelect: r => { mtDateSel.value = r; },
  color: "#4e79a7",
  width
}));
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
  marginLeft: 70,
  color: {legend: true, domain: mtOrder, range: mtColors},
  x: {type: "utc", label: null},
  y: {label: "Volume (contracts)", grid: true},
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
      title: d => [fmtDate(d.date), ...mtOrder.map(t => d[t] > 0 ? `${t}: ${fmtCount(d[t])}` : null).filter(Boolean)].join("\n")
    })),
    Plot.ruleY([0])
  ]
})
```

---

## All-time individual market leaderboard

<p class="section-intro">Every individual market, ranked. Filter by theme with the legend chips, search for a specific market, or sort any column to see what's biggest by volume, fees, or trades.</p>

Ranked by total contracts across all outcomes. Each row is one market (e.g. "Super Bowl 2026 winner"), not an individual yes/no contract.

```js
// -- Category colors ----------------------------------------------------------
// Sports is split into Football / Basketball / Other sport for legibility.
// Sports = warm family (reds ? oranges ? gold) so you can instantly tell sports vs non-sports.
// Non-sports = cool family (blues ? purples ? teal).
const CAT_COLORS = {
  "Football":        "#c0392b",  // deep red     -+
  "Basketball":      "#e67e22",  // orange - warm = sports
  "Other sport":     "#f0b429",  // amber/gold   -+
  "Politics":        "#1565c0",  // deep blue    -+
  "Economics":       "#0891b2",  // teal-blue - cool = non-sports
  "Entertainment":   "#6d28d9",  // purple
  "Other non-sport": "#047857",  // dark green   -+
};

// -- Team maps for game-ticker parsing ----------------------------------------
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
  RMA:"Real Madrid", FCB:"Barcelona", BAR:"Barcelona", ATM:"Atletico Madrid",
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
  CG:"Gauff", AS:"Sabalenka", IS:"Swiatek", ES:"Swiatek", JP:"Pegula",
  EA:"Andreeva", MK:"Keys", QZ:"Zheng", OJ:"Jabeur",
  SAB:"Sabalenka", SWI:"Swiatek", GAU:"Gauff", PEG:"Pegula",
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

// Combined team lookup for generic winner extraction (fallback only - sport-
// specific lookups should use getTeamsForMarket to avoid cross-sport collisions)
const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// PGA Tour player code ? last name
const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
  RM:"McIlroy",     SS:"Scheffler",  CAME:"Cam Young",  LABE:"Aberg",
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
  if (/^KXNCAAMB|^KXNCAAWB|^KXMARMAD|^KXWMARMAD/.test(mk)) return CBB_TEAMS;
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

// PGA Tour event code → human name. Codes are the segment between `KXPGATOUR-`
// and the 2-digit year. Add new codes here as new events appear; unknown codes
// fall through to the raw ticker so they're visible in the leaderboard for triage.
const PGA_EVENTS = {
  MAST:    "Masters Tournament",
  THPC:    "The Players Championship",
  THGI:    "The Genesis Invitational",
  RBH:     "RBC Heritage",
  TRC:     "Truist Championship",
  VATO:    "Valero Texas Open",
  VAC:     "Valspar Championship",
  CAC:     "Cadillac Championship",
  ATPBP:   "AT&T Pebble Beach Pro-Am",
  ARPIPBM: "Arnold Palmer Invitational",
  COCITPB: "Cognizant Classic in the Palm Beaches",
  FSJC:    "FedEx St. Jude Championship",
};

function parseTicker(mk) {
  if (/^KXFEDCHAIRNOM/.test(mk))  return "Next Fed Chair";
  // Flip date before label so "Sep '25 Fed rate decision" reads well when truncated
  const fedM = mk.match(/^KXFEDDECISION-(\d{2})([A-Z]{3})$/);
  if (fedM) {
    const yy = fedM[1], mon = fedM[2];
    return `${mon[0]+mon.slice(1).toLowerCase()} '${yy} Fed rate decision`;
  }
  // Year-suffix sport futures: KX<SPORT>-YY → "<YYYY> <Event>"
  // YY=26 means the season ending in 2026 (NBA/NHL playoffs, World Series, etc.)
  const sportFut = mk.match(/^KX(NBA|MLB|NHL|NCAAF|MARMAD|MASTERS|USOPEN|WMENSINGLES|WMENDOUBLES|MENSINGLES|MENDOUBLES|NFLSBMVP|NBACUP|MLBWORLD|T20WORLDCUP)-(\d{2})$/);
  if (sportFut) {
    const map = {
      NBA: "NBA Finals", MLB: "World Series", NHL: "Stanley Cup",
      NCAAF: "CFP National Championship", MARMAD: "NCAA Men's Basketball Tournament",
      MASTERS: "Masters Tournament", USOPEN: "US Open (Tennis)",
      WMENSINGLES: "Wimbledon Men's Singles", WMENDOUBLES: "Wimbledon Men's Doubles",
      MENSINGLES: "Australian/French Open Men's Singles", MENDOUBLES: "Australian/French Open Men's Doubles",
      NFLSBMVP: "Super Bowl MVP", NBACUP: "NBA Cup",
      MLBWORLD: "World Baseball Classic", T20WORLDCUP: "ICC Men's T20 World Cup"
    };
    return `20${sportFut[2]} ${map[sportFut[1]]}`;
  }
  // Politics futures: KXPRESNOMD-YY, KXPRESNOMR-YY → "<YYYY> Dem/Rep Pres. nominee"
  const presNom = mk.match(/^KXPRESNOM([DR])-(\d{2})$/);
  if (presNom) {
    return `20${presNom[2]} ${presNom[1] === "D" ? "Democratic" : "Republican"} Presidential nominee`;
  }
  // NYC Mayor: KXMAYORNYCPARTY-YY → "<YYYY> NYC Mayor (party)"
  const nycMP = mk.match(/^KXMAYORNYCPARTY-(\d{2})$/);
  if (nycMP) return `20${nycMP[1]} NYC Mayor (party winner)`;
  // Gov shutdown length: KXGOVSHUTLENGTH-YYMMMDD → "Gov shutdown length (started Mon DD, 'YY)"
  const govShL = mk.match(/^KXGOVSHUTLENGTH-(\d{2})([A-Z]{3})(\d{2})$/);
  if (govShL) {
    const mo = govShL[2]; const m = mo[0] + mo.slice(1).toLowerCase();
    return `Gov shutdown length (started ${m} ${parseInt(govShL[3])}, '${govShL[1]})`;
  }
  if (/^KXMLBRFI/.test(mk))          return "MLB Run First Inning (daily)";
  if (/^KXNFLNFCCHAMP/.test(mk))     return `NFC Championship`;
  if (/^KXNFLAFCCHAMP/.test(mk))     return `AFC Championship`;
  if (/^KXFIRSTSUPERBOWLSONG/.test(mk)) return "SB halftime: first song";
  if (/^KXSUPERBOWLAD/.test(mk))     return "Super Bowl ad";
  if (/^KXPERFORMSUPERBOWLB/.test(mk)) return "Super Bowl halftime performer";
  if (/^KXSBGUESTS/.test(mk))        return "Super Bowl LX guests";
  if (/^KXKHAMENEIOUT/.test(mk))     return "Khamenei out of power";
  if (/^KXGOVSHUT(?!LENGTH)/.test(mk)) return "Government shutdown";
  if (/^KXGOVTSHUTDOWN/.test(mk))    return "Government shutdown";
  if (/^KXBOXING/.test(mk))          return "Boxing match";
  if (/^KXUFCFIGHT/.test(mk))        return "UFC fight";
  // PGA Tour event: KXPGATOUR-<EVENT_CODE><YY>. We map common event codes;
  // unknown codes fall through to the raw ticker so they're visible for triage.
  const pgaM = mk.match(/^KXPGATOUR-([A-Z]+)(\d{2})$/);
  if (pgaM) {
    const code = pgaM[1], yy = pgaM[2];
    const evt = PGA_EVENTS[code];
    return evt ? `20${yy} ${evt}` : null;  // null → falls through to MKT_NAME_OVERRIDES / mk
  }
  // Kalshi parlays - all start with KXMVE (multi-game extended)
  if (/^KXMVE/.test(mk))             return "Parlay";
  // NFL / NCAAF spread and total markets
  const nflSpr = mk.match(/^KXNFLSPREAD-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nflSpr) { const g = parseGame(nflSpr[1], NFL_TEAMS); return g ? `${g} (spread)` : null; }
  const ncaafSpr = mk.match(/^KXNCAAFSPREAD-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (ncaafSpr) { const g = parseGame(ncaafSpr[1], CFB_TEAMS); return g ? `${g} (spread)` : null; }
  const nbaSpr = mk.match(/^KXNBASPREAD-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nbaSpr) { const g = parseGame(nbaSpr[1], NBA_TEAMS); return g ? `${g} (spread)` : null; }
  const ncaaMbSpr = mk.match(/^KXNCAAMBSPREAD-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (ncaaMbSpr) { const g = parseGame(ncaaMbSpr[1], CBB_TEAMS); return g ? `${g} (spread)` : null; }
  const nbaTot = mk.match(/^KXNBATOTAL-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nbaTot) { const g = parseGame(nbaTot[1], NBA_TEAMS); return g ? `${g} (total)` : null; }
  const nflTot = mk.match(/^KXNFLTOTAL-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nflTot) { const g = parseGame(nflTot[1], NFL_TEAMS); return g ? `${g} (total)` : null; }
  // Women's college basketball games (same school codes as men's CBB)
  const ncaaWbM = mk.match(/^KXNCAAWBGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (ncaaWbM) return parseGame(ncaaWbM[1], CBB_TEAMS) ?? mk;
  // NBA series (optional trailing round code like R1)
  const nbaSer = mk.match(/^KXNBASERIES-\d{2}([A-Z]+?)(?:R\d+)?$/);
  if (nbaSer) { const g = parseGame(nbaSer[1], NBA_TEAMS); return g ? `${g} (series)` : null; }
  // NFL / college games
  const nflM   = mk.match(/^KXNFLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nflM)   return parseGame(nflM[1],   NFL_TEAMS) ?? mk;
  const ncaafM = mk.match(/^KXNCAAFGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (ncaafM) return parseGame(ncaafM[1], CFB_TEAMS) ?? mk;
  const cbbM   = mk.match(/^KXNCAAMBGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (cbbM)   return parseGame(cbbM[1],   CBB_TEAMS) ?? mk;
  const nbaM   = mk.match(/^KXNBAGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nbaM)   return parseGame(nbaM[1],   NBA_TEAMS) ?? mk;
  // MLB / NHL / UCL / IPL / WBC games
  const mlbGame = mk.match(/^KXMLBGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (mlbGame) return parseGame(mlbGame[1], MLB_TEAMS) ?? mk;
  const mlbSer = mk.match(/^KXMLBSERIES-\d{2}([A-Z]+)$/);
  if (mlbSer) { const g = parseGame(mlbSer[1], MLB_TEAMS); return g ? `${g} (series)` : null; }
  const nhlGame = mk.match(/^KXNHLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nhlGame) return parseGame(nhlGame[1], NHL_TEAMS) ?? mk;
  const uclGame = mk.match(/^KXUCLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (uclGame) return parseGame(uclGame[1], SOCCER_TEAMS) ?? mk;
  const iplGame = mk.match(/^KXIPLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (iplGame) return parseGame(iplGame[1], IPL_TEAMS) ?? mk;
  // WBC fixture format includes a 4-digit time code (e.g. ...152000USADOM)
  const wbcGame = mk.match(/^KXWBCGAME-\d{2}[A-Z]{3}\d{2}\d{4}([A-Z]+)$/);
  if (wbcGame) return parseGame(wbcGame[1], CRICKET_TEAMS) ?? mk;
  return null;
}

// -- Forced market-name overrides (take priority over Kalshi's market_name) ---
// Use when Kalshi's own label is misleading or missing context that matters.
const MKT_NAME_FORCE = {
  "PRES-2024":                  "Presidency 2024",
  "POPVOTE-24":                 "Popular vote 2024",
  "KXSB-26":                    "Super Bowl LX",
  "KXSB-25":                    "Super Bowl LIX",
  "KXMASTERS-25":               "2025 Masters Tournament",
  // World Series 2025: LAD vs TOR - games 3, 4, 5, 6, 7
  "KXMLBGAME-25OCT27TORLAD":    "World Series 2025 Game 3",
  "KXMLBGAME-25OCT28TORLAD":    "World Series 2025 Game 4",
  "KXMLBGAME-25OCT29TORLAD":    "World Series 2025 Game 5",
  "KXMLBGAME-25OCT31LADTOR":    "World Series 2025 Game 6",
  "KXMLBGAME-25NOV01LADTOR":    "World Series 2025 Game 7",
  "KXMLBGAME-25OCT24LADTOR":    "World Series 2025 Game 1",
  "KXMLBGAME-25OCT25LADTOR":    "World Series 2025 Game 2",
  "KXMLBGAME-25OCT15TORSEA":    "ALCS 2025 (Mariners vs Blue Jays)",
};

// -- Specific overrides (markets with no Kalshi title at all) -----------------
const MKT_NAME_OVERRIDES = {
  "POPVOTEMOV-24-R-B":      "Popular vote margin (R, wider)",
  "POPVOTEMOVSMALL-24-R":   "Popular vote margin (R, small range)",
  "POPVOTEMOVSMALLER-24-R": "Popular vote margin (R, narrow range)",
  "POPVOTEMOV-24-D":        "Popular vote margin (D)",
  "ECMOV-24-R-B35":         "Electoral college margin >35 (R)",
  "ECMOV-24-R-B65":         "Electoral college margin >65 (R)",
  // "Who wins Popular Vote + Electoral College?" - combined-outcome market.
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
  // One-off entries for tickers that don't fit a parseTicker pattern
  "KXLAYOFFSYINFO-26-494000":   "Tech layoffs in 2026 = 494,000",
  "KXCITRINI-28JUL01":          "Citrini macro call by July 2028",
  "KXALIENS-27":                "Alien/UAP disclosure by 2027",
};

// -- Shared winner-display logic -----------------------------------------------
// Hard overrides for winner display, keyed on winner_ticker.
const WINNER_OVERRIDES = {
  // A6 fix: the -NO suffix (New Orleans) spuriously trips isBinaryOutcome (/-(YES|NO)$/i),
  // returning bare "yes" instead of decoding the team. Override the one affected market.
  "KXNFLGAME-25OCT05NYGNO-NO": "Saints",
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
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT":   "Titi Me Pregunto",
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
  "KXKHAMENEIOUT-AKHA":  "it's complicated",
  "KXSUPERBOWLAD-SB2026":"Various",
};

function fmtWinner(d) {
  const mk   = (d.market_key ?? "").trim();
  const rawW = (d.winner ?? "").trim();
  // Strip market-rule text (e.g. "If UConn wins the...") - not a name
  const w    = rawW.length > 50 ? "" : rawW;
  const wt   = (d.winner_ticker ?? "").trim();
  if (WINNER_OVERRIDES[wt]) return WINNER_OVERRIDES[wt];
  // Fix Kalshi metadata error: "Hike 0bps" = no rate change = hold
  if (/hike\s*0\s*bps/i.test(w)) return "Hold";
  // Skip literal "yes"/"no" subtitles when the winner_ticker has a real outcome
  // code (e.g. KXSB-26-SEA). Only return the raw winner for true binary markets
  // whose ticker ends in -YES or -NO.
  if (w && !w.startsWith("::")) {
    const isBinaryOutcome = wt && /-(YES|NO)$/i.test(wt);
    if (isBinaryOutcome || !/^(yes|no)$/i.test(w)) return w;
  }
  if (w.startsWith("::")) { const a = w.replace(/^::\s*/, "").trim(); if (a) return a; }
  if (wt) {
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    const teamMap = getTeamsForMarket(mk);
    // Spread winners like "SEA10" -> "Seahawks -10"
    if (/SPREAD/.test(mk)) {
      const sp = short.match(/^([A-Z]+)(\d+)$/);
      if (sp) return `${teamMap[sp[1]] ?? sp[1]} -${sp[2]}`;
    }
    return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
  }
  if (WINNER_BY_MARKET[mk]) return WINNER_BY_MARKET[mk];
  return "-";
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
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT": "Titi Me Pregunto",
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
  "KXLAYOFFSYINFO-26-494000":         "= 494,000 layoffs",
  "KXPERFORMSUPERBOWLB-26-CAR":       "Cardi B",
  "PRESPARTYFULL-24-REC-RPV":         "Republican",
  "PRESPARTYFULL-24-REC-DPV":         "Democratic",
  "PRESPARTYFULL-24-DEC-RPV":         "Republican",
  "PRESPARTYFULL-24-DEC-DPV":         "Democratic",
  "POWER-24-RH-RS-RP":                "Republican",
};

function fmtStrike(top_outcome, market_key) {
  if (!top_outcome) return "-";
  if (TOP_OUTCOME_NAMES[top_outcome]) return TOP_OUTCOME_NAMES[top_outcome];
  const mk = (market_key ?? "").trim();
  const short = mk
    ? top_outcome.replace(mk + "-", "")
    : top_outcome.split("-").pop();
  // Fed rate outcomes
  if (short === "H0") return "Hold";
  if (/^H(\d+)$/.test(short)) return `-${short.slice(1)}.25 bps`;
  if (/^C(\d+)$/.test(short)) return `-${short.slice(1)} bps (cut)`;
  // Shutdown length - e.g. "42D" -> "42 days"
  const daysM = short.match(/^(\d+)D$/);
  if (daysM) return `${daysM[1]} days`;
  // Date-style strike like "26MAR01" ? "by Mar 1"
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
  // Percentage-formatted strikes - only for popular-vote-margin markets.
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
  // Merge Elections into Politics - they're the same concept on Kalshi
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
      // Prefer the real Kalshi title from the build-time enrichment (display_name /
      // display_winner columns); fall back to the ticker parser when blank.
      display_name:   (d.display_name && String(d.display_name).trim()) || bestName(d),
      winner_display: (d.display_winner && String(d.display_winner).trim()) || fmtWinner(d),
      top_short:      fmtStrike(top, mk),
      display_cat:    getSportDisplayCategory(d)
    };
  });

```

```js
// Top-20 bar chart - use fill:"display_cat" so Plot's color scale drives the legend
const mktTop20 = mktRanked.slice(0, 20);
const mktCatDomain = Object.keys(CAT_COLORS).filter(c => mktTop20.some(d => d.display_cat === c));
display(Plot.plot({
  width,
  height: mktTop20.length * 24 + 60,  // extra space for the color legend
  marginLeft: 240,
  color: {
    legend: true,
    domain: mktCatDomain,
    range: mktCatDomain.map(c => CAT_COLORS[c])
  },
  x: {label: "Volume (contracts)", grid: true, tickFormat: d => (d >= 1e9 ? (d/1e9).toFixed(1)+"B" : d >= 1e6 ? (d/1e6).toFixed(0)+"M" : (d/1e3).toFixed(0)+"k")},
  y: {label: null},
  marks: [
    Plot.barX(mktTop20, {
      x: "contracts",
      y: d => `#${d.rank} ${d.display_name}`,
      fill: "display_cat",  // use the named color scale so legend renders
      sort: {y: "-x"},
      tip: true,
      title: d => `${d.display_name}\n${fmtC(d.contracts)} contracts\nFees: $${fmtC(+d.fees_total||0)}\nWinner: ${d.winner_display}`
    }),
    Plot.ruleX([0])
  ]
}))
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

// Build per-category CSS using :has() so the full row is colored -
// no JS DOM timing issues; survives table sort/pagination automatically.
const catCss = Object.entries(CAT_COLORS).map(([cat, color]) =>
  `.mkt-table tr:has([data-mkt-cat="${cat}"]) { background: ${color}38 !important; }
.mkt-table tr:has([data-mkt-cat="${cat}"]): hover { background: ${color}55 !important; }`
).join("\n");

display(html`<style>
  .mkt-table table { font-size: 14px; border-collapse: collapse; width: 100%; }
  .mkt-table td, .mkt-table th { padding: 0.65em 0.8em; }
  .mkt-table tr { height: 2.7em; }
  /* Sortable headers - Observable Inputs.table sorts on click; surface the affordance.
     Column layout: 1=checkbox, 2=rank, 3=_c(hidden), 4=market, 5=date, 6=volume, 7=fees, 8=winner, 9=strike */
  .mkt-table thead th:nth-child(n+2):not(:nth-child(3)) {
    cursor: pointer;
    user-select: none;
    position: sticky; top: 0;
    background: var(--theme-background, #fff);
    z-index: 1;
  }
  .mkt-table thead th:nth-child(n+4):hover { color: var(--accent-kalshi, #00C2A8); }
  .mkt-table thead th:nth-child(n+4)::after {
    content: " \2195";
    opacity: 0.35;
    font-size: 0.85em;
  }
  .mkt-table thead th:nth-child(n+4)[aria-sort="ascending"]::after  { content: " \2191"; opacity: 1; color: var(--accent-kalshi, #00C2A8); }
  .mkt-table thead th:nth-child(n+4)[aria-sort="descending"]::after { content: " \2193"; opacity: 1; color: var(--accent-kalshi, #00C2A8); }
  /* Inputs.table already renders its own ?/? in a leading <span> on the active column;
     hide it so it doesn't double up with our arrows. */
  .mkt-table thead th > span:first-child { display: none; }
  /* Collapse the hidden category-tag column (_c is 3rd child: checkbox, rank, _c, ...) */
  .mkt-table th:nth-child(3), .mkt-table td:nth-child(3) { padding: 0 !important; width: 0; max-width: 0; overflow: hidden; }
  /* Market column (4th): wider + allow the name to wrap to two lines, then clamp. */
  .mkt-table td:nth-child(4) { white-space: normal !important; vertical-align: middle; }
  .mkt-name {
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; line-height: 1.2; max-height: 2.4em;
  }
  /* Rank column (2nd child): tighter padding so "#" stays narrow. */
  .mkt-table td:nth-child(2), .mkt-table th:nth-child(2) { padding-left: 0.45em; padding-right: 0.45em; }
  /* Date column (5th child): keep YYYY/MM/DD on one line so it can't be clipped. */
  .mkt-table td:nth-child(5), .mkt-table th:nth-child(5) { white-space: nowrap; }
  ${catCss}
</style>`);

// Category legend - swatch rectangles matching row tint, click to cross-filter.
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

// Add _c column - an invisible carrier for the data-mkt-cat attribute used by :has() CSS above.
// Coerce fees_total to a real number (null for missing) so column-sort is numeric, not string.
// Resolve the display date for each market: try the embedded game-date in the
// market_key first (KXNBAGAME-26JAN10-... etc), fall back to the last_trade_date
// emitted by the leaderboard builder (which for non-sports markets is the
// effective settlement date — last day any trade printed).
const mktDisplay = mktFiltered.map(d => {
  const fees = d.fees_total;
  const feesNum = (fees == null || fees === "" || isNaN(+fees)) ? null : +fees;
  const parsed = parseMarketDateFromKey(d.market_key);
  const ltd = d.last_trade_date instanceof Date
    ? d.last_trade_date
    : (typeof d.last_trade_date === "string" && d.last_trade_date
        ? new Date(d.last_trade_date) : null);
  // Show parsed game date for any market (incl. scheduled future games).
  // For markets without a parseable date, only show last_trade_date if the
  // market has actually settled — otherwise leave blank.
  const isSettled = !!(d.winner_ticker && String(d.winner_ticker).trim());
  const displayDate = parsed || (isSettled ? ltd : null);
  return {
    ...d,
    _c: d.display_cat || d.kalshi_category || "",
    fees_total: feesNum,
    market_date: displayDate
  };
});

display(html`<div style="font-size:0.82em;color:var(--text-faint,#888);margin:0.3rem 0 0.6rem">Tip: click any column header to sort. Click again to reverse.</div>`);

const tbl = Inputs.table(mktDisplay, {
  columns: ["rank", "_c", "display_name", "market_date", "contracts", "fees_total", "winner_display", "top_short"],
  header: {
    rank:          "#",
    _c:            "",
    display_name:  "Market",
    market_date:   "Date",
    contracts:     "Volume (contracts)",
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
    // YYYY/MM/DD - uniform width (no variable-length month names) so the column
    // stays narrow and the date never gets clipped. UTC to match the parsed game date.
    market_date: d => {
      if (!d) return "—";
      const y = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
      const da = String(d.getUTCDate()).padStart(2, "0");
      return `${y}/${mo}/${da}`;
    },
    contracts:  d => fmtC(d),
    fees_total: d => (d == null || d === 0) ? "N/A" : "$" + fmtC(+d),
    // Market name: wrap to <=2 lines then ellipsis; full name on hover.
    display_name: v => html`<div class="mkt-name" title=${v ?? ""}>${v}</div>`,
  },
  align: {
    rank: "right",
    contracts: "right",
    fees_total: "right"
  },
  width: {rank: 40, _c: 0, display_name: 300, market_date: 96},
  sort: "rank",
  reverse: false,
  rows: 50
});
tbl.classList.add("mkt-table");
display(tbl);
```
