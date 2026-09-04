import { useEffect } from 'react';
import { computeDrawdown } from '../utils/drawdown';
import { useStore } from './useStore';

/**
 * Persists a max-drawdown breach permanently onto the account (status: 'breached'), so the lock
 * survives app restarts and doesn't depend on recomputing from trade history alone. Daily-loss
 * breaches are intentionally NOT persisted here — they're meant to clear on the next trading day,
 * which the live snapshot already handles.
 */
export function useSyncAccountStatuses() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const updateAccount = useStore((s) => s.updateAccount);

  useEffect(() => {
    accounts.forEach((account) => {
      if (account.status !== 'active') return;
      const accountTrades = trades.filter((t) => t.accountId === account.id);
      const drawdown = computeDrawdown(account, accountTrades);
      if (drawdown.status === 'breached') {
        updateAccount(account.id, { status: 'breached' });
      }
    });
  }, [accounts, trades, updateAccount]);
}
