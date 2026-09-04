import { Account, PropFirmRules, Trade } from '../types';
import { computeHistoricalDaySnapshot } from './drawdown';
import { computeTradeStats } from './stats';

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

const rules: PropFirmRules = {
  drawdown: { mode: 'static', amount: 2500, capAtBreakeven: false },
  dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
  consistency: { enabled: false, maxSingleDayPercent: 30 },
};

describe('computeTradeStats', () => {
  it('computes win rate, averages, and best/worst days', () => {
    const trades = [
      trade('acc1', 500, '2026-01-01T12:00:00.000Z'),
      trade('acc1', -200, '2026-01-01T13:00:00.000Z'),
      trade('acc1', 300, '2026-01-02T12:00:00.000Z'),
      trade('acc1', -900, '2026-01-03T12:00:00.000Z'),
    ];
    const stats = computeTradeStats(trades, 'midnight_local');
    expect(stats.totalTrades).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(2);
    expect(stats.winRate).toBeCloseTo(0.5);
    expect(stats.avgWin).toBeCloseTo(400);
    expect(stats.avgLoss).toBeCloseTo(-550);
    expect(stats.bestDay?.pnl).toBe(300);
    expect(stats.worstDay?.pnl).toBe(-900);
  });

  it('handles no trades gracefully', () => {
    const stats = computeTradeStats([], 'midnight_local');
    expect(stats.winRate).toBe(0);
    expect(stats.avgWin).toBe(0);
    expect(stats.bestDay).toBeNull();
  });
});

describe('computeHistoricalDaySnapshot', () => {
  it('reflects the account status as of the end of a past day, ignoring later trades', () => {
    const account = makeAccount(rules);
    const trades = [
      trade('acc1', -950, '2026-01-01T12:00:00.000Z'), // day 1: caution (only $50 of $1000 limit left)
      trade('acc1', 2000, '2026-01-02T12:00:00.000Z'), // day 2: fully recovered
    ];
    const day1 = computeHistoricalDaySnapshot(account, trades, '2026-01-01');
    expect(day1.status).toBe('caution');

    const day2 = computeHistoricalDaySnapshot(account, trades, '2026-01-02');
    expect(day2.status).toBe('safe');
  });
});
