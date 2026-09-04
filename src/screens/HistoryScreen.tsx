import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { Screen } from '../components/Screen';
import { useStore } from '../store/useStore';
import { colors, fonts, radii, spacing, statusColor } from '../theme/theme';
import { computeHistoricalDaySnapshot } from '../utils/drawdown';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../utils/format';
import { computeTradeStats } from '../utils/stats';

function formatDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const account = accounts.find((a) => a.id === activeAccountId) ?? null;

  const accountTrades = useMemo(
    () => (account ? trades.filter((t) => t.accountId === account.id) : []),
    [account, trades]
  );

  const stats = useMemo(
    () => (account ? computeTradeStats(accountTrades, account.rules.dailyLoss.resetRule) : null),
    [account, accountTrades]
  );

  if (!account || !stats) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No account selected. Add an account from the Accounts tab.</Text>
        </View>
      </Screen>
    );
  }

  const daysDescending = [...stats.days].reverse();

  return (
    <Screen>
      <FlatList
        data={daysDescending}
        keyExtractor={(d) => d.dayKey}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>{account.name}</Text>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statBox}>
                <Text style={styles.statLabel}>Win rate</Text>
                <Text style={styles.statValue}>{formatPercent(stats.winRate)}</Text>
                <Text style={styles.statSub}>
                  {stats.wins}W / {stats.losses}L
                </Text>
              </GlassCard>
              <GlassCard style={styles.statBox}>
                <Text style={styles.statLabel}>Avg win</Text>
                <Text style={[styles.statValue, { color: colors.positive }]}>
                  {formatCurrency(stats.avgWin)}
                </Text>
              </GlassCard>
              <GlassCard style={styles.statBox}>
                <Text style={styles.statLabel}>Avg loss</Text>
                <Text style={[styles.statValue, { color: colors.negative }]}>
                  {formatCurrency(stats.avgLoss)}
                </Text>
              </GlassCard>
            </View>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statBox}>
                <Text style={styles.statLabel}>Best day</Text>
                <Text style={[styles.statValue, { color: colors.positive }]}>
                  {stats.bestDay ? formatSignedCurrency(stats.bestDay.pnl) : '—'}
                </Text>
                <Text style={styles.statSub}>{stats.bestDay ? formatDayKey(stats.bestDay.dayKey) : ''}</Text>
              </GlassCard>
              <GlassCard style={styles.statBox}>
                <Text style={styles.statLabel}>Worst day</Text>
                <Text style={[styles.statValue, { color: colors.negative }]}>
                  {stats.worstDay ? formatSignedCurrency(stats.worstDay.pnl) : '—'}
                </Text>
                <Text style={styles.statSub}>{stats.worstDay ? formatDayKey(stats.worstDay.dayKey) : ''}</Text>
              </GlassCard>
            </View>

            <Text style={styles.sectionTitle}>Trading days</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No trades logged yet.</Text>}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const daySnapshot = computeHistoricalDaySnapshot(account, accountTrades, item.dayKey);
          return (
            <GlassCard style={styles.dayCard}>
              <View style={styles.dayRow}>
                <View>
                  <Text style={styles.dayDate}>{formatDayKey(item.dayKey)}</Text>
                  <Text style={styles.dayTradeCount}>{item.trades.length} trades</Text>
                </View>
                <View style={styles.dayRight}>
                  <Text style={[styles.dayPnl, { color: item.pnl >= 0 ? colors.positive : colors.negative }]}>
                    {formatSignedCurrency(item.pnl)}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor(daySnapshot.status) }]} />
                    <Text style={[styles.statusLabel, { color: statusColor(daySnapshot.status) }]}>
                      {daySnapshot.status === 'safe' ? 'Clear' : daySnapshot.status === 'caution' ? 'Approached limit' : 'Breached'}
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statBox: { flex: 1 },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.mono, fontWeight: '700', marginTop: 4 },
  statSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  sectionTitle: {
    color: colors.safe,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  dayCard: { marginBottom: spacing.sm },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  dayTradeCount: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  dayRight: { alignItems: 'flex-end' },
  dayPnl: { fontSize: 16, fontFamily: fonts.mono, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '600' },
});
