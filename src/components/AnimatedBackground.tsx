import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { theme } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const Orb = ({ size, color, x, y, duration }: {
  size: number; color: string; x: number; y: number; duration: number;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, { toValue: 1, duration: 1500, useNativeDriver: true }).start();

    // Subtle float Y
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -18, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 18, duration: duration * 1.1, useNativeDriver: true }),
      ]),
    ).start();

    // Subtle float X
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 12, duration: duration * 0.9, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -12, duration: duration * 1.2, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: x,
          top: y,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
};

export const AnimatedBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      <Orb size={220} color="rgba(124,58,237,0.06)" x={-60} y={H * 0.08} duration={6000} />
      <Orb size={180} color="rgba(3,218,198,0.04)" x={W * 0.55} y={H * 0.35} duration={7500} />
      <Orb size={140} color="rgba(187,134,252,0.05)" x={W * 0.1} y={H * 0.65} duration={8000} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundStart,
  },
  orb: {
    position: 'absolute',
  },
});
