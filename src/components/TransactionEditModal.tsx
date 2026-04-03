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
  Switch,
  Pressable,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { GlassBox } from './GlassBox';
import { theme } from '../utils/theme';
import { Transaction } from '../types';
import { useFinancial } from '../context/FinancialContext';
import * as Haptics from 'expo-haptics';

const FREQ = ['daily', 'weekly', 'monthly', 'yearly'] as const;

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
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState<(typeof FREQ)[number]>('monthly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction || !visible) return;
    setAmount(String(transaction.amount));
    setMerchant(transaction.merchant_name || '');
    setNote(transaction.note || '');
    setRecurring(!!transaction.recurring);
    setFreq(transaction.recurring?.frequency || 'monthly');
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
      recurring: recurring ? { frequency: freq } : undefined,
    });
    setSaving(false);
    onClose();
  };

  if (!transaction) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
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
                <X color="#A0A0A0" size={20} />
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
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  selectionColor={theme.colors.accent}
                />
              </View>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Business or Person"
                placeholderTextColor="rgba(255,255,255,0.2)"
                maxLength={40}
                selectionColor={theme.colors.accent}
              />

              <Text style={styles.fieldLabel}>Note</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Add more details..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                maxLength={120}
                selectionColor={theme.colors.accent}
              />

              <View style={styles.recurringCard}>
                <View style={styles.recRow}>
                  <View style={styles.recLabelBlock}>
                    <Text style={styles.recTitle}>Recurring payment</Text>
                    <Text style={styles.recSubtitle}>Repeat this automatically</Text>
                  </View>
                  <Switch
                    value={recurring}
                    onValueChange={(v) => { Haptics.selectionAsync(); setRecurring(v); }}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(187,134,252,0.4)' }}
                    thumbColor={recurring ? theme.colors.accent : '#8E8E93'}
                  />
                </View>
                
                {recurring && (
                  <View style={styles.freqRow}>
                    {FREQ.map(f => {
                      const on = freq === f;
                      return (
                        <TouchableOpacity
                          key={f}
                          style={[styles.freqChip, on && styles.freqChipOn]}
                          onPress={() => { Haptics.selectionAsync(); setFreq(f); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.freqText, on && styles.freqTextOn]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <View style={styles.saveBtnInner}>
                {saving ? (
                  <Text style={styles.saveBtnText}>Saving changes...</Text>
                ) : (
                  <>
                    <Check color="#121212" size={18} strokeWidth={3} />
                    <Text style={styles.saveBtnText}>Confirm updates</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </GlassBox>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    backgroundColor: '#0F0F10',
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFF',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
    marginRight: 4,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#FFF',
    marginBottom: 20,
  },
  noteInput: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  recurringCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: '#FFF',
    marginBottom: 2,
  },
  recSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  freqChipOn: {
    backgroundColor: 'rgba(187,134,252,0.15)',
    borderColor: 'rgba(187,134,252,0.4)',
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
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
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#121212',
    letterSpacing: -0.2,
  },
});
