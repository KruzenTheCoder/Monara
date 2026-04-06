import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { addMonths, format, isSameMonth, isThisMonth, subMonths } from 'date-fns';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { showTransactionActionMenu } from '../utils/transactionActions';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type RouteParams = { category: string; monthStart?: string };

export const CategoryTransactionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { category, monthStart } = (route.params || {}) as RouteParams;
  const { transactions, user, taxForTransaction, deleteTransaction } = useFinancial();
  const currency = user.currency || 'USD';
  const [monthOnly, setMonthOnly] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => (monthStart ? new Date(monthStart) : new Date()));
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const rows = useMemo(() => {
    const list = transactions.filter(
      t =>
        t.type === 'expense' &&
        t.category === category &&
        (!monthOnly || isSameMonth(new Date(t.date), currentDate)),
    );
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, category, monthOnly, currentDate]);

  const paidTotal = useMemo(() => rows.filter(t => t.payment_status !== 'unpaid').reduce((s, t) => s + t.amount, 0), [rows]);
  const unpaidTotal = useMemo(() => rows.filter(t => t.payment_status === 'unpaid').reduce((s, t) => s + t.amount, 0), [rows]);
  const totalTax = useMemo(() => rows.filter(t => t.payment_status !== 'unpaid').reduce((s, t) => s + taxForTransaction(t), 0), [rows, taxForTransaction]);

  const catColor = getCategoryColor(category);

  const titleLine = (t: (typeof transactions)[0]) =>
    (t.merchant_name && t.merchant_name.trim()) || (t.note && t.note.trim()) || 'Expense';

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
        <View style={styles.headerTitleBlock}>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <Text style={styles.headerTitle} numberOfLines={2}>
            {category || 'Category'}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <GlassBox style={styles.summary}>
          <View style={styles.filterRow}>
            <Text style={theme.typography.label}>Showing</Text>
            <View style={styles.filterRight}>
              {monthOnly && (
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
                    disabled={isThisMonth(currentDate)}
                  >
                    <ChevronRight color={isThisMonth(currentDate) ? theme.colors.divider : theme.colors.secondaryText} size={18} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setMonthOnly(!monthOnly);
                }}
                style={styles.filterPill}
              >
                <Text style={styles.filterPillText}>{monthOnly ? 'Month' : 'All time'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.totalLabel}>Paid total</Text>
          <Text style={styles.totalVal}>{formatCurrencyFull(paidTotal, currency)}</Text>
          {unpaidTotal > 0 && (
            <Text style={styles.unpaidHint}>Unpaid: {formatCurrencyFull(unpaidTotal, currency)}</Text>
          )}
          {user.tax_enabled && totalTax > 0 && (
            <Text style={styles.taxHint}>
              Est. tax on these entries: {formatCurrencyFull(totalTax, currency)}
            </Text>
          )}
        </GlassBox>

        <Text style={styles.sectionTitle}>Individual expenses</Text>
        {rows.length === 0 ? (
          <GlassBox style={styles.empty}>
            <Text style={theme.typography.label}>No expenses in this view.</Text>
          </GlassBox>
        ) : (
          rows.map(t => {
            const tax = taxForTransaction(t);
            return (
              <Pressable
                key={t.id}
                onLongPress={() => onLongPressRow(t)}
                delayLongPress={400}
                style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressActive]}
              >
                <GlassBox style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: `${catColor}22` }]}>
                    <TrendingDown color={theme.colors.status.red} size={16} />
                  </View>
                  <View style={styles.rowMid}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {titleLine(t)}
                    </Text>
                    {t.note && t.note.trim() && t.note.trim() !== (t.merchant_name || '').trim() ? (
                      <Text style={styles.rowSub} numberOfLines={2}>
                        {t.note.trim()}
                      </Text>
                    ) : null}
                    <Text style={styles.rowDate}>{format(new Date(t.date), 'MMM d, yyyy · h:mm a')}</Text>
                    {t.due_date && <Text style={styles.rowDate}>Due {format(new Date(t.due_date), 'MMM d, yyyy')}</Text>}
                    {t.payment_status === 'unpaid' && <Text style={styles.unpaidBadge}>UNPAID</Text>}
                    {user.tax_enabled && tax > 0 && (
                      <Text style={styles.taxLine}>Est. tax {formatCurrencyFull(tax, currency)}</Text>
                    )}
                  </View>
                  <Text style={styles.rowAmt}>{formatCurrencyFull(t.amount, currency)}</Text>
                </GlassBox>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <TransactionEditModal
        visible={!!editTx}
        transaction={editTx}
        onClose={() => setEditTx(null)}
      />
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
  headerTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  summary: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(62,146,204,0.2)',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  totalLabel: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginBottom: 4,
  },
  totalVal: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primaryText,
  },
  taxHint: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginTop: 8,
  },
  unpaidHint: {
    fontSize: 12,
    color: theme.colors.status.red,
    marginTop: 6,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 10,
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  rowPress: {
    marginBottom: 8,
  },
  rowPressActive: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  rowSub: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  rowDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
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
  taxLine: {
    fontSize: 11,
    color: theme.colors.accent,
    marginTop: 4,
  },
  rowAmt: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryText,
    flexShrink: 0,
  },
});
