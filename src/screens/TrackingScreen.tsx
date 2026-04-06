import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Image,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { showStyledAlert } from '../components/StyledAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, getCurrencySymbol } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { ChevronDown, ArrowRight, X, Camera, Trash2, Delete } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const TrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { addTransaction, user } = useFinancial();

  const initialType = (route.params as any)?.type === 'income' ? 'income' : 'expense';
  const [txType, setTxType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('0');
  const [selectedCat, setSelectedCat] = useState(EXPENSE_CATEGORIES[0].label);
  const [confirming, setConfirming] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [note, setNote] = useState('');

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const amountScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const triggerAmountBounce = () => {
    Keyboard.dismiss();
    amountScaleAnim.setValue(1.1);
    Animated.spring(amountScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleKeyPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    triggerAmountBounce();
    
    if (key === 'del') {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    if (key === '.' && amount.includes('.')) return;
    
    // Max 2 decimal places
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;

    // Max 7 digits total
    if (amount.replace('.', '').length >= 7) return;

    setAmount(prev => {
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  };

  const pickPhoto = async () => {
    Haptics.selectionAsync();
    showStyledAlert('Add Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showStyledAlert('Permission needed', 'Camera access is required to take photos.', undefined, 'info');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showStyledAlert('Permission needed', 'Gallery access is required to pick photos.', undefined, 'info');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ], 'photo');
  };

  useEffect(() => {
    if ((route.params as any)?.type) {
      const t = (route.params as any).type;
      setTxType(t);
      setSelectedCat(t === 'expense' ? EXPENSE_CATEGORIES[0].label : INCOME_CATEGORIES[0].label);
    }
  }, [route.params]);

  const categories = txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const currencySymbol = getCurrencySymbol(user.currency || 'USD');

  const onToggleType = () => {
    Haptics.selectionAsync();
    const newType = txType === 'expense' ? 'income' : 'expense';
    setTxType(newType);
    setSelectedCat(newType === 'expense' ? EXPENSE_CATEGORIES[0].label : INCOME_CATEGORIES[0].label);
  };

  const handleConfirm = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirming(true);
    
    await addTransaction({
      type: txType,
      amount: parsed,
      category: selectedCat,
      date: new Date().toISOString(),
      is_manual_entry: true,
      ...(merchantName.trim() ? { merchant_name: merchantName.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(photoUri ? { receipt_image_url: photoUri } : {}),
    });

    setTimeout(() => {
      setConfirming(false);
      setAmount('0');
      setMerchantName('');
      setNote('');
      setPhotoUri(null);
      navigation.goBack();
    }, 500);
  };

  const isValid = parseFloat(amount) > 0;
  const mainColor = txType === 'expense' ? '#CF6679' : '#03DAC6';

  const renderKey = (key: string, label?: string) => (
    <TouchableOpacity
      style={styles.keypadBtn}
      onPress={() => handleKeyPress(key)}
      activeOpacity={0.6}
    >
      {key === 'del' ? (
        <Delete color={theme.colors.primaryText} size={20} />
      ) : (
        <Text style={styles.keypadText}>{label || key}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        <Animated.View
          style={[
            styles.container,
            { paddingTop: Math.max(insets.top, 12) + 8, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            {/* Top Row */}
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <X color={theme.colors.primaryText} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerPill} onPress={onToggleType} activeOpacity={0.7}>
                <View style={[styles.dot, { backgroundColor: mainColor }]} />
                <Text style={styles.headerText}>
                  {txType === 'expense' ? 'Expense' : 'Income'}
                </Text>
                <ChevronDown color={theme.colors.secondaryText} size={16} />
              </TouchableOpacity>
              <View style={{ width: 40 }} />
            </View>

            {/* Display Area */}
            <TouchableOpacity
              style={styles.displayArea}
              activeOpacity={1}
              onPress={triggerAmountBounce}
            >
              <Text style={[styles.currencyLabel, { color: mainColor }]}>{currencySymbol}</Text>
              <Animated.Text
                style={[
                  styles.amountText,
                  { color: isValid ? theme.colors.primaryText : theme.colors.secondaryText, transform: [{ scale: amountScaleAnim }] },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {amount}
              </Animated.Text>
            </TouchableOpacity>

            {/* Categories */}
            <View style={styles.categoriesWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catScroll}
                keyboardShouldPersistTaps="handled"
              >
                {categories.map(cat => {
                  const isSelected = selectedCat === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCat(cat.label);
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.catChip,
                          isSelected && {
                            backgroundColor: `${cat.color}30`,
                            borderColor: cat.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catText,
                            isSelected && { color: cat.color, fontWeight: '700' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

        {/* Optional name & note */}
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder={txType === 'expense' ? 'Name (e.g. Netflix, rent)' : 'Name (optional)'}
            placeholderTextColor={theme.colors.secondaryText}
            maxLength={40}
            returnKeyType="next"
          />
        </View>
        <View style={styles.extrasRow}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
                placeholderTextColor={theme.colors.secondaryText}
                maxLength={60}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.7}>
                {photoUri ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPhotoUri(null);
                      }}
                    >
                      <Trash2 color={theme.colors.primaryText} size={12} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Camera color={theme.colors.secondaryText} size={20} />
                )}
              </TouchableOpacity>
            </View>


          </ScrollView>

          {/* Fixed keypad + confirm — never overlaps scrollable form */}
          <View style={[styles.keypadFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.keypadArea}>
              <View style={styles.keypadRow}>
                {renderKey('1')}
                {renderKey('2')}
                {renderKey('3')}
              </View>
              <View style={styles.keypadRow}>
                {renderKey('4')}
                {renderKey('5')}
                {renderKey('6')}
              </View>
              <View style={styles.keypadRow}>
                {renderKey('7')}
                {renderKey('8')}
                {renderKey('9')}
              </View>
              <View style={styles.keypadRow}>
                {renderKey('.')}
                {renderKey('0')}
                {renderKey('del')}
              </View>
            </View>

            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: isValid ? mainColor : 'rgba(27,42,74,0.06)' },
                  confirming && { opacity: 0.7 },
                ]}
                disabled={!isValid || confirming}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnText, { color: isValid ? '#FFF' : theme.colors.secondaryText }]}>
                  {confirming ? 'Saving...' : 'Add Transaction'}
                </Text>
                {isValid && !confirming && <ArrowRight color="#FFF" size={20} />}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  keypadFooter: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27,42,74,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  displayArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  currencyLabel: {
    fontSize: 28,
    fontWeight: '400',
    marginRight: 8,
    alignSelf: 'center',
  },
  amountText: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    maxWidth: width - 100,
  },
  categoriesWrapper: {
    marginBottom: 12,
  },
  catScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  catText: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    fontWeight: '600',
  },
  nameRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  nameInput: {
    height: 44,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.colors.primaryText,
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  noteInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.primaryText,
  },
  photoBtn: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewWrap: {
    width: '100%',
    height: '100%',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CF6679',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  keypadArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  keypadBtn: {
    width: width * 0.19,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  keypadText: {
    fontSize: 22,
    color: theme.colors.primaryText,
    fontWeight: '500',
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    paddingTop: 6,
  },
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    lineHeight: 16,
  },
  dueBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueBtnText: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '800',
  },
  dueBtnAction: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  recurringCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  recurringTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recurringLabelBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  recurringIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringIconWrapOn: {
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  recurringTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  recurringTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 2,
  },
  recurringSubtitle: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    lineHeight: 16,
  },
  freqSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  freqSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondaryText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  freqCell: {
    width: '50%',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  freqCellInner: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqCellInnerActive: {
    backgroundColor: 'rgba(62,146,204,0.1)',
    borderColor: 'rgba(62,146,204,0.2)',
  },
  freqCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondaryText,
  },
  freqCellTextActive: {
    color: theme.colors.accent,
  },
});
