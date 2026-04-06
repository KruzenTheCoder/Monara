import React, { useMemo, useRef, useEffect } from 'react';
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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Calendar,
  Activity,
  Flame,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { differenceInDays, startOfMonth, subMonths } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HealthMetric {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  icon: any;
  color: string;
  description: string;
  tips: string[];
  details: {
    label: string;
    value: string;
  }[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  unlocked: boolean;
  progress?: number;
}

export const FinancialHealthScreen = () => {
  const {
    transactions,
    monthlyIncome,
    monthlyExpenses,
    balance,
    savingsRate,
    budgets,
    monthlySpendingByCategory,
    savingsGoals,
    user,
  } = useFinancial();

  const currency = user.currency || 'USD';
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  // Calculate Emergency Fund Score
  const emergencyFundScore = useMemo((): HealthMetric => {
    const monthsOfExpenses = monthlyExpenses > 0 ? balance / monthlyExpenses : 0;
    let score = 0;
    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (monthsOfExpenses >= 6) {
      score = 100;
      status = 'excellent';
    } else if (monthsOfExpenses >= 3) {
      score = 75;
      status = 'good';
    } else if (monthsOfExpenses >= 1) {
      score = 50;
      status = 'fair';
    } else {
      score = Math.min((monthsOfExpenses / 1) * 50, 50);
      status = 'poor';
    }

    return {
      id: 'emergency',
      name: 'Emergency Fund',
      score,
      maxScore: 100,
      weight: 0.25,
      status,
      icon: Shield,
      color: '#10B981',
      description: 'Your safety net for unexpected expenses',
      tips: [
        monthsOfExpenses < 3 ? 'Aim for 3-6 months of expenses' : 'Great! Maintain your emergency fund',
        'Set up automatic monthly transfers',
        'Keep funds in a high-yield savings account',
      ],
      details: [
        { label: 'Current Balance', value: formatCurrencyFull(balance, currency) },
        { label: 'Monthly Expenses', value: formatCurrencyFull(monthlyExpenses, currency) },
        { label: 'Months Covered', value: monthsOfExpenses.toFixed(1) },
        { label: 'Recommended', value: formatCurrencyFull(monthlyExpenses * 6, currency) },
      ],
    };
  }, [balance, monthlyExpenses, currency]);

  // Calculate Savings Rate Score
  const savingsRateMetric = useMemo((): HealthMetric => {
    let score = 0;
    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (savingsRate >= 20) {
      score = 100;
      status = 'excellent';
    } else if (savingsRate >= 15) {
      score = 80;
      status = 'good';
    } else if (savingsRate >= 10) {
      score = 60;
      status = 'fair';
    } else {
      score = Math.min((savingsRate / 10) * 60, 60);
      status = 'poor';
    }

    return {
      id: 'savings',
      name: 'Savings Rate',
      score,
      maxScore: 100,
      weight: 0.25,
      status,
      icon: TrendingUp,
      color: '#3B82F6',
      description: 'Percentage of income you save',
      tips: [
        savingsRate < 20 ? 'Try the 50/30/20 rule (50% needs, 30% wants, 20% savings)' : 'Excellent savings discipline!',
        'Automate your savings',
        'Review and cut unnecessary subscriptions',
      ],
      details: [
        { label: 'Monthly Income', value: formatCurrencyFull(monthlyIncome, currency) },
        { label: 'Monthly Expenses', value: formatCurrencyFull(monthlyExpenses, currency) },
        { label: 'Net Savings', value: formatCurrencyFull(monthlyIncome - monthlyExpenses, currency) },
        { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%` },
      ],
    };
  }, [savingsRate, monthlyIncome, monthlyExpenses, currency]);

  // Calculate Budget Adherence Score
  const budgetAdherenceScore = useMemo((): HealthMetric => {
    if (budgets.length === 0) {
      return {
        id: 'budget',
        name: 'Budget Adherence',
        score: 0,
        maxScore: 100,
        weight: 0.20,
        status: 'poor',
        icon: Target,
        color: '#F59E0B',
        description: 'How well you stick to your budgets',
        tips: [
          'Set up budgets for your main spending categories',
          'Review your budgets weekly',
          'Use alerts to stay on track',
        ],
        details: [
          { label: 'Active Budgets', value: '0' },
          { label: 'Categories Tracked', value: '0' },
        ],
      };
    }

    let totalScore = 0;
    let budgetsOverLimit = 0;
    let budgetsNearLimit = 0;

    budgets.forEach(budget => {
      const spent = monthlySpendingByCategory[budget.category] || 0;
      const percentage = budget.monthly_limit > 0 ? spent / budget.monthly_limit : 0;

      if (percentage <= 0.8) {
        totalScore += 100;
      } else if (percentage <= 1.0) {
        totalScore += 70;
        budgetsNearLimit++;
      } else {
        totalScore += Math.max(0, 50 - (percentage - 1) * 50);
        budgetsOverLimit++;
      }
    });

    const avgScore = totalScore / budgets.length;
    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (avgScore >= 90) status = 'excellent';
    else if (avgScore >= 75) status = 'good';
    else if (avgScore >= 60) status = 'fair';

    return {
      id: 'budget',
      name: 'Budget Adherence',
      score: avgScore,
      maxScore: 100,
      weight: 0.20,
      status,
      icon: Target,
      color: '#F59E0B',
      description: 'How well you stick to your budgets',
      tips: [
        budgetsOverLimit > 0 ? `${budgetsOverLimit} budget(s) exceeded - review your spending` : 'Great budget control!',
        'Set realistic budget limits',
        'Track daily to stay aware',
      ],
      details: [
        { label: 'Active Budgets', value: budgets.length.toString() },
        { label: 'On Track', value: (budgets.length - budgetsOverLimit - budgetsNearLimit).toString() },
        { label: 'Near Limit', value: budgetsNearLimit.toString() },
        { label: 'Over Limit', value: budgetsOverLimit.toString() },
      ],
    };
  }, [budgets, monthlySpendingByCategory]);

  // Calculate Spending Consistency Score
  const spendingConsistencyScore = useMemo((): HealthMetric => {
    const now = new Date();
    const last3Months = [0, 1, 2].map(i => {
      const monthStart = startOfMonth(subMonths(now, i));
      const nextMonthStart = startOfMonth(subMonths(now, i - 1));
      const monthTransactions = transactions.filter(t =>
        t.type === 'expense' &&
        t.category !== 'Savings Contribution' &&
        new Date(t.date) >= monthStart &&
        new Date(t.date) < nextMonthStart
      );
      return monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    });

    if (last3Months.every(m => m === 0)) {
      return {
        id: 'consistency',
        name: 'Spending Consistency',
        score: 0,
        maxScore: 100,
        weight: 0.15,
        status: 'poor',
        icon: Activity,
        color: '#3E92CC',
        description: 'Stability of your spending patterns',
        tips: [
          'Start tracking your expenses regularly',
          'Identify your fixed vs variable costs',
        ],
        details: [
          { label: 'Data Available', value: 'Insufficient' },
        ],
      };
    }

    const avgSpending = last3Months.reduce((a, b) => a + b, 0) / last3Months.length;
    const variance = last3Months.reduce((sum, val) => sum + Math.pow(val - avgSpending, 2), 0) / last3Months.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgSpending > 0 ? (stdDev / avgSpending) * 100 : 100;

    let score = 0;
    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (coefficientOfVariation <= 10) {
      score = 100;
      status = 'excellent';
    } else if (coefficientOfVariation <= 20) {
      score = 80;
      status = 'good';
    } else if (coefficientOfVariation <= 30) {
      score = 60;
      status = 'fair';
    } else {
      score = Math.max(0, 60 - (coefficientOfVariation - 30));
      status = 'poor';
    }

    return {
      id: 'consistency',
      name: 'Spending Consistency',
      score,
      maxScore: 100,
      weight: 0.15,
      status,
      icon: Activity,
      color: '#3E92CC',
      description: 'Stability of your spending patterns',
      tips: [
        coefficientOfVariation > 20 ? 'Work on reducing spending fluctuations' : 'Excellent spending discipline!',
        'Create a consistent monthly routine',
        'Plan for irregular expenses in advance',
      ],
      details: [
        { label: 'Avg Monthly Spending', value: formatCurrencyFull(avgSpending, currency) },
        { label: 'Variation', value: `${coefficientOfVariation.toFixed(1)}%` },
        { label: 'This Month', value: formatCurrencyFull(last3Months[0], currency) },
        { label: 'Last Month', value: formatCurrencyFull(last3Months[1], currency) },
      ],
    };
  }, [transactions, currency]);

  // Calculate Goal Progress Score
  const goalProgressScore = useMemo((): HealthMetric => {
    if (savingsGoals.length === 0) {
      return {
        id: 'goals',
        name: 'Goal Progress',
        score: 0,
        maxScore: 100,
        weight: 0.15,
        status: 'poor',
        icon: Target,
        color: '#EC4899',
        description: 'Your progress towards savings goals',
        tips: [
          'Set specific savings goals',
          'Start with small, achievable targets',
          'Track your progress regularly',
        ],
        details: [
          { label: 'Active Goals', value: '0' },
        ],
      };
    }

    let totalProgress = 0;
    let goalsCompleted = 0;
    let goalsOnTrack = 0;

    savingsGoals.forEach(goal => {
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      totalProgress += Math.min(progress, 100);

      if (progress >= 100) {
        goalsCompleted++;
      } else if (goal.target_date) {
        const daysLeft = differenceInDays(new Date(goal.target_date), new Date());
        // SavingsGoal type doesn't have created_at — estimate from 90 days ago as fallback
        const totalDays = 90;
        const elapsedDays = totalDays - Math.max(daysLeft, 0);
        const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
        
        if (progress >= expectedProgress * 0.9) {
          goalsOnTrack++;
        }
      }
    });

    const avgProgress = totalProgress / savingsGoals.length;
    let score = avgProgress;
    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (avgProgress >= 80) status = 'excellent';
    else if (avgProgress >= 60) status = 'good';
    else if (avgProgress >= 40) status = 'fair';

    return {
      id: 'goals',
      name: 'Goal Progress',
      score,
      maxScore: 100,
      weight: 0.15,
      status,
      icon: Target,
      color: '#EC4899',
      description: 'Your progress towards savings goals',
      tips: [
        goalsCompleted > 0 ? `${goalsCompleted} goal(s) completed!` : 'Keep working towards your goals',
        'Review goals monthly',
        'Celebrate milestones',
      ],
      details: [
        { label: 'Active Goals', value: savingsGoals.length.toString() },
        { label: 'Completed', value: goalsCompleted.toString() },
        { label: 'On Track', value: goalsOnTrack.toString() },
        { label: 'Avg Progress', value: `${avgProgress.toFixed(0)}%` },
      ],
    };
  }, [savingsGoals, currency]);

  // Calculate Overall Health Score
  const overallHealthScore = useMemo(() => {
    const metrics = [
      emergencyFundScore,
      savingsRateMetric,
      budgetAdherenceScore,
      spendingConsistencyScore,
      goalProgressScore,
    ];

    const weightedScore = metrics.reduce((sum, metric) => {
      return sum + (metric.score * metric.weight);
    }, 0);

    return Math.round(weightedScore);
  }, [emergencyFundScore, savingsRateMetric, budgetAdherenceScore, spendingConsistencyScore, goalProgressScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.status.green;
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return theme.colors.status.amber;
    return theme.colors.status.red;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return CheckCircle2;
      case 'good':
        return TrendingUp;
      case 'fair':
        return Info;
      default:
        return AlertTriangle;
    }
  };

  const metrics = [
    emergencyFundScore,
    savingsRateMetric,
    budgetAdherenceScore,
    spendingConsistencyScore,
    goalProgressScore,
  ];

  // Achievements
  const achievements: Achievement[] = useMemo(() => [
    {
      id: 'first_budget',
      title: 'Budget Beginner',
      description: 'Create your first budget',
      icon: Target,
      color: '#3B82F6',
      unlocked: budgets.length > 0,
    },
    {
      id: 'save_20',
      title: 'Super Saver',
      description: 'Save 20% or more of your income',
      icon: TrendingUp,
      color: '#10B981',
      unlocked: savingsRate >= 20,
      progress: Math.min((savingsRate / 20) * 100, 100),
    },
    {
      id: 'emergency_fund',
      title: 'Safety Net',
      description: 'Build 3 months emergency fund',
      icon: Shield,
      color: '#3E92CC',
      unlocked: balance >= monthlyExpenses * 3,
      progress: monthlyExpenses > 0 ? Math.min((balance / (monthlyExpenses * 3)) * 100, 100) : 0,
    },
    {
      id: 'goal_achiever',
      title: 'Goal Achiever',
      description: 'Complete a savings goal',
      icon: Award,
      color: '#F59E0B',
      unlocked: savingsGoals.some(g => g.current_amount >= g.target_amount),
    },
    {
      id: 'consistent',
      title: 'Consistency King',
      description: 'Maintain stable spending for 3 months',
      icon: Activity,
      color: '#EC4899',
      unlocked: spendingConsistencyScore.score >= 80,
      progress: spendingConsistencyScore.score,
    },
    {
      id: 'health_master',
      title: 'Financial Health Master',
      description: 'Achieve 80+ health score',
      icon: Flame,
      color: '#EF4444',
      unlocked: overallHealthScore >= 80,
      progress: overallHealthScore,
    },
  ], [budgets, savingsRate, balance, monthlyExpenses, savingsGoals, spendingConsistencyScore.score, overallHealthScore]);

  const CircularScore = ({ score, size = 200 }: { score: number; size?: number }) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (score / 100) * circumference;

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <SvgGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={getScoreColor(score)} />
              <Stop offset="100%" stopColor={theme.colors.accent} />
            </SvgGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(27,42,74,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreLabel}>{getScoreLabel(score)}</Text>
        </Animated.View>
      </View>
    );
  };

  const MetricCard = ({ metric, onPress }: { metric: HealthMetric; onPress: () => void }) => {
    const StatusIcon = getStatusIcon(metric.status);
    const progressPercent = (metric.score / metric.maxScore) * 100;

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <GlassBox style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.metricIcon, { backgroundColor: `${metric.color}20` }]}>
              <metric.icon color={metric.color} size={20} />
            </View>
            <View style={styles.metricTitleContainer}>
              <Text style={styles.metricName}>{metric.name}</Text>
              <Text style={styles.metricDescription}>{metric.description}</Text>
            </View>
            <View style={styles.metricStatusContainer}>
              <StatusIcon color={metric.color} size={18} />
            </View>
          </View>

          <View style={styles.metricScoreRow}>
            <Text style={styles.metricScore}>{Math.round(metric.score)}</Text>
            <Text style={styles.metricMaxScore}>/ {metric.maxScore}</Text>
          </View>

          <View style={styles.metricProgressBar}>
            <View style={[styles.metricProgressFill, { width: `${progressPercent}%` as any, backgroundColor: metric.color }]} />
          </View>

          <View style={styles.metricFooter}>
            <View style={[styles.metricStatusBadge, { backgroundColor: `${metric.color}20` }]}>
              <Text style={[styles.metricStatusText, { color: metric.color }]}>
                {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
              </Text>
            </View>
            <ChevronRight color={theme.colors.secondaryText} size={18} />
          </View>
        </GlassBox>
      </TouchableOpacity>
    );
  };

  const [selectedMetric, setSelectedMetric] = React.useState<HealthMetric | null>(null);

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Health</Text>
          <Text style={styles.headerSubtitle}>Your overall financial wellness score</Text>
        </View>

        {/* Overall Score Card */}
        <GlassBox style={styles.overallScoreCard}>
          <CircularScore score={overallHealthScore} />
          <Text style={styles.overallScoreDescription}>
            {overallHealthScore >= 80 ? 'Excellent financial health! Keep up the great work.' :
             overallHealthScore >= 60 ? 'Good progress. Focus on the areas below to improve.' :
             overallHealthScore >= 40 ? 'Fair financial health. Work on key metrics to boost your score.' :
             'Take action on the recommendations below to improve your financial health.'}
          </Text>
        </GlassBox>

        {/* Achievements Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.achievementCount}>
            {achievements.filter(a => a.unlocked).length}/{achievements.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          {achievements.map(achievement => (
            <View
              key={achievement.id}
              style={[styles.achievementBadge, !achievement.unlocked && styles.achievementLocked]}
            >
              <View style={[styles.achievementIcon, { backgroundColor: achievement.unlocked ? `${achievement.color}20` : 'rgba(27,42,74,0.04)' }]}>
                <achievement.icon color={achievement.unlocked ? achievement.color : 'rgba(27,42,74,0.15)'} size={24} />
              </View>
              <Text style={[styles.achievementTitle, !achievement.unlocked && { color: theme.colors.secondaryText }]}>
                {achievement.title}
              </Text>
              {!achievement.unlocked && achievement.progress !== undefined && (
                <View style={styles.achievementProgress}>
                  <View style={[styles.achievementProgressFill, { width: `${Math.min(achievement.progress, 100)}%` as any }]} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Health Metrics */}
        <Text style={styles.sectionTitle}>Health Metrics</Text>
        {metrics.map(metric => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedMetric(metric);
            }}
          />
        ))}

        {/* Quick Tips */}
        <GlassBox style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Zap color={theme.colors.accent} size={20} />
            <Text style={styles.tipsTitle}>Quick Tips to Improve</Text>
          </View>
          {metrics
            .filter(m => m.score < 80)
            .slice(0, 3)
            .map((metric, index) => (
              <View key={metric.id} style={[styles.tipRow, index > 0 && styles.tipDivider]}>
                <View style={[styles.tipIcon, { backgroundColor: `${metric.color}20` }]}>
                  <metric.icon color={metric.color} size={16} />
                </View>
                <Text style={styles.tipText}>{metric.tips[0]}</Text>
              </View>
            ))}
          {metrics.filter(m => m.score < 80).length === 0 && (
            <Text style={styles.noTipsText}>Amazing! All metrics are in great shape. 🎉</Text>
          )}
        </GlassBox>
      </ScrollView>

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedMetric(null)}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,42,74,0.3)' }]} />
          </TouchableOpacity>

          <View style={styles.modalContent}>
            <GlassBox style={styles.detailModal}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: `${selectedMetric.color}20` }]}>
                  <selectedMetric.icon color={selectedMetric.color} size={28} />
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedMetric(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.detailTitle}>{selectedMetric.name}</Text>
              <Text style={styles.detailDescription}>{selectedMetric.description}</Text>

              <View style={styles.detailScoreSection}>
                <Text style={styles.detailScoreLabel}>Current Score</Text>
                <Text style={[styles.detailScore, { color: selectedMetric.color }]}>
                  {Math.round(selectedMetric.score)}/{selectedMetric.maxScore}
                </Text>
                <View style={styles.detailProgressBar}>
                  <View
                    style={[
                      styles.detailProgressFill,
                      {
                        width: `${(selectedMetric.score / selectedMetric.maxScore) * 100}%` as any,
                        backgroundColor: selectedMetric.color,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Details</Text>
                {selectedMetric.details.map((detail, index) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{detail.label}</Text>
                    <Text style={styles.detailRowValue}>{detail.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tipsSection}>
                <Text style={styles.tipsSectionTitle}>How to Improve</Text>
                {selectedMetric.tips.map((tip, index) => (
                  <View key={index} style={styles.improvementTip}>
                    <View style={styles.tipBullet} />
                    <Text style={styles.improvementTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </GlassBox>
          </View>
        </View>
      )}
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.secondaryText,
  },
  overallScoreCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.secondaryText,
  },
  overallScoreDescription: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 12,
    marginTop: 8,
  },
  achievementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  achievementsScroll: {
    paddingRight: 16,
    gap: 12,
    marginBottom: 24,
  },
  achievementBadge: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  achievementProgress: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(27,42,74,0.06)',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  metricCard: {
    marginBottom: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTitleContainer: {
    flex: 1,
  },
  metricName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 12,
    color: theme.colors.secondaryText,
  },
  metricStatusContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(27,42,74,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricScore: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primaryText,
  },
  metricMaxScore: {
    fontSize: 16,
    color: theme.colors.secondaryText,
    marginLeft: 4,
  },
  metricProgressBar: {
    height: 8,
    backgroundColor: 'rgba(27,42,74,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  metricProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metricStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipsCard: {
    padding: 16,
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  tipDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.secondaryText,
    lineHeight: 20,
    paddingTop: 6,
  },
  noTipsText: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  detailModal: {
    padding: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(27,42,74,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.colors.primaryText,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    marginBottom: 24,
    lineHeight: 20,
  },
  detailScoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailScoreLabel: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginBottom: 8,
  },
  detailScore: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 16,
  },
  detailProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(27,42,74,0.06)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  detailRowLabel: {
    fontSize: 14,
    color: theme.colors.secondaryText,
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  tipsSection: {},
  tipsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 12,
  },
  improvementTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
    marginTop: 7,
  },
  improvementTipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.secondaryText,
    lineHeight: 20,
  },
});
