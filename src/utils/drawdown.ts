import { Account, DailyLossReset, Trade } from '../types';

/** Any distance-to-breach within this fraction of the limit triggers a caution alert. */
export const BREACH_WARNING_FRACTION = 0.1;

export type LimitStatus = 'safe' | 'caution' | 'breached';

function statusFor(distance: number, limitAmount: number): LimitStatus {
  if (distance <= 0) return 'breached';
  if (limitAmount > 0 && distance <= limitAmount * BREACH_WARNING_FRACTION) return 'caution';
  return 'safe';
}

// ---------------------------------------------------------------------------
// Trading day boundaries
// ---------------------------------------------------------------------------

function nyParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return { year: +map.year, month: +map.month, day: +map.day, hour: +map.hour };
}

/**
 * Returns a sortable "trading day" key (YYYY-MM-DD) for a timestamp.
 * session_5pm_et: the futures session rolls to the next trading day at 5pm ET.
 * midnight_local: the trading day is simply the device's local calendar date.
 */
export function tradingDayKey(timestamp: string, resetRule: DailyLossReset): string {
  const date = new Date(timestamp);
  if (resetRule === 'session_5pm_et') {
    const { year, month, day, hour } = nyParts(date);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (hour >= 17) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function currentTradingDayKey(resetRule: DailyLossReset, now: Date = new Date()): string {
  return tradingDayKey(now.toISOString(), resetRule);
}

export interface DailyPnl {
  dayKey: string;
  pnl: number;
  trades: Trade[];
}

/** Groups an account's trades into trading days (chronological) and sums P&L per day. */
export function groupTradesByTradingDay(trades: Trade[], resetRule: DailyLossReset): DailyPnl[] {
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = tradingDayKey(t.timestamp, resetRule);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dayKey, dayTrades]) => ({
      dayKey,
      pnl: dayTrades.reduce((sum, t) => sum + t.amount, 0),
      trades: dayTrades.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    }));
}

function sortedTrades(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export function currentBalance(account: Account, trades: Trade[]): number {
  return account.startingBalance + trades.reduce((sum, t) => sum + t.amount, 0);
}

// ---------------------------------------------------------------------------
// Max drawdown
// ---------------------------------------------------------------------------

export interface DrawdownSnapshot {
  highWaterMark: number;
  threshold: number;
  balance: number;
  distanceToBreach: number;
  status: LimitStatus;
}

/**
 * High-water mark used by the trailing threshold, per drawdown mode:
 * - intraday_trailing: peak account balance reached after any single trade (closest
 *   approximation to real-time equity that a manually-logged trade ledger can give).
 * - eod_trailing: peak of end-of-day balances only; intraday swings between trades on
 *   the same day don't move the floor until that day closes.
 * - static: never moves off the starting balance.
 */
export function computeHighWaterMark(account: Account, trades: Trade[]): number {
  const { mode } = account.rules.drawdown;
  if (mode === 'static') return account.startingBalance;

  if (mode === 'intraday_trailing') {
    let running = account.startingBalance;
    let peak = account.startingBalance;
    for (const t of sortedTrades(trades)) {
      running += t.amount;
      if (running > peak) peak = running;
    }
    return peak;
  }

  // eod_trailing
  const days = groupTradesByTradingDay(trades, account.rules.dailyLoss.resetRule);
  let running = account.startingBalance;
  let peak = account.startingBalance;
  for (const day of days) {
    running += day.pnl;
    if (running > peak) peak = running;
  }
  return peak;
}

export function computeDrawdown(account: Account, trades: Trade[]): DrawdownSnapshot {
  const { amount, capAtBreakeven, mode } = account.rules.drawdown;
  const highWaterMark = computeHighWaterMark(account, trades);
  let threshold = highWaterMark - amount;
  if (mode !== 'static' && capAtBreakeven) {
    threshold = Math.min(threshold, account.startingBalance);
  }
  const balance = currentBalance(account, trades);
  const distanceToBreach = balance - threshold;
  return {
    highWaterMark,
    threshold,
    balance,
    distanceToBreach,
    status: statusFor(distanceToBreach, amount),
  };
}

// ---------------------------------------------------------------------------
// Daily loss limit
// ---------------------------------------------------------------------------

export interface DailyLossSnapshot {
  baseline: number;
  limitAmount: number;
  floor: number;
  todaysPnl: number;
  distanceToBreach: number;
  status: LimitStatus;
  dayKey: string;
}

function limitAmountFor(baseline: number, rule: Account['rules']['dailyLoss']): number {
  return rule.limitType === 'percent' ? baseline * (rule.value / 100) : rule.value;
}

export function computeDailyLoss(
  account: Account,
  trades: Trade[],
  now: Date = new Date()
): DailyLossSnapshot {
  const rule = account.rules.dailyLoss;
  const days = groupTradesByTradingDay(trades, rule.resetRule);
  const todayKey = currentTradingDayKey(rule.resetRule, now);

  let baseline: number;
  if (rule.baselineType === 'starting_balance') {
    baseline = account.startingBalance;
  } else {
    // prior_day_close: starting balance plus every completed trading day strictly before today
    const priorDays = days.filter((d) => d.dayKey < todayKey);
    baseline = account.startingBalance + priorDays.reduce((sum, d) => sum + d.pnl, 0);
  }

  const todaysPnl = days.find((d) => d.dayKey === todayKey)?.pnl ?? 0;
  const limitAmount = limitAmountFor(baseline, rule);
  const floor = baseline - limitAmount;
  const balanceNow = baseline + todaysPnl;
  const distanceToBreach = balanceNow - floor;

  return {
    baseline,
    limitAmount,
    floor,
    todaysPnl,
    distanceToBreach,
    status: statusFor(distanceToBreach, limitAmount),
    dayKey: todayKey,
  };
}

// ---------------------------------------------------------------------------
// Consistency rule (best day / total profit, tracked live every day)
// ---------------------------------------------------------------------------

export interface ConsistencySnapshot {
  bestDayPnl: number;
  totalProfit: number;
  ratio: number | null;
  maxAllowed: number;
  withinLimit: boolean;
}

export function computeConsistency(account: Account, trades: Trade[]): ConsistencySnapshot | null {
  const rule = account.rules.consistency;
  if (!rule.enabled) return null;

  const days = groupTradesByTradingDay(trades, account.rules.dailyLoss.resetRule);
  const bestDayPnl = days.reduce((max, d) => Math.max(max, d.pnl), 0);
  const totalProfit = currentBalance(account, trades) - account.startingBalance;
  const maxAllowed = rule.maxSingleDayPercent / 100;
  const ratio = totalProfit > 0 ? bestDayPnl / totalProfit : null;

  return {
    bestDayPnl,
    totalProfit,
    ratio,
    maxAllowed,
    withinLimit: ratio === null ? true : ratio <= maxAllowed,
  };
}

// ---------------------------------------------------------------------------
// Aggregate snapshot for the dashboard
// ---------------------------------------------------------------------------

export interface AccountSnapshot {
  balance: number;
  drawdown: DrawdownSnapshot;
  dailyLoss: DailyLossSnapshot;
  consistency: ConsistencySnapshot | null;
  profitTargetProgress: number | null;
  overallStatus: LimitStatus;
}

export function computeAccountSnapshot(
  account: Account,
  trades: Trade[],
  now: Date = new Date()
): AccountSnapshot {
  const accountTrades = trades.filter((t) => t.accountId === account.id);
  const drawdown = computeDrawdown(account, accountTrades);
  const dailyLoss = computeDailyLoss(account, accountTrades, now);
  const consistency = computeConsistency(account, accountTrades);
  const balance = currentBalance(account, accountTrades);

  const profitTargetProgress =
    account.rules.profitTarget && account.rules.profitTarget > 0
      ? (balance - account.startingBalance) / account.rules.profitTarget
      : null;

  const statuses: LimitStatus[] = [drawdown.status, dailyLoss.status];
  const overallStatus: LimitStatus = statuses.includes('breached')
    ? 'breached'
    : statuses.includes('caution')
      ? 'caution'
      : 'safe';

  return { balance, drawdown, dailyLoss, consistency, profitTargetProgress, overallStatus };
}

// ---------------------------------------------------------------------------
// Historical (per trading-day) status, for the History view
// ---------------------------------------------------------------------------

/** A timestamp guaranteed to fall on `dayKey` under `resetRule`, used to re-derive that day's limits. */
function representativeInstant(dayKey: string, resetRule: DailyLossReset): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (resetRule === 'session_5pm_et') {
    // 16:00 UTC is always before 5pm ET (both EST and EDT), so this stays on `dayKey`.
    return new Date(Date.UTC(year, month - 1, day, 16, 0, 0));
  }
  return new Date(year, month - 1, day, 12, 0, 0);
}

export interface HistoricalDaySnapshot {
  dayKey: string;
  drawdown: DrawdownSnapshot;
  dailyLoss: DailyLossSnapshot;
  status: LimitStatus;
}

/** Recomputes drawdown/daily-loss status as of the end of a specific past trading day. */
export function computeHistoricalDaySnapshot(
  account: Account,
  trades: Trade[],
  dayKey: string
): HistoricalDaySnapshot {
  const resetRule = account.rules.dailyLoss.resetRule;
  const accountTrades = trades.filter((t) => t.accountId === account.id);
  const upToDay = accountTrades.filter((t) => tradingDayKey(t.timestamp, resetRule) <= dayKey);

  const drawdown = computeDrawdown(account, upToDay);
  const dailyLoss = computeDailyLoss(account, upToDay, representativeInstant(dayKey, resetRule));

  const statuses: LimitStatus[] = [drawdown.status, dailyLoss.status];
  const status: LimitStatus = statuses.includes('breached')
    ? 'breached'
    : statuses.includes('caution')
      ? 'caution'
      : 'safe';

  return { dayKey, drawdown, dailyLoss, status };
}
