import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';

export function useAnimatedNumber(value: number, duration = 500): number {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setDisplay(value);
      anim.setValue(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export function AnimatedNumberText({
  value,
  formatter,
  style,
  duration,
}: {
  value: number;
  formatter: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const display = useAnimatedNumber(value, duration);
  return <Text style={style}>{formatter(display)}</Text>;
}
