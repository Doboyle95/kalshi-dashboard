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

1. `KXMVE*` parlays → `"—"` (opaque combination id, no fix path; see rule 6 in
   `CLAUDE.md`). Must stay above step 8.
2. `TIE` → `Draw` (soccer 3-way markets).
3. Fed codes: `H0` → `Hold`, `H2` → `+2 bps (hike)`, `C25` → `-25 bps (cut)`.
4. Days: `42D` → `42 days`, `1D` → `1 day`.
5. Dates: `26MAR01` → `by Mar 1`.
6. Spreads: if `market_key` contains `SPREAD`, `SEA4` → `Seahawks -4`.
7. Percent: if `market_key` starts with `POPVOTEMOV`, bare numbers or `B1.4`
   get a `%` suffix. **No other markets get `%`** — Bitcoin price strikes
   and Electoral College margins are raw integers.
8. Bare numbers ≥ 1000 get comma-formatting (e.g. `494000` → `494,000`);
   `B`-prefixed levels drop the `B` (`B4800` → `4800`).
9. `KXWCSCORE*` exact scores: `MEX2ECU0` → `Mexico 2-0 Ecuador`.
10. Nothing was stripped (suffix equals the market key) → `"—"`.
11. Fallback: team/player decode via `getTeamsForMarket`.

## Sport routing — `getTeamsForMarket(market_key)`

Which dict to use for a given market prefix:

| Prefix                                      | Dict            |
| ------------------------------------------- | --------------- |
| `KXNFL…`, `KXSB-…`                          | `NFL_TEAMS`     |
| `KXNCAAF…`                                  | `CFB_TEAMS`     |
| `KXNBA…`                                    | `NBA_TEAMS`     |
| `KXNCAAMB…`, `KXMARMAD…`, `KXWMARMAD…`      | `CBB_TEAMS`     |
| `KXMLB…`                                    | `MLB_TEAMS`     |
| `KXNHL…`                                    | `NHL_TEAMS`     |
| `KXUCL…`, `KXEPL…`, `KXLALIGA…`             | `SOCCER_TEAMS`  |
| `KXT20…`, `KXICC…`, `KXWBC…`                | `CRICKET_TEAMS` |
| `KXIPL…`                                    | `IPL_TEAMS`     |
| `KXATP…`, `KXWTA…`, `KXWMEN…`, `KXFOMEN…`, `KXUSOMEN…`, `KXAOMEN…`, `KXAUSOPEN…` | `TENNIS_PLAYERS` |
| `KXPGATOUR…`, `KXMASTERS…`, `KXUSOPEN…`     | `GOLF_PLAYERS`  |
| (anything else)                             | `ALL_TEAMS` (fallback) |

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
