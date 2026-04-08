import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme } from '../utils/theme';
import { useGamification } from '../context/GamificationContext';
import {
  Zap, Flame, Trophy, Award, Star, Calendar,
  Target, TrendingUp, Gift, Shield, Lock, CheckCircle2,
} from 'lucide-react-native';
import { Badge, Milestone, LevelTier } from '../types/gamification';
import { getAllLevelThresholds, getStreakMilestones } from '../utils/gamificationEngine';

/* ─── Tier colors ─── */
const TIER_COLORS: Record<LevelTier, string> = {
  'Getting Started': '#FBBF24',
  'Building the Habit': '#F97316',
  'Consistent Tracker': '#3E92CC',
  'Money Aware': '#10B981',
  'In Control': '#A855F7',
};

/* ─── Weekly day names ─── */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const RewardsScreen = () => {
  const { profile, levelInfo, xpProgress, nextStreakMilestone } = useGamification();

  const streakMilestones = getStreakMilestones();
  const tierColor = TIER_COLORS[levelInfo.tier] || '#FBBF24';

  // Ring for streak
  const nextTarget = nextStreakMilestone?.target ?? 100;
  const prevTarget = streakMilestones.slice().reverse().find(s => s.days <= profile.currentStreak)?.days ?? 0;
  const ringProg = nextTarget > prevTarget
    ? (profile.currentStreak - prevTarget) / (nextTarget - prevTarget)
    : 1;
  const size = 130;
  const sw = 10;
  const center = size / 2;
  const radius = center - sw / 2;
  const circ = 2 * Math.PI * radius;
  const dashOff = circ * (1 - Math.min(ringProg, 1));

  // XP bar
  const xpPct = Math.round(xpProgress.percent * 100);

  // Weekly dots
  const weeklyDays = profile.weeklyConsistency.activeDays.length;

  // Badge counts
  const unlockedBadges = profile.badges.filter(b => b.unlocked);
  const lockedBadges = profile.badges.filter(b => !b.unlocked);

  // Milestones
  const achievedMilestones = profile.milestones.filter(m => m.achieved);
  const pendingMilestones = profile.milestones.filter(m => !m.achieved);

  return (
    <AnimatedBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Rewards & Progress</Text>
          <Text style={theme.typography.label}>Reward consistency, not intensity.</Text>
        </View>

        {/* ── Level Card ── */}
        <GlassBox style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: `${tierColor}18` }]}>
              <Star color={tierColor} size={22} fill={tierColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.levelTitle}>Level {profile.level}</Text>
              <Text style={[styles.tierLabel, { color: tierColor }]}>{levelInfo.tier}</Text>
            </View>
            <View style={styles.xpPill}>
              <Zap color="#FBBF24" size={14} />
              <Text style={styles.xpPillText}>{profile.totalXP.toLocaleString()} MP</Text>
            </View>
          </View>
          {/* XP Progress Bar */}
          <View style={styles.xpBarWrap}>
            <View style={styles.xpBarBg}>
              <LinearGradient
                colors={[tierColor, `${tierColor}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpBarFill, { width: `${Math.max(xpPct, 2)}%` as any }]}
              />
            </View>
            <View style={styles.xpBarLabels}>
              <Text style={styles.xpBarText}>{xpProgress.current} / {xpProgress.needed} MP</Text>
              <Text style={styles.xpBarText}>{xpPct}%</Text>
            </View>
          </View>
          {profile.level < 25 && (
            <Text style={[styles.xpHint, { color: tierColor }]}>
              {xpProgress.needed - xpProgress.current} MP to Level {profile.level + 1}
            </Text>
          )}
        </GlassBox>

        {/* ── Streak Card ── */}
        <GlassBox style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.ringWrapper}>
              <Svg width={size} height={size}>
                <Circle
                  stroke={theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.06)'}
                  cx={center} cy={center} r={radius}
                  strokeWidth={sw}
                />
                <Circle
                  stroke="#F97316"
                  cx={center} cy={center} r={radius}
                  strokeWidth={sw}
                  strokeDasharray={circ}
                  strokeDashoffset={dashOff}
                  strokeLinecap="round"
                  rotation="-90" originX={center} originY={center}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Flame color="#F97316" size={20} />
                <Text style={styles.streakNum}>{profile.currentStreak}</Text>
                <Text style={styles.streakDaysLabel}>days</Text>
              </View>
            </View>
            <View style={styles.streakMeta}>
              <Text style={styles.streakTitle}>Current Streak</Text>
              {nextStreakMilestone && (
                <Text style={theme.typography.label}>
                  {nextStreakMilestone.target - profile.currentStreak} days to +{nextStreakMilestone.xp} MP
                </Text>
              )}
              <Text style={[theme.typography.label, { marginTop: 4 }]}>
                Longest: {profile.longestStreak} days
              </Text>
              <View style={styles.streakPills}>
                {streakMilestones.slice(0, 5).map(s => (
                  <View
                    key={s.days}
                    style={[
                      styles.pill,
                      profile.currentStreak >= s.days && styles.pillDone,
                    ]}
                  >
                    <Text style={[styles.pillText, profile.currentStreak >= s.days && { color: '#F97316' }]}>
                      {s.days}d
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </GlassBox>

        {/* ── Weekly Consistency ── */}
        <GlassBox style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Calendar color={theme.colors.accent} size={18} />
            <Text style={styles.weeklyTitle}>Weekly Consistency</Text>
            <Text style={[styles.weeklyCount, { color: weeklyDays >= 5 ? '#10B981' : theme.colors.secondaryText }]}>
              {weeklyDays}/7
            </Text>
          </View>
          <View style={styles.weeklyDots}>
            {WEEKDAYS.map((day, i) => {
              const active = i < weeklyDays;
              return (
                <View key={i} style={styles.weeklyDotCol}>
                  <View style={[
                    styles.weeklyDot,
                    active ? styles.weeklyDotActive : styles.weeklyDotInactive,
                  ]}>
                    {active && <CheckCircle2 color="#FFF" size={14} />}
                  </View>
                  <Text style={[styles.weeklyDayLabel, active && { color: theme.colors.primaryText }]}>{day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.weeklyBonusRow}>
            {[{ d: 3, xp: 10 }, { d: 5, xp: 40 }, { d: 7, xp: 75 }].map(b => (
              <View key={b.d} style={[styles.weeklyBonusPill, weeklyDays >= b.d && styles.weeklyBonusPillDone]}>
                <Text style={[styles.weeklyBonusText, weeklyDays >= b.d && { color: '#10B981' }]}>
                  {b.d}d → +{b.xp} MP {weeklyDays >= b.d ? '✓' : ''}
                </Text>
              </View>
            ))}
          </View>
        </GlassBox>

        {/* ── Badges ── */}
        <Text style={styles.sectionTitle}>
          <Award color={theme.colors.primaryText} size={16} /> Badges ({unlockedBadges.length}/{profile.badges.length})
        </Text>
        {unlockedBadges.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
            {unlockedBadges.map(badge => (
              <GlassBox key={badge.id} style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
              </GlassBox>
            ))}
          </ScrollView>
        )}
        {lockedBadges.length > 0 && (
          <View style={styles.lockedBadgesRow}>
            {lockedBadges.slice(0, 6).map(badge => (
              <View key={badge.id} style={styles.lockedBadge}>
                <Lock color={theme.colors.secondaryText} size={14} />
                <Text style={styles.lockedBadgeText}>{badge.name}</Text>
              </View>
            ))}
            {lockedBadges.length > 6 && (
              <Text style={[theme.typography.label, { marginTop: 4 }]}>
                +{lockedBadges.length - 6} more to unlock
              </Text>
            )}
          </View>
        )}

        {/* ── Milestones ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          <Trophy color={theme.colors.primaryText} size={16} /> Milestones ({achievedMilestones.length}/{profile.milestones.length})
        </Text>
        <GlassBox style={styles.milestonesCard}>
          {profile.milestones.map((m, i) => (
            <View key={m.id} style={[styles.milestoneRow, i > 0 && styles.milestoneBorder]}>
              <View style={[styles.milestoneIcon, m.achieved && { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                {m.achieved
                  ? <CheckCircle2 color="#10B981" size={16} />
                  : <Target color={theme.colors.secondaryText} size={16} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.milestoneName, m.achieved && { color: theme.colors.primaryText }]}>
                  {m.name}
                </Text>
                <Text style={styles.milestoneDesc}>{m.description}</Text>
              </View>
              <Text style={[styles.milestoneXP, m.achieved && { color: '#10B981' }]}>
                {m.achieved ? '✓' : `+${m.xpReward}`}
              </Text>
            </View>
          ))}
        </GlassBox>

        {/* ── Marketplace Placeholder ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          <Gift color={theme.colors.primaryText} size={16} /> Marketplace
        </Text>
        <GlassBox style={styles.marketplaceCard}>
          <View style={[styles.marketplaceIcon, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
            <Gift color="#A855F7" size={28} />
          </View>
          <Text style={styles.marketplaceTitle}>Partnerships Coming Soon</Text>
          <Text style={styles.marketplaceDesc}>
            Keep building your streak to stockpile points. Exclusive deals and discounts are on the way!
          </Text>
        </GlassBox>

        {/* ── Stats Summary ── */}
        <GlassBox style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{unlockedBadges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FBBF24' }]}>{profile.totalXP.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total MP</Text>
            </View>
          </View>
        </GlassBox>
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 45, paddingBottom: 140 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.primaryText, letterSpacing: -0.6, marginBottom: 2 },

  /* Level */
  levelCard: { marginBottom: 12 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  levelBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  levelTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.primaryText, letterSpacing: -0.6 },
  tierLabel: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  xpPillText: { fontSize: 13, fontWeight: '800', color: '#FBBF24' },
  xpBarWrap: { marginTop: 2 },
  xpBarBg: { height: 8, borderRadius: 4, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.06)', overflow: 'hidden' },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xpBarText: { fontSize: 11, fontWeight: '600', color: theme.colors.secondaryText },
  xpHint: { fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },

  /* Streak */
  streakCard: { marginBottom: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ringWrapper: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  streakNum: { fontSize: 28, fontWeight: '800', color: '#F97316', lineHeight: 32 },
  streakDaysLabel: { fontSize: 11, color: theme.colors.secondaryText },
  streakMeta: { flex: 1 },
  streakTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 2 },
  streakPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  pill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary },
  pillDone: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)' },
  pillText: { fontSize: 10, fontWeight: '600', color: theme.colors.secondaryText },

  /* Weekly */
  weeklyCard: { marginBottom: 16 },
  weeklyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  weeklyTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryText, flex: 1 },
  weeklyCount: { fontSize: 14, fontWeight: '800' },
  weeklyDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weeklyDotCol: { alignItems: 'center', gap: 4 },
  weeklyDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weeklyDotActive: { backgroundColor: '#10B981' },
  weeklyDotInactive: { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.06)' },
  weeklyDayLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.secondaryText },
  weeklyBonusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  weeklyBonusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(27,42,74,0.04)', borderWidth: 1, borderColor: theme.colors.divider },
  weeklyBonusPillDone: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)' },
  weeklyBonusText: { fontSize: 11, fontWeight: '600', color: theme.colors.secondaryText },

  /* Badges */
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.primaryText, marginBottom: 10 },
  badgeScroll: { marginBottom: 10 },
  badgeCard: { width: 120, marginRight: 10, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 12, fontWeight: '700', color: theme.colors.primaryText, textAlign: 'center' },
  badgeDesc: { fontSize: 10, color: theme.colors.secondaryText, textAlign: 'center', marginTop: 2 },
  lockedBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary },
  lockedBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.secondaryText },

  /* Milestones */
  milestonesCard: { marginBottom: 16 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  milestoneBorder: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  milestoneIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(27,42,74,0.04)' },
  milestoneName: { fontSize: 13, fontWeight: '700', color: theme.colors.secondaryText },
  milestoneDesc: { fontSize: 11, color: theme.colors.secondaryText, marginTop: 1 },
  milestoneXP: { fontSize: 12, fontWeight: '700', color: theme.colors.secondaryText },

  /* Marketplace */
  marketplaceCard: { alignItems: 'center', paddingVertical: 32, marginBottom: 16 },
  marketplaceIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  marketplaceTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.primaryText, marginBottom: 6 },
  marketplaceDesc: { fontSize: 13, color: theme.colors.secondaryText, textAlign: 'center', paddingHorizontal: 20 },

  /* Stats */
  statsCard: { marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.colors.primaryText },
  statLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.secondaryText, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: theme.colors.divider },
});
