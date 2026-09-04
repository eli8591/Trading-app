import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing } from '../../theme/theme';

export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceBorder, true: colors.safe }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  textCol: { flex: 1, paddingRight: spacing.md },
  label: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  description: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
