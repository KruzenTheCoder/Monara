import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { Zap, Coffee, Palette, Gift, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const REWARDS = [
  { id: 'r1', icon: Coffee, label: 'Free Coffee Voucher', desc: 'Partner café discount', cost: 300, color: '#F59E0B' },
  { id: 'r2', icon: Palette, label: '"Nebula" Theme', desc: 'Visual customisation', cost: 800, color: '#A78BFA' },
  { id: 'r3', icon: Gift, label: '$5 Cashback', desc: 'Direct wallet credit', cost: 1200, color: '#10B981' },
  { id: 'r4', icon: ShieldCheck, label: 'Premium Month Free', desc: 'Unlock all features', cost: 2500, color: '#3B82F6' },
];

const MILESTONE_STREAKS = [3, 7, 14, 30, 60, 100];

export const RewardsScreen = () => {
  const { user } = useFinancial();
  const { current_streak, total_points } = user;

  const maxStreak = MILESTONE_STREAKS.find(m => m > current_streak) ?? 100;
  const prevMilestone = MILESTONE_STREAKS.slice().reverse().find(m => m <= current_streak) ?? 0;
  const ringProgress = (current_streak - prevMilestone) / (maxStreak - prevMilestone);

  const size = 140;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(ringProgress, 1));

  const handleRedeem = (item: (typeof REWARDS)[0]) => {
    if (total_points < item.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Not enough points', `You need ${item.cost - total_points} more points.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Redeemed!', `"${item.label}" has been added to your wallet.`);
  };

  return (
    <AnimatedBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rewards</Text>
          <Text style={theme.typography.label}>Keep the streak alive.</Text>
        </View>

        {/* Streak Ring */}
        <GlassBox style={styles.ringCard} glow glowColor="#FBBF24">
          <View style={styles.ringRow}>
            <View style={styles.ringWrapper}>
              <Svg width={size} height={size}>
                <Circle
                  stroke="rgba(255,255,255,0.08)"
                  cx={center}
                  cy={center}
                  r={radius}
                  strokeWidth={strokeWidth}
                />
                <Circle
                  stroke="#FBBF24"
                  cx={center}
                  cy={center}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  originX={center}
                  originY={center}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.streakNum}>{current_streak}</Text>
                <Text style={styles.streakLabel}>days</Text>
              </View>
            </View>
            <View style={styles.ringMeta}>
              <Text style={styles.ringTitle}>Current Streak</Text>
              <Text style={theme.typography.label}>
                {maxStreak - current_streak} days to next milestone
              </Text>
              <View style={styles.milestonePills}>
                {MILESTONE_STREAKS.slice(0, 4).map(m => (
                  <View
                    key={m}
                    style={[
                      styles.milestonePill,
                      current_streak >= m && styles.milestonePillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.milestonePillText,
                        current_streak >= m && { color: '#FBBF24' },
                      ]}
                    >
                      {m}d
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </GlassBox>

        {/* Points Balance */}
        <GlassBox style={styles.pointsCard} glow glowColor="#FBBF24">
          <View style={styles.pointsLeft}>
            <Zap color="#FBBF24" size={28} />
            <View style={{ marginLeft: 14 }}>
              <Text style={theme.typography.label}>Monara Points</Text>
              <Text style={styles.pointsVal}>{total_points.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.pointsRight}>
            <Text style={theme.typography.label}>+10 pts per log</Text>
            <Text style={[theme.typography.label, { color: '#FBBF24' }]}>+50 pts streak bonus</Text>
          </View>
        </GlassBox>

        {/* Marketplace */}
        <Text style={styles.sectionTitle}>Marketplace</Text>
        {REWARDS.map(item => {
          const canRedeem = total_points >= item.cost;
          const Icon = item.icon;
          return (
            <GlassBox key={item.id} style={styles.rewardCard}>
              <View style={[styles.rewardIcon, { backgroundColor: `${item.color}20` }]}>
                <Icon color={item.color} size={22} />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={theme.typography.body}>{item.label}</Text>
                <Text style={theme.typography.label}>{item.desc}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.redeemBtn,
                  canRedeem
                    ? { backgroundColor: `${item.color}25`, borderColor: item.color }
                    : styles.redeemBtnDisabled,
                ]}
                onPress={() => handleRedeem(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.redeemText,
                    canRedeem ? { color: item.color } : { color: 'rgba(255,255,255,0.3)' },
                  ]}
                >
                  {item.cost.toLocaleString()}
                </Text>
                <Zap
                  color={canRedeem ? item.color : 'rgba(255,255,255,0.3)'}
                  size={12}
                />
              </TouchableOpacity>
            </GlassBox>
          );
        })}
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 45,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  ringCard: {
    marginBottom: 12,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ringWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  streakNum: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFB74D',
    lineHeight: 36,
  },
  streakLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  ringMeta: {
    flex: 1,
  },
  ringTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  milestonePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  milestonePill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    backgroundColor: '#1E1E1E',
  },
  milestonePillDone: {
    borderColor: '#FFB74D',
    backgroundColor: 'transparent',
  },
  milestonePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFB74D',
    lineHeight: 28,
  },
  pointsRight: {
    alignItems: 'flex-end',
    gap: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  redeemBtnDisabled: {
    borderColor: '#2C2C2C',
    backgroundColor: '#1E1E1E',
  },
  redeemText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
