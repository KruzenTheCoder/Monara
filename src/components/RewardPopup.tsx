/* ────────────────────────────────────────────────────────
 *  RewardPopup — Micro-interaction overlay for gamification events
 *
 *  Renders a queue of reward toasts (XP, level-up, badge, milestone)
 *  that auto-dismiss with smooth animations.
 * ──────────────────────────────────────────────────────── */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, Trophy, Award, TrendingUp, Star } from 'lucide-react-native';
import { useGamification } from '../context/GamificationContext';
import { GamificationEvent } from '../types/gamification';
import { theme } from '../utils/theme';

const { width: W } = Dimensions.get('window');
const TOAST_DURATION = 3000;
const ANIMATION_DURATION = 400;

interface ToastItem {
  id: string;
  event: GamificationEvent;
  opacity: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
}

const getIcon = (type: GamificationEvent['type']) => {
  switch (type) {
    case 'XP_EARNED': return Zap;
    case 'LEVEL_UP': return Star;
    case 'BADGE_UNLOCKED': return Award;
    case 'MILESTONE_REACHED': return Trophy;
    case 'STREAK_UPDATED': return TrendingUp;
    default: return Zap;
  }
};

const getColor = (type: GamificationEvent['type']) => {
  switch (type) {
    case 'XP_EARNED': return '#FBBF24';
    case 'LEVEL_UP': return '#3E92CC';
    case 'BADGE_UNLOCKED': return '#A855F7';
    case 'MILESTONE_REACHED': return '#10B981';
    case 'STREAK_UPDATED': return '#F97316';
    default: return '#FBBF24';
  }
};

export const RewardPopup: React.FC = () => {
  const { consumePendingEvents } = useGamification();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for pending events every 500ms
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const events = consumePendingEvents();
      if (events.length === 0) return;

      // Filter: only show meaningful events (skip raw XP_EARNED if there's a level-up or badge)
      const hasLevelUp = events.some(e => e.type === 'LEVEL_UP');
      const hasBadge = events.some(e => e.type === 'BADGE_UNLOCKED');
      const hasMilestone = events.some(e => e.type === 'MILESTONE_REACHED');

      let filtered = events;
      if (hasLevelUp || hasBadge || hasMilestone) {
        // Show the big events, skip plain XP toasts
        filtered = events.filter(e => e.type !== 'XP_EARNED');
      }
      // Always limit to 3 toasts at a time
      filtered = filtered.slice(0, 3);

      const newToasts: ToastItem[] = filtered.map((event, i) => ({
        id: `${Date.now()}_${i}`,
        event,
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(-30),
        scale: new Animated.Value(0.8),
      }));

      setToasts(prev => [...prev, ...newToasts]);
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [consumePendingEvents]);

  // Animate toasts in, then auto-dismiss
  useEffect(() => {
    toasts.forEach(toast => {
      // Animate in
      Animated.parallel([
        Animated.timing(toast.opacity, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }),
        Animated.spring(toast.translateY, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.spring(toast.scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();

      // Auto dismiss
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toast.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(toast.translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        });
      }, TOAST_DURATION);
    });
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: Math.max(insets.top, 20) + 8 }]} pointerEvents="none">
      {toasts.map((toast, index) => {
        const Icon = getIcon(toast.event.type);
        const color = getColor(toast.event.type);
        const message = toast.event.payload.message || '';
        const isLevelUp = toast.event.type === 'LEVEL_UP';

        return (
          <Animated.View
            key={toast.id}
            style={[
              styles.toast,
              isLevelUp && styles.toastLevelUp,
              {
                opacity: toast.opacity,
                transform: [
                  { translateY: toast.translateY },
                  { scale: toast.scale },
                ],
                marginTop: index > 0 ? 8 : 0,
                borderLeftColor: color,
                backgroundColor: theme.isDark ? 'rgba(22,22,29,0.95)' : 'rgba(255,255,255,0.97)',
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
              <Icon color={color} size={isLevelUp ? 22 : 18} strokeWidth={2.5} />
            </View>
            <View style={styles.textWrap}>
              <Text
                style={[
                  styles.message,
                  { color: theme.colors.primaryText },
                  isLevelUp && styles.messageLevelUp,
                ]}
                numberOfLines={2}
              >
                {message}
              </Text>
              {toast.event.payload.xp && toast.event.type !== 'XP_EARNED' && (
                <Text style={[styles.xpLabel, { color }]}>+{toast.event.payload.xp} MP</Text>
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
    gap: 12,
    width: '100%',
    maxWidth: 380,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  toastLevelUp: {
    paddingVertical: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  messageLevelUp: {
    fontSize: 16,
    fontWeight: '800',
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
