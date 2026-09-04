export type DrawdownMode = 'intraday_trailing' | 'eod_trailing' | 'static';

export type DailyLossBaseline = 'prior_day_close' | 'starting_balance';

export type DailyLossReset = 'session_5pm_et' | 'midnight_local';

export type LimitValueType = 'fixed' | 'percent';

export type AccountType = 'evaluation' | 'funded' | 'other';

export type AccountStatus = 'active' | 'breached' | 'passed';

export interface DrawdownRule {
  mode: DrawdownMode;
  /** Max drawdown allowance, always a dollar amount. */
  amount: number;
  /** Once the trailing floor reaches the starting balance, stop trailing higher. Ignored when mode is 'static'. */
  capAtBreakeven: boolean;
}

export interface DailyLossRule {
  baselineType: DailyLossBaseline;
  resetRule: DailyLossReset;
  limitType: LimitValueType;
  /** Dollar amount if limitType is 'fixed', percent points (e.g. 3 = 3%) if 'percent'. */
  value: number;
}

export interface ConsistencyRule {
  enabled: boolean;
  /** Max percent (e.g. 30 = 30%) a single day's profit may represent of total profit. */
  maxSingleDayPercent: number;
}

export interface PropFirmRules {
  drawdown: DrawdownRule;
  dailyLoss: DailyLossRule;
  /** Dollar profit target for evaluation accounts. Undefined = no target (e.g. funded account). */
  profitTarget?: number;
  consistency: ConsistencyRule;
}

export interface Account {
  id: string;
  name: string;
  firmName: string;
  accountType: AccountType;
  startingBalance: number;
  createdAt: string;
  rules: PropFirmRules;
  status: AccountStatus;
}

export interface Trade {
  id: string;
  accountId: string;
  amount: number;
  setupTag?: string;
  notes?: string;
  timestamp: string;
}
