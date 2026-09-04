import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/form/Segmented';
import { TextField } from '../components/form/TextField';
import { useStore } from '../store/useStore';
import { colors, fonts, radii, spacing } from '../theme/theme';
import { currentTradingDayKey, tradingDayKey } from '../utils/drawdown';
import { formatSignedCurrency } from '../utils/format';

type Result = 'win' | 'loss';

const RESULT_OPTIONS = [
  { value: 'win' as Result, label: 'Win' },
  { value: 'loss' as Result, label: 'Loss' },
];

export default function LogTradeScreen() {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const addTrade = useStore((s) => s.addTrade);
  const deleteTrade = useStore((s) => s.deleteTrade);
  const account = accounts.find((a) => a.id === activeAccountId) ?? null;

  const [result, setResult] = useState<Result>('win');
  const [amount, setAmount] = useState('');
  const [setupTag, setSetupTag] = useState('');
  const [notes, setNotes] = useState('');

  const todaysTrades = useMemo(() => {
    if (!account) return [];
    const resetRule = account.rules.dailyLoss.resetRule;
    const todayKey = currentTradingDayKey(resetRule);
    return trades
      .filter((t) => t.accountId === account.id && tradingDayKey(t.timestamp, resetRule) === todayKey)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [account, trades]);

  if (!account) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Add an account before logging trades.</Text>
        </View>
      </Screen>
    );
  }

  function handleAdd() {
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0) {
      Alert.alert('Invalid amount', 'Enter a positive dollar amount for the trade result.');
      return;
    }
    addTrade({
      accountId: account!.id,
      amount: result === 'win' ? value : -value,
      setupTag: setupTag.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setAmount('');
    setSetupTag('');
    setNotes('');
  }

  return (
    <Screen>
      <View style={styles.form}>
        <Text style={styles.title}>Log Trade</Text>
        <Text style={styles.accountLabel}>{account.name}</Text>

        <View style={{ marginBottom: spacing.md }}>
          <Segmented options={RESULT_OPTIONS} value={result} onChange={setResult} />
        </View>
        <TextField
          label="Amount ($)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextField
          label="Setup tag (optional)"
          placeholder="e.g. VWAP Pullback, EMA Cross"
          value={setupTag}
          onChangeText={setSetupTag}
        />
        <TextField
          label="Notes (optional)"
          placeholder="Session notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add trade</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Today's trades</Text>
      <FlatList
        data={todaysTrades}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No trades logged today yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() =>
              Alert.alert('Delete trade', 'Remove this trade from today\'s log?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTrade(item.id) },
              ])
            }
          >
            <GlassCard style={styles.tradeRow}>
              <View style={styles.tradeRowInner}>
                <View>
                  <Text style={styles.tradeTag}>{item.setupTag ?? 'Untagged'}</Text>
                  <Text style={styles.tradeTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                </View>
                <Text
                  style={[styles.tradeAmount, { color: item.amount >= 0 ? colors.positive : colors.negative }]}
                >
                  {formatSignedCurrency(item.amount)}
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  form: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  accountLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md },
  addButton: {
    backgroundColor: colors.safe,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addButtonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    color: colors.safe,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  tradeRow: { marginBottom: spacing.sm },
  tradeRowInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeTag: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  tradeTime: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  tradeAmount: { fontSize: 16, fontFamily: fonts.mono, fontWeight: '700' },
});
