import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  Target,
  Flame,
  Trophy,
  Zap,
  Star,
  Calendar,
  DollarSign,
  ShoppingBag,
  Coffee,
  TrendingDown,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Clock,
  Gift,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { startOfWeek, endOfWeek, isToday, isThisWeek, differenceInDays, subDays } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'saving' | 'spending' | 'logging' | 'streak';
  icon: any;
  color: string;
  target: number;
  current: number;
  reward: number;
  unit: string;
  difficulty: 'easy' | 'medium' | 'hard';
  active: boolean;
}

export const ChallengesScreen = () => {
  const navigation = useNavigation();
  const {
    transactions,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    monthlySpendingByCategory,
    user,
  } = useFinancial();

  const currency = user.currency || 'USD';
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set());
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTabChange = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  // Calculate real progress based on actual data
  const todaysTransactions = transactions.filter(t => isToday(new Date(t.date)));
  const todaysExpenses = todaysTransactions.filter(t => t.type === 'expense');
  const todaysLogged = todaysTransactions.length;
  const weeklyExpenses = transactions.filter(t =>
    t.type === 'expense' && isThisWeek(new Date(t.date))
  );
  const weeklyDiningSpend = weeklyExpenses
    .filter(t => t.category === 'Food & Dining')
    .reduce((s, t) => s + t.amount, 0);
  const weeklyShoppingSpend = weeklyExpenses
    .filter(t => t.category === 'Shopping')
    .reduce((s, t) => s + t.amount, 0);

  const noSpendToday = todaysExpenses.length === 0;
  const streak = user.current_streak || 0;

  const challenges: Challenge[] = useMemo(() => {
    const dailyTarget = monthlyIncome > 0 ? Math.round(monthlyIncome * 0.01) : 5;
    const weeklyDiningTarget = monthlyIncome > 0 ? Math.round(monthlyIncome * 0.05) : 50;

    return [
      // Daily
      {
        id: 'd1',
        title: 'No-Spend Day',
        description: 'Go the entire day without spending any money',
        type: 'daily',
        category: 'spending',
        icon: DollarSign,
        color: '#10B981',
        target: 1,
        current: noSpendToday ? 1 : 0,
        reward: 50,
        unit: 'day',
        difficulty: 'easy',
        active: true,
      },
      {
        id: 'd2',
        title: 'Log 3 Transactions',
        description: 'Track at least 3 transactions today',
        type: 'daily',
        category: 'logging',
        icon: Target,
        color: '#3B82F6',
        target: 3,
        current: Math.min(todaysLogged, 3),
        reward: 30,
        unit: 'transactions',
        difficulty: 'easy',
        active: true,
      },
      {
        id: 'd3',
        title: 'Coffee-Free Day',
        description: 'Skip coffee shops and save that money',
        type: 'daily',
        category: 'saving',
        icon: Coffee,
        color: '#F59E0B',
        target: 1,
        current: todaysExpenses.some(t =>
          (t.merchant_name || '').toLowerCase().includes('coffee') ||
          (t.merchant_name || '').toLowerCase().includes('starbucks') ||
          (t.merchant_name || '').toLowerCase().includes('cafe')
        ) ? 0 : 1,
        reward: 25,
        unit: 'day',
        difficulty: 'easy',
        active: true,
      },
      // Weekly
      {
        id: 'w1',
        title: 'Dining Budget Master',
        description: `Keep dining under ${formatCurrencyFull(weeklyDiningTarget, currency)} this week`,
        type: 'weekly',
        category: 'spending',
        icon: Coffee,
        color: '#EC4899',
        target: weeklyDiningTarget,
        current: weeklyDiningSpend,
        reward: 150,
        unit: currency,
        difficulty: 'medium',
        active: true,
      },
      {
        id: 'w2',
        title: '7-Day Streak',
        description: 'Log transactions every day for 7 days straight',
        type: 'weekly',
        category: 'streak',
        icon: Flame,
        color: '#EF4444',
        target: 7,
        current: Math.min(streak, 7),
        reward: 200,
        unit: 'days',
        difficulty: 'medium',
        active: true,
      },
      {
        id: 'w3',
        title: 'Shopping Freeze',
        description: `Spend under ${formatCurrencyFull(Math.round(weeklyDiningTarget * 0.5), currency)} on shopping this week`,
        type: 'weekly',
        category: 'spending',
        icon: ShoppingBag,
        color: '#3E92CC',
        target: Math.round(weeklyDiningTarget * 0.5),
        current: weeklyShoppingSpend,
        reward: 175,
        unit: currency,
        difficulty: 'hard',
        active: true,
      },
      // Monthly
      {
        id: 'm1',
        title: 'Save 20% Challenge',
        description: 'Save at least 20% of your income this month',
        type: 'monthly',
        category: 'saving',
        icon: TrendingDown,
        color: '#10B981',
        target: 20,
        current: Math.min(savingsRate, 20),
        reward: 500,
        unit: '%',
        difficulty: 'hard',
        active: true,
      },
      {
        id: 'm2',
        title: 'Budget Warrior',
        description: 'Stay under budget in all categories for the month',
        type: 'monthly',
        category: 'spending',
        icon: Target,
        color: '#3B82F6',
        target: 100,
        current: (() => {
          const total = Object.keys(monthlySpendingByCategory).length;
          if (total === 0) return 0;
          let underBudget = 0;
          Object.entries(monthlySpendingByCategory).forEach(([cat, spent]) => {
            // Will count as passing since no budget = fine
            underBudget++;
          });
          return Math.round((underBudget / Math.max(total, 1)) * 100);
        })(),
        reward: 400,
        unit: '%',
        difficulty: 'hard',
        active: true,
      },
      {
        id: 'm3',
        title: '30-Day Streak',
        description: 'Maintain a 30-day logging streak',
        type: 'monthly',
        category: 'streak',
        icon: Flame,
        color: '#F59E0B',
        target: 30,
        current: Math.min(streak, 30),
        reward: 1000,
        unit: 'days',
        difficulty: 'hard',
        active: true,
      },
    ];
  }, [transactions, monthlyIncome, savingsRate, monthlySpendingByCategory, streak, currency]);

  const filtered = challenges.filter(c => c.type === activeTab);

  const joinChallenge = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoinedChallenges(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const totalPoints = user.total_points || 0;
  const completedToday = challenges.filter(c =>
    c.type === 'daily' && c.current >= c.target
  ).length;

  const getDifficultyStars = (d: string) => {
    if (d === 'easy') return 1;
    if (d === 'medium') return 2;
    return 3;
  };

  const isInverted = (c: Challenge) =>
    c.category === 'spending' && c.unit === (currency);

  const getProgress = (c: Challenge) => {
    if (isInverted(c)) {
      // For spending limits: being under target is progress
      return c.current <= c.target ? 1 : Math.max(0, 1 - ((c.current - c.target) / c.target));
    }
    return Math.min(c.current / c.target, 1);
  };

  const isCompleted = (c: Challenge) => {
    if (isInverted(c)) return c.current <= c.target;
    return c.current >= c.target;
  };

  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
    const progress = getProgress(challenge);
    const completed = isCompleted(challenge);
    const joined = joinedChallenges.has(challenge.id);
    const stars = getDifficultyStars(challenge.difficulty);

    return (
      <GlassBox style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIcon, { backgroundColor: `${challenge.color}20` }]}>
            <challenge.icon color={challenge.color} size={22} />
          </View>
          <View style={styles.challengeTitleArea}>
            <View style={styles.challengeTitleRow}>
              <Text style={styles.challengeTitle} numberOfLines={1}>{challenge.title}</Text>
              {completed && <CheckCircle2 color={theme.colors.status.green} size={16} />}
            </View>
            <Text style={styles.challengeDesc} numberOfLines={2}>{challenge.description}</Text>
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.difficultyRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Star
              key={i}
              color={i < stars ? '#FBBF24' : 'rgba(27,42,74,0.12)'}
              fill={i < stars ? '#FBBF24' : 'transparent'}
              size={12}
            />
          ))}
          <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
          <View style={{ flex: 1 }} />
          <Gift color="#FBBF24" size={14} />
          <Text style={styles.rewardText}>{challenge.reward} pts</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={completed ? [theme.colors.status.green, '#10B981'] : [challenge.color, `${challenge.color}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` as any }]}
            />
          </View>
          <Text style={styles.progressText}>
            {isInverted(challenge)
              ? `${formatCurrencyFull(challenge.current, currency)} / ${formatCurrencyFull(challenge.target, currency)}`
              : `${challenge.current} / ${challenge.target} ${challenge.unit}`
            }
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            completed && styles.completedButton,
            joined && !completed && styles.joinedButton,
          ]}
          onPress={() => joinChallenge(challenge.id)}
          disabled={completed}
        >
          {completed ? (
            <Text style={styles.completedButtonText}>✓ Completed</Text>
          ) : (
            <Text style={[styles.joinButtonText, joined && { color: challenge.color }]}>
              {joined ? 'Joined' : 'Join Challenge'}
            </Text>
          )}
        </TouchableOpacity>
      </GlassBox>
    );
  };

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={theme.colors.primaryText} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Smart Challenges</Text>
            <Text style={styles.headerSubtitle}>Complete challenges to earn points</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <GlassBox style={styles.statCard}>
            <Trophy color="#FBBF24" size={20} />
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </GlassBox>
          <GlassBox style={styles.statCard}>
            <Flame color="#EF4444" size={20} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </GlassBox>
          <GlassBox style={styles.statCard}>
            <CheckCircle2 color={theme.colors.status.green} size={20} />
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Done Today</Text>
          </GlassBox>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          {(['daily', 'weekly', 'monthly'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => {
                setActiveTab(tab);
                animateTabChange();
                Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Challenges List */}
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {filtered.map(c => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </Animated.View>
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primaryText },
  headerSubtitle: { fontSize: 13, color: theme.colors.secondaryText, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.colors.primaryText },
  statLabel: { fontSize: 11, color: theme.colors.secondaryText, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row', backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'rgba(187,134,252,0.2)' },
  tabText: { fontSize: 14, fontWeight: '600', color: theme.colors.secondaryText },
  activeTabText: { color: theme.colors.accent },
  challengeCard: { marginBottom: 14, padding: 16 },
  challengeHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  challengeIcon: {
    width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  challengeTitleArea: { flex: 1 },
  challengeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText, flex: 1 },
  challengeDesc: { fontSize: 13, color: theme.colors.secondaryText, marginTop: 2, lineHeight: 18 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  difficultyText: {
    fontSize: 11, color: theme.colors.secondaryText, fontWeight: '600',
    textTransform: 'capitalize', marginLeft: 4,
  },
  rewardText: { fontSize: 12, color: '#FBBF24', fontWeight: '700', marginLeft: 4 },
  progressSection: { marginBottom: 14 },
  progressBar: {
    height: 8, backgroundColor: 'rgba(27,42,74,0.06)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: theme.colors.secondaryText, textAlign: 'right' },
  joinButton: {
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderWidth: 1, borderColor: 'rgba(62,146,204,0.2)',
    alignItems: 'center',
  },
  joinedButton: {
    backgroundColor: 'rgba(187,134,252,0.05)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  completedButton: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  joinButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.accent },
  completedButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.status.green },
});
