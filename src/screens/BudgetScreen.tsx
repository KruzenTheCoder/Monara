import React, { useState, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { format, isSameMonth, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { Edit3, X, Check, AlertTriangle, ChevronRight, ChevronLeft, PlusCircle, PiggyBank, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { showStyledAlert } from '../components/StyledAlert';
import { GlassCalendarPicker } from '../components/GlassCalendarPicker';

export const BudgetScreen = () => {
  const navigation = useNavigation<any>();
  const { budgets, updateBudgetLimit, upcomingBills, user, savingsGoals, addSavingsGoal, addSavingsContribution, updateUser, transactions } = useFinancial();
  const currency = user.currency || 'USD';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingBudget, setEditingBudget] = useState<{ category: string; current: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Overall Budget Modal State
  const [isEditingOverall, setIsEditingOverall] = useState(false);
  const [overallValue, setOverallValue] = useState('');

  // Savings Modal State
  const [isAddingSavings, setIsAddingSavings] = useState(false);
  const [newSavingsName, setNewSavingsName] = useState('');
  const [newSavingsTarget, setNewSavingsTarget] = useState('');
  const [newSavingsDate, setNewSavingsDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Contribution Modal State
  const [contributingTo, setContributingTo] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const isCurrentMonth = isSameMonth(currentDate, new Date());

  const monthTransactions = useMemo(() => transactions.filter(t => isSameMonth(new Date(t.date), currentDate)), [transactions, currentDate]);
  const prevMonthTransactions = useMemo(() => transactions.filter(t => isSameMonth(new Date(t.date), subMonths(currentDate, 1))), [transactions, currentDate]);

  const monthlyIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySpendingByCategory = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalAllocated = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = Object.values(monthlySpendingByCategory).reduce((sum, v) => sum + v, 0);

  // Total bucket is user's set target, or defaults to actual monthlyIncome if not set
  const maxAvailable = user.target_monthly_budget > 0 ? user.target_monthly_budget : monthlyIncome;

  // Let progress represent portion of bucket already SPENT
  const overallProgress = maxAvailable > 0 ? Math.min((totalSpent / maxAvailable) * 100, 100) : 0;

  // Savings progress
  const totalSavingsCurrent = savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalSavingsTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallSavingsProgress = totalSavingsTarget > 0 ? (totalSavingsCurrent / totalSavingsTarget) * 100 : 0;

  const getBarColor = (spent: number, limit: number) => {
    if (limit === 0) return theme.colors.status.amber; // No limit set == yellow/neutral
    const pct = spent / limit;
    if (pct >= 1) return theme.colors.status.red;
    if (pct >= 0.8) return theme.colors.status.amber;
    return theme.colors.status.green;
  };

  const openEdit = (category: string, current: number) => {
    Haptics.selectionAsync();
    setEditingBudget({ category, current });
    setEditValue(current.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingBudget) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;

    const spentInCat = monthlySpendingByCategory[editingBudget.category] || 0;
    if (val > 0 && val < spentInCat) {
      showStyledAlert('Invalid Limit', `Budget cannot be lower than what you have already spent (${formatCurrencyFull(spentInCat)}).`, undefined, 'destructive');
      return;
    }

    const otherBudgetsTotal = budgets.reduce((sum, b) => b.category === editingBudget.category ? sum : sum + b.monthly_limit, 0);
    if (maxAvailable > 0 && otherBudgetsTotal + val > maxAvailable) {
      showStyledAlert('Budget Exceeded', `Total allocated limits (${formatCurrencyFull(otherBudgetsTotal + val)}) cannot exceed your target monthly budget (${formatCurrencyFull(maxAvailable)}).`, undefined, 'destructive');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateBudgetLimit(editingBudget.category, val);
    setEditingBudget(null);
  };

  const handleSaveOverall = async () => {
    const val = parseFloat(overallValue);
    if (isNaN(val) || val <= 0) return;

    if (val < totalAllocated) {
      showStyledAlert('Invalid Target', `Target budget cannot be less than your sum of category allocations (${formatCurrencyFull(totalAllocated)}). Please reduce category budgets first.`, undefined, 'destructive');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateUser({ target_monthly_budget: val });
    setIsEditingOverall(false);
  };

  const handleCreateSavings = async () => {
    const target = parseFloat(newSavingsTarget);
    if (!newSavingsName.trim() || isNaN(target) || target <= 0) return;

    // Validate simple optional date string if provided
    let finalDate: string | undefined = undefined;
    if (newSavingsDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newSavingsDate.trim())) {
        showStyledAlert('Invalid Date', 'Please format the date as YYYY-MM-DD.', undefined, 'destructive');
        return;
      }
      finalDate = newSavingsDate.trim();
    }

    setIsAddingSavings(false);
    await addSavingsGoal({
      name: newSavingsName.trim(),
      target_amount: target,
      current_amount: 0,
      color: theme.colors.accent,
      target_date: finalDate,
    });
    setNewSavingsName('');
    setNewSavingsTarget('');
    setNewSavingsDate('');
    showStyledAlert('Goal Created', 'Your new savings goal is ready.', undefined, 'success');
  };

  const handleAddContribution = async () => {
    if (!contributingTo) return;
    const val = parseFloat(contributionAmount);
    if (isNaN(val) || val <= 0) return;

    await addSavingsContribution(contributingTo, val);

    setContributingTo(null);
    setContributionAmount('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showStyledAlert('Funds Added', `Added ${formatCurrencyFull(val)} to your savings goal.`, undefined, 'success');
  };

  return (
    <AnimatedBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={theme.typography.label}>Track limits & goals against income</Text>

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

        {/* Overall Budget Summary */}
        <GlassBox style={styles.summaryCard} glow glowColor={theme.colors.accent}>
          <View style={styles.summaryRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={theme.typography.label}>{user.target_monthly_budget > 0 ? 'Target Budget' : 'Total Income'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setOverallValue(maxAvailable.toString());
                    setIsEditingOverall(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 color={theme.colors.secondaryText} size={14} />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryAmount}>{formatCurrencyFull(maxAvailable)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={theme.typography.label}>Spent</Text>
              <Text style={[styles.summaryAmount, { color: totalSpent > maxAvailable && maxAvailable > 0 ? theme.colors.status.red : '#FFF' }]}>
                {formatCurrencyFull(totalSpent)}
              </Text>
            </View>
          </View>
          <View style={styles.overallBarBg}>
            <View
              style={[
                styles.overallBarFill,
                {
                  width: `${overallProgress}%` as any,
                  backgroundColor: getBarColor(totalSpent, maxAvailable || 1), // Avoid div by 0
                },
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.summaryRemaining}>
              {formatCurrencyFull(totalAllocated)} allocated
            </Text>
            <Text style={styles.summaryRemaining}>
              {totalSpent <= maxAvailable || maxAvailable === 0
                ? `${formatCurrencyFull(maxAvailable - totalSpent)} left`
                : `${formatCurrencyFull(totalSpent - maxAvailable)} over spent`}
            </Text>
          </View>
        </GlassBox>

        {/* Category Budgets */}
        <Text style={styles.sectionTitle}>Categories</Text>
        {Array.from(new Set([
          ...budgets.map(b => b.category),
          ...Object.keys(monthlySpendingByCategory)
        ])).map(categoryName => {
          const budget = budgets.find(b => b.category === categoryName);
          const limit = budget ? budget.monthly_limit : 0;
          const spent = monthlySpendingByCategory[categoryName] || 0;

          const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const barColor = getBarColor(spent, limit);
          const catColor = getCategoryColor(categoryName);
          const isOver = limit > 0 && spent > limit;

          return (
            <GlassBox key={categoryName} style={styles.budgetCard}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  style={styles.catNav}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('CategoryTransactions', { category: categoryName, monthStart: format(currentDate, 'yyyy-MM-01') });
                  }}
                >
                  <View style={styles.catLabelRow}>
                    <View style={[styles.catIndicator, { backgroundColor: catColor }]} />
                    <Text style={styles.catName}>{categoryName}</Text>
                    {isOver && <AlertTriangle color={theme.colors.status.red} size={14} />}
                  </View>
                  <ChevronRight color={theme.colors.secondaryText} size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEdit(categoryName, limit)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 color={theme.colors.secondaryText} size={16} />
                </TouchableOpacity>
              </View>

              <View style={styles.spendRow}>
                <Text style={styles.spentText}>
                  <Text style={{ color: barColor }}>{formatCurrencyFull(spent)}</Text>
                  {limit > 0 ? (
                    <Text style={theme.typography.label}> / {formatCurrencyFull(limit)}</Text>
                  ) : (
                    <Text style={theme.typography.label}> (No limit)</Text>
                  )}
                </Text>
                {limit > 0 && <Text style={[styles.pctText, { color: barColor }]}>{progress.toFixed(0)}%</Text>}
              </View>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${limit > 0 ? progress : (spent > 0 ? 100 : 0)}%` as any,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </GlassBox>
          );
        })}

        {/* Savings Goals */}
        <View style={styles.billsSectionRow}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setIsAddingSavings(true); }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <PlusCircle color={theme.colors.accent} size={15} />
              <Text style={styles.manageLink}>New Goal</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Global Savings Progress */}
        {savingsGoals.length > 0 && (
          <GlassBox style={[styles.budgetCard, { marginBottom: 16 }]} intensity={30}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: theme.colors.primaryText, fontWeight: '600', fontSize: 14 }}>Total Saved: {overallSavingsProgress.toFixed(1)}%</Text>
              <Text style={theme.typography.label}>{formatCurrencyFull(totalSavingsCurrent)} / {formatCurrencyFull(totalSavingsTarget)}</Text>
            </View>
            <View style={styles.overallBarBg}>
              <View style={[styles.overallBarFill, { width: `${overallSavingsProgress}%`, backgroundColor: theme.colors.accent }]} />
            </View>
          </GlassBox>
        )}

        {savingsGoals.length === 0 ? (
          <GlassBox style={styles.budgetCard}>
            <Text style={[theme.typography.label, { paddingVertical: 8, textAlign: 'center' }]}>
              No active savings goals. Tap "New Goal" to start saving.
            </Text>
          </GlassBox>
        ) : (
          savingsGoals.map(goal => {
            const progress = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            return (
              <GlassBox key={goal.id} style={styles.budgetCard}>
                <View style={styles.cardTop}>
                  <View style={styles.catNav}>
                    <View style={styles.catLabelRow}>
                      <PiggyBank color={goal.color} size={20} />
                      <Text style={styles.catName}>{goal.name}</Text>
                    </View>
                    {goal.target_date && (
                      <Text style={[theme.typography.label, { fontSize: 11, marginLeft: 26, marginTop: 2 }]}>
                        Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addFundsBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setContributingTo(goal.id);
                    }}
                  >
                    <PlusCircle color={theme.colors.primaryText} size={14} />
                    <Text style={styles.addFundsText}>Fund</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.spendRow}>
                  <Text style={styles.spentText}>
                    <Text style={{ color: goal.color, fontWeight: 'bold' }}>{formatCurrencyFull(goal.current_amount)}</Text>
                    <Text style={theme.typography.label}> / {formatCurrencyFull(goal.target_amount)}</Text>
                  </Text>
                  <Text style={[styles.pctText, { color: goal.color }]}>{progress.toFixed(0)}%</Text>
                </View>

                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${progress}%` as any, backgroundColor: goal.color },
                    ]}
                  />
                </View>
              </GlassBox>
            );
          })
        )}

        {/* Upcoming Bills */}
        <View style={styles.billsSectionRow}>
          <Text style={styles.sectionTitle}>Upcoming bills</Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); navigation.navigate('Bills'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.manageLink}>Manage</Text>
          </TouchableOpacity>
        </View>
        <GlassBox style={styles.billsCard}>
          {upcomingBills.length === 0 ? (
            <Text style={[theme.typography.label, { paddingVertical: 8 }]}>
              No bills yet. Add your bills and due dates, then mark them paid manually each month.
            </Text>
          ) : (
            upcomingBills.slice(0, 6).map((row, i) => (
              <View
                key={row.bill.id}
                style={[styles.billRow, i < Math.min(upcomingBills.length, 6) - 1 && styles.billDivider]}
              >
                <View style={styles.billDateBox}>
                  <Text style={[styles.billDay, row.isOverdue && { color: theme.colors.status.red }]}>{format(row.nextDue, 'd')}</Text>
                  <Text style={[styles.billMonth, row.isOverdue && { color: theme.colors.status.red }]}>{format(row.nextDue, 'MMM').toUpperCase()}</Text>
                </View>
                <View style={styles.billInfo}>
                  <Text style={theme.typography.body} numberOfLines={1}>
                    {row.bill.name}
                  </Text>
                  <Text style={theme.typography.label}>
                    {row.isOverdue ? 'Overdue' : 'Due'} · {row.bill.category}
                  </Text>
                </View>
                <Text style={[styles.billAmount, row.isOverdue && { color: theme.colors.status.red }]}>
                  {formatCurrencyFull(row.bill.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </GlassBox>

        {/* Logs / Transactions for Month */}
        <Text style={styles.sectionTitle}>Expense Logs ({format(currentDate, 'MMM')})</Text>
        <GlassBox style={[styles.billsCard, { paddingBottom: 8 }]}>
          {monthTransactions.length === 0 ? (
            <Text style={[theme.typography.label, { paddingVertical: 8 }]}>
              No tracking data found for {format(currentDate, 'MMMM yyyy')}.
            </Text>
          ) : (
            monthTransactions.slice(0, 10).map((t, i) => (
              <View key={t.id} style={[styles.billRow, i < 9 && i < monthTransactions.length - 1 && styles.billDivider]}>
                <View style={[styles.billDateBox, { backgroundColor: t.type === 'income' ? 'rgba(52, 199, 89, 0.1)' : theme.colors.surfaceSecondary }]}>
                  <Text style={[styles.billDay, t.type === 'income' && { color: theme.colors.status.green }]}>{format(new Date(t.date), 'd')}</Text>
                  <Text style={[styles.billMonth, t.type === 'income' && { color: theme.colors.status.green }]}>{format(new Date(t.date), 'MMM').toUpperCase()}</Text>
                </View>
                <View style={styles.billInfo}>
                  <Text style={theme.typography.body} numberOfLines={1}>
                    {t.merchant_name || t.category}
                  </Text>
                  <Text style={theme.typography.label}>
                    {t.category}
                  </Text>
                </View>
                <Text style={[styles.billAmount, t.type === 'income' ? { color: theme.colors.status.green } : t.category === 'Savings Contribution' ? { color: theme.colors.accent } : undefined]}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrencyFull(t.amount, currency)}
                </Text>
              </View>
            ))
          )}
          {monthTransactions.length > 10 && (
            <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => navigation.navigate('Transactions', { monthStart: format(currentDate, 'yyyy-MM-01') })}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>View All {monthTransactions.length} Logs</Text>
            </TouchableOpacity>
          )}
        </GlassBox>
      </ScrollView>

      {/* Edit Budget Modal */}
      <Modal
        visible={!!editingBudget}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingBudget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Budget</Text>
              <TouchableOpacity onPress={() => setEditingBudget(null)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={theme.typography.label}>{editingBudget?.category}</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                placeholderTextColor={theme.colors.secondaryText}
              />
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit} activeOpacity={0.8}>
              <Check color={theme.colors.primaryText} size={18} />
              <Text style={styles.modalSaveText}>Save Limit</Text>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Overall Target Modal */}
      <Modal
        visible={isEditingOverall}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingOverall(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Target Budget</Text>
              <TouchableOpacity onPress={() => setIsEditingOverall(false)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={theme.typography.label}>Maximum limit across all categories.</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                value={overallValue}
                onChangeText={setOverallValue}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                placeholderTextColor={theme.colors.secondaryText}
              />
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveOverall} activeOpacity={0.8}>
              <Check color={theme.colors.primaryText} size={18} />
              <Text style={styles.modalSaveText}>Save Target</Text>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Savings Goal Modal */}
      <Modal
        visible={isAddingSavings}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddingSavings(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Savings Goal</Text>
              <TouchableOpacity onPress={() => setIsAddingSavings(false)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInputRow, { paddingVertical: 12, fontSize: 16, color: theme.colors.primaryText }]}
              placeholder="Goal Name (e.g., Vacation)"
              placeholderTextColor={theme.colors.secondaryText}
              value={newSavingsName}
              onChangeText={setNewSavingsName}
            />
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                value={newSavingsTarget}
                onChangeText={setNewSavingsTarget}
                keyboardType="decimal-pad"
                placeholder="Target Amount"
                placeholderTextColor={theme.colors.secondaryText}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalInputRow, { paddingVertical: 14, justifyContent: 'space-between' }]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, color: newSavingsDate ? theme.colors.primaryText : theme.colors.secondaryText }}>
                {newSavingsDate ? format(new Date(newSavingsDate), 'MMM d, yyyy') : 'Target Date (Optional)'}
              </Text>
              <Calendar color={theme.colors.secondaryText} size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateSavings} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Create Goal</Text>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      <GlassCalendarPicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={newSavingsDate ? new Date(newSavingsDate) : new Date()}
        onSelectDate={date => setNewSavingsDate(format(date, 'yyyy-MM-dd'))}
      />

      {/* Contribute to Savings Modal */}
      <Modal
        visible={!!contributingTo}
        transparent
        animationType="fade"
        onRequestClose={() => setContributingTo(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <TouchableOpacity onPress={() => setContributingTo(null)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                value={contributionAmount}
                onChangeText={setContributionAmount}
                keyboardType="decimal-pad"
                autoFocus
                placeholder="0.00"
                placeholderTextColor={theme.colors.secondaryText}
              />
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddContribution} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Confirm Deposit</Text>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>
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
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginTop: 2,
  },
  overallBarBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  overallBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryRemaining: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.primaryText,
    marginBottom: 12,
  },
  budgetCard: {
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  catNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  catLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  spendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spentText: {
    fontSize: 13,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  overText: {
    fontSize: 11,
    color: '#CF6679',
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '600',
  },
  billsCard: {
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  billDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
    marginBottom: 8,
  },
  billDateBox: {
    backgroundColor: theme.colors.surfaceSecondary,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billDay: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  billMonth: {
    fontSize: 9,
    color: theme.colors.secondaryText,
    fontWeight: '500',
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CF6679',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayBg,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.primaryText,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFC',
  },
  modalDollar: {
    fontSize: 18,
    color: theme.colors.secondaryText,
    marginRight: 6,
  },
  modalInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.primaryText,
    paddingVertical: 10,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  billsSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 12,
  },
  addFundsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(27,42,74,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  addFundsText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
});
