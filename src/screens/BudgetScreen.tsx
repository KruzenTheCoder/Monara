import React, { useState } from 'react';
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
import { Edit3, X, Check, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const BudgetScreen = () => {
  const { budgets, monthlySpendingByCategory, updateBudgetLimit } = useFinancial();
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

  const UPCOMING_BILLS = [
    { name: 'Netflix', amount: 15.99, day: 15 },
    { name: 'Spotify', amount: 9.99, day: 18 },
    { name: 'iCloud Storage', amount: 2.99, day: 22 },
  ];

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
                <View style={styles.catLabelRow}>
                  <View style={[styles.catIndicator, { backgroundColor: catColor }]} />
                  <Text style={styles.catName}>{budget.category}</Text>
                  {isOver && <AlertTriangle color={theme.colors.status.red} size={14} />}
                </View>
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

        {/* Upcoming Bills */}
        <Text style={styles.sectionTitle}>Upcoming Bills</Text>
        <GlassBox style={styles.billsCard}>
          {UPCOMING_BILLS.map((bill, i) => (
            <View key={i} style={[styles.billRow, i < UPCOMING_BILLS.length - 1 && styles.billDivider]}>
              <View style={styles.billDateBox}>
                <Text style={styles.billDay}>{bill.day}</Text>
                <Text style={styles.billMonth}>{new Date(2025, new Date().getMonth(), bill.day).toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
              </View>
              <View style={styles.billInfo}>
                <Text style={theme.typography.body}>{bill.name}</Text>
                <Text style={theme.typography.label}>Recurring subscription</Text>
              </View>
              <Text style={styles.billAmount}>{formatCurrencyFull(bill.amount)}</Text>
            </View>
          ))}
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
