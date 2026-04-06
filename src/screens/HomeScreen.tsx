import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassBox } from '../components/GlassBox';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { useGamification } from '../context/GamificationContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles, Settings, ChevronRight, Bell, MessageSquare, X, Trash2, Calendar, Heart, Flame, Star } from 'lucide-react-native';
import { format } from 'date-fns';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Transaction } from '../types';
import { showTransactionActionMenu } from '../utils/transactionActions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    transactions,
    balance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    user,
    deleteTransaction,
    taxForTransaction,
    upcomingBills,
  } = useFinancial();
  const navigation = useNavigation<any>();
  const { profile, levelInfo, xpProgress } = useGamification();
  const recentTx = transactions.slice(0, 6);
  const [showMessages, setShowMessages] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [showAIInsight, setShowAIInsight] = useState(true);
  const [showFinHealth, setShowFinHealth] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const [ai, fh] = await Promise.all([
          AsyncStorage.getItem('@monara:dash:ai_insight'),
          AsyncStorage.getItem('@monara:dash:fin_health'),
        ]);
        if (ai !== null) setShowAIInsight(ai === 'true');
        if (fh !== null) setShowFinHealth(fh === 'true');
      })();
    }, []),
  );

  const openAddTransaction = (type: 'expense' | 'income') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AddTransaction', { type });
  };

  const showTxDetail = (tx: typeof transactions[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTx(tx);
    setShowTxModal(true);
  };

  const handleDeleteTx = () => {
    if (selectedTx) {
      deleteTransaction(selectedTx.id);
      setShowTxModal(false);
      setSelectedTx(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openTxLongPressMenu = (tx: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const title = tx.merchant_name?.trim() || tx.category;
    showTransactionActionMenu(
      tx,
      title,
      () => setEditTx(tx),
      () => {
        deleteTransaction(tx.id);
        if (selectedTx?.id === tx.id) {
          setShowTxModal(false);
          setSelectedTx(null);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    );
  };

  const currency = user.currency || 'USD';

  // Staggered entrance animations
  const anims = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(24),
    })),
  ).current;

  useEffect(() => {
    const stagger = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 450, delay: i * 80, useNativeDriver: true }),
        Animated.spring(a.translateY, { toValue: 0, tension: 80, friction: 12, delay: i * 80, useNativeDriver: true }),
      ]),
    );
    Animated.stagger(60, stagger).start();
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

  const toggleMessages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMessages(!showMessages);
  };

  return (
    <AnimatedBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: 120 + Math.max(insets.bottom, 8),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: anims[5].opacity, transform: [{ translateY: anims[5].translateY }] }]}>
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
            <TouchableOpacity onPress={() => navigation.navigate('SmartNotifications' as never)} activeOpacity={0.7}>
              <View style={styles.iconBtn}>
                <Bell color={theme.colors.primaryText} size={20} />
                {(user.total_points > 0) && <View style={styles.badge} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
              <View style={styles.iconBtn}>
                <Settings color={theme.colors.primaryText} size={20} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Gamification Quick Stats */}
        <Animated.View style={[{ opacity: anims[4]?.opacity || 1, transform: [{ translateY: anims[4]?.translateY || 0 }] }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Rewards' as never)}>
            <GlassBox style={styles.gamifBar} noPadding>
              <View style={styles.gamifInner}>
                <View style={styles.gamifLeft}>
                  <View style={[styles.gamifLevelBadge, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                    <Star color="#FBBF24" size={14} fill="#FBBF24" />
                  </View>
                  <View>
                    <Text style={styles.gamifLevelText}>Lv. {profile.level}</Text>
                    <Text style={styles.gamifTierText}>{levelInfo.tier}</Text>
                  </View>
                </View>
                <View style={styles.gamifCenter}>
                  <View style={styles.gamifXpBarBg}>
                    <View style={[styles.gamifXpBarFill, { width: `${Math.max(Math.round(xpProgress.percent * 100), 3)}%` as any }]} />
                  </View>
                  <Text style={styles.gamifXpText}>{profile.totalXP} MP</Text>
                </View>
                <View style={styles.gamifRight}>
                  <Flame color="#F97316" size={16} />
                  <Text style={styles.gamifStreakText}>{profile.currentStreak}</Text>
                </View>
              </View>
            </GlassBox>
          </TouchableOpacity>
          <Text style={styles.motivationText}>{levelInfo.motivationMessage}</Text>
        </Animated.View>

        {/* Message Center Overlay */}
        <Modal
          visible={showMessages}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMessages(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowMessages(false)}
            >
              <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlayBg }]} />
            </TouchableOpacity>

            <Animated.View style={styles.messageModalContent}>
              <GlassBox style={styles.messageCenterCard}>
                <View style={styles.messageHeader}>
                  <MessageSquare color={theme.colors.accent} size={20} />
                  <Text style={styles.messageTitle}>Message Center</Text>
                  <TouchableOpacity onPress={() => setShowMessages(false)}>
                    <X color={theme.colors.secondaryText} size={20} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.messageItem}>
                    <View style={styles.messageDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.messageText}>Your weekly summary is ready.</Text>
                      <Text style={styles.messageTime}>2 hours ago</Text>
                    </View>
                  </View>
                  <View style={styles.messageItem}>
                    <View style={[styles.messageDot, { backgroundColor: 'transparent', borderColor: theme.colors.divider }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.messageText, { color: theme.colors.secondaryText }]}>Unusual spending detected in Dining.</Text>
                      <Text style={styles.messageTime}>Yesterday</Text>
                    </View>
                  </View>
                </ScrollView>
              </GlassBox>
            </Animated.View>
          </View>
        </Modal>

        {/* Transaction Detail Modal */}
        <Modal
          visible={showTxModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTxModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowTxModal(false)}
            >
              <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlayBg }]} />
            </TouchableOpacity>

            <View style={styles.txModalContent}>
              {selectedTx && (
                <GlassBox style={styles.txDetailCard}>
                  <View style={styles.txDetailHeader}>
                    <View style={[styles.txDot, { backgroundColor: `${getCategoryColor(selectedTx.category)}20` }]}>
                      {selectedTx.type === 'income' ? <TrendingUp color={theme.colors.status.green} size={20} /> : <TrendingDown color={theme.colors.status.red} size={20} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.txDetailCat}>
                        {selectedTx.merchant_name?.trim() || selectedTx.category}
                      </Text>
                      {selectedTx.merchant_name?.trim() ? (
                        <Text style={styles.txDetailMeta}>{selectedTx.category}</Text>
                      ) : null}
                      <Text style={styles.txDetailDate}>{format(new Date(selectedTx.date), 'MMMM d, yyyy · h:mm a')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowTxModal(false)}>
                      <X color={theme.colors.secondaryText} size={24} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.txDetailAmountRow}>
                    <Text style={[styles.txDetailAmount, { color: selectedTx.type === 'income' ? theme.colors.status.green : '#FFF' }]}>
                      {selectedTx.type === 'income' ? '+' : '-'}{formatCurrencyFull(selectedTx.amount, currency)}
                    </Text>
                  </View>

                  {selectedTx.type === 'expense' && user.tax_enabled && taxForTransaction(selectedTx) > 0 && (
                    <Text style={styles.txDetailTax}>
                      Est. tax: {formatCurrencyFull(taxForTransaction(selectedTx), currency)}
                    </Text>
                  )}

                  {selectedTx.note && (
                    <View style={styles.txDetailNote}>
                      <Text style={styles.txDetailNoteText}>"{selectedTx.note}"</Text>
                    </View>
                  )}

                  <View style={styles.txActions}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTx}>
                      <Trash2 color={theme.colors.status.red} size={20} />
                      <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                    </TouchableOpacity>
                  </View>
                </GlassBox>
              )}
            </View>
          </View>
        </Modal>

        {/* Balance Card */}
        <Animated.View style={{ opacity: anims[1].opacity, transform: [{ translateY: anims[1].translateY }] }}>
          <GlassBox style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: (balance || 0) >= 0 ? theme.colors.primaryText : theme.colors.status.red },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {(balance || 0) < 0 ? '-' : ''}{formatCurrencyFull(balance || 0, currency)}
            </Text>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem} onPress={() => openAddTransaction('income')} activeOpacity={0.7}>
                <View style={[styles.statIcon, styles.statIconIncome]}>
                  <ArrowUpRight color={theme.colors.status.green} size={16} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statLabel}>Income</Text>
                  <Text
                    style={styles.statValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {formatCurrencyFull(monthlyIncome, currency)}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} onPress={() => openAddTransaction('expense')} activeOpacity={0.7}>
                <View style={[styles.statIcon, styles.statIconExpense]}>
                  <ArrowDownRight color={theme.colors.status.red} size={16} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text
                    style={styles.statValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {formatCurrencyFull(monthlyExpenses, currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </GlassBox>
        </Animated.View>

        {/* AI Insight */}
        {showAIInsight && (
          <Animated.View style={{ opacity: anims[2].opacity, transform: [{ translateY: anims[2].translateY }] }}>
            <TouchableOpacity onPress={() => navigation.navigate('AIAssistant')} activeOpacity={0.8}>
              <GlassBox style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Sparkles color={theme.colors.accent} size={18} />
                  <Text style={styles.insightTitle}>AI Insight</Text>
                  <View style={{ flex: 1 }} />
                  <ChevronRight color={theme.colors.secondaryText} size={16} />
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </GlassBox>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Financial Health Score */}
        {showFinHealth && (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); navigation.navigate('FinancialHealth'); }}
            activeOpacity={0.8}
          >
            <GlassBox style={styles.recurringQuickCard}>
              <View style={styles.recurringQuickLeft}>
                <View style={[styles.recurringQuickIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Heart color="#10B981" size={18} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.recurringQuickTitle}>Financial Health</Text>
                  <Text style={styles.recurringQuickSub}>
                    View your wellness score & achievements
                  </Text>
                </View>
              </View>
              <ChevronRight color={theme.colors.secondaryText} size={18} />
            </GlassBox>
          </TouchableOpacity>
        )}

        {/* Bills Quick Card */}
        {upcomingBills.length > 0 && (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); navigation.navigate('Bills' as never); }}
            activeOpacity={0.8}
          >
            <GlassBox style={styles.recurringQuickCard}>
              <View style={styles.recurringQuickLeft}>
                <View style={styles.recurringQuickIcon}>
                  <Calendar color={theme.colors.accent} size={18} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.recurringQuickTitle}>Bills & Due Dates</Text>
                  <Text style={styles.recurringQuickSub}>
                    {upcomingBills.filter(b => b.isOverdue).length} overdue · Next due {format(upcomingBills[0].nextDue, 'MMM d')}
                  </Text>
                </View>
              </View>
              <ChevronRight color={theme.colors.secondaryText} size={18} />
            </GlassBox>
          </TouchableOpacity>
        )}

        {/* Recent Activity */}
        <Animated.View style={{ opacity: anims[4].opacity, transform: [{ translateY: anims[4].translateY }] }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {transactions.length > 6 && (
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentTx.length === 0 ? (
            <Pressable
              onPress={() => openAddTransaction('expense')}
              onLongPress={() => openAddTransaction('expense')}
              style={({ pressed }) => [styles.emptyCardWrap, pressed && { opacity: 0.8 }]}
            >
              <GlassBox style={styles.emptyCard}>
                <Text style={styles.emptyText}>No transactions yet.{`\n`}Tap or hold to log your first one.</Text>
              </GlassBox>
            </Pressable>
          ) : (
            recentTx.map(tx => {
              const catColor = getCategoryColor(tx.category);
              return (
                <Pressable
                  key={tx.id}
                  onPress={() => showTxDetail(tx)}
                  onLongPress={() => openTxLongPressMenu(tx)}
                  delayLongPress={400}
                  style={({ pressed }) => [styles.txCardWrap, pressed && { opacity: 0.88 }]}
                >
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
                      <Text style={styles.txCategory} numberOfLines={1}>
                        {tx.merchant_name?.trim() || tx.category}
                      </Text>
                      <Text style={styles.txDate} numberOfLines={1}>
                        {tx.merchant_name?.trim() ? `${tx.category} · ` : ''}
                        {format(new Date(tx.date), 'MMM d, h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: tx.type === 'income' ? theme.colors.status.green : theme.colors.primaryText },
                        ]}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatCurrencyFull(tx.amount, currency)}
                      </Text>
                    </View>
                  </GlassBox>
                </Pressable>
              );
            })
          )}
        </Animated.View>
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
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
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
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0D1B2A',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.status.red,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageModalContent: {
    width: '100%',
    maxWidth: 400,
  },
  txModalContent: {
    width: '100%',
    maxWidth: 400,
  },
  txDetailCard: {
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
  },
  txDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  txDetailCat: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  txDetailMeta: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  txDetailTax: {
    fontSize: 13,
    color: theme.colors.accent,
    textAlign: 'center',
    marginBottom: 12,
  },
  txDetailDate: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  txDetailAmountRow: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  txDetailAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  txDetailNote: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  txDetailNoteText: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  txActions: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 20,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.status.red,
  },
  messageCenterCard: {
    padding: 20,
    maxHeight: 400,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accentGlow,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
    flex: 1,
    marginLeft: 8,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  messageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.status.red,
    marginTop: 6,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.primaryText,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginTop: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
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
    paddingVertical: 24,
  },
  balanceLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 24,
    flexShrink: 1,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    paddingVertical: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statIconIncome: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  statIconExpense: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  statTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
    flexShrink: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  gridCol: {
    flex: 1,
    minWidth: 0,
  },
  gridItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  gridTextCol: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    minWidth: 0,
  },
  gridIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 146, 13, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  gridIconAccent: {
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
  },
  gridLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  gridValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primaryText,
    textAlign: 'center',
    width: '100%',
    maxWidth: '100%',
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
    color: theme.colors.accent,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.secondaryText,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  txCardWrap: {
    marginBottom: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
    paddingVertical: 4,
  },
  txDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCategory: {
    fontSize: 14,
    color: theme.colors.primaryText,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: theme.colors.secondaryText,
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
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  viewAll: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  emptyCardWrap: {
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  recurringQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recurringQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  recurringQuickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringQuickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  recurringQuickSub: {
    fontSize: 12,
    color: theme.colors.secondaryText,
  },
  /* Gamification bar */
  gamifBar: { marginBottom: 14 },
  gamifInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 12 },
  gamifLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gamifLevelBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gamifLevelText: { fontSize: 13, fontWeight: '800', color: theme.colors.primaryText },
  gamifTierText: { fontSize: 9, fontWeight: '600', color: theme.colors.secondaryText },
  gamifCenter: { flex: 1, gap: 3 },
  gamifXpBarBg: { height: 6, borderRadius: 3, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.06)', overflow: 'hidden' },
  gamifXpBarFill: { height: 6, borderRadius: 3, backgroundColor: '#FBBF24' },
  gamifXpText: { fontSize: 10, fontWeight: '700', color: theme.colors.secondaryText },
  gamifRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gamifStreakText: { fontSize: 14, fontWeight: '800', color: '#F97316' },
  motivationText: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    color: theme.colors.secondaryText,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
});
