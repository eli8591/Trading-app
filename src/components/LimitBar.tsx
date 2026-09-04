import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing, statusColor } from '../theme/theme';
import { clamp } from '../utils/format';

type LimitStatus = 'safe' | 'caution' | 'breached';

export function usedFraction(distanceToBreach: number, limitAmount: number): number {
  if (limitAmount <= 0) return 0;
  return clamp(1 - distanceToBreach / limitAmount, 0, 1);
}

export function LimitBar({
  label,
  status,
  fraction,
  caption,
}: {
  label: string;
  status: LimitStatus;
  fraction: number;
  caption: string;
}) {
  const color = statusColor(status);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.caption, { color }]}>{caption}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  caption: { fontSize: 12, fontFamily: fonts.mono, fontWeight: '600' },
  track: { height: 10, borderRadius: radii.full, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
});
