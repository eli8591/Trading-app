import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { Screen } from '../components/Screen';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, radii, spacing, statusColor } from '../theme/theme';
import { Account } from '../types';
import { computeAccountSnapshot } from '../utils/drawdown';
import { formatCurrency, formatSignedCurrency } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Accounts'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function AccountsScreen({ navigation }: Props) {
  const accounts = useStore((s) => s.accounts);
  const trades = useStore((s) => s.trades);
  const activeAccountId = useStore((s) => s.activeAccountId);
  const setActiveAccount = useStore((s) => s.setActiveAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);

  function confirmDelete(account: Account) {
    Alert.alert('Delete account', `Delete "${account.name}" and all its trade history? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(account.id) },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.getParent()?.navigate('AddAccount')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No accounts yet. Tap "+ Add" to set up your first funded account.</Text>
        }
        renderItem={({ item }) => {
          const snapshot = computeAccountSnapshot(item, trades);
          const isActive = item.id === activeAccountId;
          return (
            <TouchableOpacity
              onPress={() => setActiveAccount(item.id)}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.85}
            >
              <GlassCard
                glowColor={isActive ? colors.safe : statusColor(snapshot.overallStatus)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardFirm}>{item.firmName}</Text>
                  </View>
                  {isActive && <View style={styles.activeDot} />}
                </View>
                <View style={styles.cardStatsRow}>
                  <Text style={styles.balance}>{formatCurrency(snapshot.balance)}</Text>
                  <Text
                    style={[
                      styles.pnl,
                      { color: snapshot.dailyLoss.todaysPnl >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {formatSignedCurrency(snapshot.dailyLoss.todaysPnl)} today
                  </Text>
                </View>
                <View style={styles.cardFooterRow}>
                  <TouchableOpacity
                    onPress={() => navigation.getParent()?.navigate('AddAccount', { accountId: item.id })}
                  >
                    <Text style={styles.editLink}>Edit rules</Text>
                  </TouchableOpacity>
                  <Text style={[styles.statusTag, statusStyle(snapshot.overallStatus)]}>
                    {snapshot.overallStatus.toUpperCase()}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

function statusStyle(status: 'safe' | 'caution' | 'breached') {
  if (status === 'breached') return { color: colors.danger };
  if (status === 'caution') return { color: colors.caution };
  return { color: colors.safe };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.safe,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: 14 },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  cardFirm: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.safe, marginTop: 4 },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
  },
  balance: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pnl: { fontSize: 13, fontWeight: '600' },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  editLink: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  statusTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
