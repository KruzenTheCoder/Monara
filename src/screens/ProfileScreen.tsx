import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Animated, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { useFinancial } from '../context/FinancialContext';
import { theme } from '../utils/theme';
import { CURRENCIES, getCurrencyInfo } from '../utils/currencies';
import { COUNTRIES, getCountryInfo } from '../utils/countries';
import { defaultTaxModeForCountry } from '../utils/tax';
import { Check, ChevronLeft, ChevronRight, User, Target, Award, Search, X, Palette } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateUser, changeCurrency, transactions } = useFinancial();

  const [name, setName] = useState(user.display_name);
  const [saving, setSaving] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
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

  const currentCurrency = getCurrencyInfo(user?.currency || 'USD') || { flag: '🇺🇸', name: 'US Dollar', code: 'USD', symbol: '$' };
  const currentCountry = getCountryInfo(user?.country_code);
  const currentTheme = theme?.colors?.themes?.[user?.theme || 'default'] || theme?.colors?.themes?.['default'];

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

  const handleCountrySelect = async (code: string) => {
    if (code === user.country_code) return;
    Haptics.selectionAsync();
    await updateUser({
      country_code: code,
      tax_mode: defaultTaxModeForCountry(code),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCurrencySelect = (code: string) => {
    if (code === user.currency) {
      setShowRegionModal(false);
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
            setShowRegionModal(false);
            setSearchQuery('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await changeCurrency(code);
          },
        },
      ],
    );
  };

  const renderCurrencyItem = ({ item, index }: { item: typeof CURRENCIES[0]; index: number }) => {
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

  const themeKeys = theme?.colors?.themes ? Object.keys(theme.colors.themes) : [];

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
        {/* User Stats — compact dashboard-style tiles */}
        <View style={styles.profileGrid}>
          <View style={styles.profileGridCol}>
            <GlassBox style={styles.profileStatTile}>
              <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
                <Award color="#FBBF24" size={18} />
              </View>
              <Text style={styles.profileStatLabel}>Points</Text>
              <Text style={styles.profileStatVal} numberOfLines={1} adjustsFontSizeToFit>
                {user.total_points.toLocaleString()}
              </Text>
            </GlassBox>
          </View>
          <View style={styles.profileGridCol}>
            <GlassBox style={styles.profileStatTile}>
              <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(187, 134, 252, 0.12)' }]}>
                <Target color={theme.colors.accent} size={18} />
              </View>
              <Text style={styles.profileStatLabel}>Streak</Text>
              <Text style={styles.profileStatVal} numberOfLines={1}>
                {user.current_streak}
              </Text>
            </GlassBox>
          </View>
          <View style={styles.profileGridCol}>
            <GlassBox style={styles.profileStatTile}>
              <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                <User color={theme.colors.status.green} size={18} />
              </View>
              <Text style={styles.profileStatLabel}>Entries</Text>
              <Text style={styles.profileStatVal} numberOfLines={1}>
                {transactions.length}
              </Text>
            </GlassBox>
          </View>
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

        {/* Currency + country (tax region) — single control */}
        <Text style={styles.sectionTitle}>Currency & region</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowRegionModal(true)}>
          <GlassBox style={styles.regionSummaryCard}>
            <View style={styles.regionSummaryInner}>
              <View style={styles.regionSummaryRow}>
                <Text style={styles.regionEmoji}>{currentCurrency.flag}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.regionPrimary}>{currentCurrency.code} · {currentCurrency.symbol}</Text>
                  <Text style={styles.regionSecondary} numberOfLines={1}>
                    {currentCurrency.name}
                  </Text>
                </View>
              </View>
              <View style={styles.regionHairline} />
              <View style={styles.regionSummaryRow}>
                <Text style={styles.regionEmoji}>{currentCountry.flag}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.regionPrimary}>{currentCountry.name}</Text>
                  <Text style={styles.regionSecondary}>Tax & estimates</Text>
                </View>
              </View>
            </View>
            <ChevronRight color="rgba(255,255,255,0.35)" size={20} />
          </GlassBox>
        </TouchableOpacity>
        <GlassBox style={styles.taxRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.currencyCardName}>Estimated expense tax</Text>
            <Text style={styles.currencyCardCode}>
              Planning-only; uses country + category. {user.tax_enabled ? 'On' : 'Off'}
            </Text>
          </View>
          <Switch
            value={!!user.tax_enabled}
            onValueChange={async v => {
              Haptics.selectionAsync();
              await updateUser({ tax_enabled: v });
            }}
            trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(187,134,252,0.45)' }}
            thumbColor={user.tax_enabled ? theme.colors.accent : '#8E8E93'}
            ios_backgroundColor="rgba(255,255,255,0.12)"
          />
        </GlassBox>

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

      {/* Currency & region (country + currency) */}
      <Modal visible={showRegionModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Currency & region</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowRegionModal(false);
                  setSearchQuery('');
                }}
              >
                <X color="#A0A0A0" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={styles.modalSectionLabel}>Country</Text>
              {COUNTRIES.map(c => {
                const isSelected = c.code === user.country_code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, isSelected && styles.currencyRowSelected]}
                    onPress={() => handleCountrySelect(c.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.flag}>{c.flag}</Text>
                    <View style={styles.currencyMid}>
                      <Text style={[styles.currencyName, isSelected && { color: theme.colors.accent }]}>{c.name}</Text>
                      <Text style={styles.currencyCode}>{c.code}</Text>
                    </View>
                    {isSelected && <Check color={theme.colors.accent} size={20} />}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.modalSectionLabel, { marginTop: 20 }]}>Currency</Text>
              <View style={[styles.searchRow, { marginHorizontal: 16 }]}>
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
              {filteredCurrencies.map((item, index) => (
                <View key={item.code}>
                  {index > 0 && <View style={styles.separator} />}
                  {renderCurrencyItem({ item, index })}
                </View>
              ))}
            </ScrollView>
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
  profileGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'stretch',
  },
  profileGridCol: {
    flex: 1,
    minWidth: 0,
  },
  profileStatTile: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    minHeight: 0,
  },
  profileStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '600',
    marginBottom: 3,
  },
  profileStatVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    width: '100%',
  },
  regionSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 4,
  },
  regionSummaryInner: {
    flex: 1,
    minWidth: 0,
  },
  regionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regionEmoji: {
    fontSize: 22,
  },
  regionPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  regionSecondary: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  regionHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A0A0',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginHorizontal: 16,
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
  taxRow: {
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

