import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/form/Segmented';
import { TextField } from '../components/form/TextField';
import { ToggleRow } from '../components/form/ToggleRow';
import { RootStackParamList } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, radii, spacing } from '../theme/theme';
import {
  Account,
  AccountType,
  DailyLossBaseline,
  DailyLossReset,
  DrawdownMode,
  LimitValueType,
  PropFirmRules,
} from '../types';
import { FIRM_PRESETS } from '../utils/firmPresets';

type Props = NativeStackScreenProps<RootStackParamList, 'AddAccount'>;

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'evaluation' as AccountType, label: 'Evaluation' },
  { value: 'funded' as AccountType, label: 'Funded' },
  { value: 'other' as AccountType, label: 'Other' },
];

const DRAWDOWN_MODE_OPTIONS = [
  { value: 'intraday_trailing' as DrawdownMode, label: 'Intraday trailing' },
  { value: 'eod_trailing' as DrawdownMode, label: 'EOD trailing' },
  { value: 'static' as DrawdownMode, label: 'Static' },
];

const BASELINE_OPTIONS = [
  { value: 'prior_day_close' as DailyLossBaseline, label: "Prior day's close" },
  { value: 'starting_balance' as DailyLossBaseline, label: 'Starting balance' },
];

const RESET_OPTIONS = [
  { value: 'session_5pm_et' as DailyLossReset, label: '5pm ET session' },
  { value: 'midnight_local' as DailyLossReset, label: 'Midnight local' },
];

const LIMIT_TYPE_OPTIONS = [
  { value: 'fixed' as LimitValueType, label: '$ fixed' },
  { value: 'percent' as LimitValueType, label: '% of balance' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AddAccountScreen({ navigation, route }: Props) {
  const editingId = route.params?.accountId;
  const accounts = useStore((s) => s.accounts);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const existing = useMemo(() => accounts.find((a) => a.id === editingId) ?? null, [accounts, editingId]);

  const [name, setName] = useState(existing?.name ?? '');
  const [firmName, setFirmName] = useState(existing?.firmName ?? '');
  const [accountType, setAccountType] = useState<AccountType>(existing?.accountType ?? 'evaluation');
  const [startingBalance, setStartingBalance] = useState(
    existing ? String(existing.startingBalance) : ''
  );

  const [drawdownMode, setDrawdownMode] = useState<DrawdownMode>(
    existing?.rules.drawdown.mode ?? 'intraday_trailing'
  );
  const [drawdownAmount, setDrawdownAmount] = useState(
    existing ? String(existing.rules.drawdown.amount) : ''
  );
  const [capAtBreakeven, setCapAtBreakeven] = useState(existing?.rules.drawdown.capAtBreakeven ?? true);

  const [dailyBaseline, setDailyBaseline] = useState<DailyLossBaseline>(
    existing?.rules.dailyLoss.baselineType ?? 'prior_day_close'
  );
  const [dailyReset, setDailyReset] = useState<DailyLossReset>(
    existing?.rules.dailyLoss.resetRule ?? 'session_5pm_et'
  );
  const [dailyLimitType, setDailyLimitType] = useState<LimitValueType>(
    existing?.rules.dailyLoss.limitType ?? 'fixed'
  );
  const [dailyLimitValue, setDailyLimitValue] = useState(
    existing ? String(existing.rules.dailyLoss.value) : ''
  );

  const [profitTarget, setProfitTarget] = useState(
    existing?.rules.profitTarget !== undefined ? String(existing.rules.profitTarget) : ''
  );

  const [consistencyEnabled, setConsistencyEnabled] = useState(
    existing?.rules.consistency.enabled ?? false
  );
  const [consistencyPercent, setConsistencyPercent] = useState(
    existing ? String(existing.rules.consistency.maxSingleDayPercent) : '30'
  );

  function applyPreset(presetId: string) {
    const preset = FIRM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDrawdownMode(preset.rules.drawdown.mode);
    setCapAtBreakeven(preset.rules.drawdown.capAtBreakeven);
    setDailyBaseline(preset.rules.dailyLoss.baselineType);
    setDailyReset(preset.rules.dailyLoss.resetRule);
    setDailyLimitType(preset.rules.dailyLoss.limitType);
    setConsistencyEnabled(preset.rules.consistency.enabled);
    setConsistencyPercent(String(preset.rules.consistency.maxSingleDayPercent));
  }

  function parseNumber(text: string): number | null {
    const n = Number(text);
    return text.trim() !== '' && Number.isFinite(n) ? n : null;
  }

  function handleSave() {
    const balance = parseNumber(startingBalance);
    const ddAmount = parseNumber(drawdownAmount);
    const dailyValue = parseNumber(dailyLimitValue);

    if (!name.trim() || !firmName.trim()) {
      Alert.alert('Missing info', 'Give the account a name and firm.');
      return;
    }
    if (balance === null || balance <= 0) {
      Alert.alert('Missing info', 'Enter a valid starting balance.');
      return;
    }
    if (ddAmount === null || ddAmount <= 0) {
      Alert.alert('Missing info', 'Enter a valid max drawdown amount.');
      return;
    }
    if (dailyValue === null || dailyValue <= 0) {
      Alert.alert('Missing info', 'Enter a valid daily loss limit.');
      return;
    }

    const rules: PropFirmRules = {
      drawdown: { mode: drawdownMode, amount: ddAmount, capAtBreakeven },
      dailyLoss: {
        baselineType: dailyBaseline,
        resetRule: dailyReset,
        limitType: dailyLimitType,
        value: dailyValue,
      },
      profitTarget: parseNumber(profitTarget) ?? undefined,
      consistency: {
        enabled: consistencyEnabled,
        maxSingleDayPercent: parseNumber(consistencyPercent) ?? 30,
      },
    };

    if (existing) {
      const updates: Partial<Omit<Account, 'id'>> = {
        name: name.trim(),
        firmName: firmName.trim(),
        accountType,
        startingBalance: balance,
        rules,
      };
      updateAccount(existing.id, updates);
    } else {
      addAccount({
        name: name.trim(),
        firmName: firmName.trim(),
        accountType,
        startingBalance: balance,
        rules,
      });
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{existing ? 'Edit Account' : 'New Account'}</Text>

        <Section title="Account">
          <TextField label="Account name" placeholder="e.g. Lucid 50K #1" value={name} onChangeText={setName} />
          <TextField label="Firm name" placeholder="e.g. Lucid Trading" value={firmName} onChangeText={setFirmName} />
          <View style={{ marginBottom: spacing.md }}>
            <Segmented options={ACCOUNT_TYPE_OPTIONS} value={accountType} onChange={setAccountType} />
          </View>
          <TextField
            label="Starting balance ($)"
            placeholder="50000"
            keyboardType="decimal-pad"
            value={startingBalance}
            onChangeText={setStartingBalance}
          />
        </Section>

        <Section title="Rule preset">
          <Text style={styles.hint}>
            Presets set the rule shape, not dollar amounts — confirm exact figures against your firm's
            current rulebook.
          </Text>
          <View style={styles.presetRow}>
            {FIRM_PRESETS.map((p) => (
              <TouchableOpacity key={p.id} style={styles.presetChip} onPress={() => applyPreset(p.id)}>
                <Text style={styles.presetChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Max drawdown">
          <Segmented options={DRAWDOWN_MODE_OPTIONS} value={drawdownMode} onChange={setDrawdownMode} />
          <View style={{ height: spacing.md }} />
          <TextField
            label="Max drawdown amount ($)"
            placeholder="2500"
            keyboardType="decimal-pad"
            value={drawdownAmount}
            onChangeText={setDrawdownAmount}
          />
          {drawdownMode !== 'static' && (
            <ToggleRow
              label="Cap at breakeven"
              description="Stop the trailing floor from rising once it reaches your starting balance."
              value={capAtBreakeven}
              onChange={setCapAtBreakeven}
            />
          )}
        </Section>

        <Section title="Daily loss limit">
          <Text style={styles.fieldGroupLabel}>Baseline</Text>
          <Segmented options={BASELINE_OPTIONS} value={dailyBaseline} onChange={setDailyBaseline} />
          <View style={{ height: spacing.md }} />
          <Text style={styles.fieldGroupLabel}>Trading day resets</Text>
          <Segmented options={RESET_OPTIONS} value={dailyReset} onChange={setDailyReset} />
          <View style={{ height: spacing.md }} />
          <Segmented options={LIMIT_TYPE_OPTIONS} value={dailyLimitType} onChange={setDailyLimitType} />
          <View style={{ height: spacing.md }} />
          <TextField
            label={dailyLimitType === 'fixed' ? 'Daily loss limit ($)' : 'Daily loss limit (%)'}
            placeholder={dailyLimitType === 'fixed' ? '1000' : '2'}
            keyboardType="decimal-pad"
            value={dailyLimitValue}
            onChangeText={setDailyLimitValue}
          />
        </Section>

        <Section title="Profit target (optional)">
          <TextField
            label="Profit target ($)"
            placeholder="Leave blank if not applicable"
            keyboardType="decimal-pad"
            value={profitTarget}
            onChangeText={setProfitTarget}
          />
        </Section>

        <Section title="Consistency rule">
          <ToggleRow
            label="Track consistency rule"
            description="No single day's profit may exceed this % of total profit."
            value={consistencyEnabled}
            onChange={setConsistencyEnabled}
          />
          {consistencyEnabled && (
            <TextField
              label="Max single-day % of total profit"
              placeholder="30"
              keyboardType="decimal-pad"
              value={consistencyPercent}
              onChangeText={setConsistencyPercent}
            />
          )}
        </Section>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{existing ? 'Save changes' : 'Create account'}</Text>
        </TouchableOpacity>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.safe,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  fieldGroupLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, lineHeight: 16 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.safe,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.md },
  cancelButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
