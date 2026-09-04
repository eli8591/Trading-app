import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(0,217,255,0.14)',
    borderWidth: 1,
    borderColor: colors.safe,
  },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  labelActive: { color: colors.safe },
});
