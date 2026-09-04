import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStore } from '../store/useStore';
import { colors, fonts, radii, spacing } from '../theme/theme';
import { computeAccountSnapshot } from '../utils/drawdown';
import { formatCurrency } from '../utils/format';
import { getLockInfo } from '../utils/lock';

const CONFIRM_PHRASE = 'I WILL NOT TRADE';
const COUNTDOWN_SECONDS = 10;

export function BreachOverlay() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const acknowledgedLocks = useStore((s) => s.acknowledgedLocks);
  const acknowledgeLock = useStore((s) => s.acknowledgeLock);
  const account = accounts.find((a) => a.id === activeAccountId) ?? null;

  const snapshot = account ? computeAccountSnapshot(account, trades) : null;
  const lock = account && snapshot ? getLockInfo(account, snapshot) : null;
  const needsConfirmation = !!lock?.locked && !!lock.lockKey && !acknowledgedLocks[lock.lockKey];

  const [phrase, setPhrase] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const lockKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!needsConfirmation) return;
    if (lockKeyRef.current !== lock!.lockKey) {
      lockKeyRef.current = lock!.lockKey;
      setPhrase('');
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [needsConfirmation, lock]);

  useEffect(() => {
    if (!needsConfirmation || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [needsConfirmation, countdown]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!needsConfirmation) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [needsConfirmation, pulse]);

  if (!needsConfirmation || !account || !snapshot || !lock) return null;

  const phraseMatches = phrase.trim().toUpperCase() === CONFIRM_PHRASE;
  const canConfirm = phraseMatches && countdown <= 0;

  const breaches: { label: string; over: number }[] = [];
  if (snapshot.drawdown.status === 'breached') {
    breaches.push({ label: 'Max drawdown', over: -snapshot.drawdown.distanceToBreach });
  }
  if (snapshot.dailyLoss.status === 'breached') {
    breaches.push({ label: 'Daily loss limit', over: -snapshot.dailyLoss.distanceToBreach });
  }

  const resetCopy =
    account.rules.dailyLoss.resetRule === 'session_5pm_et' ? '5pm ET' : 'midnight (local time)';

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,59,92,0.18)', 'rgba(255,59,92,0.32)'],
  });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { backgroundColor }]}>
        <View style={styles.card}>
          <Text style={styles.siren}>⚠</Text>
          <Text style={styles.title}>{lock.permanent ? 'ACCOUNT LOCKED' : 'TRADING LOCKED'}</Text>
          <Text style={styles.accountName}>{account.name}</Text>

          {breaches.map((b) => (
            <View key={b.label} style={styles.breachRow}>
              <Text style={styles.breachLabel}>{b.label}</Text>
              <Text style={styles.breachAmount}>{formatCurrency(b.over)} over</Text>
            </View>
          ))}

          <Text style={styles.body}>
            {lock.permanent
              ? "You've breached max drawdown. Under this rule set that's a permanent disqualification — DrawdownGuard is locking this account for good. Trade logging is disabled here."
              : `You've breached today's daily loss limit. Trading is locked in this app until it resets at ${resetCopy}.`}
          </Text>
          <Text style={styles.warning}>
            Stop trading on this account in your broker platform now — DrawdownGuard cannot close it for
            you.
          </Text>

          <Text style={styles.instruction}>
            Type "{CONFIRM_PHRASE}" to continue{countdown > 0 ? ` (${countdown}s)` : ''}
          </Text>
          <TextInput
            style={styles.input}
            value={phrase}
            onChangeText={setPhrase}
            placeholder={CONFIRM_PHRASE}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, !canConfirm && styles.buttonDisabled]}
            disabled={!canConfirm}
            onPress={() => acknowledgeLock(lock.lockKey!)}
          >
            <Text style={styles.buttonText}>
              {countdown > 0 ? `Wait ${countdown}s...` : 'Confirm & Continue'}
            </Text>
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
    lineHeight: 18,
  },
  warning: {
    color: colors.caution,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  instruction: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.mono,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
