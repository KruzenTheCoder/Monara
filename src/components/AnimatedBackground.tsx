import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { theme } from '../utils/theme';
import {
  DollarSign, CreditCard, PiggyBank, Wallet, TrendingUp,
  BarChart2, Receipt, Coins, Target, Shield,
  Banknote, CircleDollarSign, Landmark, LineChart, Percent,
} from 'lucide-react-native';

const { width: W, height: H } = Dimensions.get('window');

const ICONS = [
  DollarSign, CreditCard, PiggyBank, Wallet, TrendingUp,
  BarChart2, Receipt, Coins, Target, Shield,
  Banknote, CircleDollarSign, Landmark, LineChart, Percent,
];

// Deterministic pseudo-random seeded positions so icons never overlap badly
function seeded(i: number, salt: number) {
  return ((Math.sin(i * 9301 + salt * 4973) * 49297) % 1 + 1) % 1;
}

interface FloatingIconProps {
  Icon: typeof DollarSign;
  index: number;
  total: number;
  color: string;
}

const FloatingIcon: React.FC<FloatingIconProps> = React.memo(({ Icon, index, total, color }) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  // Distribute across a grid with jitter for organic feel
  const cols = 4;
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellW = W / cols;
  const cellH = (H + 120) / rows;
  const jitterX = (seeded(index, 1) - 0.5) * cellW * 0.6;
  const jitterY = (seeded(index, 2) - 0.5) * cellH * 0.5;
  const x = col * cellW + cellW / 2 + jitterX - 40;
  const y = row * cellH + cellH / 2 + jitterY - 60;

  const size = 76 + seeded(index, 3) * 48;
  const baseOpacity = 0.045 + seeded(index, 4) * 0.045;
  const durationX = 14000 + seeded(index, 5) * 12000;
  const durationY = 16000 + seeded(index, 6) * 14000;
  const durationR = 22000 + seeded(index, 7) * 16000;
  const driftRangeX = 18 + seeded(index, 8) * 22;
  const driftRangeY = 14 + seeded(index, 9) * 18;
  const rotRange = 4 + seeded(index, 10) * 6;
  const delay = index * 120;

  useEffect(() => {
    const smooth = Easing.bezier(0.45, 0.05, 0.55, 0.95);

    Animated.timing(fadeIn, {
      toValue: baseOpacity,
      duration: 1600 + delay,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(driftX, { toValue: driftRangeX, duration: durationX / 2, easing: smooth, useNativeDriver: true }),
        Animated.timing(driftX, { toValue: -driftRangeX, duration: durationX, easing: smooth, useNativeDriver: true }),
        Animated.timing(driftX, { toValue: 0, duration: durationX / 2, easing: smooth, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(driftY, { toValue: -driftRangeY, duration: durationY / 2, easing: smooth, useNativeDriver: true }),
        Animated.timing(driftY, { toValue: driftRangeY, duration: durationY, easing: smooth, useNativeDriver: true }),
        Animated.timing(driftY, { toValue: 0, duration: durationY / 2, easing: smooth, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: durationR / 2, easing: smooth, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: durationR, easing: smooth, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: durationR / 2, easing: smooth, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const rotation = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: [`-${rotRange}deg`, `${rotRange}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: fadeIn,
        transform: [{ translateX: driftX }, { translateY: driftY }, { rotate: rotation }],
      }}
    >
      <Icon color={color} size={size} strokeWidth={1} />
    </Animated.View>
  );
});

export const AnimatedBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDark = theme.isDark;
  const iconColor = isDark ? '#FFFFFF' : '#1B2A4A';

  // Generate 20 floating icons spread across the screen
  const icons = useMemo(() => {
    const count = 20;
    return Array.from({ length: count }, (_, i) => ({
      Icon: ICONS[i % ICONS.length],
      index: i,
      total: count,
    }));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundStart }]}>
      <View style={styles.iconField} pointerEvents="none">
        {icons.map(({ Icon, index, total }) => (
          <FloatingIcon
            key={index}
            Icon={Icon}
            index={index}
            total={total}
            color={iconColor}
          />
        ))}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
