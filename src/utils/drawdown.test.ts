import { Account, PropFirmRules, Trade } from '../types';
import {
  computeAccountSnapshot,
  computeConsistency,
  computeDailyLoss,
  computeDrawdown,
  tradingDayKey,
} from './drawdown';

function makeAccount(rules: PropFirmRules, startingBalance = 50000): Account {
  return {
    id: 'acc1',
    name: 'Test',
    firmName: 'Test Firm',
    accountType: 'evaluation',
    startingBalance,
    createdAt: new Date().toISOString(),
    rules,
    status: 'active',
  };
}

function trade(accountId: string, amount: number, timestamp: string): Trade {
  return { id: `${timestamp}-${amount}`, accountId, amount, timestamp };
}

const baseRules: PropFirmRules = {
  drawdown: { mode: 'static', amount: 2500, capAtBreakeven: false },
  dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
  consistency: { enabled: false, maxSingleDayPercent: 30 },
};

describe('tradingDayKey', () => {
  it('rolls to the next day at 5pm ET for session_5pm_et', () => {
    expect(tradingDayKey('2026-01-15T20:00:00.000Z', 'session_5pm_et')).toBe('2026-01-15'); // 3pm ET
    expect(tradingDayKey('2026-01-15T22:30:00.000Z', 'session_5pm_et')).toBe('2026-01-16'); // 5:30pm ET
    expect(tradingDayKey('2026-01-16T01:00:00.000Z', 'session_5pm_et')).toBe('2026-01-16'); // 8pm ET Jan 15
  });
});

describe('computeDrawdown', () => {
  it('static drawdown never moves off starting balance', () => {
    const account = makeAccount(baseRules);
    const trades = [trade('acc1', 3000, '2026-01-01T12:00:00.000Z'), trade('acc1', -500, '2026-01-02T12:00:00.000Z')];
    const snap = computeDrawdown(account, trades);
    expect(snap.threshold).toBe(47500);
    expect(snap.balance).toBe(52500);
    expect(snap.distanceToBreach).toBe(5000);
    expect(snap.status).toBe('safe');
  });

  it('intraday trailing follows the peak balance across trades', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      drawdown: { mode: 'intraday_trailing', amount: 2500, capAtBreakeven: false },
    };
    const account = makeAccount(rules);
    const trades = [
      trade('acc1', 3000, '2026-01-01T12:00:00.000Z'), // balance 53000, peak 53000
      trade('acc1', -4000, '2026-01-01T13:00:00.000Z'), // balance 49000, peak stays 53000
    ];
    const snap = computeDrawdown(account, trades);
    expect(snap.highWaterMark).toBe(53000);
    expect(snap.threshold).toBe(50500);
    expect(snap.balance).toBe(49000);
    expect(snap.distanceToBreach).toBe(-1500);
    expect(snap.status).toBe('breached');
  });

  it('caps the trailing threshold at the starting balance when capAtBreakeven is set', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      drawdown: { mode: 'intraday_trailing', amount: 2500, capAtBreakeven: true },
    };
    const account = makeAccount(rules);
    const trades = [trade('acc1', 3000, '2026-01-01T12:00:00.000Z')]; // peak 53000 -> threshold would be 50500
    const snap = computeDrawdown(account, trades);
    expect(snap.threshold).toBe(50000); // capped at starting balance
  });

  it('eod trailing ignores intraday swings within the same day', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      drawdown: { mode: 'eod_trailing', amount: 2500, capAtBreakeven: false },
      dailyLoss: { ...baseRules.dailyLoss, resetRule: 'midnight_local' },
    };
    const account = makeAccount(rules);
    const trades = [
      trade('acc1', 5000, '2026-01-01T12:00:00.000Z'), // intraday peak within day 1 would be 55000
      trade('acc1', -4000, '2026-01-01T13:00:00.000Z'), // day 1 closes at +1000 net -> balance 51000
      trade('acc1', -2000, '2026-01-02T12:00:00.000Z'), // day 2
    ];
    const snap = computeDrawdown(account, trades);
    expect(snap.highWaterMark).toBe(51000); // day-1 close, not the 55000 intraday spike
    expect(snap.threshold).toBe(48500);
    expect(snap.balance).toBe(49000);
  });
});

describe('computeDailyLoss', () => {
  it('uses the prior trading day close as baseline', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      dailyLoss: { baselineType: 'prior_day_close', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
    };
    const account = makeAccount(rules);
    const trades = [
      trade('acc1', 2000, '2026-01-01T12:00:00.000Z'), // day 1 close: balance 52000
      trade('acc1', -300, '2026-01-02T12:00:00.000Z'), // day 2, today
    ];
    const now = new Date('2026-01-02T18:00:00.000Z');
    const snap = computeDailyLoss(account, trades, now);
    expect(snap.baseline).toBe(52000);
    expect(snap.todaysPnl).toBe(-300);
    expect(snap.floor).toBe(51000);
    expect(snap.distanceToBreach).toBe(700);
    expect(snap.status).toBe('safe');
  });

  it('flags caution within 10% of the daily limit and breach past it', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
    };
    const account = makeAccount(rules);
    const now = new Date('2026-01-01T18:00:00.000Z');

    const caution = computeDailyLoss(account, [trade('acc1', -920, '2026-01-01T12:00:00.000Z')], now);
    expect(caution.status).toBe('caution'); // distance 80 <= 10% of 1000

    const breached = computeDailyLoss(account, [trade('acc1', -1200, '2026-01-01T12:00:00.000Z')], now);
    expect(breached.status).toBe('breached');
  });

  it('supports a percent-of-balance daily limit', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'percent', value: 2 },
    };
    const account = makeAccount(rules, 50000);
    const snap = computeDailyLoss(account, [], new Date('2026-01-01T18:00:00.000Z'));
    expect(snap.limitAmount).toBe(1000); // 2% of 50000
    expect(snap.floor).toBe(49000);
  });
});

describe('computeConsistency', () => {
  it('flags a breach when one day dominates total profit', () => {
    const rules: PropFirmRules = {
      ...baseRules,
      consistency: { enabled: true, maxSingleDayPercent: 30 },
    };
    const account = makeAccount(rules);
    const trades = [
      trade('acc1', 4000, '2026-01-01T12:00:00.000Z'),
      trade('acc1', 500, '2026-01-02T12:00:00.000Z'),
      trade('acc1', 500, '2026-01-03T12:00:00.000Z'),
    ];
    const snap = computeConsistency(account, trades)!;
    expect(snap.bestDayPnl).toBe(4000);
    expect(snap.totalProfit).toBe(5000);
    expect(snap.ratio).toBeCloseTo(0.8);
    expect(snap.withinLimit).toBe(false);
  });

  it('is null when disabled', () => {
    const account = makeAccount(baseRules);
    expect(computeConsistency(account, [])).toBeNull();
  });
});

describe('computeAccountSnapshot', () => {
  it('reports the worst status across drawdown and daily loss', () => {
    const rules: PropFirmRules = {
      drawdown: { mode: 'static', amount: 2500, capAtBreakeven: false },
      dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
      consistency: { enabled: false, maxSingleDayPercent: 30 },
      profitTarget: 3000,
    };
    const account = makeAccount(rules);
    const trades = [trade('acc1', -1200, new Date().toISOString())];
    const snap = computeAccountSnapshot(account, trades);
    expect(snap.dailyLoss.status).toBe('breached');
    expect(snap.overallStatus).toBe('breached');
    expect(snap.profitTargetProgress).toBeCloseTo(-0.4);
  });
});
