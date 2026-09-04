import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';
import { Account } from '../types';
import { LockInfo } from '../utils/lock';

function resetCopy(account: Account): string {
  return account.rules.dailyLoss.resetRule === 'session_5pm_et' ? '5pm ET' : 'midnight (local time)';
}

export function LockNotice({
  account,
  lock,
  compact = false,
}: {
  account: Account;
  lock: LockInfo;
  /** compact = a slim always-visible banner (e.g. Dashboard); full = a detailed block replacing a form. */
  compact?: boolean;
}) {
  if (!lock.locked) return null;

  const title = lock.permanent ? '🔒 ACCOUNT LOCKED — PERMANENT' : '🔒 TRADING LOCKED FOR TODAY';
  const body = lock.permanent
    ? 'Max drawdown was breached. This account is disqualified — trade logging is disabled here for good.'
    : `Daily loss limit was breached. Trade logging is disabled until it resets at ${resetCopy(account)}.`;

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.body, compact && styles.bodyCompact]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,59,92,0.14)',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compact: { padding: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.danger, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  body: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs, lineHeight: 16 },
  bodyCompact: { fontSize: 11 },
});
