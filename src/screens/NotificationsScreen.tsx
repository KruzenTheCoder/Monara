import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { AppNotification } from '../types';
import {
  ArrowLeft,
  Bell,
  BellOff,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Calendar,
  Shield,
  Zap,
  Clock,
  Gift,
  Flame,
  Activity,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { format, startOfMonth, differenceInDays, endOfMonth } from 'date-fns';

interface NotificationRule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  category: 'spending' | 'budget' | 'goals' | 'streak' | 'insights';
  enabled: boolean;
  triggered: boolean;
  triggerMessage?: string;
  priority: 'high' | 'medium' | 'low';
}

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const {
    transactions,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    budgets,
    monthlySpendingByCategory,
    savingsGoals,
    notifications,
    saveNotification,
    markNotificationRead,
    clearNotification,
    user,
    balance,
    upcomingBills,
  } = useFinancial();

  const currency = user.currency || 'USD';
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>({});

  const toggleRule = (id: string) => {
    Haptics.selectionAsync();
    setRuleStates(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  // Generate smart notification rules based on actual financial data
  const notificationRules: NotificationRule[] = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const dayOfMonth = now.getDate();
    const daysLeft = daysInMonth - dayOfMonth;
    const dailyBurnRate = dayOfMonth > 0 ? monthlyExpenses / dayOfMonth : 0;
    const projectedMonthlyExpenses = dailyBurnRate * daysInMonth;

    const rules: NotificationRule[] = [];

    // 1. Overspending Alert
    const isOverspending = monthlyExpenses > monthlyIncome && monthlyIncome > 0;
    rules.push({
      id: 'overspending',
      title: 'Overspending Alert',
      description: 'Notify when spending exceeds income',
      icon: AlertTriangle,
      color: '#EF4444',
      category: 'spending',
      enabled: ruleStates['overspending'] ?? true,
      triggered: isOverspending,
      triggerMessage: isOverspending
        ? `You've spent ${formatCurrencyFull(monthlyExpenses - monthlyIncome, currency)} more than your income!`
        : undefined,
      priority: 'high',
    });

    // 2. Large Transaction Alert
    const avgTransaction = transactions.length > 0
      ? transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / Math.max(transactions.filter(t => t.type === 'expense').length, 1)
      : 0;
    const recentLarge = transactions.find(t =>
      t.type === 'expense' && t.amount > avgTransaction * 3 &&
      new Date(t.date) >= new Date(Date.now() - 86400000)
    );
    rules.push({
      id: 'large_tx',
      title: 'Unusual Spending',
      description: 'Alert on transactions 3x above average',
      icon: DollarSign,
      color: '#F59E0B',
      category: 'spending',
      enabled: ruleStates['large_tx'] ?? true,
      triggered: !!recentLarge,
      triggerMessage: recentLarge
        ? `Large expense detected: ${formatCurrencyFull(recentLarge.amount, currency)} at ${recentLarge.merchant_name || recentLarge.category}`
        : undefined,
      priority: 'high',
    });

    // 3. Budget limit alerts
    let budgetAlerts = 0;
    budgets.forEach(budget => {
      const spent = monthlySpendingByCategory[budget.category] || 0;
      if (spent >= budget.monthly_limit * 0.9) budgetAlerts++;
    });
    rules.push({
      id: 'budget_warning',
      title: 'Budget Threshold',
      description: 'Alert when any category reaches 90% of budget',
      icon: Target,
      color: '#EC4899',
      category: 'budget',
      enabled: ruleStates['budget_warning'] ?? true,
      triggered: budgetAlerts > 0,
      triggerMessage: budgetAlerts > 0
        ? `${budgetAlerts} budget${budgetAlerts > 1 ? 's are' : ' is'} at or above 90% — review spending!`
        : undefined,
      priority: 'high',
    });

    // 4. Spending Pace
    const pacingRatio = monthlyIncome > 0 ? projectedMonthlyExpenses / monthlyIncome : 0;
    rules.push({
      id: 'spending_pace',
      title: 'Spending Pace Alert',
      description: 'Alert if projected expenses will exceed income',
      icon: Activity,
      color: '#3E92CC',
      category: 'spending',
      enabled: ruleStates['spending_pace'] ?? true,
      triggered: pacingRatio > 1 && dayOfMonth > 7,
      triggerMessage: pacingRatio > 1
        ? `At current pace, you'll spend ${formatCurrencyFull(projectedMonthlyExpenses, currency)} this month (${(pacingRatio * 100).toFixed(0)}% of income)`
        : undefined,
      priority: 'medium',
    });

    // 5. Savings rate drop
    rules.push({
      id: 'savings_rate',
      title: 'Savings Rate Monitor',
      description: 'Alert if savings rate drops below 10%',
      icon: TrendingDown,
      color: '#EF4444',
      category: 'goals',
      enabled: ruleStates['savings_rate'] ?? true,
      triggered: savingsRate < 10 && monthlyIncome > 0,
      triggerMessage: savingsRate < 10 && monthlyIncome > 0
        ? `Your savings rate is only ${savingsRate.toFixed(0)}% — aim for 20%+`
        : undefined,
      priority: 'medium',
    });

    // 6. Goal deadlines
    const urgentGoals = savingsGoals.filter(g => {
      if (!g.target_date || g.current_amount >= g.target_amount) return false;
      return differenceInDays(new Date(g.target_date), now) < 30;
    });
    rules.push({
      id: 'goal_deadline',
      title: 'Goal Deadlines',
      description: 'Remind about approaching savings goal targets',
      icon: Calendar,
      color: '#3B82F6',
      category: 'goals',
      enabled: ruleStates['goal_deadline'] ?? true,
      triggered: urgentGoals.length > 0,
      triggerMessage: urgentGoals.length > 0
        ? `${urgentGoals[0].name} deadline is in ${differenceInDays(new Date(urgentGoals[0].target_date!), now)} days!`
        : undefined,
      priority: 'medium',
    });

    // 7. Bills due soon
    const dueSoon = upcomingBills.filter(b =>
      !b.isPaid && differenceInDays(b.nextDue, now) <= 3 && differenceInDays(b.nextDue, now) >= 0
    );
    rules.push({
      id: 'upcoming_bills',
      title: 'Bills Due Soon',
      description: 'Remind about bills due within 3 days',
      icon: Clock,
      color: '#F59E0B',
      category: 'budget',
      enabled: ruleStates['upcoming_bills'] ?? true,
      triggered: dueSoon.length > 0,
      triggerMessage: dueSoon.length > 0
        ? `${dueSoon.length} bill${dueSoon.length > 1 ? 's' : ''} due in the next 3 days`
        : undefined,
      priority: 'medium',
    });

    // 8. Overdue bills
    const overdue = upcomingBills.filter(b => b.isOverdue);
    rules.push({
      id: 'overdue_bills',
      title: 'Overdue Bills',
      description: 'Alert when a bill has passed its due date',
      icon: AlertTriangle,
      color: '#EF4444',
      category: 'budget',
      enabled: ruleStates['overdue_bills'] ?? true,
      triggered: overdue.length > 0,
      triggerMessage: overdue.length > 0
        ? `${overdue.length} bill${overdue.length > 1 ? 's are' : ' is'} overdue — mark paid or review.`
        : undefined,
      priority: 'high',
    });

    const overdueExpenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (t.payment_status !== 'unpaid') return false;
      if (!t.due_date) return false;
      return differenceInDays(new Date(t.due_date), now) < 0;
    });

    const dueSoonExpenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (t.payment_status !== 'unpaid') return false;
      if (!t.due_date) return false;
      const d = differenceInDays(new Date(t.due_date), now);
      return d >= 0 && d <= 3;
    });

    rules.push({
      id: 'overdue_expenses',
      title: 'Overdue Expenses',
      description: 'Alert when an unpaid expense has passed its due date',
      icon: AlertTriangle,
      color: '#EF4444',
      category: 'budget',
      enabled: ruleStates['overdue_expenses'] ?? true,
      triggered: overdueExpenses.length > 0,
      triggerMessage: overdueExpenses.length > 0
        ? `${overdueExpenses.length} unpaid expense${overdueExpenses.length > 1 ? 's are' : ' is'} overdue.`
        : undefined,
      priority: 'high',
    });

    rules.push({
      id: 'due_soon_expenses',
      title: 'Expenses Due Soon',
      description: 'Remind about unpaid expenses due within 3 days',
      icon: Clock,
      color: '#F59E0B',
      category: 'budget',
      enabled: ruleStates['due_soon_expenses'] ?? true,
      triggered: dueSoonExpenses.length > 0,
      triggerMessage: dueSoonExpenses.length > 0
        ? `${dueSoonExpenses.length} unpaid expense${dueSoonExpenses.length > 1 ? 's' : ''} due in the next 3 days`
        : undefined,
      priority: 'medium',
    });

    // 8. Streak reminder
    rules.push({
      id: 'streak',
      title: 'Streak Keeper',
      description: 'Daily reminder to log transactions and keep your streak',
      icon: Flame,
      color: '#EF4444',
      category: 'streak',
      enabled: ruleStates['streak'] ?? true,
      triggered: false,
      priority: 'low',
    });

    // 9. Weekly summary
    rules.push({
      id: 'weekly_summary',
      title: 'Weekly Summary',
      description: 'Get a weekly spending and savings recap',
      icon: TrendingUp,
      color: '#10B981',
      category: 'insights',
      enabled: ruleStates['weekly_summary'] ?? true,
      triggered: false,
      priority: 'low',
    });

    // 10. Savings celebration
    const goalCompleted = savingsGoals.some(g => g.current_amount >= g.target_amount);
    rules.push({
      id: 'celebration',
      title: 'Achievement Alerts',
      description: 'Celebrate when you hit milestones',
      icon: Gift,
      color: '#FBBF24',
      category: 'insights',
      enabled: ruleStates['celebration'] ?? true,
      triggered: goalCompleted,
      triggerMessage: goalCompleted ? 'Congrats! You completed a savings goal! 🎉' : undefined,
      priority: 'low',
    });

    return rules;
  }, [transactions, monthlyIncome, monthlyExpenses, savingsRate, budgets, monthlySpendingByCategory, savingsGoals, upcomingBills, ruleStates, currency]);

  // Save triggered rules to DB
  useEffect(() => {
    if (!globalEnabled) return;
    notificationRules.forEach(rule => {
      if (rule.triggered && (ruleStates[rule.id] ?? true)) {
        saveNotification({
          title: rule.title,
          message: rule.triggerMessage || rule.description,
          type: rule.category,
          priority: rule.priority,
          is_read: false,
        });
      }
    });
  }, [notificationRules, ruleStates, globalEnabled, saveNotification]);

  const activeAlerts = notifications.filter(n => !n.is_read);

  const categories = ['spending', 'budget', 'goals', 'streak', 'insights'] as const;

  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#3B82F6',
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
            <Text style={styles.headerTitle}>Smart Notifications</Text>
            <Text style={styles.headerSubtitle}>Intelligent financial alerts</Text>
          </View>
        </View>

        {/* Global Toggle */}
        <GlassBox style={styles.globalToggle}>
          <View style={styles.globalToggleRow}>
            <View style={styles.globalToggleLeft}>
              {globalEnabled ? <Bell color={theme.colors.accent} size={22} /> : <BellOff color={theme.colors.secondaryText} size={22} />}
              <View>
                <Text style={styles.globalToggleTitle}>Smart Engine Rules</Text>
                <Text style={styles.globalToggleSub}>{globalEnabled ? 'Monitoring Active' : 'Monitoring Paused'}</Text>
              </View>
            </View>
            <Switch
              value={globalEnabled}
              onValueChange={(v) => {
                setGlobalEnabled(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: 'rgba(27,42,74,0.08)', true: 'rgba(62,146,204,0.35)' }}
              thumbColor={globalEnabled ? theme.colors.accent : 'rgba(27,42,74,0.15)'}
            />
          </View>
        </GlassBox>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Inbox ({activeAlerts.length})</Text>
            {activeAlerts.map(alert => {
              const pColor = priorityColors[alert.priority] || priorityColors.medium;
              return (
              <GlassBox key={alert.id} style={[styles.alertCard, { borderLeftColor: pColor, borderLeftWidth: 3 }]}>
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: `${pColor}20` }]}>
                    <Bell color={pColor} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.alertTitleRow}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: `${pColor}20` }]}>
                        <Text style={[styles.priorityText, { color: pColor }]}>
                          {alert.priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <View style={styles.alertActions}>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          markNotificationRead(alert.id);
                        }}
                      >
                        <CheckCircle2 color={theme.colors.secondaryText} size={16} />
                        <Text style={styles.actionBtnText}>Mark Read</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          clearNotification(alert.id);
                        }}
                      >
                        <AlertTriangle color="rgba(255,59,48,0.5)" size={16} />
                        <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GlassBox>
            )})}
          </>
        )}

        {activeAlerts.length === 0 && globalEnabled && (
          <GlassBox style={styles.allClearCard}>
            <CheckCircle2 color={theme.colors.status.green} size={40} />
            <Text style={styles.allClearTitle}>All Clear!</Text>
            <Text style={styles.allClearSub}>No active alerts — you're on track 🎉</Text>
          </GlassBox>
        )}

        {/* Rules by Category */}
        {categories.map(cat => {
          const catRules = notificationRules.filter(r => r.category === cat);
          if (catRules.length === 0) return null;

          return (
            <View key={cat}>
              <Text style={styles.categoryTitle}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
              {catRules.map(rule => {
                const isEnabled = ruleStates[rule.id] ?? true;
                return (
                  <GlassBox key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleRow}>
                      <View style={[styles.ruleIcon, { backgroundColor: `${rule.color}20` }]}>
                        <rule.icon color={isEnabled ? rule.color : 'rgba(27,42,74,0.15)'} size={18} />
                      </View>
                      <View style={styles.ruleInfo}>
                        <Text style={[styles.ruleTitle, !isEnabled && { color: theme.colors.secondaryText }]}>
                          {rule.title}
                        </Text>
                        <Text style={styles.ruleDesc}>{rule.description}</Text>
                      </View>
                      <Switch
                        value={isEnabled && globalEnabled}
                        onValueChange={() => toggleRule(rule.id)}
                        disabled={!globalEnabled}
                        trackColor={{ false: 'rgba(27,42,74,0.08)', true: `${rule.color}40` }}
                        thumbColor={isEnabled && globalEnabled ? rule.color : 'rgba(27,42,74,0.15)'}
                      />
                    </View>
                  </GlassBox>
                );
              })}
            </View>
          );
        })}
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
  globalToggle: { padding: 16, marginBottom: 24 },
  globalToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  globalToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  globalToggleTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
  globalToggleSub: { fontSize: 12, color: theme.colors.secondaryText, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 12 },
  alertCard: { marginBottom: 10, padding: 14 },
  alertHeader: { flexDirection: 'row', gap: 12 },
  alertIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryText },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  alertMessage: { fontSize: 13, color: theme.colors.secondaryText, lineHeight: 18, marginBottom: 12 },
  alertActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(27,42,74,0.05)', borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondaryText },
  allClearCard: { padding: 40, alignItems: 'center', marginBottom: 24, gap: 12 },
  allClearTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.primaryText },
  allClearSub: { fontSize: 14, color: theme.colors.secondaryText },
  categoryTitle: {
    fontSize: 14, fontWeight: '700', color: theme.colors.accent,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 12,
  },
  ruleCard: { marginBottom: 8, padding: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ruleInfo: { flex: 1 },
  ruleTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.primaryText, marginBottom: 2 },
  ruleDesc: { fontSize: 12, color: theme.colors.secondaryText, lineHeight: 16 },
});
