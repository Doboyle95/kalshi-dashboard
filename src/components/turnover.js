// Shared turnover definition for the venue-comparison charts. One rule, one file, so
// the Kalshi line and every competitor line mean the same thing.
//
//   turnover(D) = contracts traded on D / open interest at the CLOSE OF D-1
//
// OPEN INTEREST IS A STOCK, NOT A FLOW. It is the number of contracts outstanding at a
// date's close. Never sum it over a date range -- a brush selection shows the LAST value
// in the window or the whole path, never a total. Volume is the only thing on these
// pages that may be summed.
//
// WHY THE PRIOR DAY'S CLOSE, not the same day's. Measured on Kalshi 2025-04-02..2026-08-06:
//   1. Event contracts settle to ZERO open interest on the day they trade hardest, so a
//      same-day denominator collapses exactly when the numerator peaks. 2026-07-19 -- the
//      World Cup final and a PGA Tour event settling together -- reads 2.761 same-day
//      against 1.578 prior-day, while its untouched neighbours sit at 1.605 and 1.459.
//      The 2.761 is an artifact of the denominator, not a day of extraordinary churn.
//      Series-wide the same-day maximum is 2.761 vs 1.879 prior-day; the medians barely
//      move (0.675 vs 0.706), so prior-day removes the spikes without shifting the level.
//   2. The day's volume is what CHANGES the day's open interest, so a same-day denominator
//      is partly caused by its own numerator. The prior close is the standing capital that
//      was actually there when the day opened. It is also the futures convention.
//   3. It publishes a day earlier. Volume for D lands within minutes; the OI snapshot for D
//      is not written until ~04:00 the next morning. Prior-day OI is already on disk.
//
// NO-DENOMINATOR DAYS ARE GAPS, NOT ZEROS. If a venue reports no open interest for D-1, or
// reports it as zero, turnover(D) is null -- an explicit hole in the line. Never 0, never
// carried forward, never interpolated. Underdog Exchange reports no OI on 2026-07-17,
// 07-22, 07-23 and 07-24; the existing chart's `open_interest > 0` filter deleted those
// rows and drew a continuous line straight through the hole. That is the bug this rule
// exists to prevent. A venue whose OI is structurally near-zero (DKeX: zero on 78% of
// market rows, 12,198 of 15,642, and on 15 of 57 days) gets NO turnover series at all -- omit the venue and say why.
//
// SMOOTHING. The raw daily ratio carries a hard weekly sawtooth from the sports calendar:
// Kalshi's median daily turnover is 0.928 Saturday and 0.885 Sunday against 0.445-0.610
// Monday-Friday, because weekend settlements shrink the denominator while weekend sports
// volume swells the numerator. Over the last 120 days the raw series moves a median 8.3%
// day over day (CV 0.272). Seven days is exactly one sports week, so the window cancels
// the sawtooth instead of averaging across a partial one; it brings day-over-day movement
// to a median 2.0% (CV 0.227).
//
// Smooth as a RATIO OF SUMS -- sum(volume, 7d) / sum(prior-day OI, 7d) -- never a mean of
// daily ratios. A mean of ratios overweights the lowest-OI days, the same distortion the
// prior-day rule exists to remove.
//
// This mirrors R/competitor_oi_helpers.R in the pipeline. Change both or neither.

export const TURNOVER_WINDOW_DAYS = 7;

const DAY_MS = 86400000;
const dayKey = d => Math.floor(+d / DAY_MS);
const finitePositive = v => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * Build the turnover series for one venue.
 *
 * @param {Array} volumeRows  [{date: Date, contracts: number, partial?: boolean}]
 * @param {Array|Map} oiRows  [{date: Date, open_interest: number}] or Map(dayKey -> oi).
 *        Already restricted to ONE leg where the venue reports YES and NO separately --
 *        ForecastEx's two legs are identical corpus-wide, so summing both double-counts.
 * @param {object} opts
 *        window       trailing window in CALENDAR days (default 7)
 *        contracts    accessor for the numerator (default d => d.contracts)
 *        isPartial    predicate; a still-filling day yields null turnover and poisons its
 *                     window, because a partial numerator over a complete denominator
 *                     understates turnover and would draw a fake decline at the right edge
 * @returns {Array} [{date, openInterest, turnover, turnover7d}] -- one row per input row,
 *          same order, nulls wherever the rule says there is no number.
 */
export function buildTurnover(volumeRows, oiRows, opts = {}) {
  const {
    window = TURNOVER_WINDOW_DAYS,
    contracts = d => d.contracts,
    isPartial = d => d.partial === true
  } = opts;

  const oiByDay = oiRows instanceof Map ? oiRows : new Map(
    (oiRows ?? []).map(d => [dayKey(d.date), +d.open_interest])
  );
  // A zero or negative snapshot means "the venue reported nothing", not "nobody holds
  // anything". Left in it becomes a divide-by-zero. Treat it as absent.
  const oiAt = k => {
    const v = oiByDay.get(k);
    return finitePositive(v) ? v : null;
  };

  // Numerator and denominator on a gapless CALENDAR index. Indexing by day number rather
  // than by row position is what stops a coverage gap from silently pairing today's volume
  // with a snapshot from several days ago.
  const num = new Map();
  for (const d of volumeRows ?? []) {
    const v = contracts(d);
    num.set(dayKey(d.date), isPartial(d) || !Number.isFinite(v) ? null : +v);
  }

  return (volumeRows ?? []).map(d => {
    const k = dayKey(d.date);
    const den = oiAt(k - 1);
    const n = num.get(k);
    const turnover = den !== null && n !== null && n !== undefined ? n / den : null;

    // Ratio of sums over the trailing window. A single missing day anywhere in the window
    // makes the whole point null: a partial window is a different statistic, not a noisier
    // version of the same one.
    let sn = 0, sd = 0, ok = true;
    for (let i = 0; i < window; i++) {
      const kk = k - i;
      const dd = oiAt(kk - 1);
      const nn = num.get(kk);
      if (dd === null || nn === null || nn === undefined) { ok = false; break; }
      sn += nn; sd += dd;
    }

    return {
      date: d.date,
      openInterest: oiAt(k),
      turnover,
      turnover7d: ok && sd > 0 ? sn / sd : null
    };
  });
}

/**
 * Kalshi's open interest does NOT come from competitor_daily.csv on the comparison page.
 * That page deliberately sources Kalshi volume from daily_overall.csv, because
 * near_live_update.R recomputes daily_overall every ~7 min but only COPIES
 * competitor_daily -- the latter's current-day row lags by hours (106,790,077 vs
 * 232,872,916 contracts on 2026-08-06). `fromCompetitor("Kalshi")` is never called, so a
 * column added to competitor_daily.csv would never be read for Kalshi. Pair the fast
 * volume with the OI snapshot directly:
 *
 *   const oi = await FileAttachment("data/kalshi_oi_daily.csv").csv({typed: true});
 *   const kalshiTurnover = buildTurnover(kalshiRows, kalshiOiRows(oi));
 *
 * @param {Array} oiCsv rows of kalshi_oi_daily.csv ({date, total_oi_contracts, ...})
 */
export function kalshiOiRows(oiCsv) {
  // 2025-04-01 is dropped: that day's vendor snapshot reported only 845 markets with
  // non-zero open interest against 3,994 the next day, and marked the still-live March
  // Madness book (29.5M contracts of OI on 04-02, championship game 04-07) "finalized",
  // which the reporting file always writes with open_interest 0. Total OI reads 10.9M vs
  // 70.0M on 04-02 out of an identically sized source file. Defective snapshot, not a
  // quiet day -- and as the FIRST row it plants a 1.08 turnover spike on the left edge
  // beside true neighbours of 0.10-0.12.
  const FIRST_VALID = Date.UTC(2025, 3, 2);
  return (oiCsv ?? [])
    .filter(d => +d.date >= FIRST_VALID)
    .map(d => ({date: d.date, open_interest: +d.total_oi_contracts}));
}

/**
 * The 2026-07-18 -> 07-19 step in Kalshi's open-interest line is REAL, not a reporting
 * change, and every chart that draws the line should say so rather than smooth it.
 *
 * Measured 2026-08-06 by streaming both S3 reporting files end to end:
 *   total OI      1,205,283,803 -> 688,884,859   (-42.8%)
 *   records IN the file  5,204,715 -> 5,427,588  (+222,873 -- the file GREW, and so did
 *                                                 its byte size, 1.633 GB -> 1.703 GB)
 *   status="active"        151,074 -> 94,343     (-56,731 markets settled)
 *   status="finalized"   5,050,590 -> 5,330,119  (finalized always reports OI = 0)
 *
 * The decline is concentrated in named event families whose events concluded, not spread
 * across the book: KXPGATOUR -155.7M (to exactly zero), the World Cup family -183.3M
 * (KXMENWORLDCUP -109.1M, KXWCSCORE -37.0M, KXWCGOALLEADER, KXWCGOAL, KXWCAWARD,
 * KXWCGAME, KXWC1HSCORE, KXWCMESSIMBAPPE all to zero), and the parlay book written on
 * them -141.9M (KXMVESPORTSMULTIGAMEEXTENDED, KXMVECROSSCATEGORY). Together 94% of the
 * 516.4M drop. Series with no connection to those events cross the boundary untouched:
 * KXPRESNOMD 102.9M -> 101.9M, KXPRESPERSON 34.58M -> 34.23M, KXALIENS 11.97M -> 11.99M.
 * A reporting-methodology change moves everything; this moved only what settled.
 *
 * A control weekend confirms the mechanism is routine. 2026-07-25 -> 07-26 (-22.7%) shows
 * the identical shape: KXNEXTTEAMNBA -143.4M and KXPGATOUR -63.9M to zero, KXPRESNOMD
 * 109.50M -> 110.07M unmoved. KXPGATOUR settling to zero is a WEEKLY event, present on
 * both weekends.
 *
 * So: annotate, do not break the axis and do not smooth. The level stays lower afterwards
 * because the World Cup is over and does not come back -- that is the story, not a defect.
 */
export const KALSHI_OI_ANNOTATIONS = [
  {
    date: new Date(Date.UTC(2026, 6, 19)),
    label: "World Cup final settles",
    detail: "Open interest fell 42.8% (1.21B to 689M contracts) as the World Cup book, " +
            "a PGA Tour event and the parlays written on both settled. 94% of the drop " +
            "is traceable to those markets; unrelated series were unchanged. A real " +
            "settlement, not a reporting change."
  },
  {
    date: new Date(Date.UTC(2026, 7, 2)),
    label: "Underdog volume dip",
    detail: "Underdog Exchange volume fell 92% day over day and fully recovered the next " +
            "day. Shown as reported."
  }
];
