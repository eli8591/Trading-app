import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/theme';

export function GlassCard({
  children,
  style,
  glowColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Optional accent border/shadow color, e.g. a status glow. */
  glowColor?: string;
}) {
  return (
    <View
      style={[
        styles.wrap,
        glowColor
          ? { borderColor: glowColor, shadowColor: glowColor }
          : { borderColor: colors.surfaceBorder },
        style,
      ]}
    >
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17,17,24,0.55)',
  },
  content: { padding: 16 },
});
