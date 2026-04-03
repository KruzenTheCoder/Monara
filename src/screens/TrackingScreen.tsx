import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Image, Animated, Alert, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, getCurrencySymbol } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import { ChevronDown, ArrowRight, X, Camera, Trash2, Delete, Plus } from 'lucide-react-native';
import { CustomAlert } from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export const TrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { addTransaction, user, expenseCategories, incomeCategories, addCustomCategory, deleteCustomCategory } = useFinancial();

  const initialType = (route.params as any)?.type === 'income' ? 'income' : 'expense';
  const [txType, setTxType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('0');
  const [selectedCat, setSelectedCat] = useState(initialType === 'expense' ? expenseCategories[0].label : incomeCategories[0].label);
  const [confirming, setConfirming] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  
  // Custom category states
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catToDelete, setCatToDelete] = useState<{id: string, label: string} | null>(null);

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
      setAmount((prev: string) => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    if (key === '.' && amount.includes('.')) return;
    
    // Max 2 decimal places
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;

    // Max 7 digits total
    if (amount.replace('.', '').length >= 7) return;

    setAmount((prev: string) => {
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  };

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
      setSelectedCat(t === 'expense' ? expenseCategories[0].label : incomeCategories[0].label);
    }
  }, [route.params]);

  const categories = txType === 'expense' ? expenseCategories : incomeCategories;
  const currencySymbol = getCurrencySymbol(user.currency || 'USD');

  const onToggleType = () => {
    Haptics.selectionAsync();
    const newType = txType === 'expense' ? 'income' : 'expense';
    setTxType(newType);
    setSelectedCat(newType === 'expense' ? expenseCategories[0].label : incomeCategories[0].label);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newCat = {
      id: `custom_${Date.now()}`,
      label: newCatName.trim(),
      color: txType === 'expense' ? '#8B5CF6' : '#10B981', // Default colors
      iconName: 'Tag',
      type: txType,
      isCustom: true
    };
    
    await addCustomCategory(newCat);
    setSelectedCat(newCat.label);
    setNewCatName('');
    setShowAddCat(false);
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
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(photoUri ? { receipt_image_url: photoUri } : {}),
    });

    setTimeout(() => {
      setConfirming(false);
      setAmount('0');
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
        <Delete color="#FFFFFF" size={24} />
      ) : (
        <Text style={styles.keypadText}>{label || key}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <AnimatedBackground>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        {/* Top Row */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <X color="#FFFFFF" size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerPill} onPress={onToggleType} activeOpacity={0.7}>
            <View style={[styles.dot, { backgroundColor: mainColor }]} />
            <Text style={styles.headerText}>
              {txType === 'expense' ? 'Expense' : 'Income'}
            </Text>
            <ChevronDown color="#A0A0A0" size={16} />
          </TouchableOpacity>
          <View style={{ width: 40 }} /> 
        </View>

        {/* Display Area */}
        <View style={styles.displayArea}>
          <Text style={[styles.currencyLabel, { color: mainColor }]}>{currencySymbol}</Text>
          <Animated.Text 
            style={[
              styles.amountText, 
              { color: isValid ? '#FFFFFF' : 'rgba(255,255,255,0.4)', transform: [{ scale: amountScaleAnim }] }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {amount}
          </Animated.Text>
        </View>

        {/* Categories */}
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
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
                  onLongPress={() => {
                    if (cat.isCustom) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setCatToDelete({ id: cat.id, label: cat.label });
                    }
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
            
            <TouchableOpacity
              onPress={() => setShowAddCat(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.catChip, { flexDirection: 'row', alignItems: 'center' }]}>
                <Plus color="#A0A0A0" size={16} style={{ marginRight: 4 }} />
                <Text style={styles.catText}>New</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Note & Photo */}
        <View style={styles.extrasRow}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={60}
            returnKeyType="done"
          />
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
              <Camera color="#A0A0A0" size={20} />
            )}
          </TouchableOpacity>
        </View>

        {/* Keypad */}
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

        {/* Confirm Button */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: isValid ? mainColor : 'rgba(255,255,255,0.1)' },
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

      <CustomAlert
        visible={showAddCat}
        onClose={() => { setShowAddCat(false); setNewCatName(''); }}
        title="New Category"
        message={
          <View style={{ paddingTop: 10 }}>
            <TextInput
              style={styles.addCatInput}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Category Name"
              placeholderTextColor="#555"
              autoFocus
            />
          </View>
        }
        primaryAction={{
          label: 'Create',
          onPress: handleAddCategory
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => { setShowAddCat(false); setNewCatName(''); }
        }}
      />

      <CustomAlert
        visible={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        title="Delete Category"
        message={`Remove "${catToDelete?.label}"? Transactions using this category will remain.`}
        primaryAction={{
          label: 'Delete',
          color: theme.colors.status.red,
          onPress: async () => {
            if (catToDelete) {
              await deleteCustomCategory(catToDelete.id);
              if (selectedCat === catToDelete.label) {
                setSelectedCat(categories[0].label);
              }
              setCatToDelete(null);
            }
          }
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => setCatToDelete(null)
        }}
      />
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFF',
  },
  displayArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  currencyLabel: {
    fontSize: 36,
    fontWeight: '400',
    marginRight: 8,
    alignSelf: 'center',
  },
  amountText: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
  },
  categoriesWrapper: {
    marginBottom: 20,
  },
  catScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  catChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  catText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  noteInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#FFF',
  },
  photoBtn: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderColor: '#121212',
  },
  keypadArea: {
    paddingHorizontal: 30,
    paddingBottom: 10,
    flex: 1,
    justifyContent: 'flex-end',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keypadBtn: {
    width: width * 0.22,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  keypadText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '500',
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: '800',
  },
  addCatInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#FFF',
  },
});
