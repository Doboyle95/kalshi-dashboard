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
  // Kalshi spells the Nationals BOTH ways across its own MLB families: WSH in
  // KXMLBGAME/KXMLBF5/KXMLBF3, WAS in KXMLB, KXMLBNL, KXMLBNEXTTEAM, KXMLBFODTEAMS and
  // KXNEXTTEAMMLB. Both confirmed from the market titles ("Will the Washington win the
  // Pro Baseball Championship?"). Without this the WAS families fall back to the raw
  // code -- and before the ALL_TEAMS default was retired they read "Wizards".
  WAS:"Nationals",
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
  //
  // 2026-08-24: AR confirmed the same way, from top_outcome once the producer
  // started measuring it -- KXMENWORLDCUP-26-AR is the published busiest outcome
  // of the largest market on the site. These two are every code the
  // published file uses for this market. AR mattered more than an unnamed code
  // would suggest: a miss here does not fall back to "AR", it falls through
  // fmtStrike/fmtWinner's last line to GOLF_PLAYERS then TENNIS_PLAYERS, and
  // TENNIS_PLAYERS.AR is Rublev -- so row 1 of the Individual Market Leaderboard
  // read "Rublev" as the World Cup's busiest outcome. (TENNIS_PLAYERS.ES is
  // Swiatek, so ES only reads "Spain" because WC_TEAMS is consulted first.)
  // Any 2-letter code added here must be checked against a real ticker.
  AR:"Argentina",
  ES:"Spain",
};

// KXMENWORLDCUP-26 (outright tournament winner) names 50 of its 66 outcomes with
// 2-letter ISO codes and the other 16 with the same 3-letter FIFA codes WC_TEAMS
// already holds. Kept as a SEPARATE map spread over WC_TEAMS rather than merged
// into it: parseGame() tokenizes KXWCGAME/KXWCADVANCE/KXWCSPREAD/KXWCSCORE codes
// by longest-match over Object.keys(teamMap), so adding 50 two-letter keys to
// WC_TEAMS itself would change how the per-game markets split their codes.
//
// Every entry below was read off that market's own title in market_metadata
// ("Will the Canada win the 2026 Men's World Cup?" -> CA:"Canada"), which is the
// bar the note above sets: any 2-letter code here must be checked against a real
// ticker. Spellings follow Kalshi's titles, which already agree with WC_TEAMS'
// (GB is "England", US is "USA", KR is "South Korea").
export const WC_OUTRIGHT_ISO2 = {
  AE:"United Arab Emirates", AR:"Argentina", AT:"Austria", AU:"Australia",
  BE:"Belgium", BR:"Brazil", CA:"Canada", CH:"Switzerland", CL:"Chile",
  CM:"Cameroon", CN:"China", CO:"Colombia", CR:"Costa Rica", DE:"Germany",
  DK:"Denmark", EC:"Ecuador", ES:"Spain", FR:"France", GB:"England", GE:"Georgia",
  GH:"Ghana", GR:"Greece", HR:"Croatia", HU:"Hungary", IE:"Republic of Ireland",
  IR:"Iran", IT:"Italy", JP:"Japan", KR:"South Korea", MA:"Morocco", MX:"Mexico",
  NI:"Northern Ireland", NL:"Netherlands", NO:"Norway", PE:"Peru", PL:"Poland",
  PT:"Portugal", PY:"Paraguay", RO:"Romania", RS:"Serbia", SA:"Saudi Arabia",
  SC:"Scotland", SE:"Sweden", SN:"Senegal", TN:"Tunisia", TR:"Turkey", UA:"Ukraine",
  US:"USA", UY:"Uruguay", WA:"Wales",
};
export const WC_OUTRIGHT_TEAMS = {...WC_TEAMS, ...WC_OUTRIGHT_ISO2};
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
//
// ⚠ NO LONGER the routing default -- see the note on getTeamsForMarket. It mixes pro
// nicknames with school names, so applying it to an unclassified market produced
// "Mavericks" for rain in Dallas and "Seahawks" for a Spotify chart. Kept exported
// because categories.md imports it.
export const ALL_TEAMS = {...NFL_TEAMS, ...NBA_TEAMS, ...CBB_TEAMS};

// Schools, for the college markets that are neither KXNCAAF (football, already routed
// to CFB_TEAMS) nor KXNCAAMB/KXNCAAWB (basketball, already routed to CBB_TEAMS):
// college baseball, softball, hockey, lacrosse, soccer, the conference regular-season
// and tournament markets, and KXNCAABBGAME.
//
// The point of a college-only map is what it LEAVES OUT. Under the old ALL_TEAMS
// default these markets could be answered by an NBA or NFL entry, so college lacrosse
// rendered UTA as "Jazz" and college soccer rendered DET as "Pistons".
export const COLLEGE_TEAMS = {...CFB_TEAMS, ...CBB_TEAMS};

// Routing target for a family whose outcome codes nothing here can decode and whose
// codes the ALL_TEAMS default would answer WRONGLY. Returning this leaves them as
// raw codes, visible for triage -- the outcome this file prefers to a wrong name.
export const NO_DICTIONARY = {};

// PGA Tour player code ? last name
export const GOLF_PLAYERS = {
  SSCH:"Scheffler", RMCI:"McIlroy",  JROS:"Rose",      TFLE:"Fleetwood",
  CMOR:"Morikawa",  CGOT:"Gotterup", JSPA:"Spaun",     RMAC:"MacIntyre",
  ABHA:"Bhatia",    KBRA:"Bradley",  SBUR:"Burns",      JHAT:"Hatton",
  JTHA:"Thomas",    XSCI:"Scheffler",LWEN:"Wiesberger", RPAL:"Palmer",
  RM:"McIlroy",     SS:"Scheffler",  CAME:"Cam Young",  LABE:"Aberg",
  JBRI:"Bradley",
};

// Best Picture nominees for the 2026 ceremony. Read off each market's own subtitle
// in market_metadata (KXOSCARPIC-26-SIN -> "Sinners"), never inferred from the code:
// SIN is the film "Sinners", and guessing would have produced the tennis player
// Sinner, which is exactly what this map exists to stop.
//
// Deliberately scoped to the -26 ceremony in getTeamsForMarket below. Unlike state
// or ISO country codes, an award's code set IS its nominee list and is re-minted
// every year, so a -27 market reusing SIN for a different film would be given a
// confidently wrong name by a family-wide map. KXOSCARPIC-27 falls back to its raw
// codes until its own map is added -- the same triage path PGA_EVENTS describes, and
// the reason there is no map for the other fourteen KXOSCAR* award families.
//
// TIE is absent on purpose: decodeOutcomeSuffix answers "TIE" from a shared branch
// above, before any dictionary is consulted.
export const OSCAR_BEST_PICTURE_26 = {
  AHO:"A House of Dynamite", AVA:"Avatar: Fire and Ash", BUG:"Bugonia", F1:"F1",
  FRAN:"Frankenstein", HAM:"Hamnet", ITW:"It Was Just an Accident", JAY:"Jay Kelly",
  MAR:"Marty Supreme", NOO:"No Other Choice", ONE:"One Battle After Another",
  REN:"Rental Family", SEC:"The Secret Agent", SEN:"Sentimental Value",
  SIN:"Sinners", SPRI:"Springsteen: Deliver Me from Nowhere", TRA:"Train Dreams",
  WIC:"Wicked: For Good",
};

// Route a market_key to the right sport-specific team dictionary so e.g. a
// Kalshi MLB "SEA" strike doesn't get labeled "Seahawks".
// ⚠ The default is NO_DICTIONARY, not ALL_TEAMS. ALL_TEAMS is NFL + NBA + college
// basketball, so leaving it as the fallback meant those codes were applied to every
// market we had not classified -- 21,879 markets across 1,061 families, of which about
// 88% got a name that is simply wrong: "Seahawks" for the top song on Spotify,
// "Mavericks" for whether it rains in Dallas, "Saints" for what Trump says in the State
// of the Union, "Hornets" for the tennis player Maxime Chazal. It is the same defect as
// the golf/tennis cross-map removed in 91612b4a1, one level down: a dictionary applied
// to a market it has nothing to do with. An unrouted family now falls back to the raw
// code, which is visible and triageable.
export function getTeamsForMarket(mk) {
  if (!mk) return NO_DICTIONARY;
  // "What will X say" markets name PHRASES the speaker might utter, never teams. Must
  // stay ABOVE the league prefixes: KXNBAMENTION, KXMLBMENTION, KXNFLMENTION,
  // KXNHLMENTION, KXWCMENTION, KXATPMENTION and KXWBCMENTION are all matched by an
  // existing league branch below, so without this the announcers' phrases are looked up
  // in that league's team dictionary. 60+ series, tens of thousands of markets.
  if (/MENTION/.test(mk))                      return NO_DICTIONARY;
  if (/^KXNFL/.test(mk))                       return NFL_TEAMS;
  if (/^KXSB-/.test(mk))                       return NFL_TEAMS;
  if (/^KXNCAAF/.test(mk))                     return CFB_TEAMS;
  if (/^KXNBA/.test(mk))                       return NBA_TEAMS;
  if (/^KXNCAAMB|^KXNCAAWB|^KXMARMAD|^KXWMARMAD/.test(mk)) return CBB_TEAMS;
  if (/^KXMLB/.test(mk))                       return MLB_TEAMS;
  if (/^KXNHL/.test(mk))                       return NHL_TEAMS;
  if (/^KXUCL|^KXEPL|^KXLALIGA/.test(mk))      return SOCCER_TEAMS;
  if (/^KXWCGAME|^KXWCADVANCE|^KXWCSPREAD|^KXWCSCORE/.test(mk)) return WC_TEAMS;
  // Outright winner market -- 2-letter ISO codes on top of the FIFA ones.
  if (/^KXMENWORLDCUP/.test(mk))               return WC_OUTRIGHT_TEAMS;
  if (/^KXT20|^KXICC|^KXWBC/.test(mk))         return CRICKET_TEAMS;
  if (/^KXIPL/.test(mk))                       return IPL_TEAMS;
  // The women's singles families are spelled W-WOMEN / USO-WOMEN / FO-WOMEN / AO-WOMEN,
  // which none of the men's prefixes match; before they were listed here they reached
  // TENNIS_PLAYERS only via the cross-map that used to end decodeOutcomeSuffix.
  // KXITF* is deliberately NOT here. The ITF circuit is a different, far larger player
  // pool than the tour events TENNIS_PLAYERS covers, and its 3-letter codes abbreviate
  // ITF players: KXITFMATCH's MEN is Joao Mendes, FON is Oriol Font, SHE is Suryanshi
  // Shekhawat. TENNIS_PLAYERS reads those as Mensik, Fonseca and Shelton. Routing the
  // family here scored 785 confidently wrong names, so it falls to the raw code instead.
  if (/^KXATP|^KXWTA|^KXWMEN|^KXWWOMEN|^KXFOMEN|^KXFOWOMEN|^KXUSOMEN|^KXUSOWOMEN|^KXAOMEN|^KXAOWOMEN|^KXAUSOPEN/.test(mk)) return TENNIS_PLAYERS;
  // PGA here is the Producers GUILD of America, not the Professional Golfers'
  // Association: KXPGAAWARDS-26-DOC names films ("Will Sentimental Value win the
  // Darryl F. Zanuck Award for Outstanding Producer..."). It must be taken out of the
  // KXPGA* golf prefix below, and it cannot simply fall through to the ALL_TEAMS
  // default either -- that answers the film code ALA with CBB's "Alabama". Must stay
  // ABOVE the golf line.
  if (/^KXPGAAWARDS/.test(mk))                 return NO_DICTIONARY;
  // KXPGA* covers the championship (KXPGA-25), the round-lead, top-N, head-to-head
  // and cut markets. KXUSOPEN is the GOLF US Open ("Will the Aaron Baddeley win the
  // US Open Championship?"); the tennis one is KXUSOMEN*/KXUSOWOMEN*, matched above.
  //
  // The exclusion is KXPGARYDER- with the dash, not KXPGARYDER: the Ryder Cup team
  // market (KXPGARYDER-RC25) settles to USA / EU / EUR / TIE, but KXPGARYDERTOP-25
  // ("Will Bryson DeChambeau win the Ryder Cup Top Points Scorer?") is an ordinary
  // player market with 4-letter golf codes. A dashless exclusion swallows both and
  // costs KXPGARYDERTOP 18 correct player names.
  if (/^KXPGA(?!RYDER-)|^KXMASTERS|^KXUSOPEN|^KXTHEOPEN/.test(mk)) return GOLF_PLAYERS;
  if (/^CLOSESTSTATE/.test(mk))                return STATE_NAMES;
  if (/^KXOSCARPIC-26/.test(mk))               return OSCAR_BEST_PICTURE_26;
  // College, minus the two families routed above. KXCFPSEED, not KXCFP: KXCFPBELIM is
  // "Will the CFPB be eliminated?" -- the Consumer Financial Protection Bureau.
  // KXNCAABMENTION and KXNCAAMENTION are announcer-phrase markets and are taken out by
  // the MENTION branch at the top.
  if (/^KXNCAA|^KXCOLLEGE|^KXMAKEMARMAD|^KXCFPSEED|^KX(A10|AAC|ACC|BIG10|BIG12|BIGEAST|MW|SEC|WCC|PAC12)REG/.test(mk)) return COLLEGE_TEAMS;
  // "Next team" / "next coach out" markets name a team in ONE league, so each routes to
  // that league rather than to a merged map: the old default answered KXNEXTTEAMMLB's
  // WAS with the NBA's "Wizards" and KXNEXTTEAMNHL's PHI with the NBA's "76ers".
  // Each league below was assigned by checking that family's codes against the maps --
  // 27-34 of 29-34 codes hit the league named, and at most half that for any other.
  // KXNEXTTEAMVERSTAPPEN is deliberately absent: Formula 1, no map here, 0 code hits.
  if (/^KXNEXTTEAM(NBA|GIANNIS|LEBRON|WESTBROOK)|^KXNEXTCOACHOUTNBA/.test(mk)) return NBA_TEAMS;
  if (/^KXNEXTTEAM(NFL|MCLAURIN|MICAH|TYREEK)|^KXNEXTCOACHOUTNFL/.test(mk))    return NFL_TEAMS;
  if (/^KXNEXTTEAM(MLB|SKUBAL)/.test(mk))      return MLB_TEAMS;
  if (/^KXNEXTTEAMNHL/.test(mk))               return NHL_TEAMS;
  // Cricket beyond the KXT20/KXICC/KXWBC/KXIPL families routed above -- Test and ODI
  // only, and anchored on MATCH. Two separate reasons:
  //   - ^KXODI would also catch KXODINVCTFINALS ("Will all players purchase the Odin
  //     more than 3 times at VCT finals?", a Valorant market), and KXBBLGAME is the
  //     German Basketball Bundesliga ("Rostock Seawolves vs Bayern Munich"), not the
  //     Big Bash League.
  //   - The T20 families are NOT here even though they are cricket. Test and ODI are
  //     played by full-member nations, whose 3-letter codes CRICKET_TEAMS holds; T20
  //     adds associate nations and domestic franchises, and their codes collide.
  //     KXWT20MATCH uses IND for INDONESIA in 9 events (KXWT20MATCH-26JUN030200SININD)
  //     and for India in 11 others, so a dictionary keyed on the code alone cannot be
  //     right. Measured 0 title mismatches on every code these two families decode.
  if (/^KXODIMATCH|^KXTESTMATCH/.test(mk))     return CRICKET_TEAMS;
  return NO_DICTIONARY;
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

// Ticker families whose B-prefixed strike buckets are DATES (YYMMDD), not numbers.
//
// The digits cannot decide this. KXHORMUZNORM-26MAR17-B260701 is 2026-07-01 -- its
// title is "...be above 60 before July 1, 2026?" -- while KXBTC-26JAN1600-B104125 is
// a $104,125 price bucket, and both are six digits. KXBTC, KXBTCY, KXBNBY, KXHYPEY,
// PROLLS and NASDAQ100D all mint six-digit price buckets, so a shape-scoped rule
// would render prices as dates and dates as prices.
//
// Every family here was confirmed from its own market title in market_metadata:
//   KXTRADEDEALCUBA-27-B260501         "...trade deal with Cuba before May 1, 2026?"
//   KXLEAVEHOUSECOMBO-27JAN01-B261103  "...be exactly 4 before November 3, 2026?"
//   KXHORMUZNORM-26MAR17-B260715       "...be above 60 before July 15, 2026?"
// Add a family only on that same evidence. An unlisted family is treated as a
// number, which is the safe direction: the digits stay visible either way.
const B_DATE_BUCKET_FAMILIES = /^KXHORMUZNORM|^KXTRADEDEALCUBA|^KXLEAVEHOUSECOMBO/;
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// -- Shared outcome-suffix decoding --------------------------------------------
// fmtStrike (busiest-traded outcome) and fmtWinner (settled outcome) read the same
// Kalshi outcome tickers off the same rows, so the suffix -> human-name rules live
// here once. Before this was factored out fmtWinner decoded only TIE / SPREAD /
// exact-score / team-map and passed everything else through raw, so the Winner cell
// read "H0" where the Busiest-outcome cell beside it read "Hold", and "0D" beside
// "0 days".
//
// This is the decoding TAIL only - the two callers are NOT interchangeable and keep
// their own front matter. fmtStrike takes two scalars and consults TOP_OUTCOME_NAMES;
// fmtWinner takes the whole row, has its own WINNER_OVERRIDES / WINNER_BY_MARKET
// maps, a >50-char guard that drops market-rule prose, and a binary-market branch
// that must keep answering "yes" rather than restating the strike (KXGOVSHUT-26JAN31
// settled yes; its Winner cell should say so, not "by Jan 31, 2026").
//
// Branch order is fmtStrike's, unchanged, so the busiest-outcome column it has always
// served is bit-identical.
export function decodeOutcomeSuffix(short, mk) {
  // Parlays (KXMVE*, CLAUDE.md rule 6) name their outcomes with an opaque
  // 11-hex-digit combination id - a hash of the leg set, not a contract name.
  // Every KXMVE outcome suffix in the published market_leaderboard.csv is exactly
  // 11 hex characters (53 of 53 rows, generation f4ba118b6ffaebf519be), the
  // markets carry up to 1,056 outcomes each, and a new parlay mints a new id - so
  // unlike an undecoded player code there is no dictionary that could ever decode
  // one and no fix path in this repo. Leaving it visible is not triage-useful
  // (nobody can look "7B807C188FF" up) and it reads as data corruption, so blank
  // it with the same "-" absence convention the branches below already use. The
  // settled-outcome column needs the same blanking for the same reason: 30 of the
  // 53 KXMVE rows carry an 11-hex winner_ticker, and showing the id cleaned in one
  // cell and raw in the next would put it on screen twice over.
  //
  // Scoped to the whole KXMVE family rather than to the hex shape deliberately: a
  // parlay outcome has no readable form to suppress, whereas a shape-scoped guard
  // would let a future non-hex parlay code fall through to the last line's
  // GOLF_PLAYERS/TENNIS_PLAYERS cross-map and answer with a confident wrong name
  // - correctness rule 1, the bug that rendered the World Cup's busiest outcome
  // as "Rublev".
  //
  // Must sit above the /^B[0-9]/ branch further down, which is unsound on
  // non-numeric codes: it stripped the leading B off "B1F7402D1E7" and rendered
  // "1F7402D1E7".
  if (/^KXMVE/.test(mk)) return "-";
  // KXOSCARWINNERS is the same shape of market for the Oscars: one contract per
  // COMBINATION of winners across several awards -- "Will Mikey Madison, Zoe Saldana,
  // The Wild Robot, Emilia Perez, Sing Sing win Best Actress, Best Supporting
  // Actress, ...?" -- named with a 5-hex-digit combination id. 10,066 of them, a new
  // combination mints a new id, and the readable form exists only in the market
  // title, never in the code, so nothing in this file could ever decode "DF0B4".
  // Same reasoning as KXMVE above, same "-".
  //
  // This also disarms an ambiguity in the /^B[0-9]/ branch below: 111 of these ids
  // are all digits after a leading B ("B8231"), so that branch would otherwise
  // comma-format a combination id into the number "8,231". The other 316 B-prefixed
  // ids ("B7C4B") are the case that branch already refuses to strip.
  if (/^KXOSCARWINNERS/.test(mk)) return "-";
  // Soccer 3-way markets (World Cup, UCL, etc.) settle to a "TIE" outcome code for draws.
  if (short === "TIE") return "Draw";
  // Fed rate outcomes
  if (short === "H0") return "Hold";
  if (/^H(\d+)$/.test(short)) return `+${short.slice(1)} bps (hike)`;
  if (/^C(\d+)$/.test(short)) return `-${short.slice(1)} bps (cut)`;
  // Shutdown length - e.g. "42D" -> "42 days". Pluralized because this branch now
  // feeds the Winner cell too, and KXGOVSHUTLENGTH-26FEB28 settled to "1D".
  const daysM = short.match(/^(\d+)D$/);
  if (daysM) return `${daysM[1]} ${daysM[1] === "1" ? "day" : "days"}`;
  // Date-style strike like "26MAR01" -> "by Mar 1"
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
  // B-prefixed strike buckets. The B is Kalshi's bucket prefix, not part of the value.
  if (/^B[0-9]/.test(short)) {
    const rest = short.slice(1);
    // /^B[0-9]/ only means "B then a digit" -- it does NOT mean the rest is a number.
    // It matched the parlay combination id B1F7402D1E7 and rendered "1F7402D1E7", a
    // mangled id passing for data. Anything non-numeric keeps its B and stays raw.
    if (!/^[0-9]+(\.[0-9]+)?$/.test(rest)) return short;
    // Date buckets before number formatting -- see B_DATE_BUCKET_FAMILIES for why the
    // family, not the shape, has to decide. Without this, KXHORMUZNORM's B260701
    // formats to "260,701", which reads convincingly as a price.
    const bd = B_DATE_BUCKET_FAMILIES.test(mk) ? rest.match(/^(\d{2})(\d{2})(\d{2})$/) : null;
    if (bd && +bd[2] >= 1 && +bd[2] <= 12 && +bd[3] >= 1 && +bd[3] <= 31)
      return `by ${MONTH_ABBR[+bd[2] - 1]} ${+bd[3]}, 20${bd[1]}`;
    // Otherwise a number, and it gets the same comma-thousands treatment the bare
    // number branch above gives. Returning rest unformatted is what made
    // KXBTCY-27JAN0100 render "52500" instead of "52,500".
    const n = Number(rest);
    if (Number.isFinite(n) && n >= 1000) return n.toLocaleString();
    return rest;
  }
  // World Cup exact-score outcomes like "MEX2ECU0" -> "Mexico 2-0 Ecuador"
  if (/^KXWCSCORE/.test(mk)) {
    const sc = short.match(/^([A-Z]{3})(\d+)([A-Z]{3})(\d+)$/);
    if (sc) {
      const teamMap = getTeamsForMarket(mk);
      return `${teamMap[sc[1]] ?? sc[1]} ${sc[2]}-${sc[4]} ${teamMap[sc[3]] ?? sc[3]}`;
    }
  }
  // Nothing was stripped (the outcome ticker IS the market key, a single-outcome
  // market) - there's no code left to decode, so don't leak the raw ticker.
  if (short === mk) return "-";
  // Sport-aware team / player fallback. No cross-map: this line used to read
  //   teamMap[short] ?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short] ?? short
  // which consulted the golf and tennis dictionaries for EVERY market, whatever sport
  // it was -- so a code its own map missed was answered by whichever player happened
  // to share it. That is CLAUDE.md correctness rule 1, and it was live on three
  // published outcomes: CLOSESTSTATE-24-AZ (Arizona) rendered "Zverev",
  // KXOSCARPIC-26-SIN (the film Sinners) rendered "Sinner", and KXMENWORLDCUP-26-CA
  // (Canada) rendered "Alcaraz" -- the same failure that once made the World Cup's
  // busiest outcome read "Rublev". It was wrong inside correctly-routed golf families
  // too: KXMASTERS-25-JS is Jordan Spieth and read "Sinner", KXUSOPEN-25-TF is Tommy
  // Fleetwood and read "Fritz".
  //
  // A cross-map can only ever fire for a market whose own family we have not
  // classified, and for such a market there is nothing to justify reading its code as
  // a golfer or a tennis player rather than a state, a film or a country. So it has no
  // sound case: it is a guess, and this file's rule is that an unverified guess is
  // worse than a fallback to the raw code, which stays visible for triage.
  //
  // Every row that reached it is now routed to a dictionary that answers directly:
  // measured over market_leaderboard.csv, large_trades.csv and
  // taker_pnl_by_market_leaderboard.csv in all four published generations, it was the
  // last resort for exactly 14 (market_key, code) pairs, all 14 of which the routing
  // table above now resolves.
  const teamMap = getTeamsForMarket(mk);
  return teamMap[short] ?? short;
}

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
    // Exact names for specific full outcome tickers. winner_ticker and top_outcome
    // are the same kind of string - a complete Kalshi outcome ticker - so the map
    // fmtStrike consults answers this column too, and the two maps already agree
    // wherever they overlap (KXFEDCHAIRNOM-29-KW is "Warsh" in both).
    // WINNER_OVERRIDES is still checked first: it is the hard override.
    //
    // Deliberately INSIDE the `wt !== mk` branch, below the binary-outcome check
    // above, not at the top of the function. TOP_OUTCOME_NAMES carries strike-shaped
    // entries for single-outcome markets ("KXGOVSHUT-26JAN31": "by Jan 31, 2026"),
    // which is the right label for the busiest *contract* but the wrong answer for
    // the settled outcome - that market resolved yes and the Winner cell has to say
    // so. Hoisting this lookup would turn two correct "yes" cells into a restatement
    // of the market's own question.
    if (TOP_OUTCOME_NAMES[wt]) return TOP_OUTCOME_NAMES[wt];
    const short = mk ? wt.replace(mk + "-", "") : wt.split("-").pop();
    return decodeOutcomeSuffix(short, mk);
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
  return decodeOutcomeSuffix(short, mk);
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
