import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Pressable,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { GlassCalendarPicker } from '../components/GlassCalendarPicker';
import { showStyledAlert } from '../components/StyledAlert';
import { useFinancial } from '../context/FinancialContext';
import { Bill, EXPENSE_CATEGORIES } from '../types';
import { theme, formatCurrencyFull, getCategoryColor } from '../utils/theme';
import {
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Repeat,
  AlertTriangle,
  X,
  Lock,
  Image as ImageIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Draft = {
  id?: string;
  name: string;
  amount: string;
  category: string;
  scheduleType: 'monthly' | 'once';
  scheduleDate: Date;
};

const defaultDraft = (): Draft => ({
  name: '',
  amount: '',
  category: 'Utilities',
  scheduleType: 'monthly',
  scheduleDate: new Date(),
});

export const BillsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { upcomingBills, addBill, updateBill, deleteBill, markBillPaid, user } = useFinancial();
  const currency = user.currency || 'USD';

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(defaultDraft());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [paying, setPaying] = useState<{ bill: Bill; due: Date } | null>(null);
  const [payAck, setPayAck] = useState(false);
  const [payProofUri, setPayProofUri] = useState<string | null>(null);
  const [paySaving, setPaySaving] = useState(false);
  const [proofViewerUri, setProofViewerUri] = useState<string | null>(null);

  const rows = useMemo(() => upcomingBills, [upcomingBills]);
  const openedFromParam = useRef(false);

  const openCreate = () => {
    Haptics.selectionAsync();
    setDraft(defaultDraft());
    setIsEditing(true);
  };

  useEffect(() => {
    const shouldOpen = !!route?.params?.openCreate;
    if (!shouldOpen || openedFromParam.current) return;
    openedFromParam.current = true;
    openCreate();
    navigation.setParams({ openCreate: undefined });
  }, [navigation, route?.params?.openCreate]);

  const openEdit = (bill: Bill) => {
    Haptics.selectionAsync();
    const scheduleDate =
      bill.schedule.type === 'once'
        ? new Date(bill.schedule.date)
        : new Date(new Date().getFullYear(), new Date().getMonth(), bill.schedule.day);
    setDraft({
      id: bill.id,
      name: bill.name,
      amount: String(bill.amount),
      category: bill.category,
      scheduleType: bill.schedule.type,
      scheduleDate,
    });
    setIsEditing(true);
  };

  const saveDraft = async () => {
    const name = draft.name.trim();
    const amount = Number(draft.amount.replace(',', '.'));
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const schedule =
      draft.scheduleType === 'once'
        ? { type: 'once' as const, date: draft.scheduleDate.toISOString() }
        : { type: 'monthly' as const, day: draft.scheduleDate.getDate() };

    if (draft.id) {
      await updateBill(draft.id, { name, amount, category: draft.category, schedule });
    } else {
      await addBill({ name, amount, category: draft.category, schedule });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
  };

  const confirmDelete = (bill: Bill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    showStyledAlert(
      'Delete bill?',
      `"${bill.name}" will be removed from your bill list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBill(bill.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      'destructive',
    );
  };

  const openPayFlow = (bill: Bill, due: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayAck(false);
    setPayProofUri(null);
    setPaySaving(false);
    setPaying({ bill, due });
  };

  const pickProof = async () => {
    Haptics.selectionAsync();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setPayProofUri(asset.uri);
  };

  const confirmPaid = async () => {
    if (!paying || paySaving) return;
    if (!payAck) return;
    setPaySaving(true);
    await markBillPaid(paying.bill.id, paying.due, payProofUri || undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPaying(null);
    setPayAck(false);
    setPayProofUri(null);
    setPaySaving(false);
  };

  return (
    <AnimatedBackground>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.primaryText} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bills</Text>
          <Text style={styles.headerSubtitle}>Track due dates and mark payments manually</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <LinearGradient colors={[theme.colors.accent, '#1B2A4A']} style={styles.addBtnGradient}>
            <Plus color="#FFF" size={18} strokeWidth={3} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <GlassBox style={styles.emptyCard}>
            <Calendar color={theme.colors.secondaryText} size={34} />
            <Text style={styles.emptyTitle}>No bills yet</Text>
            <Text style={styles.emptySub}>Add your rent, utilities, subscriptions, or any due-date expense.</Text>
            <TouchableOpacity onPress={openCreate} activeOpacity={0.85} style={{ marginTop: 12 }}>
              <LinearGradient colors={[theme.colors.accent, '#1B2A4A']} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>Add your first bill</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        ) : (
          rows.map(({ bill, nextDue, isPaid, isOverdue }) => {
            const catColor = getCategoryColor(bill.category);
            const ym = format(nextDue, 'yyyy-MM');
            const payment = bill.payments?.[ym];
            const proofUri = payment?.proof_uri;
            return (
              <Pressable
                key={bill.id}
                style={({ pressed }) => [styles.rowWrap, pressed && { opacity: 0.9 }]}
                onPress={() => openEdit(bill)}
              >
                <GlassBox style={styles.billCard}>
                  <View style={styles.billTopRow}>
                    <View style={[styles.billDateBox, isOverdue && { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
                      <Text style={[styles.billDay, isOverdue && { color: theme.colors.status.red }]}>{format(nextDue, 'd')}</Text>
                      <Text style={[styles.billMonth, isOverdue && { color: theme.colors.status.red }]}>{format(nextDue, 'MMM').toUpperCase()}</Text>
                    </View>

                    <View style={styles.billInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.catDot, { backgroundColor: `${catColor}18`, borderColor: `${catColor}55` }]} />
                        <Text style={styles.billName} numberOfLines={1}>
                          {bill.name}
                        </Text>
                        {isOverdue && <AlertTriangle color={theme.colors.status.red} size={14} />}
                      </View>
                      <Text style={styles.billMeta} numberOfLines={1}>
                        {bill.category} · {bill.schedule.type === 'monthly' ? <Repeat size={12} color={theme.colors.secondaryText} /> : null}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={[styles.billAmount, isOverdue && { color: theme.colors.status.red }]}>
                        {formatCurrencyFull(bill.amount, currency)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.paidBtn, isPaid && styles.paidBtnOn]}
                        onPress={() => {
                          if (isPaid) return;
                          openPayFlow(bill, nextDue);
                        }}
                        activeOpacity={0.8}
                        disabled={isPaid}
                      >
                        {isPaid ? (
                          <CheckCircle2 color={theme.colors.status.green} size={16} />
                        ) : (
                          <Circle color={theme.colors.secondaryText} size={16} />
                        )}
                        <Text style={[styles.paidBtnText, isPaid && { color: theme.colors.status.green }]}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </Text>
                        {isPaid && <Lock color={theme.colors.status.green} size={14} />}
                      </TouchableOpacity>
                      {isPaid && proofUri && (
                        <TouchableOpacity
                          style={styles.proofBtn}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setProofViewerUri(proofUri);
                          }}
                          activeOpacity={0.8}
                        >
                          <ImageIcon color={theme.colors.secondaryText} size={14} />
                          <Text style={styles.proofBtnText}>Proof</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openEdit(bill)}
                      activeOpacity={0.8}
                    >
                      <Edit3 color={theme.colors.secondaryText} size={15} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => confirmDelete(bill)}
                      activeOpacity={0.8}
                    >
                      <Trash2 color={theme.colors.status.red} size={15} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.status.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </GlassBox>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{draft.id ? 'Edit Bill' : 'New Bill'}</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={v => setDraft(s => ({ ...s, name: v }))}
              placeholder="e.g. Rent, Electricity, Netflix"
              placeholderTextColor={theme.colors.secondaryText}
              selectionColor={theme.colors.accent}
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>{formatCurrencyFull(0, currency).replace(/\d/g, '').trim() || '$'}</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={draft.amount}
                onChangeText={v => setDraft(s => ({ ...s, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={theme.colors.secondaryText}
                keyboardType="decimal-pad"
                selectionColor={theme.colors.accent}
              />
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={{ color: theme.colors.primaryText, fontWeight: '600' }}>{draft.category}</Text>
              <Text style={{ color: theme.colors.secondaryText }}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Schedule</Text>
            <View style={styles.segmentRow}>
              {(['monthly', 'once'] as const).map(t => {
                const on = draft.scheduleType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDraft(s => ({ ...s, scheduleType: t }));
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                      {t === 'monthly' ? 'Monthly' : 'One-time'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar color={theme.colors.secondaryText} size={18} />
                <Text style={{ color: theme.colors.primaryText, fontWeight: '600' }}>
                  {draft.scheduleType === 'monthly'
                    ? `Due day: ${draft.scheduleDate.getDate()}`
                    : `Due: ${format(draft.scheduleDate, 'MMM d, yyyy')}`}
                </Text>
              </View>
              <Text style={{ color: theme.colors.secondaryText }}>Set</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 14 }} onPress={saveDraft} activeOpacity={0.85}>
              <LinearGradient colors={[theme.colors.accent, '#1B2A4A']} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>{draft.id ? 'Save changes' : 'Create bill'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <GlassBox style={[styles.modalCard, { maxHeight: '70%' }]} intensity={80}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose category</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <X color={theme.colors.secondaryText} size={22} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {EXPENSE_CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.categoryRow}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDraft(s => ({ ...s, category: c.label }));
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.catDot, { backgroundColor: `${c.color}18`, borderColor: `${c.color}66` }]} />
                    <Text style={{ color: theme.colors.primaryText, fontWeight: '600' }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassBox>
          </Pressable>
        </Pressable>
      </Modal>

      <GlassCalendarPicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={draft.scheduleDate}
        onSelectDate={date => setDraft(s => ({ ...s, scheduleDate: date }))}
      />

      <Modal
        visible={!!paying}
        transparent
        animationType="fade"
        onRequestClose={() => setPaying(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <GlassBox style={styles.modalCard} intensity={80}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as paid</Text>
              <TouchableOpacity onPress={() => setPaying(null)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.payBillName} numberOfLines={1}>
              {paying?.bill.name}
            </Text>
            <Text style={styles.payBillMeta}>
              Due {paying ? format(paying.due, 'MMM d, yyyy') : ''} · {paying?.bill.category}
            </Text>

            <View style={styles.paySummary}>
              <Text style={styles.payAmountLabel}>Amount</Text>
              <Text style={styles.payAmountVal}>
                {paying ? formatCurrencyFull(paying.bill.amount, currency) : ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickProof}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ImageIcon color={theme.colors.secondaryText} size={18} />
                <View>
                  <Text style={styles.uploadTitle}>Upload proof</Text>
                  <Text style={styles.uploadSub}>{payProofUri ? 'Proof selected' : 'Receipt, screenshot, or confirmation'}</Text>
                </View>
              </View>
              <Text style={styles.uploadAction}>{payProofUri ? 'Change' : 'Choose'}</Text>
            </TouchableOpacity>

            {payProofUri && (
              <Pressable
                style={styles.proofPreviewRow}
                onPress={() => setProofViewerUri(payProofUri)}
              >
                <Image source={{ uri: payProofUri }} style={styles.proofThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.proofPreviewTitle}>Preview</Text>
                  <Text style={styles.proofPreviewSub}>Tap to view full size</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPayProofUri(null);
                  }}
                  activeOpacity={0.8}
                  style={styles.removeProofBtn}
                >
                  <X color={theme.colors.secondaryText} size={18} />
                </TouchableOpacity>
              </Pressable>
            )}

            <TouchableOpacity
              style={styles.ackRow}
              onPress={() => {
                Haptics.selectionAsync();
                setPayAck(v => !v);
              }}
              activeOpacity={0.85}
            >
              {payAck ? (
                <CheckCircle2 color={theme.colors.status.green} size={18} />
              ) : (
                <Circle color={theme.colors.secondaryText} size={18} />
              )}
              <Text style={styles.ackText}>I acknowledge this payment is complete and accurate.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 14, opacity: payAck ? 1 : 0.5 }}
              onPress={confirmPaid}
              activeOpacity={0.85}
              disabled={!payAck || paySaving}
            >
              <LinearGradient colors={[theme.colors.status.green, '#16A34A']} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>{paySaving ? 'Saving...' : 'Confirm paid'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!proofViewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setProofViewerUri(null)}
      >
        <Pressable style={styles.viewerOverlay} onPress={() => setProofViewerUri(null)}>
          <Pressable onPress={() => {}} style={styles.viewerCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>Payment proof</Text>
              <TouchableOpacity onPress={() => setProofViewerUri(null)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            {proofViewerUri && <Image source={{ uri: proofViewerUri }} style={styles.viewerImage} resizeMode="contain" />}
          </Pressable>
        </Pressable>
      </Modal>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.primaryText,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: theme.colors.secondaryText,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 130,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    marginTop: 4,
    color: theme.colors.secondaryText,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryCta: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  rowWrap: {
    marginBottom: 10,
  },
  billCard: {},
  billTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  billDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billDay: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  billMonth: {
    color: theme.colors.secondaryText,
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  billInfo: {
    flex: 1,
    minWidth: 0,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  billName: {
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
  },
  billMeta: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  billAmount: {
    color: theme.colors.primaryText,
    fontSize: 13,
    fontWeight: '800',
  },
  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  paidBtnOn: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderColor: 'rgba(52,199,89,0.18)',
  },
  paidBtnText: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  billActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderColor: 'rgba(255,59,48,0.12)',
  },
  actionBtnText: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  fieldLabel: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  amountPrefix: {
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 14,
    minWidth: 18,
    textAlign: 'center',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
  },
  segmentBtnOn: {
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  segmentText: {
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 12,
  },
  segmentTextOn: {
    color: theme.colors.primaryText,
  },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  proofBtnText: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  payBillName: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '900',
  },
  payBillMeta: {
    marginTop: 6,
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  paySummary: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payAmountLabel: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  payAmountVal: {
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '900',
  },
  uploadBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadTitle: {
    color: theme.colors.primaryText,
    fontSize: 13,
    fontWeight: '900',
  },
  uploadSub: {
    marginTop: 2,
    color: theme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
  },
  uploadAction: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '900',
  },
  proofPreviewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  proofThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  proofPreviewTitle: {
    color: theme.colors.primaryText,
    fontSize: 12,
    fontWeight: '900',
  },
  proofPreviewSub: {
    marginTop: 2,
    color: theme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
  },
  removeProofBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  ackRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  ackText: {
    flex: 1,
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  viewerCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundStart,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden',
  },
  viewerHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  viewerTitle: {
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '900',
  },
  viewerImage: {
    width: '100%',
    height: 420,
    backgroundColor: theme.colors.backgroundStart,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
});
