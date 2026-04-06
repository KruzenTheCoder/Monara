import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  ArrowLeft,
  Plus,
  CreditCard,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  Zap,
  ChevronRight,
  Trash2,
  X,
  Award,
  BarChart2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { differenceInMonths, addMonths, format } from 'date-fns';

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal' | 'other';
}

const DEBT_TYPES = [
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard, color: '#EF4444' },
  { id: 'student_loan', label: 'Student Loan', icon: Award, color: '#3B82F6' },
  { id: 'mortgage', label: 'Mortgage', icon: Target, color: '#10B981' },
  { id: 'car_loan', label: 'Car Loan', icon: BarChart2, color: '#F59E0B' },
  { id: 'personal', label: 'Personal Loan', icon: DollarSign, color: '#3E92CC' },
  { id: 'other', label: 'Other', icon: CreditCard, color: '#6B7280' },
];

export const DebtPayoffScreen = () => {
  const navigation = useNavigation();
  const { user } = useFinancial();
  const currency = user.currency || 'USD';

  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Visa Card', balance: 4500, interestRate: 19.99, minimumPayment: 90, type: 'credit_card' },
    { id: '2', name: 'Student Loan', balance: 15000, interestRate: 5.5, minimumPayment: 180, type: 'student_loan' },
  ]);
  const [extraPayment, setExtraPayment] = useState(200);
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', rate: '', minimum: '', type: 'credit_card' });

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const totalPayment = totalMinimum + extraPayment;
  const avgRate = debts.length > 0
    ? debts.reduce((s, d) => s + d.interestRate * d.balance, 0) / totalDebt
    : 0;

  // Calculate payoff timeline
  const payoffResult = useMemo(() => {
    if (debts.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0, timeline: [] };

    // Sort debts by strategy
    const sorted = [...debts].sort((a, b) => {
      if (strategy === 'avalanche') return b.interestRate - a.interestRate;
      return a.balance - b.balance; // snowball
    });

    let remaining = sorted.map(d => ({ ...d }));
    let months = 0;
    let totalInterest = 0;
    const timeline: { month: number; balance: number }[] = [];
    const maxMonths = 360; // 30 years cap

    while (remaining.some(d => d.balance > 0) && months < maxMonths) {
      months++;
      let extraLeft = extraPayment;

      // Apply interest first
      remaining.forEach(d => {
        if (d.balance > 0) {
          const interest = (d.balance * d.interestRate / 100) / 12;
          totalInterest += interest;
          d.balance += interest;
        }
      });

      // Pay minimums
      remaining.forEach(d => {
        if (d.balance > 0) {
          const payment = Math.min(d.minimumPayment, d.balance);
          d.balance -= payment;
        }
      });

      // Apply extra payment to target debt
      for (const d of remaining) {
        if (d.balance > 0 && extraLeft > 0) {
          const payment = Math.min(extraLeft, d.balance);
          d.balance -= payment;
          extraLeft -= payment;
          if (d.balance <= 0) continue; // Move to next debt
          break; // Extra goes to one debt at a time
        }
      }

      const totalRemaining = remaining.reduce((s, d) => s + Math.max(d.balance, 0), 0);
      if (months % 3 === 0 || totalRemaining <= 0) {
        timeline.push({ month: months, balance: Math.max(totalRemaining, 0) });
      }
    }

    return {
      months,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalDebt + totalInterest),
      timeline,
    };
  }, [debts, extraPayment, strategy]);

  // Calculate minimum-only payoff for comparison
  const minimumOnlyResult = useMemo(() => {
    if (debts.length === 0) return { months: 0, totalInterest: 0 };

    let remaining = debts.map(d => ({ ...d }));
    let months = 0;
    let totalInterest = 0;

    while (remaining.some(d => d.balance > 0) && months < 360) {
      months++;
      remaining.forEach(d => {
        if (d.balance > 0) {
          const interest = (d.balance * d.interestRate / 100) / 12;
          totalInterest += interest;
          d.balance += interest;
          const payment = Math.min(d.minimumPayment, d.balance);
          d.balance -= payment;
        }
      });
    }

    return { months, totalInterest: Math.round(totalInterest) };
  }, [debts]);

  const monthsSaved = minimumOnlyResult.months - payoffResult.months;
  const interestSaved = minimumOnlyResult.totalInterest - payoffResult.totalInterest;

  const addDebt = () => {
    if (!newDebt.name || !newDebt.balance || !newDebt.rate || !newDebt.minimum) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDebts(prev => [...prev, {
      id: Date.now().toString(),
      name: newDebt.name,
      balance: parseFloat(newDebt.balance),
      interestRate: parseFloat(newDebt.rate),
      minimumPayment: parseFloat(newDebt.minimum),
      type: newDebt.type as any,
    }]);
    setNewDebt({ name: '', balance: '', rate: '', minimum: '', type: 'credit_card' });
    setShowAddModal(false);
  };

  const removeDebt = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const payoffDate = useMemo(() => {
    return format(addMonths(new Date(), payoffResult.months), 'MMM yyyy');
  }, [payoffResult.months]);

  const getDebtTypeInfo = (type: string) =>
    DEBT_TYPES.find(t => t.id === type) || DEBT_TYPES[5];

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
            <Text style={styles.headerTitle}>Debt Payoff Planner</Text>
            <Text style={styles.headerSubtitle}>Plan your path to debt-free</Text>
          </View>
        </View>

        {/* Summary Card */}
        <GlassBox style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Debt</Text>
          <Text style={styles.summaryAmount}>{formatCurrencyFull(totalDebt, currency)}</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Payoff Date</Text>
              <Text style={styles.summaryItemValue}>{payoffDate}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Avg Rate</Text>
              <Text style={styles.summaryItemValue}>{avgRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Monthly</Text>
              <Text style={styles.summaryItemValue}>{formatCurrencyFull(totalPayment, currency)}</Text>
            </View>
          </View>
        </GlassBox>

        {/* Strategy Selector */}
        <Text style={styles.sectionTitle}>Payoff Strategy</Text>
        <View style={styles.strategyRow}>
          <TouchableOpacity
            style={[styles.strategyCard, strategy === 'avalanche' && styles.strategyActive]}
            onPress={() => { setStrategy('avalanche'); Haptics.selectionAsync(); }}
          >
            <Zap color={strategy === 'avalanche' ? '#EF4444' : theme.colors.secondaryText} size={24} />
            <Text style={[styles.strategyTitle, strategy === 'avalanche' && { color: '#EF4444' }]}>Avalanche</Text>
            <Text style={styles.strategyDesc}>Highest interest first</Text>
            <Text style={styles.strategyBenefit}>Saves most money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.strategyCard, strategy === 'snowball' && styles.strategyActive]}
            onPress={() => { setStrategy('snowball'); Haptics.selectionAsync(); }}
          >
            <TrendingDown color={strategy === 'snowball' ? '#3B82F6' : theme.colors.secondaryText} size={24} />
            <Text style={[styles.strategyTitle, strategy === 'snowball' && { color: '#3B82F6' }]}>Snowball</Text>
            <Text style={styles.strategyDesc}>Smallest balance first</Text>
            <Text style={styles.strategyBenefit}>Quick wins</Text>
          </TouchableOpacity>
        </View>

        {/* Extra Payment Slider */}
        <Text style={styles.sectionTitle}>Extra Monthly Payment</Text>
        <GlassBox style={styles.extraCard}>
          <View style={styles.extraRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => { setExtraPayment(Math.max(0, extraPayment - 50)); Haptics.selectionAsync(); }}
            >
              <Text style={styles.adjustBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.extraAmount}>
              <Text style={styles.extraAmountText}>{formatCurrencyFull(extraPayment, currency)}</Text>
            </View>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => { setExtraPayment(extraPayment + 50); Haptics.selectionAsync(); }}
            >
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {extraPayment > 0 && monthsSaved > 0 && (
            <View style={styles.savingsInfo}>
              <Text style={styles.savingsText}>
                You'll save {formatCurrencyFull(interestSaved, currency)} in interest and be debt-free
                {' '}<Text style={{ fontWeight: '800', color: theme.colors.status.green }}>{monthsSaved} months sooner</Text>!
              </Text>
            </View>
          )}
        </GlassBox>

        {/* Debts List */}
        <View style={styles.debtHeader}>
          <Text style={styles.sectionTitle}>Your Debts ({debts.length})</Text>
          <TouchableOpacity
            style={styles.addDebtBtn}
            onPress={() => { setShowAddModal(true); Haptics.selectionAsync(); }}
          >
            <Plus color={theme.colors.accent} size={18} />
            <Text style={styles.addDebtText}>Add</Text>
          </TouchableOpacity>
        </View>

        {debts.map(debt => {
          const typeInfo = getDebtTypeInfo(debt.type);
          const Icon = typeInfo.icon;
          const paidPercent = totalDebt > 0 ? ((totalDebt - debt.balance) / totalDebt) * 100 : 0;

          return (
            <GlassBox key={debt.id} style={styles.debtCard}>
              <View style={styles.debtRow}>
                <View style={[styles.debtIcon, { backgroundColor: `${typeInfo.color}20` }]}>
                  <Icon color={typeInfo.color} size={20} />
                </View>
                <View style={styles.debtInfo}>
                  <Text style={styles.debtName}>{debt.name}</Text>
                  <Text style={styles.debtMeta}>
                    {debt.interestRate}% APR · {formatCurrencyFull(debt.minimumPayment, currency)}/mo min
                  </Text>
                </View>
                <View style={styles.debtRight}>
                  <Text style={styles.debtBalance}>{formatCurrencyFull(debt.balance, currency)}</Text>
                  <TouchableOpacity onPress={() => removeDebt(debt.id)}>
                    <Trash2 color={theme.colors.secondaryText} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassBox>
          );
        })}

        {debts.length === 0 && (
          <GlassBox style={styles.emptyCard}>
            <CreditCard color={theme.colors.secondaryText} size={48} />
            <Text style={styles.emptyText}>No debts added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add" to get started with your payoff plan</Text>
          </GlassBox>
        )}

        {/* Payoff Stats */}
        {debts.length > 0 && (
          <GlassBox style={styles.statsCard}>
            <Text style={styles.statsTitle}>Payoff Breakdown</Text>
            <View style={styles.statsRow}>
              <View style={styles.statsItem}>
                <Calendar color="#3B82F6" size={18} />
                <Text style={styles.statsLabel}>Time to Payoff</Text>
                <Text style={styles.statsValue}>
                  {Math.floor(payoffResult.months / 12)}y {payoffResult.months % 12}m
                </Text>
              </View>
              <View style={styles.statsItem}>
                <DollarSign color="#EF4444" size={18} />
                <Text style={styles.statsLabel}>Total Interest</Text>
                <Text style={styles.statsValue}>{formatCurrencyFull(payoffResult.totalInterest, currency)}</Text>
              </View>
              <View style={styles.statsItem}>
                <Target color={theme.colors.status.green} size={18} />
                <Text style={styles.statsLabel}>Total Paid</Text>
                <Text style={styles.statsValue}>{formatCurrencyFull(payoffResult.totalPaid, currency)}</Text>
              </View>
            </View>
          </GlassBox>
        )}
      </ScrollView>

      {/* Add Debt Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAddModal(false)}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,42,74,0.3)' }]} />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <GlassBox style={styles.addModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Debt</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X color={theme.colors.secondaryText} size={24} />
                </TouchableOpacity>
              </View>

              {/* Type Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {DEBT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeChip, newDebt.type === type.id && { backgroundColor: `${type.color}20`, borderColor: `${type.color}40` }]}
                    onPress={() => setNewDebt(p => ({ ...p, type: type.id }))}
                  >
                    <type.icon color={newDebt.type === type.id ? type.color : theme.colors.secondaryText} size={14} />
                    <Text style={[styles.typeChipText, newDebt.type === type.id && { color: type.color }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={newDebt.name}
                  onChangeText={v => setNewDebt(p => ({ ...p, name: v }))}
                  placeholder="e.g., Chase Visa"
                  placeholderTextColor={theme.colors.secondaryText}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Balance</Text>
                  <TextInput
                    style={styles.input}
                    value={newDebt.balance}
                    onChangeText={v => setNewDebt(p => ({ ...p, balance: v }))}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>APR %</Text>
                  <TextInput
                    style={styles.input}
                    value={newDebt.rate}
                    onChangeText={v => setNewDebt(p => ({ ...p, rate: v }))}
                    placeholder="0.0"
                    placeholderTextColor={theme.colors.secondaryText}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Minimum Monthly Payment</Text>
                <TextInput
                  style={styles.input}
                  value={newDebt.minimum}
                  onChangeText={v => setNewDebt(p => ({ ...p, minimum: v }))}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.secondaryText}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addDebt}>
                <LinearGradient
                  colors={[theme.colors.accent, '#1B2A4A']}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>Add Debt</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassBox>
          </View>
        </View>
      </Modal>
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
  summaryCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  summaryLabel: { fontSize: 12, color: theme.colors.secondaryText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryAmount: { fontSize: 36, fontWeight: '800', color: theme.colors.primaryText, letterSpacing: -1, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', width: '100%' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryItemLabel: { fontSize: 11, color: theme.colors.secondaryText, marginBottom: 4 },
  summaryItemValue: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryText },
  summaryDivider: { width: 1, backgroundColor: 'rgba(27,42,74,0.05)', alignSelf: 'stretch' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 14 },
  strategyRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  strategyCard: {
    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  strategyActive: { borderColor: 'rgba(62,146,204,0.2)', backgroundColor: 'rgba(187,134,252,0.08)' },
  strategyTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primaryText },
  strategyDesc: { fontSize: 12, color: theme.colors.secondaryText },
  strategyBenefit: { fontSize: 11, color: theme.colors.accent, fontWeight: '600' },
  extraCard: { padding: 16, marginBottom: 24 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjustBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  adjustBtnText: { fontSize: 22, fontWeight: '700', color: theme.colors.primaryText },
  extraAmount: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  extraAmountText: { fontSize: 20, fontWeight: '700', color: theme.colors.accent },
  savingsInfo: {
    marginTop: 14, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  savingsText: { fontSize: 13, color: theme.colors.secondaryText, lineHeight: 20 },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addDebtBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(62,146,204,0.1)',
  },
  addDebtText: { fontSize: 13, fontWeight: '600', color: theme.colors.accent },
  debtCard: { marginBottom: 10, padding: 14 },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debtIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 15, fontWeight: '600', color: theme.colors.primaryText, marginBottom: 2 },
  debtMeta: { fontSize: 12, color: theme.colors.secondaryText },
  debtRight: { alignItems: 'flex-end', gap: 8 },
  debtBalance: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
  emptyCard: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.secondaryText },
  emptySubtext: { fontSize: 13, color: theme.colors.secondaryText, textAlign: 'center' },
  statsCard: { padding: 20, marginTop: 16 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  statsItem: { flex: 1, alignItems: 'center', gap: 6 },
  statsLabel: { fontSize: 11, color: theme.colors.secondaryText, textAlign: 'center' },
  statsValue: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryText },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '80%' },
  addModal: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.primaryText },
  typeScroll: { marginBottom: 20 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondaryText },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: theme.colors.secondaryText, fontWeight: '600', marginBottom: 8 },
  input: {
    fontSize: 15, color: theme.colors.primaryText, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  addButton: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  addButtonGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  addButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
});
