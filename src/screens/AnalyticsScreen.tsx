import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect, Text as SvgText, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { format, subMonths, addMonths, isThisMonth, isSameMonth, getDate, getDaysInMonth } from 'date-fns';
import { TrendingUp, TrendingDown, BarChart2, Activity, PieChart, ChevronLeft, ChevronRight } from 'lucide-react-native';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 80;

export const AnalyticsScreen = () => {
  const navigation = useNavigation<any>();
  const {
    transactions,
    user,
    taxForTransaction
  } = useFinancial();
  const currency = user?.currency || 'USD';

  const [currentDate, setCurrentDate] = useState(new Date());
  const isCurrentMonth = isSameMonth(currentDate, new Date());

  const monthTransactions = useMemo(() => transactions.filter(t => isSameMonth(new Date(t.date), currentDate)), [transactions, currentDate]);
  const lastMonthTransactions = useMemo(() => transactions.filter(t => isSameMonth(new Date(t.date), subMonths(currentDate, 1))), [transactions, currentDate]);

  const monthlyIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthTransactions.filter(t => t.type === 'expense' && t.category !== 'Savings Contribution').reduce((s, t) => s + t.amount, 0);
  const savingsContributions = monthTransactions.filter(t => t.type === 'expense' && t.category === 'Savings Contribution').reduce((s, t) => s + t.amount, 0);
  const monthlyEstimatedTax = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + taxForTransaction(t), 0);

  const lastMonthExpenses = lastMonthTransactions.filter(t => t.type === 'expense' && t.category !== 'Savings Contribution').reduce((s, t) => s + t.amount, 0);

  const savingsRate = monthlyIncome > 0 ? (savingsContributions / monthlyIncome) * 100 : 0;

  const monthlySpendingByCategory = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const months = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthTxs = transactions.filter(t => isSameMonth(new Date(t.date), date));
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      result.push({ label: format(date, 'MMM'), income, expense, date });
    }
    return result;
  }, [transactions, currentDate]);

  const maxVal = useMemo(() => Math.max(...months.flatMap(m => [m.income, m.expense]), 1), [months]);

  const catEntries = useMemo(() => {
    return Object.entries(monthlySpendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [monthlySpendingByCategory]);

  const totalCatSpend = catEntries.reduce((s, [, v]) => s + v, 0);

  // Month-over-Month logic
  const momExpenseChange = (lastMonthExpenses > 0)
    ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0;

  // Daily Average
  const daysPassed = isCurrentMonth ? Math.max(getDate(new Date()), 1) : getDaysInMonth(currentDate);
  const dailyAverage = monthlyExpenses / daysPassed;

  const BAR_H = 120;
  const BAR_W = Math.floor((CHART_W - 10) / 6 / 3);
  const GAP = BAR_W * 0.3;

  return (
    <AnimatedBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Analytics & Reports</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={theme.typography.label}>Insights for tracking your progress</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 4 }}>
              <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))} style={{ padding: 4 }}>
                <ChevronLeft color={theme.colors.secondaryText} size={18} />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.primaryText, fontWeight: '600', fontSize: 13, minWidth: 65, textAlign: 'center' }}>
                {format(currentDate, 'MMM yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentDate(addMonths(currentDate, 1))}
                style={{ padding: 4, opacity: isCurrentMonth ? 0.3 : 1 }}
                disabled={isCurrentMonth}
              >
                <ChevronRight color={isCurrentMonth ? theme.colors.divider : theme.colors.secondaryText} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Monthly Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassBox style={styles.summaryCard}>
            <TrendingUp color={theme.colors.status.green} size={18} />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: theme.colors.status.green }]}>
              {formatCurrencyFull(monthlyIncome, currency)}
            </Text>
          </GlassBox>
          <GlassBox style={styles.summaryCard}>
            <TrendingDown color={theme.colors.status.red} size={18} />
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryVal, { color: theme.colors.status.red }]}>
              {formatCurrencyFull(monthlyExpenses, currency)}
            </Text>
          </GlassBox>
          <GlassBox style={styles.summaryCard}>
            <BarChart2 color={theme.colors.accent} size={18} />
            <Text style={styles.summaryLabel}>Saved</Text>
            <Text style={[styles.summaryVal, { color: theme.colors.accent }]}>
              {savingsRate.toFixed(0)}%
            </Text>
          </GlassBox>
        </View>
        {user.tax_enabled && monthlyEstimatedTax > 0 && (
          <GlassBox style={styles.taxBanner}>
            <Text style={theme.typography.label}>Est. tax on expenses (this month)</Text>
            <Text style={styles.taxBannerVal}>{formatCurrencyFull(monthlyEstimatedTax, currency)}</Text>
          </GlassBox>
        )}

        {/* Deep Insights */}
        <Text style={styles.sectionTitle}>Key Insights</Text>
        <View style={styles.insightsGrid}>
          <GlassBox style={styles.insightBox}>
            <View style={styles.insightIconWrap}>
              <Activity color="#64B5F6" size={16} />
            </View>
            <Text style={styles.insightLabel}>Daily Avg Spend</Text>
            <Text style={styles.insightValue}>{formatCurrencyFull(dailyAverage, currency)}</Text>
            <Text style={styles.insightSub}>Based on {daysPassed} days</Text>
          </GlassBox>

          <GlassBox style={styles.insightBox}>
            <View style={[styles.insightIconWrap, { backgroundColor: 'rgba(255,183,77,0.1)' }]}>
              <PieChart color="#FFB74D" size={16} />
            </View>
            <Text style={styles.insightLabel}>MoM Expense</Text>
            <Text style={[
              styles.insightValue,
              { color: momExpenseChange > 0 ? theme.colors.status.red : theme.colors.status.green }
            ]}>
              {momExpenseChange > 0 ? '+' : ''}{momExpenseChange.toFixed(1)}%
            </Text>
            <Text style={styles.insightSub}>vs Last Month</Text>
          </GlassBox>
        </View>

        {/* Net savings bar */}
        {(monthlyIncome > 0 || monthlyExpenses > 0) && (
          <GlassBox style={styles.netCard}>
            <View style={styles.netRow}>
              <Text style={theme.typography.label}>Net this month</Text>
              <Text
                style={[
                  styles.netVal,
                  {
                    color:
                      monthlyIncome >= monthlyExpenses
                        ? theme.colors.status.green
                        : theme.colors.status.red,
                  },
                ]}
              >
                {monthlyIncome >= monthlyExpenses ? '+' : '-'}
                {formatCurrencyFull(Math.abs(monthlyIncome - monthlyExpenses), currency)}
              </Text>
            </View>
            <View style={styles.netBarBg}>
              {monthlyIncome > 0 && (
                <View
                  style={[
                    styles.netBarIncome,
                    {
                      flex: monthlyIncome / Math.max(monthlyIncome + monthlyExpenses, 1),
                    },
                  ]}
                />
              )}
              {monthlyExpenses > 0 && (
                <View
                  style={[
                    styles.netBarExpense,
                    {
                      flex: monthlyExpenses / Math.max(monthlyIncome + monthlyExpenses, 1),
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.netLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.status.green }]} />
                <Text style={theme.typography.label}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.status.red }]} />
                <Text style={theme.typography.label}>Expenses</Text>
              </View>
            </View>
          </GlassBox>
        )}

        {/* 6-Month Bar Chart */}
        <Text style={styles.sectionTitle}>6-Month Overview</Text>
        <GlassBox style={styles.chartCard} noPadding>
          <View style={styles.chartPadding}>
            {months.every(m => m.income === 0 && m.expense === 0) ? (
              <Text style={[theme.typography.label, { textAlign: 'center', paddingVertical: 20 }]}>
                No data yet — log transactions to see trends.
              </Text>
            ) : (
              <Svg width={CHART_W} height={BAR_H + 40}>
                <Defs>
                  <LinearGradient id="gradInc" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
                  </LinearGradient>
                  <LinearGradient id="gradExp" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.3" />
                  </LinearGradient>
                </Defs>
                {months.map((m, i) => {
                  const groupW = CHART_W / 6;
                  const x = i * groupW + groupW * 0.15;
                  const incH = maxVal > 0 ? (m.income / maxVal) * BAR_H : 0;
                  const expH = maxVal > 0 ? (m.expense / maxVal) * BAR_H : 0;

                  return (
                    <React.Fragment key={i}>
                      {/* Income bar */}
                      {incH > 0 && (
                        <Rect
                          x={x}
                          y={BAR_H - incH}
                          width={BAR_W}
                          height={incH}
                          fill="url(#gradInc)"
                          fillOpacity={0.9}
                          rx={3}
                        />
                      )}
                      {/* Expense bar */}
                      {expH > 0 && (
                        <Rect
                          x={x + BAR_W + GAP}
                          y={BAR_H - expH}
                          width={BAR_W}
                          height={expH}
                          fill="url(#gradExp)"
                          fillOpacity={0.9}
                          rx={3}
                        />
                      )}
                      {/* Month label */}
                      <SvgText
                        x={x + BAR_W}
                        y={BAR_H + 18}
                        fill="rgba(27,42,74,0.5)"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {m.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            )}
            {/* Legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(16,185,129,0.9)' }]} />
                <Text style={theme.typography.label}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(239,68,68,0.9)' }]} />
                <Text style={theme.typography.label}>Expenses</Text>
              </View>
            </View>
          </View>
        </GlassBox>

        {/* Spending by Category */}
        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
        {catEntries.length === 0 ? (
          <GlassBox style={styles.emptyCard}>
            <Text style={[theme.typography.label, { textAlign: 'center' }]}>
              No expenses logged this month.
            </Text>
          </GlassBox>
        ) : (
          <GlassBox style={styles.breakdownCard}>
            {catEntries.map(([cat, amount], i) => {
              const pct = totalCatSpend > 0 ? (amount / totalCatSpend) * 100 : 0;
              const color = getCategoryColor(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                    onPress={() => navigation.navigate('CategoryTransactions', { category: cat, monthStart: format(currentDate, 'yyyy-MM-01') })}
                  style={[styles.catRow, i < catEntries.length - 1 && styles.catDivider]}
                >
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, { backgroundColor: color }]} />
                    <Text style={styles.catName}>{cat}</Text>
                  </View>
                  <View style={styles.catBarContainer}>
                    <View style={styles.catBarBg}>
                      <View
                        style={[
                          styles.catBarFill,
                          { width: `${pct}%` as any, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>{formatCurrencyFull(amount, currency)}</Text>
                    <Text style={[theme.typography.label, { fontSize: 11 }]}>{pct.toFixed(0)}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </GlassBox>
        )}

        {/* Activity snapshot — aligned with top summary cards */}
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={styles.snapRow}>
          <GlassBox style={styles.snapCard}>
            <Text style={styles.snapLabel}>Transactions</Text>
            <Text style={styles.snapValue}>{monthTransactions.length}</Text>
          </GlassBox>
          <GlassBox style={styles.snapCard}>
            <Text style={styles.snapLabel}>vs Last Month</Text>
            <Text style={[styles.snapValue, { color: monthTransactions.length >= lastMonthTransactions.length ? theme.colors.status.green : theme.colors.status.amber }]}>
              {monthTransactions.length >= lastMonthTransactions.length ? '+' : ''}{monthTransactions.length - lastMonthTransactions.length}
            </Text>
          </GlassBox>
          <GlassBox style={styles.snapCard}>
            <Text style={styles.snapLabel}>Savings Rate</Text>
            <Text style={[styles.snapValue, { color: theme.colors.accent }]}>{savingsRate.toFixed(0)}%</Text>
          </GlassBox>
        </View>
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
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  taxBanner: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taxBannerVal: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  insightBox: {
    flex: 1,
    padding: 16,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  insightSub: {
    fontSize: 11,
    color: '#666',
  },
  netCard: {
    marginBottom: 16,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  netVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  netBarBg: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 10,
  },
  netBarIncome: {
    backgroundColor: '#03DAC6',
    height: '100%',
  },
  netBarExpense: {
    backgroundColor: '#CF6679',
    height: '100%',
  },
  netLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 12,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartPadding: {
    padding: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  breakdownCard: {
    marginBottom: 16,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  catDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 12,
    color: theme.colors.primaryText,
    fontWeight: '500',
    flexShrink: 1,
  },
  catBarContainer: {
    flex: 1,
  },
  catBarBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catRight: {
    alignItems: 'flex-end',
    width: 60,
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  emptyCard: {
    paddingVertical: 16,
    marginBottom: 16,
  },
  snapRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  snapCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  snapLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  snapValue: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
});
