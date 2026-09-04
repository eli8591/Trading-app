import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme/theme';
import { AccountSnapshot } from '../utils/drawdown';
import { formatCurrency } from '../utils/format';
import { useAlertDismiss } from './useAlertDismiss';

export function CautionBanner({ snapshot }: { snapshot: AccountSnapshot }) {
  const active = snapshot.overallStatus === 'caution';
  const { visible, dismiss } = useAlertDismiss(active);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!visible) return null;

  const nearest =
    snapshot.drawdown.distanceToBreach <= snapshot.dailyLoss.distanceToBreach
      ? { label: 'max drawdown', distance: snapshot.drawdown.distanceToBreach }
      : { label: 'daily loss limit', distance: snapshot.dailyLoss.distanceToBreach };

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.dot, { opacity: glowOpacity }]} />
      <Text style={styles.text}>
        Approaching {nearest.label} — only {formatCurrency(nearest.distance)} of room left.
      </Text>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1,
    borderColor: colors.caution,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.caution, marginRight: spacing.sm },
  text: { flex: 1, color: colors.caution, fontSize: 12, fontFamily: fonts.mono, fontWeight: '600' },
  dismiss: { color: colors.caution, fontSize: 14, fontWeight: '700', paddingLeft: spacing.sm },
});
