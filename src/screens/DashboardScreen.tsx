import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AnimatedNumberText } from '../components/AnimatedNumber';
import { CautionBanner } from '../components/CautionBanner';
import { CircularGauge } from '../components/CircularGauge';
import { GlassCard } from '../components/GlassCard';
import { LimitBar, usedFraction } from '../components/LimitBar';
import { Screen } from '../components/Screen';
import { useStore } from '../store/useStore';
import { colors, fonts, radii, spacing, statusColor } from '../theme/theme';
import { computeAccountSnapshot } from '../utils/drawdown';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../utils/format';

export default function DashboardScreen() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const setActiveAccount = useStore((s) => s.setActiveAccount);
  const account = accounts.find((a) => a.id === activeAccountId) ?? null;

  if (!account) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No account selected. Add an account from the Accounts tab.</Text>
        </View>
      </Screen>
    );
  }

  const snapshot = computeAccountSnapshot(account, trades);
  const { drawdown, dailyLoss, consistency, profitTargetProgress } = snapshot;

  const worstDistance = Math.min(drawdown.distanceToBreach, dailyLoss.distanceToBreach);
  const worstLabel = drawdown.distanceToBreach <= dailyLoss.distanceToBreach ? 'max drawdown' : 'daily loss limit';
  const heroColor = statusColor(snapshot.overallStatus);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {accounts.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switcher}>
            {accounts.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.chip, a.id === account.id && styles.chipActive]}
                onPress={() => setActiveAccount(a.id)}
              >
                <Text style={[styles.chipText, a.id === account.id && styles.chipTextActive]}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.accountName}>{account.name}</Text>
        <Text style={styles.firmName}>{account.firmName}</Text>

        <CautionBanner snapshot={snapshot} />

        <GlassCard glowColor={heroColor} style={styles.heroCard}>
          <Text style={styles.heroLabel}>Distance to breach · {worstLabel}</Text>
          <AnimatedNumberText
            value={Math.max(0, worstDistance)}
            formatter={formatCurrency}
            style={[styles.heroNumber, { color: heroColor }]}
          />
          {worstDistance <= 0 && <Text style={styles.breachedTag}>LIMIT BREACHED</Text>}
        </GlassCard>

        <View style={styles.gaugeRow}>
          <GlassCard glowColor={statusColor(drawdown.status)} style={styles.gaugeCard}>
            <Text style={styles.gaugeTitle}>Max Drawdown</Text>
            <CircularGauge
              size={150}
              strokeWidth={12}
              fraction={usedFraction(drawdown.distanceToBreach, account.rules.drawdown.amount)}
              status={drawdown.status}
            >
              <Text style={styles.gaugeCenterCaption}>LEFT</Text>
              <AnimatedNumberText
                value={drawdown.distanceToBreach}
                formatter={formatCurrency}
                style={[styles.gaugeCenterValue, { color: statusColor(drawdown.status) }]}
              />
            </CircularGauge>
          </GlassCard>

          <GlassCard glowColor={statusColor(dailyLoss.status)} style={styles.gaugeCard}>
            <Text style={styles.gaugeTitle}>Daily Loss</Text>
            <CircularGauge
              size={150}
              strokeWidth={12}
              fraction={usedFraction(dailyLoss.distanceToBreach, dailyLoss.limitAmount)}
              status={dailyLoss.status}
            >
              <Text style={styles.gaugeCenterCaption}>LEFT</Text>
              <AnimatedNumberText
                value={dailyLoss.distanceToBreach}
                formatter={formatCurrency}
                style={[styles.gaugeCenterValue, { color: statusColor(dailyLoss.status) }]}
              />
            </CircularGauge>
          </GlassCard>
        </View>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statBox}>
            <Text style={styles.statLabel}>Balance</Text>
            <AnimatedNumberText value={snapshot.balance} formatter={formatCurrency} style={styles.statValue} />
          </GlassCard>
          <GlassCard style={styles.statBox}>
            <Text style={styles.statLabel}>Today's P&amp;L</Text>
            <AnimatedNumberText
              value={dailyLoss.todaysPnl}
              formatter={formatSignedCurrency}
              style={[styles.statValue, { color: dailyLoss.todaysPnl >= 0 ? colors.positive : colors.negative }]}
            />
          </GlassCard>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Max drawdown detail</Text>
          <Text style={styles.subtext}>
            Floor {formatCurrency(drawdown.threshold)} · Peak {formatCurrency(drawdown.highWaterMark)}
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Daily loss detail</Text>
          <Text style={styles.subtext}>
            Baseline {formatCurrency(dailyLoss.baseline)} · Floor {formatCurrency(dailyLoss.floor)}
          </Text>
        </GlassCard>

        {account.rules.profitTarget ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Profit target</Text>
            <LimitBar
              label=""
              status="safe"
              fraction={Math.min(1, Math.max(0, profitTargetProgress ?? 0))}
              caption={formatPercent(profitTargetProgress ?? 0)}
            />
            <Text style={styles.subtext}>
              {formatCurrency(snapshot.balance - account.startingBalance)} of{' '}
              {formatCurrency(account.rules.profitTarget)}
            </Text>
          </GlassCard>
        ) : null}

        {consistency ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Consistency rule</Text>
            <Text style={styles.subtext}>
              Best day {formatCurrency(consistency.bestDayPnl)} of {formatCurrency(consistency.totalProfit)} total
              profit
            </Text>
            <Text
              style={[
                styles.consistencyValue,
                { color: consistency.withinLimit ? colors.safe : colors.danger },
              ]}
            >
              {consistency.ratio !== null ? formatPercent(consistency.ratio) : '—'} / max{' '}
              {formatPercent(consistency.maxAllowed)}
            </Text>
          </GlassCard>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  switcher: { marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  chipActive: { borderColor: colors.safe },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.safe },
  accountName: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  firmName: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.lg },
  heroCard: { alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1.5 },
  heroLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  heroNumber: { fontSize: 44, fontFamily: fonts.monoBold, fontWeight: '700' },
  breachedTag: { color: colors.danger, fontWeight: '700', marginTop: spacing.sm, letterSpacing: 1 },
  gaugeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  gaugeCard: { flex: 1, alignItems: 'center' },
  gaugeTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  gaugeCenterCaption: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  gaugeCenterValue: { fontSize: 16, fontFamily: fonts.mono, fontWeight: '700', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statBox: { flex: 1 },
  statLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: spacing.xs },
  statValue: { color: colors.textPrimary, fontSize: 18, fontFamily: fonts.mono, fontWeight: '600' },
  card: { marginBottom: spacing.md },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  subtext: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  consistencyValue: { fontSize: 16, fontFamily: fonts.mono, fontWeight: '700', marginTop: spacing.xs },
});
