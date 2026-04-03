import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, FlatList, Animated, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { useFinancial } from '../context/FinancialContext';
import { theme } from '../utils/theme';
import { CURRENCIES, getCurrencyInfo } from '../utils/currencies';
import { Check, ChevronLeft, ChevronRight, User, Target, Award, Search, X, Palette } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateUser, changeCurrency, transactions } = useFinancial();

  const [name, setName] = useState(user.display_name);
  const [saving, setSaving] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const currentCurrency = getCurrencyInfo(user.currency || 'USD');
  const currentTheme = theme.colors.themes[user.theme || 'default'];

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return CURRENCIES;
    const q = searchQuery.toLowerCase();
    return CURRENCIES.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSave = async () => {
    Haptics.selectionAsync();
    setSaving(true);
    await updateUser({ display_name: name });
    setTimeout(() => {
      setSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }, 400);
  };

  const handleThemeSelect = async (themeKey: string) => {
    if (themeKey === user.theme) {
      setShowThemeModal(false);
      return;
    }
    Haptics.selectionAsync();
    await updateUser({ theme: themeKey });
    setShowThemeModal(false);
  };

  const handleCurrencySelect = (code: string) => {
    if (code === user.currency) {
      setShowCurrencyModal(false);
      return;
    }
    const info = getCurrencyInfo(code);
    Alert.alert(
      'Change Currency',
      `Switch to ${info.flag} ${info.name} (${info.code})?\n\nAll your transaction amounts and budget limits will be converted automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert & Switch',
          onPress: async () => {
            setShowCurrencyModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await changeCurrency(code);
          },
        },
      ],
    );
  };

  const renderCurrencyItem = ({ item }: { item: any }) => {
    const isSelected = item.code === user.currency;
    return (
      <TouchableOpacity
        style={[styles.currencyRow, isSelected && styles.currencyRowSelected]}
        onPress={() => {
          Haptics.selectionAsync();
          handleCurrencySelect(item.code);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.currencyMid}>
          <Text style={[styles.currencyName, isSelected && { color: theme.colors.accent }]}>{item.name}</Text>
          <Text style={styles.currencyCode}>{item.code} · {item.symbol}</Text>
        </View>
        {isSelected && <Check color={theme.colors.accent} size={20} />}
      </TouchableOpacity>
    );
  };

  const themeKeys = Object.keys(theme.colors.themes);

  return (
    <AnimatedBackground>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#FFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* User Stats Summary */}
        <View style={styles.statsRow}>
          <GlassBox style={styles.statBox}>
            <Award color="#FBBF24" size={24} />
            <Text style={styles.statBoxVal}>{user.total_points}</Text>
            <Text style={theme.typography.label}>Points</Text>
          </GlassBox>
          <GlassBox style={styles.statBox}>
            <Target color={theme.colors.accent} size={24} />
            <Text style={styles.statBoxVal}>{user.current_streak}</Text>
            <Text style={theme.typography.label}>Day Streak</Text>
          </GlassBox>
          <GlassBox style={styles.statBox}>
            <User color={theme.colors.status.green} size={24} />
            <Text style={styles.statBoxVal}>{transactions.length}</Text>
            <Text style={theme.typography.label}>Entries</Text>
          </GlassBox>
        </View>

        {/* Profile Info */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <GlassBox style={styles.card}>
          <Text style={theme.typography.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#666"
          />
        </GlassBox>

        {/* Theme Selection */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowThemeModal(true)}>
          <GlassBox style={styles.currencyCard}>
            <View style={[styles.themePreviewDot, { backgroundColor: currentTheme?.primary || theme.colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.currencyCardName}>App Theme</Text>
              <Text style={styles.currencyCardCode}>{currentTheme?.name || 'Monara Classic'}</Text>
            </View>
            <ChevronRight color="#555" size={20} />
          </GlassBox>
        </TouchableOpacity>

        {/* Currency Selection - tap to open modal */}
        <Text style={styles.sectionTitle}>Currency</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCurrencyModal(true)}>
          <GlassBox style={styles.currencyCard}>
            <Text style={styles.currencyCardFlag}>{currentCurrency.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.currencyCardName}>{currentCurrency.name}</Text>
              <Text style={styles.currencyCardCode}>{currentCurrency.code} · {currentCurrency.symbol}</Text>
            </View>
            <ChevronRight color="#555" size={20} />
          </GlassBox>
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowThemeModal(false)}>
                <X color="#A0A0A0" size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
              {themeKeys.map((key) => {
                const t = theme.colors.themes[key];
                const isSelected = key === (user.theme || 'default');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.themeRow, isSelected && styles.themeRowSelected]}
                    onPress={() => handleThemeSelect(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themeColors}>
                      <View style={[styles.themeColorDot, { backgroundColor: t.primary }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.secondary, marginLeft: -10 }]} />
                    </View>
                    <Text style={[styles.themeName, isSelected && { color: t.primary }]}>{t.name}</Text>
                    {isSelected && <Check color={t.primary} size={20} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => { setShowCurrencyModal(false); setSearchQuery(''); }}>
                <X color="#A0A0A0" size={22} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Search color="#666" size={18} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search currencies..."
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X color="#666" size={16} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filteredCurrencies}
              keyExtractor={item => item.code}
              renderItem={renderCurrencyItem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statBoxVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    marginBottom: 24,
  },
  input: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    paddingBottom: 8,
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  currencyCardFlag: {
    fontSize: 28,
  },
  currencyCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  themePreviewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 4,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  themeRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  themeColors: {
    flexDirection: 'row',
  },
  themeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1A1A1F',
  },
  themeName: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
  },
  currencyCardCode: {
    fontSize: 13,
    color: '#A0A0A0',
    marginTop: 2,
  },
  spacer: {
    height: 10,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  currencyRowSelected: {
    backgroundColor: 'rgba(187,134,252,0.08)',
  },
  flag: {
    fontSize: 26,
  },
  currencyMid: {
    flex: 1,
  },
  currencyName: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
  },
  currencyCode: {
    fontSize: 12,
    color: '#777',
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2C2C2C',
    marginLeft: 60,
  },
});
