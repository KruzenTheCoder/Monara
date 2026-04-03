import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Animated,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { theme, getCurrencySymbol } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { ChevronDown, ArrowRight, X, Camera, ImageIcon, Paperclip, Trash2 } from 'lucide-react-native';

export const TrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { addTransaction, user } = useFinancial();

  const initialType = (route.params as any)?.type === 'income' ? 'income' : 'expense';
  const [txType, setTxType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState(EXPENSE_CATEGORIES[0].label);
  const [confirming, setConfirming] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const inputRef = useRef<TextInput>(null);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const pickPhoto = async () => {
    Haptics.selectionAsync();
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera access is required to take photos.');
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
            Alert.alert('Permission needed', 'Gallery access is required to pick photos.');
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
    ]);
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
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!parsed || parsed <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirming(true);
    Keyboard.dismiss();
    
    await addTransaction({
      type: txType,
      amount: parsed,
      category: selectedCat,
      date: new Date().toISOString(),
      is_manual_entry: true,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(photoUri ? { receipt_image_url: photoUri } : {}),
    });

    setTimeout(() => {
      setConfirming(false);
      setAmount('');
      setNote('');
      setPhotoUri(null);
      navigation.goBack();
    }, 500);
  };

  const isValid = parseFloat(amount.replace(/,/g, '')) > 0;
  const mainColor = txType === 'expense' ? '#CF6679' : '#03DAC6';

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* Top Row: Close */}
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <X color="#A0A0A0" size={22} />
              </TouchableOpacity>
            </View>

            {/* Header Switcher */}
            <TouchableOpacity style={styles.headerPill} onPress={onToggleType} activeOpacity={0.7}>
              <View style={[styles.dot, { backgroundColor: mainColor }]} />
              <Text style={styles.headerText}>
                {txType === 'expense' ? 'New Expense' : 'New Income'}
              </Text>
              <ChevronDown color="#A0A0A0" size={16} />
            </TouchableOpacity>

            <View style={styles.amountArea}>
              <Text style={[styles.currency, { color: mainColor }]}>{currencySymbol}</Text>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: isValid ? '#FFFFFF' : '#666' }]}
                value={amount}
                onChangeText={text => {
                  Haptics.selectionAsync();
                  const clean = text.replace(/[^0-9.]/g, '');
                  setAmount(clean);
                }}
                keyboardType="decimal-pad"
                autoFocus
                placeholder="0.00"
                placeholderTextColor="#333"
                selectionColor={mainColor}
              />
            </View>

            <View style={styles.categoriesArea}>
              <Text style={styles.catLabel}>Select Category</Text>
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
                            backgroundColor: `${cat.color}25`,
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

            {/* Extras Row: Note + Photo */}
            <View style={styles.extrasRow}>
              <View style={styles.noteRow}>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note..."
                  placeholderTextColor="#555"
                  maxLength={100}
                />
              </View>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.7}>
                {photoUri ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => { Haptics.selectionAsync(); setPhotoUri(null); }}
                    >
                      <Trash2 color="#FFF" size={12} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoBtnInner}>
                    <Camera color="#A0A0A0" size={18} />
                    <Text style={styles.photoBtnText}>Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: isValid ? mainColor : '#2C2C2C' },
                  confirming && { opacity: 0.7 }
                ]}
                disabled={!isValid || confirming}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnText, { color: isValid ? '#121212' : '#666' }]}>
                  {confirming ? 'Saving...' : 'Add Transaction'}
                </Text>
                {isValid && !confirming && <ArrowRight color="#121212" size={20} />}
              </TouchableOpacity>
            </View>

          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    marginBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  amountArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  currency: {
    fontSize: 48,
    fontWeight: '300',
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1,
    minWidth: 100,
    padding: 0,
    margin: 0,
  },
  categoriesArea: {
    marginTop: 24,
  },
  catLabel: {
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 20,
    marginBottom: 10,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    backgroundColor: '#1E1E1E',
  },
  catText: {
    fontSize: 13,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 12,
  },
  noteRow: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  noteInput: {
    fontSize: 13,
    color: '#FFF',
  },
  photoBtn: {
    height: 40,
    borderRadius: 12,
  },
  photoBtnInner: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    paddingHorizontal: 12,
  },
  photoBtnText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  photoPreviewWrap: {
    position: 'relative',
  },
  photoThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  removePhoto: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CF6679',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomArea: {
    padding: 20,
    paddingBottom: 40,
  },
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
