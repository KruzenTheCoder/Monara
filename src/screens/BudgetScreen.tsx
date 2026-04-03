import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
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
import { Edit3, X, Check, AlertTriangle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const BudgetScreen = () => {
  const navigation = useNavigation<any>();
  const { budgets, monthlySpendingByCategory, updateBudgetLimit, upcomingRecurringBills, user } = useFinancial();
  const currency = user.currency || 'USD';
  const [editingBudget, setEditingBudget] = useState<{ id: string; category: string; current: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = Object.values(monthlySpendingByCategory).reduce((sum, v) => sum + v, 0);
  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const getBarColor = (spent: number, limit: number) => {
    const pct = spent / limit;
    if (pct >= 1) return theme.colors.status.red;
    if (pct >= 0.8) return theme.colors.status.amber;
    return theme.colors.status.green;
  };

  const openEdit = (id: string, category: string, current: number) => {
    Haptics.selectionAsync();
    setEditingBudget({ id, category, current });
    setEditValue(current.toString());
  };

  const saveEdit = async () => {
    if (!editingBudget) return;
    const val = parseFloat(editValue);
    if (!val || val <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateBudgetLimit(editingBudget.id, val);
    setEditingBudget(null);
  };

  return (
    <AnimatedBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <Text style={theme.typography.label}>Monthly spending limits</Text>
        </View>

        {/* Overall Budget Summary */}
        <GlassBox style={styles.summaryCard} glow glowColor="#A78BFA">
          <View style={styles.summaryRow}>
            <View>
              <Text style={theme.typography.label}>Total Budget</Text>
              <Text style={styles.summaryAmount}>{formatCurrencyFull(totalBudget)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={theme.typography.label}>Spent</Text>
              <Text style={[styles.summaryAmount, { color: totalSpent > totalBudget ? theme.colors.status.red : '#FFF' }]}>
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
                  backgroundColor: getBarColor(totalSpent, totalBudget),
                },
              ]}
            />
          </View>
          <Text style={styles.summaryRemaining}>
            {totalSpent <= totalBudget
              ? `${formatCurrencyFull(totalBudget - totalSpent)} remaining`
              : `${formatCurrencyFull(totalSpent - totalBudget)} over budget`}
          </Text>
        </GlassBox>

        {/* Category Budgets */}
        <Text style={styles.sectionTitle}>Categories</Text>
        {budgets.map(budget => {
          const spent = monthlySpendingByCategory[budget.category] || 0;
          const progress = budget.monthly_limit > 0 ? Math.min((spent / budget.monthly_limit) * 100, 100) : 0;
          const barColor = getBarColor(spent, budget.monthly_limit);
          const catColor = getCategoryColor(budget.category);
          const isOver = spent > budget.monthly_limit;

          return (
            <GlassBox key={budget.id} style={styles.budgetCard}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  style={styles.catNav}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('CategoryTransactions', { category: budget.category });
                  }}
                >
                  <View style={styles.catLabelRow}>
                    <View style={[styles.catIndicator, { backgroundColor: catColor }]} />
                    <Text style={styles.catName}>{budget.category}</Text>
                    {isOver && <AlertTriangle color={theme.colors.status.red} size={14} />}
                  </View>
                  <ChevronRight color="rgba(255,255,255,0.35)" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEdit(budget.id, budget.category, budget.monthly_limit)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 color="rgba(255,255,255,0.4)" size={16} />
                </TouchableOpacity>
              </View>

              <View style={styles.spendRow}>
                <Text style={styles.spentText}>
                  <Text style={{ color: barColor }}>{formatCurrencyFull(spent)}</Text>
                  <Text style={theme.typography.label}> / {formatCurrencyFull(budget.monthly_limit)}</Text>
                </Text>
                <Text style={[styles.pctText, { color: barColor }]}>{progress.toFixed(0)}%</Text>
              </View>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${progress}%` as any, backgroundColor: barColor },
                  ]}
                />
              </View>

              {isOver && (
                <Text style={styles.overText}>
                  {formatCurrencyFull(spent - budget.monthly_limit)} over limit
                </Text>
              )}
            </GlassBox>
          );
        })}

        {/* Upcoming Bills — from recurring transactions */}
        <Text style={styles.sectionTitle}>Upcoming bills</Text>
        <GlassBox style={styles.billsCard}>
          {upcomingRecurringBills.length === 0 ? (
            <Text style={[theme.typography.label, { paddingVertical: 8 }]}>
              No recurring expenses yet. Add a transaction and enable “Recurring payment”.
            </Text>
          ) : (
            upcomingRecurringBills.map((bill, i) => (
              <View
                key={bill.id}
                style={[styles.billRow, i < upcomingRecurringBills.length - 1 && styles.billDivider]}
              >
                <View style={styles.billDateBox}>
                  <Text style={styles.billDay}>{format(bill.nextDue, 'd')}</Text>
                  <Text style={styles.billMonth}>{format(bill.nextDue, 'MMM').toUpperCase()}</Text>
                </View>
                <View style={styles.billInfo}>
                  <Text style={theme.typography.body} numberOfLines={1}>
                    {bill.name}
                  </Text>
                  <Text style={theme.typography.label}>
                    {bill.frequency} · {bill.category}
                  </Text>
                </View>
                <Text style={styles.billAmount}>{formatCurrencyFull(bill.amount, currency)}</Text>
              </View>
            ))
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
                <X color="rgba(255,255,255,0.6)" size={22} />
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
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEdit} activeOpacity={0.8}>
              <Check color="#FFF" size={18} />
              <Text style={styles.modalSaveText}>Save Limit</Text>
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
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
    color: '#FFFFFF',
    marginTop: 2,
  },
  overallBarBg: {
    height: 6,
    backgroundColor: '#2C2C2C',
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
    color: '#A0A0A0',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    backgroundColor: '#2C2C2C',
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
    borderBottomColor: '#2C2C2C',
    paddingBottom: 8,
    marginBottom: 8,
  },
  billDateBox: {
    backgroundColor: '#2C2C2C',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billDay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  billMonth: {
    fontSize: 9,
    color: '#A0A0A0',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#121212',
  },
  modalDollar: {
    fontSize: 18,
    color: '#A0A0A0',
    marginRight: 6,
  },
  modalInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#BB86FC',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#121212',
  },
});
