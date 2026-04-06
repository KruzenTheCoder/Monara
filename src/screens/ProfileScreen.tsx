import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Animated, Switch,
} from 'react-native';
import { showStyledAlert } from '../components/StyledAlert';
import { useNavigation } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { theme } from '../utils/theme';
import { getCurrencyInfo } from '../utils/currencies';
import { COUNTRIES, getCountryInfo } from '../utils/countries';
import { defaultTaxModeForCountry } from '../utils/tax';
import { Check, ChevronLeft, ChevronRight, User, Target, Award, X, Palette, Zap, LineChart, Receipt, DollarSign, Activity, LogOut, Sparkles, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  AU: 'AUD',
  NZ: 'NZD',
  JP: 'JPY',
};

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateUser, changeCurrency, transactions } = useFinancial();
  const { signOut } = useAuth();

  const themeMode = user.theme || 'default';
  const isLight = themeMode === 'monara';

  const [name, setName] = useState(user.display_name);
  const [saving, setSaving] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [dashAI, setDashAI] = useState(true);
  const [dashFinHealth, setDashFinHealth] = useState(true);

  useEffect(() => {
    (async () => {
      const [ai, fh] = await Promise.all([
        AsyncStorage.getItem('@monara:dash:ai_insight'),
        AsyncStorage.getItem('@monara:dash:fin_health'),
      ]);
      if (ai !== null) setDashAI(ai === 'true');
      if (fh !== null) setDashFinHealth(fh === 'true');
    })();
  }, []);

  const toggleDashAI = async (v: boolean) => {
    setDashAI(v);
    await AsyncStorage.setItem('@monara:dash:ai_insight', String(v));
  };

  const toggleDashFinHealth = async (v: boolean) => {
    setDashFinHealth(v);
    await AsyncStorage.setItem('@monara:dash:fin_health', String(v));
  };

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

  const THEME_OPTIONS = [
    { key: 'default', name: 'Monara Light', primary: '#3E92CC', secondary: '#FAFAFC' },
    { key: 'dark', name: 'Monara Dark', primary: '#3E92CC', secondary: '#0A0A0F' },
    { key: 'emerald', name: 'Emerald', primary: '#10B981', secondary: '#FAFAFC' },
    { key: 'ocean', name: 'Ocean', primary: '#3B82F6', secondary: '#FAFAFC' },
    { key: 'sunset', name: 'Sunset', primary: '#F59E0B', secondary: '#FAFAFC' },
    { key: 'rose', name: 'Rose', primary: '#F43F5E', secondary: '#FAFAFC' },
  ] as const;

  const currentThemeItem = THEME_OPTIONS.find(t => t.key === themeMode) || THEME_OPTIONS[0];

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
    if (themeKey === themeMode) {
      setShowThemeModal(false);
      return;
    }
    Haptics.selectionAsync();
    await updateUser({ theme: themeKey });
    setShowThemeModal(false);
  };

  const handleRegionSelect = (countryCode: string) => {
    const code = (countryCode || 'US').toUpperCase();
    const nextCurrency = COUNTRY_CURRENCY[code] || user.currency || 'USD';
    const nextCountry = COUNTRIES.find(c => c.code === code) || COUNTRIES[0];

    const currencyChanged = nextCurrency !== user.currency;
    const countryChanged = code !== user.country_code;

    if (!currencyChanged && !countryChanged) {
      setShowRegionModal(false);
      return;
    }

    const info = getCurrencyInfo(nextCurrency) || { flag: nextCountry.flag, name: nextCurrency, code: nextCurrency, symbol: '' };
    const title = 'Update region';
    const message = currencyChanged
      ? `Switch to ${nextCountry.flag} ${nextCountry.name} (${nextCountry.code}) · ${info.code}?\n\nThis updates your region (tax estimates) and converts transaction amounts and budget limits to ${info.code}.`
      : `Switch to ${nextCountry.flag} ${nextCountry.name} (${nextCountry.code})?\n\nThis updates your region for tax estimates. Currency stays ${user.currency}.`;

    showStyledAlert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currencyChanged ? 'Convert & Switch' : 'Switch',
          onPress: async () => {
            setShowRegionModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (countryChanged) {
              await updateUser({
                country_code: code,
                tax_mode: defaultTaxModeForCountry(code),
              });
            }
            if (currencyChanged) {
              await changeCurrency(nextCurrency);
            }
          },
        },
      ],
    );
  };

  return (
    <AnimatedBackground>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={isLight ? theme.colors.primaryText : "#FFF"} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>Profile & Settings</Text>
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
              <Text style={[styles.profileStatVal, { color: theme.colors.primaryText }]} numberOfLines={1} adjustsFontSizeToFit>
                {user.total_points.toLocaleString()}
              </Text>
            </GlassBox>
          </View>
          <View style={styles.profileGridCol}>
            <GlassBox style={styles.profileStatTile}>
              <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(62, 146, 204, 0.1)' }]}>
                <Target color={theme.colors.accent} size={18} />
              </View>
              <Text style={styles.profileStatLabel}>Streak</Text>
              <Text style={[styles.profileStatVal, { color: theme.colors.primaryText }]} numberOfLines={1}>
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
              <Text style={[styles.profileStatVal, { color: theme.colors.primaryText }]} numberOfLines={1}>
                {transactions.length}
              </Text>
            </GlassBox>
          </View>
        </View>

        {/* Financial Tools */}
        <Text style={styles.sectionTitle}>Financial Tools</Text>
        <GlassBox style={styles.card}>
          <TouchableOpacity
            style={styles.currencyRow}
            onPress={() => navigation.navigate('FinancialHealth' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(52, 199, 89, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <Activity color={theme.colors.status.green} size={20} />
            </View>
            <Text style={[styles.currencyName, { flex: 1, color: theme.colors.primaryText }]}>Financial Health Score</Text>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </TouchableOpacity>
          <View style={[styles.regionHairline, { backgroundColor: theme.colors.glassBorder }]} />

          <TouchableOpacity
            style={styles.currencyRow}
            onPress={() => navigation.navigate('WhatIf' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <LineChart color="#3B82F6" size={20} />
            </View>
            <Text style={[styles.currencyName, { flex: 1, color: theme.colors.primaryText }]}>What-If Scenarios</Text>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </TouchableOpacity>
          <View style={[styles.regionHairline, { backgroundColor: theme.colors.glassBorder }]} />

          <TouchableOpacity
            style={styles.currencyRow}
            onPress={() => navigation.navigate('ReceiptScanner' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(236, 72, 153, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <Receipt color="#EC4899" size={20} />
            </View>
            <Text style={[styles.currencyName, { flex: 1, color: theme.colors.primaryText }]}>Receipt Scanner</Text>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </TouchableOpacity>
          <View style={[styles.regionHairline, { backgroundColor: theme.colors.glassBorder }]} />

          <TouchableOpacity
            style={styles.currencyRow}
            onPress={() => navigation.navigate('DebtPayoff' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <DollarSign color="#EF4444" size={20} />
            </View>
            <Text style={[styles.currencyName, { flex: 1, color: theme.colors.primaryText }]}>Debt Payoff Planner</Text>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </TouchableOpacity>
          <View style={[styles.regionHairline, { backgroundColor: theme.colors.glassBorder }]} />

          <TouchableOpacity
            style={styles.currencyRow}
            onPress={() => navigation.navigate('InvestmentTracker' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(167, 139, 250, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <Target color={theme.colors.accent} size={20} />
            </View>
            <Text style={[styles.currencyName, { flex: 1, color: theme.colors.primaryText }]}>Investment Tracker</Text>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </TouchableOpacity>
        </GlassBox>

        {/* Profile Info */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <GlassBox style={styles.card}>
          <Text style={[theme.typography.label, { color: theme.colors.secondaryText }]}>Display Name</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.primaryText, borderBottomColor: theme.colors.glassBorder }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.secondaryText}
          />
        </GlassBox>

        {/* Theme Selection */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowThemeModal(true)}>
          <GlassBox style={styles.currencyCard}>
            <View style={[styles.themePreviewDot, { backgroundColor: theme.colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.currencyCardName, { color: theme.colors.primaryText }]}>App Theme</Text>
              <Text style={styles.currencyCardCode}>{currentThemeItem.name}</Text>
            </View>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </GlassBox>
        </TouchableOpacity>

        {/* Dashboard Widgets */}
        <Text style={styles.sectionTitle}>Dashboard Widgets</Text>
        <GlassBox style={styles.card}>
          <View style={styles.taxRow}>
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(62, 146, 204, 0.1)', marginBottom: 0, marginRight: 14 }]}>
              <Sparkles color={theme.colors.accent} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.currencyCardName, { color: theme.colors.primaryText }]}>AI Insights</Text>
              <Text style={styles.currencyCardCode}>Show AI spending insights on home</Text>
            </View>
            <Switch
              value={dashAI}
              onValueChange={v => { Haptics.selectionAsync(); toggleDashAI(v); }}
              trackColor={{ false: theme.colors.glassBorder, true: theme.colors.accent + '40' }}
              thumbColor={dashAI ? theme.colors.accent : '#8E8E93'}
              ios_backgroundColor={theme.colors.glassBorder}
            />
          </View>
          <View style={[styles.regionHairline, { backgroundColor: theme.colors.glassBorder }]} />
          <View style={styles.taxRow}>
            <View style={[styles.profileStatIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)', marginBottom: 0, marginRight: 14 }]}>
              <Heart color="#10B981" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.currencyCardName, { color: theme.colors.primaryText }]}>Financial Health</Text>
              <Text style={styles.currencyCardCode}>Show health score card on home</Text>
            </View>
            <Switch
              value={dashFinHealth}
              onValueChange={v => { Haptics.selectionAsync(); toggleDashFinHealth(v); }}
              trackColor={{ false: theme.colors.glassBorder, true: theme.colors.accent + '40' }}
              thumbColor={dashFinHealth ? theme.colors.accent : '#8E8E93'}
              ios_backgroundColor={theme.colors.glassBorder}
            />
          </View>
        </GlassBox>

        {/* Currency + country (tax region) — single control */}
        <Text style={styles.sectionTitle}>Currency & region</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowRegionModal(true)}>
          <GlassBox style={styles.regionSummaryCard}>
            <View style={styles.regionSummaryInner}>
              <View style={styles.regionSummaryRow}>
                <Text style={styles.regionEmoji}>{currentCountry.flag}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.regionPrimary, { color: theme.colors.primaryText }]}>
                    {currentCountry.name} · {currentCurrency.code} {currentCurrency.symbol}
                  </Text>
                  <Text style={styles.regionSecondary} numberOfLines={1}>
                    Tax & estimates · {currentCurrency.name}
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight color={theme.colors.secondaryText} size={20} />
          </GlassBox>
        </TouchableOpacity>
        <GlassBox style={styles.taxRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.currencyCardName, { color: theme.colors.primaryText }]}>Estimated expense tax</Text>
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
            trackColor={{ false: theme.colors.glassBorder, true: theme.colors.accent + '40' }}
            thumbColor={user.tax_enabled ? theme.colors.accent : '#8E8E93'}
            ios_backgroundColor={theme.colors.glassBorder}
          />
        </GlassBox>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.accent }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: '#FFF' }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            Haptics.selectionAsync();
            await signOut();
          }}
          activeOpacity={0.8}
        >
          <LogOut color="#EF4444" size={20} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isLight ? '#F0F2F5' : '#FAFAFC' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>Select Theme</Text>
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: theme.colors.glassBorder }]} onPress={() => setShowThemeModal(false)}>
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
              {THEME_OPTIONS.map((t) => {
                const isSelected = t.key === themeMode;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.themeRow, isSelected && { backgroundColor: theme.colors.glassBorder }]}
                    onPress={() => handleThemeSelect(t.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themeColors}>
                      <View style={[styles.themeColorDot, { backgroundColor: t.primary, borderColor: isLight ? '#DDD' : '#FAFAFC' }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.secondary, marginLeft: -10, borderColor: isLight ? '#DDD' : '#FAFAFC' }]} />
                    </View>
                    <Text style={[styles.themeName, { color: isSelected ? theme.colors.accent : theme.colors.primaryText }]}>{t.name}</Text>
                    {isSelected && <Check color={theme.colors.accent} size={20} />}
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
          <View style={[styles.modalContent, { backgroundColor: isLight ? '#F0F2F5' : '#FAFAFC' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>Currency & region</Text>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: theme.colors.glassBorder }]}
                onPress={() => {
                  setShowRegionModal(false);
                }}
              >
                <X color={theme.colors.secondaryText} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={styles.modalSectionLabel}>Country / Region</Text>
              {COUNTRIES.map(c => {
                const isSelected = c.code === user.country_code;
                const currency = COUNTRY_CURRENCY[c.code] || 'USD';
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, isSelected && { backgroundColor: theme.colors.glassBorder }]}
                    onPress={() => handleRegionSelect(c.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.flag}>{c.flag}</Text>
                    <View style={styles.currencyMid}>
                      <Text style={[styles.currencyName, { color: isSelected ? theme.colors.accent : theme.colors.primaryText }]}>{c.name}</Text>
                      <Text style={styles.currencyCode}>{c.code} · {currency}</Text>
                    </View>
                    {isSelected && <Check color={theme.colors.accent} size={20} />}
                  </TouchableOpacity>
                );
              })}
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
    color: theme.colors.secondaryText,
    fontWeight: '600',
    marginBottom: 3,
  },
  profileStatVal: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  regionSecondary: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  regionHairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondaryText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.secondaryText,
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
    fontWeight: '600',
    marginTop: 8,
    borderBottomWidth: 1,
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
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  themeColors: {
    flexDirection: 'row',
  },
  themeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  themeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  currencyCardCode: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  spacer: {
    height: 10,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signOutBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayBg,
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  currencyCode: {
    fontSize: 12,
    color: '#777',
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
});
