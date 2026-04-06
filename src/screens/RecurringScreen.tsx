import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { showStyledAlert } from '../components/StyledAlert';
import { getNextDueDate } from '../utils/recurringBills';
import { Transaction } from '../types';
import {
  ChevronLeft,
  RefreshCcw,
  Pause,
  Play,
  Trash2,
  Calendar,
  DollarSign,
  Clock,
  StopCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type Tab = 'active' | 'stopped';

export const RecurringScreen = () => {
  const navigation = useNavigation();
  const {
    transactions,
    user,
    deleteTransaction,
    stopRecurring,
    resumeRecurring,
  } = useFinancial();
  const currency = user.currency || 'USD';
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  // All recurring transactions
  const allRecurring = useMemo(
    () => transactions.filter(t => !!t.recurring?.frequency),
    [transactions],
  );

  const activeRecurring = useMemo(
    () => allRecurring.filter(t => !t.recurring?.stopped_at),
    [allRecurring],
  );

  const stoppedRecurring = useMemo(
    () => allRecurring.filter(t => !!t.recurring?.stopped_at),
    [allRecurring],
  );

  const displayed = activeTab === 'active' ? activeRecurring : stoppedRecurring;

  // Monthly total for active recurring
  const monthlyTotal = useMemo(() => {
    return activeRecurring.reduce((sum, t) => {
      const freq = t.recurring!.frequency;
      switch (freq) {
        case 'daily': return sum + t.amount * 30;
        case 'weekly': return sum + t.amount * 4.33;
        case 'monthly': return sum + t.amount;
        case 'yearly': return sum + t.amount / 12;
        default: return sum + t.amount;
      }
    }, 0);
  }, [activeRecurring]);

  const handleStop = (tx: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = tx.merchant_name?.trim() || tx.category;
    showStyledAlert(
      'Stop recurring payment?',
      `"${name}" will no longer appear in upcoming bills. The transaction history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Payment',
          style: 'destructive',
          onPress: () => {
            stopRecurring(tx.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      'destructive',
    );
  };

  const handleResume = (tx: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = tx.merchant_name?.trim() || tx.category;
    showStyledAlert(
      'Resume recurring payment?',
      `"${name}" will appear in upcoming bills again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: () => {
            resumeRecurring(tx.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      'success',
    );
  };

  const handleDelete = (tx: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const name = tx.merchant_name?.trim() || tx.category;
    showStyledAlert(
      'Delete permanently?',
      `"${name}" and its history will be permanently removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(tx.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      'destructive',
    );
  };

  const freqLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return freq;
    }
  };

  const getNextDue = (tx: Transaction) => {
    if (!tx.recurring?.frequency || tx.recurring.stopped_at) return null;
    return getNextDueDate(new Date(tx.date), tx.recurring.frequency);
  };

  return (
    <AnimatedBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.colors.primaryText} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <RefreshCcw color={theme.colors.accent} size={20} strokeWidth={2} />
          <Text style={styles.headerTitle}>Recurring Payments</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <GlassBox style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(62,146,204,0.1)' }]}>
                <RefreshCcw color={theme.colors.accent} size={18} />
              </View>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryVal}>{activeRecurring.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(255,149,0,0.12)' }]}>
                <DollarSign color={theme.colors.status.amber} size={18} />
              </View>
              <Text style={styles.summaryLabel}>Monthly est.</Text>
              <Text style={styles.summaryVal}>{formatCurrencyFull(monthlyTotal, currency)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                <StopCircle color={theme.colors.status.red} size={18} />
              </View>
              <Text style={styles.summaryLabel}>Stopped</Text>
              <Text style={styles.summaryVal}>{stoppedRecurring.length}</Text>
            </View>
          </View>
        </GlassBox>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['active', 'stopped'] as Tab[]).map(tab => {
            const isOn = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isOn && styles.tabActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab);
                }}
                activeOpacity={0.7}
              >
                {tab === 'active' ? (
                  <Play color={isOn ? theme.colors.accent : '#666'} size={14} />
                ) : (
                  <Pause color={isOn ? theme.colors.status.red : '#666'} size={14} />
                )}
                <Text style={[styles.tabText, isOn && styles.tabTextActive]}>
                  {tab === 'active' ? `Active (${activeRecurring.length})` : `Stopped (${stoppedRecurring.length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {displayed.length === 0 ? (
          <GlassBox style={styles.emptyCard}>
            <RefreshCcw color="#555" size={32} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No active recurring payments' : 'No stopped payments'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'Mark a transaction as recurring when adding it to see it here.'
                : 'Stopped recurring payments will appear here for historical tracking.'}
            </Text>
          </GlassBox>
        ) : (
          displayed.map(tx => {
            const catColor = getCategoryColor(tx.category);
            const name = tx.merchant_name?.trim() || tx.note?.trim() || tx.category;
            const isStopped = !!tx.recurring?.stopped_at;
            const nextDue = getNextDue(tx);

            return (
              <Pressable
                key={tx.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEditTx(tx);
                }}
                style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.88 }]}
              >
                <GlassBox style={styles.recurringCard}>
                  {/* Top row */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.catIcon, { backgroundColor: `${catColor}18` }]}>
                      <RefreshCcw
                        color={isStopped ? '#666' : catColor}
                        size={18}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, isStopped && { color: '#666' }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <View style={styles.cardMetaRow}>
                        <View style={[styles.freqBadge, isStopped && styles.freqBadgeStopped]}>
                          <Text style={[styles.freqBadgeText, isStopped && { color: '#888' }]}>
                            {freqLabel(tx.recurring!.frequency)}
                          </Text>
                        </View>
                        <Text style={styles.cardCategory}>{tx.category}</Text>
                      </View>
                    </View>
                    <View style={styles.cardAmountBlock}>
                      <Text style={[styles.cardAmount, isStopped && { color: '#666' }]}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrencyFull(tx.amount, currency)}
                      </Text>
                      <Text style={styles.cardType}>
                        {tx.type === 'income' ? 'income' : 'expense'}
                      </Text>
                    </View>
                  </View>

                  {/* Details row */}
                  <View style={styles.cardDetailsRow}>
                    <View style={styles.cardDetailItem}>
                      <Calendar color="#666" size={13} />
                      <Text style={styles.cardDetailText}>
                        Started {format(new Date(tx.date), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    {isStopped && tx.recurring?.stopped_at ? (
                      <View style={styles.cardDetailItem}>
                        <StopCircle color={theme.colors.status.red} size={13} />
                        <Text style={[styles.cardDetailText, { color: theme.colors.status.red }]}>
                          Stopped {format(new Date(tx.recurring.stopped_at), 'MMM d, yyyy')}
                        </Text>
                      </View>
                    ) : nextDue ? (
                      <View style={styles.cardDetailItem}>
                        <Clock color={theme.colors.accent} size={13} />
                        <Text style={[styles.cardDetailText, { color: theme.colors.accent }]}>
                          Next: {format(nextDue, 'MMM d, yyyy')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {isStopped ? (
                      <>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleResume(tx)}
                          activeOpacity={0.7}
                        >
                          <Play color={theme.colors.status.green} size={15} />
                          <Text style={[styles.actionBtnText, { color: theme.colors.status.green }]}>
                            Resume
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDestructive]}
                          onPress={() => handleDelete(tx)}
                          activeOpacity={0.7}
                        >
                          <Trash2 color={theme.colors.status.red} size={15} />
                          <Text style={[styles.actionBtnText, { color: theme.colors.status.red }]}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnWarn]}
                        onPress={() => handleStop(tx)}
                        activeOpacity={0.7}
                      >
                        <Pause color={theme.colors.status.amber} size={15} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.status.amber }]}>
                          Stop Payment
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassBox>
              </Pressable>
            );
          })
        )}

        {/* History Note */}
        {allRecurring.length > 0 && (
          <View style={styles.historyNote}>
            <Text style={styles.historyNoteText}>
              All recurring entries are tracked historically. Stopping a payment preserves your data for analytics and budgeting.
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(27,42,74,0.06)',
    marginVertical: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  tabActive: {
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: theme.colors.primaryText,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  cardWrap: {
    marginBottom: 12,
  },
  recurringCard: {
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freqBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(62,146,204,0.2)',
  },
  freqBadgeStopped: {
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderColor: theme.colors.divider,
  },
  freqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  cardCategory: {
    fontSize: 12,
    color: theme.colors.secondaryText,
  },
  cardAmountBlock: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  cardType: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardDetailText: {
    fontSize: 12,
    color: '#888',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  actionBtnWarn: {
    backgroundColor: 'rgba(255,149,0,0.08)',
    borderColor: 'rgba(255,149,0,0.25)',
  },
  actionBtnDestructive: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderColor: 'rgba(255,59,48,0.25)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyNote: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  historyNoteText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
