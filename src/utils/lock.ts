import { Account } from '../types';
import { AccountSnapshot, currentTradingDayKey } from './drawdown';

export type LockReason = 'max_drawdown' | 'daily_loss' | null;

export interface LockInfo {
  locked: boolean;
  /** true = the account is done for good (max drawdown breach); false = locked only until the next trading day. */
  permanent: boolean;
  reason: LockReason;
  /** Stable key identifying this specific lock episode, for acknowledgment tracking. Null when not locked. */
  lockKey: string | null;
}

/**
 * Max-drawdown breaches end the account for good (matches how funded firms actually treat it).
 * Daily-loss breaches only lock trading until the next trading day rolls over.
 * `account.status === 'breached'` is the persisted record of a past max-drawdown breach; the live
 * snapshot is also checked so the UI reacts on the same render the breach happens, before the
 * persisting effect runs.
 */
export function getLockInfo(account: Account, snapshot: AccountSnapshot): LockInfo {
  const permanentlyBreached = account.status === 'breached' || snapshot.drawdown.status === 'breached';
  if (permanentlyBreached) {
    return { locked: true, permanent: true, reason: 'max_drawdown', lockKey: `${account.id}:permanent` };
  }

  if (snapshot.dailyLoss.status === 'breached') {
    const dayKey = currentTradingDayKey(account.rules.dailyLoss.resetRule);
    return {
      locked: true,
      permanent: false,
      reason: 'daily_loss',
      lockKey: `${account.id}:daily:${dayKey}`,
    };
  }

  return { locked: false, permanent: false, reason: null, lockKey: null };
}
