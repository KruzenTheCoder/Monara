import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addMonths, format, isSameMonth, subMonths } from 'date-fns';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { useFinancial } from '../context/FinancialContext';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, ChevronRight as RowChevron } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { showTransactionActionMenu } from '../utils/transactionActions';

type RouteParams = { monthStart?: string };

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { monthStart } = (route.params || {}) as RouteParams;
  const [currentDate, setCurrentDate] = useState(() => (monthStart ? new Date(monthStart) : new Date()));
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const { transactions, user, deleteTransaction } = useFinancial();
  const currency = user.currency || 'USD';

  const monthTransactions = useMemo(() => {
    const list = transactions.filter(t => isSameMonth(new Date(t.date), currentDate));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate]);

  const monthIncome = useMemo(
    () => monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );
  const monthExpenses = useMemo(
    () =>
      monthTransactions
        .filter(t => t.type === 'expense' && t.payment_status !== 'unpaid' && t.category !== 'Savings Contribution')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );
  const monthUnpaid = useMemo(
    () =>
      monthTransactions
        .filter(t => t.type === 'expense' && t.payment_status === 'unpaid' && t.category !== 'Savings Contribution')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense' && t.category !== 'Savings Contribution')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTransactions]);

  const titleLine = (t: Transaction) =>
    (t.merchant_name && t.merchant_name.trim()) || (t.note && t.note.trim()) || t.category;

  const onLongPressRow = (t: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showTransactionActionMenu(t, titleLine(t), () => setEditTx(t), () => {
      deleteTransaction(t.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  return (
    <AnimatedBackground>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.colors.primaryText} size={28} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setCurrentDate(subMonths(currentDate, 1));
              }}
              style={styles.monthBtn}
            >
              <ChevronLeft color={theme.colors.secondaryText} size={18} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(currentDate, 'MMM yyyy')}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setCurrentDate(addMonths(currentDate, 1));
              }}
              style={styles.monthBtn}
              disabled={isSameMonth(currentDate, new Date())}
            >
              <ChevronRight color={isSameMonth(currentDate, new Date()) ? theme.colors.divider : theme.colors.secondaryText} size={18} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <GlassBox style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: theme.colors.status.green }]}>{formatCurrencyFull(monthIncome, currency)}</Text>
          </GlassBox>
          <GlassBox style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid expenses</Text>
            <Text style={[styles.summaryVal, { color: theme.colors.status.red }]}>{formatCurrencyFull(monthExpenses, currency)}</Text>
          </GlassBox>
        </View>
        {monthUnpaid > 0 && (
          <Text style={styles.unpaidHint}>Unpaid this month: {formatCurrencyFull(monthUnpaid, currency)}</Text>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.sectionHint}>Tap to see the full list</Text>
        </View>
        {categoryTotals.length === 0 ? (
          <GlassBox style={styles.empty}>
            <Text style={theme.typography.label}>No expenses in this month.</Text>
          </GlassBox>
        ) : (
          <GlassBox style={styles.catCard}>
            {categoryTotals.map(([cat, amt], i) => {
              const color = getCategoryColor(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate('CategoryTransactions', { category: cat, monthStart: format(currentDate, 'yyyy-MM-01') });
                  }}
                  style={[styles.catRow, i < categoryTotals.length - 1 && styles.catDivider]}
                >
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, { backgroundColor: color }]} />
                    <Text style={styles.catName} numberOfLines={1}>{cat}</Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmt}>{formatCurrencyFull(amt, currency)}</Text>
                    <RowChevron color={theme.colors.secondaryText} size={18} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </GlassBox>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Full list</Text>
        {monthTransactions.length === 0 ? (
          <GlassBox style={styles.empty}>
            <Text style={theme.typography.label}>No transactions in this month.</Text>
          </GlassBox>
        ) : (
          monthTransactions.map(t => {
            const catColor = getCategoryColor(t.category);
            const Icon = t.type === 'income' ? TrendingUp : TrendingDown;
            return (
              <Pressable
                key={t.id}
                onLongPress={() => onLongPressRow(t)}
                delayLongPress={400}
                style={({ pressed }) => [styles.rowPress, pressed && { opacity: 0.92 }]}
              >
                <GlassBox style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: `${catColor}22`, borderColor: `${catColor}44` }]}>
                    <Icon color={t.type === 'income' ? theme.colors.status.green : theme.colors.status.red} size={16} />
                  </View>
                  <View style={styles.rowMid}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{titleLine(t)}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {t.merchant_name?.trim() ? `${t.category} · ` : ''}
                      {format(new Date(t.date), 'MMM d, h:mm a')}
                      {t.type === 'expense' && t.due_date ? ` · Due ${format(new Date(t.due_date), 'MMM d')}` : ''}
                    </Text>
                    {t.type === 'expense' && t.payment_status === 'unpaid' && (
                      <Text style={styles.unpaidBadge}>UNPAID</Text>
                    )}
                  </View>
                  <Text style={[styles.rowAmt, t.type === 'income' ? { color: theme.colors.status.green } : undefined]}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrencyFull(t.amount, currency)}
                  </Text>
                </GlassBox>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <TransactionEditModal visible={!!editTx} transaction={editTx} onClose={() => setEditTx(null)} />
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 48,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMid: {
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primaryText,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  monthBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 12,
    minWidth: 76,
    textAlign: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondaryText,
  },
  summaryVal: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.primaryText,
  },
  unpaidHint: {
    marginTop: -4,
    marginBottom: 10,
    color: theme.colors.status.red,
    fontWeight: '800',
    fontSize: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryText,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondaryText,
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  catCard: {
    padding: 0,
  },
  catRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  catDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    color: theme.colors.primaryText,
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
    minWidth: 0,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catAmt: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 13,
  },
  rowPress: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primaryText,
  },
  rowSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondaryText,
  },
  unpaidBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.18)',
    color: theme.colors.status.red,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  rowAmt: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primaryText,
    flexShrink: 0,
  },
});
