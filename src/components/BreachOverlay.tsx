import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, radii, spacing } from '../theme/theme';
import { computeAccountSnapshot } from '../utils/drawdown';
import { formatCurrency } from '../utils/format';
import { useAlertDismiss } from './useAlertDismiss';

export function BreachOverlay() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const account = accounts.find((a) => a.id === activeAccountId) ?? null;

  const snapshot = account ? computeAccountSnapshot(account, trades) : null;
  const isBreached = snapshot?.overallStatus === 'breached';
  const { visible, dismiss } = useAlertDismiss(isBreached);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible || !account || !snapshot) return null;

  const breaches: { label: string; over: number }[] = [];
  if (snapshot.drawdown.status === 'breached') {
    breaches.push({ label: 'Max drawdown', over: -snapshot.drawdown.distanceToBreach });
  }
  if (snapshot.dailyLoss.status === 'breached') {
    breaches.push({ label: 'Daily loss limit', over: -snapshot.dailyLoss.distanceToBreach });
  }

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,59,92,0.18)', 'rgba(255,59,92,0.32)'],
  });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { backgroundColor }]}>
        <View style={styles.card}>
          <Text style={styles.siren}>⚠</Text>
          <Text style={styles.title}>LIMIT BREACHED</Text>
          <Text style={styles.accountName}>{account.name}</Text>
          {breaches.map((b) => (
            <View key={b.label} style={styles.breachRow}>
              <Text style={styles.breachLabel}>{b.label}</Text>
              <Text style={styles.breachAmount}>{formatCurrency(b.over)} over</Text>
            </View>
          ))}
          <Text style={styles.body}>
            Stop trading on this account now. Continuing to trade risks disqualification under your firm's
            rules.
          </Text>
          <TouchableOpacity style={styles.button} onPress={dismiss}>
            <Text style={styles.buttonText}>Acknowledge</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.danger,
    padding: spacing.xl,
    alignItems: 'center',
  },
  siren: { fontSize: 48, marginBottom: spacing.sm },
  title: {
    color: colors.danger,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  accountName: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.lg },
  breachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  breachLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  breachAmount: { color: colors.danger, fontSize: 14, fontFamily: fonts.mono, fontWeight: '700' },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
