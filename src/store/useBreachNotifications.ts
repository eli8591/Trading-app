import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Account } from '../types';
import { AccountSnapshot, computeAccountSnapshot, LimitStatus } from '../utils/drawdown';
import { useStore } from './useStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SEVERITY: Record<LimitStatus, number> = { safe: 0, caution: 1, breached: 2 };

function triggeredLimitLabel(snapshot: AccountSnapshot, status: LimitStatus): string {
  return snapshot.drawdown.status === status ? 'Max drawdown' : 'Daily loss limit';
}

/**
 * Fires a real iOS local notification the moment an account crosses into caution or breach,
 * so the warning reaches you even if DrawdownGuard is backgrounded or you're on a different
 * account's screen. Edge-triggered: only fires when severity increases, not on every render.
 */
export function useBreachNotifications() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const prevStatuses = useRef<Map<string, LimitStatus>>(new Map());
  const requestedPermission = useRef(false);

  useEffect(() => {
    if (requestedPermission.current) return;
    requestedPermission.current = true;
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  useEffect(() => {
    accounts.forEach((account: Account) => {
      const accountTrades = trades.filter((t) => t.accountId === account.id);
      const snapshot = computeAccountSnapshot(account, accountTrades);
      const prev = prevStatuses.current.get(account.id) ?? 'safe';
      const next = snapshot.overallStatus;

      if (SEVERITY[next] > SEVERITY[prev]) {
        const label = triggeredLimitLabel(snapshot, next);
        Notifications.scheduleNotificationAsync({
          content: {
            title: next === 'breached' ? '🚨 Limit breached' : '⚠️ Approaching limit',
            body: `${account.name}: ${label} ${next === 'breached' ? 'breached' : 'nearly breached'}.`,
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
      prevStatuses.current.set(account.id, next);
    });
  }, [accounts, trades]);
}
