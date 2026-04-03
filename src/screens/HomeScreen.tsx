import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert } from 'react-native';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight, Sparkles, Settings, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export const HomeScreen = () => {
  const { transactions, balance, monthlyIncome, monthlyExpenses, savingsRate, user, deleteTransaction } = useFinancial();
  const navigation = useNavigation<any>();
  const recentTx = transactions.slice(0, 6);

  const openAddTransaction = (type: 'expense' | 'income') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AddTransaction', { type });
  };

  const showTxDetail = (tx: typeof transactions[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sign = tx.type === 'income' ? '+' : '-';
    Alert.alert(
      tx.category,
      `${sign}${formatCurrencyFull(tx.amount, currency)}\n${format(new Date(tx.date), 'EEEE, MMMM d · h:mm a')}\nType: ${tx.type}${tx.note ? `\nNote: ${tx.note}` : ''}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete Transaction?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteTransaction(tx.id),
              },
            ]);
          },
        },
      ],
    );
  };

  const currency = user.currency || 'USD';

  // Staggered entrance animations
  const anims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(24),
    })),
  ).current;

  useEffect(() => {
    const stagger = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 450, delay: i * 100, useNativeDriver: true }),
        Animated.spring(a.translateY, { toValue: 0, tension: 80, friction: 12, delay: i * 100, useNativeDriver: true }),
      ]),
    );
    Animated.stagger(80, stagger).start();
  }, []);

  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 500, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    ).start();
  }, [waveAnim]);

  const waveRotation = waveAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const insight = useMemo(() => {
    if (transactions.length === 0)
      return 'Start logging transactions to unlock personalised AI insights.';
    if (savingsRate >= 20)
      return `Excellent! You are saving ${savingsRate.toFixed(0)}% of your income this month. Keep it up!`;
    if (monthlyExpenses > monthlyIncome && monthlyIncome > 0)
      return 'You are spending more than you earn this month. Review your budget categories.';
    if (savingsRate > 0)
      return `You have saved ${savingsRate.toFixed(0)}% of your income so far this month.`;
    return 'Log more transactions to get personalised spending insights.';
  }, [transactions, savingsRate, monthlyIncome, monthlyExpenses]);

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <AnimatedBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: anims[4].opacity, transform: [{ translateY: anims[4].translateY }] }]}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Hello, {user.display_name} </Text>
              <Animated.Text style={{ fontSize: 22, transform: [{ rotate: waveRotation }] }}>
                👋
              </Animated.Text>
            </View>
            <Text style={theme.typography.label}>{today}</Text>
          </View>
          <View style={styles.headerRight}>
            <GlassBox style={styles.streakPill}>
              <Zap color="#FBBF24" size={14} />
              <Text style={styles.streakText}>{user.current_streak}</Text>
            </GlassBox>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
              <View style={styles.profileContainer}>
                <Settings color="#A0A0A0" size={18} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View style={{ opacity: anims[0].opacity, transform: [{ translateY: anims[0].translateY }] }}>
        <GlassBox style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: balance >= 0 ? theme.colors.status.green : theme.colors.status.red },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {balance < 0 ? '-' : ''}{formatCurrencyFull(balance, currency)}
          </Text>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => openAddTransaction('income')} activeOpacity={0.7}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(3,218,198,0.12)' }]}>
                <ArrowUpRight color={theme.colors.status.green} size={15} />
              </View>
              <View>
                <Text style={theme.typography.label}>Income</Text>
                <Text style={styles.statValue}>{formatCurrencyFull(monthlyIncome, currency)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => openAddTransaction('expense')} activeOpacity={0.7}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(207,102,121,0.12)' }]}>
                <ArrowDownRight color={theme.colors.status.red} size={15} />
              </View>
              <View>
                <Text style={theme.typography.label}>Expenses</Text>
                <Text style={styles.statValue}>{formatCurrencyFull(monthlyExpenses, currency)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(187,134,252,0.12)' }]}>
                <TrendingUp color={theme.colors.accent} size={15} />
              </View>
              <View>
                <Text style={theme.typography.label}>Saved</Text>
                <Text style={styles.statValue}>{savingsRate.toFixed(0)}%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </GlassBox>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View style={[styles.grid, { opacity: anims[1].opacity, transform: [{ translateY: anims[1].translateY }] }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Rewards')} activeOpacity={0.7}>
            <GlassBox style={styles.gridItem}>
              <Zap color="#FBBF24" size={20} />
              <Text style={styles.gridLabel}>Points</Text>
              <Text style={styles.gridValue}>{user.total_points.toLocaleString()}</Text>
            </GlassBox>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Budget')} activeOpacity={0.7}>
            <GlassBox style={styles.gridItem}>
              <TrendingDown color={theme.colors.status.red} size={20} />
              <Text style={styles.gridLabel}>This Month</Text>
              <Text style={styles.gridValue}>{formatCurrencyFull(monthlyExpenses, currency)}</Text>
            </GlassBox>
          </TouchableOpacity>
        </Animated.View>

        {/* AI Insight */}
        <Animated.View style={{ opacity: anims[2].opacity, transform: [{ translateY: anims[2].translateY }] }}>
        <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.8}>
          <GlassBox style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Sparkles color={theme.colors.accent} size={18} />
              <Text style={styles.insightTitle}>AI Insight</Text>
              <View style={{ flex: 1 }} />
              <ChevronRight color="#555" size={16} />
            </View>
            <Text style={styles.insightText}>{insight}</Text>
          </GlassBox>
        </TouchableOpacity>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View style={{ opacity: anims[3].opacity, transform: [{ translateY: anims[3].translateY }] }}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.length > 6 && (
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentTx.length === 0 ? (
          <TouchableOpacity onPress={() => openAddTransaction('expense')} activeOpacity={0.8}>
            <GlassBox style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet.{`\n`}Tap here to log your first one.</Text>
            </GlassBox>
          </TouchableOpacity>
        ) : (
          recentTx.map(tx => {
            const catColor = getCategoryColor(tx.category);
            return (
              <TouchableOpacity key={tx.id} onPress={() => showTxDetail(tx)} activeOpacity={0.7}>
                <GlassBox style={styles.txCard}>
                  <View
                    style={[
                      styles.txDot,
                      { backgroundColor: `${catColor}18`, borderColor: `${catColor}44` },
                    ]}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp color={theme.colors.status.green} size={16} />
                    ) : (
                      <TrendingDown color={theme.colors.status.red} size={16} />
                    )}
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txCategory}>{tx.category}</Text>
                    <Text style={styles.txDate}>
                      {format(new Date(tx.date), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.type === 'income' ? theme.colors.status.green : theme.colors.status.red },
                      ]}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrencyFull(tx.amount, currency)}
                    </Text>
                    <ChevronRight color="#444" size={14} />
                  </View>
                </GlassBox>
              </TouchableOpacity>
            );
          })
        )}
        </Animated.View>
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 11,
    color: '#FFB74D',
    fontWeight: '600',
  },
  balanceCard: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0,
    marginBottom: 12,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  statIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#A0A0A0',
    flexShrink: 1,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#2C2C2C',
    marginHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    gap: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  insightCard: {
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BB86FC',
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  txDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCategory: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 1,
  },
  txInfo: {
    flex: 1,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
    textAlign: 'right',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAll: {
    fontSize: 13,
    color: '#BB86FC',
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 18,
  },
});
