# Kalshi Ticker Conversion Rules

This document is the authoritative reference for turning Kalshi
`market_key`, `winner_ticker`, and `top_outcome` strings into human-readable
cells in the category-page individual market leaderboard.

All logic lives in `src/categories.md`. This document explains **why** each
dict / regex exists so you can add new tickers without regressing anything.

## Anatomy of a Kalshi ticker

```
KXNFLGAME-25SEP28GBDAL-DAL
└─┬─────┘ └────┬──────┘ └┬┘
  series   market key     outcome suffix
```

- **Series prefix** (usually `KX…`): identifies the product family
  (`KXNFLGAME`, `KXMLBGAME`, `KXNCAAMBGAME`, `KXPGATOUR`, `KXFEDDECISION`,
  …). Pre-2025 markets sometimes use non-`KX` prefixes like `PRES-2024`,
  `POPVOTE-24`, `SENATEAZ-24`, `ECMOV-24`, `PRESPARTY*`, `POWER-24`.
- **Market-specific slug**: date-coded games like `25SEP28GBDAL` (YY + 3-letter
  month + DD + two team codes), or a label like `-24-R-B` / `-26DEC31`.
- **Outcome suffix**: a team code (`DAL`), Fed code (`H0`, `C25`), date
  (`26MAR01`), bare number (`100000`, `2.5`), spread strike (`SEA4`), etc.

Three things vary by sport: the **series prefix**, the **team-code dictionary**
(MLB `SEA` ≠ NFL `SEA`), and whether outcome suffixes are numeric or textual.

## Display pipeline

```
row → bestName → (Market column)
row → fmtWinner → (Winner column)
row → fmtStrike(top_outcome, market_key) → (Highest-vol. strike column)
        └─ both end in decodeOutcomeSuffix(suffix, market_key)
row → getSportDisplayCategory → (Row color)
```

### Market name (`bestName`)

Priority order:

1. `MKT_NAME_FORCE[market_key]` — **hard override**. Use when Kalshi's own
   `market_name` is wrong or missing context (e.g. `KXSB-26` → "Super Bowl LX",
   `KXMLBGAME-25OCT27TORLAD` → "World Series 2025 Game 3").
2. `d.market_name` (if non-empty and not equal to `market_key`).
3. `d["i.market_name"]` (alt source, same rule).
4. `MKT_NAME_OVERRIDES[market_key]` — soft fallback for tickers with no Kalshi
   label at all.
5. `parseTicker(market_key)` — regex-based family parsers.
6. Last resort: raw `market_key`.

### Winner (`fmtWinner`)

Priority:

1. `WINNER_OVERRIDES[winner_ticker]` — hard override.
2. Fed metadata fix: `"Hike 0bps"` → `"Hold"`.
3. `d.winner` text if ≤50 chars and not starting with `::`.
4. `d.winner` with `:: ` prefix stripped.
5. `TOP_OUTCOME_NAMES[winner_ticker]` — exact name for a full outcome ticker.
6. `decodeOutcomeSuffix(suffix, market_key)` — the shared decoder below.
7. `WINNER_BY_MARKET[market_key]` (for markets with no `winner_ticker` at all).
8. `"—"`.

Steps 5 and 6 run only when `winner_ticker !== market_key`. That guard is load-
bearing, not incidental: for a single-outcome market the winner *is* the plain
`yes`/`no` from step 3, and `TOP_OUTCOME_NAMES` holds strike-shaped entries for
exactly those markets (`"KXGOVSHUT-26JAN31"` → `"by Jan 31, 2026"`). Hoisting the
lookup above step 3 replaces a correct `yes` with a restatement of the question.

### Highest-vol. strike (`fmtStrike`)

Priority:

1. `TOP_OUTCOME_NAMES[top_outcome]` — hard override (keyed on full ticker).
2. `decodeOutcomeSuffix(suffix, market_key)`.

### Outcome suffixes (`decodeOutcomeSuffix`) — shared by both columns

`winner_ticker` and `top_outcome` are the same kind of string, so one decoder
serves both. Add a new suffix rule here, once; a rule added to only one caller is
how the Winner cell came to read `H0` beside a Busiest-outcome cell reading
`Hold`. Order matters — these are tried top to bottom:

1. `KXMVE*` parlays and `KXOSCARWINNERS*` → `"—"` (opaque combination id, no fix
   path; see rule 6 in `CLAUDE.md`). Must stay above step 8. `KXOSCARWINNERS` is
   one contract per *combination* of winners across several awards, named with a
   5-hex-digit id; 111 of those ids are all digits after a leading `B`, so without
   this step 8 would comma-format the id `B8231` into the number `8,231`.
2. `TIE` → `Draw` (soccer 3-way markets).
3. Fed codes: `H0` → `Hold`, `H2` → `+2 bps (hike)`, `C25` → `-25 bps (cut)`.
4. Days: `42D` → `42 days`, `1D` → `1 day`.
5. Dates: `26MAR01` → `by Mar 1`.
6. Spreads: if `market_key` contains `SPREAD`, `SEA4` → `Seahawks -4`.
7. Percent: if `market_key` starts with `POPVOTEMOV`, bare numbers or `B1.4`
   get a `%` suffix. **No other markets get `%`** — Bitcoin price strikes
   and Electoral College margins are raw integers.
8. Bare numbers ≥ 1000 get comma-formatting (e.g. `494000` → `494,000`).
   `B`-prefixed buckets drop the `B` and get the **same** comma-formatting
   (`B4800` → `4,800`) — returning the digits unformatted is what made
   `KXBTCY-27JAN0100` render `52500`. Two guards on that:
   - The remainder must actually be numeric. `/^B[0-9]/` only means "B then a
     digit", so it also matched the id `B1F7402D1E7` and rendered `1F7402D1E7`;
     anything non-numeric now keeps its `B` and stays raw.
   - **Families whose `B` buckets are dates are listed in
     `B_DATE_BUCKET_FAMILIES`**, because the digits cannot tell you which it is:
     `KXHORMUZNORM-…-B260701` is 2026-07-01 and `KXBTC-…-B104125` is \$104,125,
     and both are six digits. Add a family there only on the evidence of its own
     market title, the way the three present ones were.
9. `KXWCSCORE*` exact scores: `MEX2ECU0` → `Mexico 2-0 Ecuador`.
10. Nothing was stripped (suffix equals the market key) → `"—"`.
11. Fallback: team/player decode via `getTeamsForMarket`, then the **raw code**.
    There is deliberately no cross-map. This step used to end
    `?? GOLF_PLAYERS[short] ?? TENNIS_PLAYERS[short]`, i.e. it asked the golf and
    tennis dictionaries about every market whatever its sport, so a code the
    market's own dict missed was answered by whichever player shared it —
    `CLOSESTSTATE-24-AZ` (Arizona) read "Zverev", `KXOSCARPIC-26-SIN` (the film
    Sinners) read "Sinner", `KXMENWORLDCUP-26-CA` (Canada) read "Alcaraz". A raw
    code is the correct answer here: it is visible and triageable, and an
    unverified guess is worse.

## Sport routing — `getTeamsForMarket(market_key)`

Which dict to use for a given market prefix:

| Prefix                                      | Dict            |
| ------------------------------------------- | --------------- |
| `KXNFL…`, `KXSB-…`                          | `NFL_TEAMS`     |
| `KXNCAAF…`                                  | `CFB_TEAMS`     |
| `KXNBA…`                                    | `NBA_TEAMS`     |
| `KXWNBA…`                                   | `WNBA_TEAMS` (cities, not nicknames) |
| `KXNCAAMB…`, `KXMARMAD…`, `KXWMARMAD…`      | `CBB_TEAMS`     |
| `KXMLB…`                                    | `MLB_TEAMS`     |
| `KXNHL…`                                    | `NHL_TEAMS`     |
| `KXUCL…`, `KXEPL…`, `KXLALIGA…`             | `SOCCER_TEAMS`  |
| `KXT20MATCH-…`                              | `CRICKET_TEAMS` **only if the fixture parses** — see below |
| `KXT20CANADAMATCH…`                         | `NO_DICTIONARY` — domestic franchises |
| `KXT20…`, `KXICC…`, `KXWBC…`                | `CRICKET_TEAMS` |
| `KXIPL…`                                    | `IPL_TEAMS`     |
| `KXMENWORLDCUP…`                            | `WC_OUTRIGHT_TEAMS` (FIFA 3-letter **+** ISO 2-letter) |
| `KXATP…`, `KXWTA…`, `KXWMEN…`, `KXWWOMEN…`, `KXFOMEN…`, `KXFOWOMEN…`, `KXUSOMEN…`, `KXUSOWOMEN…`, `KXAOMEN…`, `KXAOWOMEN…`, `KXAUSOPEN…` | `TENNIS_PLAYERS` |
| `KXPGAAWARDS…`                              | `NO_DICTIONARY` — Producers **Guild**, not golf |
| `KXPGA…` (except `KXPGARYDER-`), `KXMASTERS…`, `KXUSOPEN…`, `KXTHEOPEN…` | `GOLF_PLAYERS`  |
| `CLOSESTSTATE…`                             | `STATE_NAMES`  |
| `KXOSCARPIC-26…`                            | `OSCAR_BEST_PICTURE_26` |
| `KXNCAA…`, `KXCOLLEGE…`, `KXMAKEMARMAD…`, `KXCFPSEED…`, `KX<conf>REG…` | `COLLEGE_TEAMS` (= CFB + CBB) |
| `KXNEXTTEAM{NBA,GIANNIS,LEBRON,WESTBROOK}…`, `KXNEXTCOACHOUTNBA…` | `NBA_TEAMS` |
| `KXNEXTTEAM{NFL,MCLAURIN,MICAH,TYREEK}…`, `KXNEXTCOACHOUTNFL…` | `NFL_TEAMS` |
| `KXNEXTTEAM{MLB,SKUBAL}…`                    | `MLB_TEAMS` |
| `KXNEXTTEAMNHL…`                             | `NHL_TEAMS` |
| `KXODIMATCH…`, `KXTESTMATCH…`                | `CRICKET_TEAMS` |
| (anything else)                             | **`NO_DICTIONARY`** — the raw code |

### ⚠ The fallback is `NO_DICTIONARY`, and must stay that way

`ALL_TEAMS` used to be the fallback. It is NFL + NBA + college basketball, so every
market this table had not classified got those codes applied to it: **21,879 markets
across 1,061 families, about 88% of them named wrongly** — "Seahawks" for the top song
on Spotify, "Mavericks" for whether it rains in Dallas, "Saints" for what Trump says in
the State of the Union, "Hornets" for the tennis player Maxime Chazal. Same defect as
the golf/tennis cross-map, one level down.

Because the fallback is now harmless, **adding a family to this table is only worth it
when a dictionary genuinely fits**. If none does, leave it out and let the raw code show.

### Prefix traps this table has already sprung

Every one of these is a prefix that means two different things, and every one was found
by running the change over the whole `market_metadata` universe rather than the ~1,000
published rows, where none of them appear:

- `KXUSOPEN` is the **golf** US Open; the tennis one is `KXUSOMEN`/`KXUSOWOMEN`.
- `KXPGAAWARDS` is the Producers **Guild** of America; its outcomes are films.
- `KXCFPBELIM` is the **Consumer Financial Protection Bureau**, not the College
  Football Playoff — hence `KXCFPSEED`, not `KXCFP`.
- `KXBBLGAME` is the German **Basketball** Bundesliga ("Rostock Seawolves vs Bayern
  Munich"), not the Big Bash League.
- `KXODINVCTFINALS` is a **Valorant** market ("Will all players purchase the Odin…"),
  not cricket ODI — hence `KXODIMATCH`.
- The golf exclusion is `KXPGARYDER-` **with the dash**. `KXPGARYDER-RC25` is a
  team event (USA / EU / EUR), but `KXPGARYDERTOP-25` is an ordinary player
  market, and a dashless exclusion swallows both.

### When a family's codes are ambiguous: test the whole FIXTURE

`KXT20MATCH` is one Kalshi series carrying international T20 **and** several domestic
franchise leagues, which reuse the same codes: `COL` is Colombo CC as well as Colombia,
`IND` the Indore Pink Panthers as well as India, `NAM` the Namo Bandra Blasters as well
as Namibia, `BAN` Band-E Amir Stars as well as Bangladesh, `AUS` **Austria** as well as
Australia. A flat lookup got 52 of them wrong.

The market key carries **both** sides (`KXT20MATCH-26JUN021330INDENG`), so the fix is to
decode only when the whole pair decomposes into two sides `CRICKET_TEAMS` knows — which
is exactly what `parseGame` already does:

```js
if (/^KXT20MATCH-/.test(mk)) {
  const pair = (mk.match(/([A-Z]+)$/) ?? [])[1];
  return pair && parseGame(pair, CRICKET_TEAMS) ? CRICKET_TEAMS : NO_DICTIONARY;
}
```

`INDENG` parses so India decodes; `INDMAL`, `AUSSLO` and `COLBUR` do not, so those keep
their raw codes. **52 wrong → 4.** It costs 52 correct decodes: an international match
whose *opponent* has no code here (Turks and Caicos, Peru, Costa Rica) stops decoding
too. That is the safe direction — a raw code, never a wrong name. The 4 it cannot catch
are Panadura SC vs Colts CC, where `PAN` and `COL` are both real country codes.

Reach for this whenever a family's codes are ambiguous but the key names the fixture.

### Families that look routable and are not

- **`KXITF*`** (ITF tennis) is not routed to `TENNIS_PLAYERS`. The ITF circuit is a far
  larger player pool than the tour events that map covers, and its codes abbreviate ITF
  players: `MEN` is Joao Mendes, `FON` is Oriol Font, `SHE` is Suryanshi Shekhawat.
  `TENNIS_PLAYERS` reads those as Mensik, Fonseca and Shelton — **785 wrong names**.
- **`KXWT20*`** (women's T20) is not routed at all: it uses `IND` for **Indonesia** in 9
  events and India in 11 others, so no dictionary keyed on the code can be right — and
  unlike `KXT20MATCH` the fixture test does not rescue it, because the associate-nation
  opponents have no codes here either.
- **`KXT20CANADAMATCH`** is domestic franchise cricket. Every code `CRICKET_TEAMS`
  answered was wrong (`BRA` for the Brampton Wolves, `SUR` for the Surrey Jaguars) and
  none were right, so it routes to `NO_DICTIONARY`.
- **WNBA All-Star squads.** `COO`, `SPN` and `WAS` are "Team Coop", "Team Spoon" and
  "Team Washington" in `KXWNBASSTARS`, not franchises, and those families also carry
  player props ("A'ja Wilson: 15+ points"). They are left out of `WNBA_TEAMS`.

### Deriving a map from the data instead of from knowledge

`WNBA_TEAMS` was built by reading the markets' own titles, and the method generalises.
Use **only titles that name a single team** — "Will Chicago win the 1H by over 2.5
points?", "Indiana vs Las Vegas: Indiana wins the 3rd quarter". An "A vs B" title cannot
tell you which side a code belongs to, and guessing the position is how you get a map
that is confidently backwards. Require several consistent observations per code: every
`WNBA_TEAMS` entry has 69–95 with zero disagreement.

The values are **cities**, because that is what Kalshi's titles say ("Dallas vs Indiana
Winner?"). Writing in the nicknames would be supplying knowledge the data does not
contain — the same move this file forbids everywhere else.

An award map is scoped to its **year** (`KXOSCARPIC-26`) because a code set that
is a nominee list gets re-minted annually; a state or ISO country map is not.

**This is the most important correctness guardrail.** Team codes are reused
across sports. Always route by `market_key` before decoding team codes.

## Series-level parsers in `parseTicker`

If `market_name` is blank we fall back to these regexes:

| Prefix / Pattern                                          | Returns |
| --------------------------------------------------------- | ------- |
| `KXFEDCHAIRNOM…`                                          | `"Next Fed Chair"` |
| `^KXFEDDECISION-YY MON$` (e.g. `KXFEDDECISION-25SEP`)     | `"Sep '25 Fed rate decision"` (date **first** so the label is still informative when truncated) |
| `KXNFLNFCCHAMP…` / `KXNFLAFCCHAMP…`                       | `"NFC Championship"` / `"AFC Championship"` |
| `KXFIRSTSUPERBOWLSONG…`                                   | `"SB halftime: first song"` |
| `KXSUPERBOWLAD…`                                          | `"Super Bowl ad"` |
| `KXKHAMENEIOUT…`                                          | `"Khamenei out of power"` |
| `KXBOXING…`                                               | `"Boxing match"` |
| `KXMVE…`                                                  | `"Parlay"` (all Kalshi parlay products) |
| `KXNFLGAME-YYmondDDTEAMTEAM`                              | `"Packers vs. Bears"` (via `parseGame`) |
| `KXNCAAFGAME-…` / `KXNCAAMBGAME-…` / `KXNBAGAME-…`        | same pattern |
| `KXMLBGAME-…` / `KXNHLGAME-…` / `KXUCLGAME-…` / `KXIPLGAME-…` | same pattern |
| `KXWBCGAME-YYmonDD<HHMM>TEAMTEAM` (note 4-digit time)     | `"USA vs. Dominican Rep."` |
| `KXNFLSPREAD-…` / `KXNCAAFSPREAD-…`                       | `"Bills vs. Broncos (spread)"` |
| `KXNBASERIES-…` / `KXMLBSERIES-…`                         | `"Denver vs. OKC (series)"` |

## Hard overrides — when to use which dict

### `MKT_NAME_FORCE` (beats Kalshi's own label)

Use when Kalshi's `market_name` is technically populated but misleading:

- `PRES-2024` / `POPVOTE-24`: Kalshi labels are just "Presidency" / "Popular
  vote" — we force the year.
- `KXSB-26` → `"Super Bowl LX"` (Kalshi label is "2026 Pro Football
  Championship" for legal reasons).
- `KXMLBGAME-25OCT27TORLAD` etc.: Kalshi labels these as raw tickers; we
  force "World Series 2025 Game 3" / etc. because that's what users remember.
- `KXMLBGAME-25OCT15TORSEA` → "ALCS 2025 (Mariners vs Blue Jays)".
- `KXMASTERS-25` → "2025 Masters Tournament".

### `MKT_NAME_OVERRIDES` (used when Kalshi label is blank)

Typical cases:

- Popular-vote-margin variants (`POPVOTEMOV-24-R-B`, `POPVOTEMOVSMALL-24-R`, …)
  get human labels with range qualifiers.
- Presidential-party recount and Republican-trifecta combos.
- All-year / by-end-of-year labels for cabinet positions
  (`KXSECAG-26DEC31`, `KXSECDEF-26DEC31`, `KXSECHHS-26DEC31`).
- Standalone policy markets: `KXGOVSHUT`, `KXGOVTSHUTDOWN`, `KXCITRINI`,
  `KXALIENS`, `KXKHAMENEIOUT-AKHA`, `KXLAYOFFSYINFO-26`.
- Entertainment markets: `KXTOPARTIST-25`, `KXSBGUESTS-26`,
  `KXPERFORMSUPERBOWLB-26`, `KXRANKLISTGOOGLESEARCH-26JAN`.

### `WINNER_OVERRIDES` (keyed on `winner_ticker`)

Use when:

- Ticker code is non-obvious (e.g. `KXFEDCHAIRNOM-29-KW` → `Warsh`).
- Kalshi's `winner` text is a person in a multi-person field and we just
  want the last name (e.g. `KXNOBELPEACE-25-MARI` → `Machado`).
- The winner ticker is a code for a category of thing rather than a name
  (e.g. `KXSBGUESTS-26-ROG` → `Various`).
- Unit mismatch: `KXGOVSHUTLENGTH-26JAN01-42D` means the 42-day ticker won,
  which corresponds to **43 days** by Kalshi's bucketing (user-defined
  convention — owner confirmed).

### `WINNER_BY_MARKET` (keyed on `market_key`)

Use only when `winner_ticker` is blank in the CSV but the market did settle.
Current entries: Masters 2025, 2025 March Madness championship, Khamenei
market ("it's complicated…"), Super Bowl ad ("Various").

### `TOP_OUTCOME_NAMES` (keyed on full `top_outcome` string)

Use when the strike code alone is ambiguous without market context. Every
key must be the **complete** `top_outcome` string including the market key
prefix. Examples:

- `KXFEDCHAIRNOM-29-JS` → `Shelton` (two-letter codes are ambiguous
  between tennis and politics).
- `KXMARMAD-26-CONN` → `UConn`.
- `KXRANKLISTGOOGLESEARCH-26JAN-D4D` → `D4vd`.

## Examples — regression tests

When changing logic, these results must still hold for the current CSV:

| market_key | expected display_name | expected winner | expected strike | cat |
| --- | --- | --- | --- | --- |
| `PRES-2024` | Presidency 2024 | Trump | Harris | Elections |
| `KXSB-26` | Super Bowl LX | Seahawks | Patriots | Football |
| `KXMLBGAME-25OCT27TORLAD` | World Series 2025 Game 3 | Dodgers | Dodgers | Other sport |
| `KXFEDDECISION-25SEP` | Sep '25 Fed rate decision | -25 bps (cut) | Hold | Economics |
| `POPVOTEMOV-24-R-B` | Popular vote margin (R, wider) | — | 2.5% | Elections |
| `KXBTCMAXY-25-DEC31` | Bitcoin max price 2025 | — | 129,999.99 | Crypto |
| `KXNFLSPREAD-26FEB08SEANE` | Seahawks vs. Patriots (spread) | Seahawks -5 | Seahawks -4 | Football |
| `KXKHAMENEIOUT-AKHA` | Khamenei out of power | it's complicated… | by March 1 | Politics |
| `KXMVE…` (any) | Parlay | — | — | Sports |

## Adding a new ticker — playbook

1. Spot the broken row in the leaderboard (ticker shows in Market column, or
   a team code appears in Winner, or a percentage appears where it shouldn't).
2. Identify the **series prefix**. If it's a new family, add a regex branch
   to `parseTicker`.
3. Identify the **sport / category**. If it's a sport you haven't routed yet,
   add a new team dict and a branch in `getTeamsForMarket`.
4. Add entries to the right override dict:
   - Market label wrong → `MKT_NAME_FORCE` (hard) or `MKT_NAME_OVERRIDES`
     (soft).
   - Winner wrong → `WINNER_OVERRIDES` (if `winner_ticker` is known) or
     `WINNER_BY_MARKET` (if it's blank).
   - Strike wrong → `TOP_OUTCOME_NAMES` (use full ticker as key).
5. If the whole family of tickers needs the same fix, prefer a regex branch
   over per-ticker overrides.
6. `npm run build` — confirm the site builds cleanly. **A green build is not a
   regression check**: every decoding defect in this file's history survived one.
   Run the old and the new module over every row of `market_leaderboard.csv`,
   `large_trades.csv` and `taker_pnl_by_market_leaderboard.csv` and diff the cells
   — that is what caught `fmtWinner`'s 19 raw suffixes and, before it, the World Cup
   row that read "Rublev".
7. Verify with a real render, not just the build — `/categories` and
   `/market-explorer` both call `fmtWinner`, from different modules.
   `kalshi-fmtwinner-probe.mjs` on the VM is a 114-check Playwright probe of both;
   its header carries the local rig recipe.
8. Commit, push, PR.

## Things to NOT do

- Don't use `ALL_TEAMS` for any code you've already routed via
  `getTeamsForMarket` — it will produce cross-sport collisions.
- **Don't make `ALL_TEAMS` the routing fallback again.** It mixes pro nicknames with
  school names and is right only for the markets explicitly routed to it. The fallback
  is `NO_DICTIONARY`; a raw code is the correct answer for an unclassified market.
- **Don't route a family whose codes are ambiguous within itself.** Confirm against
  titles first: if the same code means two things in the same family (`IND` for both
  India and Indonesia), no dictionary keyed on the code can be right.
- **Don't reinstate a cross-map fallback** (`?? GOLF_PLAYERS[short] ??
  TENNIS_PLAYERS[short]`) at the end of `decodeOutcomeSuffix`. It can only ever
  fire for a market whose family is unrouted, and for such a market nothing
  justifies reading the code as a golfer rather than a state, a film or a country.
  It was wrong even inside correctly-routed golf families: `KXMASTERS-25-JS` is
  Jordan Spieth and read "Sinner". Route the family instead.
- Don't guess what an outcome code stands for. Confirm it against that market's
  own `title`/`subtitle` in `market_metadata` — that is how `SIN` was established
  as the film *Sinners* and `CA` as *Canada*. An unverified guess is worse than
  leaving the raw code visible.
- Don't add `%` to arbitrary bare-number strikes. Only `POPVOTEMOV*` markets
  get `%`.
- Don't treat `market_name === market_key` as a valid label — Kalshi leaves
  it that way for many markets.
- Don't truncate `winner` at <50 chars without the rule-text check — some
  legitimate winners have long names.
- Don't remove the `::` strip in `fmtWinner` — Kalshi encodes
  category-winner text as `":: or another Republican…"` etc.
- Don't add a suffix rule to `fmtStrike` or `fmtWinner` directly — it belongs in
  `decodeOutcomeSuffix`, which both end in. A rule added to one caller only is the
  defect that made the Winner column read `H0`, `0D` and `B4800` while the
  Busiest-outcome column beside it read `Hold`, `0 days` and `4800`.
- Don't hoist `fmtWinner`'s `TOP_OUTCOME_NAMES` lookup above its `winner` /
  binary-outcome branch. It is scoped to `winner_ticker !== market_key` on
  purpose — see the Winner section above.
