import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, statusColor, statusGlow, StatusColorKey } from '../theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CircularGauge({
  size = 220,
  strokeWidth = 16,
  fraction,
  status,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  /** 0 = empty (fully safe), 1 = full (at the limit). */
  fraction: number;
  status: StatusColorKey;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));

  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  useEffect(() => {
    if (status === 'safe') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });
  const color = statusColor(status);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: statusGlow(status),
            opacity: status === 'safe' ? 0.12 : glowOpacity,
          },
        ]}
      />
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
