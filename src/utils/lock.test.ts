import { Account, PropFirmRules } from '../types';
import { computeAccountSnapshot } from './drawdown';
import { getLockInfo } from './lock';

function makeAccount(rules: PropFirmRules, status: Account['status'] = 'active'): Account {
  return {
    id: 'acc1',
    name: 'Test',
    firmName: 'Test Firm',
    accountType: 'evaluation',
    startingBalance: 50000,
    createdAt: new Date().toISOString(),
    rules,
    status,
  };
}

const rules: PropFirmRules = {
  drawdown: { mode: 'static', amount: 2500, capAtBreakeven: false },
  dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 1000 },
  consistency: { enabled: false, maxSingleDayPercent: 30 },
};

describe('getLockInfo', () => {
  it('is unlocked when safe', () => {
    const account = makeAccount(rules);
    const snapshot = computeAccountSnapshot(account, []);
    expect(getLockInfo(account, snapshot).locked).toBe(false);
  });

  it('permanently locks on a max-drawdown breach even before status is persisted', () => {
    const account = makeAccount(rules); // status still 'active'
    const trades = [{ id: 't1', accountId: 'acc1', amount: -3000, timestamp: new Date().toISOString() }];
    const snapshot = computeAccountSnapshot(account, trades);
    const lock = getLockInfo(account, snapshot);
    expect(lock.locked).toBe(true);
    expect(lock.permanent).toBe(true);
    expect(lock.reason).toBe('max_drawdown');
    expect(lock.lockKey).toBe('acc1:permanent');
  });

  it('same-day locks on a daily-loss breach, keyed by trading day', () => {
    const account = makeAccount(rules);
    const trades = [{ id: 't1', accountId: 'acc1', amount: -1200, timestamp: new Date().toISOString() }];
    const snapshot = computeAccountSnapshot(account, trades);
    const lock = getLockInfo(account, snapshot);
    expect(lock.locked).toBe(true);
    expect(lock.permanent).toBe(false);
    expect(lock.reason).toBe('daily_loss');
    expect(lock.lockKey).toMatch(/^acc1:daily:\d{4}-\d{2}-\d{2}$/);
  });

  it('stays permanently locked once status is persisted, even if today looks fine', () => {
    const account = makeAccount(rules, 'breached');
    const snapshot = computeAccountSnapshot(account, []);
    const lock = getLockInfo(account, snapshot);
    expect(lock.locked).toBe(true);
    expect(lock.permanent).toBe(true);
  });
});
