// Shared ticker/market-key -> human-readable-name logic, extracted verbatim from
// categories.md (the Individual Market Leaderboard) so other pages (e.g.
// trade-size.md's large-trades tables) can label a market/outcome from just a
// market_key + outcome ticker, without duplicating this logic.
//
// Everything here is a pure function of its arguments - no dependency on any
// page's loaded CSV data. categories.md still owns `mktRanked`/`mktDisplay`
// (the per-row computation that consumes its own leaderboard CSV) and just
// calls these functions.

export function parseMarketDateFromKey(marketKey) {
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

// -- Category colors ----------------------------------------------------------
// Sports is split into Football / Basketball / Other sport for legibility.
// Sports = warm family (reds ? oranges ? gold) so you can instantly tell sports vs non-sports.
// Non-sports = cool family (blues ? purples ? teal).
export const CAT_COLORS = {
  "Football":        "#c0392b",  // deep red     -+
  "Basketball":      "#e67e22",  // orange       |
  "Soccer":          "#827717",  // olive        | warm = sports
  "Other sport":     "#f0b429",  // amber/gold   -+
  "Politics":        "#1565c0",  // deep blue    -+
  "Economics":       "#0891b2",  // teal-blue - cool = non-sports
  "Entertainment":   "#6d28d9",  // purple
  "Other non-sport": "#047857",  // dark green   -+
};

// -- Team maps for game-ticker parsing ----------------------------------------
export const NFL_TEAMS = {
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
export const NBA_TEAMS = {
  ATL:"Hawks", BKN:"Nets", BOS:"Celtics", CHA:"Hornets", CHI:"Bulls",
  CLE:"Cavaliers", DAL:"Mavericks", DEN:"Nuggets", DET:"Pistons",
  GSW:"Warriors", HOU:"Rockets", IND:"Pacers", LAC:"Clippers", LAL:"Lakers",
  MEM:"Grizzlies", MIA:"Heat", MIL:"Bucks", MIN:"Wolves", NOP:"Pelicans",
  NYK:"Knicks", OKC:"Thunder", ORL:"Magic", PHI:"76ers", PHX:"Suns",
  POR:"Blazers", SAC:"Kings", SAS:"Spurs", TOR:"Raptors", UTA:"Jazz",
  WAS:"Wizards",
};
export const MLB_TEAMS = {
  ARI:"Diamondbacks", ATL:"Braves", BAL:"Orioles", BOS:"Red Sox", CHC:"Cubs",
  CWS:"White Sox", CIN:"Reds", CLE:"Guardians", COL:"Rockies", DET:"Tigers",
  HOU:"Astros", KC:"Royals", LAA:"Angels", LAD:"Dodgers", MIA:"Marlins",
  MIL:"Brewers", MIN:"Twins", NYM:"Mets", NYY:"Yankees", OAK:"Athletics",
  PHI:"Phillies", PIT:"Pirates", SD:"Padres", SEA:"Mariners", SF:"Giants",
  STL:"Cardinals", TB:"Rays", TEX:"Rangers", TOR:"Blue Jays", WSH:"Nationals",
  ATH:"Athletics",
};
export const NHL_TEAMS = {
  ANA:"Ducks", ARI:"Coyotes", BOS:"Bruins", BUF:"Sabres", CAR:"Hurricanes",
  CBJ:"Blue Jackets", CGY:"Flames", CHI:"Blackhawks", COL:"Avalanche",
  DAL:"Stars", DET:"Red Wings", EDM:"Oilers", FLA:"Panthers", LA:"Kings",
  LAK:"Kings", MIN:"Wild", MTL:"Canadiens", NJ:"Devils", NJD:"Devils",
  NSH:"Predators", NYI:"Islanders", NYR:"Rangers", OTT:"Senators",
  PHI:"Flyers", PIT:"Penguins", SEA:"Kraken", SJ:"Sharks", SJS:"Sharks",
  STL:"Blues", TB:"Lightning", TBL:"Lightning", TOR:"Maple Leafs",
  UTA:"Utah HC", VAN:"Canucks", VGK:"Golden Knights", WPG:"Jets", WSH:"Capitals",
};
export const SOCCER_TEAMS = {
  RMA:"Real Madrid", FCB:"Barcelona", BAR:"Barcelona", ATM:"Atletico Madrid",
  MCI:"Man City", MCFC:"Man City", MUN:"Man United", LIV:"Liverpool",
  ARS:"Arsenal", CHE:"Chelsea", TOT:"Tottenham", NEW:"Newcastle",
  BAY:"Bayern", BVB:"Dortmund", PSG:"PSG", JUV:"Juventus", INT:"Inter",
  ACM:"AC Milan", NAP:"Napoli", POR:"Porto", BEN:"Benfica", SPOR:"Sporting CP",
  AJAX:"Ajax",
  // BMU = alternate 3-letter code Kalshi uses for Bayern in some UCL game tickers
  BMU:"Bayern",
};
// FIFA World Cup 2026 national-team codes, used by KXWCGAME / KXWCADVANCE /
// KXWCSPREAD / KXWCSCORE (all 48 tournament teams; distinct dict from
// SOCCER_TEAMS's club codes to avoid collisions, e.g. club COL vs country COL).
export const WC_TEAMS = {
  ARG:"Argentina", AUS:"Australia", AUT:"Austria", BEL:"Belgium",
  BIH:"Bosnia & Herzegovina", BRA:"Brazil", CAN:"Canada", CIV:"Ivory Coast",
  COD:"DR Congo", COL:"Colombia", CPV:"Cabo Verde", CRO:"Croatia",
  CUW:"Curacao", CZE:"Czechia", DZA:"Algeria", ECU:"Ecuador",
  EGY:"Egypt", ENG:"England", ESP:"Spain", FRA:"France",
  GER:"Germany", GHA:"Ghana", HTI:"Haiti", IRI:"Iran",
  IRQ:"Iraq", JOR:"Jordan", JPN:"Japan", KOR:"South Korea",
  KSA:"Saudi Arabia", MAR:"Morocco", MEX:"Mexico", NED:"Netherlands",
  NOR:"Norway", NZL:"New Zealand", PAN:"Panama", PAR:"Paraguay",
  POR:"Portugal", QAT:"Qatar", RSA:"South Africa", SCO:"Scotland",
  SEN:"Senegal", SUI:"Switzerland", SWE:"Sweden", TUN:"Tunisia",
  TUR:"Turkey", URU:"Uruguay", USA:"USA", UZB:"Uzbekistan",
  // 2026-07-23: KXMENWORLDCUP-26 (outright tournament winner, distinct ticker
  // family from the per-game KXWC* markets above) uses 2-letter ISO codes, not
  // these 3-letter FIFA codes. Only adding codes confirmed against real
  // winner_ticker data (KXMENWORLDCUP-26-ES = Spain, the 2026 champion) rather
  // than guessing all 48 -- an unverified guess here is worse than a fallback
  // to the raw code. Add more as they're confirmed.
  ES:"Spain",
};
export const CRICKET_TEAMS = {
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
export const IPL_TEAMS = {
  CSK:"Chennai Super Kings", DC:"Delhi Capitals", GT:"Gujarat Titans",
  KKR:"Kolkata Knight Riders", LSG:"Lucknow Super Giants",
  MI:"Mumbai Indians", PBKS:"Punjab Kings", RCB:"Royal Challengers",
  RR:"Rajasthan Royals", SRH:"Sunrisers Hyderabad",
};
export const TENNIS_PLAYERS = {
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
  // Added in leaderboard cleanup - confirmed against real market_key data
  ARN:"Arnaldi", FON:"Fonseca", PAU:"Paul", AUG:"Auger-Aliassime",
  COB:"Cobolli", MEN:"Mensik", CER:"Cerundolo", ALT:"Altmaier",
  SHN:"Shnaider",
};
export const CFB_TEAMS = {
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
  // Added in leaderboard cleanup - confirmed against real market_key data
  PITT:"Pittsburgh", TROY:"Troy", JVST:"Jacksonville St.", KENT:"Kent State",
  UCLA:"UCLA", UCF:"UCF", USF:"South Florida", UNT:"North Texas",
  TOL:"Toledo", AKR:"Akron", BAY:"Baylor", ILL:"Illinois",
};
export const CBB_TEAMS = {
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
export const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// PGA Tour player code ? last name
export const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
  RM:"McIlroy",     SS:"Scheffler",  CAME:"Cam Young",  LABE:"Aberg",
  JBRI:"Bradley",
};

// Route a market_key to the right sport-specific team dictionary so e.g. a
// Kalshi MLB "SEA" strike doesn't get labeled "Seahawks".
export function getTeamsForMarket(mk) {
  if (!mk) return ALL_TEAMS;
  if (/^KXNFL/.test(mk))                       return NFL_TEAMS;
  if (/^KXSB-/.test(mk))                       return NFL_TEAMS;
  if (/^KXNCAAF/.test(mk))                     return CFB_TEAMS;
  if (/^KXNBA/.test(mk))                       return NBA_TEAMS;
  if (/^KXNCAAMB|^KXNCAAWB|^KXMARMAD|^KXWMARMAD/.test(mk)) return CBB_TEAMS;
  if (/^KXMLB/.test(mk))                       return MLB_TEAMS;
  if (/^KXNHL/.test(mk))                       return NHL_TEAMS;
  if (/^KXUCL|^KXEPL|^KXLALIGA/.test(mk))      return SOCCER_TEAMS;
  if (/^KXWCGAME|^KXWCADVANCE|^KXWCSPREAD|^KXWCSCORE|^KXMENWORLDCUP/.test(mk)) return WC_TEAMS;
  if (/^KXT20|^KXICC|^KXWBC/.test(mk))         return CRICKET_TEAMS;
  if (/^KXIPL/.test(mk))                       return IPL_TEAMS;
  if (/^KXATP|^KXWTA|^KXWMEN|^KXFOMEN|^KXUSOMEN|^KXAOMEN|^KXAUSOPEN/.test(mk)) return TENNIS_PLAYERS;
  if (/^KXPGATOUR|^KXMASTERS|^KXUSOPEN/.test(mk)) return GOLF_PLAYERS;
  return ALL_TEAMS;
}

export function parseGame(code, teamMap) {
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
export const PGA_EVENTS = {
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
  // Added in leaderboard cleanup - best-effort identification from ticker code
  PGC:     "PGA Championship",
  USO:     "U.S. Open Championship",
  TRAV:    "Travelers Championship",
  RBBCAN:  "RBC Canadian Open",
  CHSC:    "Charles Schwab Challenge",
  THMTPBW: "The Memorial Tournament",
  THCCBN:  "CJ Cup Byron Nelson",
  WMPO:    "WM Phoenix Open",
  "3O":    "3M Open",
  TECHO:   "Texas Children's Houston Open",
  JODC:    "John Deere Classic",
  TOC:     "Tournament of Champions",
  BC:      "Barracuda Championship",
  ZUCONO:  "Zurich Classic of New Orleans",
  FAIO:    "Farmers Insurance Open",
  THAE:    "The American Express",
  WC:      "Wyndham Championship",
  SOOIH:   "Sony Open in Hawaii",
  ONMBC:   "Myrtle Beach Classic",
};

// Roman numeral converter, used only for the Super Bowl year fallback below
// (small numbers only - plenty for Super Bowl LX and beyond).
export function toRoman(num) {
  const vals = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
    [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let n = num, out = "";
  for (const [v, sym] of vals) { while (n >= v) { out += sym; n -= v; } }
  return out;
}

// USPS 2-letter state codes, used by the PRESPARTY<ST>/GOVPARTY<ST>-style
// per-state election tickers below.
export const STATE_NAMES = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California",
  CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia",
  HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa",
  KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland",
  MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri",
  MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey",
  NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio",
  OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
  SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont",
  VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming",
  DC:"D.C.",
};

// Year-suffix futures markets: ticker (with or without "KX") + bare "-YY" ->
// "20YY <Event>". Dict-based (not a growing regex alternation) so a newly-seen
// code is a one-line addition. Add here whenever a fresh single-outcome
// futures/award ticker shows up with no dedicated parser below.
export const FUTURES_YEAR_EVENTS = {
  NBA: "NBA Finals", MLB: "World Series", NHL: "Stanley Cup",
  NCAAF: "CFP National Championship", MARMAD: "NCAA Men's Basketball Tournament",
  WMARMAD: "Women's NCAA Basketball Tournament",
  MASTERS: "Masters Tournament", USOPEN: "US Open (Tennis)",
  WMENSINGLES: "Wimbledon Men's Singles", WMENDOUBLES: "Wimbledon Men's Doubles",
  WWOMENSINGLES: "Wimbledon Women's Singles",
  MENSINGLES: "Australian/French Open Men's Singles", MENDOUBLES: "Australian/French Open Men's Doubles",
  FOMEN: "French Open Men's Singles", FOWOMEN: "French Open Women's Singles",
  FOMENSINGLES: "French Open Men's Singles", FOWOMENSINGLES: "French Open Women's Singles",
  AOMEN: "Australian Open Men's Singles", AOWOMEN: "Australian Open Women's Singles",
  USOMENSINGLES: "US Open Men's Singles (Tennis)", USOWOMENSINGLES: "US Open Women's Singles (Tennis)",
  NFLSBMVP: "Super Bowl MVP", NBACUP: "NBA Cup",
  MLBWORLD: "World Baseball Classic", T20WORLDCUP: "ICC Men's T20 World Cup",
  NBAWEST: "NBA Western Conference Champion", NBAEAST: "NBA Eastern Conference Champion",
  NBAMVP: "NBA MVP", NBAROY: "NBA Rookie of the Year", NBACOY: "NBA Coach of the Year",
  NBAFINALSMVP: "NBA Finals MVP", NBAFINMVP: "NBA Finals MVP", NBAALLSTARMVP: "NBA All-Star MVP",
  NFLMVP: "NFL MVP", HEISMAN: "Heisman Trophy",
  MLBAL: "MLB American League Champion", MLBNL: "MLB National League Champion",
  MLBHRDERBY: "MLB Home Run Derby",
  UCL: "Champions League", IPL: "IPL", PREMIERLEAGUE: "Premier League",
  PGA: "PGA Tour Player of the Year", THEOPEN: "The Open Championship",
  NCAABASEBALL: "College World Series",
  NCAAMBBIG10: "Big Ten Men's Basketball Champion", NCAAMBACC: "ACC Men's Basketball Champion",
  MAYORLA: "LA Mayor", GOVCA: "California Governor", PRESPERSON: "President",
  TIME: "TIME Person of the Year", NOBELPEACE: "Nobel Peace Prize",
  GOVTCUTS: "Government Spending Cuts",
  // Non-"KX" legacy-style tickers (2024 election family)
  POPVOTEMOV: "Popular Vote Margin", ECMOV: "Electoral College Margin",
  POPVOTEMOVSMALL: "Popular Vote Margin (narrow range)",
  POPVOTEMOVSMALLER: "Popular Vote Margin (narrower range)",
  SENATEAZ: "Arizona Senate Race", POWER: "Control of Congress",
  HOUSEMOV: "House Margin", CLOSESTSTATE: "Closest State (Presidential)",
};

export function parseTicker(mk) {
  if (/^KXFEDCHAIRNOM/.test(mk))  return "Next Fed Chair";
  // Flip date before label so "Sep '25 Fed rate decision" reads well when truncated
  const fedM = mk.match(/^KXFEDDECISION-(\d{2})([A-Z]{3})$/);
  if (fedM) {
    const yy = fedM[1], mon = fedM[2];
    return `${mon[0]+mon.slice(1).toLowerCase()} '${yy} Fed rate decision`;
  }
  // Super Bowl for any year not already hard-coded in MKT_NAME_FORCE (which uses
  // the exact "Super Bowl LX" style name for the two most recent games). SB I
  // was Jan 1967 (season 1966), so ticker year YY -> roman numeral (2000+YY-1966).
  const sbFutM = mk.match(/^KXSB-(\d{2})$/);
  if (sbFutM) return `Super Bowl ${toRoman(2000 + +sbFutM[1] - 1966)}`;
  // Year-suffix futures: KX<CODE>-YY → "<YYYY> <Event>". Dict-based (not a giant
  // regex alternation) so adding a newly-seen code is a one-line addition.
  const futYearM = mk.match(/^(?:KX)?([A-Z0-9]+)-(\d{2})$/);
  if (futYearM && FUTURES_YEAR_EVENTS[futYearM[1]]) {
    return `20${futYearM[2]} ${FUTURES_YEAR_EVENTS[futYearM[1]]}`;
  }
  // Politics futures: KXPRESNOMD-YY, KXPRESNOMR-YY → "<YYYY> Dem/Rep Pres. nominee"
  const presNom = mk.match(/^KXPRESNOM([DR])-(\d{2})$/);
  if (presNom) {
    return `20${presNom[2]} ${presNom[1] === "D" ? "Democratic" : "Republican"} Presidential nominee`;
  }
  // NYC Mayor: KXMAYORNYCPARTY-YY → "<YYYY> NYC Mayor (party)"
  const nycMP = mk.match(/^KXMAYORNYCPARTY-(\d{2})$/);
  if (nycMP) return `20${nycMP[1]} NYC Mayor (party winner)`;
  // Gov shutdown length: KX(GOV|GOVT)SHUTLENGTH-YYMMMDD → "Gov shutdown length (started Mon DD, 'YY)"
  // Kalshi has used both the "GOV" and "GOVT" spelling for this family.
  const govShL = mk.match(/^KXGOVT?SHUTLENGTH-(\d{2})([A-Z]{3})(\d{2})$/);
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
  const pgaM = mk.match(/^KXPGATOUR-([A-Z0-9]+?)(\d{2})$/);
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
  if (ncaaWbM) return parseGame(ncaaWbM[1], CBB_TEAMS) ?? null;
  // NBA series (optional trailing round code like R1)
  const nbaSer = mk.match(/^KXNBASERIES-\d{2}([A-Z]+?)(?:R\d+)?$/);
  if (nbaSer) { const g = parseGame(nbaSer[1], NBA_TEAMS); return g ? `${g} (series)` : null; }
  // NFL / college games
  const nflM   = mk.match(/^KXNFLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nflM)   return parseGame(nflM[1],   NFL_TEAMS) ?? null;
  const ncaafM = mk.match(/^KXNCAAFGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (ncaafM) return parseGame(ncaafM[1], CFB_TEAMS) ?? null;
  const cbbM   = mk.match(/^KXNCAAMBGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (cbbM)   return parseGame(cbbM[1],   CBB_TEAMS) ?? null;
  const nbaM   = mk.match(/^KXNBAGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nbaM)   return parseGame(nbaM[1],   NBA_TEAMS) ?? null;
  // MLB / NHL / UCL / IPL / WBC games
  const mlbGame = mk.match(/^KXMLBGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (mlbGame) return parseGame(mlbGame[1], MLB_TEAMS) ?? null;
  const mlbSer = mk.match(/^KXMLBSERIES-\d{2}([A-Z]+)$/);
  if (mlbSer) { const g = parseGame(mlbSer[1], MLB_TEAMS); return g ? `${g} (series)` : null; }
  const nhlGame = mk.match(/^KXNHLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (nhlGame) return parseGame(nhlGame[1], NHL_TEAMS) ?? null;
  const uclGame = mk.match(/^KXUCLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (uclGame) return parseGame(uclGame[1], SOCCER_TEAMS) ?? null;
  const iplGame = mk.match(/^KXIPLGAME-\d{2}[A-Z]{3}\d{2}(?:\d{3,4})?([A-Z]+)$/);
  if (iplGame) return parseGame(iplGame[1], IPL_TEAMS) ?? null;
  // WBC fixture format includes a 4-digit time code (e.g. ...152000USADOM)
  const wbcGame = mk.match(/^KXWBCGAME-\d{2}[A-Z]{3}\d{2}\d{4}([A-Z]+)$/);
  if (wbcGame) return parseGame(wbcGame[1], CRICKET_TEAMS) ?? null;
  // World Cup 2026: match winner (3-way incl. draw), advance-round, spread, exact-score
  const wcGame = mk.match(/^KXWCGAME-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (wcGame) return parseGame(wcGame[1], WC_TEAMS) ?? null;
  const wcAdvance = mk.match(/^KXWCADVANCE-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (wcAdvance) { const g = parseGame(wcAdvance[1], WC_TEAMS); return g ? `${g} (advances)` : null; }
  const wcSpread = mk.match(/^KXWCSPREAD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (wcSpread) { const g = parseGame(wcSpread[1], WC_TEAMS); return g ? `${g} (spread)` : null; }
  const wcScore = mk.match(/^KXWCSCORE-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (wcScore) { const g = parseGame(wcScore[1], WC_TEAMS); return g ? `${g} (exact score)` : null; }
  // ATP/WTA singles matches and T20 cricket matches
  const atpM = mk.match(/^KXATPMATCH-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (atpM) return parseGame(atpM[1], TENNIS_PLAYERS) ?? null;
  const wtaM = mk.match(/^KXWTAMATCH-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (wtaM) return parseGame(wtaM[1], TENNIS_PLAYERS) ?? null;
  const t20M = mk.match(/^KXT20MATCH-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (t20M) return parseGame(t20M[1], CRICKET_TEAMS) ?? null;
  // PGA round-1 leader - reuses the PGA_EVENTS event-code lookup above
  const pgaR1 = mk.match(/^KXPGAR1LEAD-([A-Z]+)(\d{2})$/);
  if (pgaR1) {
    const evt = PGA_EVENTS[pgaR1[1]];
    return evt ? `20${pgaR1[2]} ${evt} - Round 1 Leader` : null;
  }
  // Recurring dated "will Trump be mentioned" market
  const trumpMentionM = mk.match(/^KXTRUMPMENTION-(\d{2})([A-Z]{3})(\d{2})$/);
  if (trumpMentionM) {
    const mon = trumpMentionM[2];
    return `Trump mention (${mon[0]+mon.slice(1).toLowerCase()} ${parseInt(trumpMentionM[3],10)}, 20${trumpMentionM[1]})`;
  }
  // Per-state presidential-party-winner / popular-vote-margin tickers
  const presPartyStateM = mk.match(/^PRESPARTY([A-Z]{2})-(\d{2})$/);
  if (presPartyStateM) {
    const state = STATE_NAMES[presPartyStateM[1]];
    return state ? `20${presPartyStateM[2]} Presidential Winner (${state})` : null;
  }
  const popVoteStateM = mk.match(/^POPVOTEMOV([A-Z]{2})-(\d{2})$/);
  if (popVoteStateM) {
    const state = STATE_NAMES[popVoteStateM[1]];
    return state ? `20${popVoteStateM[2]} Popular Vote Margin (${state})` : null;
  }
  const govPartyStateM = mk.match(/^GOVPARTY([A-Z]{2})-(\d{2})$/);
  if (govPartyStateM) {
    const state = STATE_NAMES[govPartyStateM[1]];
    return state ? `20${govPartyStateM[2]} Governor's Race (${state})` : null;
  }
  // Per-state Senate primary/race by party, e.g. KXSENATETXR-26 (R), KXSENATETXD-26 (D)
  const senatePartyM = mk.match(/^KXSENATE([A-Z]{2})([RD])-(\d{2})$/);
  if (senatePartyM) {
    const state = STATE_NAMES[senatePartyM[1]];
    const party = senatePartyM[2] === "R" ? "Republican" : "Democratic";
    return state ? `20${senatePartyM[3]} ${state} Senate - ${party}` : null;
  }
  // NFL anytime-touchdown-scorer prop for a specific game
  const nflAnyTdM = mk.match(/^KXNFLANYTD-\d{2}[A-Z]{3}\d{2}([A-Z]+)$/);
  if (nflAnyTdM) { const g = parseGame(nflAnyTdM[1], NFL_TEAMS); return g ? `${g} - Anytime TD scorer` : null; }
  // NBA Finals series-score prediction, e.g. KXNBASERIESSCORE-26NYKSASFIN
  const nbaSeriesScoreM = mk.match(/^KXNBASERIESSCORE-\d{2}([A-Z]+)FIN$/);
  if (nbaSeriesScoreM) { const g = parseGame(nbaSeriesScoreM[1], NBA_TEAMS); return g ? `${g} (Finals series score)` : null; }
  // March Madness by round/game, e.g. KXMARMAD-25R4G2 (round is the number of
  // teams left: 4 = Final Four, 8 = Elite Eight, etc.)
  const marMadRoundM = mk.match(/^KXW?MARMAD-(\d{2})R(\d+)G(\d+)$/);
  if (marMadRoundM) {
    const roundNames = {"4": "Final Four", "8": "Elite Eight", "16": "Sweet 16", "32": "Round of 32", "64": "Round of 64"};
    const roundLabel = roundNames[marMadRoundM[2]] || `Round of ${marMadRoundM[2]}`;
    const women = mk.startsWith("KXWMARMAD") ? "Women's " : "";
    return `20${marMadRoundM[1]} ${women}NCAA Tournament - ${roundLabel} Game ${marMadRoundM[3]}`;
  }
  return null;
}

// -- Forced market-name overrides (take priority over Kalshi's market_name) ---
// Use when Kalshi's own label is misleading or missing context that matters.
export const MKT_NAME_FORCE = {
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
export const MKT_NAME_OVERRIDES = {
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
  // Added in full leaderboard cleanup - one-off tickers with no reusable pattern
  "KXMENWORLDCUP-26":           "2026 Men's World Cup",
  "KXNEXTTEAMNBA-26LJAM":       "LeBron James's next team (2026)",
  "KXNEXTTEAMGIANNIS-26GANT":   "Giannis Antetokounmpo's next team (2026)",
  "KXBTCMAX150-25":             "Bitcoin reaches $150,000 (2025)",
  "KXBTCMAX125-1":              "Bitcoin reaches $125,000",
  "KXBTCMAXY-25":               "Bitcoin max price (2025)",
  "KXBTCMINY-25-2":             "Bitcoin min price (2025)",
  "KXBTCY-27JAN0100":           "Bitcoin price (Jan 1, 2027)",
  "KXETHMAXY-25DEC31":          "Ethereum max price (2025)",
  "KXETHY-27JAN0100":           "Ethereum price (Jan 1, 2027)",
  "KXSURVIVOR-26DEC31":         "Survivor winner (2026 season)",
  "KXHORMUZNORM-26MAR17":       "Strait of Hormuz normalizes by Mar 17, 2026",
  "KXOSCARACTO-26":             "2026 Oscar - Best Actor",
  "KXOSCARPIC-26":              "2026 Oscar - Best Picture",
  "KXTEAMSINSB-26":             "Teams in Super Bowl LX",
  "KXKY4R-26":                  "Kentucky's 4th District race (2026)",
  "INXD-24DEC31":               "S&P 500 level (Dec 31, 2024)",
  "INXY-23DEC29":               "S&P 500 level (Dec 29, 2023)",
  "NASDAQ100Y-24DEC31":         "Nasdaq-100 level (Dec 31, 2024)",
  "KXWOHOCKEY-MEN26CGOLD":      "2026 Winter Olympics - Men's Hockey Gold",
  "KXRATECUTCOUNT-25DEC31":     "Number of Fed rate cuts in 2025",
  "KXLLM1-25DEC31":             "Top AI model (as of Dec 31, 2025)",
  "KXDHSFUND":                  "DHS funding",
  "KXATTENDSOTU":               "State of the Union attendance",
  "KXELECTIONMOVZOHRAN-25":     "Zohran Mamdani election movement (2025)",
  "KXELECTIONMOVNJGOV-25NOV04": "NJ Governor election movement (Nov 4, 2025)",
  "KXUSAIRANAGREEMENT-27":      "US-Iran agreement by 2027",
  "KXMICHCOACH-26":             "2026 Michigan head coach",
  "CONTROLH-2026":              "Control of the House (2026)",
  "KXUFCMOV-26JUN14TOPGAE":     "Topuria vs. Gaethje - method of victory",
  "KXPGARYDER-RC25":            "2025 Ryder Cup",
  "KXDJTJOINTSESSION-25MAR04":  "Trump joint session address (Mar 4, 2025)",
  "KXCANADAPM-45":              "Canadian Prime Minister (45th Parliament)",
  "KXNASCARRACE-DAY26":         "2026 Daytona 500",
};

// -- Shared winner-display logic -----------------------------------------------
// Hard overrides for winner display, keyed on winner_ticker.
export const WINNER_OVERRIDES = {
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
export const WINNER_BY_MARKET = {
  "KXPGATOUR-MAST26":    "McIlroy",
  "KXMARMAD-26":         "Michigan",
  "KXMASTERS-25":        "McIlroy",
  "KXKHAMENEIOUT-AKHA":  "it's complicated",
  "KXSUPERBOWLAD-SB2026":"Various",
};

export function fmtWinner(d) {
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
    // A winner_ticker identical to the market_key (single-outcome market, no
    // -YES/-NO or team suffix) means the plain yes/no *is* the full answer.
    const isBinaryOutcome = wt && (wt === mk || /-(YES|NO)$/i.test(wt));
    if (isBinaryOutcome || !/^(yes|no)$/i.test(w)) return w;
  }
  if (w.startsWith("::")) { const a = w.replace(/^::\s*/, "").trim(); if (a) return a; }
  if (wt && wt !== mk) {
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    // Soccer 3-way markets (World Cup, UCL, etc.) settle to a "TIE" outcome code for draws.
    if (short === "TIE") return "Draw";
    const teamMap = getTeamsForMarket(mk);
    // Spread winners like "SEA10" -> "Seahawks -10"
    if (/SPREAD/.test(mk)) {
      const sp = short.match(/^([A-Z]+)(\d+)$/);
      if (sp) return `${teamMap[sp[1]] ?? sp[1]} -${sp[2]}`;
    }
    // World Cup exact-score outcomes like "MEX2ECU0" -> "Mexico 2-0 Ecuador"
    if (/^KXWCSCORE/.test(mk)) {
      const sc = short.match(/^([A-Z]{3})(\d+)([A-Z]{3})(\d+)$/);
      if (sc) return `${teamMap[sc[1]] ?? sc[1]} ${sc[2]}-${sc[4]} ${teamMap[sc[3]] ?? sc[3]}`;
    }
    return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
  }
  if (WINNER_BY_MARKET[mk]) return WINNER_BY_MARKET[mk];
  return "-";
}

// -- Last-resort generic fallback ----------------------------------------------
// Reached only when MKT_NAME_FORCE/market_name/MKT_NAME_OVERRIDES/parseTicker
// all fail to produce a name - i.e. a ticker family or team/player code we've
// never seen before. Rather than showing the raw ticker, greedily tokenize the
// prefix against known sport/market vocabulary (same longest-match strategy as
// parseGame) and append any parseable date/year, so a brand-new ticker still
// reads as words. This is a readability safety net, not a precise parser -
// unrecognized chunks are shown as-is (upper case) rather than blocking the
// whole label. Extend TICKER_VOCAB (not this function) as new vocabulary shows up.
export const TICKER_VOCAB = {
  // Leagues / tours / orgs
  NFL: "NFL", NBA: "NBA", WNBA: "WNBA", MLB: "MLB", NHL: "NHL",
  NCAAF: "NCAAF", NCAAMB: "NCAA Men's Basketball", NCAAWB: "NCAA Women's Basketball",
  NCAAB: "NCAA Basketball", NCAABASEBALL: "NCAA Baseball", MARMAD: "March Madness",
  WMARMAD: "Women's March Madness", PGATOUR: "PGA Tour", PGA: "PGA", LPGA: "LPGA",
  ATP: "ATP", WTA: "WTA", UFC: "UFC", MMA: "MMA", BOXING: "Boxing", NASCAR: "NASCAR",
  INDY: "IndyCar", F1: "F1", IPL: "IPL", T20: "T20", WBC: "World Baseball Classic",
  UCL: "Champions League", EPL: "Premier League", LALIGA: "La Liga", FIFA: "FIFA",
  WORLDCUP: "World Cup", OLYMPICS: "Olympics", ESPORTS: "Esports", WO: "Olympics",
  // Common market-type / award suffixes
  GAME: "Game", MATCH: "Match", SPREAD: "Spread", TOTAL: "Total", SERIES: "Series",
  SERIESSCORE: "Series Score", MVP: "MVP", FINALSMVP: "Finals MVP", ALLSTARMVP: "All-Star MVP",
  ROY: "Rookie of the Year", COY: "Coach of the Year", CHAMP: "Championship",
  CHAMPS: "Champions", FINALS: "Finals", PLAYOFF: "Playoff", PLAYOFFS: "Playoffs",
  WEST: "West", EAST: "East", NORTH: "North", SOUTH: "South", DIVISION: "Division",
  CONFERENCE: "Conference", DERBY: "Derby", OPEN: "Open", TOUR: "Tour", CUP: "Cup",
  BOWL: "Bowl", DRAFT: "Draft", MENTION: "Mention", MENTIONS: "Mentions",
  RACE: "Race", FIGHT: "Fight", MOV: "Movement", NOM: "Nominee", NOMINEE: "Nominee",
  COACH: "Coach", ADVANCE: "Advance", SCORE: "Score", ANYTD: "Anytime TD",
  // Frequently-seen abbreviations in one-off futures/props
  DHS: "DHS", SOTU: "State of the Union", FUND: "Funding", GOV: "Governor",
  GOVT: "Government", SHUT: "Shutdown", SHUTDOWN: "Shutdown", LENGTH: "Length",
  SENATE: "Senate", HOUSE: "House", MAYOR: "Mayor", PRES: "President",
  PARTY: "Party", ELECTION: "Election", VOTE: "Vote", CONTROL: "Control",
  BTC: "Bitcoin", ETH: "Ethereum", MAX: "Max", MIN: "Min", RATECUT: "Rate Cut",
  RATECUTCOUNT: "Rate Cut Count", OSCAR: "Oscar", GRAM: "Grammy", EMMY: "Emmy",
  GOLDENGLOBE: "Golden Globe", NOBEL: "Nobel", NOBELPEACE: "Nobel Peace Prize",
  SURVIVOR: "Survivor", TIME: "Time", HEISMAN: "Heisman", LLM: "AI Model",
  NEXTTEAM: "Next Team", AGREEMENT: "Agreement",
};

export function tokenizeVocab(prefix) {
  const keys = Object.keys(TICKER_VOCAB).sort((a, b) => b.length - a.length);
  const out = [];
  let rem = prefix;
  while (rem.length) {
    const hit = keys.find(k => rem.startsWith(k));
    if (hit) { out.push(TICKER_VOCAB[hit]); rem = rem.slice(hit.length); continue; }
    // No recognized token at the current position - consume up to the next
    // spot where one starts (or the rest of the string) as an as-is chunk.
    let cut = rem.length;
    for (const k of keys) {
      const idx = rem.indexOf(k, 1);
      if (idx !== -1 && idx < cut) cut = idx;
    }
    out.push(rem.slice(0, cut));
    rem = rem.slice(cut);
  }
  return out;
}

export function humanizeUnresolved(mk) {
  if (!mk) return null;
  const dashIdx = mk.indexOf("-");
  const prefix = (dashIdx === -1 ? mk : mk.slice(0, dashIdx)).replace(/^KX/, "");
  const rest = dashIdx === -1 ? "" : mk.slice(dashIdx + 1);
  if (!prefix) return null;
  const words = tokenizeVocab(prefix);
  let label = words.join(" ");
  // Append a human date or year from the remainder, if present, for context.
  const dateM = rest.match(/(\d{2})([A-Z]{3})(\d{2})/);
  const yearM = rest.match(/^(\d{2})(?:$|[^0-9])/);
  if (dateM) {
    const mon = dateM[2];
    label += ` (${mon[0]+mon.slice(1).toLowerCase()} ${parseInt(dateM[3],10)}, 20${dateM[1]})`;
  } else if (yearM) {
    label += ` (20${yearM[1]})`;
  }
  return label || null;
}

export function bestName(d) {
  const mk = (d.market_key ?? "").trim();
  if (MKT_NAME_FORCE[mk]) return MKT_NAME_FORCE[mk];
  const mn = (d.market_name || "").trim();
  // Skip market_name if it's just echoing the ticker key (Kalshi leaves it blank)
  if (mn && mn !== mk) return mn;
  const imn = (d["i.market_name"] || "").trim();
  if (imn && imn !== mk) return imn;
  return MKT_NAME_OVERRIDES[mk] || parseTicker(mk) || humanizeUnresolved(mk) || mk;
}

// Human names for specific full outcome tickers (keyed on the complete ticker
// string, e.g. "PRES-2024-KH", for precision beyond what fmtStrike's generic
// suffix-decoding can do).
export const TOP_OUTCOME_NAMES = {
  "PRES-2024-KH":                     "Harris",
  "POPVOTE-24-D":                     "Harris",
  "KXPGATOUR-MAST26-SSCH":            "Scheffler",
  "KXMARMAD-26-CONN":                 "UConn",
  "KXFEDCHAIRNOM-29-JS":              "Shelton",
  "KXMAYORNYCPARTY-25-AC":            "Cuomo",
  "KXNFLNFCCHAMP-25-LA":              "Rams",
  "KXFIRSTSUPERBOWLSONG-26FEB09-TIT": "Titi Me Pregunto",
  "KXBOXING-25DEC19JPAUAJOS-JPAU":    "Jake Paul",
  // -TCRA = Terence Crawford (Canelo–Crawford, Sep 13 2025); matches WINNER_OVERRIDES.
  "KXBOXING-25SEP13CALVTCRA-TCRA":    "Crawford",
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

export function fmtStrike(top_outcome, market_key) {
  if (!top_outcome) return "-";
  if (TOP_OUTCOME_NAMES[top_outcome]) return TOP_OUTCOME_NAMES[top_outcome];
  const mk = (market_key ?? "").trim();
  const short = mk
    ? top_outcome.replace(mk + "-", "")
    : top_outcome.split("-").pop();
  // Soccer 3-way markets (World Cup, UCL, etc.) settle to a "TIE" outcome code for draws.
  if (short === "TIE") return "Draw";
  // Fed rate outcomes
  if (short === "H0") return "Hold";
  if (/^H(\d+)$/.test(short)) return `+${short.slice(1)} bps (hike)`;
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
  // World Cup exact-score outcomes like "MEX2ECU0" -> "Mexico 2-0 Ecuador"
  if (/^KXWCSCORE/.test(mk)) {
    const sc = short.match(/^([A-Z]{3})(\d+)([A-Z]{3})(\d+)$/);
    if (sc) {
      const teamMap = getTeamsForMarket(mk);
      return `${teamMap[sc[1]] ?? sc[1]} ${sc[2]}-${sc[4]} ${teamMap[sc[3]] ?? sc[3]}`;
    }
  }
  // top_outcome identical to market_key (single-outcome market, nothing to
  // strip) - there's no code left to decode, so don't leak the raw ticker.
  if (short === mk) return "-";
  // Sport-aware team / player fallback
  const teamMap = getTeamsForMarket(mk);
  return teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short;
}

// Map a row's Kalshi category to a display category used for row coloring:
// Sports is split into Football / Basketball / Other sport for legibility.
export function getSportDisplayCategory(d) {
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
  // World Cup (KXWC*) + the major club leagues -- see categories.md's
  // classifyTreemapTicker for the exhaustive soccer prefix list this mirrors.
  if (/^KXWC|^KXEPL|^KXUCL|^KXLALIGA|^KXBUNDESLIGA|^KXSERIEA|^KXLIGUE|^KXMLS|^KXFIFA|^KXMENWORLDCUP|^KXCLUBWC/.test(mk)) return "Soccer";
  return "Other sport";
}
