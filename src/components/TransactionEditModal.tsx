import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { X, Check, Calendar } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { GlassBox } from './GlassBox';
import { GlassCalendarPicker } from './GlassCalendarPicker';
import { theme } from '../utils/theme';
import { Transaction } from '../types';
import { useFinancial } from '../context/FinancialContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

type Props = {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
};

export const TransactionEditModal = ({ visible, transaction, onClose }: Props) => {
  const { updateTransaction } = useFinancial();
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAck, setPayAck] = useState(false);
  const [payProofUri, setPayProofUri] = useState<string | null>(null);
  const [proofViewerUri, setProofViewerUri] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [duePickerOpen, setDuePickerOpen] = useState(false);

  useEffect(() => {
    if (!transaction || !visible) return;
    setAmount(String(transaction.amount));
    setMerchant(transaction.merchant_name || '');
    setNote(transaction.note || '');
    setPayModalOpen(false);
    setPayAck(false);
    setPayProofUri(null);
    setProofViewerUri(null);
    setDueDate(transaction.due_date ? new Date(transaction.due_date) : null);
    setDuePickerOpen(false);
  }, [transaction, visible]);

  const handleSave = async () => {
    if (!transaction) return;
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateTransaction(transaction.id, {
      amount: parsed,
      merchant_name: merchant.trim() ? merchant.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      ...(transaction.type === 'expense' ? { due_date: dueDate ? dueDate.toISOString() : null } : {}),
    });
    setSaving(false);
    onClose();
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
    if (!transaction) return;
    if (transaction.type !== 'expense') return;
    if ((transaction.payment_status || 'paid') !== 'unpaid') return;
    if (!payAck) return;
    setSaving(true);
    await updateTransaction(transaction.id, {
      payment_status: 'paid',
      ...(payProofUri ? { receipt_image_url: payProofUri } : {}),
    });
    setSaving(false);
    setPayModalOpen(false);
    setPayAck(false);
    setPayProofUri(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  if (!transaction) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={onClose}>
            <BlurView intensity={50} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          </Pressable>
          <ScrollView
            style={styles.scrollWrap}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GlassBox noPadding style={styles.card}>
              <View style={styles.header}>
                <View style={styles.titleWrap}>
                  <View style={styles.titleDot} />
                  <Text style={styles.title}>Edit transaction</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <X color={theme.colors.secondaryText} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.secondaryText}
                    selectionColor={theme.colors.accent}
                  />
                </View>

                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Business or Person"
                  placeholderTextColor={theme.colors.secondaryText}
                  maxLength={40}
                  selectionColor={theme.colors.accent}
                />

                <Text style={styles.fieldLabel}>Note</Text>
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add more details..."
                  placeholderTextColor={theme.colors.secondaryText}
                  multiline
                  maxLength={120}
                  selectionColor={theme.colors.accent}
                />

                {transaction.type === 'expense' && (
                  <>
                  <Text style={styles.fieldLabel}>Due date</Text>
                  <View style={styles.dueRow}>
                    <TouchableOpacity
                      style={styles.dueBtn}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDuePickerOpen(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Calendar color={theme.colors.secondaryText} size={16} />
                      <Text style={styles.dueBtnText}>
                        {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Set a due date'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dueClearBtn, !dueDate && { opacity: 0.35 }]}
                      onPress={() => {
                        if (!dueDate) return;
                        Haptics.selectionAsync();
                        setDueDate(null);
                      }}
                      activeOpacity={0.85}
                      disabled={!dueDate}
                    >
                      <Text style={styles.dueClearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>

                    <Text style={styles.fieldLabel}>Payment</Text>
                    <View style={styles.paymentRow}>
                      <View
                        style={[
                          styles.paymentBadge,
                          (transaction.payment_status || 'paid') === 'unpaid' ? styles.paymentBadgeUnpaid : styles.paymentBadgePaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBadgeText,
                            (transaction.payment_status || 'paid') === 'unpaid' ? styles.paymentBadgeTextUnpaid : styles.paymentBadgeTextPaid,
                          ]}
                        >
                          {(transaction.payment_status || 'paid').toUpperCase()}
                        </Text>
                      </View>

                      {(transaction.payment_status || 'paid') === 'unpaid' ? (
                        <TouchableOpacity
                          style={styles.payNowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setPayAck(false);
                            setPayProofUri(null);
                            setPayModalOpen(true);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.payNowBtnText}>Mark as paid</Text>
                        </TouchableOpacity>
                      ) : transaction.receipt_image_url ? (
                        <TouchableOpacity
                          style={styles.viewProofBtn}
                          onPress={() => setProofViewerUri(transaction.receipt_image_url || null)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.viewProofText}>View proof</Text>
                        </TouchableOpacity>
                      ) : (
                        <View />
                      )}
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                <View style={styles.saveBtnInner}>
                  {saving ? (
                    <Text style={styles.saveBtnText}>Saving changes...</Text>
                  ) : (
                    <>
                      <Check color="#FFF" size={18} strokeWidth={3} />
                      <Text style={styles.saveBtnText}>Confirm updates</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </GlassBox>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={payModalOpen} transparent animationType="fade" onRequestClose={() => setPayModalOpen(false)}>
        <KeyboardAvoidingView style={styles.payOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.payBackdrop} onPress={() => setPayModalOpen(false)} />
          <GlassBox style={styles.payCard} intensity={90}>
            <View style={styles.payHeader}>
              <Text style={styles.payTitle}>Mark as paid</Text>
              <TouchableOpacity onPress={() => setPayModalOpen(false)} hitSlop={12} style={styles.closeBtn}>
                <X color={theme.colors.secondaryText} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.payName} numberOfLines={1}>
              {(transaction.merchant_name && transaction.merchant_name.trim()) || transaction.category}
            </Text>

            <TouchableOpacity style={styles.payUploadBtn} onPress={pickProof} activeOpacity={0.85}>
              <Text style={styles.payUploadTitle}>{payProofUri ? 'Change proof' : 'Upload proof'}</Text>
              <Text style={styles.payUploadSub}>Receipt, screenshot, or confirmation</Text>
            </TouchableOpacity>

            {payProofUri && (
              <Pressable style={styles.payProofRow} onPress={() => setProofViewerUri(payProofUri)}>
                <Image source={{ uri: payProofUri }} style={styles.payProofThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.payProofTitle}>Preview</Text>
                  <Text style={styles.payProofSub}>Tap to view full size</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPayProofUri(null);
                  }}
                  activeOpacity={0.85}
                  style={styles.payRemoveBtn}
                >
                  <X color={theme.colors.secondaryText} size={18} />
                </TouchableOpacity>
              </Pressable>
            )}

            <TouchableOpacity
              style={styles.payAckRow}
              onPress={() => {
                Haptics.selectionAsync();
                setPayAck(v => !v);
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.payAckDot, payAck && styles.payAckDotOn]} />
              <Text style={styles.payAckText}>I acknowledge this payment is complete and accurate.</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={confirmPaid} activeOpacity={0.9} disabled={!payAck || saving} style={{ opacity: payAck ? 1 : 0.5 }}>
              <LinearGradient colors={[theme.colors.status.green, '#16A34A']} style={styles.payConfirmBtn}>
                <Text style={styles.payConfirmText}>{saving ? 'Saving...' : 'Confirm paid'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!proofViewerUri} transparent animationType="fade" onRequestClose={() => setProofViewerUri(null)}>
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

      <GlassCalendarPicker
        visible={duePickerOpen}
        onClose={() => setDuePickerOpen(false)}
        selectedDate={dueDate || new Date()}
        onSelectDate={(d) => setDueDate(d)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollWrap: {
    zIndex: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  card: {
    backgroundColor: theme.colors.backgroundStart,
    borderColor: theme.colors.divider,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primaryText,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(27,42,74,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 20,
    color: theme.colors.secondaryText,
    marginRight: 4,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  input: {
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: theme.colors.primaryText,
    marginBottom: 20,
  },
  noteInput: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  dueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dueBtnText: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 12,
  },
  dueClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dueClearText: {
    color: theme.colors.secondaryText,
    fontWeight: '900',
    fontSize: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  paymentBadgePaid: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderColor: 'rgba(52,199,89,0.18)',
  },
  paymentBadgeUnpaid: {
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderColor: 'rgba(255,59,48,0.16)',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  paymentBadgeTextPaid: {
    color: theme.colors.status.green,
  },
  paymentBadgeTextUnpaid: {
    color: theme.colors.status.red,
  },
  payNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payNowBtnText: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 12,
  },
  viewProofBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  viewProofText: {
    color: theme.colors.secondaryText,
    fontWeight: '900',
    fontSize: 12,
  },
  payOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  payBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayBg,
  },
  payCard: {
    backgroundColor: theme.colors.backgroundStart,
    borderColor: theme.colors.divider,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 24,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  payTitle: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 16,
  },
  payName: {
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 10,
  },
  payUploadBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payUploadTitle: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 13,
  },
  payUploadSub: {
    marginTop: 4,
    color: theme.colors.secondaryText,
    fontWeight: '700',
    fontSize: 11,
  },
  payProofRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payProofThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  payProofTitle: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 12,
  },
  payProofSub: {
    marginTop: 2,
    color: theme.colors.secondaryText,
    fontWeight: '700',
    fontSize: 11,
  },
  payRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payAckRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payAckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(27,42,74,0.25)',
  },
  payAckDotOn: {
    borderColor: theme.colors.status.green,
    backgroundColor: 'rgba(52,199,89,0.20)',
  },
  payAckText: {
    flex: 1,
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
  },
  payConfirmBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payConfirmText: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 14,
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
  recurringCard: {
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 16,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recLabelBlock: {
    flex: 1,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  recSubtitle: {
    fontSize: 12,
    color: theme.colors.secondaryText,
  },
  freqRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  freqChipOn: {
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondaryText,
  },
  freqTextOn: {
    color: theme.colors.accent,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.accent,
    height: 56,
    borderRadius: 18,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.2,
  },
});
